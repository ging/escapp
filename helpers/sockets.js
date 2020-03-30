const sequelize = require("../models");
const queries = require("../queries");
const {models} = sequelize;
const {calculateNextHint} = require("./hint");
const {getRetosSuperados, checkPuzzleAnswer} = require("../helpers/utils");
const {OK} = require("./apiCodes");
/** Server-client**/

const DISCONNECT = "disconnect";
const ERROR = "ERROR";
const HINT_RESPONSE = "HINT_RESPONSE";
const PUZZLE_RESPONSE = "PUZZLE_RESPONSE";
const RANKING = "RANKING";
const INITIAL_RANKING = "INITIAL_RANKING";
const REQUEST_HINT = "REQUEST_HINT";
const SOLVE_PUZZLE = "SOLVE_PUZZLE";
const START = "START";
const STOP = "STOP";
const JOIN = "JOIN";
const JOIN_TEAM = "JOIN_TEAM";

const getInfoFromSocket = ({request, handshake}) => {
    const userId = request.session.user.id;
    const teamId = parseInt(handshake.query.team, 10) || undefined;
    const lang = (handshake.headers["accept-language"] && handshake.headers["accept-language"].substring(0, 2)) === "es" ? "es" : "en";
    const escapeRoomId = parseInt(handshake.query.escapeRoom, 10) || undefined;
    const turnId = parseInt(handshake.query.turn, 10) || undefined;
    const {username} = request.session.user;
    const isAdmin = Boolean(request.session.user.isAdmin);

    return {userId, teamId, escapeRoomId, turnId, username, isAdmin, lang};
};

/** Check if user has the rights to access a resource **/
const checkAccess = async (userId, teamId, escapeRoomId, turnId) => {
    const escapeRoom = await models.escapeRoom.findAll({
        "where": {"id": escapeRoomId},
        "include": [
            {
                "model": models.turno,
                "include": [
                    {
                        "model": models.team,
                        "where": {"id": teamId},
                        "include": [
                            {
                                "model": models.user,
                                "as": "teamMembers",
                                "where": {"id": userId}
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (escapeRoom && escapeRoom.length > 0) {
        // eslint-disable-next-line eqeqeq
        if (escapeRoom.authorId == userId) {
            return "AUTHOR";
        } else if (escapeRoom[0].turnos && escapeRoom[0].turnos.length > 0) {
            if (escapeRoom[0].turnos[0].teams && escapeRoom[0].turnos[0].teams.length > 0) {
                if (escapeRoom[0].turnos[0].teams[0].teamMembers && escapeRoom[0].turnos[0].teams[0].teamMembers.length > 0) {
                    // eslint-disable-next-line eqeqeq
                    if (escapeRoom[0].turnos[0].id == turnId) {
                        return "PARTICIPANT";
                    }
                }
            }
        }
    }
    return false;
};

/** Send message to every team member connected*/
const sendTeamMessage = (msg, teamId) => {
    global.io.to(`teamId_${teamId}`).emit(msg.type, msg.payload);
};

const sendIndividualMessage = (msg, socketId) => {
    global.io.to(socketId).emit(msg.type, msg.payload);
};

const sendTurnMessage = (msg, turnId) => {
    global.io.to(`turnId_${turnId}`).emit(msg.type, msg.payload);
};

/** Action creators */
const error = (msg, teamId) => sendTeamMessage({"type": ERROR, "payload": {msg}}, teamId);
const hintResponse = (success, hintId, msg, teamId) => sendTeamMessage({"type": HINT_RESPONSE, "payload": {success, hintId, msg}}, teamId);
const puzzleResponse = (success, correctAnswer, puzzleId, participation, authentication, msg, participantMessage, teamId) => sendTeamMessage({"type": PUZZLE_RESPONSE, "payload": {success, correctAnswer, puzzleId, participation, authentication, msg, participantMessage}}, teamId);
const startResponse = (turnId) => sendTurnMessage({"type": START, "payload": {}}, turnId);
const stopResponse = (turnId) => sendTurnMessage({"type": STOP}, turnId);
const revokeAccess = (socketId) => sendIndividualMessage({"type": "ERROR", "payload": {"msg": "You are not allowed to access this page"}}, socketId);
const broadcastRanking = (teamId, puzzleId, time, turnId) => sendTurnMessage({"type": RANKING, "payload": {teamId, puzzleId, time}}, turnId);
const initialRanking = (socketId, teams) => sendIndividualMessage({"type": INITIAL_RANKING, "payload": {teams}}, socketId);
const joinResponse = (teamId, username) => sendTeamMessage({"type": JOIN, "payload": {username}}, teamId);
const joinTeam = (turnId, team) => sendTurnMessage({"type": JOIN_TEAM, "payload": {team}}, turnId);
/** Client-server**/

const join = async (teamId, username) => {
    await joinResponse(teamId, username);
};

const startTurno = async (turnId) => {
    await startResponse(turnId);
};

const solvePuzzle = async (escapeRoomId, teamId, userId, puzzleId, solution, i18n) => {
    try {
        const puzzle = await models.puzzle.findOne({"where": {"id": puzzleId, escapeRoomId}});

        if (!puzzle) {
            throw new Error("Team not found");
        }
        const team = await models.team.findByPk(teamId, {
            "include": [
                {
                    "model": models.turno,
                    "required": true,
                    "where": {escapeRoomId},
                    "include": [
                        {
                            "model": models.escapeRoom,
                            "attributes": ["duration", "forbiddenLateSubmissions"]
                        }
                    ]
                }
            ]
        });

        if (!team) {
            throw new Error("Team not found");
        }

        const {body} = await checkPuzzleAnswer(solution, puzzle, team.turno.escapeRoom, [team], {"id": userId}, i18n);
        const {code, correctAnswer, participation, authentication, msg} = body;

        if (code === OK) {
            puzzle.addSuperados(team.id);
            broadcastRanking(team.id, puzzleId, new Date(), team.turno.id);
        }
        puzzleResponse(code === OK, correctAnswer, puzzleId, participation, authentication, msg, i18n.escapeRoom.api.participation[participation], teamId);
    } catch (e) {
        error(e, teamId);
    }
};

const sendInitialRanking = async (socketId, userId, teamId, escapeRoomId, turnoId) => {
    const teamsRaw = await models.team.findAll(queries.team.ranking(escapeRoomId, turnoId));

    const teams = getRetosSuperados(teamsRaw).map((team) => {
        const {id, name, retos, turno, "latestretosuperado": latestRetoSuperado, "countretos": count} = JSON.parse(JSON.stringify(team));
        const startTime = turno.startTime || team.startTime;
        const participants = team.teamMembers.map((member) => `${member.name} ${member.surname}`).join(", ");

        return {id, name, count, retos, participants, latestRetoSuperado, startTime};
    });

    initialRanking(socketId, teams);
};

const sendJoinTeam = (team) => {
    joinTeam(team.turno.id, team);
};

const requestHint = async (teamId, status, score) => {
    const team = await models.team.findByPk(teamId, {
        "include": [
            {
                "model": models.turno,
                "include": [
                    {
                        "model": models.escapeRoom,
                        "include": [
                            {
                                "model": models.puzzle,
                                "include": [{"model": models.hint}]
                            }
                        ]
                    }
                ]
            }
        ],
        "order": [
            [
                {"model": models.turno},
                {"model": models.escapeRoom},
                {"model": models.puzzle},
                "order",
                "asc"
            ],
            [
                {"model": models.turno},
                {"model": models.escapeRoom},
                {"model": models.puzzle},
                {"model": models.hint},
                "order",
                "asc"
            ]
        ]
    });

    if (team && team.turno && team.turno.escapeRoom) {
        const result = await calculateNextHint(team.turno.escapeRoom, team, status, score);

        if (result) {
            const {msg, ok, hintId} = result;

            await hintResponse(ok, hintId, msg, teamId, {"empty": "empty", "dontClose": "dontClose", "failed": "failed"});
        }
    }
};

const stopTurno = (turnId) => {
    stopResponse(turnId);
};

module.exports = {
    join,
    stopTurno,
    startTurno,
    checkAccess,
    requestHint,
    solvePuzzle,
    revokeAccess,
    puzzleResponse,
    broadcastRanking,
    getInfoFromSocket,
    sendInitialRanking,
    sendJoinTeam,
    START,
    DISCONNECT,
    SOLVE_PUZZLE,
    REQUEST_HINT
};

