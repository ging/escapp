module.exports = {
    "up": (queryInterface) => queryInterface.renameColumn("escapeRooms", "instructions", "teamInstructions"),
    "down": (queryInterface) => queryInterface.renameColumn("escapeRooms", "teamInstructions", "instructions")
};

