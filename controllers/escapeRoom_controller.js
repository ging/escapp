
const Sequelize = require("sequelize");
const {models} = require("../models");
const cloudinary = require("cloudinary");
const {parseURL} = require("../helpers/video");
const query = require("../queries");
const attHelper = require("../helpers/attachments");
// Options for the files uploaded to Cloudinary


// Autoload the escape room with id equals to :escapeRoomId
exports.load = (req, res, next, escapeRoomId) => {
    models.escapeRoom.findByPk(escapeRoomId, query.escapeRoom.load).
        then((escapeRoom) => {
            if (escapeRoom) {
                req.escapeRoom = escapeRoom;
                next();
            } else {
                res.status(404);
                throw new Error(404);
            }
        }).
        catch((error) => next(error));
};


// MW that allows actions only if the user logged in is admin or is the author of the escape room.
exports.adminOrAuthorRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        res.status(403);
        next(new Error(403));
    }
};

// MW that allows actions only if the user logged in is admin, the author, or a participant of the escape room.
exports.adminOrAuthorOrParticipantRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
        return;
    }
    models.user.findAll(query.user.escapeRoomsForUser(req.escapeRoom.id, req.session.user.id)).then((participants) => {
        const isParticipant = participants && participants.length > 0;

        req.isParticipant = isParticipant ? participants[0] : null;
        if (isParticipant) {
            next();
        } else {
            throw new Error(403);
        }
    }).
        catch((e) => next(e));
};

// GET /escapeRooms
exports.index = (req, res, next) => {
    const user = req.user || req.session.user;

    if (user && !user.isStudent) {
        models.escapeRoom.findAll({"attributes": [
            "id",
            "title",
            "invitation"
        ],
        "include": [
            models.attachment,
            {"model": models.user,
                "as": "author",
                "where": {"id": user.id}}
        ]}).then((escapeRooms) => res.render("escapeRooms/index.ejs", {escapeRooms,
            cloudinary,
            user})).
            catch((error) => next(error));
    } else {
        models.escapeRoom.findAll(query.escapeRoom.all()).
            then((erAll) => {
                models.escapeRoom.findAll(query.escapeRoom.all(user.id)).
                    then((erFiltered) => {
                        const ids = erFiltered.map((e) => e.id);
                        const escapeRooms = erAll.map((er) => ({
                            "id": er.id,
                            "title": er.title,
                            "invitation": er.invitation,
                            "attachment": er.attachment,
                            "isSignedUp": ids.indexOf(er.id) !== -1
                        }));

                        res.render("escapeRooms/index.ejs", {escapeRooms,
                            cloudinary,
                            user});
                    });
            }).
            catch((error) => next(error));
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
        res.render("escapeRooms/showStudent", {escapeRoom,
            cloudinary,
            participant,
            parseURL});
    } else {
        res.render("escapeRooms/show", {escapeRoom,
            cloudinary,
            hostName,
            "email": req.session.user.username,
            parseURL});
    }
};

// /escapeRooms/:escapeRoomId/preview
exports.preview = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/preview", {escapeRoom,
        "layout": false,
        cloudinary,
        parseURL,
        "appearance": req.query.appearance});
};

// GET /escapeRooms/new
exports.new = (req, res) => {
    const escapeRoom = {"title": "",
        "teacher": "",
        "subject": "",
        "duration": "",
        "description": "",
        "video": "",
        "nmax": "",
        "teamSize": ""};

    res.render("escapeRooms/new", {escapeRoom});
};

// POST /escapeRooms/create
exports.create = (req, res, next) => {
    const {title, subject, duration, description, video, nmax, teamSize} = req.body,

        authorId = req.session.user && req.session.user.id || 0,

        escapeRoom = models.escapeRoom.build({title,
            subject,
            duration,
            description,
            video,
            nmax,
            teamSize,
            authorId}); // Saves only the fields question and answer into the DDBB

    escapeRoom.save({"fields": [
        "title",
        "teacher",
        "subject",
        "duration",
        "description",
        "video",
        "nmax",
        "teamSize",
        "authorId",
        "invitation"
    ]}).
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
                    res.redirect(`/escapeRooms/${er.id}/turnos`);
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
exports.edit = (req, res) => res.render("escapeRooms/edit", {"escapeRoom": req.escapeRoom});

// PUT /escapeRooms/:escapeRoomId
exports.update = (req, res, next) => {
    const {escapeRoom, body} = req;

    escapeRoom.title = body.title;
    escapeRoom.subject = body.subject;
    escapeRoom.duration = body.duration;
    escapeRoom.description = body.description;
    escapeRoom.video = body.video;
    escapeRoom.nmax = body.nmax;
    escapeRoom.teamSize = body.teamSize;
    const progressBar = body.progress;

    escapeRoom.save({"fields": [
        "title",
        "subject",
        "duration",
        "description",
        "video",
        "nmax",
        "teamSize"
    ]}).
        then((er) => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingER);
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
                        const old_public_id = er.attachment ? er.attachment.public_id : null; // Update the attachment into the data base.

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
                                res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || "turnos"}`);
                            });
                    }).
                    catch((error) => {
                        req.flash("error", `${req.app.locals.i18n.common.flash.errorFile}: ${error.message}`);
                    });
            }
        }).
        then(() => {
            res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || "turnos"}`);
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

// GET /escapeRooms/:escapeRoomId/appearance
exports.temas = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/appearance", {escapeRoom});
};

// POST /escapeRooms/:escapeRoomId/appearance
exports.temasUpdate = (req, res, next) => {
    const {escapeRoom, body} = req;

    escapeRoom.appearance = body.appearance;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    escapeRoom.save({"fields": ["appearance"]}).then(() => {
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? "instructions" : progressBar || "evaluation"}`);
    }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/appearance`);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/turnos
exports.turnos = (req, res) => {
    const {escapeRoom} = req;
    const {turnos} = escapeRoom;

    res.render("escapeRooms/steps/turnos", {escapeRoom,
        turnos});
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? "edit" : progressBar || "puzzles"}`);
};

// GET /escapeRooms/:escapeRoomId/puzzles
exports.retos = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/puzzles", {escapeRoom});
};

// POST /escapeRooms/:escapeRoomId/puzzles
exports.retosUpdate = (req, res, next) => {
    const {escapeRoom, body} = req;
    const {automatic} = body;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    escapeRoom.automatic = automatic === "1";
    escapeRoom.save({"fields": ["automatic"]}).then(() => {
        res.redirect(`/escapeRooms/${req.escapeRoom.id}/${isPrevious ? "turnos" : progressBar || "hints"}`);
    }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${req.escapeRoom.id}/puzzles`);
        }).
        catch((error) => {
            req.flash("error", `${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/hints
exports.pistas = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/hints", {escapeRoom});
};

// POST /escapeRooms/:escapeRoomId/hints
exports.pistasUpdate = (req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;
    const {numQuestions, numRight, feedback} = body;
    let pctgRight = numRight || 0;

    pctgRight = (numRight >= 0 && numRight <= numQuestions ? numRight : numQuestions) * 100 / (numQuestions || 1);
    escapeRoom.numQuestions = numQuestions || 0;
    escapeRoom.numRight = pctgRight || 0;
    escapeRoom.feedback = Boolean(feedback);

    const back = `/escapeRooms/${escapeRoom.id}/${isPrevious ? "puzzles" : progressBar || "instructions"}`;

    escapeRoom.save({"fields": [
        "numQuestions",
        "numRight",
        "feedback"
    ]}).
        then(() => {
            if (body.keepAttachment === "0") {
                // There is no attachment: Delete old attachment.
                if (!req.file) {
                    if (escapeRoom.hintApp) {
                        attHelper.deleteResource(escapeRoom.hintApp.public_id);
                        escapeRoom.hintApp.destroy();
                    }
                    return;
                }

                return attHelper.checksCloudinaryEnv().
                    // Save the new attachment into Cloudinary:
                    then(() => attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options_zip)).
                    then((uploadResult) => {
                        // Remenber the public_id of the old image.
                        const old_public_id = escapeRoom.hintApp ? escapeRoom.hintApp.public_id : null; // Update the attachment into the data base.

                        return escapeRoom.getHintApp().
                            then((att) => {
                                let hintApp = att;

                                if (!hintApp) {
                                    hintApp = models.hintApp.build({"escapeRoomId": escapeRoom.id});
                                }
                                hintApp.public_id = uploadResult.public_id;
                                hintApp.url = uploadResult.url;
                                hintApp.filename = req.file.originalname;
                                hintApp.mime = req.file.mimetype;

                                return hintApp.save();
                            }).
                            then(() => {
                                req.flash("success", "Fichero guardado con éxito.");
                                if (old_public_id) {
                                    attHelper.deleteResource(old_public_id);
                                }
                            }).
                            catch((error) => { // Ignoring image validation errors
                                req.flash("error", `Error al guardar el fichero: ${error.message}`);
                                attHelper.deleteResource(uploadResult.public_id);
                            });
                    }).
                    catch((error) => {
                        req.flash("error", `${req.app.locals.i18n.common.flash.errorFile}: ${error.message}`);
                    });
            }
        }).
        then(() => {
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("escapeRooms/hints", {escapeRoom});
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/evaluation
exports.encuestas = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/evaluation", {escapeRoom});
};

// POST /escapeRooms/:escapeRoomId/evaluation
exports.evaluationUpdate = (req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    escapeRoom.survey = body.survey;
    escapeRoom.pretest = body.pretest;
    escapeRoom.posttest = body.posttest;
    escapeRoom.scoreParticipation = body.scoreParticipation;
    escapeRoom.hintSuccess = body.hintSuccess;
    escapeRoom.hintFailed = body.hintFailed;
    escapeRoom.save({"fields": [
        "survey",
        "pretest",
        "posttest",
        "scoreParticipation",
        "hintSuccess",
        "hintFailed"
    ]}).then(() => {
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
        return Promise.all(promises);
    }).
        then(() => {
            res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? "appearance" : progressBar || ""}`);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/evaluation`);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};

// GET /escapeRooms/:escapeRoomId/instructions
exports.instructions = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/instructions", {escapeRoom});
};


// GET /escapeRooms/:escapeRoomId/instructions
exports.instructionsUpdate = (req, res, next) => {
    const {escapeRoom, body} = req;
    const isPrevious = Boolean(body.previous);

    escapeRoom.instructions = body.instructions;
    const progressBar = body.progress;

    escapeRoom.save({"fields": ["instructions"]}).then(() => {
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? "hints" : progressBar || "appearance"}`);
    }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${escapeRoom.id}/instructions`);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId
exports.destroy = (req, res, next) => {
    // Delete the attachment at Cloudinary (result is ignored)
    if (req.escapeRoom.attachment) {
        attHelper.checksCloudinaryEnv().
            then(() => {
                attHelper.deleteResource(req.escapeRoom.attachment.public_id);
            });
    }

    req.escapeRoom.destroy().
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successDeletingER);
            res.redirect("/escapeRooms");
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorDeletingER}: ${error.message}`);
            next(error);
        });
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
        res.render("escapeRooms/indexInvitation", {escapeRoom,
            cloudinary});
    } else {
        res.redirect("/");
    }
};
