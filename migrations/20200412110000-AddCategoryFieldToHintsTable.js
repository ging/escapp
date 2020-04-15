module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("hints", "category", Sequelize.STRING),
    "down": (queryInterface) => queryInterface.
        removeColumn("hints", "category")
};
