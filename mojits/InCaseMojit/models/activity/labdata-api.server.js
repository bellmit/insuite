/**
 * User: bhagyashributada
 * Date: 9/21/18  3:41 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jshint esnext:true */
/*global YUI*/


YUI.add( 'labdata-api', function( Y, NAME ) {

        var
            virtualActivity = new Y.doccirrus.ActivityUtils('labdata');

            /**
             *  Get most recent LABDATA as recorded on patient API (will include LABDATA and inPedia data)
             *
             *  @param  {Object}    args
             *  @param  {Object]    args.user
             *  @param  {Object}    args.originalParams
             *  @param  {String}    args.originalParams.patientId       _id of a patient
             *  @param  {Function}  args.callback                       Of the form fn( err, labDataArray )
             */

            function getLatestLabDataForPatient( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.getLatestLabDataForPatient', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                            .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.getLatestLabDataForPatient');
                }
                let
                        params = args.originalParams || {};

                if( !params.patientId ) {
                    return args.callback( new Error( 'insufficient arguments' ) );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'patient',
                    'query': { '_id': params.patientId },
                    'callback': onPatientLoaded
                } );

                function onPatientLoaded( err, result ) {
                    if ( err ) {
                        Y.log( 'Problem loading patient ' + params.patientId + ' from database: ' + JSON.stringify( err ), 'warn', NAME );
                        return args.callback( err );
                    }

                    if ( !result || !result[0] || !result[0].latestLabData ) {
                        //  nothing found
                        return args.callback( null, [] );
                    }

                    return args.callback( null, result[0].latestLabData );
                }
            }

        Y.namespace( 'doccirrus.api' ).labdata = {
            getLatestLabDataForPatient: getLatestLabDataForPatient,
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.get');
                }
                Y.log( 'Labdata GET: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.post');
                }
                Y.log( 'Labdata POST. ', 'debug', NAME );
                virtualActivity.filterActivity( args, 'post' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.put');
                }
                Y.log( 'Labdata PUT: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.upsert');
                }
                Y.log( 'Labdata UPSERT: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.labdata.undefined', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labdata.undefined');
                }
                var
                    callback = args.callback;
                Y.log( 'Labdata DELETE: ' + args.query, 'debug', NAME );

                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            },
            getActivitiesLinkedToContract: function( args ) {
                // install activity type filter, to only return results of this activity type
                args.activityQuery = {
                    actType: "LABDATA"
                };
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'v_labdata-schema',
            'activity-api'
        ]
    }
);
