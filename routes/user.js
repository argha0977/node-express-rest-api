/**
 * ***************************************************
 *                   User Routes                     *
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
var nodemailer = require('nodemailer');
var request = require('superagent');

const auth = require('../policies/authorization');
const con = require('../config/connection');
const commondb = require('../config/commondb');
const commonspace = require('../config/commonspace');
const common = require('../config/common');
const logger = require('../config/logger');
const pwd = require('../config/password');
const commonsms = require('../config/commonsms');

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
      if (obj[key] == '') delete obj[key];
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
        const db = await con.connect();
        //Check duplicate
        var criteria = { mobile: obj.mobile };
        if (obj.ocode) {
          criteria.ocode = obj.ocode;
        }
        else {
          criteria.ocode = { $exists: false };
        }
        var user = await commondb.find(db, model, criteria, { ocode: 1, mobile: 1, _id: 0 });
        if (user.length > 0) {//Duplicate present
          res.status(400).json({ error: 'Another user has already been registered with this mobile no.' });
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
          var last = await commondb.find(db, model, criteria, attrJson);
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
          var password = pwd.generateOTP();
          var hashPassword = await pwd.passwordHash(password);
          obj.onetime = true;
          obj.password = hashPassword;
          //Insert
          var result = await commondb.insertOne(db, model, obj);
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
          log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
          commondb.insertLog(db, log);
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
      const db = await con.connect();
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        //Check duplicate
        var criteria = { mobile: obj.mobile, _id: { $ne: obj._id } };
        var user = await commondb.find(db, model, criteria, { ocode: 1, mobile: 1, _id: 0 });
        if (user.length > 0) {//duplicate present
          res.status(400).json({ error: 'Another user has already been registered with this mobile no.' });
        }
        else {//No duplicate
          if (obj.ocode) {
            criteria.ocode = obj.ocode;
          }
          else {
            criteria.ocode = { $exists: false };
          }
          criteria = { _id: obj._id };
          var old = await commondb.findOne(db, model, criteria);
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
          var result = await commondb.updateOne(db, model, criteria, updateAttr);
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
          log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
          commondb.insertLog(db, log);
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

    userid = 'Guest';
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
      const db = await con.connect();
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        var criteria = { _id: obj._id };
        var old = await commondb.findOne(db, model, criteria, {});
        var result = await commondb.deleteOne(db, model, criteria);
        res.status(200).json(result);
        var log = {};
        log.ocode = obj.ocode;
        log.userid = userid;
        log.type = 'Delete';
        log.reference = obj.userid;
        log.apptype = apptype;
        log.message = ' user has been removed';
        log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress;
        commondb.insertLog(db, log);
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
      const db = await con.connect();
      var hex = /[0-9A-Fa-f]{24}/g;
      var id = (hex.test(req.params.id)) ? new ObjectID.createFromHexString(req.params.id) : -1;
      if (id != -1) {
        var criteria = { _id: id };
        var result = await commondb.findOne(db, model, criteria, {});
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
      const db = await con.connect();
      var criteria = { $or: [{ email: req.params.userid }, { mobile: req.params.userid }, { userid: req.params.userid }] };
      var result = await commondb.findOne(db, model, criteria, {});
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
      const db = await con.connect();
      var criteria = { ocode: req.params.ocode, $or: [{ email: req.params.userid }, { mobile: req.params.userid }, { userid: req.params.userid }] };
      var result = await commondb.findOne(db, model, criteria, {});
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
      const db = await con.connect();
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
    try {
      const db = await con.connect();
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
      const db = await con.connect();
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        var criteria = { _id: obj._id };
        var old = await commondb.findOne(db, model, criteria);
        var hashPassword = await pwd.passwordHash(obj.password);
        var updateAttr = { onetime: false, password: hashPassword}
        var result = await commondb.updateOne(db, model, criteria, updateAttr);
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
        log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress;
        commondb.insertLog(db, log);
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
      const db = await con.connect();
      var hex = /[0-9A-Fa-f]{24}/g;
      obj._id = (hex.test(obj._id)) ? new ObjectID.createFromHexString(obj._id) : -1;
      if (obj._id != -1) {
        var criteria = { _id: obj._id };
        var old = await commondb.findOne(db, model, criteria);
        var password = pwd.generateOTP();
        var hashPassword = await pwd.passwordHash(password);
        var updateAttr = { onetime: true, password: hashPassword }
        var result = await commondb.updateOne(db, model, criteria, updateAttr);
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
        log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress;
        commondb.insertLog(db, log);
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
            var old = await commondb.findOne(db, model, criteria, {});
            var updateJson = { $set: { image: data.fileName } };
            var result = await commondb.updateOne(db, model, criteria, updateJson);
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
    var filePath = path.resolve(UPLOAD_PATH, file);
    fs.createReadStream(filePath).pipe(res);
  }
  else {
    commonspace.get(IMAGE_FOLDER, file, function (err, data) {
      if (err) {
        var filePath = path.resolve(UPLOAD_PATH, DUMMY_FILE_NAME);
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

    try {
      const db = await con.connect();
      var criteria = { $or: [{ email: obj.userid }, { mobile: obj.userid }, { userid: obj.userid }] };
      if (obj.ocode) {
        criteria.ocode = obj.ocode;
      }
      else {
        criteria.ocode = { $exists: false };
      }
      var result = await commondb.findOne(db, model, criteria, {});
      var match = await pwd.comparePassword(obj.password, result.password);
      if (match) {
        log = {};
        log.ocode = result.ocode;
        log.userid = obj.userid;
        log.type = 'Sign in';
        log.reference = result.userid;
        log.apptype = apptype;
        log.message = ' has been singed in';
        log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress;
        delete result.password;
        res.status(200).json(result);
        commondb.insertLog(db, log);
      }
      else res.status(404).json({ error: 'The userid or password you entered is incorrect' });
    } catch (err) {
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

    try {
      const db = con.connect();
      log = {};
      log.ocode = result.ocode;
      log.userid = obj.userid;
      log.type = 'Sign out';
      log.reference = result.userid;
      log.apptype = apptype;
      log.message = ' has been singed out';
      log.ipaddress = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
      res.status(200).json({ data: 'Signed out' });
      commondb.insertLog(db, log);
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

/**
 * Send user registration confirmation mail
 * @param {*} obj JSON needed to send mail
 * @param {string} status New or change password
 */
function sendConfirmationMail(obj, status) {
  if(!obj.otype) obj.otype = 'Organization';
  //Email credential
  var semail = "pinghost2016@gmail.com";//"mailtest665@gmail.com";

  var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: semail,
      clientId: "342317901166-m1sg9ar93urjj58eqgjrd67oboq2ib9f.apps.googleusercontent.com",
      clientSecret: "7Utk6BsbusLyl-zFRMgexkdo",
      refreshToken: "1/-e74qKJpBdFHSK0KowTobrYC_IQpboKmWKrBlOArHc4",
      accessToken: "ya29.Ci-YA9XmHQTQLfjTTc8OvZEhYmCgp1QHy-ZrRZnpkez1p-KxLCLuKxufQB3SiiJqgg",
      timeout: 3600
    }
  });

  var from = common.apps[obj.otype].appname + "<" + semail + ">";
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
  message += "<p>Run Your School Admin</p>";
  var mailOptions = {
    from: from, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    html: message // html body
  };
  transporter.sendMail(mailOptions, function (error, response) {
    if (error) {
      logger.logError(common.apps[obj.otype].appname + ' mail sending error for ' + obj.email);
      logger.logError(error);
    }
    else {
      logger.logInfo("User registration mail sent");
    }
  });

};

/**
 * Send user registration confirmation SMS
 * @param {*} obj JSON needed to send SMS
 * @param {string} status New or change password
 */
function sendOtp(obj, status) {
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
    mobile: obj.mobile
  }
  commonsms.sendSMS(db, sms, common.smsTempate.member);
};
