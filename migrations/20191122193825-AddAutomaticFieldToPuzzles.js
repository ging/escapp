module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("puzzles", "automatic", Sequelize.BOOLEAN, {"defaultValue": false}),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("puzzles", "automatic", Sequelize.BOOLEAN)

};

