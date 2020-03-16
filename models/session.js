// Definition of the Session model:

module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "session",
        {
            "sid": {
                "type": DataTypes.STRING,
                "primaryKey": true
            },
            "expires": {"type": DataTypes.DATE},
            "data": {"type": DataTypes.STRING(50000)}
        }
    );
};
