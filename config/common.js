/**
 * ***************************************************
 *             Common Fields & Methods               *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */



/**
 * Database Name
 */
var DB_NAME = '';

/**
 * database User Id
 */
var DB_USER_ID = '';

/**
 * database Password
 */
var DB_USER_PASSWORD = '';

/**
 * MongoDB URL
 */
var DB_URL = '';

/**
 * MongoDB Replica Set Name
 */
var DB_REPLICASET = '';

/**
 * Digital Ocean Space access ID
 */
var SPACES_ACCESS_KEY_ID = '';

/**
 * Digital Ocean Space access Key
 */
var SPACES_SECRET_ACCESS_KEY = '';

/**
 * Digital Ocean Space Bucket Name
 */
var SPACE_BUCKET = '';

/**
 * Digital Ocean Space Folder Name
 */
var SPACE_PATH = 'erpfiles/';

/**
 * Digital Ocean Space End Point
 */
var SPACE_ENDPOINT = 'sgp1.digitaloceanspaces.com';

/**
 * Authorization Key file name
 */
var AUTH_KEY_FILE_NAME = 'keys.json';

/**
 * User log model name
 */
var USER_LOG_MODEL = 'userlog';

/**
 * SMS log model name
 */
var SMS_LOG_MODEL = 'smslog';

/**
 * BCC email ids
 */
var BCC = ['email2argha@gmail.com'];

/**
 * Default App Type(Mobile/Web)
 */
var APP_TYPE = 'Web';

/**
 * Token Secret
 */
var TOKEN_SECRET = 's06Tm55ts%^S9sX';

var SMS_TEMPLATES = {
    member: 'Dear Member ',
    student: 'Dear Student ',
    guardian: 'Dear Parents ',
    staff: 'Dear Teacher '
};

/**
 * Apps Information JSON
 */
var APPS = {
    'Organization': {
        appname: 'My App',
        orgtype: 'Company',
        senderid: 'COMPAN',
        users: 'staffs',
        userauthkey: 'onesignaluserauth',
        appauthkey: 'onesignalappauth',
        appid: 'onesignalappid',
        weblink: 'https://web.myapp.in/#/',
        applink: {
            all: 'https://play.google.com/store/apps/details?id=com.myorg.myapp'
        }
    }
};

/**
 * ************************************
 *            METHODS                 *
 * ************************************
 */
module.exports = {
    /**
     * Linerar search to a JSON array
     * @param {*} array Array to be searched
     * @param {string} key Key attribute
     * @param {string} value Key value
     */
    findItem: function (array, key, value) {
        for (var index = 0; index < array.length; index++) {
            if (array[index][key] == value) {
                return index;
            }
        }
        return -1;
    },

    /**
     * Linerar search to a JSON array within a specified range
     * @param {*} array Array to be searched
     * @param {string} key Key attribute
     * @param {string} value Key value
     * @param {number} start Lower bound
     * @param {number} end Upper bound
     */
    findItemRange: function (array, key, value, start, end) {
        for (var index = start; index <= end; index++) {
            if (array[index][key] == value) {
                return index;
            }
        }
        return -1;
    },

    /**
     * Linerar search to a JSON array by ignoring case
     * @param {*} array Array to be searched
     * @param {string} key Key attribute
     * @param {string} value Key value
     */
    findItemIgnoreCase: function (array, key, value) {
        for (var index = 0; index < array.length; index++) {
            if (array[index][key].toLowerCase() == value.toLowerCase()) {
                return index;
            }
        }
        return -1;
    },

    /**
     * Pad zero(0) to the left of string
     * @param {string} padString String to be padded
     * @param {number} length Total length of padded string
     */
    leftPad: function (padString, length) {
        var str = padString.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    },

    /**
     * Get current financial year
     */
    currentFinancialYear: function () {
        var cfyear = "";
        var year = new Date().getFullYear();
        var month = new Date().getMonth();
        if (month >= 0 && month <= 2) {
            cfyear = (year - 1).toString() + '-' + year.toString();
        }
        else {
            cfyear = year.toString() + '-' + (year + 1).toString();
        }
        return cfyear;
    },

    /**
     * Get financial year from a date
     * @param {date} date Date
     */
    getFinancialYear: function (date) {
        var cfyear = "";
        var year = new Date(date).getFullYear();
        var month = new Date(date).getMonth();
        if (month >= 0 && month <= 2) {
            cfyear = (year - 1).toString() + '-' + year.toString();
        }
        else {
            cfyear = year.toString() + '-' + (year + 1).toString();
        }
        return cfyear;
    },

    /**
     * Get start and end dates of financial year.
     * @param {String} fyear Financial Year
     */
    datesOfFinancialYear: function (fyear) {
        //Split fyear
        var splitted = fyear.split('-');
        //Get Years
        var syear = parseInt(splitted[0].trim());
        var eyear = parseInt(splitted[1].trim());
        //Set Start and End Dates
        var sdate = new Date(syear, 3, 1);
        var edate = new Date(eyear, 2, 31);
        var result = {
            start: sdate,
            end: edate
        };
        return result;
    },

    /**
     * Get previous financial year
     * @param {String} fyear Financial Year
     */
    previousFinancialYear(fyear) {
        //Split fyear
        var splitted = fyear.split('-');
        //Get Years
        var syear = parseInt(splitted[0].trim());
        var eyear = parseInt(splitted[1].trim());
        //Set Previous Financial Year
        var pfyear = (syear - 1).toString() + '-' + (eyear - 1).toString();
        return pfyear;
    },

    /**
     * Get current timestamp id
     */
    getTimeStampId: function () {
        return new Date().valueOf().toString();
    },

    /**
     * Get short value for amount 
     * @param {number} value Amount
     * @returns Return amount in text
     */
    getValue: function (value) {
        var result = (value / 10000000);
        if (result >= 1) return Math.ceil(result).toString() + 'Cr.';
        else {
            result = (value / 100000);
            if (result >= 1) return Math.ceil(result).toString() + 'Lac';
            else {
                result = (value / 1000);
                if (result >= 1) return Math.ceil(result).toString() + 'K';
                else return value;
            }
        }
    },

    /**
     * Convert number to ward
     * @param {number} int Number to be converted
     * @param {boolean} IS_SOUTH_ASIAN South Asian format or Western format
     */
    intToWords: function (int, IS_SOUTH_ASIAN = true) {
        if (int === 0) return 'zero';

        var ONES_WORD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        var TENS_WORD = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        var SCALE_WORD_WESTERN = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion'];
        var SCALE_WORD_SOUTH_ASIAN = ['', 'thousand', 'lakh', 'crore', 'arab', 'kharab', 'neel', 'padma', 'shankh', '***', '***'];

        var GROUP_SIZE = (typeof IS_SOUTH_ASIAN != "undefined" && IS_SOUTH_ASIAN) ? 2 : 3;
        var SCALE_WORD = (typeof IS_SOUTH_ASIAN != "undefined" && IS_SOUTH_ASIAN) ? SCALE_WORD_SOUTH_ASIAN : SCALE_WORD_WESTERN;


        //Return title case 
        function sentenceCase(str) {
            if ((str === null) || (str === ''))
                return false;
            else
                str = str.toString();

            return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        }
        // Return string of first three digits, padded with zeros if needed
        function get_first_3(str) {
            return ('000' + str).substr(-(3));
        }
        function get_first(str) { //-- Return string of first GROUP_SIZE digits, padded with zeros if needed, if group size is 2, make it size 3 by prefixing with a '0'
            return (GROUP_SIZE == 2 ? '0' : '') + ('000' + str).substr(-(GROUP_SIZE));
        }


        // Return string of digits with first three digits chopped off
        function get_rest_3(str) {
            return str.substr(0, str.length - 3);
        }
        function get_rest(str) { // Return string of digits with first GROUP_SIZE digits chopped off
            return str.substr(0, str.length - GROUP_SIZE);
        }

        // Return string of triplet convereted to words
        function triplet_to_words(_3rd, _2nd, _1st) {
            return (_3rd == '0' ? '' : ONES_WORD[_3rd] + ' hundred ') +
                (_1st == '0' ? TENS_WORD[_2nd] : TENS_WORD[_2nd] && TENS_WORD[_2nd] + '-' || '') +
                (ONES_WORD[_2nd + _1st] || ONES_WORD[_1st]);  //-- 1st one returns one-nineteen - second one returns one-nine
        }

        // Add to result, triplet words with scale word
        function add_to_result(result, triplet_words, scale_word) {
            return triplet_words ? triplet_words + (scale_word && ' ' + scale_word || '') + ' ' + result : result;
        }

        function recurse(result, scaleIdx, first, rest) {
            if (first == '000' && rest.length === 0) return result;
            var newResult = add_to_result(result, triplet_to_words(first[0], first[1], first[2]), SCALE_WORD[scaleIdx]);
            return recurse(newResult, ++scaleIdx, get_first(rest), get_rest(rest));
        }

        var wardnum = recurse('', 0, get_first_3(String(int)), get_rest_3(String(int)));
        return sentenceCase(wardnum) + 'Only';
    }
}

/**
 * ***************************************
 *               EXPORTS                 *
 * ***************************************
 */
module.exports.dbName = DB_NAME;
module.exports.dbUserId = DB_USER_ID;
module.exports.dbUserPassword = DB_USER_PASSWORD;
module.exports.dbURL = DB_URL;
module.exports.dbReplicaSet = DB_REPLICASET;

module.exports.apps = APPS;

module.exports.spacesAccessKeyId = SPACES_ACCESS_KEY_ID;
module.exports.spacesSecretAccessKey = SPACES_SECRET_ACCESS_KEY;
module.exports.spaceEndPoint = SPACE_ENDPOINT;
module.exports.spaceBucket = SPACE_BUCKET;
module.exports.spacePath = SPACE_PATH;

module.exports.authKeyFileName = AUTH_KEY_FILE_NAME;

module.exports.userLogModel = USER_LOG_MODEL;
module.exports.smsLogModel = SMS_LOG_MODEL;

module.exports.bcc = BCC;
module.exports.appType = APP_TYPE;

module.exports.tokenSecret = TOKEN_SECRET;

module.exports.smsTempate = SMS_TEMPLATES;