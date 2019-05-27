module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "participants",
        {"attendance": {"type": DataTypes.BOOLEAN,
            "defaultValue": false}}
    );
};
