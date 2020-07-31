const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const cloudinary = require("cloudinary");
const query = require("../queries");
const attHelper = require("../helpers/attachments");
const {nextStep, prevStep} = require("../helpers/progress");
const {saveInterface, getERPuzzles} = require("../helpers/utils");
const es = require("../i18n/es");
const en = require("../i18n/en");

// Autoload the escape room with id equals to :escapeRoomId
exports.load = async (req, res, next, escapeRoomId) => {
    try {
        const escapeRoom = await models.escapeRoom.findByPk(escapeRoomId, query.escapeRoom.load);

        if (escapeRoom) {
            if (res.locals) {
                if (!req.session || req.session && req.session.user && req.session.user.isStudent) {
                    if (escapeRoom.forceLang && req.cookies && req.cookies.locale !== escapeRoom.forceLang) {
                        res.locals.i18n_texts = escapeRoom.forceLang === "es" ? es : en;
                        res.locals.i18n_lang = escapeRoom.forceLang === "es" ? "es" : "en";
                        res.locals.i18n = res.locals.i18n_texts;
                    }
                }
            }
            req.escapeRoom = escapeRoom;
            next();
        } else {
            res.status(404);
            const {i18n} = res.locals;

            next(new Error(i18n.api.notFound));
        }
    } catch (error) {
        res.status(500);
        next(error);
    }
};

// GET /escapeRooms
exports.index = async (req, res, next) => {
    const user = req.user || req.session.user;
    let escapeRooms = [];

    try {
        if (user && !user.isStudent) {
            escapeRooms = await models.escapeRoom.findAll(query.escapeRoom.forTeacher(user.id));
        } else {
            const erAll = await models.escapeRoom.findAll(query.escapeRoom.all());
            const erFiltered = await models.escapeRoom.findAll(query.escapeRoom.all(user.id));
            const ids = erFiltered.map((e) => e.id);

            escapeRooms = erAll.map((er) => {
                const {id, title, invitation, attachment, nmax} = er;
                const isSignedUp = ids.indexOf(er.id) !== -1;
                const disabled = !isSignedUp && !er.turnos.some((e) => e.status !== "finished" && (!nmax || e.students.length < nmax));

                return { id, title, invitation, attachment, disabled, isSignedUp };
            });
        }

        res.render("escapeRooms/index.ejs", {escapeRooms, cloudinary, user});
    } catch (error) {
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId
exports.show = async (req, res) => {
    const escapeRoom = await models.escapeRoom.findByPk(req.escapeRoom.id, query.escapeRoom.loadShow);

    const {participant} = req;
    const hostName = process.env.APP_NAME ? `https://${process.env.APP_NAME}` : "http://localhost:3000";

    if (participant) {
        const [team] = participant.teamsAgregados;
        const howManyRetos = await team.countRetos();
        const finished = howManyRetos === escapeRoom.puzzles.length;

        res.render("escapeRooms/showStudent", {escapeRoom, cloudinary, participant, team, finished});
    } else {
        res.render("escapeRooms/show", {escapeRoom, cloudinary, hostName, "email": req.session.user.username});
    }
};

// GET /escapeRooms/new
exports.new = (_req, res) => {
    const escapeRoom = {"title": "", "teacher": "", "subject": "", "duration": "", "description": "", "nmax": "", "teamSize": "", "forceLang": ""};

    res.render("escapeRooms/new", {escapeRoom, "progress": "edit"});
};

// POST /escapeRooms/create
exports.create = async (req, res) => {
    const {title, subject, duration, forbiddenLateSubmissions, description, nmax, teamSize, supportLink, forceLang} = req.body,
        authorId = req.session.user && req.session.user.id || 0;

    const escapeRoom = models.escapeRoom.build({title, subject, duration, "forbiddenLateSubmissions": forbiddenLateSubmissions === "on", description, supportLink, "nmax": nmax || 0, "teamSize": teamSize || 0, authorId, forceLang}); // Saves only the fields question and answer into the DDBB
    const {i18n} = res.locals;

    escapeRoom.forceLang = forceLang === "en" || forceLang === "es" ? forceLang : null;

    try {
        const er = await escapeRoom.save({"fields": ["title", "teacher", "subject", "duration", "description", "forbiddenLateSubmissions", "nmax", "teamSize", "authorId", "supportLink", "invitation", "forceLang"]});

        req.flash("success", i18n.common.flash.successCreatingER);

        if (!req.file) {
            res.redirect(`/escapeRooms/${escapeRoom.id}/turnos`);
            return;
        }

        try {
            await attHelper.checksCloudinaryEnv();
            const uploadResult = await attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options);

            try {
                await models.attachment.create({
                    "public_id": uploadResult.public_id,
                    "url": uploadResult.url,
                    "filename": req.file.originalname,
                    "mime": req.file.mimetype,
                    "escapeRoomId": er.id
                });
            } catch (error) {
                console.error(error);
                req.flash("error", i18n.common.flash.errorImage);
                attHelper.deleteResource(uploadResult.public_id, models.attachment);
            }
        } catch (error) {
            console.error(error);
            req.flash("error", i18n.common.flash.errorFile);
        }
        res.redirect(`/escapeRooms/${er.id}/${nextStep("edit")}`);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            console.error(error);
            // Error.errors.forEach(({message}) => req.flash("error", message));
            req.flash("error", i18n.common.validationError);
        } else {
            console.error(error.message);
            req.flash("error", i18n.common.flash.errorCreatingER);
        }
        res.render("escapeRooms/new", {escapeRoom, "progress": "edit"});
    }
};

// GET /escapeRooms/:escapeRoomId/edit
exports.edit = async (req, res, next) => {
    try {
        req.escapeRoom.attachment = await models.attachment.findOne({"where": {"escapeRoomId": req.escapeRoom.id}});
        res.render("escapeRooms/edit", {"escapeRoom": req.escapeRoom, "progress": "edit"});
    } catch (error) {
        next(error);
    }
};

// PUT /escapeRooms/:escapeRoomId
exports.update = async (req, res) => {
    const {escapeRoom, body} = req;
    const {i18n} = res.locals;

    escapeRoom.title = body.title;
    escapeRoom.subject = body.subject;
    escapeRoom.duration = body.duration;
    escapeRoom.forbiddenLateSubmissions = body.forbiddenLateSubmissions === "on";
    escapeRoom.description = body.description;
    escapeRoom.supportLink = body.supportLink;
    escapeRoom.nmax = body.nmax || 0;
    escapeRoom.teamSize = body.teamSize || 0;
    escapeRoom.forceLang = body.forceLang === "en" || body.forceLang === "es" ? body.forceLang : null;
    const progressBar = body.progress;

    try {
        const er = await escapeRoom.save({"fields": ["title", "subject", "duration", "forbiddenLateSubmissions", "description", "nmax", "teamSize", "supportLink", "forceLang"]});

        if (body.keepAttachment === "0") {
            // There is no attachment: Delete old attachment.
            if (!req.file) {
                if (er.attachment) {
                    attHelper.deleteResource(er.attachment.public_id, models.attachment);
                    er.attachment.destroy();
                }
                res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || nextStep("edit")}`);
                return;
            }
            try {
                // Save the new attachment into Cloudinary:
                await attHelper.checksCloudinaryEnv();
                const uploadResult = await attHelper.uploadResource(req.file.path, attHelper.cloudinary_upload_options);
                // Remember the public_id of the old image.
                const old_public_id = er.attachment ? er.attachment.public_id : null;
                let attachment = await er.getAttachment();

                if (!attachment) {
                    attachment = models.attachment.build({"escapeRoomId": er.id});
                }
                attachment.public_id = uploadResult.public_id;
                attachment.url = uploadResult.url;
                attachment.filename = req.file.originalname;
                attachment.mime = req.file.mimetype;
                try {
                    await attachment.save();
                    if (old_public_id) {
                        attHelper.deleteResource(old_public_id, models.attachment);
                    }
                } catch (error) { // Ignoring image validation errors
                    console.error(error);
                    req.flash("error", i18n.common.flash.errorFile);
                    attHelper.deleteResource(uploadResult.public_id, models.attachment);
                }
                res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || nextStep("edit")}`);
            } catch (error) {
                console.error(error);
                req.flash("error", i18n.common.flash.errorFile);
            }
        }
        res.redirect(`/escapeRooms/${req.escapeRoom.id}/${progressBar || nextStep("edit")}`);
    } catch (error) {
        console.log(error);
        if (error instanceof Sequelize.ValidationError) {
            req.flash("error", i18n.common.validationError);
        } else {
            req.flash("error", i18n.common.flash.errorEditingER);
        }
        res.render("escapeRooms/edit", {escapeRoom, "progress": "edit"});
    }
};

// GET /escapeRooms/:escapeRoomId/evaluation
exports.evaluation = async (req, res, next) => {
    try {
        const escapeRoom = await models.escapeRoom.findByPk(req.escapeRoom.id, query.escapeRoom.loadPuzzles);

        escapeRoom.hintApp = await models.hintApp.findOne({"where": {"escapeRoomId": req.escapeRoom.id}});

        res.render("escapeRooms/steps/evaluation", {escapeRoom, "progress": "evaluation"});
    } catch (e) {
        next(e);
    }
};

// POST /escapeRooms/:escapeRoomId/evaluation
exports.evaluationUpdate = async (req, res, next) => {
    const {body} = req;
    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;
    const {i18n} = res.locals;

    try {
        const escapeRoom = await models.escapeRoom.findByPk(req.escapeRoom.id, query.escapeRoom.loadPuzzles);

        escapeRoom.survey = body.survey;
        escapeRoom.pretest = body.pretest;
        escapeRoom.posttest = body.posttest;
        escapeRoom.scoreParticipation = body.scoreParticipation;
        escapeRoom.hintSuccess = body.hintSuccess;
        escapeRoom.hintFailed = body.hintFailed;
        escapeRoom.automaticAttendance = body.automaticAttendance;
        await escapeRoom.save({"fields": ["survey", "pretest", "posttest", "scoreParticipation", "hintSuccess", "hintFailed", "automaticAttendance"]});
        if (body.scores && body.scores.length !== escapeRoom.puzzles.length) {
            throw new Error("");
        }
        const promises = [];

        for (const p in body.scores || []) {
            if (parseFloat(escapeRoom.puzzles[p].score || 0) !== parseFloat(body.scores[p] || 0)) {
                escapeRoom.puzzles[p].score = body.scores[p];
                promises.push(escapeRoom.puzzles[p].save({"fields": ["score"]}));
            }
        }
        await Promise.all(promises);
        res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("evaluation") : progressBar || nextStep("evaluation")}`);
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash("error", i18n.common.validationError);
            // Error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${req.escapeRoom.id}/evaluation`);
        } else {
            req.flash("error", i18n.common.flash.errorEditingER);
            next(error);
        }
    }
};

// GET /escapeRooms/:escapeRoomId/team
exports.teamInterface = async (req, res, next) => {
    try {
        const {escapeRoom} = req;

        escapeRoom.puzzles = await getERPuzzles(escapeRoom.id);
        res.render("escapeRooms/steps/instructions", {escapeRoom, "progress": "team", "endPoint": "team"});
    } catch (e) {
        req.flash("error", res.locals.i18n.common.flash.errorEditingER);
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/class
exports.classInterface = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/instructions", {escapeRoom, "progress": "class", "endPoint": "class"});
};
// GET /escapeRooms/:escapeRoomId/indications
exports.indicationsInterface = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/instructions", {escapeRoom, "progress": "indications", "endPoint": "indications"});
};

// POST /escapeRooms/:escapeRoomId/class
exports.indicationsInterfaceUpdate = (req, res, next) => saveInterface("indications", req, res, next);

// POST /escapeRooms/:escapeRoomId/team
exports.teamInterfaceUpdate = (req, res, next) => saveInterface("team", req, res, next);

// POST /escapeRooms/:escapeRoomId/class
exports.classInterfaceUpdate = (req, res, next) => saveInterface("class", req, res, next);

// DELETE /escapeRooms/:escapeRoomId
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    const {i18n} = res.locals;

    try {
        await req.escapeRoom.destroy({}, {transaction});
        if (req.escapeRoom.attachment) { // Delete the attachment at Cloudinary (result is ignored)
            await attHelper.checksCloudinaryEnv();
            await attHelper.deleteResource(req.escapeRoom.attachment.public_id, models.attachment);
        }
        await transaction.commit();
        req.flash("success", i18n.common.flash.successDeletingER);
        res.redirect("/escapeRooms");
    } catch (error) {
        await transaction.rollback();
        req.flash("error", `${i18n.common.flash.errorDeletingER}: ${error.message}`);
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/join
exports.studentToken = (req, res, next) => {
    const {escapeRoom} = req;

    if (req.session.user.isStudent) {
        res.render("escapeRooms/indexInvitation", {escapeRoom, "token": req.query.token});
    } else {
        res.status(403);
        next(new Error(403));
    }
};

exports.clone = async (req, res, next) => {
    try {
        const {"title": oldTitle, subject, duration, description, nmax, teamSize, teamAppearance, classAppearance, forceLang, survey, pretest, posttest, numQuestions, numRight, feedback, forbiddenLateSubmissions, classInstructions, teamInstructions, scoreParticipation, hintLimit, hintSuccess, hintFailed, puzzles, hintApp, assets, attachment, allowCustomHints, hintInterval} = req.escapeRoom;
        const authorId = req.session && req.session.user && req.session.user.id || 0;
        const newTitle = `Copy of ${oldTitle}`;
        const include = [{"model": models.puzzle, "include": [models.hint]}];

        if (hintApp) {
            include.push(models.hintApp);
        }
        if (assets && assets.length) {
            include.push(models.asset);
        }
        if (attachment) {
            include.push(models.attachment);
        }
        const escapeRoom = models.escapeRoom.build({
            "title": newTitle,
            subject,
            duration,
            description,
            nmax,
            teamSize,
            forceLang,
            teamAppearance,
            classAppearance,
            allowCustomHints,
            hintInterval,
            survey,
            pretest,
            posttest,
            numQuestions,
            numRight,
            feedback,
            forbiddenLateSubmissions,
            classInstructions,
            teamInstructions,
            scoreParticipation,
            hintLimit,
            hintSuccess,
            hintFailed,
            authorId,
            "puzzles": [...puzzles].map(({title, sol, desc, order, correct, fail, automatic, score, hints}) => ({
                title,
                sol,
                desc,
                order,
                correct,
                fail,
                automatic,
                score,
                "hints": [...hints].map(({content, "order": hintOrder, category}) => ({content, "order": hintOrder, category}))
            })),
            "hintApp": hintApp ? attHelper.getFields(hintApp) : undefined,
            "assets": assets && assets.length ? [...assets].map((asset) => attHelper.getFields(asset)) : undefined,
            "attachment": attachment ? attHelper.getFields(attachment) : undefined
        }, {include});
        const saved = await escapeRoom.save();

        res.redirect(`/escapeRooms/${saved.id}/edit`);
    } catch (err) {
        next(err);
    }
};
