"use strict";

module.exports = {up (queryInterface, Sequelize) {
    return queryInterface.createTable(
        "retosSuperados",
        {"teamId": {"type": Sequelize.INTEGER,
            "primaryKey": true,
            "unique": "compositeKey",
            "allowNull": false},
        "puzzleId": {"type": Sequelize.INTEGER,
            "primaryKey": true,
            "unique": "compositeKey",
            "allowNull": false},
        "createdAt": {"type": Sequelize.DATE,
            "allowNull": false},
        "updatedAt": {"type": Sequelize.DATE,
            "allowNull": false}},
        {"sync": {"force": true}}
    );
},

down (queryInterface) {
    return queryInterface.dropTable("retosSuperados");
}};
