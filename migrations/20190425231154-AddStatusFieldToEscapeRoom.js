"use strict";

module.exports = {"up": (queryInterface, Sequelize) => queryInterface.addColumn("turnos", "status", {"type": Sequelize.STRING,
    "defaultValue": "pending"}).
    then(() => queryInterface.addColumn("turnos", "startTime", Sequelize.DATE)),

"down": (queryInterface) => queryInterface.removeColumn("turnos", "status").
    then(() => queryInterface.removeColumn("turnos", "startTime"))};

