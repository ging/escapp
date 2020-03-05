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
        const promises = [];

        for (const ert of escapeRooms || []) {
            const er = JSON.parse(JSON.stringify(ert));
            const {automatic} = er;

            console.log(automatic)(er.puzzles || []).map(({id}) => promises.push(models.puzzle.update({automatic}, {"where": {id}})));
        }
        await Promise.all(promises);
        await queryInterface.removeColumn("escapeRooms", "automatic", Sequelize.BOOLEAN);
    },
    "down": (queryInterface, Sequelize) => queryInterface.addColumn("escapeRooms", "automatic", Sequelize.BOOLEAN, {"defaultValue": false})

};

