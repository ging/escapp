const Sequelize = require("sequelize");
const sequelize = require("../models");
const {Op} = Sequelize;
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const {startTurno, stopTurno} = require("../helpers/sockets");
const {validationError, isValidDate} = require("../helpers/utils");


// Autoload the turn with id equals to :turnId
exports.load = (req, res, next, turnId) => {
    const options = {
        "where": req.params.escapeRoomId ? {"escapeRoomId": req.params.escapeRoomId} : undefined,
        "include": [
            {
                "model": models.team,
                "include": {"model": models.user, "as": "teamMembers"},
                "order": [["date", "ASC"]]
            }
        ]
    };

    if (req.session.user) {
        options.include.push({
            "model": models.user,
            "as": "students",
            // "where": {"id": req.session.user.id}, // TODO Comprobar
            "required": false
        });
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

exports.isTurnNotPending = (req, res, next) => {
    if (req.session.user.isStudent) {
        if (req.participant.teamsAgregados[0].turno.status === "pending") {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
            return;
        }
    }
    next();
};

exports.isTurnStarted = (req, res, next) => {
    if (req.session.user.isStudent) {
        const [team] = req.participant.teamsAgregados;

        if (!(team.startTime instanceof Date && isFinite(team.startTime))) {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
            return;
        }
    }
    next();
};

// GET /escapeRooms/:escapeRoomId/turnos
exports.turnos = async (req, res, next) => {
    const {escapeRoom} = req;

    try {
        escapeRoom.turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC NULLS LAST"]]});

        const {turnos} = escapeRoom;

        res.render("escapeRooms/steps/turnos", {escapeRoom, turnos, "progress": "turnos"});
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/activate
exports.indexActivate = async (req, res, next) => {
    const {escapeRoom} = req;

    try {
        const turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC NULLS LAST"]]});

        res.render("turnos/_indexActivate.ejs", {turnos, escapeRoom});
    } catch (e) {
        next(e);
    }
};

// PUT /escapeRooms/:escapeRoomId/activate
exports.activate = async (req, res, next) => {
    const {escapeRoom, body} = req;
    const back = `/escapeRooms/${escapeRoom.id}`;
    const {i18n} = res.locals;

    try {
        const turno = await models.turno.findByPk(body.turnSelected);

        if (turno.status === "pending") {
            turno.status = "active";
            turno.startTime = new Date();
        } else {
            turno.status = "finished";
        }

        await turno.save({"fields": ["startTime", "status"]});
        req.flash("success", turno.status === "active" ? i18n.turno.activated : i18n.turno.deactivated);
        if (turno.status === "active") {
            startTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${turno.id}/play`);
        } else {
            stopTurno(turno.id);
            res.redirect(`/escapeRooms/${escapeRoom.id}/analytics/ranking?turnId=${turno.id}`);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach((err) => {
                req.flash("error", validationError(err, i18n));
            });
            res.redirect(back);
        } else {
            next(error);
        }
    }
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.create = async (req, res, next) => {
    const {date, place, from, to, capacity, password} = req.body;
    const {i18n} = res.locals;
    const modDate = date === "always" ? null : new Date(date);
    const back = date === "always" ? `/escapeRooms/${req.escapeRoom.id}/turnos` : `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

    let turn = {
        "capacity": parseInt(capacity || 0, 10),
        place,
        password,
        "status": date === "always" ? "active" : "pending",
        "escapeRoomId": req.escapeRoom.id,
        "date": modDate,
        "from": from ? new Date(from) : null,
        "to": to ? new Date(to) : null
    };

    try {
        if (!isValidDate(turn.date) || !isValidDate(turn.from) || !isValidDate(turn.to)) {
            throw new Error(date);
        }

        turn = models.turno.build({
            ...turn,
            "date": modDate,
            "from": from ? new Date(from) : null,
            "to": to ? new Date(to) : null
        });

        await turn.save();
        res.redirect(back);
    } catch (error) {
        try {
            console.error(error);
            req.escapeRoom.turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC NULLS LAST"]]});
            req.escapeRoom.turnos.push(turn);
            if (error instanceof Sequelize.ValidationError) {
                error.errors.forEach((err) => {
                    req.flash("error", validationError(err, i18n));
                });
            } else {
                req.flash("error", `${i18n.common.flash.errorCreatingTurno}`);
            }
            res.render("escapeRooms/steps/turnos", {"escapeRoom": req.escapeRoom, "turnos": req.escapeRoom.turnos, "progress": "turnos", "error": "new"});
        } catch (e) {
            console.error(e);
            next(e);
        }
    }
};


// PUT /escapeRooms/:escapeRoomId/turno/:turnoId
exports.update = async (req, res, next) => {
    const {date, place, from, to, capacity, password} = req.body;
    const {turn} = req;
    const modDate = date === "always" ? null : new Date(date);
    const {i18n} = res.locals;

    turn.date = modDate;
    turn.place = place;
    turn.capacity = parseInt(capacity || 0, 10);
    turn.from = from ? new Date(from) : null;
    turn.to = to ? new Date(to) : null;
    turn.password = password;
    turn.status = date === "always" && turn.status === "pending" ? "active" : turn.status;
    const back = date === "always" ? `/escapeRooms/${req.escapeRoom.id}/turnos` : `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

    try {
        if (!isValidDate(turn.date) || !isValidDate(turn.from) || !isValidDate(turn.to)) {
            throw new Error("Invalid Date", turn.date, turn.from, turn.to);
        }
        await turn.save();
        req.flash("success", i18n.common.flash.successEditingTurno);
        res.redirect(back);
    } catch (error) {
        try {
            console.error(error);
            req.escapeRoom.turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC NULLS LAST"]]});
            req.escapeRoom.turnos.forEach((t) => {
                if (t.id === turn.id) {
                    t = turn;
                }
            });
            if (error instanceof Sequelize.ValidationError) {
                error.errors.forEach((err) => {
                    req.flash("error", validationError(err, i18n));
                });
            } else {
                req.flash("error", `${i18n.common.flash.errorEditingTurno}`);
            }
            res.render("escapeRooms/steps/turnos", {"escapeRoom": req.escapeRoom, "turnos": req.escapeRoom.turnos, "progress": "turnos", "error": turn.id});
        } catch (e) {
            console.error(e);
            next(e);
        }
    }
};


// DELETE /escapeRooms/:escapeRoomId/turnos/:turnoId
exports.destroy = async (req, res, next) => {
    const modDate = new Date(req.turn.date);
    const {i18n} = res.locals;

    try {
        const date = req.turn.date ? `?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}` : "";
        const back = `/escapeRooms/${req.params.escapeRoomId}/turnos${date}`;

        const teams = await req.turn.getTeams({"attributes": ["id"]});
        const teamIds = teams.map((t) => t.id);

        await models.members.destroy({"where": {"teamId": {[Op.in]: teamIds}}});
        await models.participants.destroy({"where": {"turnId": req.turn.id}});
        await req.turn.destroy({});
        stopTurno(req.turn.id);

        req.flash("success", i18n.common.flash.successDeletingTurno);
        res.redirect(back);
    } catch (error) {
        next(error);
    }
};


// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("turnos") : progressBar || nextStep("turnos")}`);
};

// POST /escapeRooms/:escapeRoomId/turnos/:turnoId/reset
exports.reset = async (req, res, next) => {
    const {i18n} = res.locals;
    const transaction = await sequelize.transaction();

    try {
        const back = `/escapeRooms/${req.params.escapeRoomId}/activate`;
        const ids = (await models.team.findAll({"where": {"turnoId": req.turn.id}})).map((t) => t.id);
        const status = req.turn.date ? "pending" : "active";

        await models.requestedHint.destroy({"where": {"teamId": {[Op.in]: ids}}});
        await models.retosSuperados.destroy({"where": {"teamId": {[Op.in]: ids}}});
        await models.participants.update({"attendance": false}, {"where": {"turnId": req.turn.id}});
        await models.team.update({"startTime": null}, {"where": {"turnoId": req.turn.id}});
        await models.turno.update({"startTime": null, status}, {"where": {"id": req.turn.id}});

        await transaction.commit();
        stopTurno(req.turn.id);
        req.flash("success", i18n.common.flash.successResetingTurno);
        res.redirect(back);
    } catch (error) {
        await transaction.rollback();

        next(error);
    }
};
