var socket;
var myTeamId;
var myUserName;
var alertMsg;

/** TEMPLATES **/
const hintTemplate = (hint ="", category) => {

  return `<li class="animated zoomInUp">
      <div class="card border-info mb-3">
          <div class="card-body">
              <div class="card-text">
                  ${category ? `<b>(${escapeHtml(category)})</b> `:''} ${escapeHtml(hint)}
             </div>
          </div>
      </div>
  </li>`;
};

const otherMsg = (info = "") => {
  return `<li class="animated zoomInUp">
      <div class="card border-info mb-3">
          <div class="card-body">
              <div class="card-text">
                  ${escapeHtml(info)}
            </div>
          </div>
      </div>
  </li>`;
};

const quizInstructionsTemplate = () => {
  return ` 
    <h4 class="instructions-button">
    ${i18n.instructionsQuiz}<br/><br/>
      <button class="btn btn-success" id="btn-start-quiz">
      ${i18n.start}
      </button>
    </p>`
};

const quizTemplate = () => {
  return `<iframe class="hintAppIframe" src="/escapeRooms/${escapeRoomId}/hintAppWrapper" lang="es"/>`
};

const catsTemplate = (categories, hints) => {
  return categories ? `<h4>${i18n.chooseCat}</h4><ul class="categories">
    ${categories.map(c=>`<li class=" card border-success category"><button class="cat-button" ${hints[c].length || ER.info.allowCustomHints ? "" : "disabled"} data-name="${c}">${c}</button></li>`).join("")}
  </ul>` : '';
};

const retoMsg = (puzzle, sol) => {
  return `<li class="card reto-puzzle-li reto-puzzle-current animated zoomInUp"> 
      <h6><b>${puzzle.title}</b></h6>
      ${puzzle.correct ? `<p><b>${i18n.msg}:</b> ${escapeHtml(puzzle.correct)}</p>`:``}
      ${puzzle.automatic ? '':`<p><b>${escapeHtml(i18n.sol)}:</b> <span class="hidden-sol">${escapeHtml(sol)}</span></p>`}
  </li>`;
}

const blockTemplate = (content, index) => `<div class="content-block" data-id="${index}" id="content-${index}">${content}</div>`;
const rankingEmptyTemplate = ()=>`
    <ranking>
        <div class="ranking-table table" style="height: 229px; ">
            <div class="ranking-row ranking-header table-primary" style="top: 0px;" >
                <div class="ranking-pos">#</div>
                <div class="ranking-team">Team</div>
                <div class="ranking-members">Members</div>
                <div class="ranking-res">Progress</div>
                <div class="ranking-time">Time</div>
            </div>
            <div class="ranking-row " style="top: 75px;">
                <div class="ranking-pos">1</div>
                <div class="ranking-team">Team 1</div>
                <div class="ranking-members">Student A, Student B</div>
                <div class="ranking-res">3/3</div>
                <div class="ranking-time">1h 2min</div>
            </div>
            <div class="ranking-row " style="top: 150px;">
                <div class="ranking-pos">2</div>
                <div class="ranking-members">Student C, Student D</div>
                <div class="ranking-res">2/3</div>
                <div class="ranking-time">---</div>
            </div>
        </div>
    </ranking>
`
var countdownTemplate = ()=> `<countdown/>`;
var progressBarTemplate = ()=> `<progressbar>
    <div class="col-xs-12 col-md-8 col-md-push-2 col-lg-6 col-lg-push-3"  style="margin:auto;">
        <div class="progress">
            <div class="progress-bar puzzle-progress bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    </div>
</progressbar>
`;

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
};

const onDisconnect = () => {
  console.log("Disconnect")
  $('.alert').remove();
  setTimeout(()=>{
    alertMsg = createAlert("danger", i18n["disconnect"], true);
  },100)
};

const onReconnect = () => {
  console.log("Reconnect")
  $('.alert').remove();
  alertMsg = createAlert("warning", i18n["reconnect"], true);
};

const onStart = () => {
}

const onStop = async () => {
  alertMsg = createAlert("warning", i18n["timeUp"]);
  await forMs(10000);
  window.location = `/escapeRooms/${escapeRoomId}/finish`;
}

const onJoin = ({ranking}) => {
  if (ranking) {
    onRanking({ranking});
  }
  // console.log("Someone from your team has joined the ER")
  // alertMsg = createAlert("info", i18n["teamJoined"]);
}

const onPuzzleResponse = async ({code, correctAnswer, solution, "puzzleOrder": puzzleOrderPlus, participation, authentication, erState, msg, participantMessage, content, teamInstructions }) => {
  const feedback = (msg) + (participantMessage && participation !== "PARTICIPANT" ? `. ${participantMessage}`: "");
  const puzzleOrder = puzzleOrderPlus - 1;
  if (code === "OK") {
    let nextPuzzleOrder = null;
    let nextPuzzle = null;
    let blockIndexes =  (window.ER.erState.content || []).map(b=>b.index);

    if (!ER.erState.retosSuperados.some(r => r == puzzleOrder)) { // Not solved before
      updateSuperados(puzzleOrder);

      window.ER.erState.content = content || window.ER.erState.content;
      updateContent(window.ER.erState.content);

      appendRetoMsg(ER.info.escapeRoomPuzzles[puzzleOrder], solution);

      let correct = msg === i18n.correct ? '': escapeHtml(feedback);
      let time = 5000;
      try {
        time = correct.split(" ").length*1100;
      } catch(e){}
      createAlert("success", `<b>${i18n.newRetoSuperado}</b><br/> ${correct}`, false, time);
      const isLast = ER.erState.retosSuperados.length === ER.info.totalPuzzles;
      if (!isLast) {
        const puzzleIndex = ER.info.escapeRoomPuzzles.findIndex(puzzle => puzzle.order == puzzleOrder);
        if (puzzleIndex > -1  && (puzzleIndex < (ER.info.escapeRoomPuzzles.length - 1)) && ER.erState.latestRetoSuperado !== ER.info.totalPuzzles - 1){
          nextPuzzle = ER.info.escapeRoomPuzzles[puzzleIndex + 1];
          nextPuzzleOrder = nextPuzzle.order;
        } else {
          nextPuzzleOrder = ER.erState.pending[0];
          nextPuzzle = ER.info.escapeRoomPuzzles[nextPuzzleOrder];
        }
      }
      checkAvailHintsForPuzzle(nextPuzzleOrder);
      ER.erState.currentlyWorkingOn = nextPuzzleOrder;
      autoPlay(blockIndexes);
      setPuzzleLS(blockIndexes);

      await forMs(1000);
      updatePuzzle(nextPuzzleOrder, nextPuzzle, puzzleOrder);
      if (isLast) {
        finish();
      }
    }
  } else {
    if (msg !== i18n.wrong) {
      let incorrect = escapeHtml(feedback);
      let time = 5000;
      try {
        time = incorrect.split(" ").length*1000;
      } catch(e){}
      createAlert("danger", incorrect, false, time);
    }
    if (ER.erState.waitingForPuzzleReply) {
      $('#puzzle-input').addClass(correctAnswer ? 'is-valid':'is-invalid');
    }
  }
  ER.erState.waitingForPuzzleReply = false;
  $('html').css('cursor','auto');
};

const onHintResponse = async ({code, hintOrder: hintOrderPlus, puzzleOrder: puzzleOrderPlus, category, msg}) => {
  const message = msg;
  const hintOrder = hintOrderPlus - 1;
  const puzzleOrder = puzzleOrderPlus - 1;
  
  if (hintOrderPlus) { // Existing hint
    updateHint(puzzleOrder, hintOrder, category);
    const moreAvail = checkAvailHintsForPuzzle(puzzleOrder);
    if (ER.erState.waitingForHintReply) {  // Receive a hint that you requested
      if (ER.info.hintAppConditional) {
        await forMs(2500);
      }
      cleanHintModal();
      appendHint(message, puzzleOrder, category);
      $('.reto-hint-title-'+puzzleOrder).first().removeClass('animated')
    } else { // Someone in my team obtained a hint
      let time = 10000;
      try {
        time = message.split(" ").length*700;
      } catch(e){}
      createAlert("success", `<b>${i18n.newHint}</b><br/>${escapeHtml(message)}`, false, time);
      await forMs(1000);
      appendHint(message, puzzleOrder, category);
      if (!moreAvail) {
        cleanHintModal();
      }
      $('.reto-hint-title-'+puzzleOrder).first().removeClass('animated');
    }
    
  } else if(ER.info.allowCustomHints) {
    if (code == "OK") { // Hint obtained
      updateHint(puzzleOrder, null, category);
      const moreAvail = checkAvailHintsForPuzzle(puzzleOrder);
      if (ER.erState.waitingForHintReply) { // Receive a hint that you requested
        if (ER.info.hintAppConditional) {
          try {
            $(".hintAppIframe")[0].contentWindow.document.getElementsByTagName('iframe')[0].contentWindow.changeModalMsg(i18n.dontClose);
          } catch(e) {
            createAlert("warning", i18n.dontClose);
          }
        } else {
          createAlert("warning", i18n.noMoreLeft);

        }
      } else { // Receive a hint that someone else requested
        if (!moreAvail) {
          if (ER.info.hintAppConditional) {
            cleanHintModal();
          }
        } 
        createAlert("warning", i18n.noMoreLeftTeam);
        
      }
    } else { // Hint not obtained (only quiz strategy)
      if (ER.erState.waitingForHintReply) { // Receive a hint that you requested
        await forMs(5000);
        cleanHintModal();
      }
    }
  } else {
    if (ER.erState.waitingForHintReply) {
      await forMs(5000);
      cleanHintModal();
    }
  }
  ER.erState.waitingForHintReply = false; // Stop waiting for hint response
  $('html').css('cursor','auto');
  
};

const onInitialInfo = ({code, erState, participation}) => {
  if (participation != "AUTHOR" && (code && code === "NOK")) {
    window.location = `/escapeRooms/${escapeRoomId}/`;
  }

  if (erState && erState.ranking) {
    onRanking({ranking: erState.ranking})
  }
};

const onMessage = ({msg}) => {
  let time = 5000;
  alertMsg = createAlert("warning", msg, true, time);
}

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
const escapeHtml = (unsafe = "") => {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

const escapeUnsafeHtml = (unsafe = "") => {
  return unsafe
       .replace(/(<\s*script[^>]*>.*?<\s*\/\s*script>)/g, "")
}


const updateProgress = () =>  {
  if (ER.erState.retosSuperados && ER.erState.retosSuperados.length && ER.info.totalPuzzles) {
    const progress = Math.round(ER.erState.retosSuperados.length / ER.info.totalPuzzles*100);
    $('.puzzle-progress').attr('aria-valuenow', progress).css("width", progress + "%")
  }
}

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
  $('#modal-title').html('<b>'+i18n.Hints+'<b>');
  let currentReto = ER.info.escapeRoomPuzzles.find(p=>p.order === ER.erState.currentlyWorkingOn);
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
  $('#modal-title').html('<b>'+i18n.Info+'<b>');
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
  if (ER.erState.waitingForPuzzleReply) {$('#puzzle-input').addClass('is-valid');}
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

const updatePuzzle = (order, currentPuzzle, prevPuzzleOrder) => {
  if (order || order === 0) {
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
  $('.reto-hint-title-'+order).show();
}


const createAlert = (level = "info", msg, keep = false, time = 5000) => {
  const config = {"message": msg, "alertType": level, "position": "b l",  "hideAnimation": "slide", "showAnimation": "bounce"};
  if (!keep) {
    config.time = time;
    config.autoHide = true;
  }
  return $.easyAlert(config);
};

const updateHint = (puzzleOrder, hintOrder, category) => {
  ER.erState.latestHintObtained = new Date();
  if (hintOrder === null) {
    ER.erState.customHints++;
  }
  const currentPuzzle = ER.info.escapeRoomPuzzles.find(puz => puz.order === puzzleOrder);
  const actualCat = category || currentPuzzle.categories[0];
  if (ER.erState.reqHints[puzzleOrder].indexOf(hintOrder) === -1 ) { // Not hint requested before
    ER.erState.reqHints[puzzleOrder].push(hintOrder);
     ER.erState.automaticHints++;
    if (currentPuzzle && hintOrder !== null) {
      const hintArr = currentPuzzle.hints[actualCat];
      const idx = hintArr.indexOf(hintOrder);
      if (idx !== -1) {
        hintArr.splice(idx, 1);
      }
    }
  }
}

const updateSuperados = (puzzleOrder) => {
  ER.erState.retosSuperados.push(puzzleOrder)
  const pendingIndex = ER.erState.pending.indexOf(puzzleOrder);
  if (pendingIndex !== -1 ) {ER.erState.pending.splice(pendingIndex, 1);} 
  ER.erState.latestRetoSuperado = ER.erState.retosSuperados.length ? Math.max(...ER.erState.retosSuperados) : null;
}

var insertContent = (type, payload, puzzles, index, prevIndex) => {
  var content = "";
  switch(type){
    case "countdown":
      content = countdownTemplate();
      break;
    case "ranking":
      content = rankingEmptyTemplate();
      break;
    case "text":
      const replacedText = (payload.text || "").toString().replaceAll("__ESCAPP_USER__",encodeURIComponent(username)).replaceAll("__ESCAPP_TOKEN__",token).replaceAll("__ESCAPP_LOCALE__",ER.locale)
      content = `<div class="cke_editable" id="block-${index}">${escapeUnsafeHtml(replacedText)}</div>`;
      break;
    case "progress":
      content = progressBarTemplate();
      break;
    default:
  }
  var htmlContent = $(blockTemplate(content, index));
  if (prevIndex === null) {
    $('#editor').prepend(htmlContent);
  } else {
    $(htmlContent).insertAfter(`#content-${prevIndex}`);
  }
  
};


const scrollToTargetAdjusted = (element) => {
  const offset = 60;
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

const updateContent = (content) => {
  var newIndexes = content.map(c=>parseInt(c.index,10));
  var first = null;
  $('.content-block').each((_i,e)=>{
    var id = parseInt($(e).data("id"),10);
    if (newIndexes.indexOf(id) === -1) {
      $(e).remove();
    }
  });

  let prevIndex = null;

  for (var i in content) {
    var block = content[i];
    if ($(`#content-${block.index}`).length){ // It was already there
      //$('#editor').append($(`#content-${block.index}`));
    } else {
      first = first === null ? block.index : first;
      insertContent(block.type, block.payload, block.puzzles, block.index, prevIndex);
    }
    prevIndex = block.index;

  }
  
  if (first !== null && document.getElementById(`content-${first}`)) {
    scrollToTargetAdjusted(document.getElementById(`content-${first}`));
  }
  window.initCountdown();
  $('ranking').html(rankingTemplate(teams, myTeamId));
  updateProgress();
}

const finish = async () => {
  window.stopped = true
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
    updateHintTooltip(i18n.cantRequestMore);
    return false;
  }

  if (ER.info.escapeRoomHintLimit !== undefined && ER.info.escapeRoomHintLimit <= ( ER.erState.automaticHints + ER.erState.customHints)){
    $('.btn-hints').attr("disabled", true);
    updateHintTooltip(i18n.cantRequestMore);
    return false;
  }

  if (ER.info.allowCustomHints) {
    $('.btn-hints').attr("disabled", false);
    updateHintTooltip(i18n.canRequest);
  } else {
    const puzzle = ER.info.escapeRoomPuzzles.find(p => p.order === puzzleOrder);
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
        updateHintTooltip(i18n.canRequest);
      } else {
        $('.btn-hints').attr("disabled", true);
        updateHintTooltip(i18n.cantRequestMoreThis);
        return false;
      }
    }
  }
  if (ER.info.hintInterval && ER.erState.latestHintObtained) {
    const timeSinceLastHint = (new Date() - ER.erState.latestHintObtained)/1000/60;

    if (timeSinceLastHint < ER.info.hintInterval) {
      const timeAhead = (ER.info.hintInterval - timeSinceLastHint) ;
      const each = timeAhead < 1 ? `${Math.round(timeAhead*60)} s.`:`${Math.round(timeAhead)} min.`;
      const timeAheadMs = timeAhead * 60 * 1000;
      timerFreq = setTimeout(()=>{
        checkAvailHintsForPuzzle(ER.erState.currentlyWorkingOn)
      }, timeAheadMs);

      const interval = ()=>{
          const timeSinceLastHint = (new Date() - ER.erState.latestHintObtained)/1000/60;
          const timeAhead = (ER.info.hintInterval - timeSinceLastHint) ;
          const each = timeAhead < 0.95 ? `${Math.round(timeAhead*60)} s.`:`${Math.ceil(timeAhead)} min.`;
          updateHintTooltip(i18n.notUntil + " " + each);
      }

      setTimeout(()=>{
        timerTitle = setInterval(interval, 5000);
        interval();
      }, timeAheadMs % 5000);
      
      updateHintTooltip(i18n.notUntil + " " + each);
      $('.btn-hints').attr("disabled", true);
      return false;
    }
  }
  return true;
}

const yesCat = (categories, hints) => {
  $( ".hints-modal-main-content").hide();
  $( ".hints-modal-cats" ).html(catsTemplate(categories, hints));
  $( ".hints-modal-cats").show();
};

const chooseCat = async (cat) =>  {
  if (ER.info.hintAppConditional) {
    chosenCat = cat;
    $('.hints-modal-cats').html("");
    $('.hints-modal-quiz').html(quizInstructionsTemplate());
  } else {
    ER.erState.waitingForHintReply = true;
    $('html').css('cursor','wait');
    $('.cat-button').attr("disabled", true);
    requestHint(100, "completed", cat);
  }
}

const noCat = () => {
  if (ER.info.hintAppConditional) {
    $( ".hints-modal-main-content").hide();
    $('.hints-modal-quiz').html(quizInstructionsTemplate());
  } else {
    ER.erState.waitingForHintReply = true;
    $('html').css('cursor','wait');
    requestHint(100, "completed");
  }
}

let chosenCat = null
window.requestHintFinish = (completion, score, status) => {
  ER.erState.waitingForHintReply = true;
  $('html').css('cursor', 'wait');
  requestHint(score, status ? "completed" : "failed", chosenCat);
  chosenCat = null;
};


const setPuzzleLS = (newBlocks = []) => setTimeout(()=>{
    localStorage["escapp_"+escapeRoomId] =  ER.erState.startTime.toString() + "_" + newBlocks.join(",");
}, 3000);

const autoPlay = (newBlocks = []) => {
    let ls = localStorage["escapp_" + escapeRoomId];
    let erSt = null;
    let previousBlocks = [];
    try {
      [erSt, previousBlocks] = localStorage["escapp_"+escapeRoomId].split("_");
      previousBlocks = previousBlocks.split(",");
    } catch(e) {}

    for (let b in newBlocks) {
      let block = newBlocks[b].toString();
      if (erSt !== ER.erState.startTime.toString() || (previousBlocks.indexOf(block) === -1)) { // First time
        let auto = $( `#block-${block} [autoplay]` );
        let youtube = false;

        if (!auto.length) { // Iframe
          youtube = true;
          auto = $(`#block-${block} iframe`).filter(function() {
            return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
          });
        } 
        if (!auto.length) { // Video
          auto = $(`#block-${block} video`).filter(function() {
            return $(this).attr("src").toLowerCase().indexOf("autoplay".toLowerCase()) != -1;
          });
        }
        if (auto.length) {
          const play = async function(el) {
            try {
              await openFullScreen(el);
            } catch(e2){}
            if (youtube){
              try {
                await el.playVideo();
                return true;
              } catch(e4){return true;}
            } else {
              try {
                await el.play();
                return true;
              } catch(e3){return false;}
            }
              
          };

          setTimeout(async ()=>{
            if (youtube) {
              const ok = await play(auto[0]);
                if (!ok) {
                  $('#autoplay-btn').click(async ()=>{
                    $('#autoplay-alert').hide();
                    await play(auto[0])
                  });
                  $('#autoplay-alert').show({"backdrop": true})
                  await play(auto[0]);
                }
            } else {
              try {
                const ok = await play(auto[0]);
                if (!ok) {
                  $('#autoplay-btn').click(async ()=>{
                    $('#autoplay-alert').hide();
                    await play(auto[0])
                  });
                  $('#autoplay-alert').show({"backdrop": true})
                  await play(auto[0]);
                }
              } catch(e){
              }
            }
            try {
              await openFullScreen(auto[0])
            } catch(e){
            } finally {
              // setTimeout(()=>{
                // var el = auto.first();
                // var elOffset = el.offset().top;
                // var elHeight = el.height();
                // var windowHeight = $(window).height();
                // var offset;
                // if (elHeight < windowHeight) {
                //   offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
                // } else {
                //   offset = elOffset;
                // }
              //   document.body.scrollTop = offset;
              //   document.documentElement.scrollTop = offset;
              // },00)
            };
          }, 100)
        }
      } else {
        try {
          $(`#block-${block} [autoplay]`).each((_i,e)=>e.pause());
        } catch (e) {}
        try {
          $(`#block-${block} video`).each((_i,e)=>e.pause());
        } catch (e) {}
        // try {
        //   $(`#block-${block} iframe`).each((_i,e)=>e.src = e.src.replace("autoplay=1","autoplay=0"));
        // } catch (e) {}
    }
  }
}
/*******************************************************************/

const initSocketServer = (escapeRoomId, teamId, turnId, username) => {
  socket = io('/', {query: {
    escapeRoom: escapeRoomId == "undefined" ? undefined : escapeRoomId, 
    turn: turnId == "undefined" ? undefined : turnId  
  }});
  myTeamId = teamId;
  myUsername = username;
  /*Connect*/
  socket.on("connect", onConnect);

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

  /*Message */
  socket.on("MESSAGE", onMessage);

  /*Join*/
  // socket.on("LEAVE", onLeave); 

  /*Participant leave*/
  socket.on("LEAVE_PARTICIPANT", onLeave);

  /*Team leave*/
  socket.on("LEAVE_TEAM", onLeave);

  /*Disconnect*/
  socket.on("disconnect", onDisconnect);

  /*Reconnect*/
  socket.on("reconnect", onConnect);

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
  checkAvailHintsForPuzzle(ER.erState.currentlyWorkingOn);
  /** BTN ACTIONS **/

  $(document).on("keyup", "#puzzle-input", function(ev){
    const sol = $(this).val();
    if (ev.keyCode === 13) {
      const puzzleOrder = $(this).data("puzzleOrder");
      ev.preventDefault();
      ER.erState.waitingForPuzzleReply = true;
      solvePuzzle(puzzleOrder, sol);
    } else {
      $(this).removeClass('is-invalid');
      $(this).removeClass('is-valid');
    }
  });

  $(document).on("click", "#puzzle-check-btn", function(){
    const puzzleOrder = $(this).data("puzzleOrder");
    const sol = $(`#puzzle-input`).val();
    ER.erState.waitingForPuzzleReply = true;
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
  updateContent(window.ER.erState.content);
  // Mobile header
  $('meta:not(:first)').attr('content', rgb2hex($('nav').first().css("background-color") || "#FFFFFF"));

  // Autoplay videos
  let blockIndexes  = (window.ER.erState.content || []).map(b=>b.index);
  autoPlay(blockIndexes);
  setPuzzleLS(blockIndexes);

});