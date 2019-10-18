// PUT /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnoId/members/:teamId
exports.add = async (req, res, next) => {
    const direccion = req.body.redir || "/escapeRooms";
    const {escapeRoom, turn} = req;

    try {
        let members = await req.team.getTeamMembers();
        if (members.length < escapeRoom.teamSize) {
            await req.team.addTeamMembers(req.session.user.id)
            let turnos = await req.user.getTurnosAgregados({"where": {"escapeRoomId": escapeRoom.id}});
            if (turnos.length === 0) {
                await req.user.addTurnosAgregados(turn.id);
                res.redirect(direccion);
            } else {
                req.flash("error", req.app.locals.i18n.turnos.alreadyIn);
                res.redirect(`/users/${req.session.user.id}/escapeRooms`);
            }
        } else {
            req.flash("error", req.app.locals.i18n.team.fullTeam);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${req.turn.id}/teams`);
        }
    } catch (error) {
        next(error);
    }
};
