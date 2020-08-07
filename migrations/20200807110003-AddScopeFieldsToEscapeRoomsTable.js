"use strict";

const {QueryTypes} = require("sequelize");

module.exports = {
    "up": async (queryInterface, Sequelize) => {
        const escapeRooms = await queryInterface.sequelize.query("SELECT id, nmax FROM \"escapeRooms\"", { "type": QueryTypes.SELECT });
        const promises = [];

        for (const er of escapeRooms) {
            const {id, nmax} = JSON.parse(JSON.stringify(er));
            const prom = queryInterface.sequelize.query(`UPDATE turnos SET "capacity" = ${nmax === null || nmax === undefined ? "NULL" : nmax} WHERE "escapeRoomId" = ${id}`, { "type": QueryTypes.UPDATE });

            promises.push(prom);
        }

        await Promise.all(promises);
        await queryInterface.addColumn("escapeRooms", "scope", Sequelize.BOOLEAN);
        await queryInterface.removeColumn("escapeRooms", "nmax");
    },
    "down": (queryInterface, Sequelize) => queryInterface.removeColumn("escapeRooms", "scope").then(() => queryInterface.addColumn("escapeRooms", "nmax", Sequelize.INTEGER))
};
