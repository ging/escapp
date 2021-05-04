const sequelize = require("../models");
const {models} = sequelize;

exports.retosSuperadosByWho = (who, puzzles, showDate = false, turno) => {
    const retosSuperados = new Array(puzzles.length).fill(0);
    const retosSuperadosMin = new Array(puzzles.length).fill(0);

    who.retos.map((reto) => {
        const idx = puzzles.indexOf(reto.id);

        if (idx > -1) {
            retosSuperados[idx] = showDate ? reto.retosSuperados.createdAt : 1;
            if (turno) {
                retosSuperadosMin[idx] = showDate ? Math.round(100 * (reto.retosSuperados.createdAt - turno) / 1000 / 60) / 100 : 1;
            }
        }
        return showDate ? " " : 0;
    });
    return {
        retosSuperados,
        retosSuperadosMin
    };
};

exports.getRetosSuperados = (teams, nPuzzles, ignoreTurno = false) => teams.
    map((team) => {
        const {id, name, retos, turno, "startTime": teamStartTime, teamMembers} = team.dataValues;
        const puzzlesSolved = retos.map((r) => r.order + 1);
        const latestRetoSuperado = retos && retos.length > 0 ? retos.map((r) => new Date(r.retosSuperados.createdAt)).sort((a, b) => b - a)[0] : null;
        const startTime = turno.startTime || teamStartTime;
        const count = retos.length;
        const result = `${retos.length}/${nPuzzles}`;
        const participants = teamMembers.map((member) => `${member.name} ${member.surname}`).join(", ");
        const finishTime = nPuzzles === parseInt(count, 10) && startTime ? Math.floor((new Date(latestRetoSuperado) - new Date(startTime)) / 10) / 100 : null;

        return { id, name, puzzlesSolved, "turno": ignoreTurno ? undefined : turno, startTime, latestRetoSuperado, finishTime, count, result, teamMembers, participants };
    });

exports.getRetosSuperadosIdTime = (retos, actualStartTime) => retos.map((reto) => {
    const {retosSuperados} = reto;
    const {createdAt, success} = retosSuperados;
    const time = actualStartTime ? Math.floor((createdAt - actualStartTime) / 10) / 100 : null;

    return {"id": reto.id, time, success};
});

exports.getPuzzleOrderSuperados = async (team) => {
    const retosSuperados = await models.puzzle.findAll({
        "attributes": ["order", "title", "correct", "sol", "score"],
        "include": [
            {
                "model": models.team,
                "as": "superados",
                "where": {"id": team.id},
                "through": {
                    "model": models.retosSuperados,
                    "where": {"success": true},
                    "required": true
                }
            }
        ],
        "order": [["order", "ASC"]]
    });

    const puzzleData = {};
    const puzzlesSolved = retosSuperados.length ? retosSuperados.map((r) => {
        const order = r.order + 1;

        puzzleData[order] = {
            "name": r.title,
            "msg": r.correct,
            "solution": r.sol,
            "score": r.score
        };
        return order;
    }) : [];

    return {puzzlesSolved, puzzleData};
};

exports.pctgRetosSuperados = (retosSuperados) => Math.round(retosSuperados.filter((r) => r === 1).length * 10000 / retosSuperados.length) / 100;

exports.countHints = (requestedHints) => {
    const hintsSucceeded = requestedHints.reduce((acc, el) => acc + (el.success ? 1 : 0), 0);
    const hintsFailed = requestedHints.length - hintsSucceeded;

    return {
        hintsFailed,
        hintsSucceeded
    };
};

exports.countHintsByPuzzle = (requestedHints, retosSuperados, startTime) => {
    const hintsSucceeded = new Array(retosSuperados.length).fill(0);
    const hintsFailed = new Array(retosSuperados.length).fill(0);

    for (const h in requestedHints) {
        const hint = requestedHints[h];
        const minute = Math.floor((hint.createdAt - startTime) / 600) / 100;

        let retoPos = 0;

        for (let r = retosSuperados.length - 1; r >= 0; r--) {
            if (retosSuperados[r] !== 0) {
                if (minute > retosSuperados[r]) {
                    break;
                }
                retoPos = r;
            }
        }

        if (hint.success) {
            hintsSucceeded[retoPos]++;
        } else {
            hintsFailed[retoPos]++;
        }
    }
    const hintsSucceededTotal = hintsSucceeded.reduce((a, b) => a + b, 0);
    const hintsFailedTotal = hintsFailed.reduce((a, b) => a + b, 0);

    return {hintsFailed, hintsFailedTotal, hintsSucceeded, hintsSucceededTotal};
};

exports.getBestTime = (finished) => `${finished.map((t) => t.retos.
    map((r) => Math.round((r.retosSuperados.createdAt - (t.turno.startTime || t.startTime)) / 10 / 60) / 100).
    reduce((a, b) => a > b ? a : b, Math.Infinity)).
    reduce((a, b) => a < b ? a : b, Math.Infinity) || 0} min.`;

exports.getAvgHints = (teams, reqHints) => teams.length > 0 ? Math.round(teams.map((team) => team.requestedHints.filter((h) => {
    if (h.hintId) {
        reqHints[h.hintId]++;
    } else if (h.success) {
        reqHints[0]++;
    }

    return h.success;
}).length).reduce((acc, c) => acc + c, 0) / teams.length * 100) / 100 : "n/a";

exports.byRanking = (a, b) => {
    if (a.count > b.count) {
        return -1;
    } else if (a.count < b.count) {
        return 1;
    }

    if (a.latestRetoSuperado && b.latestRetoSuperado) {
        const aLatestTime = a.latestRetoSuperado - a.startTime;
        const bLatestTime = b.latestRetoSuperado - b.startTime;

        if (aLatestTime < bLatestTime) {
            return -1;
        } else if (aLatestTime > bLatestTime) {
            return 1;
        }
        return -1;
    }
    if (a.startTime > b.startTime) {
        return -1;
    }
    return 1;
};

exports.convertDate = (ts) => new Date(ts.getTime() - ts.getTimezoneOffset() * 60000).toISOString().split(".")[0].replace("T", " ");
