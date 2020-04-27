module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "forceLang", Sequelize.STRING),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "forceLang")
};
