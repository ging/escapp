const {authenticate} = require("../helpers/utils");
const {models} = require("../models");
const query = require("../queries");
const fs = require("fs")
const path = require("path")
/*
 * This variable contains the maximum inactivity time allowed without
 * Making requests.
 * If the logged user does not make any new request during this time,
 * Then the user's session will be closed.
 * The value is in milliseconds.
 * 5 minutes.
 */
const maxIdleTime = 3 * 60 * 60 * 1000; /* * * Middleware used to destroy the user's session if the inactivity time * has been exceeded. * */

exports.maxIdleTime = maxIdleTime;

exports.deleteExpiredUserSession = (req, res, next) => {
    const {i18n} = res.locals;

    if (req.session.user) { // There exists a user session
        if (req.session.user.expires < Date.now()) { // Expired
            delete req.session.user; // Logout
            req.flash("info", i18n.user.sessionExpired);
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
        if (!req.session.user.lastAcceptedTermsDate | (req.session.user.lastAcceptedTermsDate < process.env.LAST_MODIFIED_TERMS_OR_POLICY)) {
            res.redirect("/accept-new");
        }
        next();
    } else {
        res.redirect(`/?redir=${req.param("redir") || req.url}`);
    }
};

exports.logoutRequired = (req, res, next) => {
    if (!req.session.user) {
        next();
    } else {
        res.redirect("/escapeRooms");
    }
};

// MW that allows to pass only if the logged user in is admin.
exports.adminRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin);
    const {i18n} = res.locals;

    if (isAdmin) {
        next();
    } else {
        res.status(403);
        throw new Error(i18n.api.forbidden);
    }
};

// MW that allows to pass only if the logged user in is not a student.

exports.notStudentRequired = (req, res, next) => {
    const isNotStudent = !req.session.user.isStudent;
    const {i18n} = res.locals;

    if (isNotStudent) {
        next();
    } else {
        res.status(403);
        throw new Error(i18n.api.forbidden);
    }
};

// MW that allows to pass only if the logged user in is a student.

exports.studentRequired = (req, res, next) => {
    const {isStudent} = req.session.user;
    const {i18n} = res.locals;

    if (isStudent) {
        next();
    } else {
        res.status(403);
        throw new Error(i18n.api.forbidden);
    }
};

// MW that allows to pass only if the logged user in is admin or student.

exports.studentOrAdminRequired = (req, res, next) => {
    const isStudent = Boolean(req.session.user.isStudent),
        isAdmin = Boolean(req.session.user.isAdmin);
    const {i18n} = res.locals;

    if (isStudent || isAdmin) {
        next();
    } else {
        res.status(403);
        throw new Error(i18n.api.forbidden);
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
    const {i18n} = res.locals;

    if (isAdmin || isMyself) {
        next();
    } else {
        res.status(403);
        throw new Error(i18n.api.forbidden);
    }
};

// MW that allows actions only if the user logged in is admin or is the author of the escape room.
exports.adminOrAuthorRequired = (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;
    const {i18n} = res.locals;

    if (isAdmin || isAuthor) {
        next();
    } else {
        res.status(403);
        next(new Error(i18n.api.forbidden));
    }
};

// MW that allows actions only if the user logged in is admin, the author, or a participant of the escape room.
exports.adminOrAuthorOrParticipantRequired = async (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    try {
        if (isAdmin || isAuthor) {
            next();
            return;
        }
        const participants = await models.user.findAll(query.user.escapeRoomsForUser(req.escapeRoom.id, req.session.user.id));

        req.participant = participants && participants.length ? participants[0] : null;
        if (req.participant) {
            next();
        } else {
            res.redirect("back");
        }
    } catch (error) {
        next(error);
    }
};

// MW that allows actions only if the user logged in is a participant of the escape room.
exports.participantRequired = async (req, res, next) => {
    const isAdmin = Boolean(req.session.user.isAdmin),
        isAuthor = req.escapeRoom.authorId === req.session.user.id;

    try {
        if (isAdmin || isAuthor) {
            res.status(403);
            throw new Error("Forbidden");
        }
        const participants = await models.user.findAll(query.user.escapeRoomsForUser(req.escapeRoom.id, req.session.user.id));

        req.participant = participants && participants.length ? participants[0] : null;
        if (req.participant) {
            next();
        } else {
            res.redirect("back");
        }
    } catch (error) {
        next(error);
    }
};


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
    const {redir, login, password} = req.body;
    const {i18n} = res.locals;

    try {
        const user = await authenticate((login || "").toLowerCase(), password);

        if (user) {
            req.session.user = {
                "id": user.id,
                "name": `${user.name} ${user.surname}`,
                "username": user.username,
                "isAdmin": user.isAdmin,
                "isStudent": user.isStudent,
                "expires": Date.now() + maxIdleTime
            };

            req.session.save(() => {
                if (user.lang) {
                    res.cookie("locale", user.lang);
                }
                if (req.body.redir) {
                    res.redirect(req.body.redir);
                } else {
                    res.redirect("/escapeRooms");
                }
            });
        } else {
            req.flash("error", i18n.user.wrongCredentials);
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

// POST ACCEPT COOKIES
exports.cookieAccept = (req, res) => {
    res.cookie("cookieAccepted", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });
    res.sendStatus(200);
}


exports.terms = (req, res, next) => {
    const {i18n} = res.locals;
    const currentLang = i18n.lang;
    const op = {
        root: path.join("public")
    };
    if (fs.existsSync('../public/terms/terms_'+currentLang+'.html')) {
        res.sendFile('terms/terms_'+currentLang+'.html', op)
    } else if (fs.existsSync('../public/terms/terms_'+currentLang+'.pdf')) {
        res.sendFile('terms/terms_'+currentLang+'.pdf', op)
    } else if (fs.existsSync('../public/terms/terms.html')) {
        res.sendFile('terms/terms.html', op)
    } else if (fs.existsSync('../public/terms/terms.pdf')) {
        res.sendFile('terms/terms.pdf', op)
    } else if (fs.existsSync('../public/terms/terms_en.html')) {
        res.sendFile('terms/terms_en.html', op)
    } else if (fs.existsSync('../public/terms/terms_en.pdf')) {
        res.sendFile('terms/terms_en.pdf', op)
    }else {
        res.sendFile('default_terms/default.html', op, 
            function (error) {
                if (error) {
                    next(error);
                } else {
                    console.log('File Sent');
                }
        });
    }
};

exports.privacy = (req, res, next) => {
    const {i18n} = res.locals;
    const currentLang = i18n.lang;
    const op = {
        root: path.join("public")
    };
    if (fs.existsSync('../public/privacy/privacy_'+currentLang+'.html')) {
        res.sendFile('privacy/privacy_'+currentLang+'.html', op)
    } else if (fs.existsSync('../public/privacy/privacy_'+currentLang+'.pdf')) {
        res.sendFile('privacy/privacy_'+currentLang+'.pdf', op)
    } else if (fs.existsSync('../public/privacy/privacy.html')) {
        res.sendFile('privacy/privacy.html', op)
    } else if (fs.existsSync('../public/privacy/privacy.pdf')) {
        res.sendFile('privacy/privacy.pdf', op)
    } else if (fs.existsSync('../public/privacy/privacy_en.html')) {
        res.sendFile('privacy/privacy_en.html', op)
    } else if (fs.existsSync('../public/privacy/privacy_en.pdf')) {
        res.sendFile('privacy/privacy_en.pdf', op)
    } else {
        res.sendFile('default_privacy/default.html', op, 
            function (error) {
                console.log(error)
                if (error) {
                    next(error);
                } else {
                    console.log('File Sent');
                }
        });
    }
};

exports.acceptNewShow = (req, res, next) => {
    res.render("users/new_terms", {});
}

exports.acceptNew = async (req, res, next) => {
    const {i18n} = res.locals;
    try {
        if (!req.session.user) {
            return res.status(401).send({ error: i18n.api.unauthorized });
        }

        const userId = req.session.user.id;
        const lastAcceptedTermsDate =  new Date();
        // Update the lastAcceptedTermsDate in the database
        await models.user.update(
            { lastAcceptedTermsDate: lastAcceptedTermsDate },
            { where: { id: userId } }
        );

        // Update session user data
        req.session.user.lastAcceptedTermsDate = lastAcceptedTermsDate;

        // Redirect user to dashboard or another relevant page
        res.redirect('/'); // Adjust this route if needed
    } catch (error) {
        console.error(i18n.terms.error_accepting, error);
        next(error);
    }
};
