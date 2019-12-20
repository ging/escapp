$(function(){
    

    const BlockEmbed = Quill.import('blots/block/embed');
    class AudioBlot extends BlockEmbed {
      static create(url) {
        let node = super.create();
        node.setAttribute('src', url);
        node.setAttribute('controls', '');
        return node;
      }
      
      static value(node) {
        return node.getAttribute('src');
      }
    }
    AudioBlot.blotName = 'audio';
    AudioBlot.tagName = 'audio';
    Quill.register(AudioBlot);
    Quill.register('modules/VideoResize', VideoResize);

    const icons = Quill.import('ui/icons');
    icons.preview = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 511.999 511.999"  xml:space="preserve"><g><g><path d="M508.745,246.041c-4.574-6.257-113.557-153.206-252.748-153.206S7.818,239.784,3.249,246.035    c-4.332,5.936-4.332,13.987,0,19.923c4.569,6.257,113.557,153.206,252.748,153.206s248.174-146.95,252.748-153.201    C513.083,260.028,513.083,251.971,508.745,246.041z M255.997,385.406c-102.529,0-191.33-97.533-217.617-129.418    c26.253-31.913,114.868-129.395,217.617-129.395c102.524,0,191.319,97.516,217.617,129.418    C447.361,287.923,358.746,385.406,255.997,385.406z"/></g></g><g><g><path d="M255.997,154.725c-55.842,0-101.275,45.433-101.275,101.275s45.433,101.275,101.275,101.275    s101.275-45.433,101.275-101.275S311.839,154.725,255.997,154.725z M255.997,323.516c-37.23,0-67.516-30.287-67.516-67.516    s30.287-67.516,67.516-67.516s67.516,30.287,67.516,67.516S293.227,323.516,255.997,323.516z"/></g></g></svg>`;

    var toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
        ['link'/*, 'image'*/],
        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction

        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'appearance': [ 'litera', 'cerulean', 'journal', 'sketchy', 'darkly', 'cyborg' ] }],
        //  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        ['clean'],                                         // remove formatting button
        ['image']
    ];

    var range, fileSelected, quill;
    function imageHandler() {
        quill = this.quill;
        range = quill.getSelection();
        $( "#dialog-gallery" ).dialog( "open" );
        return false;
    }

    function appearanceHandler(lang, node) {
        $('body link')[2].href = `http://localhost:3000/stylesheets/vendor/bootswatch/${lang || "cerulean"}.editor.bootstrap.min.css`;
        $('#appearance').val(lang);
        return lang;
    }

    var options = {
        modules: {
            toolbar: { container: toolbarOptions, handlers: {image: imageHandler, appearance: appearanceHandler}},
            imageResize: {},
            videoResize: {},
            clipboard: {}
        },
        placeholder: 'Write here your escape room instructions',
        readOnly: false,
        theme: 'snow'
    };

    var editor = new Quill('#editor', options);
    $('#instructionsForm').on("submit", e => {
        let content = document.getElementsByClassName('ql-editor')[0].innerHTML;
        $('#instructions').val( (content));
        return true;
    });

    editor.clipboard.addMatcher (Node.ELEMENT_NODE, function (node, delta) {
        const attributes = {
            'font': false,
            'strike': false,
            'direction': false,
            'color': false
        };
        delta.ops = delta.ops.map(op=>{
            return {
                insert: op.insert,
                attributes: {
                    ...op.attributes, ...attributes
                }
            }
        });
        return delta;
    });

    const insertContent = (index, url = "", mime = "", name = "") => {
        if (mime.match("image")) {
            quill.insertEmbed(index, 'image', url, Quill.sources.USER);
            quill.formatText(index, 1, 'width', '30%');
        } else if (mime.match("video")) {
            quill.insertEmbed(index, 'video', url, Quill.sources.USER);
        } else if (mime.match("audio")) {
            quill.insertEmbed(index, 'audio', url, Quill.sources.USER);
        } else {
            quill.insertText(index, "");
            var delta = {
              ops: [
                {retain: index-1},
                {insert: name, attributes: {link: url}}
              ]
            };
            quill.updateContents(delta);
        }
    }
    const imageExt = ["bmp","jpg","gif","jpeg","png","svg"];
    const videoExt = ["3gp","avi","mp4","flv","webm","wmv","mp4","mpeg"];
    const audioExt = ["mp3","aac","wav","aif","wma","mid","mpg","mp4a","weba"];

    $("#dialog-gallery").dialog({
      autoOpen: false,
      resizable: false,
      width: screen.width > 1000 ? 900 : screen.width*0.9,
      height: "auto",
      show: {
        effect: "fade",
        duration: 300
      },
      hide: {
        effect: "fade",
        duration: 300
      },
      appendTo: '.main',
      buttons: {
        "accept": function () {
            const selected = $('input[name=file-gallery-source]:checked').attr('id');
            if (selected === 'sourceFile') {
                if(fileSelected && fileSelected.mime){
                    const mime = fileSelected.mime;
                    insertContent(range.index, fileSelected.url, fileSelected.mime, fileSelected.name);
                } 
            } else if (selected === "sourceUrl") {
                let url = $('#urlInput').val();
                if (url) {
                    const youtube = url.match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))(.*)/);
                    if (youtube && youtube[5]) {
                        quill.insertEmbed(range.index, 'video', "https://www.youtube.com/embed/" + youtube[5] , Quill.sources.USER);
                    } else {
                        var xhttp = new XMLHttpRequest();
                        xhttp.open('HEAD', url);

                        var onerror = function () {
                            let parts = url.toString().toLowerCase().split('.');
                            if (parts && parts.length > 0) {
                                const ext = parts[parts.length - 1];
                                if (imageExt.indexOf(ext) > -1) {
                                    insertContent(range.index, url, "image/"+ext, "immge");
                                } else if (videoExt.indexOf(ext) > -1) {
                                    insertContent(range.index, url, "video/"+ext, "video");
                                } else if (audioExt.indexOf(ext) > -1) {
                                    insertContent(range.index, url, "audio/"+ext, "audio");
                                } else {
                                    insertContent(range.index, url);
                                }
                            }
                        };
                        xhttp.onreadystatechange = function () {
                            if (this.readyState == this.DONE && this.status < 400) {
                                const mime = this.getResponseHeader("Content-Type");
                                insertContent(range.index, url, mime, url);

                            } 
                        };
                        xhttp.onerror = onerror;

                        xhttp.send();
                    }
                }
            }
            
            $(".file-selected").removeClass("file-selected");
            fileSelected = null;
            $( "#dialog-gallery" ).dialog("close");
        },
        "cancel": function () {
            $(".file-selected").removeClass("file-selected");
            $( "#dialog-gallery" ).dialog( "close" );
        }
      }
    });

    $(document).on('click','.dz-preview *', function(){
        $(".file-selected").removeClass("file-selected");
        let parent = $(this).parent('.dz-preview');
        const idx = $('.dz-preview').index(parent);
        fileSelected = Dropzone.instances[0].files[idx];
        parent.addClass("file-selected");
        $('#sourceUrl').prop('checked', false);
        $('#sourceFile').prop('checked', true);
    });

    $(document).on('click','#urlInput', function(){
        $('#sourceUrl').prop('checked', true);
        $('#sourceFile').prop('checked', false);
    });

    $($('.ql-appearance .ql-picker-label')[0]).data("value", appearance)
});