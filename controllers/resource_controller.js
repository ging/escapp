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
exports.index = async (req, res, next) => {
    res.send("Not yet implemented");
};

// POST /apps/:appId
exports.create = async (req, res, next) => {
    try {
        console.log(req.params.appId, req.body);

        const resource = await models.resource.create({"appId": req.params.appId, "puzzleId": req.body.puzzleId, "config": JSON.stringify(req.body)});

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
    if (req.query.full) {
        res.render(`inspiration/apps/${req.resource.app.key}/show`, {"layout": false, "resource": req.resource});
    } else {
        res.render("inspiration/apps/show", {"resource": req.resource});
    }
};

// GET /resources/:resourceId/edit
exports.edit = async (req, res, next) => {

};

// DELETE /resources/:resourceId
exports.destroy = async (req, res, next) => {

};
