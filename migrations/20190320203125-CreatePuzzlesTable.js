"use strict";

module.exports = {"up": (queryInterface, Sequelize) => queryInterface.createTable(
    "puzzles", {"id": {"type": Sequelize.INTEGER,
        "allowNull": false,
        "primaryKey": true,
        "autoIncrement": true,
        "unique": true},
    "escapeRoomId": {"type": Sequelize.INTEGER,
        "allowNull": false},
    "title": {"type": Sequelize.STRING,
        "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}},
    "sol": {"type": Sequelize.STRING},
    "desc": {"type": Sequelize.STRING},
    "createdAt": {"type": Sequelize.DATE,
        "allowNull": false},
    "updatedAt": {"type": Sequelize.DATE,
        "allowNull": false}},
    {"sync": {"force": true}}
),

"down": (queryInterface) => queryInterface.dropTable("puzzles")};


