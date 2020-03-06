import SCORM_API from '../vendors/SCORM_API.js';

//SCORM Wrapper instance
var scorm;

export function init(debug=true,windowDebug=false){
  scorm = new SCORM_API({debug: debug, windowDebug: windowDebug, exit_type: ""});
  scorm.initialize();
  scorm.debug("Connected: " + scorm.API.isActive,4);
  return scorm;
}

export function getInstance(){
  if(typeof scorm != "undefined"){
    return scorm;
  }
  return undefined;
}

export function getAPIInstance(){
  if((typeof scorm != "undefined")&&(typeof scorm.API != "undefined")&&(scorm.API.isActive)){
    return scorm.API;
  }
  return undefined;
}

export function isConnected(){
  if (typeof getAPIInstance() == "undefined"){
    return false; 
  }
  return scorm.API.isActive;
}

export function getUserProfile(){
  var user = {};
  if(isConnected()){
    user.name = scorm.getvalue('cmi.learner_name');
    user.id = scorm.getvalue('cmi.learner_id');
    user.learner_preference = {};
    var learnerPreferenceChildren = scorm.getvalue('cmi.learner_preference._children');
    if(learnerPreferenceChildren != 'false'){
      var learnerPreferences = learnerPreferenceChildren.split(",");
      for(var i=0; i<learnerPreferences.length; i++){
        if((typeof learnerPreferences[i] == "string")&&(learnerPreferences[i].length>0)){
          user.learner_preference[learnerPreferences[i]] = scorm.getvalue('cmi.learner_preference.' + learnerPreferences[i]);
        }
      }
    }
  }
  return user;
}

/*
* ProgressMeasure should be a number on a [0,1] scale.
*/
export function updateProgressMeasure(progressMeasure,COMPLETION_THRESHOLD,COMPLETION_ATTEMPT_THRESHOLD){
  if(typeof progressMeasure == "number"){
    progressMeasure = Math.max(0,Math.min(1,progressMeasure));
    scorm.setvalue('cmi.progress_measure',progressMeasure.toString());
    this.updateCompletionStatus(progressMeasure,COMPLETION_THRESHOLD,COMPLETION_ATTEMPT_THRESHOLD);
  }
}

export function updateCompletionStatus(progressMeasure,COMPLETION_THRESHOLD=0,COMPLETION_ATTEMPT_THRESHOLD=0){
  if(typeof progressMeasure != "number"){
    progressMeasure = 0;
  }
  var completionStatus;
  if(progressMeasure >= COMPLETION_THRESHOLD){
    completionStatus = "completed";
  } else if (progressMeasure>=COMPLETION_ATTEMPT_THRESHOLD){
    completionStatus = "incomplete";
  } else {
    completionStatus = "not attempted";
  }
  scorm.setvalue('cmi.completion_status',completionStatus);
}

 /*
  * Score should be a number on a [0,1] scale.
  */
export function updateScore(score,SCORE_THRESHOLD){
  if(typeof score == "number"){
    score = Math.max(0,Math.min(1,score));
    scorm.setvalue('cmi.score.scaled',score.toString());
    scorm.setvalue('cmi.score.raw',(score*100).toString());
    this.updateSuccessStatus(score,SCORE_THRESHOLD);
  }
}

export function updateSuccessStatus(score,SCORE_THRESHOLD=0.5){
  var successStatus;
  if(typeof score != "number"){
    successStatus = "unknown";
  } else if(score >= SCORE_THRESHOLD){
    successStatus = "passed";
  } else {
    successStatus = "failed";
  }
  scorm.setvalue('cmi.success_status',successStatus);
}

export function initScore(){
  scorm.setvalue('cmi.score.min',(0).toString());
  scorm.setvalue('cmi.score.max',(100).toString()); 
}

export function commit(){
  return scorm.commit();
}

export function onExit(){
  // scorm.commit(); terminate will call commit
  scorm.terminate();
}