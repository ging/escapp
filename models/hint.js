module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "hint",
        {
            "content": {
                "type": DataTypes.TEXT,
                "validate": {
                    "len": [0, 5000],
                    "notEmpty": {"msg": "El contenido no puede estar vacío."}
                }
            },
            "order": {
                "type": DataTypes.INTEGER,
                "allowNull": false
            },
            "category": {
                "type": DataTypes.STRING,
                "allowNull": false,
                "validate": {"len": [0, 5000]}
            }
        }
    );
};
