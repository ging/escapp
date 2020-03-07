module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "forbiddenLateSubmissions", Sequelize.BOOLEAN),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "forbiddenLateSubmissions")
};
