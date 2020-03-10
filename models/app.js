module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "app",
        {
            "name": {
                "type": DataTypes.STRING,
                "validate": {
                    "notEmpty": {"msg": "El título no puede estar vacío."}
                }
            },
            "description": DataTypes.STRING,
            "key": {
                "type": DataTypes.STRING,
                "allowNull": false,
                "validate": {
                    "isAlphanumeric": true
                }
            }
        }
    );
};
