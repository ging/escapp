"use strict";

module.exports = {
    up (queryInterface, Sequelize) {
        return queryInterface.createTable(
            "escapeRooms",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false,
                    "primaryKey": true,
                    "autoIncrement": true,
                    "unique": true
                },
                "title": {
                    "type": Sequelize.STRING,
                    "validate": {"notEmpty": {"msg": "El título no puede estar vacío."}}
                },
                "subject": {
                    "type": Sequelize.STRING,
                    "validate": {"notEmpty": {"msg": "El nombre de la asignatura no puede estar vacío."}}
                },
                "duration": {
                    "type": Sequelize.INTEGER,
                    "validate": {"notEmpty": {"msg": "La duración no puede estar vacía."}}
                },
                "description": {"type": Sequelize.STRING},
                "video": {"type": Sequelize.STRING},
                "nmax": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false
                },
                "teamSize": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false
                },
                "invitation": {
                    "type": Sequelize.STRING,
                    "allowNull": false,
                    "defaultValue" () {
                        return Math.random().toString(36).
                            substr(2);
                    },
                    "unique": true,
                    "validate": {"notEmpty": {"msg": "La URL de la invitación no puede estar vacía."}}
                },
                "appearance": {
                    "type": Sequelize.STRING,
                    "defaultValue": "litera"
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "validate": {"notEmpty": {"msg": "El número de participantes no puede estar vacío."}}
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "allowNull": false
                }
            },
            {"sync": {"force": true}}
        );
    },
    down (queryInterface) {
        return queryInterface.dropTable("escapeRooms");
    }
};
