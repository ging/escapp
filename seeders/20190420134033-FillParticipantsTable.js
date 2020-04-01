"use strict";

module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("participants", [
        {
            "turnId": 1,
            "userId": 2,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 1,
            "userId": 3,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 2,
            "userId": 4,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 2,
            "userId": 5,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 3,
            "userId": 6,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 3,
            "userId": 7,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 1,
            "userId": 8,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnId": 1,
            "userId": 9,
            "attendance": true,
            "createdAt": new Date(),
            "updatedAt": new Date()
        }

    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("members", null, {})
};
