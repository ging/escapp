import {GLOBAL_CONFIG} from '../config/config';
const {escapeRoomId, puzzleId, token, good, bad} = GLOBAL_CONFIG;

const ESCAPP_HOST = "http://localhost:3000" || "https://escapp.dit.upm.es";

let next_objective_id = 1;

const isEmbeddedInEscapp = () => {
  try {
    if (window.parent && window.parent.location) {
      const domain = ESCAPP_HOST.split("://")[1];
      if (window.parent.location.host.match(domain)) {
        return true;
      }
    }
  } catch (err) {
    return false
  } 
  return false  
}

export const checkEscapp = async(solution) => {

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = window.token || urlParams.get('token');
    const email = window.email || urlParams.get('email');
    const password = window.password || urlParams.get('password');
    const isNotLegacy = email && password;
    const URL = `${ESCAPP_HOST}/${isEmbeddedInEscapp() ? "" : "api/"}escapeRooms/${escapeRoomId}/puzzles/${puzzleId}/${isNotLegacy ? "submit" : "check"}`;
    const res = await fetch(URL, {
      "method": 'POST',
      "body": JSON.stringify(isNotLegacy ? {email, password, solution}:{token, solution}),
      "headers": {
        "Content-type": "application/json",
      },
    });
    const {msg} = await res.json();
    return {ok: res.ok, msg: msg || (res.ok ? good : bad) || ""};
  } catch (err){
    console.error(err);
    return {ok: false, msg: "Connection error"};
  }

};

export const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));


export function Objective(options){
  // Constructor
  let defaults = {
    id:next_objective_id,
    accomplished:false,
    progress_measure:0,
    score:null,
    accomplished_score:null,
  };
  let _objective = Object.assign({}, defaults, options);

  _objective.progress_measure = Math.max(0, Math.min(1, _objective.progress_measure));

  if(typeof _objective.score === "number"){
    _objective.score = Math.max(0, Math.min(1, _objective.score));
    if(typeof _objective.accomplished_score === "number"){
      _objective.accomplished_score = Math.min(_objective.accomplished_score, _objective.score);
    }
  }

  next_objective_id += 1;
  return _objective;
}

export function ResetObjective(objective){
  if(typeof objective !== "object"){
    return objective;
  }
  objective.accomplished = false;
  objective.accomplished_score = null;
  return objective;
}

export function shuffleArray(array){
  return array.map((a) => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
}