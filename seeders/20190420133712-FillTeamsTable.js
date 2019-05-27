"use strict";

module.exports = {"up": (queryInterface) => queryInterface.bulkInsert("teams", [
    {
        "turnoId": 1,
        "name": "Gryffindor",
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "turnoId": 2,
        "name": "Slytherin",
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "turnoId": 3,
        "name": "Hufflepuff",
        "createdAt": new Date(),
        "updatedAt": new Date()
    },
    {
        "turnoId": 1,
        "name": "Ravenclaw",
        "createdAt": new Date(),
        "updatedAt": new Date()
    }

]),

"down": (queryInterface) => queryInterface.bulkDelete("teams", null, {})};
