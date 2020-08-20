/* eslint-disable no-undef */
/* eslint-disable require-await */
const request = require("supertest");
const session = require("supertest-session");
const {execSync} = require("child_process");

global.console.log = jest.fn();

const app = require("../app");

// Const to = (promise) => promise.then((data) => [null, data]).catch((err) => [err]);

const studentId = 2;
const teacherId = 1;
const escapeRoomId = 1;
const turnoId = 1;
const puzzleId = 1;

const routes = require("./routes");
const dbName = process.env.DATABASE_URL;

const teacherRoutes = routes.teacherRoutes(escapeRoomId, teacherId, puzzleId, turnoId);
const studentRoutes = routes.studentRoutes(escapeRoomId, studentId, puzzleId, turnoId);
const publicRoutes = routes.publicRoutes(escapeRoomId, teacherId, puzzleId, turnoId);

let authenticatedSession = null;
let testSession = null;

beforeAll(() => {
    try{execSync(`npx sequelize db:drop --url ${dbName}`);}catch(e){}
    try{execSync(`npx sequelize db:create --url ${dbName}`);}catch(e){}
    execSync(`npx sequelize db:migrate --url ${dbName}`);
    execSync(`npx sequelize db:seed:all --url ${dbName}`);
});

beforeEach(async function () {
    testSession = await session(app);
});

describe("Unauthenticated routes", async () => {
    for (const r in publicRoutes) {
        const {route, statusCode} = publicRoutes[r];

        it(`should display route ${route} correctly`, async (done) => {
            const res = await request(app).get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    }
});

describe("Teacher routes", async () => {
    beforeAll((done) => {
        testSession.post("/").
            send({"login": "admin@upm.es", "password": "1234"}).
            expect(302).
            end((err) => {
                if (err) {
                    return done(err);
                }
                authenticatedSession = testSession;
                return done();
            });
    });
    for (const r in teacherRoutes) {
        const {route, statusCode} = teacherRoutes[r];

        it(`should display route ${route} correctly`, async (done) => {
            const res = await authenticatedSession.get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    }
});

describe("Student routes", async () => {
    beforeAll((done) => {
        testSession.post("/").
            send({"login": "pepe@alumnos.upm.es", "password": "5678"}).
            expect(302).
            end((err) => {
                if (err) {
                    return done(err);
                }
                authenticatedSession = testSession;
                return done();
            });
    });
    for (const r in studentRoutes) {
        const {route, statusCode} = studentRoutes[r];

        it(`should display route ${route} correctly`, async (done) => {
            const res = await authenticatedSession.get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    }
});
