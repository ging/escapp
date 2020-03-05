// Const Sequelize = require('sequelize');
const {models} = require("../models"),
    // Const url = require('url');


    /*
     * This variable contains the maximum inactivity time allowed without
     * Making requests.
     * If the logged user does not make any new request during this time,
     * Then the user's session will be closed.
     * The value is in milliseconds.
     * 5 minutes.
     */

    maxIdleTime = 3 * 60 * 60 * 1000; /* * * Middleware used to destroy the user's session if the inactivity time * has been exceeded. * */

exports.deleteExpiredUserSession = (req, res, next) => {
    if (req.session.user) { // There exists a user session
        if (req.session.user.expires < Date.now()) { // Expired
            delete req.session.user; // Logout
            req.flash("info", req.app.locals.i18n.user.sessionExpired);
        } else { // Not expired. Reset value.
            req.session.user.expires = Date.now() + maxIdleTime;
        }
    }
    // Continue with the request
    next();
};


/*
 * Middleware: Login required.
 *
 * If the user is logged in previously then there will exist
 * The req.session.user object, so I continue with the others
 * Middlewares or routes.
 * If req.session.user does not exist, then nobody is logged,
 * So I redirect to the login screen.
 * I keep on redir which is my url to automatically return to
 * That url after login; but if redir already exists then
 * This value is maintained.
 *
 */
exports.loginRequired = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect(`/?redir=${req.param("redir") || req.url}`);
    }
};


// MW that allows to pass only if the logged user in is admin.
exports.adminRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin);

    if (isAdmin) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};

// MW that allows to pass only if the logged user in is not student.

exports.notStudentRequired = (req, res, next) => {
    const isStudent = !req.session.user.isStudent;

    if (isStudent) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};

// MW that allows to pass only if the logged user in is admin or student.

exports.studentOrAdminRequired = (req, res, next) => {
    const isStudent = Boolean(req.session.user.isStudent),
        isAdmin = Boolean(req.session.user.isAdmin);

    if (isStudent || isAdmin) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};

/*
 * MW that allows to pass only if the logged in user is:
 * - the user to manage.
 */
exports.myselfRequired = (req, res, next) => {
    const isMyself = req.user.id === req.session.user.id;

    if (isMyself) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};


/*
 * MW that allows to pass only if the logged in user is:
 * - admin
 * - or is the user to be managed.
 */
exports.adminOrMyselfRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isMyself = req.user.id === req.session.user.id;

    if (isAdmin || isMyself) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};

/*
 * MW that allows to pass only if the logged in user is:
 * - admin
 * - and is not the user to manage.
 */
exports.adminAndNotMyselfRequired = function (req, res, next) {
    const {isAdmin} = req.session.user,
        isAnother = req.user.id !== req.session.user.id;

    if (isAdmin && isAnother) {
        next();
    } else {
        res.status(403);
        throw new Error("Forbidden");
    }
};


/*
 * User authentication: Checks that the user is registered.
 *
 * Return a Promise that searches a user with the given login, and checks that
 * the password is correct.
 * If the authentication is correct, then the promise is satisfied and returns
 * an object with the User.
 * If the authentication fails, then the promise is also satisfied, but it
 * returns null.
 */
const authenticate = (login, password) => models.user.findOne({"where": {"username": login}}).
    then((user) => user && user.verifyPassword(password) ? user : null);// GET /   -- Login form

exports.new = (req, res) => {
    // Page to go/show after login:
    const {redir} = req.query;

    if (req.session && req.session.user) {
        res.redirect(redir ? redir : "/escapeRooms");
        return;
    }
    res.render("index", {redir});
};


// POST /   -- Create the session if the user authenticates successfully
exports.create = async (req, res, next) => {
    const {redir} = req.body,
        {login} = req.body,
        {password} = req.body;

    try {
        const user = await authenticate((login || "").toLowerCase(), password);

        if (user) {
            req.session.user = {"id": user.id,
                "name": user.name + " " + user.surname,
                "username": user.username,
                "isAdmin": user.isAdmin,
                "isStudent": user.isStudent,
                "expires": Date.now() + maxIdleTime};
            req.session.save(() => {
                if (req.body.redir) {
                    res.redirect(req.body.redir);
                } else {
                    res.redirect("/escapeRooms");
                }
            });
        } else {
            req.flash("error", req.app.locals.i18n.user.wrongCredentials);
            res.render("index", {redir});
        }
    } catch (error) {
        console.error(error);
        req.flash("error", `${error}`);
        next(error);
    }
};

// DELETE /  --  Close the session
exports.destroy = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid", {"path": "/"});
        res.redirect("/"); // Redirect to login page
    });
};
