"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.createTable(
        "hints", {
            "id": {
                "type": Sequelize.INTEGER,
                "allowNull": false,
                "primaryKey": true,
                "autoIncrement": true,
                "unique": true
            },
            "puzzleId": {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            "content": {
                "type": Sequelize.STRING,
                "validate": {"notEmpty": {"msg": "El contenido no puede estar vacío."}}
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

    "down": (queryInterface) => queryInterface.dropTable("hints")
};


