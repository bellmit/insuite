/*global YUI*/
'use strict';
YUI.add( 'tenant-api', function( Y, NAME ) {

        Y.namespace( 'doccirrus.api' ).tenant = {
            name: NAME,

            get: ( args ) => {
                Y.log('Entering Y.doccirrus.api.tenant.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tenant.get');
                }
                Y.doccirrus.api.company.get( args );
            },
            post: ( args ) => {
                Y.log('Entering Y.doccirrus.api.tenant.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tenant.post');
                }
                let _cb = args.callback,
                    finalResult = {},
                    async = require( 'async' );

                async.waterfall( [
                    ( next ) => {
                        args.callback = next;
                        Y.doccirrus.api.company.createTenant( args );
                    },
                    ( res, next ) => {
                        args.data = {
                            _id: res && res[4] && res[4].companyId,
                            days: 0
                        };
                        finalResult = {
                            tenantId: res[4] && res[4].tenantId,
                            companyId: res[4] && res[4].companyId,
                            supportId: res[3],
                            contactId: res[2]
                        };
                        args.callback = next;
                        Y.doccirrus.api.company.activateTenant( args );
                    }
                ], ( err ) => {
                    if( err ) {
                        return _cb( err );
                    }
                    return _cb( null, finalResult );
                } );
            },
            put: ( args ) => {
                Y.log('Entering Y.doccirrus.api.tenant.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tenant.put');
                }
                let
                    {user, callback, query, data: {company = {}, contact, supportContact = {}} = {}, forTest} = args,
                    async = require( "async" );

                if( !query._id ) {
                    args.callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid parameters'} ) );
                    return;
                }

                async.series( [
                    function( done ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'company',
                            action: 'put',
                            fields: Object.keys( company ),
                            data: Y.doccirrus.filters.cleanDbObject( company ),
                            query: query
                        }, ( err, res ) => {
                            if( err ) {
                                return done( err );
                            }
                            return done( null, res );
                        } );
                    },
                    function( done ) {
                        if( !contact._id ) {
                            return setImmediate( done );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'contact',
                            action: 'put',
                            fields: Object.keys( contact ),
                            data: Y.doccirrus.filters.cleanDbObject( contact ),
                            query: {_id: contact._id}
                        }, ( err, res ) => {
                            if( err ) {
                                return done( err );
                            }
                            return done( null, res );
                        } );
                    },
                    function( done ) {
                        if( !supportContact._id ) {
                            return setImmediate( done );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'basecontact',
                            action: 'put',
                            fields: Object.keys( supportContact ),
                            data: Y.doccirrus.filters.cleanDbObject( supportContact ),
                            query: {_id: supportContact._id}
                        }, ( err, res ) => {
                            if( err ) {
                                return done( err );
                            }
                            return done( null, res );
                        } );
                    }
                ], ( err, result )=>{
                    if( err ) {
                        return callback( err );
                    }
                    if( forTest ) {
                        return callback( null, result );
                    }
                    return callback();
                } );
            },
            delete: ( args ) => {
                Y.log('Entering Y.doccirrus.api.tenant.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tenant.delete');
                }
                Y.doccirrus.api.company.deleteTenant( args );
            }
        };
    },

    '0.0.1', {requires: ['intl', 'company-api']}
);
