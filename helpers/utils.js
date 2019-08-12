exports.retosSuperadosByWho = (who, puzzles) => {
    const retosSuperados = new Array(puzzles.length).fill(0);

    who.retos.map((reto) => {
        const idx = puzzles.indexOf(reto.id);

        if (idx > -1) {
            retosSuperados[idx] = 1;
        }
        return 0;
    });
    return retosSuperados;
};
