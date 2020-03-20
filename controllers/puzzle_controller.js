const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {sanitizePuzzles} = require("../helpers/sanitize");
const {nextStep, prevStep} = require("../helpers/progress");


// Autoload the puzzle with id equals to :puzzleId
exports.load = (req, res, next, puzzleId) => {
    models.puzzle.findByPk(puzzleId, {"include": [{"model": models.hint, "attributes": ["id"]}]}).
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
    const {order} = body;
    const puzzle = models.puzzle.build({
        order,
        "escapeRoomId": escapeRoom.id
    });

    const back = `/escapeRooms/${req.escapeRoom.id}/puzzles`;

    puzzle.save().
        then((puz) => {
            req.flash("success", req.app.locals.i18n.common.flash.successCreatingPuzzle);
            res.redirect(`${back}#puzzle-${puz.id}`);
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
    req.puzzle.save({"fields": ["title", "sol", "desc", "hint"]}).
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

// GET /escapeRooms/:escapeRoomId/puzzles
exports.retos = (req, res) => {
    const {escapeRoom} = req;

    res.render("escapeRooms/steps/puzzles", {
        escapeRoom,
        "progress": "puzzles"
    });
};

// POST /escapeRooms/:escapeRoomId/puzzles
exports.retosUpdate = async (req, res, next) => {
    const {escapeRoom, body} = req;
    const {puzzles} = body;

    const transaction = await sequelize.transaction();

    try {
        const promises = [];
        const retos = sanitizePuzzles(puzzles);

        for (const reto of retos) {
            if (reto.id) {
                const oldPuzzle = escapeRoom.puzzles.find((puzzle) => puzzle.id.toString() === reto.id.toString());

                if (oldPuzzle) {
                    const oldHints = oldPuzzle.hints || [];

                    oldPuzzle.title = reto.title;
                    oldPuzzle.automatic = reto.automatic;
                    oldPuzzle.order = reto.order;
                    oldPuzzle.desc = reto.desc;
                    oldPuzzle.sol = reto.sol;
                    oldPuzzle.correct = reto.correct;
                    oldPuzzle.fail = reto.fail;
                    promises.push(oldPuzzle.save({transaction}));
                    for (const hint of reto.hints) {
                        if (hint.id) {
                            const oldHint = oldHints.find((h) => h.id.toString() === hint.id.toString());

                            if (oldHint) {
                                oldHint.content = hint.content;
                                oldHint.order = hint.order;
                                promises.push(oldHint.save({transaction}));
                            }
                        } else {
                            hint.puzzleId = reto.id;
                            promises.push(models.hint.create(hint, {transaction}));
                        }
                    }
                }
            } else {
                promises.push(models.puzzle.
                    build(
                        {
                            ...reto,
                            "escapeRoomId": escapeRoom.id,
                            "hints": reto.hints.map((hint) => ({
                                "content": hint.content,
                                "order": hint.order
                            }))
                        },
                        {"include": [models.hint]}
                    ).
                    save({transaction}));
            }
        }
        for (const oldReto of escapeRoom.puzzles || []) {
            const foundReto = retos.find((p) => (p.id === undefined ? "" : p.id).toString() === oldReto.id.toString());

            if (foundReto) {
                for (const oldHint of oldReto.hints || []) {
                    const foundHint = (foundReto.hints || []).find((h) => (h.id === undefined ? "" : h.id).toString() === oldHint.id.toString());

                    if (!foundHint) {
                        promises.push(oldHint.destroy({transaction}));
                        // Promises.push(models.requestedHint.destroy({"where": {"hintId": oldHint.id}},  {transaction}));
                    }
                }
            } else {
                // Promises.push(models.retosSuperados.destroy({"where": {"puzzleId": oldReto.id}}, {transaction}));
                // Promises.push(oldReto.removeSuperados({transaction}));
                promises.push(oldReto.destroy({transaction}));
                // Promises.push(models.requestedHint.destroy({"where": {"hintId": {[Sequelize.Op.in]: oldReto.hints.map(h=>h.id) }}}, {transaction}));
            }
        }
        await Promise.all(promises);
        await transaction.commit();

        const isPrevious = Boolean(body.previous);
        const progressBar = body.progress;

        res.redirect(`/escapeRooms/${req.escapeRoom.id}/${isPrevious ? prevStep("puzzles") : progressBar || nextStep("puzzles")}`);
    } catch (error) {
        await transaction.rollback();
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(`/escapeRooms/${req.escapeRoom.id}/puzzles`);
        } else {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorEditingER}: ${error.message}`);
            next(error);
        }
    }
};
