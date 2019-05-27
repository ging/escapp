"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("participants", "attendance", Sequelize.BOOLEAN, {"allowNull": false,
        "defaultValue": false}),
    "down": (queryInterface) => queryInterface.removeColumn("participants", "attendance")
};
