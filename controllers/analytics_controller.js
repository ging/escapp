const {models} = require("../models");
const {createCsvFile} = require("../helpers/csv");
const queries = require("../queries");
const {retosSuperadosByWho, flattenObject, getRetosSuperados, countHints, pctgRetosSuperados} = require("../helpers/utils");

// GET /escapeRooms/:escapeRoomId/analytics
exports.analytics = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        const teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId));
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
                map((r) => Math.round((r.retosSuperados.createdAt - (t.turno.startTime || t.startTime)) / 10 / 60) / 100).
                reduce((a, b) => a > b ? a : b, Math.Infinity)).
                reduce((a, b) => a < b ? a : b, Math.Infinity) || 0} min.`,
            "icon": "timer"
        };
        const sucessRate = {
            "value": `${Math.round(finished.length / teams.length * 10000) / 100 || 0}%`,
            "icon": "star"
        };
        const hintIds = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.id)).reduce((x, y) => x.concat(y), []);
        const hintLabels = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.content)).reduce((x, y) => x.concat(y), []);
        const reqHints = {
            "-1": 0,
            "0": 0
        };

        hintLabels.unshift(res.app.locals.i18n.analytics.hints.customClue);
        hintLabels.push(res.app.locals.i18n.analytics.hints.failedClue);
        hintIds.forEach((e) => {
            reqHints[e] = 0;
        });
        const avgReqHints = {
            "value": teams.length > 0 ? Math.round(teams.map((team) => team.requestedHints.filter((h) => {
                if (h.hintId) {
                    reqHints[h.hintId]++;
                } else {
                    reqHints[h.success ? 0 : -1]++;
                }

                return h.success;
            }).length).reduce((acc, c) => acc + c, 0) / teams.length * 100) / 100 : "n/a",
            "icon": "search"
        };
        const hintCount = Object.values(reqHints);
        const hintsByTeam = {
            "labels": hintLabels,
            "data": hintCount
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
        const charts = {retosSuperadosTeam,
            hintsByTeam};

        res.render("escapeRooms/analytics/analytics", {escapeRoom,
            turnId,
            summary,
            charts});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles/participants
exports.puzzlesByParticipants = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;
    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
    const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);

    try {
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy));
        const results = users.map((u) => {
            const {id, name, surname, dni, username} = u;
            const {retosSuperados} = retosSuperadosByWho(u.teamsAgregados[0], puzzles);
            const total = pctgRetosSuperados(retosSuperados);

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
                const rs = flattenObject(retosSuperados, puzzleNames);

                return {
                    name,
                    surname,
                    dni,
                    username,
                    ...rs,
                    total
                };
            });

            createCsvFile(res, resultsCsv);
        }
    } catch (e) {
        console.error(e);
        if (csv) {
            res.send("Error");
        } else {
            next(e);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles/teams
exports.puzzlesByTeams = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, csv} = query;

    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
    const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);

    try {
        const teams = await models.team.findAll(queries.team.puzzlesByTeam(escapeRoom.id, turnId));
        const results = teams.map((team) => {
            const {id, name} = team;
            const {retosSuperados} = retosSuperadosByWho(team, puzzles);
            const total = pctgRetosSuperados(retosSuperados);
            const members = team.teamMembers.map((member) => `${member.name} ${member.surname}`);

            return {id,
                name,
                members,
                retosSuperados,
                turnId,
                total};
        });

        if (!csv) {
            res.render("escapeRooms/analytics/retosSuperadosByTeam", {escapeRoom,
                results,
                turnId});
        } else {
            const resultsCsv = results.map((rslt) => {
                const {id, name, retosSuperados, total} = rslt;
                const rs = flattenObject(retosSuperados, puzzleNames);

                return {
                    id,
                    name,
                    ...rs,
                    total
                };
            });

            createCsvFile(res, resultsCsv);
        }
    } catch (e) {
        console.error(e);
        if (csv) {
            res.send("Error");
        } else {
            next(e);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/ranking
exports.ranking = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        const teamsRanked = await models.team.findAll(queries.team.ranking(escapeRoom.id, turnId));
        const teams = getRetosSuperados(teamsRanked).map((team) => {
            const count = team.countretos;
            const startTime = team.turno.startTime || team.startTime;
            const latestRetoSuperado = team.latestretosuperado;
            const result = `${count}/${escapeRoom.puzzles.length}`;
            const finishTime = escapeRoom.puzzles.length === parseInt(count, 10) && startTime ? (new Date(latestRetoSuperado) - new Date(startTime)) / 1000 : null;

            return {...team,
                count,
                startTime,
                latestRetoSuperado,
                result,
                finishTime};
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


        res.render("escapeRooms/analytics/ranking", {teams,
            escapeRoom,
            turnId});
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/hints/participants
exports.hintsByParticipants = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;

    try {
        const users = await models.user.findAll(queries.hint.hintsByParticipant(escapeRoom.id, turnId, orderBy));
        const results = users.map((u) => {
            const [{requestedHints}] = u.teamsAgregados;
            const {name, surname} = u;

            const {hintsSucceeded, hintsFailed} = countHints(requestedHints);

            return {
                "name": `${name} ${surname}`,
                hintsSucceeded,
                hintsFailed
            };
        });

        if (!csv) {
            res.render("escapeRooms/analytics/hints", {escapeRoom,
                results,
                turnId,
                orderBy,
                "single": true});
        } else {
            const resultsCsv = [];

            for (const u in users) {
                const user = users[u];
                const {id, name, surname, dni, username} = user;
                const [{requestedHints, turno, "startTime": turnoTeamStart}] = user.teamsAgregados;
                const startTime = turno.startTime || turnoTeamStart;

                for (const h in requestedHints) {
                    const hint = requestedHints[h];
                    const {success, score, createdAt} = hint;
                    const hintContent = hint.hint && hint.hint.content ? hint.hint.content : "";
                    const minute = Math.floor((createdAt - startTime) / 60000); // TODO team.startTime

                    resultsCsv.push({
                        id,
                        name,
                        surname,
                        dni,
                        username,
                        success,
                        score,
                        "hint": hintContent,
                        minute,
                        createdAt
                    });
                }
            }

            createCsvFile(res, resultsCsv);
        }
    } catch (e) {
        console.error(e);
        if (csv) {
            res.send("Error");
        } else {
            next(e);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/hints/teams
exports.hintsByTeams = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;


    try {
        const teams = await models.team.findAll(queries.hint.hintsByTeam(escapeRoom.id, turnId, orderBy));

        if (!csv) {
            const results = teams.map((t) => {
                const {id, name, requestedHints} = t;

                const {hintsSucceeded, hintsFailed} = countHints(requestedHints);

                return {
                    id,
                    name,
                    hintsSucceeded,
                    hintsFailed
                };
            });

            res.render("escapeRooms/analytics/hints", {
                escapeRoom,
                results,
                turnId,
                "single": false,
                orderBy
            });
        } else {
            const resultsCsv = [];

            for (const t in teams) {
                const team = teams[t];
                const {id, name, requestedHints, turno} = team;
                const startTime = turno.startTime || team.startTime;

                for (const h in requestedHints) {
                    const hint = requestedHints[h];
                    const {success, score, createdAt} = hint;
                    const minute = Math.floor((hint.createdAt - startTime) / 60000); // TODO team.startTime
                    const hintContent = hint.hint && hint.hint.content ? hint.hint.content : "";

                    resultsCsv.push({
                        id,
                        "team": name,
                        score,
                        "hint": hintContent,
                        success,
                        minute,
                        "createdAt": new Date(createdAt)
                    });
                }
            }

            createCsvFile(res, resultsCsv);
        }
    } catch (e) {
        console.error(e);
        if (csv) {
            res.send("Error");
        } else {
            next(e);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/progress
exports.progress = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        const teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId, "lower(team.name) ASC"));
        const result = teams.map((team) => {
            const {id, name, retos, turno} = team;
            const startTime = turno.startTime || team.startTime;
            const retosSuperadosArr = retos.map((reto) => {
                const {retosSuperados} = reto;
                const {createdAt} = retosSuperados;
                const time = startTime ? (createdAt - startTime) / 1000 : null;

                return {"id": reto.id,
                    time};
            });

            return {
                id,
                name,
                "retosSuperados": startTime ? retosSuperadosArr : []
            };
        });

        res.render("escapeRooms/analytics/progress", {"escapeRoom": req.escapeRoom,
            "teams": result});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/timeline
exports.timeline = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        const teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId, "lower(team.name) ASC"));

        res.render("escapeRooms/analytics/timeline", {"escapeRoom": req.escapeRoom,
            teams});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/histogram
exports.histogram = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        const teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId)).
            map((team) => {
                const {turno} = team;
                const startTime = turno.startTime || team.startTime;

                return {
                    "id": team.id,
                    "retosSuperados": team.retos.map((reto) => ({"id": reto.id,
                        "time": startTime ? (reto.retosSuperados.createdAt - startTime) / 1000 : null}))
                };
            });
        const result = {};

        for (const t in teams) {
            const team = teams[t];

            for (const r in team.retosSuperados) {
                const reto = team.retosSuperados[r];

                result[reto.id] = [
                    ...result[reto.id] || [],
                    reto.time
                ];
            }
        }

        res.render("escapeRooms/analytics/histogram", {"escapeRoom": req.escapeRoom,
            "puzzles": result});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/grading
exports.grading = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;
    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
    const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);

    try {
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy, true));

        const results = users.map((user) => {
            const {name, surname, dni, username} = user;
            const turno = user.turnosAgregados[0].date;
            const startDate = user.turnosAgregados[0].startTime || user.teamsAgregados[0].startTime;

            const {retosSuperados} = retosSuperadosByWho(user.teamsAgregados[0], puzzles, false, startDate);
            const [{requestedHints}] = user.teamsAgregados;

            let {hintsSucceeded, hintsFailed} = countHints(requestedHints);

            const grades = retosSuperados.map((reto, index) => reto * (escapeRoom.puzzles[index].score || 0));
            const gradeScore = grades.reduce((a, b) => a + b);
            const attendance = user.turnosAgregados[0].participants.attendance ? escapeRoom.scoreParticipation : 0;

            hintsFailed *= escapeRoom.hintFailed || 0;
            hintsSucceeded *= escapeRoom.hintSuccess || 0;
            const total = hintsFailed + hintsSucceeded + attendance + gradeScore;

            return {
                name,
                surname,
                dni,
                username,
                turno,
                grades,
                turnId,
                attendance,
                hintsFailed,
                hintsSucceeded,
                total
            };
        });

        if (csv) {
            const resultsCsv = results.map((rslt) => {
                const {name, surname, username, dni, turno, grades, attendance, hintsFailed, hintsSucceeded, total} = rslt;
                const rs = {};

                for (const r in grades) {
                    rs[puzzleNames[r]] = grades[r];
                }
                return {
                    name,
                    surname,
                    username,
                    dni,
                    turno,
                    ...rs,
                    attendance,
                    hintsFailed,
                    hintsSucceeded,
                    total
                };
            });

            createCsvFile(res, resultsCsv);
        } else {
            res.render("escapeRooms/analytics/grading", {escapeRoom,
                results,
                turnId,
                orderBy});
        }
    } catch (e) {
        console.error(e);
        if (csv) {
            res.send("Error");
        } else {
            next(e);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/download
exports.download = async (req, res) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy} = query;
    const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
    const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);

    try {
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy, true));

        const results = users.map((user) => {
            const {name, surname, dni, username} = user;
            const turno = user.turnosAgregados[0].startTime || user.teamsAgregados[0].startTime;
            const team = user.teamsAgregados[0].name;

            const {retosSuperados, retosSuperadosMin} = retosSuperadosByWho(user.teamsAgregados[0], puzzles, true, turno);
            const rs = flattenObject(retosSuperados, puzzleNames);
            const rsMin = flattenObject(retosSuperadosMin, puzzleNames, true);
            const [{requestedHints}] = user.teamsAgregados;

            const {hintsSucceeded, hintsFailed} = countHints(requestedHints);
            const attendance = Boolean(user.turnosAgregados[0].participants.attendance);

            return {
                name,
                surname,
                dni,
                username,
                team,
                attendance,
                ...rs,
                ...rsMin,
                turno,
                hintsFailed,
                hintsSucceeded
            };
        });

        await createCsvFile(res, results);
    } catch (e) {
        console.error(e);
        res.send("Error");
    }
};
