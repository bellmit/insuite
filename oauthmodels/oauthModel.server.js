/**
 * User: abhijit.baldawa
 * Date: 2019-01-16  15:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * @method PUBLIC
 *
 * This method returns the Oauth model to be used for Oauth server based on the whether the current
 * server is DCPRC, PRC etc.
 *
 * @param {Object} Y YUI instance containing exposed doc cirrus modules
 * @returns {*}
 */
function getOauthModel( Y ) {
    if( Y.doccirrus.auth.isDCPRC() ) {
        return require('./dcprcOauthModel.server.js')(Y);
    } else {
        return {};
    }
}

module.exports = getOauthModel;