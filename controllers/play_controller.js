const {playInterface} = require("../helpers/utils");
const {models} = require("../models");
const queries = require("../queries");


// GET /escapeRooms/:escapeRoomId/play
exports.play = (req, res, next) => {
    playInterface("team", req, res, next);
};

// GET /escapeRooms/:escapeRoomId/project
exports.classInterface = (req, res, next) => {
    playInterface("class", req, res, next);
};


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

        req.teams = await models.team.findAll(queries.team.playRankingQuery(turnoId, req.escapeRoom.id));
        next();
    } catch (e) {
        next();
    }
};

exports.finish = async (req, res) => {
    const {turnoId} = req.params;
    const {teamId} = req;
    const turno = await models.turno.findOne(queries.turno.myTurno(req.escapeRoom.id, req.session.user.id));

    res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
        "teams": req.teams,
        "turnoId": turnoId || turno.id,
        teamId,
        "userId": req.session.user.id});
};


// POST /escapeRooms/:escapeRoomId/play
exports.startPlaying = async (req, res) => {
    const {escapeRoom} = req;
    const team = await models.team.findOne({
        "attributes": [
            "id",
            "startTime"
        ],
        "include": [
            {
                "model": models.user,
                "attributes": [],
                "as": "teamMembers",
                "where": {
                    "id": req.session.user.id
                }
            },
            {
                "model": models.turno,
                "attributes": ["id"],
                "where": {
                    "escapeRoomId": escapeRoom.id
                }
            }
        ]
    });

    if (team && !team.startTime) {
        team.startTime = new Date();
        await team.save({"fields": ["startTime"]});
    }
    res.redirect(`/escapeRooms/${escapeRoom.id}/play`);
};
