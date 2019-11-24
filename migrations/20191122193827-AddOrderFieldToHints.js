module.exports = {

    "up": (queryInterface, Sequelize) => queryInterface.addColumn("hints", "order", Sequelize.INTEGER, {"allowNull": false}),
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("hints", "order", Sequelize.INTEGER)

};

