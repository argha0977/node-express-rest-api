/**
 * ***************************************************
 *                   User Routes                     *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var express = require('express');
var router = express.Router();
var ObjectID = require('mongodb').ObjectId;
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

var moment = require('moment');
var path = require('path');
var fs = require('fs');
const jwt = require('jsonwebtoken');

const auth = require('../policies/authorization');
const commondb = require('../config/commondb');
const commonspace = require('../config/commonspace');
const common = require('../config/common');
const logger = require('../config/logger');
const pwd = require('../config/password');
const commonsms = require('../config/commonsms');
const commonmail = require('../config/commonmail');
const base64 = require('../policies/base64');
const userauth = require('../middleware/userauth');

const IMAGE_PATH = __dirname + '/../public/images';
const IMAGE_FOLDER = 'users';
const DUMMY_FILE_NAME = 'nouser.png';

var model = 'user';
var dmodels = []; //Dependent model names

var floatattrs = [];
var dateattrs = ['addedon'];
var intattrs = [];
var regxattrs = ['firstname', 'lastname'];
var requiredattrs = ['firstname', 'mobile'];

/*Add */
router.post('/create', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
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
        if ((hour * 100 + min) >= 1830) obj[element] = moment(new Date(year, month, day, hour, min, sec, ms)).add(5, 'hour').add(30, 'minute').toDate();
        else obj[element] = new Date(year, month, day, hour, min, sec, ms);
      }
      else {
        switch (element) {
          case 'addedon':
            obj[element] = new Date();
            break;
        }
      }
    });

    if (!obj.status) {
      obj.status = 'Active';
    }

    var otype = common.apps.Organization;
    if (obj.otype) {
      otype = obj.otype;
      delete obj.otype
    }

    if (!obj.ocode && !obj.role) obj.role = 'APPADMIN';
    else if (!obj.role) obj.role = 'ADMIN';

    var userid = 'Guest';
    if (obj.cuserid) {
      userid = obj.cuserid;
      obj.addedby = obj.cuserid;
      delete obj.cuserid;
    }
    else if (obj.userid) {
      userid = obj.userid;
      obj.addedby = obj.userid;
      delete obj.userid;
    }
    else obj.addedby = userid;

    for (var key in obj) {
      try {
        if (typeof (ob[key]) == 'string') obj[key] = obj[key].trim();
      } catch (err) { }
      if (typeof (obj[key]) != "boolean" && typeof (obj[key]) != "number") {
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
    if (obj.role != 'APPADMIN' && !obj.ocode) {
      isValid = false;
      missingAttr += 'ocode';
    }
    if (isValid) {
      try {
        //Check duplicate
        var criteria = { mobile: obj.mobile };
        if (obj.ocode) {
          criteria.ocode = obj.ocode;
        }
        else {
          criteria.ocode = { $exists: false };
        }
        var user = await commondb.find(model, criteria, { ocode: 1, mobile: 1, _id: 0 });
        if (user.length > 0) {//Duplicate present
          res.status(400).json({ error: 'Insert Error! Another user has already been registered with this mobile no.' });
        }
        else {//No duplicate
          var uid = '';
          if (obj.lastname) {
            if (obj.lastname.indexOf(' ') != -1) {
              var splitted = obj.lastname.split(' ');
              uid = (obj.firstname.charAt(0)).toLowerCase();
              for (var i = 0; i < splitted.length; i++) {
                uid += splitted[i].toLowerCase();
              }
            }
            else {
              uid = (obj.firstname.charAt(0)).toLowerCase() + (obj.lastname).toLowerCase();
            }
          }
          else {
            uid = obj.firstname.toLowerCase();
          }
          criteria = { userid: new RegExp('^' + uid) };
          criteria.sort = { userid: 1 };
          var attrJson = { userid: 1, _id: 0 };
          var last = await commondb.find(model, criteria, attrJson);
          if (last.length > 0) {
            var max = 0;
            for (var i = 0; i < last.length; i++) {
              count = parseInt(last[i].userid.substring(uid.length, last[i].userid.length));
              if (count > max) {
                max = count;
              }
            }
            max++;
            obj['userid'] = uid + max.toString();
          }
          else {
            obj['userid'] = uid;
          }
          //Generate OTP and set hash of the OTP
          var password = '';
          if(obj.password) {
            password = obj.password;
            obj.onetime = false;
          }
          else {
            password = pwd.generateOTP();
            obj.onetime = true;
          }
          var hashPassword = await pwd.passwordHash(password);
          obj.password = hashPassword;
          //Insert
          var result = await commondb.insertOne(model, obj);
          res.status(200).json(result);
          result.plainPassword = password;
          result.otype = otype;
          if (result.email) sendConfirmationMail(result, 'new');
          if (result.mobile) sendOtp(result, 'new');
          log = {};
          log.ocode = obj.ocode;
          log.userid = userid;
          log.type = 'Add';
          log.reference = obj.userid;
          log.apptype = apptype
          log.message = ' user has been added';
          log.ipaddress = ipaddress;
          commondb.insertLog(log);
        }
      } catch (err) {
        res.status(err.status).json(err.message);
      }
    }
    else res.status(501).json({ error: 'Required ' + missingAttr });
  }
  //Authorization failed
  else res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
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

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
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
    var userid = 'Guest';
    if (obj.cuserid) {
      userid = obj.cuserid;
      obj.lastupdatedby = obj.cuserid;
      delete obj.cuserid;
    }
    else if (obj.userid) {
      userid = obj.userid;
      obj.lastupdatedby = obj.userid;
      delete obj.userid;
    }
    else obj.lastupdatedby = userid;

    try {
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        //Check duplicate
        var criteria = { mobile: obj.mobile, _id: { $ne: obj._id } };
        var user = await commondb.find(model, criteria, { ocode: 1, mobile: 1, _id: 0 });
        if (user.length > 0) {//duplicate present
          res.status(400).json({ error: 'Update Error! Another user has already been registered with this mobile no.' });
        }
        else {//No duplicate
          if (obj.ocode) {
            criteria.ocode = obj.ocode;
          }
          else {
            criteria.ocode = { $exists: false };
          }
          criteria = { _id: obj._id };
          var old = await commondb.findOne(model, criteria);
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
              if (dateattrs.indexOf(key) >= 0) {
                if (!moment(old[key]).isSame(obj[key])) {
                  var day = new Date(obj[key]).getDate();
                  var month = new Date(obj[key]).getMonth();
                  var year = new Date(obj[key]).getFullYear();
                  var hour = new Date().getHours();
                  var min = new Date().getMinutes();
                  var sec = new Date().getSeconds();
                  var ms = new Date().getMilliseconds();
                  if ((hour * 100 + min) >= 1830) obj[key] = moment(new Date(year, month, day, hour, min, sec, ms)).add(5, 'hour').add(30, 'minute').toDate();
                  else obj[key] = new Date(year, month, day, hour, min, sec, ms);
                }
              }
              if (logmessage) logmessage += ', ';
              logmessage += key;
            }
          }
          var updateAttr = obj;
          if (unsetCount > 0) updateAttr = { $set: obj, $unset: unset };
          var result = await commondb.updateOne(model, criteria, updateAttr);
          res.status(200).json(result);
          log = {};
          log.ocode = obj.ocode;
          log.userid = userid;
          log.type = 'Update';
          log.reference = obj.userid;
          log.apptype = apptype;
          if (logmessage) log.message = logmessage + ' of ';
          else log.message = '';
          log.message += ' user has been updated';
          log.ipaddress = ipaddress;
          commondb.insertLog(log);
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

/*Delete */
router.post('/delete', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
    }

    var userid = 'Guest';
    if (obj.duserid) {
      userid = obj.duserid;
      obj.lastupdatedby = obj.duserid;
      delete obj.duserid;
    }
    else if (obj.cuserid) {
      userid = obj.cuserid;
      obj.lastupdatedby = obj.cuserid;
      delete obj.cuserid;
    }
    else if (obj.userid) {
      userid = obj.userid;
      delete obj.userid;
    }

    try {
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        var criteria = { _id: obj._id };
        var old = await commondb.findOne(model, criteria, {});
        var result = await commondb.deleteOne(model, criteria);
        res.status(200).json(result);
        var log = {};
        log.ocode = obj.ocode;
        log.userid = userid;
        log.type = 'Delete';
        log.reference = obj.userid;
        log.apptype = apptype;
        log.message = ' user has been removed';
        log.ipaddress = ipaddress;
        commondb.insertLog(log);
        if (old.image) {
          var oldName = old.image;
          commonspace.remove(IMAGE_FOLDER, oldName, function (err, success) {
            if (err) logger.logError(err);
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
        var result = await commondb.findOne(model, criteria, {});
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

/*Get one user*/
router.get('/showUser/:userid', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    try {
      var criteria = { $or: [{ email: req.params.userid }, { mobile: req.params.userid }, { userid: req.params.userid }] };
      var result = await commondb.findOne(model, criteria, {});
      res.status(200).json(result);
    } catch (err) {
      res.status(err.status).json(err.message);
    }
  }
  else {//If authorization failed
    res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
  }
});

/*Get one user of an organization*/
router.get('/showUser/:ocode/:userid', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    try {
      var criteria = { ocode: req.params.ocode, $or: [{ email: req.params.userid }, { mobile: req.params.userid }, { userid: req.params.userid }] };
      var result = await commondb.findOne(model, criteria, {});
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
      if (obj.date == 'Create') {
        if (obj.start && obj.end) {
          obj.start = moment(obj.start).startOf('day');
          obj.end = moment(obj.end).add('day', 1).endOf('day');
          obj.createdon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
          delete obj.start;
          delete obj.end;
        }
        delete obj.date;
      }
      else if (obj.date == 'Update') {
        if (obj.start && obj.end) {
          obj.start = moment(obj.start).startOf('day');
          obj.end = moment(obj.end).add('day', 1).endOf('day');
          obj.lastupdatedon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
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
      if (obj.date == 'Create') {
        if (obj.start && obj.end) {
          obj.start = moment(obj.start).startOf('day');
          obj.end = moment(obj.end).add('day', 1).endOf('day');
          obj.createdon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
          delete obj.start;
          delete obj.end;
        }
        delete obj.date;
      }
      else if (obj.date == 'Update') {
        if (obj.start && obj.end) {
          obj.start = moment(obj.start).startOf('day');
          obj.end = moment(obj.end).add('day', 1).endOf('day');
          obj.lastupdatedon = { $gte: new Date(obj.start), $lte: new Date(obj.end) };
          delete obj.start;
          delete obj.end;
        }
        delete obj.date;
      }
      var result = await commondb.count(model, obj, {});
      res.status(200).json(result);
    } catch (err) {
      res.status(err.status).json(err.message);
    }
  }
  else {//If authorization failed
    res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
  }
});

/*Update Password*/
router.post('/updatePassword', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;
    //logger.logInfo(obj);

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
    }

    var otype = common.apps.Organization;
    if (obj.otype) {
      otype = obj.otype;
      delete obj.otype
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
    if (obj.cuserid) {
      userid = obj.cuserid;
      obj.lastupdatedby = obj.cuserid;
      delete obj.cuserid;
    }
    else if (obj.userid) {
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
        var old = await commondb.findOne(model, criteria);
        var hashPassword = await pwd.passwordHash(obj.password);
        var updateAttr = { onetime: false, password: hashPassword}
        var result = await commondb.updateOne(model, criteria, updateAttr);
        res.status(200).json(result);
        result.plainPassword = obj.password;
        result.otype = otype;
        if (result.email) sendConfirmationMail(result, 'update');
        if (result.mobile) sendOtp(result, 'update');
        log = {};
        log.ocode = obj.ocode;
        log.userid = userid;
        log.type = 'Update';
        log.reference = obj.userid;
        log.apptype = apptype;
        log.message = ' password of user has been updated';
        log.ipaddress = ipaddress;
        commondb.insertLog(log);
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

/*Reset Password*/
router.post('/resetPassword', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;
    //logger.logInfo(obj);

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
    }

    var otype = common.apps.Organization;
    if (obj.otype) {
      otype = obj.otype;
      delete obj.otype
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
    if (obj.cuserid) {
      userid = obj.cuserid;
      obj.lastupdatedby = obj.cuserid;
      delete obj.cuserid;
    }
    else if (obj.userid) {
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
        var old = await commondb.findOne(model, criteria);
        var password = pwd.generateOTP();
        var hashPassword = await pwd.passwordHash(password);
        var updateAttr = { onetime: true, password: hashPassword }
        var result = await commondb.updateOne(model, criteria, updateAttr);
        res.status(200).json(result);
        result.plainPassword = password;
        result.otype = otype;
        if (result.email) sendConfirmationMail(result, 'update');
        if (result.mobile) sendOtp(result, 'update');
        log = {};
        log.ocode = obj.ocode;
        log.userid = userid;
        log.type = 'Update';
        log.reference = obj.userid;
        log.apptype = apptype;
        log.message = ' password of user has been reset';
        log.ipaddress = ipaddress;
        commondb.insertLog(log);
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
      commonspace.set(tempPath, IMAGE_FOLDER, name, async function (err, data) {
        if (err) res.status(err.status).json(err.message);
        else {
          var hex = /[0-9A-Fa-f]{24}/g;
          obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
          if (obj._id != -1) {
            var criteria = { _id: obj._id };
            var old = await commondb.findOne(model, criteria, {});
            var updateJson = { $set: { image: data.fileName } };
            var result = await commondb.updateOne(model, criteria, updateJson);
            result.value = data.fileName;
            res.status(200).json(result);
            if (old.image) {
              var oldName = old.image;
              commonspace.remove(IMAGE_FOLDER, oldName, function (err, success) {
                if (err) logger.logError(err);
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

//Get iamge for display
router.get('/profilePic/:file', function (req, res) {
  var file = req.params.file;
  if (file == DUMMY_FILE_NAME) {
    var filePath = path.resolve(IMAGE_PATH, file);
    fs.createReadStream(filePath).pipe(res);
  }
  else {
    commonspace.get(IMAGE_FOLDER, file, function (err, data) {
      if (err) {
        var filePath = path.resolve(IMAGE_PATH, DUMMY_FILE_NAME);
        fs.createReadStream(filePath).pipe(res);
      }
      else {
        res.send(data.Body);
      }
    })
  }
});

/*Sign in*/
router.post('/signin', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
    }

    try {
      var criteria = { $or: [{ email: obj.userid }, { mobile: obj.userid }, { userid: obj.userid }] };
      var result = await commondb.findOne(model, criteria, {});
      if (result.status == 'Active') {
        var match = await pwd.comparePassword(obj.password, result.password);
        if (match) {
          if (result.ocode) {
            var organization = await commondb.findOne('organization', { ocode: result.ocode }, { expiredon: 1, oname: 1, status: 1, features: 1, _id: 0 });
            if (organization.status == 'Removed') {
              var error = {
                status: 404,
                message: { error: 'This organization has been removed. Please contact with your vendor.' }
              };
              throw error;
            }
            //Organization expiry checking
            /* if (moment().isAfter(organization.expiredon)) {
              var err = {
                status: 400,
                message: { error: 'Service for your organization has been expired.' }
              }
              throw err;
            } */
            if (organization.features) result.features = organization.features;
          }
          //Generate Base64 user token
          /* var tokenJson = { o: result.ocode, u: result.userid, ll: new Date() };
          result.usertoken = base64.encode(JSON.stringify(tokenJson)); */
          delete result.password;
          //Generate JWT Token for the session
          var user = { userid: result.userid, ocode: result.ocode, apptype: apptype };
          const usertoken = jwt.sign(user, common.tokenSecret,
            /* {
              expiresIn: "2m",
            } */
          );
          result.usertoken = usertoken;
          res.status(200).json(result);
          log = {};
          log.ocode = result.ocode;
          log.userid = obj.userid;
          log.type = 'Sign in';
          log.reference = result.userid;
          log.apptype = apptype;
          log.message = ' has been singed in';
          log.ipaddress = ipaddress;
          commondb.insertLog(log);
        }
        else res.status(404).json({ error: 'The userid or password you entered is incorrect' });
      }
      else {
        var error = { status: 400, message: { error: 'This account is not active. Please contact your administrator' } };
        throw error;
      }
    } catch (err) {
      console.log(err);
      res.status(err.status).json(err.message);
    }
  }
  else {//If authorization failed
    res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
  }
});

/*Sign out*/
router.post('/signout', async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    var obj = req.body;

    var apptype = common.appType;
    if (obj.apptype) {
      apptype = obj.apptype;
      delete obj.apptype;
    }

    var ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      req.remoteAddress ||
      req.socket.remoteAddress;
    if (obj.ipaddress) {
      ipaddress = obj.ipaddress;
      delete obj.ipaddress;
    }

    try {
      log = {};
      log.ocode = result.ocode;
      log.userid = obj.userid;
      log.type = 'Sign out';
      log.reference = result.userid;
      log.apptype = apptype;
      log.message = ' has been singed out';
      log.ipaddress = ipaddress;
      res.status(200).json({ data: 'Signed out' });
      commondb.insertLog(log);
    } catch (err) {
      res.status(err.status).json(err.message);
    }
  }
  else {//If authorization failed
    res.status(403).json({ error: 'Request forbidden! Authorization key is incorrect' });
  }
});

/*Verify User Token and Send User Info*/
router.get('/verifyToken', userauth, async function (req, res) {
  if (auth.isAuthorized(req.headers['authorization'])) {
    try {

      //Decode the user token
      /* var usertoken = base64.decode(obj.usertoken);
      try {
        var tokenJson = JSON.parse(usertoken);
      } catch (error) {
        var error = {
          status: 500,
          message: { error: 'Token is not in correct format' }
        };
        throw error;
      } */

      var tokenJson = req.tokenJson;
      if (tokenJson) {
        //Find user info
        var criteria = { userid: tokenJson.userid };
        var result = await commondb.findOne(model, criteria, {});
        delete result.password;
        result.usertoken = req.body.token || req.query.token || req.headers["user-token"];
        if (result.status == 'Inactive') {
          var err = {
            status: 400,
            message: { error: 'Your account has been deactivated. Please contact with your administrator.' }
          }
          throw err;
        }
        if (result.ocode) {
          var organization = await commondb.findOne('organization', { ocode: result.ocode }, { expiredon: 1, oname: 1, status: 1, features: 1, _id: 0 });
          if (organization.status == 'Removed') {
            var error = {
              status: 404,
              message: { error: 'This organization has been removed. Please contact with your vendor.' }
            };
            throw error;
          }
          //Organization expiry checking
          /* if (moment().isAfter(organization.expiredon)) {
            var err = {
              status: 400,
              message: { error: 'Service for your organization has been expired.' }
            }
            throw err;
          } */
          if (organization.features) result.features = organization.features;
        }
        res.status(200).json(result);
        /* if (moment().isSameOrBefore(moment(tokenJson.ll).add(3, 'months'))) {
          res.status(200).json(result);
        }
        else {
          var error = {
            status: 400,
            message: { error: 'This token has been expired' }
          }
          throw error;
        } */
      }
      else {
        var error = {
          status: 400,
          message: { error: 'This token has either been expired or incorrect key' }
        }
        throw error;
      }
    } catch (err) {
      console.log(err);
      if (err) {
        if (err.status == 404) res.status(404).json({ error: 'Your account has been removed. Please contact with your administrator.' });
        else res.status(err.status).json(err.message);
      }
      else {
        logger.logError(err);
        res.status(500).json({ error: "API error! Please try gain later" });
      }
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

/**
 * Send user registration or password change confirmation mail
 * @param {*} obj User Information JSON
 * @param {string} status New User/ Password Change
 */
function sendConfirmationMail(obj, status) {
  if (!obj.otype) obj.otype = 'Company';

  var to = obj.email;
  var subject = "Password modification message";
  var message = "<p>Hi <strong>" + obj.firstname + "</strong>,</p>";
  if (status == 'new') {
    subject = common.apps[obj.otype].appname + " Registration";
    message += "<p>Thank you very much for your Registration.</p>";
    message += "<p>With reference to your registration , the user name and password details are given below.</p>";
    message += "<p>User name: <strong>" + obj.userid + " </strong> (you can also use your registered email or mobile number as user name).</p>";
    if (obj.onetime) {
      message += "<p>One time password:";
    }
    else {
      message += "<p>Password:";
    }
    message += " <strong>" + obj.plainPassword + "</strong></p>";
  }
  else {
    message += "<p>Cogratulation!!! Your password has been changed.</p>";
    message += "<p>With reference to your change , the user name and password details are given below.</p>";
    message += "<p>User name: <strong>" + obj.userid + "</strong> (you can also use your registered email or mobile number as user name).</p>";
    message += "<p>New password: <strong>" + obj.plainPassword + "</strong></p>";
  }
  message += "<p>Use the above user name and password to sign in to " + common.apps[obj.otype].weblink + " or download our mobile app.</p>";
  message += "<p>It is an auto-generated e-mail.Hence do not reply.</p>";
  message += "<br><br>";
  message += "<p>Thanks & Regards,</p>";
  message += "<p>" + common.apps[obj.otype].appname + "</p>";
  var mailOptions = {
    to: to, // list of receivers
    subject: subject, // Subject line
    html: message // html body
  };
  commonmail.sendMail(mailOptions, common.apps[obj.otype].appname);
};

/**
 * Send user registration or password change confirmation SMS
 * @param {*} obj User Information JSON
 * @param {string} status New User/ Password Change
 */
function sendOtp(obj, status) {
  if (!obj.otype) obj.otype = 'Company';
  var message = '';
  if (status == 'new') {
    message += 'You are successfully registered with ' + common.apps[obj.otype].appname + '. Your ';
    if (obj.onetime) {
      message += 'OTP is ' + obj.plainPassword + '. Use this for first time sign in.';
    }
    else {
      message += 'Password is ' + obj.plainPassword + '. Use this to sign in.';
    }
  }
  else {
    message += 'You have successfully reset your password in ' + common.apps[obj.otype].appname + '. Your OTP is ' + obj.plainPassword + '. Use this for next time sign in.'
  }
  let sms = {
    ocode: obj.ocode,
    sender: obj.userid,
    type: (status == 'new') ? 'User' : 'Password',
    timestamp: new Date(),
    credit: 1,
    message: message,
    mobile: obj.mobile,
    otype: obj.otype
  }
  commonsms.sendSMS(sms, common.smsTempate.member);
};

