#!/usr/bin/env node
const dotenv = require("dotenv");

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error("Please define DATABASE_URL in .env file");
} else {
    const {exec} = require("child_process");

    exec(`./node_modules/.bin/sequelize db:migrate --url ${process.env.DATABASE_URL}`, function (err, stdout, stderr) {
	    // Node.js will invoke this callback when process terminates.
	    console.log(stdout);
    });
}


