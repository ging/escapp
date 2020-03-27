module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "indicationsInstructions", Sequelize.TEXT),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "indicationsInstructions")
};
