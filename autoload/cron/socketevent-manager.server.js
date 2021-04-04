/**
 * User: MA
 * Date: 02/10/14  16:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
"use strict";
YUI.add( 'SocketEventManager', function( Y, NAME ) {

        const
            NUMBER_OF_DAYS_TO_CACHE_EVENTS = 7,
            async = require( 'async' );
        class Cancelled extends Error {

        }

        /**
         * @param {Object} params
         * @param {Object} params.user
         * @param {Array} params.onlineList
         * @param {Function} callback
         */
        function checkExternalCalls( params, callback ) {
            const
                { user, onlineList } = params,
                query = {},
                dcCustomerNoList = [],
                systemTypeList = [],
                onlineListMap = new Map();
            onlineList.forEach( item => {
                onlineListMap.set( item.dcCustomerNo, item.publicKey );
                onlineListMap.set( item.systemType, item.publicKey );
                dcCustomerNoList.push( item.dcCustomerNo );
                systemTypeList.push( item.systemType );
            } );

            query.$or = [
                { targetId: { $in: dcCustomerNoList } },
                { targetType: { $in: systemTypeList } }
            ];
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.socketioevent.getExternalApiCallEvent( {
                        user,
                        query,
                        callback( err, eventList ){
                            if( err ) {
                                Y.log( `checkTenantTargetsStatus could not get socket io event list. error: ${JSON.stringify( err )}.`, 'warn', NAME );
                                return next( err );
                            }
                            if( !eventList.length ) {
                                return next( new Cancelled( 'There are no saved external api calls for online systems.' ) );
                            }
                            eventList.forEach( item => {
                                item.targetPublicKey = onlineListMap.get( item.targetId || item.targetType );
                            } );
                            next( null, eventList );
                        }
                    } );
                },
                function( eventList, next ) {
                    Y.doccirrus.communication.emitSavedExternalApiCallsToTarget( {
                        user,
                        events: eventList
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `checkTenantTargetsStatus could not emit socket io event. error: ${JSON.stringify( err )}.`, 'warn', NAME );
                        }
                        next( null, eventList );
                    } );
                }
            ], ( err ) => {
                if( err instanceof Cancelled ) {
                    Y.log( `checkTenantTargetsStatus has been cancelled: ${err.message}`, 'debug', NAME );
                    return callback();
                }
                callback( err );
            } );
        }

        /**
         * @param {Object} params
         * @param {Object} params.user
         * @param {Array} params.onlineList
         * @param {Boolean} [params.cleanCollection] if cleanCollection is set, then deletes only stale events
         *                              staleness is defined by NUMBER_OF_DAYS_TO_CACHE_EVENTS const
         * @param {Function} callback
         */
        function checkTenantTargetsStatus( params, callback ) {
            let
                deleteDate = require( 'moment' )().subtract( NUMBER_OF_DAYS_TO_CACHE_EVENTS, 'd' ).toISOString();
            const
                { user, onlineList, cleanCollection } = params;
            async.waterfall( [
                function( next ) {
                    checkExternalCalls( {
                        user,
                        onlineList,
                        cleanCollection
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `Error during checkTargetsStatus. ${JSON.stringify( err )}`, 'error', NAME );
                        }
                        next();
                    } );
                },
                function( next ) {
                    if( cleanCollection ) {
                        Y.doccirrus.api.socketioevent.deleteExternalApiCallEvent( {
                            user,
                            query: { timestamp: { $lt: deleteDate } },
                            options: {
                                override: true
                            },
                            callback: next
                        } );
                    } else {
                        setImmediate( next );
                    }

                }
            ], callback );

        }

        /**
         * @param {Object} options
         * @param {Boolean} [options.cleanCollection]
         * @param {Function} callback
         */
        function checkTargetsStatus( options = {}, callback = () => {} ) {
            Y.doccirrus.communication.getFreshOnlineServerList( ( err, onlineList ) => {
                if( err ) {
                    Y.log( `checkTenantTargetsStatus could not get online list. error: ${JSON.stringify( err )}.`, 'warn', NAME );
                    return;
                }
                if( Y.doccirrus.auth.isPRC() ) {
                    checkTenantTargetsStatus( {
                        user: Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getLocalTenantId() ),
                        onlineList,
                        cleanCollection: options.cleanCollection
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `Error during checkTargetsStatus. ${JSON.stringify( err )}`, 'error', NAME );
                        }
                        callback( err );
                    } );
                }
                if( Y.doccirrus.auth.isVPRC() ) {
                    let
                        async = require( 'async' ),
                        companies = Y.doccirrus.licmgr.getActiveCustomers() || [],
                        tenantList = companies.map( item => item.tenantId );
                    async.eachSeries( tenantList, ( tenantId, next ) => {
                        checkTenantTargetsStatus( {
                            user: Y.doccirrus.auth.getSUForTenant( tenantId ),
                            onlineList,
                            cleanCollection: options.cleanCollection
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Error during checkTargetsStatus. ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            next();
                        } );
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `Error during checkTargetsStatus. ${JSON.stringify( err )}`, 'error', NAME );
                        }
                        callback( err );
                    } );
                }
            } );
        }

        function cleanSavedExternalApiCalls() {
            checkTargetsStatus( { cleanCollection: true } );
        }

        Y.namespace( 'doccirrus' ).socketeventmanager = {
            /**
             * periodically check for expired tenants and deactivate them
             */
            checkTargetsStatus() {
                checkTargetsStatus();
            },
            cleanSavedExternalApiCalls(){
                cleanSavedExternalApiCalls();
            }
        };
        if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
            Y.doccirrus.kronnd.on( 'everyHour', Y.doccirrus.socketeventmanager.checkTargetsStatus );
            Y.doccirrus.kronnd.on( 'CloseDay', Y.doccirrus.socketeventmanager.cleanSavedExternalApiCalls );
        }
    },
    '0.0.1', { requires: [ 'dckronnd', 'dccommunication', 'dcauth', 'dclicmgr' ] }
);


