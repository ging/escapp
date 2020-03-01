const {models} = require("../models");

module.exports = {

    "up": async (queryInterface, Sequelize) => {
        const ers = await models.escapeRoom.findAll({"attributes": [
            "id",
            "classInstructions",
            "video"
        ]});
        const promises = [];

        for (const ert of ers || []) {
            const er = JSON.parse(JSON.stringify(ert));

            if (er.video) {
                let classInstructions = er.classInstructions ? er.classInstructions : "";

                classInstructions += `<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="${er.video}" style="" width="642" height="370"></iframe><br/><countdown><countdown/>`;
                promises.push(models.escapeRoom.update({classInstructions}, {"where": {"id": er.id}}));
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
