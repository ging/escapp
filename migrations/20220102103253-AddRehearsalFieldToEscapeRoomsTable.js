module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "rehearsal", Sequelize.TEXT),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "rehearsal")
};
