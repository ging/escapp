"use strict";

const arrDates = [
    new Date(),
    new Date(),
    new Date()
];

arrDates[0].setHours(10);
arrDates[0].setMinutes(0);

arrDates[1].setHours(12);
arrDates[1].setMinutes(0);

arrDates[2].setDate(arrDates[2].getDate() + 1);
arrDates[2].setHours(9);
arrDates[2].setMinutes(0);


module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("teams", [
        {
            "turnoId": 1,
            "name": "Gryffindor",
            "startTime": arrDates[0],
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnoId": 2,
            "name": "Slytherin",
            "startTime": arrDates[1],
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "turnoId": 3,
            "name": "Hufflepuff",
            "startTime": arrDates[2],
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
