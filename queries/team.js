const Sequelize = require("sequelize");
const {models} = require("../models");

exports.teamComplete = (escapeRoomId, turnId, order) => {
    const where = {
        // "attributes": [],
        "where": {"startTime": {[Sequelize.Op.ne]: null}},
        "include": [
            {
                "model": models.turno,
                "attributes": ["startTime"],
                "where": {escapeRoomId}
            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [
                    "name",
                    "surname"
                ]
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {"model": models.retosSuperados}
            },
            {
                "model": models.requestedHint,
                "attributes": [
                    "id",
                    "hintId",
                    "success",
                    "score",
                    "createdAt"
                ],
                // "where": {"success": true},
                "required": false,
                "include": [{"model": models.hint}]
            }
        ],
        "order": [
            [
                {
                    "model": models.puzzle,
                    "as": "retos"
                },
                {"model": models.retosSuperados},
                "createdAt",
                "ASC"
            ]
        ]
    };

    if (turnId) {
        where.include[0].where.id = turnId;
    }

    if (order) {
        where.order = [
            Sequelize.literal(order),
            ...where.order
        ];
    }
    return where;
};

exports.puzzlesByTeam = (escapeRoomId, turnId) => {
    const options = {
        "where": {"startTime": {[Sequelize.Op.ne]: null}},
        "include": [
            {
                "model": models.turno,
                "where": {escapeRoomId}
            },
            {
                "model": models.puzzle,
                "as": "retos",
                "through": {"model": models.retosSuperados}
            },
            {
                "model": models.user,
                "as": "teamMembers",
                "through": {
                    "attributes": [
                        "name",
                        "surname"
                    ]
                }
            }
        ],
        "order": [Sequelize.literal("lower(team.name) ASC"), {"model": models.puzzle}, {"model": models.retosSuperados}, "createdAt", "ASC"]
    };

    if (turnId) {
        options.include[0].where.id = turnId;
    }
    return options;
};

exports.ranking = (escapeRoomId, turnId) => {
    // Const isPg = process.env.DATABASE_URL;
    // Const retoTime = isPg ? "\"retos->retosSuperados\".\"createdAt\"" : "`retos->retosSuperados`.`createdAt`";
    const options = {
        // "includeIgnoreAttributes": false,
        "where": {"startTime": {[Sequelize.Op.ne]: null}},
        "attributes": [
            "id",
            "name",
            "startTime"
        ],
        "include": [
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [
                    "name",
                    "surname"
                ],
                "through": {
                    "model": models.members,
                    "duplicating": true,
                    "attributes": []
                },
                "include": {
                    "model": models.turno,
                    "as": "turnosAgregados",
                    "through": {
                        "model": models.participants,
                        "required": true,
                        "attributes": ["attendance"],
                        "where": {"attendance": true}
                    }
                }
            },
            {
                "model": models.turno,
                "duplicating": true,
                "attributes": [
                    "id",
                    "date",
                    "startTime"
                ],
                "where": {
                    // "status": {[Sequelize.Op.not]: "pending"},
                    escapeRoomId
                }
            },
            {
                "model": models.puzzle,
                "attributes": ["id"],
                "as": "retos",
                "required": false,
                "duplicating": true,
                "through": {
                    "model": models.retosSuperados,
                    "attributes": ["createdAt"],
                    "required": true
                }
            }
        ]/* ,
        order: [Sequelize.literal(
            '('+retoTime+' - turno.startTime) DESC')]*/
    };


    if (turnId) {
        options.include[1].where.id = turnId;
    }

    return options;
};


exports.playRankingQuery = (turnoId, escapeRoomId) => {
    const isPg = process.env.DATABASE_URL;

    const query = {
        "where": {"startTime": {[Sequelize.Op.ne]: null}},
        "attributes": [
            "id",
            "name",
            "startTime",
            [
                Sequelize.fn(
                    "MAX",
                    Sequelize.col(isPg ? "\"retos->retosSuperados\".\"createdAt\"" : "`retos->retosSuperados`.`createdAt`")
                ),
                "latestretosuperado"
            ]
        ],
        "include": [

            {
                "model": models.turno,
                "attributes": [
                    "startTime",
                    "id"
                ]

            },
            {
                "model": models.puzzle,
                "attributes": [
                    "id",
                    "createdAt"
                ],
                "as": "retos",
                "through": {
                    "attributes": [],
                    "model": models.retosSuperados
                }
            },
            {
                "model": models.user,
                "as": "teamMembers",
                "attributes": [
                    "id",
                    "name",
                    "surname"
                ]
            }
        ],
        "group": [
            "team.id",
            "teamMembers.id",
            "retos.id"
        ],
        "order": []
    };

    if (isPg) {
        query.group = [
            ...query.group,
            "turno.startTime",
            "turno.id",
            "retos->retosSuperados.createdAt",
            "retos->retosSuperados.updatedAt",
            "retos->retosSuperados.teamId",
            "retos->retosSuperados.puzzleId",
            "teamMembers->members.createdAt",
            "teamMembers->members.updatedAt",
            "teamMembers->members.teamId",
            "teamMembers->members.userId"
        ];
    }

    if (turnoId && turnoId !== "undefined") {
        query.include[0].where = {"id": turnoId};
        if (!isPg) {
            query.group.push("turno.id");
        }
    } else {
        query.include[0].include = [{"model": models.escapeRoom, "id": escapeRoomId, "attributes": []}];
    }
    return query;
};
