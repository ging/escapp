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
                    "where": {escapeRoomId},
                    "required": true
                }

            ]
        }
    ],
    "where": {"id": userId}
});

exports.puzzlesByParticipant = (escapeRoomId, turnId, orderBy, includeReqHints, includeTeamsThatDidntAttend) => {
    const options = {
        "include": [
            {
                "model": models.team,
                "as": "teamsAgregados",
                "required": true,
                "where": includeTeamsThatDidntAttend ? {} : {"startTime": {[Sequelize.Op.ne]: null}},
                "include": [
                    {
                        "model": models.turno,
                        "where": {},
                        "include": {
                            "model": models.escapeRoom,
                            "attributes": [],
                            "required": true,
                            "where": {"id": escapeRoomId}
                        }
                    },
                    {
                        "model": models.puzzle,
                        // "attributes": ["id"],
                        "as": "retos",
                        "through": {"model": models.retosSuperados}
                    }

                ]
            },
            {
                "model": models.turno,
                "as": "turnosAgregados",
                "duplicating": false,
                "required": true,
                "attributes": [
                    "id",
                    "date",
                    "startTime"

                ],
                "where": {escapeRoomId},
                "through": {
                    "model": models.participants,
                    "attributes": ["attendance"]
                }
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

    if (includeReqHints) {
        options.include[0].include.push({
            "model": models.requestedHint,
            "include": {"model": models.hint}
        });
    }
    return options;
};

exports.participantsWithTurnoAndTeam = (escapeRoomId, turnId, orderBy) => {
    const options = {
        "attributes": [
            "id",
            "name",
            "surname",
            "gender",
            "username",
            "dni"
        ],
        "include": [
            {
                "model": models.turno,
                "as": "turnosAgregados",
                "duplicating": false,
                "required": true,
                "attributes": [
                    "id",
                    "date"
                ],
                "where": {escapeRoomId},
                "through": {
                    "model": models.participants,
                    "attributes": ["attendance"]
                }
            },
            {
                "model": models.team,
                "as": "teamsAgregados",
                "duplicating": false,
                "required": true,
                "attributes": ["id"],
                "include": {
                    "model": models.turno,
                    "where": {escapeRoomId}
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
