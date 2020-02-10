module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("teams", "startTime", Sequelize.INTEGER),
    "down": (queryInterface) => queryInterface.removeColumn("teams", "startTime")
};
