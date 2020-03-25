const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");
const {isTooLate, authenticate} = require("../helpers/utils");
const {RIGHT_ANSWER, RIGHT_ANSWER_NOT_ACTIVE, RIGHT_ANSWER_TOO_LATE, RIGHT_ANSWER_NOT_PARTICIPANT, WRONG_ANSWER, WRONG_CREDENTIALS, CREDENTIALS_MISSING, OK, NOT_ACTIVE, TOO_LATE, AUTHOR, ERROR} = require("../helpers/apiCodes");


exports.checkParticipant = async (req, res, next) => {
    const {body} = req;
    const {token} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (token) {
        where.username = token;
    } else {
        return res.status(401).json({"msg": i18n.api.unauthorized, "code": CREDENTIALS_MISSING});
    }

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).json({"msg": i18n.api.userNotFound, "code": WRONG_CREDENTIALS});
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
        return res.status(401).json({"msg": i18n.api.unauthorized, "code": CREDENTIALS_MISSING });
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
            res.status(401).json({"msg": i18n.api.wrongCredentials, "code": WRONG_CREDENTIALS});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({"msg": i18n.api.error, "code": ERROR});
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
        res.status(401).json({"msg": i18n.api.wrongCredentials, "code": WRONG_CREDENTIALS});
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

    let status = 200;
    let code = "OK";
    let msg = "";

    try {
        if (answer.toString().toLowerCase().trim() === puzzleSol.toString().toLowerCase().trim()) {
            if (teams && teams.length > 0) {
                const [team] = teams;

                if (team.turno.status !== "active") {
                    status = 202;
                    code = RIGHT_ANSWER_NOT_ACTIVE;
                    msg = `${i18n.api.correctNotActive}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`;
                } else if (isTooLate(team)) {
                    status = 202;
                    code = RIGHT_ANSWER_TOO_LATE;
                    msg = `${i18n.api.correctTooLate}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`
                } else {
                    code = RIGHT_ANSWER;
                    msg = puzzle.correct || i18n.api.correct;
                    await puzzle.addSuperados(team.id);
                    puzzleResponse(true, code, puzzle.id, msg, true, team.id);
                    broadcastRanking(team.id, puzzle.id, new Date(), team.turno.id);
                }
            } else if (req.user.isStudent) {
                status = 202;
                code = RIGHT_ANSWER_NOT_PARTICIPANT;
                msg = `${i18n.api.correctNotParticipant}. ${puzzle.correct ? `${i18n.api.message}: ${puzzle.correct}` : ""}`;
            } else {
                status = 202;
                code = RIGHT_ANSWER;
                msg = puzzle.correct || i18n.api.correct;
            }
        } else {
            status = 423;
            code = WRONG_ANSWER;
            msg = puzzle.fail || i18n.api.wrong;
        }
    } catch (e) {
        status = 500;
        code = ERROR;
        msg = e;
    }
    res.status(status).json({code, msg});
};

// POST /api/escapeRooms/:escapeRoomId/auth
exports.auth = async (req, res) => {
    const {teams, escapeRoom, user} = req;
    const {i18n} = req.app.locals;
    let status = 200;
    let msg = i18n.api.participant;
    let code = OK;
    // eslint-disable-next-line no-undef-init
    let puzzles = undefined;

    if (teams && teams.length > 0) {
        const [team] = teams;
        const retosSuperados = await team.getRetos({ "attributes": ["id"] });

        puzzles = retosSuperados.map((p) => p.id);

        if (team.turno.status !== "active") {
            status = 403;
            code = NOT_ACTIVE;
            msg = i18n.api.notActive;
        } else if (isTooLate(team)) {
            status = 403;
            code = TOO_LATE;
            msg = i18n.api.tooLate;
        }
    } else if (escapeRoom.authorId === user.id) {
        status = 202;
        code = AUTHOR;
        msg = i18n.api.isAuthor;
    } else {
        status = 403;
        code = ERROR;
        msg = i18n.api.notAParticipant;
    }
    res.status(status).json({msg, code, puzzles});
};
