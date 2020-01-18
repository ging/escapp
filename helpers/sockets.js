const {models} = require("../models");

exports.sendTeamMessage = async (msg, teamId) => {
    console.log(msg, teamId);
    const sockets = await models.socket.findAll({"where": {teamId}});

    console.log(sockets);
    for (const socket of sockets) {
        global.io.to(socket.socketid).emit("event", msg);
    }
};
