"use strict";

module.exports = {"up": (queryInterface) => queryInterface.bulkInsert("retosSuperados", [
    {
        "teamId": 1,
        "puzzleId": 1,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "teamId": 1,
        "puzzleId": 2,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "teamId": 1,
        "puzzleId": 3,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "teamId": 2,
        "puzzleId": 1,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "teamId": 2,
        "puzzleId": 2,
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "teamId": 3,
        "puzzleId": 1,
        "createdAt": new Date(),
        "updatedAt": new Date()
    }

]),

"down": (queryInterface) => queryInterface.bulkDelete("retosSuperados", null, {})};
