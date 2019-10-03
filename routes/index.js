const express = require("express"),
    router = express.Router();
const escapeRoomController = require("../controllers/escapeRoom_controller");
const turnController = require("../controllers/turnos_controller");
const puzzleController = require("../controllers/puzzle_controller");
const hintController = require("../controllers/hint_controller");
const userController = require("../controllers/user_controller");
const sessionController = require("../controllers/session_controller");
const teamController = require("../controllers/team_controller");
const participantController = require("../controllers/participants_controller");
const playController = require("../controllers/play_controller");
const membersController = require("../controllers/members_controller");
const analyticsController = require("../controllers/analytics_controller");

const multer = require("multer"),
    upload = multer({"dest": "./uploads/"});// Autologout

router.all("*", sessionController.deleteExpiredUserSession);


// History: Restoration routes.

// Redirection to the saved restoration route.
const redirectBack = (req, res) => {
    const url = req.session.backURL;

    delete req.session.backURL;
    res.redirect(url);
};

// Save the route that will be the current restoration route.
const saveBack = (req, res, next) => {
    req.session.backURL = req.url;
    next();
};

router.get([
    "/",
    "/escapeRooms"
], saveBack);

router.get("/goback", redirectBack);

// Autoload for routes using :escapeRoomId
router.param("escapeRoomId", escapeRoomController.load);
router.param("turnoId", turnController.load);
router.param("puzzleId", puzzleController.load);
router.param("hintId", hintController.load);
router.param("userId", userController.load);
router.param("teamId", teamController.load);


// Routes for LOGIN page /
router.get("/", sessionController.new); // Login form
router.post("/", sessionController.create); // Create sesion
router.delete("/", sessionController.destroy); // Close sesion

// Routes for the resource /users
router.get("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.show);
router.get("/users/new", userController.new);
router.post("/users", userController.create);
router.get("/users/index", userController.index);
router.get("/users/:userId(\\d+)/edit", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.edit);
router.put("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.update);
router.delete("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.destroy);
router.get("/users/:userId(\\d+)/escapeRooms", sessionController.loginRequired, sessionController.adminOrMyselfRequired, escapeRoomController.index);

// Routes for the resource /escapeRooms
router.get("/escapeRooms", sessionController.loginRequired, escapeRoomController.indexBreakDown);
router.get("/escapeRoomsAdmin", sessionController.loginRequired, sessionController.adminRequired, escapeRoomController.index);
router.get("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorOrParticipantRequired, escapeRoomController.show);
router.get("/escapeRooms/:escapeRoomId(\\d+)/preview", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.preview);

router.get("/escapeRooms/new", sessionController.loginRequired, sessionController.notStudentRequired, escapeRoomController.new);
router.post("/escapeRooms", sessionController.loginRequired, upload.single("image"), escapeRoomController.create);
router.get("/escapeRooms/:escapeRoomId(\\d+)/edit", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.edit);
router.put("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, upload.single("image"), escapeRoomController.update);
router.delete("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.destroy);

router.get("/escapeRooms/:escapeRoomId(\\d+)/appearance", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.temas);
router.post("/escapeRooms/:escapeRoomId(\\d+)/appearance", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.temasUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.turnos);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.turnosUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/puzzles", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.retos);
router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.retosUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/hints", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.pistas);
router.post("/escapeRooms/:escapeRoomId(\\d+)/hints", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, upload.single("hints"), escapeRoomController.pistasUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/evaluation", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.encuestas);
router.post("/escapeRooms/:escapeRoomId(\\d+)/evaluation", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.evaluationUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/instructions", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.instructions);
router.post("/escapeRooms/:escapeRoomId(\\d+)/instructions", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, escapeRoomController.instructionsUpdate);


router.get("/escapeRooms/:escapeRoomId(\\d+)/join", sessionController.loginRequired, sessionController.studentOrAdminRequired, escapeRoomController.studentToken);
router.post("/escapeRooms/:escapeRoomId(\\d+)/join", sessionController.loginRequired, sessionController.studentOrAdminRequired, turnController.indexStudent);
router.get("/escapeRooms/:escapeRoomId(\\d+)/activarTurno", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, turnController.indexActivarTurno);
router.put("/escapeRooms/:escapeRoomId(\\d+)/activar", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, turnController.activar);


router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles/new", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, puzzleController.create);
router.put("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, puzzleController.update);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, puzzleController.destroy);
router.get("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)/check", sessionController.loginRequired, sessionController.studentOrAdminRequired, puzzleController.check);


router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)/hints/new", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, hintController.create);
router.put("/escapeRooms/:escapeRoomId(\\d+)/hints/:hintId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, hintController.update);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/hints/:hintId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, hintController.destroy);


router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/new", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, turnController.create);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, turnController.destroy);

router.get("/escapeRooms/:escapeRoomId(\\d+)/hintApp", sessionController.loginRequired, /* EscapeRoomController.isParticipantRequired,*/ hintController.hintApp);
router.get("/escapeRooms/:escapeRoomId(\\d+)/hintAppWrapper", sessionController.loginRequired, /* EscapeRoomController.isParticipantRequired,*/ hintController.hintAppWrapper);
router.post("/escapeRooms/:escapeRoomId(\\d+)/requestHint", sessionController.loginRequired, /* EscapeRoomController.isParticipantRequired,*/ hintController.requestHint);
router.get("/escapeRooms/:escapeRoomId(\\d+)/xml", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, hintController.downloadMoodleXML);

router.get("/escapeRooms/:escapeRoomId(\\d+)/play", sessionController.loginRequired, escapeRoomController.adminOrAuthorOrParticipantRequired, playController.play);
router.get("/escapeRooms/:escapeRoomId(\\d+)/finish", sessionController.loginRequired, escapeRoomController.adminOrAuthorOrParticipantRequired, playController.finish);
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/play", sessionController.loginRequired, escapeRoomController.adminOrAuthorOrParticipantRequired, playController.play);

router.get("/inspiration", sessionController.loginRequired, (req, res) => res.render("inspiration"));
router.get("/resources", sessionController.loginRequired, (req, res) => res.render("resources"));
router.post("/escapeRooms/:escapeRoomId(\\d+)/confirm", sessionController.loginRequired, participantController.confirmAttendance);

// Routes for the resource participants of a turn
router.post("/escapeRooms/:escapeRoomId(\\d+)/users/:userId(\\d+)/selectTurno", sessionController.loginRequired, sessionController.studentOrAdminRequired, participantController.selectTurno);
router.get("/escapeRooms/:escapeRoomId(\\d+)/participants", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, participantController.index);
router.get("/escapeRooms/:escapeRoomId(\\d+)/teams", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, teamController.index);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turno/:turnoId(\\d+)/team/:teamId(\\d+)/user/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, participantController.studentLeave);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turno/:turnoId(\\d+)/team/:teamId(\\d+)", sessionController.loginRequired, participantController.studentLeave);

// Routes for the resource members of a team
router.put(
    "/escapeRooms/:escapeRoomId/users/:userId(\\d+)/participants/turnos/:turnoId(\\d+)/members/:teamId(\\d+)",
    sessionController.loginRequired, sessionController.studentOrAdminRequired,
    membersController.add
);

// Routes for the resource /teams
router.get("/escapeRooms/:escapeRoomId/users/:userId(\\d+)/turnos/:turnoId(\\d+)/teams/new", sessionController.loginRequired, sessionController.studentOrAdminRequired, teamController.new);
router.post("/escapeRooms/:escapeRoomId/users/:userId(\\d+)/turnos/:turnoId(\\d+)/teams", sessionController.loginRequired, sessionController.studentOrAdminRequired, teamController.create);
router.get("/escapeRooms/:escapeRoomId/turnos/:turnoId(\\d+)/teams", sessionController.loginRequired, sessionController.studentOrAdminRequired, teamController.indexTurnos);

// Routes for learning analytics
router.get("/escapeRooms/:escapeRoomId/analytics/", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.analytics);
router.get("/escapeRooms/:escapeRoomId/analytics/ranking", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.ranking);
router.get("/escapeRooms/:escapeRoomId/analytics/timeline", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.timeline);
router.get("/escapeRooms/:escapeRoomId/analytics/progress", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.progress);
router.get("/escapeRooms/:escapeRoomId/analytics/histogram", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.histogram);
router.get("/escapeRooms/:escapeRoomId/analytics/hints/participants", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.hintsByParticipants);
router.get("/escapeRooms/:escapeRoomId/analytics/hints/teams", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.hintsByTeams);
router.get("/escapeRooms/:escapeRoomId/analytics/puzzles/participants", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.puzzlesByParticipants);
router.get("/escapeRooms/:escapeRoomId/analytics/puzzles/teams", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.puzzlesByTeams);
router.get("/escapeRooms/:escapeRoomId/analytics/grading", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.grading);
router.get("/escapeRooms/:escapeRoomId/analytics/download", sessionController.loginRequired, escapeRoomController.adminOrAuthorRequired, analyticsController.download);

module.exports = router;
