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
                        "through": {
                            "model": models.retosSuperados,
                            "where": {"success": true}
                        }
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
                    "startTime",
                    "place"

                ],
                "where": {escapeRoomId},
                "through": {
                    "model": models.participants,
                    "attributes": ["attendance"]
                }
            }

        ],
        "order": [
            [
                {"model": models.team, "as": "teamsAgregados"},
                {"model": models.puzzle, "as": "retos"},
                "order",
                "asc"
            ]
        ]

    };

    if (turnId) {
        options.include[0].include[0].where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = [
            [Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`)],
            ...options.order
        ];
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
            "username"
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
                "attributes": ["id", "name"],
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

        if (orderBy === "team") {
            options.order = [
                [
                    { "model": models.team, "as": "teamsAgregados"},
                    "name",
                    "asc"
                ]
            ];
        } else {
            options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
        }
    }
    return options;
};

exports.erTeam = (escapeRoomId) => ({
    "include": [
        {
            "model": models.turno,
            "required": true,
            "where": {escapeRoomId}
        },
        {
            "model": models.user,
            "through": "members",
            "as": "teamMembers",
            "attributes": ["username"]
        }
    ]
});
