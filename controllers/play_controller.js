const {Op} = require("sequelize");
const {playInterface, getRetosSuperados} = require("../helpers/utils");
const {models} = require("../models");
const queries = require("../queries");


// GET /escapeRooms/:escapeRoomId/play
exports.play = (req, res, next) => playInterface("team", req, res, next);

// GET /escapeRooms/:escapeRoomId/project
exports.classInterface = (req, res, next) => playInterface("class", req, res, next);

exports.ranking = async (req, res, next) => {
    let {turnoId} = req.params;

    try {
        const turno = await models.turno.findOne(queries.turno.myTurno(req.escapeRoom.id, req.session.user.id));

        if (turno) {
            turnoId = turno.id;
            if (turno.teams && turno.teams.length) {
                req.teamId = turno.teams[0].id;
            }
        }

        const teams = await models.team.findAll(queries.team.ranking(req.escapeRoom.id, turnoId));

        req.teams = getRetosSuperados(teams).map((team) => {
            const {"countretos": count, "turno": turn, "latestretosuperado": latestRetoSuperado} = team;
            const startTime = turn.startTime || team.startTime;
            const result = `${count}/${req.escapeRoom.puzzles.length}`;
            const finishTime = req.escapeRoom.puzzles.length === parseInt(count, 10) && startTime ? (new Date(latestRetoSuperado) - new Date(startTime)) / 1000 : null;

            return {...team, count, startTime, result, finishTime};
        }).
            sort((a, b) => {
                if (a.count > b.count) {
                    return -1;
                } else if (a.count < b.count) {
                    return 1;
                }
                if (a.finishTime < b.finishTime) {
                    return -1;
                }
                return 1;
            });
        next();
    } catch (e) {
        console.error(e);
        next();
    }
};

exports.finish = async (req, res) => {
    const {turnoId} = req.params;
    const {teamId} = req;
    const turno = await models.turno.findOne(queries.turno.myTurno(req.escapeRoom.id, req.session.user.id));

    if (turnoId || turno) {
        res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom, "teams": req.teams, "turnoId": turnoId || turno.id, teamId, "userId": req.session.user.id});
    } else {
        res.redirect("back");
    }
};

// POST /escapeRooms/:escapeRoomId/play
exports.startPlaying = async (req, res) => {
    const {escapeRoom} = req;
    const team = await models.team.findOne({
        "attributes": ["id", "startTime"],
        "include": [
            {
                "model": models.user,
                "attributes": [],
                "as": "teamMembers",
                "where": {"id": req.session.user.id}
            },
            {
                "model": models.turno,
                "attributes": ["id"],
                "where": {"escapeRoomId": escapeRoom.id}
            }
        ]
    });

    if (team && !team.turno.startTime && !(team.startTime instanceof Date && isFinite(team.startTime))) {
        team.startTime = new Date();
        await team.save({"fields": ["startTime"]}); // Register start time for self-paced shifts
        await models.participants.update({"attendance": true}, { // Register attendance for self-paced shifts
            "where": {
                [Op.and]: [
                    {"turnId": team.turno.id},
                    {"userId": req.session.user.id}
                ]
            }
        });
    }
    res.redirect(`/escapeRooms/${escapeRoom.id}/play`);
};
