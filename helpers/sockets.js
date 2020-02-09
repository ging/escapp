const sequelize = require("../models");
const queries = require("../queries");
const {models} = sequelize;
const {calculateNextHint} = require("./hint");
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

const getInfoFromSocket = (socket) => {
    const userId = socket.request.session.user.id;
    const teamId = socket.handshake.query.team;
    const escapeRoomId = socket.handshake.query.escapeRoom;
    const turnId = socket.handshake.query.turn;
    const {username} = socket.request.session.user;
    const isAdmin = Boolean(socket.request.session.user.isAdmin);

    return {userId,
        teamId,
        escapeRoomId,
        turnId,
        username,
        isAdmin};
};

/** Check if user has the rights to access a resource **/
const checkAccess = async (userId, teamId, escapeRoomId, turnId) => {
    const escapeRoom = await models.escapeRoom.findAll({
        "where": {
            "id": escapeRoomId
        },
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
                                "where": {
                                    "id": userId
                                }
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
const error = (msg, teamId) => sendTeamMessage({"type": ERROR,
    "payload": {msg}}, teamId);
const hintResponse = (success, hintId, msg, teamId) => sendTeamMessage({"type": HINT_RESPONSE,
    "payload": {success,
        hintId,
        msg}}, teamId);
const puzzleResponse = (success, puzzleId, msg, auto, teamId) => sendTeamMessage({"type": PUZZLE_RESPONSE,
    "payload": {success,
        puzzleId,
        msg,
        auto}}, teamId);
const startResponse = (turnId) => sendTurnMessage({"type": START,
    "payload": {}}, turnId);
const stopResponse = (turnId) => sendTurnMessage({"type": STOP}, turnId);
const revokeAccess = (socketId) => sendIndividualMessage({"type": "ERROR",
    "payload": {"msg": "You are not allowed to access this page"}}, socketId);
const broadcastRanking = (teamId, puzzleId, time, turnId) => sendTurnMessage({"type": RANKING,
    "payload": {teamId,
        puzzleId,
        time}}, turnId);
const initialRanking = (socketId, teams) => sendIndividualMessage({"type": INITIAL_RANKING, "payload": {teams}}, socketId);
const joinResponse = (teamId, username) => sendTeamMessage({"type": JOIN,
    "payload": {username}}, teamId);

/** Client-server**/

const join = async (teamId, username) => {
    await joinResponse(teamId, username);
};

const startTurno = async (turnId) => {
    await startResponse(turnId);
};

const solvePuzzle = async (teamId, puzzleId, solution) => {
    // TODO check puzzle
    const sol = solution === undefined || solution === null ? "" : solution.toString();
    const transaction = await sequelize.transaction();

    try {
        const puzzle = await models.puzzle.findByPk(puzzleId, {transaction});
        const team = await models.team.findByPk(teamId, {
            "include": [{"model": models.turno}]
        }, {transaction});

        if (team) {
            if (sol.toLowerCase().trim() === puzzle.sol.toLowerCase().trim()) {
                if (team.turno.status !== "active") {
                    await puzzleResponse(false, puzzleId, "Turno no activo", false, teamId);
                    await transaction.commit();
                    return;
                }
                await puzzle.addSuperados(team.id, {transaction});
                await puzzleResponse(true, puzzleId, puzzle.correct || "OK", false, teamId);
                await broadcastRanking(team.id, puzzleId, new Date(), team.turno.id);
            } else {
                await puzzleResponse(false, puzzleId, puzzle.fail || "WRONG", false, teamId);
            }
        } else {
            await error("Make sure you have signed up to this escape room", teamId);
        }
        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        await error(e, teamId);
    }
};

const sendInitialRanking = async (socketId, userId, teamId, escapeRoomId, turnoId) => {
    const teamsRaw = await models.team.findAll(queries.team.playRankingQuery(turnoId, escapeRoomId));
    const teams = teamsRaw.map((team) => {
        const {id, name, retos, turno, "latestretosuperado": latestRetoSuperado} = JSON.parse(JSON.stringify(team));
        const {startTime} = turno;
        const participants = team.teamMembers.map((member) => `${member.name} ${member.surname}`).join(", ");

        return {
            id,
            name,
            retos,
            participants,
            latestRetoSuperado,
            startTime
        };
    });

    initialRanking(socketId, teams);
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
                                "include": [
                                    {
                                        "model": models.hint
                                    }
                                ]
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

            await hintResponse(ok, hintId, msg, teamId, {"empty": "empty",
                "dontClose": "dontClose",
                "failed": "failed"});
        }
    }
};

const stopTurno = async (turnId) => {
    await stopResponse(turnId);
};


module.exports = {join,
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
    START,
    DISCONNECT,
    SOLVE_PUZZLE,
    REQUEST_HINT};

