/*global YUI */


YUI.add( 'gkv_deliverysettings-api', function( Y, NAME ) {

        /**
         * Flags already used locations in result set, so these entry can be disabled in select2
         * @param {Object}      args
         * @param {Array}       args.deliverySettingId to filter delivery settings's location that currently in use
         * @param {Function}    args.callback
         * @param  {Object}     args.user
         */
        function getUnusedLocations( args ) {
            Y.log( 'Entering Y.doccirrus.api.gkv_deliverysettings.getUnusedLocations', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.gkv_deliverysettings.getUnusedLocations' );
            }
            const
                Promise = require( 'bluebird' ),
                user = args.user,
                params = args.originalParams,
                originalCallback = args.callback;
            let usedLocationIds;

            function getLocations() {
                return new Promise( ( resolve, reject ) => {
                    args.callback = function( err, results ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( results );
                    };
                    Y.doccirrus.api.location.get( args );
                } );
            }

            let deliverySettingsQuery = {mainLocationId: {$ne: null}};
            if( params && params.deliverySettingId ) {
                deliverySettingsQuery._id = {$ne: params.deliverySettingId};
            }

            Promise.resolve( Y.doccirrus.mongodb.runDb( {
                model: 'gkv_deliverysettings',
                user: user,
                query: deliverySettingsQuery,
                options: {
                    select: {
                        mainLocationId: 1
                    },
                    lean: true
                }
            } ) ).map( deliverySetting => deliverySetting.mainLocationId ).then( ids => {
                usedLocationIds = ids;
                return getLocations();
            } ).each( location => {
                location._alreadyUsed = usedLocationIds && usedLocationIds.includes( location._id.toString() );
            } ).then( results => {
                originalCallback( null, results );
            } ).catch( err => {
                Y.log( 'could not locattion for delivery settings ' + (err && err.stack || err), 'error', NAME );
                originalCallback( err );
            } );

        }

        function getKvcaEntry( args ) {
            Y.log( 'Entering Y.doccirrus.api.gkv_deliverysettings.getKvcaEntry', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.gkv_deliverysettings.getKvcaEntry' );
            }
            const
                SU = Y.doccirrus.auth.getSUForLocal(),
                Promise = require( 'bluebird' ),
                {originalParams, callback} = args;

            if( !originalParams.kv ) {
                Y.log( 'could not store certificate: insufficient arguments', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            return Promise.resolve().then( () => {
                const
                    descriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: '_CUSTOM',
                        short: 'KVCA'
                    } );
                if( !descriptor ) {
                    throw Error( 'could not KVCA catalog descriptor ' );
                }

                let query = {
                    kv: originalParams.kv,
                    key: null,
                    catalog: descriptor.filename
                };

                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalog',
                    query: query,
                    options: {
                        lean: true,
                        limit: 1
                    }
                } ) ).get( 0 );
            } ).then( entry => {
                if( !entry ) {
                    return callback( new Error( 'kvca entry not found' ) );
                }
                callback( null, entry || null );
            } ).catch( err => {
                Y.log( 'could not lookup catalog entry: ' + err, 'error', NAME );
                callback( err );
            } );

        }

        function GET( args ) {
            const
                Promise = require( 'bluebird' ),
                {user, query, options, callback} = args;
            let results;
            Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'gkv_deliverysettings',
                query: query,
                options: options
            } ) ).then( _results => {
                results = _results;
                return results;
            } ).then( () => callback( null, results ) ).catch( err => {
                Y.log( 'could not get delivery settings: ' + (err && err.stack || err), 'error', NAME );
                callback( err );
            } );

        }

        Y.namespace( 'doccirrus.api' ).gkv_deliverysettings = {

            name: NAME,

            get: GET,

            getDeliverySettings: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.gkv_deliverysettings.getDeliverySettings', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.gkv_deliverysettings.getDeliverySettings' );
                }
                Y.log( 'deliverysettings API - getDeliverySettings', 'info', NAME );

                const
                    {user, callback} = args;

                function settingsCb( err, settings ) {
                    if( err ) {
                        Y.log( 'DeliverySettings API - getDeliverySettings settingsCb' + JSON.stringify( err ), 'error', NAME );

                        callback( err );
                        return;
                    }

                    settings = JSON.parse( JSON.stringify( settings[0] ) );
                    callback( null, settings );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'gkv_deliverysettings',
                    options: {
                        limit: 1
                    }
                }, settingsCb );

            },
            getUnusedLocations,
            getKvcaEntry

        };

    },
    '0.0.1', {requires: ['gkv_deliverysettings-schema', 'location-api', 'dccommonutils']}
);
