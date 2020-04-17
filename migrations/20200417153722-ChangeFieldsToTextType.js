module.exports = {
    "up": (queryInterface, Sequelize) => queryInterface.
        changeColumn("puzzles", "sol", {"type": Sequelize.TEXT}).then(() => queryInterface.
            changeColumn("puzzles", "desc", {"type": Sequelize.TEXT})).then(() => queryInterface.
            changeColumn("puzzles", "correct", {"type": Sequelize.TEXT})).then(() => queryInterface.
            changeColumn("puzzles", "fail", {"type": Sequelize.TEXT})).then(() => queryInterface.
            changeColumn("hints", "content", {"type": Sequelize.TEXT}))
};
