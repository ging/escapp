const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const cloudinary = require("cloudinary");
const ejs = require("ejs");

exports.retosSuperadosByWho = (who, puzzles, showDate = false, turno) => {
    const retosSuperados = new Array(puzzles.length).fill(0);
    const retosSuperadosMin = new Array(puzzles.length).fill(0);

    who.retos.map((reto) => {
        const idx = puzzles.indexOf(reto.id);

        if (idx > -1) {
            retosSuperados[idx] = showDate ? reto.retosSuperados.createdAt : 1;
            if (turno) {
                retosSuperadosMin[idx] = showDate ? (reto.retosSuperados.createdAt - turno) / 1000 / 60 : 1;
            }
        }
        return showDate ? " " : 0;
    });
    return {
        retosSuperados,
        retosSuperadosMin
    };
};

exports.flattenObject = (obj, labels, min = false) => {
    const rs = {};

    for (const r in obj) {
        rs[labels[r] + (min ? " Minute" : "")] = obj[r];
    }
    return rs;
};

exports.getRetosSuperados = (teams) => teams.map((teamRes) => ({
    ...teamRes.dataValues,
    "teamMembers": teamRes.teamMembers,
    "countretos": teamRes.dataValues.retos.length,
    "latestretosuperado": teamRes.dataValues.retos && teamRes.dataValues.retos.length > 0 ? teamRes.dataValues.retos.map((r) => new Date(r.retosSuperados.createdAt)).sort((a, b) => b - a)[0] : null
})).
    sort((t1, t2) => {
        if (t1.countretos === t2.countretos) {
            if (t1.latestretosuperado === t2.latestretosuperado) {
                return 0;
            }
            return t1.latestretosuperado > t2.latestretosuperado ? 1 : -1;
        }
        return t1.countretos > t2.countretos ? -1 : 1;
    });

exports.getRetosSuperadosIdTime = (retos, actualStartTime) => {
    return retos.map((reto) => {
        const {retosSuperados} = reto;
        const {createdAt} = retosSuperados;
        const time = actualStartTime ? (createdAt - actualStartTime) / 1000 : null;

        return {"id": reto.id, time};
    });

}
exports.getPuzzleOrderSuperados = async (team) => {
    const retosSuperados = await team.getRetos({ "attributes": ["order"] });

    return retosSuperados.length ? retosSuperados.map((r) => r.order + 1) : [];
};

exports.pctgRetosSuperados = (retosSuperados) => Math.round(retosSuperados.filter((r) => r === 1).length * 10000 / retosSuperados.length) / 100;

exports.countHints = (requestedHints) => {
    const hintsSucceeded = requestedHints.reduce((acc, el) => acc + (el.success ? 1 : 0), 0);
    const hintsFailed = requestedHints.length - hintsSucceeded;

    return {
        hintsFailed,
        hintsSucceeded
    };
};

exports.countHintsByPuzzle = (requestedHints, retosSuperados, startTime) => {
    const hintsSucceeded = new Array(retosSuperados.length).fill(0);
    const hintsFailed = new Array(retosSuperados.length).fill(0);

    for (const h in requestedHints) {
        const hint = requestedHints[h];
        const minute = Math.floor((hint.createdAt - startTime) / 60000); // TODO team.startTime

        let retoPos = 0;

        for (let r = retosSuperados.length - 1; r >= 0; r--) {
            if (retosSuperados[r] !== 0) {
                if (minute > retosSuperados[r]) {
                    break;
                }
                retoPos = r;
            }
        }

        if (hint.success) {
            hintsSucceeded[retoPos]++;
        } else {
            hintsFailed[retoPos]++;
        }
    }
    const hintsSucceededTotal = hintsSucceeded.reduce((a, b) => a + b, 0);
    const hintsFailedTotal = hintsFailed.reduce((a, b) => a + b, 0);

    return {hintsFailed, hintsFailedTotal, hintsSucceeded, hintsSucceededTotal};
};

exports.saveInterface = (name, req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);

    escapeRoom[`${name}Instructions`] = body.instructions;
    escapeRoom[`${name}Appearance`] = body.appearance;
    const progressBar = body.progress;

    escapeRoom.save({
        "fields": [
            `${name}Instructions`,
            `${name}Appearance`
        ]
    }).then(() => {
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


exports.playInterface = async (name, req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        res.render("escapeRooms/play/play", {
            "escapeRoom": req.escapeRoom,
            cloudinary,
            "team": {
                "turno": req.turn,
                "retos": []
            },
            "teams": req.teams,
            "hints": [],
            "turnoId": req.params.turnoId,
            "isStudent": false,
            "endPoint": name,
            "layout": false
        });
    } else {
        try {
            const teams = await models.team.findAll({
                "include": [
                    {
                        "model": models.turno,
                        "include": {
                            "model": models.escapeRoom,
                            "where": {"id": req.escapeRoom.id}
                        },
                        "required": true

                    },
                    {
                        "model": models.user,
                        "as": "teamMembers",
                        "attributes": [],
                        "where": {"id": req.session.user.id},
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
            });

            const team = teams && teams[0] ? teams[0] : {};

            if (!team.startTime || team.turno.status !== "active") {
                res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
            }
            const hints = await models.requestedHint.findAll({
                "where": {
                    "teamId": team.id,
                    "success": true
                },
                "include": models.hint

            });

            res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom, cloudinary, "teams": req.teams, team, "userId": req.session.user.id, "turnoId": team.turno.id, "teamId": team.id, "isStudent": true, "hints": hints || [], "endPoint": name, "layout": false});
        } catch (err) {
            next(err);
        }
    }
};

exports.isTooLate = (team) => {
    if (team.turno.status === "finished") {
        return true;
    }

    const {duration} = team.turno.escapeRoom;
    const startTime = team.turno.startTime || team.startTime;

    return team.turno.escapeRoom.forbiddenLateSubmissions && new Date(startTime.getTime() + duration * 60000) < new Date();
};

exports.getBestTime = (finished) => `${finished.map((t) => t.retos.
    map((r) => Math.round((r.retosSuperados.createdAt - (t.turno.startTime || t.startTime)) / 10 / 60) / 100).
    reduce((a, b) => a > b ? a : b, Math.Infinity)).
    reduce((a, b) => a < b ? a : b, Math.Infinity) || 0} min.`;

exports.getAvgHints = (teams, reqHints) => teams.length > 0 ? Math.round(teams.map((team) => team.requestedHints.filter((h) => {
    if (h.hintId) {
        reqHints[h.hintId]++;
    } else {
        reqHints[h.success ? 0 : -1]++;
    }

    return h.success;
}).length).reduce((acc, c) => acc + c, 0) / teams.length * 100) / 100 : "n/a";

exports.byRanking = (a, b) => {
    if (a.count > b.count) {
        return -1;
    } else if (a.count < b.count) {
        return 1;
    }
    if (a.finishTime < b.finishTime) {
        return -1;
    }
    return 1;
};

/*
 * User authentication: Checks that the user is registered.
 *
 * Return a Promise that searches a user with the given login, and checks that
 * the password is correct.
 * If the authentication is correct, then the promise is satisfied and returns
 * an object with the User.
 * If the authentication fails, then the promise is also satisfied, but it
 * returns null.
 */
exports.authenticate = (login, pass, token) => {
    const username = (login || "").toString();

    if (token) {
        return models.user.findOne({"where": {username, token}}).
            then((user) => user);
    }
    const password = (pass || "").toString();

    return models.user.findOne({"where": {username}}).
        then((user) => user && user.verifyPassword(password) ? user : null);
};


exports.renderEJS = (view, queries = {}, options = {}) => new Promise((resolve, reject) => {
    ejs.renderFile(view, queries, options, function (err, str) {
        if (err) {
            return reject(err);
        }
        resolve(str);
    });
});
