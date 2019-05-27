const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the team with id equals to :teamId
exports.load = (req, res, next, teamId) => {
    models.team.findByPk(teamId, {
        "include": {
            "model": models.user,
            "as": "teamMembers"
        }
    }).
        then((team) => {
            if (!team) {
                res.send(404);
                throw new Error(404);
            } else {
                req.team = team;
                next();
            }
        }).
        catch((error) => next(error));
};

// GET /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnoId/teams/new
exports.new = (req, res) => {
    const team = {"name": ""};
    const {escapeRoom} = req;

    res.render("teams/new", {team,
        escapeRoom,
        "turno": req.turn});
};


// POST /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnId/teams
exports.create = (req, res, next) => {
    const {escapeRoom} = req;
    const team = models.team.build({"name": req.body.name,
        "turnoId": req.turn.id,
        "members": [req.session.user.id]});

    const back = "/escapeRooms";

    team.save().
        then((teamCreated) => {
            teamCreated.addTeamMembers(req.session.user.id).then(() => {
                req.flash("success", "Equipo creado correctamente.");

                req.user.getTurnosAgregados({"where": {"escapeRoomId": escapeRoom.id}}).then(function (turnos) {
                    if (turnos.length === 0) {
                        req.user.addTurnosAgregados(req.turn.id).
                            then(function () {
                                res.redirect(back);
                            }).
                            catch(function (error) {
                                next(error);
                            });
                    } else {
                        req.flash("error", req.app.locals.i18n.team.alreadyIn);
                        res.redirect(`/users/${req.session.user.id}/escapeRooms`);
                    }
                }).
                    catch((e) => next(e));
            });
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingTeam}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/teams
exports.index = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const where = {
        "include": [
            {
                "model": models.turno,
                "where": {
                    "escapeRoomId": escapeRoom.id
                }
            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [
                    "name",
                    "surname"
                ]

            }
        ],
        "order": Sequelize.literal("lower(team.name) ASC")
    };

    if (turnId) {
        where.include[0].where.id = turnId;
    }
    models.team.findAll(where).then((teams) => {
        res.render("escapeRooms/teams", {teams,
            escapeRoom,
            turnId});
    }).
        catch((e) => {
            console.error(e);
            next(e);
        });
};

// GET /escapeRooms/:escapeRoomId/turnos/:turnoId/teams
exports.indexTurnos = (req, res) => {
    const {escapeRoom} = req;

    res.render("teams/index", {"turno": req.turn,
        escapeRoom});
};


