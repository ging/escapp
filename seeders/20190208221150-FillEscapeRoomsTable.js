"use strict";

module.exports = {
    up (queryInterface) {
        return queryInterface.bulkInsert("escapeRooms", [
            {
                "title": "My first escape room",
                "subject": "Programming",
                "duration": 120,
                "description": "Educational escape room",
                "teamSize": 2,
                "invitation": "assfdtWeQv",
                "teamInstructions": '[{"type":"text","puzzles":["0","all"],"payload":{"text":"You can add a custom message, images, links... Do not forget to setup when you want to display this information by clicking in the eye icon on the left.</p>\n"}}]',
                "authorId": 1,
                "scoreParticipation": 40,
                "createdAt": new Date(),
                "updatedAt": new Date()
            }
        ]);
    },

    down (queryInterface) {
        return queryInterface.bulkDelete("escapeRooms", null, {});
    }
};
