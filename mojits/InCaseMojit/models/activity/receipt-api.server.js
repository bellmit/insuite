/**
 *  Methods to manage the relationships between receipts and invoices
 *
 *  Invoices maintain a set of receipts which they refer to, and from these calculate the total outstanding balance
 *  against the price of the invoice.
 *
 *  In turn, receipts require information from the invoice (invoiceNo, invoiceText) used when mapping their own form.
 *
 *  The relationship is:
 *
 *      INVOICE -> RECEIPT  -   One to many, stored in activity.receipts array of INVOICE
 *      RECEIPT -> INVOICE  -   Many to one, stored in the activity.referencedBy array of RECEIPT
 *
 *  Note that receipts should only ever have one referencedBy
 *
 *  CREDITNOTE activities may be taken into account in future version, behaving in about the same way, with credit
 *  amount reducing the outstanding balance invoice but not the total of receipts.
 *
 *  User: strix
 *  Date: 11/08/2016
 *  (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add( 'receipt-api', function( Y, NAME ) {

        const
            util = require('util'),
            {formatPromiseResult} = require('dc-core').utils,

            i18n = Y.doccirrus.i18n,

            RECEIPT_FORM_ROLE = 'casefile-receipt',
            BADDEBT_FORM_ROLE = 'casefile-bad-debt';

            /**
         *  Create a receipt/baddebt and link to the given invoiceId
         *
         *  The case, patient, location, etc will be copied from the invoice.
         *
         *  Overall process:
         *
         *      1. Sanity check
         *      2. Load the referenced invoice
         *      3. Get the currently configured Receipt/quittung form
         *      4. Create receipt, copying properties of invoice
         *      5. Add receipt _id to invoice and save to trigger update of totalReceipts / oustanding balance
         *      6. Approve newly created receipt/baddebt if needed
         *      X.  Finally, call back with new receipt
         *
         *  TODO: replace this with more general function whcih will also map the form and look up default userContent
         *
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams.invoiceId       Invoice activity _id, required
         *  @param  {String}    args.originalParams.paymentMethod   Type of payment
         *  @param  {Boolean}   args.originalParams.createBadDebt   if true create baddebt else receipt
         *  @param  {Boolean}   args.originalParams.approve         Approve Receipt
         *  @param  {Function}  args.callback
         */

        function quickCreate( args ) {
            const
                async = require( 'async' ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                {
                    data: params,
                    callback
                } = args;
            let
                invoiceId = params.invoiceId || '',
                paymentMethod = params.paymentMethod || '',
                createBadDebt = params.createBadDebt || false,
                approve = params.approve || false,
                // if paymentMethod not cash, then cashbook always empty
                cashbook = 'CASH' === paymentMethod ? ( params.cashbook || '' ) : '',
                cashbookId = 'CASH' === paymentMethod ? ( params.cashbookId ) : null,
                actType = createBadDebt ? 'BADDEBT' : 'RECEIPT',
                receiptFormId = '',
                receiptFormVersionId = '',
                invoice,
                receipt;

            async.series(
                [
                    checkParams,
                    loadInvoice,
                    lookupForm,
                    createReceipt,
                    approveReceipt
                ],
                onAllDone
            );

            //  1. Sanity check
            function checkParams( itcb ) {
                let
                    err = null,
                    num = (params && params.amount);

                if ( !params.invoiceId || '' === params.invoiceId || 'string' !== typeof params.invoiceId ) {
                    err = Y.doccirrus.errors.rest( 404, 'Invoice _id not given', true );
                }

                if ( !params || isNaN( num ) ) {
                    err = Y.doccirrus.errors.rest( 404, 'Amount must be a number', true );
                }

                params.content = params.content ? params.content : i18n( 'activity-schema.Activity_E.' + actType );
                itcb( err );
            }

            //  2. Load the referenced invoice
            function loadInvoice( itcb ) {
                function onInvoiceLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( !result[0] ) { return Y.doccirrus.errors.rest( 404, `Invoice not found: ${invoiceId}` ); }

                    invoice = result[0];

                    itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': { _id: invoiceId },
                    'callback': onInvoiceLoaded
                } );
            }

            //  3. Get the currently configured Receipt/quittung form
            function lookupForm( itcb ) {
                function onFormsListed( err, formList ) {
                    if ( err ) { return itcb( err ); }
                    let formMeta, i;

                    formList = formList.data ? formList.data : formList;

                    for ( i = 0; i < formList.length; i++ ) {
                        formMeta = formList[i];
                        if ( formMeta.defaultFor &&  ( !createBadDebt && formMeta.defaultFor === RECEIPT_FORM_ROLE || createBadDebt && formMeta.defaultFor === BADDEBT_FORM_ROLE ) ) {
                            receiptFormId = formMeta._id;
                            receiptFormVersionId = formMeta.latestVersionId;

                            Y.log( `Found receipt form: ${  receiptFormId  }-v-${  receiptFormVersionId}`, 'debug', NAME );
                            return itcb( null );
                        }
                    }

                    //  if we reach this point then form was not found
                    itcb( Y.doccirrus.errors.rest( 404, 'Receipt form not found, cannot create receipt', true ) );
                }

                Y.doccirrus.api.formtemplate.listforms( {
                    'user': args.user,
                    'originalParams': { 'modelname': 'formtemplate' },
                    'callback': onFormsListed
                } );
            }

            //  4. Create receipt, copying properties of invoice
            function createReceipt( itcb ) {
                let
                    toCopy = [
                        'patientId',
                        'locationId',
                        'caseFolderId',
                        'employeeId',
                        'employeeName',
                        'invoiceNo'
                    ],
                    fieldName,
                    activities = [],
                    i;

                if( params.linkToInvoice ) {
                    Y.log( `Pre-linking to invoice: ${params.invoiceId}`, 'debug', NAME );
                    activities = [ params.invoiceId ];
                }

                receipt = {
                    actType,
                    content: params.content,
                    userContent: params.content,
                    amount: params.amount,
                    activities,
                    attachments: [],
                    editor: [],
                    formId: `${receiptFormId  }`,
                    formVersionId: `${receiptFormVersionId  }`,
                    status: 'VALID',
                    paymentMethod,
                    timestamp: params.timestamp || new Date(),
                    cashbook,
                    cashbookId
                };

                for ( i = 0; i < toCopy.length; i++ ) {
                    fieldName = toCopy[i];
                    if ( invoice[ fieldName ] ) {
                        receipt[ fieldName ] = `${invoice[ fieldName ]  }`;
                    }
                }

                Y.log( `Saving new RECEIPT to database: ${JSON.stringify( receipt )}`, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'action': 'post',
                    'data': Y.doccirrus.filters.cleanDbObject( receipt ),
                    'callback': onReceiptSaved
                } );

                async function onReceiptSaved( err, result ) {
                    if ( err ) { return itcb( err ); }

                    result = result.data ? result.data : result;
                    if ( result[0] ) {
                        receipt._id = `${result[0]  }`;

                        // create form for created receipt
                        let [ err ] = await formatPromiseResult( initializeFormForActivityP( args.user, receipt._id, {}, null ) );
                        if ( err ) {
                            Y.log( `Problem creating form for new activity ${receipt._id}: ${err.stack||err}`, 'warn', NAME );
                            //  activity already created, continue, best effort
                        }
                    }

                    itcb( null );
                }
            }

            async function approveReceipt( itcb ){
                if(!approve){
                    //just save Receipt
                    return itcb( null );
                }
                if( !Y.doccirrus.auth.hasTransitionPermission( args.user, 'approve' ) ) {
                    Y.log( `quickCreate: User: ${args.user.id} does not have permissions to approve activity`, 'error', NAME );
                    return itcb( Y.doccirrus.errors.rest(401, 'approve is not permitted', true) );
                }

                let [err, activities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'activity',
                        action: 'get',
                        query: {_id: receipt._id}
                    } )
                );
                if( err ){
                    Y.log( `quickCreate: Error getting just created Receipt ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }
                if( !activities.length){
                    Y.log( `quickCreate: just created Receipt ${receipt._id} not found`, 'error', NAME );
                    return itcb( Y.doccirrus.errors.rest(404, 'receipt not found', true) );
                }

                Y.doccirrus.activityapi.doTransition( args.user, { skipInvalidateParentActivities: false }, activities[0], 'approve', false, itcb );
            }

            //  X.  Finally, call back with new receipt
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not create receipt: ${  JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                Y.log( `Created new receipt: ${  receipt._id}`, 'debug', NAME );
                callback( null, receipt );
            }
        }

        /**
         *  Assign a receipt/creditnote/etc to an invoice, or remove the assignment if invoiceId is blank
         *
         *  Note that we only save the invoices, not the reciept - invoice post-processes will update the receipt in
         *  linkedactivity-api::updateBacklinks
         *
         *  Note - this used to be only receipts, now includes other updates to the oustanding balance/Restbetrag:
         *
         *  RECEIPT, CREDITNOTE, REMINDER, BADDEBT, WARNING1, WARNING2
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.receiptId
         *  @param  {Object}    args.originalParams.invoiceId
         *  @param  {Object}    args.originalParams.clearActivities
         *  @param  {Function}  args.callback
         */

        function assignToInvoice( args ) {
            Y.log('Entering Y.doccirrus.api.receipt.assignToInvoice', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.receipt.assignToInvoice');
            }
            const async = require( 'async' );

            let
                params = args.originalParams || {},
                receiptId = params.receiptId || null,
                invoiceId = params.invoiceId || '',
                receiptObj,
                currentInvoiceObj;

            async.series( [ loadReceipt, unlinkPreviousInvoice, linkCurrentInvoice ], onAllDone );

            //  1.  Load the receipt to be relinked
            function loadReceipt( itcb ) {
                if ( !receiptId ) { return itcb( Y.doccirrus.errors.rest( 404, 'Missing receipt _id' ) ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': { '_id': receiptId },
                    'callback': onReceiptLoaded
                } );

                function onReceiptLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 404, `Receipt not found ${receiptId}` ); }
                    if ( err ) { return itcb( err ); }
                    receiptObj = result[0];
                    receiptObj.referencedBy = receiptObj.referencedBy || [];    //  before migration, dev
                    itcb( null );
                }
            }

            //  2.  Remove it from the receipts array of any invoice which refers to it (load, remove receiptId, save)
            function unlinkPreviousInvoice( itcb ) {
                //  if no existing invoice refers to this then no need to unlink it
                if ( 0 === receiptObj.referencedBy.length ) { return itcb( null ); }

                let previousInvoiceIds = receiptObj.referencedBy;

                //  is receipt is already referenced by the invoice then we're done
                if ( receiptObj.referencedBy[0] === invoiceId ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': { '_id': { '$in': previousInvoiceIds } },
                    'callback': onPreviousInvoicesLoaded
                } );

                function onPreviousInvoicesLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    //  if no referenced invoices could be loaded then we're done
                    if ( !result || !result[0] ) { return itcb( null ); }

                    async.eachSeries( result, unlinkSinglePreviousInvoice, itcb );
                }

            }

            function unlinkSinglePreviousInvoice( previousInvoiceObj, itcb ) {
                let newReceipts = previousInvoiceObj.receipts || [];        //  initialize
                newReceipts = newReceipts.filter( removeReceiptById );      //  filter
                newReceipts = dedupStringArray( newReceipts );              //  tidy

                function removeReceiptById( linkedId ) {
                    return linkedId.toString() !== receiptId.toString();
                }

                //  using put instead of update to trigger processes / linkedactivities-api / reporting update
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'action': 'put',
                    'query': { '_id': previousInvoiceObj._id },
                    'data': Y.doccirrus.filters.cleanDbObject( { 'receipts': newReceipts } ),
                    'fields': [ 'receipts' ],
                    'callback': itcb
                } );
            }

            //  3.  Add it to the receipts array of requested invoice (load invoice, add receiptId, save)
            function linkCurrentInvoice( itcb ) {
                //  if not replacement invoiceId given, we're done
                if ( '' === invoiceId ) { return itcb( null ); }

                //  is receipt is already referenced by the invoice then we're done
                //if ( receiptObj.referencedBy[0] === invoiceId ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': { '_id': invoiceId },
                    'callback': onCurrentInvoiceLoaded
                } );

                function onCurrentInvoiceLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    //  if requested invoice is missing then operation fails
                    if ( !result[0] ) { return itcb( Y.doccirrus.errors.rest( 404, `Invoice not found ${invoiceId}` ) ); }

                    currentInvoiceObj = result[0];

                    let newReceipts = currentInvoiceObj.receipts || [];

                    //  add receipt to this invoice and save it, invoice post-process will then update receipt
                    newReceipts.push( receiptId.toString() );
                    newReceipts = dedupStringArray( newReceipts );

                    currentInvoiceObj.receipts = newReceipts;

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'action': 'put',
                        'query': { '_id': invoiceId },
                        'data': Y.doccirrus.filters.cleanDbObject( { 'receipts': newReceipts } ),
                        'fields': [ 'receipts' ],
                        'callback': itcb
                    } );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    let errStr = JSON.stringify( err );
                    Y.log( `Problem (re)assigning receipt to invoice: ${errStr}`, 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, currentInvoiceObj );
            }

        }

        /**
         *  Raised by post-process after a receipt is saved (possibly with a different amount)
         *
         *  If this receipt is assigned to an invoice, then we must trigger a save of that invoice so that the invoice
         *  pre-processes can recalculate the total of all receipts on that invoice.
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  receipt     {Object}    Activity object
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function updateLinkedInvoice( user, receipt, callback ) {
            //  if receipt is not referenced by any invoice then there are no totals to be updated and we can skip this
            if( !receipt.referencedBy || 0 === receipt.referencedBy.length ) {
                return callback( null );
            }

            if( receipt.referencedBy.length > 1 ) {
                Y.log( `Receipt ${receipt._id} is claimed by more than one invoice: ${JSON.stringify( receipt.referencedBy )}`, 'warn', NAME );
            }

            Y.log( `Updating linked invoice(s) for receipt: ${  receipt._id}`, 'dbeug', NAME );

            //  invalidate the totalReciepts and save
            let
                invoiceId = receipt.referencedBy[0],
                putData = {
                    'totalReceipts': -1,
                    'fields_': [ 'totalReceipts' ]
                };

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'put',
                'query': { '_id': invoiceId },
                'data': Y.doccirrus.filters.cleanDbObject( putData ),
                'callback': callback
            } );
        }

        /**
         *  Utility method to change the set of receipt linked by an invoice.  Invoice pre and post-processes do all the
         *  work for this, but we need to set the 'ignoreReadOnly', and minimize reinvention by maintaining previous API
         *
         *  Note that this replaces the receipts array wholesale, and is called from invoicereceipt_modal.client.js
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.invoiceId
         *  @param  {Object}    args.originalParans.receiptIds
         *  @param  {Function}  args.callback
         */

        function claimForInvoice( args ) {
            Y.log('Entering Y.doccirrus.api.receipt.claimForInvoice', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.receipt.claimForInvoice');
            }
            let
                params = args.originalParams,
                invoiceId = params.invoiceId || null,
                receiptIds = dedupStringArray( params.receiptIds || [] ),
                putData = {
                    'receipts': receiptIds,
                    'fields_': [ 'receipts' ],
                    'ignoreReadOnly_': [ 'receipts' ]
                };

            if ( !invoiceId ) { return args.callback( Y.doccirrus.errors.rest( 404, 'invoiceId not given' ) ); }

            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'activity',
                'action': 'put',
                'query': { '_id': invoiceId },
                'data': Y.doccirrus.filters.cleanDbObject( putData ),
                'callback': onInvoiceUpdated
            } );

            function onInvoiceUpdated( err, result ) {
                args.callback( err, result && result[0] ? result[0] : result );
            }
        }


        function dedupStringArray( ary ) {
            let newAry = [], i;
            for ( i = 0; i < ary.length; i++ ) {
                if ( -1 === newAry.indexOf( ary[i] ) ) {
                    newAry.push( ary[i] );
                }
            }
            return newAry;
        }

        /**
         *  Remove receipt from any invoices which claim it (following unlink in the client from receipt editor)
         *
         *  @param  {Object}    user
         *  @param  {String}    receiptId
         *  @param  {Function}  callback    Of the form fn( err )
         */

        function checkReceiptUnlinked( user, receiptId, callback ) {
            const async = require( 'async' );

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'query': { 'receipts': receiptId },
                'callback': onInvoicesLoaded
            } );

            function onInvoicesLoaded( err, result ) {

                if ( err ) { return callback( err ); }
                if ( 0 === result.length ) { return callback( null ); }

                async.eachSeries( result, removeFromInvoice, callback );
            }

            function removeFromInvoice( invoice, itcb ) {
                let
                    newReceipts = [],
                    putData = {
                        'receipts': newReceipts,
                        'fields_': [ 'receipts' ]
                    },
                    i;

                for ( i = 0; i < invoice.receipts.length; i++ ) {
                    if ( invoice.receipts[i] !== receiptId ) {
                        newReceipts.push( invoice.receipts[i] );
                    }
                }

                Y.log( `Issuing update to invoice ${invoice._id} to unlink receipt ${receiptId}`, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'action': 'put',
                    'query': { '_id': invoice._id },
                    'data': Y.doccirrus.filters.cleanDbObject( putData ),
                    'callback': itcb
                } );
            }

        }


        /**
         *  Utility function to create a child activity recording invoice progress through billing states
         *
         *  Overall process:
         *
         *      (1) Copy properties from invoice and mix in any custom props
         *      (2) Look up form for this activity type
         *      (3) Check for default userContent template for this activity type
         *      (4) Create a new activity
         *      (5) Link from invoice
         *      (6) Save the invoice with reference to the new activity in receipt, recalculate outstanding balance with warning costs
         *      (7) Initialize a form for the new activity
         *      (8) Return the new activity id
         *
         *  @param  {Object}    user
         *  @param  {String}    actType         Of new activity (REMINDER, CREDITNOTE, WARN1, etc)
         *  @param  {Object}    props           Extra activity properties (ammounts, serial numbers, etc)
         *  @param  {Object}    invoice         Invoice this new activity is about
         */

        async function createInvoiceStateActivity( user, actType, props, invoice ) {
            const
                getFormByRoleP = util.promisify( Y.doccirrus.formsconfig.getFormByRole ),
                getDefaultUserContentP = util.promisify( Y.doccirrus.api.activitysettings.getDefaultUserContent ),
                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity );

            let
                err, result, k,
                formMeta, defaultUserContent,
                postData, newActivityId;

            const formRole = await Y.doccirrus.formsconfig.getRoleForActTypeCaseFolderId( user, actType, invoice.caseFolderId  );

            //  (1) Copy properties from invoice and mix in any custom props

            postData = {
                status: 'VALID',
                actType: actType,
                patientId: invoice.patientId,
                caseFolderId: invoice.caseFolderId,
                activities: [],
                timestamp: new Date(),
                locationId: invoice.locationId,
                employeeId: invoice.employeeId,
                employeeName: invoice.employeeName,
                invoiceNo: invoice.invoiceNo,
                invoiceId: `${invoice._id}`,
                userContent: i18n( 'activity-schema.Activity_E.' + actType )
            };

            for ( k in props ) {
                if ( props.hasOwnProperty( k ) ) {
                    postData[k] = props[k];
                }
            }

            //  (2) Look up form for this activity type

            [ err, formMeta ] = await formatPromiseResult( getFormByRoleP( user, formRole ) );

            if ( err ) {
                Y.log( `Could not look up form by role: ${formRole} for actType: ${actType}`, 'warn', NAME );
                throw err;
            }

            if ( formMeta ) {
                postData.formId = formMeta.canonicalId;
                postData.formVersionId = formMeta.latestVersionId;
            } else {
                postData.formId = '';
                postData.formVersionId = '';
            }

            //  (3) Check for default userContent template for this activity type

            [ err, defaultUserContent ] = await formatPromiseResult( getDefaultUserContentP( user, actType ) );

            if ( err ) {
                Y.log( `Could not look up settings for activity type ${actType}: ${err.stack||err}`, 'warn', NAME );
                //  not serious, continue creating the activity anyway
            }

            if ( defaultUserContent ) {
                postData.userContent = defaultUserContent;
            }

            //  (4) Create a new activity

            postData = Y.doccirrus.filters.cleanDbObject( postData );
            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: postData
                } )
            );

            if ( !err && !result[0] ) {
                err = new Error( 'New activity not created.' );
            }

            if( err ) {
                Y.log( `Could not create new activity Error: ${ err.stack || err }`, 'warn', NAME );
                throw err;
            }

            newActivityId = result[0];

            //  (5) Link from invoice

            //  add to receipts array on invoice (includes creditnotes, warning costs, bad debts, etc)
            invoice.receipts = invoice.receipts ? invoice.receipts : [];
            invoice.receipts.push( `${newActivityId}` );

            //  (6) Save the invoice with reference to the new activity in receipt, recalculate outstanding balance with warning costs
            [ err ] = await formatPromiseResult(
                Y.doccirrus.api.receipt.updateInvoiceReceiptsAndTotals( user, invoice )
            );

            if ( err ) {
                Y.log( `Problem updating invoice outstanding balance after adding ${newActivityId}: ${err.stack||err}`, 'warn', NAME );
                //  activity already created, continue, best effort
            }

            //  (7) Initialize a form for the new activity
            if ( postData.formId ) {
                [ err ] = await formatPromiseResult( initializeFormForActivityP( user, newActivityId, {}, null ) );
            } else {
                Y.log( `Missing form for ${actType}, creating activity without form.`, 'warn', NAME );
            }

            if ( defaultUserContent ) {
                //  re-save the user content to update backmappings from form
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'put',
                        query: { _id: newActivityId },
                        fields: [ 'userContent' ],
                        data: Y.doccirrus.filters.cleanDbObject( { userContent: defaultUserContent } )
                    } )
                );

                if ( err ) {
                    Y.log( `Could not update activity to set backmappings from form: ${err.stack||err}`, 'error', NAME );
                }
            }

            if ( err ) {
                Y.log( `Problem creating form for new activity ${newActivityId}: ${err.stack||err}`, 'warn', NAME );
                //  activity already created, continue, best effort
            }

            //  (8) Return the new activity id
            return newActivityId;
        }

        /**
         *  Save an invoice with a new set of receipts, and update the total
         *
         *  Linked activities API does most of the work on this, we just need to save with ignoreReadOnly
         *
         *  @param  {Object}    user
         *  @param  {Object}    invoice
         */

        async function updateInvoiceReceiptsAndTotals( user, invoice ) {
            const
                putData = {
                    receipts: invoice.receipts,
                    fields_: [ 'receipts' ],
                    ignoreReadOnly_: [ 'receipts' ],
                    skipcheck_: true
                },

                putArgs = {
                    user: user,
                    model: 'activity',
                    action: 'put',
                    query: { _id: invoice._id },
                    data: putData
                };

            let err, result;

            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( putArgs ) );

            if ( err ) {
                Y.log( `Problem updating reciepts info on invoice ${invoice.invoiceNo} ${invoice._id}: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            return result;
        }

        /*
         *  publish API
         */

        Y.namespace( 'doccirrus.api' ).receipt = {

            //  not called from client
            updateLinkedInvoice,
            createInvoiceStateActivity,
            updateInvoiceReceiptsAndTotals,

            //  REST methods
            quickCreate,                //  called via /1/ route, TODO: replace with JSONRPC calls
            assignToInvoice,
            claimForInvoice,
            checkReceiptUnlinked
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'formtemplate-api'
        ]
    }
);
