/**
 * User: dcdev
 * Date: 3/25/20  3:44 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'warning-api', function( Y, NAME ) {

    const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;
    /**
     * generates sumex PDF for warning
     * Function has following steps:
     *  1) Getting invoice from warning
     *  2) Generating Sumex documents
     *  3) Saving XML and PDF documents received from Sumex
     *  4) Storing XML in gridfs storage
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {function} args.callback
     * @returns {Object} - fileName and url of created PDF (xml and pdf are stored in gridFs
     */
    async function generateSumexDocuments({user, originalParams: {warning}, callback}) {
        Y.log(`Entering Y.doccirrus.api.warning.generateSumexDocuments()`, 'info', NAME);
        if( callback ) {
            callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.warning.generateSumexDocuments' );
        }
        let err, result, invoiceentry;

    //---------------------------------------- 1) Getting invoice from warning -----------------------------------------

        if(!warning.referencedBy[0]) {
            err = Y.doccirrus.errors.rest( 'sumex_07' );
            Y.log("No invoceRef referanced to activity!", 'error', NAME);
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        [err, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
            user,
            action: 'get',
            model: 'activity',
            query: {_id: warning.referencedBy[0]}
        }));

        if(err) {
            Y.log(`error trying to get invoiceRef activity by id ${warning.referencedBy[0]}: ${err}`, 'error', NAME );
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        if (!result || !result.length) {
            err = Y.doccirrus.errors.rest( 'sumex_07', null, true );
            Y.log(`no result for invoiceref activity from ${warning.referencedBy[0]} , continue without generating xml`, 'error', NAME );
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        if (!result[0] || !['INVOICEREF', 'INVOICE'].includes(result[0].actType) ) {
            err = Y.doccirrus.errors.rest( 'sumex_07', null, true );
            Y.log(`activity ${ warning._id } not linked to INVOICEREF, continue without generating xml`, 'info', NAME );
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        const invoice = result[0];

        if(!Array.isArray(invoice.activities) || invoice.activities.length === 0) {
            Y.log(`Invoice ${invoice._id} has no linked activities!`, 'error', NAME);
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        if(invoice.actType === 'INVOICEREF') {
            [err, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                action: 'get',
                model: 'invoiceentry',
                query: { $or: [
                        {'data.treatments': {$elemMatch: {_id: invoice.activities[0]}}},
                        {'data.medications': {$elemMatch: {_id: invoice.activities[0]}}}
                    ]}      //todo investigate this case and this query. Might take wrong activity
            }));

            if(err) {
                Y.log(`error trying to get invoiceentry from treatment ${invoice.activities[0]}: ${err}`, 'error', NAME );
                return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
            }

            if (!result || !result.length) {
                err = Y.doccirrus.errors.rest( 'sumex_07', null, true );
                Y.log(`no result for invoiceentry from treatment ${invoice.activities[0]}`, 'error', NAME );
                return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
            }

            // _id of invoiceentry required for settings file
            invoiceentry = result[0];
        } else {
            invoiceentry = {_id: invoice._id};
        }

        let fileName = `${warning._id}-${invoiceentry._id}`;

    //----------------------------------------- 2) Generating Sumex documents ------------------------------------------
        [err, result] = await formatPromiseResult(
            Y.doccirrus.api.sumex.generateWarningDocuments({user, warning, invoice})
        );

        if( err ) {
            Y.log( `generateSumexDocuments(): error in sending iGeneralInvoiceRequest operations for patient ${warning.patientId} and tarmedlog ${warning._id}.`, 'error', NAME );
            alertErrorsToClient(user, {err, type: 'generation'});
            return handleResult(new Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }
        const {errors, xml, pdf} = result;

        if(errors && errors.length) {
            Y.log(`Sumex documents generation failed with ${errors.length} errors`, 'error', NAME);
            alertErrorsToClient(user, {errors, type: 'generation'});
            err = Y.doccirrus.errors.rest('sumex_07');
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

    //------------------------------ 3) Saving XML and PDF documents received from Sumex -------------------------------

        [err, result] = await formatPromiseResult(Y.doccirrus.tarmedInvoices.createDocumentsFromFiles({
            user, xml, pdf, fileName, activityId: warning._id
        }));

        if(err) {
            Y.log(`Sumex documents generation for warning ${warning._id} failed\nError: ${err.stack || err}`, 'error', NAME);
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        [err, result] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.saveAttachmentsToActivity( {
            user, activity: warning, createdDocuments: result
        } ) );

        if( err ) {
            Y.log( `generateSumexDocuments(): error in saving attachments for warning ${warning._id}.\n${err && err.stack || err}`, 'error', NAME );
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        const {pdfDoc, xmlDoc} = result;

    //--------------------------------------- 4) Storing XML in gridfs storage -----------------------------------------

        const xmlFileName = xmlDoc.media.origFilename.split('/').pop();
        [err] = await formatPromiseResult( new Promise( ( resolve, reject ) => Y.doccirrus.gridfs.store(
            user, xmlFileName, {},
            Buffer.from( xml ),
            ( err, result ) => err ? reject( err ) : resolve( result )
        ) ) );

        if( err ) {
            Y.log( `generateSumexDocuments(): error in saving invoice XML over gridfs for activity ${warning._id}.\n${err && err.stack || err}`, 'error', NAME );
            return handleResult(new  Y.doccirrus.commonerrors.DCError(400, {message: err}), null , callback);
        }

        return callback(null, {xmlFileName, fullUrl: pdfDoc.document.url});
    }

    /**
     * generates inkasso PDF for invoice
     * Function has following steps:
     *  1) Get warning from invoice
     *  2) Send request to Sumex
     *  3) Create documents and save them into activity
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.invoice
     * @returns {Object} - fileName and url of created PDF
     */
    async function generateInkassoPdf( {user, invoice} ) {
        const linkedTimestamps = invoice.linkedTimestamps || [],
            invoiceId = invoice._id.toString();

        let linkedContents = invoice.linkedContents || [],
            error, result, warning = {}, linkedTimestamp, linkedContent, createdDocuments;

        // ------------------------------------- 1) Get warning from invoice ------------------------------------------

        //find latest warning
        linkedContent = linkedContents.find( content => content.actType === 'WARNING2' )
                        || linkedContents.find( content => content.actType === 'WARNING1' );

        if( linkedContent ) {
            linkedTimestamp = linkedTimestamps.find( t => t.receiptId === linkedContent.receiptId ) || {};
            warning = {
                _id: linkedContent.receiptId,
                timestamp: linkedTimestamp.timestamp,
                actType: linkedContent.actType
            };
        }
        if( !warning.timestamp ) {
            //looking for warning in database
            [error, linkedContents] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: {
                        $in: ['WARNING1', 'WARNING2']
                    },
                    referencedBy: [
                        invoiceId
                    ]
                }
            } ) );

            if( error ) {
                Y.log( `Cannot generate inkasso PDF: error in getting warnings for invoice ${invoice._id}. Error:\n${error.stack || error}`, 'error', NAME );
                error = new Y.doccirrus.commonerrors.DCError( 200, {message: 'Warning for invoice not found.'} );
                throw error;
            }

            warning = linkedContents.find( content => content.actType === 'WARNING2' )
                      || linkedContents.find( content => content.actType === 'WARNING1' );

            if( !warning || !warning.timestamp ) {
                Y.log( `Cannot generate inkasso PDF: Warnings for invoice ${invoice._id} not found!`, 'error', NAME );
                error = new Y.doccirrus.commonerrors.DCError( 200, {message: 'Warning for invoice not found.'} );
                throw error;
            }
        }

        // ------------------------------------- 2) Send request to Sumex ------------------------------------------

        [error, result] = await formatPromiseResult( Y.doccirrus.api.sumex.generateInkassoPdf( {
            user, invoice, warning
        } ) );

        if(error) {
            Y.log(`Sumex request for inkasso pdf failed. Error:\n${error.stack || error}`, 'error', NAME);
            alertErrorsToClient(user, {err: error, type: 'generation'});
            Y.log(`Exiting Y.doccirrus.api.warning.generateInkassoPdf due to error`, 'info', NAME);
            throw error;
        }
        if(result.errors && result.errors.length) {
            Y.log( `generateInkassoPdf(): error in generating iGeneralInvoiceRequest for invoice ${invoiceId}.`, 'error', NAME );
            alertErrorsToClient(user, {errors: result.errors, type: 'generation'});
            Y.log(`Exiting Y.doccirrus.api.warning.generateInkassoPdf`, 'info', NAME);
            throw error;
        }

        const inkassoPdf = result.pdf,
            inkassoPdfFileName = `${invoiceId}-inkasso`;

        // ------------------------- 3) Create documents and save them into activity ----------------------------------

        [error, createdDocuments] = await formatPromiseResult(Y.doccirrus.tarmedInvoices.createDocumentsFromFiles({
            user, pdf: inkassoPdf, fileName: inkassoPdfFileName, activityId: invoiceId
        }));

        if( error ) {
            Y.log( `generateInkassoPdf(): failed to create document for invoice ${invoiceId}.\n${error && error.stack || error}`, 'error', NAME );
            Y.log(`Exiting Y.doccirrus.api.warning.generateInkassoPdf`, 'info', NAME);
            throw error;
        }

        [error, result] = await formatPromiseResult(Y.doccirrus.tarmedInvoices.saveAttachmentsToActivity({
            user, activity: invoice, createdDocuments
        }));
        if( error ) {
            Y.log( `generateInkassoPdf(): failed to attach inkasso pdf to invoice ${invoiceId}.\n${error && error.stack || error}`, 'error', NAME );
            Y.log(`Exiting Y.doccirrus.api.warning.generateInkassoPdf`, 'info', NAME);
            throw error;
        }
        return result;
    }

    function alertErrorsToClient(user, data) {
        Y.doccirrus.communication.emitEventForUser( {
            targetId: user.identityId,
            event: 'sumexError',
            msg: { data }
        } );
    }

    Y.namespace( 'doccirrus.api' ).warning = {
        name: NAME,
        generateSumexDocuments,
        generateInkassoPdf
    };
}, '0.0.1', {
    requires: ['sumex', 'sumex-mappers', 'sumex-generalInvoiceRequest450', 'dcgridfs']
} );