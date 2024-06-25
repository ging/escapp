const {models} = require("../models");
const {createCsvFile} = require("../helpers/csv");
const queries = require("../queries");
const {flattenObject, getERPuzzles, getERTurnos, groupByTeamRetos} = require("../helpers/utils");
const {isTeamConnected, isTeamConnectedWaiting} = require("../helpers/sockets");
const {convertDate, retosSuperadosByWho, getRetosSuperados, getBestTime, getAvgHints, byRanking, pctgRetosSuperados, getRetosSuperadosIdTime, countHints, countHintsByPuzzle} = require("../helpers/analytics");
const stats = require("../helpers/stats");

// GET /escapeRooms/:escapeRoomId/analytics
exports.analytics = async (req, res, next) => {
    const {query} = req;
    const {turnId} = query;
    const {i18n} = res.locals;

    try {
        const escapeRoom = await models.escapeRoom.findByPk(req.escapeRoom.id, queries.escapeRoom.loadComplete);
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
            "value": getBestTime(finished),
            "icon": "timer"
        };
        const sucessRate = {
            "value": `${Math.round(finished.length / teams.length * 10000) / 100 || 0}%`,
            "icon": "star"
        };
        const hintIds = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.id)).reduce((x, y) => x.concat(y), []);
        const hintLabels = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.content)).reduce((x, y) => x.concat(y), []);
        const reqHints = {"0": 0};

        hintLabels.unshift(i18n.analytics.hints.customClue);
        hintIds.forEach((e) => {
            reqHints[e] = 0;
        });
        const avgReqHints = {
            "value": getAvgHints(teams, reqHints),
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
        const summary = {nParticipants, sucessRate, bestTime, avgTeamSize, avgReqHints};
        const charts = {retosSuperadosTeam, hintsByTeam};

        res.render("ctfs/analytics/analytics", {escapeRoom, turnId, summary, charts});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles/participants
exports.puzzlesByParticipants = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;


    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
        const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy));
        const results = users.map((u) => {
            const {id, name, surname, username} = u;
            const {retosSuperados, retosSuperadosMin} = retosSuperadosByWho(u.teamsAgregados[0], puzzles);
            const total = pctgRetosSuperados(retosSuperados);
            const [{"id": teamId, "name": teamName}] = u.teamsAgregados;

            return {id, name, surname, username, teamId, teamName, retosSuperados, retosSuperadosMin, total};
        });

        if (!csv) {
            res.render("ctfs/analytics/retosSuperadosByParticipant", {escapeRoom, results, turnId, orderBy});
        } else {
            const resultsCsv = results.map((rslt) => {
                const {id, name, surname, teamId, teamName, username, retosSuperados, total} = rslt;
                const rs = flattenObject(retosSuperados, puzzleNames);

                return {id, name, surname, teamId, teamName, username, ...rs, total};
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

    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        escapeRoom.turnosMap = {};
        for (const turno of escapeRoom.turnos) {
            escapeRoom.turnosMap[turno.id] = turno.startTime;
        }
        const puzzles = escapeRoom.puzzles.map((puz) => puz.id);
        const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title);
        const teams = await models.team.findAll(queries.team.puzzlesByTeam(escapeRoom.id, turnId));
        const results = teams.map((team) => {
            const {id, name} = team;
            const {retosSuperados, retosSuperadosMin} = retosSuperadosByWho(team, puzzles, true, team.turno.startTime || team.startTime);
            const total = pctgRetosSuperados(retosSuperados);
            const members = team.teamMembers.map((member) => `${member.name} ${member.surname}`);
            const teamAttendance = Boolean(team.startTime);

            return {id, name, members, teamAttendance, retosSuperados, retosSuperadosMin, turnId, total};
        });

        if (!csv) {
            res.render("ctfs/analytics/retosSuperadosByTeam", {escapeRoom, results, turnId});
        } else {
            const resultsCsv = results.map((rslt) => {
                const {id, name, retosSuperados, total} = rslt;
                const rs = flattenObject(retosSuperados, puzzleNames);

                return {id, name, ...rs, total};
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
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        const teamsRanked = await models.team.findAll(queries.team.ranking(escapeRoom.id, turnId));
        const teams = getRetosSuperados(teamsRanked, escapeRoom.puzzles.length).sort(byRanking);

        res.render("ctfs/analytics/ranking", {teams, escapeRoom, turnId});
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/hints/participants
exports.hintsByParticipants = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;

    try {
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        const users = await models.user.findAll(queries.hint.hintsByParticipant(escapeRoom.id, turnId, orderBy));
        const results = users.map((u) => {
            const [{requestedHints}] = u.teamsAgregados;
            const {name, surname} = u;
            const {hintsSucceeded, hintsFailed} = countHints(requestedHints);

            return {"name": `${name} ${surname}`, hintsSucceeded, hintsFailed};
        });

        if (!csv) {
            res.render("ctfs/analytics/hints", {escapeRoom, results, turnId, orderBy, "single": true});
        } else {
            const resultsCsv = [];

            for (const u in users) {
                const user = users[u];
                const {id, name, surname, username} = user;
                const [{requestedHints, turno, "startTime": turnoTeamStart, "id": teamId, "name": teamName}] = user.teamsAgregados;
                const startTime = turno.startTime || turnoTeamStart;
                const teamAttendance = Boolean(turnoTeamStart);

                for (const h in requestedHints) {
                    const reqHint = requestedHints[h];
                    const {success, score, createdAt} = reqHint;
                    const hint = reqHint.hint && reqHint.hint.content ? reqHint.hint.content : "";
                    const minute = Math.floor((createdAt - startTime) / 600) / 100;

                    resultsCsv.push({id, name, surname, username, teamId, teamName, teamAttendance, success, "score": Math.round(score * 100) / 100, hint, minute, createdAt});
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

        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        if (!csv) {
            const results = teams.map((t) => {
                const {id, name, requestedHints} = t;
                const {hintsSucceeded, hintsFailed} = countHints(requestedHints);

                return {id, name, hintsSucceeded, hintsFailed};
            });

            res.render("ctfs/analytics/hints", {escapeRoom, results, turnId, orderBy, "single": false});
        } else {
            const resultsCsv = [];

            for (const t in teams) {
                const team = teams[t];
                const {"id": teamId, "name": teamName, requestedHints, turno} = team;
                const startTime = turno.startTime || team.startTime;
                const teamAttendance = Boolean(team.startTime);

                for (const h in requestedHints) {
                    const hint = requestedHints[h];
                    const {success, score, createdAt} = hint;
                    const minute = Math.floor((hint.createdAt - startTime) / 600) / 100;
                    const hintContent = hint.hint && hint.hint.content ? hint.hint.content : "";

                    resultsCsv.push({"id": teamId, teamName, "score": Math.round(score * 100) / 100, teamAttendance, "hint": hintContent, success, minute, "createdAt": new Date(createdAt)});
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
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId, "lower(team.name) ASC"));
        const result = escapeRoom.teams.map((team) => {
            const {id, name, retos, turno, startTime} = team;
            const actualStartTime = turno.startTime || startTime;
            const retosSuperadosArr = getRetosSuperadosIdTime(retos, actualStartTime);

            return {id, name, "retosSuperados": actualStartTime ? retosSuperadosArr : []};
        });

        res.render("ctfs/analytics/progress", {escapeRoom, "teams": result, turnId});
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
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.teams = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId, "lower(team.name) ASC", false, true));
        escapeRoom.retosNoSuperados = groupByTeamRetos(await models.team.findAll(queries.team.teamRetosNoSuperados(escapeRoom.id, turnId)));

        for (const team of escapeRoom.teams) {
            team.connected = isTeamConnected(team.id);
            team.waiting = team.connected ? false : isTeamConnectedWaiting(team.id);
        }
        res.render("ctfs/analytics/timeline", {"escapeRoom": req.escapeRoom, "teams": escapeRoom.teams, turnId});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/puzzles
exports.puzzleStats = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const resultSingle = {};
    const result = {};
    const resultNo = {};
    const summary = {};
    const summarySingle = {};
    const summaryNo = {};

    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        const teamList = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId, "order"));

        if (teamList) {
            teamList.map((team) => {
                const {turno, startTime} = team;
                const actualStartTime = turno.startTime || startTime;
                const retosSuperados = getRetosSuperadosIdTime(team.retos, actualStartTime);
                let lastTime = 0;

                for (const r in retosSuperados) {
                    const reto = retosSuperados[r];
                    const puzzleId = reto.id;

                    result[puzzleId] = [...result[puzzleId] || [], reto.time];
                    resultSingle[puzzleId] = [...resultSingle[puzzleId] || [], Math.max(0, reto.time - lastTime)];
                    lastTime = Math.max(lastTime, reto.time);
                }

                return {"id": team.id, retosSuperados};
            });
        }
        const retosNoSuperados = groupByTeamRetos(await models.team.findAll(queries.team.teamRetosNoSuperados(escapeRoom.id, turnId)), true);

        for (const t in retosNoSuperados) {
            const team = retosNoSuperados[t];

            for (const p in escapeRoom.puzzles) {
                const pId = escapeRoom.puzzles[p].id;

                if (team[pId]) {
                    resultNo[pId] = [...resultNo[pId] || [], team[pId].length];
                }
            }
        }

        for (const p in escapeRoom.puzzles) {
            const pId = escapeRoom.puzzles[p].id;
            const missing = (resultSingle[pId] || []).length - (resultNo[pId] || []).length;

            if (missing > 0) {
                resultNo[pId] = [...resultNo[pId] || [], ...Array(missing).fill(0)];
            }
        }

        for (const p of escapeRoom.puzzles) {
            const puzzleId = p.id;
            const resultSinglePuzzle = resultSingle[puzzleId] || [];
            const resultPuzzle = result[puzzleId] || [];
            const resultNoPuzzle = resultNo[puzzleId] || [];

            summarySingle[puzzleId] = {
                "min": stats.min(resultSinglePuzzle),
                "max": stats.max(resultSinglePuzzle),
                "mean": stats.mean(resultSinglePuzzle),
                "median": stats.median(resultSinglePuzzle),
                "std": stats.std(resultSinglePuzzle)
            };
            summary[puzzleId] = {
                "count": stats.count(resultPuzzle),
                "min": stats.min(resultPuzzle),
                "max": stats.max(resultPuzzle),
                "mean": stats.mean(resultPuzzle),
                "median": stats.median(resultPuzzle),
                "std": stats.std(resultPuzzle)
            };

            summaryNo[puzzleId] = {
                "count": stats.count(resultNoPuzzle),
                "min": stats.min(resultNoPuzzle),
                "max": stats.max(resultNoPuzzle),
                "mean": stats.mean(resultNoPuzzle),
                "median": stats.median(resultNoPuzzle),
                "std": stats.std(resultNoPuzzle)
            };
        }
        res.render("ctfs/analytics/puzzleStats", {"escapeRoom": req.escapeRoom, "puzzles": result, turnId, summary, summarySingle, summaryNo});
    } catch (e) {
        console.error(e);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/histogram
exports.histogram = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;
    const resultSingle = {};
    const result = {};

    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        escapeRoom.turnos = await getERTurnos(escapeRoom.id);
        const teamList = await models.team.findAll(queries.team.teamComplete(escapeRoom.id, turnId));

        if (teamList) {
            teamList.map((team) => {
                const {turno, startTime} = team;
                const actualStartTime = turno.startTime || startTime;
                const retosSuperados = getRetosSuperadosIdTime(team.retos, actualStartTime);
                let lastTime = 0;

                for (const r in retosSuperados) {
                    const reto = retosSuperados[r];
                    const puzzleId = reto.id;

                    result[puzzleId] = [...result[puzzleId] || [], reto.time];
                    resultSingle[puzzleId] = [...resultSingle[puzzleId] || [], reto.time - lastTime];
                    lastTime = reto.time;
                }
                return {"id": team.id, retosSuperados};
            });
        }
        res.render("ctfs/analytics/histogram", {"escapeRoom": req.escapeRoom, "puzzles": result, turnId});
    } catch (e) {
        console.error(e);
        next(e);
    }
};


// GET /escapeRooms/:escapeRoomId/analytics/grading
exports.grading = async (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy, csv} = query;
    const hintConditional = !escapeRoom.hintLimit && escapeRoom.hintLimit !== 0 || escapeRoom.hintLimit > 0; // Hints allowed
    const hintAppConditional = hintConditional && escapeRoom.hintApp; // Hint app methodology

    try {
        const puzzles = await getERPuzzles(escapeRoom.id);
        const puzzleIds = puzzles.map((puz) => puz.id);
        const puzzleNames = puzzles.map((puz) => puz.title);
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy, true, true));
        const turnos = await getERTurnos(escapeRoom.id);
        const results = users.map((user) => {
            const {name, surname, username} = user;
            const turno = user.turnosAgregados[0].date || user.teamsAgregados[0].startTime;
            const startDate = user.turnosAgregados[0].startTime || user.teamsAgregados[0].startTime;

            const {retosSuperados} = retosSuperadosByWho(user.teamsAgregados[0], puzzleIds, false, startDate);


            const hasAttended = user.turnosAgregados[0].participants.attendance;
            const grades = retosSuperados.map((reto, index) => hasAttended ? reto * (puzzles[index].score || 0) : 0);
            const gradeScore = hasAttended ? grades.reduce((a, b) => a + b) : 0;
            const attendance = hasAttended ? escapeRoom.scoreParticipation || 0 : 0;

            let total = attendance + gradeScore;
            const result = {name, surname, username, turno, grades, turnId, attendance, total, "hintsSucceeded": 0, "hintsFailed": 0};

            if (hasAttended) {
                if (hintConditional) {
                    const [{requestedHints}] = user.teamsAgregados;

                    let {hintsSucceeded, hintsFailed} = countHints(requestedHints);

                    hintsSucceeded *= escapeRoom.hintSuccess || 0;
                    total += hintsSucceeded;
                    result.hintsSucceeded = hintsSucceeded;
                    if (hintAppConditional) {
                        hintsFailed *= escapeRoom.hintFailed || 0;
                        total += hintsFailed;
                        result.hintsFailed = hintsFailed;
                    }
                }
            }

            return result;
        });

        if (csv) {
            const resultsCsv = results.map((rslt) => {
                const {name, surname, username, turno, grades, hintsSucceeded, hintsFailed, attendance, total} = rslt;
                const rs = {};

                for (const r in grades) {
                    rs[puzzleNames[r]] = grades[r];
                }
                const result = {name, surname, username, turno, ...rs, attendance, total};

                if (hintConditional) {
                    result.hintsSucceeded = hintsSucceeded;
                    if (hintAppConditional) {
                        result.hintsFailed = hintsFailed;
                    }
                }
                return result;
            });

            createCsvFile(res, resultsCsv);
        } else {
            res.render("ctfs/analytics/grading", {escapeRoom, turnos, puzzles, results, turnId, orderBy, hintConditional, hintAppConditional});
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

    try {
        const puzzles = await getERPuzzles(escapeRoom.id);
        const puzzleIds = puzzles.map((puz) => puz.id);
        const puzzleNames = puzzles.map((puz) => puz.title);
        const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy, true, true));
        const retosNoSuperados = groupByTeamRetos(await models.team.findAll(queries.team.teamRetosNoSuperados(escapeRoom.id, turnId)));

        const results = users.map((user) => {
            const {name, surname, username} = user;
            const turno = user.turnosAgregados[0].startTime || user.teamsAgregados[0].startTime;
            const turnoTag = user.turnosAgregados[0].place;
            const teamAttendance = Boolean(user.teamsAgregados[0].startTime);
            const [{"name": teamName, "id": teamId, requestedHints}] = user.teamsAgregados;
            const teamNoSuperados = [];
            const {retosSuperados, retosSuperadosMin} = retosSuperadosByWho(user.teamsAgregados[0], puzzleIds, true, turno);

            for (let i = 0; i < puzzleIds.length; i++) {
                teamNoSuperados.push(((retosNoSuperados[teamId] || [])[i] || []).length);
            }

            const rns = flattenObject(teamNoSuperados, puzzleNames.map((p) => `Failed attempts to solve ${p}`));
            const rs = flattenObject(retosSuperados, puzzleNames);
            const rsMin = flattenObject(retosSuperadosMin, puzzleNames, true);

            const {hintsSucceeded, hintsSucceededTotal, hintsFailed, hintsFailedTotal} = countHintsByPuzzle(requestedHints, retosSuperadosMin, turno);
            const hf = flattenObject(hintsFailed, puzzleNames.map((p) => `Hints failed for ${p}`));
            const hs = flattenObject(hintsSucceeded, puzzleNames.map((p) => `Hints succeeded for ${p}`));
            const attendance = Boolean(user.turnosAgregados[0].participants.attendance);

            return {name, surname, username, teamId, teamName, attendance, teamAttendance, ...rns, ...rs, ...rsMin, turnoTag, turno, hintsFailedTotal, ...hf, hintsSucceededTotal, ...hs};
        });

        createCsvFile(res, results);
    } catch (e) {
        console.error(e);
        res.send("Error");
    }
};

// GET /escapeRooms/:escapeRoomId/analytics/download_raw
exports.downloadRaw = async (req, res) => {
    const {escapeRoom, query} = req;
    const {turnId} = query;

    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        const puzzleIdToOrder = {};

        for (const p of escapeRoom.puzzles) {
            puzzleIdToOrder[p.id] = p.order + 1;
        }
        const logs = [];
        const teams = await models.team.findAll(queries.team.puzzlesByTeam(escapeRoom.id, turnId, true));
        const retosNoSuperados = groupByTeamRetos(await models.team.findAll(queries.team.teamRetosNoSuperados(escapeRoom.id, turnId)));

        for (const t in teams) {
            const team = teams[t];
            const {id, name, teamMembers, requestedHints, retos} = team;
            const startTime = team.turno.startTime || team.startTime;
            const logBase = {
                "teamId": id,
                "teamName": name,
                "teamSize": teamMembers.length,
                "turnoId": team.turno.id,
                "turnoTag": team.turno.place,
                "startTime": convertDate(startTime),
                "timestamp": "",
                "minute": "",
                "event": "",
                "eventComplete": "",
                "hintId": "",
                "hintContent": "",
                "hintCategory": "",
                "hintQuizScore": "",
                "puzzleId": "",
                "puzzleName": "",
                "puzzleSol": "",
                "puzzleSubmittedAnswer": ""
            };


            for (const r in retos) {
                const retoTS = retos[r].retosSuperados.createdAt;
                const submittedAnswer = retos[r].retosSuperados.answer === "" ? retos[r].sol : retos[r].retosSuperados.answer;

                if (retosNoSuperados[id] && retosNoSuperados[id][retos[r].order]) {
                    for (const rns of retosNoSuperados[id][retos[r].order]) {
                        logs.push({
                            ...logBase,
                            "timestamp": convertDate(rns.when),
                            "minute": Math.round(100 * (rns.when - startTime) / 1000 / 60) / 100,
                            "event": "PUZZLE_FAILED_TO_SOLVE",
                            "puzzleId": retos[r].order + 1,
                            "puzzleName": retos[r].title,
                            "puzzleSol": retos[r].sol,
                            "puzzleSubmittedAnswer": rns.answer,
                            "eventComplete": `PUZZLE_FAILED_TO_SOLVE_${retos[r].order + 1}`
                        });
                    }
                }
                logs.push({
                    ...logBase,
                    "event": "PUZZLE_SOLVED",
                    "timestamp": convertDate(retoTS),
                    "minute": Math.round(100 * (retoTS - startTime) / 1000 / 60) / 100,
                    "puzzleId": retos[r].order + 1,
                    "puzzleName": retos[r].title,
                    "puzzleSol": retos[r].sol,
                    "puzzleSubmittedAnswer": submittedAnswer,
                    "eventComplete": `PUZZLE_SOLVED_${retos[r].order + 1}`
                });
            }

            for (const h of requestedHints) {
                const hintTS = h.createdAt;
                const puzId = h.hint ? puzzleIdToOrder[h.hint.puzzleId] : "";
                const hintId = h.hint ? `${puzId}.${h.hint.order + 1}` : "";

                logs.push({
                    ...logBase,
                    "event": h.success ? "HINT_OBTAINED" : "HINT_FAILED_TO_OBTAIN",
                    "timestamp": convertDate(hintTS),
                    "minute": Math.round(100 * (hintTS - startTime) / 1000 / 60) / 100,
                    hintId,
                    "hintCategory": h.hint ? h.hint.category || "" : "",
                    "hintContent": h.hint ? h.hint.content : "",
                    "hintQuizScore": parseInt(h.score, 10),
                    "eventComplete": h.success ? `HINT_OBTAINED_${hintId || "CUSTOM"}` : "HINT_FAILED_TO_OBTAIN",
                    "puzzleId": h.hint ? puzId : "",
                    "puzzleName": h.hint ? escapeRoom.puzzles[puzId - 1].title : ""
                });
            }
        }

        createCsvFile(res, logs);
    } catch (e) {
        console.error(e);
        res.send("Error");
    }
};
