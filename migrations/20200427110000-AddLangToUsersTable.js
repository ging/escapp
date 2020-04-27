module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("users", "lang", Sequelize.STRING),
    "down": (queryInterface) => queryInterface.
        removeColumn("users", "lang")
};
