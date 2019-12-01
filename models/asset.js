// Definition of the Asset model:

module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "asset",
        {"public_id": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "public_id must not be empty"}}},
        "url": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "url must not be empty"}}},
        "filename": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "filename must not be empty"}}},
        "mime": {"type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "mime must not be empty"}}}}
    );
};
