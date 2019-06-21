const Sequelize = require("sequelize");
const {models} = require("../models");
const converter = require("json-2-csv");


exports.getTeams = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const where = {
        "attributes": [
            "id",
            "name"
        ],
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
        req.teams = teams;
        next();
    }).
        catch((e) => {
            console.error(e);
            next(e);
        });
};
// GET /escapeRooms/:escapeRoomId/analytics
exports.analytics = (req, res) => {
    const {escapeRoom, query, teams} = req;
    const {turnId} = query;

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


const currentPuzzle = (team, nPuzzles) => {
    const times = new Array(nPuzzles).fill(0);

    for (let i = 0; i < nPuzzles; i++) {
        for (let j = 0; j < team.retosSuperados.length; j++) {
            if (team.retosSuperados[j].id === i + 1) {
                times[i] = Math.round(team.retosSuperados[j].time / (60 * 5));
            }
        }
    }
    for (let i = 0; i < times.length - 1; i++) {
        times[i + 1] += times[i];
    }
    return times;
};

const nTeamsPuzzle = (puzzles, teams, duration) => {
    const nPuzzles = puzzles.length;
    const nTeams = teams.length;
    const info = new Array(nPuzzles);
    const times = new Array(nTeams);
    const intervals = Math.ceil(duration / 5) + 1;

    for (let i = 0; i < nTeams; i++) {
        times[i] = currentPuzzle(teams[i], nPuzzles);
    }
    for (let i = 0; i < nPuzzles; i++) {
        info[i] = new Array(intervals).fill(0);
        for (let j = 0; j < nTeams; j++) {
            const index = times[j][i];

            for (let k = index; k < intervals; k++) {
                if (index !== 0) {
                    info[i][k] += 1;
                }
            }
        }
    }

    return puzzles.map((puzzle, i) => ({"name": puzzle.title,
        "data": info[i]}));
};


const currentPuzzleBis = (team, duration) => {
    const intervals = Math.ceil(duration / 5) + 1;
    let position = 0;
    const puzzles = new Array(intervals).fill(team.retosSuperados.length);
    const times = team.retosSuperados.map((reto) => Math.floor(intervals * reto.time / (duration * 60))).reverse();

    for (let i = 0; i < times.length; i++) {
        const nHoles = times[i];

        puzzles.fill(i, position, position + nHoles);
        position += nHoles;
    }
    return puzzles;
};

const nPuzzlesTeam = (teams, duration, nPuzzles) => teams.map((team) => ({"name": team.name,
    "data": currentPuzzleBis(team, duration, nPuzzles)}));

// GET /escapeRooms/:escapeRoomId/analytics/timeline
exports.timeline = (req, res) => {
    const teams = req.teams.map((team) => ({
        "id": team.id,
        "name": team.name,
        "retosSuperados": team.retos.map((reto) => ({"id": reto.id,
            "time": (reto.retosSuperados.createdAt - team.turno.startTime) / 1000}))
    }));

    res.render("escapeRooms/analytics/timeline", {
        "escapeRoom": req.escapeRoom,
        teams,
        "turnId": req.query.turnId,
        "inverted": req.query.inverted,
        "data": req.query.inverted ? nPuzzlesTeam(teams, req.escapeRoom.duration, req.escapeRoom.puzzles.length) : nTeamsPuzzle(req.escapeRoom.puzzles, teams, req.escapeRoom.duration)
    });
};
