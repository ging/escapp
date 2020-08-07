const Sequelize = require("sequelize");
const sequelize = require("../models");
const {Op} = Sequelize;
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");
const {startTurno, stopTurno} = require("../helpers/sockets");


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


// GET /escapeRooms/:escapeRoomId/activarTurno
exports.indexActivarTurno = async (req, res, next) => {
    const {escapeRoom} = req;

    try {
        const turnos = await models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id}, "order": [["date", "ASC NULLS LAST"]]});

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

        await turno.save({"fields": ["startTime", "status"]});
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
    const {date, place, from, to, capacity, password} = req.body;
    const modDate = date === "always" ? null : new Date(date);
    const turn = models.turno.build({
        place,
        password,
        "date": modDate,
        "capacity": parseInt(capacity || 0, 10),
        "from": from ? new Date(from) : null,
        "to": to ? new Date(to) : null,
        "status": date === "always" ? "active" : "pending",
        "escapeRoomId": req.escapeRoom.id
    });
    const {i18n} = res.locals;

    let back = "";

    if (date === "always") {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos`;
    } else {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;
    }

    turn.save().
        then(() => {
            req.flash("success", i18n.common.flash.successCreatingTurno);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${i18n.common.flash.errorCreatingTurno}: ${error.message}`);
            next(error);
        });
};


// PUT /escapeRooms/:escapeRoomId/turno/:turnoId
exports.update = (req, res, next) => {
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

    let back = "";

    if (date === "always") {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos`;
    } else {
        back = `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;
    }

    turn.save().
        then(() => {
            req.flash("success", i18n.common.flash.successEditingTurno);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${i18n.common.flash.errorEdittingTurno}: ${error.message}`);
            next(error);
        });
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

        req.flash("success", i18n.common.flash.successDeletingTurno);
        res.redirect(back);
    } catch (error) {
        next(error);
    }
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

// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("turnos") : progressBar || nextStep("turnos")}`);
};
