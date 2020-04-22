"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        changeColumn("participants", "turnId", {
            "type": Sequelize.INTEGER,
            "primaryKey": true,
            "unique": "compositeKey",
            "allowNull": false,
            "onDelete": "CASCADE",
            "references": {
                "model": "turnos",
                "key": "id",
                "as": "turnId"
            }
        }, {"sync": {"force": true}}).then(() => queryInterface.
            changeColumn("participants", "userId", {
                "type": Sequelize.INTEGER,
                "primaryKey": true,
                "unique": "compositeKey",
                "allowNull": false,
                "onDelete": "CASCADE",
                "references": {
                    "model": "users",
                    "key": "id",
                    "as": "userId"
                }
            }, {"sync": {"force": true}})),

    "down": () => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    }
};

