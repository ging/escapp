"use strict";

const crypt = require("../helpers/crypt");

module.exports = {
    up (queryInterface) {
        return queryInterface.bulkInsert("users", [
            {
                "name": "Sonsoles ¡",
                "surname": "López Pernas",
                "gender": "Femenino",
                "username": "admin@upm.es",
                "password": crypt.encryptPassword("1234", "aaaa"),
                "salt": "aaaa",
                "isAdmin": !process.env.TEST,
                "dni": "xxxxxxxxx",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Pepe",
                "surname": "Lopez Garcia",
                "gender": "Masculino",
                "username": "pepe@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "79881145Y",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Alfonso",
                "surname": "Jiménez Martínez",
                "gender": "Masculino",
                "username": "al.jm@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "67172247B",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Alejandro",
                "surname": "Pozo Huertas",
                "gender": "Masculino",
                "username": "aph@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "83477468A",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Nuria",
                "surname": "Martínez Arias",
                "gender": "Femenino",
                "username": "nma@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "12166084G",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Clara",
                "surname": "Rodríguez Vega",
                "gender": "Femenino",
                "username": "crv@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "01605680G",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Ana",
                "surname": "de la Mata Martínez",
                "gender": "Femenino",
                "username": "amm@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "82311181T",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "José",
                "surname": "González Martín",
                "gender": "Masculino",
                "username": "jgm@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "03637194C",
                "createdAt": new Date(),
                "updatedAt": new Date()
            },
            {
                "name": "Antonio",
                "surname": "Lorenzo Álvarez",
                "gender": "Masculino",
                "username": "ala@alumnos.upm.es",
                "password": crypt.encryptPassword("5678", "bbbb"),
                "salt": "bbbb",
                "isStudent": true,
                "dni": "26077434B",
                "createdAt": new Date(),
                "updatedAt": new Date()
            }
        ]);
    },

    down (queryInterface) {
        return queryInterface.bulkDelete("users", null, {});
    }
};
