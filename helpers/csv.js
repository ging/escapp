const converter = require("json-2-csv");

exports.createCsvFile = (res, content, title = `results-${Date.now()}`, field = ";") => {
    converter.json2csv(
        content,
        (err, csvText) => {
            if (err) {
                throw new Error("Error");
            }
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename=${title}.csv`);
            res.write("\uFEFF" + csvText);
            res.end();
        },
        {"delimiter": {field}}
    );
};
