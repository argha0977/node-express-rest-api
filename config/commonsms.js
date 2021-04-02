/**
 * ***************************************************
 *                Common SMS Methods                 *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var logger = require('./logger');
var common = require('./common');
var request = require('superagent');
var commondb = require('./commondb');

/**
 * Mvayoo SMS User Credential
 */
var mvayoo = {
    userid: 'hchakrabortybnm@asthaitsolutions.com',
    password: 'Asth5qwertyuiop@prs',
    senderid: 'AASTHA',
} 

/**
 * Bizztel SMS User Credential
 */
var bizztel = {
    userid: 'hchakrabortybnm',
    password: 'itsolutionslkjhgfdsa0123',
    senderid: 'LMDEMO'
} 

module.exports = {
    /**
     * Send SMS using Mvayoo gateway
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     */
    sendSMS: async function (obj, templatePrefix) {
        //var senderId = common.apps[obj.otype].senderid;
        var senderId = mvayoo.senderid;
        this.sendByMvayoo(obj, templatePrefix, senderId);
        //var senderId = bizztel.senderid;
        //this.sendByBizztel(obj, templatePrefix, senderId);
    },

    /**
     * Send SMS without stoting to log
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     */
    sendSMSWithoutLog: async function (obj, templatePrefix) {
        //var senderId = common.apps[obj.otype].senderid;
        var senderId = mvayoo.senderid;
        this.sendByMvayoo(obj, templatePrefix, senderId, false);
        // var senderId = bizztel.senderid;
        // this.sendByBizztel(obj, templatePrefix, senderId);
    },

    /**
     * Send SMS using Mvayoo gateway
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     * @param {string} senderId Sender Id
     * @param {boolean} logEntry Store in log. Default true.
     */
    sendByMvayoo: async function (obj, templatePrefix, senderId, logEntry = true) {
        message = templatePrefix + obj.message;

        var apiParam = '&dcs=0';
        if (obj.language == 'Regional') {
            apiParam = '&msgtype=4&dcs=8&ishex=1';
        }
        //console.log('http://api.mVaayoo.com/mvaayooapi/MessageCompose?user=' + mvayoo.userid + ':' + mvayoo.password + '&senderID=' + senderId + '&receipientno=' + obj.mobile + apiParam + '&msgtxt=' + message + '&state=1');
        request
            .get('http://api.mVaayoo.com/mvaayooapi/MessageCompose?user=' + mvayoo.userid + ':' + mvayoo.password + '&senderID=' + senderId + '&receipientno=' + obj.mobile + apiParam + '&msgtxt=' + message + '&state=4')
            .end(function (err, resp) {
                if (err) {
                    logger.logError(err);
                    logger.logError('SMS sending failed by MVayoo');
                }
                else {
                    if (logEntry) {
                        var log = JSON.parse(JSON.stringify(obj));
                        delete log.message;
                        delete log.mobile;
                        delete log.otype;
                        commondb.insertSMSLog(log);
                    }
                    logger.logInfo('SMS sent by MVayoo');
                }
            });
    },

    /**
     * Send SMS using Bizztel gateway
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     * @param {string} senderId Sender Id
     * @param {boolean} logEntry Store in log. Default true.
     */
    sendByBizztel: async function (obj, templatePrefix, senderId, logEntry = true) {
        message = templatePrefix + obj.message;

        var api = 'composeapi';
        if (obj.language == 'Regional') {
            api = 'unicodeapi';
        }

        request
            .get('http://www.bizztel.com/' + api)
            .query({ userid: bizztel.userid })
            .query({ pwd: bizztel.password })
            .query({ route: 2 })
            .query({ senderid: senderId })
            .query({ destination: obj.mobile })
            .query({ message: message })
            .end(function (err, resp) {
                if (err) {
                    logger.logError(err);
                    logger.logError('SMS sending failed by Bizztel');
                }
                else {
                    if (logEntry) {
                        var log = JSON.parse(JSON.stringify(obj));
                        delete log.message;
                        delete log.mobile;
                        delete log.otype;
                        commondb.insertSMSLog(log);
                    }
                    logger.logInfo('SMS sent by Bizztel');
                }
            });
    },

    /**
     * Get SMS balance in Mvayoo gateway
     */
    balanceMvayoo: async function () {
        try {
            var resp = await request
                .get('http://api.mVaayoo.com/mvaayooapi/APIUtil?user=' + mvayoo.userid + ':' + mvayoo.password + '&type=0');
            var result = { total: '' };
            var totalCreditLeft = 0;
            if (resp !== null) {
                var str = (resp.text).split(' ');
                var countElement = str[str.length - 1];
                totalCreditLeft = parseInt(countElement.substring(2));
                result = { total: totalCreditLeft };
            }
            return result;
        } catch (err) {
            logger.logError(err);
            var result = { total: '' };
            return result;
        }
    }
}