const sanitizeId = (id) => id && id !== "" && id !== "new" ? id : undefined;


exports.sanitizePuzzles = (puzzles = []) => puzzles.map((puzzle) => {
    const {id, title, desc, sol, order, automatic, correct, fail, hints} = puzzle;

    let orderParsed = parseInt(order, 10);

    orderParsed = isNaN(orderParsed) ? 0 : orderParsed;

    return {
        "id": sanitizeId(id),
        "automatic": automatic === "1",
        title,
        "order": orderParsed,
        desc,
        sol,
        correct,
        fail,
        "hints": (hints || []).map((hint) => ({
            "id": sanitizeId(hint.id),
            "order": hint.order,
            "content": hint.content
        }))
    };
});
