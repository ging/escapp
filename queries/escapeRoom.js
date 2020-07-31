const {models} = require("../models");


exports.load = {
    "include": [
        {
            "model": models.user,
            "as": "author"
        }
    ]
};


exports.loadShow = {
    "include": [
        {"model": models.turno},
        {
            "model": models.puzzle,
            "include": [{"model": models.hint}]
        },
        models.attachment,
        models.hintApp
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


exports.loadPuzzles = {
    "include": [
        {
            "model": models.puzzle,
            "include": [{"model": models.hint}]
        }
    ],
    "order": [
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


exports.loadComplete = {
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

exports.forTeacher = (id) => ({
    "attributes": ["id", "title", "invitation"],
    "include": [
        models.attachment,
        {
            "model": models.user,
            "as": "author",
            "where": {id}
        }
    ]
});
