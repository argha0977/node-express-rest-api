/**
 * ***************************************************
 *                MongoDB Connection                 *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */


const { MongoClient } = require('mongodb');
const common = require('./common');
const logger = require('./logger');

var prodDB = 'mongodb://' + common.dbUserId + ':' + encodeURIComponent(common.dbUserPassword) +'@' + common.dbURL + '/' + common.dbName + '?replicaSet=' + common.dbReplicaSet;
/**
 * Connect to MongoDB database
 */
var CONNECT = async function(){
	try {
		const client = await MongoClient.connect(prodDB, { useUnifiedTopology: true, useNewUrlParser: true });
		const db = client.db(common.dbName);
		return db;
	} catch (err) {
		logger.logError('DB Connection Error:');
		logger.logError(err);
		var error = { status: 500, message: { error: 'DB connection failed! Retrying to connect...' } };
		throw error;
	}
};

module.exports.connect = CONNECT;