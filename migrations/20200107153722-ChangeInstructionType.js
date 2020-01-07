module.exports = {
    up: function (queryInterface, Sequelize, migration) {
      return queryInterface
        .changeColumn('escapeRooms', 'teamInstructions', {
          type: Sequelize.TEXT
        }).then(() => queryInterface.changeColumn('escapeRooms', 'classInstructions', {
          type: Sequelize.TEXT
        }));
    }
}