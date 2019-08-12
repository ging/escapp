const {models} = require("../models");
const Sequelize = require("sequelize");

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

exports.puzzlesByParticipant = (escapeRoom, turnId, orderBy) => {
    const options = {
        "include": [
            {
                "model": models.team,
                "as": "teamsAgregados",
                "required": true,
                "include": [
                    {
                        "model": models.turno,
                        "where": {},
                        "include": {
                            "model": models.escapeRoom,
                            "required": true,
                            "where": {
                                "id": escapeRoom.id
                            }
                        }
                    },
                    {
                        "model": models.puzzle,
                        "as": "retos",
                        "through": {
                            "model": models.retosSuperados
                        }
                    }
                ]
            }

        ]
    };

    if (turnId) {
        options.include[0].include[0].where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
    }
    return options;
};
