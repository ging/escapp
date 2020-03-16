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
    "up": (queryInterface) => queryInterface.bulkInsert("requestedHints", [
        {
            "id": 1,
            "teamId": 1,
            "hintId": 1,
            "success": true,
            "score": 100,
            "createdAt": new Date(arrDates[0].getTime() + 2 * 60000),
            "updatedAt": new Date()
        },

        {
            "id": 2,
            "teamId": 1,
            "success": false,
            "score": 20,
            "createdAt": new Date(arrDates[0].getTime() + 3 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 3,
            "teamId": 1,
            "hintId": 2,
            "success": true,
            "score": 80,
            "createdAt": new Date(arrDates[0].getTime() + 4 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 4,
            "teamId": 1,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[0].getTime() + 11 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 5,
            "teamId": 1,
            "hintId": 3,
            "success": true,
            "score": 100,
            "createdAt": new Date(arrDates[0].getTime() + 18 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 6,
            "teamId": 1,
            "hintId": 3,
            "success": true,
            "score": 100,
            "createdAt": new Date(arrDates[0].getTime() + 60 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 7,
            "teamId": 2,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[1].getTime() + 10 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 8,
            "teamId": 2,
            "hintId": 3,
            "success": true,
            "score": 100,
            "createdAt": new Date(arrDates[1].getTime() + 30 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 9,
            "teamId": 2,
            "hintId": 4,
            "success": true,
            "score": 100,
            "createdAt": new Date(arrDates[1].getTime() + 80 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 10,
            "teamId": 3,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[2].getTime() + 10 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 11,
            "teamId": 3,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[2].getTime() + 20 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 12,
            "teamId": 3,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[2].getTime() + 30 * 60000),
            "updatedAt": new Date()
        },
        {
            "id": 13,
            "teamId": 3,
            "success": false,
            "score": 0,
            "createdAt": new Date(arrDates[2].getTime() + 40 * 60000),
            "updatedAt": new Date()
        }

    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("requestedHints", null, {})
};
