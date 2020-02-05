var socket;
const CONNECT = "connect";
const DISCONNECT = "disconnect";
const ERROR = "ERROR";
const HINT_RESPONSE = "HINT_RESPONSE";
const PUZZLE_RESPONSE = "PUZZLE_RESPONSE";
const REQUEST_HINT = "REQUEST_HINT";
const SOLVE_PUZZLE = "SOLVE_PUZZLE";
const START = "START";
const STOP = "STOP";
const JOIN = "JOIN";

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
    ${msg}
  </div>
  `;

const modalTemplate = () => `
  <div class="modal animated zoomIn" tabindex="-1" role="dialog" id="hintAppModal" aria-labelledby="hintApp" aria-hidden="true">
    <div class="modal-dialog modal-lg " role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><b>${i18n.instructionsHints}</b></h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body" id="modalContent">
          <iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>
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
    <div class="retoTextArea editable" data-reto="${puzzle.id}" data-id="title">
        ${puzzle.title}
    </div>
  </div>
  <div class="flex-cell flex-cell-sol puzzle-sol" data-reto="${puzzle.id}" >
    <div class="input-group mb-3 sol-input">
      <input type="text" class="form-control puzzle-input" name="answer" data-puzzle-id="${puzzle.id}" placeholder="${i18n.writeSol}" aria-label="Answer" aria-describedby="basic-addon2" autocomplete="off">
      <div class="input-group-append">
        <button class="btn btn-warning puzzle-check-btn" type="button" data-puzzle-id="${puzzle.id}">${i18n.check}</button>
      </div>
      <div class="puzzle-feedback invalid-feedback" data-puzzle-id="${puzzle.id}">
      </div>
    </div>
  </div>`;};


/** OUTGOING MESSAGES **/
const error = (msg) => ({type: ERROR, payload: {msg}});

const solvePuzzle = (puzzleId, sol) => socket.emit("SOLVE_PUZZLE", {puzzleId, sol});

const requestHint = (score, status) => socket.emit("REQUEST_HINT", {score, status});


/** INCOMING MESSAGES **/
const onConnect = () => {
  console.log("Connected to socket server");
}

const onError = (msg) => {
  console.error(msg);
}

const onStart = () => {
  console.log("Turno comenzado");
}

const onStop = () => {
  console.log("Turno terminado");
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = () => {
  console.log("Someone from your team has joined the ER")
}

const onPuzzleResponse = async ({success, puzzleId, msg, auto}) => {
  console.log({success, puzzleId, msg, auto})
  if (success) {
    if (!retosSuperados.some(r => r == puzzleId)) {
      retosSuperados.push(puzzleId)
      puzzlesPassed++;
      updateProgress(Math.round(puzzlesPassed/totalPuzzles*100));
      const feedback = (msg && msg !== "OK") ? msg : i18n.correctAnswer;
      $(`.puzzle-sol[data-reto="${puzzleId}"]`).html(`<b>${feedback}</b>`);

      if (puzzlesPassed === totalPuzzles) {
        await forMs(1200);
        $('#finishPuzzles').html(finishTemplate());
      } else {
        const puzzleIndex = escapeRoomPuzzles.findIndex(puzzle => puzzle.id == puzzleId);
        if (puzzleIndex > -1  && puzzleIndex < (escapeRoomPuzzles.length - 1) && !escapeRoomPuzzles[puzzleIndex + 1].automatic){
          $('#finishPuzzles').append(puzzleInterfaceTemplate(escapeRoomPuzzles[puzzleIndex + 1]));
        }
      }
    }
  } else {
    const feedback = (msg && msg !== "WRONG") ? msg : i18n.wrongAnswer;
    $(`.puzzle-feedback[data-puzzle-id="${puzzleId}"]`).html(feedback);
    $(`.puzzle-input[data-puzzle-id="${puzzleId}"]`).addClass("is-invalid");
  }
};

const onHintResponse = async ({success, hintId, msg}) => {
  const message = ((success && !hintId) || !success) ? i18n[msg] : msg;
  if (hintId) {
    if (waitingForHintReply) {
      await forMs(2000);
      $('#hintAppModal').addClass('zoomOut');
      await forMs(300);
      $('#hintAppModal').modal('hide');
      waitingForHintReply = false;
      await forMs(500);        
    } else {
      await forMs(2800);
    }
    $('ul#hintList').append(hintTemplate(message));
  } else {
    if (success) {
      if (waitingForHintReply) {
        $('#hintAppModal').on('hidden.bs.modal', async (e) => {
          await forMs(700);
          $('ul#hintList').append(hintTemplate(message));
        });
        await forMs(3000);
        $('#modalContent').append(customHintTemplate());
      } else {
        $('ul#hintList').append(hintTemplate(message));
      }
    } else {
      if (msg === "tooMany") {
        $('#modalContent').append(customHintTemplate(i18n.tooMany));
        await forMs(3000);
      }
      await forMs(1000);
      $('#hintAppModal').addClass('zoomOut');
      await forMs(300);
      $('#hintAppModal').modal('hide');
    }
    waitingForHintReply = false;
  }
  if (escapeRoomHintLimit !== undefined && escapeRoomHintLimit <= $("#hintList").children().length){
    $('#btn-hints').attr("disabled", true);
  }
};

const onDisconnect = () => {
  console.error("Disconnected from socket server");
};


/** HELPERS **/
const updateProgress = (newProgress) =>  $('.puzzle-progress').attr('aria-valuenow', newProgress).css("width", newProgress + "%")
const forMs = (delay) => {
  return new Promise(function(resolve) {
      setTimeout(resolve, delay);
  });
}

/** BTN ACTIONS **/
$(document).on("click", ".puzzle-check-btn", function(){
  const puzzleId = $(this).data("puzzleId");
  const sol = $(`.puzzle-input[data-puzzle-id="${puzzleId}"]`).val();
  solvePuzzle(puzzleId, sol);
});

$(document).on("click", "#btn-hints", function(){
  $( "body" ).append(modalTemplate());
  $('#hintAppModal').modal('show');
  $('#hintAppModal').on('hidden.bs.modal', () => setTimeout(()=>$('#hintAppModal').remove(), 200));
});
let waitingForHintReply = false;
window.requestHintFinish = (completion, score, status) => {
  waitingForHintReply = true;
  requestHint(score, status ? "completed" : "failed");
};
$(()=>{
  if (escapeRoomHintLimit !== undefined && (escapeRoomHintLimit <= $("#hintList").children().length )){
    $('#btn-hints').attr("disabled", true)
  }
  if (progress !== undefined) {
    updateProgress(progress);
  }
});

const initSocketServer = (escapeRoomId, teamId, turnId) => {
  socket = io('/', {query: {
    escapeRoom: escapeRoomId || undefined, 
    team: teamId || undefined, 
    turn: turnId || undefined 
  }});
  
  /*Connect*/
  socket.on(CONNECT, onConnect);

  /*Error*/
  socket.on(ERROR, onError);

  /*Join*/
  socket.on(JOIN, onJoin); 

  /*Start*/
  socket.on(START, onStart); 

  /*Start*/
  socket.on(STOP, onStop); 

  /*Puzzle response*/
  socket.on(PUZZLE_RESPONSE, onPuzzleResponse);

  /*Hint response*/
  socket.on(HINT_RESPONSE, onHintResponse);

  /*Disconnect*/
  socket.on(DISCONNECT, onDisconnect);
};
