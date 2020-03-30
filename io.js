const socketio = require("socket.io");
const {SOLVE_PUZZLE, solvePuzzle, REQUEST_HINT, requestHint, join, checkAccess, revokeAccess, sendInitialRanking, getInfoFromSocket} = require("./helpers/sockets");


exports.createServer = (server, sessionMiddleware) => {
    const io = socketio(server);

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    // TODO Discover what happens when server disconnects. Reconnection same socket id?
    io.on("connection", async (socket) => {
        if (socket.request.session && socket.request.session.user) {
            const {userId, teamId, escapeRoomId, turnId, isAdmin, username, lang} = getInfoFromSocket(socket);
            // eslint-disable-next-line global-require
            const i18n = require(`./i18n/${lang}`);
            const access = isAdmin ? "ADMIN" : await checkAccess(userId, teamId, escapeRoomId, turnId, i18n);
            /** For future use
                const   isAuthor  = access === "AUTHOR",
                        isStudent = access === "PARTICIPANT";
            **/

            if (access) {
                if (teamId) {
                    socket.on(SOLVE_PUZZLE, ({puzzleId, sol}) => solvePuzzle(escapeRoomId, teamId, userId, puzzleId, sol, i18n));
                    socket.on(REQUEST_HINT, ({status, score}) => requestHint(teamId, status, score, i18n));
                    await join(teamId, username);
                    socket.join(`teamId_${teamId}`);
                }
                if (turnId) {
                    socket.join(`turnId_${turnId}`);
                    if (teamId) {
                        await sendInitialRanking(socket.id, userId, teamId, escapeRoomId, turnId, i18n);
                    }
                }
            } else {
                await revokeAccess(socket.id, i18n);
            }
        }
    });
    return io;
};
