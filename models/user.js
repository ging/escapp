
const crypt = require("../helpers/crypt");

// Definition of the User model:

module.exports = function (sequelize, DataTypes) {
    const User = sequelize.define("user", {
        "name": {
            "type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "Name must not be empty."}}
        },
        "surname": {
            "type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "Surname must not be empty."}}
        },
        "gender": {
            "type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "Gender must not be empty."}}
        },
        "username": {
            "type": DataTypes.STRING,
            "unique": true,
            "isEmail": true
        },
        "password": {
            "type": DataTypes.STRING,
            "validate": {"notEmpty": {"msg": "Password must not be empty."}},
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
        "dni": {
            "type": DataTypes.STRING,
            "unique": true,
            "validate": {
                "notEmpty": {"msg": "DNI must not be empty."},
                "isValidDNI": (/* Dni*/) => {
                    /*  // DNI Check
                const validChars = "TRWAGMYFPDXBNJZSQVHLCKET";
                const nifRexp = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKET]{1}$/i;
                const nieRexp = /^[XYZ]{1}[0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKET]{1}$/i;
                const str = dni.toString().toUpperCase();

                if (!nifRexp.test(str) && !nieRexp.test(str)) {
                    throw new Error("Dni erroneo, formato no válido");
                }

                const nie = str.
                    replace(/^[X]/, "0").
                    replace(/^[Y]/, "1").
                    replace(/^[Z]/, "2");

                const letter = str.substr(-1);
                const charIndex = parseInt(nie.substr(0, 8), 10) % 23;

                if (validChars.charAt(charIndex) === letter) {
                    return true;
                }
                throw new Error("Dni erroneo, formato no válido");
                */
                }
            }
        },
        "isAdmin": {
            "type": DataTypes.BOOLEAN,
            "defaultValue": false
        },
        "isStudent": {
            "type": DataTypes.BOOLEAN,
            "defaultValue": false
        }
    });

    User.prototype.verifyPassword = function (password) {
        return crypt.encryptPassword(password, this.salt) === this.password;
    };

    return User;
};
