const Sequelize = require("sequelize");
const {Op} = Sequelize;
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("./progress");
const cloudinary = require("cloudinary");
const ejs = require("ejs");
const queries = require("../queries");
const {OK, NOT_A_PARTICIPANT, PARTICIPANT, NOK, NOT_ACTIVE, NOT_STARTED, TOO_LATE, AUTHOR, ERROR} = require("../helpers/apiCodes");
const {getRetosSuperados, byRanking, getPuzzleOrderSuperados} = require("./analytics");
const {removeDiacritics} = require("./diacritics.js");

exports.flattenObject = (obj, labels, min = false) => {
    const rs = {};

    for (const r in obj) {
        rs[labels[r] + (min ? " Minute" : "")] = obj[r];
    }
    return rs;
};

exports.saveInterface = async (name, req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;
    const {i18n} = res.locals;

    escapeRoom[`${name}Instructions`] = body.instructions;
    escapeRoom[`${name}Appearance`] = body.appearance;
    try {
        await escapeRoom.save({"fields": [`${name}Instructions`, `${name}Appearance`]});
        res.redirect(`/ctfs/${escapeRoom.id}/${isPrevious ? prevStep(name) : progressBar || nextStep(name)}`);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/ctfs/${escapeRoom.id}/${name}`);
        } else {
            req.flash("error", `${i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        }
    }
};


exports.playInterface = async (name, req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    req.escapeRoom = await models.escapeRoom.findByPk(req.escapeRoom.id, queries.escapeRoom.loadPuzzles);
    req.escapeRoom.hintApp = await models.hintApp.findOne({"where": { "escapeRoomId": req.escapeRoom.id }});

    const {token} = await models.user.findByPk(req.session.user.id);

    if (isAdmin || isAuthor) {
        res.render("ctfs/play/play", {
            "escapeRoom": req.escapeRoom,
            cloudinary,
            "team": {
                "turno": req.turn,
                "retos": []
            },
            "teams": req.teams,
            "hints": [],
            "turnoId": req.params.turnoId,
            "isStudent": false,
            "status": req.turn.status,
            "endPoint": name,
            "hostName": process.env.APP_NAME ? `https://${process.env.APP_NAME}` : "http://localhost:3000",
            token,
            "layout": false
        });
    } else {
        try {
            const teams = await models.team.findAll({
                "include": [
                    {
                        "model": models.turno,
                        "include": {
                            "model": models.escapeRoom,
                            "where": {"id": req.escapeRoom.id}
                        },
                        "required": true

                    },
                    {
                        "model": models.user,
                        "as": "teamMembers",
                        "attributes": [],
                        "where": {"id": req.session.user.id},
                        "required": true
                    },
                    {
                        "model": models.puzzle,
                        "as": "retos",
                        "through": {
                            "model": models.retosSuperados,
                            "required": false,
                            "where": {"success": true},
                            "attributes": ["createdAt"]
                        }
                    }

                ],
                "required": true
            });

            const team = teams && teams[0] ? teams[0] : {};

            if (!team.startTime || team.turno.status !== "active" || exports.isTooLate(team, req.escapeRoom.forbiddenLateSubmissions, req.escapeRoom.duration) || team.retos.length === req.escapeRoom.puzzles.length) {
                res.redirect(`/ctfs/${req.escapeRoom.id}`);
                return;
            }
            await exports.automaticallySetAttendance(team, req.session.user.id, req.escapeRoom.automaticAttendance);
            const hints = await models.requestedHint.findAll({"where": {"teamId": team.id, "success": true}, "include": [{"model": models.hint, "include": [{"model": models.puzzle, "attributes": ["order"]}]}], "order": [["createdAt", "ASC"]]});

            res.render("ctfs/play/play", {"escapeRoom": req.escapeRoom, "hostName": process.env.APP_NAME ? `https://${process.env.APP_NAME}` : "http://localhost:3000", cloudinary, "teams": [], team, token, "userId": req.session.user.id, "turnoId": team.turno.id, "teamId": team.id, "isStudent": true, "hints": hints || [], "endPoint": name, "layout": false });
        } catch (err) {
            next(err);
        }
    }
};

exports.isTooLate = (team, forbiddenLateSubmissions, duration) => {
    if (team.turno.status === "finished") {
        return true;
    }
    const startTime = team.turno.startTime || team.startTime;

    return forbiddenLateSubmissions && new Date(startTime.getTime() + duration * 60000) < new Date();
};

/*
 * User authentication: Checks that the user is registered.
 *
 * Return a Promise that searches a user with the given login, and checks that
 * the password is correct.
 * If the authentication is correct, then the promise is satisfied and returns
 * an object with the User.
 * If the authentication fails, then the promise is also satisfied, but it
 * returns null.
 */
exports.authenticate = (login, pass, token) => {
    const username = (login || "").toString();

    if (token) {
        return models.user.findOne({"where": {username, token}}).
            then((user) => user);
    }
    const password = (pass || "").toString();

    return models.user.findOne({"where": {username}}).
        then((user) => user && user.verifyPassword(password) ? user : null);
};

/**
 * Promisify render EJS view
 */
exports.renderEJS = (view, query = {}, options = {}) => new Promise((resolve, reject) => {
    ejs.renderFile(view, query, options, function (err, str) {
        if (err) {
            return reject(err);
        }
        resolve(str);
    });
});

exports.getERTurnos = (escapeRoomId) => models.turno.findAll({"where": {escapeRoomId}});

exports.getERPuzzles = (escapeRoomId) => models.puzzle.findAll({"where": {escapeRoomId}, "order": [["order", "asc"]]});

exports.getERPuzzlesAndHints = (escapeRoomId) => models.puzzle.findAll({
    "where": {escapeRoomId},
    "include": [{"model": models.hint}],
    "order": [
        ["order", "asc"],
        [
            {"model": models.hint},
            "order",
            "asc"
        ]
    ]
});


exports.getERState = async (escapeRoomId, team, duration, hintLimit, nPuzzles, attendance, attendanceScore, scoreHintSuccess, scoreHintFail, includeRanking = false) => {
    const {puzzlesSolved, puzzleData} = await getPuzzleOrderSuperados(team);
    const teamMembers = team.teamMembers.map((member) => member.username);
    const {hintsAllowed, successHints, failHints} = await exports.areHintsAllowedForTeam(team.id, hintLimit);
    const progress = exports.getProgress(puzzlesSolved, nPuzzles);
    const score = exports.getScore(puzzlesSolved, puzzleData, successHints, failHints, attendance, attendanceScore, scoreHintSuccess, scoreHintFail);
    const ranking = includeRanking ? await exports.getRanking(escapeRoomId, team.turno.id) : undefined;
    const startTime = team.turno.startTime || team.startTime;
    const timeLeft = duration * 60 - Math.round((new Date() - startTime) / 1000);
    const remainingTime = !timeLeft || timeLeft < 0 ? 0 : timeLeft;
    const teamId = team.id;

    return {teamId, startTime, remainingTime, puzzlesSolved, puzzleData, nPuzzles, hintsAllowed, progress, score, teamMembers, ranking, "duration": duration * 60};
};

exports.getRanking = async (escapeRoomId, turnoId) => {
    const teamsRaw = await models.team.findAll(queries.team.rankingShort(escapeRoomId, turnoId));
    const nPuzzles = await models.puzzle.count({"where": { escapeRoomId }});
    const ranking = getRetosSuperados(teamsRaw, nPuzzles, true).sort(byRanking);

    return ranking;
};
exports.getProgress = (puzzlesSolved, totalNumberOfPuzzles) => totalNumberOfPuzzles ? Math.round(puzzlesSolved.length / totalNumberOfPuzzles * 10000) / 100 : 0;

exports.getScore = (puzzlesSolved, puzzleData, successHints, failHints, attendance, attendanceScore, scoreHintSuccess, scoreHintFail) => {
    let score = 0;

    if (attendance) {
        for (const p of puzzlesSolved) {
            score += puzzleData[p].score || 0;
        }
        score += attendanceScore || 0;
        score += successHints * (scoreHintSuccess || 0);
        score += failHints * (scoreHintFail || 0);
    }

    return score;
};

exports.checkTurnoAccess = (teams, user, escapeRoom) => {
    let participation = PARTICIPANT;

    if (teams && teams.length > 0) {
        const [team] = teams;

        if (team.turno.status === "pending") {
            participation = NOT_ACTIVE;
        } else if (!team.startTime) {
            participation = NOT_STARTED;
        } else if (exports.isTooLate(team, escapeRoom.forbiddenLateSubmissions, escapeRoom.duration)) {
            participation = TOO_LATE;
        } else {
            participation = PARTICIPANT;
        }
    } else if (escapeRoom.authorId === user.id) {
        participation = AUTHOR;
    } else {
        participation = NOT_A_PARTICIPANT;
    }

    return participation;
};

exports.checkPuzzle = async (solution, puzzle, escapeRoom, teams, user, i18n, readOnly = false) => {
    // eslint-disable-next-line no-undefined
    const answer = solution === undefined || solution === null ? "" : solution;
    // eslint-disable-next-line no-undefined
    const puzzleSol = puzzle.sol === undefined || puzzle.sol === null ? "" : puzzle.sol;

    let status = 200;
    let code = NOK;
    let participation = PARTICIPANT;
    let msg = "";
    // eslint-disable-next-line init-declarations
    let erState;
    let correctAnswer = false;
    let alreadySolved = false;
    const transaction = await sequelize.transaction();

    try {
        correctAnswer = removeDiacritics(answer.toString().toLowerCase().trim()) === removeDiacritics(puzzleSol.toString().toLowerCase().trim());
        if (correctAnswer) {
            msg = puzzle.correct || i18n.escapeRoom.play.correct;
        } else {
            status = 423;
            msg = puzzle.fail || i18n.escapeRoom.play.wrong;
        }
        const participationCode = await exports.checkTurnoAccess(teams, user, escapeRoom);

        participation = participationCode;
        alreadySolved = Boolean(await models.retosSuperados.findOne({"where": {"puzzleId": puzzle.id, "teamId": teams[0].id, "success": true}}, {transaction}));
        if (participation === PARTICIPANT) {
            try {
                if (correctAnswer) {
                    code = OK;
                    if (!alreadySolved && !readOnly) {
                        await models.retosSuperados.create({"puzzleId": puzzle.id, "teamId": teams[0].id, "success": true, answer}, {transaction});
                    }
                } else {
                    if (!alreadySolved && !readOnly) {
                        await models.retosSuperados.create({"puzzleId": puzzle.id, "teamId": teams[0].id, "success": false, answer}, {transaction});
                    }
                    status = 423;
                }
            } catch (e) {
                console.error(e);
                code = ERROR;
                status = 500;
                msg = e.message;
            }
        } else {
            status = correctAnswer ? 202 : 423;
        }
        await transaction.commit();
        if (teams && teams.length) {
            const attendance = participation === "PARTICIPANT" || participation === "TOO_LATE";

            erState = await exports.getERState(escapeRoom.id, teams[0], escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed);
        }
    } catch (e) {
        await transaction.rollback();
        status = 500;
        code = ERROR;
        msg = e;
    }
    return {status, "body": {code, correctAnswer, alreadySolved, "authentication": true, "token": user.token, participation, msg, erState}};
};

exports.automaticallySetAttendance = async (team, userId, automaticAttendance) => {
    let inUser = [userId];

    switch (automaticAttendance) {
    case "team":
        // eslint-disable-next-line no-case-declarations
        const members = await team.getTeamMembers({"attributes": ["id", "name", "surname"]});

        inUser = members.map((t) => t.id);
        // eslint-disable-next-line no-fallthrough
    case "participant":
        await models.participants.update({"attendance": true}, {"where": {[Op.and]: [{"turnId": team.turno.id}, {"userId": {[Op.in]: inUser}}]}});
        break;
    case "none":
    default:
        break;
    }
    if (!(team.startTime instanceof Date && isFinite(team.startTime))) {
        team.startTime = new Date();

        await team.save({"fields": ["startTime"]});
        const {id, name, result, turno, finishTime} = team;
        const startTime = turno.startTime || team.startTime;

        return {id, turno, name, result, finishTime, startTime};
    }
};


exports.checkOnlyOneTurn = (escapeRoom) => escapeRoom.turnos && escapeRoom.turnos.length === 1;

exports.checkTeamSizeOne = (escapeRoom) => escapeRoom.teamSize === 1;

exports.checkIsTurnAvailable = (turn, duration) => {
    const now = new Date();

    now.setHours(now.getHours() - now.getTimezoneOffset() / 60);
    if (turn.status === "finished") {
        return false;
    }
    if (turn.from && turn.from > now) {
        return false;
    }
    if (turn.to && turn.to < now) {
        return false;
    }
    if (turn.startTime && new Date(turn.startTime.getTime() + duration * 60000) < now) {
        return false;
    }
    return turn.students && (!turn.capacity || turn.students.length < turn.capacity);
};

exports.getCurrentPuzzle = async (team, puzzles) => {
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

    const retosSuperadosOrder = retosSuperados.map((r) => r.order);
    const pending = puzzles.map((p) => p.order).filter((p) => retosSuperadosOrder.indexOf(p) === -1);
    let currentlyWorkingOn = retosSuperadosOrder.length ? Math.max(...retosSuperadosOrder) + 1 : 0;

    if (retosSuperadosOrder.length === puzzles.length) {
        currentlyWorkingOn = null;
    } else if (currentlyWorkingOn >= puzzles.length) {
        [currentlyWorkingOn] = pending;
    }
    return currentlyWorkingOn;
};


exports.areHintsAllowedForTeam = async (teamId, hintLimit) => {
    const reqHints = await models.requestedHint.findAll({"where": { teamId}});
    let successHints = 0;
    let failHints = 0;
    let hintsAllowed = false;

    for (const h in reqHints) {
        if (reqHints[h].success) {
            successHints++;
        } else {
            failHints++;
        }
    }
    if (!hintLimit && hintLimit !== 0 || hintLimit >= successHints) {
        hintsAllowed = true;
    }
    return {hintsAllowed, successHints, failHints};
};

exports.getContentForPuzzle = (content = "[]", currentlyWorkingOn) => JSON.parse(content || "[]").map((block, index) => ({...block, index})).filter((block) => block.puzzles.indexOf(currentlyWorkingOn.toString()) !== -1);
exports.paginate = (page = 1, pages, limit = 5) => {
    let from = 0;
    let to = 0;

    if (pages < limit) {
        to = limit;
    } else {
        const positions = Math.floor(limit / 2);

        from = Math.min(pages - limit, Math.max(0, page - positions - 1));
        to = Math.max(Math.min(pages, page + positions), limit);
    }
    return Array(pages).fill(0).map((_e, i) => i + 1).slice(from, to);
};

exports.ckeditorResponse = (funcNum, url) => `<script type='text/javascript'>
    var funcNum = ${funcNum};
    var url     = "${url}";
    var message = "Uploaded file successfully";

    window.parent.CKEDITOR.tools.callFunction(funcNum, url, message);
</script>`;


exports.validationError = ({instance, path, validatorKey}, i18n) => {
    try {
        if (i18n[instance.constructor.name] &&
            i18n[instance.constructor.name].attributes &&
            i18n[instance.constructor.name].attributes[path] &&
            i18n.common.error[validatorKey]) {
            return `${i18n[instance.constructor.name].attributes[path]} ${i18n.common.error[validatorKey]}`;
        }
    } catch (e) {
        return i18n.common.validationError;
    }
};

exports.isValidDate = (d) => d === null || d instanceof Date && !isNaN(d);

exports.groupByTeamRetos = (retos, useIdInsteadOfOrder = false) => retos.reduce((acc, val) => {
    const {id} = val;
    const success = val["puzzlesSolved.success"];
    const when = val["puzzlesSolved.createdAt"];
    const answer = val["puzzlesSolved.answer"];
    const order = useIdInsteadOfOrder ? val["puzzlesSolved.puzzle.id"] : val["puzzlesSolved.puzzle.order"];

    if (!acc[id]) {
        acc[id] = {[order]: [{success, when, answer}] };
    } else if (!acc[id][order]) {
        acc[id][order] = [{success, when, answer}];
    } else {
        acc[id][order].push({success, when, answer});
    }
    return acc;
}, {});
