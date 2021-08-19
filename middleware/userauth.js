/**
 * ***************************************************
 *   User Authentication Verification Middleware     *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */


const jwt = require('jsonwebtoken');
const common = require('../config/common');

const verifyToken = (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["user-token"];
    const noverify = req.body.noverify || req.query.noverify || req.headers["no-verify"];

    if (!token) {
        return res.status(403).send("No User Authetication Token Found");
    }
    try {
        if (!noverify) {
            var decoded = jwt.verify(token, common.tokenSecret);
            req.tokenJson = decoded;
        }
    } catch (err) {
        return res.status(401).send("This Token is not Valid");
    }
    return next();
};

module.exports = verifyToken;