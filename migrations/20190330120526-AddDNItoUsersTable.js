"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("users", "dni", Sequelize.STRING),

    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("users", "dni", Sequelize.STRING)
};
