const express = require("express"),
    router = express.Router();

const escapeRoomController = 	require("../controllers/escapeRoom_controller");
const puzzleController = 		require("../controllers/puzzle_controller");
const turnController = 			require("../controllers/turnos_controller");
const hintController = 			require("../controllers/hint_controller");
const userController = 			require("../controllers/user_controller");
const teamController = 			require("../controllers/team_controller");
const apiController = 			require("../controllers/api_controller");

router.param("escapeRoomId", 	escapeRoomController.load);
router.param("puzzleId", 		puzzleController.load);
router.param("turnoId", 		turnController.load);
router.param("hintId", 			hintController.load);
router.param("userId", 			userController.load);
router.param("teamId", 			teamController.load);
router.param("puzzleOrder", 	puzzleController.loadOrder);

router.post("/ctfs/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)/check", apiController.checkParticipant, apiController.solvePuzzle, apiController.reply);
router.post("/ctfs/:escapeRoomId(\\d+)/puzzles/:puzzleOrder(\\d+)/submit", apiController.checkParticipantSafe, apiController.solvePuzzle, apiController.reply);
router.post("/ctfs/:escapeRoomId(\\d+)/puzzles/:puzzleOrder(\\d+)/check_solution", apiController.checkParticipantSafe, apiController.checkPuzzleSolution, apiController.reply);
router.post("/ctfs/:escapeRoomId(\\d+)/auth", apiController.checkParticipantSafe, apiController.auth, apiController.reply);
router.post("/ctfs/:escapeRoomId(\\d+)/start", apiController.checkParticipantSafe, apiController.startPlaying, apiController.reply);

module.exports = router;
