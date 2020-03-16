"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.createTable(
        "apps",
        {"id": {
            "type": Sequelize.INTEGER,
            "allowNull": false,
            "primaryKey": true,
            "autoIncrement": true,
            "unique": true
        },
        "name": {
            "type": Sequelize.STRING,
            "unique": true,
            "allowNull": false,
            "validate": {"notEmpty": {"msg": "El nombre no puede estar vacío."}}
        },
        "description": Sequelize.STRING,
        "key": {
            "type": Sequelize.STRING,
            "allowNull": false,
            "validate": {
                "isAlphanumeric": true
            }
        },
        "createdAt": {
            "type": Sequelize.DATE,
            "allowNull": false
        },
        "updatedAt": {
            "type": Sequelize.DATE,
            "allowNull": false
        }},
        {"sync": {"force": true}}
    ),

    "down": (queryInterface) => queryInterface.dropTable("apps")
};
