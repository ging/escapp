const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const attHelper = require("../helpers/attachments");
const {nextStep, prevStep} = require("../helpers/progress");
const {ckeditorResponse} = require("../helpers/utils");

// GET /escapeRooms/:escapeRoomId/assets
exports.assets = async (req, res, next) => {
    const {escapeRoom} = req;

    try {
        const assets = (await models.asset.findAll({"where": { "escapeRoomId": escapeRoom.id }})).map((a) => {
            const {id, public_id, url, mime, filename} = a;

            return {id, public_id, url, mime, "name": filename};
        });

        res.render("escapeRooms/steps/assets", {escapeRoom, assets, "progress": "assets"});
    } catch (e) {
        next(e);
    }
};

// POST /escapeRooms/:escapeRoomId/assets
exports.assetsUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("assets") : progressBar || nextStep("assets")}`);
};

// POST /escapeRooms/:escapeRoomId/uploadAssets
exports.uploadAssets = async (req, res) => {
    const {escapeRoom} = req;
    let uploadResult = null;
    const {i18n} = res.locals;

    try {
        await attHelper.checksCloudinaryEnv();
        // Save the new asset into Cloudinary:
        uploadResult = await attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options_zip);
    } catch (err) {
        res.status(500);
        res.send(err);
    }
    try {
        await models.asset.build({ "escapeRoomId": escapeRoom.id, "public_id": uploadResult.public_id, "url": uploadResult.url, "filename": req.file.originalname, "mime": req.file.mimetype}).save();

        // Res.json({"id": saved.id, "url": uploadResult.url});
        const html = ckeditorResponse(req.query.CKEditorFuncNum, uploadResult.url);

        res.send(html);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            res.status(500);
            res.send(i18n.common.flash.errorFile);
            console.error(error);
            attHelper.deleteResource(uploadResult.public_id, models.asset);
        } else {
            res.status(500);
            res.send(i18n.common.flash.errorFile);
            console.error(error);
        }
    }
};

// POST /escapeRooms/:escapeRoomId/deleteAssets/:assetId
exports.deleteAssets = async (req, res) => {
    const {assetId} = req.params;
    const {i18n} = res.locals;

    try {
        const assets = await models.asset.findAll({"where": { "escapeRoomId": req.escapeRoom.id }});
        const asset = assets.find((a) => a.id.toString() === assetId.toString());

        if (asset) {
            attHelper.deleteResource(asset.public_id, models.asset);
            await asset.destroy();
            res.json({"msg": i18n.api.ok});
        } else {
            res.status(404);
            res.json({"msg": i18n.api.notFound});
        }
    } catch (err) {
        res.status(500);
        res.json({"msg": i18n.api.error});
    }
};

exports.browse = async (req, res, next) => {
    try {
        const assets = (await models.asset.findAll({"where": { "escapeRoomId": req.escapeRoom.id }})).map((a) => {
            const {id, public_id, url, mime, filename} = a;

            return {id, public_id, url, mime, "name": filename};
        });

        res.render("escapeRooms/steps/assets", {"escapeRoom": req.escapeRoom, assets});
    } catch (err) {
        next(err);
    }
};

