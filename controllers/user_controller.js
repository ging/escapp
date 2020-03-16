const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const mailer = require("../helpers/mailer");
const ejs = require("ejs");

// Autoload the user with id equals to :userId
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
    const user = {"name": "", "surname": "", "gender": "", "dni": "", "username": "", "password": ""};

    res.render("index", {
        user,
        "register": true,
        "redir": req.query.redir
    });
};

// POST /users
exports.create = (req, res, next) => {
    const {name, surname, gender, username, password, dni, role} = req.body;
    const {redir} = req.query;
    const user = models.user.build({
            name,
            surname,
            gender,
            "username": (username || "").toLowerCase(),
            "dni": (dni || "").toLowerCase(),
            password
        }),
        isStudent = role === "student",
        isTeacher = role === "teacher";


    if (!isStudent && !isTeacher) {
        req.flash("error", req.app.locals.i18n.common.flash.mustBeUPMAccount);
        res.render("index", {
            user,
            "register": true,
            redir
        });
        return;
    }
    user.isStudent = Boolean(isStudent);

    // Save into the data base
    user.save({"fields": ["name", "surname", "gender", "username", "dni", "password", "isStudent", "salt"]}).
        then(() => { // Render the users page
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingUser);
            res.redirect(redir ? `/?redir=${redir}` : "/"); // Redirection
        }).
        catch(Sequelize.UniqueConstraintError, (error) => {
            console.error(error);
            req.flash("error", req.app.locals.i18n.common.flash.errorExistingUser);
            res.render("index", {
                user,
                "register": true,
                redir
            });
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.render("index", {
                user,
                "register": true,
                redir
            });
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
    user.save({"fields": ["password", "salt", "name", "surname", "gender"]}).
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
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        await req.user.destroy({}, {transaction});// Deleting logged user.
        if (req.session.user && req.session.user.id === req.user.id) {
            // Close the user session
            delete req.session.user;
        }
        await models.participants.destroy({"where": {"userId": req.user.id}}, {transaction});
        await models.teamMembers.destroy({"where": {"userId": req.user.id}}, {transaction});
        transaction.commit();
        req.flash("success", req.app.locals.i18n.common.flash.successDeletingUser);
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
exports.newResetPassword = (req, res) => {
    if (!req.body.login) {
        req.flash("error", req.app.locals.i18n.common.flash.resetPasswordUserNotFound);
        res.redirect("/users/password-reset");
        return;
    }
    models.user.findOne({"where": {"username": req.body.login}}).then((user) => {
        if (user) {
            ejs.renderFile("views/emails/resetPassword.ejs", {
                "i18n": req.app.locals.i18n,
                "link": `http://${process.env.APP_NAME}/users/password-reset/${user.id}?code=${user.password}&email=${user.username}`
            }, {}, function (err, str) {
                if (err) {
                    console.error(err);
                    req.flash("error", req.app.locals.i18n.common.flash.problemSendingEmail);
                    res.redirect("/users/password-reset");
                    return;
                }
                mailer.resetPasswordEmail(user.username, "Reset password", str, str).
                    then(() => req.flash("success", req.app.locals.i18n.common.flash.resetPasswordSent)).
                    catch(() => req.flash("error", req.app.locals.i18n.common.flash.problemSendingEmail)).
                    then(() => res.redirect("/users/password-reset"));
            });
        } else {
            req.flash("error", req.app.locals.i18n.common.flash.resetPasswordUserNotFound);
            res.redirect("/users/password-reset");
        }
    });
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
        res.render("index", {
            "resetPasswordHash": true,
            user
        });
    } else {
        next();
    }
};

// POST /users/password-reset/:hash
exports.newResetPasswordHash = (req, res, next) => {
    const {code, email} = req.query;

    if (req.user && req.user.password === code && req.user.username === email) {
        if (req.body.password && req.body.password === req.body.confirm_password) {
            req.user.password = req.body.password.toString();
            req.user.save({
                "fields": [
                    "password",
                    "salt"
                ]
            }).
                then(() => {
                    req.flash("error", req.app.locals.i18n.common.flash.passwordChangedSuccessfully);
                    res.redirect("/");
                });
        } else {
            req.flash("error", req.app.locals.i18n.common.flash.passwordsDoNotMatch);
            res.redirect("back");
        }
    } else {
        next();
    }
};
