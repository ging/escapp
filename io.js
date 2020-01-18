const {models} = require("./models");
const socketio = require("socket.io");

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

            await models.socket.create({"socketid": socket.id,
                teamId,
                userId});
            socket.emit("event", {"hello": "hello"}); // Emit an event to the socket
            socket.on("disconnect", async function () {
                const socketDeleted = await models.socket.findByPk(socket.id);

                await socketDeleted.destroy();
            });
        }
    });

    return io;
};
