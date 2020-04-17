const sequelize = require("../models");
const {models} = sequelize;

exports.calculateNextHint = async (escapeRoom, team, status, score, category, messages) => {
    const success = status === "completed" || status === "passed";

    try {
        const teamId = team.id;

        if (success) {
            const retosSuperados = await team.getRetos();
            const puzzleIndexes = escapeRoom.puzzles.map((p) => p.id);
            let currentReto = -1;

            for (const p in retosSuperados) {
                const reto = retosSuperados[p];
                const idx = puzzleIndexes.indexOf(reto.id);

                if (idx > currentReto) {
                    currentReto = idx;
                }
            }
            currentReto++;

            if (currentReto >= puzzleIndexes.length) {
                currentReto = -1;
            } else {
                currentReto = escapeRoom.puzzles[currentReto].id;
            }
            const hints = await models.requestedHint.findAll({
                "where": {
                    teamId,
                    "success": true
                },
                "include": [
                    {
                        "model": models.hint,
                        "attributes": ["id", "category", "order"],
                        "include": [
                            {
                                "model": models.puzzle,
                                "attributes": ["id", "order"]
                            }
                        ]
                    }
                ]
            });

            if (escapeRoom.hintLimit !== undefined && escapeRoom.hintLimit !== null && hints.length >= escapeRoom.hintLimit) {
                return { "msg": messages.tooMany, "ok": false };
            }
            const requestedHints = hints.filter((h) => h.id !== null);
            let currentHint = -1;
            const allHints = [];
            const allHintsIndexes = [];
            const currentPuzzle = escapeRoom.puzzles.find((p) => p.id === currentReto);
            const puzzleOrder = currentPuzzle ? currentPuzzle.order + 1 : null;

            if (!currentPuzzle) {
                return {
                    "ok": false,
                    "msg": messages.cantRequestMoreThis
                };
            }

            for (const i in currentPuzzle.hints) {
                const currentHintAll = currentPuzzle.hints[i];

                if (!category || category === currentHintAll.category) {
                    allHints.push(currentHintAll);
                    allHintsIndexes.push(currentHintAll.id);
                }
            }

            for (const h in requestedHints) {
                const hint = requestedHints[h];

                const hIndex = allHintsIndexes.indexOf(hint.hintId);

                if (hIndex > currentHint) {
                    currentHint = hIndex;
                }
            }
            currentHint++;
            let msg = messages.empty;
            let hintId = null;
            let hintOrder = null;

            if (currentHint < allHintsIndexes.length) {
                msg = allHints[currentHint].content;
                hintId = allHints[currentHint].id;
                hintOrder = allHints[currentHint].order + 1;
            }
            if (hintOrder || escapeRoom.allowCustomHints) {
                const reqHint = models.requestedHint.build({
                    hintId,
                    teamId,
                    success,
                    score
                });

                await reqHint.save();
                return {
                    "ok": true,
                    msg,
                    hintOrder,
                    puzzleOrder,
                    category
                };
            }
            return {
                "ok": false,
                "msg": messages.cantRequestMoreThis,
                hintOrder,
                puzzleOrder,
                category
            };
        }
        const reqHint = models.requestedHint.build({
            "hintId": null,
            teamId,
            success,
            score
        });

        await reqHint.save();
        return {
            "ok": false,
            "msg": messages.failed
        };
    } catch (e) {
        return {"ok": false, "msg": e.message};
    }
};

exports.areHintsAllowedForTeam = async (teamId, hintLimit) => {
    const reqHints = await models.requestedHint.findAll({"where": { teamId}});
    let successHints = 0;
    let failHints = 0;
    let hintsAllowed = false;

    for (const h in reqHints) {
        if (reqHints[h].success) {
            successHints++;
        } else {
            failHints++;
        }
    }
    if (!hintLimit && hintLimit !== 0 || hintLimit >= successHints) {
        hintsAllowed = true;
    }
    return {hintsAllowed, successHints, failHints};
};
