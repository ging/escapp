const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const cloudinary = require("cloudinary");
const query = require("../queries");
const attHelper = require("../helpers/attachments");
const {nextStep, prevStep} = require("../helpers/progress");
const {saveInterface} = require("../helpers/utils");

// Autoload the escape room with id equals to :escapeRoomId
exports.load = async (req, res, next, escapeRoomId) => {
    try {
        const escapeRoom = await models.escapeRoom.findByPk(escapeRoomId, query.escapeRoom.load);

        if (escapeRoom) {
            req.escapeRoom = escapeRoom;
            next();
        } else {
            next(new Error(req.app.locals.api.notFound));
        }
    } catch (error) {
        res.status(500);
        next(error);
    }
};

// MW that allows actions only if the user logged in is admin or is the author of the escape room.
exports.adminOrAuthorRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        res.status(403);
        next(new Error(req.app.locals.api.forbidden));
    }
};

// MW that allows actions only if the user logged in is admin, the author, or a participant of the escape room.
exports.adminOrAuthorOrParticipantRequired = async (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    try {
        if (isAdmin || isAuthor) {
            next();
            return;
        }
        const participants = await models.user.findAll(query.user.escapeRoomsForUser(req.escapeRoom.id, req.session.user.id));
        const isParticipant = participants && participants.length > 0;

        req.isParticipant = isParticipant ? participants[0] : null;
        if (isParticipant) {
            next();
        } else {
            res.status(403);
            next(new Error(req.app.locals.api.forbidden));
        }
    } catch (error) {
        next(error);
    }
};

// GET /escapeRooms
exports.index = async (req, res, next) => {
    const user = req.user || req.session.user;

    try {
        if (user && !user.isStudent) {
            const escapeRooms = await models.escapeRoom.findAll({
                "attributes": ["id", "title", "invitation"],
                "include": [
                    models.attachment,
                    {
                        "model": models.user,
                        "as": "author",
                        "where": {"id": user.id}
                    }
                ]
            });

            res.render("escapeRooms/index.ejs", {escapeRooms, cloudinary, user});
        } else {
            const erAll = await models.escapeRoom.findAll(query.escapeRoom.all());
            const erFiltered = await models.escapeRoom.findAll(query.escapeRoom.all(user.id));
            const ids = erFiltered.map((e) => e.id);
            const escapeRooms = erAll.map((er) => ({
                "id": er.id,
                "title": er.title,
                "invitation": er.invitation,
                "attachment": er.attachment,
                "isSignedUp": ids.indexOf(er.id) !== -1
            }));

            res.render("escapeRooms/index.ejs", {escapeRooms, cloudinary, user});
        }
    } catch (error) {
        next(error);
    }
};

// GET /escapeRooms
exports.indexBreakDown = (req, res) => res.redirect("/");

// GET /escapeRooms/:escapeRoomId
exports.show = (req, res) => {
    const {escapeRoom} = req;
    const participant = req.isParticipant;
    const hostName = process.env.APP_NAME ? `http://${process.env.APP_NAME}` : "http://localhost:3000";

    if (participant) {
        res.render("escapeRooms/showStudent", {escapeRoom, cloudinary, participant});
    } else {
        res.render("escapeRooms/show", {escapeRoom, cloudinary, hostName, "email": req.session.user.username});
    }
};

// GET /escapeRooms/new
exports.new = (req, res) => {
    const escapeRoom = {"title": "", "teacher": "", "subject": "", "duration": "", "description": "", "nmax": "", "teamSize": ""};

    res.render("escapeRooms/new", {escapeRoom, "progress": "edit"});
};

// POST /escapeRooms/create
exports.create = (req, res, next) => {
    const {title, subject, duration, forbiddenLateSubmissions, description, nmax, teamSize} = req.body,

        authorId = req.session.user && req.session.user.id || 0,

        escapeRoom = models.escapeRoom.build({title, subject, duration, forbiddenLateSubmissions, description, nmax, teamSize, authorId}); // Saves only the fields question and answer into the DDBB

    escapeRoom.save({"fields": ["title", "teacher", "subject", "duration", "description", "forbiddenLateSubmissions", "nmax", "teamSize", "authorId", "invitation"]}).
        then((er) => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingER);
            if (!req.file) {
                res.redirect(`/escapeRooms/${escapeRoom.id}/turnos`);

                return;
            }
            // Save the attachment into  Cloudinary

            return attHelper.checksCloudinaryEnv().
                then(() => attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options)).
                then((uploadResult) => models.attachment.create({"public_id": uploadResult.public_id,
                    "url": uploadResult.url,
                    "filename": req.file.originalname,
                    "mime": req.file.mimetype,
                    "escapeRoomId": er.id}).
                    catch((error) => { // Ignoring validation errors
                        console.error(error);
                        req.flash("error", `${req.app.locals.i18n.common.flash.errorImage}: ${error.message}`);
                        attHelper.deleteResource(uploadResult.public_id);
                    })).
                catch((error) => {
                    console.error(error);

                    req.flash("error", `${req.app.locals.i18n.common.flash.errorFile}: ${error.message}`);
                }).
                then(() => {
                    res.redirect(`/escapeRooms/${er.id}/${nextStep("edit")}`);
                });
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("escapeRooms/new", {escapeRoom});
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingER}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/edit
exports.edit = (req, res) => {
    res.render("escapeRooms/edit", {"escapeRoom": req.escapeRoom,
        "progress": "edit"});
};

// PUT /escapeRooms/:escapeRoomId
exports.update = (req, res, next) => {
    const {escapeRoom, body} = req;

    escapeRoom.title = body.title;
    escapeRoom.subject = body.subject;
    escapeRoom.duration = body.duration;
    escapeRoom.forbiddenLateSubmissions = body.forbiddenLateSubmissions === "on";
    escapeRoom.description = body.description;
    escapeRoom.nmax = body.nmax;
    escapeRoom.teamSize = body.teamSize;
    const progressBar = body.progress;

    escapeRoom.save({"fields": ["title", "subject", "duration", "forbiddenLateSubmissions", "description", "nmax", "teamSize"]}).
        then((er) => {
            if (body.keepAttachment === "0") {
                // There is no attachment: Delete old attachment.
                if (!req.file) {
                    if (er.attachment) {
                        attHelper.deleteResource(er.attachment.public_id);
                        er.attachment.destroy();
                    }

                    return;
                }

                // Save the new attachment into Cloudinary:
                return attHelper.checksCloudinaryEnv().
                    then(() => attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options)).
                    then((uploadResult) => {
                        // Remenber the public_id of the old image.
                        const old_public_id = er.attachment ? er.attachment.public_id : null;
                        // Update the attachment into the data base.

                        return er.getAttachment().
                            then((att) => {
                                let attachment = att;

                                if (!attachment) {
                                    attachment = models.attachment.build({"escapeRoomId": er.id});
                                }
                                attachment.public_id = uploadResult.public_id;
                                attachment.url = uploadResult.url;
                                attachment.filename = req.file.originalname;
                                attachment.mime = req.file.mimetype;

                                return attachment.save();
                            }).
                            then(() => {
                                if (old_public_id) {
                                    attHelper.deleteResource(old_public_id);
                                }
                            }).
                            catch((error) => { // Ignoring image validation errors
                                req.flash("error", `${req.app.locals.i18n.common.flash.errorFile}: ${error.message}`);
                                attHelper.deleteResource(uploadResult.public_id);
                            }).
                            then(() => {
                                res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || nextStep("edit")}`);
                            });
                    }).
                    catch((error) => {
                        req.flash("error", `${req.app.locals.i18n.common.flash.errorFile}: ${error.message}`);
                    });
            }
        }).
        then(() => {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || nextStep("edit")}`);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("escapeRooms/edit", {escapeRoom});
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/evaluation
exports.evaluation = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/evaluation", {escapeRoom,
        "progress": "evaluation"});
};

// POST /escapeRooms/:escapeRoomId/evaluation
exports.evaluationUpdate = async (req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    escapeRoom.survey = body.survey;
    escapeRoom.pretest = body.pretest;
    escapeRoom.posttest = body.posttest;
    escapeRoom.scoreParticipation = body.scoreParticipation;
    escapeRoom.hintSuccess = body.hintSuccess;
    escapeRoom.hintFailed = body.hintFailed;
    try {
        await escapeRoom.save({"fields": ["survey", "pretest", "posttest", "scoreParticipation", "hintSuccess", "hintFailed"]});
        if (!body.scores || body.scores.length !== escapeRoom.puzzles.length) {
            return;
        }
        const promises = [];

        for (const p in body.scores) {
            if (parseFloat(escapeRoom.puzzles[p].score || 0) !== parseFloat(body.scores[p] || 0)) {
                escapeRoom.puzzles[p].score = body.scores[p];
                promises.push(new Promise((resolve) => {
                    escapeRoom.puzzles[p].save({"fields": ["score"]}).then(resolve);
                }));
            }
        }
        await Promise.all(promises);
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("evaluation") : progressBar || nextStep("evaluation")}`);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/evaluation`);
        } else {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/team
exports.teamInterface = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/instructions", {escapeRoom, "progress": "team", "endPoint": "team"});
};

// GET /escapeRooms/:escapeRoomId/class
exports.classInterface = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/instructions", {escapeRoom, "progress": "class", "endPoint": "class"});
};

// GET /escapeRooms/:escapeRoomId/team
exports.teamInterfaceUpdate = (req, res, next) => saveInterface("team", req, res, next);

// GET /escapeRooms/:escapeRoomId/class
exports.classInterfaceUpdate = (req, res, next) => saveInterface("class", req, res, next);

// DELETE /escapeRooms/:escapeRoomId
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        await req.escapeRoom.destroy({}, {transaction});
        if (req.escapeRoom.attachment) { // Delete the attachment at Cloudinary (result is ignored)
            await attHelper.checksCloudinaryEnv();
            await attHelper.deleteResource(req.escapeRoom.attachment.public_id);
        }

        let teamIds = [];
        const turnos = req.escapeRoom.turnos.map((turno) => {
            teamIds = [...teamIds, ...turno.teams.map((team) => team.id)];
            return turno.id;
        });

        await models.participants.destroy({"where": {"turnId": {[Sequelize.Op.in]: turnos}}}, {transaction});
        await models.retosSuperados.destroy({"where": {"teamId": {[Sequelize.Op.in]: teamIds}}}, {transaction});
        await models.members.destroy({"where": {"teamId": {[Sequelize.Op.in]: teamIds}}}, {transaction});
        await models.requestedHint.destroy({"where": {"teamId": {[Sequelize.Op.in]: teamIds}}}, {transaction});
        await transaction.commit();
        req.flash("success", req.app.locals.i18n.common.flash.successDeletingER);
        res.redirect("/escapeRooms");
    } catch (error) {
        await transaction.rollback();
        req.flash("error", `${req.app.locals.i18n.common.flash.errorDeletingER}: ${error.message}`);
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/join
exports.studentToken = async (req, res) => {
    const {escapeRoom} = req;

    const participant = await models.participants.findOne({"where": {
        "userId": req.session.user.id,
        "turnId": {[Sequelize.Op.or]: [escapeRoom.turnos.map((t) => t.id)]}
    }});

    if (participant) {
        res.redirect(`/escapeRooms/${escapeRoom.id}`);
    } else if (escapeRoom.invitation === req.query.token) {
        res.render("escapeRooms/indexInvitation", {escapeRoom, cloudinary});
    } else {
        res.redirect("/");
    }
};
