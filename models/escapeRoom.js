module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "escapeRoom",
        {"title": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}},
        "subject": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "El nombre de la asignatura no puede estar vacío."}}},
        "duration": {"type": DataTypes.INTEGER,
            "validate": {"notEmpty": {"msg": "La duración no puede estar vacía."}}},
        "description": {"type": DataTypes.STRING},
        "video": {"type": DataTypes.STRING},
        "nmax": {"type": DataTypes.INTEGER,
            "validate": {"notEmpty": {"msg": "El número de participantes no puede estar vacío."}}},
        "teamSize": {"type": DataTypes.INTEGER,
            "validate": {"notEmpty": {"msg": "El tamaño de los equipos no puede estar vacío."}}},
        "invitation": {"type": DataTypes.STRING,
            "allowNull": false,
            "defaultValue" () {
                return Math.random().toString(36).
                    substr(2);
            },
            "validate": {"notEmpty": {"msg": "La URL de la invitación no puede estar vacía."}}},
        "teamAppearance": {"type": DataTypes.STRING,
            "defaultValue": "litera"},
        "classAppearance": {"type": DataTypes.STRING,
            "defaultValue": "litera"},
        "survey": {"type": DataTypes.STRING},
        "pretest": {"type": DataTypes.STRING},
        "posttest": {"type": DataTypes.STRING},
        "numQuestions": {"type": DataTypes.INTEGER},
        "numRight": {"type": DataTypes.INTEGER},
        "feedback": {"type": DataTypes.BOOLEAN},
        "classInstructions": {"type": DataTypes.STRING},
        "teamInstructions": {"type": DataTypes.STRING},
        "scoreParticipation": {"type": DataTypes.FLOAT,
            "defaultValue": 0.0},
        "hintLimit": {"type": DataTypes.INTEGER},
        "hintSuccess": {"type": DataTypes.FLOAT,
            "defaultValue": 0.0},
        "hintFailed": {"type": DataTypes.FLOAT,
            "defaultValue": 0.0}}
    );
};


