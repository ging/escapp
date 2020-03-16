"use strict";

module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("teams", [
        {
            "turnoId": 1,
            "name": "Gryffindor",
            "startTime": new Date(),
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnoId": 2,
            "name": "Slytherin",
            "startTime": new Date(),
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnoId": 3,
            "name": "Hufflepuff",
            "startTime": new Date(),
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnoId": 1,
            "name": "Ravenclaw",
            "startTime": null,
            "createdAt": new Date(),
            "updatedAt": new Date()
        }

    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("teams", null, {})
};
