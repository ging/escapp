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
        for (let puzzle of (puzzles || [])) {
            for (let order in (puzzle.hints || [])){
                let {id} = puzzle.hints[order];
                await models.hint.update({order}, {"where": {id}});
            }
        }
    }

};
