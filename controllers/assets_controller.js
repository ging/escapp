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

        return {id,
            public_id,
            url,
            mime,
            "name": filename};
    });

    res.render("escapeRooms/steps/assets", {escapeRoom,
        assets,
        "progress": "assets"});
};

// POST /escapeRooms/:escapeRoomId/assets
exports.assetsUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("assets") : progressBar || nextStep("assets")}`);
};

// POST /escapeRooms/:escapeRoomId/uploadAssets
exports.uploadAssets = (req, res) => {
    const {escapeRoom} = req;

    attHelper.checksCloudinaryEnv().
        // Save the new asset into Cloudinary:
        then(() => attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options_zip)).
        then((uploadResult) => models.asset.build({ // Remenber the public_id of the old asset.
            "escapeRoomId": escapeRoom.id,
            "public_id": uploadResult.public_id,
            "url": uploadResult.url,
            "filename": req.file.originalname,
            "mime": req.file.mimetype
        }).
            save().
            then((saved) => {
                res.json({"id": saved.id,
                    "url": uploadResult.url});
            }).
            catch(Sequelize.ValidationError, (error) => {
                res.status(500);
                res.send(req.app.locals.i18n.common.flash.errorFile);
                console.error(error);
                attHelper.deleteResource(uploadResult.public_id);
            })).
        catch((error) => {
            res.status(500);
            res.send(req.app.locals.i18n.common.flash.errorFile);
            console.error(error);
        });
};

exports.deleteAssets = (req, res) => {
    const {assetId} = req.params;
    const asset = req.escapeRoom.assets.find((a) => a.id.toString() === assetId.toString());

    if (asset) {
        attHelper.deleteResource(asset.public_id);
        asset.destroy().then(() => {
            res.json({"msg": "ok"});
        }).
            catch((err) => {
                res.status(500);
                console.log(err);
                res.json({"msg": "Error"});
            });
    } else {
        res.status(404);
        console.log("asdads");
        res.json({"msg": "Not found"});
    }
};
