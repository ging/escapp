"use strict";

module.exports = {"up": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "survey", Sequelize.STRING).
    then(() => queryInterface.addColumn("escapeRooms", "pretest", Sequelize.STRING).
        then(() => queryInterface.addColumn("escapeRooms", "posttest", Sequelize.STRING))),

"down": (queryInterface) => queryInterface.removeColumn("escapeRooms", "survey").
    then(() => queryInterface.removeColumn("escapeRooms", "pretest").
        then(() => queryInterface.removeColumn("escapeRooms", "posttest")))};
