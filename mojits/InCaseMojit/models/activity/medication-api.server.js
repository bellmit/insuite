/**
 * User: rrrw
 * Date: 29/01/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add('medication-api', function (Y, NAME) {
        

        var
            virtualActivity = new Y.doccirrus.ActivityUtils('medication');
        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).medication = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.medication.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.medication.get');
                }
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.medication.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.medication.post');
                }
                virtualActivity.filterActivity( args, 'post' );
                // update some auto-generated fields
                args.data.catalog = true;  // need a good solution for this
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.medication.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.medication.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.medication.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.medication.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.medication.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.medication.delete');
                }
                var
                    callback = args.callback;

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
                    actType: "MEDICATION"
                };
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'v_medication-schema'
        ]
    }
);
