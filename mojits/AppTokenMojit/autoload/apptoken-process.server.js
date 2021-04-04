/**
 * User: pi
 * Date: 16/04/18  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'apptoken-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function checkExistingAppToken( user, appToken, callback ) {
            const
                dbData = this && this.dbData;
            if( appToken.isNew || (dbData && dbData.appName !== appToken.appName) ) {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'apptoken',
                    action: 'get',
                    query: {
                        'appName': appToken.appName
                    },
                    options: {
                        limit: 1
                    }
                }, ( err, results = [] ) => {
                    if( err ) {
                        return callback( err );
                    }
                    if( results.length ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 31001 ) );
                    }
                    callback();
                } );
            }
            process.nextTick( callback );
        }

        function checkAppTokenLicenseUsage( user, appToken, callback ) {
            const
                dbData = this && this.dbData || {};
            if( appToken.isNew || (dbData && dbData.appName !== appToken.appName) ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'company',
                    action: 'get',
                    query: {
                        'licenseScope.solutions': { $in: [ appToken.appName, dbData.appName ] }
                    },
                    options: {
                        limit: 1
                    }
                }, ( err, results = [] ) => {
                    if( err ) {
                        return callback( err );
                    }
                    if( results.length ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 31000 ) );
                    }
                    callback();
                } );
            }
            process.nextTick( callback );
        }

        function setTitle( user, appToken, callback ) {
            if( !appToken.title ) {
                appToken.title = appToken.appName;
            }
            callback();
        }

        Y.namespace( 'doccirrus.schemaprocess' )[ NAME ] = {
            pre: [
                {
                    run: [
                        setTitle, checkExistingAppToken, checkAppTokenLicenseUsage
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        checkAppTokenLicenseUsage
                    ], forAction: 'delete'
                }
            ],
            name: NAME
        };

    },
    '0.0.1', { requires: [ 'schemaloader' ] }
);
