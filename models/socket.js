// Definition of the Socket model:
module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "socket",
        {"socketid": {"type": DataTypes.STRING,
            "primaryKey": true}}
    );
};
