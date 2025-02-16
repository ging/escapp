const express = require("express");
const path = require("path");
// Var favicon = require('serve-favicon');
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const partials = require("express-partials");
const flash = require("express-flash");
const methodOverride = require("method-override");
const dotenv = require("dotenv");
const i18n = require("i18n-express");
const cors = require("cors");
const compression = require("compression");
// Const helmet =  require('helmet');

dotenv.config();
const api = require("./routes/api");
const index = require("./routes/index"),
    app = express();// View engine setup

// To compress all routes
app.use(compression());
// Security headers, commented because it fails with CSP
// TODO, study options and configure accordingly
// App.use(helmet());


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (app.get("env") === "production" && !process.env.HEROKU) {
    app.use((req, res, next) => {
        if (req.secure) {
            next();
        } else {
            res.redirect(`https://${req.get("Host")}${req.url}`);
        }
    });
}


app.use(cors());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(i18n({
    "translationsPath": path.join(__dirname, "i18n"),
    "siteLangs": ["en", "es"],
    "locales": ["en", "es"],
    "cookieLangName": "locale",
    "defaultLang": "en",
    "textsVarName": "i18n"
}));

app.use(function (req, res, next) {
    res.locals.i18n = req.app.locals.i18n;
    next();
});


app.use("/api", api);


app.get("/", function (req, res, next) {
    if (req.query.clang) {
        res.cookie("locale", req.query.clang);
        res.redirect(req.headers.referer);
    } else {
        next();
    }
});


// Configuracion de la session para almacenarla en BBDD usando Sequelize.
const sequelize = require("./models");
const sessionStore = new SequelizeStore({
    "db": sequelize,
    "table": "session",
    "checkExpirationInterval": 15 * 60 * 1000,
    "expiration": 3 * 60 * 60 * 1000
});

const sessionMiddleware = session({
    "secret": process.env.SECRET || "Escape Room",
    "store": sessionStore,
    "resave": false,
    "cookie": {
        "path": "/",
        "httpOnly": true,
        "secure": app.get("env") === "production" && !process.env.HEROKU,
        "maxAge": null
    },
    "saveUninitialized": false
});


app.sessionMiddleware = sessionMiddleware;

app.use(sessionMiddleware);

app.use(methodOverride("_method", {
    "methods": [
        "POST",
        "GET"
    ]
}));

app.use(partials());
require("./helpers/locals")(app);

app.use(flash());

// Dynamic Helper:
app.use((req, res, next) => {
    // To use req.session in the views
    res.locals.session = req.session;
    res.locals.url = req.url;
    next();
});

// Middleware to set cookie consent status globally for views
app.use((req, res, next) => {
    res.locals.cookieAccepted = (req && req.cookies) ? req.cookies.cookieAccepted === "true" : false;
    next();
});

app.use("/", index);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error("Not found");

    err.status = 404;
    err.message = "NOT_FOUND";
    res.locals.message = "Not found";
    res.locals.error = app.get("env") === "production" ? {"status": 404} : err;
    next(err);
});

// Error handler. It needs to have all 4 arguments, or else express will not recognize it as an erorr handler
// eslint-disable-next-line  no-unused-vars
app.use((err, req, res, next) => {
    // eslint-disable-next-line  eqeqeq
    const devStatusCode = res.statusCode == 200 ? 500 : res.statusCode;
    const status = err.status || (app.get("env") === "production" ? 404 : devStatusCode);

    res.status(status);
    if (req.session && req.session.flash) {
        // Set locals, only providing error in development
        res.locals.message = err.message;
        err.status = err.status || res.statusCode;
        res.locals.error = app.get("env") === "production" ? {"status": err.status || 404} : err;
        // Render the error page
        res.render("error");
    } else {
        res.json({"code": "ERROR", "msg": err.message});
    }
});

module.exports = app;
