/**
 * ***************************************************
 *                  User Log Routes                  *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var express = require('express');
var router = express.Router();

var moment = require('moment');

const auth = require('../policies/authorization');
const commondb = require('../config/commondb');
const common = require('../config/common');
const logger = require('../config/logger');

var model = common.userLogModel;
var dmodels = []; //Dependent model names

var floatattrs = [];
var dateattrs = [];
var intattrs = [];
var regxattrs = ['userid'];
var requiredattrs = [];

/*Search*/
router.post('/search', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        try {
            for (var key in obj) {
                try {
                    if (typeof (ob[key]) == 'string') obj[key] = obj[key].trim();
                } catch (err) { }
                if (typeof (obj[key]) != "boolean") {
                    if (obj[key] == '') {
                        delete obj[key];
                    }
                }
            }
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
            obj.sort = { timestamp: -1 };
            var result = await commondb.find(model, obj, {});
            var userids = [];
            for (var index = 0; index < result.length; index++) {
                if (userids.indexOf(result[index].userid) == -1) userids.push(result[index].userid);
                if (result[index.type] == 'Delete') {
                    result[index].message += ' from';
                }
                else {
                    result[index].message += ' in';
                }
                result[index].message += ' collection ' + result[index].collection;
                if (result[index].reference) {
                    result[index].message += ' with reference ' + result[index].reference;
                }
            }
            //Find and Set User names
            var criteria = { $or: [{ userid: { $in: userids } }, { mobile: { $in: userids } }, { email: { $in: userids } }] }
            const users = await commondb.find('user', criteria, { userid: 1, email: 1, mobile: 1, gender: 1, firstname: 1, lastname: 1, image: 1, _id: 0 });
            for (var i = 0; i < result.length; i++) {
                var index = common.findItem(users, 'userid', result[i].userid);
                if (index >= 0) {
                    result[i].firstname = users[index].firstname;
                    result[i].lastname = users[index].lastname;
                    result[i].image = users[index].image;
                    result[i].gender = users[index].gender;
                }
                else {
                    var index = common.findItem(users, 'email', result[i].userid);
                    if (index >= 0) {
                        result[i].firstname = users[index].firstname;
                        result[i].lastname = users[index].lastname;
                        result[i].image = users[index].image;
                        result[i].gender = users[index].gender;
                    }
                    else {
                        var index = common.findItem(users, 'mobile', result[i].userid);
                        if (index >= 0) {
                            result[i].firstname = users[index].firstname;
                            result[i].lastname = users[index].lastname;
                            result[i].image = users[index].image;
                            result[i].gender = users[index].gender;
                        }
                        else {
                            result[i].firstname = 'No';
                            result[i].lastname = 'Name';
                        }
                    }
                }
            }
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
        try {
            for (var key in obj) {
                try {
                    if (typeof (ob[key]) == 'string') obj[key] = obj[key].trim();
                } catch (err) { }
                if (typeof (obj[key]) != "boolean") {
                    if (obj[key] == '') {
                        delete obj[key];
                    }
                }
            }
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
            var result = await commondb.count(model, obj);
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
 */
async function updateOther(criteria, updateJson, umodel) {
    try {
        var result = await commondb.updateMany(umodel, criteria, updateJson);
        logger.logInfo(umodel + ' updated');
    } catch (err) {
        logger.logError(err.message);
    }
}

/**
 * Delete rows matching criteria from dependent collections
 * @param {*} criteria Delete criteria
 * @param {string} umodel Model name
 */
async function deleteOther(criteria, umodel) {
    try {
        var result = await commondb.deleteMany(umodel, criteria);
        logger.logInfo(umodel + ' deleted');
    } catch (err) {
        logger.logError(err.message);
    }
}