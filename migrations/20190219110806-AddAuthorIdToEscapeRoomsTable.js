"use strict";

module.exports = {
    "up" (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            "escapeRooms",
            "authorId",
            {"type": Sequelize.INTEGER}
        );
    },

    "down" (queryInterface) {
        return queryInterface.removeColumn("escapeRooms", "authorId");
    }
};
