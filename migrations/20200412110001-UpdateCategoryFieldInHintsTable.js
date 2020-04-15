const {models} = require("../models");

module.exports = {"up": () => models.hint.update({ "category": "General" }, {"where": {}})};
