const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const http = require("https");
const attHelper = require("../helpers/attachments");
const {nextStep, prevStep} = require("../helpers/progress");

// Autoload the hint with id equals to :hintId
exports.load = (req, res, next, hintId) => {
    models.hint.findByPk(hintId).
        then((hint) => {
            if (hint) {
                req.hint = hint;
                next();
            } else {
                next(new Error(404));
            }
        }).
        catch((error) => next(error));
};

// GET /escapeRooms/:escapeRoomId/hints/hintapp
exports.hintApp = (req, res) => {
    res.render("escapeRooms/hintApp/hintApp", {"layout": false, "escapeRoom": req.escapeRoom });
};

// GET /escapeRooms/:escapeRoomId/hints/hintappwrapper
exports.hintAppWrapper = (req, res) => {
    res.render("escapeRooms/hintApp/hintAppScormWrapper", {"layout": false, "escapeRoom": req.escapeRoom});
};

// GET /escapeRooms/:escapeRoomId/xml
exports.downloadMoodleXML = (req, res) => {
    try {
        if (req.escapeRoom.hintApp.url) {
            http.get(req.escapeRoom.hintApp.url, (resp) => {
                res.setHeader("content-disposition", "attachment; filename=\"quiz.xml\"");
                resp.pipe(res);
            });
        }
    } catch (e) {
        console.error(e);
        res.status(404).end();
    }
};


// GET /escapeRooms/:escapeRoomId/hints
exports.pistas = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/hints", { escapeRoom, "progress": "hints" });
};

// POST /escapeRooms/:escapeRoomId/hints
exports.pistasUpdate = async (req, res) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;
    const {numQuestions, numRight, feedback, hintLimit, allowCustomHints} = body;
    let pctgRight = numRight || 0;

    pctgRight = (numRight >= 0 && numRight <= numQuestions ? numRight : numQuestions) * 100 / (numQuestions || 1);
    // eslint-disable-next-line eqeqeq
    escapeRoom.hintLimit = !hintLimit && hintLimit != 0 || hintLimit === "" ? null : parseInt(hintLimit, 10);
    escapeRoom.numQuestions = numQuestions || 0;
    escapeRoom.numRight = pctgRight || 0;
    escapeRoom.feedback = Boolean(feedback);
    escapeRoom.allowCustomHints = Boolean(allowCustomHints);
    const back = `/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("hints") : progressBar || nextStep("hints")}`;

    try {
        await escapeRoom.save({"fields": ["numQuestions", "hintLimit", "numRight", "feedback", "allowCustomHints"]});
        if (body.keepAttachment === "0") {
            // There is no attachment: Delete old attachment.
            if (!req.file) {
                if (escapeRoom.hintApp) {
                    await attHelper.deleteResource(escapeRoom.hintApp.public_id, models.hintApp);
                    await escapeRoom.hintApp.destroy();
                }
            } else {
                try {
                    await attHelper.checksCloudinaryEnv();
                    const uploadResult = await attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options_zip);
                    const old_public_id = escapeRoom.hintApp ? escapeRoom.hintApp.public_id : null; // Update the attachment into the data base.

                    const att = await escapeRoom.getHintApp();
                    let hintApp = att;

                    if (!hintApp) {
                        hintApp = models.hintApp.build({"escapeRoomId": escapeRoom.id});
                    }
                    hintApp.public_id = uploadResult.public_id;
                    hintApp.url = uploadResult.url;
                    hintApp.filename = req.file.originalname;
                    hintApp.mime = req.file.mimetype;

                    try {
                        await hintApp.save();
                        if (old_public_id) {
                            await attHelper.deleteResource(old_public_id, models.hintApp);
                        }
                    } catch (error) {
                        req.flash("error", req.app.locals.i18n.common.flash.errorFile);
                        await attHelper.deleteResource(uploadResult.public_id, models.hintApp);
                    }
                } catch (e) {
                    console.error(e.message);
                    req.flash("error", req.app.locals.i18n.common.flash.errorFile);
                }
            }
        }
        res.redirect(back);
    } catch (error) {
        console.error(error);
        if (error instanceof Sequelize.ValidationError) {
            req.flash("error", req.app.locals.i18n.common.validationError);
            // Error.errors.forEach(({message}) => req.flash("error", message));
        } else {
            req.flash("error", req.app.locals.i18n.common.flash.errorEditingER);
        }
        res.render("escapeRooms/hints", {escapeRoom});
    }
};
