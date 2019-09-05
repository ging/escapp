const {models} = require("../models");// Autoload the user with id equals to :userId
const {createCsvFile} = require("../helpers/csv");
const Sequelize = require("sequelize");
const {Op} = Sequelize;

// POST  /escapeRooms/:escapeRoomId/users/:userId/selectTurno
exports.selectTurno = (req, res) => {
    const {escapeRoom} = req;
    const direccion = req.body.redir || `/escapeRooms/${escapeRoom.id}/turnos/${req.body.turnSelected}/teams`;

    res.redirect(direccion);
};

// GET /escapeRooms/:escapeRoomId/participants
exports.index = (req, res, next) => {
    const {escapeRoom, query} = req;
    const {turnId, orderBy} = query;
    const options = {
        "attributes": [
            "id",
            "name",
            "surname",
            "gender",
            "username",
            "dni"
        ],
        "include": [
            {
                "model": models.turno,
                "as": "turnosAgregados",
                "duplicating": false,
                "required": true,
                "attributes": [
                    "id",
                    "date"
                ],
                "where": {
                    "escapeRoomId": escapeRoom.id
                },
                "through": {"model": models.participants,
                    "attributes": ["attendance"]}
            },
            {
                "model": models.team,
                "as": "teamsAgregados",
                "duplicating": false,
                "required": true,
                "attributes": ["id"],
                "include": {
                    "model": models.turno,
                    "where": {
                        "escapeRoomId": escapeRoom.id
                    }
                }

            }
        ]
    };

    if (turnId) {
        options.include[0].where.id = turnId;
    }
    if (orderBy) {
        const isPg = process.env.DATABASE_URL;

        options.order = Sequelize.literal(isPg ? `lower("user"."${orderBy}") ASC` : `lower(user.${orderBy}) ASC`);
    }
    models.user.findAll(options).then((users) => {
        const participants = [];

        users.forEach((user) => {
            const {id, name, gender, username, surname, dni} = user;

            participants.push({id,
                name,
                surname,
                gender,
                username,
                dni,
                "teamId": user.teamsAgregados[0].id,
                "turnId": user.turnosAgregados[0].id,
                "turnDate": user.turnosAgregados[0].date,
                "attendance": user.turnosAgregados[0].participants.attendance});
        });
        if (req.query.csv) {
            createCsvFile(res, participants, "participants");
        } else {
            res.render("escapeRooms/participants", {escapeRoom,
                participants,
                turnId,
                orderBy});
        }
    }).
        catch((e) => next(e));
};

// POST /escapeRooms/:escapeRoomId/confirm
exports.confirmAttendance = (req, res) => {
    const turnos = req.escapeRoom.turnos.map((t) => t.id);

    models.participants.update({"attendance": true}, {
        "where": {
            [Op.and]: [
                {"turnId": {[Op.in]: turnos}},
                {"userId": {[Op.in]: req.body.attendance.yes}}
            ]
        }
    }).
        then(() => {
            models.participants.update({"attendance": false}, {
                "where": {
                    [Op.and]: [
                        {"turnId": {[Op.in]: turnos}},
                        {"userId": {[Op.in]: req.body.attendance.no}}
                    ]
                }
            }).then(() => {
                res.end();
            });
        }).
        catch(() => {
            res.status(500);
            res.end();
        });
};

// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId
// DELETE /escapeRooms/:escapeRoomId/turno/:turnId/team/:teamId/user/:userId
exports.studentLeave = async (req, res, next) => {
    // eslint-disable-next-line prefer-const
    let {user, turn} = req;
    let redirectUrl = `/escapeRooms/${req.escapeRoom.id}/participants`;

    // TODO También echar si el turno no está con status pending
    if (req.user && req.user.id !== req.session.user.id && req.session.user.isStudent && req.turn.status !== "pending") {
        res.redirect('back');
        return;
    } else if (!req.user && req.turn.status === "pending") {
        user = await models.user.findByPk(req.session.user.id);
        redirectUrl = "/";
    }
    const userId = user.id;
    const turnId = turn.id;

    try {
        await req.team.removeTeamMember(user);
        const participant = await models.participants.findOne({"where": {turnId,
            userId}});

        await participant.destroy();

        if (req.team.teamMembers.length <= 1) {
            req.team.destroy().then(() => {
                res.redirect(redirectUrl);
            });
        } else {
            res.redirect(redirectUrl);
        }
    } catch (e) {
        console.error(e);
        next(e);
    }
};
