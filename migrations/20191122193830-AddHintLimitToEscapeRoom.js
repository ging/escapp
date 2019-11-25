"use strict";

module.exports = {"up": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "hintLimit", Sequelize.INTEGER),
    "down": (queryInterface) => queryInterface.removeColumn("escapeRooms", "hintLimit")};
