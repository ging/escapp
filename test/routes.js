
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
        "route": "/users/new",
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
        "route": `/users/${userId}/escapeRooms`,
        "statusCode": 302
    },
    {
        "route": "/escapeRooms",
        "statusCode": 302
    },
    {
        "route": "/escapeRoomsAdmin",
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}`,
        "statusCode": 302
    },
    {
        "route": "/escapeRooms/new",
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/edit`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/puzzles`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hints`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/assets`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/evaluation`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/team`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/class`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/join`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/activarTurno`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintApp`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/xml`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/play`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/project`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/finish`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/finish`,
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
        "route": `/escapeRooms/${escapeRoomId}/participants`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/users/${userId}/turnos/${turnoId}/teams/new`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/ranking`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/timeline`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/progress`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/histogram`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/grading`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/download`,
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
        "route": "/users/new",
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
        "statusCode": 403
    },
    {
        "route": `/users/${userId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/users/${userId}/escapeRooms`,
        "statusCode": 200
    },
    {
        "route": "/escapeRooms",
        "statusCode": 200
    },
    {
        "route": "/escapeRoomsAdmin",
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}`,
        "statusCode": 200
    },
    {
        "route": "/escapeRooms/new",
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/puzzles`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hints`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/assets`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/evaluation`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/team`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/class`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/join`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/activarTurno`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintApp`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/xml`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/play`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/project`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/finish`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/finish`,
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
        "route": `/escapeRooms/${escapeRoomId}/participants`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/teams`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/users/${userId}/turnos/${turnoId}/teams/new`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/ranking`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/timeline`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/progress`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/histogram`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/grading`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/download`,
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
        "route": "/users/new",
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
        "statusCode": 403
    },
    {
        "route": `/users/${userId}/edit`,
        "statusCode": 200
    },
    {
        "route": `/users/${userId}/escapeRooms`,
        "statusCode": 200
    },
    {
        "route": "/escapeRooms",
        "statusCode": 200
    },
    {
        "route": "/escapeRoomsAdmin",
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}`,
        "statusCode": 200
    },
    {
        "route": "/escapeRooms/new",
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/edit`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/puzzles`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hints`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/assets`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/evaluation`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/team`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/class`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/join`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/activarTurno`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintApp`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/hintAppWrapper`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/xml`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/play`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/project`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/finish`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/play`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/finish`,
        "statusCode": 403
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
        "route": `/escapeRooms/${escapeRoomId}/participants`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/teams`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/users/${userId}/turnos/${turnoId}/teams/new`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/users/${userId}/turnos/${turnoId}/teams/new?token=assfdtWeQv`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/teams`,
        "statusCode": 302
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/teams?token=assfdtWeQv`,
        "statusCode": 200
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/ranking`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/timeline`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/progress`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/histogram`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/participants`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/hints/teams`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/participants`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/puzzles/teams`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/grading`,
        "statusCode": 403
    },
    {
        "route": `/escapeRooms/${escapeRoomId}/analytics/download`,
        "statusCode": 403
    }
];
