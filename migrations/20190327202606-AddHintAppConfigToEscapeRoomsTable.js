"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn(
        "escapeRooms",
        "numQuestions", Sequelize.INTEGER
    ).
        then(() => queryInterface.addColumn("escapeRooms", "numRight", Sequelize.INTEGER).
            then(() => queryInterface.addColumn("escapeRooms", "feedback", Sequelize.BOOLEAN))),

    "down": (queryInterface) => queryInterface.removeColumn("escapeRooms", "numQuestions").
        then(() => queryInterface.removeColumn("escapeRooms", "numRight").
            then(() => queryInterface.removeColumn("escapeRooms", "feedback")))
};
