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
                map((r) => Math.round((r.retosSuperados.createdAt - t.turno.startTime) / 10 / 60) / 100).
                reduce((a, b) => a > b ? a : b, Math.Infinity)).
                reduce((a, b) => a < b ? a : b, Math.Infinity) || 0} min.`,
            "icon": "timer"
        };
        const sucessRate = {
            "value": `${Math.round(finished.length / teams.length * 10000) / 100 || 0}%`,
            "icon": "star"
        };
        const hintIds = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.id)).reduce((x, y) => x.concat(y), [])
        const hintLabels = escapeRoom.puzzles.map((p) => p.hints.map((h) => h.content)).reduce((x, y) => x.concat(y), [])
        const reqHints = {
          '-1': 0,
          '0': 0
        }

        hintLabels.unshift(res.app.locals.i18n.analytics.hints.customClue)
        hintLabels.push(res.app.locals.i18n.analytics.hints.failedClue)
        hintIds.forEach((e) => {
          reqHints[e] = 0
        })
        const avgReqHints = {
              'value': teams.length > 0 ? Math.round(teams.map((team) => team.requestedHints.filter((h) => {
                if (h.hintId) {
                  reqHints[h.hintId]++
                } else {
                  reqHints[h.success ? 0 : -1]++
                }

                return h.success
              }).length).reduce((acc, c) => acc + c, 0) / teams.length * 100) / 100 : 'n/a',
              'icon': 'search'
            }
            const hintCount = Object.values(reqHints)
            const hintsByTeam = {
              'labels': hintLabels,
              'data': hintCount
            }

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
        const charts = {retosSuperadosTeam, hintsByTeam};

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
            const retosSuperados = retosSuperadosByWho(u.teamsAgregados[0], puzzles);
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
        const results = teams.map((u) => {
            const {id, name} = u;
            const retosSuperados = retosSuperadosByWho(u, puzzles);
            const total = pctgRetosSuperados(retosSuperados);

            return {id,
                name,
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
        const result = await models.team.findAll(queries.team.ranking(escapeRoom.id, turnId));
        const teams = getRetosSuperados(result);

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
                const [{requestedHints}] = u.teamsAgregados;

                for (const h in requestedHints) {
                    const hint = requestedHints[h];
                    const {success, score, createdAt} = hint;

                    resultsCsv.push({
                        id,
                        name,
                        surname,
                        dni,
                        username,
                        success,
                        score,
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
                const {id, name, requestedHints} = team;

                for (const h in requestedHints) {
                    const hint = requestedHints[h];
                    const {success, score, createdAt} = hint;

                    resultsCsv.push({
                        id,
                        "team": name,
                        score,
                        success,
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
            const {startTime} = turno;
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
                "retosSuperados": turno.startTime ? retosSuperadosArr : []
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

                return {
                    "id": team.id,
                    "retosSuperados": team.retos.map((reto) => ({"id": reto.id,
                        "time": turno.startTime ? (reto.retosSuperados.createdAt - turno.startTime) / 1000 : null}))
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


            const retosSuperados = retosSuperadosByWho(user.teamsAgregados[0], puzzles);
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
exports.download = async (req, res, next) => {
  const {escapeRoom, query} = req
  const {turnId, orderBy, csv} = query
  const puzzles = escapeRoom.puzzles.map((puz) => puz.id)
  const puzzleNames = escapeRoom.puzzles.map((puz) => puz.title)
  const hintNames = escapeRoom.puzzles.map(puz => puz.hints.map(h => h.content))
  try {
    const users = await models.user.findAll(queries.user.puzzlesByParticipant(escapeRoom.id, turnId, orderBy, true))

    const results = users.map((user) => {
      const {name, surname, dni, username} = user
      console.dir(user.toJSON())
      const turno = user.turnosAgregados[0].date;
      const team = user.teamsAgregados[0].name
      let hintsSucceeded = 0
      let hintsFailed = 0

      const retosSuperados = retosSuperadosByWho(user.teamsAgregados[0], puzzles, true)
      const rs = {}
      const hr = {}
      for (const r in retosSuperados) {
        rs[puzzleNames[r]] = retosSuperados[r]
      }
      const [{requestedHints}] = user.teamsAgregados
      for (const h in requestedHints) {
        const hint = requestedHints[h]
        if (hint.success) {
          hintsSucceeded++
        } else {
          hintsFailed++
        }
      }
      const attendance = Boolean(user.turnosAgregados[0].participants.attendance);

      return {
        name,
        surname,
        dni,
        username,
        attendance,
        ...rs,
        turno,
        hintsFailed,
        hintsSucceeded,
      }
    })

    createCsvFile(res, results);

  } catch (e) {
    console.error(e);
    res.send('Error');
  }
} 