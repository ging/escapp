const Sequelize = require("sequelize");
const {models} = require("../models");

exports.hintsByParticipant = (escapeRoomId, turnId, orderBy) => {
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
                                "id": escapeRoomId
                            }
                        }
                    },
                    {
                        "model": models.requestedHint,
                        "include": {
                            "model": models.hint
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

exports.hintsByTeam = (escapeRoomId, turnId, orderBy) => {
    const options = {
        "include": [
            {
                "model": models.turno,
                "where": {},
                "include": {
                    "model": models.escapeRoom,
                    "required": true,
                    "where": {
                        "id": escapeRoomId
                    }
                }
            },
            {
                "model": models.requestedHint,
                "include": {
                    "model": models.hint
                }
            }
        ]
    };

    if (turnId) {
        options.include[0].where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
    }
    return options;
};
