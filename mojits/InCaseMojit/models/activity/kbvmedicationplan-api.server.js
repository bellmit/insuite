/**
 * User: rrrw
 * Date: 02/06/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jshint esnext:true */
/*global YUI*/


YUI.add( 'kbvmedicationplan-api', function( Y, NAME ) {
        const
            { formatPromiseResult, promisifyArgsCallback, handleResult } = require( 'dc-core' ).utils;

        Y.namespace( 'doccirrus.api' ).kbvmedicationplan = {
            get: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvmedicationplan.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvmedicationplan.get' );
                }
                const
                    {user, query = {}, options = {}, callback} = args;

                let
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'activity',
                            user,
                            query: {...query, actType: 'KBVMEDICATIONPLAN'},
                            options
                        } )
                    );
                if( err ) {
                    Y.log( `get. Error getting "KBVMEDICATIONPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            },
            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.kbvmedicationplan.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvmedicationplan.post');
                }

                return Y.doccirrus.api.activity.createKbvMedicationPlanForMedications(args);
            },
            put: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvmedicationplan.put', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvmedicationplan.put' );
                }
                const
                    {user, query = {}, fields, data, callback} = args;
                let
                    putData = Y.doccirrus.filters.cleanDbObject( data );
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'activity',
                        data: putData,
                        user,
                        query,
                        fields
                    } )
                );
                if( err ) {
                    Y.log( `put. Error updating "KBVMEDICATIONPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            },
            'delete': async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvmedicationplan.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvmedicationplan.delete' );
                }

                const {user, query, callback} = args;

                if( !query ) {
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid or missing query'} ), null, callback );
                }

                let
                    [err, result] = await formatPromiseResult(
                        promisifyArgsCallback( Y.doccirrus.api.activity.delete )( {
                            user,
                            query
                        } ) );

                if( err ) {
                    Y.log( `delete. Error deleting "KBVMEDICATIONPLAN" activity: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                return handleResult( null, result, callback );
            },
            getActivitiesLinkedToContract: function( args ) {
                // install activity type filter, to only return results of this activity type
                args.activityQuery = {
                    actType: "KBVMEDICATIONPLAN"
                };
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader'
        ]
    }
);
