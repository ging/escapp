const Sequelize = require("sequelize");
const sequelize = require("../models");
const {models} = sequelize;
const {nextStep, prevStep} = require("../helpers/progress");

// Autoload the turn with id equals to :turnId

exports.load = (req, res, next, turnId) => {
    const options = {"include": [
        {"model": models.team,
            "include": {
                "model": models.user,
                "as": "teamMembers"
            },
            "order": [
                [
                    "date",
                    "ASC"
                ]
            ]}
    ]};

    if (req.session.user) {
        options.include.push({"model": models.user,
            "as": "students",
            // "where": {"id": req.session.user.id}, // TODO Comprobar
            "required": false});
    }

    models.turno.findByPk(turnId, options).
        then((turn) => {
            if (turn) {
                req.turn = turn;
                next();
            } else {
                res.status(404);
                next(new Error(404));
            }
        }).
        catch((error) => next(error));
};


// POST /escapeRooms/:escapeRoomId/join
exports.indexStudent = (req, res, next) => {
    const {escapeRoom} = req;

    models.turno.findAll({
        "where": {"escapeRoomId": req.escapeRoom.id},
        "include": {
            "model": models.user,
            "as": "students"
        },
        "order": [
            [
                "date",
                "ASC"
            ]
        ]
    }).
        then((turnos) => {
            res.render("turnos/_indexStudent.ejs", {turnos,
                escapeRoom});
        }).
        catch((error) => next(error));
};


// GET /escapeRooms/:escapeRoomId/activarTurno
exports.indexActivarTurno = (req, res, next) => {
    const {escapeRoom} = req;

    models.turno.findAll({"where": {"escapeRoomId": req.escapeRoom.id},
        "order": [
            [
                "date",
                "ASC"
            ]
        ]}).
        then((turnos) => {
            res.render("turnos/_indexActivarTurno.ejs", {turnos,
                escapeRoom});
        }).
        catch((error) => next(error));
};


// PUT /escapeRooms/:escapeRoomId/activar
exports.activar = (req, res, next) => {
    const {escapeRoom, body} = req;

    models.turno.findAll({"where": {"id": body.turnSelected}}).
        each((turno) => {
            const back = `/escapeRooms/${escapeRoom.id}`;

            turno.status = turno.status === "pending" ? "active" : "finished";
            if (turno.status === "active") {
                turno.startTime = new Date();
                /* SetTimeout(function () {
                    turno.status = "finished";

                    turno.save({"fields": ["status"]}).then(() => {
                        res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${turno.id}/play`);
                    }).
                        catch(Sequelize.ValidationError, (error) => {
                            error.errors.forEach(({message}) => req.flash("error", message));
                            res.redirect(back);
                        }).
                        catch((error) => {
                            req.flash("error", `${req.app.locals.i18n.common.flash.errorActivatingTurno}: ${error.message}`);
                            next(error);
                        });
                }, escapeRoom.duration * 60000);*/
            }

            turno.save({"fields": [
                "startTime",
                "status"
            ]}).then(() => {
                req.flash("success", turno.status === "active" ? "Turno activo." : "Turno desactivado");
                if (turno.status === "active") {
                    res.redirect(`/escapeRooms/${escapeRoom.id}/turnos/${turno.id}`);
                } else {
                    res.redirect(back);
                }
            }).
                catch(Sequelize.ValidationError, (error) => {
                    error.errors.forEach(({message}) => req.flash("error", message));
                    res.redirect(back);
                }).
                catch((error) => {
                    req.flash("error", `${req.app.locals.i18n.common.flash.errorActivatingTurno}: ${error.message}`);
                    next(error);
                });
        }).
        catch((error) => next(error));
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.create = (req, res, next) => {
    const {date, indications} = req.body;
    const modDate = new Date(date);

    const turn = models.turno.build({"date": modDate,
        indications,
        "escapeRoomId": req.escapeRoom.id});

    const back = `/escapeRooms/${req.escapeRoom.id}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

    turn.save().
        then(() => {
            req.flash("success", "Turno creado correctamente.");
            res.redirect(back);
        }).
        catch(Sequelize.ValidationError, (error) => {
            error.errors.forEach(({message}) => req.flash("error", message));
            res.redirect(back);
        }).
        catch((error) => {
            req.flash("error", `${req.app.locals.i18n.common.flash.errorCreatingTurno}: ${error.message}`);
            next(error);
        });
};

// DELETE /escapeRooms/:escapeRoomId/turnos/:turnoId
exports.destroy = async (req, res, next) => {
    const modDate = new Date(req.turn.date);
    const teams = req.turn.teams.map((i) => i.id);
    const transaction = await sequelize.transaction();

    try {
        await req.turn.destroy({}, {transaction});
        const back = `/escapeRooms/${req.params.escapeRoomId}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

        await models.team.destroy({"where": {"id": teams}}, {transaction});
        await models.participants.destroy({"where": {"turnId": req.turn.id}}, {transaction});
        await models.members.destroy({"where": {"teamId": teams}}, {transaction});
        await transaction.commit();
        req.flash("success", req.app.locals.i18n.common.flash.successDeletingTurno);
        res.redirect(back);
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// GET /escapeRooms/:escapeRoomId/turnos
exports.turnos = (req, res) => {
    const {escapeRoom} = req;
    const {turnos} = escapeRoom;

    res.render("escapeRooms/steps/turnos", {escapeRoom,
        turnos,
        "progress": "turnos"});
};

// POST /escapeRooms/:escapeRoomId/turnos
exports.turnosUpdate = (req, res /* , next*/) => {
    const {escapeRoom, body} = req;

    const isPrevious = Boolean(body.previous);
    const progressBar = body.progress;

    console.log(prevStep("turnos"), nextStep("turnos"));
    res.redirect(`/escapeRooms/${escapeRoom.id}/${isPrevious ? prevStep("turnos") : progressBar || nextStep("turnos")}`);
};
