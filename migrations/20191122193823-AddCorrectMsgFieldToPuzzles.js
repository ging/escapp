module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("puzzles", "correct", Sequelize.STRING),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("puzzles", "correct", Sequelize.STRING)

};

