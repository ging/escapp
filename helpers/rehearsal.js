const sequelize = require("../models");
const {models} = sequelize;


//getTeacherRehearsal(req.escapeRoom);
exports.getTeacherRehearsal = async (escapeRoom) => {
    const escapeRoomWithRehearsal = await models.escapeRoom.findByPk(escapeRoom.id, {"attributes": ["id","rehearsal"]});

    if (!escapeRoomWithRehearsal.rehearsal) {
        const newRehearsal = {
            "startTime": new Date(),
            "hints": [],
            "retosSuperados": []
        };

        escapeRoomWithRehearsal.rehearsal = JSON.stringify(newRehearsal);
        await escapeRoomWithRehearsal.save({"fields": ["rehearsal"]});
    }
    return JSON.parse(escapeRoomWithRehearsal.rehearsal);
};

exports.teacherSolvePuzzle = async (escapeRoom, puzzleNum) => {
    const escapeRoomWithRehearsal = await models.escapeRoom.findByPk(escapeRoom.id, {"attributes": ["id","rehearsal"]});

    if (!escapeRoomWithRehearsal.rehearsal) {
        const newRehearsal = {
            "startTime": new Date(),
            "hints": [],
            "retosSuperados": []
        };

        escapeRoomWithRehearsal.rehearsal = JSON.stringify(newRehearsal);
    }
    const rehearsal = JSON.parse(escapeRoomWithRehearsal.rehearsal);

    if (rehearsal.retosSuperados.indexOf(puzzleNum) === -1) {
        rehearsal.retosSuperados = [...rehearsal.retosSuperados, puzzleNum];
    }
    escapeRoomWithRehearsal.rehearsal = JSON.stringify(rehearsal);
    await escapeRoomWithRehearsal.save({"fields": ["rehearsal"]});
};


exports.teacherGetHint = async (escapeRoom, hintNum) => {
    const escapeRoomWithRehearsal = await models.escapeRoom.findByPk(escapeRoom.id, {"attributes": ["id","rehearsal"]});

    if (!escapeRoomWithRehearsal.rehearsal) {
        const newRehearsal = {
            "startTime": new Date(),
            "hints": [],
            "retosSuperados": []
        };

        escapeRoomWithRehearsal.rehearsal = JSON.stringify(newRehearsal);
    }
    const rehearsal = JSON.parse(escapeRoomWithRehearsal.rehearsal);

    if (rehearsal.hints.indexOf(hintNum) === -1) {
        rehearsal.hints = [...rehearsal.hints, hintNum];
    }
    escapeRoomWithRehearsal.rehearsal = JSON.stringify(rehearsal);
    await escapeRoomWithRehearsal.save({"fields": ["rehearsal"]});
};