const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;

// Autoload the resourceApp with id equals to :resourceId
exports.load = async (req, res, next, appId) => {
    try {
        const resourceApp = await models.app.findByPk(appId);

        if (resourceApp) {
        	req.resourceApp = resourceApp;
        	next();
        } else {
        	throw new Error(req.app.locals.i18n.api.notFound);
        }
    } catch (error) {
        res.status(500);
        next(error);
    }
};

// GET /apps/new
exports.new = async (req, res, next) => {
    const app = {name: "", description: "", key: ""};

    res.render("inspiration/newApp", {app});
};

// POST /apps
exports.create = async (req, res, next) => {
    const {name, key, description} = req.body;

    await models.app.create({name, key, description});
    res.redirect("/apps/");
};

// GET /resources/new
exports.index = async (req, res) => {
    const apps = await models.app.findAll();
    res.render("inspiration/indexApp", {apps, user: req.session.user});
};

// DELETE /apps/:appId
exports.destroy = async (req, res, next) => {
    res.send("Not yet implemented");
};
