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

var initSocketServer = (escapeRoomId, teamId, turnId) => {
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
    console.log(msg)
    console.log(HINT_RESPONSE, {success, hintId, msg: ((success && !hintId) || !success) ? i18n[msg] : msg});
  });

  /*Disconnect*/
  socket.on(DISCONNECT, function(){
  	console.error("Disconnected from socket server")
  });
}
