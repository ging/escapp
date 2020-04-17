var socket;
var myTeamId;
var myUserName;
var alertMsg;

/** TEMPLATES **/
const hintTemplate = (hint) => `
  <li class="animated zoomInUp">
      <div class="card border-info mb-3">
          <div class="card-body">
              <div class="card-text">
                  ${hint}
              </div>
          </div>
      </div>
  </li>`;

const customHintTemplate = (msg = i18n.dontClose) => `
  <div class="customHint" >
    ${(msg)}
  </div>
  `;

const modalTemplate = (categories, hints) => `
  <div class="modal animated zoomIn" tabindex="-1" role="dialog" id="hintAppModal" aria-labelledby="hintApp" aria-hidden="true">
    <div class="modal-dialog modal-lg " role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-title"><b>${categories ? i18n.chooseCat : i18n.instructionsHints}</b></h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" id="modalContent">
          ${categories ? `<ul class="categories">
            ${categories.map(c=>`<li class="category"><button class="cat-button" ${hints[c].length || allowCustomHints ? "" : "disabled"} data-name="${c}">${c}</button></li>`).join("")}
          </ul>` : `<iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>`}
        </div>
      </div>
    </div>
  </div>`;

const finishTemplate = () => `
  <div class="animated zoomIn">
    <h4 id="puzzles">${i18n.finishMsg}</h4>
    <br/>
    <a href="/escapeRooms/${escapeRoomId}/finish">
        <button class="btn btn-success">
            ${i18n.finishButton}
        </button>
    </a> 
  </div>`;

const puzzleInterfaceTemplate = (puzzle) => {
  return puzzle.automatic ? `` : `
  <div class="flex-cell flex-cell-retos">
    <div class="retoTextArea editable" data-reto="${puzzle.order}" data-id="title">
        ${puzzle.order}
    </div>
  </div>
  <div class="flex-cell flex-cell-sol puzzle-sol" data-reto="${puzzle.order}" >
    <div class="input-group mb-3 sol-input">
      <input type="text" autofocus class="form-control puzzle-input" name="answer" data-puzzle-order="${puzzle.order}" placeholder="${i18n.writeSol}" aria-label="Answer" aria-describedby="basic-addon2" autocomplete="off">
      <div class="input-group-append">
        <button class="btn btn-warning puzzle-check-btn" type="button" data-puzzle-order="${puzzle.order}">${i18n.check}</button>
      </div>
      <div class="puzzle-feedback invalid-feedback" data-puzzle-order="${puzzle.order}">
      </div>
    </div>
  </div>`;};


/** OUTGOING MESSAGES **/
const error = (msg) => ({type: "ERROR", payload: {msg}});

const solvePuzzle = (puzzleOrder, sol) => {
  socket.emit("SOLVE_PUZZLE", {"puzzleOrder": parseInt(puzzleOrder, 10) + 1, sol})
};

const requestHint = (score, status, category) => socket.emit("REQUEST_HINT", {score, status, category});

/** INCOMING MESSAGES **/
const onConnect = () => {
  console.info("Connected");
  if (alertMsg) {
    $('.alert').remove();
    alertMsg = $.easyAlert({"message": i18n["connected"], "alertType": "success", "position": "b l", "showDuration": 1000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});
  }
}
 
const onStart = () => {
}

const onStop = () => {
  alertMsg = $.easyAlert({"message": i18n["timeUp"], "alertType": "warning", "position": "b l", "showDuration": 10000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = () => {
  // console.log("Someone from your team has joined the ER")
  // alertMsg = $.easyAlert({"message": i18n["teamJoined"], "alertType": "info", "position": "b l", "showDuration": 1000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});
}

const onDisconnect = () => {
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["disconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "slide"});
};

const onReconnect = () => {
  console.log("Reconnect")
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["reconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "slide"});
};

const onPuzzleResponse = async ({code, correctAnswer, "puzzleOrder": puzzleOrderPlus, participation, authentication, erState, msg, participantMessage}) => {
  const feedback = msg + (participantMessage && participation !== "PARTICIPANT" ? `. ${participantMessage}`: "");
  const puzzleOrder = puzzleOrderPlus - 1;
  if (code === "OK") {
    let nextPuzzleOrder = null;
    if (!retosSuperados.some(r => r == puzzleOrder)) {
      retosSuperados.push(puzzleOrder)
      puzzlesPassed++;
      updateProgress(Math.round(puzzlesPassed/totalPuzzles*100));
      
      $(`.puzzle-sol[data-reto="${puzzleOrder}"]`).html(`<b>${feedback}</b>`);

      if (puzzlesPassed === totalPuzzles) {
        await forMs(1000);
        $('#finishPuzzles').html(finishTemplate());
        confetti.start(10000);
      } else {
        const puzzleIndex = escapeRoomPuzzles.findIndex(puzzle => puzzle.order == puzzleOrder);
        const nextPuzzle = escapeRoomPuzzles[puzzleIndex + 1];
        nextPuzzleOrder = nextPuzzle.order;
        if (puzzleIndex > -1  && puzzleIndex < (escapeRoomPuzzles.length - 1) && !nextPuzzle.automatic){
          $('#finishPuzzles').append(puzzleInterfaceTemplate(nextPuzzle));
        }
      }
      checkAvailHintsForPuzzle(nextPuzzleOrder);
    }
  } else {
    $(`.puzzle-feedback[data-puzzle-order="${puzzleOrder}"]`).html(feedback);
    $(`.puzzle-input[data-puzzle-order="${puzzleOrder}"]`).addClass("is-invalid");
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
      await closeHintModal();
      waitingForHintReply = false;
      $('html').css('cursor','auto');
      await forMs(500);        
    } else {
      await forMs(500);
    }
    $('ul#hintList').append(hintTemplate(message));
  } else if(allowCustomHints) {
    if (code == "OK") { // Hint obtained
      if (waitingForHintReply) { // Receive a hint that you requested
        if (hintAppConditional && allowCustomHints) {  // Modal is open
          $('#hintAppModal').on('hidden.bs.modal', async (e) => { // When modal closes
            await forMs(100);
            $('ul#hintList').append(hintTemplate(message)); // Show hint
          }); 
          $('#modalContent').append(customHintTemplate()); // Show custom hint message in modal
        } else { // Free hint
          $('ul#hintList').append(hintTemplate(message));  // Show hint
        }
      } else { // Receive a hint that someone else requested
        $('ul#hintList').append(hintTemplate(message));  // Show hint
      }
    } else { // Hint not obtained (only quiz strategy)
      if (waitingForHintReply) { // Receive a hint that you requested
        // $('#modalContent').append(customHintTemplate(message)); // Show message in modal
        await forMs(3000);
        await closeHintModal();
      }
    }
    waitingForHintReply = false; // Stop waiting for hint response
    $('html').css('cursor','auto');

  } else {
    if (waitingForHintReply) { 
      await closeHintModal();
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

const closeHintModal = async () => {
  // Close hint modal
  $('#hintAppModal').addClass('zoomOut'); 
  await forMs(300);
  $('#hintAppModal').modal('hide'); 
}

const checkAvailHintsForPuzzle = (puzzleOrder) => {
  if (puzzleOrder === null || puzzleOrder === undefined) {
    $('#btn-hints').attr("disabled", true);
    $('#btn-hints').attr("title", i18n["cantRequestMore"]);
    return;
  }

  if (escapeRoomHintLimit !== undefined && escapeRoomHintLimit <= $("#hintList").children().length){
    $('#btn-hints').attr("disabled", true);
    $('#btn-hints').attr("title", i18n["cantRequestMore"]);

    return;
  }

  if (allowCustomHints) {
    $('#btn-hints').attr("disabled", false);
    $('#btn-hints').attr("title", i18n["canRequest"]);

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
      $('#btn-hints').attr("disabled", false);
      $('#btn-hints').attr("title", i18n["canRequest"]);
      

    } else {
      $('#btn-hints').attr("disabled", true);
      $('#btn-hints').attr("title", i18n["cantRequestMoreThis"]);
    }
  }
}

const yesCat = (categories, hints) => {
  $( "body" ).append(modalTemplate(categories, hints));
  $('#hintAppModal').modal('show');
  $('#hintAppModal').on('hidden.bs.modal', () => setTimeout(()=>$('#hintAppModal').remove(), 200));
};

const chooseCat = async (cat) =>  {
  if (hintAppConditional) {
    chosenCat = cat;
    $('#modal-title').html(i18n.instructionsHints);
    $('#modalContent').html(`<iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>`);
  } else {
    waitingForHintReply = true;
    $('html').css('cursor','wait');
    $('.cat-button').attr("disabled", true);
    requestHint(100, "completed", cat);
    await closeHintModal();
  }
}

const noCat = () => {
  if (hintAppConditional) {
    $( "body" ).append(modalTemplate());
    $('#hintAppModal').modal('show');
    $('#hintAppModal').on('hidden.bs.modal', () => setTimeout(() => $('#hintAppModal').remove(), 200));
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

$(()=>{
  checkAvailHintsForPuzzle(currentlyWorkingOn);
  /** BTN ACTIONS **/

  $(document).on("keyup", ".puzzle-input", function(ev){
    const sol = $(this).val();
    if (ev.keyCode === 13) {
      const puzzleOrder = $(this).data("puzzleOrder");
      solvePuzzle(puzzleOrder, sol);
    } else {
      if (sol === "") {
        $(this).removeClass('is-invalid');
      }
    }
  });

  $(document).on("click", ".puzzle-check-btn", function(){
    const puzzleOrder = $(this).data("puzzleOrder");
    const sol = $(`.puzzle-input[data-puzzle-order="${puzzleOrder}"]`).val();
    solvePuzzle(puzzleOrder, sol);
  });

  $(document).on("click", "#btn-hints", function(){
    let currentReto = 0;
    
    for (let r in escapeRoomPuzzles) {
      const reto = escapeRoomPuzzles[r];
      currentReto = reto;
      if (retosSuperados.indexOf(reto.order) === -1) {
        break;
      }
    }
    const categories = currentReto ? currentReto.categories : null;
    const hints = currentReto ? currentReto.hints : null;
    if (categories && categories.length > 1) {
      yesCat(categories, hints);
    } else {
      noCat();
    }
  });

  $(document).on("click", ".cat-button", function(e){
    chooseCat($(e.target).data('name'));
  });
  try {
    if (progress !== undefined) {
      updateProgress(progress);
    }
  } catch (err) {
  }
  $('meta:not(:first)').attr('content', rgb2hex($('body').css("background-color") || "#FFFFFF"));

});