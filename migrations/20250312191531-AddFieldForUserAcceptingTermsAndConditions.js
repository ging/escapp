'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  "up": (queryInterface, Sequelize) => queryInterface.addColumn("users", "lastAcceptedTermsDate", Sequelize.DATE),
  "down": (queryInterface) => queryInterface.removeColumn("users", "lastAcceptedTermsDate")
};