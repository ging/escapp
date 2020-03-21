const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");
const {isTooLate, authenticate} = require("../helpers/utils");


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
    [req.user] = users;

    next();
};

exports.checkParticipantSafe = async (req, res, next) => {
    const {body} = req;
    const {email, password} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (email && password) {
        where.username = email;
    } else {
        return res.status(401).json({"msg": i18n.api.unauthorized});
    }

    try {
        const user = await authenticate((email || "").toString().toLowerCase(), (password || "").toString());

        if (user) {
            req.teams = await user.getTeamsAgregados({
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
            req.user = user;
            next();
        } else {
            res.status(404).json({"msg": i18n.api.wrongCredentials});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({"msg": i18n.api.error});
    }
};

exports.checkParticipantSession = async (req, res, next) => {
    const {i18n} = req.app.locals;
    const user = await models.user.findByPk(req.session.user.id);


    if (user) {
        req.teams = await user.getTeamsAgregados({
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
        req.user = user;
        next();
    } else {
        res.status(404).json({"msg": i18n.api.wrongCredentials});
    }
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
                    res.status(202).json({"msg": `${i18n.api.correctNotActive}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`});
                    return;
                }
                if (isTooLate(team)) {
                    res.status(202).json({"msg": `${i18n.api.correctTooLate}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`});
                } else {
                    const msg = puzzle.correct || i18n.api.correct;

                    await puzzle.addSuperados(team.id);
                    puzzleResponse(true, puzzle.id, msg, true, team.id);
                    broadcastRanking(team.id, puzzle.id, new Date(), team.turno.id);
                    res.json({msg});
                }
            } else if (req.user.isStudent) {
                res.status(202).json({"msg": `${i18n.api.correctNotParticipant}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`});
            } else {
                res.status(202).json({"msg": puzzle.correct || i18n.api.correct});
            }
        } else {
            res.status(401).json({"msg": puzzle.fail || i18n.api.wrong});
        }
    } catch (e) {
        res.status(500).json({"msg": e});
    }
};

// POST /api/escapeRooms/:escapeRoomId/auth
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
