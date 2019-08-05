const Sequelize = require("sequelize");
const {models} = require("../models");
const converter = require("json-2-csv");

// GET /escapeRooms/:escapeRoomId/analytics
exports.analytics = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const where = {
        "attributes": [],
        "include": [
            {
                "model": models.turno,
                "attributes": ["startTime"],
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
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {
                    "model": models.retosSuperados
                }
            },
            {
                "model": models.requestedHint,
                "attributes": ["id"],
                "where": {"success": true},
                "required": false
            }
        ]
    };

    if (turnId) {
        where.include[0].where.id = turnId;
    }
    models.team.findAll(where).then((teams) => {
        const teamSizes = teams.map((t) => t.teamMembers.length);

        const nParticipants = {
            "value": teamSizes.reduce((acc, c) => acc + c, 0),
            "icon": "person"
        };

        const avgTeamSize = {
            "value": Math.round(nParticipants.value / teamSizes.length * 100) / 100 || 0,
            "icon": "group"
        };

        const finished = teams.filter((t) => t.retos.length === escapeRoom.puzzles.length);

        const bestTime = {
            "value": `${finished.map((t) => t.retos.
                map((r) => Math.round((r.retosSuperados.createdAt - t.turno.startTime) / 10 / 60) / 100).
                reduce((a, b) => a > b ? a : b, Math.Infinity)).
                reduce((a, b) => a < b ? a : b, Math.Infinity) || 0} min.`,
            "icon": "timer"
        };
        const sucessRate = {
            "value": `${Math.round(finished.length / teams.length * 10000) / 100 || 0}%`,
            "icon": "star"
        };

        const avgReqHints = {
            "value": teams.length > 0 ? Math.round(teams.map((team) => team.requestedHints.length).reduce((acc, c) => acc + c, 0) / teams.length * 100) / 100 : "n/a",
            "icon": "search"
        };

        const idPuzzles = escapeRoom.puzzles.map((p) => p.id);
        const retosSuperadosTeam = {
            "labels": escapeRoom.puzzles.map((p) => p.title),
            "data": Array(escapeRoom.puzzles.length).fill(0)
        };

        teams.forEach((team) => {
            if (team.retos) {
                team.retos.forEach((reto) => {
                    retosSuperadosTeam.data[idPuzzles.indexOf(reto.id)] += 1;
                });
            }
        });
        const summary = {
            nParticipants,
            sucessRate,
            bestTime,
            avgTeamSize,
            avgReqHints
        };
        const charts = {retosSuperadosTeam};

        res.render("escapeRooms/analytics/analytics", {escapeRoom,
            turnId,
            summary,
            charts});
    }).
        catch((e) => {
            console.error(e);
            next(e);
        });
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

// GET /escapeRooms/:escapeRoomId/analytics/ranking
exports.ranking = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const options = {
        // "includeIgnoreAttributes": false,
        "attributes": ["name"],
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
                    // "status": {[Sequelize.Op.not]: "pending"},
                    "escapeRoomId": escapeRoom.id
                }
            },
            {
                "model": models.puzzle,
                "attributes": ["id"],
                "as": "retos",
                "required": false,
                "duplicating": true,
                "through": {
                    "model": models.retosSuperados,
                    "attributes": ["createdAt"],
                    "required": true
                }
            }
        ]
    };


    if (turnId) {
        options.include[1].where.id = turnId;
    }
    models.team.findAll(options).
        then((result) => {
            const teams = result.map((teamRes) => ({...teamRes.dataValues,
                "countretos": teamRes.dataValues.retos.length,
                "latestretosuperado": teamRes.dataValues.retos && teamRes.dataValues.retos.length > 0 ? teamRes.dataValues.retos.map((r) => r.retosSuperados.createdAt).sort((a, b) => a < b)[0] : null})).sort((t1, t2) => {
                if (t1.countretos === t2.countretos) {
                    if (t1.latestretosuperado === t2.latestretosuperado) {
                        return 0;
                    }
                    return t1.latestretosuperado > t2.latestretosuperado ? 1 : -1;
                }
                return t1.countretos > t2.countretos ? -1 : 1;
            });

            res.render("escapeRooms/analytics/ranking", {teams,
                escapeRoom,
                turnId});
        }).
        catch((e) => next(e));
};

exports.hints = (req, res, next) => {
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
                         "include": {
                            "model": models.escapeRoom,
                            "required": true,
                            "where": {
                                "id": escapeRoom.id
                            }
                        }
                    },
                    {
                        "model": models.requestedHint,
                        "include": {
                            "model": models.hint,
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
    const hints = [].concat.apply([], escapeRoom.puzzles.map((puz) => puz.hints.map(h=>h.id)));
    const hintNames = [].concat.apply([],escapeRoom.puzzles.map((puz) => puz.hints.map(h=>h.title)));
    models.user.findAll(options).
        then((users) => {
            const results = users.map((u) => {
                let hintsSucceeded = 0
                let hintsFailed = 0
                const {id, name, surname, dni, username} = u;
                u.teamsAgregados[0].requestedHints.map((h) => {
                    if (h.success) {
                        hintsSucceeded++;
                    } else {
                        hintsFailed++;
                    }
                });
                return {
                    id,
                    name,
                    surname,
                    dni,
                    username,
                    hintsSucceeded,
                    hintsFailed
                };
            });
            if (!csv) {
                res.render("escapeRooms/analytics/hints", {escapeRoom,
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
}

// GET /escapeRooms/:escapeRoomId/analytics/timeline
exports.timeline = (req, res) => {
    res.render("escapeRooms/analytics/timeline", {"escapeRoom": req.escapeRoom});
};
