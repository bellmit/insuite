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
 * @main activity-fsm
 */
YUI.add( 'dc-fsm-default', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-default
         * @requires activity-schema
         */

        const
            async = require( 'async' ),
            {formatPromiseResult} = require('dc-core').utils,
            util = require('util'),
            moment = require('moment'),
            mongoose = require( 'mongoose' ),
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            deleteError = Y.doccirrus.errors.rest( 409, 'not Deletable', true );

        /**s
         * The default state machine for generic activity types which do not have any special business logic
         *
         * @class dc-fsm-default
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
             *  The primary state change / save operation. Only here will you see a POST
             *  i.e. doc without an _id. In other transitions, the record will always
             *  be handled by PUT.
             *
             *  @method validate
             *  @param  {Object} user   REST user or equivalent
             *  @param  {Object} options    Extra options for event emitters, printing, etc
             *  @param  {Object} options.activityContext    will be passed to activity pre/post chain context
             *  @param  {Object} options.toState        target state if not 'VALID'
             *  @param  {Object} activity   see activity-schema.common.js
             *  @param  {Boolean} isTest    True if validation only, activity.status will not be changed
             *  @param  {Function} callback Of the form fn( err, newState )
             */

            validate: function( user, options = {}, activity, isTest, callback ) {
                var
                    dbOptions = { ignoreReadOnly: ['actType'] },
                    toState = 'VALID',
                    action = 'post';

                //  MOJ-8650 valid activity may be stored as 'CREATED' if its form is partially filled / invalid
                if ( options && options.toState ) {
                    Y.log( 'Setting non-default target state after validation: ' + options.toState, 'debug', NAME );
                    toState = options.toState;
                }

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'validate' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to validate activity', 'debug', NAME );
                    return callback( accessError );
                }
                Y.log( 'Entering validate transition on default FSM ' + activity._id + ' ' + (isTest ? 'TEST' : 'REAL'), 'debug', NAME );

                // 3. return state
                function finalCb( err, data ) {
                    //  set _id on activity if this is first save
                    if ( data && data[0] && data[0]._id && !activity._id ) {
                        activity._id = data[0]._id;
                    }

                    if( err ) {
                        Y.log( 'Error in transition: ' + err.toString(), 'error', NAME );
                        Y.log( JSON.stringify( err ), 'debug' );
                        callback( err );
                        return;
                    }

                    Y.log( 'Valid activity saved to database:' + activity._id, 'debug', NAME );

                    //  set activity _id on first POST, will be returned to client
                    if( 'post' === action && data && data[0] && data[0]._id ) {
                        Object.keys( data[ 0 ] ).forEach( function( key ) {
                            activity[ key ] = data[ 0 ][ key ];
                        } );
                    }

                    callback( null, toState );
                }

                // 2. save state if !istTest
                function validCb( err ) {
                    if( err ) {
                        Y.log( 'Suppressing error while testing validity: ' + JSON.stringify( err ) );
                        callback( null, 'INVALID' );
                        return;
                    }
                    finalCb( null, [] );
                }

                // 1. has an _id and we are actually writing!
                if( activity._id ) {
                    action = 'put';
                }

                // NB: here we can trigger validations for non-existent fields
                // by setting them to undefined, they save no code, but instruct
                // mongoose to make a conditional mandatory check, which would not
                // run if the field is completely missing.
                if( !activity.code ) {
                    activity.code = null;
                }


                if( !isTest ) {
                    // we need to set the status here, in case it affects the validation function!
                    // not clean because it complicates step 2.
                    activity.status = toState;
                    // switch off writing in this case, because already written

                    // 6993 hack
                    if( activity.treatmentType === null ) {
                        activity.treatmentType = undefined;
                    }
                    if( !activity.skipcheck_ ) {
                        activity = Y.doccirrus.filters.cleanDbObject( activity );
                    }

                    dbOptions.entireRec = true;
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: action,
                        model: 'activity',
                        query: {_id: activity._id + ''}, // will be ignored for post
                        data: activity,
                        migrate: options.migrate || false,
                        options: dbOptions,
                        context: options.activityContext,
                        fields: Object.keys( activity ) // will be ignored for post
                    }, finalCb );

                } else {
                    // 1. just check validation of activity
                    action = 'validate';
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: action,
                        model: 'activity',
                        context: options.activityContext,
                        migrate: options.migrate || false,
                        args: [ activity, validCb ]
                    } );
                }
            },

            /**
             * Special transition to store a valid activity which has an invalid form, into state created
             * Similar to validate, but returns state 'CREATED'
             */

            store: function( user, options, activity, isTest, callback ) {
                var self = this;
                if ( !options ) { options = {}; }
                options.toState = 'CREATED';
                self.validate( user, options, activity, isTest, callback );
            },

            /**
             *  Marks an activity as finalized and no longer editable.  If the activity has a PDF it will be
             *  regenerated on successful transition.  Invoice numbers are assigned at this step, checks on linked
             *  activities are performed and linked activities state may be changed.
             *
             *  @method approve
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  @param  {Function}             options.onPdfGenerated  Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}             options.onPdfProgress   Called repeatedly as PDF is generated (optional)
             *  @param  {Object} options.activityContext will be passed to activity pre/post chain context
             *
             *  TODO: tidy the PDF and printing routine out of the transition - these happen outside of it
             *
             */
            approve: async function( user, options, activity, isTest, callback ) {

                var
                    self = this,
                    currState = activity.status,
                    linkedIds = [],
                    mapFields = {
                        status: 'APPROVED',
                        employeeInitials: activity.employeeInitials,
                        employeeId: activity.employeeId
                    },         //  properties to be updated in form
                    latestFormDocId,
                    printerName = ( options && options.printerName ) || '';

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'approve' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to approve activity', 'debug', NAME );
                    callback( accessError );
                    return;
                }

                if( isTest ) {
                    //  TODO: more tests of linked activities
                    self._changeState( {
                        user,
                        activity,
                        isTest,
                        toState: 'APPROVED',
                        fast: (options.fast && true)
                    }, callback );
                    return;
                }

                if( activity.actType === 'DOCLETTER' ) {
                    // creates the xml and attaches it to the docletter
                    let [err] = await formatPromiseResult( Y.doccirrus.api.edocletter.generateDocLetterXML( {
                        user,
                        docletter: activity
                    } ) );

                    if( err ) {
                        Y.log( `approve: could not generate docletter xml: ${err.stack || err}`, 'error', NAME );
                        callback( err );
                        return;
                    }
                }

                async.series(
                    [
                        setActivityApproved,
                        setLinkedActivityApproved,
                        synchronizeAllLinkedActivities,
                        saveInvoiceNumber,
                        regenerateActivityPDF,
                        chownLinkedDocuments
                    ],
                    onAllDone
                );

                // 1. Update the activity status
                function setActivityApproved( itcb ) {
                    self._changeState( {
                        user,
                        activity,
                        isTest,
                        toState: 'APPROVED',
                        activityContext: options.activityContext,
                        fast: (options.fast && true)
                    }, onApproveActivity );
                    function onApproveActivity( err, newState ) {
                        if ( !err && 'APPROVED' !== newState ) {
                            //  if approval failed then we must skip all subsequent steps
                            err = Y.doccirrus.errors.rest( 500, 'Could not complete approval transition', true );
                        }

                        if ( err ) { return itcb( err ); }

                        currState = newState.toString();

                        itcb( null );
                    }
                }

                // 2. approve linked activities
                function setLinkedActivityApproved( itcb ) {
                    var i;

                    if ( options.skipLinkedApprove ) {
                        Y.log( 'Skipping approval of linked activities.', 'debug', NAME );
                        return itcb( null );
                    }

                    if( activity.activities && activity.activities.length ) {
                        for( i = 0; i < activity.activities.length; i++ ) {
                            linkedIds.push( activity.activities[i].toString() );
                        }
                    }
                    if( activity.icds && activity.icds.length ) {
                        for( i = 0; i < activity.icds.length; i++ ) {
                            linkedIds.push( activity.icds[i].toString() );
                        }
                    }
                    if( activity.icdsExtra && activity.icdsExtra.length ) {
                        for( i = 0; i < activity.icdsExtra.length; i++ ) {
                            linkedIds.push( activity.icdsExtra[i].toString() );
                        }
                    }

                    //TODO: move this to a utility method, allowing fast and complete versions
                    // refactor to use mongoose directly, skipping postprocesses MOJ-5644

                    //  TODO: move this to activity model
                    var
                        scheinTypes = [ 'SCHEIN', 'BGSCHEIN', 'PKVSCHEIN' ],
                        invoiceRelated = [ 'WARNING1', 'WARNING2', 'REMINDER', 'CREDITNOTE', 'RECEIPT', 'BADDEBT' ];

                    if ( -1 !== scheinTypes.indexOf( activity.actType + '' ) ) {
                        Y.log( 'Skipping auto approval of linked activities for schein act type', 'info', NAME );
                        return itcb( null );
                    }

                    if ( -1 !== invoiceRelated.indexOf( activity.actType + '' ) ) {
                        Y.log( 'Skipping auto approval of linked invoice MOJ-9078', 'info', NAME );
                        return itcb( null );
                    }

                    if ( 0 === linkedIds.length ) {
                        Y.log( 'No linked activities to update.', 'debug', NAME );
                        return itcb( null );
                    }

                    //TODO: update query to exclude schein types
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        query: { _id: { $in: linkedIds } },
                        data: { $set: { status: currState, editor: activity.editor } },
                        options: {
                            multi: true
                        }
                    }, onMongooseUpdate );

                    //NOTE: rule engine currently not invoked for linked activities

                    function onMongooseUpdate( err /*, result */ ) {
                        if ( err ) {
                            Y.log( 'Could not perform mongoose update: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        //  schedule a reporting update for linked activitiesr
                        let i;
                        for ( i = 0; i < linkedIds.length; i++ ) {
                            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', linkedIds[i] );
                        }

                        Y.log( 'Updated linked activities: ' + JSON.stringify( linkedIds ), 'debug', NAME );
                        itcb( null );
                    }
                }

                // 3. Share changes to all linked activities with dispatcher (only applies to ISD)
                function synchronizeAllLinkedActivities( itcb ) {

                    //  This is only done on ISD
                    if ( Y.doccirrus.auth.isISD() ) { return itcb( null ); }

                    //  skip this step if no linked activities to synchronize
                    if ( 0 === linkedIds.length ) { return itcb( null ); }

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'action': 'get',
                        'query': { _id: { $in: linkedIds } },
                        'callback': onLoadLinkedActivities
                    } );

                    function onLoadLinkedActivities( err, result ) {

                        if ( err ) {
                            Y.log( 'Problem loading linked activities for dispatcher: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        async.eachSeries( result, synchronizeSingleLinkedActivity, itcb );
                    }
                }

                // 3.5 Share changes to a single linked activity with dispatcher
                function synchronizeSingleLinkedActivity( activity, itcb ) {

                    //  call back immediately, the ISD client doesn't need to wait for this
                    itcb( null );           //  eslint-disable-line callback-return
                    Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'reference', {
                        addedFrom: 'activityLinked_' + activity._id.toString(),
                        syncActivityId: activity._id.toString()
                    }, () => {} );
                }

                // 4. Insert new invoice number and date if this is an invoice (will be needed for PDF in legacy mapper)
                function saveInvoiceNumber( itcb ) {
                    //  this step only applies to invoices
                    if ( 'INVOICE' !== activity.actType && 'RECEIPT' !== activity.actType ) { return itcb( null ); }

                    var
                        setArgs = {
                            'content': activity.content,
                            'timestamp': activity.timestamp
                        };

                    if ( 'INVOICE' === activity.actType ) {
                        setArgs.invoiceNo = activity.invoiceNo;
                        mapFields.invoiceNo = activity.invoiceNo;
                        mapFields.date = moment(  activity.timestamp + '' ).format( 'DD.MM.YY' );
                    }

                    if ( Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                        setArgs.receiptNo = activity.receiptNo || '';
                        mapFields.receiptNo = activity.receiptNo || '';
                        mapFields.invoiceNo = activity.invoiceNo || '';
                        mapFields.content = activity.content || '';
                        mapFields.date = moment(  activity.timestamp + '' ).format( 'DD.MM.YY' );
                    }

                    //  NOTE: these always have a form, so reporting will be updated with these fields during the full
                    //  save when the PDF is complete.

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        query: { _id: activity._id + '' },
                        data: { $set: setArgs },
                        options: { multi: false }
                    }, itcb );
                }

                // 5. Regenerate the PDF
                function regenerateActivityPDF( itcb ) {

                    //  if there is no form then we can skip this step
                    if (!activity.formId || '' === activity.formId) {
                        itcb( null );
                        return;
                    }

                    //  if activity has a form then re-render it on approval
                    //  if no mapper name is passed then mapper will be inferred from schema
                    //  needed to support Invoice_T and InCase_T mappers simultaneously (MOJ-4509)

                    var
                        mapperName = '',
                        newMediaId = null,
                        newFormDocId = null,
                        pdfOptions = {
                            'user': user,                                   //  user
                            'formId': (activity.formId + ''),               //  formtemplate _id
                            'formVersionId': (activity.formVersion + ''),   //  formtemplateversion _id or ''
                            'mapperName': mapperName,                       //  inferred from form if not sent
                            'mapCollection': 'activity',                    //  owner collection
                            'mapObject': (activity._id + ''),               //  owner _id
                            'mapFields': mapFields,                         //  extra properties to set in form
                            'saveTo':'db',                                  //  saveTo database
                            'zipid': '',                                    //  zipId (not zipped)
                            'preferName': '',                               //  preferName (no preferred name on disk)
                            'onProgress': options.onPdfProgress || null,    //  event handler for PDF progress
                            'callback': Y.dcforms.checkSingleCB( onPdfRegenerated )                    //  callback
                        };

                    Y.doccirrus.forms.renderOnServer.toPDF( pdfOptions );

                    //  add (re)generated PDF to activity and update database

                    function onPdfRegenerated(err, mediaId, formDocId) {
                        var found, insert;

                        if ( err ) {
                            Y.log('Could not render PDF on server: ' + JSON.stringify(err), 'warn', NAME);
                            //  TODO: consider ws event here to pop a notification on the client
                            return;
                        }

                        newMediaId = mediaId;
                        newFormDocId = formDocId;

                        if (formDocId) {
                            Y.log('Regenerated PDF, adding document ' + formDocId + ' for media ' + mediaId, 'debug', NAME );
                            activity.attachments.push( formDocId );
                            latestFormDocId = formDocId;
                        }

                        if ( mediaId && activity.attachedMedia ) {

                            activity.formPdf = mediaId;
                            insert = {
                                mediaId: mediaId,
                                contentType: 'application/pdf',
                                caption: 'PDF'
                            };
                            found = Y.Array.find( activity.attachedMedia, function( media ) {
                                return media.mediaId === insert.mediaId;
                            } );
                            if( found ) {
                                activity.attachedMedia.splice( activity.attachedMedia.indexOf( found ), 1, insert );
                            }
                            else {
                                activity.attachedMedia.push( insert );
                            }
                        }

                        //  slower default version for now to trigger post-processes
                        Y.doccirrus.mongodb.runDb({
                            user: user,
                            action: 'put',
                            model: 'activity',
                            query: { _id: activity._id + '' },
                            data: {
                                attachedMedia: activity.attachedMedia,
                                formPdf: activity.formPdf,
                                attachments: activity.attachments,
                                skipcheck_: true
                            },
                            fields: [ 'attachedMedia', 'formPdf', 'attachments' ],
                            // because the readonly setting returns '*' for the readonly states,
                            // we need to override here.
                            options: { ignoreReadOnly: [ 'attachedMedia', 'formPdf', 'attachments' ] },
                            callback: onActivitySaved
                        });
                        itcb(null); // This is now in series
                        //  Make this document available to share with patient (we don't need to wait for this)
                        Y.doccirrus.api.document.setPatientId( user, [ formDocId ], activity.patientId, true, Y.dcforms.nullCallback );
                    }

                    function onActivitySaved( err /*, result */ ) {

                        var
                            data = {
                                'status': 'complete',
                                'mediaId': activity.formPdf,
                                'activity': {
                                    '_id': activity._id,
                                    'attachedMedia': activity.attachedMedia,
                                    'attachments': activity.attachments,
                                    'formPdf': activity.formPdf,
                                    'status': activity.status
                                },
                                'afterApproval': true
                            };

                        if ( err ) {
                            Y.log('Error saving (re)generated PDF to activity: ' + JSON.stringify( err ), 'warn', NAME);
                            data.status = 'error';
                            data.err = err;
                            return;
                        }

                        //  issue ws event here, check event used by PDF buttons
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            nsp: 'default',
                            event: 'onPDFCreated',
                            msg: {
                                data: data
                            }
                        } );

                        if ( options.onPdfGenerated && 'function' === typeof options.onPdfGenerated ) {
                            options.onPdfGenerated( activity.formPdf, latestFormDocId, activity._id );
                        }

                        if ( options.printOnApprove || options.print) {
                            // load the document
                            Y.doccirrus.mongodb.runDb({
                                method: 'GET',
                                model: 'document',
                                user: user,
                                query: { _id: newFormDocId },
                                callback: onDocumentLoaded
                            });
                        }
                    }

                    function onDocumentLoaded( err, data ) {
                        var doc = ( data && data[0] ) ? data[0] : null;

                        if ( !doc ) {
                            err = new Error( 'Document not found' );
                        }

                        if ( doc && !doc.printerName && !printerName ) {
                            err = new Error( 'No printer is specified for this form' );
                        }

                        if ( err || !doc ) {
                            Y.log( 'Error loading document ' + newFormDocId + ': ' + JSON.stringify( err ), 'warn', NAME );
                        }

                        if ( '' === printerName ) {
                            printerName = doc.printerName;
                        }

                        Y.doccirrus.api.media.print( {
                            originalParams: {
                                mediaId: newMediaId,
                                printerName: printerName,
                                numCopies: 1
                            },
                            user: user,
                            callback: Y.dcforms.checkSingleCB( onPrinted )
                        } );

                        if ( typeof options.numCopies === "number" && options.numCopies > 0 ) {
                            Y.doccirrus.api.formtemplate.printpdfcopyws( {
                                user: user,
                                callback: Y.dcforms.nullCallback,
                                originalParams: {
                                    printTo: printerName,
                                    printCopies: options.numCopies,
                                    waitCallback: false,
                                    saveTo: 'temp',
                                    mapObject: activity._id,
                                    mapCollection: 'activity',
                                    formId: activity.formId,
                                    formVersionId: activity.formVersion,
                                    mapFields: mapFields // extra properties to set in form

                                }
                            } );
                        }
                    }

                    function onPrinted( err /*, data */ ) {
                        if ( err ) {
                            Y.log( 'Error while printing: ' + newMediaId + ' to: ' + printerName );

                            //  issue ws event here to notify user of print
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                nsp: 'default',
                                event: 'quickPrintComplete',
                                msg: {
                                    data: {
                                        printerName: printerName,
                                        mediaId: newMediaId,
                                        err: err
                                    }
                                }
                            } );

                            return;
                        }
                        //  on success the user will be notified by the standard green system notification from print API
                    }
                }

                // 6. Make attachments available to share on patient portal, automatically share them if option is set
                function chownLinkedDocuments( itcb ) {
                    // if no attachments then we can skip this step
                    if( activity.attachments && !activity.attachments.length ) {
                        return setImmediate( itcb );
                    }

                    Y.doccirrus.api.document.setPatientId( user, activity.attachments, activity.patientId, false, itcb );
                }

                //  all steps complete, call back with current state
                async function onAllDone( err ) {
                    const
                        syncObjectWithDispatcher = util.promisify( Y.doccirrus.api.dispatch.syncObjectWithDispatcher ),
                        activityId = activity._id.toString();

                    callback( err, currState ); // return earlier and don't wait for transferring

                    if ( 'APPROVED' === currState ) {
                        if( activity.actType.toString() === 'PROCESS' ) {
                            let [ err ] = await formatPromiseResult(
                                syncObjectWithDispatcher( user, 'reference', {
                                    addedFrom: `activity_${activityId}`,
                                    syncActivityId: activityId
                                } )
                            );
                            if( err ) {
                                Y.log( `approve: Error on sync activity ${activityId} : ${err.stack || err}`, 'warn', NAME );
                            }
                        }

                        [ err ] = await formatPromiseResult(
                            syncObjectWithDispatcher(user, 'activitystatus', Object.assign({}, activity, {addedFrom: 'avtivity_fsm_'+activity._id.toString()}) )
                        );
                        if( err ) {
                            Y.log( `approve: Error on sync activity status ${activityId} : ${err.stack || err}`, 'warn', NAME );
                        }

                        [ err ] = await formatPromiseResult(
                            syncObjectWithDispatcher(user, 'activeReference', {
                                addedFrom: `activity_${activityId}`,
                                entityName: 'activity',
                                entryId: activityId,
                                lastChanged: activity.lastChanged,
                                onDelete: false
                            } )
                         );
                         if( err ) {
                             Y.log( `approve: Error on sync activity status ${activityId} in activeActive mode : ${err.stack || err}`, 'warn', NAME );
                         }
                    }
                }

            },

            /**
             * Special transition for quickPrint functionality
             *
             * DEPRECATED, just use print option of approve
             *
             * @method approveandprint
             * @param {Object} user
             * @param {Object} options
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             */

            approveandprint: function( user, options, activity, isTest, callback ) {
                var self = this;
                options.printOnApprove = true;
                self.approve(  user, options, activity, isTest, callback );
            },

            /**
             * @method delete
             * @param {Object} user
             * @param {Object} options
             * @param {Object} options.activityContext will be passed to activity pre/post chain context
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             *
             * @return {Function} callback
             *
             * TODO: tidy
             */
            delete: function( user, options, activity, isTest, callback ) {
                let
                    async = require( 'async' ),
                    self = this;
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'delete' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to delete activity', 'debug', NAME );
                    return callback( accessError );
                }

                if ( activity.notDeletable && !Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPPORT ) ) {
                    Y.log( 'Activity is not deletable: ' + activity._id + ' ' + activity.notDeletable, 'warn', NAME );
                    return callback( deleteError );
                }

                function doneCb( err ) {
                    if( err ) { return callback( err ); }
                    callback( null, 'DELETED' );
                }

                // 1. has an _id and we are actually writing!
                if( activity._id && !isTest ) {
                    async.waterfall( [
                        function( next ) {
                            self._changeStateSilent( {
                                user,
                                toState: 'DELETED',
                                activity,
                                isTest
                            }, ( err ) => {
                                next( err );
                            } );
                        },
                        function( next ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'delete',
                                model: 'activity',
                                query: { _id: activity._id },
                                context: options.activityContext
                            }, err => next( err ) );
                        },
                        function( next ) {
                            Y.doccirrus.schemaprocess.activity.deleteAttachments( user, activity, next ); // until MOJ-805 is done
                        }
                    ], doneCb );

                } else {
                    doneCb( null );
                }
            },

            /**
             * Expanded for EXTMOJ-861 to allow a reason for cancelling the activity to be recorded
             *
             * @method cancel
             * @param {Object} user
             * @param {Object} options
             * @param {Object} options.activityContext will be passed to activity pre/post chain context
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             *
             * @return {Function}
             */
            cancel: function( user, options, activity, isTest, callback ) {
                const self = this;
                let newState;

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'cancel' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to cancel activity', 'debug', NAME );
                    return callback( accessError );
                }

                async.series( [ changeState, noteReason, addReasonToTags, chownAnyDocuments ], onAllDone );

                // referencedByWas is needed to cancel linked medications from stockdispense activity and vice versa (cancelMedication)
                function changeState( itcb ) {
                    self._changeState( {
                        user,
                        activity,
                        isTest,
                        toState: 'CANCELLED',
                        activityContext: {...options.activityContext, referencedByWas: [...activity.referencedBy]},
                        fast: (options.fast && true)
                    }, onCancelComplete );
                    function onCancelComplete(err, toState) {
                        if (err) { return itcb(err); }
                        newState = toState;
                        itcb( null );
                    }
                }

                function noteReason( itcb ) {
                    if ( !activity.cancelReason || '' === activity.cancelReason || isTest ) {
                        //  not an error, for now
                        return itcb( null );
                    }

                    let
                        data = {
                            cancelReason: activity.cancelReason
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'action': 'update',
                        'query': { _id: activity._id },
                        'data': data,
                        'callback': itcb
                    } );
                }

                function addReasonToTags( itcb ) {
                    if( '' === (activity.cancelReason || '').trim() ){
                        return itcb( null );
                    }
                    Y.doccirrus.api.tag.updateTags( {
                        user,
                        data: {
                            type: Y.doccirrus.schemas.tag.tagTypes.CANCELREASON,
                            oldTags: [],
                            documentId: activity._id.toString(),
                            currentTags: [ activity.cancelReason ]
                        },
                        callback: function( err ) {
                            itcb(err);
                        }
                    } );
                }

                function chownAnyDocuments( itcb ) {
                    //  Activity may have documents attached - when cancelled these should be removed from Patient
                    //  Portal and inCase Dokumente.  This is done by removing patientId from the attachments
                    //
                    //  This was previously done by changing the attachedTo field back to activityId, see MOJ-9190

                    Y.doccirrus.api.document.setPatientId( user, activity.attachments, null, false, itcb );
                }


                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem with cancel transition: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err, newState );
                    }

                    //  free any linked activities which may belong to this
                    Y.doccirrus.api.linkedactivities.clearBacklinks( user, activity, [], ( err ) => {
                        if( err ) {
                            Y.log( `could not clear back links in cancel transition ${err}`, 'error', NAME );
                            return callback( err );
                        }
                        callback( null, newState );
                    } );

                    //  update reporting with new state and cancel reason
                    Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activity._id );

                }

            },

            /**
             * @method archive
             * @param {Object} user
             * @param {Object} options
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             *
             * @return {Function} callback
             */
            archive: function( user, options, activity, isTest, callback ) {
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'archive' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to archive activity', 'debug', NAME );
                    return callback( accessError );
                }

                //  No rules as yet

                this._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'ARCHIVED',
                    fast: (options.fast && true)
                }, callback );

                //callback( null, 'ARCHIVED' );
            },

            /**
             *  @method onHold
             *  @param {Object} user        REST user or equivalent
             *  @param {Object} options     Extra options for event emitters, printing, etc
             *  @param {Object} activity    see activity-schema.common.js
             *  @param {Boolean} isTest     True if validation only, activity.status will not be changed
             *  @param {Function} callback  Of the form fn( err, newState )
             */
            onHold: async function( user, options, activity, isTest, callback ) {
                let error, result, currentActivityStatus = 'VALID', action = 'post';
                if( !['INVOICE', 'INVOICEREF', 'PKVSCHEIN'].includes( activity.actType ) ) {
                    error = Y.doccirrus.commonerrors.DCError( 405, {message: 'this type of activity cannot be put on hold'} );
                    return callback( error );
                }

                const newStatus = Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) ? 'ONHOLD' : 'REVOKEWARN';
                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: activity._id
                    },
                    options: {
                        fields: {status: 1},
                        limit: 1
                    }
                } ) );

                if( error ) {
                    Y.log( `onHold: activity ${activity._id} not found in db.\nError: ${error.stack || error}`, 'error', NAME );
                    return callback( error );
                }

                if( activity._id && Array.isArray( result ) && result[0] ) {
                    action = 'put';
                    currentActivityStatus = result[0].status || 'VALID';
                } else if( !activity._id ) {
                    activity._id = new mongoose.Types.ObjectId();
                }


                activity.status = newStatus;
                if( currentActivityStatus !== newStatus ) {
                    activity.statusBeforeHold = currentActivityStatus;
                }

                [error] = await formatPromiseResult(  Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action,
                    ...(action === 'post' ? {} : {query: {_id: activity._id}}),
                    data: Y.doccirrus.filters.cleanDbObject( activity ),
                    fields: Object.keys( activity ),
                    migrate: options.migrate || false
                } ) );

                return callback( error, newStatus );
            },
            /**
             *  Boilerplate to update the status field of an activity
             *
             *  Prevents a lot of duplication on simple transitions
             *
             *  NOTE: there are two ways to save an activity:
             *
             *   (*) quickly, with mongoose, skipping postprocesses.  There are a limited number of transitions
             *       where this is safe to use, and is implemented for Quickprint (MOJ-5644)
             *
             *   (*) with the DC model, including rules and postprocesses.  This is slower but includes important
             *       validation and update steps for more complex transitions.
             *
             *  @method _changeState
             *  @param  {Object} params
             *  @param  {Object} params.user AC REST user or equivalent
             *  @param  {Object} params.activity Activity to transition
             *  @param  {Boolean} params.isTest If true then changes will not be saved
             *  @param  {String} params.toState Name of target state
             *  @param  {Boolean} params.fast Do not run pre and post-processes, just update with mongoose
             *  @param  {Object} [params.activityContext] will be passed to activity pre/post chain context
             *  @param  {Function} callback Of the form fn(err, newStateName)
             *  @protected
             */

            _changeState: async function( params, callback ) {
                let
                    { user, activity, isTest, toState, fast, activityContext } = params,
                    fields = [ 'status', 'editor', 'attachments', 'invoiceDate' ],

                    data = {
                        status: toState,
                        editor: activity.editor,
                        attachments: activity.attachments,
                        skipcheck_: true,
                        invoiceDate: new Date()
                    },
                    editor = {name: user && user.U},
                    self = this;

                if( 'BILLED' === toState && !activity.invoiceBilledDate ) {
                    fields.push( 'invoiceBilledDate' );
                    data.invoiceBilledDate = new Date();
                }

                //    fast = false;

                if( !activity._id || isTest ) {
                    callback( null, toState);
                    return;
                }

                //  add any special cases for specific transitions to the switch
                /*  TODO: add and check for option
                switch( toState ) {
                    case 'VALID':       fast = true;    break;
                    case 'APPROVED':    fast = true;    break;
                    case 'BILLED':      fast = true;    break;
                }
                */

                if ( true === fast ) {
                    saveFast();
                } else {
                    saveComplete();
                }

                //  simple, quick update with mongoose, no safety net of postprocesses

                function saveFast() {
                    self._changeStateSilent( {
                        user,
                        activity,
                        toState,
                        isTest
                    }, onActivityStatusSet );

                    function onActivityStatusSet( err /*, result */ ) {

                        if( err ) {
                            Y.log( 'Could not update activity status: ' + JSON.stringify( err ), 'warn', NAME );
                            callback( err, activity.status );
                            return;
                        }

                        activity.status = toState;
                        Y.doccirrus.schemaprocess.activity.standalone.triggerRuleEngine( user, activity, onRuleEngineRun );
                    }

                    function onRuleEngineRun( err ) {
                        if( err ) {
                            Y.log( 'Error on invoking rule engine: ' + JSON.stringify( err ), 'warn', NAME );
                        }

                        //  let reporting API know that this activity has changed
                        Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activity._id.toString() );

                        callback( err, toState );
                    }
                }

                //  regular save through DC activity model, including rules and postprocesses

                function saveComplete() {
                    if( !activity.editor ) {
                        activity.editor = [editor];
                        data.editor = activity.editor;
                    } else {
                        activity.editor.push(editor);
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'put',
                        model: 'activity',
                        query: { _id: activity._id },
                        migrate: true,
                        data: data,
                        fields: fields,
                        context: activityContext,
                        // because the readonly setting returns '*' for the readonly states,
                        // we need to override here.
                        options: { ignoreReadOnly: [ 'status', 'editor' ] },
                        callback: doneCb
                    });

                    //  called after saving to the database
                    function doneCb( err ) {
                        if( err ) {
                            Y.log( `Could not change activity status: ${err.stack||err}`, 'error', NAME );
                            return callback( err );
                        }
                        callback( null, toState );
                    }

                }

            },
            /**
             * @method _changeStateSilent
             * @param {Object} params
             * @param {Object} params.user
             * @param {Object} params.activity
             * @param {Object} params.toState
             * @param {Object} params.isTest
             * @param {Function} callback
             * @return {Function | undefined}
             * @private
             */
            _changeStateSilent: function( params, callback ) {
                let

                    { user, activity, toState, isTest } = params,
                    setArgs = {
                        status: toState,
                        editor: activity.editor,
                        attachments: activity.attachments,
                        invoiceDate: new Date()
                    },
                    legal = Y.doccirrus.schemas.activity.isLegalNewStatus( activity.actType, activity.status, toState );
                if( !legal && 'DELETE' === toState ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 403 ) );
                }
                if( !activity._id || isTest ) {
                    callback( null, toState );
                    return;
                }
                if( activity.editor ) {
                    activity.editor.push( { name: user && user.U } );
                }

                Y.log( `Using quicksave for this transition to ${toState}, postprocesses will nnot be invoked`, 'info', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: { _id: activity._id + '' },
                    data: { $set: setArgs },
                    options: { multi: false }
                }, callback );

            }

        };

    },
    '0.0.1', { requires: [
        'activity-schema',
        'dcerror',
        'dcauth',
        'dispatch-api',
        'dccommonerrors',
        'activity-api'
    ] }
);
