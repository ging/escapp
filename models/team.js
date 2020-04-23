module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "team",
        {
            "name": {
                "type": DataTypes.STRING,
                "validate": {
                    "len": [0, 200],
                    "notEmpty": {"msg": "El nombre no puede estar vacío."}
                }
            },
            "startTime": {"type": DataTypes.DATE}
        }
    );
};
