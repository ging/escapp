module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "retosSuperados",
        {
            "success": DataTypes.BOOLEAN,
            "answer": DataTypes.TEXT
        }
    );
};
