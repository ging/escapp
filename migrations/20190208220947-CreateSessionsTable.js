"use strict";

module.exports = {up (queryInterface, Sequelize) {
    return queryInterface.createTable(
        "sessions",
        {"sid": {"type": Sequelize.STRING,
            "allowNull": false,
            "primaryKey": true,
            "unique": true},
        "expires": {"type": Sequelize.DATE},
        "data": {"type": Sequelize.STRING(50000)},
        "createdAt": {"type": Sequelize.DATE,
            "allowNull": false},
        "updatedAt": {"type": Sequelize.DATE,
            "allowNull": false}},
        {"sync": {"force": true}}
    );
},

down (queryInterface,) {
    return queryInterface.dropTable("sessions");
}};
