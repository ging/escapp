const {models} = require("../models");

module.exports = {

    "up": async () => {
        const puzzles = await models.puzzle.findAll({
            "attributes": ["id"],
            "include": [
                {
                    "model": models.hint,
                    "attributes": ["id"]
                }
            ]
        });

        for (const puzzle of puzzles) {
            puzzle.hints.map(async ({id}, order) => await models.hint.update({order}, {"where": {id}}));
        }
    }

};

