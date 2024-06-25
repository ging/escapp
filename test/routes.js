
exports.publicRoutes = (escapeRoomId, userId, puzzleId, turnoId) => [
    {
        "route": "/",
        "statusCode": 200
    },
    {
        "route": `/users/${userId}`,
        "statusCode": 302
    },
    {
        "route": "/register",
        "statusCode": 200
    },
    {
        "route": "/users/password-reset",
        "statusCode": 200
    },
    {
        "route": `/users/password-reset/${userId}`,
        "statusCode": 404
    },
    {
        "route": "/users/index",
        "statusCode": 302
    },
    {
        "route": `/users/${userId}/edit`,
        "statusCode": 302
    },
    {
        "route": `/users/${userId}/ctfs`,
        "statusCode": 302
    },
    {
        "route": "/ctfs",
        "statusCode": 302
    },
    {
        "route": "/ctfsAdmin",
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}`,
        "statusCode": 302
    },
    {
        "route": "/ctfs/new",
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/edit`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/puzzles`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/hints`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/assets`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/evaluation`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/team`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/class`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/join`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/activate`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintApp`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/xml`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/play`,
        "statusCode": 302
    },
    /*     {
        "route": `/ctfs/${escapeRoomId}/project`,
        "statusCode": 302
    }, */
    {
        "route": `/ctfs/${escapeRoomId}/results`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/finish`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/finish`,
        "statusCode": 302
    },
    {
        "route": "/inspiration",
        "statusCode": 200
    },
    {
        "route": "/resources",
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/participants`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams/new`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/ranking`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/timeline`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/progress`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/histogram`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/grading`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/download`,
        "statusCode": 302
    }
];

exports.teacherRoutes = (escapeRoomId, userId, puzzleId, turnoId) => [
    {
        "route": "/",
        "statusCode": 302
    },
    {
        "route": `/users/${userId}`,
        "statusCode": 200
    },
    {
        "route": "/register",
        "statusCode": 302
    },
    {
        "route": "/users/password-reset",
        "statusCode": 302
    },
    {
        "route": `/users/password-reset/${userId}`,
        "statusCode": 302
    },
    {
        "route": "/users/index",
        "statusCode": 403
    },
    {
        "route": `/users/${userId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/users/${userId}/ctfs`,
        "statusCode": 200
    },
    {
        "route": "/ctfs",
        "statusCode": 200
    },
    {
        "route": "/ctfsAdmin",
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}`,
        "statusCode": 200
    },
    {
        "route": "/ctfs/new",
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/puzzles`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/hints`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/assets`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/evaluation`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/team`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/class`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/join`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/activate`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintApp`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/xml`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/play`,
        "statusCode": 403
    },
    /* {
        "route": `/ctfs/${escapeRoomId}/project`,
        "statusCode": 200
    }, */
    {
        "route": `/ctfs/${escapeRoomId}/results`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/finish`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 200
    },
    {
        "route": "/inspiration",
        "statusCode": 200
    },
    {
        "route": "/resources",
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/participants`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/teams`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams/new`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/ranking`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/timeline`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/progress`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/histogram`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/grading`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/download`,
        "statusCode": 200
    }
];

exports.studentRoutes = (escapeRoomId, userId, puzzleId, turnoId) => [
    {
        "route": "/",
        "statusCode": 302
    },
    {
        "route": `/users/${userId}`,
        "statusCode": 200
    },
    {
        "route": "/register",
        "statusCode": 302
    },
    {
        "route": "/users/password-reset",
        "statusCode": 302
    },
    {
        "route": `/users/password-reset/${userId}`,
        "statusCode": 302
    },
    {
        "route": "/users/index",
        "statusCode": 403
    },
    {
        "route": `/users/${userId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/users/${userId}/ctfs`,
        "statusCode": 200
    },
    {
        "route": "/ctfs",
        "statusCode": 200
    },
    {
        "route": "/ctfsAdmin",
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}`,
        "statusCode": 200
    },
    {
        "route": "/ctfs/new",
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/edit`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/puzzles`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/hints`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/assets`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/evaluation`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/team`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/class`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/join`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/activate`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintApp`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/xml`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/play`,
        "statusCode": 302
    },
    /*     {
        "route": `/ctfs/${escapeRoomId}/project`,
        "statusCode": 403
    }, */
    {
        "route": `/ctfs/${escapeRoomId}/results`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/finish`,
        "statusCode": 200
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/finish`,
        "statusCode": 403
    },
    {
        "route": "/inspiration",
        "statusCode": 200
    },
    {
        "route": "/resources",
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/participants`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/teams`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams/new`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams/new?token=assfdtWeQv`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/turnos/${turnoId}/teams?token=assfdtWeQv`,
        "statusCode": 302
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/ranking`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/timeline`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/progress`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/histogram`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/grading`,
        "statusCode": 403
    },
    {
        "route": `/ctfs/${escapeRoomId}/analytics/download`,
        "statusCode": 403
    }
];
