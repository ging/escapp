const {steps} = require("./progress");
const {getContentForPuzzle} = require("./utils");

module.exports = function (app) {
    const zeroPadding = (d) => {
        if (d < 10) {
            return `0${d}`;
        }
        return d;
    };

    app.locals.zeroPadding = zeroPadding;
    app.locals.getFullDate = (d) => {
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return `${zeroPadding(d.getDate())}-${zeroPadding(d.getMonth() + 1)}-${d.getFullYear()} ${zeroPadding(d.getHours())}:${zeroPadding(d.getMinutes())}`;
    };
    app.locals.getFullDateY = (d) => {
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());

        return `${d.getFullYear()}-${zeroPadding(d.getMonth() + 1)}-${zeroPadding(d.getDate())} ${zeroPadding(d.getHours())}:${zeroPadding(d.getMinutes())}`;
    };
    app.locals.formatTime = function (currentDate) {
        currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
        return `${zeroPadding(currentDate.getHours())}:${zeroPadding(currentDate.getMinutes())}`;
    };

    app.locals.getDashDate = function (currentDate) {
        // CurrentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
        return `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    };

    app.locals.zeroPadding = function (hour) {
        if (hour < 10) {
            return `0${hour}`;
        }
        return hour;
    };

    app.locals.secondsToDhms = function (secs) {
        const seconds = Number(secs);
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);

        const dDisplay = d > 0 ? `${d}d` : "";
        const hDisplay = h > 0 ? `${h}h` : "";
        const mDisplay = m > 0 ? `${m}m` : "";
        const sDisplay = s > 0 ? `${s}s` : "";

        return [
            dDisplay,
            hDisplay,
            mDisplay,
            sDisplay
        ].filter((a) => a !== "").join(", ");
    };


    app.locals.getGradientColor = function (grade, threshold = 50, margin = 10) {
        if (grade < threshold - margin) {
            return "var(--lightred)";
        } else if (grade >= threshold - margin && grade <= threshold + margin) {
            return "var(--brightorange)";
        } else if (grade > threshold + margin) {
            return "var(--brightgreen)";
        }
    };

    app.locals.steps = steps;
    app.locals.getContentForPuzzle = getContentForPuzzle;
    app.locals.analyticsSections = () => ({
        "ranking": {
            "url": "/ranking",
            "icon": "event_seat"
        },
        "retosSuperados": {
            "url": "/puzzles/teams",
            "icon": "check"
        },
        "progress": {
            "url": "/progress",
            "icon": "timelapse"
        },
        "timeline": {
            "url": "/timeline",
            "icon": "timeline"
        },
        "hints": {
            "url": "/hints/teams",
            "icon": "search"
        },
        "histogram": {
            "url": "/histogram",
            "icon": "equalizer"
        },
        "grading": {
            "url": "/grading",
            "icon": "school"
        }
    });
};
