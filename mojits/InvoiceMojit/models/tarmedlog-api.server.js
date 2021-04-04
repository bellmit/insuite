/**
 * User: oliversieweke
 * Date: 23.11.18  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'tarmedlog-api', function( Y, NAME ) {
        const moment = require('moment');
        const runDb = Y.doccirrus.mongodb.runDb;
        const util = require( 'util' );
        const mongoose = require( 'mongoose' );
        const Prom = require('bluebird');
        const {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;
        const LATEST_LOG_VERSION = Y.doccirrus.schemas.invoicelog.LATEST_LOG_VERSION;
        const VALID_STATUS = 'VALID';
        const INVOICED_APPROVED_STATUS = 'INVOICED_APPROVED';

    // -----------------------------------------------------------------------------------------------------------------
    // TODO: Progressively configure those fields, to include exactly the information needed for the Sumex API.---------
        const physicianFields = {
            officialNo: 1,
            firstname: 1,
            lastname: 1,
            title: 1,
            nameaffix: 1,
            specialities: 1,
            qualiDignities: 1,
            glnNumber: 1,
            zsrNumber: 1
        };

        const locationFields = {
            locname: 1,
            institutionCode: 1,
            zip: 1,
            commercialNo: 1,
            street: 1,
            houseno: 1,
            city: 1,
            phone: 1,
            fax: 1,
            email: 1,
            cantonCode: 1,
            countryCode: 1,
            website: 1
        };

        const treatmentFields = { // Check fields here!
        // Used For Sumex
            _id: 1,
            employeeId: 1,
            code: 1,
            timestamp: 1,
            treatmentType: 1,
            side: 1,
            sideMandatory: 1,
            activities: 1,
        // ------------------------------------------------
            patientId: 1,
            locationId: 1,
            actType: 1,
            catalogShort: 1,
            costType: 1,
            content: 1,
            explanations: 1,
            daySeparation: 1,
            icds: 1,
            status: 1,
            billingFactorValue: 1,
            price: 1,
            unit: 1,
            actualPrice: 1,
            actualUnit: 1,
            hasVat: 1,
            vat: 1,
            fk5015: 1,
            vatAmount: 1,
            catalog: 1,
            tariffType: 1,
            medicalTaxPoints: 1,
            technicalTaxPoints: 1,
            assistanceTaxPoints: 1,
            medicalScalingFactor: 1,
            technicalScalingFactor: 1,
            taxPointValue: 1,
            taxPoints: 1,
            invoiceId: 1
        };

        const scheinFields = {
            _id: 1,
            // used ofr sumex
            locationId: 1,
            treatmentType: 1,
            // --------------
            scheinType: 1,
            patientId: 1,
            employeeId: 1,
            employeeName: 1,
            actType: 1,
            timestamp: 1,
            icds: 1,
            continuousIcds: 1,
            scheinSpecialisation: 1,
            scheinNotes: 1,
            status: 1,
            locationFeatures: 1,
            reasonType: 1,
            scheinBillingArea: 1,
            scheinOrder: 1,
            scheinDiagnosis: 1,
            scheinFinding: 1,
            scheinEstablishment: 1,
            scheinRemittor: 1,
            scheinSubgroup: 1,
            scheinSlipMedicalTreatment: 1,
            code: 1,
            scheinClinicalTreatmentFrom: 1,
            scheinClinicalTreatmentTo: 1,
            scheinNextTherapist: 1,
            uvGoaeType: 1,
            dayOfAccident: 1,
            accidentCompany: 1,
            accidentCompanyStreet: 1,
            accidentCompanyHouseno: 1,
            accidentCompanyPLZ: 1,
            accidentCompanyCity: 1,
            content: 1,
            caseFolderId: 1,
            fk4235Set: 1,
            scheinClinicID: 1,
            isTiersGarant: 1,
            isTiersPayant: 1,
            docPrinted: 1,
            caseNumber: 1
        };

        const diagnosisFields = {
            _id: 1,
            employeeId: 1,
            patientId: 1,
            actType: 1,
            timestamp: 1,
            code: 1,
            catalogShort: 1,
            diagnosisCert: 1,
            diagnosisSite: 1,
            explanations: 1,
            diagnosisDerogation: 1,
            diagnosisType: 1,
            status: 1,
            content: 1,
            invoiceId: 1
        };

        const patientFields = {
            _id: 1,
        // Used for Sumex
            dob: 1,
            patientId: 1,
            gender: 1,
        // ----------------------------------------------------------------

            title: 1,
            firstname: 1,
            talk: 1,
            lastname: 1,
            communications: 1,
            nameaffix: 1,
            addresses: 1,
            kbvDob: 1,
            patientNo: 1,
            sendPatientReceipt: 1,
            dataTransmissionToPVSApproved: 1,
            dataTransmissionToMediportApproved: 1,
            socialSecurityNo: 1,
            'insuranceStatus._id': 1,
            'insuranceStatus.billingFactor': 1,
            'insuranceStatus.insuranceKind': 1,
            'insuranceStatus.insuranceGrpId': 1,
            'insuranceStatus.costCarrierBillingGroup': 1,
            'insuranceStatus.costCarrierBillingSection': 1,
            'insuranceStatus.insuranceId': 1,
            'insuranceStatus.insuranceName': 1,
            'insuranceStatus.address1': 1,
            'insuranceStatus.address2': 1,
            'insuranceStatus.persGroup': 1,
            'insuranceStatus.dmp': 1,
            'insuranceStatus.feeSchedule': 1,
            'insuranceStatus.cardSwipe': 1,
            'insuranceStatus.type': 1,
            'insuranceStatus.insuranceNo': 1,
            'insuranceStatus.vekaCardNo': 1,
            'insuranceStatus.cardExpiryDate': 1,
            'insuranceStatus.cardValidationDate': 1,
            'insuranceStatus.insuranceGLN': 1,
            'insuranceStatus.recipientGLN': 1,
            'insuranceStatus.insurancePrintName': 1,
            'insuranceStatus.zipcode': 1,
            'insuranceStatus.city': 1,
            'insuranceStatus.phone': 1,
            'insuranceStatus.email': 1,
            'insuranceStatus.cardType': 1,
            'insuranceStatus.cardTypeGeneration': 1,
            'insuranceStatus.cdmVersion': 1,
            'insuranceStatus.kvkHistoricalNo': 1,
            'insuranceStatus.locationFeatures': 1,
            'insuranceStatus.fk4108': 1,
            'insuranceStatus.fk4133': 1,
            'insuranceStatus.fk4110': 1,
            // patientversion fields
            timestamp: 1
        };

        const medicationFields = {
            _id: 1,
            status: 1,
            employeeId: 1,
            patientId: 1,
            actType: 1,
            timestamp: 1,
            code: 1,
            catalogShort: 1,
            content: 1,
            phPriceSale: 1,
            insuranceCode: 1,
            phGTIN: 1,
            phPZN: 1,
            invoiceId: 1,
            vat: 1,
            vatType: 1
        };

        const invoiceFields = {
            _id: 1,
            actType: 1,
            activities: 1,
            medidataRejected: 1,
            content: 1,
            status: 1,
            icds: 1,
            icdsExtra: 1,
            referenceNo: 1,
            invoiceNo: 1
        };
    // -----------------------------------------------------------------------------------------------------------------
    // -----------------------------------------------------------------------------------------------------------------


        function createDocument( args ) {
            const {user, id, locationId, media} = args;
            let
                data = {
                    type: 'OTHER',
                    url: '/media/' + Y.doccirrus.media.getCacheFileName( media, false ),
                    publisher: 'From TARMED',
                    contentType: Y.doccirrus.media.getMimeType( media.mime ),
                    attachedTo: id,
                    activityId: '',
                    patientId: null,
                    locationId: locationId,
                    caption: media.name,
                    createdOn: moment().toISOString(),
                    mediaId: media._id,
                    accessBy: []
                };

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'document',
                data: Y.doccirrus.filters.cleanDbObject( data )
            } );
        }
        /**
         * @method PUBLIC
         * @JsonRpcApi
         * This method gets the tarmedlogs, possibily filtered by the locations accessible to the user
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operations and filter locations
         * @param {Object} args.query :OPTIONAL: specifies DB query
         * @param {Object} args.options :OPTIONAL: specifies DB query options
         * @returns {Array} Array of tarmed logs
         */
        async function get( {user, query, options, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.tarmedlog.get', 'info', NAME );
            let err, result, count;
            // I) Check location settings and adapt query -----------------------------------------------------------------
            const settings = Y.doccirrus.api.settings.getSettings( user );

            if( settings && settings.noCrossLocationAccess ) {
                [err, result] = await formatPromiseResult( runDb( {
                    model: 'employee',
                    user: user,
                    query: {_id: user.specifiedBy},
                    options: {
                        lean: true,
                        fields: {locations: 1}
                    }
                } ) );

                if( err ) {
                    Y.log( `tarmedlog_get: Error in getting locations by user from DB. ${err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.tarmedlog.get', 'info', NAME );
                    return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) );
                }

                const locations = Array.isArray( result ) && result.length && result[0].locations;
                const locationIds = Array.isArray( locations ) && locations.map( location => location._id );

                query.mainLocationId = {$in: locationIds};
            }

        // II) Get Logs ------------------------------------------------------------------------------------------------
            [err, result] = await formatPromiseResult( runDb( {
                user, query,
                model: 'tarmedlog',
                options: {...options, lean: true}
            } ) );

            if( err ) {
                Y.log( `tarmedlog_get: Error in getting tarmedlogs from DB. ${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) );
            }

            result  = result.result ? result.result : result;

            if( options.limit && options.skip && options.limit > result.length ) {
                count = result.length + options.skip;

            } else {
                [err, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'count',
                    query,
                    model: 'tarmedlog'
                } ) );

                if( err ) {
                    Y.log( `tarmedlog_get: Error in getting tarmedlogs from DB  ${err.stack || err}`, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) );
                }

            }
         
            if( options.paging ) {
                result.count = count;
            }

            Y.log( 'Exiting Y.doccirrus.api.tarmedlog.get', 'info', NAME );
            return callback( null, result );
        }


        /**
         * @method PUBLIC
         * @JsonRpcApi
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operations
         * @param {Object} args.originalParams :REQUIRED:
         * @param {Object} args.originalParams.settings :REQUIRED: specifies locations and insurancetypes
         * @returns {Array} Array of created tarmed logs
         */
        function createLogs( {user, originalParams: {settings = {}}, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.tarmedlog.createLogs', 'info', NAME );
            const locations = settings.locations;

            if( !(Array.isArray( settings.locations ) && settings.locations.length) ) { // Should never happen
                Y.log( `createLogs: Could not create tarmedlogs - no locations provided.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.createLogs', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_01' ) );
            }
            if( !(Array.isArray( settings.insuranceTypes ) && settings.insuranceTypes.length) ) { // Should never happen
                Y.log( `createLogs: Could not create tarmedlogs - no insuranceTypes provided.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.createLogs', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_02' ) );
            }

            const createTarmedLogPromises = locations.map( createTarmedLog );

            return Promise.all( createTarmedLogPromises )
                .then( newTarmedLogIds => {
                    Y.log( `createLogs: finished creating TARMED logs: ${newTarmedLogIds}`, 'info', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.tarmedlog.createLogs', 'info', NAME );
                    return callback( null, {data: newTarmedLogIds} );
                } )
                .catch( err => {
                    Y.log( `createLogs: could not create tarmedlogs. ${err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.tarmedlog.createLogs', 'info', NAME );
                    return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) );
                } );

            function createTarmedLog( location ) {
                const tarmedlog = generateNewTarmedLogData( {user, location, settings} );

                // TODO: Bad error handling here
                return runDb( {
                    user: user,
                    model: 'tarmedlog',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( tarmedlog )
                } );
            }
        }

        /**
         * Generates empty initial tarmedlog data
         * @PUBLIC
         * @method generateNewTarmedLogData
         *
         * @param {Object} user      :REQUIRED:
         * @param {Object} location  :REQUIRED:
         * @param {Object} settings  :REQUIRED:
         * @returns {Object}
         */
        function generateNewTarmedLogData( {user, location, settings} ) {
            const schema = Y.doccirrus.schemaloader.getSchemaForSchemaName( 'tarmedlog' );
            const data = {
                ...settings,
                ...location,
                status: 'CREATED',
                mainLocationId: location._id,
                created: new Date(),
                lastUpdate: new Date(),
                totalItems: '',
                excludedScheinIds: [],
                unknownInsuranceScheinIds: [],
                excludedPatientIds: [],
                firstCollecting: true,
                mediportNotAllowedPatientIds: [],
                invoiceDocs: [],
                user: [
                    {
                        name: user.U,
                        employeeNo: user.identityId
                    }
                ],
                version: 1,
                _id: undefined      // Don't want to keep _id field from settings and location
            };
            return Y.mix( Y.doccirrus.schemaloader.getEmptyDataForSchema( schema ), data, true );
        }

        /**
         * Retrieves settings from tarmedlog data
         * @PUBLIC
         * @method getSettingsFromTarmedlog
         *
         * @param {Object} tarmedlog      :REQUIRED:
         * @returns {Object}
         */
        function getSettingsFromTarmedlog( tarmedlog ) {
            const {law, billerEqualToProvider, kvgSettingTitle, locations, employees, startDate, endDate, useStartDate,
                useEndDate, minTotal, doNotcheckCatalog, insuranceTypes, isTiersPayant, isTiersGarant} = tarmedlog;

            return {law, billerEqualToProvider, kvgSettingTitle, locations, employees, startDate, endDate, useStartDate,
                useEndDate, minTotal, doNotcheckCatalog, insuranceTypes, isTiersPayant, isTiersGarant};
        }
        /**
         * @method PUBLIC
         * @JsonRpcApi
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operations
         * @param {Object} args.originalParams :REQUIRED: specifies log id to be deleted
         */
        async function removeLog( {user, originalParams, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
            const REMOVABLE_STATES = new Set( ['CREATED', 'CANCELED', 'VALID', 'VALIDATION_ERR', 'INVALID', 'INVOICED_APPROVED'] ),
                tarmedlogId = originalParams.id;
            let err, invoiceRefs, result;

            if(!tarmedlogId) {
                err = Y.doccirrus.errors.rest('tarmed_05');
                Y.log( `remove: Failed to get invoicerefs for tarmedlog ${tarmedlogId}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
                return callback( err );
            }
            [err] = await formatPromiseResult(Y.doccirrus.invoicelogutils.removeInvoiceLog( {
                user: user,
                model: 'tarmedlog',
                invoiceLogId: originalParams && originalParams.id,
                testFn: tarmedlog => REMOVABLE_STATES.has( tarmedlog.status )
            } ) );

            if (err) {
                Y.log( `remove: Could not remove tarmedlog. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
                return callback( err );
            }

            // Need to unset link to tarmedlog for medidataRejected invoiceRefs here because removeInvoiceLog won't do it
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'update',
                query: {
                    medidataRejected: true,
                    invoiceLogId: tarmedlogId
                },
                data: {
                    $unset: {invoiceLogId: 1, invoiceLogType: 1}
                },
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `remove: Failed to unset link to tarmedlog ${tarmedlogId} for medidataRejected invoiceRefs. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
                return callback( err );
            }

            Y.log(`removeLog(): unset tarmedlog link (${tarmedlogId}) : ${JSON.stringify( result )}`, 'info', NAME);

            [err, invoiceRefs] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {
                    actType: 'INVOICEREF',
                    $or: [
                        {medidataRejected: {$exists: false}},
                        {medidataRejected: false}
                    ],
                    kvglogId: tarmedlogId
                }
            } ) );

            if (err) {
                Y.log( `remove: Failed to get invoicerefs for tarmedlog ${tarmedlogId}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
                return callback( err );
            }

            const promises = invoiceRefs.map(async invoiceRef => {
                const fsmName = Y.doccirrus.schemas.activity.getFSMName( invoiceRef.actType );
                [err] = await formatPromiseResult(Y.doccirrus.fsm[fsmName].cancel(user, {}, invoiceRef, false, callback));
                if(err) {
                    Y.log( `send(): Failed to set billed status for invoiceRef id ${invoiceRef._id} from tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.tarmedlog.send', 'info', NAME );
                    throw err;
                }
            });

            [err] = await Promise.all(promises);
            if (err) {
                Y.log( `remove: Failed to cancel invoicerefs for tarmedlog ${tarmedlogId}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.removeLog', 'info', NAME );
                return callback( err );
            }

            return callback( null );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operations
         * @param {Object} args.originalParams :REQUIRED: specifies log id to be validated and preValidation flag
         */

        // I) ...... Check rights and retrieve relevant tarmedlog entry from DB
        // II) ..... Reset validation status of tarmedlog entry
        // III) .... Callback and alert client
        // IV) ..... Collect invoice entries
        // V) ...... SUMEX Validation
        // VI) ..... Update tarmedlog entry and alert client

        // NB: Until step III) responses are sent over jsonrpc callback, after the client is updated through socket communication
        // NB: collectState and validationResults are managed in the global state and used in step VI)

        async function validate( {user, originalParams: {id, preValidation}, callback} ) {
            Y.log( 'Entering Y.doccirrus.api.tarmedlog.validate', 'info', NAME );

        // ========================================================================================================== \\
        // ============================================== FLOW - Start ============================================== \\
            let err, result, tarmedlog, locations;
            const logInfo = {
                id,
                isPreValidation: preValidation,
                countryCode: 'CH'
            };
            let collectState = {
                stats: {}
            };
            let validationResults = {
                errors: [],
                warnings: []
            };

        // -------------------------------------------------------------------------------------------------------------
        // I) Check rights Retrieve relevant tarmedlog from DB ---------------------------------------------------------
            if( !Y.doccirrus.auth.hasAPIAccess( user, 'tarmedlog.validate' ) || (preValidation && !Y.doccirrus.auth.hasAPIAccess( user, 'tarmedlog.preValidate' )) ) {
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 401, '', true ) );
            }

            if( !id ) { // Should never happen
                Y.log( `validate: Could not validate tarmedlog - no id was provided.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }

            [err, result] = await formatPromiseResult( getTarmedlogById( id, user) );

            if( err || !result ) {
                Y.log( `validate: Could not validate tarmedlog - tarmedlog could not be found for id: ${id}. ${err ? err.stack || err : ''}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }
            tarmedlog = result;
            const locationId = tarmedlog.mainLocationId || tarmedlog.locationId;

        // -------------------------------------------------------------------------------------------------------------
        // II) Reset validation status ---------------------------------------------------------------------------------
            [err, result] = await formatPromiseResult( resetTarmedlogValidationStatus() );

            if( err ) {
                Y.log( `validate: Could not validate tarmedlog - failed to reset tarmedlog with id: ${id}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }
            tarmedlog = result;

        // -------------------------------------------------------------------------------------------------------------
        // III) Callback and alert client ------------------------------------------------------------------------------
            // Future updates to the validation process are being sent over socket communication.
            callback( null ); // eslint-disable-line
            alertClient( {state: 'started', action: 'validate', user, id, logInfo} );

        // -------------------------------------------------------------------------------------------------------------
        // IV) Collect invoice entries ---------------------------------------------------------------------------------

            [err, locations] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'location',
                action: 'get',
                query: {
                    _id: locationId
                }
            }));

            if( err || !locations || !locations.length) {
                Y.log( `validate(): error in getting location ${locationId} for tarmedlog ${tarmedlog._id}:\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return endValidation( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }
            const location = locations[0];
            logInfo.commercialNo = location.commercialNo;
            logInfo.zsrNumber = location.zsrNumber;

            [err, result] = await formatPromiseResult( collectInvoiceEntries( {
                user,
                tarmedlog,
                logInfo
            } ) );
            
            if( err ) {
                Y.log( `validate: Could not validate tarmedlog - failed to collect invoice entries for tarmedlog with id: ${id}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return endValidation( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }
            collectState = result;
            tarmedlog.firstCollecting = false;

        // -------------------------------------------------------------------------------------------------------------
        // V) SUMEX Validation -----------------------------------------------------------------------------------------
            [err, result] = await formatPromiseResult( Y.doccirrus.tarmedValidation.validateTarmedlog( {
                tarmedlog,
                location,
                user,
                onProgress: progress => alertClient({ user, id, state: 'progress', action: 'validate', progress, logInfo, identityId: user.identityId} )
            } ) );

            if( err ) { // validateTarmedLog() throws DC rest errors that can be displayed to the user
                Y.log( `SUMEX: validate(): error in validating the tarmedlog ${id} through the SUMEX module. Error: ${err.code || err.stack || err}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return endValidation( err );
            }
            validationResults = result;

        // VI) Update tarmedlog and alert client -----------------------------------------------------------------------
            Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
            return endValidation();

        // ========================================================================================================== \\
        // =============================================== FLOW - End =============================================== \\

            function resetTarmedlogValidationStatus() {
                const validStatus = new Set( ['CREATED', 'VALID', 'INVALID', 'APPROVING', 'SENT_ERR', 'VALIDATION_ERR', 'TIMEOUT', 'CANCELED'] );

                if( !validStatus.has( tarmedlog.status ) ) {
                    return Promise.reject( new Error( `Log state '${tarmedlog.status}' is not valid.` ) );
                }

                const resetTarmedlog = {
                    ...tarmedlog,
                    isPreValidated: preValidation,
                    isContentOutdated: false,
                    status: 'VALIDATING',
                    _log_version: LATEST_LOG_VERSION,
                    pid: Y.doccirrus.ipc.pid(),
                    totalItems: '',
                    notApproved: [0, 0, 0],
                    output: [],
                    warnings: []
                };

                return Y.doccirrus.invoicelogutils.saveInvoiceLog( resetTarmedlog, user, 'tarmedlog' );
            }

            async function endValidation( processError ) {
                if( processError ) {
                    alertTarmedClient( {user, error: processError} );
                }

                let [err] = await formatPromiseResult( updateTarmedlogValidationStatus( {
                    user,
                    tarmedlog,
                    collectState,
                    processError,
                    actionResults: validationResults,
                    successStatus: VALID_STATUS
                } ) );

                if( err ) {
                    Y.log( `validate: Could not update entry after validation for tarmedlog with id: ${id}. ${err.stack || err}`, 'error', NAME );
                    alertTarmedClient( {user, error: Y.doccirrus.errors.rest('tarmed_06')} );
                }

                alertClient( {
                    user, id, logInfo,
                    state: 'finished',
                    action: 'validate',
                    validationWarnings: validationResults.warnings,
                    validationErrors: validationResults.errors
                } );
            }
        }

        /**
         * Collects and saves invoiceentries for tarmedlog
         * @PUBLIC
         * @method collectInvoiceEntries
         *
         * @param {Object} user      :REQUIRED:
         * @param {Object} logInfo  :REQUIRED:
         * @param {Object} tarmedlog  :REQUIRED:
         * @param {Object} tarmedTaxPointValues  :REQUIRED:
         * @param {String} cantonCode  :REQUIRED:
         * @returns {Promise}
         */
        function collectInvoiceEntries( {user, logInfo, tarmedlog} ) {
            return Y.doccirrus.invoiceprocess.collect( {
                ...tarmedlog,
                user,
                locationFields,
                getInvoiceEnd,
                getScheinEnd,
                onScheine,
                physicianFields,
                scheinFields,
                treatmentFields,
                diagnosisFields,
                patientFields,
                medicationFields,
                invoiceFields,
                invoiceLogId: tarmedlog._id.toString(),
                caseFolderType: tarmedlog.insuranceTypes,
                invoiceLogType: 'Medidata',
                preValidation: logInfo.isPreValidation,
                autoAssignmentOfDiagnosis: true, // WHAT is this ?
                doNotcheckCatalog: true,
                collectMedidataRejected: tarmedlog.collectMedidataRejected,
                employeeFilterEnabled: Boolean( (tarmedlog.employees && tarmedlog.employees.length) ) || false,
                onPatientProgress: progress => alertClient( {
                    user,
                    id: tarmedlog._id,
                    logInfo,
                    state: 'progress',
                    progress,
                    action: 'validate'
                } )
            } );

            function getInvoiceEnd() {
                return tarmedlog.endDate;
            }

            // Taken  over for PVS, to check
            function getScheinEnd( schein, nextSchein ) {
                const nextScheineTimestamp = nextSchein && nextSchein.timestamp && moment( nextSchein.timestamp );
                return nextScheineTimestamp ? nextSchein.timestamp : new Date();
            }

            function onScheine( patient, scheine ) {
                return Prom.map( scheine, async function( schein ) {
                    if( tarmedlog.collectMedidataRejected ) {
                        // fill only at first tarmedlog validation
                        if( 'VALID' !== schein.invoiceStatus && tarmedlog.firstCollecting && !tarmedlog.excludedScheinIds.includes( schein.invoiceRefId ) ) {
                            tarmedlog.excludedScheinIds.push( schein.invoiceRefId );
                        }
                        // if invoice becomes valid - include it to tarmedlog
                        if( 'VALID' === schein.invoiceStatus && tarmedlog.excludedScheinIds.includes( schein.invoiceRefId ) ) {
                            const invoiceIndex = tarmedlog.excludedScheinIds.indexOf( schein.invoiceRefId );
                            tarmedlog.excludedScheinIds.splice( invoiceIndex, 1 );
                        }
                        if( schein.invoiceNo ) {
                            schein.referenceNo = schein.referenceNo || await countReferenceNumber( {user, invoice: schein} );
                            return schein;
                        }
                    }
                    const getInvoiceNumber = promisifyArgsCallback( Y.doccirrus.api.invoiceconfiguration.getNextInvoiceNumber );
                    let [err, invoiceNo] = await formatPromiseResult(
                        getInvoiceNumber( {
                            user,
                            data: {locationId: schein.locationId}
                        } )
                    );

                    if( err ) {
                        Y.log( `invoiceprocess.server.js storePatientData(): cannot get invoiceNo for location ${schein.locationId}:\n${err.stack}`, 'error', NAME );
                        throw err;
                    }
                    schein.invoiceNo = invoiceNo.replace( /[^0-9]/g, '' );
                    schein.referenceNo = await countReferenceNumber( {user, invoice: schein} );
                    return schein;
                } );
            }
        }

        function alertClient( {user, id, state, progress, action, logInfo, validationWarnings = [], validationErrors = [], errors = []} ) {
            return Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'invoicelogAction',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        id, state, progress, logInfo, action,
                        invoiceType: 'KVG',
                        errors: errors.map( err => Y.doccirrus.errors.rest( '500', err ) ),
                        warnings: ![...validationErrors, ...validationWarnings].length ? [] : [
                            Y.doccirrus.errors.rest( '2011', {
                                $warnings: validationWarnings.length,
                                $errors: validationErrors.length
                            } )
                        ]
                    }
                }
            } );
        }

        function alertTarmedClient( {user, error} ) {
            return Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'tarmedLogging',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        error,
                        invoiceType: 'KVG'
                    }
                }
            } );
        }

        async function countReferenceNumber({user, invoice}) {
            function formatNumber(number, length) {
                // todo: add number validation here
                return number.length > length ? number.substring(0, length) : number.padStart(length, '0');
            }

            let invoiceNo = invoice.invoiceNo.replace(/[^0-9]/g, '');
            let [err, locations] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'location',
                action: 'get',
                query: {
                    _id: invoice.locationId
                }
            }));

            if(err) {
                Y.log( `countReferenceNumber(): cannot get location ${invoice.locationId} for invoiceenry ${invoice._id}:\n${err.stack}`, 'error', NAME );
                throw err;
            }

            let bankAccountNo = locations[0].bankIBAN;
            bankAccountNo = bankAccountNo.replace(/[^0-9]/g, '');
            const formattedInvoiceNo = formatNumber(invoiceNo, 20);

            let referenceNo = `${bankAccountNo}${formattedInvoiceNo}`;
            return referenceNo.concat(Y.doccirrus.commonutilsCh.countLastRefNumberDigit(referenceNo));
        }

        /**
         * I) ...... Check rights and retrieve relevant tarmedlog from DB
         * II) ..... Clean Up
         * III) .... Generate Invoices
         *
         * NB 1: This method is exclusively for JsonRpc calls
         * NB 2: Responses are sent over callback until step II), after the client is updated through socket communication
         *
         * @method PUBLIC
         * @JsonRpcApi
         * @param {Object} args :REQUIRED:
         * @param {Object} args.originalParams :REQUIRED: should contain log id from which to generate the invoices
         * @param {Object} args.user :REQUIRED: User object to use for performing DB operations
         * @param {Function} args.callback :OPTIONAL: callback function for responding to JsonRpc call
         */
        async function generateInvoices( {user, originalParams: {id}, callback} ) {
            let invoiceResults = {
                errors: [],
                warnings: []
            };
            const logInfo = {id, isPreValidation: false, countryCode: 'CH'};
            const mediaTempDir = Y.doccirrus.media.getTempDir();
            const mediaCacheDir = Y.doccirrus.media.getCacheDir();
            const concatenatePDFsAsync = util.promisify( Y.doccirrus.media.pdf.concatenatePDFs );
            const importMediaFromFileAsync = util.promisify( Y.doccirrus.media.importMediaFromFile );

            function resetTarmedlogValidationStatus() {
                const resetTarmedlog = {
                    ...tarmedlog,
                    isPreValidated: true,
                    isContentOutdated: false,
                    status: 'VALIDATING',
                    _log_version: LATEST_LOG_VERSION,
                    pid: Y.doccirrus.ipc.pid(),
                    output: [],
                    warnings: []
                };

                return Y.doccirrus.invoicelogutils.saveInvoiceLog( resetTarmedlog, user, 'tarmedlog' );
            }
            async function endGeneration( processError ) {
                if( processError ) {
                    alertTarmedClient( {user, id, error: processError, resultData} );
                }

                let [err] = await formatPromiseResult( updateTarmedlogValidationStatus( {
                    user,
                    tarmedlog,
                    processError,
                    actionResults: invoiceResults,
                    successStatus: INVOICED_APPROVED_STATUS
                } ) );

                if( err ) {
                    Y.log( `generateInvoices: Could not update entry after validation for tarmedlog with id: ${id}. ${err.stack || err}`, 'error', NAME );
                    alertTarmedClient( {user, error: Y.doccirrus.errors.rest('tarmed_06')} );
                }

                alertClient( {
                    user, id, logInfo,
                    state: 'finished',
                    action: 'approve',
                    validationWarnings: invoiceResults.warnings,
                    validationErrors: invoiceResults.errors
                } );
            }

            Y.log( 'Entering Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
            let err, result, tarmedlog, locations, resultData = null;

        // -------------------------------------------------------------------------------------------------------------
        // I) Check rights and retrieve relevant tarmedlog from DB -----------------------------------------------------
            if( !Y.doccirrus.auth.hasAPIAccess( user, 'tarmedlog.generateInvoices' ) ) {
                err = Y.doccirrus.errors.rest( 401, '', true );
                Y.log( `SUMEX: generateInvoices(): No access for generating invoices for tarmedlog ${id}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
                return callback( err );
            }

            if( !id ) { // Should never happen
                err = Y.doccirrus.errors.rest( 'tarmed_00', null, true ); // Generic Error
                Y.log( `SUMEX: generateInvoices(): Could not generate invoices for tarmedlog - no id was provided.\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
                return callback( err );
            }

            alertClient( {user, id, state: 'started', action: 'approve', logInfo, identityId: user.identityId} );

            [err, tarmedlog] = await formatPromiseResult( getTarmedlogById( id, user ) );

            if( err || !tarmedlog ) {
                Y.log( `SUMEX: generateInvoices(): Could not validate tarmedlog - tarmedlog could not be found for id: ${id}. ${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00', null, true ) ); // Generic Error
            }
            [err] = await formatPromiseResult(
                Y.doccirrus.invoicelogutils.saveInvoiceLog( {...tarmedlog, status: 'INVOICING'}, user, 'tarmedlog' )
            );
            if( err ) {
                Y.log( `SUMEX: generateInvoices(): Error saving tarmedLog. ${err && err.stack || err}`, 'warn', NAME );
            }

            // -------------------------------------------------------------------------------------------------------------
            // II) Reset validation status ---------------------------------------------------------------------------------
            [err, result] = await formatPromiseResult( resetTarmedlogValidationStatus() );

            if( err ) {
                Y.log( `validate: Could not validate tarmedlog - failed to reset tarmedlog with id: ${id}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return callback( Y.doccirrus.errors.rest( 'tarmed_00' ) ); // Generic error message
            }

            tarmedlog = result;

            const locationId = tarmedlog.mainLocationId || tarmedlog.locationId;
            [err, locations] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'location',
                action: 'get',
                query: {
                    _id: locationId
                }
            }));

            if( err || !locations || !locations.length) {
                Y.log( `validate(): error in getting location ${locationId} for tarmedlog ${tarmedlog._id}:\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.validate', 'info', NAME );
                return alertTarmedClient( {user, error: err} );
            }
            const location = locations[0];
            logInfo.commercialNo = location.commercialNo;
            logInfo.zsrNumber = location.zsrNumber;

        // -------------------------------------------------------------------------------------------------------------
        // II) Generate Invoices --------------------------------------------------------------------------------------
            callback( null ); // eslint-disable-line callback-return
            [err, result] = await formatPromiseResult( Y.doccirrus.tarmedInvoices.genereateTarmedInvoices( {
                tarmedlog,
                user,
                onProgress: progress => alertClient({ user, id, state: 'progress', action: 'approve', progress, logInfo, identityId: user.identityId} )
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateInvoices(): Error in generating invoices for tarmedlog ${id}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );

                return endGeneration( Y.doccirrus.errors.rest('tarmed_00') );
            }
            invoiceResults = result;

            if(result.errors && result.errors.length) {
                return endGeneration();
            }
            tarmedlog.invoiceDocs = result.invoiceDocs;

            if( result.totalItems ) {
                tarmedlog.totalItems = result.totalItems;
            }
            if( result.priceTotal || Number.isFinite(result.priceTotal) ) {
                tarmedlog.priceTotal = result.priceTotal;
            }

            tarmedlog.status = "INVOICED_APPROVED";
            let completePdfFileName,
                pdfFileNames = tarmedlog.invoiceDocs.map( ( file ) => {
                    if( file.pdf ) {
                       return file.pdf;
                    }
                });

            if( pdfFileNames && pdfFileNames.length ) {
                [err, completePdfFileName] = await formatPromiseResult( concatenatePDFsAsync( {
                    user,
                    fileNames: pdfFileNames.map( fileName => mediaTempDir + fileName ),
                    newFileName: `${new mongoose.Types.ObjectId().toString()}_original.APPLICATION_PDF.pdf`,
                    doNotClean: true
                } ) );

                if( err ) {
                    Y.log( `could not concat tarmed log ${id} pdfs: ${err.stack || err}`, 'warn', NAME );
                    return alertTarmedClient( {user, error: Y.doccirrus.errors.rest( 'tarmed_07' )} );
                }

                let media;
                [err, media] = await formatPromiseResult( importMediaFromFileAsync(
                    user,
                    mediaCacheDir + completePdfFileName,
                    'tarmedlog',
                    id,
                    completePdfFileName,
                    'user',
                    'OTHER'
                ) );


                if( err ) {
                    Y.log( `could not import media from tarmedlog ${id} pdf file: ${err.stack || err}`, 'warn', NAME );
                    return alertTarmedClient( {user, error: Y.doccirrus.errors.rest( 'tarmed_07' )} );
                }

                let result;
                [err, result] = await formatPromiseResult( createDocument( {user, id, locationId, media} ) );

                if( err ) {
                    Y.log( `could not save document from media tarmedlog ${id} pdf file: ${err.stack || err}`, 'warn', NAME );
                    return alertTarmedClient( {user, error: Y.doccirrus.errors.rest( 'tarmed_07' )} );
                }

                let documentId = result && result[0];
                if( documentId ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'document',
                            query: {
                                _id: documentId
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `could not get document from tarmedlog ${id} pdf file: ${err.stack || err}`, 'warn', NAME );
                        return alertTarmedClient( {user, error: Y.doccirrus.errors.rest( 'tarmed_07' )} );
                    }

                    let documentObj = result && result[0];
                    tarmedlog.pdfFile = documentObj.url;
                }
            }
            [err] = await formatPromiseResult( runDb( {
                user,
                action: 'put',
                model: 'tarmedlog',
                query: {_id: tarmedlog._id},
                data: Y.doccirrus.filters.cleanDbObject( tarmedlog ),
                fields: Object.keys( tarmedlog )
            } ) );

            if( err ) {
                Y.log( `SUMEX: generateInvoices(): Error in saving updated tarmedlog ${id}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
                let error = Y.doccirrus.errors.rest( 'tarmed_06', null, true );
                return alertTarmedClient( {user, error} ); // Generic Error
            }

            Y.log( 'Exiting Y.doccirrus.api.tarmedlog.generateInvoices', 'info', NAME );
            return endGeneration();
        }

        function getTarmedlogById( _id, user ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tarmedlog',
                query: {_id}
            } ).then( result => result[0] );
        }

        async function isContentOutdated( activity ) {
            let activityFields;

            switch( activity.actType ) {
                case 'DIAGNOSIS':
                    activityFields = diagnosisFields;
                    break;
                case 'TREATMENT':
                    activityFields = treatmentFields;
                    break;
                case 'PKVSCHEIN':
                    activityFields = scheinFields;
                    break;
                default:
                    Y.log( `could not find tarmedlog activity fields for actType ${activity.actType}`, 'debug', NAME );
                    return false;
            }

            return Y.doccirrus.mongooseUtils.areFieldsModified( activityFields, activity );
        }

        async function saveInvoiceOutput({user, updatedTarmedlog, output}) {
            let [err, res] = await formatPromiseResult(Y.doccirrus.invoicelogutils.saveInvoiceLog( updatedTarmedlog, user, 'tarmedlog' ));
            if(err) {
                Y.log("updateTarmedlogValidationStatus(): Failed to save invoice", 'error', NAME);
                throw err;
            }
            const entries = output.filter(entry => !entry.saved);

            if(entries.length) {
                [err] = await formatPromiseResult( Y.doccirrus.api.invoicelog.saveEntries( {
                    user,
                    entries,
                    ruleLogType: 'ERROR',
                    inVoiceLogId: updatedTarmedlog._id,
                    logType: 'KVG',
                    source: "sumex"
                } ) );

                if( err ) {
                    Y.log( `SUMEX: handleResponse(): Error in saving error as invoice entry for tarmedlog ${updatedTarmedlog._id}.`, 'debug', NAME );
                    throw err; // Will get  converted to DC Error in validatePatientScheins()
                }
            }
            return res;
        }

        async function put( args ) {
            let { user, originalParams, callback } = args;
            let [ err, result ] = await formatPromiseResult( runDb( {
                user,
                action: 'update',
                model: 'tarmedlog',
                query: originalParams.query,
                data: originalParams.data,
                fields: originalParams.fields
            } ) );
            if ( err ) {
                Y.log( '', 'error', NAME );
                return callback( err );
            }
            return callback( null, result );
        }

        async function send({user, originalParams: {id, deliveryType}, callback}) {
            Y.log( 'Entering Y.doccirrus.api.tarmedlog.send', 'info', NAME );
            let err, invoiceRefs;
            [err, invoiceRefs] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                action: 'get',
                model: 'activity',
                query: {
                    actType: 'INVOICEREF',
                    kvglogId: id
                }
            }));

            if(err) {
                Y.log( `send(): error in getting invoiceRef by tarmedlog id ${id}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.send', 'info', NAME );
                return callback(err);
            }

            const promises = invoiceRefs.map(async invoiceRef => {
                const fsmName = Y.doccirrus.schemas.activity.getFSMName( invoiceRef.actType );
                [err] = await formatPromiseResult(Y.doccirrus.fsm[fsmName].bill(user, {}, invoiceRef, false, callback));
                if(err) {
                    Y.log( `send(): Failed to set billed status for invoiceRef id ${invoiceRef._id} from tarmedlog ${id}.\n${err && err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.tarmedlog.send', 'info', NAME );
                    throw err;
                }
            });

            [err] = await Promise.all(promises);
            if (err) {
                Y.log( `remove: Failed to bill invoicerefs for tarmedlog ${id}. ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.tarmedlog.send', 'info', NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'tarmedlog',
                action: 'update',
                query: {
                    _id: id
                },
                data: {
                    $set: {status: 'SENT', deliveryType}
                }
            }));

            if(err) {
                Y.log(`Failed to update status of tarmedlog ${id} to SENT;\n${err && err.stack || err}`);
                return callback(err);
            }

            Y.log( 'Exiting Y.doccirrus.api.tarmedlog.send', 'info', NAME );
            callback(null, true);
        }

        /**
         * Updates tarmedlog status, total items, price, errors, warnings and other fields
         *
         * @PUBLIC
         * @method updateTarmedlogValidationStatus
         *
         * @param {Object} user      :REQUIRED:
         * @param {Object} tarmedlog  :REQUIRED:
         * @param {Object} actionResults  :REQUIRED:
         * @param {Object} collectState  :REQUIRED:
         * @param {String} successStatus  :OPTIONAL:
         * @returns {Object}
         */
        async function updateTarmedlogValidationStatus( {user, tarmedlog, actionResults, collectState, successStatus = 'VALID', processError} ) {
            const {errors: output, warnings} = actionResults,
                unexpectedError = (output || []).find(error => error.errorCode);

            if(unexpectedError) {
                alertTarmedClient( {user, error: Y.doccirrus.errors.rest( unexpectedError.errorCode )} );
            }

            let updatedTarmedlog = {
                ...tarmedlog,
                output,
                warnings,
                pid: '',
                lastUpdate: new Date(),
                status: output.length || processError ? 'INVALID' : successStatus,
                user: [
                    {
                        name: user.U,
                        employeeNo: user.identityId
                    }
                ]
            };
            // used for validation
            if( collectState ) {
                const {nScheine, nTreatments, nMedications, nDiagnoses, nScheineNotApproved, nTreatmentsNotApproved,
                    nMedicationsNotApproved, nDiagnosesNotApproved} = collectState.stats,
                    priceTotal = collectState.patients.map(patient => patient.priceTotal).reduce((total, next) => total + next, 0);

                updatedTarmedlog = Object.assign(updatedTarmedlog, {
                    priceTotal,
                    totalItems: `${nScheine}/${nTreatments + nMedications}/${nDiagnoses}`,
                    excludedPatientIds: collectState.excludedPatientIds,
                    excludedScheinIds: collectState.excludedScheinIds,
                    mediportNotAllowedPatientIds: collectState.mediportNotAllowedPatientIds,
                    unknownInsuranceScheinIds: collectState.unknownInsuranceScheinIds,
                    status: (!nScheine && !nTreatments && !nDiagnoses && !nMedications) ? 'INVALID' : updatedTarmedlog.status,
                    notApproved: [nScheineNotApproved, nTreatmentsNotApproved + nMedicationsNotApproved, nDiagnosesNotApproved]
                });
            }
            let [err, res] = await formatPromiseResult( saveInvoiceOutput( {user, updatedTarmedlog, output} ) );

            if(err) {
                Y.log( `SUMEX: handleResponse(): Error in saving invoice output for tarmedlog ${updatedTarmedlog._id}.`, 'error', NAME );
                throw err;
            }

            return res;
        }

        Y.namespace( 'doccirrus.api' ).tarmedlog = {
            name: NAME,
            server: {
                isContentOutdated
            },
            invoiceFields: {
                scheinFields,
                patientFields,
                treatmentFields,
                medicationFields,
                diagnosisFields
            },
            get,
            createLogs,
            removeLog,
            validate,
            generateInvoices,
            countReferenceNumber,
            put,
            send,
            generateNewTarmedLogData,
            getSettingsFromTarmedlog,
            updateTarmedlogValidationStatus,
            collectInvoiceEntries
        };
    },
    '0.0.1', {requires: ['tarmed-validation', 'tarmed-invoices', 'gkv_deliverysettings-schema', 'dcerror', 'dckbvutils', 'dckrwvalidator', 'dcgridfs', 'dcinvoicelogutils', 'DCSocketIO', 'dckvconnectutils', 'settings-schema', 'dclicmgr', 'dcutils', 'KVConnectManager', 'sumex-api', 'dcgridfs']}
);
