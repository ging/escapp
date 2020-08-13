const NOK = "NOK";
const PARTICIPANT = "PARTICIPANT";
const OK = "OK";
const MESSAGE = "MESSAGE";
const NOT_ACTIVE = "NOT_ACTIVE";
const NOT_STARTED = "NOT_STARTED";
const TOO_LATE = "TOO_LATE";
const NOT_A_PARTICIPANT = "NOT_A_PARTICIPANT";
const AUTHOR = "AUTHOR";
const ERROR = "ERROR";
const DISCONNECT = "disconnect";
const HINT_RESPONSE = "HINT_RESPONSE";
const PUZZLE_RESPONSE = "PUZZLE_RESPONSE";
const TEAM_PROGRESS = "TEAM_PROGRESS";
const REQUEST_HINT = "REQUEST_HINT";
const SOLVE_PUZZLE = "SOLVE_PUZZLE";
const START = "START";
const STOP = "STOP";
const JOIN = "JOIN";
const JOIN_TEAM = "JOIN_TEAM";
const JOIN_PARTICIPANT = "JOIN_PARTICIPANT";
const LEAVE = "LEAVE";
const LEAVE_TEAM = "LEAVE_TEAM";
const LEAVE_PARTICIPANT = "LEAVE_PARTICIPANT";
const START_PLAYING = "START_PLAYING";
const INITIAL_INFO = "INITIAL_INFO";
const TEAM_STARTED = "TEAM_STARTED";

exports.RIGHT_ANSWER = OK;
exports.NOK = NOK;
exports.MESSAGE = MESSAGE;
exports.PARTICIPANT = PARTICIPANT;
exports.OK = OK;
exports.NOT_ACTIVE = NOT_ACTIVE;
exports.NOT_STARTED = NOT_STARTED;
exports.TOO_LATE = TOO_LATE;
exports.NOT_A_PARTICIPANT = NOT_A_PARTICIPANT;
exports.AUTHOR = AUTHOR;
exports.ERROR = ERROR;
exports.DISCONNECT = DISCONNECT;
exports.ERROR = ERROR;
exports.HINT_RESPONSE = HINT_RESPONSE;
exports.PUZZLE_RESPONSE = PUZZLE_RESPONSE;
exports.TEAM_PROGRESS = TEAM_PROGRESS;
exports.REQUEST_HINT = REQUEST_HINT;
exports.SOLVE_PUZZLE = SOLVE_PUZZLE;
exports.START = START;
exports.STOP = STOP;
exports.JOIN = JOIN;
exports.JOIN_TEAM = JOIN_TEAM;
exports.JOIN_PARTICIPANT = JOIN_PARTICIPANT;
exports.LEAVE = LEAVE;
exports.LEAVE_TEAM = LEAVE_TEAM;
exports.LEAVE_PARTICIPANT = LEAVE_PARTICIPANT;
exports.START_PLAYING = START_PLAYING;
exports.INITIAL_INFO = INITIAL_INFO;
exports.TEAM_STARTED = TEAM_STARTED;

exports.getAuthMessageAndCode = (participation, i18n, start) => {
    let code = NOK;
    let msg = "";
    let status = 403;

    switch (participation) {
    case PARTICIPANT:
        status = start ? 202 : 200;
        code = OK;
        msg = start ? i18n.api.alreadyParticipating : i18n.api.participant;
        break;
    case NOT_ACTIVE:
        msg = i18n.api.notActive;
        break;
    case TOO_LATE:
        msg = i18n.api.tooLate;
        break;
    case NOT_STARTED:
        code = start ? OK : NOK;
        msg = start ? i18n.api.participant : i18n.api.notStarted;
        break;
    case AUTHOR:
        status = 202;
        msg = i18n.api.isAuthor;
        break;
    case NOT_A_PARTICIPANT:
    default:
        msg = i18n.api.notAParticipant;
        break;
    }
    return {status, code, msg};
};
