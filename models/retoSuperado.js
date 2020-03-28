module.exports = function (sequelize, DataTypes) {
    return sequelize.define(
        "retoSuperado",
        {},
        {
            singular: 'retoSuperado',
            plural: 'retosSuperados',
            tableName: 'retosSuperados'
        }
    );
};
