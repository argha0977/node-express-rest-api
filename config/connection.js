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
var CONNECT = {
	db: undefined,
	client: undefined,
	/**
	 * Connect MongoDB database
	 */
	connect: async function () {
		try {
			CONNECT.client = await MongoClient.connect(prodDB, { useUnifiedTopology: true, useNewUrlParser: true });
			const db = CONNECT.client.db(common.dbName);
			CONNECT.db = db;
			//return db;
		} catch (err) {
			CONNECT.close();
			logger.logError('DB Connection Error:');
			logger.logError(err);
			var error = { status: 500, message: { error: 'DB connection failed! Retrying to connect...' } };
			throw error;
		}
	},

	/**
	 * Close MongoDB connection
	 */
	close: function () {
		CONNECT.db = undefined;
		if (CONNECT.client) CONNECT.client.close();
		CONNECT.client = undefined;
	}
};

module.exports.connection = CONNECT;