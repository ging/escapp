"use strict";

module.exports = {up (queryInterface) {
    return queryInterface.bulkInsert("escapeRooms", [
        {
            "title": "Escape Room IWEB 2018-React Redux",
            "subject": "IWEB",
            "duration": 120,
            "description": "Escape room educativa sobre React y Redux en la que los alumnos tendrán que encontrar los errores en el código que les damos.",
            "video": "https://www.youtube.com/watch?v=oOPEryIYkm4",
            "nmax": 20,
            "teamSize": 2,
            "invitation": "assfdtWeQv",
            "appearance": "litera",
            "automatic": false,
            "authorId": 1,
            "createdAt": new Date(),
            "updatedAt": new Date()
        }
    ]);
},

down (queryInterface) {
    return queryInterface.bulkDelete("escapeRooms", null, {});
}};
