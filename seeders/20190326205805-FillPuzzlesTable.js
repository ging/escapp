"use strict";

module.exports = {
    "up": (queryInterface) => queryInterface.bulkInsert("puzzles", [
        {
            "escapeRoomId": 1,
            "id": 1,
            "title": "Reto 1",
            "sol": "1234",
            "score": 20,
            "order": 1,
            "desc": "El primer reto",
            "automatic": false,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "escapeRoomId": 1,
            "id": 2,
            "title": "Reto 2",
            "sol": "9101",
            "score": 20,
            "order": 2,
            "desc": "El segundo reto",
            "automatic": false,
            "createdAt": new Date(),
            "updatedAt": new Date()
        },
        {
            "escapeRoomId": 1,
            "id": 3,
            "title": "Reto 3",
            "sol": "5678",
            "score": 20,
            "order": 3,
            "automatic": false,
            "desc": "El tercer reto",
            "createdAt": new Date(),
            "updatedAt": new Date()
        }
    ]),

    "down": (queryInterface) => queryInterface.bulkDelete("puzzles", null, {})
};
