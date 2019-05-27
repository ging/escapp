module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "requestedHint",
        {
            "success": DataTypes.BOOLEAN,
            "score": DataTypes.FLOAT
        }
    );
};
