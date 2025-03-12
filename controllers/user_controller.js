const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const mailer = require("../helpers/mailer");
const {renderEJS, validationError} = require("../helpers/utils");

// Autoload the user with id equals to :userId
exports.load = (req, res, next, userId) => {
    const {i18n} = res.locals;

    models.user.findByPk(userId).
        then((user) => {
            if (user) {
                req.user = user;
                next();
            } else {
                res.status(404);
                next(new Error(i18n.api.notFound));
            }
        }).
        catch((error) => next(error));
};

// GET /users/:userId
exports.show = (req, res) => {
    const {user} = req;

    res.render("users/show", {user});
};

// GET /register
exports.new = (req, res) => {
    const user = {"name": "", "surname": "", "gender": "", "username": "", "password": ""};

    res.render("index", {
        user,
        "register": true,
        "redir": req.query.redir
    });
};

// POST /users
exports.create = (req, res, next) => {
    const {name, surname, gender, username, password, confirm_password, role} = req.body;
    const {redir} = req.query;
    const {i18n} = res.locals;

    if (password !== confirm_password) {
        req.flash("error", i18n.common.flash.passwordsDoNotMatch);
        res.render("index", {
            "user": req.body,
            "register": true,
            redir
        });
        return;
    }
    const lang = req.cookies && req.cookies.locale ? req.cookies.locale : null;
    const user = models.user.build({
            name,
            surname,
            gender,
            "username": (username || "").toLowerCase(),
            password,
            lang,
            "lastAcceptedTermsDate": new Date()
        }),
        isStudent = role === "student",
        isTeacher = role === "teacher";


    if (!isStudent && !isTeacher) {
        req.flash("error", i18n.common.flash.mustBeUPMAccount);
        res.render("index", {
            user,
            "register": true,
            redir
        });
        return;
    }
    user.isStudent = Boolean(isStudent);

    // Save into the data base
    user.save({"fields": ["name", "surname", "gender", "username", "password", "isStudent", "salt", "token", "lang", "lastAcceptedTermsDate"]}).
        then(() => { // Render the users page
            req.flash("success", i18n.common.flash.successCreatingUser);
            req.body.login = username;
            req.body.redir = redir;
            next();
        }).
        catch((error) => {
            if (error instanceof Sequelize.UniqueConstraintError) {
                req.flash("error", i18n.common.flash.errorExistingUser);
                res.render("index", {user, "register": true, redir});
            } else if (error instanceof Sequelize.ValidationError) {
                req.flash("error", i18n.common.validationError);
                error.errors.forEach((err) => {
                    req.flash("error", validationError(err, i18n));
                });
                // Console.log(error.errors[0])
                // Console.log(error.errors[0].validatorArgs)
                // Console.log(error.errors[0].path)
                // Console.log(error.errors[0].validatorKey)
                res.render("index", {user, "register": true, redir});
            } else {
                next(error);
            }
        }).catch((error) => next(error));
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
    const {i18n} = res.locals;

    user.name = body.name;
    user.surname = body.surname;
    user.gender = body.gender;
    let scs = i18n.common.flash.successEditingUser;

    if (body.lang === "es" || body.lang === "en") {
        user.lang = body.lang;
        if (req.cookies && req.cookies.locale && (user.lang !== body.lang || req.cookies.locale !== body.lang)) {
            res.cookie("locale", body.lang);
            scs = body.lang === "es" ? "El usuario se ha actualizado con éxito" : "User successfully updated";
        }
    }
    if (body.password && body.confirm_password) {
        if (body.password === body.confirm_password) {
            user.password = body.password;
        } else {
            req.flash("error", i18n.common.flash.passwordsDoNotMatch);
            res.redirect("back");
            return;
        }
    }

    user.save({"fields": ["password", "salt", "name", "surname", "gender", "lang"]}).
        then((user_saved) => {
            req.flash("success", scs);
            res.redirect(`/users/${user_saved.id}/edit`);
        }).
        catch((error) => {
            if (error instanceof Sequelize.ValidationError) {
                error.errors.forEach(({message}) => req.flash("error", message));
                res.render("users/edit", {user});
            } else {
                next(error);
            }
        }).
        catch((error) => next(error));
};

// DELETE /users/:userId
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    const {i18n} = res.locals;

    try {
        await req.user.destroy({}, {transaction});// Deleting logged user.
        if (req.session.user && req.session.user.id === req.user.id) {
            // Close the user session
            delete req.session.user;
        }
        transaction.commit();
        req.flash("success", i18n.common.flash.successDeletingUser);
        res.redirect("/goback");
    } catch (error) {
        transaction.rollback();
        next(error);
    }
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

// GET /users/password-reset
exports.newResetPassword = async (req, res) => {
    const {i18n} = res.locals;

    if (!req.body.login) {
        req.flash("error", i18n.common.flash.resetPasswordUserNotFound);
        res.redirect("/users/password-reset");
        return;
    }
    const user = await models.user.findOne({"where": {"username": req.body.login}});

    try {
        if (user) {
            try {
                const str = await renderEJS("views/emails/resetPassword.ejs", {"i18n": res.locals.i18n, "link": `http://${process.env.APP_NAME}/users/password-reset/${user.id}?code=${user.password}&email=${user.username}`}, {});

                await mailer.resetPasswordEmail(user.username, "Reset password", str, str);
                req.flash("success", i18n.common.flash.resetPasswordSent);
                res.redirect("/users/password-reset");
            } catch (err) {
                console.error(err);
                req.flash("error", i18n.common.flash.problemSendingEmail);
                res.redirect("/users/password-reset");
            }
        } else {
            throw new Error();
        }
    } catch (e) {
        req.flash("error", i18n.common.flash.resetPasswordUserNotFound);
        res.redirect("/users/password-reset");
    }
};

// POST /users/password-reset
exports.resetPassword = (req, res) => {
    res.render("index", {"resetPassword": true});
};

// GET /users/password-reset/:hash
exports.resetPasswordHash = (req, res, next) => {
    const {user, query} = req;
    const {code, email} = query;

    if (user && user.password === code && user.username === email) {
        res.render("index", { "resetPasswordHash": true, user });
    } else {
        next();
    }
};

// POST /users/password-reset/:hash
exports.newResetPasswordHash = async (req, res) => {
    const {code, email} = req.query;
    const {i18n} = res.locals;

    if (req.user && req.user.password === code && req.user.username === email) {
        if (req.body.password && req.body.password === req.body.confirm_password) {
            req.user.password = req.body.password.toString();
            req.flash("success", i18n.common.flash.passwordChangedSuccessfully);
            res.redirect("/");
            try {
                await req.user.save({"fields": ["password", "salt"]});
            } catch (e) {
                req.flash("error", i18n.common.validationError);
                res.redirect("back");
            }
        } else {
            req.flash("error", i18n.common.flash.passwordsDoNotMatch);
            res.redirect("back");
        }
    } else {
        req.flash("error", i18n.common.validationError);
        res.redirect("back");
    }
};
