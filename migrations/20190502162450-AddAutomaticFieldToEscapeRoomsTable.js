"use strict";

module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "automatic", Sequelize.BOOLEAN, {"defaultValue": false}),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("escapeRooms", "automatic", Sequelize.BOOLEAN)

};
