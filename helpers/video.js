const patt1 = /youtube.com\/watch\?v=(.*)/;
const patt2 = /youtube.com\/embed\/(.*)/;
const patt3 = /youtu.be\/(.*)/;

const parseURL = (url = "") => {
    if (patt2.exec(url)) {
        return url;
    }
    const code = patt1.exec(url);

    if (code) {
        return `https://www.youtube.com/embed/${code[1]}`;
    }
    const code2 = patt3.exec(url);

    if (code2) {
        return `https://www.youtube.com/embed/${code2[1]}`;
    }
    return false;
};

module.exports = {parseURL};
