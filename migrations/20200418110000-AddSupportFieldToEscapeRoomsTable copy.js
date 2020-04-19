module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "supportLink", Sequelize.TEXT),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "supportLink")
};
