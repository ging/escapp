const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const http = require("https");
const attHelper = require("../helpers/attachments");

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

// POST /escapeRooms/:escapeRoomId/puzzles/:puzzleId/hints/new
exports.create = (req, res, next) => {
    const {puzzle, body, escapeRoom} = req;
    const {content} = body;
    const hint = models.hint.build({content,
        "puzzleId": puzzle.id});

    const back = `/escapeRooms/${escapeRoom.id}/puzzles`;

    hint.save().
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingHint);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingHint}: ${error.message}`);
            next(error);
        });
};

// PUT /escapeRooms/:escapeRoomId/hints/:hintId
exports.update = (req, res, next) => {
    const {body, hint, escapeRoom} = req;
    const {content} = body;
    const back = `/escapeRooms/${escapeRoom.id}/puzzles`;

    hint.content = content;
    hint.save({"fields": ["content"]}).
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successEditingHint);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingHint}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId/hints/:hintId
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        await req.hint.destroy({}, {transaction});
        const back = `/escapeRooms/${req.escapeRoom.id}/puzzles`;

        req.flash("success", req.app.locals.i18n.common.flash.successDeletingHint);
        await models.requestedHint.destroy({"where": {"hintId": req.hint.id}}, {transaction});
        await transaction.commit();
        res.redirect(back);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/hints/hintapp
exports.hintApp = (req, res) => {
    res.render("escapeRooms/hintApp/hintApp", {"layout": false,
        "escapeRoom": req.escapeRoom});
};

// GET /escapeRooms/:escapeRoomId/hints/hintappwrapper
exports.hintAppWrapper = (req, res) => {
    res.render("escapeRooms/hintApp/hintAppScormWrapper", {"layout": false,
        "escapeRoom": req.escapeRoom});
};

// GET /escapeRooms/:escapeRoomId/requestHint
exports.requestHint = (req, res) => {
    const {escapeRoom, body} = req;
    const {score, status} = body;
    const success = status === "completed" || status === "passed";

    if (req.session && req.session.user && !req.session.user.isStudent) {
        res.send({"teacher": true,
            "ok": false});
        return;
    }
    models.user.findByPk(req.session.user.id).then((user) => {
        user.getTeamsAgregados({
            "include": [
                {
                    "model": models.turno,
                    "required": true,
                    "where": {"escapeRoomId": escapeRoom.id,
                        "status": "active"} // Aquí habrá que añadir las condiciones de si el turno está activo, etc
                }
            ]

        }).
            then((teams) => {
                if (teams && teams.length > 0) {
                    const [team] = teams;

                    if (success) {
                        team.getRetos().then((retosSuperados) => {
                            let currentReto = -1;
                            const puzzleIndexes = escapeRoom.puzzles.map((p) => p.id);

                            for (const p in retosSuperados) {
                                const reto = retosSuperados[p];
                                const idx = puzzleIndexes.indexOf(reto.id);

                                if (idx > currentReto) {
                                    currentReto = idx;
                                }
                            }
                            currentReto++;

                            if (currentReto >= puzzleIndexes.length) {
                                currentReto = -1;
                            } else {
                                currentReto = escapeRoom.puzzles[currentReto].id;
                            }
                            models.requestedHint.findAll({
                                "where": {
                                    "teamId": team.id,
                                    "success": true
                                } // Order by reto and then hintId
                            }).then((hints) => {
                                const requestedHints = hints.filter((h) => h.id !== null);
                                let currentHint = -1;
                                const allHints = [];
                                const allHintsIndexes = [];
                                const currentRetos = escapeRoom.puzzles.filter((p) => p.id === currentReto);

                                for (const h in currentRetos) {
                                    for (const i in currentRetos[h].hints) {
                                        allHints.push(currentRetos[h].hints[i]);
                                        allHintsIndexes.push(currentRetos[h].hints[i].id);
                                    }
                                }

                                for (const h in requestedHints) {
                                    const hint = requestedHints[h];

                                    const hIndex = allHintsIndexes.indexOf(hint.hintId);

                                    if (hIndex > currentHint) {
                                        currentHint = hIndex;
                                    }
                                }
                                currentHint++;
                                let pista = req.app.locals.i18n.hint.empty;
                                let hintId = null;

                                if (currentHint < allHintsIndexes.length) {
                                    pista = allHints[currentHint].content;
                                    hintId = allHints[currentHint].id;
                                }

                                models.requestedHint.build({
                                    hintId,
                                    "teamId": team.id,
                                    success,
                                    score
                                }).save().
                                    then(() => {
                                        res.json({"msg": pista,
                                            "ok": true,
                                            "alert": hintId ? false : req.app.locals.i18n.hint.dontClose});
                                    });
                            });
                        });
                    } else {
                        models.requestedHint.build({
                            "hintId": null,
                            "teamId": team.id,
                            success,
                            score
                        }).save().
                            then(() => {
                                res.json({"msg": req.app.locals.i18n.hint.failed,
                                    "ok": false});
                            });
                    }
                } else {
                    res.status(500);
                    res.send({"msg": req.app.locals.i18n.user.messages.ensureRegistered,
                        "ok": false});
                }
            });
    }).
        catch((msg) => {
            console.error(msg);
            res.status(500);
            res.send({msg,
                "ok": false});
        });
};

// GET /escapeRooms/:escapeRoomId/xml
exports.downloadMoodleXML = (req, res) => {
    try {
        if (req.escapeRoom.hintApp.url) {
            http.get(req.escapeRoom.hintApp.url, function (resp) {
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

    res.render("escapeRooms/steps/hints", {escapeRoom,
        "progress": "hints"});
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
