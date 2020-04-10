var socket;
const CONNECT = "connect";
const DISCONNECT = "disconnect";
const ERROR = "ERROR";
const HINT_RESPONSE = "HINT_RESPONSE";
const INITIAL_RANKING = "INITIAL_RANKING";
const PUZZLE_RESPONSE = "PUZZLE_RESPONSE";
const REQUEST_HINT = "REQUEST_HINT";
const SOLVE_PUZZLE = "SOLVE_PUZZLE";
const START = "START";
const STOP = "STOP";
const JOIN = "JOIN";
const JOIN_TEAM = "JOIN_TEAM";
const JOIN_PARTICIPANT = "JOIN_PARTICIPANT";
const LEAVE_TEAM = "LEAVE_TEAM";
const LEAVE_PARTICIPANT = "LEAVE_PARTICIPANT";
const RESET_PROGRESS = "RESET_PROGRESS";
const RANKING = "RANKING";
var myTeamId;
var myUserId;
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
      <input type="text" autofocus class="form-control puzzle-input" name="answer" data-puzzle-id="${puzzle.id}" placeholder="${i18n.writeSol}" aria-label="Answer" aria-describedby="basic-addon2" autocomplete="off">
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
  console.info("Connected");
  if (alertMsg) {
    $('.alert').remove();
    alertMsg = $.easyAlert({"message": i18n["connected"], "alertType": "success", "position": "b l", "showDuration": 1000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});
  }
}

const onError = (msg) => {
  console.error(msg);
}

const onStart = () => {
  console.log("Turno comenzado");
}

const onStop = () => {
  console.log("Turno terminado");
  alertMsg = $.easyAlert({"message": i18n["timeUp"], "alertType": "warning", "position": "b l", "showDuration": 10000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = () => {
  console.log("Someone from your team has joined the ER")
  alertMsg = $.easyAlert({"message": i18n["teamJoined"], "alertType": "info", "position": "b l", "showDuration": 1000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "slide"});

}

const onDisconnect = () => {
  console.log("Disconnect")
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["disconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "slide"});
};

const onReconnect = () => {
  console.log("Reconnect")
  $('.alert').remove();
  alertMsg = $.easyAlert({"message": i18n["reconnect"], "alertType":"danger", "position": "b l", "hideAnimation": "slide", "showAnimation": "slide"});

};
const onPuzzleResponse = async ({success, correctAnswer, puzzleId, participation, authentication, msg, participantMessage}) => {
  const feedback = msg + (participantMessage && participation !== "PARTICIPANT" ? `. ${participantMessage}`: "");
  if (success) {
    if (!retosSuperados.some(r => r == puzzleId)) {
      retosSuperados.push(puzzleId)
      puzzlesPassed++;
      updateProgress(Math.round(puzzlesPassed/totalPuzzles*100));
      
      $(`.puzzle-sol[data-reto="${puzzleId}"]`).html(`<b>${feedback}</b>`);

      if (puzzlesPassed === totalPuzzles) {
        await forMs(1000);
        $('#finishPuzzles').html(finishTemplate());
        confetti.start(10000);
      } else {
        const puzzleIndex = escapeRoomPuzzles.findIndex(puzzle => puzzle.id == puzzleId);
        if (puzzleIndex > -1  && puzzleIndex < (escapeRoomPuzzles.length - 1) && !escapeRoomPuzzles[puzzleIndex + 1].automatic){
          $('#finishPuzzles').append(puzzleInterfaceTemplate(escapeRoomPuzzles[puzzleIndex + 1]));
        }
      }
    }
  } else {
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
        if (hintAppConditional) {
          $('#hintAppModal').on('hidden.bs.modal', async (e) => {
            await forMs(700);
            $('ul#hintList').append(hintTemplate(message));
          });
        } else {
          $('ul#hintList').append(hintTemplate(message));
          
        }
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

const onRankingDiff = ({teamId, puzzleId, time}) => {
  const team = teams.find(team => team.id == teamId);
  if (team) {
    const reto = team.retos.find(reto => reto.id === puzzleId)
    if (!reto) {
      team.retos = [...team.retos, {id: puzzleId, date: time}];
      team.result = team.retos.length + "/" + nPuzzles;
      team.latestRetoSuperado = time;
      $('#team-' + teamId +" .ranking-res").html(team.result);
      if (team.retos.length == nPuzzles) {
        team.finishTime = secondsToDhms((new Date(time) - new Date(team.startTime))/1000);
        $('#team-' + teamId +" .ranking-time").html(team.finishTime);
      }

      sort();
    }
  }
};

const onInitialRanking = ({teams:teamsNew}) => {
  teams = teamsNew
  $('ranking').html(rankingTemplate(teams, myTeamId));
  sort();
};

const onTeamJoin = ({team}) => {
  if (!teams.some(t => t.id === team.id)) {
    let count = 0;
    let retos = [];
    let result = "0/" + nPuzzles;

    teams.push({...team, result, count, retos});
    $('ranking').html(rankingTemplate(teams, myTeamId));
    sort();
  }
}

const onParticipantJoin = ({team}) => {
  const index = teams.findIndex(t => t.id === team.id);
  if (index > -1) {
    const {teamMembers, participants} = team;
    teams[index].teamMembers = teamMembers;
    teams[index].participants = participants;
    $('ranking').html(rankingTemplate(teams, teamId));
    sort();
  }
}

const onTeamLeave = ({team}) => {
  if (team.id === myTeamId) {
    window.location.replace("/escapeRooms");
  }
  const index = teams.findIndex(t => t.id === team.id);
  if (index > -1) {
    teams.splice(index, 1);
    $('ranking').html(rankingTemplate(teams, myTeamId));
    sort();
  }
}

const onParticipantLeave = ({team, userId}) => {
  if (userId === myUserId) {
    window.location.replace("/escapeRooms");
  }
  const foundTeam = teams.find(t => t.id === team.id);
  if (foundTeam) {
    const {teamMembers, participants} = team;
    foundTeam.teamMembers = teamMembers;
    foundTeam.participants = participants;
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

/** BTN ACTIONS **/

$(document).on("keyup", ".puzzle-input", function(ev){
  const sol = $(this).val();
  if (ev.keyCode === 13) {
    const puzzleId = $(this).data("puzzleId");
    solvePuzzle(puzzleId, sol);
  } else {
    if (sol === "") {
      $(this).removeClass('is-invalid');
    }
  }
});

$(document).on("click", ".puzzle-check-btn", function(){
  const puzzleId = $(this).data("puzzleId");
  const sol = $(`.puzzle-input[data-puzzle-id="${puzzleId}"]`).val();
  solvePuzzle(puzzleId, sol);
});

$(document).on("click", "#btn-hints", function(){
  console.log(hintAppConditional)
  if (hintAppConditional) {
    $( "body" ).append(modalTemplate());
    $('#hintAppModal').modal('show');
    $('#hintAppModal').on('hidden.bs.modal', () => setTimeout(()=>$('#hintAppModal').remove(), 200));
  } else {
    waitingForHintReply = true;
    requestHint(100, "completed");
  }
});

let waitingForHintReply = false;
window.requestHintFinish = (completion, score, status) => {
  waitingForHintReply = true;
  requestHint(score, status ? "completed" : "failed");
};

const initSocketServer = (escapeRoomId, teamId, turnId, userId) => {
  socket = io('/', {query: {
    escapeRoom: escapeRoomId == "undefined" ? undefined : escapeRoomId, 
    team: teamId == "undefined" ? undefined : teamId, 
    turn: turnId == "undefined" ? undefined : turnId  
  }});
  myTeamId = teamId;
  myUserId = userId;

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

  /*New ranking event*/
  socket.on(RANKING, onRankingDiff); 

  /*Initial ranking*/
  socket.on(INITIAL_RANKING, onInitialRanking);

  /*Team join*/
  socket.on(JOIN_TEAM, onTeamJoin);

  /*Participant join*/
  socket.on(JOIN_PARTICIPANT, onParticipantJoin);

  /*Participant leave*/
  socket.on(LEAVE_PARTICIPANT, onParticipantLeave);

  /*Team leave*/
  socket.on(LEAVE_TEAM, onTeamLeave);

  /*Disconnect*/
  socket.on(DISCONNECT, onDisconnect);

  /*Reconnect*/
  socket.on(DISCONNECT, onReconnect);

};

$(()=>{
  if (escapeRoomHintLimit !== undefined && (escapeRoomHintLimit <= $("#hintList").children().length )){
    $('#btn-hints').attr("disabled", true)
  }

  try {
    if (progress !== undefined) {
      updateProgress(progress);
    }
  } catch (err) {

  }
  $('meta:not(:first)').attr('content', rgb2hex($('body').css("background-color") || "#FFFFFF"));

});