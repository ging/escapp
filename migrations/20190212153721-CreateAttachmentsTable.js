"use strict";

module.exports = {
    "up" (queryInterface, Sequelize) {
        return queryInterface.createTable(
            "attachments",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false,
                    "primaryKey": true,
                    "autoIncrement": true,
                    "unique": true
                },
                "escapeRoomId": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false
                },
                "public_id": {
                    "type": Sequelize.STRING,
                    "allowNull": false
                },
                "url": {
                    "type": Sequelize.STRING,
                    "allowNull": false
                },
                "filename": {
                    "type": Sequelize.STRING,
                    "allowNull": false
                },
                "mime": {
                    "type": Sequelize.STRING,
                    "allowNull": false
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "allowNull": false
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "allowNull": false
                }
            },
            {"sync": {"force": true}}
        );
    },

    "down" (queryInterface) {
        return queryInterface.dropTable("attachments");
    }
};
