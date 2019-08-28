exports.retosSuperadosByWho = (who, puzzles, showDate = false) => {
    const retosSuperados = new Array(puzzles.length).fill(0);

    who.retos.map((reto) => {
        const idx = puzzles.indexOf(reto.id);
        if (idx > -1) {
            retosSuperados[idx] = showDate ? reto.retosSuperados.createdAt : 1;
        }
        return showDate ? " " : 0;
    });
    return retosSuperados;
};
