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

exports.flattenObject = (obj, labels) => {
    const rs = {};

    for (const r in obj) {
        rs[labels[r]] = obj[r];
    }
    return rs;
};

exports.getRetosSuperados = (teams) => teams.map((teamRes) => ({...teamRes.dataValues,
    "teamMembers": teamRes.teamMembers, /* .filter(m=>)    .map(m=>({turnosAgregados: m.turnosAgregados
        .filter(t=>t.participants.attendance)}))*/
    "countretos": teamRes.dataValues.retos.length,
    "latestretosuperado": teamRes.dataValues.retos && teamRes.dataValues.retos.length > 0 ? teamRes.dataValues.retos.map((r) => r.retosSuperados.createdAt).sort((a, b) => a < b)[0] : null})).sort((t1, t2) => {
    if (t1.countretos === t2.countretos) {
        if (t1.latestretosuperado === t2.latestretosuperado) {
            return 0;
        }
        return t1.latestretosuperado > t2.latestretosuperado ? 1 : -1;
    }
    return t1.countretos > t2.countretos ? -1 : 1;
});

exports.pctgRetosSuperados = (retosSuperados) => Math.round(retosSuperados.filter((r) => r === 1).length * 10000 / retosSuperados.length) / 100;

exports.countHints = (requestedHints) => {
    let hintsSucceeded = 0;
    let hintsFailed = 0;

    for (const h in requestedHints) {
        const hint = requestedHints[h];

        if (hint.success) {
            hintsSucceeded++;
        } else {
            hintsFailed++;
        }
    }
    return {hintsFailed,
        hintsSucceeded};
};
