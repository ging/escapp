"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        changeColumn("members", "teamId", {
            "type": Sequelize.INTEGER,
            "primaryKey": true,
            "unique": "compositeKey",
            "allowNull": false,
            "onDelete": "CASCADE",
            "references": {
                "model": "teams",
                "key": "id"
            }
        }, {"sync": {"force": true}}).then(() => queryInterface.
            changeColumn("members", "userId", {
                "type": Sequelize.INTEGER,
                "primaryKey": true,
                "unique": "compositeKey",
                "allowNull": false,
                "onDelete": "CASCADE",
                "references": {
                    "model": "users",
                    "key": "id"
                }
            }), {"sync": {"force": true}}),

    "down": () => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    }
};

