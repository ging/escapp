
"use strict";

module.exports = {"up": (queryInterface, Sequelize) => queryInterface.removeConstraint("escapeRooms", "escapeRooms_invitation_key")};
