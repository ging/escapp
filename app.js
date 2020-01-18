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

dotenv.config();
const api = require("./routes/api");
const index = require("./routes/index"),

    app = express();// View engine setup

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (app.get("env") === "production") {
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
app.use(bodyParser.urlencoded({
    "extended": true
}));
app.use(cookieParser());
app.use("/api", api);

// Configuracion de la session para almacenarla en BBDD usando Sequelize.
const sequelize = require("./models");
const sessionStore = new SequelizeStore({"db": sequelize,
    "table": "session",
    "checkExpirationInterval": 15 * 60 * 1000,
    "expiration": 3 * 60 * 60 * 1000});

const sessionMiddleware = session({"secret": "Escape Room",
    "store": sessionStore,
    "resave": false,
    "saveUninitialized": true});

app.sessionMiddleware = sessionMiddleware;
app.use(sessionMiddleware);

app.use(methodOverride("_method", {"methods": [
    "POST",
    "GET"
]}));
app.use(express.static(path.join(__dirname, "public")));

app.use(i18n({
    "translationsPath": path.join(__dirname, "i18n"),
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
app.use((req, res, next) => {
    const err = new Error("Not Found");

    err.status = 404;
    res.locals.message = "Not found";
    res.locals.error = process.env.NODE_ENV === "development" ? err : {"status": 404};
    next(err);
});

// Error handler. It needs to have all 4 arguments, or else express will not recognize it as an erorr handler
// eslint-disable-next-line  no-unused-vars
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    if (req.session && req.session.flash) {
        // Set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = process.env.NODE_ENV === "development" ? err : {"status": err.status};
        // Render the error page
        res.render("error");
    } else {
        res.send(err);
    }
});


module.exports = app;
