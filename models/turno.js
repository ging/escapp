module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "turno",
        {
            "date": {
                "type": DataTypes.DATE,
                "validate": {"notEmpty": {"msg": "La fecha no puede estar vacía."}}
            },
            "place": {"type": DataTypes.STRING},
            "startTime": {"type": DataTypes.DATE},
            "status": {
                "type": DataTypes.STRING,
                "defaultValue": "pending"
            }
        }
    );
};
