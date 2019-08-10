const converter = require("json-2-csv");

exports.createCsvFile = (res, content, title = `results-${Date.now()}`, field = ";") => {
    converter.json2csv(
	    content,
	    (err, csvText) => {
	        if (err) {
	            next(err);
	            return;
	        }
	        res.setHeader("Content-Type", "text/csv");
	        res.setHeader("Content-Disposition", `attachment; filename=${title}.csv`);
	        res.write(csvText);
	        res.end();
	    },
	    {
	        "delimiter": {
	            field
	        }
	    }
    );
};
