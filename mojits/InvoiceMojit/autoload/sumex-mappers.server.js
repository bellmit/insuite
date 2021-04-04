/**
 * User: oliversieweke
 * Date: 21.12.18  14:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


/**
* This class is made to convert dc-insuite fields to Sumex-friendly format.
* All mapping functions must return this format:
* @returns {Object} containing {errors, params},
* where params is Sumex-friendly fields
* and errors is array of errors which will be later saved as invoiceentry type='ERROR'
* */
YUI.add( 'sumex-mappers', function( Y, NAME ) {
        const {formatPromiseResult, promisifyArgsCallback} = require('dc-core').utils,
            {generalInvoiceRequest450: {IAddress}} = Y.doccirrus.sumexGeneralInvoiceRequest450,
            i18n = Y.doccirrus.i18n,
            INVOICE = 'invoice',
            BASECONTACT = 'basecontact',
            LOCATION = 'location',
            PATIENT = 'patient',
            PERSON = 'person',
            INSURANCE = 'insurance',
            EMPLOYEE = 'employee',
            ACTIVITY = 'activity',
            ORGANIZATION = 'organization',
            BILLER = 'biller',
            PROVIDER = 'provider',
            SUMEX_FORMAT_ERROR_i18n = i18n('InvoiceMojit.sumex-api.errors.FORMAT_ERROR'),
            FIELD_MISSING_i18n = i18n('InvoiceMojit.kvg_browser.validation.FIELD_MISSING'),
            DATA_i18n = i18n('InvoiceMojit.kvg_browser.validation.DATA'),
            ERROR_FIELDS_i18n = {
            //patient fields:
                dob: i18n( 'person-schema.Person_T.kbvDob' ),
                gender: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                socialSecurityNo: i18n( 'patient-schema.Patient_T.socialSecurityNo.i18n' ),
                lastname: i18n( 'person-schema.Person_T.lastname.i18n' ),
                firstname: i18n( 'person-schema.Person_T.firstname.i18n' ),
                street: i18n( 'person-schema.Address_T.street' ),
                zip: i18n( 'person-schema.Address_T.zip' ),
                city: i18n( 'InSuiteAdminMojit.tab_locations.placeholder.CITY' ),
                countryCode: i18n( 'person-schema.Address_T.countryCode' ),
                billingAddress: i18n( 'person-schema.AddressKind_E.BILLING' ),
                receiver: i18n( 'person-schema.Address_T.receiver' ),
            //insurance fields:
                insuranceStatus: i18n( "patient-schema.Patient_T.insuranceStatus" ),
                insuranceGLN: i18n( "person-schema.InsuranceStatus_T.insuranceGLN.i18n" ),
                recipientGLN: i18n( "person-schema.InsuranceStatus_T.recipientGLN.i18n" ),
                insuranceName: i18n( "activity-schema.Invoice_T.insuranceName.i18n" ),
                //activity fields:
                employeeId: i18n( 'activity-schema.Activity_T.employeeId.i18n' ),
                code: i18n( 'activity-schema.Catalog_T.code.i18n' ),
                timestamp: i18n( 'activity-schema.Activity_T.timestamp.i18n' ),
                side: i18n( 'activity-schema.Treatment_CH_T.side.i18n' ),
                treatmentType: i18n( 'activity-schema.Activity_T.treatmentType.i18n' ),
            //employee fields
                locname: i18n( 'employee-schema.EmployeeLocations_T.locname' ),
                qualiDignities: i18n( 'employee-schema.Employee_CH_T.qualiDignities.i18n' ),
                glnNumber: i18n( 'physician-schema.Physician_T.glnNumber.i18n' ),
                cantonCode: i18n( 'person-schema.Address_CH_T.cantonCode' )
            };


        const getPatientDetailLink = (id) => `incase#/patient/${id}/tab/patient_detail`;
        const getPatientInsuranceLink = (id) => `incase#/patient/${id}/section/insurance`;
        const getEmployeeDetailLink = (id) => `/admin/insuite#/employee/${id}`;
        const getActivityLink = (id) => `/incase#/activity/${id}`;
        const getLocationLink = (id) => `admin/insuite#/location/${id}`;
        const getFieldsMissingMessage = (fields, entry) => {
            const entry_i18n = i18n( `audit-schema.ModelMeta_E.${entry}` ) || entry,
                fieldsList = fields.reduce( (acc, field) => `${acc}${acc ? ', ' : ''}${ERROR_FIELDS_i18n[field] || field}`, '' );
            return `${SUMEX_FORMAT_ERROR_i18n}: ${fieldsList} ${FIELD_MISSING_i18n} in ${entry_i18n} ${DATA_i18n}`;
        };

    //••••••••••••••••••••••••••••••••••••••••••••••• MAPPERS FUNCTIONS ••••••••••••••••••••••••••••••••••••••••••••••••

        /**
         * This method maps all invoice data to Sumex params grouped by categories
         * @method mapInSuiteInvoiceDataToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.patientId :REQUIRED: Used for logging.
         * @param {String} args.tarmedlogId :REQUIRED: Used for logging.
         * @param {Object} args.user :REQUIRED: Ussed for the DB calls.
         * @param {Object} args.tarmedlog :REQUIRED:
         * @param {Object} args.schein :REQUIRED:
         * @param {String} version :REQUIRED
         *
         * @returns {Promise} resolving to {params, errors}.
         * */
        async function mapInSuiteInvoiceDataToSumexParams({tarmedlogId, schein, user, patientId, version}) {
            Y.log( 'Entering Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
            const patient = schein.data.patient,
                insurance = patient.insuranceStatus.find(insurer => insurer.type === schein.data.caseFolderTypeSingle),
                locationId = schein.data.mainLocationId || schein.data.locationId;

            let err, locations, location, sumexSchein, sumexReferrer, sumexGuarantor,
                referenceNo = schein.data.referenceNo;  // TODO: clarify what if there are multiple schines!
            referenceNo = referenceNo && referenceNo.substring(0, referenceNo.length - 1);

            //todo get location data from invoiceconfig type = patient
            [err, locations] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'location',
                action: 'get',
                query: {
                    _id: locationId
                }
            }));

            if( err || !locations || !locations.length) {
                Y.log( `SUMEX: mapInSuiteInvoiceDataToSumexParams(): error in getting location ${locationId} for patient ${patientId} and tarmedlog ${tarmedlogId}:\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
                throw Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
            }
            location = locations[0];

            const sumexVersionParams = versionToSumexParams(tarmedlogId, version),
                sumexTransportParams = transportToSumexParams( {insurance, location} ),
                sumexLawParams = lawToSumexParams(tarmedlogId, schein, insurance),
                sumexBankParams = bankToSumexParams( tarmedlogId, location, referenceNo),
                sumexTiersParams = {
                    bstrVatNumber: location.vatNumber
                };

            const sumexPatient = mapInSuitePatientToSumexParams(tarmedlogId, schein, patient, INVOICE),
                sumexInsurance = mapInSuiteInsuranceToSumexParams({schein, tarmedlogId, insurance}),
                sumexBiller = mapInSuiteBillerOrProviderToSumexParams( {tarmedlogId, location, type: BILLER} );

            [err, sumexSchein] = await formatPromiseResult(
                mapInSuiteScheinToSumexParams({tarmedlogId, patientId, user, location, schein}, INVOICE)
            );
            if( err || !sumexSchein ) {
                Y.log( `SUMEX: mapInSuiteInvoiceDataToSumexParams(): error in mapping inSuite schein to sumex params for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
                throw err || Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
            }

            const physiciansParams = (sumexSchein.params || {}).physiciansParams || [],
                physician = physiciansParams[0];

            const sumexProvider = mapInSuiteBillerOrProviderToSumexParams( {tarmedlogId, location, physician, type: PROVIDER} );

            [err, sumexReferrer] = await formatPromiseResult( mapInsuiteReferrerToSumexParams({tarmedlogId, patientId, schein, user}));
            if( err || !sumexReferrer ) {
                Y.log( `SUMEX: mapInSuiteInvoiceDataToSumexParams(): error in mapping inSuite referrer to sumex params for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
                throw err || Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
            }

            if(schein.data.isTiersGarant) {
                [err, sumexGuarantor] = await formatPromiseResult( mapInsuiteGuarantorToSumexParams({tarmedlogId, patientId, schein, user}));
                if( err) {
                    Y.log( `SUMEX: mapInSuiteInvoiceDataToSumexParams(): error in mapping inSuite referrer to sumex params for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
                    throw err;
                }
            }

            const sumexScheinParams = sumexSchein.params,
                sumexPatientParams = sumexPatient.params,
                sumexInsuranceParams = sumexInsurance.params,
                sumexBillerParams = sumexBiller.params,
                sumexProviderParams = sumexProvider.params,
                sumexReferrerParams = sumexReferrer.params,
                sumexGuarantorParams = sumexGuarantor && sumexGuarantor.params,
                errors = [
                    ...sumexInsurance.errors,
                    ...sumexPatient.errors,
                    ...sumexSchein.errors,
                    ...sumexBiller.errors,
                    ...sumexProvider.errors,
                    ...sumexReferrer.errors,
                    ...(sumexGuarantor ? sumexGuarantor.errors : [])
                ].filter( ( error, index, self ) => {
                    // remove duplicate errors
                    return index === self.findIndex( e => {
                        return JSON.stringify( e ) === JSON.stringify( error );
                    } );
                } );
            Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams', 'info', NAME );
            return {
                errors,
                params: {
                    sumexVersionParams,
                    sumexLawParams,
                    sumexBillerParams,
                    sumexProviderParams,
                    sumexBankParams,
                    sumexTransportParams,
                    sumexTiersParams,
                    sumexScheinParams,
                    sumexPatientParams,
                    sumexInsuranceParams,
                    sumexReferrerParams,
                    ...(sumexGuarantorParams ? {sumexGuarantorParams} : {})
                }
            };
        }

        async function mapInSuiteWarningDataToSumexParams({user, warning, invoice}) {
            Y.log( 'Entering Y.doccirrus.sumexMappers.mapInSuiteWarningDataToSumexParams', 'info', NAME );
            let err, lReminderLevel, reminderText, paymentPeriod, dunningSchema;
            const errors = [];

            [err, dunningSchema] = await formatPromiseResult(
                Y.doccirrus.api.invoiceconfiguration.getDunningScheme( user, warning.locationId )
            );

            if( err || !dunningSchema ) {
                Y.log( `SUMEX: mapInSuiteWarningDataToSumexParams(): failed to get dunningSchema for location ${warning.locationId} \n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteWarningDataToSumexParams', 'info', NAME );
                err = Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
                throw err;
            }

            let scheinNotes = invoice.scheinNotes || '';

            const lRequestReminderTimestamp = Math.floor(new Date(warning.timestamp).getTime()/1000),
                invoiceNo = invoice.invoiceNo.replace(/[^0-9]/g, '');
            let chargeAmount = 0;

            switch( warning.actType ) {
                case 'REMINDER':
                    lReminderLevel = 1;
                    reminderText = scheinNotes || dunningSchema.reminderText;
                    paymentPeriod = dunningSchema.reminderDays || 0;
                    break;
                case 'WARNING1':
                    lReminderLevel = 2;
                    reminderText = scheinNotes || dunningSchema.warning1Text;
                    paymentPeriod = dunningSchema.warning1Days || 0;
                    chargeAmount = dunningSchema.warning1Value || 0;
                    break;
                case 'WARNING2':
                    lReminderLevel = 3;
                    reminderText = scheinNotes || dunningSchema.warning2Text;
                    paymentPeriod = dunningSchema.warning2Days || 0;
                    chargeAmount = dunningSchema.warning2Value || 0;
                    break;
            }

            const requestParams = {
                eRoleType: 1,       // Hard coded intentionally: 1 - The main provider is a physician
                ePlaceType: 1,      // Hard coded intentionally: 1 - The service location is a practice
                eIsStorno: 0,
                eIsCopy: 0,
                bstrRemark: `${reminderText}; ${warning.invoiceText}`
            }, reminderParams = {
                bstrRequestReminderID: invoiceNo,
                dRequestReminderDate: warning.timestamp,
                lRequestReminderTimestamp,
                lReminderLevel,
                bstrReminderText: `${reminderText}; ${warning.invoiceText}`,
                dAmountReminder: chargeAmount || 0
            }, warningBankParams = { lPaymentPeriod: paymentPeriod || 0 };
            Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteWarningDataToSumexParams', 'info', NAME );
            return {
                errors,
                params: {
                    requestParams,
                    reminderParams,
                    warningBankParams
                }
            };
        }

        /**
         * Helper function to sort the days treatments
         * @param {Array}           treatmentPartition
         * @returns {*}
         */
        function semanticallySortedTreatments( treatmentPartition ) {
            // TODO: add distinct calculation here
            const treatmentsWithActivities = treatmentPartition.filter( treatment => Boolean( treatment.activities && treatment.activities.length ) ).sort(
                (a, b) => a.code < b.code ? -1 : 1  // here we stringy compare the TARMED codes.  so 00.0020 < 00.0030, which is what we want.
            );
            const treatmentsWithoutActivities = treatmentPartition.filter( treatment => Boolean( !treatment.activities || !treatment.activities.length ) );

            const result =  treatmentsWithoutActivities.concat( treatmentsWithActivities );
            // mutate the contents  ->  daySeparation
            /*result.forEach( t => { t.session = index + 1; } );*/
            return result;
        }

        /**
         * This method maps the inSuite schein fields to Sumex params as required by the Sumex API:
         * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/index.html#importantDocs
         *
         * 1) Map Patient Fields
         * 2) Map Treatment Fields
         * 3) Return Sumex Params
         *
         * @method mapInSuiteScheinToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.patientId :REQUIRED: Used for logging.
         * @param {String} args.tarmedlogId :REQUIRED: Used for logging.
         * @param {Object} args.user :REQUIRED: Ussed for the DB calls.
         * @param {Object} args.location :REQUIRED:
         * @param {Object} args.schein :REQUIRED:
         * @param {String} type :OPTIONAL: may be 'invoice'
         *
         * @returns {Promise} resolving to {patient, service}.
         */
        async function mapInSuiteScheinToSumexParams( {tarmedlogId, patientId, user, location, schein}, type ) {
            let err, result, sumexTreatments, sumexMedications, diagnoses = [], reasonType, errors = [];
            Y.log( 'Entering Y.doccirrus.sumexMappers.mapInSuiteScheinToSumexParams', 'info', NAME );

        // 1) Check Data -----------------------------------------------------------------------------------------------
            if( !schein ) {
                Y.log( `SUMEX: mapInSuiteScheinToSumexParams(): no schein entries found for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'warn', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteScheinToSumexParams', 'info', NAME );
                return {patient: null, services: []};
            }

            const patient = schein.data && schein.data.patient,
                cantonCode = location.cantonCode;

            if( !patient ) {
                const message = `no patient found on first schein entry`;
                Y.log( `SUMEX: sendInvoiceToSumex(): ${message} for patient ${patientId} and tarmedlog ${tarmedlogId}`, 'error', NAME );
                errors.push(Y.doccirrus.tarmedUtils.generateSumexError({text: message, schein}));
            }

            Y.log( 'mapInSuiteScheinToSumexParams: checked data ok', 'info', NAME );

            // 3) Map Treatment Fields -------------------------------------------------------------------------------------

            const {treatmentsBulks, medicationsBulks} = Y.doccirrus.sumexutils.mapActivitiesIntoBulks( {
                treatments: schein.data.treatments,
                medications: schein.data.medications
            } );

            const medicationsFromSchein = medicationsBulks.reduce( ( result, array ) => result.concat( array ), [] );

            // MOJ-13833 if medications are divisible, display amount and price based on full package
            medicationsFromSchein.forEach( medication => {
                if( medication.isDivisible && medication.phPackSize ) {
                    medication.dQuantity = medication.dQuantity / medication.phPackSize;
                    medication.phPriceSale = medication.phPriceSale * medication.phPackSize;
                }
            } );

            // semantically map & reduce
            const sortedTreatments = treatmentsBulks
                .map( semanticallySortedTreatments )
                .reduce( ( result, array ) => result.concat( array ), [] );

            // filter unique physicians from activities
            [err, result] = await formatPromiseResult( getAllPhysiciansFromSchein( {
                user,
                medications: medicationsFromSchein,
                treatments: sortedTreatments,
                schein,
                tarmedlogId
            }));

            if( err || !result ) {
                Y.log( `SUMEX: getAllPhysiciansFromSchein(): error in getting employees for schein ${schein._id} and tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                throw Y.doccirrus.errors.rest( 'sumex_19', null, true);
            }
            errors = errors.concat(result.errors);
            const physiciansParams = result.physiciansParams;
            let tarmedScalingFactors;

            [err, tarmedScalingFactors] = await formatPromiseResult(
                Y.doccirrus.api.invoiceconfiguration.getScalingFactorsForTarmedPrices( user )
            );
            if( err ) {
                Y.log( `SUMEX: mapInSuiteScheinToSumexParams(): error in getting tarmedScalingFactors for schein ${schein._id} and tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                throw err;
            }
            const tarmedTaxPointValues = tarmedScalingFactors.taxPointValues;
            // map to sumex
            [err, sumexTreatments = []] = await formatPromiseResult( Promise.all( sortedTreatments.map( treatment => {
                const physician = physiciansParams.find(p => p._id === treatment.employeeId);
                return mapInSuiteTreatmentToSumexParams( {
                    tarmedlogId,
                    schein,
                    treatment,
                    physician,
                    cantonCode,
                    user,
                    tarmedTaxPointValues
                }, type );
            }) ) );

            if( err ) {
                Y.log( `SUMEX: mapInSuiteScheinToSumexParams(): error in mapping inSuite treatment fields to Sumex params for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteScheinToSumexParams', 'info', NAME );
                throw err;
            }
            const treatments = sumexTreatments.map(sumexTreatment => {
                errors = errors.concat(sumexTreatment.errors);
                return sumexTreatment.params;
            });
            Y.log( `mapInSuiteScheinToSumexParams: mapped treatments  (${sumexTreatments&&sumexTreatments.length}) (errors ${errors.length})`, 'info', NAME );

        // 4) Map Medication Fields ------------------------------------------------------------------------------------
            // Collecting medications from schein:

            sumexMedications = medicationsFromSchein.map( medication => {
                const physician = physiciansParams.find(p => p._id === medication.employeeId);
                return mapInSuiteMedicationToSumexParams( {
                    tarmedlogId,
                    medication,
                    schein,
                    physician
                }, type );
            } );

            const medications = sumexMedications.map(sumexMedication => {
                errors = errors.concat(sumexMedication.errors);
                return sumexMedication.params;
            });
            Y.log( `mapInSuiteScheinToSumexParams: mapped medications  (${sumexMedications&&sumexMedications.length}) (errors ${errors.length})`, 'info', NAME );

            // 5) Map Diagnosis Fields -------------------------------------------------------------------------------------

            let diagnosesFromSchein = schein.data.diagnoses || [];
            let dauernDiagnosesFromSchein = schein.data.continuousDiagnoses || [];
            diagnosesFromSchein = diagnosesFromSchein.concat(dauernDiagnosesFromSchein);

            if ( diagnosesFromSchein && diagnosesFromSchein.length ) {
                diagnoses = diagnosesFromSchein.map( diagnosis => diagnosisToSumexParams(diagnosis) );
            }

            if( err ) {
                Y.log( `SUMEX: mapInSuiteScheinToSumexParams(): error in mapping inSuite diagnosis fields to Sumex params for patient ${patientId} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteScheinToSumexParams', 'info', NAME );
                throw err;
            }
            Y.log( `mapInSuiteScheinToSumexParams: mapped diagnoses (${diagnoses&&diagnoses.length})`, 'info', NAME );

        // 6) Map Schein types -----------------------------------------------------------------------------------------
            const REASON_TYPE_MAP = new Map([
                ['DISEASE', 0],
                ['ACCIDENT', 1],
                ['MATERNITY', 2],
                ['PREVENTION', 3],
                ['BIRTH DEFECT', 4]
            ]);

            reasonType = REASON_TYPE_MAP.get(schein.data.reasonType);
            if(!Number.isInteger(reasonType)) {
                reasonType = 5;
            }
            const treatmentType = schein.data.treatmentType === 'STATIONARY' ? 1 : 0;

            const params = {
                treatments,
                medications,
                diagnoses,
                reasonType,
                treatmentType,
                caseFolderId: schein.data.caseFolderId,
                scheinId: schein._id,
                treatmentsFromSchein: sortedTreatments,
                medicationsFromSchein,
                physiciansParams,
                cantonCode
            };
            Y.log( `mapInSuiteScheinToSumexParams: completed mapping schein`, 'info', NAME );
            Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuiteScheinToSumexParams', 'info', NAME );
            // 7) Return Sumex Params --------------------------------------------------------------------------------------
            return { errors, params };
        }

        /**
         * This method maps the inSuite patient fields to the Sumex patient params:
         *      - dBirthdate:   Date of birth   | Date
         *      - eSex:         Gender          | 0 (MALE) or 1 (FEMALE)
         *
         * @method mapInSuitePatientToSumexParams
         *
         * @param {String} tarmedlogId :OPTIONAL: Used for logging.
         * @param {Object} schein :OPTIONAL: Used for logging.
         * @param {Object} patient :OPTIONAL: Used for logging.
         * @param {String} type :OPTIONAL: may be 'invoice'.
         *
         *  @returns {Object} {dBrithDate: {Date}, eSex: {Number}}
         */
        function mapInSuitePatientToSumexParams( tarmedlogId, schein, patient, type ) {
            let errors = [], missingFields = [];
            const {_id, dob, gender, socialSecurityNo, insuranceStatus} = patient;
            const IN_SUITE_TO_TARMED_GENDER_MAP = new Map( [
                ['MALE', 0],
                ['FEMALE', 1]
            ] );
            let ssnNumber, addressSumex, addressParams;

            if( !insuranceStatus || !insuranceStatus.length ) {
                missingFields.push( 'insuranceStatus' );
            }
            if( !dob ) {
                missingFields.push( 'dob' );
            }
            if( !gender || !['MALE', 'FEMALE'].includes( gender ) ) {
                missingFields.push( 'gender' );
            }
            if( !socialSecurityNo ) {
                missingFields.push( 'socialSecurityNo' );
            }

            let tarmedGender = IN_SUITE_TO_TARMED_GENDER_MAP.get( gender );

            if( !Number.isFinite( tarmedGender ) ) {
                // If gender is neither male nor female - set to "not defined"
                tarmedGender = 3;
            }

            const {lastname, firstname, talk, title, addresses} = patient;
            const address = {};
            ssnNumber = patient.socialSecurityNo;

            if( Array.isArray( addresses ) && addresses.length ) {
                Object.assign( address, addresses[0] ); // TODO: check if need to select specific address here
            } else {
                Y.log( `SUMEX: mapInSuitePatientToSumexParams(): no address available for patient ${_id} from tarmedlog ${tarmedlogId}.`, 'warn', NAME );
            }

            Object.assign( address, {lastname, firstname, talk, title} );

            addressSumex = mapInSuiteAddressToSumexParams( {address, type: BASECONTACT} ); //TODO: better handling of id, make separate param
            addressParams = addressSumex.params;
            missingFields = missingFields.concat( addressSumex.missingFields );

            const IAddress = constructIAddressFromSumexAddressParams( {
                id: patient._id,
                params: addressParams,
                type: PERSON
            } );

            const params = {
                dBirthdate: dob,
                ...((type === INVOICE) ? {eSexType: tarmedGender} : {eSex: tarmedGender}),
                bstrSSN: ssnNumber,
                IAddress
            };

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: PATIENT
                } ) );
            }

            return {params, errors};
        }

        /**
         * This method maps the inSuite activity fields to Sumex service params:
         *      - physician:        Physician params        | see mapInSuitePhysicianFieldsToSumexParams()
         *      - bstrCode:         TARMED code             | String
         *      - dQuantity:        Number of Treatments    | Number (hard coded to 1)
         *      - dDate:            Date of the service     | Date
         *      - lSessionNumber:   Session  number         | Number,
         *      - enSide:           Side                    | Number: 0 (none), 1 (left) or 2 (right)
         *      - eCanton:          Canton                  | Number: 0 -30,
         *      - eLaw:             Law                     | Number: 0 (KVG), 1 (UVG), 2 (MVG), 3 (IVG), or 4 (VVG)
         *      - eType:            Treatment type          | Number: 0 (Ambulatory), 1 (Stationary) or 2 (Semi-Stationary)
         *      - eSettlement:      Settlement type         | Number: 0 (Electronic) or 1 (Print)
         *
         * a) Map Physician Fields
         * b) Map Location Fields
         * c) Return Sumex Params
         *
         * @method mapInSuiteActivityToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :OPTIONAL: Used for logging.
         * @param {Object} args.activity :REQUIRED: contains inSuite activity fields.
         *
         * @returns {Object} resolving to { bstrTariffType, bstrCode, dQuantity, lSessionNumber, eCanton, eLaw, eType, eSettlement, ... }
         */

        function mapInSuiteActivityToSumexParams( {activity} ) {
            const mappedSumexParams = {
                ...(activity.content ? { bstrText: activity.content.replace( /'/gi, '' ).replace( /"/gi, '' ) } : {})
            };
            let missingFields = [];

            const {code, timestamp, vat} = activity;     //session also is taken from activity

            if( !code ) {
                missingFields.push( 'code' );
            }
            if( !timestamp ) {
                missingFields.push( 'timestamp' );
            }

            var dVatRate = getPercentageVat( vat );

        // c) Return Sumex Params --------------------------------------------------------------------------------------
            Object.assign( mappedSumexParams, {
                bstrCode: code,
                dQuantity: activity.dQuantity || 1,
                eSettlement: 1,         // Intentionally hard coded to print (we want to have the option)
                lSessionNumber: activity.lSessionNumber || 1,
                dVatRate: dVatRate
            });

            return {
                missingFields,
                params: mappedSumexParams
            };
        }

        /**
         * This method maps the inSuite treatment fields to Sumex serviceEx params:
         *      - eTreatmentType / eType
         *      - e/enSide
         *      - e/enIgnoreValidate
         *      - dDateBegin / dDate
         *
         * a) Get Activity Params
         * b) Map Treatment Fields
         * c) Return Sumex Params
         *
         * @method mapInSuiteTreatmentToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :OPTIONAL: Used for logging.
         * @param {Object} args.treatment :REQUIRED: contains inSuite treatment fields.
         * @param {Object} args.physician :REQUIRED:
         * @param {Object} args.user :REQUIRED: User making the validation request. The user object is used for the DB calls.
         * @param {String} type :OPTIONAL: May be 'invoice_treatment'
         *
         * @returns {Promise} resolving to { physician, bstrCode, dQuantity, dDate, lSessionNumber, enSide, eCanton, eLaw, eType, eSettlement }
         */
        async function mapInSuiteTreatmentToSumexParams( {tarmedlogId, schein, treatment, physician, user, cantonCode, tarmedTaxPointValues}, type ) {
        // a) Get Activity Params
            let err, activitySumex, bstrReferenceCode, sumexServiceParams, sumexService, errors = [], missingFields = [];
            activitySumex = mapInSuiteActivityToSumexParams( {activity: treatment} );
            missingFields = missingFields.concat( activitySumex.missingFields );
            const activitySumexParams = activitySumex.params;

        // b) Map Treatment Fields -------------------------------------------------------------------------------------
            const {timestamp, side, sideMandatory} = treatment;

            if( sideMandatory && ( side === undefined || side === null ) ) {
                missingFields.push( 'side' );
            }
        // b) Map Tariff code -------------------------------------------------------------------------------------
            const TARIFF_BY_CATALOG = new Map( [
                ['TARMED', '001'],
                ['TARMED_UVG_IVG_MVG', '001'],
                ['EAL', '317'],
                ['MIGEL', '402'],
                ['ARZT_KVG_VVG', '406'],
                ['Pandemieleistungen', '351'],
                ['AMV', '050']
            ] );

            let bstrTariffType = TARIFF_BY_CATALOG.get(treatment.catalogShort);

            if( bstrTariffType === '001' && !treatment.catalog ) {
                // search for this treatment in catalog
                const getTreatmentCatalogEntryP = promisifyArgsCallback( Y.doccirrus.api.catalog.getTreatmentCatalogEntry );
                let catalogEntry;
                [err, catalogEntry] = await formatPromiseResult(getTreatmentCatalogEntryP({
                    user,
                    originalParams: {
                        code: treatment.code,
                        catalogShort: treatment.catalogShort,
                        locationId: treatment.locationId
                    },
                    options: {
                        ignoreHouseCatalog: true
                    }
                } ) );

                if ( !catalogEntry ) {
                    bstrTariffType = '999';
                }
            }

        // c) Get referanced Treatment ---------------------------------------------------------------------------------

            if( treatment.activities && treatment.activities.length ) {
                let linkedTreatment, result;
                linkedTreatment = schein.data.treatments.find( t => treatment.activities.includes(t._id) );

                if( !linkedTreatment ) {
                    //todo: instead of taking from db - get from schein
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        method: 'get',
                        query: {
                            _id: {
                                $in: treatment.activities
                            },
                            actType: 'TREATMENT'
                        }
                    } ) );

                    if( err ) {
                        throw err;
                    }
                    //todo if there are more then one ??
                    linkedTreatment = result[0];
                }
                bstrReferenceCode = linkedTreatment && linkedTreatment.code;
            }
            const eLaw = getSumexLawCode(tarmedlogId, schein);

            if( bstrTariffType === '001' ) {
                sumexService = _mapTarmedPricesToSumexParams() || {};
                missingFields = missingFields.concat( sumexService.missingFields );
                sumexServiceParams = sumexService.params;
            } else {
                const {dVatRate} = activitySumexParams;
                sumexServiceParams = _mapNonTarmedPricesToSumexParams(dVatRate, bstrTariffType);
            }

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: ACTIVITY,
                    entry: treatment
                } ) );
            }

            return {
                params: {
                    physician,
                    eLaw,
                    ...activitySumexParams,
                    ...(sumexServiceParams || {}),
                    ...(type === INVOICE ? {dDateBegin: timestamp} : {dDate: timestamp}),
                    bstrTariffType,
                    bstrReferenceCode
                },
                errors
            };

            function _mapTarmedPricesToSumexParams() {
                const {treatmentType, side, medicalScalingFactor, technicalScalingFactor, medicalTaxPoints, technicalTaxPoints, timestamp} = treatment,
                    caseFolderType = schein.data.caseFolderTypeSingle,
                    missingFields = [];

                const relevantTaxPointEntry = Y.doccirrus.commonutilsCh.getRelevantTarmedTaxPointEntry( {
                    cantonCode, caseFolderType, tarmedTaxPointValues, date: timestamp
                } );

                if( !relevantTaxPointEntry || !relevantTaxPointEntry.value ) {
                    let err = new Error( 'No relevant TARMED tax point entry found' );
                    Y.log( `mapTarmedPricesToSumexParams(): no relevant TARMED tax point entry was found for the parameters ${{law: eLaw, cantonCode}}:\n${err.stack}`, 'error', NAME );
                    throw err;
                }

                const unitFactor = relevantTaxPointEntry.value * 0.01;

                if( treatmentType === undefined || treatmentType === null ) {
                    missingFields.push( 'treatmentType' );
                }

                const IN_SUITE_TO_TARMED_TREATMENT_TYPE_MAP = new Map( [
                    ['AMBULANT', 0],
                    ['STATIONARY', 1],
                    ['SEMI-STATIONARY', 2]
                ] );

                let sideParam;

                switch( side ) {
                    case 'LEFT':
                        sideParam = 1;
                        break;
                    case 'RIGHT':
                        sideParam = 2;
                        break;
                    default:
                        sideParam = 0;
                        break;
                }

                const params = {
                    ...(type === INVOICE ? {eTreatmentType: IN_SUITE_TO_TARMED_TREATMENT_TYPE_MAP.get( treatmentType )} : {eType: IN_SUITE_TO_TARMED_TREATMENT_TYPE_MAP.get( treatmentType )}),
                    ...(type === INVOICE ? {eSide: sideParam || 0} : {enSide: sideParam || 0}), // Only required for some treatments
                    ...(type === INVOICE ? {eIgnoreValidate: 0} : {enIgnoreValidate: 0}),
                    dUnitInternalScalingFactorMT: medicalScalingFactor,
                    dUnitInternalScalingFactorTT: technicalScalingFactor,
                    dUnitFactorMT: unitFactor || 1,
                    dUnitFactorTT: unitFactor || 1,
                    dUnitTT: technicalTaxPoints || 0,
                    dUnitMT: medicalTaxPoints || 0
                };
                return {params, missingFields};
            }

            function _mapNonTarmedPricesToSumexParams( dVatRate, bstrTariffType ) {
                const {taxPoints, price} = treatment;
                // if price exists and treatment is not EAL - take price, otherwise - take taxpoints
                let dUnit = Number.isFinite( parseFloat( price ) ) && bstrTariffType !== '317' ? price : taxPoints;
                if( bstrTariffType !== '317' ) {
                    dUnit = calculatePriceWithVat( dUnit, dVatRate );
                }
                return {
                    dUnit: dUnit,
                    dExternalFactor: 1,
                    ...(type === INVOICE ? {eIgnoreValidate: 0} : {enIgnoreValidate: 0}),
                    dUnitFactor: 1
                };
            }
        }

        /**
         * This method maps the inSuite medication fields to Sumex AddService params:
         *      - dExternalFactor
         *      - dDateBegin
         *      - eIgnoreValidate
         *      - dUnitFactor
         *
         * @method mapInSuiteTreatmentToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :OPTIONAL: Used for logging.
         * @param {Object} args.medication :REQUIRED: contains inSuite treatment fields.
         * @param {Object} args.physician :REQUIRED:
         *
         * @returns {Object}
         */

        function mapInSuiteMedicationToSumexParams({tarmedlogId, medication, schein, physician}, type) {

            function defineReferenceCode(bstrTariffType, phGTIN, phPZN) {
                const TARIF_TYPE_FOR_GTIN = ['402'];
                const TARIF_TYPE_FOR_PZN_OR_GTIN = ['400', '401', '452'];
                if (TARIF_TYPE_FOR_GTIN.includes(bstrTariffType)) {
                    return phGTIN;
                }
                if (TARIF_TYPE_FOR_PZN_OR_GTIN.includes(bstrTariffType)) {
                    return phPZN || phGTIN;
                }
                return  phPZN;
            }

            let mappedSumexParams, sumexActivities, errors = [], missingFields = [];
            sumexActivities = mapInSuiteActivityToSumexParams( {activity: medication} );

            missingFields = missingFields.concat( sumexActivities.missingFields );
            mappedSumexParams = sumexActivities.params;

            const IN_SUITE_TO_TARMED_TARIFF_TYPE_MAP = new Map( [
                ['10', '400'],
                ['11', '402'],
                ['12', '401'],
                ['13', '452'],
                ['20', '402'],
                ['30', '402'],
                ['31', '402'],
                ['33', '452'],
                ['30', '402'],
                ['32', '402'],
                ['90', '402'],
                ['99','402']
            ] );

            const {insuranceCode, phGTIN, phPZN, phPriceSale} = medication;
            const bstrTariffType = IN_SUITE_TO_TARMED_TARIFF_TYPE_MAP.get(insuranceCode) || '402';
            const bstrReferenceCode = defineReferenceCode(bstrTariffType, phGTIN, phPZN);
            if( bstrTariffType === '402' ) {
                if( !medication.phGTIN ) {
                    missingFields.push( 'phGTIN' );
                }
                mappedSumexParams.bstrCode = medication.phGTIN;
            }

            Object.assign( mappedSumexParams, {
                bstrTariffType,
                physician,
                bstrReferenceCode,
                dUnit: phPriceSale || 0,    //phPriceSale inside the medications is already with vat
                dExternalFactor: 1,
                ...(type === INVOICE ? {dDateBegin: medication.timestamp} : {dDate: medication.timestamp}),
                ...(type === INVOICE ? {eIgnoreValidate: 0} : {enIgnoreValidate: 0}),
                dUnitFactor: 1,     // TODO: where to get this from?
                insuranceCode
            });

            if( bstrTariffType === '402' ) {
                delete mappedSumexParams.bstrReferenceCode;
            }

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: ACTIVITY,
                    entry: medication
                } ) );
            }

            return {
                params: mappedSumexParams,
                errors
            };
        }

        /**
         * This method maps the inSuite physician fields to the Sumex physician params:
         *       - eMedicalRole:                Medical role type                           | Number: 0 (Medical Practice) or 1 (Hospital or Institute)
         *       - eBillingRole:                Billing role type                           | Number: 0 (medical and technical), 1 (medical), 2 (technical) or 3 (none)
         *       - bstrEanNumberProvider:       EAN number of the provider                  | String: 13 digits
         *       - bstrEanNumberResponsible:    EAN number of the responsible physician     | String: 13 digits
         *       - bstrQLCodes:                 Qualitative dignity codes                   | Array of qualitative dignity codes (String of 4 characters)
         *
         * @method mapInSuitePhysicianFieldsToSumexParams
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :OPTIONAL: Used for logging.
         * @param {Object} args.physician :REQUIRED: inSuite physician
         * @param {Object} args.user :REQUIRED: used for DB operations
         *
         * @returns {Object} {eMediaclRole: {Number}, eBillingRole: {Number}, bstrEanNumberProvider: {String}, bstrEanNumberResponsible: {String}, bstrQLCodes: {Array}}
         */
        async function mapInSuitePhysicianFieldsToSumexParams( {tarmedlogId, physician, user, schein} ) {
            Y.log( 'Entering Y.doccirrus.sumexMappers.mapInSuitePhysicianFieldsToSumexParams', 'debug', NAME );
            let err, tarmedDignities, errors = [], missingFields = [];
            const {_id, glnNumber, qualiDignities, zsrNumber, firstname, lastname, title, talk} = physician;

            if( glnNumber === undefined || glnNumber === null ) {
                missingFields.push( 'glnNumber' );
            }

            // Checking and filtering qualitative dignities ------------------------------------------------------------
            if( !qualiDignities || !qualiDignities.length ) {
                missingFields.push( 'qualiDignities' );
            }

            if( qualiDignities.length === 1 && qualiDignities[0] === '0000' ) {
                const message = Y.doccirrus.errorTable.getMessage( {code: 'dignity_02_quali'} );
                errors.push( Y.doccirrus.tarmedUtils.generateSumexError( {
                    text: message,
                    schein,
                    link: getEmployeeDetailLink( physician._id )
                } ) );
            }

            [err, tarmedDignities = []] = await formatPromiseResult( Y.doccirrus.api.catalog.getTarmedDignities( {
                user,
                type: 'quali',
                query: {
                    code: {$in: qualiDignities},
                    catalogExtension: {$ne: true}
                },
                options: {select: {code: 1}}
            } ) );

            if( err ) {
                Y.log( `SUMEX: mapInSuitePatientToSumexParams(): impossible to check qualiDignities for physician ${_id} and tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuitePhysicianFieldsToSumexParams', 'debug', NAME );
                throw err;
            }

            const params = {
                _id: _id.toString(),
                eMedicalRole: 0,    // 'Employee (Medical Practice)'. Hard coded on purpose! (We are only dealing with practices not hospitals)
                eBillingRole: 0,                            // TODO: From Settings
                bstrEanNumberProvider: glnNumber,     // TODO: From Settings
                bstrEanNumberResponsible: glnNumber,
                bstrZSR: zsrNumber,
                bstrQLCodes: tarmedDignities.map( dignity => dignity.code ),
                firstname,
                lastname,
                title,
                talk
            };

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: EMPLOYEE,
                    entry: physician
                } ) );
            }

            Y.log( 'Exiting Y.doccirrus.sumexMappers.mapInSuitePhysicianFieldsToSumexParams', 'debug', NAME );
            return { params, errors };
        }

        async function mapInsuiteGuarantorToSumexParams( {tarmedlogId, schein, user} ) {
            let err, result, missingFields = [], errors = [], billingAddress, patient;

            patient = schein.data.patient || {};
            const patientId = patient._id,
                isTiersGarant = schein.data.isTiersGarant;
            billingAddress = (patient.addresses || []).find( a => a.kind === 'BILLING' );

            if( !billingAddress ) {
                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.patient.get( {
                        user,
                        query: {_id: patientId},
                        options: {
                            fields: {
                                addresses: 1,
                                firstname: 1,
                                lastname: 1,
                                talk: 1,
                                title: 1
                            }
                        },
                        callback: ( err, result ) => err ? reject( err ) : resolve( result )
                    } );
                } ) );

                if( err || !Array.isArray( result ) || !result.length ) {
                    Y.log( `SUMEX: mapInsuiteGuarantorToSumexParams(): error in getting patient ${patientId} from tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                    errors.push( errorFieldMissingFactory( {
                        schein,
                        tarmedlogId,
                        fields: ['billingAddress'],
                        type: PATIENT
                    } ) );

                    return {errors};
                }
                patient = result[0] || {};
                billingAddress = (patient.addresses || []).find( a => a.kind === 'BILLING' );

                if( !billingAddress && patient && isTiersGarant ) {
                    // if no billing take official
                    billingAddress = (patient.addresses || []).find( a => a.kind === 'OFFICIAL' );
                    if( billingAddress ) {
                        // set additional data
                        billingAddress.firstname = patient.firstname;
                        billingAddress.lastname = patient.lastname;
                        billingAddress.talk = patient.talk;
                        billingAddress.title = patient.title;
                        billingAddress.payerType = PERSON;
                    }
                }

                if( !billingAddress ) {
                    errors.push( errorFieldMissingFactory( {
                        schein,
                        tarmedlogId,
                        fields: ['billingAddress'],
                        type: PATIENT
                    } ) );

                    return {
                        errors
                    };
                }
            }

            const sumexGuarantorAddress = mapInSuiteAddressToSumexParams( {
                    address: billingAddress,
                    type: billingAddress.payerType
                } ),
                IAddress = constructIAddressFromSumexAddressParams( {
                    id: patientId,
                    params: sumexGuarantorAddress.params,
                    type: billingAddress.payerType
                } );
            missingFields = missingFields.concat( sumexGuarantorAddress.missingFields );

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: BASECONTACT
                } ) );
            }

            return {
                errors,
                params: {
                    guarantorId: billingAddress._id,
                    type: billingAddress.payerType,
                    IAddress: IAddress
                }
            };
        }

        async function mapInsuiteReferrerToSumexParams({tarmedlogId, patientId, schein, user}) {
            let err, result, errors = [];
            //todo remove async/await in sumex mappers: replace db call with invoiceentry type='patient'
            [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patient.get( {
                    user,
                    query: {_id: patientId},
                    options: {
                        fields: {
                            physicians: 1
                        }
                    },
                    callback: ( err, result ) => err ? reject( err ) : resolve( result )
                } );
            } ) );

            if( err ) {
                Y.log( `SUMEX: mapInsuiteReferrerToSumexParams(): error in getting patient ${patientId} from tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            const basecontactId = result && result[0] && result[0].physicians && result[0].physicians[0];

            if(!basecontactId) {
                return {
                    errors,
                    params: {}
                };
            }

            [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.basecontact.get( {
                    user,
                    query: {_id: basecontactId},
                    callback: ( err, result ) => err ? reject( err ) : resolve( result )
                } );
            } ) );

            if( err || !Array.isArray( result ) || !result.length) {
                Y.log( `SUMEX: getReferrerSumexParams(): error in getting basecontact ${basecontactId} for patient ${patientId} from tarmedlog ${tarmedlogId}.\n${err && err.stack || err}`, 'error', NAME );
                throw Y.doccirrus.errors.rest( 'sumex_09', null, true );
            }

            const {expertise, glnNumber, zsrNumber, addresses, lastname, firstname} = result[0];

            if( !Array.isArray( addresses ) || !addresses.length ) {
                err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
                Y.log( `SUMEX: getReferrerSumexParams(): no addresses for basecontact ${basecontactId} for tarmedlog ${tarmedlogId}.\n${err && err.stack || err} in Data Base`, 'error', NAME );
                throw err;
            }
            const sumexReferrerAddress = mapInSuiteAddressToSumexParams( {
                address: {
                    ...(addresses[0] || {}),
                    lastname,
                    firstname
                },
                type: BASECONTACT
            } );
            const missingFields = sumexReferrerAddress.missingFields;

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: BASECONTACT
                } ) );
            }

            const IAddress = constructIAddressFromSumexAddressParams( {
                id: result[0]._id,
                params: sumexReferrerAddress.params,
                type: PERSON
            } );

            const params = {
                bstrEAN: glnNumber,
                bstrZSR: zsrNumber,
                bstrSpecialty: expertise.join( ', ' ),
                referrerId: basecontactId,
                IAddress: IAddress
            };

            return {errors, params};
        }

        /**
         * This method maps an inSuite address to Sumex address params
         *
         * @method mapInSuiteAddressToSumexParams
         *
         * @param {String} tarmedlogId :REQUIRED:
         * @param {Object} schein :REQUIRED:
         * @param {Object} address :REQUIRED:
         * @param {String} type :REQUIRED:
         *
         * @returns {Object}
         */
        function mapInSuiteAddressToSumexParams( {address, type} ) {
            let companyName, finalCountryCode;
            const {locname, street, zip, city, cantonCode, countryCode, phone, fax, email, website, houseno} = address,
                personParams = {},
                missingFields = [],
                streetLine = houseno ? `${street} ${houseno}` : street;

            finalCountryCode = countryCode || 'CH';

            switch (type) {
                case BASECONTACT:
                case PATIENT:
                case PERSON: {
                    const {lastname, firstname, talk, title} = address;

                    if( !lastname ) {
                        missingFields.push( 'lastname' );
                    }
                    if( !firstname ) {
                        missingFields.push( 'firstname' );
                    }
                    const talkList = Y.doccirrus.schemas.patient.types.Talk_E.list,
                        translatedTalk = talk && talkList.find(t => talk === t.val) ? Y.doccirrus.i18n(`patient-schema.Talk_E.${talk}`) : '';

                    Object.assign( personParams, {
                        bstrFamilyname: lastname,
                        bstrGivenname: firstname,
                        bstrSalutation: translatedTalk,
                        bstrTitle: title
                        // bstrSubaddressing    // Left out intentionally - does not have an inSuite equivalent at the moment
                    } );
                    break;
                }
                case ORGANIZATION:
                    companyName = address.receiver;
                    if( !companyName ) {
                        missingFields.push( 'receiver' );
                    }
                    break;
                default:
                    if( !locname ) {
                        missingFields.push( type === INSURANCE ? 'insuranceName' : 'locname' );
                    }
            }

            if( !streetLine ) {
                missingFields.push( 'street' );
            }
            if( !zip ) {
                missingFields.push( 'zip' );
            }
            if( !city ) {
                missingFields.push( 'city' );
            }
            if( !finalCountryCode ) {
                missingFields.push( 'countryCode' );
            }

            const params = {
            // Person fields •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                ...(personParams || {}),
            // Company fields ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                bstrCompanyName: companyName || locname,
                // bstrDepartment: '',          // Left out intentionally - does not have an inSuite equivalent at the moment
                // bstrSubaddressing: '',       // Left out intentionally - does not have an inSuite equivalent at the moment
            // Postal ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                bstrStreet: streetLine,
                // bstrPoBox: '',                     // Left out intentionally - does not have an inSuite equivalent at the moment
                bstrZip: zip,
                bstrCity: city,
                bstrStateCode: cantonCode,
                bstrCountryCode: finalCountryCode,
            // Phone •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                bstrNumber_phone: phone,
                // bstrLocalCode_phone: '',           // Left out intentionally - does not have an inSuite equivalent at the moment
                // bstrInternationalCode_phone: '',   // Left out intentionally - does not have an inSuite equivalent at the moment
                // bstrExt_phone: '',                 // Does not have an inSuite equivalent at the moment
            // Fax •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                bstrNumber_fax: fax,
                // bstrLocalCode_fax: '',           // Left out intentionally - does not have an inSuite equivalent at the moment
                // bstrInternationalCode_fax: '',   // Left out intentionally - does not have an inSuite equivalent at the moment
                // bstrExt_fax: '',                 // Left out intentionally - does not have an inSuite equivalent at the moment
            // Online ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                bstrEMail: email,
                bstrUrl: website
            };
            return { params, missingFields };
        }

    //••••••••••••••••••••••••••••••••••••••••••••• CONVERTING FUNCTIONS •••••••••••••••••••••••••••••••••••••••••••••••

        /**
         * This method maps an inSuite location to Sumex params
         *
         * @method mapInSuiteLocationToSumexParams
         *
         * @param {String} tarmedlogId :REQUIRED:
         * @param {Object} data :REQUIRED:
         *
         * @returns {Object}
         */
        function mapInSuiteBillerOrProviderToSumexParams( {tarmedlogId, schein, location = {}, physician = {}, type} ) {
            // quantiDignities are only relevant for physicians (not for locations)
            let missingFields = [], errors = [], quantiDignity;

            const sumexAddress = mapInSuiteAddressToSumexParams( {
                    address: {
                        id: type === PROVIDER ? physician._id : location._id,
                        ...(type === PROVIDER ? {
                            lastname: physician.lastname || '',
                            firstname: physician.firstname || '',
                            talk: physician.talk || '',
                            title: physician.title || ''
                        } : {}),
                        street: location.street,
                        houseno: location.houseno,
                        ...(type === BILLER ? {locname: location.locname || ''} : {}),
                        zip: location.zip,
                        city: location.city,
                        cantonCode: location.cantonCode,
                        countryCode: location.countryCode,
                        phone: location.phone,
                        fax: location.fax,
                        email: location.email,
                        website: location.website
                    },
                    type: type === PROVIDER ? PERSON : LOCATION
                } );

            missingFields = missingFields.concat( sumexAddress.missingFields );
            const IAddress = constructIAddressFromSumexAddressParams( {
                id: type === PROVIDER ? physician._id : location._id,
                params: sumexAddress.params,
                type: type === PROVIDER ? PERSON : LOCATION
            } );

            if( !location.cantonCode ) {
                missingFields.push( 'cantonCode' );
            }

            if( !location.glnNumber ) {
                missingFields.push( 'glnNumber' );
            }

            if( physician && Array.isArray( physician.quantiDignities ) && physician.quantiDignities.length ) {
                quantiDignity = physician.quantiDignities[0];
            }

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: LOCATION
                } ) );
            }

            return {
                params: {
                    bstrEAN: type === BILLER ? location.glnNumber : physician.bstrEanNumberProvider,
                    bstrZSR: type === BILLER ? location.zsrNumber : physician.bstrZSR,
                    // bstrNIF: '',     //TODO: Check if needed
                    bstrSpeciality: quantiDignity,
                    IAddress: IAddress
                },
                errors
            };
        }

        /**
         * This method maps the inSuite diagnosis fields to Sumex AddDiagnosis params:
         *      - eDiagnosisType
         *      - bstrCode
         *      - bstrText
         *
         * @method diagnosisToSumexParams
         *
         * @param {Object} diagnosis :REQUIRED: contains inSuite diagnosis fields.
         *
         * @returns {Object}
         */

        function diagnosisToSumexParams(diagnosis) {
            const DIAGNOSIS_TYPE_MAP = new Map([
                ['ICD-10', 0],
                ['TESS-KAT', 1],
                ['ICPC2', 5],
                ['DRG', 6]
            ]);

            let eDiagnosisType = DIAGNOSIS_TYPE_MAP.get(diagnosis.catalogShort);
            if(!Number.isInteger(eDiagnosisType)) {
                eDiagnosisType = 3;
            }

            return  {
                eDiagnosisType,
                bstrCode: diagnosis.code
            };
        }

        /**
         * This method maps an inSuite entity to Sumex params
         *
         * @method lawToSumexParams
         *
         * @param {String} tarmedlogId :REQUIRED:
         * @param {Object} schein :REQUIRED:
         * @param {Object} insurance :REQUIRED:
         *
         * @returns {Object}
         */
        function lawToSumexParams( tarmedlogId, schein, insurance ) {
            const tarmedLaw = getSumexLawCode(tarmedlogId, schein),
                sumexLawParams = {
                    eLawType: tarmedLaw,
                    bstrCaseID: schein.data.caseNumber,
                    ...(tarmedLaw === 1 ? {dCaseDate: schein.data.dayOfAccident} : {})
                };

            if(insurance.insuranceNo) {
                sumexLawParams.bstrInsuredID = insurance.insuranceNo;
            }

            return sumexLawParams;
        }

        /**
         * This method maps an inSuite bank data to Sumex params
         *
         * @method mapInSuiteBankToSumexParams
         *
         * @param {String} tarmedlogId :REQUIRED:
         * @param {Object} data :REQUIRED:
         * @param {String} referenceNo :OPTIONAL:
         *
         * @returns {Object}
         */
        function bankToSumexParams( tarmedlogId, {_id, esrNumber}, referenceNo ) {
            let err;
            if( !_id ) {
                err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
                Y.log( `SUMEX: bankToSumexParams(): no _id present for inSuite bank for tarmedlog ${tarmedlogId}:\n${err.stack}`, 'error', NAME );
                throw err;
            }
            let esrSecondPart = esrNumber.substr( 2, 6 ),
                secondPartArr = esrSecondPart.split( '' );

            // removing unnecessary zeros
            for( let i = 0; i < secondPartArr.length; i++ ) {
                if( secondPartArr[i] === '0' ) {
                    esrSecondPart = esrSecondPart.slice( 1 );
                } else {
                    break;
                }
            }

            const bstrBankAccount = `${esrNumber.substr(0,2)}-${esrSecondPart}-${esrNumber.substr(8,1)}`;
            return {
                eEsrType: 0,
                bstrParticipantNumber: esrNumber,
                ...(referenceNo? {bstrReferenceNumber: referenceNo}: {}),
                bstrBankAccount
            };
        }
        /**
         * This method maps and validates an inSuite insurance data to Sumex params
         *
         * @method mapInSuiteInsuranceToSumexParams
         *
         * @param {Object} args             :REQUIRED:
         * @param {Object} args.schein      :REQUIRED:
         * @param {Object} args.insurance   :REQUIRED:
         * @param {String} args.tarmedlogId :REQUIRED:
         *
         * @returns {Object}
         */
        function mapInSuiteInsuranceToSumexParams( {schein, tarmedlogId, insurance} ) {
            let errors = [], missingFields = [];

            if( !insurance.insuranceGLN ) {
                missingFields.push( 'insuranceGLN' );
            }
            if( !insurance.recipientGLN ) {
                missingFields.push( 'recipientGLN' );
            }

            const insuranceSumexAddress = mapInSuiteAddressToSumexParams( {
                address: {
                    id: insurance._id,
                    locname: insurance.insurancePrintName || insurance.insuranceName,
                    street: insurance.address1,
                    zip: insurance.zipcode,
                    city: insurance.city,
                    phone: insurance.phone,
                    email: insurance.email,
                    countryCode: 'CH'
                },
                type: INSURANCE
            } );

            missingFields = missingFields.concat( insuranceSumexAddress.missingFields );

            const IAddress = constructIAddressFromSumexAddressParams( {
                id: insurance._id,
                params: insuranceSumexAddress.params
            } );

            if( missingFields.length ) {
                errors.push( errorFieldMissingFactory( {
                    schein,
                    tarmedlogId,
                    fields: missingFields,
                    type: INSURANCE
                } ) );
            }

            return {
                params: {
                    bstrEAN: insurance.insuranceGLN,
                    IAddress
                },
                errors
            };
        }

        function transportToSumexParams( {location, insurance} ) {
            return {
                bstrFromEAN: location.glnNumber,
                bstrViaEAN: "7601001304307",
                bstrToEAN: insurance.recipientGLN
            };
        }

        //•••••••••••••••••••••••••••••••••••••••••••••••• HELPER FUNCTIONS ••••••••••••••••••••••••••••••••••••••••••••••••

        /**
         * This method gets the Sumex params for a location of physician id
         *
         * @PUBLIC
         * @method constructIAddressFromSumexAddressParams
         *
         * @param {Object} args                         :REQUIRED:
         * @param {String} args.id                      :REQUIRED:
         * @param {String} args.params                  :REQUIRED:
         * @param {String} args.type                    :REQUIRED: 'person' or 'company'
         * @returns {Object} iAddress operations
         */
        function constructIAddressFromSumexAddressParams( {id, params, type} ) {
            const {bstrCompanyName, bstrNumber_phone, bstrNumber_fax, bstrEMail, bstrUrl} = params;

            // a) Initialize Address
            const iAddress = new IAddress( id );
            iAddress.Initialize();

            // b) Set person if applicable
            if( type === PERSON ) {
                iAddress.SetPerson( params );
            }

            // c) Set Company
            if( bstrCompanyName ) {
                iAddress.SetCompany( params );
            }

            // d) Set Postal
            iAddress.SetPostal( params );

            // e) Add Phone
            if( bstrNumber_phone ) {
                iAddress.AddPhone( {...params, bstrNumber: bstrNumber_phone} );
            }

            // f) Set Fax
            if( bstrNumber_fax ) {
                iAddress.SetFax( {...params, bstrNumber: bstrNumber_fax} );
            }

            // g) Set Online
            if( bstrEMail || bstrUrl ) {
                iAddress.SetOnline( params );
            }

            return iAddress;
        }

        function getPercentageVat( vatCode ) {
            const vatConfig = Y.doccirrus.vat.getByCode( vatCode );
            if( vatConfig && vatConfig.description ) {
                return Y.doccirrus.vat.getPercent( vatCode );
            }

            return 0;
        }

        function getSumexLawCode(tarmedlogId, schein) {
            let err;
            const IN_SUITE_TO_TARMED_LAW_MAP = new Map( [
                ['PRIVATE_CH', 0],
                ['PRIVATE_CH_UVG', 1],
                ['PRIVATE_CH_MVG', 2],
                ['PRIVATE_CH_IVG', 3],
                ['PRIVATE_CH_VVG', 4], // Not used
                ['ORG', 5]  // Not used
            ] );

            const law = schein.data.caseFolderTypeSingle;

            if( !law ) {
                err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
                Y.log( `SUMEX: getSumexLawCode(): missing 'law' field to map to SUMEX params for tarmedlog ${tarmedlogId}:\n${err.stack}`, 'error', NAME );
                throw err;
            }

            const tarmedLaw = IN_SUITE_TO_TARMED_LAW_MAP.get( law );

            if( tarmedLaw === undefined ) {
                err = Y.doccirrus.errors.rest( 'sumex_08', null, true ); // Data mapping error
                Y.log( `SUMEX: getSumexLawCode(): could not map law value ${law} to Sumex param for tarmedlog ${tarmedlogId}:\n${err.stack}`, 'error', NAME );
                throw err;
            }
            return tarmedLaw;
        }

        /**
         * This method generates sumex-mappers validation errors
         *
         * @PUBLIC
         * @method errorFieldMissingFactory
         *
         * @param {Object} args                         :REQUIRED:
         * @param {Object} args.fields                  :REQUIRED:
         * @param {Object} args.schein                  :REQUIRED:
         * @param {String} args.tarmedlogId             :REQUIRED:
         * @param {String} args.type                    :REQUIRED:
         * @param {String} args.entry                   :OPTIONAL:
         * @returns {Object} invoiceLog error
         */
        function errorFieldMissingFactory( {fields, schein, tarmedlogId, type, entry} ) {
            let link;
            const errorMessage = getFieldsMissingMessage( fields, type ),
                scheinData = schein && schein.data || {};

            switch( type ) {
                case LOCATION:
                    link = getLocationLink( scheinData.locationId );
                    break;
                case INSURANCE:
                    link = getPatientInsuranceLink( scheinData.patientId );
                    break;
                case PATIENT:
                case BASECONTACT:
                    link = getPatientDetailLink( scheinData.patientId );
                    break;
                case EMPLOYEE:
                    link = getEmployeeDetailLink( entry._id );
                    break;
                case ACTIVITY:
                    link = getActivityLink( entry._id );
                    break;
                default:
                    link = '';
            }
            Y.log( `SUMEX: mapInSuitePatientToSumexParams(): ${errorMessage} for tarmedlog ${tarmedlogId}`, 'error', NAME );
            return Y.doccirrus.tarmedUtils.generateSumexError({text: errorMessage, schein, link});
        }

        function calculatePriceWithVat( price, vatRate ) {
            if(!vatRate) {
                return price;
            }
            return price + price * vatRate / 100;
        }
        /**
         * This method maps an inSuite version to Sumex params
         *
         * @method versionToSumexParams
         *
         * @param {String} tarmedlogId :REQUIRED:
         * @param {String} version :REQUIRED:
         *
         * @returns {Object}
         */
        function versionToSumexParams( tarmedlogId, version ) {
            let err;
            if( !version ) {
                err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
                Y.log( `SUMEX: versionToSumexParams(): no DC version present for tarmedlog ${tarmedlogId}:\n${err.stack}`, 'error', NAME );
                throw err;
            }

            const versionNumbers = version.split( '.' );
            const sumexVersion = Number( versionNumbers[0] * 100 + versionNumbers[1] );

            return {
                bstrSoftwarePackage: 'Doc Cirrus GmbH',
                lSoftwareVersion: sumexVersion,
                bstrSoftwareCopyright: 'DC Copyright'           //TODO: check what text should go here
            };
        }

        async function getAllPhysiciansFromSchein( {tarmedlogId, schein, user, treatments, medications} ) {
            let error, physicians, physiciansSumex, errors = [];
            const treatmentsPhysicians = treatments
                    .filter( ( value, index, self ) => self.indexOf( value ) === index )
                    .map( value => value.employeeId ),
                medicationsPhysicians = medications
                    .filter( ( value, index, self ) => self.indexOf( value ) === index )
                    .map( value => value.employeeId ),
                physiciansIds = [
                    ...treatmentsPhysicians,
                    ...medicationsPhysicians
                ];

            //todo get physician data from invoiceentry type = patient
            [error, physicians] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                query: {
                    _id: {$in: physiciansIds}
                },
                options: {
                    fields: {
                        _id: 1,
                        glnNumber: 1,
                        qualiDignities: 1,
                        zsrNumber: 1,
                        firstname: 1,
                        lastname: 1,
                        title: 1,
                        talk: 1
                    }
                }
            } ) );

            if( error ) {
                Y.log( `SUMEX: getAllPhysiciansFromSchein(): error in getting employees for schein ${schein._id} and tarmedlog ${tarmedlogId}.\n${error && error.stack || error}`, 'error', NAME );
                throw error;
            }

            if( !Array.isArray( physicians ) || !physicians.length ) {
                error = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
                Y.log( `SUMEX: getAllPhysiciansFromSchein(): employees for schein ${schein._id} and tarmedlog ${tarmedlogId} could not be found.\n${error && error.stack || error}`, 'error', NAME );
                throw error;
            }

            //todo remove async by geting physician data from invoiceentry type = patient
            [error, physiciansSumex = []] = await formatPromiseResult( Promise.all( physicians.map( physician =>
                mapInSuitePhysicianFieldsToSumexParams( {
                    tarmedlogId, user, schein, physician
                } )
            ) ) );

            if( error ) {
                Y.log( `SUMEX: getAllPhysiciansFromSchein(): error in mapping inSuite physician fields to Sumex params for schein ${schein._id} and tarmedlog ${tarmedlogId}.`, 'error', NAME );
                throw error;
            }
            const physiciansErrors = physiciansSumex.map( physicianSumex => physicianSumex.errors ),
                physiciansParams = physiciansSumex.map( physicianSumex => physicianSumex.params );

            if( physiciansErrors.length ) {
                physiciansErrors.forEach( physicianErrors => {
                    errors = errors.concat( physicianErrors );
                } );
            }
            return {
                errors,
                physiciansParams
            };
        }

        Y.namespace( 'doccirrus' ).sumexMappers = {
            name: NAME,
            mapInSuiteInvoiceDataToSumexParams,
            mapInSuiteScheinToSumexParams,
            mapInSuiteWarningDataToSumexParams,
            bankToSumexParams
        };
    },
    '0.0.1', { requires: ['employee-api', 'location-api', 'catalog-api', 'activity-api', 'sumex-generalInvoiceRequest450'] }
);
