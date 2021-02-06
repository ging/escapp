var selectedTheme = null;
var config = {
    "autoOpen": false,
    "resizable": false,
    "modal": true,
    "width": window.innerWidth > 1000 ? 900 : window.innerWidth*0.9,
    "height": "auto",
    "show": {
        "effect": "fade",
        "duration": 100
    },
    "hide": {
        "effect": "fade",
        "duration": 100
    },
    "appendTo": '.main'
};

var blockTemplate = (index, content, type, puzzles) => {
    var id = 'block-'+type+'-'+index+'-'+Date.now();
    return`
<div class="building-block" data-content-type="${type}" id="${id}" data-puzzles="${puzzles.join(",")}">
    ${content}
    ${window.endPoint === "indications" ?  "" : `<div class="block-config">
    ${window.endPoint === "class" ? '':
    `<button type="button" class="block-config-button config-btn" title="${window.i18n.setupVisualization}"><span class="material-icons">settings</span></button>` }
    <button type="button" class="block-config-button reorder-btn" title="${window.i18n.reorder}"><span class="material-icons">swap_vert</span></button>
    <button type="button" class="block-config-button delete-btn" title="${window.i18n.delete}"><span class="material-icons">delete</span></button>
        <div class="overlay-trigger" data-id="${id}">
                <p>${window.i18n.areYouSureDelete}</p>
                <button class="deleteButton" type="button" onclick="overlayTrigger('${id}', true)">${window.cancel}</button>
                <button class="acceptButton" type="button" onclick="deleteDef('${id}')">${window.accept}</button>
            </form>
        </div>
    </div>`}
</div>
`;}
var textEditorTemplate = (id, text) => `<div class="editor-wrapper 
${window.endPoint === 'indications' ? 'indications' : '' }">
    <div id="${id}" name="${id}" class="editor" spellcheck="false">${text}</div>
</div>`;

var rankingTemplate = ()=>`<div class="editor">
    <ranking>
        <div class="ranking-table table" style="height: 229px; ">
            <div class="ranking-row ranking-header table-primary" style="top: 0px;" >
                <div class="ranking-pos">#</div>
                <div class="ranking-team">${window.i18n.Team}</div>
                <div class="ranking-members">${window.i18n.Members}</div>
                <div class="ranking-res">${window.i18n.Progress}</div>
                <div class="ranking-time">${window.i18n.Time}</div>
            </div>
            <div class="ranking-row " style="top: 75px;">
                <div class="ranking-pos">1</div>
                <div class="ranking-team">${window.i18n.Team} 1</div>
                <div class="ranking-members">${window.i18n.Student} A, ${window.i18n.Student} B</div>
                <div class="ranking-res">3/3</div>
                <div class="ranking-time">1h 2min</div>
            </div>
            <div class="ranking-row " style="top: 150px;">
                <div class="ranking-pos">2</div>
                <div class="ranking-team">${window.i18n.Team} 2</div>
                <div class="ranking-members">${window.i18n.Student} C, ${window.i18n.Student} D</div>
                <div class="ranking-res">2/3</div>
                <div class="ranking-time">---</div>
            </div>
        </div>
    </ranking>
</div>`
var countdownTemplate = ()=> `<div class="editor" ><countdown/></div>`;
var progressBarTemplate = ()=> `<div class="editor" >
<progressbar>
    <div class="col-xs-12 col-md-8 col-md-push-2 col-lg-6 col-lg-push-3"  style="margin:auto;">
        <div class="progress">
            <div class="progress-bar puzzle-progress bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    </div>
</progressbar>
</div>
`;
var insertContent = (index, type, payload, puzzles) => {
    var content = "";
    var id = "ck-" + index + "-" + Date.now();
    switch(type){
        case "countdown":
            content = countdownTemplate();
            break;
        case "ranking":
            content = rankingTemplate();
            break;
        case "text":
            content = textEditorTemplate(id, payload.text);
            break;
        case "progress":
            content = progressBarTemplate();
            break;
        default:
    }
    var htmlContent = $(blockTemplate(index, content, type, puzzles));
    $('#custom-content').append(htmlContent);
    if (type === "text") {
        CKEDITOR.replace(id);
    }
};

var deleteDef = (id) => {
    var parent = $('#'+id);
    var type = parent.data("content-type"); 

    if (type === "text") {
        CKEDITOR.instances[ parent.find(".editor").attr("name")].destroy(); // TODO
    }
    parent.remove();
};

var overlayTrigger = (id, close) => {
    $('.overlay-trigger').hide();
    if (!close) {
        $('.overlay-trigger[data-id="' + id + '"]').show();
    }
};

$(()=>{

    for (var i in window.content) {
        var block = window.content[i];
        insertContent(i, block.type, block.payload, block.puzzles)
    }

    $(".theme-item").on("click", (ev)=>{
        selectedTheme = $(ev.currentTarget).data("value");
        $(".selected-theme").removeClass("selected-theme");
        $(ev.currentTarget).addClass("selected-theme");
    });
    
    if ($("#dialog-themes").length){
        $("#dialog-themes").dialog({...config,
            buttons: {
                [window.accept] : ()=>{
                    if (selectedTheme && $('#appearance').val() !== selectedTheme) {
                        window.theme = window.getTheme(selectedTheme);
                        $('#appearance').val(selectedTheme);
                        $('#theme-title').html(selectedTheme[0].toUpperCase() +  selectedTheme.slice(1));
                        for (var instance of Object.keys(CKEDITOR.instances)){
                            CKEDITOR.instances[instance].destroy();
                            CKEDITOR.replace(instance)
                        }
                        $('body link')[2].href = `/stylesheets/vendor/bootswatch/${selectedTheme || "cerulean"}.editor.bootstrap.min.css`;
                        $('#appearance').val(selectedTheme);
                    }
                    selectedTheme = null;
                    $( "#dialog-themes" ).dialog("close");
                    
                },
                [window.cancel] : ()=> {
                    selectedTheme = null;
                    $( "#dialog-themes" ).dialog("close");
                }
            }
        });
    }
    
    if ($("#dialog-config").length) {
        $("#dialog-config").dialog({...config,// "closeOnEscape": false,
            "buttons": {
                [window.accept] : ()=>{
                    $( "#dialog-config" ).dialog("close");
                    var result = []
                    var l = $(".puzzle-preview-select input").length - 1;
                    $(".puzzle-preview-select input").each((i,e)=>{
                        if ($(e).prop('checked')){
                            result.push(i < l ? i : "all");
                        }
                    });
                    
                    $('#'+window.blockId).data("puzzles", result.join(","));
                    $(".puzzle-preview-select input").prop('checked', false);
                },
                [window.cancel] : ()=> {
                    $( "#dialog-config" ).dialog("close");
                    window.blockId = null;
                    $(".puzzle-preview-select input").prop('checked', false);
                }
            }
        });
        $('#dialog-config').on('dialogclose', function(event) {
            $( "#dialog-config" ).dialog("close");
            window.blockId = null;
            $(".puzzle-preview-select input").prop('checked', false);
        });    
    }

    $( ".theme-btn" ).on("click",() => {
        $( "#dialog-themes" ).dialog( "open" );
    });
    $("body").on("click", ".config-btn", function(){
        var parent = $(this).parent().parent();
        window.blockId = parent.attr("id");
        var puzzleIds = parent.data("puzzles").toString()
        puzzleIds = puzzleIds === "" ? [] : puzzleIds.split(",");
        var puzzleInputs = $(".puzzle-preview-select input");
        puzzleInputs.each((i,e)=>{

            if ((puzzleIds.indexOf(i.toString()) !== -1) || (i.toString() == (puzzleInputs.length -1) && puzzleIds.indexOf("all") !== -1)) {
                $(e).prop('checked', true);
            }
        });
        $( "#dialog-config" ).dialog( "open" );
    });

    
    $("body").on("click", '.delete-btn', function(){
        var parent = $(this).parent().parent();
        var id = parent.attr("id");
        overlayTrigger(id);
    });

    $( ".add-content").on("click", function(){
        var type = this.dataset.content;
        var text = `<p>${window.placeholder}</p>`; 
        insertContent(0, type, {text}, puzzleList);
        window.scrollTo(0, $('.building-block').children().last().offset().top);
    });

    $('#custom-content').sortable({
        "items": ".building-block",
        "handle": '.reorder-btn',
        "cancel": '',
        "placeholder": "ui-sortable-placeholder",
        "stop": (_event, ui)=>{
           if (ui.item.data("content-type") === "text") {
            var instanceId = ui.item.find(".editor").attr("id")
            CKEDITOR.instances[instanceId].destroy();
            setTimeout(()=>{
                CKEDITOR.replace(instanceId);
            },0);
           }
        }
    });

    if ($( ".block-config" ).length) { $( ".block-config" ).disableSelection();}
    $('#instructionsForm').submit(()=>{
        var results = [];
        $('.building-block').each((_i,e)=>{
            var type = $(e).data("content-type");
            var puzzles = $(e).data("puzzles") !== "" ? $(e).data("puzzles").toString().split(",") : [];
            var obj = {type,puzzles};
            if ( type === "text") {
                var id = $(e).find(".editor").attr("id");
                obj.payload = {text: CKEDITOR.instances[id].getData()};
            }
            
            results.push(obj);
        });
        $("<input />").attr("type", "hidden")
          .attr("name", "instructions")
          .attr("value", JSON.stringify(results))
          .appendTo("#instructionsForm");

    });

    var videoCallback = (win) => {
        var iDoc = win.document;
        try {
            for (var vid of iDoc.getElementsByTagName('video')){
                vid.pause();
            }
            for (var ifr of iDoc.getElementsByTagName('iframe')){
                var win2 = ifr.contentWindow;
                try {
                    if (ifr.src.match("youtube")) {
                        if (!ifr.src.match("enablejsapi=1")){
                            ifr.src += ifr.src.match("\\?") ? "&enablejsapi=1":"?enablejsapi=1";
                        }
                        setTimeout(()=>{
                            win2.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
                        },800);
                    }
                 } catch(e){}
                videoCallback(win2);
            }
        } catch(e){}
    };

    CKEDITOR.on("instanceReady", ()=>videoCallback(window));
    videoCallback(window);
    
});
