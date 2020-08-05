"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("turnos", "from", Sequelize.DATE).
        then(() => queryInterface.addColumn("turnos", "to", Sequelize.DATE).
            then(() => queryInterface.addColumn("turnos", "capacity", Sequelize.INTEGER).
                then(() => queryInterface.addColumn("turnos", "password", Sequelize.TEXT)))),

    "down": (queryInterface) => queryInterface.removeColumn("turnos", "from").
        then(() => queryInterface.removeColumn("turnos", "to").
            then(() => queryInterface.removeColumn("turnos", "capacity").
                then(() => queryInterface.removeColumn("turnos", "password"))))
};
