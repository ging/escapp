const sequelize = require("../models");
const queries = require("../queries");
const {models} = sequelize;
const {calculateNextHint} = require("./hint");
const {checkPuzzle, getRanking, authenticate, checkTurnoAccess, getERState, automaticallySetAttendance, getCurrentPuzzle, getContentForPuzzle, getERPuzzles} = require("./utils");
const {getAuthMessageAndCode, OK, NOK, AUTHOR, PARTICIPANT, TOO_LATE, NOT_STARTED, ERROR, HINT_RESPONSE, TEAM_STARTED, PUZZLE_RESPONSE, TEAM_PROGRESS, INITIAL_INFO, START_PLAYING, REQUEST_HINT, SOLVE_PUZZLE, START, STOP, JOIN, JOIN_TEAM, JOIN_PARTICIPANT, LEAVE, LEAVE_TEAM, LEAVE_PARTICIPANT} = require("./apiCodes");

/**
 * Send message to the whole team
 * @param {*} msg Message to send
 * @param {*} teamId Room name (team id)
 */
const sendTeamMessage = (msg, teamId) => {
    global.io.to(`teamId_${teamId}`).emit(msg.type, msg.payload);
};

/**
 *  Send message to individual connection
 * @param {*} msg Message to send
 * @param {*} socketId Socket identifier
 */
const sendIndividualMessage = (msg, socketId) => {
    global.io.to(socketId).emit(msg.type, msg.payload);
};

/**
 * Send message to every participant in a turn connected
 * @param {*} msg Message to send
 * @param {*} turnId Room name (turn id)
 */
const sendTurnMessage = (msg, turnId) => {
    global.io.to(`turnId_${turnId}`).emit(msg.type, msg.payload);
};


/** ********** Action creators ********** **/

/* Individual messages */
// Initial info on connection
const initialInfo = (socketId, code, authentication, token, participation, msg, erState, connectedMembers) => sendIndividualMessage({"type": INITIAL_INFO, "payload": {code, authentication, token, participation, msg, erState, connectedMembers}}, socketId);
/* Team messages */
// Response to team attempt to start
const startTeam = (teamId, code, authentication, participation, msg, erState) => {
    const message = {"type": TEAM_STARTED, "payload": {code, authentication, participation, msg, erState}};

    sendTeamMessage(message, teamId);
    sendTeamMessage(message, `waiting_${teamId}`);
};
// Response to team hint request
const hintResponse = (teamId, code, authentication, participation, hintOrder, puzzleOrder, category, msg) => sendTeamMessage({"type": HINT_RESPONSE, "payload": {code, authentication, participation, hintOrder, puzzleOrder, category, msg}}, teamId);
// Response to puzzle solving attempt
const puzzleResponse = (teamId, code, correctAnswer, solution, puzzleOrder, participation, authentication, erState, msg, participantMessage, content) => sendTeamMessage({"type": PUZZLE_RESPONSE, "payload": {code, correctAnswer, solution, puzzleOrder, participation, authentication, erState, msg, participantMessage, content}}, teamId);
// Announce that a team member has joined the room
const joinResponse = (teamId, username, connectedMembers) => sendTeamMessage({"type": JOIN, "payload": {username, connectedMembers}}, teamId);
const leaveResponse = (teamId, username, connectedMembers) => sendTeamMessage({"type": LEAVE, "payload": {username, connectedMembers}}, teamId);

// TODO attendance participant

/* Turn messages */
// Turn has started
const startResponse = (turnId) => {
    sendTurnMessage({"type": START, "payload": {}}, turnId);
    sendTurnMessage({"type": START, "payload": {}}, `waiting_${turnId}`);
};
// Turn has ended
const stopResponse = (turnId) => sendTurnMessage({"type": STOP, "payload": {}}, turnId);
// Broadcast ranking after someone makes progress
const sendRanking = (turnId, ranking, teamId, puzzleOrder) => sendTurnMessage({"type": TEAM_PROGRESS, "payload": {ranking, teamId, puzzleOrder}}, turnId);
// Team has joined turn
const joinTeam = (teamId, turnId, ranking) => sendTurnMessage({"type": JOIN_TEAM, "payload": {teamId, ranking}}, turnId);
// Announce someone has joined an existing team
const joinParticipant = (username, teamId, turnId, ranking) => sendTurnMessage({"type": JOIN_PARTICIPANT, "payload": {username, teamId, ranking}}, turnId);
// Announce someone has left an existing team
const leaveParticipant = (username, teamId, turnId, ranking) => sendTurnMessage({"type": LEAVE_PARTICIPANT, "payload": {username, teamId, ranking}}, turnId);
// Announce a team has left
const leaveTeam = (teamId, turnId, ranking) => sendTurnMessage({"type": LEAVE_TEAM, "payload": {teamId, ranking}}, turnId);

/**
 * Get socket query params
 */
exports.getInfoFromSocket = ({handshake}) => {
    const lang = (handshake.headers["accept-language"] && handshake.headers["accept-language"].substring(0, 2)) === "es" ? "es" : "en";
    const escapeRoomId = parseInt(handshake.query.escapeRoom, 10) || undefined;
    const turnId = parseInt(handshake.query.turn, 10) || undefined;
    const {waiting} = handshake.query;

    return {escapeRoomId, turnId, lang, waiting};
};

/**
 * Authenticate user using socket info
 */
exports.socketAuthenticate = async ({request, handshake}) => {
    try {
        if (request && request.session && request.session.user) {
            return models.user.findByPk(request.session.user.id);
        }
        const {email, password, token} = handshake.query;
        const user = await authenticate(email, password, token);

        return user;
    } catch (e) {
        return null;
    }
};

/**
 * Check team connected
 */
exports.isTeamConnected = (teamId) => {
    if (!teamId) {
        return false;
    }
    try {
        const room = global.io.sockets.adapter.rooms[`teamId_${teamId}`];

        if (room) {
            for (const socketId in room.sockets) {
                if (global.io.sockets.connected[socketId]) {
                    return true;
                }
            }
        }
    } catch(e){
    }finally {return false;}
};

/**
 * Check team in waiting room
 */
exports.isTeamConnectedWaiting = (teamId) => {
    if (!teamId) {
        return false;
    }
    try {

    const room = global.io.sockets.adapter.rooms[`teamId_waiting_${teamId}`];

    if (room) {
        for (const socketId in room.sockets) {
            if (global.io.sockets.connected[socketId]) {
                return true;
            }
        }
    }
} catch(e){
}finally {return false;}
};

/**
 * Check participant from turn connected
 */
exports.isParticipantTurnConnected = (userId, turnId) => {
    if (!userId) {
        return false;
    }
    try {

    const room = global.io.sockets.adapter.rooms[`turnId_${turnId}`];

    if (room) {
        for (const socketId in room.sockets) {
            if (global.io.sockets.connected[socketId]) {
                const {id} = global.io.sockets.connected[socketId].handshake;

                if (id === userId) {
                    return true;
                }
            }
        }
    }
} catch(e){
}finally {return false;}
};

/**
 * Check participant from team connected
 */
exports.isParticipantTeamConnected = (participantId, teamId) => {
    if (!participantId) {
        return false;
    }
    try {

    const room = global.io.sockets.adapter.rooms[`teamId_${teamId}`];

    if (room) {
        for (const socketId in room.sockets) {
            if (global.io.sockets.connected[socketId]) {
                const {userId} = global.io.sockets.connected[socketId].handshake;

                if (participantId === userId) {
                    return true;
                }
            }
        }
    }
} catch(e){
}finally {return false;}
};

/**
 * Check participant from team connected to waiting room
 */
exports.isParticipantTeamConnectedWaiting = (participantId, teamId) => {
    if (!participantId) {
        return false;
    }
    try {

    const room = global.io.sockets.adapter.rooms[`teamId_waiting_${teamId}`];

    if (room) {
        for (const socketId in room.sockets) {
            if (global.io.sockets.connected[socketId]) {
                const {userId} = global.io.sockets.connected[socketId].handshake;

                if (participantId === userId) {
                    return true;
                }
            }
        }
    }
} catch(e){
}finally {return false;}
};


/**
 * Get team members connected to ER
 */

exports.getConnectedMembers = (teamId) => {
    if (!teamId) {
        return [];
    }
    try {

    const room = global.io.sockets.adapter.rooms[`teamId_${teamId}`];
    const connectedMembers = new Set();

    if (room) {
        for (const socketId in room.sockets) {
            if (global.io.sockets.connected[socketId]) {
                const {username} = global.io.sockets.connected[socketId].handshake;

                connectedMembers.add(username);
            }
        }
    }
    return Array.from(connectedMembers);
} catch(e){
    return []
}
};

/**
 * Check if user has the rights to access ER
 */
exports.checkAccess = async (user, escapeRoomId, i18n, waiting) => {
    try {
        const escapeRoom = await models.escapeRoom.findByPk(escapeRoomId, queries.escapeRoom.load);

        if (escapeRoom) {
            const teams = await user.getTeamsAgregados(queries.user.erTeam(escapeRoomId));
            const participation = await checkTurnoAccess(teams, user, escapeRoom, true);

            // TODO comprobar author turno está en ER
            if (participation !== "AUTHOR" && teams && teams.length) {
                const [team] = teams;
                const teamId = team.id;
                const turnId = team.turno.id;
                const attendance = participation === "PARTICIPANT" || participation === "TOO_LATE";

                if (!waiting) {
                    escapeRoom.puzzles = await getERPuzzles(escapeRoomId);
                }
                const erState = waiting ? {} : await getERState(escapeRoomId, team, escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed, attendance, true);

                // If (participation === "PARTICIPANT") {
                //     Await automaticallySetAttendance(team, user.id, escapeRoom.automaticAttendance);
                // }
                return {participation, teamId, turnId, erState, "language": escapeRoom.forceLang, "teamInstructions": escapeRoom.teamInstructions};
            }
            return {participation, "language": escapeRoom.forceLang};
        }
        return {"errorMsg": i18n.api.notFound};
    } catch (err) {
        return {"errorMsg": err.message};
    }
};

/**
 * Team member left room
 */
exports.leave = (teamId, username) => {
    leaveResponse(teamId, username, exports.getConnectedMembers(teamId));
};

/**
 * Team member joined room
 */
exports.join = (teamId, username) => {
    joinResponse(teamId, username, exports.getConnectedMembers(teamId));
};

/**
 * Turn has started
 */
exports.startTurno = (turnId) => {
    startResponse(turnId);
};

/**
 * Turn has finished
 */
exports.stopTurno = (turnId) => {
    stopResponse(turnId);
};

/**
 * Puzzle solve attempt
 */
exports.solvePuzzle = async (escapeRoomId, teamId, userId, puzzleOrderMinus, solution, i18n, teamInstructions) => {
    try {
        if (!puzzleOrderMinus && puzzleOrderMinus < 0) {
            throw new Error(i18n.api.notFound);
        }
        const puzzleOrder = puzzleOrderMinus - 1;
        const puzzle = await models.puzzle.findOne({"where": {"order": puzzleOrder, escapeRoomId}});
        const team = await models.team.findByPk(teamId, queries.team.teamInfo(escapeRoomId));
        const puzzles = await getERPuzzles(escapeRoomId);

        if (!team && !puzzle) {
            throw new Error(i18n.api.notFound);
        }
        const {body} = await checkPuzzle(solution, puzzle, team.turno.escapeRoom, [team], {"id": userId}, i18n);
        const {code, correctAnswer, participation, authentication, msg, erState, alreadySolved} = body;
        let currentlyWorkingOn = await getCurrentPuzzle(team, puzzles);

        currentlyWorkingOn = currentlyWorkingOn === null ? "all" : currentlyWorkingOn;
        const content = code === OK && !alreadySolved ? getContentForPuzzle(teamInstructions, currentlyWorkingOn) : undefined;

        puzzleResponse(teamId, code, correctAnswer, solution, puzzleOrderMinus, participation, authentication, erState, msg, i18n.escapeRoom.api.participation[participation], content);
        if (code === OK && !alreadySolved) {
            const teams = await getRanking(escapeRoomId, team.turno.id);

            sendRanking(team.turno.id, teams, teamId, puzzleOrderMinus);
        }
    } catch (e) {
        console.error(e);
        puzzleResponse(teamId, ERROR, undefined, undefined, undefined, undefined, true, undefined, e.message);
    }
};

/**
 * Send ranking to everyone in the turn
 */
exports.broadcastRanking = (turnoId, teams, teamId, puzzleOrder) => {
    sendRanking(turnoId, teams, teamId, puzzleOrder);
};

/**
 * Send initial information on connection
 */
exports.sendInitialInfo = (socket, {code, authentication, token, participation, msg, erState}) => {
    const connectedMembers = erState && erState.teamId ? exports.getConnectedMembers(erState.teamId) : [];

    initialInfo(socket.id, code, authentication, token, participation, msg, erState, connectedMembers);
};

/**
 * Start "button"
 */
exports.startPlaying = async (user, teamId, turnId, escapeRoomId, i18n) => {
    try {
        const escapeRoom = await models.escapeRoom.findByPk(escapeRoomId, queries.escapeRoom.load);

        if (escapeRoom) {
            const teams = await user.getTeamsAgregados(queries.user.erTeam(escapeRoomId));
            const participation = await checkTurnoAccess(teams, user, escapeRoom, true);
            const {code, msg} = getAuthMessageAndCode(participation, i18n, true);

            // TODO comprobar author turno está en ER

            if (participation !== AUTHOR && teams && teams.length) {
                const [team] = teams;
                const attendance = participation === PARTICIPANT || participation === TOO_LATE;
                // eslint-disable-next-line init-declarations
                let erState;

                if (participation === PARTICIPANT || participation === NOT_STARTED) {
                    const firstTimer = await automaticallySetAttendance(team, user.id, escapeRoom.automaticAttendance);

                    escapeRoom.puzzles = await getERPuzzles(escapeRoomId);
                    erState = await getERState(escapeRoomId, team, escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed, true);

                    if (firstTimer) {
                        joinTeam(turnId, teamId, erState.ranking);
                        startTeam(teamId, code, true, PARTICIPANT, msg, erState);
                    }
                    return;
                } else if (participation === TOO_LATE) {
                    escapeRoom.puzzles = await getERPuzzles(escapeRoomId);
                    erState = await getERState(escapeRoomId, team, escapeRoom.duration, escapeRoom.hintLimit, escapeRoom.puzzles.length, attendance, escapeRoom.scoreParticipation, escapeRoom.hintSuccess, escapeRoom.hintFailed, true);
                }
                startTeam(teamId, code, true, participation, msg, erState);
                return;
            }
            startTeam(teamId, code, true, participation, msg);
            return;
        }
        throw new Error(i18n.api.notFound);
    } catch (err) {
        console.error(err);
        startTeam(teamId, ERROR, true, undefined, err.msg, undefined);
    }
};

/**
 * Announce all members of the team that someone has hit the start button
 */
exports.sendStartTeam = (teamId, code, authentication, participation, msg, erState) => {
    startTeam(teamId, code, authentication, participation, msg, erState);
};

/**
 * Announce all turn participants that a team has joined the turn
 */
exports.sendJoinTeam = (teamId, turnId, teams) => {
    joinTeam(teamId, turnId, teams);
};

/**
 * Announce all turn participants that a new participant has joined an existing team
 */
exports.sendJoinParticipant = (username, teamId, turnId, teams) => {
    joinParticipant(username, teamId, turnId, teams);
};

/**
 * Announce all turn participants that a new participant has left an existing team
 */
exports.sendLeaveParticipant = (username, teamId, turnId, teams) => {
    leaveParticipant(username, teamId, turnId, teams);
};

/**
 * Announce all turn participants that a team has left the turn
 */
exports.sendLeaveTeam = (teamId, turnId, teams) => {
    leaveTeam(teamId, turnId, teams);
};

/**
 * Request a hint
 */
const requestHint = async (escapeRoomId, teamId, userId, status, score, category, i18n) => {
    const team = await models.team.findByPk(teamId, queries.team.puzzlesAndHints(teamId));

    if (team && team.turno && team.turno.escapeRoom) {
        const result = await calculateNextHint(team.turno.escapeRoom, team, status, score, category, i18n.escapeRoom.play);

        if (result) { // TODO participation, auth...
            const {msg, ok, hintOrder, puzzleOrder, "category": newCat} = result;

            await hintResponse(teamId, ok ? OK : NOK, true, PARTICIPANT, hintOrder, puzzleOrder, newCat, msg);
        }
    }
};

exports.requestHint = requestHint;

/**
 * Solve a puzzle
 */
exports.puzzleResponse = puzzleResponse;

exports.sendTeamMessage = sendTeamMessage;
exports.sendTurnMessage = sendTurnMessage;

/**
 * Join rooms for team and turn
 */
exports.initializeListeners = (escapeRoomId, turnId, teamId, user, waiting, i18n, teamInstructions, socket) => {
    if (waiting) {
        if (teamId) {
            socket.join(`teamId_waiting_${teamId}`);
        }
        if (turnId) {
            socket.join(`turnId_waiting_${turnId}`);
        }
    } else {
        if (teamId) {
            socket.on(SOLVE_PUZZLE, ({puzzleOrder, sol}) => exports.solvePuzzle(escapeRoomId, teamId, user.id, puzzleOrder, sol, i18n, teamInstructions));
            socket.on(REQUEST_HINT, ({status, score, category}) => requestHint(escapeRoomId, teamId, user.id, status, score, category, i18n));
            socket.on(START_PLAYING, () => exports.startPlaying(user, teamId, turnId, escapeRoomId, i18n));
            socket.on("disconnect", () => exports.leave(teamId, user.username));
            socket.join(`teamId_${teamId}`);
            exports.join(teamId, user.username);
        }
        if (turnId) {
            socket.join(`turnId_${turnId}`);
        }
    }
};
