const {models} = require("../models");

exports.escapeRoomsForUser = (escapeRoomId, userId) => ({
    "include": [
        {
            "model": models.team,
            "as": "teamsAgregados",
            "required": true,
            "include": [
                {
                    "model": models.user,
                    "as": "teamMembers",
                    "attributes": [
                        "name",
                        "id",
                        "surname"
                    ]
                },
                {
                    "model": models.turno,
                    "where": {
                        escapeRoomId
                    },
                    "required": true
                }

            ]
        }
    ],
    "where": {
        "id": userId
    }
});
