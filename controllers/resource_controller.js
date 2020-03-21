const Sequelize = require("sequelize");
const {Op} = Sequelize;
const sequelize = require("../models");
const {models} = sequelize;

// Autoload the resource with id equals to :resourceId
exports.load = async (req, res, next, resourceId) => {
    try {
        const resource = await models.resource.findByPk(resourceId, {
            "include": [
                { "model": models.app },
                {
                    "model": models.puzzle,
                    "required": false
                }
            ]
        });
        if (resource) {
            req.resource = resource;
            next();
        } else {
            throw new Error(req.app.locals.i18n.api.notFound);
        }
    } catch (error) {
        console.error(error)
        res.status(500);
        next(error);
    }
};

// GET /inspiration
exports.showGuide = (req, res) => res.render("inspiration/inspiration");


// GET /resources
exports.showResources = (req, res) => res.render("inspiration/resources");

// GET /resources/my
exports.index = async (req, res, next) => {
    try {
        const resources = await models.resource.findAll({"include": [{"model": models.app}], "where": {"authorId": req.session.user.id}});

        res.render("inspiration/indexResources", {resources, "user": req.session.user});
    } catch (err) {
        next(err);
    }
};

// POST /apps/:appId
exports.create = async (req, res, next) => {
    try {
        const resource = await models.resource.create({
            "appId": req.params.appId,
            "puzzleId": req.body.puzzleId,
            "authorId": req.session.user ? req.session.user.id : null,
            "config": JSON.stringify(req.body)
        });

        res.redirect(`/resources/${resource.id}`);
    } catch (err) {
        next(err);
    }
};

// GET /resources/:appId/new
exports.new = async (req, res, next) => {
    try {
        const escapeRooms = await models.escapeRoom.findAll({
            "where": {"authorId": req.session.user.id},
            "attributes": ["id", "title"],
            "include": {
                "model": models.puzzle,
                "attributes": ["id", "title", "sol"]
            }
        });

        res.render("inspiration/apps/form", {"app": req.resourceApp, escapeRooms});
    } catch (err) {
        next(err);
    }
};

// GET /resources/:resourceId
exports.show = async (req, res, next) => {
    try {
        const {query, resource} = req;
        let isAuthor = false;

        if (resource && resource.puzzle) {
            if (req.session.user) {
                isAuthor = resource.authorId === req.session.user.id;
                if (!isAuthor) {
                    const isParticipant = await models.user.findOne({
                        "where": { "id": req.session.user.id },
                        "include": [
                            {
                                "model": models.turno,
                                "through": "participants",
                                "as": "turnosAgregados",
                                "include": {
                                    "model": models.escapeRoom,
                                    "include": [
                                        {
                                            "model": models.puzzle,
                                            "where": { "id": resource.puzzle.id }
                                        }
                                    ]
                                }
                            }
                        ]
                    });

                    if (!isParticipant) {
                        throw new Error(403);
                    }
                }
            } else {
                throw new Error(403);
            }
        }
        if (query.full) {
            res.render(`inspiration/apps/${resource.app.key}/show`, {"layout": false, resource});
        } else {
            res.render("inspiration/apps/show", {resource, isAuthor});
        }
    } catch (err) {
        next(err);
    }
};

// GET /resources/:resourceId/edit
exports.edit = async (req, res, next) => {
    try {
        const escapeRooms = await models.escapeRoom.findAll({
            "where": {"authorId": req.session.user.id},
            "attributes": ["id", "title"],
            "include": {
                "model": models.puzzle,
                "attributes": ["id", "title", "sol"]
            }
        });

        res.render("inspiration/apps/edit", {"app": req.resource.app, "resource": req.resource, escapeRooms});
    } catch (err) {
        next(err);
    }
};

// PUT /resources/:resourceId/
exports.update = async (req, res, next) => {
    try {
        const {resource, body} = req;

        resource.config = JSON.stringify(body);
        resource.puzzleId = body.puzzleId;
        await resource.save();
        res.redirect(`/resources/${resource.id}`);
    } catch (err) {
        next(err);
    }
};

// DELETE /resources/:resourceId
exports.destroy = async (req, res, next) => {
    try {
        await req.resource.destroy();
    } catch (err) {
        next(err);
    }
};
