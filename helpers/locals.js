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


    app.locals.formatTime = function (currentDate) {
        currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
        return `${zeroPadding(currentDate.getHours())}:${zeroPadding(currentDate.getMinutes())}`;
    };

    app.locals.getDashDate = function (currentDate) {
        return `${currentDate.getDate()}-${currentDate.getMonth()}-${currentDate.getFullYear()}`;
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
        const arr = [
            dDisplay,
            hDisplay,
            mDisplay,
            sDisplay
        ].filter((a) => a !== "").join(", ");

        return arr;
    };
};
