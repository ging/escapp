module.exports = {
    "up": (queryInterface) => queryInterface.renameColumn("turnos", "indications", "place"),
    "down": (queryInterface) => queryInterface.renameColumn("turnos", "indications", "place")
};

