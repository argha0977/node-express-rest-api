/**
 * ***************************************************
 *              Common Mail Methods                  *
 *          Developed By Argha Deysarkar             *
 * ***************************************************
 */

var logger = require('./logger');
var common = require('./common');

var nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

/**
 * Gmail configuration
 */
var googleConfig = {
    semail: "pinghost2016@gmail.com",
    clientId: '342317901166-8f13ohoc0ic71t9tkf5uqjvj24hfhdqs.apps.googleusercontent.com',
    clientSecret: 'KCfA6t042dhJIcFquaZaIRp7',
    redirectUrl: "https://developers.google.com/oauthplayground",
    refreshToken: '1//04L4gB8pri4R9CgYIARAAGAQSNwF-L9IrV6xacXMIIlzzD2REmm-oAaOEpncccuVaXz9A6iZ2gJU5eJX8cGYzUQN9VwKTE8lSHGI'
};

module.exports = {
    /**
     * 
     * @param {*} mailOptions Mail Options containing recipient mail id, cc, bcc, message, subject etc.
     * @param {*} appName Application Name
     */
    async sendMail(mailOptions, appName) {
        try {
            const oauth2Client = new OAuth2(
                googleConfig.clientId,
                googleConfig.clientSecret,
                googleConfig.redirectUrl
            );

            oauth2Client.setCredentials({
                refresh_token: googleConfig.refreshToken
            });
            const accessToken = oauth2Client.getAccessToken()

            var transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    type: 'OAuth2',
                    user: googleConfig.semail,
                    clientId: googleConfig.clientId,
                    clientSecret: googleConfig.clientSecret,
                    refreshToken: googleConfig.refreshToken,
                    accessToken: accessToken,
                    timeout: 3600
                }
            });

            mailOptions.from = appName + "<" + googleConfig.semail + ">";
            const response = await transporter.sendMail(mailOptions);
            return response;
            /* transporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    logger.logError(appName + ' mail sending error for ' + mailOptions.to);
                    logger.logError(error);
                }
                transporter.close();
            }); */
        } catch (err) {
            logger.logError(appName + ' mail sending error for ' + mailOptions.to);
            logger.logError(err);
            throw err;
        }
        
    }
}