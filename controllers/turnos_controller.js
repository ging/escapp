const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const {startTurno, stopTurno} = require("../helpers/sockets");


// Autoload the turn with id equals to :turnId
exports.load = (req, res, next, turnId) => {
    const options = {"include": [
        {"model": models.team,
            "include": {
                "model": models.user,
                "as": "teamMembers"
            },
            "order": [
                [
                    "date",
                    "ASC"
                ]
            ]}
    ]};

    if (req.session.user) {
        options.include.push({"model": models.user,
            "as": "students",
            // "where": {"id": req.session.user.id}, // TODO Comprobar
            "required": false});
    }

    models.turno.findByPk(turnId, options).
        then((turn) => {
            if (turn) {
                req.turn = turn;
                next();
            } else {
                res.status(404);
                next(new Error(404));
            }
        }).
        catch((error) => next(error));
};

// POST /escapeRooms/:escapeRoomId/join
exports.indexStudent = async (req, res, next) => {
    try {
        const {escapeRoom} = req;

        const turnos = await models.turno.findAll({
            "where": {"escapeRoomId": req.escapeRoom.id},
            "include": {
                "model": models.user,
                "as": "students"
            },
            "order": [
                [
                    "date",
                    "ASC"
                ]
            ]
        });
        if (escapeRoom.turnos && escapeRoom.turnos.length === 1) {
            if (escapeRoom.teamSize > 1) {
                res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${escapeRoom.turnos[0].id}/teams`);
            } else {
                req.params.turnoId = escapeRoom.turnos[0].id;
                req.body.name = req.session.user.name;
                req.user = await models.user.findByPk(req.session.user.id);
                next();
            }
        } else {
            res.render("turnos/_indexStudent.ejs", {turnos, escapeRoom});
        }
        
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/activarTurno
exports.indexActivarTurno = (req, res, next) => {
    const {escapeRoom} = req;

    try {
        const turnos = models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC"]]});

        res.render("turnos/_indexActivarTurno.ejs", {turnos, escapeRoom});
    } catch (e) {
        next(e);
    }
};

// PUT /escapeRooms/:escapeRoomId/activar
exports.activar = async (req, res, next) => {
    const {escapeRoom, body} = req;
    const back = `/escapeRooms/${escapeRoom.id}`;

    try {
        const turno = await models.turno.findByPk(body.turnSelected);

        if (turno.status === "pending") {
            turno.status = "active";
            turno.startTime = new Date();
        } else {
            turno.status = "finished";
        }

        await turno.save({"fields": [
            "startTime",
            "status"
        ]});
        req.flash("success", turno.status === "active" ? "Turno activo." : "Turno desactivado");
        if (turno.status === "active") {
            startTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${turno.id}/play`);
        } else {
            stopTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/analytics/ranking?turnId=${turno.id}`);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        } else {
            next(error);
        }
    }
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.create = (req, res, next) => {
    const {date, indications} = req.body;
    const modDate = date === "always" ? null : new Date(date);
    const turn = models.turno.build({"date": modDate,
        indications,
        "status": date === "always" ? "active" : "pending",
        "escapeRoomId": req.escapeRoom.id});
    let back = "";

    if (date === "always") {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos`;
    } else {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;
    }

    turn.save().
        then(() => {
            req.flash("success", "Turno creado correctamente.");
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingTurno}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId/turnos/:turnoId
exports.destroy = async (req, res, next) => {
    const modDate = new Date(req.turn.date);
    const teams = req.turn.teams.map((i) => i.id);
    const transaction = await sequelize.transaction();

    try {
        await req.turn.destroy({}, {transaction});
        const back = `/escapeRooms/${req.params.escapeRoomId}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

        await models.team.destroy({"where": {"id": teams}}, {transaction});
        await models.participants.destroy({"where": {"turnId": req.turn.id}}, {transaction});
        await models.members.destroy({"where": {"teamId": teams}}, {transaction});
        await transaction.commit();
        req.flash("success", req.app.locals.i18n.common.flash.successDeletingTurno);
        res.redirect(back);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/turnos
exports.turnos = (req, res) => {
    const {escapeRoom} = req;
    const {turnos} = escapeRoom;

    res.render("escapeRooms/steps/turnos", {escapeRoom, turnos, "progress": "turnos"});
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("turnos") : progressBar || nextStep("turnos")}`);
};
