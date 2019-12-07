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

        for (const puzzle of puzzles || []) {
            for (const order in puzzle.hints || []) {
                const {id} = puzzle.hints[order];

                await models.hint.update({order}, {"where": {id}});
            }
        }
    }

};
