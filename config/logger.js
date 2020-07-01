/**
 * ***************************************************
 *                Winston Log Methods                *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */


const winston = require('winston');

module.exports = {
    /**
     * Show information message in console
     * @param {string} data Message to be printerd
     */
    logInfo: function (data) {
        var level = 'debug';
        const logger = winston.createLogger({
            level: level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        });
        
        if (process.env.NODE_ENV != 'production') {
            logger.add(new winston.transports.Console());
        }
        else {
            logger.add(new winston.transports.File({ filename: level + '.log', level: level }));
        }
        logger.log({ level: level, message: data });
    },

    /**
     * Show error message to the console and store in error.log file
     * @param {string} data Message to be printed
     */
    logError: function (data) {
        var level = 'error';
        const logger = winston.createLogger({
            level: level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        });

        if (process.env.NODE_ENV != 'production') {
            logger.add(new winston.transports.Console());
        }
        else {
            logger.add(new winston.transports.File({ filename: level + '.log', level: level }));
        }
        logger.log({ level: level, message: data });
    }
}

