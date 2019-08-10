const {models} = require("../models");


// POST /api/escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.check = async (req, res, next) => {
    const {puzzle, body} = req;
    const {solution, token} = body;
    const where = {};

    if (token) {
        where.username = token;
    } else {
        return res.status(401).end();
    }
    // eslint-disable-next-line no-undefined
    const answer = solution === undefined || solution === null ? "" : solution;
    // eslint-disable-next-line no-undefined
    const puzzleSol = puzzle.sol === undefined || puzzle.sol === null ? "" : puzzle.sol;

    const users = await models.user.findAll({where});

    if (!users || users.length === 0) {
        res.status(404).end();
        return;
    }
    const team = await users[0].getTeamsAgregados({
        "include": [
            {
                "model": models.turno,
                "required": true,
                "where": {"escapeRoomId": req.escapeRoom.id} // Aquí habrá que añadir las condiciones de si el turno está activo, etc
            }
        ]

    });

    if (answer.toLowerCase().trim() === puzzleSol.toLowerCase().trim()) {
        if (team && team.length > 0) {
            if (team[0].turno.status !== "active") {
                res.status(304).send("The answer is correct but you are not being tracked");
                return;
            }
            req.puzzle.addSuperados(team[0].id).then(function () {
                res.send("Correct answer!");
            }).
                catch((e) => res.status(500).send(e));
        } else {
            res.status(304).send("The answer is correct but you are not being tracked");
        }
    } else {
        res.status(401).send("Wrong");
    }
};
