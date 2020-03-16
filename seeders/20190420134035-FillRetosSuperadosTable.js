"use strict";


const arrDates = [
    new Date(),
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

arrDates[3].setDate(arrDates[3].getDate() + 1);
arrDates[3].setHours(11);
arrDates[3].setMinutes(0);

module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("retosSuperados", [
        {
            "teamId": 1,
            "puzzleId": 1,
            "createdAt": new Date(arrDates[0].getTime() + 5 * 60000),
            "updatedAt": new Date()
        },
        {
            "teamId": 1,
            "puzzleId": 2,
            "createdAt": new Date(arrDates[0].getTime() + 25 * 60000),
            "updatedAt": new Date()
        },
        {
            "teamId": 1,
            "puzzleId": 3,
            "createdAt": new Date(arrDates[0].getTime() + 85 * 60000),
            "updatedAt": new Date()
        },
        {
            "teamId": 2,
            "puzzleId": 1,
            "createdAt": new Date(arrDates[1].getTime() + 15 * 60000),
            "updatedAt": new Date()
        },
        {
            "teamId": 2,
            "puzzleId": 2,
            "createdAt": new Date(arrDates[1].getTime() + 100 * 60000),
            "updatedAt": new Date()
        },
        {
            "teamId": 3,
            "puzzleId": 1,
            "createdAt": new Date(arrDates[2].getTime() + 45 * 60000),
            "updatedAt": new Date()
        }

    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("retosSuperados", null, {})
};
