module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "puzzle",
        {
            "title": {
                "type": DataTypes.STRING,
                "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}
            },
            "sol": {"type": DataTypes.TEXT},
            "desc": {"type": DataTypes.TEXT},
            "order": {
                "type": DataTypes.INTEGER,
                "allowNull": false
            },
            "correct": {"type": DataTypes.TEXT},
            "fail": {"type": DataTypes.TEXT},
            "automatic": {
                "type": DataTypes.BOOLEAN,
                "defaultValue": false
            },
            "score": {
                "type": DataTypes.FLOAT,
                "defaultValue": 0.0
            }
        }
    );
};
