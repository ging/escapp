"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.changeColumn("escapeRooms", "invitation", {
        "type": Sequelize.TEXT,
        "unique": false,
        "allowNull": true,
        "defaultValue": null
    }),
    "down": () => (queryInterface, Sequelize) => queryInterface.changeColumn("escapeRooms", "invitation", {
        "unique": true,
        "type": Sequelize.STRING,
        "allowNull": false,
        "defaultValue": () => Math.random().toString(36).substr(2)
    })
};
