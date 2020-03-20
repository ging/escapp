const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");
const {isTooLate} = require("../helpers/utils");


exports.checkParticipant = async (req, res, next) => {
    const {body} = req;
    const {token} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (token) {
        where.username = token;
    } else {
        return res.status(401).json({"msg": i18n.api.unauthorized});
    }

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).json({"msg": i18n.api.userNotFound});
        return;
    }
    req.teams = await users[0].getTeamsAgregados({
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
    next();
};

// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.checkPuzzle = async (req, res) => {
    const {puzzle, body, teams} = req;
    const {i18n} = req.app.locals;
    const {solution} = body;

    // eslint-disable-next-line no-undefined
    const answer = solution === undefined || solution === null ? "" : solution;
    // eslint-disable-next-line no-undefined
    const puzzleSol = puzzle.sol === undefined || puzzle.sol === null ? "" : puzzle.sol;

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
                    puzzleResponse(true, req.puzzle.id, msg, true, team.id);
                    broadcastRanking(team.id, req.puzzle.id, new Date(), team.turno.id);

                    res.json({msg});
                }
            } else {
                res.status(202).json({"msg": `${i18n.api.correctNotParticipant}. ${req.puzzle.correct ? `${i18n.api.message}: ${req.puzzle.correct}` : ""}`});
            }
        } else {
            res.status(401).json({"msg": req.puzzle.fail || i18n.api.wrong});
        }
    } catch (e) {
        res.status(500).json({"msg": e});
    }
};

exports.auth = async (req, res) => {
    const {teams} = req;
    const {i18n} = req.app.locals;
    let status = 200;
    let msg = i18n.api.participant;
    // eslint-disable-next-line no-undef-init
    let puzzles = undefined;

    if (teams && teams.length > 0) {
        const [team] = teams;
        const retosSuperados = await team.getRetos({ "attributes": ["id"] });

        puzzles = retosSuperados.map((p) => p.id);

        if (team.turno.status !== "active") {
            status = 202;
            msg = i18n.api.notActive;
        } else if (isTooLate(team)) {
            status = 202;
            msg = i18n.api.tooLate;
        }
    } else {
        status = 403;
        msg = i18n.api.notAParticipant;
    }
    res.status(status).json({msg, puzzles});
};
