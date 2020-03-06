const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;

// Autoload the resource with id equals to :resourceId
exports.load = async (req, res, next, resourceId) => {
    try {
        const resource = await models.resource.findByPk(resourceId, {include:[{model: models.app}]});
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
exports.showGuide = (req, res) => {
    res.render("inspiration/inspiration");
};

// GET /resources
exports.showResources = (req, res) => {
    res.render("inspiration/resources");
};

// GET /resources/my
exports.index = async (req, res, next) => {
	res.send("Not yet implemented")
};

// GET /resources/:appId/new
exports.new = async (req, res, next) => {
	console.log(req.resourceApp);
	res.render("inspiration/apps/form", {app:req.resourceApp});
};

// GET /resources/:resourceId
exports.show = async (req, res, next) => {

};

// GET /resources/:resourceId/edit
exports.edit = async (req, res, next) => {

};

// DELETE /resources/:resourceId
exports.destroy = async (req, res, next) => {

};
