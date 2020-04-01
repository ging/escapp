const {models} = require("../models");// Autoload the user with id equals to :userId
const {createCsvFile} = require("../helpers/csv");
const Sequelize = require("sequelize");
const {Op} = Sequelize;
const queries = require("../queries");
const {sendLeaveTeam, sendLeaveParticipant} = require("../helpers/sockets");

exports.checkJoinToken = (req, res, next) => {
    const token = req.query.token || req.body.token;

    if (token !== req.escapeRoom.invitation) {
        req.flash("error", req.app.locals.i18n.participant.wrongToken);
        res.redirect(`/escapeRooms/${req.escapeRoom.id}/join`);
    } else {
        req.token = token;
        next();
    }
};

// POST  /escapeRooms/:escapeRoomId/users/:userId/selectTurno
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
            const {id, name, gender, username, surname, dni, teamsAgregados, turnosAgregados} = user;
            const [{"id": turnoId, "date": turnDate, "participants": parts}] = turnosAgregados;
            const [{"id": teamId}] = teamsAgregados;
            const {attendance} = parts;

            participants.push({id, name, surname, gender, username, dni, teamId, turnoId, turnDate, attendance});
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
    let redirectUrl = `/escapeRooms/${req.escapeRoom.id}/participants`;

    try {
        // TODO También echar si el turno no está con status pending
        if (req.user && req.user.id !== req.session.user.id && req.session.user.isStudent) {
            // If it's not myself and I am not a teacher
            res.redirect("back");
            return;
        } else if (!req.user && req.session.user.isStudent) {
            if (turn.status === "finished" || (turn.status === "active" && (turn.startTime || req.team.startTime))) {
                req.flash("error", `${req.app.locals.i18n.common.flash.errorStudentLeave}`);
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
            next(new Error(res.app.locals.i18n.api.notAParticipant));
            return;
        }
        await participant.destroy();
        if (req.session.user.isStudent) {
            redirectUrl = `/users/${req.session.user.id}/escapeRooms`;
        }

        if (req.team.teamMembers.length <= 1) {
            await req.team.destroy();
            sendLeaveTeam({"id": teamId, "turno": {"id": turnId}});
        } else {
            const members = await req.team.getTeamMembers();
            const teamMembers = [];
            const participantsNames = [];

            for (const member of members) {
                teamMembers.push({"name": member.name, "surname": member.surname});
                participantsNames.push(`${member.name} ${member.surname}`);
            }
            const participants = participantsNames.join(", ");
            const team = {"id": req.team.id, teamMembers, participants, "turno": {"id": req.turn.id}};

            sendLeaveParticipant(team, req.session.user.id);
        }
        res.redirect(redirectUrl);
    } catch (e) {
        next(e);
    }
};
