module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("puzzles", "order", Sequelize.INTEGER, {"allowNull": false}),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("puzzles", "order", Sequelize.INTEGER)

};

