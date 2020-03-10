module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.addColumn("teams", "startTime", Sequelize.DATE),
    "down": (queryInterface) => queryInterface.removeColumn("teams", "startTime")
};
