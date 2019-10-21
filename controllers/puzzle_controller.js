const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
// Autoload the puzzle with id equals to :puzzleId

exports.load = (req, res, next, puzzleId) => {
    models.puzzle.findByPk(puzzleId, {"include": [
        {"model": models.hint,
            "attributes": ["id"]}
    ]}).
        then((puzzle) => {
            if (puzzle) {
                req.puzzle = puzzle;
                next();
            } else {
                next(new Error(404));
            }
        }).
        catch((error) => next(error));
};

// POST /escapeRooms/:escapeRoomId/puzzles/new
exports.create = (req, res, next) => {
    const {escapeRoom, body} = req;
    const {reto} = body;
    const {title, sol, desc, hint} = JSON.parse(reto);
    const puzzle = models.puzzle.build({title,
        sol,
        desc,
        hint,
        "escapeRoomId": escapeRoom.id});

    const back = `/escapeRooms/${req.escapeRoom.id}/puzzles`;

    puzzle.save().
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingPuzzle);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingPuzzle}: ${error.message}`);
            next(error);
        });
};

// PUT /escapeRooms/:escapeRoomId/puzzles/:puzzleId
exports.update = (req, res, next) => {
    const {body, escapeRoom} = req;
    const {reto} = body;
    const back = `/escapeRooms/${escapeRoom.id}/puzzles`;

    const {title, sol, desc, hint} = JSON.parse(reto);

    req.puzzle.title = title;
    req.puzzle.sol = sol;
    req.puzzle.desc = desc;
    req.puzzle.hint = hint;
    req.puzzle.save({"fields": [
        "title",
        "sol",
        "desc",
        "hint"
    ]}).
        then(() => {
            req.flash("success", req.app.locals.i18n.common.flash.successEditingPuzzle);
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `%{req.app.locals.i18n.common.flash.errorEditingPuzzle}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId/puzzles/:puzzleId
exports.destroy = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        await req.puzzle.destroy({}, {transaction});

        const back = `/escapeRooms/${req.escapeRoom.id}/puzzles`;
        const hintIds = req.puzzle.hints.map((h) => h.id);

        await models.requestedHint.destroy({"where": {"hintId": {[Sequelize.Op.in]: hintIds}}}, {transaction});
        await models.retosSuperados.destroy({"where": {"puzzleId": req.puzzle.id}}, {transaction});
        await transaction.commit();
        req.flash("success", req.app.locals.i18n.common.flash.errorDeletingPuzzle);
        res.redirect(back);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/puzzles/:puzzleId/check
exports.check = (req, res, next) => {
    const {puzzle, query} = req;
    const answer = query.answer || "";

    models.user.findByPk(req.session.user.id).then((user) => {
        user.getTeamsAgregados({
            "include": [
                {
                    "model": models.turno,
                    "required": true,
                    "where": {"escapeRoomId": req.escapeRoom.id} // Aquí habrá que añadir las condiciones de si el turno está activo, etc
                }
            ]

        }).
            then((team) => {
                if (team && team.length > 0) {
                    if (answer.toLowerCase().trim() === puzzle.sol.toLowerCase().trim()) {
                        if (team[0].turno.status !== "active") {
                            req.flash("warning", req.app.locals.i18n.turnos.notActive);
                            res.redirect(`/escapeRooms/${req.escapeRoom.id}`);
                            return;
                        }
                        req.puzzle.addSuperados(team[0].id).then(function () {
                            req.flash("success", req.app.locals.i18n.puzzle.correctAnswer);
                            res.redirect(`/escapeRooms/${req.escapeRoom.id}/play#puzzles`);
                        }).
                            catch(function (e) {
                                next(e);
                            });
                    } else {
                        req.flash("error", req.app.locals.i18n.puzzle.wrongAnswer);
                        res.redirect(`/escapeRooms/${req.escapeRoom.id}/play#puzzles`);
                    }
                } else {
                    next(req.app.locals.i18n.user.messages.ensureRegistered);
                }
            });
    }).
        catch((e) => next(e));
};


