module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "resource",
        {
            "config": {
                "type": DataTypes.TEXT,
                "allowNull": false
            }
        }
    );
};
