const {models} = require("../models");

module.exports = {

    "up": async (queryInterface, Sequelize) => {
        const ers = await models.escapeRoom.findAll();
        const promises = [];

        for (const er of ers || []) {
            if (er.video) {
                er.teamInstruction += "<iframe class=\"ql-video\" frameborder=\"0\" allowfullscreen=\"true\" src=\"https://www.youtube.com/embed/oOPEryIYkm4\" style=\"\" width=\"642\" height=\"370\"></iframe>";
                er.classInstructions += "<iframe class=\"ql-video\" frameborder=\"0\" allowfullscreen=\"true\" src=\"https://www.youtube.com/embed/oOPEryIYkm4\" style=\"\" width=\"642\" height=\"370\"></iframe>";
            }
            promises.push(er.save());
        }

        await Promise.all(promises);
        await queryInterface.removeColumn("escapeRooms", "video");
    },

    "down" (queryInterface, Sequelize) {
        // Logic for reverting the changes

        return queryInterface.addColumn(
            "escapeRooms",
            "video",
            Sequelize.STRING
        );
    }
};
