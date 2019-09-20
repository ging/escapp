const express = require("express"),
    router = express.Router();
const cors = require('cors');

const apiController = require("../controllers/api_controller");
const escapeRoomController = require("../controllers/escapeRoom_controller");
const turnController = require("../controllers/turnos_controller");
const puzzleController = require("../controllers/puzzle_controller");
const hintController = require("../controllers/hint_controller");
const userController = require("../controllers/user_controller");
const teamController = require("../controllers/team_controller");

router.param("escapeRoomId", escapeRoomController.load);
router.param("turnoId", turnController.load);
router.param("puzzleId", puzzleController.load);
router.param("hintId", hintController.load);
router.param("userId", userController.load);
router.param("teamId", teamController.load);


router.post("/escapeRooms/:escapeRoomId(\\d+)/puzzles/:puzzleId(\\d+)/check", cors(), apiController.check);

module.exports = router;
