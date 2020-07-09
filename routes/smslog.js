/**
 * ***************************************************
 *                  SMS Log Routes                  *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var express = require('express');
var router = express.Router();

const auth = require('../policies/authorization');
const con = require('../config/connection');
const commondb = require('../config/commondb');
const common = require('../config/common');
const logger = require('../config/logger');

var model = common.smsLogModel;
var dmodels = []; //Dependent model names

var floatattrs = [];
var dateattrs = ['timestamp'];
var intattrs = [];
var regxattrs = [];
var requiredattrs = [];

/*Search*/
router.post('/search', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        for (var key in obj) {
            if (obj[key] == '') delete obj[key];
        }
        try {
            const db = await con.connect();
            regxattrs.forEach(element => {
                if (obj[element]) {
                    try {
                        obj[element] = new RegExp('^' + obj[element], 'i');
                    } catch (error) { }
                }
            });
            if (obj.start && obj.end) {
                obj.start = moment(obj.start).startOf('day');
                obj.end = moment(obj.end).endOf('day');
                obj.timestamp = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                delete obj.start;
                delete obj.end;
            }
            var result = await commondb.find(db, model, obj, {});
            res.status(200).json(result);
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Count*/
router.post('/count', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        for (var key in obj) {
            if (obj[key] == '') delete obj[key];
        }
        try {
            const db = await con.connect();
            regxattrs.forEach(element => {
                if (obj[element]) {
                    try {
                        obj[element] = new RegExp('^' + obj[element], 'i');
                    } catch (error) { }
                }
            });
            if (obj.start && obj.end) {
                obj.start = moment(obj.start).startOf('day');
                obj.end = moment(obj.end).endOf('day');
                obj.timestamp = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                delete obj.start;
                delete obj.end;
            }
            var result = await commondb.count(db, model, obj, {});
            res.status(200).json(result);
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Count status*/
router.post('/totalUsage', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        try {
            const db = await con.connect();
            regxattrs.forEach(element => {
                if (obj[element]) {
                    try {
                        obj[element] = new RegExp('^' + obj[element], 'i');
                    } catch (error) { }
                }
            });
            if (obj.start && obj.end) {
                obj.start = moment(obj.start).startOf('day');
                obj.end = moment(obj.end).endOf('day');
                obj.timestamp = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                delete obj.start;
                delete obj.end;
            }
            var groupJson = { _id: '$ocode', total: { $sum: '$credit' } };
            var result = await commondb.groupOnly(db, model, obj, groupJson);
            res.status(200).json(result);
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

module.exports = router;

/*************************************
 *            Functions              *
 *************************************/

/**
 * Update rows matching criteria of dependent collections
 * @param {*} criteria Update criteria
 * @param {*} updateJson Update JSON
 * @param {string} umodel Model name
 * @param {*} db Database
 */
async function updateOther(criteria, updateJson, umodel, db) {
    try {
        var result = await commondb.updateMany(db, umodel, criteria, updateJson);
        logger.logInfo(umodel + ' updated');
    } catch (err) {
        logger.logError(err.message);
    }
}

/**
 * Delete rows matching criteria from dependent collections
 * @param {*} criteria Delete criteria
 * @param {string} umodel Model name
 * @param {*} db Database
 */
async function deleteOther(criteria, umodel, db) {
    try {
        var result = await commondb.deleteMany(db, umodel, criteria);
        logger.logInfo(umodel + ' deleted');
    } catch (err) {
        logger.logError(err.message);
    }
}