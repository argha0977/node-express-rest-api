/**
 * ***************************************************
 *  Common Space(Digital Ocean) Transaction  Methods *
 *            For File Upload/Download               *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var common = require('./common');
var logger = require('./logger');

// Load the AWS SDK
const AWS = require('aws-sdk');
var fs = require('fs');

//var common.spaceBucket = 'sisx-erp';
//var common.spacePath = 'erpfiles/';

// Use our env vars for setting credentials
AWS.config.update({
    accessKeyId: common.spacesAccessKeyId,
    secretAccessKey: common.spacesSecretAccessKey
});

// Create an S3 client setting the Endpoint to DigitalOcean Spaces
var spacesEndpoint = new AWS.Endpoint(common.spaceEndPoint);
var s3 = new AWS.S3({ endpoint: spacesEndpoint });

module.exports = {
    /**
     * Upload file to SPACE
     * @param {string} sourcePath Source File path
     * @param {string} targetFolderName Folder name of SPACE
     * @param {string} targetFileName Target File Name
     * @param {*} callback Callback function
     */
    set: function (sourcePath, targetFolderName, targetFileName, callback) {
        var keyPath = common.spacePath + targetFolderName + '/' + targetFileName;
        try {
            fs.exists(sourcePath, function (exists) {
                if (exists) {
                    var readStream = fs.createReadStream(sourcePath);

                    // This will wait until we know the readable stream is actually valid before piping
                    readStream.on('open', function () {
                        // This just pipes the read stream to the response object (which goes to the client)
                        var params = {
                            Bucket: common.spaceBucket,
                            Key: keyPath,
                            Body: readStream,//fs.createReadStream(sourcePath),
                            ACL: 'public-read'
                        };
                        s3.putObject(params, function (err, data) {
                            if (err) {
                                logger.logError(err);
                                var error = { status: 500, message: { error: 'file upload failed in ' + targetFolderName + '. Please try again.' } };
                                callback(error, null);
                            }
                            else {
                                callback(null, { fileName: targetFileName });
                                fs.unlink(sourcePath, function (err) {
                                    if (err) {
                                        logger.logError(err);
                                    }
                                    else {
                                        logger.logInfo(sourcePath + ' removed');
                                    }
                                })
                            }
                        });
                    });

                    // This catches any errors that happen while creating the readable stream (usually invalid names)
                    readStream.on('error', function (err) {
                        logger.logError(err);
                        var error = { status: 500, message: { error: 'file upload failed in ' + targetFolderName + '. Please try again.' } };
                        callback(error, null);
                    });

                }
                else {
                    var error = { status: 500, message: { error: 'file upload failed in ' + targetFolderName + '. Please try again.' } };
                    callback(error, null);
                }
            })

        } catch (err) {
            logger.logError(err);
            var error = { status: 500, message: { error: 'file upload failed in ' + targetFolderName + '. Please try again.' } };
            callback(error, null);
        }
    },

    /**
     * Get file from SPACE
     * @param {string} folderName Folder name of SPACE
     * @param {string} fileName File Name
     * @param {*} callback Callback function
     */
    get: function (folderName, fileName, callback) {
        var keyPath = common.spacePath + folderName + '/' + fileName;
        var params = {
            Bucket: common.spaceBucket,
            Key: keyPath
        };
        s3.getObject(params, function (err, data) {
            if (err) {
                logger.logError(err);
                var error = { status: 500, message: { error: 'Unable to read file ' + fileName + ' from ' + folderName + '. Please try again.' } };
                callback(error, null);
            }
            else {
                callback(null, data);
            }
        });
    },

    /**
     * Remove file from SPACE
     * @param {string} folderName Folder name of SPACE
     * @param {string} fileName File Name
     * @param {*} callback Callback function
     */
    remove: function (folderName, fileName, callback) {
        var keyPath = common.spacePath + folderName + '/' + fileName;
        var params = {
            Bucket: common.spaceBucket,
            Key: keyPath
        };
        s3.deleteObject(params, function (err, data) {
            if (err) {
                logger.logError(err);
                var error = { status: 500, message: { error: 'Unable to read file ' + fileName + ' from ' + folderName + '. Please try again.' } };
                callback(error, null);
            }
            else {
                callback(null, { message: 'Removed ' + folderName + '/' + fileName});
            }
        });
    }
}