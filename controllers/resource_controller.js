const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;

// Autoload the resource with id equals to :resourceId
exports.load = async (req, res, next, resourceId) => {
    try {
        const resource = await models.resource.findByPk(resourceId, {"include": [{"model": models.app}]});

        if (resource) {
        	req.resource = resource;
        	next();
        } else {
        	throw new Error(req.app.locals.i18n.api.notFound);
        }
    } catch (error) {
        res.status(500);
        next(error);
    }
};

// GET /inspiration
exports.showGuide = (req, res) => res.render("inspiration/inspiration");


// GET /resources
exports.showResources = (req, res) => res.render("inspiration/resources");

// GET /resources/my
exports.index = async (req, res) => {
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
            "where": {
                "authorId": req.session.user.id
            },
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
exports.show = async (req, res) => {
    try {
        if (req.query.full) {
            res.render(`inspiration/apps/${req.resource.app.key}/show`, {"layout": false, "resource": req.resource});
        } else {
            res.render("inspiration/apps/show", {"resource": req.resource});
        }
    } catch (err) {
        next(err);
    }
};

// GET /resources/:resourceId/edit
exports.edit = async (req, res, next) => {
    try {
        const escapeRooms = await models.escapeRoom.findAll({
            "where": {
                "authorId": req.session.user.id
            },
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

};
