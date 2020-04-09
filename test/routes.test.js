/* eslint-disable no-undef */
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

const teacherRoutes = routes.teacherRoutes(escapeRoomId, teacherId, puzzleId, turnoId);
const studentRoutes = routes.studentRoutes(escapeRoomId, studentId, puzzleId, turnoId);
const publicRoutes = routes.publicRoutes(escapeRoomId, teacherId, puzzleId, turnoId);

let authenticatedSession = null;
let testSession = null;

beforeAll(() => {
    execSync(`sequelize db:migrate --url ${process.env.DATABASE_URL}`);
    execSync(`sequelize db:seed:all --url ${process.env.DATABASE_URL}`);
});

afterAll(() => {
    execSync("rm test.sqlite");
});

beforeEach(function () {
    testSession = session(app);
});

describe("Unauthenticated routes", () => {
    publicRoutes.forEach(({route, statusCode}) => {
        it(`should display route ${route} correctly`, async (done) => {
            const res = await request(app).get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    });
});

describe("Teacher routes", () => {
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
    teacherRoutes.forEach(({route, statusCode}) => {
        it(`should display route ${route} correctly`, async (done) => {
            const res = await authenticatedSession.get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    });
});

describe("Student routes", () => {
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

    studentRoutes.forEach(({route, statusCode}) => {
        it(`should display route ${route} correctly`, async (done) => {
            const res = await authenticatedSession.get(route);

            expect(res.statusCode).toEqual(statusCode);
            done();
        });
    });
});
