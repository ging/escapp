const {models} = require("../models");
const {sendJoinParticipant} = require("../helpers/sockets");

// PUT /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnoId/members/:teamId
exports.add = async (req, res, next) => {
    const direccion = req.body.redir || "/escapeRooms";
    const {escapeRoom, turn, team, user, token} = req;
    const {startTime} = team;

    try {
        const members = await team.getTeamMembers();
        const participants = await models.user.count({"include": [{ "model": models.turno, "through": "participants", "as": "turnosAgregados", "where": {"id": turn.id}}]});

        if (escapeRoom.nmax && participants >= escapeRoom.nmax) {
            req.flash("error", req.app.locals.i18n.turnos.fullTurno);
            res.redirect(`/escapeRooms/${escapeRoom.id}/join?token=${token}`);
            return;
        }

        const time = turn.startTime || startTime;

        if (time + escapeRoom.duration < new Date()) { // Already finished
            req.flash("error", req.app.locals.i18n.turnos.tooLate);
            res.redirect(`/escapeRooms/${escapeRoom.id}/join?token=${token}`);
            return;
        }

        if (escapeRoom.teamSize && members.length < escapeRoom.teamSize) {
            await team.addTeamMembers(req.session.user.id);
            const turnos = await user.getTurnosAgregados({"where": {"escapeRoomId": escapeRoom.id}});
            const newMembers = await team.getMembers();

            if (!turnos || turnos.length === 0) {
                await user.addTurnosAgregados(turn.id);
                if (escapeRoom.automaticAttendance === "team" && (startTime instanceof Date && isFinite(startTime))) {
                    await models.participants.update({"attendance": true}, {"where": {"userId": user.id, "turnId": turn.id}});
                }

                const teamMembers = [];
                const teamMembersNames = [];

                for (const p in newMembers) {
                    const member = newMembers[p];

                    teamMembers.push({"name": member.name, "surname": member.surname});
                    teamMembersNames.push(`${member.name} ${member.surname}`);
                }
                const participantsNames = teamMembersNames.join(", ");

                sendJoinParticipant({"id": team.id, "turno": turn, "participants": participantsNames, teamMembers});
                res.redirect(direccion);
            } else {
                req.flash("error", req.app.locals.i18n.turnos.alreadyIn);
                res.redirect(`/users/${req.session.user.id}/escapeRooms`);
            }
        } else {
            req.flash("error", req.app.locals.i18n.team.fullTeam);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${req.turn.id}/teams?token=${token}`);
        }
    } catch (error) {
        next(error);
    }
};
