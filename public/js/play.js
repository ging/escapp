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

const error = (msg) => ({type: ERROR, payload: {msg}});

const solvePuzzle = (puzzleId, sol) => socket.emit("SOLVE_PUZZLE", {puzzleId, sol});

const requestHint = (score) => socket.emit("REQUEST_HINT", {score});

const initSocketServer = (escapeRoomId, teamId, turnId) => {
  socket = io('/', {query: {escapeRoom: escapeRoomId || undefined, team: teamId || undefined, turn: turnId || undefined }});
  
  /*Connect*/
  socket.on(CONNECT, function(){
  	console.log("Connected to socket server");
  });

  /*Error*/
  socket.on(ERROR, function({msg}){
    console.error(msg);
  });

   /*Start*/
  socket.on(START, function({msg}){
    console.log(msg);
  }); 

  /*Puzzle response*/
  socket.on(PUZZLE_RESPONSE, function({success, puzzleId, msg, auto}){
    console.log(PUZZLE_RESPONSE, {success, puzzleId, msg, auto});
  });

  /*Hint response*/
  socket.on(HINT_RESPONSE, function({success, hintId, msg}){
    const message = ((success && !hintId) || !success) ? i18n[msg] : msg;
    console.log(HINT_RESPONSE, {success, hintId, msg: message});
    setTimeout(() => {
       console.log(msg);
       $('#hintAppModal').addClass('zoomOut');
        setTimeout(() => {
         $('#hintAppModal').modal('hide');
          }, 300);
    }, 2000);
   
  });

  /*Disconnect*/
  socket.on(DISCONNECT, function(){
  	console.error("Disconnected from socket server")
  });
};

const previewHintApp = () => {
    const modal = `<div class="modal animated zoomIn" tabindex="-1" role="dialog" id="hintAppModal" aria-labelledby="hintApp" aria-hidden="true">
      <div class="modal-dialog modal-lg " role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${i18n.instructionsHints}</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper"/>
          </div>
        </div>
      </div>
    </div>`;

    $( "body" ).append(modal);
    $('#hintAppModal').modal('show');

    $('#hintAppModal').on('hide.bs.modal', function (e) {
      
    })    

    $('#hintAppModal').on('hidden.bs.modal', function (e) {
      setTimeout(()=>{ $('#hintAppModal').remove(); },200);
    })
};

window.requestHintFinish = (completion, score, status) => {
  console.log(completion, score, status)
  socket.emit("REQUEST_HINT",{score, status: status ? "completed" : "passed"});
};
