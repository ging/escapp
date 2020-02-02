const socketio = require("socket.io");
const {SOLVE_PUZZLE, solvePuzzle, REQUEST_HINT, requestHint, join, checkAccess, revokeAccess, getInfoFromSocket} = require("./helpers/sockets");


exports.createServer = (server, sessionMiddleware) => {
    const io = socketio(server);

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    // TODO Discover what happens when server disconnects. Reconnection same socket id?
    io.on("connection", async (socket) => {
        if (socket.request.session && socket.request.session.user) {
            const {userId, teamId, escapeRoomId, turnId, isAdmin, username} = getInfoFromSocket(socket);
            const access = isAdmin ? "ADMIN" : await checkAccess(userId, teamId, escapeRoomId, turnId);
            const isAuthor = access === "AUTHOR",
                isStudent = access === "PARTICIPANT";

            if (access) {
                await join(teamId, username);
                socket.on(SOLVE_PUZZLE, ({puzzleId, sol}) => solvePuzzle(teamId, puzzleId, sol));
                socket.on(REQUEST_HINT, ({status, score}) => requestHint(teamId, status, score));
                socket.join(`teamId_${teamId}`);
                socket.join(`turnId_${turnId}`);
            } else {
                await revokeAccess(socket.id);
            }
        }
    });
    return io;
};
