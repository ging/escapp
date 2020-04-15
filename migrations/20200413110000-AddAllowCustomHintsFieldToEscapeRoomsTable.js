module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "allowCustomHints", Sequelize.BOOLEAN),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "allowCustomHints")
};
