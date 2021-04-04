/**
 * User: pi
 * Date: 03/08/15  17:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'DCJawboneManager', function( Y, NAME ) {
        "use strict";

        function sendData( config ) {
            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                patientregId = config.patientregId,
                lastUpdate = config.lastUpdate,
                callback = config.callback,
                user = Y.doccirrus.auth.getSUForPUC(),
                startTime = moment( lastUpdate ).unix();
            if( !lastUpdate ) {
                startTime = moment().startOf( 'day' ).unix();
            }
            Y.log( 'Sending jawbone data from PUC. patientregId: ' + patientregId + ', last update: ' + lastUpdate, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            _id: patientregId
                        },
                        options: {
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, results[0] );
                    } );
                }, function( patientData, next ) {
                    user.identityId = patientData.identityId;
                    Y.doccirrus.api.patientportal.sendJawboneDataPRC( {
                        user: user,
                        data: {
                            customerIdPrac: patientData.customerIdPrac,
                            startTime: startTime
                        },
                        callback: next
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( 'Jawbone manager(sendData): Can not send jawbone data. Patientreg id: ' + patientregId + ', error: ' + JSON.stringify( err ), 'error', NAME );
                }
                callback();
            } );
        }

        function sendJawboneData( update ) {
            var user = Y.doccirrus.auth.getSUForPUC(),
                async = require( 'async' );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'deviceconfiguration',
                query: {
                    type: 'JAWBONE',
                    update: update
                }
            }, function( err, results ) {
                if( err ) {
                    Y.log( 'Jawbone manager(sendDailyJawboneData): Can not get device configuration. Error: ' + JSON.stringify( err ), 'error', NAME );
                    return;
                }
                async.eachSeries( results, function( deviceConfig, next ) {
                    sendData( {
                        patientregId: deviceConfig.patientregId,
                        lastUpdate: deviceConfig.lastUpdate,
                        callback: next
                    } );
                }, function( err ) {
                    if( err ) {
                        Y.log( 'Jawbone manager(sendDailyJawboneData): Can not send jawbone data. Error: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                } );
            } );
        }

        function sendDailyJawboneData() {
            Y.log( 'Sending daily jawbone data', 'debug', NAME );
            sendJawboneData( Y.doccirrus.schemas.deviceconfiguration.updateStatus.DAILY );
        }

        function sendWeeklyJawboneData() {
            Y.log( 'Sending weekly jawbone data', 'debug', NAME );
            sendJawboneData( Y.doccirrus.schemas.deviceconfiguration.updateStatus.WEEKLY );
        }

        Y.namespace( 'doccirrus' ).jawbonemanager = {
            /**
             * periodically check for expired tenants and deactivate them
             */
            sendDailyJawboneData: function() {
                sendDailyJawboneData();
            },
            sendWeeklyJawboneData: function() {
                sendWeeklyJawboneData();
            }
        };
        if( Y.doccirrus.auth.isPUC() ) {
            Y.doccirrus.kronnd.on( 'everySunday', Y.doccirrus.jawbonemanager.sendWeeklyJawboneData );
            Y.doccirrus.kronnd.on( 'CloseDay', Y.doccirrus.jawbonemanager.sendDailyJawboneData );

        }
    },
    '0.0.1', { requires: [ 'dckronnd', 'dcauth', 'deviceconfiguration-schema'] }
);


