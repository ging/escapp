const sequelize = require("../models");
const {models} = sequelize;
const {sendJoinParticipant} = require("../helpers/sockets");
const {getRanking} = require("../helpers/utils");

// PUT /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnoId/teams/:teamId
exports.add = async (req, res, next) => {
    const direccion = req.body.redir || "/escapeRooms";
    const {escapeRoom, turn, team, session, token} = req;
    const {startTime} = team;
    const {user} = session;
    const transaction = await sequelize.transaction();

    try {
        const time = turn.startTime || startTime;

        if (time && time + escapeRoom.duration < new Date()) { // Already finished
            req.flash("error", req.app.locals.i18n.turnos.tooLate);
            res.redirect(`/escapeRooms/${escapeRoom.id}/join?token=${token}`);
            return;
        }


        const attendance = escapeRoom.automaticAttendance === "team" && (startTime instanceof Date && isFinite(startTime));

        await models.participants.create({attendance, "userId": user.id, "turnId": turn.id}, {transaction});
        await team.addTeamMembers(req.session.user.id, {transaction});

        const newMembers = await team.getTeamMembers({}, {transaction});

        await transaction.commit();
        const teamMembers = [];
        const teamMembersNames = [];

        for (const p in newMembers) {
            const member = newMembers[p];

            teamMembers.push({"name": member.name, "surname": member.surname});
            teamMembersNames.push(`${member.name} ${member.surname}`);
        }
        const teams = await getRanking(escapeRoom.id, team.turno.id);

        sendJoinParticipant(user.username, team.id, turn.id, teams);
        res.redirect(direccion);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};
