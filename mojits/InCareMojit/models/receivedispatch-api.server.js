/**
 * User: md
 * Date: 24/02/2019  13:30
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict'; //eslint-disable-line

YUI.add( 'receivedispatch-api', function( Y, NAME ) {

        const
            {formatPromiseResult} = require('dc-core').utils;

        /**
         * @method get
         * @public
         *
         * made normal receivedispatch get, and for some collection extend response with patient name
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.options
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function get( args ){
            Y.log('Entering Y.doccirrus.api.receivedispatch.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.receivedispatch.get');
            }
            const {user, options, query, callback} = args;

            let [ err, receivedispatches ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'receivedispatch',
                    action: 'get',
                    query,
                    options
                } )
            );
            if( err ){
                Y.log( `get: Error on getting receivedispatches ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            receivedispatches.result = (receivedispatches.result || []).map( el => {
               let patientId;
               switch( el.entityName ){
                   case 'activity':
                   case 'casefolder':
                       patientId = el.doc && el.doc.patientId;
                       break;
                   case 'patient':
                       patientId = el.doc && el.doc._id;
                       break;
               }
               if( patientId ){
                   el.patientId = patientId;
               }
               return el;
            });

            let patientIds = (receivedispatches.result || []).map( el => el.patientId).filter( el => el );
            if( patientIds.length ){
                let patients;
                [ err, patients ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {_id: {$in: patientIds}}
                    } )
                );
                if( err ){
                    Y.log( `get: Error on getting patients ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( patients.length ){
                    receivedispatches.result = (receivedispatches.result || []).map( el => {
                        if(el.patientId){
                            let patient = patients.find( patient => patient._id.toString() === el.patientId );
                            if( patient ){
                                el.patientName = `${patient.lastname}, ${patient.firstname}`;
                            }
                        }
                        return el;
                    } );
                }
            }

            callback( null, receivedispatches );
        }

        /**
         * @method doAction
         * @public
         *
         * depending of ation either repeat operation with newer data without lastChanged comparison or sync local object back to sender
         *@param {Object}  args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.action   - applyChanges|discardChanges|retryOperation
         *                                  applyChanges and retryOperation - write down object from sender,
         *                                  retryOperation - push local object back to sender via activeActive queues
         * @param {String} args.data.id       - id of receivedispatch document to process
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function doAction( args ){
            Y.log('Entering Y.doccirrus.api.receivedispatch.doAction', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.receivedispatch.doAction');
            }
            const {user, data: {action, id}, callback} = args;
            if( !action || !id || !['applyChanges', 'discardChanges', 'retryOperation'].includes(action) ) {
                Y.log( `doAction: insufficient/wrong params action:${action}, id:${id}`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 409, 'insufficient params' ) );
            }

            let [ err, receivedispatches ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'receivedispatch',
                    action: 'get',
                    query: {_id: id}
                } )
            );
            if( err ){
                Y.log( `doAction: Error on getting receivedispatches ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !receivedispatches.length ){
                Y.log( `doAction: recivedispatch ${id} not found`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 409, 'data inconsistency' )  );
            }
            let dispatch = receivedispatches[0];
            if( ['applyChanges', 'retryOperation'].includes( action ) ){
                [err] = await formatPromiseResult(
                    Y.doccirrus.api.dispatch.processDispatch( user, dispatch )
                );
                if( err ){
                    Y.log( `doAction: error on applying changes ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            if( 'discardChanges' === action ){
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                    addedFrom: `${dispatch.entityName}_${dispatch.entryId}`,
                    entityName: dispatch.entityName,
                    entryId: dispatch.entryId,
                    lastChanged: dispatch.doc && dispatch.doc.lastChanged || new Date(),
                    onDelete: dispatch.onDelete
                }, async ( err ) => {
                    if( err ){
                        Y.log( `doAction: error on discarding changes ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'receivedispatch',
                            action: 'update',
                            query: {
                                dcCustomerNo: dispatch.dcCustomerNo,
                                entryId: dispatch.entryId,
                                entityName: dispatch.entityName,
                                status: {$in: [2, 3]}
                            },
                            data: {$set: {status: 1}},
                            options: {multi: true}
                        } )
                    );
                    if( err ){
                        Y.log( `doAction: Error on updating previous clashes ${dispatch.entityName}.${dispatch.entryId} ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                } );
            }

            callback( null );
        }

        Y.namespace( 'doccirrus.api' ).receivedispatch = {

            name: NAME,
            get,
            doAction
        };

    },
    '0.0.1', {
        requires: []
    }
)
;
