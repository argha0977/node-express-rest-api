/**
 * ***************************************************
 *              Organization Routes                  *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var express = require('express');
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var moment = require('moment');
var path = require('path');
var fs = require('fs');

const auth = require('../policies/authorization');
const commondb = require('../config/commondb');
const commonspace = require('../config/commonspace');
const common = require('../config/common');
const logger = require('../config/logger');
const commonmail = require('../config/commonmail');

const IMAGE_PATH = __dirname + '/../public/images';
const IMAGE_FOLDER = 'organizations';
const DUMMY_FILE_NAME = 'NoLogo.png';

var model = 'organization';
var dmodels = []; //Dependent model names

var floatattrs = [];
var dateattrs = ['addedon', 'createdon', 'expireon'];
var intattrs = [];
var regxattrs = ['oname', 'city'];
var requiredattrs = ['oname'];

/*Add */
router.post('/create', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        //logger.logInfo(obj);
        var apptype = common.appType;
        if(obj.apptype) {
            apptype = obj.apptype;
            delete obj.apptype;
        }

        floatattrs.forEach(element => {
            if (obj[element]) {
                obj[element] = parseFloat(obj[element]);
            }
        });
        intattrs.forEach(element => {
            if (obj[element]) {
                obj[element] = parseInt(obj[element]);
            }
        });
        dateattrs.forEach(element => {
            if (obj[element]) {
                var day = new Date(obj[element]).getDate();
                var month = new Date(obj[element]).getMonth();
                var year = new Date(obj[element]).getFullYear();
                var hour = new Date().getHours();
                var min = new Date().getMinutes();
                var sec = new Date().getSeconds();
                var ms = new Date().getMilliseconds();
                obj[element] = new Date(year, month, day, hour, min, sec, ms);
            }
            else {
                switch (element) {
                    case 'addedon':
                        obj[element] = new Date();
                        break;
                    case 'createdon':
                        obj[element] = new Date();
                        break;
                }
            }
        });

        if (!obj.status) obj.status = 'Active';

        if (!obj.expireon) obj.expireon = new Date(moment(obj.createdon).add(1, 'year').endOf('day'));

        for (var key in obj) {
            try {
                if (typeof (ob[key]) == 'string') obj[key] = obj[key].trim();
            } catch (err) { }
            if (typeof (obj[key]) != "boolean") {
                if (key == '_id' || obj[key] == '') {
                    delete obj[key];
                }
            }
        }
        
        var isValid = true;
        var missingAttr = '';
        requiredattrs.forEach(element => {
            if (!obj[element]) {
                if (!missingAttr) missingAttr = element;
                else missingAttr += ', ' + element;
                isValid = false;
            }
        });

        var userid = 'Guest';
        if (obj.userid) {
            obj.addedby = obj.userid;
            userid = obj.userid;
            delete obj.userid;
        }
        else obj.addedby = userid;

        if (isValid) {
            try {
                var ocode = '';
                var criteria = {};
                if (!obj.ocode) {
                    var storenameSplitted = obj.oname.split(' ');
                    for (var i = 0; i < storenameSplitted.length; i++) {
                        ocode += storenameSplitted[i].toLowerCase().charAt(0);
                    }
                    criteria = { ocode: new RegExp('^' + ocode) };
                }
                else {
                    ocode = obj.ocode;
                    criteria = { ocode: ocode };
                }
                criteria.hint = { ocode: 1 };
                var organization = await commondb.find(model, criteria, { ocode: 1, _id: 0 });
                if (organization.length > 0) {
                    var max = 0;
                    for (var i = 0; i < organization.length; i++) {
                        count = parseInt(organization[i].ocode.substring(ocode.length, organization[i].ocode.length));
                        if (count > max) {
                            max = count;
                        }
                    }
                    max++;
                    obj.ocode = ocode + max.toString();
                }
                else {
                    obj.ocode = ocode;
                }
                //Insert
                var result = await commondb.insertOne(model, obj);
                res.status(200).json(result);
                if (result.email) sendConfirmationMail(result);
                log = {};
                //log.ocode = obj.ocode;
                log.userid = userid;
                log.type = 'Add';
                log.reference = obj.ocode;
                log.apptype = apptype
                log.message = ' organization has been added';
                log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
                commondb.insertLog( log);
            } catch (err) {
                res.status(err.status).json(err.message);
            }
        }
        else res.status(501).json({ error: 'Required ' + missingAttr });
    }
    //Authorization failed
    else res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect'});
});

/*Update */
router.post('/update', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;
        //logger.logInfo(obj);

        var apptype = common.appType;
        if (obj.apptype) {
            apptype = obj.apptype;
            delete obj.apptype;
        }

        floatattrs.forEach(element => {
            if (obj[element]) {
                obj[element] = parseFloat(obj[element]);
            }
        });
        intattrs.forEach(element => {
            if (obj[element]) {
                obj[element] = parseInt(obj[element]);
            }
        });
        dateattrs.forEach(element => {
            if (obj[element]) {
                obj[element] = new Date(obj[element]);
            }
        });

        obj.lastupdatedon = new Date();
        userid = 'Guest';
        if (obj.userid) {
            userid = obj.userid;
            obj.lastupdatedby = obj.userid;
            delete obj.userid;
        }
        else obj.lastupdatedby = userid;
        try {
            var hex = /[0-9A-Fa-f]{24}/g;
            obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
            if (obj._id != -1) {
                var criteria = { _id: obj._id };
                var old = await commondb.findOne( model, criteria);
                var unset = {};
                var unsetCount = 0;
                var logmessage = '';
                for (key in old) {
                    if (old[key] != '' && obj[key] == '') {
                        unset[key] = null;
                        unsetCount++;
                        delete obj[key];
                    }
                    else if (old[key] != obj[key]) {
                        if (logmessage) logmessage += ', ';
                        logmessage += key;
                    }
                }
                var updateAttr = obj;
                if (unsetCount > 0) updateAttr = { $set: obj, $unset: unset };
                var result = await commondb.updateOne( model, criteria, updateAttr);
                res.status(200).json(result);
                log = {};
                //log.ocode = obj.ocode;
                log.userid = userid;
                log.type = 'Update';
                log.reference = obj.ocode;
                log.apptype = apptype;
                if (logmessage) log.message = logmessage + ' of ';
                else log.message = '';
                log.message += ' organization has been updated';
                log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
                commondb.insertLog( log);
            }
            else res.status(500).json({ error: 'ID is not a valid string' });

        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Delete */
router.post('/delete', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        var obj = req.body;

        var apptype = common.appType;
        if (obj.apptype) {
            apptype = obj.apptype;
            delete obj.apptype;
        }

        userid = 'Guest';
        if (obj.userid) {
            userid = obj.userid;
            delete obj.userid;
        }

        try {
            var hex = /[0-9A-Fa-f]{24}/g;
            obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
            if (obj._id != -1) {
                var criteria = { _id: obj._id };
                var old = await commondb.findOne( model, criteria, {});
                var collInfos = await db.listCollections().toArray();
                //Delete all rows of all models for this organization
                for (var i = 0; i < collInfos.length; i++) {
                    var ucriteria = { ocode: obj.ocode };
                    await deleteOther(ucriteria, collInfos[i].name, db);
                }
                res.status(200).json({ message: obj.oname + ' organization has been successfully deleted' });
                var log = {};
                //log.ocode = obj.ocode;
                log.userid = userid;
                log.type = 'Delete';
                log.reference = obj.ocode;
                log.apptype = apptype;
                log.message = ' organization has been removed';
                log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
                commondb.insertLog( log);
                if(old.logo) {
                    var oldName = old.logo;
                    commonspace.remove(IMAGE_FOLDER, oldName, function(err, success){
                        if(err) logger.logError(err);
                        else logger.logInfo(success);
                    })
                }
            }
            else res.status(500).json({ error: 'ID is not a valid string' });
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Get by Id*/
router.get('/show/:id', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        try {
            var hex = /[0-9A-Fa-f]{24}/g;
            var id = (hex.test(req.params.id)) ? new ObjectID.createFromHexString(req.params.id) : -1;
            if (id != -1) {
                var criteria = { _id: id };
                var result = await commondb.findOne( model, criteria, {});
                res.status(200).json(result);
            }
            else res.status(500).json({ error: 'ID is not a valid string' });
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Get an Organization searching by code*/
router.get('/showByCode/:ocode', async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        try {
            var criteria = { ocode: req.params.ocode };
            var result = await commondb.findOne( model, criteria, {});
            res.status(200).json(result);
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

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
            if (obj.ocodes) {
                obj.ocode = { $in: obj.ocodes };
                delete obj.ocodes;
            }
            if (obj.date == 'Registration') {
                if (obj.start && obj.end) {
                    obj.start = moment(obj.start).startOf('day');
                    obj.end = moment(obj.end).add('day', 1).endOf('day');
                    obj.createdon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                    delete obj.start;
                    delete obj.end;
                }
                delete obj.date;
            }
            else if (obj.date == 'Expairy') {
                if (obj.start && obj.end) {
                    obj.start = moment(obj.start).startOf('day');
                    obj.end = moment(obj.end).add('day', 1).endOf('day');
                    obj.expireon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                    delete obj.start;
                    delete obj.end;
                }
                delete obj.date;
            }
            var result = await commondb.find(model, obj, {});
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
            if (obj.ocodes) {
                obj.ocode = { $in: obj.ocodes };
                delete obj.ocodes;
            }
            if (obj.date == 'Registration') {
                if (obj.start && obj.end) {
                    obj.start = moment(obj.start).startOf('day');
                    obj.end = moment(obj.end).add('day', 1).endOf('day');
                    obj.createdon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                    delete obj.start;
                    delete obj.end;
                }
                delete obj.date;
            }
            else if (obj.date == 'Expairy') {
                if (obj.start && obj.end) {
                    obj.start = moment(obj.start).startOf('day');
                    obj.end = moment(obj.end).add('day', 1).endOf('day');
                    obj.expireon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
                    delete obj.start;
                    delete obj.end;
                }
                delete obj.date;
            }
            var result = await commondb.count( model, obj, {});
            res.status(200).json(result);
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

/*Upload*/
router.post('/upload', multipartMiddleware, async function (req, res) {
    if (auth.isAuthorized(req.headers['authorization'])) {
        try {
            var tempPath = req.files.file.path;
            var obj = req.body;
            var ext = req.files.file.name.substring(req.files.file.name.lastIndexOf('.'));
            var name = moment().unix();
            name += ext;
            var fileInfo = req.files.file;
            commonspace.set(tempPath, IMAGE_FOLDER, name, async function(err, data){
                if(err) res.status(err.status).json(err.message);
                else {
                    var hex = /[0-9A-Fa-f]{24}/g;
                    obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
                    if (obj._id != -1) {
                        var criteria = { _id: obj._id };
                        var old = await commondb.findOne( model, criteria, {});
                        var updateJson = { $set: { logo: data.fileName } };
                        var result = await commondb.updateOne( model, criteria, updateJson);
                        result.value = data.fileName;
                        res.status(200).json(result);
                        if(old.logo) {
                            var oldName = old.logo;
                            commonspace.remove(IMAGE_FOLDER, oldName, function(err, success){
                                if(err) logger.logError(err);
                                else logger.logInfo(success);
                            })
                        }
                    }
                    else res.status(500).json({ error: 'ID is not a valid string' });
                }
            });
        } catch (err) {
            res.status(err.status).json(err.message);
        }
    }
    else {//If authorization failed
        res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
    }
});

//Get logo for display
router.get('/orgLogo/:file', function (req, res) {
    var file = req.params.file;
    if(file == DUMMY_FILE_NAME) {
        var filePath = path.resolve(IMAGE_PATH, file);
        fs.createReadStream(filePath).pipe(res);
    }
    else {
        commonspace.get(IMAGE_FOLDER, file, function(err, data){
            if(err) {
                var filePath = path.resolve(IMAGE_PATH, DUMMY_FILE_NAME);
                fs.createReadStream(filePath).pipe(res);
            }
            else {
                res.send(data.Body);
            }
        })
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
        var result = await commondb.updateMany( umodel, criteria, updateJson);
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
        var result = await commondb.deleteMany( umodel, criteria);
        logger.logInfo(umodel + ' deleted');
    } catch (err) {
        logger.logError(err.message);
    }
}


/**
 * Send organization registration confirmation mail
 * @param {*} obj JSON needed to send mail
 */
function sendConfirmationMail(obj) {
    if (!obj.otype) obj.otype = 'Company';

    var to = obj.email;
    var subject = common.apps[obj.otype].orgtype + ' Registration';
    var message = "<p>Hi <strong> " + common.apps[obj.otype].orgtype + " Admin</strong>,</p>";
    message += "<p>Congratulations your " + common.apps[obj.otype].orgtype.toLowerCase() + " <strong>" + obj.oname + "</strong> is now registered on " + common.apps[obj.otype].appname + ".</p>";
    message += "<p>With reference to your registration , the " + common.apps[obj.otype].orgtype.toLowerCase() + " code given below.</p>";
    message += "<p>" + common.apps[obj.otype].orgtype + " Code:</p>"
    message += "<h2>" + obj.ocode + "</h2>";
    message += "<p>To get started, invite " + common.apps[obj.otype].users + " to your " + common.apps[obj.otype].appname + " account using the above mentioned " + common.apps[obj.otype].orgtype.toLowerCase() + " code.</p>";
    message += "<p>It is an auto-generated e-mail.Hence do not reply.</p>";
    message += "<br><br>";
    message += "<p>Thanks & Regards,</p>";
    message += "<p>" + common.apps[obj.otype].appname + " Admin</p>";
    var mailOptions = {
        to: [to], // list of receivers
        bcc: [common.bcc],
        subject: subject, // Subject line
        html: message // html body
    };
    commonmail.sendMail(mailOptions, common.apps[obj.otype].appname);

};



