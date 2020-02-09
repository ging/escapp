const {models} = require("../models");

exports.myTurno = (escapeRoomId, userId) => ({
    "include": [
        {
            "model": models.escapeRoom,
            "where": {
                "id": escapeRoomId
            }
        },
        {
            "model": models.team,
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
});

