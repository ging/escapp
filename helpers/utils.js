const Sequelize = require("sequelize");
const {Op} = Sequelize;
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("./progress");
const {areHintsAllowedForTeam} = require("./hint");
const cloudinary = require("cloudinary");
const ejs = require("ejs");
const {OK, NOT_A_PARTICIPANT, PARTICIPANT, NOK, NOT_ACTIVE, NOT_STARTED, TOO_LATE, AUTHOR, ERROR} = require("../helpers/apiCodes");
const {getPuzzleOrderSuperados} = require("./analytics");

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

    escapeRoom[`${name}Instructions`] = body.instructions;
    escapeRoom[`${name}Appearance`] = body.appearance;
    try {
        await escapeRoom.save({"fields": [`${name}Instructions`, `${name}Appearance`]});
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep(name) : progressBar || nextStep(name)}`);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/${name}`);
        } else {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        }
    }
};


exports.playInterface = async (name, req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        res.render("escapeRooms/play/play", {
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
            "endPoint": name,
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
                            "attributes": ["createdAt"]
                        }
                    }

                ],
                "required": true
            });

            const team = teams && teams[0] ? teams[0] : {};

            if (!team.startTime || team.turno.status !== "active") {
                res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
            }
            const hints = await models.requestedHint.findAll({"where": {"teamId": team.id, "success": true}, "include": models.hint});

            res.render("escapeRooms/play/play", {"escapeRoom": req.escapeRoom, cloudinary, "teams": req.teams, team, "userId": req.session.user.id, "turnoId": team.turno.id, "teamId": team.id, "isStudent": true, "hints": hints || [], "endPoint": name, "layout": false});
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
exports.renderEJS = (view, queries = {}, options = {}) => new Promise((resolve, reject) => {
    ejs.renderFile(view, queries, options, function (err, str) {
        if (err) {
            return reject(err);
        }
        resolve(str);
    });
});

exports.checkTurnoAccess = async (teams, user, escapeRoom, puzzleOrder) => {
    let participation = PARTICIPANT;
    // eslint-disable-next-line init-declarations
    let puzzlesSolved;
    // eslint-disable-next-line init-declarations
    let hintsAllowed;

    if (teams && teams.length > 0) {
        const [team] = teams;

        if (team.turno.status === "pending") {
            participation = NOT_ACTIVE;
        } else if (exports.isTooLate(team, escapeRoom.forbiddenLateSubmissions, escapeRoom.duration)) {
            participation = TOO_LATE;
        } else if (!team.startTime) {
            participation = NOT_STARTED;
        } else {
            participation = PARTICIPANT;
        }
        if (puzzleOrder) {
            puzzlesSolved = await getPuzzleOrderSuperados(team);
            hintsAllowed = await areHintsAllowedForTeam(team.id, escapeRoom.hintLimit);
        }
    } else if (escapeRoom.authorId === user.id) {
        participation = AUTHOR;
    } else {
        participation = NOT_A_PARTICIPANT;
    }

    return {participation, "erState": {puzzlesSolved, hintsAllowed}};
};

exports.checkPuzzle = async (solution, puzzle, escapeRoom, teams, user, i18n, puzzleOrder) => {
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
    let rightAnswer = false;

    try {
        rightAnswer = answer.toString().toLowerCase().trim() === puzzleSol.toString().toLowerCase().trim();
        if (rightAnswer) {
            msg = puzzle.correct || i18n.api.correct;
        } else {
            status = 423;
            msg = puzzle.fail || i18n.api.wrong;
        }
        const {"participation": participationCode, "erState": erStateCode} = await exports.checkTurnoAccess(teams, user, escapeRoom, puzzleOrder);

        participation = participationCode;
        erState = erStateCode;

        if (participation === PARTICIPANT && rightAnswer) {
            try {
                await puzzle.addSuperados(teams[0].id);
                code = OK;
            } catch (e) {
                code = ERROR;
                status = 500;
                msg = e.message;
            }
        } else {
            status = rightAnswer ? 202 : 423;
        }
    } catch (e) {
        status = 500;
        code = ERROR;
        msg = e;
    }
    return {status, "body": {code, "correctAnswer": rightAnswer, "authentication": true, "token": user.token, participation, msg, erState}};
};

exports.automaticallySetAttendance = async (team, user, automaticAttendance) => {
    let inUser = [user.id];
    const members = await team.getTeamMembers({"attributes": ["id", "name", "surname"]});

    switch (automaticAttendance) {
    case "team":
        inUser = members.map((t) => t.id);
        // eslint-disable-next-line no-fallthrough
    case "participant":
        await models.participants.update({"attendance": true}, {"where": {[Op.and]: [{"turnId": team.turno.id}, {"userId": {[Op.in]: inUser}}]}});
        break;
    case "none":
    default:
        break;
    }

    if (team && !(team.startTime instanceof Date && isFinite(team.startTime))) {
        team.startTime = new Date();
        const participants = members.map((m) => `${m.name} ${m.surname}`).join(", ");

        await team.save({"fields": ["startTime"]}); // Register start time for self-paced shifts
        const {id, name, result, turno, finishTime} = team;

        return {id, turno, name, result, finishTime, participants, "startTime" : turno.startTime || team.startTime};
    }
};

