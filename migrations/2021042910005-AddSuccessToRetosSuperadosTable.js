"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("retosSuperados", "success", {
        "type": Sequelize.BOOLEAN,
        "defaultValue": true
    }),
    "down": (queryInterface) => queryInterface.removeColumn("retosSuperados", "success")
};

