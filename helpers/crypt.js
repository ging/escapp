const crypto = require("crypto");/* * Encrypt the given password. * Mixes the given password and salt, executes SHA1 digest, * and returns 40 hexadecimal characters. */
const TokenGenerator = require("uuid-token-generator");
const tokgen = new TokenGenerator(); // Default is a 128-bit token encoded in base58

module.exports.encryptPassword = function (password, salt) {
    return crypto.createHmac("sha256", salt).update(password).
        digest("hex");
};


module.exports.generateToken = () => {
    const token = tokgen.generate();

    return token;
};
