const {models} = require("../models");

module.exports = {

    "up": async () => {
        const teams = await models.team.findAll({
            "include": [{ "model": models.turno, "attributes": ["startTime", "date"], "where": {"status": "finished"} }],
            "raw": true
        });
        const promises = [];

        for (const team of teams || []) {
            const startTime = team.startTime || team["turno.startTime"] || team["turno.date"];

            promises.push(models.team.update(
                {startTime},
                {"where": {"id": team.id}}
            ));
        }

        await Promise.all(promises);
    }
};

