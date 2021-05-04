"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("retosSuperados", "answer", {
        "type": Sequelize.TEXT,
        "defaultValue": ""
    }),
    "down": (queryInterface) => queryInterface.removeColumn("retosSuperados", "answer")
};

