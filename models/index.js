const path = require("path");

// Load ORM
const { Sequelize } = require("sequelize");

const url = process.env.DATABASE_URL;

const sequelize = new Sequelize(url);// Import the definition of the Escape Room Table from escapeRoom.js


require(path.join(__dirname, "escapeRoom"))(sequelize, Sequelize.DataTypes);

// Session
require(path.join(__dirname, "session"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Turns Table from turno.js
require(path.join(__dirname, "turno"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Attachment Table from attachment.js
require(path.join(__dirname, "attachment"))(sequelize, Sequelize.DataTypes);

// Import the definition of the User Table from user.js
require(path.join(__dirname, "user"))(sequelize, Sequelize.DataTypes);

// Import the definition of the User Table from puzzle.js (Retos)
require(path.join(__dirname, "puzzle"))(sequelize, Sequelize.DataTypes);

// Import the definition of the User Table from hint.js (Pistas)
require(path.join(__dirname, "hint"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Team Table from team.js
require(path.join(__dirname, "team"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Attachment Table from attachment.js
require(path.join(__dirname, "hintApp"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Participants Table from participants.js
require(path.join(__dirname, "participants"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Requested Hints Table from requestedHint.js
require(path.join(__dirname, "requestedHint"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Asset Table from attachment.js
require(path.join(__dirname, "asset"))(sequelize, Sequelize.DataTypes);

// Import the definition of the App Table from app.js
require(path.join(__dirname, "app"))(sequelize, Sequelize.DataTypes);

// Import the definition of the Resource Table from app.js
require(path.join(__dirname, "resource"))(sequelize, Sequelize.DataTypes);

// Import the definition of the RetosSuperados Table from retosSuperados.js
require(path.join(__dirname, "retosSuperados"))(sequelize, Sequelize.DataTypes);


// Relation between models
const {escapeRoom, turno, attachment, user, puzzle, hint, hintApp, team, requestedHint, retosSuperados, asset, app, resource} = sequelize.models;// Relation 1-to-N between Escape Room and Turn:

// Relation 1-to-N between Escape Room and Turno:

turno.belongsTo(escapeRoom);
escapeRoom.hasMany(turno, {
    "onDelete": "CASCADE",
    "hooks": true
});

// Relation 1-to-1 between Escape Room and Attachment:
attachment.belongsTo(escapeRoom);
escapeRoom.hasOne(attachment, {
    "onDelete": "CASCADE",
    "hooks": true
});

// Relation 1-to-N between Escape Room and Puzzle:
puzzle.belongsTo(escapeRoom);
escapeRoom.hasMany(puzzle, {
    "onDelete": "CASCADE",
    "hooks": true
});

// Relation 1-to-N between Puzzle and Hint:
hint.belongsTo(puzzle);
puzzle.hasMany(hint, {
    "onDelete": "CASCADE",
    "hooks": true
});


// Relation 1-to-N between User and Quiz:
user.hasMany(escapeRoom, {
    "foreignKey": "authorId",
    "onDelete": "CASCADE",
    "hooks": true
});

escapeRoom.belongsTo(user, {
    "as": "author",
    "foreignKey": "authorId"
});


// Relation N-to-M between Turno and User:
//    A User participates in many turnos.
//    A turn has many participants (the users who have added it as participant)
turno.belongsToMany(user, {
    "as": "students",
    "through": "participants",
    "foreignKey": {
        "name": "turnId",
        "allowNull": false
    },
    "onDelete": "CASCADE",
    "otherKey": "userId",
    "constraints": true

});

user.belongsToMany(turno, {
    "as": "turnosAgregados",
    "through": "participants",
    "onDelete": "CASCADE",
    "foreignKey": {
        "name": "userId",
        "allowNull": false
    },
    "otherKey": "turnId",
    "constraints": true

});


// Relation N-to-M between Team and User:
//    A User belongs to many teams.
//    A team has many members (the users who have added it as member)
team.belongsToMany(user, {
    "as": "teamMembers",
    "through": "members",
    "foreignKey": {
        "name": "teamId",
        "allowNull": false
    },
    "onDelete": "CASCADE",
    "otherKey": "userId",
    "constraints": true

});

user.belongsToMany(team, {
    "as": "teamsAgregados",
    "through": "members",
    "foreignKey": {
        "name": "userId",
        "allowNull": false
    },
    "onDelete": "CASCADE",
    "otherKey": "teamId",
    "constraints": true
});

// Relation 1-to-N between Turno and Team:
team.belongsTo(turno);
turno.hasMany(team, {
    "onDelete": "CASCADE",
    "foreignKey": "turnoId",
    "hooks": true
});

// Relation 1-to-1 between Escape Room and HintApp:
hintApp.belongsTo(escapeRoom);
escapeRoom.hasOne(hintApp, {
    "onDelete": "CASCADE",
    "hooks": true
});

// Relation N-to-M between Team and Puzzle:
team.belongsToMany(puzzle, {
    "as": "retos",
    "through": "retosSuperados",
    "foreignKey": {
        "name": "teamId",
        "allowNull": false
    },
    "onDelete": "CASCADE",
    "otherKey": "puzzleId",
    "constraints": true
});

puzzle.belongsToMany(team, {
    "as": "superados",
    "through": "retosSuperados",
    "unique": false,
    "foreignKey": {
        "name": "puzzleId",
        "allowNull": false
    },
    "onDelete": "CASCADE",
    "otherKey": "teamId",
    "constraints": true
});

// Relation N-to-M between Team and Puzzle:
retosSuperados.belongsTo(team, {"unique": false, "foreignKey": "teamId"});
retosSuperados.belongsTo(puzzle, {"unique": false, "foreignKey": "puzzleId"});

team.hasMany(retosSuperados, {
    "as": "puzzlesSolved",
    "foreignKey": {
        "name": "teamId",
        "unique": false,
        "allowNull": false
    }
});

// Relation N-to-M between Team and Hint:
requestedHint.belongsTo(hint, {});
requestedHint.belongsTo(team, {});


team.hasMany(requestedHint, {
    "onDelete": "CASCADE",
    "hooks": true
});

hint.hasMany(requestedHint, {
    "onDelete": "CASCADE",
    "hooks": true
});

escapeRoom.hasMany(asset, {
    "onDelete": "CASCADE",
    "hooks": true
});

asset.belongsTo(escapeRoom);


resource.belongsTo(app);
resource.belongsTo(puzzle);

user.hasMany(resource, {
    "onDelete": "CASCADE",
    "hooks": true,
    "foreignKey": "authorId"
});

app.hasMany(resource, {
    "onDelete": "CASCADE",
    "hooks": true
});

puzzle.hasMany(resource, {
    "onDelete": "CASCADE",
    "hooks": true
});

module.exports = sequelize;
