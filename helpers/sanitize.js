const sanitizeId = (id) => id && id !== "" && id !== "new" ? id : undefined;


exports.sanitizePuzzles = (puzzles = []) => puzzles.map((puzzle) => {
    const {id, title, desc, sol, "order": orderUnparsed, automatic, correct, fail, hints} = puzzle;

    let order = parseInt(orderUnparsed, 10);

    order = isNaN(order) ? 0 : order;

    return {
        "id": sanitizeId(id),
        "automatic": automatic === "1",
        title,
        order,
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
