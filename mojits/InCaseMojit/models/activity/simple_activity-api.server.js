/**
 * User: rrrw
 * Date: 02/06/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jshint esnext:true */
/*global YUI*/


YUI.add( 'simple_activity-api', function( Y, NAME ) {

        var
            util = require( 'util' ),
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            virtualActivity = new Y.doccirrus.ActivityUtils( 'simple_activity' );

        /**
         * Returns all simple_activities linked to a contract through the "activities" array by ids.
         * @param {object} args
         * @param {string} args.data.patientId
         * @param {function} args.callback
         * @return {Promise<*>|*}
         */
        function getActivitiesLinkedToContract( args ) {
            // install activity type filter, to only return results of this activity type
            args.activityQuery = {
                actType: { $in: Y.doccirrus.schemas.v_simple_activity.getSimpleActivityList().map( simpleActivity => simpleActivity.val ) }
            };
            return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
        }

        /**
         * Takes an activityId, and creates a initialzies a new Form for that activity.
         * Optionally, set the formId on the activity. If not provided, the function
         * will create a form of the default type registered for the respective activity type.
         * @param {object} args
         * @param {object} args.data
         * @param {string} args.data.activityId
         * @return {Promise<*>|*}
         */
        async function initializeFormForActivity( args ) {
            const
                {
                    data: { _id: dataId },
                    query: { _id: queryId },
                    user,
                    callback
                } = args,
                activityId = dataId || queryId,
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

            if( !activityId ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Query parameter `_id` is required.' } ), null, callback );
            }

            let [err, result] = await formatPromiseResult( initializeFormForActivityP( user, activityId, {}, null ) );

            if( err ) {
                Y.log( `Could not initialize form for activity: ${err.stack || err}`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, { message: `Error initializing form for activity: ${activityId}` } ), null, callback );
            }

            return handleResult( null, [result], callback );
        }

        Y.namespace( 'doccirrus.api' ).simple_activity = {
            get: function GET( args ) {
                Y.log( 'Entering Y.doccirrus.api.simple_activity.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.simple_activity.get' );
                }
                Y.log( 'Simple activity GET: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log( 'Entering Y.doccirrus.api.simple_activity.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.simple_activity.post' );
                }
                Y.log( 'Simple activity POST. ', 'debug', NAME );
                virtualActivity.filterActivity( args, 'post' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log( 'Entering Y.doccirrus.api.simple_activity.put', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.simple_activity.put' );
                }
                Y.log( 'Simple activity PUT: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log( 'Entering Y.doccirrus.api.simple_activity.upsert', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.simple_activity.upsert' );
                }
                Y.log( 'Simple activity UPSERT: ' + args.query, 'debug', NAME );
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log( 'Entering Y.doccirrus.api.simple_activity.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.simple_activity.delete' );
                }
                var
                    callback = args.callback;
                Y.log( 'Simple activity DELETE: ' + args.query, 'debug', NAME );

                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            },
            getActivitiesLinkedToContract,
            initializeFormForActivity
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'casefolder-schema', 'patient-schema'
        ]
    }
);
