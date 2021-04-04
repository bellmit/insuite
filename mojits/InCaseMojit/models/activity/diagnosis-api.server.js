/**
 * User: rrrw
 * Date: 19/11/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add('diagnosis-api', function (Y, NAME) {
        

        const
            virtualActivity = new Y.doccirrus.ActivityUtils( 'diagnosis' ),
            ID_TO_FIX = '000000000000000000000091';


        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).diagnosis = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.diagnosis.get');
                }
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.diagnosis.post');
                }
                virtualActivity.filterActivity( args, 'post' );
                // transparently replace the diagnosis cert enum value to maintain backward compatibility
                if( '' === args.data.diagnosisCert ) {
                    args.data.diagnosisCert = 'NONE';
                }
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.diagnosis.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.diagnosis.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.diagnosis.delete');
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
                    actType: "DIAGNOSIS"
                };
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            },
            runOnStart: function runOnStart( user, callback ) {
                Y.log('Entering Y.doccirrus.api.diagnosis.runOnStart', 'info', NAME);
                if (callback) {
                    callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.diagnosis.runOnStart');
                }
                if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                    return callback();
                }

                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    action: 'post',
                    model: 'catalogreference',
                    user,
                    data: {
                        "_id" : ID_TO_FIX,
                        "code" : "T2",
                        "codes" : [
                            "Z25"
                        ]
                    },
                    callback
                } );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader'
        ]
    }
);
