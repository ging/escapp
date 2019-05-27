// PUT /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnoId/members/:teamId
exports.add = (req, res, next) => {
    const direccion = req.body.redir || "/escapeRooms";
    const {escapeRoom, turn} = req;

    req.team.getTeamMembers().then(function (members) {
        if (members.length < escapeRoom.teamSize) {
            req.team.addTeamMembers(req.session.user.id).then(function () {
                req.user.getTurnosAgregados({"where": {"escapeRoomId": escapeRoom.id}}).then(function (turnos) {
                    if (turnos.length === 0) {
                        req.user.addTurnosAgregados(turn.id).
                            then(function () {
                                res.redirect(direccion);
                            }).
                            catch(function (error) {
                                next(error);
                            });
                    } else {
                        req.flash("error", req.app.locals.i18n.turnos.alreadyIn);
                        res.redirect(`/users/${req.session.user.id}/escapeRooms`);
                    }
                }).
                    catch((e) => next(e));
            }).
                catch(function (error) {
                    next(error);
                });
        } else {
            req.flash("error", req.app.locals.i18n.team.fullTeam);
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${req.turn.id}/teams`);
        }
    }).
        catch((e) => next(e));
};
