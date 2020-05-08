const {models} = require("../models");// Autoload the user with id equals to :userId
const {createCsvFile} = require("../helpers/csv");
const Sequelize = require("sequelize");
const {Op} = Sequelize;
const queries = require("../queries");
const {sendLeaveTeam, sendLeaveParticipant} = require("../helpers/sockets");
const {checkIsTurnAvailable, getRanking} = require("../helpers/utils");

exports.checkIsNotParticipant = async (req, res, next) => {
    const {escapeRoom} = req;
    const {i18n} = res.locals;

    const isParticipant = await models.participants.findOne({
        "where": {
            "userId": req.session.user.id,
            "turnId": {[Sequelize.Op.or]: [escapeRoom.turnos.map((t) => t.id)]}
        }
    });

    if (isParticipant) {
        req.flash("error", i18n.turnos.alreadyIn);
        res.redirect("/escapeRooms");
    } else {
        next();
    }
};

exports.checkJoinToken = (req, res, next) => {
    const token = req.query.token || req.body.token;
    const {i18n} = res.locals;

    if (token !== req.escapeRoom.invitation) {
        req.flash("error", i18n.participant.wrongToken);
        res.redirect(`/escapeRooms/${req.escapeRoom.id}/join`);
    } else {
        req.token = token;
        next();
    }
};

exports.checkSomeTurnAvailable = async (req, res, next) => {
    const { escapeRoom } = req;
    const turnos = await models.turno.findAll({"where": {"escapeRoomId": escapeRoom.id}, "include": [{"model": models.user, "as": "students", "through": "participants"}], "order": [["date", "ASC NULLS LAST"]]});
    const {i18n} = res.locals;

    req.turnos = turnos;
    for (const turno of turnos) {
        if (checkIsTurnAvailable(turno, escapeRoom.nmax, escapeRoom.duration)) {
            next();
            return;
        }
    }
    req.flash("error", i18n.turnos.noTurnAvailable);
    res.redirect("/escapeRooms");
};

exports.checkTurnAvailable = (req, res, next) => {
    const {turn, escapeRoom} = req;
    const {i18n} = res.locals;

    if (checkIsTurnAvailable(turn, escapeRoom.nmax, escapeRoom.duration)) {
        next();
        return;
    }
    req.flash("error", i18n.turnos.turnNotAvailable);
    res.redirect("back");
};

exports.checkTeamAvailable = (req, res, next) => {
    const {team, escapeRoom} = req;
    const {i18n} = res.locals;

    if (team.teamMembers && escapeRoom.teamSize && team.teamMembers.length >= escapeRoom.teamSize) {
        req.flash("error", i18n.team.fullTeam);
        res.redirect("back");
    } else if (team.startTime && new Date(team.startTime.getTime() + escapeRoom.duration * 60000) < new Date()) {
        req.flash("error", i18n.team.alreadyFinished);
        res.redirect("back");
    } else {
        next();
    }
};


// POST  /escapeRooms/:escapeRoomId/turnos/:turnId/select
exports.selectTurno = (req, res, next) => {
    const {escapeRoom} = req;

    if (escapeRoom.teamSize === 1) {
        req.body.name = req.session.user.name;
        req.params.turnoId = req.body.turnSelected;
        next();
    } else {
        const direccion = req.body.redir || `/escapeRooms/${escapeRoom.id}/turnos/${req.body.turnSelected}/teams?token=${req.token}`;

        res.redirect(direccion);
    }
};

// GET /escapeRooms/:escapeRoomId/participants
exports.index = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy} = query;

    try {
        const users = await models.user.findAll(queries.user.participantsWithTurnoAndTeam(escapeRoom.id, turnId, orderBy));
        const participants = [];

        users.forEach((user) => {
            const {id, name, gender, username, surname, teamsAgregados, turnosAgregados} = user;
            const [{"id": turnoId, "date": turnDate, "participants": parts}] = turnosAgregados;
            const [{"id": teamId}] = teamsAgregados;
            let {attendance} = parts;

            attendance = Boolean(attendance);

            participants.push({id, name, surname, gender, username, teamId, turnoId, turnDate, attendance});
        });
        if (req.query.csv) {
            createCsvFile(res, participants, "participants");
        } else {
            res.render("escapeRooms/participants", {escapeRoom, participants, turnId, orderBy});
        }
    } catch (e) {
        next(e);
    }
};

// POST /escapeRooms/:escapeRoomId/confirm
exports.confirmAttendance = async (req, res) => {
    const turnos = req.escapeRoom.turnos.map((t) => t.id);

    try {
        await models.participants.update({"attendance": true}, { "where": {[Op.and]: [{"turnId": {[Op.in]: turnos}}, {"userId": {[Op.in]: req.body.attendance.yes}}]} });
        await models.participants.update({"attendance": false}, { "where": {[Op.and]: [{"turnId": {[Op.in]: turnos}}, {"userId": {[Op.in]: req.body.attendance.no}}]}});
        await res.end();
    } catch (e) {
        res.status(500);
        res.end();
    }
};

// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId
// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId/user/:userId
exports.studentLeave = async (req, res, next) => {
    let {user} = req;
    const {turn} = req;
    const {i18n} = res.locals;
    let redirectUrl = `/escapeRooms/${req.escapeRoom.id}/participants`;

    try {
        if (req.user && req.user.id !== req.session.user.id && req.session.user.isStudent) {
            // If it's not myself and I am not a teacher
            res.redirect("back");
            return;
        } else if (!req.user && req.session.user.isStudent) {
            if (turn.status === "finished" || turn.status === "active" && (turn.startTime || req.team.startTime)) {
                req.flash("error", `${i18n.common.flash.errorStudentLeave}`);
                res.redirect("/");
                return;
            }
            user = await models.user.findByPk(req.session.user.id);
        }
        const userId = user.id;
        const turnId = turn.id;
        const teamId = req.team.id;

        await req.team.removeTeamMember(user);
        const participant = await models.participants.findOne({"where": { turnId, userId}});

        if (!participant) {
            next(new Error(i18n.api.notAParticipant));
            return;
        }
        await participant.destroy();
        if (req.session.user.isStudent) {
            redirectUrl = `/users/${req.session.user.id}/escapeRooms`;
        }

        if (req.team.teamMembers.length <= 1) {
            await req.team.destroy();
            const teams = await getRanking(req.escapeRoom.id, turnId);

            sendLeaveTeam(teamId, turnId, teams);
        } else {
            const teams = await getRanking(req.escapeRoom.id, turnId);

            sendLeaveParticipant(user.username, req.team.id, turnId, teams);
        }
        res.redirect(redirectUrl);
    } catch (e) {
        next(e);
    }
};
