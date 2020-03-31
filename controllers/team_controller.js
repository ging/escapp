const Sequelize = require("sequelize");
const {Op} = Sequelize;
const sequelize = require("../models");
const {models} = sequelize;
const {sendLeaveTeam} = require("../helpers/sockets");

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

    res.render("teams/new", {team, escapeRoom, "token": req.token, "turno": req.turn});
};


// POST /escapeRooms/:escapeRoomId/users/:userId/turnos/:turnId/teams
exports.create = async (req, res, next) => {
    const {escapeRoom, user, app, params, body, session} = req;

    const team = models.team.build({ "name": body.name, "turnoId": params.turnoId, "members": [session.user.id]});
    const back = "/escapeRooms";
    const teamCreated = await team.save();

    try {
        await teamCreated.addTeamMembers(req.session.user.id);
        req.flash("success", app.locals.i18n.common.flash.successCreatingTeam);

        try {
            const turnos = await user.getTurnosAgregados({"where": {"escapeRoomId": escapeRoom.id}});

            if (turnos.length === 0) {
                await user.addTurnosAgregados(params.turnoId);
                res.redirect(back);
            } else {
                req.flash("error", app.locals.i18n.team.alreadyIn);
                res.redirect(`/users/${session.user.id}/escapeRooms`);
            }
        } catch (e) {
            next(e);
        }
    } catch (err) {
        if (err instanceof Sequelize.ValidationError) {
            err.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        } else {
            req.flash("error", `${app.locals.i18n.common.flash.errorCreatingTeam}: ${err.message}`);
            next(err);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/teams
exports.index = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const where = {
        "include": [
            {
                "model": models.turno,
                "where": {"escapeRoomId": escapeRoom.id}
            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": ["name", "surname"]

            }
        ],
        "order": Sequelize.literal("lower(team.name) ASC")
    };

    if (turnId) {
        where.include[0].where.id = turnId;
    }
    try {
        const teams = await models.team.findAll(where);

        res.render("escapeRooms/teams", {teams, escapeRoom, turnId});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/turnos/:turnoId/teams
exports.indexTurnos = (req, res) => {
    const {escapeRoom} = req;

    res.render("teams/index", {"turno": req.turn, escapeRoom, "token": req.token});
};

// PUT /escapeRooms/:escapeRoomId/turnos/:turnoId/teams/:teamId/reset
exports.resetProgress = async (req, res) => {
    try {
        const userIds = [];

        for (const member of req.team.teamMembers) {
            userIds.push(member.id);
        }
        req.team.startTime = null;
        await models.requestedHint.destroy({"where": {"teamId": req.team.id}});
        await models.retosSuperados.destroy({"where": {"teamId": req.team.id}});
        await models.participants.update({"attendance": false}, {"where": {"userId": {[Op.in]: userIds}, "turnId": req.turn.id}});
        await req.team.save({"fields": ["startTime"]});
        sendLeaveTeam({"id": req.team.id, "turno": {"id": req.turn.id}});
        req.flash("error", req.app.locals.i18n.team.resetSuccess);
    } catch (e) {
        console.error(e)
        req.flash("error", req.app.locals.i18n.team.resetFail);
    }
    res.redirect("back");
};
