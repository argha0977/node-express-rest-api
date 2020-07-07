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
    userid: 'hchakraborty@asthaitsolutions.com',
    password: 'Asth@prs',
    senderid: 'AASTHA',
} 

/**
 * Bizztel SMS User Credential
 */
var bizztel = {
    userid: 'hchakraborty',
    password: 'itsolutions123',
    senderid: 'LMDEMO'
} 

module.exports = {
    /**
     * Send SMS using Mvayoo gateway
     * @param {*} db Database
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     */
    sendSMS(db, obj, templatePrefix){
        //var senderId = common.apps[obj.otype].senderid;
        // var senderId = mvayoo.senderid;
        // this.sendByMvayoo(db, obj, templatePrefix, senderId);
        var senderId = bizztel.senderid;
        this.sendByBizztel(db, obj, templatePrefix, senderId);
    },

    /**
     * Send SMS using Mvayoo gateway
     * @param {*} db Database
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     * @param {string} senderId Sender Id
     */
    sendByMvayoo: function (db, obj, templatePrefix, senderId) {
        message = templatePrefix + obj.message;

        request
            .get('http://api.mVaayoo.com/mvaayooapi/MessageCompose?user=' + mvayoo.userid + ':' + mvayoo.password + '&senderID=' + senderId + '&receipientno=' + obj.mobile + '&dcs=0&msgtxt=' + obj.message + '&state=4 ')
            .end(function (err, resp) {
                if (err) {
                    logger.logError(err);
                    logger.logError('SMS sending failed by MVayoo');
                }
                else {
                    var log = JSON.parse(JSON.stringify(obj));
                    delete log.message;
                    delete log.mobile;
                    commondb.insertSMSLog(db, log);
                    logger.logInfo('SMS sent by MVayoo');
                }
            });
    },

    /**
     * Send SMS using Bizztel gateway
     * @param {*} db Database
     * @param {*} obj Attr JSON
     * @param {string} templatePrefix Message template prefix
     * @param {string} senderId Sender Id
     */
    sendByBizztel: function (db, obj, templatePrefix, senderId) {
        message = templatePrefix + message;

        request
            .get('http://www.bizztel.com/composeapi')
            .query({ userid: bizztel.userid })
            .query({ pwd: bizztel.password })
            .query({ route: 2 })
            .query({ senderid: senderId })
            .query({ destination: obj.mobile })
            .query({ message: obj.message })
            .end(function (err, resp) {
                if (err) {
                    logger.logError(err);
                    logger.logError('SMS sending failed by Bizztel');
                }
                else {
                    var log = JSON.parse(JSON.stringify(obj));
                    delete log.message;
                    delete log.mobile;
                    commondb.insertSMSLog(db, log);
                    logger.logInfo('SMS sent by Bizztel');
                }
            });
    }
}