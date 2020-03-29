"use strict";

module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        changeColumn("retosSuperados", "puzzleId", {
            "type": Sequelize.INTEGER,
            "primaryKey": true,
            "unique": "compositeKey",
            "allowNull": false,
            "onDelete": "CASCADE",
            "references": {
                "model": "puzzles",
                "key": "id"
            }
        }, {"sync": {"force": true}}).then(() => queryInterface.
            changeColumn("retosSuperados", "teamId", {
                "type": Sequelize.INTEGER,
                "primaryKey": true,
                "unique": "compositeKey",
                "allowNull": false,
                "onDelete": "CASCADE",
                "references": {
                    "model": "teams",
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

