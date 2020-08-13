/**
 * ***************************************************
 *             Common Database Methods               *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var logger = require('./logger');
var common = require('./common');
var con = require('./connection').connection;

module.exports = {
    /**
     * Insert One row
     * @param {string} model Model Name
     * @param {*} attrJson Attribute JSON 
     */
    insertOne: async function (model, attrJson) {
        try {
            const db = con.db;
            const result = await db.collection(model).insertOne(attrJson);
            attrJson._id = result.insertedId;
            return attrJson;
        } catch (err) {
            logger.logError(model + ': Error in insert one:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in insertion of one row in ' + model } };
            throw error; 
        }
    },

    /**
     * Insert many rows
     * @param {string} model Model Name
     * @param {*} array JSON Array 
     */
    insertMany: async function (model, array) {
        try {
            const db = con.db;
            const result = await db.collection(model).insertMany(array);
            return { count: array.length };
        } catch (err) {
            logger.logError(model + ': Error in insert many:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in insertion of many rows in ' + model } };
            throw error; 
        }
    },

    /**
     * Update One row
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {*} attrJson Attribute JSON 
     */
    updateOne: async function (model, criteria, attrJson) {
        var update = {};
        if (attrJson['$push'] || attrJson['$pop'] || attrJson['$unset'] || attrJson['$set']) {
            update = attrJson;
        }
        else {
            update = { $set: attrJson };
        }
        try {
            const db = con.db;
            const uresult = await db.collection(model).updateOne(criteria, update);
            const result = await db.collection(model).findOne(criteria);
            return result;
        } catch (err) {
            logger.logError(model + ': Error in update one:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in update of one row in ' + model } };
            throw error;
        }
    },

    /**
     * Update many rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {*} attrJson Attribute JSON 
     */
    updateMany: async function (model, criteria, attrJson) {
        var update = {};
        if (attrJson['$push'] || attrJson['$pop'] || attrJson['$unset'] || attrJson['$set']) {
            update = attrJson;
            if (attrJson['$set']) attrJson = attrJson['$set'];
            else attrJson = {};
        }
        else {
            update = { $set: attrJson };
        }
        try {
            const db = con.db;
            const result = await db.collection(model).updateMany(criteria, update);
            return attrJson;
        } catch (err) {
            logger.logError(model + ': Error in update many:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in update of many row in ' + model } };
            throw error;
        }
    },

    /**
     * Delete One row
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     */
    deleteOne: async function (model, criteria) {
        try {
            const db = con.db;
            const result = await db.collection(model).deleteOne(criteria);
            return { message: 'Removed one from ' + model };
        } catch (err) {
            logger.logError(model + ': Error in delete one:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in removal of one row from ' + model } };
            throw error;
        }
    },

    /**
     * Delete many rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     */
    deleteMany: async function (model, criteria) {
        try {
            const db = con.db;
            const result = await db.collection(model).deleteMany(criteria);
            return { message: 'Removed many from ' + model };
        } catch (err) {
            logger.logError(model + ': Error in delete many:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in removal of many rows from ' + model } };
            throw error;
        }
    },

    /**
     * Find one row
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {*} attrJson Attribute JSON 
     */
    findOne: async function (model, criteria, attrJson) {
        try {
            const db = con.db;
            var result = await db.collection(model).findOne(criteria, attrJson);
            if(result) return result;
            else {
                var error = { status: 404, message: { error: 'Not present in ' + model } };
                throw error;
            }
        } catch (err) {
            if(err.status == 404) throw err;
            else {
                logger.logError(model + ': Error in find one:');
                logger.logError(err);
                var error = { status: 500, message: { error: 'DB error in find one from ' + model } };
                throw error;
            }
            
        }
    },

    /**
     * Count rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     */
    count: async function (model, criteria) {
        try {
            const db = con.db;
            var result = await db.collection(model).countDocuments(criteria);
            return result;
        } catch (err) {
            logger.logError(model + ': Error in count:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in counting rows from ' + model } };
            throw error;
        }
    },

    /**
     * Find many rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {*} attrJson Attribute JSON 
     */
    find: async function (model, criteria, attrJson) {
        try {
            const db = con.db;
            var skip = 0;
            if (criteria.skip || criteria.skip == 0) {
                skip = parseInt(criteria.skip);
                delete criteria.skip;
            }
            var limit = 0;
            if (criteria.limit || criteria.limit == 0) {
                limit = parseInt(criteria.limit);
                delete criteria.limit;
            }
            var sort = { _id: 1 };
            if (criteria.sort) {
                sort = criteria.sort;
                delete criteria.sort;
            }
            var hint = { _id: 1 };
            if (criteria.hint) {
                hint = criteria.hint;
                delete criteria.hint;
            }
            if (criteria['$text']) {
                var result = await db.collection(model).find(criteria, attrJson).sort(sort).skip(skip).limit(limit).toArray();
                return result;
            }
            else {
                var result = await db.collection(model).find(criteria, attrJson).sort(sort).hint(hint).skip(skip).limit(limit).toArray();
                return result;
            }
        } catch (err) {
            logger.logError(model + ': Error in find many:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in find many rows of ' + model } };
            throw error;
        }
    },

    /**
     * Group rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {*} groupJson Group attribute JSON 
     */
    groupOnly: async function (model, criteria, groupJson) {
        try {
            const db = con.db;
            var aggregateArray = [];
            if (criteria.sort) {
                var sort = criteria.sort;
                delete criteria.sort;
                aggregateArray = [{ $match: criteria }, { $sort: sort }];
            }
            else aggregateArray = [{ $match: criteria }];
            aggregateArray.push({ $group: groupJson });
            var result = await db.collection(model).aggregate(aggregateArray).toArray();
            return result;
        } catch (err) {
            logger.logError(model + ': Error in group only:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in grouping rows of ' + model } };
            throw error;
        }
    },

    /**
     * Distinct rows
     * @param {string} model Model Name
     * @param {*} criteria Criteria JSON
     * @param {string} distAttr Distinct attribute
     */
    distinct: async function (model, criteria, distAttr) {
        try {
            const db = con.db;
            var result = await db.collection(model).distinct(distAttr, criteria);
            return result;
        } catch (err) {
            logger.logError(model + ': Error in distinct:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in searching distinct rows of ' + model } };
            throw error;
        }
    },

    /**
     * Insert a row in user log
     * @param {*} attrJson Attribute JSON
     */
    insertLog: async function (attrJson) {
        try {
            const db = con.db;
            attrJson.timestamp = new Date();
            const result = await db.collection(common.userLogModel).insertOne(attrJson);
            //logger.logInfo(common.userLogModel + ': Added to log');
        } catch (err) {
            logger.logError(common.userLogModel + ': Error in insert to log:');
            logger.logError(err);
        }
    },

    /**
     * Insert a row in SMS log
     * @param {*} attrJson Attribute JSON
     */
    insertSMSLog: async function (attrJson) {
        try {
            const db = con.db;
            attrJson.timestamp = new Date();
            const result = await db.collection(common.smsLogModel).insertOne(attrJson);
            //logger.logInfo(common.smsLogModel + ': Added to log');
        } catch (err) {
            logger.logError(common.smsLogModel + ': Error in insert to log:');
            logger.logError(err);
        }
    },


    /**
     * Get All collections of database
     */
    getCollections: async function () {
        try {
            const db = con.db;
            const result = await db.listCollections().toArray();
            return result;
        } catch (err) {
            logger.logError('Error in searching collections of database:');
            logger.logError(err);
            var error = { status: 500, message: { error: 'DB error in searching collections of database' } };
            throw error;
        }
    },
}