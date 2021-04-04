/**
 * User: pi
 * Date: 11/10/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

function mockAuth( Y, TENANT_ID ) {
    const original = Y.doccirrus.auth;
    Y.doccirrus.auth.checkAndGetSecretForApp = function checkAndGetSecretForApp( appName, callback ) {
        Y.doccirrus.auth._checkAndGetSecretForApp( {
            appName,
            user: Y.doccirrus.auth.getSUForTenant( TENANT_ID )
        }, callback );
    };
    Y.doccirrus.auth.setSecretsForApps = function setSecretForApp( appTokens, callback ) {
        Y.doccirrus.auth._setSecretsForApps( {
            appTokens,
            user: Y.doccirrus.auth.getSUForTenant( TENANT_ID )
        }, callback );
    };

    Y.doccirrus.auth.getSUForLocal = function getSUForLocal() {
        return Y.doccirrus.auth.getSUForTenant( TENANT_ID );
    };
    return original;
}

module.exports = mockAuth;
