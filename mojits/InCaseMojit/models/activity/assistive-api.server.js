/**
 * User: rrrw
 * Date: 29/01/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add('assistive-api', function ( Y, NAME ) {
        

        var
            virtualActivity = new Y.doccirrus.ActivityUtils('assistive');
        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).assistive = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.assistive.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.assistive.get');
                }
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.assistive.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.assistive.post');
                }
                virtualActivity.filterActivity( args, 'post' );
                // update some auto-generated fields
                args.data.catalog = true;  // need a good solution for this
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.assistive.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.assistive.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.assistive.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME).wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.assistive.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.assistive.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.assistive.delete');
                }
                var
                    callback = args.callback;
                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'v_assistive-schema'
        ]
    }
);
