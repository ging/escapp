const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const attHelper = require("../helpers/attachments");
const {nextStep, prevStep} = require("../helpers/progress");

// GET /escapeRooms/:escapeRoomId/assets
exports.assets = (req, res) => {
    const {escapeRoom} = req;
    const assets = escapeRoom.assets.map((a) => {
        const {id, public_id, url, mime, filename} = a;

        return {id, public_id, url, mime, "name": filename};
    });

    res.render("escapeRooms/steps/assets", {escapeRoom, assets, "progress": "assets"});
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
        const saved = await models.asset.build({ "escapeRoomId": escapeRoom.id, "public_id": uploadResult.public_id, "url": uploadResult.url, "filename": req.file.originalname, "mime": req.file.mimetype}).save();

        // Res.json({"id": saved.id, "url": uploadResult.url});
        const html = `<script type='text/javascript'>
            var funcNum = ${req.query.CKEditorFuncNum};
            var url     = "${uploadResult.url}";
            var message = "Uploaded file successfully";
        
            window.parent.CKEDITOR.tools.callFunction(funcNum, url, message);
        </script>`;

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
    const asset = req.escapeRoom.assets.find((a) => a.id.toString() === assetId.toString());
    const {i18n} = res.locals;

    try {
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

exports.browse = async (req, res) => {
    const assets = req.escapeRoom.assets.map((a) => {
        const {id, public_id, url, mime, filename} = a;

        return {id, public_id, url, mime, "name": filename};
    });

    res.render("escapeRooms/steps/assets", {"escapeRoom": req.escapeRoom, assets});
};

