const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {sanitizePuzzles, sanitizeHints} = require("../helpers/sanitize");
const {getERPuzzlesAndHints, getERPuzzles, validationError} = require("../helpers/utils");
const {nextStep, prevStep} = require("../helpers/progress");


// Autoload the puzzle with id equals to :puzzleId
exports.load = (req, res, next, puzzleId) => {
    const {i18n} = res.locals;

    models.puzzle.findByPk(puzzleId, {"include": [{"model": models.hint, "attributes": ["id"]}]}).
        then((puzzle) => {
            if (puzzle) {
                req.puzzle = puzzle;
                next();
            } else {
                res.status(404);
                next(new Error(i18n.api.notFound));
            }
        }).
        catch((error) => next(error));
};

// Autoload the puzzle with order equals to :puzzleOrder for escape room :escapeRoomId
exports.loadOrder = async (req, res, next, puzzleOrder) => {
    const {i18n} = res.locals;

    try {
        if (req.escapeRoom) {
            req.escapeRoom.puzzles = await getERPuzzles(req.escapeRoom.id);
            if (puzzleOrder > 0 && puzzleOrder <= req.escapeRoom.puzzles.length) {
                const order = puzzleOrder - 1;

                req.puzzle = req.escapeRoom.puzzles[order];
                next();
                return;
            }
        }
        res.status(404);
        next(new Error(i18n.api.notFound));
    } catch (e) {
        next(e);
    }
};

// GET /escapeRooms/:escapeRoomId/puzzles
exports.retos = async (req, res, next) => {
    try {
        req.escapeRoom.puzzles = await getERPuzzlesAndHints(req.escapeRoom.id);

        res.render("ctfs/steps/puzzles", {"escapeRoom": req.escapeRoom, "progress": "puzzles" });
    } catch (e) {
        next(e);
    }
};

// POST /escapeRooms/:escapeRoomId/puzzles
exports.retosUpdate = async (req, res) => {
    const {body, escapeRoom} = req;
    const {puzzles} = body;
    const {i18n} = res.locals;
    const transaction = await sequelize.transaction();
    let retos = [];

    try {
        const promises = [];

        retos = sanitizePuzzles(puzzles);

        escapeRoom.puzzles = await getERPuzzlesAndHints(escapeRoom.id);

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

                    const hints = sanitizeHints(reto.hints);

                    for (const hint of hints) {
                        if (hint.id) {
                            const oldHint = oldHints.find((h) => h.id.toString() === hint.id.toString());

                            if (oldHint) {
                                oldHint.content = hint.content;
                                oldHint.category = hint.category;
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
                            "hints": sanitizeHints(reto.hints).map((hint) => ({
                                "content": hint.content,
                                "order": hint.order,
                                "category": hint.category
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
                    }
                }
            } else {
                promises.push(models.retosSuperados.destroy({"where": {"puzzleId": oldReto.id}, transaction}));
                promises.push(oldReto.destroy({transaction}));
            }
        }
        await Promise.all(promises);
        await transaction.commit();

        const isPrevious = Boolean(body.previous);
        const progressBar = body.progress;

        res.redirect(`/ctfs/${escapeRoom.id}/${isPrevious ? prevStep("puzzles") : progressBar || nextStep("puzzles")}`);
    } catch (error) {
        await transaction.rollback();
        if (error instanceof Sequelize.ValidationError) {
            error.errors.forEach((err) => {
                req.flash("error", validationError(err, i18n));
            });
        } else {
            req.flash("error", i18n.common.flash.errorEditingER);
        }
        escapeRoom.puzzles = retos;
        res.render("ctfs/steps/puzzles", {escapeRoom, "progress": "puzzles" });
    }
};
