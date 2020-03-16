"use strict";

module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("members", [
        {
            "teamId": 1,
            "userId": 2,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 1,
            "userId": 3,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 2,
            "userId": 4,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 2,
            "userId": 5,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 3,
            "userId": 6,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 3,
            "userId": 7,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 4,
            "userId": 8,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "teamId": 4,
            "userId": 9,
            "createdAt": new Date(),
            "updatedAt": new Date()
        }

    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("members", null, {})
};
