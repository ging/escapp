const Sequelize = require("sequelize");
const {models} = require("../models");

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
                    res.redirect(back);
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

    console.log(modDate);
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
exports.destroy = (req, res, next) => {
    const modDate = new Date(req.turn.date);
    const teams = req.turn.teams.map((i) => i.id);

    req.turn.destroy().
        then(() => {
            const back = `/escapeRooms/${req.params.escapeRoomId}/turnos?date=${modDate.getFullYear()}-${modDate.getMonth() + 1}-${modDate.getDate()}`;

            models.team.destroy({"where": {"id": teams}}).then(() => {
                models.participants.destroy({"where": {"turnId": req.turn.id}}).then(() => {
                    models.members.destroy({"where": {"teamId": teams}}).then(() => {
                        req.flash("success", req.app.locals.i18n.common.flash.successDeletingTurno);
                        res.redirect(back);
                    });
                });
            });
        }).
        catch((error) => next(error));
};

