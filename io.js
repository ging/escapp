const socketio = require("socket.io");
const {DISCONNECT, disconnect, SOLVE_PUZZLE, solvePuzzle, REQUEST_HINT, requestHint, start, checkAccess, revokeAccess} = require("./helpers/sockets");

exports.createServer = (server, sessionMiddleware) => {
    const io = socketio(server);

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    // TODO Discover what happens when server disconnects. Reconnection same socket id?
    io.on("connection", async (socket) => {
        if (socket.request.session && socket.request.session.user) {
            const userId = socket.request.session.user.id;
            const teamId = socket.handshake.query.team;
            const escapeRoomId = socket.handshake.query.escapeRoom;
            const turnId = socket.handshake.query.turn;

            // TODO Check access rights
            const isAdmin = Boolean(socket.request.session.user.isAdmin);

            const access = isAdmin ? "ADMIN" : await checkAccess(userId, teamId, escapeRoomId, turnId);
            const isAuthor = access === "AUTHOR",
                isStudent = access === "PARTICIPANT";

            if (access) {
                await start(socket.id, teamId, userId);
                socket.on(SOLVE_PUZZLE, ({puzzleId, sol}) => solvePuzzle(teamId, puzzleId, sol));
                socket.on(REQUEST_HINT, ({status, score}) => requestHint(teamId, status, score));
                socket.on(DISCONNECT, () => disconnect(socket.id));
            } else {
                await revokeAccess(socket.id);
            }
        }
    });

    return io;
};
