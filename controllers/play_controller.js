const Sequelize = require("sequelize");
const cloudinary = require("cloudinary");
const {parseURL} = require("../helpers/video");
const {models} = require("../models");


// GET /escapeRooms/:escapeRoomId/play
exports.play = (req, res) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom,
            cloudinary,
            "team": {"turno": req.turn,
                "retos": []},
            "hints": [],
            "isStudent": false,
            parseURL,
            "layout": false});
        return;
    }
    models.team.findAll({
        "include": [
            {
                "model": models.turno,
                "include": {
                    "model": models.escapeRoom,
                    "where": {
                        "id": req.escapeRoom.id
                    }
                },
                "required": true

            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [],
                "where": {
                    "id": req.session.user.id
                },
                "required": true
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {
                    "model": models.retosSuperados,
                    "required": false,
                    "attributes": ["createdAt"]

                }
            }

        ],
        "required": true
    }).then((teams) => {
        const team = teams && teams[0] ? teams[0] : [];

        if (team.turno.status !== "active") {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
        }
        models.requestedHint.findAll({
            "where": {
                "teamId": team.id,
                "success": true
            },
            "include": models.hint

        }).then((hints) => {
            res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom,
                cloudinary,
                team,
                "isStudent": true,
                "hints": hints || [],
                parseURL,
                "layout": false});
        });
    });
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

        models.team.findAll({
            "attributes": [
                "id",
                "name",
                [
                    Sequelize.fn(
                        "COUNT",
                        Sequelize.col(isPg ? "\"retos->retosSuperados\".\"puzzleId\"" : "`retos->retosSuperados`.`puzzleId`")
                    ),
                    "countretos"
                ],
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
                    "where": {"id": turnoId}
                },
                {
                    "model": models.puzzle,
                    "attributes": [],
                    "as": "retos",
                    "duplicating": false,
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
                "teamMembers.id"
            ],
            "order": [
                Sequelize.literal("countretos DESC"),
                Sequelize.literal("latestretosuperado ASC")
            ]
        }).then((teams) => {
            res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
                teams,
                "userId": req.session.user.id});
        }).
            catch((e) => {
                console.error(e);
                res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
                    "teams": [],
                    "userId": req.session.user.id});
            });
    }).
        catch((e) => {
            console.error(e);
            res.render("escapeRooms/play/finish", {"escapeRoom": req.escapeRoom,
                "teams": [],
                "userId": req.session.user.id});
        });
};
