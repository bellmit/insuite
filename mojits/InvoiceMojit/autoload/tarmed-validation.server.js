/**
 * User: oliversieweke
 * Date: 21.12.18  14:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

// ================================================================================================================== \\
// This file contains the logic for validating TARMED invoices through the SUMEX Sol. The validation proper is done by
// the Sumex module, implemented as a sol.

// Exported methods:
// - validateTarmedLog()

// Related files:
// - sumex-tarmedValidator100.server.js: contains the API methods for interacting with the Sumex module.
// - sumex-mappers.server.js: contains functions to map inSuite fields to Sumex parameters.
// - tarmed-utils.server.js: contains utility functions to stream schein entries by patient for a given tarmedlog

// Given how the SUMEX Sol is running in a WINE emulator, it was technically complicated to keep data in memory
// for related operations. What is thus actually happening is that related operations are being grouped by patients,
// collected into a JSON file and sent in a single request to the SUMEX Sol with a sendOperationsToSumexSol() call.
// Operations are then executed in order, taking into account how API calls are chained and nested.

// Validation errors and other errors from failed operations are thus grouped and evaluated by patient.
// ================================================================================================================== \\

YUI.add( 'tarmed-validation', function( Y, NAME ) {
        const {inspect} = require( 'util' );
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * This is the main method for validating a tarmedlog using the Sumex module.
         * The validation flow is as follows:
         * I)...Collect the schein entries corresponding to the tarmedlog, group them by patient and validate them one
         * .....by bone, for each result:
         * .........A) Trigger Sumex Validation
         * .........B) Collect Rules
         * II)..Return the validation results
         *
         * @PUBLIC
         * @method validateTarmedlog
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.tarmedlog :REQUIRED: Tarmed log entry. At the moment only the following fields are used:
         *              - _id: for retrieving the corresponding invoice entries.
         *              - mainLocationId: for linking errors to the location.
         * Other fields may come in handy in the future.
         * @param {Object} args.user :REQUIRED: User making the validation request. Used for the DB calls.
         *
         * @returns {Promise} resolving to {
         *      errors: <Array>,
         *      warnings: <Array>,
         *      priceTotal: <Number>
         * }
         */
        async function validateTarmedlog( {tarmedlog, user, location, onProgress} ) {
            let err, progressCount = 0, firstAttempt = true;
            const tarmedlogId = tarmedlog._id.toString(),
                successfulScheins = [],
                failedScheins = [];
            Y.log( `validateTarmedlog(): starting validation for tarmedlog ${tarmedlogId}.`, 'info', NAME );

            const validationResult = { // This object will collect the results from the scheinsForEachPatient() iteration below.
                errors: [],
                warnings: [],
                priceTotal: 0
            }, {excludedPatientIds, excludedScheinIds} = tarmedlog;

            progressCount += 10;
            _showProgress( progressCount );
            // I) Validate Schein Entries for each Patient ----------------------------------------------------------------
            [err] = await formatPromiseResult( Y.doccirrus.tarmedUtils.handleScheinsInBatch( {
                user, tarmedlogId, excludedScheinIds, excludedPatientIds,
                medidataRejected: tarmedlog.collectMedidataRejected,
                handler: _validateHandler
            } ) );

            firstAttempt = false;
            if( err ) {
                Y.log( `validateTarmedlog(): error in validating patient scheins from invoicelog ${tarmedlogId}.`, 'error', NAME );
                throw err;
            }

            if( failedScheins.length ) {
                Y.log( `validateTarmedlog(): ${failedScheins.length} schiens didn't validated, retry.`, 'warn', NAME );

                [err] = await formatPromiseResult( Y.doccirrus.tarmedUtils.retryScheinsHandle( {
                    user, tarmedlogId, scheins: failedScheins,
                    handler: _validateHandler
                } ) );

                if( err ) {
                    Y.log( `validateTarmedlog(): error in validating patient scheins from invoicelog ${tarmedlogId} after retry.`, 'error', NAME );
                    throw err;
                }
            }

            // B) Rules ----------------------------------------------------------------------------------------
            [err] = await formatPromiseResult( collectRuleLogEntriesForPatientScheins( {
                tarmedlogId, tarmedlog, validationResult, scheins: successfulScheins, user
            } ) );

            if( err ) {
                Y.log( `validateTarmedlog(): error in collecting rulelog entries for tarmedlog ${tarmedlogId}:\n${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            let caseFolderIds = successfulScheins.map( schein => schein.data.caseFolderId );

            await formatPromiseResult( Y.doccirrus.api.casefolder.updateCaseFolderSumexStatus( {
                user,
                data: {caseFolderIds}
            } ) );

            _showProgress( 85 );
            if( err ) {
                if( err.code ) { // DC rest errors from the validatePatientSchein() iterator. The stack trace is already logged.
                    Y.log( `validateTarmedlog(): error in validating scheins for each patient for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                    throw err;
                } else { // Streaming errors from scheinsForEachPatient()
                    Y.log( `validateTarmedlog(): error in validating scheins for each patient for tarmedlog ${tarmedlogId}.\n${err & err.stack || err}`, 'error', NAME );
                    throw Y.doccirrus.errors.rest( 'sumex_00' );
                }
            }

        // II) Return Validation Results -------------------------------------------------------------------------------
            Y.log( `validateTarmedlog(): validation complete for tarmedlog ${tarmedlogId}. Validation result:\n${inspect( validationResult )} `, 'info', NAME );
            return validationResult;

            // ------------------------------- INTERNAL FUNCTIONS DECLARATION -------------------------------

            async function _validateHandler( {tarmedlogId, schein, user, scheinsLength} ) {
                let err, result;

                [err, result] = await formatPromiseResult( Y.doccirrus.api.sumex.generalInvoiceRequest( {
                    invoicelogId: tarmedlogId, location, schein, user, requestType: 'validate'
                } ) );

                if( err ) {
                    Y.log( `validateTarmedlog(): error in validating patient schein ${schein._id} from invoicelog ${tarmedlogId}.\nError: ${err.stack || err}`, 'error', NAME );
                    if( [500, 503, 504].includes( err.code ) ) {
                        return firstAttempt ? failedScheins.push( schein ) : _handleScheinError( {errorCode: 'sumex_17', schein} );
                    }
                    return _handleScheinError( {errorCode: err.code || 'sumex_03', schein} );
                }

                // extend sumex error|warning object by employee name from schein
                const extendByScheinEmployee = ( entry, schein ) => {
                    if( entry.scheinId && schein.data && entry.scheinId === schein._id && schein.data.employeeName ){
                        entry.employeeName = schein.data.employeeName;
                    }
                    return entry;
                };
                result.errors = (result.errors || []).map( el => extendByScheinEmployee( el, schein ) );
                result.warnings = (result.warnings || []).map( el => extendByScheinEmployee( el, schein ) );

                validationResult.errors.push( ...result.errors );
                validationResult.warnings.push( ...result.warnings );
                validationResult.priceTotal += result.priceTotal || 0;
                successfulScheins.push( schein );

                if( firstAttempt && Number.isFinite( scheinsLength ) ) {
                    progressCount += 100 / scheinsLength * 0.75;
                    _showProgress( progressCount );
                }
            }

            function _showProgress( count ) {
                if( onProgress ) {
                    onProgress( {
                            total: 100,
                            current: count,
                            durationElapsed: 0,
                            type: 'sending'
                        }
                    );
                }
            }

            function _handleScheinError( {errorCode, schein} ) {
                const err = Y.doccirrus.errors.rest( errorCode ),
                    sumexError = Y.doccirrus.tarmedUtils.generateSumexError( {
                        schein,
                        text: Y.doccirrus.errorTable.getMessage( err ),
                        errorCode
                    } );

                validationResult.errors.push( sumexError );
            }
        }

        /**
         * This method collects the rulelog entries by patient:
         *
         * @PRIVATE
         * @method collectRuleLogEntriesForPatientScheins
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :REQUIRED: Used for logging and buidling Sumex operations.
         * @param {String} args.tarmedlog :REQUIRED: Some of the information will be needed in the sumex validation.
         * @param {Object} args.data :REQUIRED: Data to validate.
         * @param {String} args.data._id :REQUIRED: Patient ID.
         * @param {Array} args.data.scheins :REQUIRED: Patient schein entries corresponding to the tarmed log.
         * @param {Object} args.user :REQUIRED: User making the validation request. The user object is used for the DB calls.
         */
        async function collectRuleLogEntriesForPatientScheins( {tarmedlogId, tarmedlog, validationResult, scheins, user} ) {
            //TODO: Should this only happen for prevalidation?
            //TODO: Note that error handling in mapRuleEngineResults is quite bad - might lead to issues

            let err, result;

            for( let schein of scheins ) {
                if( tarmedlog.excludedScheinIds && tarmedlog.excludedScheinIds.indexOf( schein.data._id ) === -1 ) {
                    let
                        affectedActivityIds = Y.doccirrus.ruleutils.collectAffectedActivitiesFromInvoiceEntry( schein );
                    [err, result] = await formatPromiseResult( Y.doccirrus.api.rulelog.collectRuleLogEntries( {
                        user,
                        patientId: schein.data.patientId,
                        caseFolderId: schein.data.caseFolderId,
                        locationIds: [tarmedlog.mainLocationId],
                        invoice: true,
                        from: tarmedlog.startDate,
                        to: tarmedlog.endDate,
                        affectedActivityIds
                    } ) );

                    if( err ) { // validatePatientSchein throws specific DC errors
                        Y.log( `collectRuleLogEntriesForPatientScheins(): error in collecting rulelog entries for tarmedlog ${tarmedlogId}.`, 'error', NAME );
                        throw err;
                    }
                    let invoiceLogEntries;
                    [err, invoiceLogEntries] = await formatPromiseResult( Y.doccirrus.api.invoicelog.mapRuleEngineResults( user, result, tarmedlog, "KVG" ) );

                    invoiceLogEntries.forEach( invoiceLog => {
                        invoiceLog.saved = true;
                        if( invoiceLog.ruleLogType === 'ERROR' ) {
                            validationResult.errors.push( invoiceLog );
                        } else if( invoiceLog.ruleLogType === 'WARNING' ) {
                            validationResult.warnings.push( invoiceLog );
                        }
                    } );
                }
            }
        }

        Y.namespace( 'doccirrus' ).tarmedValidation = {
            name: NAME,
            validateTarmedlog
        };
    },
    '0.0.1', { requires: ['sumex', 'sumex-mappers', 'tarmed-utils', 'dcmongodb', 'kbvlog-api']}
);
