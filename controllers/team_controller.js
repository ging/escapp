const Sequelize = require("sequelize");
const {Op} = Sequelize;
const sequelize = require("../models");
const {models} = sequelize;
const {sendLeaveTeam} = require("../helpers/sockets");
const {checkTeamSizeOne, getRanking} = require("../helpers/utils");

// Autoload the team with id equals to :teamId
exports.load = (req, res, next, teamId) => {
    models.team.findByPk(teamId, {
        "where": req.params.turnId ? {"turnId": req.params.turnId} : undefined,
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

// GET /escapeRooms/:escapeRoomId/turnos/:turnoId/teams/new
exports.new = (req, res) => {
    const team = {"name": ""};
    const {escapeRoom} = req;

    res.render("teams/new", {team, escapeRoom, "token": req.token, "turno": req.turn});
};


// POST /escapeRooms/:escapeRoomId/turnos/:turnId/teams
exports.create = async (req, res, next) => {
    const {app, params, body} = req;
    const {user} = req.session;

    if (!user.isStudent) {
        req.flash("error", `${app.locals.i18n.common.flash.errorCreatingTeam}`);
        res.redirect("back");
        return;
    }
    const transaction = await sequelize.transaction();

    try {
        const teamCreated = await models.team.create({ "name": body.name, "turnoId": params.turnoId}, {transaction});

        await teamCreated.addTeamMembers(user.id, {transaction});
        await models.participants.create({"attendance": false, "turnId": params.turnoId, "userId": user.id}, {transaction});
        req.flash("success", app.locals.i18n.common.flash.successCreatingTeam);
        res.redirect("/escapeRooms");
        transaction.commit();
    } catch (err) {
        transaction.rollback();
        if (err instanceof Sequelize.ValidationError) {
            err.errors.forEach(({message}) => req.flash("error", message));
            res.redirect("back");
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
    const onlyOneMember = checkTeamSizeOne(escapeRoom);

    if (onlyOneMember) {
        res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${req.turn.id}/teams`); // TODO Where?
    } else {
        res.render("teams/index", {"turno": req.turn, escapeRoom, "token": req.token});
    }
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
        const teams = await getRanking(req.escapeRoom.id, req.turn.id);

        sendLeaveTeam(req.team.id, req.turn.id, teams);
        req.flash("error", req.app.locals.i18n.team.resetSuccess);
    } catch (e) {
        console.error(e);
        req.flash("error", req.app.locals.i18n.team.resetFail);
    }
    res.redirect("back");
};
