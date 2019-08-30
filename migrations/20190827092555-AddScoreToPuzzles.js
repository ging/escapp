module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("puzzles", "score", Sequelize.FLOAT, {"defaultValue": 0.0}),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("puzzles", "score", Sequelize.FLOAT)

};

