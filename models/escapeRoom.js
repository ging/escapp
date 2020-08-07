module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "escapeRoom",
        {
            "title": {
                "type": DataTypes.STRING,
                "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}
            },
            "subject": {
                "type": DataTypes.STRING,
                "validate": {"notEmpty": {"msg": "El nombre de la asignatura no puede estar vacío."}}
            },
            "duration": {
                "type": DataTypes.INTEGER,
                "validate": {
                    "notEmpty": {"msg": "La duración no puede estar vacía."},
                    "min": 0,
                    "max": 24 * 60 * 60 * 365
                }
            },
            "description": {"type": DataTypes.STRING},
            "hintInterval": {
                "type": DataTypes.FLOAT,
                "validate": {"max": 24 * 60 * 60 * 365}
            },
            "teamSize": {
                "type": DataTypes.INTEGER,
                "validate": {"max": 10000, "notEmpty": {"msg": "El tamaño de los equipos no puede estar vacío."}}
            },
            "scope": {"type": DataTypes.BOOLEAN},
            "invitation": {
                "type": DataTypes.STRING
                /* "allowNull": false,
                "defaultValue" () {
                    return Math.random().toString(36).
                        substr(2);
                },
                "validate": {"notEmpty": {"msg": "La URL de la invitación no puede estar vacía."}}*/
            },
            "teamAppearance": {
                "type": DataTypes.TEXT,
                "defaultValue": "litera",
                "allowNull": false
            },
            "classAppearance": {
                "type": DataTypes.TEXT,
                "defaultValue": "litera",
                "allowNull": false
            },
            "survey": {"type": DataTypes.STRING},
            "pretest": {"type": DataTypes.STRING},
            "posttest": {"type": DataTypes.STRING},
            "numQuestions": {
                "type": DataTypes.INTEGER,
                "validate": {
                    "min": 0,
                    "max": 10000
                }
            },
            "numRight": {
                "type": DataTypes.INTEGER,
                "validate": {
                    "min": 0,
                    "max": 100
                }
            },
            "feedback": {"type": DataTypes.BOOLEAN},
            "allowCustomHints": {"type": DataTypes.BOOLEAN},
            "forbiddenLateSubmissions": {"type": DataTypes.BOOLEAN, "defaultValue": true},
            "classInstructions": {
                "type": DataTypes.TEXT,
                "validate": {"len": [0, 200000]}
            },
            "teamInstructions": {
                "type": DataTypes.TEXT,
                "validate": {"len": [0, 200000]}
            },
            "indicationsInstructions": {
                "type": DataTypes.TEXT,
                "validate": {"len": [0, 200000]}
            },
            "supportLink": {
                "type": DataTypes.TEXT,
                "validate": {"len": [0, 200000]}
            },
            "scoreParticipation": {
                "type": DataTypes.FLOAT,
                "defaultValue": 0.0,
                "validate": {
                    "min": 0,
                    "max": 100
                }
            },
            "automaticAttendance": {
                "type": DataTypes.STRING,
                "defaultValue": "none",
                "validate": {"isIn": [["none", "participant", "team"]]}
            },
            "hintLimit": {
                "type": DataTypes.INTEGER,
                "validate": {"max": 10000}
            },
            "hintSuccess": {
                "type": DataTypes.FLOAT,
                "defaultValue": 0.0,
                "validate": {
                    "min": -100,
                    "max": 100
                }
            },
            "hintFailed": {
                "type": DataTypes.FLOAT,
                "defaultValue": 0.0,
                "validate": {
                    "min": -100,
                    "max": 100
                }
            },
            "forceLang": {
                "type": DataTypes.STRING,
                "allowNull": true,
                "validate": {"isIn": [["en", "es"]]}
            }
        }
    );
};
