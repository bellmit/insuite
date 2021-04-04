/**
 *  Used to create and maintain reciprocal links between activities, such as medications and prescriptions.
 *
 *  TODO: move to /models
 *  TODO: move receipt / invoice links here
 *
 *  @user   strix
 *
 */

/*global YUI */

YUI.add( 'linkedactivities-api', function( Y, NAME ) {

    /**
     *  @module linkedactivities-api
     */

    const
        ObjectId = require( 'mongoose' ).Types.ObjectId,
        {formatPromiseResult, promisifyArgsCallback} = require('dc-core').utils,
        _ = require( 'lodash' ),
        moment = require( 'moment' ),

        //  activity types created about an invoice, which may change its outstanding balance
        INVOICE_RELEVANT = [ 'RECEIPT', 'REMINDER', 'WARNING1', 'WARNING2', 'CREDITNOTE', 'BADDEBT' ];

    /**
     *  Check that other activities which link to this one are updated after save
     *
     *  Overall process:
     *
     *      1.  Make a list of all activities directly referenced by the one being saved, load them (partial objects)
     *      2.  Check which of the referenced activities need their referencedBy property updated, add it
     *        2.1 If the referenced activity should be changed in response to the link, check/update it here
     *      3.  Look for activities which claim to be referencedBy the current one, but are not
     *      4.  Update all references from linked activities where they should be removed
     *        4.1 Update referencedBy and other revrese links where entries should be removed
     *      5.  Save changed activities back to database
     *        5.1 Run update on single changed activity
     *
     *  @param  {Object}    user
     *  @param  {Object}    activity    From activity process
     *  @param  {Function}  callback    Of the form fn( err, activity )
     */

    function updateBacklinks( user, activity, callback ) {
        const
            async = require( 'async' );

        let
            refs = getAllReferences( activity ),
            activityId = activity._id.toString(),   //  activity _id as string
            referencedActivities = [],              //  activities referenced by this one (to check or add)
            dereferencedActivities = [],            //  activities no longer referenced by this one (to remove)
            changedActivityIds = [];                //  _ids of activities to notify client about

        async.series(
            [
                getReferencedActivities,
                addNewBacklinks,
                findBrokenBacklinks,
                removeBrokenBacklinks,
                saveChangedActivities
            ],
            onAllDone
        );

        //  1.  Make a list of all activities directly referenced by the one being saved, load them (partial objects)
        function getReferencedActivities( itcb ) {

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'query': { '_id': { '$in': refs } },
                //'options': { 'fields': getFields },
                'callback': onRefsLoaded
            } );

            function onRefsLoaded( err, result ) {
                if ( err ) { return itcb( err ); }
                referencedActivities = result;
                itcb( null );
            }
        }

        //  2.  Check which of the referenced activities need their referencedBy property updated, add it
        function addNewBacklinks( itcb ) {
            if ( 0 === referencedActivities.length ) { return itcb( null ); }
            async.eachSeries( referencedActivities, updateSingleReferencedActivity, itcb );
        }

        //  2.1 If the referenced activity should be changed in response to the link, check/update it here
        function updateSingleReferencedActivity( refAct, itcb ) {
            let relationshipName = `${activity.actType  }-${refAct.actType}`;

            refAct.activities = refAct.activities || [];
            refAct.fields = [];
            refAct.referencedBy = refAct.referencedBy || [];

            //  Add to referencedBy array if not already present
            if ( -1 === refAct.referencedBy.indexOf( activityId ) ) {
                refAct.referencedBy.push( activityId );
                refAct.fields.push( 'referencedBy' );
            }

            //  handle special cases here
            switch( relationshipName ) {
                case 'TREATMENT-TREATMENT':
                    Y.log( 'TODO: linking treatments to treatments, check rules for this', 'warn', NAME );
                    //  linking treatments to treatments, check rules for this, reverse direction if necessary
                    //  TODO: this
                    break;

                case 'PRESCRT-MEDICATION':                  //  deliberate fallthrough
                case 'PRESCRG-MEDICATION':                  //  deliberate fallthrough
                case 'PRESCRBTM-MEDICATION':                //  deliberate fallthrough
                case 'PRIVPRESCR-MEDICATION':               //  deliberate fallthrough
                case 'PUBPRESCR-MEDICATION':
                case 'LONGPRESCR-MEDICATION':
                    //  use of activities array for this is deprecated, now uses referencedBy, clean up if found
                    if ( refAct.activities && refAct.activities.length > 0 ) {
                        refAct.activities = [];
                        refAct.fields.push( 'activities' );
                    }

                    if ( !refAct.isPrescribed ) {
                        refAct.fields.push( 'isPrescribed' );
                        refAct.isPrescribed = true;
                    }
                    break;

                case 'INVOICEREF-TREATMENT':
                case 'INVOICE-TREATMENT':
                case 'INVOICEREF-MEDICATION':
                case 'INVOICE-MEDICATION':
                case 'INVOICE-DIAGNOSIS':
                case 'INVOICEREF-DIAGNOSIS':

                    if ( 'CANCELLED' === activity.status ) {
                        //  do not update invoiceId if cancelled, field will be deleted after transition
                        return itcb( null );
                    }

                    if ( refAct.invoiceId && refAct.invoiceId !== activityId ) {
                        //  raise error here
                        Y.log( `${activity.actType.toLowerCase()} is already referenced by another activity by invoiceId: ${refAct.invoiceId}`, 'warn', NAME );
                        return itcb( null );
                    }

                    if ( refAct.invoiceLogId && '' !== refAct.invoiceLogId && refAct.invoiceLogId !== activity.invoiceLogId ) {
                        //  raise error here?
                        Y.log( `${activity.actType.toLowerCase()} is already referenced by another activity by invoiceLogId: ${refAct.invoiceId}`, 'warn', NAME );
                        return itcb( null );
                    }

                    if ( refAct.invoiceId !== activityId && refAct.diagnosisType !== 'CONTINUOUS' ) {
                        refAct.fields.push( 'invoiceId' );
                        refAct.invoiceId = activityId;
                    }
                    if ( activity.invoiceLogType && refAct.invoiceLogType !== activity.invoiceLogType ) {
                        refAct.fields.push( 'invoiceLogType' );
                        refAct.invoiceLogType = activity.invoiceLogType;
                    }
                    break;

                case 'INVOICEREF-RECEIPT':
                case 'INVOICEREF-CREDITNOTE':
                case 'INVOICEREF-WARNING1':
                case 'INVOICEREF-WARNING2':
                case 'INVOICEREF-BADDEBT':
                case 'INVOICEREF-REMINDER':
                case 'INVOICE-RECEIPT':
                case 'INVOICE-CREDITNOTE':
                case 'INVOICE-WARNING1':
                case 'INVOICE-WARNING2':
                case 'INVOICE-BADDEBT':
                case 'INVOICE-REMINDER':
                    //  use of activities array for forward link on receipt is deprecated, now uses referencedBy,
                    //  still used when creating receipts on client, until new receipt is saved it can't be referencedBy
                    if ( refAct.activities && refAct.activities.length > 0 ) {
                        refAct.activities = [];
                        refAct.fields.push( 'activities' );
                    }
                    if ( refAct.invoiceNo !== activity.invoiceNo ) {
                        refAct.invoiceNo = activity.invoiceNo || '';
                        refAct.fields.push( 'invoiceNo' );
                    }
                    if ( refAct.invoiceText !== activity.content ) {
                        refAct.invoiceText = activity.content || '';
                        refAct.fields.push( 'invoiceText' );
                    }
                    break;
            }

            itcb( null );
        }

        //  3.  Look for activities which claim to be referencedBy the current one, but are not
        function findBrokenBacklinks( itcb ) {

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'query': {
                    '_id': { '$nin': refs },
                    'referencedBy': activityId
                },
                //'options': { 'fields': getFields },
                'callback': onBrokenLoaded
            } );

            function onBrokenLoaded( err, result ) {
                if ( err ) { return itcb( err ); }
                Y.log( `Found ${result.length} dereferenced activities to be unlinked.`, 'debug', NAME );
                dereferencedActivities = result;
                itcb( null );
            }
        }

        //  4.  Update all references from linked activities where they should be removed
        function removeBrokenBacklinks( itcb ) {
            if ( 0 === dereferencedActivities.length ) { return itcb( null ); }
            async.eachSeries( dereferencedActivities, removeSingeBrokenBacklink, itcb );
            //itcb( null );
        }

        //  4.1 Update referencedBy and other reverse links where entries should be removed
        function removeSingeBrokenBacklink( derefAct, itcb ) {

            let
                relationshipName = `${activity.actType  }-${derefAct.actType}`,
                refBy = derefAct.referencedBy || [],
                i;

            //  remove backlink from referencedBy (always)
            for ( i = 0; i < refBy.length; i++ ) {
                if ( refBy[i] === activityId ) {
                    refBy.splice( i, 1 );
                }
            }


            // checking for incorect remove from referencedBy and set it back
            if( ( 'INVOICEREF' === derefAct.actType || 'INVOICE' === derefAct.actType ) && Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) && 0 === activity.referencedBy.length ) {
                derefAct.receipts.forEach(( receipt ) => {
                    if( receipt === activityId) {
                        activity.referencedBy.push( receipt );
                    }
                });
            }

            //  dereferenced activities are always changed, because referencedBy always needs to be updated
            derefAct.fields = [ 'referencedBy' ];

            //  special cases for other activity types

            switch( relationshipName ) {
                case 'PRESCRT-MEDICATION':                  //  deliberate fallthrough
                case 'PRESCRG-MEDICATION':                  //  deliberate fallthrough
                case 'PRESCRBTM-MEDICATION':                //  deliberate fallthrough
                case 'PRIVPRESCR-MEDICATION':               //  deliberate fallthrough
                case 'PUBPRESCR-MEDICATION':
                    //  remove reciprocal activity link (deprecated)
                    for (i = 0; i < derefAct.activities.length; i++) {
                        if (derefAct.activities[i] === activityId) {
                            derefAct.activities.splice( i, 1 );
                        }
                    }
                    //  check isPrescribed / ist verordnet property after change
                    //  use of activities array is deprecated for isPrescribed
                    derefAct.isPrescribed = ( ( derefAct.activities.length > 0) || ( derefAct.referencedBy.length > 0 ) );
                    derefAct.fields.push( 'activities' );
                    derefAct.fields.push( 'isPrescribed' );
                    break;

                case 'INVOICEREF-TREATMENT':
                case 'INVOICE-TREATMENT':
                case 'INVOICEREF-MEDICATION':
                case 'INVOICE-MEDICATION':
                    if ( derefAct.invoiceId === activityId ) {
                        //derefAct.invoiceId = null;
                        derefAct.fields.push( '$unset' );
                        derefAct.$unset = { 'invoiceId': 1 };
                    }
                    break;

                case 'INVOICEREF-RECEIPT':
                case 'INVOICE-RECEIPT':
                    derefAct.invoiceNo = '';
                    derefAct.invoiceText = '';
                    //  receipts can only have one linked activity, and it should be an invoice
                    derefAct.activities = [];
                    derefAct.fields.push( 'invoiceNo', 'invoiceText', 'activities' );
                    break;

            }
            itcb( null );
        }


        //  5.  Save changed activities back to database
        function saveChangedActivities( itcb ) {
            let
                changedActivities = [],
                i;

            for ( i = 0; i < referencedActivities.length; i++ ) {
                if ( referencedActivities[i].fields && referencedActivities[i].fields.length > 0 ) {
                    Y.log( `Updating referenced activity: ${referencedActivities[i]._id}`, 'debug', NAME );
                    changedActivities.push( referencedActivities[i] );
                }
            }

            for ( i = 0; i < dereferencedActivities.length; i++ ) {
                if ( dereferencedActivities[i].fields && dereferencedActivities[i].fields.length > 0 ) {
                    Y.log( `Updating dereferenced activity: ${dereferencedActivities[i]._id}`, 'debug', NAME );
                    changedActivities.push( dereferencedActivities[i] );
                }
            }

            if ( 0 === changedActivities.length ) { return itcb( null ); }
            async.eachSeries( changedActivities, saveSingleChangedActivity, itcb );
        }

        //  5.1 Run update on single changed activity
        function saveSingleChangedActivity( saveAct, itcb ) {
            let putFields, putData = {}, i;

            putFields = saveAct.fields;

            for ( i = 0; i < putFields.length; i++ ) {
                putData[ putFields[i] ] = saveAct[ putFields[i] ];
            }

            putData = Y.doccirrus.filters.cleanDbObject( putData );

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'update',
                'query': { _id: saveAct._id  },
                'data': putData,
                'fields': putFields,
                'callback': onChangedActivitySaved
            } );

            function onChangedActivitySaved( err ) {
                if ( err ) { return itcb( err ); }
                Y.log( `Saved updated activity: ${saveAct._id}`, 'debug', NAME );
                changedActivityIds.push( saveAct._id );
                itcb( null );
            }

        }

        //  X.  Finally
        function onAllDone( err ) {
            if ( err ) {
                Y.log( `Problem updating reciprocal links: ${JSON.stringify( err )}`, 'warn', NAME );
                if ( callback ) { return callback( err ); }
                return;
            }

            let msg = `Reciprocal links updated for ${activity.actType} activity ${activity._id}`;

            if ( changedActivityIds.length > 0 ) {
                Y.doccirrus.api.linkedactivities.notifyLinkedActivityChanges( user, changedActivityIds );
                Y.log( `${msg  } changes: ${JSON.stringify( changedActivityIds )}`, 'debug', NAME );
            } else {
                Y.log( msg, 'debug', NAME );
            }

            if ( callback ) { return callback( null, activity ); }
        }

    }

    /**
     *  Remove references to an activity after it is deleted (or cancelled, or derecognized?)
     *
     *  Removing some links requires extra work, such as adjusting outstanding balance on invoices
     *  but most can be handled in a general manner
     *
     *  Overall process
     *
     *      1.  Load all activities which refer to this one (pre-stored in activity.referencedBy)
     *      2.  Remove now broken reference from any activities which link to this one from any property
     *      2.1 Make database update to remove references to this from a single other activity
     *      2.2 Include any additional reference fields depending on activity type (invoiceId, icdsExtra, etc)
     *
     *  @param  {Object}    user
     *  @param  {Object}    activity            From activity process
     *  @param  {Object}    ignoreActivities    Activities simultaneously deleted, no need to fix them
     *  @param  {Function}  callback            Of the form fn( err, activity )
     */

    function clearBacklinks( user, activity, ignoreActivities, callback ) {
        const async = require( 'async' );

        let
            changedActivityIds = [],
            referencingActivities = [],
            treatmentsToClear = [];

        async.series( [ getReferencingActivities, removeFromReferencingActivities, deleteInvoiceIds ], onAllDone );

        //  1.  Load all activities which refer to this one (pre-stored in activity.referenedBy)
        function getReferencingActivities( itcb ) {
            let
                referencesFound = getAllReferences( activity ),
                referencesToLoad = [],
                i;

            activity.referencedBy = activity.referencedBy || [];
            referencesFound.push( ...activity.referencedBy );

            //  omit any references which are being deleted in the same batch, avoid race condition and unncessary work
            for ( i = 0; i < referencesFound.length; i++ ) {
                if ( -1 === ignoreActivities.indexOf( referencesFound[i] ) ) {
                    referencesToLoad.push( referencesFound[i] );
                }
            }

            Y.log( `Updated list of references to load: ${JSON.stringify( referencesToLoad )}`, 'debug', NAME );

            //  if nothing references this then we're done
            if ( 0 === referencesToLoad.length ) { return itcb( null ); }

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'query': { '_id': { '$in': referencesToLoad } }
            }, onReferencingActivitiesLoaded );

            function onReferencingActivitiesLoaded( err, result ) {
                if ( err ) { return itcb( err ); }

                referencingActivities = result;
                itcb( null );
            }

        }

        //  2.  Remove now broken reference from any activities which link to this one from any property
        function removeFromReferencingActivities( itcb ) {
            //  if nothing refers to this activity we can skip this step
            if ( 0 === referencingActivities.length ) { return itcb( null ); }
            async.eachSeries( referencingActivities, removeFromSingleReferencingActivity, itcb );
        }

        //  2.1  Make database update to remove references to this from a single other activity
        function removeFromSingleReferencingActivity( refAct, itcb ) {

            let
                putRequest,
                putData = {
                    'fields_': [ ]
                };

            refAct = removeActivityReference( refAct, activity._id.toString(), putData );

            putData = getUpdatesToReferencingActivities( refAct, putData );

            if ( 0 === putData.fields_.length ) {
                //  no changes needed to referenced activity
                return itcb( null );
            }

            putData = Y.doccirrus.filters.cleanDbObject( putData );

            changedActivityIds.push( refAct._id.toString() );

            putRequest = {
                'user': user,
                'model': 'activity',
                'action': 'put',
                'query': { '_id': refAct._id },
                'data': putData,
                'callback': onLinkRemoved
            };

            Y.doccirrus.mongodb.runDb( putRequest );

            function onLinkRemoved( err ) {
                if ( err ) {
                    Y.log( `Problem cleaning up reciprocal links from ${refAct._id} to ${activity._id}: ${JSON.stringify( err )}`, 'warn', NAME );
                    Y.log( `Retry with UPDATE operation: ${refAct._id}`, 'debug', NAME );
                    //  try again without post-processes, best effort
                    putRequest.action = 'update';
                    putRequest.callback = onRetryLinkRemoved;
                    Y.doccirrus.mongodb.runDb( putRequest );
                    return;
                }

                itcb( null );
            }

            function onRetryLinkRemoved( err ) {
                if ( err ) {
                    Y.log( `Could not clear reciprocal links with update operation: ${JSON.stringify(err)}`, 'error', NAME );
                    //  do not block update, best effort
                }
                itcb( null );
            }
        }

        //  2.2 Include any additional reference fields depending on activity type (invoiceId, icdsExtra, etc)
        function getUpdatesToReferencingActivities( refAct, putData ) {
            let
                relationshipName = `${activity.actType  }-${refAct.actType}`;

            switch( relationshipName ) {

                //  when deleting an invoice, its treatments are no longer billed, and don't carry the invoice _id.
                case 'INVOICEREF-TREATMENT':
                case 'INVOICE-TREATMENT':
                case 'INVOICEREF-MEDICATION':
                case 'INVOICE-MEDICATION':
                    //  'put' operation does not delete field, queue for separate update operation to delete fields
                    treatmentsToClear.push( refAct );
                    break;

                //  when deleting a receipt, any invoice it links to will need to update its receipts array (and recalculate)
                //  in the reverse direction, nothing further needs to be done (receipt already freed from activities array)
                //  Note: Since EXTMOJ-2034 this also applies to CREDITNOTES, WARNING, BADDEBT and other activities which
                //  affect the outstandign balance of an invoice
                case 'RECEIPT-INVOICEREF':
                case 'CREDITNOTE-INVOICEREF':
                case 'WARNING1-INVOICEREF':
                case 'WARNING2-INVOICEREF':
                case 'BADDEBT-INVOICEREF':
                case 'REMINDER-INVOICEREF':
                case 'RECEIPT-INVOICE':
                case 'CREDITNOTE-INVOICE':
                case 'WARNING1-INVOICE':
                case 'WARNING2-INVOICE':
                case 'BADDEBT-INVOICE':
                case 'REMINDER-INVOICE':

                    putData.receipts = refAct.receipts;

                    //  remove this receipt from the invoice total
                    refAct.totalReceipts = parseFloat( refAct.totalReceipts || 0 ) - parseFloat( activity.amount );
                    refAct.totalReceiptsOutstanding = parseFloat( refAct.totalReceiptsOutstanding || 0 ) + parseFloat( activity.amount );
                    putData.fields_.push( 'receipts', 'totalReceipts', 'totalReceiptsOutstanding' );
                    break;

            }


            //  when deleting a prescription, medications may no longer be prescribed
            //  medications can only link to prescriptions, if they have no linked activities, they are no longer prescribed
            if ( Y.doccirrus.schemas.activity.isPrescriptionType( activity.actType ) && 'MEDICATION' === refAct.actType ) {
                if ( !refAct.activities || 0 === refAct.activities.length ) {
                    putData.isPrescribed = false;
                    putData.fields_.push( 'isPrescribed' );
                }
            }

            //  Anything with HasDiagnosis_T (FORM, SCHEIN, ETC) might have icds / icdsExtra to clean up
            if ( 'DIAGNOSIS' === activity.actType && refAct.hasOwnProperty( 'icds' ) ) {
                putData.icds = refAct.icds || [];
                putData.icdsExtra = refAct.icdsExtra || [];
                putData.fields_.push( 'icds', 'icdsExtra' );
            }

            return putData;
        }

        //  3.  Delete invoiceId fields where treatments have been unlinked from invoices
        //  (deleting fields is a special operation, separate from updating the value of fields)
        function deleteInvoiceIds( itcb ) {
            if ( 0 === treatmentsToClear.length ) { return itcb( null ); }
            async.eachSeries( treatmentsToClear, clearInvoiceId, itcb );
        }

        //  3.1 Remove invoiceId from single dereferenced treatment
        function clearInvoiceId( treatment, itcb ) {
            Y.log( `Deleting invoiceId on treatment which is no longer linked: ${treatment._id}`, 'debug', NAME );
            changedActivityIds.push( treatment._id.toString() );
            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'update',
                'query': { '_id': treatment._id },
                'data': { '$unset': { 'invoiceId': 1 } },
                'callback': itcb
            } );
        }

        //  X.  Finished
        function onAllDone( err ) {
            if ( err ) {
                Y.log( `Problem removing reciprocal links: ${JSON.stringify( err )}`, 'warn', NAME );
                return;
            }

            Y.log( `Reciprocal links removed for deleted ${activity.actType} activity ${activity._id}`, 'debug', NAME );

            //  websocket event to update activity table in casefile
            if ( changedActivityIds.length > 0 ) {
                Y.doccirrus.api.linkedactivities.notifyLinkedActivityChanges( user, changedActivityIds );
                Y.log( `Notifying client of changes to linked activities: ${JSON.stringify( changedActivityIds )}`, 'debug', NAME );
            }

            callback( null, activity );
        }

    }

    /**
     *  When a child activity has changed, editable parent activites should be marked invalid and their forms set to
     *  remap linked activities (eg, treatment is deleted, invoice needs to reflect that)
     *
     *  TODO: consider running this out of sequence
     *
     *  @param  {Object}    user
     *  @param  {Object}    activity
     *  @param  {Object]    modifiedPaths
     *  @param  {Function}  callback
     */

    function invalidateParentActivities( user, activity, modifiedPaths, callback ) {
        const
            async = require( 'async' );
        const complexActivityTypes = new Set( [
            "DOCLETTER",
            "FORM",
            "PUBPRESCR",
            "QUOTATION",
            "SURGERY",
            "RIVPRESCR",
            "INVOICE",
            "PRESASSISTIVE",
            "PRESCRBTM",
            "PRESCRG",
            "PRESCRT"
        ] );
        var
            toNotifyClient = [];

        if ( !activity.referencedBy || 0 === activity.referencedBy.length || activity.wasNew ) {
            return callback( null, activity );
        }

        const query = {
            _id: {$in: activity.referencedBy},
            status: {$ne: 'CREATED'},
            actType: {$in: Array.from( complexActivityTypes )} // MOJ-10202: Only invalidate "complex activity" types
        };

        Y.doccirrus.mongodb.runDb( {
            'user': user,
            'model': 'activity',
            'query': query,
            'callback': onParentsLoaded
        } );

        function onParentsLoaded( err, result ) {
            if ( err ) {
                Y.log( `Could not load parent activities: ${JSON.stringify( err )}`, 'warn', NAME );
                return callback( err );
            }
            async.eachSeries( result, markParentInvalid, onOpenParentsInvalidated );
        }

        function markParentInvalid( parentAct, itcb ) {

            //  we only make changes to unapproved parent activities
            if ( 'VALID' !== parentAct.status && 'INVALID' !== parentAct.status && 'CREATED' !== parentAct.status) {
                return itcb( null );
            }

            //  skip circularly linked treatments (legacy data), we only use the invoice _id and this does not change
            if ( ( 'INVOICEREF' === activity.actType || 'INVOICE' === activity.actType ) && 'TREATMENT' === parentAct.actType ) {
                return itcb( null );
            }

            //  skip DOCLETTER after TREATMENT links changed (ie, on INVOICE change or deletion), MOJ-10520
            if ( 'TREATMENT' === activity.actType && 'DOCLETTER' === parentAct.actType ) {
                if ( -1 !== modifiedPaths.indexOf( 'invoiceId' ) || -1 !== modifiedPaths.indexOf( 'referencedBy' ) ) {
                    return itcb( null );
                }
            }

            toNotifyClient.push( {
                'activityId': parentAct._id,
                'actType': parentAct.actType,
                'status': parentAct.status,
                'timestamp': parentAct.timestamp,
                'userContent': parentAct.userContent,
                'content': parentAct.content,
                'patientName': `${parentAct.patientFirstName} ${parentAct.patientLastName}`
            } );

            invalidateSingleParent( user, parentAct, itcb );
        }

        function onOpenParentsInvalidated( err ) {
            if ( err ) { return callback( err ); }

            if (toNotifyClient.length) {
                //  open a modal on the client
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: 'parentActivityInvalid',
                    msg: { data: toNotifyClient }
                } );
            }

            callback( null, activity );
        }

    }

    /**
     * get linked activities
     * private
     *
     * @param user
     * @param activity
     * @returns {Array}
     */
    async function getLinkedActivities( user, activity ) {
        if( !activity.activities ) {
            activity.activities = [];
        }

        if( !activity.referencedBy ) {
            activity.referencedBy = [];
        }
        const
            activities = activity.activities,
            referencedBy = activity.referencedBy;

        return Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            query: {
                actType: 'TREATMENT',
                _id: { $in: activities.concat( referencedBy ) }
            },
            options: {
                select: {
                    code: 1,
                    referencedBy: 1,
                    activities: 1,
                    hierarchyRules: 1,
                    treatmentCategory: 1,
                    side: 1,
                    sideMandatory: 1
                }
            }
        } );
    }

    /**
     *  1. function checks if side was changed
     *  2. if side was changed then get main treatment
     *  3. changes side for all linked side related activities
     *
     *
     * @param {object} user
     * @param {object} activity
     * @param {function} callback
     * @returns {Promise<void>}
     */
    async function checkAndReplaceSide( user, activity, callback ) {
        const
            leanActivity = activity.toObject ? activity.toObject() : activity,
            activitySide = leanActivity.side,
            activities = leanActivity.activities,
            referencedBy = leanActivity.referencedBy;
        let
            err,
            result,
            mainActivity;

        //skip for non hierarchy related codes
        if( !activity.treatmentCategory || !['Zuschlagsleistung', 'Hauptleistung', 'Referenzleistung'].includes( activity.treatmentCategory ) ) {
            Y.log( `checkAndReplaceSide: wrong treatmentCategory for ${activity.actType} ${activity.code} (${activity._id})`, 'info', NAME );
            return callback( null, activity );
        }

        if( 'Hauptleistung' !== leanActivity.treatmentCategory ) {
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: 'TREATMENT',
                    sideMandatory: true,
                    treatmentCategory: 'Hauptleistung',
                    _id: {$in: activities.concat( referencedBy )}
                }
            } ) );

            if( err ) {
                Y.log( `checkAndReplaceSide: Error in looking for Hauptleistung related to current. ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            mainActivity = result && result[0];
        } else {
            mainActivity = leanActivity;
        }

        if( !mainActivity || mainActivity && !(mainActivity.activities || mainActivity.referencedBy) ) {
            Y.log( `checkAndReplaceSide: not found main activity related to ${activity.actType} ${activity.code} (${activity._id})`, 'info', NAME );
            return callback( null, activity );
        }

        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            query: {
                actType: 'TREATMENT',
                sideMandatory: true,
                side: {$ne: activitySide},
                _id: {$in: mainActivity.activities.concat( mainActivity.referencedBy )}
            }
        } ) );

        if( err ) {
            Y.log( `checkAndReplaceSide: Error in looking for related treatments. ${err.sttack || err}`, 'error', NAME );
            throw err;
        }

        if( result && result.length ) {
            let
                activitiesToUpdate = result.concat( mainActivity ),
                treatment;
            for( treatment of activitiesToUpdate ) {
                if( activitySide !== treatment.side && treatment._id !== activity._id ) {
                    treatment.side = activitySide;
                    // update found activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        query: {
                            _id: treatment._id
                        },
                        data: Y.doccirrus.filters.cleanDbObject( treatment )
                    } ) );

                    if( err ) {
                        Y.log( `checkAndReplaceSide: Error in safely update TREATMENT activity. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                }
            }
        }

        callback( null, activity );
    }



    /**
     *  function for create and link TREATMENT activities
     *
     *
     * @param user
     * @param activity
     * @param prepareOnly
     * @param callback
     * @returns {Promise<void>}
     */
    async function createAndLinkTarmedTreatments( user, activity, prepareOnly, callback ) {
        const
            catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: activity.actType,
                short: activity.catalogShort
            } ),
            updateActivitySafeP = promisifyArgsCallback( Y.doccirrus.api.activity.updateActivitySafe );
        let
            rule, err, result, savedActivities, isNewActivities = false;

        //skip for non hierarchy related codes
        if( !activity.treatmentCategory || !['Zuschlagsleistung', 'Hauptleistung', 'Referenzleistung'].includes(activity.treatmentCategory) ) {
            Y.log( `createAndLinkTarmedTreatments: wrong treatmentCategory for ${activity.actType} ${activity.code} (${activity._id})`, 'info', NAME );
            return callback( null, activity );
        }

        // get linked activities
        [err, result] = await formatPromiseResult( getLinkedActivities( user, activity ) );

        if( err ) {
            Y.log( `createAndLinkTarmedTreatments: Error in getting linked activities. ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        savedActivities = result;

        const preparedActivities = [];

        for( rule of activity.hierarchyRules ) {
            //get all possible code substitutions to correctly check linked activities
            let pseudoActivity = {
                    catalogShort: activity.catalogShort,
                    code: rule.seq
                },
                codesToCheck = [ rule.seq ];
            if( rule.checked ){
                Y.doccirrus.api.catalog.convertGopCode(pseudoActivity);
                if( pseudoActivity.u_extra && pseudoActivity.u_extra.sub_gop_liste && pseudoActivity.u_extra.sub_gop_liste.gnrs ){
                    pseudoActivity.u_extra.sub_gop_liste.gnrs.forEach( el => {
                        codesToCheck.push( el.code );
                    });
                }
            }

            // to avoid multi-creation
            let
                isAlreadyCreated = savedActivities.some( ( act ) => { // eslint-disable-line
                    return codesToCheck.includes( act.code ) && (activity.sideMandatory && act.sideMandatory && act.side ? act.side === activity.side : true);
                });
            // if created no need to create more
            if( rule.checked && !isAlreadyCreated ) {
                const
                    invoiceFactorP = promisifyArgsCallback( Y.doccirrus.api.invoiceconfiguration.invoicefactor ),
                    setActivityDataP = promisifyArgsCallback( Y.doccirrus.schemas.activity._setActivityData ),
                    createActivitySafeP = promisifyArgsCallback( Y.doccirrus.api.activity.createActivitySafe ),
                    getTarmedInvoiceFactorP = promisifyArgsCallback( Y.doccirrus.api.invoiceconfiguration.getTarmedInvoiceFactor ),
                    code = rule.seq,
                    explanations = '';
                let userContent, catalogRef;

                if( prepareOnly ) {
                    // check if activity exists in APK. to avoid rule conflict
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            actType: 'TREATMENT',
                            code,
                            apkState: activity.apkState || 'IN_PROGRESS',
                            hierarchyRules: {$exists: true},
                            caseFolderId: activity.caseFolderId,
                            timestamp: {
                                $lte: moment( activity.timestamp ).clone().endOf( 'day' ).toDate(),
                                $gte: moment( activity.timestamp ).startOf( 'day' ).toDate()
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `checkAndLinkIfExists: Error in looking for corresponding catalog entry. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    if( result && result[0] ) {
                        continue;
                    }
                }

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        seq: code,
                        catalog: catalogDescriptor && catalogDescriptor.filename || ''
                    }
                } ) );

                if( err ) {
                    Y.log( `createAndLinkTarmedTreatments: Error in looking for corresponding catalog entry. ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                let entry = result && result[0] || {};
                userContent = entry.title;
                catalogRef = entry.catalog;

                // treatments have same category cannot be linked
                if( activity.treatmentCategory !== entry.treatmentCategory ) {
                    [err, result] = await formatPromiseResult(
                        invoiceFactorP( {
                            user,
                            data: {timestamp: activity.timestamp}
                        } )
                    );

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Error in looking for corresponding billingFactorValue. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    let billingFactorValue = result.factor || '1';

                    [err, result] = await formatPromiseResult(
                        setActivityDataP( {
                            user, entry,
                            initData: {
                                actType: "TREATMENT",
                                catalogShort: activity.catalogShort,
                                locationId: activity.locationId,
                                billingFactorValue
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Error in creating TREATMENT activity. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    let source = {
                        status: "CREATED",
                        fk5035Set: [],
                        userContent,
                        explanations,
                        catalogRef,
                        catalog: true
                    };

                    let fullTreatmentActivity = Object.assign(
                        _.omit( ( activity.toObject ? activity.toObject() : activity ), ["_id", "status", "__t", "activities", "referencedBy", "daySeparation"] ),
                        result,
                        source
                    ),
                    catalogCodes;

                    fullTreatmentActivity.activities = [];
                    fullTreatmentActivity.referencedBy = [];

                    // get code and fields from catalog
                    if( 'Hauptleistung' === entry.treatmentCategory ) {
                        let
                            groupCodes = ( entry.u_extra && entry.u_extra.treatmentGroups || [] ).map( function( i ) {
                                return i.code;
                            }),
                            excludedDivisionCodes = ['5000'], //codes should not be visible in practice
                            blockRules = ( entry.u_extra && entry.u_extra.blocRules || [] ).map( function( i ) {
                                return i.code;
                            }),
                            hasImagingDevice,
                            query = {
                                $or: [
                                    {
                                        treatmentCategory: 'Referenzleistung',
                                        divisionCode: {$nin: excludedDivisionCodes},
                                        'u_extra.cumulationRules': {
                                            $elemMatch: {
                                                'slaveSeq': {$in: groupCodes},
                                                'slaveType': 'G',
                                                'type': 'X'
                                            }
                                        }

                                    },
                                    {
                                        treatmentCategory: 'Zuschlagsleistung',
                                        'u_extra.hierarchyRules.seq': code
                                    }
                                ],
                                catalog: catalogDescriptor && catalogDescriptor.filename || ''
                            };

                        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'invoiceconfiguration',
                            options: {
                                lean: true
                            }
                        } ) );

                        if( err ) {
                            // continue
                            Y.log( `createAndLinkTarmedTreatments: Error in getting invoiceconfiguration. ${err.stack || err}`, 'error', NAME );
                            hasImagingDevice = false;
                        }

                        if( result && result[0] ) {
                            hasImagingDevice = result[0].hasImagingDevice;
                        }

                        if( hasImagingDevice && blockRules.length ) {
                            let divisionCode = entry.divisionCode && entry.divisionCode.toString(),
                                orQuery = {
                                    $and: [
                                        {divisionCode: {$nin: excludedDivisionCodes}},
                                        {divisionCode: divisionCode}
                                    ],
                                    treatmentCategory: 'Referenzleistung',
                                    'u_extra.blocRules.code': {$in: blockRules}
                                };

                            orQuery.seq = {$in: ['39.2000', '39.3800', '39.5300', '39.4300', '39.7300']};
                            query.$or.push( orQuery );
                        }


                        // this means new activity hasn't codes, need to load from db
                        [err, catalogCodes] = await formatPromiseResult( Y.doccirrus. mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'catalog',
                            query,
                            options: {
                                select: {
                                    seq: 1,
                                    validFrom: 1,
                                    validUntil: 1,
                                    title: 1
                                }
                            }
                        } ) );

                        if( err ) {
                            Y.log( `createAndLinkTarmedTreatments: Error in creating geting codes from catalog. ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        // setting hierarchyRules from DB
                        fullTreatmentActivity.hierarchyRules = catalogCodes.map( ( r ) => {
                            return {
                                checked: r.seq === activity.code,
                                seq: r.seq,
                                title: r.title,
                                validFrom: r.validFrom,
                                validUntil: r.validUntil
                            };
                        });
                        fullTreatmentActivity.referencedBy.push( activity._id.toString() );
                        fullTreatmentActivity.timestamp = moment( activity.timestamp ).subtract(1, 's').toDate();
                    } else {
                        let
                            codes = fullTreatmentActivity.u_extra.hierarchyRules.map( ( r )  => {
                                return r.seq;
                            }),
                            codesGroup = fullTreatmentActivity.u_extra.cumulationRules.filter( function( item ) {
                                return "X" === item.type && "G" === item.slaveType;
                            }).map( ( r )  => {
                                return r.slaveSeq;
                            });
                        [err, catalogCodes] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'catalog',
                            query: {
                                treatmentCategory: 'Hauptleistung',
                                $or: [
                                    {'u_extra.treatmentGroups.code': { $in: codesGroup }},
                                    {seq: { $in: codes }}
                                ],
                                catalog: catalogDescriptor && catalogDescriptor.filename || ''
                            },
                            options: {
                                select: {
                                    seq: 1,
                                    validFrom: 1,
                                    validUntil: 1,
                                    title: 1
                                }
                            }
                        } ) );

                        if( err ) {
                            Y.log( `createAndLinkTarmedTreatments: Error in creating geting codes from catalog. ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        fullTreatmentActivity.hierarchyRules = catalogCodes.map( ( r)  => {
                            return {
                                checked: r.seq === activity.code,
                                seq: r.seq,
                                title: r.title,
                                validFrom: r.validFrom,
                                validUntil: r.validUntil
                            };
                        });
                        fullTreatmentActivity.activities.push( activity._id.toString() );
                        fullTreatmentActivity.timestamp = moment( activity.timestamp ).add(1, 's').toDate();
                    }

                    // need this block to calculate treatment price
                    let tarmedScalingFactors, tarmedTaxPointValues, caseFolderData, caseFolder, locationData, location;

                    [err, tarmedScalingFactors] = await formatPromiseResult(Y.doccirrus.api.invoiceconfiguration.getScalingFactorsForTarmedPrices( user ));

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Failed to get tarmedTaxPointValues from invoiceconfiguration ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    tarmedTaxPointValues = tarmedScalingFactors.taxPointValues;

                    [err, caseFolderData] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'casefolder',
                            query: {
                                _id: activity.caseFolderId,
                                patientId: activity.patientId
                            },
                            options: {
                                select: {
                                    type: 1
                                }
                            }
                        }));

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Failed to get caseFolder from activity.caseFolderId ${activity.caseFolderId} ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    if( !Array.isArray( caseFolderData ) || !caseFolderData.length ) {
                        Y.log( `createAndLinkTarmedTreatments: no result of caseFolder from activity.caseFolderId ${activity.caseFolderId}`, 'error', NAME );
                        throw new Error( 'caseFolder not found' );
                    }

                    caseFolder = caseFolderData[0];

                    [err, locationData] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'location',
                            query: {
                                _id: activity.locationId
                            },
                            options: {
                                select: {
                                    cantonCode: 1
                                }
                            }
                        }));

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Failed to get location from activity.locationId ${activity.locationId} ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    if( !Array.isArray( locationData ) || !locationData.length ) {
                        Y.log( `createAndLinkTarmedTreatments: Failed to get location from activity.locationId ${activity.locationId}`, 'error', NAME );
                        throw new Error( 'location not found' );
                    }

                    location = locationData[0];

                    // price calculation
                    const
                        relevantTaxPointEntry = Y.doccirrus.commonutilsCh.getRelevantTarmedTaxPointEntry({
                            cantonCode: location.cantonCode,
                            caseFolderType: caseFolder.type,
                            tarmedTaxPointValues,
                            date: activity.timestamp || moment().toDate()
                        });

                    if( !relevantTaxPointEntry || !relevantTaxPointEntry.value ) {
                        Y.log( `createAndLinkTarmedTreatments: Failed to get TaxPointEntry from activity locationId ${activity.locationId} and caseFolder ${activity.locationId}`, 'error', NAME );
                        throw new Error( 'cannot get taxPoints' );
                    }

                    fullTreatmentActivity.taxPointValue = relevantTaxPointEntry.value * 0.01;

                    let tarmedFactor;
                    [err, tarmedFactor] = await formatPromiseResult(
                        getTarmedInvoiceFactorP( {
                            user,
                            originalParams: {
                                employeeId: activity.employeeId,
                                caseFolderId: activity.caseFolderId
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Error in obtaining medicalScalingFactor from invoice configurations. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    if( fullTreatmentActivity.medicalScalingFactor === 1 ) {
                        fullTreatmentActivity.medicalScalingFactor = tarmedFactor || 1;
                    }

                    let tarmedPrice = Y.doccirrus.commonutilsCh.calculateTarmedPrice({
                        tarmedScalingFactors,
                        caseFolderType: caseFolder.type,
                        cantonCode: location.cantonCode,
                        treatment: fullTreatmentActivity
                    });

                    // set recalculated price to activity
                    fullTreatmentActivity.price = tarmedPrice || 0;

                    if( prepareOnly ) {
                        preparedActivities.push(fullTreatmentActivity);
                        continue;
                    }

                    [err, result] = await formatPromiseResult(
                        createActivitySafeP( {
                            user,
                            data: fullTreatmentActivity
                        } )
                    );

                    if( err ) {
                        Y.log( `createAndLinkTarmedTreatments: Error in safely saving TREATMENT activity. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    // link to created activity
                    if( 'Zuschlagsleistung' === activity.treatmentCategory && 'Referenzleistung' === activity.treatmentCategory ) {
                        activity.activities.push( result );
                    }

                    if( 'Hauptleistung' === activity.treatmentCategory ) {
                        activity.referencedBy.push( result );
                    }

                    isNewActivities = true;
                }
            }
        }

        if( isNewActivities && !prepareOnly ) {
            // update current activity and UI table
            [err] = await formatPromiseResult(
                updateActivitySafeP( {
                    user,
                    data: {
                        activity: activity.toObject ? activity.toObject() : activity
                    }
                } )
            );

            if( err ) {
                Y.log( `createAndLinkTarmedTreatments: Error in safely update TREATMENT activity. ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            // update caseFolder
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: activity.caseFolderId
                }
            } );
        }

        if(prepareOnly){
            return callback( null, [JSON.parse(JSON.stringify(activity)), ...preparedActivities]);
        }

        callback( null, activity );
    }

    /**
     *  function for create DIAGNOSIS activities
     *
     *
     * @param user
     * @param activity
     * @param callback
     * @returns {Promise<void>}
     */
    async function createRelatedDiagnosis( user, activity, callback ) {
        const
            catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: activity.actType,
                short: 'TESS-KAT'
            } );
        let
            code, err, result, isNewActivities = false;

        for( code of activity.relatedCodes ) {
            if( code.checked ) {
                const
                    seq = code.seq,
                    createActivitySafeP = promisifyArgsCallback( Y.doccirrus.api.activity.createActivitySafe );
                let userContent, catalogRef;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalog',
                    query: {
                        seq,
                        catalog: catalogDescriptor && catalogDescriptor.filename || ''
                    }
                } ) );

                if( err ) {
                    Y.log( `createRelatedDiagnosis: Error in looking for corresponding catalog entry. ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                let entry = result && result[0] || {};
                userContent = entry.title;
                catalogRef = entry.catalog;
                let source = {
                    status: "CREATED",
                    userContent,
                    catalogRef,
                    code: seq,
                    catalogShort: 'TESS-KAT',
                    diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
                    catalog: true
                };

                let fullDiagnosisActivity = Object.assign(
                    _.omit( activity.toObject(), ["_id", "status", "daySeparation", "diagnosisTreatmentRelevance"] ),
                    result,
                    source
                );

                switch( fullDiagnosisActivity.diagnosisSite ) {
                    case 'LEFT':
                        fullDiagnosisActivity.diagnosisLaterality = '01';
                    break;
                    case 'RIGHT':
                        fullDiagnosisActivity.diagnosisLaterality = '02';
                        break;
                    case 'BOTH':
                        fullDiagnosisActivity.diagnosisLaterality = '0102';
                        break;
                }

                if( 'ACUTE' === fullDiagnosisActivity.diagnosisType ) {
                    fullDiagnosisActivity.diagnosisPeriod = '03';
                } else {
                    fullDiagnosisActivity.diagnosisPeriod = '04';
                }

                if( code.I ) {
                    fullDiagnosisActivity.diagnosisInfectious = true;
                }
                if( code.F ) {
                    fullDiagnosisActivity.diagnosisFunctional = true;
                }
                if( code.N ) {
                    fullDiagnosisActivity.diagnosisNeoplasia = true;
                }
                if( code.B ) {
                    fullDiagnosisActivity.diagnosisOcupationally = true;
                }

                [err, result] = await formatPromiseResult(
                    createActivitySafeP( {
                        user,
                        data: fullDiagnosisActivity
                    } )
                );

                if( err ) {
                    Y.log( `createRelatedDiagnosis: Error in safely saving DIAGNOSIS activity. ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                isNewActivities = true;
            }
        }
        if( isNewActivities ) {
            // update caseFolder
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                msg: {
                    data: activity.caseFolderId
                }
            } );
        }
        callback( null, activity );
    }

    /**
     *  function for link TREATMENT activities if exists
     *
     *
     * @param user
     * @param activity
     * @param callback
     * @returns {Promise<void>}
     */
    async function checkAndLinkIfExists( user, activity, callback ) {
        let
            err, result, rule, savedActivities;
        [err, result] = await formatPromiseResult( getLinkedActivities( user, activity ) );

        if( err ) {
            Y.log( `checkAndLinkIfExists: Error in getting linked activities. ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        savedActivities = result;
        for( rule of activity.hierarchyRules ) {
            let
                isAlreadyCreated = savedActivities.some( ( act ) => { // eslint-disable-line
                    return act.code === rule.seq;
                });
            if( rule.checked && !isAlreadyCreated ) {
                const
                    timestamp = activity.timestamp,
                    code = rule.seq;
                let
                    err, result;
                // first check if activity already exists in APK
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        actType: 'TREATMENT',
                        code,
                        apkState: activity.apkState || 'IN_PROGRESS',
                        hierarchyRules: {$exists: true},
                        caseFolderId: activity.caseFolderId,
                        timestamp: {
                            $lte: moment( timestamp ).clone().endOf( 'day' ).toDate(),
                            $gte: moment( timestamp ).startOf( 'day' ).toDate()
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `checkAndLinkIfExists: Error in looking for corresponding catalog entry. ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                if( result && result.length ) {
                    for( let foundActivity of result ) { //eslint-disable-line no-unused-vars
                        if( activity.sideMandatory && foundActivity.sideMandatory && activity.side !== foundActivity.side ) {
                            continue;
                        }
                        let
                            checkRule;
                        // cool, activity in APK found not need to create new, linking to existing
                        if( 'Zuschlagsleistung' === activity.treatmentCategory || 'Referenzleistung' === activity.treatmentCategory ) {
                            activity.activities.push( foundActivity._id );
                            foundActivity.referencedBy.push( activity._id );
                        }

                        if( 'Hauptleistung' === activity.treatmentCategory ) {
                            activity.referencedBy.push( foundActivity._id );
                            foundActivity.activities.push( activity._id );
                        }

                        // set checkbox of found activity
                        for( checkRule of foundActivity.hierarchyRules ) {
                            if( activity.code === checkRule.seq ) {
                                checkRule.checked = true;
                            }
                        }

                        // update found activity
                        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'activity',
                            query: {
                                _id: foundActivity._id
                            },
                            data: Y.doccirrus.filters.cleanDbObject( foundActivity )
                        } ) );

                        if( err ) {
                            Y.log( `checkAndLinkIfExists: Error in updating existing activity ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }
                    }
                }
            }
        }

        callback( null, activity );
    }

    /**
     *  function for unlink TREATMENT activity
     *
     *
     * @param user
     * @param activity
     * @param callback
     * @returns {Promise<void>}
     */
    async function checkAndUnlink( user, activity, callback ) {
        let
            err, result, rule, savedActivities;
        [err, result] = await formatPromiseResult( getLinkedActivities( user, activity ) );

        if( err ) {
            Y.log( `checkAndUnlink: Error in getting linked activities. ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        savedActivities = result;
        for( rule of activity.hierarchyRules ) {
            let
                isLinked = savedActivities.some( ( act ) => { // eslint-disable-line
                    return act.code === rule.seq;
                });

            if( isLinked ) {
                //check if linked subGopSubstituted
                let pseudoActivity = {
                        catalogShort: activity.catalogShort,
                        code: rule.seq
                    },
                    codesToCheck = [];

                Y.doccirrus.api.catalog.convertGopCode( pseudoActivity );
                if( pseudoActivity.u_extra && pseudoActivity.u_extra.sub_gop_liste && pseudoActivity.u_extra.sub_gop_liste.gnrs ) {
                    pseudoActivity.u_extra.sub_gop_liste.gnrs.forEach( el => {
                        codesToCheck.push( el.code );
                    } );
                }

                if( codesToCheck.length && !rule.checked && activity.hierarchyRules.some( el => el.checked && codesToCheck.includes( el.seq ) ) ){
                    //checked another activity from subGopGroup do not unlink
                    continue;
                }

            }
            if( !rule.checked && isLinked ) {
                // need to unlink
                let
                    activityFound = savedActivities.filter( ( act ) => { // eslint-disable-line
                        return act.code === rule.seq;
                    });
                for( let currentActivity of activityFound ) { //eslint-disable-line no-unused-vars
                    let
                        filteredActivity = currentActivity && currentActivity._id,
                        activities = currentActivity && currentActivity.activities,
                        referencedBy = currentActivity && currentActivity.referencedBy,
                        hierarchyRules = currentActivity && currentActivity.hierarchyRules,
                        index;

                    if( 'Zuschlagsleistung' === activity.treatmentCategory || 'Referenzleistung' === activity.treatmentCategory ) {
                        index = activity.activities.indexOf( filteredActivity );
                        activity.activities.splice(index, 1);
                        index = referencedBy.indexOf( activity._id );
                        referencedBy.splice(index, 1);
                    }

                    if( 'Hauptleistung' === activity.treatmentCategory ) {
                        index = activity.referencedBy.indexOf( filteredActivity );
                        activity.referencedBy.splice(index, 1);
                        index = activities.indexOf( activity._id );
                        activities.splice(index, 1);
                    }

                    // make code unchecked for code
                    hierarchyRules.forEach( ( r ) => {
                        if( r.seq === activity.code ) {
                            r.checked = false;
                        }
                    });

                    // update found activity
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'update',
                        model: 'activity',
                        migrate: true,
                        query: {
                            _id: filteredActivity
                        },
                        data: {activities: activities, referencedBy: referencedBy, hierarchyRules: hierarchyRules}
                    } ) );

                    if( err ) {
                        Y.log( `checkAndUnlink: Error in updating existing activity ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                }
            }
        }

        callback( null, activity );
    }

    /**
     *  function for unlink TREATMENT activity if catalog was changed
     *
     *
     * @param user
     * @param activity
     * @param callback
     * @returns {Promise<void>}
     */
    async function unlinkIfCatalogChanged( user, activity, callback ) {
        let
            err, result, rule, savedActivities;
        [err, result] = await formatPromiseResult( getLinkedActivities( user, activity ) );

        if( err ) {
            Y.log( `unlinkIfCatalogChanged: Error in getting linked activities. ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        savedActivities = result;
        for( rule of activity.hierarchyRules ) {
            let
                isLinked = savedActivities.some( ( act ) => { // eslint-disable-line
                    return act.code === rule.seq;
                });
            if( isLinked ) {
                // need to unlink
                let
                    activityFound = savedActivities.filter( ( act ) => { // eslint-disable-line
                        return act.code === rule.seq;
                    });
                for( let currentActivity of activityFound ) { //eslint-disable-line no-unused-vars
                    let
                        treatmentCategory = currentActivity && currentActivity.treatmentCategory,
                        filteredActivity = currentActivity && currentActivity._id,
                        activities = currentActivity && currentActivity.activities,
                        referencedBy = currentActivity && currentActivity.referencedBy,
                        hierarchyRules = currentActivity && currentActivity.hierarchyRules,
                        index,
                        activitiesWithoutCurrent = referencedBy.concat( activities ).filter( i => i !== activity._id.toString() );
                    // check if activities has same code linked
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            actType: 'TREATMENT',
                            _id: {$in: activitiesWithoutCurrent}
                        },
                        options: {
                            select: {
                                code: 1
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `deleteAndUnlink: Error in looking for activities have same code. ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    let sameCodeActivities = result;

                    if( currentActivity ) {
                        if( 'Hauptleistung' === treatmentCategory ) {
                            index = activity.activities.indexOf( filteredActivity.toString() );
                            activity.activities.splice(index, 1);
                            index = referencedBy.indexOf( activity._id.toString() );
                            referencedBy.splice(index, 1);
                        }

                        if( 'Zuschlagsleistung' === treatmentCategory || 'Referenzleistung' === treatmentCategory ) {
                            index = activity.referencedBy.indexOf( filteredActivity.toString() );
                            activity.referencedBy.splice(index, 1);
                            index = activities.indexOf( activity._id.toString() );
                            activities.splice(index, 1);
                        }

                        // make code unchecked for code
                        hierarchyRules.forEach( ( r ) => { //eslint-disable-line
                            let
                                filteredCode = sameCodeActivities.some( i => i.code === r.seq );
                            if( !filteredCode) {
                                r.checked = false;
                            }
                        });

                        // update found activity
                        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'update',
                            model: 'activity',
                            query: {
                                _id: filteredActivity
                            },
                            data: {activities: activities, referencedBy: referencedBy, hierarchyRules: hierarchyRules}
                        } ) );

                        if( err ) {
                            Y.log( `unlinkIfCatalogChanged: Error in updating existing activity ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }
                    }
                }
            }
        }

        activity.hierarchyRules = [];

        // update main activity
        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user: user,
            action: 'update',
            model: 'activity',
            query: {
                _id: activity._id.toString()
            },
            data: {
                $set: {
                    hierarchyRules: activity.hierarchyRules,
                    referencedBy: activity.referencedBy,
                    activities: activity.activities
                }
            }
        } ) );

        if( err ) {
            Y.log( `unlinkIfCatalogChanged: Error in updating main activity ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        callback( null, activity );
    }

    /**
     *  function for unlink activity if was deleted
     *
     *
     * @param user
     * @param activity
     * @param callback
     * @returns {Promise<void>}
     */
    async function deleteAndUnlink( user, activity, callback ) {
        const
            leanActivity = activity.toJSON ? activity.toJSON() : JSON.parse( JSON.stringify( activity ) );
        let
            err, result, rule, savedActivities;
        [err, result] = await formatPromiseResult( getLinkedActivities( user, activity ) );

        if( err ) {
            Y.log( `deleteAndUnlink: Error in getting linked activities. ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        savedActivities = result;
        for( rule of leanActivity.hierarchyRules ) {
            // need to unlink
            let
                activityFound = savedActivities.filter( ( act ) => { // eslint-disable-line
                    return act.code === rule.seq;
                }),
                filteredActivity = activityFound && activityFound[0] && activityFound[0]._id,
                activities = activityFound && activityFound[0] && activityFound[0].activities || [],
                referencedBy = activityFound && activityFound[0] && activityFound[0].referencedBy || [],
                hierarchyRules = activityFound && activityFound[0] && activityFound[0].hierarchyRules,
                index;
            // check if activities has same code linked
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: 'TREATMENT',
                    _id: {$in: referencedBy.concat( activities )},
                    code: leanActivity.code,
                    status: {$ne: 'DELETED'}
                }
            } ) );

            if( err ) {
                Y.log( `deleteAndUnlink: Error in looking for activities have same code. ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            let sameCodeActivities = result && result.length;

            if( activityFound && activityFound.length ) {
                if( 'Zuschlagsleistung' === leanActivity.treatmentCategory || 'Referenzleistung' === leanActivity.treatmentCategory ) {
                    index = referencedBy.indexOf( leanActivity._id );
                    referencedBy.splice(index, 1);
                }

                if( 'Hauptleistung' === leanActivity.treatmentCategory ) {
                    index = activities.indexOf( leanActivity._id );
                    activities.splice(index, 1);
                }

                if( !sameCodeActivities ) {
                    // make code unchecked for code
                    hierarchyRules.forEach( ( r ) => {
                        if( r.seq === leanActivity.code ) {
                            r.checked = false;
                        }
                    });
                }

                // update found activity
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: {
                        _id: filteredActivity
                    },
                    data: {activities: activities, referencedBy: referencedBy, hierarchyRules: hierarchyRules}
                } ) );

                if( err ) {
                    Y.log( `deleteAndUnlink: Error in updating existing activity ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            }
        }

        callback( null, activity );
    }

    function invalidateSingleParent( user, activity, callback ) {
        const async = require( 'async' );
        var formDocument;

        async.series( [ updateParentStatus, loadParentForm, updateParentForm ], onAllDone );

        //  set status of parent activity to INVALID - note that other linkedactivity processes should already have
        //  cleaned up any references to deleted activities
        function updateParentStatus( itcb ) {
            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'update',
                'query': { '_id': activity._id },
                'data': { 'status': 'CREATED' },
                'callback': onParentActivityUpdated
            } );

            function onParentActivityUpdated( err ) {
                if ( err ) {
                    Y.log( `Problem marking parent activity as invalid: ${JSON.stringify( err )}`, 'warn', NAME );
                    return itcb( err );
                }
                return itcb( null );
            }
        }

        //  look for any form belonging to the parent activity (invoice, docletter, etc)
        //  there should only be one
        function loadParentForm( itcb ) {
            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'document',
                'query': {
                    '_id': { '$in': activity.attachments },
                    'type': 'FORM'
                },
                'callback': onFormDocQuery
            } );

            function onFormDocQuery( err, result ) {
                if ( err ) { return itcb( err ); }
                if ( !result[0] ) { return itcb( null ); }

                formDocument = result[0];
                return itcb( null );
            }

        }

        //  set flag to remap linked activities the next time this form is instantiated
        function updateParentForm( itcb ) {
            //  if no form then we can skip this step
            if ( !formDocument ) { return itcb( null ); }

            //  if form document is already set for a full remap then skip partial remap of linked activities
            if ( formDocument.formData && 'remap' === formDocument.formData ) { return itcb( null ); }

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'document',
                'action': 'update',
                'query': { '_id': formDocument._id },
                'data': { 'formData': 'remaplinked' },
                'callback': onParentFormUpdated
            } );

            function onParentFormUpdated( err ) {
                if ( err ) { return itcb( err ); }
                Y.log( `Updated form of aprent activity: ${formDocument._id}`, 'debug', NAME );
                itcb( null );
            }
        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( `Problem invaliding parent activity: ${JSON.strignify( err )}`, 'warn', NAME );
                return callback( err );
            }

            Y.log( `Updated single parent activity: ${activity._id} ${activity.actType} ${activity.status}`, 'debug', NAME );
            callback( null );
        }
    }

    /**
     *  Utility method to extract references from all fields used by different activity types
     *  Used to update the referencedBy property of the activities referred to by this one.
     *
     *  This will also deduplicate and check for invalid references ( 'null', empty string, etc )
     *
     *  @param      {Object}    activity    A plain activity object
     *  @returns    {[String]}              An array of activity _ids as strings
     */

    function getAllReferences( activity ) {
        let referencedBy = [], i;

        function addReference( newId ) {
            if ( !newId || '' === newId || 'null' === newId ) { return; }       //  cannot be empty
            newId = `${newId}`;                                                 //  must be a plain string
            if ( -1 !== referencedBy.indexOf( newId ) ) { return; }             //  must not be duplicate
            referencedBy.push( newId );
        }

        //  get general linked activities
        if ( activity.activities ) {
            for ( i = 0; i < activity.activities.length; i++ ) {
                addReference( activity.activities[i] );
            }
        }

        //  if HasDiagnosis_T type (SCHEIN, FORM, DOCLETTER, etc)
        if ( activity.icds ) {
            for ( i = 0; i < activity.icds.length; i++ ) {
                addReference( activity.icds[i] );
            }
        }

        //  if HasDiagnosis_T type (SCHEIN, FORM, DOCLETTER, etc)
        if ( activity.icdsExtra ) {
            for ( i = 0; i < activity.icdsExtra.length; i++ ) {
                addReference( activity.icdsExtra[i] );
            }
        }

        //  if Invoice_T type (INVOICE, has a set of receipts)
        if ( activity.receipts ) {
            for ( i = 0; i < activity.receipts.length; i++ ) {
                addReference( activity.receipts[i] );
            }
        }

        //  Treatment_T (links TREATMENT to INVOICE, set from invoice, to be replaced with referencedBy)
        if ( activity.invoiceId ) {
            addReference( activity.invoiceId );
        }

        return referencedBy;
    }

    /**
     *  Utility method to remove all references to other activities used by different activity types.
     *  This may be required for sending an activitiy through inTouch to
     *
     *  This will also deduplicate and check for invalid references ( 'null', empty string, etc )
     *
     *  @param      {Object}    activity  a plain activity object
     *  @returns    {Object}              the cleared activity object
     */
    function clearActivityObjectOfAllReferences( activity ) {
        //  clear general linked activities
        if( activity.activities ) {
            activity.activities = [];
        }

        //  clear upward-links
        if( activity.referencedBy ) {
            activity.referencedBy = [];
        }

        //  if HasDiagnosis_T type (SCHEIN, FORM, DOCLETTER, etc)
        if( activity.icds ) {
            activity.icds = [];
        }

        //  if HasDiagnosis_T type (SCHEIN, FORM, DOCLETTER, etc)
        if( activity.icdsExtra ) {
            activity.icdsExtra = [];
        }

        //  if Invoice_T type (INVOICE, has a set of receipts)
        if( activity.receipts ) {
            activity.receipts = [];
        }

        //  Treatment_T (links TREATMENT to INVOICE, set from invoice, to be replaced with referencedBy)
        if( activity.invoiceId ) {
            activity.invoiceId = null;
        }

        return activity;
    }

    /**
     *  Remove any reference from the given activity to the given id, whichever field it might be in
     *
     *  @param  {Object}    activity
     *  @param  {String}    toId
     *  @param  {Object}    putData         changes to save to database
     *  @return {*}         modified activity
     */

    function removeActivityReference( activity, toId, putData ) {

        //  remove toId from array on activity
        function removeFromArray( fieldName ) {

            let
                ary = activity[ fieldName ],
                newAry = [],
                found = false,
                i;

            //  if not defined then do not initialize here
            if ( !ary ) { return ary; }
            for ( i = 0; i < ary.length; i++ ) {
                if ( ary[i].toString() === toId.toString() ) {
                    found = true;
                } else {
                    newAry.push( ary[i] );
                }
            }

            if ( found ) {
                putData.fields_.push( fieldName );
                putData[ fieldName ] = newAry;
                activity[ fieldName ] = newAry;
            }
        }

        removeFromArray( 'activities' );        //  general links
        removeFromArray( 'icds' );              //  diagnoses
        removeFromArray( 'icdsExtra' );         //  supplemental diagnoses
        removeFromArray( 'receipts' );          //  receipts on invoices
        removeFromArray( 'referencedBy' );      //  reverse references from deleted activities

        //  Treatment_T (links TREATMENT to INVOICE, set from invoice, to be replaced with referencedBy)
        if ( activity.invoiceId === toId ) {
            putData.invoiceId = '';
            putData.fields_.push( 'invoiceId' );
            activity.invoiceId = null;
        }

        return activity;
    }

    /**
     *  Replace a reference to one activity with another, used when copying
     *
     *  @param  {Object}    activity    Will be modified
     *  @param  {String}    oldRef      To be removed
     *  @param  {String}    newRef      To be added
     *  @return {Object}                Activity with reference replaced
     */

    function replaceActivityReference( activity, oldRef, newRef ) {

        function replaceInArray( ary ) {
            let i;
            if ( !Array.isArray( ary ) ) { return; }
            for ( i = 0; i < ary.length; i++ ) {
                if ( ary[i] === oldRef ) { ary[i] = newRef; }
            }
        }

        replaceInArray( activity.activities );
        replaceInArray( activity.icds );
        replaceInArray( activity.icdsExtra );
        replaceInArray( activity.receipts );
        replaceInArray( activity.referencedBy );

        if ( activity.invoiceId && activity.invoiceId === oldRef ) {
            activity.invoiceId = newRef;
        }

        return activity;
    }

    /**
     *  After changes to linked activities we need to let the client know, so that casefolder or cashbook tables can be
     *  updated.
     *
     *  This is done via ws event to client, back to user which initiated the change
     *
     *  @param  {Object}    user        User responsible for activity update
     *  @param  {Object}    changed     Array of activity _ids which have changes
     */

    function notifyLinkedActivityChanges( user, changed ) {
        let deduplicatedIds = changed.filter( isFirstInstance );

        function isFirstInstance( strId, idx ) {
            return idx === changed.indexOf( strId );
        }

        Y.doccirrus.communication.emitEventForUser( {
            targetId: user.identityId,
            nsp: 'default',
            event: 'linkedActivityUpdate',
            msg: { data: deduplicatedIds }
        } );
    }

    /**
     *  Run incase migration to setup referencedBy property of activities
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Function}  args.callback
     */

    function setAllReciprocalLinks( args ) {
        Y.log('Entering Y.doccirrus.api.linkedactivities.setAllReciprocalLinks', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.linkedactivities.setAllReciprocalLinks');
        }
        Y.doccirrus.inCaseUtils.migrationhelper.setAllReciprocalLinks( args.user, false, onMigrationComplete );

        function onMigrationComplete( err ) {
            if ( err ) {
                Y.log( `An error occurred in migration: ${JSON.stringify( err )}`, 'warn', NAME );
            }
        }

        //  this is a slow process, call back immeediately
        args.callback( null, { 'status': 'Started migration to set reciprocal links' } );
    }

    /**
     *  Recalculate the invoice balance (totalReceipts, totalReceiptsOutstanding)
     *
     *  Balance starts from the invoice price and includes receipts, creditnotes, warning (penalty) charges, and bad debts
     *
     *  This will only update the invoice based on the linked activities it claims.  Receipts will be updated in post-process
     *  by updateBacklinks (invoiceNo, invoiceText, etc)
     *
     *  @param  {Object}    user
     *  @param  {Object}    activity    An INVOICE activity
     *  @param  {Function}  callback    Of the form fn( err, activity )
     */

    function updateInvoiceLinkedData( user, activity, callback ) {
        const async = require( 'async' );
        let receipts = [],
            err;

        activity.receipts = activity.receipts ? activity.receipts : [];

        activity.referencedBy = activity.referencedBy ? activity.referencedBy : [];

        async.series( [ getReceipts, updateBalance ], onAllDone );

        async function getReceipts( itcb ) {
            //  if no linked receipts then we can skip this step
            if ( 0 === activity.receipts.length && 0 === activity.referencedBy.length ) { return itcb( null ); }

            let linkedActivities = [],
                linkedIds = Y.doccirrus.api.linkedactivities.getAllReferences( activity ),
                i;

            for ( i = 0; i < linkedIds.length; i++ ) {
                if ( linkedIds[i] && -1 === linkedActivities.indexOf( linkedIds[i] ) ) {
                    linkedActivities.push( linkedIds[i] );
                }
            }

            if ( 0 < linkedActivities.length ) {
                [err, receipts] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        migrate: true,
                        query: {
                            //  set of receipts linked from the invoice
                            _id: {$in: linkedActivities}
                        }
                    } )
                );

                if( err ) {
                    Y.log( `linkedActivities: Error while getting related activities of with ID: ${activity._id}. Error: ${err.stack || err}`, "error", NAME );
                    return itcb( err );
                }
            }

            itcb( null );
        }

        function updateBalance( itcb ) {
            let i;

            //  get sum of receipts, creditnotes, warning costs, etc
            activity.totalReceipts = 0;
            activity.totalPenalties = 0;
            activity.linkedEmployees = [];
            activity.linkedContents = [];
            activity.linkedTimestamps = [];
            for ( i = 0; i < receipts.length; i++ ) {

                if ( -1 !== INVOICE_RELEVANT.indexOf( receipts[i].actType ) ) {

                    //  these decrease the outstanding balance
                    if ( 'RECEIPT' === receipts[i].actType || 'CREDITNOTE' === receipts[i].actType || 'BADDEBT' === receipts[i].actType ) {
                        activity.totalReceipts = activity.totalReceipts + parseFloat( receipts[i].amount || 0 );
                    }

                    //  these increase the outstanding balance
                    if ( 'WARNING1' === receipts[i].actType || 'WARNING2' === receipts[i].actType ) {
                        activity.totalPenalties = activity.totalPenalties + parseFloat( receipts[i].amount || 0 );
                    }
                    const receiptIdStr = receipts[i]._id.toString();

                    // KAT-367 avoid duplicates inside linkedContents, linkedEmployees, linkedTimestamps
                    if( -1 === activity.linkedEmployees.findIndex( e => e.receiptId === receiptIdStr ) ) {
                        activity.linkedEmployees.push( {
                            name: receipts[i].employeeName,
                            initials: receipts[i].employeeInitials,
                            receiptId: receiptIdStr
                        } );
                    }
                    if( -1 === activity.linkedContents.findIndex( c => c.receiptId === receiptIdStr ) ) {
                        activity.linkedContents.push( {
                            content: receipts[i].content ? receipts[i].content : Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', receipts[i].actType, '-de', 'k.A.' ),
                            receiptId: receiptIdStr,
                            actType: receipts[i].actType,
                            caseFolderId: receipts[i].caseFolderId,
                            patientId: receipts[i].patientId,
                            amount: receipts[i].amount
                        } );
                    }
                    if( -1 === activity.linkedTimestamps.findIndex( t => t.receiptId === receiptIdStr ) ) {
                        activity.linkedTimestamps.push( {
                            timestamp: receipts[i].timestamp,
                            receiptId: receiptIdStr
                        } );
                    }
                }
            }

            // MOJ-9057 Outstanding receipts are calculated from price, not total.
            if ( 'number' === typeof activity.price ) {
                activity.price = parseFloat( activity.price || 0 );
            }

            activity.totalReceiptsOutstanding = ( ( activity.price + activity.totalPenalties ) - activity.totalReceipts );

            //  When an invoice is marked as PAID or ARCHIVED the remaining balance is set to 0, MOJ-6627
            if( 'CREDITED' === activity.status || 'ARCHIVED' === activity.status ) {
                activity.totalReceipts = activity.price;
                activity.totalReceiptsOutstanding = 0;
            }

            //  since this is run from the pre-process we don't need to save the INVOICE activity
            itcb( null );
        }

        function onAllDone( err ) {
            if ( err ) {
                let errStr = JSON.stringify( err );
                Y.log( `Problem setting remaining balances on invoice ${activity._id}: ${errStr}`, 'err', 'warn' );
                return callback( err, activity );
            }

            Y.log( `Setting invoice totalReceipts: ${activity.totalReceipts}`, 'debug', NAME );
            Y.log( `Setting invoice totalReceiptsOutstanding: ${activity.totalReceiptsOutstanding}`, 'debug', NAME );
            callback( null, activity );
        }
    }

    function confirmInvalidatedParents( args ) {
        Y.log('Entering Y.doccirrus.api.linkedactivities.confirmInvalidatedParents', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.linkedactivities.confirmInvalidatedParents');
        }
        const {user, originalParams, callback} = args;
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'put',
            query: {
                _id: {$in: originalParams.activityIds},
                status: 'CREATED'
            },
            data: {
                status: 'VALID',
                skipcheck_: true,
                multi_: true
            },
            fields: ['status'],
            callback: ( err, result ) => {
                if( err ) {
                    Y.log( `could not confirm invalidated parents of linked activties: ${err}`, 'error', NAME );
                    return callback( err );
                }
                callback( null, result );
            }
        } );
    }

    /**
     *  Set the status of linked activities to match parent (such as when approving or cancelling an invoice)
     *
     *  This is currently done in several contexts, should ideally DRY this up and provide a single point to record
     *  logic for exceptions.
     *
     *  @param  {Object}    user
     *  @param  {Object}    activity        Activity which may have linked activities
     *  @param  {String}    status          New status of linked activities - APPROVED, VALID, etc
     *  @//param  {Function}  callback        Of the form fn( err, [...updatedActivityIds...] )
     */

    async function setStatusOfLinkedActivities( user, activity, status, restrictToActTypes = [] ) {
        const
            dcCore = require( 'dc-core' ),
            formatPromiseResult = dcCore.utils.formatPromiseResult;

        let
            err,
            linkedActivityIds = Y.doccirrus.api.linkedactivities.getAllReferences( activity ),
            linkedActivities,
            updatedIds = [],
            query = { '_id': { '$in': linkedActivityIds } },
            i;

        // Restrict to specific actType if needed (when actTypes need separate status after cancellation)
        if( restrictToActTypes.length !== 0 ) {
            query.actType = {'$in': restrictToActTypes};
        }

        [ err, linkedActivities ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            'user': user,
            'model': 'activity',
            'migrate': true,
            'action': 'get',
            'query': query
        } ) );

        if ( err ) {
            Y.log( `Could not load linked activities to change state: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        for ( i = 0; i < linkedActivities.length; i++ ) {

            [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'migrate': true,
                'action': 'update',
                'query': { '_id': linkedActivities[i]._id },
                'data': { 'status': status }
            } ) );

            if ( err ) {
                Y.log( `Problem setting status of linked activity: ${err.stack||err}`, 'error', NAME );
                //  continue despite error, best effort
            }

            updatedIds.push( linkedActivities[i]._id );

            //  when setting linked activities back to valid, remove invoiceId from linked treatments
            if ( 'VALID' === status && linkedActivities[i].invoiceId ) {
                [ err ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'migrate': true,
                    'action': 'update',
                    'query': { '_id': linkedActivities[i]._id },
                    'data': { '$unset': { 'invoiceId': 1 } }
                } ) );

                if ( err ) {
                    Y.log( `Problem unsetting invoiceId of linked activity: ${err.stack||err}`, 'error', NAME );
                    //  continue despite error, best effort
                }
            }

        }

        return updatedIds;
    }

    /**
     *  After a GRAVIDOGRAMMPROCESS activity is saved we must check that it is linked from any GRAVIDOGRAMM
     *  in its casefolder, and remap it into the GRAVIDOGRAMM form.
     *
     *  Overall process:
     *
     *      (1) Find the GRAVIDOGRAMM corresponding to this GRAVIDOGRAMMPROCESS
     *      (2) Ensure that this GRAVIDOGRMMPROCESS is a linked activity
     *      (3) Remap the form to include this GRAVIDOGRAMMPROCESS or any changes to it
     *
     *  @param user
     *  @param activity
     *  @param callback
     */

    function linkGravidogrammProcess( user, activity, callback ) {
        if ( !activity._id ) { return callback( null, activity ); }

        const async = require( 'async' );

        let gravidogramm = null;

        async.series( [ loadGravidogramm, updateGravidogramm, remapGravidogrammForm ], onAllDone );

        //  (1) Find the GRAVIDOGRAMM corresponding to this GRAVIDOGRAMMPROCESS

        function loadGravidogramm( itcb ) {
            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'query': {
                    'patientId': activity.patientId,
                    'caseFolderId': activity.caseFolderId,
                    'actType': 'GRAVIDOGRAMM',
                    'timestamp': { '$lte': new Date( activity.timestamp ) }
                },
                'options': {
                    //  there should be only one per pregnancy casefolder
                    'limit': 1
                },
                'callback': onGravidogrammLoaded
            } );

            function onGravidogrammLoaded( err, result ) {
                if ( err ) { return itcb( err ); }

                if ( !result || !result[0] ) {
                    //  no GRAVIDOGRAMM in this folder, will be remapped when one is created
                    return itcb( null );
                }

                gravidogramm = result[0];

                Y.log( `Found GRAVIDOGRAMM associated with GRAVIDOGRAMMPROCESS: ${gravidogramm._id}`, 'debug', NAME );
                itcb( null );

            }
        }

        //  (2) Ensure that this GRAVIDOGRMMPROCESS is a linked activity

        function updateGravidogramm( itcb ) {
            //  if no gravidogramm then we can skip this step
            if ( !gravidogramm ) { return itcb( null ); }

            gravidogramm.activities = gravidogramm.activities || [];

            if ( -1 !== gravidogramm.activities.indexOf( activity._id + '') ) {
                //  already linked from this gravidogramm
                return itcb( null );
            }

            gravidogramm.activities.push( activity._id + '' );

            let
                putData = {
                    'activities': gravidogramm.activities,
                    'fields_': [ 'activities' ]
                };

            putData = Y.doccirrus.filters.cleanDbObject( putData );

            Y.log( 'Linking GRAVIDOGRAMM: ' + gravidogramm._id + ' to ' + activity._id, 'debug', NAME );

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'put',
                'query': { _id: gravidogramm._id + '' },
                'data': putData,
                'callback': itcb
            } );
        }

        //  (3) Remap the form to include this GRAVIDOGRAMMPROCESS or any changes to it

        function remapGravidogrammForm( itcb ) {
            //  if no gravidogramm then we can skip this step
            if ( !gravidogramm ) { return itcb( null ); }

            //  will remap linked acitvities
            Y.doccirrus.forms.mappinghelper.remapInNewContext( user, gravidogramm._id, false, onGravidogrammFormRemapped );
            function onGravidogrammFormRemapped( err ) {
                if ( err ) {
                    Y.log( `Problem remapping GRAVIDOGRAMM form:  ${err.stack||err}`, 'warn', NAME );
                }
                itcb( null );
            }
        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( 'Could not link gravidogramm process: ' + JSON.stringify( err ), 'warn', NAME );
                return callback( err );
            }
            return callback( null, activity );
        }
    }

    /**
     *  Check if a batch of activities can be moved to another casefolder
     *
     *  If there are links in referencedBy which fall outside the set of activities then we cannot move the batch
     *  because we would be breaking activities in the casefolder we are moving from - eg, moving a medication but
     *  not the prescription it belongs to.
     *
     *  @param  {Object}    activities  Array of activities from the database
     *  @return {Boolean}               True if all OK
     */

    function canMoveCaseFolder( activities ) {
        let
            allIds = [],
            canMove = true,
            currActivity, currRef;

        for ( currActivity of activities ) {
            allIds.push( currActivity._id.toString() );
            currActivity.referencedBy = currActivity.referencedBy || [];
        }

        for ( currActivity of activities ) {
            for ( currRef of currActivity.referencedBy ) {
                if ( -1 === allIds.indexOf( currRef ) ) {
                    canMove = false;
                    Y.log( `Can not move batch of activities between casefolder, block by reference of ${currRef} to ${currActivity._id}`, 'info', NAME );
                }
            }
        }

        return canMove;
    }

    /**
     *  When moving activities between casefolders, we must remove links to any activities not in the same batch
     *  This is to prevent the situation where an activity is in one casefolder and its child is in another, making it
     *  impossible to unlink it.
     *
     *  @param  {Object}    activities  Array of activities from the database
     */

    function unlinkOnMove( activities ) {
        let
            allIds = [],
            currActivity,
            allRefs,
            badRefs = [],
            currRef,
            changes = [],
            currPutData;


        for ( currActivity of activities ) {
            allIds.push( `${currActivity._id}` );
        }

        for ( currActivity of activities ) {
            allRefs = getAllReferences( currActivity );

            //  references to activities not in the set must be removed
            for ( currRef of allRefs ) {
                if ( -1 === allIds.indexOf( currRef ) ) {
                    badRefs.push( currRef );
                }
            }

            //  temporary, record changes to be made to this activity
            currPutData = {
                query: { _id: currActivity._id },
                data: { fields_: [] }
            };

            for ( currRef of badRefs ) {
                removeActivityReference( currActivity, currRef, currPutData.data );
            }

            changes.push( currPutData );
        }

        return changes;
    }

    /**
     *  When copying activities into another casefolder, remove references to activities which are not part of the
     *  same batch, and replace _ids in references with those of the new copies.
     *
     *  @param  {Object}    activities  Array of activity objects
     *  @return {Object}                Array of activity objects with new _ids and replaced references
     */

    function unlinkOnCopy( activities ) {
        let
            newIds = {},
            currActivity,
            allRefs,
            currRef;

        //  assign new _ids and make a dict of the reassignments
        for ( currActivity of activities ) {
            currActivity._newId = new ObjectId();
            newIds[ `${currActivity._id}` ] = `${currActivity._newId}`;
        }

        //  replace or remove old references to other activities
        for ( currActivity of activities ) {

            allRefs = getAllReferences( currActivity );

            for ( currRef of allRefs ) {
                if ( newIds[ currRef ] ) {
                    //  reference to an activity in the set being copied, replace with _newId
                    replaceActivityReference( currActivity, currRef, newIds[ currRef ] );
                } else {
                    //  reference to an activity not being copied, remove it
                    removeActivityReference( currActivity, currRef, { fields_: [] } );
                }
            }
        }

        //  set the new _ids on the activity
        for ( currActivity of activities ) {
            currActivity._id = currActivity._newId;
            delete currActivity._newId;
        }

        //  remove references to invoice logs
        for ( currActivity of activities ) {
            delete currActivity.invoiceLogId;
            delete currActivity.invoiceLogType;
        }

        return activities;
    }

    /**
     *  Expose with YUI
     */

    Y.namespace( 'doccirrus' ).api.linkedactivities = {
        // delete-commit
        deleteAndUnlink,
        //  pre-commit
        updateInvoiceLinkedData,
        checkAndLinkIfExists,
        checkAndUnlink,
        checkAndReplaceSide,

        //  post commit
        clearBacklinks,
        updateBacklinks,
        invalidateParentActivities,
        createAndLinkTarmedTreatments,
        createRelatedDiagnosis,
        unlinkIfCatalogChanged,

        //  utilities
        notifyLinkedActivityChanges,
        getAllReferences,
        setStatusOfLinkedActivities,
        clearActivityObjectOfAllReferences,

        //  moving copying activities between casefolders
        canMoveCaseFolder,
        unlinkOnMove,
        unlinkOnCopy,

        //  test / dev / support route to manually run migration
        setAllReciprocalLinks,
        linkGravidogrammProcess,
        confirmInvalidatedParents
    };

}, '0.0.1', {
    requires: [
    ]
} );