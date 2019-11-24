const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");

// GET /escapeRooms/:escapeRoomId/assets
exports.assets = (req, res) => {
    const {escapeRoom} = req;
    const {assets} = escapeRoom;

    res.render("escapeRooms/steps/assets", {escapeRoom, assets,
        "progress": "assets"});
};

// POST /escapeRooms/:escapeRoomId/assets
exports.assetsUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;
    console.log(prevStep("assets"), nextStep("assets"))
    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("assets") : progressBar || nextStep("assets")}`);
};

exports.uploadAssets = (req, res) => {
    const {escapeRoom, body, assets} = req;
    console.log(assets);
    res.send("ok")

}