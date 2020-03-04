/* eslint-disable no-undef */
const to = function to (promise) {
    return promise.
        then((data) => [null, data]).
        catch((err) => [err]);
};

global.console = {
    "log": jest.fn(), // Console.log are ignored in tests

    // Keep native behaviour for other methods, use those to print out things in your own tests, not `console.log`
    "error": console.error,
    "warn": console.warn,
    "info": console.info,
    "debug": console.debug
};
const userId = 1;
const escapeRoomId = 1;
const turnoId = 1;
const puzzleId = 1;
const request = require("supertest");
const {app} = require("../bin/www");
const routes = [
    "/",
    `/users/${userId}`,
    "/users/new",
    "/users/password-reset",
    `/users/password-reset/${userId}`,
    "/users/index",
    `/users/${userId}/edit`,
    `/users/${userId}/escapeRooms`,
    "/escapeRooms",
    "/escapeRoomsAdmin",
    `/escapeRooms/${escapeRoomId}`,
    "/escapeRooms/new",
    `/escapeRooms/${escapeRoomId}/edit`,
    `/escapeRooms/${escapeRoomId}/turnos`,
    `/escapeRooms/${escapeRoomId}/puzzles`,
    `/escapeRooms/${escapeRoomId}/hints`,
    `/escapeRooms/${escapeRoomId}/assets`,
    `/escapeRooms/${escapeRoomId}/evaluation`,
    `/escapeRooms/${escapeRoomId}/team`,
    `/escapeRooms/${escapeRoomId}/class`,
    `/escapeRooms/${escapeRoomId}/join`,
    `/escapeRooms/${escapeRoomId}/activarTurno`,
    `/escapeRooms/${escapeRoomId}/puzzles/${puzzleId}/check`,
    `/escapeRooms/${escapeRoomId}/hintApp`,
    `/escapeRooms/${escapeRoomId}/hintAppWrapper`,
    `/escapeRooms/${escapeRoomId}/xml`,
    `/escapeRooms/${escapeRoomId}/play`,
    `/escapeRooms/${escapeRoomId}/project`,
    `/escapeRooms/${escapeRoomId}/finish`,
    `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/play`,
    `/escapeRooms/${escapeRoomId}/turnos/${turnoId}/finish`,
    "/inspiration",
    "/resources",
    `/escapeRooms/${escapeRoomId}/participants`,
    `/escapeRooms/${escapeRoomId}/teams`,
    `/escapeRooms/:escapeRoomId/users/${userId}/turnos/${turnoId}/teams/new`,
    `/escapeRooms/:escapeRoomId/turnos/${turnoId}/teams`,
    "/escapeRooms/:escapeRoomId/analytics/",
    "/escapeRooms/:escapeRoomId/analytics/ranking",
    "/escapeRooms/:escapeRoomId/analytics/timeline",
    "/escapeRooms/:escapeRoomId/analytics/progress",
    "/escapeRooms/:escapeRoomId/analytics/histogram",
    "/escapeRooms/:escapeRoomId/analytics/hints/participants",
    "/escapeRooms/:escapeRoomId/analytics/hints/teams",
    "/escapeRooms/:escapeRoomId/analytics/puzzles/participants",
    "/escapeRooms/:escapeRoomId/analytics/puzzles/teams",
    "/escapeRooms/:escapeRoomId/analytics/grading",
    "/escapeRooms/:escapeRoomId/analytics/download"
];

describe("Sample Test", () => {
    routes.forEach(async (route) => {
        it(`should display route ${route} correctly`, async () => {
            const res = await request(app).get(route);

            expect(res.statusCode).toEqual(200);
        });
    });
});
