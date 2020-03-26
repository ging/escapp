"use strict";

const {models} = require("../models");

const crypt = require("../helpers/crypt");// Definition of the User model:

module.exports = {
    "up": async (queryInterface, Sequelize) => {
        await queryInterface.addColumn("users", "token", {
            "type": Sequelize.STRING,
            "allowNull": false,
            "defaultValue": crypt.generateToken()
        });
        const users = await models.user.findAll({"attributes": ["id", "token"]});
        const promises = [];

        for (const u of users) {
            u.token = crypt.generateToken();
            promises.push(u.save({"fields": ["token"]}));
        }
        await Promise.all(promises);
    },
    "down": (queryInterface) => queryInterface.removeColumn("users", "token")
};

