const Sequelize = require("sequelize");
const {models} = require("../models");
const converter = require("json-2-csv");

// GET /escapeRooms/:escapeRoomId/analytics
exports.analytics = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/analytics/analytics", {escapeRoom});
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles/participants
exports.puzzlesByParticipants = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;
    const options = {
        "include": [
            {
                "model": models.team,
                "as": "teamsAgregados",
                "required": true,
                "include": [
                    {
                        "model": models.turno,
                        "where": {},
                        "include": {
                            "model": models.escapeRoom,
                            "required": true,
                            "where": {
                                "id": escapeRoom.id
                            }
                        }
                    },
                    {
                        "model": models.puzzle,
                        "as": "retos",
                        "through": {
                            "model": models.retosSuperados
                        }
                    }
                ]
            }

        ]
    };

    if (turnId) {
        options.include[0].include[0].where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
    }
    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
    const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);

    models.user.findAll(options).
        then((users) => {
            const results = users.map((u) => {
                const {id, name, surname, dni, username} = u;
                const retosSuperados = new Array(puzzles.length).fill(0);

                u.teamsAgregados[0].retos.map((reto) => {
                    const idx = puzzles.indexOf(reto.id);

                    if (idx > -1) {
                        retosSuperados[idx] = 1;
                    }
                    return 0;
                });
                const total = Math.round(retosSuperados.filter((r) => r === 1).length * 10000 / retosSuperados.length) / 100;

                return {id,
                    name,
                    surname,
                    dni,
                    username,
                    retosSuperados,
                    total};
            });

            if (!csv) {
                res.render("escapeRooms/analytics/retosSuperadosByParticipant", {escapeRoom,
                    results,
                    turnId,
                    orderBy});
            } else {
                const resultsCsv = results.map((rslt) => {
                    const {name, surname, dni, username, retosSuperados, total} = rslt;
                    const rs = {};

                    for (const r in retosSuperados) {
                        rs[puzzleNames[r]] = retosSuperados[r];
                    }
                    return {
                        name,
                        surname,
                        dni,
                        username,
                        ...rs,
                        total
                    };
                });

                converter.json2csv(
                    resultsCsv,
                    (err, csvText) => {
                        if (err) {
                            next(err);
                            return;
                        }
                        res.setHeader("Content-Type", "text/csv");
                        res.setHeader("Content-Disposition", `attachment; filename="results-${Date.now()}.csv`);
                        res.write(csvText);
                        res.end();
                    },
                    {
                        "delimiter": {
                            "field": ";"
                        }
                    }
                );
            }
        }).
        catch((e) => {
            console.error(e);
            if (csv) {
                res.send("Error");
            } else {
                next(e);
            }
        });
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles/teams
exports.puzzlesByTeams = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const options = {
        "include": [
            {
                "model": models.turno,
                "where": {
                    "escapeRoomId": escapeRoom.id
                }
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {"model": models.retosSuperados}
            }
        ],
        "order": Sequelize.literal("lower(team.name) ASC")
    };

    if (turnId) {
        options.include[0].where.id = turnId;
    }
    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);

    models.team.findAll(options).
        then((teams) => {
            const results = teams.map((u) => {
                const {id, name} = u;
                const retosSuperados = new Array(puzzles.length).fill(0);

                u.retos.map((reto) => {
                    const idx = puzzles.indexOf(reto.id);

                    if (idx > -1) {
                        retosSuperados[idx] = 1;
                    }
                    return 0;
                });
                return {id,
                    name,
                    retosSuperados,
                    turnId};
            });

            res.render("escapeRooms/analytics/retosSuperadosByTeam", {escapeRoom,
                results,
                turnId});
        }).
        catch((e) => next(e));
};

// GET /escapeRooms/:escapeRoomId/analytics/summary
exports.summary = (req, res) => {
    res.render("escapeRooms/analytics/summary");
};

// GET /escapeRooms/:escapeRoomId/analytics/ranking
exports.ranking = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const isPg = process.env.DATABASE_URL;
    const options = {
        "includeIgnoreAttributes": false,
        "attributes": [
            "name",
            [
                Sequelize.fn(
                    "MAX",
                    Sequelize.col(isPg ? "\"retos->retosSuperados\".\"createdAt\"" : "`retos->retosSuperados`.`createdAt`")
                ),
                "latestretosuperado"
            ],
            [
                Sequelize.fn(
                    "COUNT",
                    Sequelize.col(isPg ? "\"retos->retosSuperados\".\"puzzleId\"" : "`retos->retosSuperados`.`puzzleId`")
                ),
                "countretos"
            ]

        ],
        "group": [
            "team.id",
            "teamMembers.id"
        ],
        "include": [
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [
                    "name",
                    "surname"
                ],
                "through": {
                    "model": models.members,
                    "duplicating": true,
                    "attributes": []
                }
            },
            {
                "model": models.turno,
                "duplicating": true,
                "attributes": [
                    "id",
                    "date",
                    "startTime"
                ],
                "where": {
                    "status": {[Sequelize.Op.not]: "pending"},
                    "escapeRoomId": escapeRoom.id
                }
            },
            {
                "model": models.puzzle,
                "attributes": [],
                "as": "retos",
                "required": false,
                "duplicating": true,
                "through": {
                    "model": models.retosSuperados,
                    "attributes": [],
                    "required": true

                }
            }
        ],
        "order": [
            Sequelize.literal("countretos DESC"),
            Sequelize.literal("latestretosuperado ASC")
        ]
    };


    if (turnId) {
        options.include[1].where.id = turnId;
    }
    models.team.findAll(options).
        then((teams) => /* Res.json(teams)*/res.render("escapeRooms/analytics/ranking", {teams,
            escapeRoom,
            turnId})).
        catch((e) => next(e));
};

// GET /escapeRooms/:escapeRoomId/analytics/timeline
exports.timeline = (req, res) => {
    res.render("escapeRooms/analytics/timeline");
};
