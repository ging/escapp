$(function(){
    const icons = Quill.import('ui/icons');

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
    
    icons.image = `<svg height="24px" id="Layer_1" version="1.1" viewBox="0 0 24 24" width="24px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g>
            <path class="ql-even ql-stroke"  d="M23,4V2.1C23,1.5,22.5,1,21.9,1H9.8L9,0H1.1C0.5,0,0,0.5,0,1.1v21.8C0,23.5,0.5,24,1.1,24h21.8c0.6,0,1.1-0.5,1.1-1.1V5.1   C24,4.5,23.6,4.1,23,4z M22,22H2V2h6l3,4h11V22z M22,4H12l-1.5-2H22V4z"/>
            <polygon class="ql-even ql-stroke"  points="11,9 11,13 7,13 7,15 11,15 11,19 13,19 13,15 17,15 17,13 13,13 13,9  "/>
        </g>
    </svg>`;

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
            const selected = $('input[name=file-gallery-source]:checked').attr('id');
            if (selected === 'sourceFile') {
                if(fileSelected && fileSelected.mime){
                    if (fileSelected.mime.match("image")) {
                        quill.insertEmbed(range.index, 'image', fileSelected.url, Quill.sources.USER);
                    } else if (fileSelected.mime.match("video")) {
                        quill.insertEmbed(range.index, 'video', fileSelected.url, Quill.sources.USER);
                    } else if (fileSelected.mime.match("audio")) {
                        quill.insertEmbed(range.index, 'audio', fileSelected.url, Quill.sources.USER);
                    } else {
                        quill.insertText(0, "");
                        var delta = {
                          ops: [
                            {retain: 1},
                            {insert: fileSelected.name, attributes: {link: fileSelected.url}}
                          ]
                        };
                        quill.updateContents(delta);
                    }
                } 
            } else if (selected === "sourceUrl") {
                const url = $('#urlInput').val();
                if (url) {
                    const youtube = url.match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))(.*)/);
                    if (youtube && youtube[5]) {
                        quill.insertEmbed(range.index, 'video', "https://www.youtube.com/embed/" + youtube[5] , Quill.sources.USER);
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

});