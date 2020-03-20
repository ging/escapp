module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        addColumn("escapeRooms", "automaticAttendance", Sequelize.STRING),
    "down": (queryInterface) => queryInterface.
        removeColumn("escapeRooms", "automaticAttendance")
};
