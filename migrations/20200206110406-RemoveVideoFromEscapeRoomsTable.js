const { QueryTypes } = require("sequelize");

module.exports = {

    "up": async (queryInterface) => {
        const ers = await queryInterface.sequelize.query("SELECT id, \"classInstructions\", video FROM \"escapeRooms\" AS \"escapeRoom\" ", { "type": QueryTypes.SELECT });

        const promises = [];

        for (const ert of ers || []) {
            const er = JSON.parse(JSON.stringify(ert));

            if (er.video) {
                let classInstructions = er.classInstructions ? er.classInstructions : "";

                classInstructions += `<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="${er.video}" style="" width="642" height="370"></iframe><br/><countdown><countdown/>`;
                const prom = queryInterface.sequelize.query(`UPDATE "escapeRooms" SET classInstructions =  '${classInstructions}' WHERE "id" = ${er.id}`, { "type": QueryTypes.UPDATE });

                promises.push(prom);
            }
        }
        await Promise.all(promises);
        await queryInterface.removeColumn("escapeRooms", "video");
    },

    "down" (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            "escapeRooms",
            "video",
            Sequelize.STRING
        );
    }
};
