const {models} = require("../models");

module.exports = {

    "up": async (queryInterface, Sequelize) => {
        const escapeRooms = await models.escapeRoom.findAll({
            "attributes": [
                "id",
                "automatic"
            ],
            "include": [
                {
                    "model": models.puzzle,
                    "attributes": ["id"]
                }
            ]
        });

        for (const er of escapeRooms || []) {
            const {automatic} = er;

            (er.puzzles || []).map(async ({id}) => await models.puzzle.update({automatic}, {"where": {id}}));
        }
        await queryInterface.removeColumn("escapeRooms", "automatic", Sequelize.BOOLEAN);
    },
    "down": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "automatic", Sequelize.BOOLEAN, {"defaultValue": false})

};

