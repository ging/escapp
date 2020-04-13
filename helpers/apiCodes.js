const NOK = "NOK";
const PARTICIPANT = "PARTICIPANT";
const OK = "OK";
const NOT_ACTIVE = "NOT_ACTIVE";
const NOT_STARTED = "NOT_STARTED";
const TOO_LATE = "TOO_LATE";
const NOT_A_PARTICIPANT = "NOT_A_PARTICIPANT";
const AUTHOR = "AUTHOR";
const ERROR = "ERROR";

exports.RIGHT_ANSWER = OK;
exports.NOK = NOK;
exports.PARTICIPANT = PARTICIPANT;
exports.OK = OK;
exports.NOT_ACTIVE = NOT_ACTIVE;
exports.NOT_STARTED = NOT_STARTED;
exports.TOO_LATE = TOO_LATE;
exports.NOT_A_PARTICIPANT = NOT_A_PARTICIPANT;
exports.AUTHOR = AUTHOR;
exports.ERROR = ERROR;

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
