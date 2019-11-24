module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("puzzles", "fail", Sequelize.STRING),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("puzzles", "fail", Sequelize.STRING)

};

