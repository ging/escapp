const { QueryTypes } = require("sequelize");

module.exports = {

    "up": async (queryInterface) => {
        const teams = await queryInterface.sequelize.query("SELECT \"teams\".\"id\" AS \"id\", \"teams\".\"startTime\" AS \"startTime\", \"teams\".\"id\" AS teamid, \"turnoId\", \"turnos\".\"startTime\" AS turnostart, \"turnos\".\"date\" AS turnodate FROM \"teams\"  INNER JOIN \"turnos\"  ON \"teams\".\"turnoId\" = \"turnos\".\"id\" WHERE status = 'finished' OR status = 'active'", { "type": QueryTypes.SELECT });
        const promises = [];

        for (const t of teams || []) {
            const team = JSON.parse(JSON.stringify(t));
            const startTime = team.startTime || team.turnostart || team.turnodate;
            const prom = queryInterface.sequelize.query(`UPDATE "teams" SET "startTime" =  '${startTime}' WHERE "id" = ${team.id}`, { "type": QueryTypes.UPDATE });

            promises.push(prom);
        }

        await Promise.all(promises);
    }
};

