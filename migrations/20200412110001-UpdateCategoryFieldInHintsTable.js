const { QueryTypes } = require("sequelize");

module.exports = {"up": (queryInterface) => queryInterface.sequelize.query("UPDATE \"hints\" SET category =  'General'", { "type": QueryTypes.UPDATE })};

