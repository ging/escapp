module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "turno",
        {
            "date": {
                "type": DataTypes.DATE,
                "validate": {"notEmpty": {"msg": "La fecha no puede estar vacía."}}
            },
            "place": {"type": DataTypes.STRING, "validate": {"len": [0, 200]}},
            "startTime": {"type": DataTypes.DATE},
            "status": {
                "type": DataTypes.STRING,
                "defaultValue": "pending"
            }
        }
    );
};
