module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        changeColumn("escapeRooms", "teamInstructions", {
            "type": Sequelize.TEXT
        }).then(() => queryInterface.changeColumn("escapeRooms", "classInstructions", {
            "type": Sequelize.TEXT
        }))
};
