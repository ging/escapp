const sequelize = require("../models");
const {models} = sequelize;
const {calculateNextHint} = require("./hint");
/** Server-client**/

const DISCONNECT = "disconnect";
const ERROR = "ERROR";
const HINT_RESPONSE = "HINT_RESPONSE";
const PUZZLE_RESPONSE = "PUZZLE_RESPONSE";
const REQUEST_HINT = "REQUEST_HINT";
const SOLVE_PUZZLE = "SOLVE_PUZZLE";
const START = "START";
const STOP = "STOP";

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
        if (escapeRoom.authorId === userId) {
            return "AUTHOR";
        } else if (escapeRoom[0].turnos && escapeRoom[0].turnos.length > 0) {
            if (escapeRoom[0].turnos[0].teams && escapeRoom[0].turnos[0].teams.length > 0) {
                if (escapeRoom[0].turnos[0].teams[0].teamMembers && escapeRoom[0].turnos[0].teams[0].teamMembers.length > 0) {
                    return "PARTICIPANT";
                }
            }
        }
    }
    return false;
};

/** Send message to every team member connected*/
const sendTeamMessage = async (msg, teamId) => {
    console.log(msg, teamId);
    try {
        const sockets = await models.socket.findAll({"where": {teamId}});

        for (const socket of sockets) {
            try {
                global.io.to(socket.socketid).emit(msg.type, msg.payload);
            } catch (err) {
                console.error(err);
            }
        }
    } catch (err) {
        console.error(err);
    }
};

const sendIndividualMessage = async (msg, socketId) => {
    global.io.to(socketId).emit(msg.type, msg.payload);
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
const startResponse = (msg, teamId) => sendTeamMessage({"type": START,
    "payload": {msg}}, teamId);
const stopResponse = (teamId) => sendTeamMessage({"type": STOP}, teamId);
const revokeAccess = (socketId) => sendIndividualMessage({"type": "ERROR",
    "payload": {"msg": "You are not allowed to access this page"}}, socketId);
/** Client-server**/

const disconnect = async (socketid) => {
    const socketDeleted = await models.socket.findByPk(socketid);

    await socketDeleted.destroy();
};

const start = async (socketid, teamId, userId) => {
    await models.socket.create({socketid,
        teamId,
        userId});
    await startResponse("ER started", teamId);
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

const requestHint = async (teamId, status, score) => {
    // TODO get corresponding hint
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

const stop = async (teamId) => {
    await stopResponse(teamId);
};


module.exports = {start,
    disconnect,
    checkAccess,
    revokeAccess,
    solvePuzzle,
    puzzleResponse,
    requestHint,
    stop,
    START,
    DISCONNECT,
    SOLVE_PUZZLE,
    REQUEST_HINT};

