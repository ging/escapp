module.exports = {"up" (queryInterface, Sequelize) {
    return queryInterface.createTable(
        "sockets",
        {"socketid": {"type": Sequelize.STRING,
            "allowNull": false,
            "primaryKey": true,
            "unique": true},
        "teamId": {"type": Sequelize.INTEGER},
        "userId": {"type": Sequelize.INTEGER,
            "allowNull": false},
        "createdAt": {"type": Sequelize.DATE,
            "allowNull": false},
        "updatedAt": {"type": Sequelize.DATE,
            "allowNull": false}},
        {"sync": {"force": true}}
    );
},

"down" (queryInterface) {
    return queryInterface.dropTable("sockets");
}};
