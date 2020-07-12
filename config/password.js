/**
 * ***************************************************
 *                Password methods                   *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var bcrypt = require('bcryptjs');

module.exports = {
    /**
     * Generate 6 digit OTP 
     */
    generateOTP: function() {
        var otp = generatePassword();
        return otp;
    },

    /**
     * Generate hash of a password
     * @param {string} password Password to be hashed
     */
    passwordHash: async function(password) {
        try {
            var salt = await bcrypt.genSalt(10);
            try {
                var hash = await bcrypt.hash(password, salt);
                return hash;
            } catch (err) {
                logger.logError('Password Hash Error:');
                logger.logError(err);
                var error = { status: 405, message: { error: 'Error in password hash generation' } };
                throw error;
            }
        } catch (err) {
            if(err.status == 405) throw err;
            else {
                logger.logError('Salt generation Error:');
                logger.logError(err);
                var error = { status: 406, message: { error: 'Error in generating salt' } };
                throw error;
            }
            
        }
    },

    /**
     * Compare original and hash passwords
     * @param {string} password Original password
     * @param {string} hashPassword Password Hash
     */
    comparePassword: async function (password, hashPassword) {
        try {
            var match = await bcrypt.compare(password, hashPassword);
            return match;
        } catch (err) {
            logger.logError('Password Compare Error:');
            logger.logError(err);
            var error = { status: 405, message: { error: 'Error in password match' } };
            throw error;
        }
    }
}

/*************************************
 *            Functions              *
 *************************************/

/**
 * Generate random number within a specified range
 * @param {number} low Lower bound
 * @param {number} high Uppern bound
 */
function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
};

/**
 * Generate a random numeric(6 digit) password
 */
function generatePassword() {
    var password = randomInt(100000, 999999).toString();
    return password;
};