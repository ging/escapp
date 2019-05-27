const Sequelize = require("sequelize");
const {models} = require("../models");// Autoload the user with id equals to :userId

exports.load = (req, res, next, userId) => {
    models.user.findByPk(userId).
        then((user) => {
            if (user) {
                req.user = user;
                next();
            } else {
                req.flash("error", `No existe usuario con id=${userId}.`);
                throw new Error(`No existe userId=${userId}`);
            }
        }).
        catch((error) => next(error));
};


// GET /users/:userId
exports.show = (req, res) => {
    const {user} = req;

    res.render("users/show", {user});
};


// GET /users/new
exports.new = (req, res) => {
    const user = {"name": "",
        "surname": "",
        "gender": "",
        "dni": "",
        "username": "",
        "password": ""};

    res.render("index", {user,
        "register": true,
        "redir": req.query.redir});
};


// POST /users
exports.create = (req, res, next) => {
    const {name, surname, gender, username, password, dni} = req.body;
    const {redir} = req.query;
    const studentRegex = /(@alumnos\.upm\.es)/,
        teacherRegex = /(@upm\.es)/,
        user = models.user.build({name,
            surname,
            gender,
            "username": (username || "").toLowerCase(),
            "dni": (dni || "").toLowerCase(),
            password}),
        isStudent = user.username.match(studentRegex),
        isTeacher = user.username.match(teacherRegex);

    user.isStudent = Boolean(isStudent);
    if (!isStudent && !isTeacher) {
        req.flash("error", req.app.locals.i18n.common.flash.mustBeUPMAccount);
        res.render("index", {user,
            "register": true,
            redir});
        return;
    }

    // Save into the data base
    user.save({"fields": [
        "name",
        "surname",
        "gender",
        "username",
        "dni",
        "password",
        "isStudent",
        "salt"
    ]}).
        then(() => { // Render the users page
            req.flash("success", "Usuario creado con éxito.");
            res.redirect(redir ? `/?redir=${redir}` : "/"); // Redirection
        }).
        catch(Sequelize.UniqueConstraintError, (error) => {
            console.error(error);
            req.flash("error", req.app.locals.i18n.common.flash.errorExistingUser);
            res.render("index", {user,
                "register": true,
                redir});
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("index", {user,
                "register": true,
                redir});
        }).
        catch((error) => next(error));
};


// GET /users/:userId/edit
exports.edit = (req, res) => {
    const {user} = req;

    res.render("users/edit", {user});
};


// PUT /users/:userId
exports.update = (req, res, next) => {
    const {user, body} = req;
    // User.username  = body.user.username; // edition not allowed

    user.password = body.password;
    user.name = body.name;
    user.surname = body.surname;
    user.gender = body.gender;
    user.password = body.password;

    // Password can not be empty
    if (!body.password) {
        req.flash("error", req.app.locals.i18n.common.flash.errorMandatoryPass);

        return res.render("users/edit", {user});
    }
    user.save({"fields": [
        "password",
        "salt",
        "name",
        "surname",
        "gender"
    ]}).
        then((user_saved) => {
            req.flash("success", req.app.locals.i18n.common.flash.successEditingUser);
            res.redirect(`/users/${user_saved.id}/escapeRooms`);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("users/edit", {user});
        }).
        catch((error) => next(error));
};


// DELETE /users/:userId
exports.destroy = (req, res, next) => {
    req.user.destroy().
        then(() => {
            // Deleting logged user.
            if (req.session.user && req.session.user.id === req.user.id) {
                // Close the user session
                delete req.session.user;
            }

            req.flash("success", req.app.locals.i18n.common.flash.successDeletingUser);
            res.redirect("/goback");
        }).
        catch((error) => next(error));
};

exports.index = (req, res, next) => {
    models.user.count().
        then(() => {
            const findOptions = {"order": ["username"]};

            return models.user.findAll(findOptions);
        }).
        then((users) => {
            res.render("users/index", {users});
        }).
        catch((error) => next(error));
};
