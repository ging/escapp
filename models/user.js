
const crypt = require("../helpers/crypt");

// Definition of the User model:

module.exports = function (sequelize, DataTypes) {
    const User = sequelize.define("user", {
        "name": {
            "type": DataTypes.STRING,
            "validate": {
                "len": [0, 200],
                "notEmpty": {"msg": "Name must not be empty."}
            }
        },
        "surname": {
            "type": DataTypes.STRING,
            "validate": {
                "len": [0, 200],
                "notEmpty": {"msg": "Surname must not be empty."}
            }
        },
        "gender": {
            "type": DataTypes.STRING,
            "validate": {"len": [0, 200]}
        },
        "username": {
            "type": DataTypes.STRING,
            "unique": true,
            "validate": {"isEmail": true}
        },
        "password": {
            "type": DataTypes.STRING,
            "validate": {
                "len": [0, 200],
                "notEmpty": {"msg": "Password must not be empty."}
            },
            set (password) {
            // Random String used as salt.
                this.salt = String(Math.round(new Date().valueOf() * Math.random()));
                this.setDataValue("password", crypt.encryptPassword(password, this.salt));
            }
        },
        "salt": {"type": DataTypes.STRING},
        "token": {
            "type": DataTypes.STRING,
            "allowNull": false,
            "defaultValue" () {
                return crypt.generateToken();
            }
        },
        "isAdmin": {
            "type": DataTypes.BOOLEAN,
            "defaultValue": false
        },
        "isStudent": {
            "type": DataTypes.BOOLEAN,
            "defaultValue": false
        },
        "lang": {
            "type": DataTypes.STRING,
            "allowNull": true,
            "validate": {"isIn": [["en", "es"]]}
        },
        "lastAcceptedTermsDate": {
            "type": DataTypes.DATE,
            "allowNull": true
        }
    });

    User.prototype.verifyPassword = function (password) {
        return crypt.encryptPassword(password, this.salt) === this.password;
    };

    return User;
};
