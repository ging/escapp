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
                  ${category ? `<b>(${category})</b> `:''} ${hint}
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
  return `<iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper" lang="es"/>`
}

const catsTemplate = (categories, hints) => {
  return categories ? `<h4>${i18n.chooseCat}</h4><ul class="categories">
    ${categories.map(c=>`<li class=" card border-success category"><button class="cat-button" ${hints[c].length || allowCustomHints ? "" : "disabled"} data-name="${c}">${c}</button></li>`).join("")}
  </ul>` : '';
}

const retoMsg = (puzzle, sol) => {
  return `<li class="card reto-puzzle-li reto-puzzle-current animated zoomInUp"> 
      <h6><b>${puzzle.title}</b></h6>
      ${puzzle.correct ? `
      <p>
        <b>${i18n.msg}:</b> ${puzzle.correct}
      </p>`:``}
      ${puzzle.automatic ? '':`<p>
        <b>${i18n.sol}:</b> <span class="hidden-sol">${sol}</span>
      </p>
      `
      }
      
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
    alertMsg = createAlert("success", i18n["connected"]);
  }
}
 
const onStart = () => {
}

const onStop = async () => {
  alertMsg = createAlert("warning", i18n["timeUp"]);
  await forMs(10000);
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = () => {
  // console.log("Someone from your team has joined the ER")
  // alertMsg = createAlert("info", i18n["teamJoined"]);
}


const onDisconnect = () => {
  $('.alert').remove();
  alertMsg = createAlert("danger", i18n["disconnect"], true);
};

const onReconnect = () => {
  console.log("Reconnect")
  $('.alert').remove();
  alertMsg = createAlert("warning", i18n["reconnect"], true);
};

const onPuzzleResponse = async ({code, correctAnswer, solution, "puzzleOrder": puzzleOrderPlus, participation, authentication, erState, msg, participantMessage}) => {
  const feedback = (msg) + (participantMessage && participation !== "PARTICIPANT" ? `<br/> ${participantMessage}`: "");
  const puzzleOrder = puzzleOrderPlus - 1;
  if (code === "OK") {
    let nextPuzzleOrder = null;
    let nextPuzzle = null;
    if (!retosSuperados.some(r => r == puzzleOrder)) {
      updateSuperados(puzzleOrder)
      updateProgress(Math.round(retosSuperados.length/totalPuzzles*100));
      createAlert("success", `<b>${i18n.newRetoSuperado}</b><br/> ${msg === i18n.correctAnswer ? '': feedback }`);
      appendRetoMsg(escapeRoomPuzzles[puzzleOrder], solution);
      if (retosSuperados.length === totalPuzzles) {
        await finish();
      } else {
        const puzzleIndex = escapeRoomPuzzles.findIndex(puzzle => puzzle.order == puzzleOrder);
        if (puzzleIndex > -1  && (puzzleIndex < (escapeRoomPuzzles.length - 1)) && latestRetoSuperado !== totalPuzzles - 1){
          nextPuzzle = escapeRoomPuzzles[puzzleIndex + 1];
          nextPuzzleOrder = nextPuzzle.order;
        } else {
          nextPuzzleOrder = pending[0];
          nextPuzzle = escapeRoomPuzzles[nextPuzzleOrder];
        }
      }
      checkAvailHintsForPuzzle(nextPuzzleOrder);
      await forMs(300);
      updatePuzzle(nextPuzzleOrder, nextPuzzle, puzzleOrder);
      
    }
  } else {
    console.log(msg)
    if (msg !== i18n.wrongAnswer) {
      createAlert("danger", feedback);
    }
    if (waitingForPuzzleReply) {
      $('#puzzle-input').addClass('is-invalid');
    }
  }
  waitingForPuzzleReply = false;

};

const onHintResponse = async ({code, hintOrder: hintOrderPlus, puzzleOrder: puzzleOrderPlus, category, msg}) => {
  const message = msg;
  const hintOrder = hintOrderPlus - 1;
  const puzzleOrder = puzzleOrderPlus - 1;
  if (hintOrderPlus) { // Existing hint
    updateHint(puzzleOrder, hintOrder, category);
    const moreAvail = checkAvailHintsForPuzzle(puzzleOrder);

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
      createAlert("success", `<b>${i18n.newHint}</b><br/>${message}`);
      await forMs(1000);
      appendHint(message, puzzleOrder, category);
      if (!moreAvail) {
        cleanHintModal();
      }
      $('.reto-hint-title-'+puzzleOrder).first().removeClass('animated')
    }
    
  } else if(allowCustomHints) {
    if (code == "OK") { // Hint obtained
      latestHintRequestedTime = new Date();
      if (waitingForHintReply) { // Receive a hint that you requested
        if (hintAppConditional) {  // Modal is open
          $('.hints-modal-no-left').html(`<p>${i18n.dontClose}</p>`);
        } else { // Free hint
          $('.hints-modal-no-left').html(`<p>${i18n.noMoreLeft}</p>`);
        }
      } else { // Receive a hint that someone else requested
        const moreAvail = checkAvailHintsForPuzzle(puzzleOrder);
        if (!moreAvail) {
          $('.hints-modal-no-left').html(`<p>${i18n.noMoreLeftTeam}</p>`);
        }
        createAlert("success", message);
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
      cleanHintModal();
    }
    waitingForHintReply = false; // Stop waiting for hint response
    $('html').css('cursor','auto');
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

const appendHint = (message, puzzleOrder, category) => {
  $('#requested-hints-title').show();
  $('.reto-hint-title-'+puzzleOrder).show();
  $('.reto-hint-title-'+puzzleOrder + ' .no-req-hints').hide();
  $('.reto-hint-title-'+puzzleOrder + ' .hintList').prepend(hintTemplate(message, category))
};

const appendRetoMsg = (puzzle, sol) => {
  if (waitingForPuzzleReply) {$('#puzzle-input').addClass('is-valid');}
  $('.retoList').append(retoMsg(puzzle, sol));
  $('#puzzle-messages-title').show();
  $('.reto-puzzle-current').removeClass('reto-puzzle-current');
  $('.reto-puzzle-li').last().addClass('reto-puzzle-current');
};

const appendExtraInfo = (info) => {
  $('.otherList').prepend(otherMsg(info));
  $('#other-messages-title').show();

}
const updateHintTooltip = (msg) => {
  $('.btn-hints-title').attr("data-original-title", msg).tooltip('update');
  if(showNavT) {
    $('#btn-hints-nav-tooltip').tooltip("hide").tooltip("show");
  }
  if (showModT) {
    $('#'+showModT).tooltip("hide").tooltip("show");
  }
}

const updatePuzzle = (order, currentPuzzle) => {
  if (order || order === 0) {
      currentlyWorkingOn = order;
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
  $('.reto-hint-title-'+prevPuzzleOrder).show();
  $('.reto-hint-title-'+nextPuzzleOrder).show();
}


const createAlert = (level = "info", msg) => {
  $.easyAlert({"message": msg, "alertType": level, "position": "b l", "time": 5000, "autoHide": true, "hideAnimation": "slide", "showAnimation": "bounce"});
};

const updateHint = (puzzleOrder, hintOrder, category) => {
  latestHintRequestedTime = new Date();
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
}

const updateSuperados = (puzzleOrder) => {
  retosSuperados.push(puzzleOrder)
  const pendingIndex = pending.indexOf(puzzleOrder);
  if (pendingIndex !== -1 ) {pending.splice(pendingIndex, 1);} 
  latestRetoSuperado = retosSuperados.length ? Math.max(...retosSuperados) : null;
}


const finish = async () => {
  await forMs(1000);
  confetti.start(10000);
  $('#finish').show();
}

let timerFreq = null;
let timerTitle = null;
const checkAvailHintsForPuzzle = (puzzleOrder) => {
  if (timerFreq) {
    clearInterval(timerFreq);
  }
  if (timerTitle) {
    clearTimeout(timerTitle);
  }

  if (puzzleOrder === null || puzzleOrder === undefined) {
    $('.btn-hints').attr("disabled", true);
    updateHintTooltip(i18n["cantRequestMore"]);
    return false;
  }

  if (escapeRoomHintLimit !== undefined && escapeRoomHintLimit <= reqHintsListOrder.length){
    $('.btn-hints').attr("disabled", true);
    updateHintTooltip(i18n["cantRequestMore"]);
    return false;
  }

  if (allowCustomHints) {
    $('.btn-hints').attr("disabled", false);
    updateHintTooltip(i18n["canRequest"]);
  } else {
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
        updateHintTooltip(i18n["canRequest"]);
      } else {
        $('.btn-hints').attr("disabled", true);
        updateHintTooltip(i18n["cantRequestMoreThis"]);
        return false;
      }
    }
  }
  if (hintInterval && latestHintRequestedTime) {
    const timeSinceLastHint = (new Date() - latestHintRequestedTime)/1000/60;

    if (timeSinceLastHint < hintInterval) {
      const timeAhead = (hintInterval - timeSinceLastHint) ;
      const each = timeAhead < 1 ? `${Math.round(timeAhead*60)} s.`:`${Math.round(timeAhead)} min.`;

      timerFreq = setTimeout(()=>{
        checkAvailHintsForPuzzle(currentlyWorkingOn)
      }, timeAhead * 60 * 1000);

      timerTitle = setInterval(()=>{
        const timeSinceLastHint = (new Date() - latestHintRequestedTime)/1000/60;
        const timeAhead = (hintInterval - timeSinceLastHint) ;
        const each = timeAhead < 1 ? `${Math.round(timeAhead*60)} s.`:`${Math.round(timeAhead)} min.`;
        updateHintTooltip(i18n["notUntil"] + " " + each);
      }, 5000);
      
      updateHintTooltip(i18n["notUntil"] + " " + each);
      $('.btn-hints').attr("disabled", true);
      return false;
    }
  }
  return true;
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

  /*Team join*/
  socket.on("JOIN_TEAM", onJoin);

  /*Participant join*/
  socket.on("JOIN_PARTICIPANT", onJoin);

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

  /*Join*/
  // socket.on("LEAVE", onLeave); 

  /*Participant leave*/
  socket.on("LEAVE_PARTICIPANT", onLeave);

  /*Team leave*/
  socket.on("LEAVE_TEAM", onLeave);

  /*Disconnect*/
  socket.on("DISCONNECT", onDisconnect);

  /*Reconnect*/
  socket.on("DISCONNECT", onReconnect);

};
let showModT = false;
let showNavT = false;
$( ()=>{
  $('[data-toggle="tooltip"]').tooltip({placement: "bottom"})
  $('.btn-hints-modal-title').tooltip({placement: "bottom"})
    .on('show.bs.tooltip', function(e) {
      showModT= e.target.id;  
    })
    .on('hide.bs.tooltip', function(e) {
      showModT= false  
    });
  $('#btn-hints-nav-tooltip').tooltip({placement: "bottom"})
    .on('show.bs.tooltip', function(e) {
      showNavT= true  
    })
    .on('hide.bs.tooltip', function(e) {
      showNavT= false  
    });
  checkAvailHintsForPuzzle(currentlyWorkingOn);
  /** BTN ACTIONS **/

  $(document).on("keyup", "#puzzle-input", function(ev){
    const sol = $(this).val();
    if (ev.keyCode === 13) {
      const puzzleOrder = $(this).data("puzzleOrder");
      ev.preventDefault();
      waitingForPuzzleReply = true;
      solvePuzzle(puzzleOrder, sol);
    } else {
      $(this).removeClass('is-invalid');
      $(this).removeClass('is-valid');
    }
  });

  $(document).on("click", "#puzzle-check-btn", function(){
    const puzzleOrder = $(this).data("puzzleOrder");
    const sol = $(`#puzzle-input`).val();
    waitingForPuzzleReply = true;
    solvePuzzle(puzzleOrder, sol);
  });

  $(document).on("click", ".btn-hints-nav", function(){
    $('#btn-hints-nav-tooltip').tooltip("hide")
    hintReq();
    $('#hintModal').modal("show");
  });

  $(document).on("click", ".btn-hints-modal", function(){
    hintReq();
  });


  $(document).on("mouseover", ".btn-hints-modal", function(){
    $('#btn-hints-modal-tooltip').tooltip("show")
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
    if (localStorage["escapp_"+escapeRoomId] !== startTime.toString()) { // First time
      let auto = $( "[autoplay]" );
      if (!auto.length) { // Video
        auto = $("iframe").filter(function() {
          return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
        });
      } 
      if (!auto.length) {
        auto = $("video").filter(function() {
          return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
        });
      }
      if (auto.length) {
          setTimeout(()=>{
            var el = auto.first();
            var elOffset = el.offset().top;
            var elHeight = el.height();
            var windowHeight = $(window).height();
            var offset;
            if (elHeight < windowHeight) {
              offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
            } else {
              offset = elOffset;
            }
            try {
              toggleFullScreen(auto[0])
            } catch(e){
            } finally {
              setTimeout(()=>{
                document.body.scrollTop = offset;
                document.documentElement.scrollTop = offset;
              },100)
            };
          },100)
        }
        setTimeout(()=>{
          localStorage["escapp_"+escapeRoomId] = startTime.toString();
        }, 3000)
    } else {
      try {
        $( "[autoplay]" ).each((i,e)=>e.pause());
        $( "iframe" ).each((i,e)=>e.src = e.src.replace("autoplay=1","autoplay=0"));
      } catch (e) {}
  }
},500)


});