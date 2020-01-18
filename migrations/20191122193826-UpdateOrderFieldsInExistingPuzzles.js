const {models} = require("../models");

module.exports = {

    "up": async () => {
        const escapeRooms = await models.escapeRoom.findAll({
            "attributes": ["id"],
            "include": [
                {
                    "model": models.puzzle,
                    "attributes": ["id"]
                }
            ]
        });
        const promises = [];

        for (const er of escapeRooms) {
            (er.puzzles || []).map(({id}, order) => promises.push(models.puzzle.update({order}, {"where": {id}})));
        }
        await Promise.all(promises);
    }

};

