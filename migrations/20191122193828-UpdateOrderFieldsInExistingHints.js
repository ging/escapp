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
        const promises = [];

        for (const puzzle of puzzles || []) {
            for (const order in puzzle.hints || []) {
                const {id} = puzzle.hints[order];

                promises.push(models.hint.update({order}, {"where": {id}}));
            }
        }
        await Promise.all(promises);
    }

};
