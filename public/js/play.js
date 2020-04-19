var socket;
var myTeamId;
var myUserName;
var alertMsg;

/** TEMPLATES **/
const hintTemplate = (hint, category) => `
  <li class="animated zoomInUp">
      <div class="card border-info mb-3">
          <div class="card-body">
              <div class="card-text">
                  ${category ? `<b>${category}</b>`:''}${hint}
             </div>
          </div>
      </div>
  </li>`;


const otherMsg = (info) => `
<li class="animated zoomInUp">
    <div class="card border-info mb-3">
        <div class="card-body">
            <div class="card-text">
                ${info}
           </div>
        </div>
    </div>
</li>`;


const quizInstructionsTemplate = () => {
  return `
    <h4 class="instructions-button">
    ${i18n.instructionsQuiz}<br/><br/>
      <button class="btn btn-success" id="btn-start-quiz">
      ${i18n.start}
      </button>
    </p>`
} 

const quizTemplate = () => {
  return `<iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>`
}

const catsTemplate = (categories, hints) => {
  return categories ? `<h4>${i18n.chooseCat}</h4><ul class="categories">
    ${categories.map(c=>`<li class=" card border-success category"><button class="cat-button" ${hints[c].length || allowCustomHints ? "" : "disabled"} data-name="${c}">${c}</button></li>`).join("")}
  </ul>` : '';
}

const retoMsg = (puzzle) => {
  return `<li class="card reto-puzzle-li reto-puzzle-current animated zoomInUp"> 
      <h6><b>${puzzle.title}</b></h6>
      <ul class="cardList">
          <li class="card border-success reto-msg">
          <div class="card-body">
              <div class="card-text">
                ${puzzle.correct}
              </div>
          </div>
          </li>
      </ul>
  </li>`;
}

/** OUTGOING MESSAGES **/
const error = (msg) => ({type: "ERROR", payload: {msg}});

const solvePuzzle = (puzzleOrder, sol) => socket.emit("SOLVE_PUZZLE", {"puzzleOrder": parseInt(puzzleOrder, 10) + 1, sol});

const requestHint = (score, status, category) => socket.emit("REQUEST_HINT", {score, status, category});

/** INCOMING MESSAGES **/
const onConnect = () => {
  console.info("Connected");
  if (alertMsg) {
    $('.alert').remove();
    alertMsg = $.easyAlert({"message": i18n["connected"], "alertType": "success", "position": "b l", "showDuration": 5000, time: 3000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "bounce"});
  }
}
 
const onStart = () => {
}

const onStop = async () => {
  alertMsg = $.easyAlert({"message": i18n["timeUp"], "alertType": "warning", "position": "b l", "showDuration": 5000, time: 10000,  "autoHide": true, "hideAnimation": "slide", "showAnimation": "bounce"});
  await forMs(10000);
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = () => {
  // console.log("Someone from your team has joined the ER")
  // alertMsg = $.easyAlert({"message": i18n["teamJoined"], "alertType": "info", "position": "b l", "showDuration": 1000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "bounce"});
}

const onDisconnect = () => {
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["disconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "bounce"});
};

const onReconnect = () => {
  console.log("Reconnect")
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["reconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "bounce"});
};

const onPuzzleResponse = async ({code, correctAnswer, solution, "puzzleOrder": puzzleOrderPlus, participation, authentication, erState, msg, participantMessage}) => {
  const feedback = (msg || i18n.correctAnswer) + (participantMessage && participation !== "PARTICIPANT" ? `. ${participantMessage}`: "");
  const puzzleOrder = puzzleOrderPlus - 1;
  if (code === "OK") {
    let nextPuzzleOrder = null;
    if (!retosSuperados.some(r => r == puzzleOrder)) {
      retosSuperados.push(puzzleOrder)
      const pendingIndex = pending.indexOf(puzzleOrder);
      if (pendingIndex !== -1 ) {
        pending.splice(pendingIndex, 1);
      } 
      latestRetoSuperado = (!latestRetoSuperado || latestRetoSuperado > puzzleOrder) ? latestRetoSuperado : puzzleOrder;
      updateProgress(Math.round(retosSuperados.length/totalPuzzles*100));
      $.easyAlert({"message": `<b>${i18n.newRetoSuperado}</b><br/> ${feedback}`, "alertType": "success", "position": "b l", "hideAnimation": "slide", "showAnimation": "bounce"});
      $('#puzzle-input').addClass('is-valid');
      appendRetoMsg(escapeRoomPuzzles[puzzleOrder]);
      await forMs(2000);
      if (retosSuperados.length === totalPuzzles) {
        await forMs(1000);
        confetti.start(10000);
        updatePuzzle();
        $('#finish').show();
        checkAvailHintsForPuzzle(null);
      } else {
        const puzzleIndex = escapeRoomPuzzles.findIndex(puzzle => puzzle.order == puzzleOrder);
        if (puzzleIndex > -1  && (puzzleIndex < (escapeRoomPuzzles.length - 1)) && latestRetoSuperado !== totalPuzzles){
          const nextPuzzle = escapeRoomPuzzles[puzzleIndex + 1];
          nextPuzzleOrder = nextPuzzle.order;
          updatePuzzle(nextPuzzleOrder, nextPuzzle);
          checkAvailHintsForPuzzle(nextPuzzleOrder);

        } else {
          nextPuzzleOrder = pending[0];
          const nextPuzzle = escapeRoomPuzzles[nextPuzzleOrder];
          updatePuzzle(nextPuzzleOrder, nextPuzzle);
          checkAvailHintsForPuzzle(nextPuzzleOrder);
        }
      }
    }
  } else {
    $.easyAlert({"message": feedback, "alertType": "danger", "position": "b l", "time": 5000,  "autoHide": true, "hideAnimation": "slide", "showAnimation": "bounce"});
    $(`#puzzle-input`).addClass("is-invalid");
  }
};

const onHintResponse = async ({code, hintOrder: hintOrderPlus, puzzleOrder: puzzleOrderPlus, category, msg}) => {
  const message = msg;
  const hintOrder = hintOrderPlus - 1;
  const puzzleOrder = puzzleOrderPlus - 1;
  if (hintOrderPlus) { // Existing hint
    const currentPuzzle = escapeRoomPuzzles.find(puz => puz.order === puzzleOrder);
    const actualCat = category || currentPuzzle.categories[0];
    if (reqHints[puzzleOrder].indexOf(hintOrder) === -1 ) { // Not hint requested before
      reqHints[puzzleOrder].push(hintOrder);
      reqHintsListOrder.push(hintOrder);
      if (currentPuzzle) {
        const hintArr = currentPuzzle.hints[actualCat];
        const idx = hintArr.indexOf(hintOrder);
        if (idx !== -1) {
          hintArr.splice(idx, 1);
        }
      }
    }

    if (waitingForHintReply) {  // Receive a hint that you requested
      if (hintAppConditional) {
        await forMs(2500);
      }
      cleanHintModal();
      appendHint(message, puzzleOrder, category);
      waitingForHintReply = false;
      $('html').css('cursor','auto');
      await forMs(500);
      $('.reto-hint-title-'+puzzleOrder).first().removeClass('animated')
    } else { // Someone in my team obtained a hint
      $.easyAlert({"message": `<b>${i18n.newHint}</b><br/>${message}`, "alertType": "success", "position": "b l", "hideAnimation": "slide", "showAnimation": "bounce"});
      await forMs(500);
      appendHint(message, puzzleOrder, category);
    }
    
  } else if(allowCustomHints) {
    if (code == "OK") { // Hint obtained
      if (waitingForHintReply) { // Receive a hint that you requested
        if (hintAppConditional) {  // Modal is open
          $('.hints-modal-no-left').html(`<p>${i18n.dontClose}</p>`);
        } else { // Free hint
          $('.hints-modal-no-left').html(`<p>${i18n.noMoreLeft}</p>`);
        }
      } else { // Receive a hint that someone else requested
        $.easyAlert({"message": message, "alertType": "success", "position": "b l", "hideAnimation": "slide", "showAnimation": "bounce"});
      }
    } else { // Hint not obtained (only quiz strategy)
      if (waitingForHintReply) { // Receive a hint that you requested
        await forMs(5000);
        cleanHintModal();
      }
    }
    waitingForHintReply = false; // Stop waiting for hint response
    $('html').css('cursor','auto');

  } else {
    
    if (waitingForHintReply) { 
      await forMs(5000);
      await cleanHintModal();
    }
    waitingForHintReply = false; // Stop waiting for hint response
    $('html').css('cursor','auto');
  }
  if (code === "OK") {
    checkAvailHintsForPuzzle(puzzleOrder);
  }
};

const onInitialInfo = ({erState}) => {
  if (erState && erState.ranking) {
    onRanking({ranking: erState.ranking})
  }
};

const onRanking = ({ranking}) => {
  if (ranking) {
    teams = ranking;
    sort();
    setTimeout(()=>{
      $('ranking').html(rankingTemplate(teams, myTeamId));
    }, 1000)
  }
}

const onLeave = ({username, teamId, ranking}) => {
  if ((username && username === myUsername) || (teamId && teamId === myTeamId)) {
    window.location.replace("/escapeRooms");
  } else if (ranking) {
    teams = ranking;
    $('ranking').html(rankingTemplate(teams, myTeamId));
    sort();
  }
}

/** HELPERS **/
const updateProgress = (newProgress) =>  $('.puzzle-progress').attr('aria-valuenow', newProgress).css("width", newProgress + "%")

const forMs = (delay) => {
  return new Promise(function(resolve) {
      setTimeout(resolve, delay);
  });
}

const rgb2hex = orig => {
  var rgb = orig.replace(/\s/g,'').match(/^rgba?\((\d+),(\d+),(\d+)/i);
  return (rgb && rgb.length === 4) ? "#" +
    ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : orig;
};


/************************HINT MANAGEMENT***************************/

const hintReq = ()=>{
  $('#modal-title').html('<b>'+i18n.hints+'<b>');
  let currentReto = escapeRoomPuzzles.find(p=>p.order === currentlyWorkingOn);
  const categories = currentReto ? currentReto.categories : null;
  const hints = currentReto ? currentReto.hints : null;
  $('#hintModal .animated').removeClass('animated')
  if (categories && categories.length > 1) {
    yesCat(categories, hints);
  } else {
    noCat();
  }
}


const closeHintModal = async () => {
  // Close hint modal
  $('#hintModal').addClass('zoomOut'); 
  await forMs(300);
  $('#hintModal').modal('hide'); 
  
}

const cleanHintModal = ()=> {
  $('#modal-title').html('<b>'+i18n.info+'<b>');
  $('.hints-modal-main-content').show();
  $('.hints-modal-cats').html("");
  $('.hints-modal-quiz').html("");
  $('.hints-modal-no-left').html("");
}

const appendHint = (message, puzzleOrder) => {
  $('#requested-hints-title').show();
  $('.reto-hint-title-'+puzzleOrder).show();
  $('.reto-hint-title-'+puzzleOrder + ' .hintList').prepend(hintTemplate(message, category))
  $('#no-info').hide();
};

const appendRetoMsg = (puzzle) => {
  if (puzzle.correct) {
    $('.retoList').prepend(retoMsg(puzzle));
    $('#puzzle-messages-title').show();
    $('#no-info').hide();
  }
  $('.reto-puzzle-current').removeClass('reto-puzzle-current');
  $('.reto-puzzle-li').first().addClass('reto-puzzle-current');
};

const appendExtraInfo = (info) => {
  $('.otherList').prepend(otherMsg(info));
  $('#other-messages-title').show();

}

const updatePuzzle = (order, currentPuzzle) => {
  if (order || order === 0) { // TODO automatic
      currentlyWorkingOn = order;
      console.log(order, currentPuzzle)
      // Update title
      $('#puzzle-title').data("puzzleOrder", order);
      $('#puzzle-title').text(currentPuzzle.title);
      // Update input
      $('#puzzle-input').val("");
      $('#puzzle-input').focus();
      $('#puzzle-input').data("puzzleOrder", order);
      $('#puzzle-input').removeClass('is-invalid');
      $('#puzzle-input').removeClass('is-valid');
      // Update button
      $('#puzzle-check-btn').data("puzzleOrder", order);
      // Update currentReto in modal
      $('.reto-hint-li').removeClass('reto-hint-current');
      $('.reto-hint-title-'+order).addClass('reto-hint-current');
    
      if (currentPuzzle.automatic) {
        $('#puzzle-form').hide()
      } else {
        $('#puzzle-form').show()
      }
  } else {
    $('.reto-hint-li').removeClass('reto-hint-current');
    $('#puzzle-form').hide();
    
  }
}

const checkAvailHintsForPuzzle = (puzzleOrder) => {
  if (puzzleOrder === null || puzzleOrder === undefined) {
    $('.btn-hints').attr("disabled", true);
    $('.btn-hints').attr("title", i18n["cantRequestMore"]);
    return;
  }

  if (escapeRoomHintLimit !== undefined && escapeRoomHintLimit <= reqHintsListOrder.length){
    $('.btn-hints').attr("disabled", true);
    $('.btn-hints').attr("title", i18n["cantRequestMore"]);

    return;
  }

  if (allowCustomHints) {
    $('.btn-hints').attr("disabled", false);
    $('.btn-hints').attr("title", i18n["canRequest"]);

    return;
  }

  const puzzle = escapeRoomPuzzles.find(p => p.order === puzzleOrder);
  if (puzzle && puzzle.hints) {
    var anyHint = false;
    for (var c in puzzle.hints) {
      var hints = puzzle.hints[c];
      if (hints.length) {
        anyHint = true;
        break;
      }
    }
    if (anyHint) {
      $('.btn-hints').attr("disabled", false);
      $('.btn-hints').attr("title", i18n["canRequest"]);
      

    } else {
      $('.btn-hints').attr("disabled", true);
      $('.btn-hints').attr("title", i18n["cantRequestMoreThis"]);
    }
  }
}

const yesCat = (categories, hints) => {
  $( ".hints-modal-main-content").hide();
  $( ".hints-modal-cats" ).html(catsTemplate(categories, hints));
  $('.hints-modal-cats').show();
};

const chooseCat = async (cat) =>  {
  if (hintAppConditional) {
    chosenCat = cat;
    $('.hints-modal-cats').html("");
    $('.hints-modal-quiz').html(quizInstructionsTemplate());
  } else {
    waitingForHintReply = true;
    $('html').css('cursor','wait');
    $('.cat-button').attr("disabled", true);
    requestHint(100, "completed", cat);
  }
}

const noCat = () => {
  if (hintAppConditional) {
    $( ".hints-modal-main-content").hide();
    $('.hints-modal-quiz').html(quizInstructionsTemplate());
  } else {
    waitingForHintReply = true;
    $('html').css('cursor','wait');
    requestHint(100, "completed");
  }
}

let waitingForHintReply = false;
let chosenCat = null
window.requestHintFinish = (completion, score, status) => {
  waitingForHintReply = true;
  $('html').css('cursor', 'wait');
  requestHint(score, status ? "completed" : "failed", chosenCat);
  chosenCat = null;
};
/*******************************************************************/

const initSocketServer = (escapeRoomId, teamId, turnId, username) => {
  socket = io('/', {query: {
    escapeRoom: escapeRoomId == "undefined" ? undefined : escapeRoomId, 
    turn: turnId == "undefined" ? undefined : turnId  
  }});
  myTeamId = teamId;
  myUsername = username;
  /*Connect*/
  socket.on("CONNECT", onConnect);

  /*Error*/
  socket.on("error", console.err);

  /*Join*/
  socket.on("JOIN", onJoin); 

  /*Start*/
  socket.on("START", onStart); 

  /*Start*/
  socket.on("STOP", onStop); 

  /*Initial info*/
  socket.on("INITIAL_INFO", onInitialInfo);

  /*Puzzle response*/
  socket.on("PUZZLE_RESPONSE", onPuzzleResponse);

  /*Hint response*/
  socket.on("HINT_RESPONSE", onHintResponse);

  /*New ranking */
  socket.on("TEAM_PROGRESS", onRanking);

  /*Team join*/
  socket.on("JOIN_TEAM", onLeave);

  /*Participant join*/
  socket.on("JOIN_PARTICIPANT", onLeave);

  /*Participant leave*/
  socket.on("LEAVE_PARTICIPANT", onLeave);

  /*Team leave*/
  socket.on("LEAVE_TEAM", onLeave);

  /*Disconnect*/
  socket.on("DISCONNECT", onDisconnect);

  /*Reconnect*/
  socket.on("DISCONNECT", onReconnect);

};

$( ()=>{
  checkAvailHintsForPuzzle(currentlyWorkingOn);
  /** BTN ACTIONS **/

  $(document).on("keyup", "#puzzle-input", function(ev){
    const sol = $(this).val();
    if (ev.keyCode === 13) {
      const puzzleOrder = $(this).data("puzzleOrder");
      ev.preventDefault();
      solvePuzzle(puzzleOrder, sol);
    } else {
      $(this).removeClass('is-invalid');
      $(this).removeClass('is-valid');
    }
  });

  $(document).on("click", "#puzzle-check-btn", function(){
    const puzzleOrder = $(this).data("puzzleOrder");
    const sol = $(`#puzzle-input`).val();
    solvePuzzle(puzzleOrder, sol);
  });

  $(document).on("click", ".btn-hints-nav", function(){
    hintReq();
    $('#hintModal').modal("show");
  });

  $(document).on("click", ".btn-hints-modal", function(){
    hintReq();
  });

  $(document).on("click", "#btn-start-quiz", function(){
    $('.hints-modal-quiz').html(quizTemplate());
  });


  $('#hintModal').on('hidden.bs.modal', function (e) {
    cleanHintModal();
    $('#hintModal .animated').removeClass('animated')

  });

  $(document).on("click", ".cat-button", function(e){
    chooseCat($(e.target).data('name'));
  });

  // Update progress
  try {
    if (progress !== undefined) {
      updateProgress(progress);
    }
  } catch (err) {
  }

  // Mobile header
  $('meta:not(:first)').attr('content', rgb2hex($('nav').first().css("background-color") || "#FFFFFF"));

  // Autoplay videos
  setTimeout(()=>{
  if (!localStorage["escapp_"+escapeRoomId]) {
    $( "[autoplay]" ).first();
    if ( $( "[autoplay]" ).length) {
      toggleFullScreen($( "[autoplay]" )[0]);
      localStorage["escapp_"+escapeRoomId] = true;
    } else {
      const auto = $("iframe").filter(function() {
        return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
      });
      if (auto.length) {
        auto[0].scrollIntoView();
        setTimeout(()=>{
          toggleFullScreen(auto[0]);
        },1000)
        localStorage["escapp_"+escapeRoomId] = true;
      }
    }
  } else {
    try {
      $( "[autoplay]" ).each((i,e)=>e.pause());
    } catch(e){}
    
    $("iframe").filter(function(e) {
      return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
    }).each((i,e)=>{
      $(e).attr('allow', $(e).attr("allow").replace(/autoplay/i,""));
      $(e).attr('src', $(e).attr('src').replace(/autoplay=1/i,"autoplay=0"));
    });
    setTimeout(()=>{
      $('iframe').attr('src', $('iframe').attr('src').replace(/autoplay=1/i,"autoplay=0") )
    },1000)
  }
},500)


});
