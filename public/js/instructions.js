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

        ['clean']                                         // remove formatting button
    ];
    var options = {
        modules: {
            toolbar: toolbarOptions,
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
});