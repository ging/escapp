"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "instructions", Sequelize.STRING),
    "down": (queryInterface) => queryInterface.removeColumn("escapeRooms", "instructions")
};
