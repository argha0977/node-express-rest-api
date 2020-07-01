var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');

var UPLOAD_PATH = __dirname + '/../public/json/';

/* GET home page. */
router.get('/', function (req, res, next) {
  var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  var PACKAGE_PATH = __dirname + '/../package.json';
  fs.readFile(PACKAGE_PATH, function (err, result) {
    if (err) logger.logError(err);
    else {
      var data = JSON.parse(result);
      res.json({ title: data.description, version: data.version, from: ip });
    }
  })
});

//Get App Data for display
router.get('/appmeta/:file', function (req, res) {
  var file = req.params.file;

  // Get the file path of the file on disk
  var filePath = path.resolve(UPLOAD_PATH, file);
  console.log(filePath);
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(UPLOAD_PATH, 'app-metadata.json');
  }
  // Should check that it exists here, but for demo purposes, assume it does
  // and just pipe a read stream to the response.
  fs.createReadStream(filePath).pipe(res);

});


module.exports = router;
