const sequelize = require("../models");
const {models} = sequelize;

exports.calculateNextHint = async (escapeRoom, team, status, score, messages = {"empty": "empty",
    "failed": "failed",
    "dontClose": "dontClose"}) => {
    const success = status === "completed" || status === "passed";

    if (success) {
        const retosSuperados = await team.getRetos();
        let currentReto = -1;
        const puzzleIndexes = escapeRoom.puzzles.map((p) => p.id);

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
                "teamId": team.id,
                "success": true
            } // Order by reto and then hintId
        });
        const requestedHints = hints.filter((h) => h.id !== null);
        let currentHint = -1;
        const allHints = [];
        const allHintsIndexes = [];
        const currentRetos = escapeRoom.puzzles.filter((p) => p.id === currentReto);

        for (const h in currentRetos) {
            for (const i in currentRetos[h].hints) {
                allHints.push(currentRetos[h].hints[i]);
                allHintsIndexes.push(currentRetos[h].hints[i].id);
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
        let pista = messages.empty;
        let hintId = null;

        if (currentHint < allHintsIndexes.length) {
            pista = allHints[currentHint].content;
            hintId = allHints[currentHint].id;
        }

        const reqHint = models.requestedHint.build({
            hintId,
            "teamId": team.id,
            success,
            score
        });

        await reqHint.save();

        return {"msg": pista,
            "ok": true,
            hintId,
            "alert": hintId ? false : messages.dontClose};
    }
    const reqHint = models.requestedHint.build({
        "hintId": null,
        "teamId": team.id,
        success,
        score
    });

    await reqHint.save();
    return {"msg": messages.failed,
        "hintId": null,
        "ok": false};
};
