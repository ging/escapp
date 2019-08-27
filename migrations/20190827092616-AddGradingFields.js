"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "scoreParticipation", Sequelize.FLOAT, {"defaultValue": 0.0}).
        then(() => queryInterface.addColumn("escapeRooms", "hintSuccess", Sequelize.FLOAT, {"defaultValue": 0.0}).
            then(() => queryInterface.addColumn("escapeRooms", "hintFailed", Sequelize.FLOAT, {"defaultValue": 0.0}))),

    "down": (queryInterface) => queryInterface.removeColumn("escapeRooms", "scoreParticipation").
        then(() => queryInterface.removeColumn("escapeRooms", "hintSuccess").
            then(() => queryInterface.removeColumn("escapeRooms", "hintFailed")))
};
