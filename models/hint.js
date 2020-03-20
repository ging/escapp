module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "hint",
        {
            "content": {
                "type": DataTypes.STRING,
                "validate": {"notEmpty": {"msg": "El contenido no puede estar vacío."}}
            },
            "order": {
                "type": DataTypes.INTEGER,
                "allowNull": false
            }
        }
    );
};
