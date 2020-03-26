const {models} = require("../models");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");
const {isTooLate, authenticate, getPuzzleOrderSuperados} = require("../helpers/utils");
const {areHintsAllowedForTeam} = require("../helpers/hint");

const {OK, NOT_A_PARTICIPANT, PARTICIPANT, NOK, WRONG_CREDENTIALS, CREDENTIALS_MISSING, NOT_ACTIVE, TOO_LATE, AUTHOR, ERROR} = require("../helpers/apiCodes");


exports.checkParticipant = async (req, res, next) => {
    const {body} = req;
    const {token} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (token) {
        where.username = token;
    } else {
        return res.status(401).json({ "code": CREDENTIALS_MISSING, "msg": i18n.api.unauthorized});
    }

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).json({"code": WRONG_CREDENTIALS, "msg": i18n.api.userNotFound});
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
        return res.status(401).json({"code": CREDENTIALS_MISSING, "msg": i18n.api.unauthorized});
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
            res.status(401).json({"code": WRONG_CREDENTIALS, "msg": i18n.api.wrongCredentials});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({"code": ERROR, "msg": i18n.api.error });
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
    const {puzzle, body, teams, escapeRoom} = req;
    const {i18n} = req.app.locals;
    const {solution} = body;
    // eslint-disable-next-line no-undefined
    const answer = solution === undefined || solution === null ? "" : solution;
    // eslint-disable-next-line no-undefined
    const puzzleSol = puzzle.sol === undefined || puzzle.sol === null ? "" : puzzle.sol;

    let status = 200;
    let code = "OK";
    let participation = PARTICIPANT;
    let msg = "";
    // eslint-disable-next-line no-undef-init
    let puzzlesSolved = undefined;
    // eslint-disable-next-line no-undef-init
    let hintsAllowed = undefined;

    try {
        const rightAnswer = answer.toString().toLowerCase().trim() === puzzleSol.toString().toLowerCase().trim();

        if (rightAnswer) {
            code = OK;
            msg = puzzle.correct || i18n.api.correct;
        } else {
            status = 423;
            code = NOK;
            msg = puzzle.fail || i18n.api.wrong;
        }

        if (teams && teams.length > 0) {
            const [team] = teams;

            if (team.turno.status === "pending") {
                status = rightAnswer ? 202 : 423;
                participation = NOT_ACTIVE;
            } else if (isTooLate(team)) {
                status = rightAnswer ? 202 : 423;
                participation = TOO_LATE;
            } else if (rightAnswer) {
                await puzzle.addSuperados(team.id);
                puzzleResponse(true, code, puzzle.id, msg, true, team.id);
                broadcastRanking(team.id, puzzle.id, new Date(), team.turno.id);
            }

            if (req.params.puzzleOrder) {
                puzzlesSolved = await getPuzzleOrderSuperados(team);
                hintsAllowed = await areHintsAllowedForTeam(team.id, escapeRoom.hintLimit);
            }
        } else if (escapeRoom.authorId === req.user.id) {
            status = rightAnswer ? 202 : 423;
            code = OK;
            participation = AUTHOR;
        } else {
            status = rightAnswer ? 202 : 423;
            code = OK;
            participation = NOT_A_PARTICIPANT;
        }
    } catch (e) {
        status = 500;
        code = ERROR;
        msg = e;
    }
    res.status(status).json({code, msg, participation, puzzlesSolved, hintsAllowed});
};

// POST /api/escapeRooms/:escapeRoomId/auth
exports.auth = async (req, res) => {
    const {teams, escapeRoom, user} = req;
    const {i18n} = req.app.locals;
    let status = 200;
    let msg = i18n.api.participant;
    let code = PARTICIPANT;
    // eslint-disable-next-line no-undef-init
    let puzzlesSolved = undefined;
    // eslint-disable-next-line no-undef-init
    let hintsAllowed = undefined;

    if (teams && teams.length > 0) {
        const [team] = teams;

        puzzlesSolved = await getPuzzleOrderSuperados(team);
        hintsAllowed = await areHintsAllowedForTeam(team.id, escapeRoom.hintLimit);

        if (team.turno.status === "pending") {
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
        code = NOT_A_PARTICIPANT;
        msg = i18n.api.notAParticipant;
    }
    res.status(status).json({code, msg, puzzlesSolved, hintsAllowed});
};
