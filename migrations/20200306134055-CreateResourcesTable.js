"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.createTable(
        "resources",
        {
            "id": {
                "type": Sequelize.INTEGER,
                "allowNull": false,
                "primaryKey": true,
                "autoIncrement": true,
                "unique": true
            },
            "appId": {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            "puzzleId": {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            "config": {
                "type": Sequelize.TEXT,
                "allowNull": false
            },
            "createdAt": {
                "type": Sequelize.DATE,
                "allowNull": false
            },
            "updatedAt": {
                "type": Sequelize.DATE,
                "allowNull": false
            }
        },
        {"sync": {"force": true}}
    ),

    "down": (queryInterface, Sequelize) => queryInterface.dropTable("resources")
};
