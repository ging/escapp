module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "puzzle",
        {"title": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}},
        "sol": {"type": DataTypes.STRING},
        "desc": {"type": DataTypes.STRING},
        "score": {"type": DataTypes.FLOAT,
            "defaultValue": 0.0}}
    );
};
