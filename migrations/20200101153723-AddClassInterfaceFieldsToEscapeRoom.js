"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "classAppearance", Sequelize.STRING).
        then(() => queryInterface.addColumn("escapeRooms", "classInstructions", Sequelize.STRING)),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "classInstructions").
        then(() => queryInterface.removeColumn("escapeRooms", "classAppearance"))
};
