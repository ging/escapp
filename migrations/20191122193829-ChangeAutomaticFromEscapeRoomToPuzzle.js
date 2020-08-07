const { QueryTypes } = require("sequelize");

module.exports = {

    "up": async (queryInterface, Sequelize) => {
        const escapeRooms = await queryInterface.sequelize.query("SELECT id, automatic FROM \"escapeRooms\" AS \"escapeRoom\" ", { "type": QueryTypes.SELECT });
        const promises = [];

        for (const ert of escapeRooms || []) {
            const er = JSON.parse(JSON.stringify(ert));
            const {automatic, id} = er;
            const prom = queryInterface.sequelize.query(`UPDATE "puzzles" SET automatic =  ${automatic ? "TRUE" : "FALSE"} WHERE "escapeRoomId" = ${id}`, { "type": QueryTypes.UPDATE });

            promises.push(prom);
        }
        await Promise.all(promises);
        await queryInterface.removeColumn("escapeRooms", "automatic", Sequelize.BOOLEAN);
    },
    "down": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "automatic", Sequelize.BOOLEAN, {"defaultValue": false})

};

