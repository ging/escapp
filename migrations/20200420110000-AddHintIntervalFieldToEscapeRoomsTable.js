module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "hintInterval", Sequelize.FLOAT),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "hintInterval")
};
