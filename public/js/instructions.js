$(function(){

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

        //  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        ['image'],
        ['clean']                                         // remove formatting button
    ];
    var range, value, quill;
    function imageHandler() {
        range = this.quill.getSelection();
        quill = this.quill;
        $( "#dialog-gallery" ).dialog( "open" );
        return false;
    }

    var options = {
        modules: {
            toolbar: { container: toolbarOptions, handlers: {image: imageHandler}},
            imageResize: {},
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

    $("#dialog-gallery").dialog({
      autoOpen: false,
      resizable: false,
      width: screen.width > 1000 ? 900 : screen.width*0.9,
      height: "auto",
      show: {
        effect: "blind",
        duration: 100
      },
      hide: {
        effect: "explode",
        duration: 400
      },
      appendTo: '.main',
      buttons: {
        "accept": function () {
            if(value && value.mime){
                if (value.mime.match("image")) {
                    quill.insertEmbed(range.index, 'image', value.url, Quill.sources.USER);
                } else if (value.mime.match("video")) {
                    quill.insertEmbed(range.index, 'video', value.url, Quill.sources.USER);
                } else if (value.mime.match("audio")) {
                    quill.insertEmbed(range.index, 'audio', value.url, Quill.sources.USER);
                } else {
                    quill.insertText(0, "");
                    var delta = {
                      ops: [
                        {retain: 1},
                        {insert: value.name, attributes: {link: value.url}}
                      ]
                    };
                    quill.updateContents(delta);
                }
            } 
            $(".file-selected").removeClass("file-selected");
            value = null;
            $( "#dialog-gallery" ).dialog( "close" );
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
        value = Dropzone.instances[0].files[idx];
        parent.addClass("file-selected");
    });

});