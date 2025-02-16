const express = require("express"),
    router = express.Router();
const escapeRoomController = require("../controllers/escapeRoom_controller");
const turnoController = require("../controllers/turnos_controller");
const puzzleController = require("../controllers/puzzle_controller");
const hintController = require("../controllers/hint_controller");
const userController = require("../controllers/user_controller");
const sessionController = require("../controllers/session_controller");
const teamController = require("../controllers/team_controller");
const assetsController = require("../controllers/assets_controller");
const participantController = require("../controllers/participants_controller");
const playController = require("../controllers/play_controller");
const membersController = require("../controllers/members_controller");
const analyticsController = require("../controllers/analytics_controller");
const resourceController = require("../controllers/resource_controller");
const resourceAppController = require("../controllers/resource_app_controller");
const apiController = require("../controllers/api_controller");
const joinController = require("../controllers/join_controller");

const multer = require("multer"),
    upload = multer({"dest": "./uploads/"});

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
router.param("turnoId", turnoController.load);
router.param("puzzleId", puzzleController.load);
router.param("hintId", hintController.load);
router.param("userId", userController.load);
router.param("teamId", teamController.load);
router.param("resourceId", resourceController.load);
router.param("appId", resourceAppController.load);


// Routes for LOGIN / REGISTER page /
router.get("/", sessionController.new); // Login form
router.post("/", sessionController.create); // Create sesion
router.delete("/", sessionController.destroy); // Close sesion
router.get("/register", sessionController.logoutRequired, userController.new);
router.post("/accept-cookies", sessionController.cookieAccept);

// Routes for the resource /users
router.get("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.show);
router.get("/users/password-reset", sessionController.logoutRequired, userController.resetPassword);
router.get("/users/password-reset/:userId(\\d+)", sessionController.logoutRequired, userController.resetPasswordHash);
router.post("/users/password-reset", sessionController.logoutRequired, userController.newResetPassword);
router.post("/users/password-reset/:userId(\\d+)", sessionController.logoutRequired, userController.newResetPasswordHash);
router.post("/users", sessionController.logoutRequired, userController.create, sessionController.create);
router.get("/users/index", sessionController.loginRequired, sessionController.adminRequired, userController.index);
router.get("/users/:userId(\\d+)/edit", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.edit);
router.put("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.update);
router.delete("/users/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrMyselfRequired, userController.destroy);
router.get("/users/:userId(\\d+)/escapeRooms", sessionController.loginRequired, sessionController.adminOrMyselfRequired, escapeRoomController.index);

// Routes for the resource /escapeRooms
router.get("/escapeRooms", sessionController.loginRequired, escapeRoomController.index);
router.get("/escapeRoomsAdmin", sessionController.loginRequired, sessionController.adminRequired, escapeRoomController.index);
router.get("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorOrParticipantRequired, escapeRoomController.show);

router.get("/escapeRooms/new", sessionController.loginRequired, sessionController.notStudentRequired, escapeRoomController.new);
router.post("/escapeRooms", sessionController.loginRequired, sessionController.notStudentRequired, upload.single("image"), escapeRoomController.create);
router.get("/escapeRooms/:escapeRoomId(\\d+)/edit", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.edit);
router.put("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, upload.single("image"), escapeRoomController.update);
router.delete("/escapeRooms/:escapeRoomId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.destroy);
router.put("/escapeRooms/:escapeRoomId(\\d+)/clone", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.clone);
// Edit escape room steps
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.turnos);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.turnosUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/puzzles", sessionController.loginRequired, sessionController.adminOrAuthorRequired, puzzleController.retos);
router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles", sessionController.loginRequired, sessionController.adminOrAuthorRequired, puzzleController.retosUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/hints", sessionController.loginRequired, sessionController.adminOrAuthorRequired, hintController.pistas);
router.post("/escapeRooms/:escapeRoomId(\\d+)/hints", sessionController.loginRequired, sessionController.adminOrAuthorRequired, upload.single("hints"), hintController.pistasUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/assets", sessionController.loginRequired, sessionController.adminOrAuthorRequired, assetsController.assets);
router.post("/escapeRooms/:escapeRoomId(\\d+)/assets", sessionController.loginRequired, sessionController.adminOrAuthorRequired, upload.single("upload"), assetsController.assetsUpdate);
router.post("/escapeRooms/:escapeRoomId(\\d+)/uploadAssets", sessionController.loginRequired, sessionController.adminOrAuthorRequired, upload.single("upload"), assetsController.uploadAssets);
router.post("/escapeRooms/:escapeRoomId(\\d+)/deleteAssets/:assetId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, assetsController.deleteAssets);
router.get("/escapeRooms/:escapeRoomId(\\d+)/evaluation", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.evaluation);
router.post("/escapeRooms/:escapeRoomId(\\d+)/evaluation", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.evaluationUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/indications", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.indicationsInterface);
router.post("/escapeRooms/:escapeRoomId(\\d+)/indications", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.indicationsInterfaceUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/team", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.teamInterface);
router.post("/escapeRooms/:escapeRoomId(\\d+)/team", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.teamInterfaceUpdate);
router.get("/escapeRooms/:escapeRoomId(\\d+)/class", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.classInterface);
router.post("/escapeRooms/:escapeRoomId(\\d+)/class", sessionController.loginRequired, sessionController.adminOrAuthorRequired, escapeRoomController.classInterfaceUpdate);

// Routes for starting/stopping shifts
router.get("/escapeRooms/:escapeRoomId(\\d+)/activate", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.indexActivate);
router.put("/escapeRooms/:escapeRoomId(\\d+)/activate", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.activate);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/new", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.create);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/reset", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.reset);
router.put("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.update);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, turnoController.destroy);

// Routes for hint app
router.get("/escapeRooms/:escapeRoomId(\\d+)/hintApp", sessionController.loginRequired, sessionController.adminOrAuthorOrParticipantRequired, hintController.hintApp);
router.get("/escapeRooms/:escapeRoomId(\\d+)/hintAppWrapper", sessionController.loginRequired, sessionController.adminOrAuthorOrParticipantRequired, hintController.hintAppWrapper);
router.get("/escapeRooms/:escapeRoomId(\\d+)/xml", sessionController.loginRequired, sessionController.adminOrAuthorRequired, hintController.downloadMoodleXML);

// Routes for playing - student
router.post("/escapeRooms/:escapeRoomId(\\d+)/play", sessionController.loginRequired, sessionController.participantRequired, turnoController.isTurnNotPending, playController.startPlaying, playController.play);
router.get("/escapeRooms/:escapeRoomId(\\d+)/play", sessionController.loginRequired, sessionController.participantRequired, turnoController.isTurnNotPending, turnoController.isTurnStarted, playController.play);
router.get("/escapeRooms/:escapeRoomId(\\d+)/finish", sessionController.loginRequired, sessionController.participantRequired, turnoController.isTurnNotPending, turnoController.isTurnStarted, playController.ranking, playController.finish, playController.results);
router.get("/escapeRooms/:escapeRoomId(\\d+)/results", sessionController.loginRequired, sessionController.participantRequired, turnoController.isTurnNotPending, turnoController.isTurnStarted, playController.ranking, playController.results);

// Routes for playing - teacher
router.get("/escapeRooms/:escapeRoomId(\\d+)/message", sessionController.loginRequired, sessionController.adminOrAuthorRequired, playController.ranking, playController.writeMessage);
router.post("/escapeRooms/:escapeRoomId(\\d+)/message", sessionController.loginRequired, sessionController.adminOrAuthorRequired, playController.ranking, playController.sendMessage);
router.get("/escapeRooms/:escapeRoomId(\\d+)/project", sessionController.loginRequired, sessionController.adminOrAuthorRequired, playController.ranking, playController.classInterface);
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/play", sessionController.loginRequired, sessionController.adminOrAuthorRequired, playController.ranking, playController.classInterface);
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/finish", sessionController.loginRequired, sessionController.adminOrAuthorRequired, playController.ranking, playController.finish, playController.results);
router.post("/escapeRooms/:escapeRoomId(\\d+)/confirm", sessionController.loginRequired, sessionController.adminOrAuthorRequired, participantController.confirmAttendance);
router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)/check", sessionController.loginRequired, sessionController.adminOrAuthorOrParticipantRequired, apiController.checkParticipantSession, apiController.checkPuzzleSolution);

// Routes for the resource participants of a turn
router.get("/escapeRooms/:escapeRoomId(\\d+)/participants", sessionController.loginRequired, sessionController.adminOrAuthorRequired, participantController.index);
router.get("/escapeRooms/:escapeRoomId(\\d+)/teams", sessionController.loginRequired, sessionController.adminOrAuthorRequired, teamController.index);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turno/:turnoId(\\d+)/team/:teamId(\\d+)/user/:userId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, participantController.studentLeave);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turno/:turnoId(\\d+)/team/:teamId(\\d+)", sessionController.loginRequired, participantController.studentLeave);
router.put("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams/:teamId(\\d+)/reset", sessionController.loginRequired, sessionController.adminOrAuthorRequired, teamController.resetProgress);
router.delete("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams/:teamId(\\d+)", sessionController.loginRequired, sessionController.adminOrAuthorRequired, teamController.delete);

// Routes for the resource /teams
router.get("/escapeRooms/:escapeRoomId(\\d+)/join", sessionController.loginRequired, sessionController.studentRequired, participantController.checkIsNotParticipant, participantController.checkSomeTurnAvailable, joinController.main);
router.post("/escapeRooms/:escapeRoomId(\\d+)/join", sessionController.loginRequired, sessionController.studentRequired, participantController.checkIsNotParticipant, participantController.checkSomeTurnAvailable, joinController.indexTurnos, teamController.create);

router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/select", sessionController.loginRequired, sessionController.studentRequired, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, joinController.mainTurnos, teamController.create);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/select", sessionController.loginRequired, sessionController.studentRequired, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, joinController.mainTurnos, teamController.create);
// Router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/", sessionController.loginRequired, sessionController.studentRequired, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, turnoController.password);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)", sessionController.loginRequired, sessionController.studentRequired, joinController.checkJoinToken, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, joinController.selectTurno, teamController.create);

router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams", sessionController.loginRequired, sessionController.studentRequired, joinController.checkJoinToken, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, teamController.indexTurnos);
router.get("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams/new", sessionController.loginRequired, sessionController.studentRequired, joinController.checkJoinToken, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, teamController.new);
router.post("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams", sessionController.loginRequired, sessionController.studentRequired, joinController.checkJoinToken, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, teamController.create);
router.put("/escapeRooms/:escapeRoomId(\\d+)/turnos/:turnoId(\\d+)/teams/:teamId(\\d+)", sessionController.loginRequired, sessionController.studentRequired, joinController.checkJoinToken, participantController.checkIsNotParticipant, participantController.checkTurnAvailable, participantController.checkTeamAvailable, membersController.add);

// Routes for learning analytics
router.get("/escapeRooms/:escapeRoomId/analytics/", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.analytics);
router.get("/escapeRooms/:escapeRoomId/analytics/ranking", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.ranking);
router.get("/escapeRooms/:escapeRoomId/analytics/timeline", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.timeline);
router.get("/escapeRooms/:escapeRoomId/analytics/progress", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.progress);
router.get("/escapeRooms/:escapeRoomId/analytics/histogram", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.histogram);
router.get("/escapeRooms/:escapeRoomId/analytics/hints/participants", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.hintsByParticipants);
router.get("/escapeRooms/:escapeRoomId/analytics/hints/teams", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.hintsByTeams);
router.get("/escapeRooms/:escapeRoomId/analytics/puzzles/participants", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.puzzlesByParticipants);
router.get("/escapeRooms/:escapeRoomId/analytics/puzzles/teams", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.puzzlesByTeams);
router.get("/escapeRooms/:escapeRoomId/analytics/puzzles", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.puzzleStats);
router.get("/escapeRooms/:escapeRoomId/analytics/grading", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.grading);
router.get("/escapeRooms/:escapeRoomId/analytics/download", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.download);
router.get("/escapeRooms/:escapeRoomId/analytics/download_raw", sessionController.loginRequired, sessionController.adminOrAuthorRequired, analyticsController.downloadRaw);

// Routes for guide/apps/resources
router.get("/inspiration", resourceController.showGuide);
router.get("/apps/new", sessionController.loginRequired, sessionController.adminRequired, resourceAppController.new);
router.post("/apps/", sessionController.loginRequired, sessionController.adminRequired, resourceAppController.create);
router.delete("/apps/:appId", sessionController.loginRequired, sessionController.adminRequired, resourceAppController.destroy);
router.get("/resources", sessionController.loginRequired, sessionController.notStudentRequired, resourceAppController.index);
router.get("/resources/my", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.index);

// TODO sessionController.adminOrResourceAuthorRequired
router.get("/resources/:appId/new", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.new);
router.post("/apps/:appId", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.create);
router.get("/resources/:resourceId", resourceController.show);
router.get("/resources/:resourceId/edit", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.edit);
router.put("/resources/:resourceId", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.update);
router.delete("/resources/:resourceId", sessionController.loginRequired, sessionController.notStudentRequired, resourceController.destroy);


router.get("/escapeRooms/:escapeRoomId/browse", sessionController.loginRequired, sessionController.adminOrAuthorRequired, assetsController.browse);
module.exports = router;
