const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");
const {isTooLate} = require("../helpers/utils");

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
    const teams = await users[0].getTeamsAgregados({
        "include": [
            {
                "model": models.turno,
                "required": true,
                "where": {"escapeRoomId": req.escapeRoom.id}, // Aquí habrá que añadir las condiciones de si el turno está activo, etc
                "include": [
                    {
                        "model": models.escapeRoom,
                        "attributes": ["duration", "forbiddenLateSubmissions"] // ForbiddenLateSubmissions // Falta pasar a sockets.js
                    }
                ]
            }
        ]

    });

    try {
        if (answer.toString().toLowerCase().trim() === puzzleSol.toString().toLowerCase().trim()) {
            if (teams && teams.length > 0) {
                const [team] = teams;

                if (team.turno.status !== "active") {
                    res.status(202).json({"msg": `${i18n.api.correctNotActive}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
                    return;
                }
                if (isTooLate(team)) {
                    res.status(202).json({"msg": `${i18n.api.correctTooLate}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
                } else {
                    const msg = req.puzzle.correct || i18n.api.correct;

                    await req.puzzle.addSuperados(team.id);
                    await puzzleResponse(true, req.puzzle.id, msg, true, team.id);
                    await broadcastRanking(team.id, req.puzzle.id, new Date(), team.turno.id);

                    res.json({msg});
                }
            } else if (users[0].isStudent) {
                res.status(202).json({"msg": `${i18n.api.correctNotParticipant}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
            } else {
                res.status(202).json({"msg": req.puzzle.correct ? i18n.api.message : req.puzzle.correct});
            }
        } else {
            res.status(401).json({"msg": req.puzzle.fail || i18n.api.wrong});
        }
    } catch (e) {
        res.status(500).json({"msg": e});
    }
};
