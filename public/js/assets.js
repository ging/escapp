
    Dropzone.options.assetsForm = {
        "paramName": "assets", // The name that will be used to transfer the file
        "maxFilesize": 10, // MB
        clickable: "#uploadNew, .dropzone",
        "addRemoveLinks": true,
        "accept": function(file, done) {
            done();
        },
        "success": function(file, {id, url}) {
           file.id = id;
           file.mime = file.type;
           file.url = url;
           if (window.uploadCallback) {
               window.uploadCallback(file);
           }
        },
        "removedfile": function(file) {
            if (file.id) {
                fetch("/escapeRooms/"+ escapeRoomId +"/deleteAssets/" + file.id + "?method=DELETE",
                 {method: "POST"})
                .then(res=> {
                    if (res.status === 200) {
                        res.json()
                         .then(msg => file.previewElement.remove())
                    } else {
                        res.json()
                         .then(msg => {throw new Error(msg.msg)})
                    }
                })
                .catch(err=> alert(err))
            } else {
                file.previewElement.remove();
            }
           
        },
        "dictDefaultMessage": i18nMsg.dictDefaultMessage,
        "dictFallbackMessage": i18nMsg.dictFallbackMessage,
        "dictFileTooBig": i18nMsg.dictFileTooBig,
        "dictInvalidFileTypedictResponseError": i18nMsg.dictInvalidFileTypedictResponseError,
        "dictCancelUpload": "clear",
        "dictUploadCanceled": i18nMsg.dictUploadCanceled,
        "dictCancelUploadConfirmation": i18nMsg.dictCancelUploadConfirmation,
        "dictRemoveFile": "delete",
        "dictRemoveFileConfirmation": i18nMsg.dictRemoveFileConfirmation,
        "dictMaxFilesExceeded": i18nMsg.dictMaxFilesExceeded
    };
$(function(){
    var dropzone = $("#assetsForm").get(0).dropzone;
    for (let a of assets) {
        let mockFile = { name: a.name, id: a.id, url: a.url, mime: a.mime, status: "success"};
        dropzone.files.push(mockFile)
        dropzone.options.addedfile.call(dropzone, mockFile);
        if (a.mime.match("image")) {
            dropzone.options.thumbnail.call(dropzone, mockFile, a.url);           
        }
        mockFile.previewElement.classList.add('dz-complete');
    }
});