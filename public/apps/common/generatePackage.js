const pkg = {};
pkg.generatePackage  = (state) => {
    JSZipUtils.getBinaryContent(state.scormVersion === "2004" ? "scorm2004.zip":"scorm12.zip", function(err, data) {
        if (err) {
            throw err; // or handle err
        }
        JSZip.loadAsync(data).then(function(zip) {
        	let indexContent = pkg.generateIndex(state)
			zip.file('index.html', indexContent);
            if (state.moodleXmlPath) {
                zip.file("assets/quiz.xml", pkg.decode(state.moodleXmlPath));
            } 
			zip.generateAsync({ type: "blob" }).then(function(blob) {
                FileSaver.saveAs(blob, state.title.toLowerCase().replace(/\s/g, '') + Math.round(+new Date() / 1000) + (state.scormVersion === "2004" ? "_2004" : "_1.2") + ".zip");
            });
        }) 
    });
 
}
pkg.decode = (input) => {
    return decodeURIComponent(window.atob(input.slice(21)).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''))
}

pkg.generateIndex = (state) => {
    let parsedState = JSON.stringify({...state, content: undefined, moodleXmlPath: state.moodleXmlPath ? "assets/quiz.xml" : undefined});
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${state.title || "Quiz"}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro" rel="stylesheet">
 </head>
<body>
<div id="root"></div>
<script> window.config=JSON.parse('${parsedState}');</script>
<script type="text/javascript" src="bundle.js"></script>
</body>
</html>`;
}