const {models} = require("../models");
const { authenticate, checkPuzzle, checkTurnoAccess, getERState, automaticallySetAttendance, getRanking, getCurrentPuzzle, getContentForPuzzle, getERPuzzles} = require("../helpers/utils");
const {puzzleResponse, puzzleChecked, broadcastRanking, sendJoinTeam, sendStartTeam} = require("../helpers/sockets");
const queries = require("../queries");
const {OK, PARTICIPANT, NOK, NOT_STARTED, TOO_LATE, getAuthMessageAndCode} = require("../helpers/apiCodes");


exports.checkParticipant = async (req, res, next) => {
    const {body} = req;
    const {token} = body;
    const where = {};
    const {i18n} = res.locals;

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
    req.teams = await users[0].getTeamsAgregados(queries.user.erTeam(req.escapeRoom.id));
    [req.user] = users;

    next();
};

exports.checkParticipantSafe = async (req, res, next) => {
    const {body} = req;
    const {email, password, token} = body;
    const {i18n} = res.locals;

    if (!email || !(password || token)) {
        return res.status(401).json({"code": NOK, "authentication": false, "msg": i18n.api.unauthorized});
    }

    try {
        const user = await authenticate(email, password, token);

        if (user) {
            if (!req.escapeRoom.forceLang && user.lang && i18n.lang !== user.lang && (user.lang === "es" || user.lang === "en")) {
                // eslint-disable-next-line global-require
                res.locals.i18n_lang = user.lang === "es" ? "es" : "en";
                // eslint-disable-next-line global-require
                res.locals.i18n_texts = require(`../i18n/${res.locals.i18n_lang}`);
                res.locals.i18n = res.locals.i18n_texts;
            }
            req.teams = await user.getTeamsAgregados(queries.user.erTeam(req.escapeRoom.id));
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
    const {i18n} = res.locals;
    const user = await models.user.findByPk(req.session.user.id);


    if (user) {
        req.teams = await user.getTeamsAgregados(queries.user.erTeam(req.escapeRoom.id));
        req.user = user;
        next();
    } else {
        res.status(401).json({"code": NOK, "authentication": false, "msg": i18n.api.wrongCredentials});
    }
};

// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.solvePuzzle = async (req, res, next) => {
    const {puzzle, body, teams, escapeRoom, user} = req;
    const {i18n} = res.locals;
    const {solution} = body;

    try {
        if (!escapeRoom.puzzles) {
            escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        }

        req.response = await checkPuzzle(solution, puzzle, escapeRoom, teams, user, i18n);
        const {code, correctAnswer, participation, authentication, msg, alreadySolved, erState} = req.response.body;

        if (participation === PARTICIPANT) {
            await automaticallySetAttendance(teams[0], user.id, escapeRoom.automaticAttendance);
            const [team] = teams;

            if (code === OK) {
                let currentlyWorkingOn = await getCurrentPuzzle(teams[0], escapeRoom.puzzles);

                currentlyWorkingOn = currentlyWorkingOn === null ? "all" : currentlyWorkingOn;
                const content = alreadySolved ? undefined : getContentForPuzzle(escapeRoom.teamInstructions, currentlyWorkingOn);

                puzzleResponse(team.id, code, correctAnswer, solution, puzzle.order + 1, participation, authentication, erState, msg, i18n.escapeRoom.api.participation[participation], content);
                if (!alreadySolved) {
                    const updatedTeams = await getRanking(escapeRoom.id, team.turno.id);

                    broadcastRanking(team.turno.id, updatedTeams, team.id, puzzle.order + 1);
                }
            } else {
                puzzleResponse(team.id, code, correctAnswer, solution, puzzle.order + 1, participation, authentication, erState, msg, i18n.escapeRoom.api.participation[participation]);
            }
        }
        next();
    } catch (e) {
        next(e);
    }
};

// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check_solution
exports.checkPuzzleSolution = async (req, res, next) => {
    const {puzzle, body, teams, escapeRoom, user} = req;
    const {i18n} = res.locals;
    const {solution} = body;

    try {
        if (!escapeRoom.puzzles) {
            escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        }

        req.response = await checkPuzzle(solution, puzzle, escapeRoom, teams, user, i18n, true);
        const {code, correctAnswer, participation, authentication, msg, erState} = req.response.body;

        if (participation === PARTICIPANT) {
            await automaticallySetAttendance(teams[0], user.id, escapeRoom.automaticAttendance);
            const [team] = teams;

            puzzleChecked(team.id, code, code === "OK" ? correctAnswer : null, solution, puzzle.order + 1, participation, authentication, erState, msg, i18n.escapeRoom.api.participation[participation]);
        }
        next();
    } catch (e) {
        next(e);
    }
};

// POST /api/escapeRooms/:escapeRoomId/auth
exports.auth = async (req, res, next) => {
    const {teams, escapeRoom, user} = req;
    const authentication = true;
    const {token} = user;

    try {
        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);

        const {i18n} = res.locals || req.app.locals;
        const participation = await checkTurnoAccess(teams, user, escapeRoom, true);
        const attendance = participation === PARTICIPANT || participation === TOO_LATE;
        const erState = teams && teams.length ? await getERState(escapeRoom.id, teams[0], escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed, attendance, true) : undefined;

        if (participation === PARTICIPANT) {
            await automaticallySetAttendance(teams[0], user.id, escapeRoom.automaticAttendance);
        }
        const {status, code, msg} = getAuthMessageAndCode(participation, i18n);

        req.response = {status, "body": {code, authentication, token, participation, msg, erState}};
    } catch (err) {
        req.response = {"status": 500, "body": {"code": NOK, authentication, token}};
    }
    next();
};

// First time a team clicks the start button
exports.startPlaying = async (req, res, next) => {
    const {teams, escapeRoom, user} = req;
    const authentication = true;
    const {token} = user;

    const {i18n} = res.locals || req.app.locals;

    try {
        let participation = await checkTurnoAccess(teams, user, escapeRoom, true);
        const {status, code, msg} = getAuthMessageAndCode(participation, i18n, true);
        const attendance = participation === PARTICIPANT || participation === TOO_LATE || participation === NOT_STARTED;
        // eslint-disable-next-line init-declarations
        let erState;

        if (participation === PARTICIPANT || participation === NOT_STARTED) {
            const joinTeam = await automaticallySetAttendance(teams[0], user.id, escapeRoom.automaticAttendance);

            escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
            erState = await getERState(escapeRoom.id, teams[0], escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed, attendance, true);
            if (joinTeam) {
                sendStartTeam(joinTeam.id, code, authentication, PARTICIPANT, msg, erState);
                sendJoinTeam(joinTeam.id, joinTeam.turno.id, erState.ranking);
            }
            participation = PARTICIPANT;
        }
        req.response = {status, "body": {code, authentication, token, participation, msg, erState}};
        next();
    } catch (e) {
        next(e);
    }
};


exports.reply = (req, res) => {
    res.status(req.response.status).json(req.response.body);
};
