const Sequelize = require("sequelize");
const {playInterface} = require("../helpers/utils");
const {models} = require("../models");


// GET /escapeRooms/:escapeRoomId/play
exports.play = (req, res) => {
    playInterface("team", req, res);
};

// GET /escapeRooms/:escapeRoomId/project
exports.classInterface = (req, res) => {
    playInterface("class", req, res);
};

exports.finish = (req, res) => {
    const isPg = process.env.DATABASE_URL;

    if (isPg) {
        res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
            "teams": [],
            "userId": req.session.user.id});
        return;
    }
    models.turno.findOne({
        "include": [
            {
                "model": models.escapeRoom,
                "where": {
                    "id": req.escapeRoom.id
                }
            },
            {
                "model": models.team,
                "include": [
                    {
                        "model": models.user,
                        "as": "teamMembers",
                        "where": {
                            "id": req.session.user.id
                        }
                    }
                ]
            }
        ]
    }).then((turno) => {
        const turnoId = turno.id;
        let teamId = null;

        if (turno.teams && turno.teams.length) {
            teamId = turno.teams[0].id;
        }
        models.team.findAll({
            "attributes": [
                "id",
                "name",
                [
                    Sequelize.fn(
                        "MAX",
                        Sequelize.col(isPg ? "\"retos->retosSuperados\".\"createdAt\"" : "`retos->retosSuperados`.`createdAt`")
                    ),
                    "latestretosuperado"
                ]
            ],
            "include": [

                {
                    "model": models.turno,
                    "attributes": ["startTime", "id"],
                    "where": {"id": turnoId}
                },
                {
                    "model": models.puzzle,
                    "attributes": [
                        "id",
                        "createdAt"
                    ],
                    "as": "retos",
                    "through": {
                        "attributes": [],
                        "model": models.retosSuperados
                    }
                },
                {
                    "model": models.user,
                    "as": "teamMembers",
                    "attributes": [
                        "id",
                        "name",
                        "surname"
                    ]
                }
            ],
            "group": [
                "team.id",
                "teamMembers.id",
                "retos.id",
                "turno.id"
            ],
            "order": [
            ]
        }).then((teams) => {
            res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
                teams,
                turnoId,
                teamId,
                "userId": req.session.user.id});
        }).catch((e) => {
            console.error(e);
            res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
                "teams": [],
                turnoId,
                teamId,
                "userId": req.session.user.id});
        });
    }).catch((e) => {
        console.error(e);
        res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
            "teams": [],
            "userId": req.session.user.id});
    });
};
