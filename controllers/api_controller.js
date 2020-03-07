const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");

// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.check = async (req, res) => {
    const {puzzle, body} = req;
    const {solution, token} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (token) {
        where.username = token;
    } else {
        return res.status(401).json({"msg": i18n.api.unauthorized});
    }
    // eslint-disable-next-line no-undefined
    const answer = solution === undefined || solution === null ? "" : solution;
    // eslint-disable-next-line no-undefined
    const puzzleSol = puzzle.sol === undefined || puzzle.sol === null ? "" : puzzle.sol;

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).json({"msg": i18n.api.userNotFound});
        return;
    }
    const team = await users[0].getTeamsAgregados({
        "include": [
            {
                "model": models.turno,
                "required": true,
                "where": {"escapeRoomId": req.escapeRoom.id}, // Aquí habrá que añadir las condiciones de si el turno está activo, etc
                "include": [{
                    "model": models.escapeRoom,
                    "attributes": ["duration", "forbiddenLateSubmissions"] // forbiddenLateSubmissions // Falta pasar a sockets.js
                }]
            }
        ]

    });

    if (answer.toString().toLowerCase().trim() === puzzleSol.toString().toLowerCase().trim()) {
        if (team && team.length > 0) {
            if (team[0].turno.status !== "active") {
                res.status(202).json({"msg": `${i18n.api.correctNotActive}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
                return;
            }
            const duration = team[0].turno.escapeRoom.duration;
            const startTime = team[0].turno.startTime || team[0].startTime;
            const tooLate = team[0].turno.escapeRoom.forbiddenLateSubmissions && (new Date((startTime).getTime() + duration*60000) < new Date());
            if (tooLate) {
                res.status(202).json({"msg": `${i18n.api.correctTooLate}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});

            } else {
                try {
                    const msg = req.puzzle.correct || i18n.api.correct;

                    await req.puzzle.addSuperados(team[0].id);
                    await puzzleResponse(true, req.puzzle.id, msg, true, team[0].id);
                    await broadcastRanking(team[0].id, req.puzzle.id, new Date(), team[0].turno.id);

                    res.json({msg});
                } catch (e) {
                    res.status(500).json({"msg": e});
                }
            }
           
        } else {
            res.status(202).json({"msg": `${i18n.api.correctNotParticipant}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
        }
    } else {
        res.status(401).json({"msg": req.puzzle.fail || i18n.api.wrong});
    }
};
