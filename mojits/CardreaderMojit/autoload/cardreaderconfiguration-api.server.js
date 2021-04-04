/**
 * User: mahmoud
 * Date: 05/11/14  16:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/

YUI.add('cardreaderconfiguration-api', function (Y, NAME) {
        async function getCardreaderConfiguration( args ) {
            Y.log('Entering Y.doccirrus.api.cardreaderconfiguration.getCardreaderConfiguration', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardreaderconfiguration.getCardreaderConfiguration');
            }
            const {user, query, callback, options} = args;

            const deviceServers = await Y.doccirrus.api.sdManager.getDeviceServerNames();
            const deviceServerNames = deviceServers.map( deviceServer => deviceServer.name );
            const localDeviceServer = deviceServers.filter( deviceServer => deviceServer.ip === user.ip );
            const localDeviceServerName = localDeviceServer && localDeviceServer.length === 1 && localDeviceServer[0].name ? localDeviceServer[0].name : '';
            const localDeviceServerVersion = localDeviceServer && localDeviceServer.length === 1 && localDeviceServer[0].version ? localDeviceServer[0].version : '';
            const extendedQuery = {...query, ds: {$in: deviceServerNames}};

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'cardreaderconfiguration',
                user: user,
                query: extendedQuery,
                options: options
            }, ( err, result ) => {
                callback( err, {configurations: result.result, localDeviceServerName, localDeviceServerVersion} );
            } );
        }

        function postAndReturn( args ){
            Y.log('Entering Y.doccirrus.api.cardreaderconfiguration.postAndReturn', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardreaderconfiguration.postAndReturn');
            }
            const
                { data, user, callback } = args;

            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'cardreaderconfiguration',
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( data ),
                options: {
                    entireRec: true
                }
            }, callback );
        }

        function deleteConfigurations( args ) {
            Y.log('Entering Y.doccirrus.api.cardreaderconfiguration.deleteConfigurations', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardreaderconfiguration.deleteConfigurations');
            }
            const
                { user, callback, query } = args;

            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'cardreaderconfiguration',
                user: user,
                query: query
            }, callback );
        }

        async function getRegisteredCardreaders( args ) {
            Y.log('Entering Y.doccirrus.api.cardreaderconfiguration.getRegisteredCardreaders', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.cardreaderconfiguration.getRegisteredCardreaders');
            }
            const {user, query, callback, options} = args;

            const deviceServers = await Y.doccirrus.api.sdManager.getDeviceServerNames();
            const deviceServerNames = deviceServers.map( deviceServer => deviceServer.name );
            const extendedQuery = {...query, ds: {$in: deviceServerNames}};

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'cardreaderconfiguration',
                user: user,
                query: extendedQuery,
                options: options
            }, ( err, result ) => {
                callback( err, {registeredCardreaders: result.result, deviceServers} );
            } );
        }

        Y.namespace( 'doccirrus.api' ).cardreaderconfiguration = {
            postAndReturn,
            getCardreaderConfiguration,
            deleteConfigurations,
            getRegisteredCardreaders
        };

    },
    '0.0.1', {requires: ['dccrmanager', 'cardreadercommon', 'dccommonutils']}
);