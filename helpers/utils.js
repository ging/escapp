const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const cloudinary = require("cloudinary");
const {parseURL} = require("../helpers/video");

exports.retosSuperadosByWho = (who, puzzles, showDate = false, turno) => {
    const retosSuperados = new Array(puzzles.length).fill(0);
    const retosSuperadosMin = new Array(puzzles.length).fill(0);

    who.retos.map((reto) => {
        const idx = puzzles.indexOf(reto.id);

        if (idx > -1) {
            retosSuperados[idx] = showDate ? reto.retosSuperados.createdAt : 1;
            if (turno) {
                retosSuperadosMin[idx] = showDate ? ((reto.retosSuperados.createdAt - turno)/1000/60) : 1;
            }
        }
        return showDate ? " " : 0;
    });
    return { retosSuperados, retosSuperadosMin };
};

exports.flattenObject = (obj, labels, min = false) => {
    const rs = {};

    for (const r in obj) {
        rs[labels[r] + (min ? " Minute" : "")] = obj[r];
    }
    return rs;
};

exports.getRetosSuperados = (teams) => teams.map((teamRes) => ({...teamRes.dataValues,
    "teamMembers": teamRes.teamMembers, /* .filter(m=>)    .map(m=>({turnosAgregados: m.turnosAgregados
        .filter(t=>t.participants.attendance)}))*/
    "countretos": teamRes.dataValues.retos.length,
    "latestretosuperado": teamRes.dataValues.retos && teamRes.dataValues.retos.length > 0 ? teamRes.dataValues.retos.map((r) => r.retosSuperados.createdAt).sort((a, b) => a < b)[0] : null})).sort((t1, t2) => {
    if (t1.countretos === t2.countretos) {
        if (t1.latestretosuperado === t2.latestretosuperado) {
            return 0;
        }
        return t1.latestretosuperado > t2.latestretosuperado ? 1 : -1;
    }
    return t1.countretos > t2.countretos ? -1 : 1;
});

exports.pctgRetosSuperados = (retosSuperados) => Math.round(retosSuperados.filter((r) => r === 1).length * 10000 / retosSuperados.length) / 100;

exports.countHints = (requestedHints) => {
    let hintsSucceeded = 0;
    let hintsFailed = 0;

    for (const h in requestedHints) {
        const hint = requestedHints[h];

        if (hint.success) {
            hintsSucceeded++;
        } else {
            hintsFailed++;
        }
    }
    return {hintsFailed,
        hintsSucceeded};
};

exports.saveInterface = (name, req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);

    escapeRoom[`${name}Instructions`] = body.instructions;
    escapeRoom[`${name}Appearance`] = body.appearance;
    const progressBar = body.progress;

    escapeRoom.save({"fields": [
        `${name}Instructions`,
        `${name}Appearance`
    ]}).then(() => {
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep(name) : progressBar || nextStep(name)}`);
    }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/${name}`);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};


exports.playInterface = (name, req, res) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom,
            cloudinary,
            "team": {"turno": req.turn,
                "retos": []},
            "hints": [],
            "isStudent": false,
            parseURL,
            "endPoint": name,
            "layout": false});
        return;
    }
    models.team.findAll({
        "include": [
            {
                "model": models.turno,
                "include": {
                    "model": models.escapeRoom,
                    "where": {
                        "id": req.escapeRoom.id
                    }
                },
                "required": true

            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [],
                "where": {
                    "id": req.session.user.id
                },
                "required": true
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {
                    "model": models.retosSuperados,
                    "required": false,
                    "attributes": ["createdAt"]

                }
            }

        ],
        "required": true
    }).then((teams) => {
        const team = teams && teams[0] ? teams[0] : [];

        if (team.turno.status !== "active") {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
        }
        models.requestedHint.findAll({
            "where": {
                "teamId": team.id,
                "success": true
            },
            "include": models.hint

        }).then((hints) => {
            res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom,
                cloudinary,
                team,
                "isStudent": true,
                "hints": hints || [],
                parseURL,
                "endPoint": name,
                "layout": false});
        });
    });
};

