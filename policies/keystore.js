/**
 * Read and Write keys in keystore(A JSON file)
 */

 const fs = require('fs');
 const path = require('path');


 const common = require('../config/common');

 const KEY_FILE_PATH = __dirname + '/../public/';

 module.exports = {
     /**
     * Kead key store file and return keys
     */
     readKeys: function () {
         let keys = [];
         let filePath = path.resolve(KEY_FILE_PATH, common.authKeyFileName);
         //Check existance of Keys file
         let exists = fs.existsSync(filePath);
         if (exists) {
             //Read Keystaote
             let data = fs.readFileSync(filePath);
             if (!data) return keys;
             else {
                 keys = JSON.parse(data.toString());
                 return keys;
             }
         }
         else return keys;
     },

    /**
    * Write keys array in key store
    * @param {any} data Keys array
    */
     writeKeys: function (data) {
         let filePath = path.resolve(KEY_FILE_PATH, common.authKeyFileName);
         fs.writeFileSync(filePath, JSON.stringify(data));
         return true;
     }
 }
