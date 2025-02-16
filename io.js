/* eslint-disable global-require */

const { Server } = require("socket.io");

const {checkAccess, getInfoFromSocket, socketAuthenticate, sendInitialInfo, initializeListeners } = require("./helpers/sockets");
const {getAuthMessageAndCode, NOT_A_PARTICIPANT, NOK} = require("./helpers/apiCodes");

exports.createServer = (server, sessionMiddleware) => {
    const io = new Server(server, {"perMessageDeflate": false, "allowEIO3": true, "cors": { "origin": "*", "methods": ["GET", "POST"]} });

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, socket.request.res || {}, next);
    });

    // TODO Discover what happens when server disconnects. Reconnection same socket id?
    io.on("connection", async (socket) => {
        try {
            const user = await socketAuthenticate(socket);
            const {escapeRoomId, lang, waiting, "turnId": teacherTurnId} = getInfoFromSocket(socket);
            let forceLanguage = "en";

            if (lang && (lang === "es" || lang === "en")) {
                forceLanguage = lang;
            }
            let i18n = require(`./i18n/${forceLanguage}`);

            if (user) {
                if (user.lang && (user.lang === "es" || user.lang === "en")) {
                    i18n = require(`./i18n/${user.lang}`);
                }
                const {token, username} = user;
                const {"turnId": studentTurnId, teamId, participation, erState, errorMsg, language, teamInstructions} = await checkAccess(user, escapeRoomId, i18n, waiting);

                if (language && (language === "es" || language === "en")) {
                    i18n = require(`./i18n/${language}`);
                }

                socket.handshake.username = username;
                socket.handshake.userId = user.id;
                if (errorMsg) {
                    sendInitialInfo(socket, {"code": NOK, "authentication": true, token, "msg": errorMsg});
                    return;
                }
                const {code, msg} = getAuthMessageAndCode(participation, i18n);

                const response = {code, "authentication": true, token, participation, msg, erState};
                const turnId = studentTurnId || teacherTurnId;

                if (user.isAdmin || participation && participation !== NOT_A_PARTICIPANT) {
                    initializeListeners(escapeRoomId, turnId, teamId, user, waiting, i18n, teamInstructions, socket);
                    if (turnId) {
                        sendInitialInfo(socket, response);
                    }
                } else {
                    sendInitialInfo(socket, response);
                }
            } else {
                sendInitialInfo(socket, {"code": NOK, "authentication": false, "msg": i18n.api.wrongCredentials});
                if (socket.conn) {
                    socket.conn.close();
                }
            }
        } catch (e) {
            console.error(e);
        }
    });
    return io;
};
