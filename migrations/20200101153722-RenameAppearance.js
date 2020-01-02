module.exports = {
    "up": (queryInterface) => queryInterface.renameColumn("escapeRooms", "appearance", "teamAppearance"),
    "down": (queryInterface) => queryInterface.renameColumn("escapeRooms", "teamAppearance", "appearance")
};

