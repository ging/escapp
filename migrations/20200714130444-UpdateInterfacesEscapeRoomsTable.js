const {models} = require("../models");

const convert = (content, puzzles) => content.
    replace(/(\r+\n+\t+|\n+|\r+|\t+)+/gm, "").
    replace(/<p class="ui-sortable-handle"><br class="ui-sortable-handle"><\/p>/gim, "<p><p/>").
    split(/(<\s*ranking[^>]*>.*?<\s*\/\s*ranking>|<\s*countdown[^>]*>.*?<\s*\/\s*countdown>|<\s*progressbar[^>]*>.*?<\s*\/\s*progressbar>)/gim).
    filter(Boolean).
    map((block) => {
        const obj = {"type": "text", puzzles};

        if (block.match(/<countdown/)) {
            obj.type = "countdown";
        } else if (block.match(/<progressbar/)) {
            obj.type = "progress";
        } else if (block.match(/<ranking/)) {
            obj.type = "ranking";
        } else {
            obj.payload = {"text": block};
        }
        return obj;
    });

const unconvert = (content) => content.reduce((acc, pointer) => {
    switch (pointer.type) {
    case "countdown":
        return `${acc}<countdown></countdown>`;
    case "progress":
        return `${acc}<progressbar></progressbar>`;
    case "ranking":
        return `${acc}<ranking></ranking>`;
    case "text":
    default:
        return acc + (pointer.payload && pointer.payload.text) ? `${acc}${pointer.payload.text}` : "";
    }
}, "");

module.exports = {

    "up": async () => {
        const ers = await models.escapeRoom.findAll({"attributes": ["id", "classInstructions", "teamInstructions", "indicationsInstructions"], "include": {"model": models.puzzle, "attributes": ["id"]}});

        const promises = [];

        for (const ert of ers || []) {
            const er = JSON.parse(JSON.stringify(ert));
            const puzzles = Array(er.puzzles.length + 1).fill(0).map((_e, i) => `${i}`);
            puzzles.push("all");
            let classInstructions = er.classInstructions ? er.classInstructions : "";
            let teamInstructions = er.teamInstructions ? er.teamInstructions : "";
            let indicationsInstructions = er.indicationsInstructions ? er.indicationsInstructions : "";

            classInstructions = JSON.stringify(convert(classInstructions, []));
            teamInstructions = JSON.stringify(convert(teamInstructions, puzzles));
            indicationsInstructions = JSON.stringify(convert(indicationsInstructions, []));
            promises.push(models.escapeRoom.update({classInstructions, teamInstructions, indicationsInstructions}, {"where": {"id": er.id}}));
        }

        await Promise.all(promises);
    },

    "down": async () => {
        const ers = await models.escapeRoom.findAll({"attributes": ["id", "classInstructions", "teamInstructions", "indicationsInstructions"]});

        const promises = [];

        for (const ert of ers || []) {
            const er = JSON.parse(JSON.stringify(ert));

            let classInstructions = er.classInstructions ? er.classInstructions instanceof Array ? er.classInstructions : JSON.parse(er.classInstructions) : "";
            let teamInstructions = er.teamInstructions ? er.teamInstructions instanceof Array ? er.teamInstructions : JSON.parse(er.teamInstructions) : "";
            let indicationsInstructions = er.indicationsInstructions ? er.indicationsInstructions instanceof Array ? er.indicationsInstructions : JSON.parse(er.indicationsInstructions) : "";

            classInstructions = unconvert(classInstructions);
            teamInstructions = unconvert(teamInstructions);
            indicationsInstructions = unconvert(indicationsInstructions);
            //promises.push(models.escapeRoom.update({classInstructions, teamInstructions, indicationsInstructions}, {"where": {"id": er.id}}));
        }

        await Promise.all(promises);
    }
};
