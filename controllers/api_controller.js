const {models} = require("../models");
const {isTooLate, authenticate, getPuzzleOrderSuperados, checkPuzzleAnswer} = require("../helpers/utils");
const {areHintsAllowedForTeam} = require("../helpers/hint");
const {puzzleResponse, broadcastRanking} = require("../helpers/sockets");

const {OK, NOT_A_PARTICIPANT, PARTICIPANT, NOK, NOT_ACTIVE, NOT_STARTED, TOO_LATE, AUTHOR} = require("../helpers/apiCodes");


exports.checkParticipant = async (req, res, next) => {
    const {body} = req;
    const {token} = body;
    const where = {};
    const {i18n} = req.app.locals;

    if (token) {
        where.username = token;
    } else {
        return res.status(401).json({"code": NOK, "authentication": false, "msg": i18n.api.unauthorized});
    }

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).json({"code": NOK, "authentication": false, "msg": i18n.api.userNotFound});
        return;
    }
    req.teams = await users[0].getTeamsAgregados({
        "include": [
            {
                "model": models.turno,
                "required": true,
                "where": {"escapeRoomId": req.escapeRoom.id}
            }
        ]

    });
    [req.user] = users;

    next();
};

exports.checkParticipantSafe = async (req, res, next) => {
    const {body} = req;
    const {email, password, token} = body;
    const {i18n} = req.app.locals;

    if (!email || !(password || token)) {
        return res.status(401).json({"code": NOK, "authentication": false, "msg": i18n.api.unauthorized});
    }

    try {
        const user = await authenticate(email, password, token);

        if (user) {
            req.teams = await user.getTeamsAgregados({
                "include": [
                    {
                        "model": models.turno,
                        "required": true,
                        "where": {"escapeRoomId": req.escapeRoom.id}
                    }
                ]
            });
            req.user = user;
            next();
        } else {
            res.status(401).json({"code": NOK, "authentication": false, "msg": password ? i18n.api.wrongCredentials : i18n.api.wrongCredentialsToken});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({"code": NOK, "authentication": false, "msg": i18n.api.error });
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
                    "where": {"escapeRoomId": req.escapeRoom.id} // Aquí habrá que añadir las condiciones de si el turno está activo, etc
                }
            ]
        });
        req.user = user;
        next();
    } else {
        res.status(401).json({"code": NOK, "authentication": false, "msg": i18n.api.wrongCredentials});
    }
};

// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.checkPuzzle = async (req, _res, next) => {
    const {puzzle, body, teams, escapeRoom, user} = req;
    const {i18n} = req.app.locals;
    const {solution} = body;

    req.response = await checkPuzzleAnswer(solution, puzzle, escapeRoom, teams, user, i18n, req.params.puzzleOrder);
    const {code, correctAnswer, participation, authentication, msg} = req.response.body;

    if (code === OK) {
        const [team] = teams;

        puzzleResponse(code === OK, correctAnswer, puzzle.id, participation, authentication, msg, i18n.escapeRoom.api.participation[participation], team.id);
        broadcastRanking(team.id, puzzle.id, new Date(), team.turno.id);
    }
    next();
};

// POST /api/escapeRooms/:escapeRoomId/auth
exports.auth = async (req, _res, next) => {
    const {teams, escapeRoom, user} = req;
    const {i18n} = req.app.locals;
    let status = 200;
    let msg = i18n.api.participant;
    let code = NOK;
    let participation = PARTICIPANT;
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
            participation = NOT_ACTIVE;
            msg = i18n.api.notActive;
        } else if (isTooLate(team, escapeRoom.forbiddenLateSubmissions, escapeRoom.duration)) {
            status = 403;
            participation = TOO_LATE;
            msg = i18n.api.tooLate;
        } else if (!team.startTime) {
            status = 403;
            participation = NOT_STARTED;
        } else {
            code = OK;
        }
    } else if (escapeRoom.authorId === user.id) {
        status = 202;
        participation = AUTHOR;
        msg = i18n.api.isAuthor;
    } else {
        status = 403;
        participation = NOT_A_PARTICIPANT;
        msg = i18n.api.notAParticipant;
    }
    req.response = {status, "body": {code, "authentication": true, "token": user.token, participation, msg, "erState": { puzzlesSolved, hintsAllowed }}};
    next();
};

exports.reply = (req, res) => {
    res.status(req.response.status).json(req.response.body);
};
