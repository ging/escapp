const socketio = require("socket.io");
const {checkAccess, getInfoFromSocket, socketAuthenticate, sendInitialInfo, initializeListeners } = require("./helpers/sockets");
const {getAuthMessageAndCode, NOT_A_PARTICIPANT, NOK} = require("./helpers/apiCodes");

exports.createServer = (server, sessionMiddleware) => {
    const io = socketio(server);

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    // TODO Discover what happens when server disconnects. Reconnection same socket id?
    io.on("connection", async (socket) => {
        try {
            const user = await socketAuthenticate(socket);
            const {escapeRoomId, lang, waiting, "turnId": teacherTurnId} = getInfoFromSocket(socket);
            // eslint-disable-next-line global-require
            const i18n = require(`./i18n/${lang}`);

            if (user) {
                const {token} = user;
                const {"turnId": studentTurnId, teamId, participation, erState, errorMsg} = await checkAccess(user, escapeRoomId, i18n);

                if (errorMsg) {
                    sendInitialInfo(socket, {"code": NOK, "authentication": true, token, "msg": errorMsg});
                    return;
                }
                const {code, msg} = getAuthMessageAndCode(participation, i18n);

                const response = {code, "authentication": true, token, participation, msg, erState};

                const turnId = studentTurnId || teacherTurnId;

                if (participation && participation !== NOT_A_PARTICIPANT) {
                    initializeListeners(escapeRoomId, turnId, teamId, user, waiting, i18n, socket);
                    if (turnId) {
                        sendInitialInfo(socket, response);
                    }
                } else {
                    sendInitialInfo(socket, response);
                }
            } else {
                sendInitialInfo(socket, {"code": NOK, "authentication": false, "msg": i18n.api.wrongCredentials});
            }
        } catch (e) {
            console.error(e);
        }
    });
    return io;
};
