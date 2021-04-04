/**
 * User: strix
 * Date: 11/02/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */



/**
 * NB: the states and transitions are defined in activity-schema, this is an interchangeable unit of business
 * logic which is used to validate state changes.  Member names correspond to transitions, and all have a
 * common form called on the server by a REST action on CaseFileMojit.
 *
 * When calling back an error, the error message should refer to the CaseFileMojit il8n dictionary, so
 * that the client can inform the user about what needs to be done to before the transition will complete.
 *
 * Multiple error messages / informational strings can be comma separated (you need to do x,y,z first).
 *
 * @module activity-fsm
 */
YUI.add( 'dc-fsm-invoice', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-invoice
         * @requires activity-schema
         */

        const
            async = require( 'async' ),
            util = require( 'util' ),

            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

        function handleSumexResponse( {user, err, result, activityId, errorCode, successMessage, type} ) {
            let errorsToTransmit;
            if( err ) {
                Y.log( `Error occured during Sumex validating of the invoice ${activityId}.\nError: ${err.stack || err}`, 'error', NAME );
                errorsToTransmit = {err, type};
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {
                        data: Y.doccirrus.errorTable.getMessage( err )
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );
            }

            if( result && Array.isArray( result.errors ) && result.errors.length ) {
                Y.log( `Sumex validating of the invoice ${activityId} failed`, 'error', NAME );
                errorsToTransmit = {errors: result.errors, type};
                result.errors.forEach( e => {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: e.text
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                } );
            }

            if( errorsToTransmit ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'sumexError',
                    msg: {data: errorsToTransmit}
                } );
                return err || Y.doccirrus.errors.rest( errorCode );
            }
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'message',
                msg: {
                    data: successMessage
                },
                meta: {
                    level: 'SUCCESS'
                }
            } );
            return null;
        }

        async function isInvoiceImported({user, activity}) {
            let [err, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'activity',
                query: {
                    _id: activity._id
                }
            }));
            if(err) {
                throw err;
            }
            if(!Array.isArray(result) || !result.length) {
                throw Y.doccirrus.errors.rest( 404, 'Could not find invoice in database' );
            }
            return result[0].locImportId;
        }

        /**
         * State machines for invoices (does not include schein)
         *
         * @class dc-fsm-invoice
         * @namespace doccirrus.fsm
         * @static
         */
        Y.namespace( 'doccirrus.fsm' )[NAME] = {

            /**
             * @property transitions
             * @type {Object}
             */
            transitions: transitions,
            /**
             * @property name
             * @type {String}
             * @protected
             */
            name: NAME,

            /**
             *  The primary state change. Only here will you see a POST
             *  i.e. doc without an _id. In other transitions, the record will always
             *  be handled by PUT.
             *
             *  @method validate
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            validate: async function( user, options, activity, isTest, callback ) {
                const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                let err, insuranceName, result, currentStatus, callRevokeWarnValidatedCallback;

                //  special pre-process for validating invoices, to set name of private insurance, EXTMOJ-2235
                [ err, insuranceName ] = await formatPromiseResult( Y.doccirrus.api.casefolder.getInsuranceName( user, activity.caseFolderId ) );
                if ( err ) { return callback( err ); }
                activity.insuranceName = insuranceName;

                // KAT-293 put schein on hold
                if( isSwiss && ['INVOICE', 'INVOICEREF'].includes( activity.actType ) ) {
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        options: {
                            fields: {
                                status: 1
                            }
                        }
                    } ) );
                    if( err || !Array.isArray( result ) || !result[0] || !result[0].status ) {
                        if( err ) {
                            Y.log( `validate: Failed to get invoice from database: ${err.stack || err}`, 'error', NAME );
                        }
                        currentStatus = 'CREATED';
                    } else {
                        currentStatus = result[0].status;
                    }

                    // if revokeWarn checkbox is checked - instead of validate do revokeWarn
                    if( activity.onHold ) {
                        return Y.doccirrus.fsm[fsmName].onHold( user, options, activity, isTest, callback );
                    }
                    // if revokeWarn checkbox is unchecked instead of validate restore the status which was before revokeWarn
                    if( !activity.onHold && currentStatus === 'REVOKEWARN' && activity.statusBeforeHold ) {
                        callRevokeWarnValidatedCallback = true;
                    }
                }

                if( isSwiss && activity.actType === 'INVOICE' ) {
                    let schein;
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'get',
                        query: {
                            _id: activity.locationId
                        }
                    } ) );
                    if( err ) {
                        return callback( err );
                    }
                    const location = result[0];
                    [err, schein] = await formatPromiseResult( Y.doccirrus.api.invoice.invoiceToInvoiceEntry( {
                        user, invoice: activity
                    } ) );
                    if( err ) {
                        return callback( err );
                    }

                    [err, result] = await formatPromiseResult( Y.doccirrus.api.sumex.generalInvoiceRequest( {
                        user,
                        invoicelogId: activity._id,
                        location,
                        schein,
                        requestType: 'validate'
                    } ) );

                    const successMessage = Y.doccirrus.i18n( 'InvoiceMojit.sumex-api.VALIDATION_SUCCESS' );
                    err = handleSumexResponse( {
                        err,
                        result,
                        user,
                        activityId: activity._id,
                        errorCode: 'sumex_10',
                        successMessage,
                        type: 'validation'
                    } );
                    if( err ) {
                        return callback( err );
                    }

                    activity.scheinNotes = schein.data && schein.data.scheinNotes;
                }

                async function _revokeWarnValidatedCallback( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'update',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            onHold: activity.onHold,
                            ...(activity.statusBeforeHold === 'VALID' ? {} : {$set: {status: activity.statusBeforeHold}}),
                            $unset: {
                                onHoldNotes: 1,
                                statusBeforeHold: 1
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `_revokeWarnValidatedCallback: Failed to restore invoice status before invoice was put on hold.\nError: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    return callback( null, activity.statusBeforeHold );
                }

                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callRevokeWarnValidatedCallback ? _revokeWarnValidatedCallback : callback );
            },

            /**
             *  @method approve
             *
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  @param  {Function}  options.onPdfGenerated Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}  options.onPdfProgress  Called repeatedly as PDF is generated (optional)
             */
            approve: function( user, options, activity, isTest, callback ) {

                var
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    //  printOnApprove = options.print || false,
                    currState = activity.status,
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                // test does not update form or assign invoice number
                if ( isTest ) {
                    Y.doccirrus.fsm[fsmName].approve( user, options, activity, true, callback );
                    return;
                }

                async.series(
                    [
                        approveLinkedActivities,
                        assignAndSaveInvoiceNumber,
                        generateSumexDocuments,
                        approveCurrentActivity
                    ],
                    onAllDone
                );

                // 1. approve all linked activities and rollback if one isn't
                // (done by default FSM)
                function approveLinkedActivities( itcb ) {
                    Y.doccirrus.fsm[fsmName].approve( user, options, activity, true, onTestApproval );

                    function onTestApproval( err, state ) {
                        if( err ) {
                            itcb( err );
                            return;
                        }
                        currState = state;
                        itcb( null );
                    }
                }

                // 2. assign an invoice number to this activity and save it back to invoice
                function assignAndSaveInvoiceNumber( itcb ) {
                    Y.doccirrus.invoiceserverutils.assignAndSaveInvoiceNumber( user, activity, currState, itcb );
                }

                // 3. generate sumex documents after invoiceNo is assigned
                function generateSumexDocuments( itcb ) {
                    if( !isSwiss || activity.actType !== 'INVOICE' ) {
                        return itcb( null );
                    }

                    function getPdfFromInvoiceCallback( err, result ) {
                        const successMessage = Y.doccirrus.i18n( 'InvoiceMojit.sumex-api.GENERATION_SUCCESS' );
                        err = handleSumexResponse( {
                            err,
                            result,
                            user,
                            activityId: activity._id,
                            errorCode: 'sumex_07',
                            successMessage,
                            type: 'generation'
                        } );
                        if( err ) {
                            return itcb( err );
                        }
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'sumexPDFCreated',
                            msg: {data: result}
                        } );
                        return itcb( null );
                    }

                    Y.doccirrus.api.invoice.generateSumexDocuments( {
                        user,
                        invoice: activity,
                        callback: getPdfFromInvoiceCallback
                    } );
                }

                // 4. do the actual approve transition
                // (done by default FSM)
                function approveCurrentActivity( itcb ) {
                    Y.doccirrus.fsm[fsmName].approve( user, options, activity, false, onDefaultApprove );

                    function onDefaultApprove( err, newState ) {
                        if( err ) {
                            Y.log( 'Could not approve invoice: ' + JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }

                        currState = newState;
                        itcb( null );
                    }
                }

                //  Finally
                function onAllDone( err ) {

                    function onRevertInvoiceNumber( additionalErr ) {
                        callback( additionalErr || err );
                    }

                    if ( err ) {
                        Y.log( 'Error during approve transition: ' + JSON.stringify( err ), 'warn', NAME );
                        Y.log( 'Reverting invoice number: ' + activity.invoiceNo, 'warn', NAME );
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'activity',
                            query: { _id: activity._id + '' },
                            data: { $set: { 'invoiceNo': '' } },
                            options: { multi: false }
                        }, onRevertInvoiceNumber );
                        return;
                    }

                    callback( null, currState );
                }

            },

            /**
             *  Special transition for quickPrint functionality
             *
             *  DEPRECATED, to be replaced by an option
             *
             *  @method approveandprint
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */

            'approveandprint': function( user, options, activity, isTest, callback ) {
                var self = this;
                //  a little hacky, but simple
                options.printOnApprove = true;
                self.approve(  user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            delete: async function( user, options, activity, isTest, callback ) {
                const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                let err, newStatus;
                [ err, newStatus ] = await formatPromiseResult(
                    new Promise( (resolve, reject) => {
                        Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, (err, result) => {
                            if(err){
                                return reject(err);
                            }
                            resolve(result);
                        });
                    })
                );
                if ( err ) {
                    Y.log( `invoice-fsm.delete: Error in executing default FSM for delete: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                if(!activity.invoiceLogId) {
                    //invoice was not generated from log
                    return callback( null, newStatus );
                }


                [ err ] = await formatPromiseResult(
                    Y.doccirrus.api.cashlog.cancelSingleInvoice(  user, activity )
                );

                if ( err ) {
                    Y.log( `Problem removing invoiceLogId from linked treatments: ${err.stack||err}`, 'error', NAME );
                }

                //clean up invoiceId and invoiceLogId
                let
                    linkedActivityIds = Y.doccirrus.api.linkedactivities.getAllReferences( activity );
                for ( let i = 0; i < linkedActivityIds.length; i++ ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'update',
                            query: {_id: linkedActivityIds[i]},
                            data: {$unset: {invoiceId: 1, invoiceLogId: 1, invoiceLogType: 1}}
                        } )
                    );
                    if( err ) {
                        Y.log( `invoice-fsm.delete: Error unsetting invoiceId and invoiceLogId in linked activities: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

                //mark schein as excluded in log

                //collect linked scheins to invoice
                let
                    linkedScheins;

                [ err, linkedScheins ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: { '$in': linkedActivityIds },
                            actType: { $in: [ 'SCHEIN', 'BGSCHEIN', 'PKVSCHEIN' ] }
                        },
                        options: { select: {_id: 1, actType: 1} }
                    } )
                );
                if ( err ) {
                    Y.log( `invoice-fsm.delete: Error getting linked activities to invoice: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                let scheinIds = linkedScheins.map( el => el._id.toString() );

                if(!scheinIds.length){
                    //there are no new scheins to exclude
                    return callback( null, newStatus );
                }

                //get log entry
                let cashlogs;
                [ err, cashlogs ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'cashlog',
                        action: 'get',
                        query: {
                            _id: activity.invoiceLogId
                        },
                        options: { select: {_id: 1, excludedScheinIds: 1} }
                    } )
                );
                if ( err ) {
                    Y.log( `invoice-fsm.delete: Error getting linked activities to invoice: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                if(!cashlogs || !cashlogs.length){
                    Y.log( `invoice-fsm.delete: cashlog ${activity.invoiceLogId} not found`, 'warn', NAME );
                    return callback( null, newStatus );
                }

                //get schein invoiceenntries
                let invoiceentries;
                [ err, invoiceentries ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'invoiceentry',
                        action: 'get',
                        query: {
                            invoiceLogId: cashlogs[0]._id,
                            type: 'schein'
                        }
                    } )
                );
                if ( err ) {
                    Y.log( `invoice-fsm.delete: Error getting schein invoiceenntries: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                //update cashlog with new excluded items
                let newExcluded = [ ...new Set([...(cashlogs[0].excludedScheinIds || []), ...scheinIds]) ],
                    localStat = {
                        excludedPatientIds: cashlogs[0].excludedPatientIds || [],
                        excludedScheinIds: newExcluded,
                        stats: {
                            quarters: [],
                            nQuarters: 0,
                            nScheine: 0,
                            xnScheine: 0,
                            nTreatments: 0,
                            xnTreatments: 0,
                            nDiagnoses: 0,
                            xnDiagnoses: 0,
                            nScheineNotApproved: 0,
                            xnScheineNotApproved: 0,
                            nTreatmentsNotApproved: 0,
                            xnTreatmentsNotApproved: 0,
                            nDiagnosesNotApproved: 0,
                            xnDiagnosesNotApproved: 0
                        }
                    };
                Y.doccirrus.invoiceprocess.countActivities.call( localStat, (invoiceentries || []).map( el => el.data ) );

                let newTotalItems = `${localStat.stats.nScheine}/${localStat.stats.nTreatments}/${localStat.stats.nDiagnoses}|(${localStat.stats.xnScheine}/${localStat.stats.xnTreatments}/${localStat.stats.xnDiagnoses})`;

                [err, cashlogs ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'cashlog',
                        action: 'update',
                        query: {
                            _id: cashlogs[0]._id
                        },
                        fields: [ 'excludedScheinIds' ],
                        data: { $set: {
                            excludedScheinIds: newExcluded,
                            totalItems: newTotalItems
                        } }
                    } )
                );
                if ( err ) {
                    Y.log( `invoice-fsm.delete: Error updating cashlog: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                callback(null, newStatus);
            },

            /**
             *  @method cancel
             *
             *      1. cancel the invoice
             *      2. change all linked activities back to VALID
             *
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                const
                    dcCore = require( 'dc-core' ),
                    formatPromiseResult = dcCore.utils.formatPromiseResult,
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                //  Transition invoice to cancelled
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, onCancelDefault );

                async function onCancelDefault( err, newStatus ) {

                    if ( err ) {
                        Y.log( `Could transition invoice to CANCELLED: ${err.stack||err}`, 'error', NAME );
                        return callback( err, newStatus );
                    }

                    if ( 'CANCELLED' !== newStatus ) {
                        //  should not happen, check anyway
                        Y.log( `Invoice not cancelled, not freeing linked activities: ${newStatus}`, 'warn', NAME );
                        return callback( err, newStatus );
                    }


                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.api.cashlog.cancelSingleInvoice(  user, activity )
                    );

                    if ( err ) {
                        Y.log( `Problem removing invoiceLogId from linked treatments: ${err.stack||err}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }

                    //  unlink treatments from invoice
                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.api.linkedactivities.setStatusOfLinkedActivities(  user, activity, 'VALID', ['TREATMENT', 'DIAGNOSIS'] )
                    );

                    if ( err ) {
                        Y.log( `Could not update status of linked treatments to VALID: ${err.stack||err}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }

                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.api.linkedactivities.setStatusOfLinkedActivities(  user, activity, 'DISPENSED', ['MEDICATION'] )
                    );

                    if ( err ) {
                        Y.log( `Could not update status of linked medications to DISPENSED: ${err.stack||err}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }

                    [err] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'activity',
                        action: 'update',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            $set: {activities: []}
                        }
                    }));

                    if ( err ) {
                        Y.log( `Could not erase linked activities from canceled ${activity.actType.toLowerCase()} ${activity._id}: ${err.stack||err}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }
                    callback( null, newStatus );
                }
            },

            /**
             *  @method archive
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            archive: function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].archive( user, options, activity, isTest, callback );
            },

            /**
             *  @method reject
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             *
             *  @return {Function}    callback
             */
            reject: function( user, options, activity, isTest, callback ) {

                //  TODO: update linked treatments to this state on success
                //  logic as for cancellation
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'reject' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to reject activity', 'debug', NAME );
                    return callback( accessError );
                }

                let toState = 'BILLINGREJECTED', fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: toState,
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  Special transition for set MEDIDATAREJECTED by user
             *
             *  DEPRECATED, to be replaced by an option
             *
             *  @method decline
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */

            decline: function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success
                //  logic as for cancellation
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'decline' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to decline activity', 'debug', NAME );
                    return callback( accessError );
                }
                const
                    communicationId = options && options.communicationId,
                    getLastSchein = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein );

                let toState = 'MEDIDATAREJECTED', fsmName, result;

                async function onMedidataReject( err, newStatus ) {
                    const putData = {
                        medidataRejected: true
                    };

                    if( err ) {
                        Y.log( `onMedidataReject(): Could transition invoice to CANCELLED: ${err.stack || err}`, 'error', NAME );
                        return callback( err, newStatus );
                    }

                    if( 'MEDIDATAREJECTED' !== newStatus ) {
                        //  should not happen, check anyway
                        Y.log( `onMedidataReject(): Invoice not rejected by medidata, not freeing linked activities: ${newStatus}`, 'warn', NAME );
                        return callback( err, newStatus );
                    }

                    if( activity.invoiceLogId ) {
                        putData.invoiceLogId = undefined;
                        putData.invoiceLogType = undefined;
                    }

                    if( communicationId && Array.isArray( activity.activities ) && !activity.activities.includes( communicationId ) ) {
                        // if invoiceRef does not have communication entry linked - link it
                        activity.activities.push( communicationId );
                        putData.activities = activity.activities;
                    }

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            migrate: true,
                            model: 'activity',
                            query: {_id: activity._id},
                            data: Y.doccirrus.filters.cleanDbObject( putData ),
                            fields: Object.keys( putData )
                        } )
                    );

                    if( err ) {
                        Y.log( `onMedidataReject(): Failed to set medidataRejected: true for invoiceRef ${activity._id.toString()}.\nError:${err.stack || err}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }

                    // set schein and linked activities status to VALID / DISPENSED
                    let
                        linkedActivityIds = Y.doccirrus.api.linkedactivities.getAllReferences( activity ),
                        linkedActivities,
                        schein;

                    [err, result] = await formatPromiseResult( getLastSchein( {
                        user,
                        query: {
                            patientId: activity.patientId,
                            locationId: activity.locationId,
                            timestamp: activity.timestamp,
                            caseFolderId: activity.caseFolderId
                        }
                    } ) );

                    if( err ) {
                        Y.log( `onMedidataReject(): Failed to get schein for invoiceRef ${activity._id.toString()}.\nError:${err.stack || err}`, 'error', NAME );
                    }
                    schein = result[0];
                    if( schein ) {
                        [err] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                            user,
                            model: 'activity',
                            action: 'update',
                            query: {
                                _id: schein._id
                            },
                            data: {$set: {status: "VALID"}}
                        }));

                        if( err ) {
                            Y.log( `onMedidataReject(): Could not validate schein: ${err.stack || err}`, 'error', NAME );
                        }
                    }


                    [err, linkedActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        migrate: true,
                        action: 'get',
                        query: {
                            _id: {$in: linkedActivityIds},
                            referencedBy: {$elemMatch: {$eq: activity._id.toString()}}
                        },
                        options: {
                            fields: {
                                actType: 1,
                                status: 1
                            }
                        }
                    } ) );

                    if( err || !Array.isArray( linkedActivities ) || !linkedActivities.length ) {
                        Y.log( `onMedidataReject(): Could not load linked activities to change state: ${err ? err.stack || err : '404 linkedActivities not found!'}`, 'error', NAME );
                        return callback( null, newStatus );
                    }

                    const medicationIds = [], nonMedicationIds = [];
                    linkedActivities.forEach( la => {
                        if( la.actType === 'MEDICATION' ) {
                            medicationIds.push( la._id );
                        } else if( la.actType !== 'COMMUNICATION' ) {
                            nonMedicationIds.push( la._id );
                        }
                    } );

                    try {
                        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            migrate: true,
                            action: 'update',
                            query: {_id: {$in: nonMedicationIds}},
                            data: {$set: {status: "VALID"}},
                            options: {
                                multi: true
                            }
                        } ) );
                        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            migrate: true,
                            action: 'update',
                            query: {_id: {$in: medicationIds}},
                            data: {$set: {status: "DISPENSED"}},
                            options: {
                                multi: true
                            }
                        } ) );
                    } catch ( ex ) {
                        Y.log( `onMedidataReject(): Could not update status of linked activities to VALID: ${ex.stack|| ex}`, 'error', NAME );
                        //  continue despite problems with linked activities, best effort
                    }
                    callback( null, newStatus );
                }

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: toState,
                    fast: (options.fast && true)
                }, onMedidataReject );
            },

            /**
             *  @method bill
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            bill: async function( user, options, activity, isTest, callback ) {
                const
                    getCompleteScheins = promisifyArgsCallback( Y.doccirrus.api.activity.getCompleteScheins ),
                    defaultFSMName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                let err, result;

                //  TODO: update linked treatments to this state on success
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'bill' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to bill activity', 'debug', NAME );
                    return callback( accessError );
                }

                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.fsm[defaultFSMName]._changeState( {
                        user,
                        activity,
                        isTest,
                        toState: 'BILLED',
                        fast: (options.fast && true)
                    }, ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `bill(): Problem while billing invoice: ${err.stack || err}`, 'warn', NAME );
                    callback( err, 'APPROVED' );
                    return;
                }

                for( let treatmentId of activity.activities ) {

                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'activity',
                        query: {
                            _id: treatmentId
                        },
                        options: {
                            lean: true
                        }
                    } ) );

                    if( err ) {
                        Y.log( `bill(): Problem while billing treatments: ${err.stack || err}`, 'warn', NAME );
                        callback( err, 'APPROVED' );
                        return;
                    }

                    let treatment = result && result[0];

                    if( !treatment ) {
                        Y.log( `bill(): Can not bill activity with id: ${treatmentId}. Not found.`, 'warn', NAME );
                        continue;
                    }
                    if( 'PKVSCHEIN' === treatment.actType ) { // deprecated since MOJ-9790
                        continue;
                    }
                    if( 'BILLED' === treatment.status ) {
                        Y.log( `bill(): Activity with id: ${treatmentId} already has status BILLED not need to change.`, 'warn', NAME );
                        continue;
                    }
                    if(treatment.actType === 'MEDICATION' ) {
                        continue;
                    }

                    [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                        Y.doccirrus.fsm[defaultFSMName]._changeState( {
                            user,
                            activity: treatment,
                            isTest,
                            toState: 'BILLED',
                            fast: (options.fast && true)
                        }, ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        } );
                    } ) );

                    if( err ) {
                        Y.log( `bill(): Problem while billing treatments: ${err.stack || err}`, 'warn', NAME );
                        callback( err, 'APPROVED' );
                        return;
                    }
                    Y.log( 'bill(): Treatment has been billed, id: ' + treatmentId );
                }

                //do not bill swiss scheins after medidata sending
                if( !isTest ) {
                    Y.log( `bill(): try to bill complete scheins`, 'debug', NAME );
                    let scheins;
                    [err, scheins] = await formatPromiseResult( getCompleteScheins( {
                        user,
                        query: {
                            patientId: activity.patientId,
                            caseFolderId: activity.caseFolderId,
                            timestamp: {$lt: activity.timestamp},
                            locationId: activity.locationId
                        }
                    } ) );

                    if( err ) {
                        Y.log( `bill(): could not get complete scheins after billing invoice: ${err.stack || err}`, 'warn', NAME );
                        callback( null, 'BILLED' );
                        return;
                    }
                    Y.log( `found ${scheins.length} complete scheins. try to bill them`, 'debug', NAME );
                    for( let schein of scheins ) {
                        [err, result] = await formatPromiseResult( Y.doccirrus.api.activity.billByIds( user, [schein._id.toString()] ) );
                        if( err ) {
                            Y.log( `bill(): could not bill schein ${schein._id}: ${err.stack || err}`, 'warn', NAME );
                        } else {
                            Y.log( `bill(): billed complete schein ${schein._id}: ${result}`, 'debug', NAME );
                        }
                    }
                }
                const inkassoPdf = activity.attachedMedia.find(
                    media => media.caption.endsWith( '-inkasso' ) || media.caption.endsWith( '-inkasso.pdf' )
                );

                if( inkassoPdf ) {
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        query: {
                            mediaId: inkassoPdf.mediaId,
                            activityId: activity._id
                        }
                    } ) );

                    if( err || !Array.isArray( result ) || !result.length ) {
                        err = err || new Y.doccirrus.commonerrors.DCError( 400, {message: 'document not found'} );
                        Y.log( `bill(): Failed to get document by mediaId ${inkassoPdf.mediaId}. Error:\n${err.stack || err}`, 'warn', NAME );
                        return callback( null, 'BILLED' );
                    }
                    const document = result[0],
                        inkassoPdfIndex = activity.attachments.indexOf( document._id.toString() );

                    if( inkassoPdfIndex === -1 ) {
                        Y.log( `bill(): inkasso document is not in activity attachments array`, 'warn', NAME );
                        return callback( null, 'BILLED' );
                    }

                    activity.attachments.splice( inkassoPdfIndex, 1 );
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'put',
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        data: Y.doccirrus.filters.cleanDbObject( {
                            attachments: activity.attachments
                        } ),
                        fields: ['attachments']
                    } ) );
                    if( err ) {
                        Y.log( `bill(): Failed to remove inkasso pdf from attachments for activity ${activity._id.toString()}. Error:\n${err.stack || err}`, 'warn', NAME );
                    }
                }
                Y.log( 'All treatments billed, returning new state to client', 'debug', NAME );
                callback( null, 'BILLED' );
            },

            /**
             *  Partial payment of invoices is caused by linking of receipts from the BILLED state
             *
             *  @method  partialpay
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             *
             *  @return {Function}    callback
             */
            partialpay: function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'pay' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to pay activity', 'debug', NAME );
                    return callback( accessError );
                }
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'PARTIALPAYMENT',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method  pay
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            pay: async function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success

                let newActivityProps, newActivityId, err;

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'pay' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to pay activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  check if there is a surplus on this invoice (ie, overpaid), and create a creditnote to hold the
                //  remaining balance

                if ( !isTest && activity.totalReceiptsOutstanding < 0 ) {
                    //  unlink the credit note from this invoice, free the surplus payment to be applied to another
                    //  invoice in future.
                    newActivityProps = {
                        invoiceId: '',
                        amount: parseFloat( activity.totalReceiptsOutstanding ).toFixed(2)
                    };

                    [ err, newActivityId] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'CREDITNOTE', newActivityProps, activity )
                    );

                    if ( err ) {
                        Y.log( `Could not create CREDITNOTE to carry balance of overpaid invoice: ${err.stack||err}`, 'warn', NAME );
                        //  not good, but not critical, continue with best effort
                    }

                    Y.log( `Created new CREDITNOTE activity to carry balance of invoice ${activity._id}: ${newActivityId}`, 'info', NAME );
                }

                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState);
                let result;
                [err] = await formatPromiseResult(
                    changeStateP( {
                        user,
                        activity,
                        isTest,
                        toState: 'PAID',
                        fast: (options.fast && true)
                    } ) );

                if( err ) {
                    Y.log( `Problem while pay invoice: ${err.stack || err}`, 'warn', NAME );
                    return callback( err, 'PAID' );
                }

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        _id: {$in: activity.activities},
                        actType: 'MEDICATION',
                        status: {$ne: 'BILLED'}
                    },
                    options: {
                        lean: true
                    }
                } ) );

                if( err ) {
                    Y.log( `Problem while pay medications: ${err.stack || err}`, 'warn', NAME );
                    return callback( err, 'PAID' );
                }

                for( let medication of result ) {

                    let medicationId = medication && medication._id && medication._id.toString();

                    if( !medication ) {
                        Y.log( `Can not pay activity with id: ${medicationId}. Not found.`, 'warn', NAME );
                        continue;
                    }

                    [err, result] = await formatPromiseResult(
                        changeStateP( {
                            user,
                            activity: medication,
                            isTest,
                            toState: 'BILLED',
                            fast: (options.fast && true)
                        } ) );

                    if( err ) {
                        Y.log( `Problem while pay invoice: ${err.stack || err}`, 'warn', NAME );
                        return callback( err, 'PAID' );
                    }

                    Y.log( 'Medications has been paid, id: ' + medicationId );
                }

                callback( null, 'PAID' );
            },

            /**
             *  @method  remind
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            remind: async function( user, options, activity, isTest, callback ) {
                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[fsmName]._changeState );

                let
                    newActivityProps = {amount: 0.00},
                    newActivityId,
                    err, changeStateResult, locImportId;

                [err, locImportId] = await formatPromiseResult(isInvoiceImported({user, activity}));

                if(err || locImportId) {
                    Y.log(`Imported invoice ${activity._id} cannot be warned. Please create new invoice instead and then warn it`, 'error', NAME);
                    err = err || Y.doccirrus.errors.rest('sumex_11', {}, true);
                    return callback(err);
                }

                //  (1) Check if user has permission to do this
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'remind' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to remind activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  (2) Change to REMINDED state
                [ err, changeStateResult ] = await formatPromiseResult(
                    changeStateP( {
                        user: user,
                        activity: activity,
                        isTest: isTest,
                        toState: 'REMINDED',
                        fast: (options.fast && true)
                    } )
                );

                if( err ) {
                    Y.log( `Could not change invoice status Error: ${ err.stack || err }`, 'warn', NAME );
                    return callback( err );
                }

                //  (2) Create a REMINDER activity - tell patient they still owe money - and save this
                if ( activity.totalReceiptsOutstanding !== 0 && !isTest && !activity.notCreateNew ) {
                    [ err, newActivityId ] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'REMINDER', newActivityProps, activity )
                    );

                    if ( err ) {
                        Y.log( `Could not update invoice receipt totals: ${err.stack||err}`, 'warn', NAME );
                    }

                    Y.log( `Created new REMINDER for invoice ${activity.invoiceNo}: ${newActivityId}`, 'info', NAME );
                }

                return callback( null, changeStateResult, null, newActivityId );
            },

            /**
             *  @method warn1
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            warn1: async function( user, options, activity, isTest, callback ) {
                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState );

                let
                    changeStateResult,
                    dunningScheme,
                    warn1cost,
                    newActivityProps,
                    newActivityId,
                    err, locImportId;

                [err, locImportId] = await formatPromiseResult(isInvoiceImported({user, activity}));

                if(err || locImportId) {
                    Y.log(`Imported invoice ${activity._id} cannot be warned. Please create new invoice instead and then warn it`, 'error', NAME);
                    err = err || Y.doccirrus.errors.rest('sumex_11', {}, true);
                    return callback(err);
                }

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'warn1' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to warn1 activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  (2) Change to WARN1 state
                [ err, changeStateResult ] = await formatPromiseResult(
                    changeStateP( {
                        user: user,
                        activity: activity,
                        isTest: isTest,
                        toState: 'WARN1',
                        fast: (options.fast && true)
                    } )
                );

                if ( err ) {
                    Y.log( `Could not change state to WARN1: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                //  (3) Get warning2 cost for this location from invoice configuration

                [ err, dunningScheme ] = await formatPromiseResult(
                    Y.doccirrus.api.invoiceconfiguration.getDunningScheme( user, activity.locationId )
                );

                if ( err ) {
                    //  should not happen
                    Y.log( `Could not check invoice configuration for dunning scheme: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                if ( dunningScheme && dunningScheme.warning1Value ) {
                    warn1cost = dunningScheme.warning1Value;
                }

                //  (4) Create a WARN1 activity - second dunning letter to patient
                if ( activity.totalReceiptsOutstanding !== 0 && !isTest && !activity.notCreateNew ) {

                    newActivityProps = { amount: warn1cost };
                    [ err, newActivityId ] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'WARNING1', newActivityProps, activity )
                    );

                    if( err ) {
                        Y.log( `Could not record new warning letter, err: ${ err.stack || err }`, 'warn', NAME );
                        return callback( err );
                    }

                    if ( err ) {
                        Y.log( `Could not update invoice receipt totals: ${err.stack||err}`, 'warn', NAME );
                    }

                    Y.log( `Created new warning1 from invoice ${activity.invoiceNo}: ${newActivityId}`, 'info', NAME );
                }

                return callback( null, changeStateResult, null, newActivityId );
            },

            /**
             *  @method warn2
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            warn2: async function( user, options, activity, isTest, callback ) {
                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState );

                let
                    changeStateResult,
                    dunningScheme,
                    warn2cost = 0,
                    newActivityProps,
                    newActivityId,
                    err, locImportId;

                [err, locImportId] = await formatPromiseResult(isInvoiceImported({user, activity}));

                if(err || locImportId) {
                    Y.log(`Imported invoice ${activity._id} cannot be warned. Please create new invoice instead and then warn it`, 'error', NAME);
                    err = err || Y.doccirrus.errors.rest('sumex_11', {}, true);
                    return callback(err);
                }

                //  (1) Check user permission

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'warn2' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to warn2 activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  (2) Change to WARN2 state
                [ err, changeStateResult ] = await formatPromiseResult(
                    changeStateP( {
                        user: user,
                        activity: activity,
                        isTest: isTest,
                        toState: 'WARN2',
                        fast: (options.fast && true)
                    } )
                );

                if ( err ) {
                    Y.log( `Could not change state to WARN1: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                //  (3) Get warning2 cost for this location from invoice configuration

                [ err, dunningScheme ] = await formatPromiseResult(
                    Y.doccirrus.api.invoiceconfiguration.getDunningScheme( user, activity.locationId )
                );

                if ( err ) {
                    //  should not happen
                    Y.log( `Could not check invoice configuration for dunning scheme: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                if ( dunningScheme && dunningScheme.warning2Value ) {
                    warn2cost = dunningScheme.warning2Value;
                }

                //  (4) Create a WARN2 activity - second dunning letter to patient
                if ( activity.totalReceiptsOutstanding !== 0 && !isTest && !activity.notCreateNew ) {

                    //  TODO: get correct warning cost
                    newActivityProps = { amount: warn2cost };
                    [ err, newActivityId ] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'WARNING2', newActivityProps, activity )
                    );

                    if( err ) {
                        Y.log( `Could not record new warning letter, err: ${ err.stack || err }`, 'warn', NAME );
                        return callback( err );
                    }

                    Y.log( `Created new warning2 from invoice ${activity.invoiceNo}: ${newActivityId}`, 'info', NAME );
                }

                return callback( null, changeStateResult, null, newActivityId );
            },

            /**
             *  @method derecognize
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            derecognize: async function( user, options, activity, isTest, callback ) {
                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState );

                let
                    changeStateResult,
                    newActivityProps,
                    newActivityId,
                    err;

                //  TODO: update linked treatments to this state on success
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'derecognize' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to derecognize activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  (2) Change to DERECOGNIZED state
                [ err, changeStateResult ] = await formatPromiseResult(
                    changeStateP( {
                        user: user,
                        activity: activity,
                        isTest: isTest,
                        toState: 'DERECOGNIZED',
                        fast: (options.fast && true)
                    } )
                );

                //  create a BADDEBT activity and transfer the balance from this invoice (similar to creditnote)
                if ( activity.totalReceiptsOutstanding !== 0 && !isTest  && !activity.notCreateNew ) {
                    newActivityProps = { amount: parseFloat( activity.totalReceiptsOutstanding ).toFixed(2) };
                    [ err, newActivityId ] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'BADDEBT', newActivityProps, activity )
                    );

                    if( err ) {
                        Y.log( `Could not record new bad debt, err: ${ err.stack || err }`, 'warn', NAME );
                        return callback( err );
                    }

                    Y.log( `Created new baddebt from invoice ${activity.invoiceNo}: ${newActivityId}`, 'info', NAME );
                }

                callback( null, changeStateResult, null, newActivityId );
            },

            /**
             *  @method debtcollect
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */

            debtcollect: async function( user, options, activity, isTest, callback ) {
                const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState );

                let error, changeStateResult;

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'debtcollect' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to debtcollect activity', 'debug', NAME );
                    return callback( accessError );
                }

                [error, changeStateResult] = await formatPromiseResult(
                    changeStateP( {
                        user,
                        activity,
                        isTest,
                        toState: 'DEBTCOLLECT',
                        fast: (options.fast && true)
                    } )
                );

                if( error ) {
                    Y.log( `Could not record new bad debt, err: ${error.stack || error}`, 'warn', NAME );
                    return callback( error );
                }

                if(Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()) {
                    [error] = await formatPromiseResult( Y.doccirrus.api.warning.generateInkassoPdf( {
                        user, invoice: activity
                    } ) );

                    if( error ) {
                        Y.log( `Failed to generate inkasso PDF. Error:\n${error.stack || error}`, 'error', NAME );
                        return callback( error );
                    }
                }

                return callback( null, changeStateResult );
            },

            /**
             *  @method credit
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            credit: async function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success
                const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    changeStateP = util.promisify( Y.doccirrus.fsm[ fsmName ]._changeState );
                let newActivityId, newActivityProps, err, changeStateResult;

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'credit' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to credit activity', 'debug', NAME );
                    return callback( accessError );
                }

                [ err, changeStateResult ] = await formatPromiseResult(
                    changeStateP( {
                        user,
                        activity,
                        isTest,
                        toState: 'CREDITED',
                        fast: (options.fast && true)
                    } )
                );

                // first create a creditnote activity and transfer the balance from this invoice
                if ( !isTest && activity.caseFolderId && activity.patientId && !activity.notCreateNew ) {
                    newActivityProps = { amount: parseFloat( activity.totalReceiptsOutstanding ).toFixed(2) };
                    [ err, newActivityId ] = await formatPromiseResult(
                        Y.doccirrus.api.receipt.createInvoiceStateActivity( user, 'CREDITNOTE', newActivityProps, activity )
                    );

                    if( err ) {
                        Y.log( `Could not create new creditnote, err: ${ err.stack || err }`, 'warn', NAME );
                        return callback( err );
                    }

                    Y.log( `Created new creditnote from invoice ${activity.invoiceNo}: ${newActivityId}`, 'info', NAME );
                }

                callback( null, changeStateResult, null, newActivityId );
            },
            medidataFix: async function( user, options, activity, isTest, callback ) {
                let error;

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'create' ) ) {
                    Y.log( 'medidataFix(): User: ' + user.id + ', does not have permissions to credit activity', 'debug', NAME );
                    return callback( accessError );
                }
                if( !isTest && activity.medidataRejected ) {
                    activity.status = 'MEDIDATAFIXED';
                    [error] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            query: {
                                _id: activity._id
                            },
                            action: 'put',
                            fields: Object.keys( activity ),
                            data: Y.doccirrus.filters.cleanDbObject( activity )
                        } )
                    );

                    if( error ) {
                        Y.log( `medidataFix(): Could not update activity ${activity._id.toString()} status to 'MEDIDATAFIXED', err: ${error.stack || error}`, 'error', NAME );
                        return callback( error );
                    }

                    Y.log( `medidataFix(): updated activity ${activity._id.toString()} status to 'MEDIDATAFIXED'`, 'info', NAME );
                }
                return callback();
            }

        };

    },
    '0.0.1', { requires: ['activity-schema', 'dcauth'] }
);
