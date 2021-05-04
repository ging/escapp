"use strict";

module.exports = {"up": (queryInterface) => queryInterface.removeConstraint("escapeRooms", "escapeRooms_invitation_key")};
