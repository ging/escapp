const {models} = require("../models");

exports.load = {
    "include": [
        {
            "model": models.turno,
            "include": {
                "model": models.team,
                "attributes": ["id"]
            }
        },
        {
            "model": models.puzzle,
            "include": [{"model": models.hint}]
        },
        models.attachment,
        models.asset,
        models.hintApp,
        {
            "model": models.user,
            "as": "author"
        }
    ],
    "order": [
        [
            {"model": models.turno},
            "date",
            "asc"
        ],
        [
            {"model": models.puzzle},
            "order",
            "asc"
        ],
        [
            {"model": models.puzzle},
            {"model": models.hint},
            "order",
            "asc"
        ]
    ]
};

exports.all = (user) => {
    const findOptions = {
        "attributes": [
            "id",
            "title",
            "invitation",
            "nmax"
        ],
        "include": [
            {
                "model": models.turno,
                "attributes": ["status"],
                "duplicating": false,
                "required": true,
                "include": [
                    {
                        "model": models.user,
                        "attributes": ["id"],
                        "as": "students",
                        "duplicating": false,
                        "required": false
                    }
                ]
            },
            models.attachment
        ]
    };

    if (user) {
        findOptions.include[0].include[0].where = {"id": user};
        findOptions.include[0].include[0].required = true;
        findOptions.attributes = ["id"];
    }
    return findOptions;
};
