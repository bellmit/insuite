/**
 * User: Mykhaylo Dolishniy
 * Date: 25/05/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'invoice-api', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            _ = require( 'lodash' ),
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            virtualActivity = new Y.doccirrus.ActivityUtils( 'invoice' ),
            getInvoiceConfiguration = promisifyArgsCallback( Y.doccirrus.api.invoiceconfiguration.get ),
            getActivities = promisifyArgsCallback( Y.doccirrus.api.activity.get );

        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        /**
         * This function gets invoice configuration to receive values of dunning schemas to define if some invoice for
         * particular patient is overdue or not. It's used inside PatientGadgetInvoices when option 'showOnlyOverdue' selected
         * As result it returns and array of overdue invoices
         * @param {object} user
         * @param {object} query
         * @param {string} query.patientId
         * @param {object} options
         * @param {function} callback
         * @returns {Promise.<*>}
         */
        async function getOverdueInvoices( {user, query = {}, options = {}, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.invoice.getOverdueInvoices', 'info', NAME );
            if( callback ) {
                callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.invoice.getOverdueInvoices' );
            }

            let err, invoiceConfiguration, days, invoices, overdueInvoices = [],
                invoiceBilledDate = '', totalReceiptsOutstanding,
                reminderDays, warning1Days, warning2Days, status;

            if( !query || !query.patientId ) {
                Y.log( `getOverdueInvoices: Not enough params`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, { message: 'No patient id provided.' } ), undefined, callback );
            }

            [err, invoiceConfiguration] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoiceconfiguration.get( {
                        user,
                        query: {},
                        callback( err, config ){
                            if( err ) {
                                return reject( err );
                            }
                            resolve( config );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `getOverdueInvoices: Problem getting invoiceConfiguration: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !invoiceConfiguration || !invoiceConfiguration[0] || !invoiceConfiguration[0].dunningSchemes ) {
                Y.log( `getOverdueInvoices: There are no dunning schemas inside invoice configuration`, 'warn', NAME );
                return handleResult( undefined, [], callback );
            }

            days = invoiceConfiguration[0].dunningSchemes;

            [err, invoices] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        patientId: query.patientId,
                        actType: 'INVOICE',
                        status: { $nin: ['CREDITED', 'PARTIALPAYMENT', 'DERECOGNIZED', 'PREPARED'] },
                        invoiceBilledDate: {$exists: true}
                    },
                    options: {
                        lean: true,
                        sort: { timestamp: -1 },
                        limit: options.limit
                    }
                } )
            );

            if( err ) {
                Y.log( `getOverdueInvoices: Problem getting invoices: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !invoices || !invoices[0] ) {
                Y.log( `getOverdueInvoices: There are no invoices to process`, 'warn', NAME );
                return handleResult( undefined, [], callback );
            }

            invoices.forEach( ( item ) => {

                invoiceBilledDate = item.invoiceBilledDate;
                totalReceiptsOutstanding = ( 0 === Number( parseFloat( item.totalReceiptsOutstanding ).toFixed( 2 ) ) );
                status = ['CREDITED', 'PARTIALPAYMENT', 'DERECOGNIZED'];

                if( invoiceBilledDate && days && days.length && -1 === status.indexOf( item.status ) ) {

                    days.forEach( ( day ) => {
                        if( day.locationId === item.locationId ) {
                            reminderDays = day.reminderDays;
                            warning1Days = day.warning1Days;
                            warning2Days = day.warning2Days;
                        }
                    });

                    if( !reminderDays && !warning1Days && !warning2Days ) {
                        // set default if not found
                        reminderDays = days[0].reminderDays;
                        warning1Days = days[0].warning1Days;
                        warning2Days = days[0].warning2Days;
                    }

                    // suggestion: use getWarningDates to refactor this function

                    if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= reminderDays ) && !totalReceiptsOutstanding && 'WARN1' !== item.status ) {
                        overdueInvoices = [...overdueInvoices, item];
                    }
                    if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= warning1Days ) && !totalReceiptsOutstanding ) {
                        overdueInvoices = [...overdueInvoices, item];
                    }
                    if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= warning2Days ) && !totalReceiptsOutstanding ) {
                        overdueInvoices = [...overdueInvoices, item];
                    }
                }
            } );

            return handleResult( undefined, overdueInvoices, callback );
        }

        /**
         * Returns the warning dates as js Date and moment date
         * or throws error
         * @param {Object} args
         * @param {Object} args.invoice
         * @param {Object} [args.user]
         * @param {Object} [args.invoiceConfiguration]
         * @returns {{remindingDate: *, warningDate2: *, warningDate1: *}}
         */
        async function getWarningDates( args ) {
            Y.log( 'Executing Y.doccirrus.api.invoice.getWarningDates', 'debug', NAME );
            const
                {invoice = {}, user} = args,
                ignoredStatusTypes = ['CREDITED', 'PARTIALPAYMENT', 'DERECOGNIZED'],
                warningDates = {};
            let
                {invoiceConfiguration} = args,
                invoiceBilledDateMoment = moment( invoice.invoiceBilledDate ),
                dunningSchemeForBS,
                error;

            if( !invoice.invoiceBilledDate || invoice.totalReceiptsOutstanding === 0 || ignoredStatusTypes.includes( invoice.status ) ) {
                error = 'invalid invoice for generating warningDates.';
                Y.log( `getWarningDates: ${error}`, 'debug', NAME );
                throw new Error( error );
            }

            // If invoiceConfiguration wasn't passed as argument, get it now
            if( !invoiceConfiguration ) {
                [error, invoiceConfiguration] = await formatPromiseResult(
                    getInvoiceConfiguration( {
                        user,
                        query: {}
                    } )
                );

                if( error ) {
                    Y.log( `getWarningDates: error while getting invoiceConfiguration: ${error.stack || error}`, 'warn', NAME );
                    throw error;
                }

                if( !invoiceConfiguration || !Array.isArray( invoiceConfiguration ) || !invoiceConfiguration.length ) {
                    error = 'found no invoice configuration';
                    Y.log( `getWarningDates: ${error}`, 'warn', NAME );
                    throw new Error( error );
                }

                invoiceConfiguration = invoiceConfiguration[0];
            }

            const {dunningSchemes} = invoiceConfiguration;

            if( !dunningSchemes || !Array.isArray( dunningSchemes )  || !dunningSchemes.length ) {
                error = `found no dunning scheme in invoice configuration`;
                Y.log( `getWarningDates: error: ${error}`, 'debug', NAME );
                throw new Error( error );
            }

            dunningSchemeForBS = dunningSchemes.find( ( scheme ) => (scheme.locationId === invoice.locationId) );

            const daysUntilWarning = {
                reminder: dunningSchemeForBS && dunningSchemeForBS.reminderDays || dunningSchemes[0].reminderDays,
                warning1: dunningSchemeForBS && dunningSchemeForBS.warning1Days || dunningSchemes[0].warning1Days,
                warning2: dunningSchemeForBS && dunningSchemeForBS.warning2Days || dunningSchemes[0].warning2Days
            };

            for( const warningType in daysUntilWarning ) {
                if( !daysUntilWarning.hasOwnProperty( warningType ) || !daysUntilWarning[warningType] ) {
                    continue;
                }

                warningDates[`${warningType}DateMoment`] = invoiceBilledDateMoment.clone().add( daysUntilWarning[warningType], 'days' );
                warningDates[`${warningType}Date`] = warningDates[`${warningType}DateMoment`].toDate();
            }

            return warningDates;
        }

        /**
         * Adds the warning dates and reminder date to the list of invoices passed in args
         *
         * @param {Object} args
         * @param {Array} args.invoices
         * @param {Object} args.user
         * @returns {Promise<Array>} list of invoices
         */
        async function addWarningDateAndBillingAddressToInvoices( args ) {
            Y.log( 'Executing Y.doccirrus.api.invoice.addWarningDateAndBillingAddressToInvoices', 'info', NAME );
            const {invoices, user} = args;
            let error, invoiceConfiguration, warningDates, billingAddress;

            [error, invoiceConfiguration] = await formatPromiseResult(
                getInvoiceConfiguration( {
                    user,
                    query: {}
                } )
            );

            if( error ) {
                Y.log( `addWarningDateAndBillingAddressToInvoices: error while getting invoiceConfiguration: ${error.stack || error}`, 'warn', NAME );
                throw error;
            }

            if( !invoiceConfiguration || !invoiceConfiguration.length ) {
                error = 'failed to find an invoice configuration';
                Y.log( `addWarningDateAndBillingAddressToInvoices: ${error}`, 'warn', NAME );
                throw new Error( error );
            }

            invoiceConfiguration = invoiceConfiguration[0];

            Y.log( `addWarningDateAndBillingAddressToInvoices: iterating over ${invoices.length} invoices`, 'info', NAME );

            // Add warning dates
            for( const invoice of invoices ) {
                [error, warningDates] = await formatPromiseResult(
                    getWarningDates( {invoice, invoiceConfiguration} )
                );

                if( error ) {
                    Y.log( `addWarningDateAndBillingAddressToInvoices: error while getting warning dates: ${error.stack || error}`, 'debug', NAME );
                    continue;
                }

                if( !warningDates || !Object.keys(warningDates).length ) {
                    continue;
                }

                for( const dateType in warningDates ) {
                    if( !warningDates.hasOwnProperty( dateType ) ) {
                        continue;
                    }

                    invoice[dateType] = warningDates[dateType];
                }
            }

            // Add billing address
            for( const invoice of invoices ) {
                [error, billingAddress] = await formatPromiseResult(
                    getBillingAddress( {user, invoice} )
                );

                if( error ) {
                    Y.log( `addWarningDateAndBillingAddressToInvoices: error while getting billing address: ${error.stack || error}`, 'debug', NAME );
                    continue;
                }

                if( !billingAddress ) {
                    continue;
                }

                invoice.billingAddress = billingAddress;
            }

            return invoices;
        }

        /**
         * Returns the billing address for the given invoice (activity)
         * otherwise it returns null or throws error
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.invoice
         * @returns {Promise<null|String>}
         */
        async function getBillingAddress( args ) {
            Y.log( 'Executing Y.doccirrus.api.invoice.getBillingAddress', 'info', NAME );
            const
                {invoice, user} = args,
                ignoredStatusTypes = [ 'VALID', 'APPROVED', 'CANCELLED' ];
            let error, documents;

            if( !invoice.attachments || !invoice.attachments.length || ignoredStatusTypes.includes( invoice.status ) ) {
                Y.log( `getBillingAddress: invalid invoice for generating billing address`, 'debug', NAME );
                return null;
            }

            const documentIds = invoice.attachments.map( ObjectId );

            [error, documents] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'document',
                    query: {_id: {$in: documentIds}}
                } )
            );

            if( error ) {
                Y.log( `getBillingAddress: error while getting form: ${error.stack || error}`, 'warn', NAME );
                throw error;
            }

            if( !documents || !documents.length ) {
                Y.log( `getBillingAddress: found no document for invoice`, 'debug', NAME );
                return null;
            }

            for( const document of documents ) {
                if( !document.formState || !document.formState.receiver ) {
                    continue;
                }

                return document.formState.receiver;
            }
        }

        /**
         *
         * @param args
         * @param args.user
         * @param args.invoice
         * @param args.lastSchein
         * @param args.caseFolder
         * @returns {Promise<{caseFolderType: *, data: (*|{referenceNo: *, patient: *, medications: *, invoiceNo: *, caseFolderTypeSingle: *, diagnoses: *, treatments: *}), _id: *}>}
         */
        async function invoiceToInvoiceEntry( args ) {
            const {user, invoice} = args;
            let
                {lastSchein, caseFolder} = args,
                err, res, patient, activities = [], diagnoses = [], continuousDiagnoses = [];

            if( !lastSchein ) {
                const lastScheinPromise = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein ),
                    {patientId, timestamp, caseFolderId, locationId} = invoice;

                [err, res] = await formatPromiseResult( lastScheinPromise( {
                    user, query: {patientId, timestamp, caseFolderId, locationId}
                } ) );

                if( err || !Array.isArray( res ) || !res.length ) {
                    err = err || Y.doccirrus.errors.rest( 'sumex_07' );
                    Y.log( `invoiceToInvoiceEntry: Error in getting schein for ${invoice._id}: ${err.stack || err}`, 'error', 'activity-process.server' );
                    throw err;
                }
                lastSchein = res[0];
            }
            if( !caseFolder ) {
                [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    query: {_id: invoice.caseFolderId}
                } ) );
                if( err || !Array.isArray( res ) || !res.length ) {
                    err = err || Y.doccirrus.errors.rest( 'sumex_07' );
                    Y.log( `invoiceToInvoiceEntry: Error in getting caseFolder for ${invoice._id}: ${err.stack || err}`, 'error', 'activity-process.server' );
                    throw err;
                }
                caseFolder = res[0];
            }

            [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'get',
                query: {_id: invoice.patientId},
                options: {
                    select: Y.doccirrus.api.tarmedlog.invoiceFields.patientFields
                }
            } ) );

            if( err ) {
                Y.log( `invoiceToInvoiceEntry(): could not get patient by ID ${invoice.patientId} from invoice ${invoice._id}: ${err}`, 'error', NAME );
                throw err;
            }
            patient = res[0];

            if( invoice.activities && invoice.activities.length ) {
                [err, activities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {_id: {$in: invoice.activities}}
                } ) );

                if( err ) {
                    Y.log( `invoiceToInvoiceEntry(): could not get activities ${invoice.activities} from invoice ${invoice._id}: ${err}`, 'error', NAME );
                    throw err;
                }
            }

            if( (invoice.icds && invoice.icds.length) || (lastSchein.continuousIcds && lastSchein.continuousIcds.length) ) {
                const invoiceIcds = invoice.icds || [],
                    scheinIcds = lastSchein.continuousIcds || [];

                let allDiagnoses;

                [err, allDiagnoses] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        _id: {$in: invoiceIcds.concat( scheinIcds )},
                        actType: 'DIAGNOSIS',
                        diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
                        diagnosisType: {$in: ['CONTINUOUS', 'ACUTE']},
                        // Some times diagnises don't have this value at all, but we still need to collect them
                        areTreatmentDiagnosesBillable: {
                            $ne: '0'
                        }
                    }
                } ) );
                if( err ) {
                    Y.log( `invoiceToInvoiceEntry(): could not get diagnoses ${invoice.icds} from invoice ${invoice._id}: ${err}`, 'error', NAME );
                }

                if( allDiagnoses && allDiagnoses.length ) {
                    continuousDiagnoses = allDiagnoses.filter(d => d.diagnosisType === "CONTINUOUS");
                    diagnoses = allDiagnoses.filter(d => d.diagnosisType === "ACUTE");
                }
            }
            const treatments = [],
                medications = [],
                invoiceNo = invoice.invoiceNo || '0000000';
            const referenceNo = await Y.doccirrus.api.tarmedlog.countReferenceNumber( {
                user,
                invoice: {...invoice, invoiceNo}
            } );

            let medicationFields, treatmentFields;
            try {
                medicationFields = Y.doccirrus.api.tarmedlog.invoiceFields.medicationFields;
                treatmentFields = Y.doccirrus.api.tarmedlog.invoiceFields.treatmentFields;
            } catch {
                Y.log('invoiceToInvoiceEntry: Could not get special fields for medications and treatments. getting all fields', NAME, 'warn');
            }

            activities.forEach( activity => {
                switch( activity.actType ) {
                    case 'MEDICATION':
                        medications.push( medicationFields ? _.pick( activity, Object.keys( medicationFields ) ) : activity );
                        break;
                    case 'TREATMENT':
                        treatments.push( treatmentFields ? _.pick( activity, Object.keys( treatmentFields ) ) : activity );
                }
            } );
            return {
                _id: lastSchein._id,
                caseFolderType: caseFolder.type,
                data: {
                    ...lastSchein,
                    invoiceNo: invoiceNo.replace( /[^0-9]/g, '' ),
                    patient,
                    caseFolderTypeSingle: caseFolder.type,
                    treatments,
                    medications,
                    diagnoses,
                    continuousDiagnoses,
                    referenceNo
                }
            };
        }

        /**
         *
         * @param args
         * @param args.user
         * @param args.invoice
         * @param args.caseFolder
         * @param args.lastSchein
         * @param args.callback
         * @returns {Promise<*>}
         */
        async function generateSumexDocuments( args ) {
            const {user, invoice, caseFolder, lastSchein} = args;
            Y.log( 'Entering Y.doccirrus.api.invoice.generateSumexDocuments', 'info', NAME );
            let
                {callback} = args,
                err, res, schein;
            if( callback ) {
                callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( callback, 'Exiting Y.doccirrus.api.invoice.generateSumexDocuments' );
            }
            [err, schein] = await formatPromiseResult( invoiceToInvoiceEntry( {user, invoice, caseFolder, lastSchein} ) );
            if( err ) {
                Y.log( `Failed to convert invoice ${invoice._id} to invoiceentry.\nError: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, res] = await formatPromiseResult( Y.doccirrus.api.sumex.generalInvoiceRequest( {
                invoicelogId: invoice._id,
                schein,
                user,
                requestType: 'generate'
            } ) );

            if( err ) {
                Y.log( `Failed to send invoice ${invoice._id} to Sumex: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( res.errors && res.errors.length ) {
                Y.log( `Failed to send invoice ${invoice._id} to Sumex`, 'error', NAME );
                return callback( null, {errors: res.errors} );
            }

            const {xml, pdf} = res,
                patientId = schein.data.patient._id.toString(),
                fileName = `${patientId}-${invoice._id}`;

            [err, res] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.createDocumentsFromFiles( {
                user, xml, pdf, fileName, activityId: invoice._id
            } ) );

            if( err ) {
                Y.log( `Sumex documents generation for invoice ${invoice._id} failed\nError: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            invoice.attachments = invoice.attachments.concat( res.attachments );
            const pdfDoc = res.pdfDoc;

            if( schein.data.docPrinted ) {
                [err, res = {}] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.generateInvoiceCopy( {
                    user,
                    xml,
                    ownerId: invoice._id,
                    schein
                } ) );
                if( err || !res ) {
                    Y.log( `Failed to generate invoice copy for patient ${patientId} and invoice ${invoice._id}`, 'error', NAME );
                } else if( res.errors && res.errors.length ) {
                    Y.log( `SUMEX: getPdfFromInvoice(): errors in generating invoice copy for patient ${patientId} and invoice ${invoice._id}.`, 'error', NAME );
                } else if( res.copyPdf ) {
                    invoice.attachments.push( res.copyPdf._id );
                }
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'put',
                query: {_id: invoice._id},
                data: Y.doccirrus.filters.cleanDbObject( {
                    attachments: invoice.attachments,
                    referenceNo: schein.data.referenceNo
                } ),
                fields: ['attachments', 'referenceNo']
            } ) );

            if( err ) {
                Y.log( `getPdfFromInvoice() failed to update invoice ${invoice._id} with new attachments: ${err}`, 'error', NAME );
            }

            if( pdfDoc && pdfDoc.media ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: 'onPDFCreated',
                    msg: {
                        data: {
                            'status': 'complete',
                            'mediaId': pdfDoc.media._id,
                            'activity': invoice,
                            'owner': invoice
                        }
                    }
                } );
            }
            const fullUrl = ((pdfDoc || {}).document || {}).url || '';

            return callback( null, {fullUrl: fullUrl} );
        }

        /**
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {String} args.patientId
         * @param {String} args.caseFolderId
         * @param {String} [args.invoiceNo]
         * @param {String} [args.referenceNo]
         * @return {Promise<module:v_invoicerefSchema.v_invoiceref|Object>} InvoiceRef
         */
        async function findInvoiceRef( args ) {
            const {
                patientId,
                caseFolderId,
                invoiceNo,
                referenceNo,
                user
            } = args;

            if( !user ){
                throw new Y.doccirrus.commonerrors.DCError( 500, {message: `missing 'user' argument`} );
            }
            if( !patientId ){
                throw new Y.doccirrus.commonerrors.DCError( 500, {message: `missing 'patientId' argument`} );
            }
            if( !invoiceNo && !referenceNo ){
                throw new Y.doccirrus.commonerrors.DCError( 500, {message: `missing 'invoiceNo' or 'referenceNo' argument`} );
            }

            const query = {
                actType: 'INVOICEREF',
                patientId: patientId,
                caseFolderId: caseFolderId,
                ...(invoiceNo && {invoiceNo: invoiceNo}),
                ...(referenceNo && {invoiceRefNo: new RegExp( `^${referenceNo}` )})
            };

            return Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                action: 'get',
                query: query,
                options: {
                    lean: true
                }
            } );
        }

        /**
         * Quick fix solution for KUN-209:
         * Date parameters in (get-) query do not convert to Date automatically.
         * This function transforms the query accordingly or throws CastError if query has invalid Date.
         *
         * @param {String} dateParam    name of query parameter to convert
         * @param {Object} query        (get-) query object
         */
        function castAdditionalDateParamForQuery ( dateParam, query ) {
            let
                dateStr;

            function isValidDate( dateStr ) {
                return moment( dateStr ).isValid();
            }

            function throwCastError( dateStr ) {
                const error = new Error(`Cast to date failed for value "${dateStr}"`);
                error.name = 'CastError';
                throw error;
            }

            // In case query is object with $gt, $lt, ...
            if( typeof query[dateParam] === 'object' ) {
                // eslint-disable-next-line guard-for-in
                for( const operator in query[dateParam] ) {
                    dateStr = query[dateParam][operator];
                    if( isValidDate( dateStr ) ) {
                        query[dateParam][operator] = moment.utc( dateStr ).toDate();
                    } else {
                        throwCastError( dateStr );
                    }
                }
            } else {
                dateStr = query[dateParam];
                if( isValidDate( dateStr ) ) {
                    query[dateParam] = moment.utc( dateStr ).toDate();
                } else {
                    throwCastError( dateStr );
                }
            }
        }

        Y.namespace( 'doccirrus.api' ).invoice = {
            get: async function GET( args ) {
                let error, invoices;

                Y.log( 'Entering Y.doccirrus.api.invoice.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.get' );
                }
                virtualActivity.filterActivity( args, 'get' );

                // Quick fix for KUN-209: v_invoice-schema isn't assigned to DCModel, so conversion from String to Date doesn't happen automatically
                const additionalDateQueryParams = ['invoiceDate', 'invoiceBilledDate'];

                for( const dateParam of additionalDateQueryParams ) {
                    if( !args.query[dateParam] ) {
                        continue;
                    }
                    try {
                        castAdditionalDateParamForQuery( dateParam, args.query );
                    } catch( error ) {
                        Y.log( `invoice-api.get: ${error.stack || error}`, 'error', NAME );
                        return handleResult( error, undefined, args.callback );
                    }
                }

                [error, invoices] = await formatPromiseResult(
                    getActivities( {
                        user: args.user,
                        migrate: args.migrate,
                        query: args.query,
                        options: args.options
                    } )
                );

                if( error ) {
                    Y.log( `invoice-api.get: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, undefined, args.callback );
                }

                invoices = invoices.result || [];

                [error, invoices] = await formatPromiseResult(
                    addWarningDateAndBillingAddressToInvoices( {user: args.user, invoices} )
                );

                if( error ) {
                    Y.log( `invoice-api.get: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, undefined, args.callback );
                }

                return handleResult( error, invoices, args.callback );
            },

            post: function POST( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.post' );
                }
                virtualActivity.filterActivity( args, 'post' );
                if( args.data && args.data.invoiceNo ) {
                    delete args.data.invoiceNo;
                }
                // update some auto-generated fields
                args.data.catalog = true;  // need a good solution for this
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.post( args );
            },

            put: function PUT( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.put', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.put' );
                }
                virtualActivity.filterActivity( args, 'put' );
                if( args.data && args.data.invoiceNo ) {
                    delete args.data.invoiceNo;
                }
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.upsert', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.upsert' );
                }
                virtualActivity.filterActivity( args, 'upsert' );
                if( args.data && args.data.invoiceNo ) {
                    delete args.data.invoiceNo;
                }
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.delete' );
                }
                let
                    callback = args.callback;

                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            },

            /**
             *  Called by GKV invoice modal to create a PUBRECEIPT activity and print a PDF from it
             *
             *  Overall process:
             *
             *      1. Check given arguments
             *      2. Look up the form to be used for PUBRECEIPT activities
             *      3. Load the patient this PUBRECEIPT belongs to
             *      4. Populate activity data (employee, location, etc)
             *      5.a Save a new PUBRECEIPT activity to the database
             *      5.b Overwrite an existing PUBRECEIPT activity in the database
             *      6. Update the invoice log, if given
             *      7. Make a PDF from the PUBRECEIPT activity
             *      X. Call back with new information
             *
             *  @param  args                                    {Object}
             *  @param  args.user                               {Object}    REST user or equivalent
             *  @param  args.callback                           {Function}  Of the form fn( err, { activityId, [mediaId] } )
             *  @param  args.originalParams                     {Object}
             *
             *  Data needed to create the PUBRECEIPT
             *
             *  @params args.originalParams.caseFolderId        {String}    _id of Casefolder to create PUBRECEIPT in
             *  @param  args.originalParams.patientId           {String}    _id of patient this relates to
             *  @param  args.originalParams.content             {String}    Description for the new activity
             *  @param  args.originalParams.treatmentIds        [{String}]  Array of treatment _ids
             *
             *  If recreating pubreceipts on approving a GKV log then overwrite this activity:
             *
             *  @param  args.originalParams.replaceId           {String}    Optional - _id of exiting PUBRECEIPT to replace
             *
             *  If (re)creating from a GKV log then note the new PUBRECEIPT and its PDF in log entries
             *
             *  @param  args.originalParams.invoiceLogId        {String}    invoice log to record new PUBRECEIPT on (optional)
             *  @param  args.originalParams.scheinId            {String}    _id of schein this pubreceipt was generated from (optional)
             *
             *  Note final pubreceipts for patient and GKV log, to trigger compilation of batch PDFs
             *
             *  @param  args.originalParams.compilePatientPDFs  {Boolean}   if true then make PDF from all pubreceipts for patient
             *  @param  args.originalParams.compileAllPDFs      {Boolean}   if true then make PDF from all pubreceipts for log
             *
             */

            createPubReceipt: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.createPubReceipt', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.createPubReceipt' );
                }
                const async = require( 'async' );

                let
                    self = this,

                    params = args.originalParams,

                    formRole = ( ( params.formRole && '' !== params.formRole ) ? params.formRole : 'casefile-patientreciept' ),

                    activity = {
                        'actType': 'PUBRECEIPT',
                        'status': 'VALID',
                        'formId': params.formId || null,
                        'caseFolderId': params.caseFolderId || null,
                        'patientId': params.patientId || null,
                        'employeeId': args.user.specifiedBy || null,
                        'activities': params.treatmentIds || [],
                        'timestamp': (new Date()).toISOString()
                    },

                    invoiceLogId = params.invoiceLogId || '',
                    scheinId = params.scheinId || '',

                    patient;

                async.series(
                    [
                        checkArgs,
                        getFormId,
                        loadPatient,
                        loadActivityData,
                        createActivity,
                        createFormForActivity,
                        recordInLog,
                        makePdf
                    ],
                    onAllDone
                );

                //  1. Check given arguments
                function checkArgs( itcb ) {
                    if( !activity.caseFolderId ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Missing required argument caseFolderId' ) );
                    }
                    if( !activity.patientId ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Missing required argument patientId' ) );
                    }
                    if( !activity.employeeId ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Missing required argument employeeId' ) );
                    }
                    itcb( null );
                }

                //  2. Look up the form to be used for PUBRECEIPT activities
                function getFormId( itcb ) {
                    //  if formId was given by caller then we can skip this step
                    if( activity.formId && '' !== activity.formId ) {
                        return itcb( null );
                    }

                    Y.doccirrus.formsconfig.getConfig( args.user, onFormsConfigLoaded );

                    function onFormsConfigLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }

                        if( result[formRole] ) {
                            activity.formId = result[formRole];
                        }

                        if( !activity.formId ) {
                            return itcb( Y.doccirrus.errors.rest( 500, `Form not found for ${  formRole}`, true ) );
                        }

                        itcb( null );
                    }
                }

                //  3. Load the patient this PUBRECEIPT belongs to
                function loadPatient( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'patient',
                        'query': {'_id': activity.patientId},
                        'options': {'lean': true},
                        'callback': onPatientLoaded
                    } );

                    function onPatientLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Patient not found', true );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        patient = result[0];
                        itcb( null );
                    }
                }

                //  4. Populate activity data (employee, location, etc)
                function loadActivityData( itcb ) {
                    Y.doccirrus.api.activity.getActivityDataForPatient( {
                        'user': args.user,
                        'data': {
                            'caseFolder': {_id: activity.caseFolderId},
                            'caseFolderType': 'GKV',
                            'patient': patient
                        },
                        'callback': onLoadActivityData
                    } );
                    function onLoadActivityData( err, response ) {
                        if( err ) {
                            return itcb( err );
                        }

                        activity.locationId = response.locationId;
                        activity.employeeId = response.employeeId || activity.employeeId;

                        itcb( null );
                    }
                }

                //  5.a Save a new PUBRECEIPT activity to the database
                function createActivity( itcb ) {
                    if( params.replaceId && '' !== params.replaceId ) {
                        return updateActivity( itcb );
                    }

                    activity.content = params.content || 'Patientenquittung';
                    activity.userContent = params.content || 'Patientenquittung';

                    activity = Y.doccirrus.filters.cleanDbObject( activity );

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'action': 'post',
                        'data': activity,
                        'callback': onActivityCreated
                    } );

                    function onActivityCreated( err, response ) {
                        if( err ) {
                            return itcb( err );
                        }
                        activity._id = response[0];
                        return itcb( null );
                    }
                }

                //  5.b Overwrite an existing PUBRECEIPT activity in the database
                function updateActivity( itcb ) {
                    activity.content = params.content || 'Patientenquittung';
                    activity.userContent = params.content || 'Patientenquittung';

                    //  clear formPdf, will be regenerated
                    activity.formPdf = '';

                    activity.fields_ = [
                        'actType',
                        'status',
                        'formId',
                        'caseFolderId',
                        'patientId',
                        'employeeId',
                        'activities',
                        'timestamp',
                        'treatmentIds',
                        'content',
                        'userContent',
                        'formPdf'
                    ];

                    activity = Y.doccirrus.filters.cleanDbObject( activity );

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'action': 'put',
                        'query': {'_id': params.replaceId},
                        'data': activity,
                        'callback': onActivityUpdated
                    } );

                    function onActivityUpdated( err /*, response */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        activity._id = params.replaceId;
                        return itcb( null );
                    }
                }

                // 5.c create a new form for the activity
                function createFormForActivity( itcb ) {
                    Y.doccirrus.forms.mappinghelper.initializeFormForActivity( args.user, activity._id, {}, null, onFormCreated );

                    function onFormCreated( err, newActivityWithForm ) {
                        if( err ) {
                            return itcb( err );
                        }
                        activity = newActivityWithForm;
                        return itcb( null );
                    }
                }

                //  6. Update the invoice log, if given
                function recordInLog( itcb ) {
                    //  if no invoice log or schein then skip this step
                    if( '' === invoiceLogId || '' === scheinId ) {
                        return itcb( null );
                    }
                    self.recordPubreceiptInLog( args.user, invoiceLogId, scheinId, activity, itcb );
                }

                //  7. Make a PDF from the PUBRECEIPT activity
                function makePdf( itcb ) {
                    //  if a PDF was not requested then we can skip this step
                    //if ( !params.makePdf ) { return itcb( null ); }

                    self.recreatePubreceiptPDF( args.user, invoiceLogId, scheinId, activity, onPDFCreated );
                    function onPDFCreated( err /*, result*/ ) {
                        if( err ) {
                            Y.log( `Problem while creating PDF from PUBRECEIPT: ${  JSON.stringify( err )}`, 'warn', NAME );
                            return;
                        }

                        //  TODO: raise WS event here

                        if( params.compilePatientPDFs ) {
                            self.compilePubreceiptPDFsForPatient(
                                args.user,
                                invoiceLogId,
                                activity.patientId,
                                onPatientPDFCompiled
                            );
                        }
                    }

                    function onPatientPDFCompiled( err, result ) {
                        if( err ) {
                            Y.log( `Problem compiling PDF for patient: ${  JSON.stringify( err )}`, 'warn', NAME );
                            return;
                        }

                        Y.log( `Compiled PDF for all schein/pubreceipts in Patient GKV log: ${  JSON.stringify( result )}`, 'debug', NAME );

                        if( params.compileAllPDFs ) {
                            self.compilePubreceiptPDFsForLog( args.user, invoiceLogId, onLogPDFCompiled );
                        }
                    }

                    function onLogPDFCompiled( err, result ) {
                        if( err ) {
                            Y.log( `Problem compiling PDF for GKV log: ${  JSON.stringify( err )}`, 'warn', NAME );
                            return;
                        }

                        Y.log( `Compiled PDF for all schein/pubreceipts in GKV log: ${  JSON.stringify( result )}`, 'debug', NAME );
                    }

                    Y.log( `Queued PDF for generation, not waiting, PUBRECEIPT: ${  activity._id}`, 'debug', NAME );
                    itcb( null );
                }

                //  X. Call back with new information
                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Could not create PUBRECEIPT activity: ${  JSON.stringify( err )}`, 'debug', NAME );
                        return args.callback( err );
                    }

                    args.callback( null, {
                        'activityId': activity._id,
                        'formId': activity.formId,
                        'formRole': formRole
                    } );
                }

            },

            /**
             *  Record PUBRECEIPT in invoice log
             *
             *  @param  user            {Object}    REST user or equivalent
             *  @param  invoiceLogId    {String}    To which schein have been assigned
             *  @param  scheinId        {String}    Of Schein activityfrom which pubreceipt was generated
             *  @param  pubreceipt      {Object}    PUBRECEIPT activity as saved to database
             *  @param  callback        {Function}  Of the form fn( err )
             */

            recordPubreceiptInLog: function( user, invoiceLogId, scheinId, pubreceipt, callback ) {
                const
                    async = require( 'async' );

                let
                    patientId = pubreceipt.patientId,
                    scheinEntry,
                    patientEntry;

                async.series( [getScheinLog, saveScheinLog, getPatientLog, savePatientLog], onAllDone );

                function getScheinLog( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'schein',
                            'data._id': scheinId
                        },
                        'callback': onScheinEntryLoaded
                    } );

                    function onScheinEntryLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( '404', 'Schein entry not found in invoice log.' );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        scheinEntry = result[0];
                        itcb( null );
                    }
                }

                function saveScheinLog( itcb ) {

                    scheinEntry.data.pubreceiptId = pubreceipt._id;
                    scheinEntry.data.pdfMediaId = pubreceipt.formPdf || '';

                    let
                        putData = {
                            'fields_': ['data'],
                            'data': scheinEntry.data
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'action': 'put',
                        'query': {
                            '_id': scheinEntry._id
                        },
                        'data': Y.doccirrus.filters.cleanDbObject( putData ),
                        'callback': onScheinEntrySaved
                    } );

                    function onScheinEntrySaved( err /*, result */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                function getPatientLog( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'patient',
                            'data._id': patientId
                        },
                        'callback': onPatientEntryLoaded
                    } );

                    function onPatientEntryLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( '404', 'Patient entry not found in invoice log.' );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        patientEntry = result[0];
                        itcb( null );
                    }
                }

                function savePatientLog( itcb ) {
                    if( !patientEntry.data.pubreceipts ) {
                        patientEntry.data.pubreceipts = [];
                    }

                    if( -1 === patientEntry.data.pubreceipts.indexOf( pubreceipt._id ) ) {
                        patientEntry.data.pubreceipts.push( pubreceipt._id );
                    }

                    let
                        putData = {
                            'fields_': ['data'],
                            'data': patientEntry.data
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'action': 'put',
                        'query': {
                            '_id': patientEntry._id
                        },
                        'data': Y.doccirrus.filters.cleanDbObject( putData ),
                        'callback': onPatientEntrySaved
                    } );

                    function onPatientEntrySaved( err /*, result */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Could not update invoice log with PUBRECEIPT: ${  JSON.stringify( err )}`, 'warn', NAME );
                        return callback( err );
                    }

                    return callback( null );
                }
            },

            /**
             *  (Re)create PDF of PUBRECEIPT
             *
             *  When done, raise event to allow client to update UI or present a print dialog
             *
             *  @param  user            {Object}    REST user or equivalent
             *  @param  invoiceLogId    {String}    Invoice log to update
             *  @param  scheinId        {String}    Schein in invoice log
             *  @param  pubreceipt      {Object}    PUBRECEIPT activity
             *  @param  callback        {Function}  Of the form fn( err, mediaId )
             */

            recreatePubreceiptPDF: function( user, invoiceLogId, scheinId, pubreceipt, callback ) {
                let
                    self = this,
                    mediaId = '',

                    pdfParams = {
                        'formId': pubreceipt.formId,
                        'formVersionId': '',
                        'mapCollection': 'activity',
                        'mapObject': pubreceipt._id,
                        'mapper': 'incase'
                    };

                /*
                 //  PDF may be rendered to zip, rather than saved to database
                 //  but usually, we wil want it in the database first, and then to make a zip from
                 //  activity attachments
                 if ( params.zipId && '' !== params.zipId ) {
                     pdfParams.saveTo = 'zip';
                     pdfParams.zipId = params.zipId;

                     if ( params.preferName && '' !== params.preferName) {
                         pdfParams.preferName = params.preferName;
                     }
                 }
                 */

                Y.doccirrus.api.formtemplate.makepdf( {
                    'user': user,
                    'originalParams': pdfParams,
                    'callback': onPdfCreated
                } );

                function onPdfCreated( err, result ) {
                    if( err ) {
                        return callback( err );
                    }

                    mediaId = result.mediaId;
                    pubreceipt.formPdf = mediaId;
                    self.recordPubreceiptInLog( user, invoiceLogId, scheinId, pubreceipt, onRecordedInLog );

                    //  raise event for user
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        nsp: 'default',
                        event: 'pubreceiptGenerated',
                        msg: {
                            data: {
                                'activityId': pubreceipt._id,
                                'formId': pubreceipt.formId,
                                'mediaId': mediaId
                            }
                        }
                    } );

                }

                function onRecordedInLog( err ) {
                    if( err ) {
                        Y.log( `problem recording new PUBRECEIPT PDF in invoice log: ${  JSON.stringify( err )}`, 'debug', NAME );
                        return callback( err );
                    }

                    callback( null, mediaId );
                }
            },

            /**
             *  Look up all treatments in a date range for a given patient and casefolder
             *
             *  @param  args                                {Object}
             *  @param  args.user                           {Object}
             *  @param  args.callback                       {Function}
             *  @param  args.originalParams                 {Object}
             *  @param  args.originalParams.caseFolderId    {String}
             *  @param  args.originalParams.patientId       {String}
             *  @param  args.originalParams.startDate       {String}
             *  @param  args.originalParams.endDate         {String}
             */

            getTreatmentsForDateRange: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.getTreatmentsForDateRange', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.getTreatmentsForDateRange' );
                }
                let
                    params = args.originalParams,
                    patientId = params.patientId || null,
                    caseFolderId = params.caseFolderId || null,
                    startDate = params.startDate || null,
                    endDate = params.endDate || null,
                    treatmentIds = [];

                if( !patientId || !caseFolderId || !startDate || !endDate ) {
                    return args.callback( Y.doccirrus.errors.rest( 500, 'Missing required argument' ) );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'query': {
                        'actType': 'TREATMENT',
                        'patientId': patientId,
                        'caseFolderId': caseFolderId,
                        'status': {$ne: 'CANCELLED'},
                        'timestamp': {
                            $gte: startDate,
                            $lt: endDate
                        }
                    },
                    'callback': onTreatmentsLoaded
                } );

                function onTreatmentsLoaded( err, result ) {
                    if( err ) {
                        return args.callback( err );
                    }

                    let i;
                    for( i = 0; i < result.length; i++ ) {
                        Y.log( `Found treatment for current schein: ${  result[i]._id}`, 'debug', NAME );
                        treatmentIds.push( `${result[i]._id  }` );
                    }

                    args.callback( null, {
                        'patientId': patientId,
                        'caseFolderId': caseFolderId,
                        'treatmentIds': treatmentIds
                    } );
                }
            },

            /**
             *  Give a patientId and caseFolderId, lookup treatments to include in pubreceipt
             *
             *  @param  args                                {Object}
             *  @param  args.user                           {Object}    REST user or equivalent
             *  @param  args.originalParams                 {Object}
             *  @param  args.originalParams.patientId       {String}    Database _id of a patient
             *  @param  args.originalParams.caseFolderId    {String}    Database _id of a casefolder
             *  @param  args.callback                       {Function}  Of the form fn( err, treatmentIds )
             */

            getTreatmentsForCurrentSchein: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.getTreatmentsForCurrentSchein', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.getTreatmentsForCurrentSchein' );
                }
                const
                    async = require( 'async' );
                let
                    params = args.originalParams,
                    patientId = params.patientId || null,
                    caseFolderId = params.caseFolderId || null,
                    timestamp = params.timestamp || null,
                    query = {
                        'caseFolderId': caseFolderId,
                        'patientId': patientId,
                        'status': {$ne: 'CANCELLED'}
                    },
                    schein,
                    treatmentIds = [];

                if( !patientId || !caseFolderId ) {
                    Y.log( `Invalid request, patientId: ${  patientId  } caseFolderId: ${  caseFolderId}`, 'warn', NAME );
                    return args.callback( Y.doccirrus.errors.rest( 500, 'Missing required argument' ) );
                }

                //  optional date range
                if( timestamp ) {
                    query.timestamp = timestamp;
                }

                async.series( [lookupSchein, listTreatments], onAllDone );

                function lookupSchein( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'query': query,
                        'options': {
                            'limit': 1,
                            'sort': {timestamp: 1}
                        },
                        'callback': onScheinLookup
                    } );

                    function onScheinLookup( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Schein not found' );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        schein = result[0];
                        itcb( null );
                    }
                }

                function listTreatments( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'query': {
                            'actType': 'TREATMENT',
                            'patientId': patientId,
                            'caseFolderId': caseFolderId,
                            'status': {$ne: 'CANCELLED'},
                            'timestamp': {$gte: schein.timestamp}
                        },
                        'callback': onTreatmentsLoaded
                    } );

                    function onTreatmentsLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }

                        let i;
                        for( i = 0; i < result.length; i++ ) {
                            Y.log( `Found treatment for current schein: ${  result[i]._id}`, 'debug', NAME );
                            treatmentIds.push( `${result[i]._id  }` );
                        }

                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Could not look up treatmentIds for caseFolder: ${  JSON.stringify( err )}`, 'warn', NAME );
                        return args.callback( err );
                    }
                    args.callback( null, {
                        'patientId': patientId,
                        'caseFolderId': caseFolderId,
                        'scheinId': schein._id,
                        'treatmentIds': treatmentIds
                    } );
                }
            },

            /**
             *  Create pureceipts for each patient and schein in a GKV log
             *
             *  TODO: figure out efficient way to limit this to a single patient
             *
             *  @param  args
             *  @param  args.user
             *  @param  args.originalParams
             *  @param  args.originalParams.invoiceLogId    {String}    GKV log
             *  @param  args.originalParams.type            {String}    always 'patient'
             *  @param  args.callback
             */

            createAllPubreceiptsForLog: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.createAllPubreceiptsForLog', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.createAllPubreceiptsForLog' );
                }
                const
                    async = require( 'async' ),
                    moment = require( 'moment' );
                let
                    params = args.originalParams || {},
                    invoiceLogId = params.invoiceLogId || '',
                    patientIds = [],
                    scheinEntries = [],
                    allInvoiceEntries = [],
                    pubreceipts = [];

                if( '' === invoiceLogId ) {
                    return args.callback( Y.doccirrus.errors.rest( 'Missing invoiceLogId' ) );
                }

                async.series(
                    [
                        loadInvoiceLogEntries,
                        selectPatients,
                        selectScheine,
                        createPubReceipts
                    ],
                    onAllDone
                );

                //  1. Get all entries in the requested log
                function loadInvoiceLogEntries( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'invoiceentry',
                        'query': {'invoiceLogId': params.invoiceLogId},
                        'callback': onEntriesLoaded
                    } );

                    function onEntriesLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }
                        allInvoiceEntries = result;
                        itcb( null );
                    }
                }

                //  2. Collect an array of patient _ids where sendPatientReceipt is true
                function selectPatients( itcb ) {
                    let i, entry;
                    for( i = 0; i < allInvoiceEntries.length; i++ ) {
                        entry = allInvoiceEntries[i];
                        if( 'patient' === entry.type && true === entry.data.sendPatientReceipt ) {
                            patientIds.push( entry.data._id );
                        }
                    }

                    //  special case, allow user override for a single patient
                    if( params.singlePatient ) {
                        Y.log( `Generating all PUBRECEIPTS for single patient: ${  params.singlePatient}`, 'debug', NAME );
                        patientIds = [params.singlePatient];
                    }

                    itcb( null );
                }

                //  3. Collect schein entries corresponding to selected patients
                function selectScheine( itcb ) {
                    //  entry.data.patientId
                    let i, entry;
                    for( i = 0; i < allInvoiceEntries.length; i++ ) {
                        entry = allInvoiceEntries[i];
                        if( 'schein' === entry.type && -1 !== patientIds.indexOf( entry.data.patientId ) ) {
                            scheinEntries.push( entry );
                        }
                    }

                    //  sort scheine by patient _id (batch PDF generation by patient)
                    scheinEntries.sort( function( a, b ) {
                        if( a.data.patientId > b.data.patientId ) {
                            return 1;
                        }
                        if( a.data.patientId < b.data.patientId ) {
                            return -1;
                        }
                        return 0;
                    } );

                    //  set flags to mark where PDFs should be generated
                    entry = null;
                    for( i = 0; i < scheinEntries.length; i++ ) {
                        if( scheinEntries[(i + 1)] ) {
                            //  set flag on last entry for each patient
                            entry = scheinEntries[(i + 1)];
                            if( entry.data.patientId !== scheinEntries[i].data.patientId ) {
                                scheinEntries[i].compilePatientPDFs = true;
                            }
                        } else {
                            //  end of the list
                            scheinEntries[i].compilePatientPDFs = true;
                            scheinEntries[i].compileAllPDFs = true;

                            if( params.singlePatient ) {
                                //  do not overwrite PDF for whole invoice log if only generating for a single patient
                                scheinEntries[i].compileAllPDFs = false;
                            }
                        }
                    }

                    itcb( null );
                }

                //  4. (re)create a PUBRECEIPT activity for each selected schein and save the new PUBRECEIPT _id
                function createPubReceipts( itcb ) {
                    //  if no PUBRECEIPTS are to be generated then skip to end
                    if( 0 === scheinEntries.length ) {
                        return itcb( null );
                    }
                    async.eachSeries( scheinEntries, createSinglePubReceipt, itcb );
                }

                //  4.1 (re)create a PUBRECEIPT activity for a single schein
                function createSinglePubReceipt( entry, itcb ) {
                    Y.log( `(re)Create pubreceipt for schein: ${  entry.data._id}`, 'debug', NAME );

                    let
                        treatmentIds = [],
                        scheinDate = moment( entry.data.timestamp ).format( 'DD.MM.YYYY' ),
                        i;

                    Y.log( `Created schein date: ${  scheinDate  } from timestamp: ${  entry.data.timestamp}`, 'debug', NAME );

                    for( i = 0; i < entry.data.treatments.length; i++ ) {
                        treatmentIds.push( entry.data.treatments[i]._id );
                    }

                    Y.doccirrus.api.invoice.createPubReceipt( {
                        'user': args.user,
                        'originalParams': {
                            'patientId': entry.data.patientId,
                            'caseFolderId': entry.data.caseFolderId,
                            'content': `Patientenquittung von Schein: ${  scheinDate}`,
                            'treatmentIds': treatmentIds,
                            'replaceId': entry.data.pubreceiptId || '',
                            'invoiceLogId': invoiceLogId,
                            'scheinId': entry.data._id,
                            'compilePatientPDFs': entry.compilePatientPDFs || false,
                            'compileAllPDFs': entry.compileAllPDFs || false
                        },
                        'callback': onPubReceiptCreated
                    } );

                    function onPubReceiptCreated( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }

                        if( !result.activityId ) {
                            Y.log( 'Problem creating or updating PUBRECIEPT' );
                            return itcb( null );
                        }

                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Could not create PUBRECEIPTs for invoice log: ${  JSON.stringify( err )}`, 'warn', NAME );
                        return args.callback( err );
                    }

                    args.callback( null, pubreceipts );
                }
            },

            /**
             *  Make a single PDF for all pubreceipts/scheine for a patient in a GKV invoice log
             *
             *  This assumes the pubreceipts / patientenquittung have been generated for each schein entry in the
             *  invoice log and PDFs created from them (see: recreatePubreceiptPDF above)
             *
             *  Overall process
             *
             *      1. Load all schein entries for the given patient in invoice log
             *      2. Concatenate PDFs from all schein entries into a single document
             *      3. Load invoice log entry for single patient
             *      4. Store compiled PDF in database / GridFS as a media object
             *      5. Link new media object from the patient's invoice log entry
             *      X. Finished
             *
             *  @param  user            {Object}
             *  @param  invoiceLogId    {String}
             *  @param  patientId       {String}
             *  @param  callback        {Function}  Of the forn fn( err, mediaId )
             */

            compilePubreceiptPDFsForPatient: function( user, invoiceLogId, patientId, callback ) {
                const async = require( 'async' );

                let
                    scheinEntries = [],
                    pdfIds = [],
                    patientEntry,
                    pdfFile,
                    mediaId = null;

                async.series(
                    [
                        loadScheinEntries,
                        compilePDFs,
                        loadPatientEntry,
                        savePDF,
                        updatePatientEntry
                    ],
                    onAllDone
                );

                //  1. Load all schein entries for the given patient in invoice log
                function loadScheinEntries( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'schein',
                            'data.patientId': patientId
                        },
                        'callback': onScheinEntriesLoaded
                    } );

                    function onScheinEntriesLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }
                        scheinEntries = result;
                        itcb( null );
                    }
                }

                //  2. Concatenate PDFs from all schein entries into a single document
                function compilePDFs( itcb ) {
                    let pdfConfig, i;

                    //  if only one schein then we can skip this step
                    if( 1 === scheinEntries.length && scheinEntries[0].data.pdfMediaId ) {
                        Y.log( 'Patient has only one schein in this log, no need to compile multiple PDFS together.', 'debug', NAME );
                        mediaId = scheinEntries[0].data.pdfMediaId;
                        return itcb( null );
                    }

                    for( i = 0; i < scheinEntries.length; i++ ) {
                        if( scheinEntries[i].data.pdfMediaId ) {
                            pdfIds.push( scheinEntries[i].data.pdfMediaId );
                        } else {
                            Y.log( `Missing PDF for PUBRECEIPT for invoice entry: ${  scheinEntries[i]._id}`, 'warn', NAME );
                        }
                    }

                    pdfConfig = {
                        'user': user,
                        'mediaIds': pdfIds,
                        'newFileName': `${Y.dcforms.getRandId()  }.pdf`
                    };

                    Y.doccirrus.media.pdf.concatenatePDFs( pdfConfig, onPdfsJoined );

                    function onPdfsJoined( err, tempFileName ) {
                        if( err ) {
                            return itcb( err );
                        }
                        pdfFile = Y.doccirrus.media.getCacheDir() + tempFileName;
                        itcb( null );
                    }

                }

                //  3. Load invoice log entry for single patient
                function loadPatientEntry( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'patient',
                            'data._id': patientId
                        },
                        'callback': onPatientEntryLoaded
                    } );

                    function onPatientEntryLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Could not find patient entry' );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        patientEntry = result[0];
                        itcb( null );
                    }
                }

                //  4. Store compiled PDF in database / GridFS as a media object
                function savePDF( itcb ) {
                    //  if we already have a mediaId to use then we can skip this step
                    if( mediaId ) {
                        return itcb( null );
                    }

                    Y.doccirrus.media.importMediaFromFile(
                        user,
                        pdfFile,
                        'invoiceentry',
                        patientEntry._id,
                        `Patientenquittung ${  patientEntry.data.patientNo}`,
                        'gkv',
                        'OTHER',
                        onPdfSavedToDb
                    );

                    function onPdfSavedToDb( err, newMediaObj ) {
                        if( err ) {
                            return itcb( err );
                        }
                        mediaId = newMediaObj._id;

                        //  raise event for user
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            nsp: 'default',
                            event: 'pubreceiptCompiledForPatient',
                            msg: {
                                data: {
                                    'mediaId': mediaId
                                }
                            }
                        } );

                        itcb( null );
                    }
                }

                //  5. Link new media object from the patient's invoice log entry
                function updatePatientEntry( itcb ) {
                    patientEntry.data.compiledPdfMediaId = mediaId;

                    let
                        putData = {
                            'fields_': ['data'],
                            'data': patientEntry.data
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'action': 'put',
                        'query': {'_id': patientEntry._id},
                        'data': Y.doccirrus.filters.cleanDbObject( putData ),
                        'callback': onPatientEntrySaved
                    } );

                    function onPatientEntrySaved( err /*, result */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                //  X. Finished
                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Problem compiling PUBRECEIPT PDFs for patient: ${  JSON.stringify( err )}`, 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, mediaId );
                }
            },

            /**
             *  Make a PDF for all pubreceipts in a GKV log
             *
             *  PDFs should previously have been compiled for all patent entries in the log.  There should one PDF for
             *  each PUBRECEIPT, and one PUBRECEIPT for each schein.
             *
             *  Overall process:
             *
             *      1. Get all patient header entries for GKV invoice log
             *      2. Export and concatenate all PDFs (not all patients have sendPatientReceipt option)
             *      3. Load header for overall invoice log
             *      4. Store compiled PDF in database / GridFS as media object
             *      5. Link new media object from invoice log header
             *      X. Finished
             *
             *  @param  user            {Object}
             *  @param  invoiceLogId    {String}
             *  @param  callback        {Function}  Of the form fn( err, mediaId )
             */

            compilePubreceiptPDFsForLog: function( user, invoiceLogId, callback ) {
                const async = require( 'async' );

                let
                    patientEntries = [],
                    pdfIds = [],
                    pdfFile,
                    headerEntry,
                    mediaId;

                async.series(
                    [
                        loadPatientEntries,
                        compilePDFs,
                        loadHeaderEntry,
                        savePDF,
                        saveHeaderEntry,
                        updateKBVLog
                    ],
                    onAllDone
                );

                //  1. Get all patient header entries for GKV invoice log
                function loadPatientEntries( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'patient',
                            'data.sendPatientReceipt': true
                        },
                        'callback': onPatientEntriesLoaded
                    } );

                    function onPatientEntriesLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }
                        patientEntries = result;
                        itcb( null );
                    }
                }

                //  2. Export and concatenate all PDFs (not all patients have sendPatientReceipt option)
                function compilePDFs( itcb ) {
                    let i;
                    for( i = 0; i < patientEntries.length; i++ ) {
                        if( patientEntries[i].data.compiledPdfMediaId ) {
                            pdfIds.push( patientEntries[i].data.compiledPdfMediaId );
                        } else {
                            Y.log( `Missing compiled PDF for PUBRECEIPTs for patient invoice entry: ${  patientEntries[i]._id}`, 'warn', NAME );
                        }
                    }

                    let
                        pdfConfig = {
                            'user': user,
                            'mediaIds': pdfIds,
                            'newFileName': `${Y.dcforms.getRandId()  }.pdf`
                        };

                    Y.doccirrus.media.pdf.concatenatePDFs( pdfConfig, onPdfsJoined );

                    function onPdfsJoined( err, tempFileName ) {
                        if( err ) {
                            return itcb( err );
                        }
                        pdfFile = Y.doccirrus.media.getCacheDir() + tempFileName;
                        itcb( null );
                    }
                }

                //  3. Load header for overall invoice log
                function loadHeaderEntry( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'query': {
                            'invoiceLogId': invoiceLogId,
                            'type': 'header'
                        },
                        'callback': onHeaderEntryLoaded
                    } );

                    function onHeaderEntryLoaded( err, result ) {
                        if( !err && !result[0] ) {
                            err = Y.doccirrus.errors.rest( 404, 'Could not find patient entry' );
                        }
                        if( err ) {
                            return itcb( err );
                        }
                        headerEntry = result[0];
                        itcb( null );
                    }
                }

                //  4. Store compiled PDF in database / GridFS as media object
                function savePDF( itcb ) {
                    Y.doccirrus.media.importMediaFromFile(
                        user,
                        pdfFile,
                        'invoiceentry',
                        headerEntry._id,
                        'Patientenquittung Alles',
                        'gkv',
                        'OTHER',
                        onPdfSavedToDb
                    );

                    function onPdfSavedToDb( err, newMediaObj ) {
                        if( err ) {
                            return itcb( err );
                        }
                        mediaId = newMediaObj._id;

                        //  raise event for user
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            nsp: 'default',
                            event: 'pubreceiptCompiledForInvoiceLog',
                            msg: {
                                data: {
                                    'mediaId': mediaId
                                }
                            }
                        } );

                        itcb( null );
                    }
                }

                //  5. Link new media object from invoice log header (may be removed in future)
                function saveHeaderEntry( itcb ) {

                    headerEntry.data.compiledPdfMediaId = mediaId;

                    let
                        putData = {
                            'fields_': ['data'],
                            'data': headerEntry.data
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'invoiceentry',
                        'action': 'put',
                        'query': {'_id': headerEntry._id},
                        'data': Y.doccirrus.filters.cleanDbObject( putData ),
                        'callback': onPatientEntrySaved
                    } );

                    function onPatientEntrySaved( err /*, result */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                //  6. Link from kbvlog obejct
                function updateKBVLog( itcb ) {
                    let
                        putData = {
                            'fields_': ['pdfMediaId'],
                            'pdfMediaId': mediaId
                        };

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'kbvlog',
                        'action': 'put',
                        'query': {'_id': invoiceLogId},
                        'data': Y.doccirrus.filters.cleanDbObject( putData ),
                        'callback': onKBVLogSaved
                    } );

                    function onKBVLogSaved( err /* , result */ ) {
                        if( err ) {
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                //  X. Finished
                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Problem compiling PDFs for GKV log: ${  JSON.stringify( err )}`, 'debug', NAME );
                        return callback( err );
                    }

                    callback( null, mediaId );
                }
            },

            /**
             *  Create a pubreceipt for each schein in the current quarter which has treatments, then render
             *  and compile PDFs for printing.
             *
             *  @param  args
             *  @param  args.user
             *  @param  args.callback
             *  @param  args.originalParams
             *  @param  args.originalParams.patientId
             *  @param  args.originalParams.caseFolderId
             */

            compilePubreceiptsForQuarter: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.compilePubreceiptsForQuarter', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.compilePubreceiptsForQuarter' );
                }
                const
                    async = require( 'async' ),
                    moment = require( 'moment' );

                let
                    currentQuarterStart = moment().startOf( 'quarter' ).format(),

                    params = args.originalParams,
                    caseFolderId = params.caseFolderId || null,
                    patientId = params.patientId || null,
                    pubReceiptIds = [],
                    treatments,
                    scheine;

                if( !patientId || !caseFolderId ) {
                    return args.callback( Y.doccirrus.errors.rest( 500, 'Missing required parameter' ) );
                }

                async.series( [lookupTreatments, lookupScheine, assignTreatments, createAllPubreceipts], onAllDone );

                function lookupTreatments( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'query': {
                            'caseFolderId': caseFolderId,
                            'patientId': patientId,
                            'actType': 'TREATMENT',
                            'status': {$ne: 'CANCELLED'},
                            'timestamp': {$gt: currentQuarterStart}
                        },
                        'callback': onTreatmentsLoaded
                    } );

                    function onTreatmentsLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }
                        treatments = result;
                        Y.log( `Current casefolder has ${  treatments.length  } treatments in quarter starting ${  currentQuarterStart}`, 'debug', NAME );
                        itcb( null );
                    }
                }

                function lookupScheine( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'query': {
                            'caseFolderId': caseFolderId,
                            'patientId': patientId,
                            'actType': 'SCHEIN',
                            'status': {$ne: 'CANCELLED'},
                            'timestamp': {$gt: currentQuarterStart}
                        },
                        'callback': onScheineLoaded
                    } );

                    function onScheineLoaded( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }
                        scheine = result;
                        Y.log( `Current casefolder has ${  scheine.length  } scheine in quarter starting ${  currentQuarterStart}`, 'debug', NAME );
                        itcb( null );
                    }
                }

                //  find the nearest schein each treatment follows
                function assignTreatments( itcb ) {
                    let i, j, treatment, schein, timeDiff;
                    //  lookup schein for each treatment
                    for( i = 0; i < treatments.length; i++ ) {
                        treatment = treatments[i];
                        treatment.scheinId = '';

                        for( j = 0; j < scheine.length; j++ ) {

                            schein = scheine[j];
                            //  time between the schein and treatment, milliseconds, positive if schein was first
                            timeDiff = moment( treatment.timestamp ).diff( schein.timestamp );

                            if( timeDiff > 0 ) {

                                if( !treatment.timeDiff || ( treatment.timeDiff > timeDiff ) ) {
                                    treatment.timeDiff = timeDiff;
                                    treatment.scheinId = schein._id;
                                }

                            }

                        }

                        if( '' === treatment.scheinId ) {
                            Y.log( `Treatment exists in quarter but has no schein preceeding it: ${  treatment._id}`, 'warn', NAME ); //--
                        }
                    }

                    itcb( null );
                }

                function createAllPubreceipts( itcb ) {
                    async.eachSeries( scheine, createSinglePubreceipt, itcb );
                }

                function createSinglePubreceipt( schein, itcb ) {
                    let
                        treatmentIds = [],
                        scheinDate,
                        i;

                    for( i = 0; i < treatments.length; i++ ) {
                        if( treatments[i].scheinId === schein._id ) {
                            treatmentIds.push( treatments[i]._id );
                        }
                    }

                    if( 0 === treatmentIds.length ) {
                        Y.log( `Schein has no treatments, not creating pubreceipt for: ${   schein._id}`, 'debug', NAME );
                        return itcb( null );
                    }

                    /*
                     *  @param  args                                    {Object}
                     *  @param  args.user                               {Object}    REST user or equivalent
                     *  @param  args.callback                           {Function}  Of the form fn( err, { activityId, [mediaId] } )
                     *  @param  args.originalParams                     {Object}
                     *
                     *  Data needed to create the PUBRECEIPT
                     *
                     *  @params args.originalParams.caseFolderId        {String}    _id of Casefolder to create PUBRECEIPT in
                     *  @param  args.originalParams.patientId           {String}    _id of patient this relates to
                     *  @param  args.originalParams.content             {String}    Description for the new activity
                     *  @param  args.originalParams.treatmentIds        [{String}]  Array of treatment _ids
                     *
                     *  If recreating pubreceipts on approving a GKV log then overwrite this activity:
                     *
                     *  @param  args.originalParams.replaceId           {String}    Optional - _id of exiting PUBRECEIPT to replace
                     *
                     *  If (re)creating from a GKV log then note the new PUBRECEIPT and its PDF in log entries
                     *
                     *  @param  args.originalParams.invoiceLogId        {String}    invoice log to record new PUBRECEIPT on (optional)
                     *  @param  args.originalParams.scheinId            {String}    _id of schein this pubreceipt was generated from (optional)
                     *
                     *  Note final pubreceipts for patient and GKV log, to trigger compilation of batch PDFs
                     *
                     *  @param  args.originalParams.compilePatientPDFs  {Boolean}   if true then make PDF from all pubreceipts for patient
                     *  @param  args.originalParams.compileAllPDFs      {Boolean}   if true then make PDF from all pubreceipts for log
                     *
                     */

                    //scheinDate = moment( schein.timestamp ).subtract( 6, 'hours' ).format( 'DD.MM.YYYY' );
                    scheinDate = moment( schein.timestamp ).format( 'DD.MM.YYYY' );

                    Y.doccirrus.api.invoice.createPubReceipt( {
                        'user': args.user,
                        'originalParams': {
                            'caseFolderId': caseFolderId,
                            'patientId': patientId,
                            'content': `Patientenquittung von Schein ${  scheinDate}`,
                            'treatmentIds': treatmentIds,
                            'scheinId': schein._id
                        },
                        'callback': onPubreceiptCreated
                    } );

                    function onPubreceiptCreated( err, result ) {
                        if( err ) {
                            return itcb( err );
                        }

                        if( result.activityId ) {
                            Y.log( `Created pubreceipt for schein ${  schein._id  }: ${  result.activityId}`, 'debug', NAME );
                            pubReceiptIds.push( result.activityId );
                        }

                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if( err ) {
                        Y.log( `Could not create PUBRECEIPTs for quarter: ${  JSON.stringify( err )}`, 'warn', NAME );
                        return args.callback( err );
                    }

                    Y.log( 'Completed creation of PUBRECEIPTs' );
                    return args.callback( null, pubReceiptIds );
                }
            },

            //  TEST /DEV / SUPPORT MIGRATION ACCESSS

            'setInvoiceIdOnTreatmentsReport': function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.setInvoiceIdOnTreatmentsReport', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.setInvoiceIdOnTreatmentsReport' );
                }
                Y.doccirrus.inCaseUtils.migrationhelper.setInvoiceIdOnTreatments( args.user, true, true, false, onMigrationComplete );
                function onMigrationComplete( err, report ) {
                    if( err ) {
                        Y.log( `Problem generating report for invoiceId migration: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }
                    Y.doccirrus.api.invoice.saveMigrationReport( args.user, 'invoiceid', report, onReportSaved );
                }

                function onReportSaved( err ) {
                    if( err ) {
                        Y.log( `Problem saving migration report to disk: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }
                }

                //  call back immedately, this is a slow process
                args.callback( null, {'status': 'Started generation of report on migration to set treatment invoiceIds'} );
            },

            'setInvoiceIdOnTreatments': function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.setInvoiceIdOnTreatments', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.setInvoiceIdOnTreatments' );
                }
                Y.doccirrus.inCaseUtils.migrationhelper.setInvoiceIdOnTreatments( args.user, false, true, false, onMigrationComplete );
                function onMigrationComplete( err, report ) {
                    if( err ) {
                        Y.log( `Problem generating report for invoiceId migration: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }
                    Y.doccirrus.api.invoice.saveMigrationReport( args.user, 'invoiceid', report, onReportSaved );
                }

                function onReportSaved( err ) {
                    if( err ) {
                        Y.log( `Problem saving migration report to disk: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }
                }

                //  call back immedately, this is a slow process
                args.callback( null, {'status': 'Started migration to set treatment invoiceIds'} );
            },

            'correctTotalReceipts': function( args ) {
                Y.log( 'Entering Y.doccirrus.api.invoice.correctTotalReceipts', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.invoice.correctTotalReceipts' );
                }
                Y.doccirrus.inCaseUtils.migrationhelper.checkInvoiceBalance( args.user, false, onMigrationComplete );
                function onMigrationComplete( err, report ) {
                    if( err ) {
                        Y.log( `Problem generating report for totalReceipts migration: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }
                    Y.doccirrus.api.invoice.saveMigrationReport( args.user, 'receipts', report, onReportSaved );
                }

                function onReportSaved( err ) {
                    if( err ) {
                        Y.log( `Problem saving migration report to disk: ${  JSON.stringify( err )}`, 'warn', NAME );
                    }

                    Y.log( 'Migration report saved to disk', 'debug', NAME );
                }

                //  call back immedately, this is a slow process
                args.callback( null, {'status': 'Started migration to check/correct totalReceipts/totalReceiptsOutstanding'} );
            },

            //  place these in the temp directory - used for live work on customer systems
            'saveMigrationReport': function( user, reportName, report, callback ) {
                const
                    fs = require( 'fs' ),
                    moment = require( 'moment' ),

                    tmpDir = Y.doccirrus.media.getTempDir(),
                    dateStr = moment().format( 'YYYY-MM-DD_HH:mm:ss' ),
                    fileName = `${tmpDir}/${dateStr}_${ reportName}_${user.tenantId}.txt`;

                Y.log( `Saving report ${reportName}: ${fileName}`, 'debug', NAME );
                fs.writeFile( fileName, report, callback );
            },
            getOverdueInvoices,
            invoiceToInvoiceEntry,
            generateSumexDocuments,
            findInvoiceRef
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'v_medication-schema'
        ]
    }
);
