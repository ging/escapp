"use strict";

module.exports = {up (queryInterface, Sequelize) {
    return queryInterface.createTable(
        "requestedHints",
        {"id": {"type": Sequelize.INTEGER,
            "allowNull": false,
            "primaryKey": true,
            "autoIncrement": true,
            "unique": true},
        "teamId": {
            "type": Sequelize.INTEGER,
            "allowNull": false
        },
        "hintId": {
            "type": Sequelize.INTEGER
        },
        "success": Sequelize.BOOLEAN,
        "score": Sequelize.FLOAT,
        "createdAt": {"type": Sequelize.DATE,
            "allowNull": false},
        "updatedAt": {"type": Sequelize.DATE,
            "allowNull": false}},
        {"sync": {"force": true}}
    );
},

down (queryInterface) {
    return queryInterface.dropTable("requestedHints");
}};
