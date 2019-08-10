const express = require("express");
const path = require("path");
// Var favicon = require('serve-favicon');
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session"),
    SequelizeStore = require("connect-session-sequelize")(session.Store);
const partials = require("express-partials");
const flash = require("express-flash");
const methodOverride = require("method-override");
const dotenv = require("dotenv");
const i18n = require("i18n-express");

dotenv.config();

const api = require("./routes/api");
const index = require("./routes/index"),

    app = express();// View engine setup

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (app.get("env") === "production") {
    app.use((req, res, next) => {
        if (req.headers["x-forwarded-proto"] !== "https") {
            res.redirect(`https://${req.get("Host")}${req.url}`);
        } else {
            next();
        }
    });
}

/*
 * Uncomment after placing your favicon in /public
 * app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
 */
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));
app.use(cookieParser());
app.use("/api", api);

// Configuracion de la session para almacenarla en BBDD usando Sequelize.
const sequelize = require("./models");
const sessionStore = new SequelizeStore({"db": sequelize,
    "table": "session",
    "checkExpirationInterval": 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds. (15 minutes)
    "expiration": 3 * 60 * 60 * 1000});// The maximum age (in milliseconds) of a valid session. (4 hours)

app.use(session({"secret": "Escape Room",
    "store": sessionStore,
    "resave": false,
    "saveUninitialized": true}));

app.use(methodOverride("_method", {"methods": [
    "POST",
    "GET"
]}));
app.use(express.static(path.join(__dirname, "public")));

app.use(i18n({
    "translationsPath": path.join(__dirname, "i18n"), // <--- use here. Specify translations files path.
    "siteLangs": ["es"],
    "defaultLang": "es",
    "textsVarName": "i18n"
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


app.use("/", index);

// Catch 404 and forward to error handler
app.use((req, res) => {
    const err = new Error("Not Found");

    err.status = 404;
    res.locals.message = "Not found";
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.render("error");
    next(createError(404));
});

// Error handler
app.use((err, req, res) => {
    // Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // Render the error page
    res.status(err.status || 500);
    res.render("error");
});


module.exports = app;
