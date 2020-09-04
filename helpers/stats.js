exports.count = (array) => array.length;
exports.max = (array) => Math.max.apply(null, array);
exports.min = (array) => Math.min.apply(null, array);
exports.range = (array) => exports.max(array) - exports.min(array);
exports.sum = (array) => {
    let num = 0;

    for (let i = 0, l = array.length; i < l; i++) {
        num += array[i];
    }
    return num;
};
exports.mean = (array) => exports.sum(array) / array.length;
exports.median = (array) => {
    array.sort(function (a, b) {
        return a - b;
    });
    const mid = array.length / 2;

    return mid % 1 ? array[mid - 0.5] : (array[mid - 1] + array[mid]) / 2;
};
exports.variance = (array) => {
    const mean = exports.mean(array);

    return exports.mean(array.map(function (num) {
        return Math.pow(num - mean, 2);
    }));
};
exports.std = (array) => Math.sqrt(exports.variance(array));
