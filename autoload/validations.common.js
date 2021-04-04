/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of DC validations available in BOTH the client and server
 * and used through the Schema system.
 *
 * Compatible with mongoose.
 *
 * Uses the YUI namespace.
 */

/*
 BEFORE YOU ADD A VALIDATION... PLEASE NOTE:

 * This is pure SCHEMA based model validation code.

 * CSS Selectors ARE NOT ALLOWED TO APPEAR IN THIS CODE.

 * Client Helper functions that may include CSS selectors belong in the client side utils.

 */


/*jslint anon:true, nomen:true*/
/*global YUI, _, require */

'use strict';

YUI.add( 'dcvalidations', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            createValidator = Y.doccirrus.validator.factory.createValidator,
            lodash = Y.doccirrus.commonutils.isClientSide() ? _ : require( 'lodash' ),
        // ****************** ERROR MESSAGES ********************
            // error message strings preparing for i18n
            // TODO : html tags are workarounds for bootstrap 3 tooltip f00k
            MISSING_MANDATORY_VALUE = i18n( 'validations.message.MISSING_MANDATORY_VALUE' ),
            INVORRECT_VALUE_FORMAT = i18n( 'validations.message.INVORRECT_VALUE_FORMAT' ),
            INVORRECT_VALUE_FORMAT_2021 = i18n( 'validations.message.INVORRECT_VALUE_FORMAT_2021' ),
            MONGOOSE_MISSING_MANDATORY_VALUE = i18n( 'validations.message.MONGOOSE_MISSING_MANDATORY_VALUE' ),
            XML_ARE_MARKUP = i18n( 'validations.message.XML_ARE_MARKUP' ),
            EXACT_LENGTH_VALUE = i18n( 'validations.message.EXACT_LENGTH_VALUE' ),
            INVALID_LENGTH_VALUE = i18n( 'validations.message.INVALID_LENGTH_VALUE' ),
            SIMPLE_INVALID_LENGTH_STRING = i18n( 'validations.message.SIMPLE_INVALID_LENGTH_STRING' ),
            SIMPLE_INVALID_LENGTH_VALUE = i18n( 'validations.message.SIMPLE_INVALID_LENGTH_VALUE' ),
            INVALID_LENGTH_VALUE_NUMBER = i18n( 'validations.message.INVALID_LENGTH_VALUE_NUMBER' ),
            DOB_T_ERR = i18n( 'validations.message.DOB_T_ERR' ),
            DOD_T_ERR = i18n( 'validations.message.DOD_T_ERR' ),
            DATE_ERR = i18n( 'validations.message.DATE_ERR' ),
            DATE_ERR_MM_YYYY = i18n( 'validations.message.DATE_ERR_MM_YYYY' ),
            TIME_ERR = i18n( 'validations.message.TIME_ERR' ),
            EMAIL_ERR = i18n( 'validations.message.EMAIL_ERR' ),
            PHONE_ERR = i18n( 'validations.message.PHONE_ERR' ),
            FAX_ERR = i18n( 'validations.message.FAX_ERR' ),
            STREET_ERR = i18n( 'validations.message.STREET_ERR' ),
            HOUSENO_ERR = i18n( 'validations.message.HOUSENO_ERR' ),
            VPRC_FQ_HOST_NAME_ERR = i18n( 'validations.message.VPRC_FQ_HOST_NAME_ERR' ),
            ZIP_ERR = i18n( 'validations.message.zip' ),
            ZIP_ERR_CH = i18n( 'validations.message.zip_CH' ),
            ROLES_CANDIDATES_EMPTY = i18n( 'validations.message.ROLES_CANDIDATES_EMPTY' ),
            LOCATIONS_PHYSICIANS_EMPTY = i18n( 'validations.message.LOCATIONS_PHYSICIANS_EMPTY' ),
            BILLER_EMPTY = i18n( 'validations.message.BILLER_EMPTY' ),
            BILLING_ROLE_MANDATORY = i18n( 'validations.message.BILLING_ROLE_MANDATORY' ),
            URL_ERR = i18n( 'validations.message.URL_ERR' ),
            IBAN_ERR = i18n( 'validations.message.IBAN_ERR' ),
            COMMUNICATION_T_ERR = i18n( 'validations.message.COMMUNICATION_T_ERR' ),
            PRAXID_T_ERR = i18n( 'validations.message.PRAXID_T_ERR' ),
            WAITNO_T_ERR = i18n( 'validations.message.WAITNO_T_ERR' ),
            BANKACCOUNT_T_ERR = i18n( 'validations.message.BANKACCOUNT_T_ERR' ),
            NUM_ERR = i18n( 'validations.message.NUM_ERR' ),
            NUM_NOT_ZERO_ERR = i18n('validations.message.NUM_NOT_ZERO_ERR'),
            ALPHA_ERR = i18n( 'validations.message.ALPHA_ERR' ),
            ALPHANUM_ERR = i18n( 'validations.message.ALPHANUM_ERR' ),
            ALPHANUMDOTAT_ERR = i18n( 'validations.message.ALPHANUMDOTAT_ERR' ),
            ALPHANUM_TI_ID_ERR = i18n( 'validations.message.ALPHANUM_TI_ID_ERR' ),
            EMAILORPHONE_ERR = i18n( 'validations.message.EMAILORPHONE_ERR' ),
            DURATION_ERR = i18n( 'validations.message.DURATION_ERR' ),
            HOUR_ERR = i18n( 'validations.message.HOUR_ERR' ),
            MINUTE_ERR = i18n( 'validations.message.MINUTE_ERR' ),
            YEAR_ERR = i18n( 'validations.message.YEAR_ERR' ),
            GUID_ERR = i18n( 'validations.message.GUID_ERR' ),
            QUARTER_ERR = i18n( 'validations.message.QUARTER_ERR' ),
            OID_ERR = i18n( 'validations.message.OID_ERR' ),
            LANR_ERR = i18n( 'validations.message.LANR_ERR' ),
            BSNR_ERR = i18n( 'validations.message.BSNR_ERR' ),
            REGEXP_ERR = i18n( 'file-schema.base_File_T.filter.error' ),
            DECNUMBER_ERR = i18n( 'validations.message.DECNUMBER_ERR' ),
            DECIMALNUMBER_ERR = i18n( 'validations.message.DECIMALNUMBER_ERR' ),
            NUMBER_ERR = i18n( 'validations.message.NUMBER_ERR' ),
            AVWG_ERR = i18n( 'validations.message.AVWG_ERR' ),
            TIMEOUTDELAY_ERR = i18n( 'validations.message.TIMEOUTDELAY_ERR' ),
            ACOOUNTBANDELAY_ERR = i18n( 'validations.message.ACOOUNTBANDELAY_ERR' ),
            KBV_VOS_URL = i18n( 'validations.message.KBV_VOS_URL' ),
            CAPACITY_ERR = i18n( 'validations.message.CAPACITY_ERR' ),
            NUMBER_OF_SUGGESTED_APPOINTMENTS_ERR = i18n( 'validations.message.NUMBER_OF_SUGGESTED_APPOINTMENTS_ERR' ),
            MAIN_LOCATION_MISSING = i18n( 'validations.message.MAIN_LOCATION_MISSING' ),
            COMMERCIALNO_MISSING = i18n( 'validations.message.COMMERCIALNO_MISSING' ),
            NUMRANGESTRING_ERR = i18n( 'validations.message.NUMRANGESTRING_ERR' ),
            START_BUDGET_MISSING = i18n( 'validations.message.START_BUDGET_MISSING' ),
            PATIENT_T_DAYOFLASTMENORRHOEA_ERR = i18n( 'validations.message.PATIENT_T_DAYOFLASTMENORRHOEA_ERR' ),
            PATIENT_T_CYCLEDAYSMENORRHOEA_ERR = i18n( 'validations.message.PATIENT_T_CYCLEDAYSMENORRHOEA_ERR' ),
            MODALITY_NAME_ERR = i18n( 'validations.message.MODALITY_NAME_ERR' ),
            PAST_PRESENT_DATE_ERR = i18n( 'validations.message.PAST_PRESENT_DATE_ERR' ),
            INVALID_DURATION = i18n( 'validations.message.INVALID_DURATION' ),
            BEFORE_DATE_ERR = i18n( 'validations.message.BEFORE_DATE_ERR' ),
            LATER_DATE_ERR = i18n( 'validations.message.LATER_DATE_ERR' ),
            PADXSETTING_T_RECIPIENTRZID_ERR = i18n( 'validations.message.PADXSETTING_T_RECIPIENTRZID_ERR' ),
            ONE_TO_99_ERR = i18n( 'validations.message.ONE_TO_99_ERR' ),
            ActivityDataItem_T_count_ERR = i18n( 'validations.message.ActivityDataItem_T_count_ERR' ),
            PROXY_ERR = i18n( 'validations.message.PROXY_ERR' ),
            LABTEST_T_HEAD_ERR = i18n( 'validations.message.LABTEST_T_HEAD_ERR' ),
            INVALID_VALUE = i18n( 'validations.message.INVALID_VALUE' ),
            // TI ERRORS -----------------------------------------------------------------------------------------------
            LESS_THAN_64_CHARACTERS_ERR = i18n( 'validations.message.LESS_THAN_64_CHARACTERS_ERR' ),
            // SWISS ERRORS --------------------------------------------------------------------------------------------
            STRING_13_DIGITS_ERR = i18n( 'validations.message.STRING_13_DIGITS_ERR' ),
            STRING_MAX_8_DIGITS_ERR = i18n( 'validations.message.STRING_MAX_8_DIGITS_ERR' ),
            INVALID_GENDER_FIELDS = i18n( 'validations.message.INVALID_GENDER_FIELDS' ),
            COUNTRY_NOT_SUPPORTED_BY_PRACTICE_ERR = i18n( 'validations.message.COUNTRY_NOT_SUPPORTED_BY_PRACTICE_ERR' ),
            SHIFTPATIENTS_T_TARGET_EMPLOYEE_ID_ERR = i18n( 'validations.message.SHIFTPATIENTS_T_TARGET_EMPLOYEE_ID_ERR' ),
            // xDT ERRORS
            LENGTH_IS_NOT_EXACTLY_4 = i18n( 'validations.message.XDT_LENGTH_IS_NOT_EXACTLY_4' ),
            INVALID_ESR_NUMBER = i18n( 'validations.message.INVALID_ESR_NUMBER' ),
            // padX specific
            PARTICIPANT_ALL = i18n( 'validations.message.PARTICIPANT_ALL' ),
            MAX_16_DIGITS_ERR = i18n( 'validations.message.MAX_16_DIGITS_ERR' ),
            IKNR_ERR = i18n( 'validations.message.IKNR_ERR' ),
            INCASECONFIGURATION_T_KIMMESSAGEPOLLINGINTERVALHOURS_ERR = i18n( 'validations.message.INCASECONFIGURATION_T_KIMMESSAGEPOLLINGINTERVALHOURS_ERR' ),
            //
            // singleton
            validationLibrary;

        var
            getMoment = Y.doccirrus.commonutils.getMoment,
            length1To20Validator;

        //
        // ****************** VALIDATION OBJECTS : FUNCTIONS + MESSAGES ********************

        /**
         * @param {Object} [config]
         * @param {String} [config.msg]
         * @param {Function} [config.validator]
         * @constructor
         */
        Y.doccirrus.validator.registry.registerType( 'MANDATORY', function ValidatorMandatory( config ) {
            config = config || {};
            this.msg = config.msg || MONGOOSE_MISSING_MANDATORY_VALUE;
            this.validator = config.validator || Y.doccirrus.commonutils.rbind( validationLibrary._mandatory, null );
        } );

        /**
         * converts any 'value' into a string and test it's length property with given 'min' & 'max' parameters
         * @param {*} value
         * @param {Number} min
         * @param {Number} max
         * @return {Boolean}
         */
        function _lengthString( value, min, max ) {
            if( !value ) {
                value = '';
            }
            if( !Y.Lang.isString( value ) ) {
                value = String( value );
            }
            value = value.length;
            /*jshint -W040 */
            return validationLibrary._rangeInteger.call( this, value, min, max );
            /*jshint +W040 */
        }

        /**
         * @param {Object} [config]
         * @param {Number} [config.min=0]
         * @param {Number} [config.max=Number.MAX_VALUE]
         * @param {String} [config.msg]
         * @param {Function} [config.validator]
         * @constructor
         */
        Y.doccirrus.validator.registry.registerType( 'LENGTH', function ValidatorLength( config ) {
            config = config || {};
            if( Y.Lang.isUndefined( config.min ) ) {
                config.min = 0;
            }
            if( Y.Lang.isUndefined( config.max ) ) {
                config.max = Number.MAX_VALUE;
            }
            this.msg = Y.Lang.sub( config.msg || INVALID_LENGTH_VALUE, {
                min: config.min,
                max: config.max
            } );
            this.validator = config.validator || Y.doccirrus.commonutils.rbind( _lengthString, null, config.min, config.max );
        } );

        length1To20Validator = createValidator( 'LENGTH', {min: 1, max: 20} );

        /**
         * Constructor for the module class.
         *
         * In this constructor function we combine the validation logic and validation messages
         * as per mongoose compatible multi-validators. This ensures that the same results
         * and messages are obtained on the server as on the client.
         *
         * @class DCValidations
         * @private
         */
        function DCValidations() {
            //
            // SIMPLE VALIDATORS DO NOT COMPARE FIELDS AND DO NOT INSPECT 'this'!!
            this.mandatory = [
                { validator: this._mandatory, msg: MISSING_MANDATORY_VALUE }
            ];
            this.mongooseMandatory = [ // is not a simple validator, it's a schema based mandatory validator (where a "PATH" will be provided)
                { validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.smbMandatory = [
                { validator: this._SMB_mandatory, msg: MISSING_MANDATORY_VALUE }
            ];
            this.notEmpty = [
                { validator: this._notEmpty, msg: MISSING_MANDATORY_VALUE }
            ];
            this.hour = [
                { validator: this._hourNum, msg: HOUR_ERR }
            ];
            this.minute = [
                { validator: this._minuteNum, msg: MINUTE_ERR }
            ];
            this.year = [
                { validator: this._year, msg: YEAR_ERR }
            ];
            this.validNumber = [
                { validator: this._validNumber, msg: NUMBER_ERR }
            ];
            this.validNumberOrEmpty = [
                { validator: this._validNumberOrEmpty, msg: NUMBER_ERR }
            ];
            this.guid = [
                { validator: this._guid, msg: GUID_ERR }
            ];
            this.quarter = [
                { validator: this._quarter, msg: QUARTER_ERR }
            ];
            this.objectId = [
                { validator: this._objectId, msg: OID_ERR }
            ];
            this.email = [
                { validator: this._email, msg: EMAIL_ERR }
            ];
            this.phone = [
                { validator: this._phone, msg: PHONE_ERR }
            ];
            this.fax = [
                { validator: this._fax, msg: FAX_ERR }
            ];
            this.emailOrEmpty = [
                { validator: this._emailOrEmpty, msg: EMAIL_ERR }
            ];
            this.phoneOrEmpty = [
                { validator: this._phoneOrEmpty, msg: PHONE_ERR }
            ];
            this.faxOrEmpty = [
                { validator: this._faxOrEmpty, msg: FAX_ERR }
            ];
            this.urlOrEmpty = [
                { validator: this._urlOrEmpty, msg: URL_ERR }
            ];
            this.zip = [
                { validator: this._zip, msg: ZIP_ERR }
            ];
            this.url = [
                { validator: this._url, msg: URL_ERR }
            ];
            this.bankIBAN = [
                { validator: this._iban, msg: IBAN_ERR }
            ];
            this.numRange = [
                { validator: this._numRangeString, msg: NUMRANGESTRING_ERR }
            ];
            this.num = [
                { validator: this._num, msg: NUM_ERR }
            ];
            this.numOrEmpty = [
                { validator: this._numOrEmpty, msg: NUM_ERR }
            ];
            this.gt0 = [
                {validator: this._gt0, msg: NUM_NOT_ZERO_ERR}
            ];

            this.alpha = [
                { validator: this._euroalpha, msg: ALPHA_ERR }
            ];
            this.alphanum = [
                { validator: this._euroalphanum, msg: ALPHANUM_ERR }
            ];
            this.alphanumspac = [
                { validator: this._euroalphanumspac, msg: ALPHANUM_ERR }
            ];
            this.scheduleDuration = [
                { validator: this._scheduleDuration, msg: DURATION_ERR }
            ];
            this.scheduleCapacity = [
                { validator: this._scheduleCapacity, msg: CAPACITY_ERR }
            ];
            this.scheduleNumberOfSuggestedAppointments = [
                { validator: this._scheduleNumberOfSuggestedAppointments, msg: NUMBER_OF_SUGGESTED_APPOINTMENTS_ERR }
            ];
            this.decNumber = [
                { validator: this._decNumber, msg: DECNUMBER_ERR }
            ];
            this.decNumberNegative = [
                { validator: this._decNumberNegative, msg: DECNUMBER_ERR }
            ];
            this.validNumber = [
                { validator: this._validNumber, msg: NUMBER_ERR }
            ];
            this.floatNumber = [
                { validator: this._floatNumber, msg: DECIMALNUMBER_ERR }
            ];
            this.date = [
                { validator: this._date, msg: DATE_ERR }
            ];
            this.dateDDMMYYYY = [
                { validator: this._dateDDMMYYYY, MSG: DATE_ERR }
            ];
            this.time = [
                { validator: this._time, msg: TIME_ERR }
            ];
            this.timeNotRequired = [
                { validator: this._timeNotRequired, msg: DATE_ERR }
            ];
            this.dateNotRequired = [
                { validator: this._dateNotRequired, msg: DATE_ERR }
            ];
            this.pastOrPresentDate = [
                {
                    validator: this._pastOrPresentDate,
                    msg: PAST_PRESENT_DATE_ERR
                }
            ];

            this.quantityOrdered = [
                {validator: this._quantityOrdered, msg: NUM_NOT_ZERO_ERR}
            ];

            this.inpacsmodality_T_name = [
                { validator: this._inpacsmodality_T_name, msg: MODALITY_NAME_ERR }
            ];
            this.lanr = [
                { validator: this._lanr, msg: LANR_ERR }
            ];
            this.bsnr = [
                { validator: this._bsnr, msg: BSNR_ERR }
            ];
            this.regexp = [
                { validator: this._regex, msg: REGEXP_ERR }
            ];
            this.oneToNinetyNine = [
                { validator: this._oneToNinetyNine, msg: ONE_TO_99_ERR }
            ];
            this.Schedule_T_userDescr = [
                { validator: this._Schedule_T_userDescr, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Schedule_T_end = [
                { validator: this._Schedule_T_end, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Assistive_T_assDescription = [
                { validator: this._Assistive_T_assDescription, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Recurrence_T_interval = [
                { validator: this._recurrence_T_interval, msg: NUM_ERR }
            ];
            this.Recurrence_T_until = [
                { validator: this._Recurrence_T_until, msg: TIME_ERR }
            ];

            // removed since EXTMOJ-1892
            this.Physician_T_officialNo = [
                { countries: ['D'], validator: this._Physician_T_officialNo, msg: LANR_ERR }
            ];
            this.Physician_T_glnNumber = [
                { countries: ['CH'], validator: this.glnNumber_CH, msg: STRING_13_DIGITS_ERR },
                { countries: ['CH'], validator: this.mandatoryGlnNumber_CH, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Physician_T_zsrNumber = [
                { countries: ['CH'], validator: this.zsrNumber_CH, msg: STRING_MAX_8_DIGITS_ERR }
            ];
            this.Physician_T_kNumber = [
                { countries: ['CH'], validator: this.kNumber_CH, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this.mandatoryIfNotOwnZsrNumber_CH, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Medication_T_prdNo= [
                { countries: ['CH'], validator: this.Medication_T_prdNo, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Medication_T_phContinuousMed = [
                { countries: ['CH'], validator: this.phContinuousMed, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Medication_T_phContinuousMedDate = [
                { countries: ['CH'], validator: this.phContinuousMedDate, msg: MISSING_MANDATORY_VALUE }
            ];
            //
            // COMPLEX VALIDATORS __DO COMPARE FIELDS__ REQUIRE A PROPERLY SET 'this'!!
            this.Communication_T_type = [
                { validator: this._Communication_T_type, msg: COMMUNICATION_T_ERR }
            ];
            this.Communication_T_value = [
                { validator: this._Communication_T_value, msg: COMMUNICATION_T_ERR }
            ];

            this.Address_T_street = [
                { validator: this._Address_T_street, msg: STREET_ERR }
            ];
            this.Address_T_houseno = [
                { validator: this._Address_T_housenoMandatory, msg: MISSING_MANDATORY_VALUE },
                { validator: this._Address_T_houseno, msg: HOUSENO_ERR }
            ];
            this.Address_CH_T_cantonCode = [
                { validator: this._Address_CH_T_cantonCode, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Contact_T_communications = [
                { validator: this._Contact_T_communications, msg: '' }
            ];
            this.Company_T_addresses = [
                { validator: this._Company_T_addresses, msg: '' }
            ];
            this.Company_T_customerNo = [
                { validator: this._Company_T_customerNo, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Company_T_vprcFQHostName = [
                { validator: this._Company_T_vprcFQHostName, msg: VPRC_FQ_HOST_NAME_ERR }
            ];
            this.Company_T_systemId = [
                { validator: this.Company_T_systemId, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Company_T_countryMode = [
                { validator: this._mandatory, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Address_T_zip = [
                { validator: this._Address_T_zip, msg: 'D' === this.countryMode ? ZIP_ERR : ZIP_ERR_CH  }
            ];
            this.Address_T_city = [
                createValidator( 'LENGTH', { min: 0, max: 40 } )
            ];
            this.Treatment_T_linkedPercentage = [
                { validator: this._Treatment_T_linkedPercentage, msg: 'max 25' }
            ];
            this.Treatment_CH_T_side = [
                { countries: ['CH'], validator: this._Treatment_CH_T_side, msg: MISSING_MANDATORY_VALUE }
            ];
            this.reasonType_CH_T = [
                { validator: this._reasonType_CH_T, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Address_T_postbox = [
                { validator: this._Address_T_postbox, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.BankAccount_T = [
                { validator: this._BankAccount_T, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_trial = [
                { validator: this._BankAccount_T_trial, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_bankName = [
                { validator: this._BankAccount_T_bankName, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_bankIBAN = [
                { validator: this._BankAccount_T_bankIBAN, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_bankBIC = [
                { validator: this._BankAccount_T_bankBIC, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_accountOwner = [
                { validator: this._BankAccount_T_accountOwner, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_cardNo = [
                { validator: this._BankAccount_T_cardNo, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_cardCheckCode = [
                { validator: this._BankAccount_T_cardCheckCode, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_cardValidToMonth = [
                { validator: this._BankAccount_T_cardValidToMonth, msg: BANKACCOUNT_T_ERR }
            ];
            this.BankAccount_T_cardValidToYear = [
                { validator: this._BankAccount_T_cardValidToYear, msg: BANKACCOUNT_T_ERR }
            ];
            this.Patient_T_dob = [
                { validator: this._Person_T_dob, msg: DOB_T_ERR }
            ];
            this.Patient_T_dateOfDeath = [
                { validator: this._Person_T_dateOfDeath, msg: DOD_T_ERR }
            ];
            this.Patient_T_dateOfInActive = [
                { validator: this._Person_T_dateOfDeath, msg: DOD_T_ERR }
            ];
            this.Person_T_JobStatus = [
                { countries: ['CH'], validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_patientSince = [
                { validator: this._Patient_T_patientSince, msg: DATE_ERR }
            ];
            this.Patient_T_gender = [
                { countries: ['CH'], validator: this._Patient_T_gender_CH, msg: INVALID_GENDER_FIELDS }
            ];
            this.Patient_T_talk = [
                { countries: ['CH'], validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this._Patient_T_talk_CH, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_asvTeamNumbers = [
                { validator: this._Patient_T_asvTeamNumbers, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_patientId = [
                { validator: this._Patient_T_patientId, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_CH_T_socialSecurityNo = [
                { countries: ['CH'], validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_cardioSelectedType = [
                { validator: this._Patient_T_cardioSelectedType, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_insuranceType = [
                { validator: this._Patient_T_insuranceType, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_careType = [
                { validator: this._Patient_T_careType, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Patient_T_dayOfLastMenorrhoea = [
                { validator: this._Patient_T_dayOfLastMenorrhoea, msg: PATIENT_T_DAYOFLASTMENORRHOEA_ERR }
            ];
            this.Patient_T_cycleDaysMenorrhoea = [
                { validator: this._Patient_T_cycleDaysMenorrhoea, msg: PATIENT_T_CYCLEDAYSMENORRHOEA_ERR }
            ];
            this.PatientAlert_T_praxid = [
                { validator: this._PatientAlert_T_praxid, msg: PRAXID_T_ERR }
            ];
            this.PatientAlert_T_waitno = [
                { validator: this._PatientAlert_T_waitno, msg: WAITNO_T_ERR }
            ];
            this.PatientAlert_T_phone = [
                { validator: this._PatientAlert_T_emailOrPhone, msg: EMAILORPHONE_ERR }
            ];
            this.PatientAlert_T_email = [
                { validator: this._PatientAlert_T_emailOrPhone, msg: EMAILORPHONE_ERR }
            ];
            this.Schedule_T_title = [
                { validator: this._Schedule_T_title, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Settings_T_avwgNo = [
                { validator: this._Settings_T_avwgNo, msg: AVWG_ERR }
            ];
            this.Settings_T_timeoutDelay = [
                { validator: this._Settings_T_timeoutDelay, msg: TIMEOUTDELAY_ERR }
            ];
            this.Settings_T_accountBanDelay = [
                { validator: this._Settings_T_accountBanDelay, msg: ACOOUNTBANDELAY_ERR }
            ]           ;
            this.Settings_T_externalPrescriptionSoftwareUrl = [
                { validator: this._Settings_T_externalPrescriptionSoftwareUrl, msg: KBV_VOS_URL }
            ];

            this.Settings_T_smtpEmailFrom = [
                { validator: this._Settings_T_smtpEmailFrom, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                { validator: this._emailOrEmpty, msg: EMAIL_ERR }
            ];

            this.IntimeConfiguration_T_calendarViewDayStart = [
                {
                    validator: this._IntimeConfiguration_T_calendarViewDayStartDuration,
                    msg: INVALID_DURATION
                },
                {
                    validator: this._IntimeConfiguration_T_calendarViewDayStartBeforeEnd,
                    msg: BEFORE_DATE_ERR
                }
            ];
            this.IntimeConfiguration_T_calendarViewDayEnd = [
                {
                    validator: this._IntimeConfiguration_T_calendarViewDayEndDuration,
                    msg: INVALID_DURATION
                },
                {
                    validator: this._IntimeConfiguration_T_calendarViewDayEndAfterStart,
                    msg: LATER_DATE_ERR
                }
            ];

            this.PadxSetting_T_invoiceNotice = [
                createValidator( 'LENGTH', { min: 0, max: 4000 } )
            ];
            this.PadxSetting_T_recipientIKNR = [
                createValidator( 'LENGTH', { min: 0, max: 9 } )
            ];
            this.PadxSetting_T_proxyRecipientIKNR = [
                createValidator( 'LENGTH', { min: 0, max: 9 } )
            ];
            this.PadxSetting_T_senderIKNR = [
                createValidator( 'LENGTH', { min: 0, max: 9 } )
            ];

            this.PadxSetting_T_recipientRZID = [
                { validator: this._PadxSetting_T_recipientRZID, msg: PADXSETTING_T_RECIPIENTRZID_ERR }
            ];
            this.PadxSetting_T_locationsOrPhysicians = [
                { validator: this._PadxSetting_T_locationsOrPhysicians, msg: LOCATIONS_PHYSICIANS_EMPTY }
            ];
            this.PadxSetting_T_proxyRecipientRZID = [
                createValidator( 'LENGTH', { min: 0, max: 4 } )
            ];
            this.PadxSetting_T_senderRZID = [
                createValidator( 'LENGTH', { min: 0, max: 4 } )
            ];

            this.PadxSetting_T_recipientCustomerNo = [
                { validator: this._numOrEmpty, msg: NUM_ERR },
                createValidator( 'LENGTH', { min: 0, max: 20 } )
            ];
            this.PadxSetting_T_proxyRecipientCustomerNo = [
                { validator: this._numOrEmpty, msg: NUM_ERR },
                createValidator( 'LENGTH', { min: 0, max: 20 } )
            ];
            this.PadxSetting_T_senderName = [
                createValidator( 'LENGTH', { min: 0, max: 40 } ),
                { validator: this._PadxSetting_T_senderName, msg: XML_ARE_MARKUP }
            ];
            this.PadxSetting_T_senderCustomerNo = [
                { validator: this._numOrEmpty, msg: NUM_ERR },
                length1To20Validator
            ];
            this.PadxSetting_T_receiptAddress = this.emailOrEmpty;
            this.PadxSetting_T_oneClickPass = [
                { validator: this._PadxSetting_T_oneClickPass, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.PadxSetting_T_participantString = [
                { validator: this._PadxSetting_T_participant_allOrNone, msg: PARTICIPANT_ALL },
                { validator: this._PadxSetting_T_participant_stringOrNone, msg: ALPHANUMDOTAT_ERR }
            ];
            this.PadxSetting_T_participantNumber = [
                { validator: this._PadxSetting_T_participant_allOrNone, msg: PARTICIPANT_ALL },
                { validator: this._validNumberOrEmpty, msg: NUMBER_ERR }
            ];
            this.KvgSetting_T_locations = [
                { validator: this._KvgSetting_T_locationsOrEmployees, msg: LOCATIONS_PHYSICIANS_EMPTY }
            ];
            this.KvgSetting_T_employees = [
                { validator: this._KvgSetting_T_locationsOrEmployees, msg: LOCATIONS_PHYSICIANS_EMPTY }
            ];
            this.KvgSetting_T_billerEqualToProvider = [
                { validator: this._KvgSetting_T_billerEqualToProviderOrBiller, msg: BILLER_EMPTY }
            ];
            this.EmployeeShort_KVG_T_billingRole = [
                { validator: this._mandatory, msg: BILLING_ROLE_MANDATORY }
            ];

            this.WeeklyTime_T_days = [
                {validator: this._WeeklyTime_T_days, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.Location_T_mainLocationId = [
                { validator: this._mandatoryIfAdditionalLoocation, msg: MAIN_LOCATION_MISSING }
            ];

            // removed since EXTMOJ-1892
            this.Location_T_commercialNo = [
                { validator: this._mandatoryIfAdditionalLoocation, msg: COMMERCIALNO_MISSING }
            ];

            this.Location_CH_T_glnNumber = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this.glnNumber_CH, msg: STRING_13_DIGITS_ERR }
            ];

            this.Location_CH_T_zsrNumber = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this.zsrNumber_CH, msg: STRING_MAX_8_DIGITS_ERR }
            ];

            this.Location_CH_T_vatNumber = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE }
            ];

            this.Location_T_phone = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this._phone, msg: PHONE_ERR },
                { countries: ['D'], validator: this._phoneOrEmpty, msg: PHONE_ERR }
            ];
            this.Location_T_url = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this._urlOrEmpty, msg: URL_ERR },
                { countries: ['D'], validator: this._urlOrEmpty, msg: URL_ERR }
            ];

            this.BankAccount_CH_T_esrNumber = [
                { countries: ['CH'], validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this._esrNumber, msg: INVALID_ESR_NUMBER }
            ];

            this.Location_T_startDate = [
                { validator: this._startDate, msg: START_BUDGET_MISSING }
            ];

            this.Location_T_startBudget = [
                { validator: this._startBudget, msg: START_BUDGET_MISSING }
            ];

            this.Location_T_gkvInvoiceReceiver = [
                { countries: ['D'], validator: this._Location_T_gkvInvoiceReceiver, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                { countries: ['CH'], validator: this._Location_T_gkvInvoiceReceiverCH, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];

            this.Partner_T_PIN = [
                { validator: this._num, msg: NUM_ERR },
                createValidator( 'LENGTH', { min: 8, max: 8 } )
            ];
            this.ActivitySequence_T_title = [
                { validator: this._ActivitySequence_T_title, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                createValidator( 'LENGTH', { min: 0, max: 15 } )
            ];
            this.Task_T_rolesOrCandidates = [
                { validator: this._Task_T_rolesOrCandidates, msg: ROLES_CANDIDATES_EMPTY }
            ];
            this.base_Database_T_collectionName = [
                { validator: this._base_Database_T_collectionName, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_SerialDevice_T_serialPath = [
                { validator: this._base_SerialDevice_T_serialPath, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.FileType_E_fileType = [
                { validator: this._FileType_E_fileType, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.EventName_E_eventName = [
                { validator: this._EventName_E_eventName, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_smbShare = [
                { validator: this._base_File_T_smbShare, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_filePath = [
                { validator: this._base_File_T_filePath, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_smbUser = [
                { validator: this._base_File_T_smbUser, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_smbPw = [
                { validator: this._base_File_T_smbPw, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_executeClient = [
                { validator: this._base_File_T_executeClient, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_executePath = [
                { validator: this._base_File_T_executePath, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_deviceServer = [
                { validator: this._base_File_T_deviceServer, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_File_T_keepFiles = [
                { validator: this._base_File_T_keepFiles, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.base_Database_T_apiMethod = [
                { validator: this._base_Database_T_apiMethod, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.serialport_T_path = [
                { validator: this._serialport_T_path, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.username = [
                { validator: this._username, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                { validator: this._euroalphanumDotAt, msg: ALPHANUMDOTAT_ERR }
            ];
            this.Shortcut_T_formId = [
                { validator: this._Shortcut_T_formId, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.LabTest_T_head = [
                { validator: this._LabTest_T_head, msg: LABTEST_T_HEAD_ERR }
            ];
            this.LabTest_T_testResultValOrSampleResultText = [
                { validator: this._LabTest_T_testResultValOrSampleResultText, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.Employee_T_initials = [
                createValidator( 'LENGTH', { min: 0, max: 3 } )
            ];
            this.Employee_T_pvsCustomerNo = [
                { validator: this._numOrEmpty, msg: NUM_ERR },
                { validator: this._Employee_T_pvsCustomerNo, msg: length1To20Validator.msg }
            ];
            this.ActivityDataItem_T_count = [
                { validator: this._ActivityDataItem_T_count, msg: ActivityDataItem_T_count_ERR }
            ];
            this.DeliverySettings_T_mainLocationId = [
                { validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.DeliverySettings_T_username = [
                { validator: this._DeliverySettings_T_1ClickMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.DeliverySettings_T_password = [
                { validator: this._DeliverySettings_T_1ClickMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.DeliverySettings_T_pin = [
                { validator: this._DeliverySettings_T_1ClickMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.DeliverySettings_T_kvPortalUrl = [
                { validator: this._DeliverySettings_T_ManualMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE },
                { validator: this._DeliverySettings_T_kvPortalUrl, msg: URL_ERR }
            ];
            this.notEmptyArray = [
                { validator: this._notEmptyArray }
            ];
            this.Admin_T_proxy = [
                { validator: this._Admin_T_proxy, msg: PROXY_ERR }
            ];
            this.Cardreader_T_name = [
                { validator: this.Cardreader_T_name, msg: MISSING_MANDATORY_VALUE }
            ];
            this.Cardreader_T_port = [
                { validator: this.Cardreader_T_port, msg: MISSING_MANDATORY_VALUE },
                { validator: this.Cardreader_T_port, msg: NUMBER_ERR }
            ];
            this.LabDevice_T_deviceType = [
                { validator: this.LabDevice_T_deviceType, msg: Y.Lang.sub( INVALID_LENGTH_VALUE, {
                    min: 1,
                    max: 60
                } )}
            ];
            this.LabDevice_T_manufacturer = [
                { validator: this.LabDevice_T_manufacturer, msg: Y.Lang.sub( INVALID_LENGTH_VALUE, {
                    min: 1,
                    max: 60
                } )}
            ];
            this.LabDeviceTest_T_testId = [
                { validator: this.LabDeviceTest_T_testId, msg: Y.Lang.sub( INVALID_LENGTH_VALUE_NUMBER, {
                    num: 3
                } )}
            ];
            this.ActionButton_T_name = [
                { validator: this.ActionButton_T_name, msg: INVALID_VALUE}
            ];

            this.ActionButton_T_uri = [
                { validator: this.ActionButton_T_uri, msg: INVALID_VALUE}
            ];

            this.AppToken_T_appName = [
                { validator: this.appToken_T_goodName, msg: INVALID_VALUE },
                { validator: this._euroalphanumDotAt, msg: ALPHANUMDOTAT_ERR }
            ];

            // TI validations ------------------------------------------------------------------------------------------
            this.TiSMCB_T_iccsn = [
                { validator: this.AlphanumericalCharactersTiId, msg: ALPHANUM_TI_ID_ERR},
                { validator: this.LessThan64Characters, msg: LESS_THAN_64_CHARACTERS_ERR}
            ];
            this.OranisationalUnit_T_humanId = [
                { validator: this.AlphanumericalCharactersTiId, msg: ALPHANUM_TI_ID_ERR},
                { validator: this.LessThan64Characters, msg: LESS_THAN_64_CHARACTERS_ERR}
            ];
            this.TiCardReader_T_humanId = [
                { validator: this.AlphanumericalCharactersTiId, msg: ALPHANUM_TI_ID_ERR},
                { validator: this.LessThan64Characters, msg: LESS_THAN_64_CHARACTERS_ERR}
            ];
            this.WorkStation_T_humanId = [
                { validator: this.AlphanumericalCharactersTiId, msg: ALPHANUM_TI_ID_ERR},
                { validator: this.LessThan64Characters, msg: LESS_THAN_64_CHARACTERS_ERR}
            ];
            // Country Mode --------------------------------------------------------------------------------------------
            this.CountryMode_E = [
                { validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { validator: this.countriesSupportedByPractice, msg: COUNTRY_NOT_SUPPORTED_BY_PRACTICE_ERR }
            ];
            // Custom tarmed catalog entries ---------------------------------------------------------------------------
            this.TarmedDignity_T_code = [
                { validator: this.mandatoryIfTarmedDignity, msg: MISSING_MANDATORY_VALUE }
            ];
            this.TarmedDignity_T_text = [
                { validator: this.mandatoryIfTarmedDignity, msg: MISSING_MANDATORY_VALUE }
            ];
            this.TarmedDignity_T_catalogExtension = [
                { validator: this.trueIfCustomTarmedDignity, msg: MISSING_MANDATORY_VALUE }
            ];

            this.ShiftPatients_T_targetEmployeeId = [
                { validator: this._ShiftPatients_T_targetEmployeeId, msg: SHIFTPATIENTS_T_TARGET_EMPLOYEE_ID_ERR}
            ];

            this.IncaseConfiguration_T_roles = [
                { validator: this._IncaseConfiguration_T_roles, msg: MISSING_MANDATORY_VALUE}
            ];

            this.IncaseConfiguration_T_kimMessagePollingIntervalHours = [
                { validator: this._IncaseConfiguration_T_kimMessagePollingIntervalHours, msg: INCASECONFIGURATION_T_KIMMESSAGEPOLLINGINTERVALHOURS_ERR}
            ];

            this.GDTMappingRow_T_gdtFieldNumber = [
                { validator: this._mandatory, msg: MISSING_MANDATORY_VALUE },
                { validator: this._validNumber, msg: NUMBER_ERR },
                { validator: this._lengthIsExactly4XDT, msg: LENGTH_IS_NOT_EXACTLY_4 }
            ];
            this.cashbookId = [
                { validator: this.cashbookId, msg: MISSING_MANDATORY_VALUE }
            ];
            this.nextNumber = [
                { validator: this.nextNumber, msg: NUM_ERR }
            ];

            // ========================================================================================================== \\
            // =========================================== QDOCU VALIDATIORS =============================================== \\
            this.QDocu_T_module = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_programmzk = [
                {validator: this._QDocu_T_programmzk, msg: Y.Lang.sub( EXACT_LENGTH_VALUE, {num: 2} )}
            ];

            this.QDocu_T_kasseiknr = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._bsnr, msg: IKNR_ERR}
            ];

            this.QDocu_T_versichertenstatusgkv = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_bsnrambulant = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._bsnr, msg: BSNR_ERR}
            ];

            this.QDocu_T_lanr = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._lanr, msg: LANR_ERR}
            ];

            this.QDocu_T_versichertenidneu = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_versichertenidneu, msg: Y.Lang.sub( SIMPLE_INVALID_LENGTH_STRING, {num: 10} )}
            ];

            this.QDocu_T_idnrpat = [
                {validator: this._mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._max16Digits, msg: MAX_16_DIGITS_ERR}
            ];

            this.QDocu_T_gebdatum = [
                {validator: this._mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_datumunt = [
                {validator: this._mandatory, msg: MISSING_MANDATORY_VALUE},
                {validator: this._date, msg: DATE_ERR}
            ];

            this.QDocu_T_untersuchungsnummer = [
                {validator: this._QDocu_T_untersuchungsnummer, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_untersuchung = [
                {validator: this._QDocu_T_untersuchung, msg: MISSING_MANDATORY_VALUE}
            ];

            // ZKH

            this.QDocu_T_pznvorhanden = [
                {validator: this._QDocu_T_pznvorhanden, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_produkt = [
                {validator: this._QDocu_T_produkt, msg: Y.Lang.sub( SIMPLE_INVALID_LENGTH_VALUE, {min: 1, max: 32} )}
            ];

            this.QDocu_T_pzn = [
                {validator: this._QDocu_T_pzn, msg: Y.Lang.sub( INVALID_LENGTH_VALUE_NUMBER, {num: 8} )}
            ];

            this.QDocu_T_hpvtergebnis = [
                {validator: this._QDocu_T_hpvtergebnis, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_mandatoryOnZKH, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvorunt = [
                {validator: this._QDocu_T_mandatoryOnZKA, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_zytbefundvorunt, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_hpvtvoruntvorhand = [
                {validator: this._QDocu_T_mandatoryOnZKA, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_hpvtvoruntvorhand, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_histologvorbefundvorunt = [
                {validator: this._QDocu_T_histologvorbefundvorunt, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zervixeinstellbar = [
                {validator: this._QDocu_T_zervixeinstellbar, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_kolposkbefund = [
                {validator: this._QDocu_T_mandatoryOnZKA, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_massnahmen = [
                {validator: this._QDocu_T_mandatoryOnZKA, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_empfohlenemassnahmebiops = [
                {validator: this._QDocu_T_mandatoryOnZKA, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_plz3stellig = [
                {validator: this._QDocu_T_plz3stellig, msg: Y.Lang.sub( INVALID_LENGTH_VALUE_NUMBER, {num: 5} )}
            ];

            this.QDocu_T_hpvimpfung = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_herkunftimpfstatus = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_artuanlunt = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_befundevoruntvorh = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_graviditaet = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_klinischerbefund = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_hpvtest = [
                {validator: this._QDocu_T_hpvtest, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_empfohlenemassnahme = [
                {validator: this._QDocu_T_mandatoryOnZKP, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_methoabstrentnahme = [
                {validator: this._QDocu_T_mandatoryOnZKZ, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefund = [
                {validator: this._QDocu_T_mandatoryOnZKZ, msg: MISSING_MANDATORY_VALUE}
            ];

            // ZKZ
            this.QDocu_T_zytbefund01 = [
                {validator: this._QDocu_T_zytbefund01, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundii = [
                {validator: this._QDocu_T_zytbefundii, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundiii = [
                {validator: this._QDocu_T_zytbefundiii, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundiiid = [
                {validator: this._QDocu_T_zytbefundiiid, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundiv = [
                {validator: this._QDocu_T_zytbefundiv, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundv = [
                {validator: this._QDocu_T_zytbefundv, msg: MISSING_MANDATORY_VALUE}
            ];

            // ZKP
            this.QDocu_T_hpvvirustyp = [
                {validator: this._QDocu_T_hpvvirustyp, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_welchhpvtyp = [
                {validator: this._QDocu_T_welchhpvtyp, msg: MISSING_MANDATORY_VALUE}
            ];

            // ZKA
            this.QDocu_T_zytbefundvorunt01 = [
                {validator: this._QDocu_T_zytbefundvorunt01, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvoruntii = [
                {validator: this._QDocu_T_zytbefundvoruntii, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvoruntiii = [
                {validator: this._QDocu_T_zytbefundvoruntiii, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvoruntiiid = [
                {validator: this._QDocu_T_zytbefundvoruntiiid, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvoruntiv = [
                {validator: this._QDocu_T_zytbefundvoruntiv, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zytbefundvoruntv = [
                {validator: this._QDocu_T_zytbefundvoruntv, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_hpvtvorbefund = [
                {validator: this._QDocu_T_hpvtvorbefund, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_hpvvirustypvorbefund = [
                {validator: this._QDocu_T_hpvvirustypvorbefund, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_pzgsichtbar = [
                {validator: this._QDocu_T_pzgsichtbar, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_tztyp = [
                {validator: this._QDocu_T_tztyp, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_normalbefund = [
                {validator: this._QDocu_T_normalbefund, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_gradabnbefunde = [
                {validator: this._QDocu_T_gradabnbefunde, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_verdachtais = [
                {validator: this._QDocu_T_verdachtais, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_lokalabnbefunde = [
                {validator: this._QDocu_T_lokalabnbefunde, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_groesselaesion = [
                {validator: this._QDocu_T_groesselaesion, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_verdachtinvasion = [
                {validator: this._QDocu_T_verdachtinvasion, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_weiterebefunde = [
                {validator: this._QDocu_T_weiterebefunde, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_kongenanomalie = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_kondylome = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_endometriose = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_ektoendopolypen = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_entzuendung = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_stenose = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_postopveraend = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_sonstweitbefunde = [
                {validator: this._QDocu_T_weiterebefunde1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];


            this.QDocu_T_sonstbefunde = [
                {validator: this._QDocu_T_sonstweitbefundeMandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_sonstbef = [
                {validator: this._QDocu_T_sonstbef, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_karzinomtyp = [
                {validator: this._QDocu_T_karzinomtyp, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_karzinomtyp2 = [
                {validator: this._QDocu_T_karzinomtyp2, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_anzahlbiopsien = [
                {validator: this._QDocu_T_anzahlbiopsien, msg: Y.Lang.sub( SIMPLE_INVALID_LENGTH_VALUE, {min: 1, max: 2} )}
            ];

            this.QDocu_T_befundbiopskueret = [
                {validator: this._QDocu_T_befundbiopskueret, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_histobef = [
                {validator: this._QDocu_T_histobef, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_sonstbefbiopskueret = [
                {validator: this._QDocu_T_sonstbefbiopskueret, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_metaplasievorgaenge = [
                {validator: this._QDocu_T_befundbiopskueret2Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_adenocarcinomainsitu = [
                {validator: this._QDocu_T_befundbiopskueret2Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_invasivplattenepithelkarz = [
                {validator: this._QDocu_T_befundbiopskueret2Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_invasivadenokarz = [
                {validator: this._QDocu_T_befundbiopskueret2Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_sonstmetaplasiebefunde = [
                {validator: this._QDocu_T_befundbiopskueret2Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_empfohlenekontrabkl = [
                {validator: this._QDocu_T_empfohlenekontrabkl, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zeithorizontkontrabkl = [
                {validator: this._QDocu_T_zeithorizontkontrabkl, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_zeithorizont = [
                {validator: this._QDocu_T_zeithorizont, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_zeithorizontMonth, msg: Y.Lang.sub( SIMPLE_INVALID_LENGTH_VALUE, {min: 1, max: 2} )}
            ];

            this.QDocu_T_therapieempfehlung = [
                {validator: this._QDocu_T_therapieempfehlung, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_op = [
                {validator: this._QDocu_T_op, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_opeingriff = [
                {validator: this._QDocu_T_opeingriff, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_sonstopeingr = [
                {validator: this._QDocu_T_sonstopeingr, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_weiteretherapieempf = [
                {validator: this._QDocu_T_weiteretherapieempf, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_opdatum = [
                {validator: this._QDocu_T_opdatum, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_opdatumDate, msg: DATE_ERR}
            ];

            this.QDocu_T_artopeingriff = [
                {validator: this._QDocu_T_artopeingriff, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_endhistolbefundvorh = [
                {validator: this._QDocu_T_endhistolbefundvorh, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_methokonisation = [
                {validator: this._QDocu_T_methokonisation, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_tiefekonus = [
                {validator: this._QDocu_T_tiefekonus, msg: 2021 === getMoment()( this.datumunt ).year() ?  INVORRECT_VALUE_FORMAT_2021 : INVORRECT_VALUE_FORMAT}
            ];

            this.QDocu_T_methoexzision = [
                {validator: this._QDocu_T_methoexzision, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_umfangexzision = [
                {validator: this._QDocu_T_umfangexzision, msg: 2021 === getMoment()( this.datumunt ).year() ?  INVORRECT_VALUE_FORMAT_2021 : INVORRECT_VALUE_FORMAT}
            ];

            this.QDocu_T_sonstopeingr2 = [
                {validator: this._QDocu_T_sonstopeingr2, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_grading = [
                {validator: this._QDocu_T_endhistolbefundvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_stagingfigo = [
                {validator: this._QDocu_T_endhistolbefundvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_residualstatus = [
                {validator: this._QDocu_T_residualstatus, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_tnmpt = [
                {validator: this._QDocu_T_endhistolbefundvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_tnmpn = [
                {validator: this._QDocu_T_endhistolbefundvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_tnmpm = [
                {validator: this._QDocu_T_endhistolbefundvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            // ZKP
            this.QDocu_T_herkunftergebvoru = [
                {validator: this._QDocu_T_befundevoruntvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_voruntdatum = [
                {validator: this._QDocu_T_befundevoruntvorh1Mandatory, msg: MISSING_MANDATORY_VALUE},
                {validator: this._QDocu_T_befundevoruntvorhRelatedDate, msg: DATE_ERR_MM_YYYY}
            ];

            this.QDocu_T_zytbefundvoruntvorh = [
                {validator: this._QDocu_T_befundevoruntvorh1Mandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_anamabweichvorunt = [
                {validator: this._QDocu_T_anamabweichvorunt, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_ausflusspathblutung = [
                {validator: this._QDocu_T_artuanluntAndAusflusspathblutungMandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_uip = [
                {validator: this._QDocu_T_artuanluntAndAusflusspathblutungMandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_hormonanwendungen = [
                {validator: this._QDocu_T_artuanluntAndAusflusspathblutungMandatory, msg: MISSING_MANDATORY_VALUE}
            ];

            this.QDocu_T_gynopradiatio = [
                {validator: this._QDocu_T_artuanluntAndAusflusspathblutungMandatory, msg: MISSING_MANDATORY_VALUE}
            ];
        }

        //
        //
        // ****************** VALIDATION FUNCTIONS ********************

        DCValidations.prototype._rangeInteger = function _rangeInteger( val, fromIncl, toIncl ) {
            // rely on user to include Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY
            var
                test = Math.floor( +(val) ); // convert to a number
            if( test !== +(val) ) {
                // differ by a decimal place...
                return false;
            }
            return (fromIncl <= test) && (test <= toIncl);
        };
        DCValidations.prototype._notEmptyArray = function( val ) {
            return val && val.length && !val.some( function( item ) { return null === item || undefined === item; } );
        };
        /**
         * test range for any Number
         * @param {Number|*} val
         * @param {Number} fromIncl
         * @param {Number} toIncl
         * @return {boolean}
         */
        DCValidations.prototype._rangeNumber = function _rangeNumber( val, fromIncl, toIncl ) {
            val = parseFloat( val );
            if( isNaN( val ) ) {
                return false;
            }
            return (fromIncl <= val) && (val <= toIncl);
        };
        DCValidations.prototype._lengthString = _lengthString;
        // allow hours 0-23
        DCValidations.prototype._hourNum = function _hourNum( val ) {
            return validationLibrary._rangeInteger( val, 0, 23 );
        };
        DCValidations.prototype._Settings_T_timeoutDelay = function _Settings_T_timeoutDelay( val ) {
            return validationLibrary._rangeInteger( val, 1, 60 );
        };

        DCValidations.prototype._Settings_T_accountBanDelay = function _Settings_T_accountBanDelay( val ) {
            return validationLibrary._rangeInteger( val, 3, 100 );
        };

        DCValidations.prototype._Settings_T_externalPrescriptionSoftwareUrl = function _Settings_T_accountBanDelay( val ) {
            return !this.useExternalPrescriptionSoftware || ( val && val.search( '{kid}' ) > -1 );
        };

        DCValidations.prototype._Settings_T_smtpEmailFrom = function _Settings_T_timeoutDelay( val ) {
            return val || !this.smtpPassword && !this.smtpUserName && !this.smtpSsl && !this.smtpHost && !this.smtpPort;
        };
        // allow minutes 0-59
        DCValidations.prototype._minuteNum = function _minuteNum( val ) {
            return validationLibrary._rangeInteger( val, 0, 59 );
        };
        // allow months
        DCValidations.prototype._monthNum = function _monthNum( val ) {
            return validationLibrary._rangeInteger( val, 1, 12 );
        };
        // allow years
        DCValidations.prototype._year = function _year( val ) {
            if( !val ) {
                return false;
            }
            var date = getMoment()( val, 'YYYY' );
            return date && date.isValid();
        };
        // number in the range 1-99
        DCValidations.prototype._oneToNinetyNine = function _oneToNinetyNine( val ) {
            if( !val || isNaN( val ) ) {
                return false;
            }
            return validationLibrary._rangeInteger( val, 1, 99 );
        };
        DCValidations.prototype._Schedule_T_userDescr = function _Schedule_T_userDescr( val ) {
            var
                calendarId = this.calendar;

            // check for a valid id
            if( validationLibrary._objectId( calendarId ) ) {
                // check not isDoctorCalendar
                if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( calendarId ) &&
                    !Y.doccirrus.schemas.calendar.isResourceCalendar( calendarId ) &&
                    !val && !this.closeTime ) {
                    return false;
                }
            }

            return true;

        };
        DCValidations.prototype._Schedule_T_end = function _Schedule_T_end( val ) {
            var
                allDay = this.allDay;
            if( allDay ) {
                return true;
            }
            return validationLibrary._mandatory( val );

        };
        DCValidations.prototype._Recurrence_T_until = function _Schedule_T_end() {
            var dtstart = this.dtstart || 0,
                until = this.until || null,
                moment = getMoment();

            if( 0 > moment( until ).diff( dtstart ) ) {
                return false;
            } else if( 'NONE' !== this.repetition && null === until ) {
                return false;
            }
            return true;
        };
        DCValidations.prototype._resourceCapacity = function _resourceCapacity( val ) {
            return validationLibrary._rangeInteger( val, 1, 1000 );
        };
        DCValidations.prototype._Assistive_T_assDescription = function _Assistive_T_assDescription( val ) {
            if( 'ASSISTIVE' !== this.actType ) {
                return true;
            }
            return validationLibrary._mandatory( val );
        };
        DCValidations.prototype._validNumber = function _validNumber( val ) {
            if( 0 !== val && !val ) {
                return false;
            }
            val = Number( val );
            return !isNaN( val ) && typeof val === 'number' || val instanceof Number;
        };
        DCValidations.prototype._validNumberOrEmpty = function _validNumber( val ) {
            if( !val && 0 !== val ) {
                return true;
            }
            return validationLibrary._validNumber( val );
        };
        // allow years within the next decade
        DCValidations.prototype._yearFutureD = function _yearFutureD( val ) {
            var date = new Date();
            return validationLibrary._rangeInteger( val, date.getFullYear(), date.getFullYear() + 10 );
        };
        // allow years within the next century
        DCValidations.prototype._yearFutureC = function _yearFutureC( val ) {
            var date = new Date();
            return validationLibrary._rangeInteger( val, date.getFullYear(), date.getFullYear() + 100 );
        };
        // allow only realist DOB years
        DCValidations.prototype._yearDOB = function _yearDOB( val ) {
            var date = new Date();
            return validationLibrary._rangeInteger( val, date.getFullYear() - 140, date.getFullYear() );
        };
        // allow only realistic date ranges
        DCValidations.prototype._dateRange = function _dateRange( from, to ) {
            var
                fromMoment = getMoment()( from ),
                toMoment = getMoment()( to );
            if( !from || !to || !fromMoment.isValid() || !toMoment.isValid() ) {
                return false;
            }
            return fromMoment.isBefore( toMoment );
        };

        /**
         * checks if a date is between dates
         * @param {moment|string} date the date to check in range of from and to
         * @param {moment|string} from date of range start
         * @param {moment|string} to date of range end
         * @returns {Boolean}
         */
        DCValidations.prototype._dateBetween = function _dateBetween( date, from, to ) {
            var
                momentDate = getMoment()( date ),
                momentFrom = getMoment()( from ),
                momentTo = getMoment()( to );
            if( !date || !from || !to || !momentDate.isValid() || !momentFrom.isValid() || !momentTo.isValid() ) {
                return false;
            }
            /*if (momentDate.isSame(momentFrom) || momentDate.isSame(momentTo)) {
             return true;
             }*/
            return momentDate.isAfter( momentFrom ) && momentDate.isBefore( momentTo );
        };
        /// do NOT allow date in the future
        DCValidations.prototype._pastOrPresentDate = function _pastOrPresentDate( val ) {
            var
                moment = getMoment(),
                date;
            if( !val ) {
                return false;
            }
            date = moment( val );
            if( !date.isValid() ) {
                return false;
            }
            return date.isBefore( moment().endOf( 'day' ) );
        };
        /// do NOT allow date in the past
        DCValidations.prototype._futureOrToday = function _futureOrToday( val ) {
            var
                moment = getMoment(),
                momentVal = moment( val ),
                today = moment().startOf( 'day' ),
                isSame = today.isSame( momentVal ),
                isBefore = today.isBefore( momentVal ),
                isValid = isSame || isBefore;
            return isValid;
        };
        DCValidations.prototype._mandatory = function _mandatory( val ) {
            switch( Y.Lang.type( val ) ) {
                case 'array':
                    return Boolean( val.length );
                case 'string':
                    return Boolean( val.length );
            }
            return Y.Lang.isValue( val );
        };
        DCValidations.prototype._notEmpty = function _notEmpty( val ) {
            switch( Y.Lang.type( val ) ) {
                case 'array':
                    return Boolean( val.length );
                case 'string':
                    return Boolean( val.length );
                case 'object':
                    return !Y.Object.isEmpty( val );
            }
            return Y.Lang.isValue( val );
        };
        DCValidations.prototype._guid = function _guid( val ) {
            return val && !!val.match( /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/ );
        };
        DCValidations.prototype._quarter = function _quarter( val ) {
            return val && !!val.match( /[0-9]{4}-[1-4]/ );
        };
        DCValidations.prototype._objectId = function _objectId( val ) {
            return val && !!val.toString().match( /[a-fA-F0-9]{24}/ );
        };
        DCValidations.prototype._email = function _email( val ) {
            return null !== Y.doccirrus.regexp.emailUmlauts.exec( val );
        };

        DCValidations.prototype._phone = function _phone( val ) {
            return null !== Y.doccirrus.regexp.phoneNumber.exec( val );
        };
        DCValidations.prototype._fax = function _fax( val ) {
            return null !== Y.doccirrus.regexp.phoneNumber.exec( val );
        };
        DCValidations.prototype._emailOrEmpty = function _emailOrEmpty( val ) {
            return !val ||
                   validationLibrary._email( val );
        };

        DCValidations.prototype._phoneOrEmpty = function _phoneOrEmpty( val ) {
            return !val ||
                   null !== Y.doccirrus.regexp.phoneNumber.exec( val );
        };
        DCValidations.prototype._faxOrEmpty = function _faxOrEmpty( val ) {
            return !val ||
                   null !== Y.doccirrus.regexp.phoneNumber.exec( val );
        };
        DCValidations.prototype._urlOrEmpty = function _urlOrEmpty( val ) {
            var valI;
            valI = val ? val.toLowerCase() : '';

            return !val ||
                   validationLibrary._url( valI );
        };
        DCValidations.prototype._scheduleDuration = function _scheduleDuration( val ) {
            if( this.allDay || this.consult || this.closeTime ) {
                return true;
            }
            if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( this.calendar ) ) {
                return parseInt( val, 10 ) > 0;
            }
            return parseInt( val, 10 ) > 0 && parseInt( val, 10 ) <= 7200;
        };

        DCValidations.prototype._scheduleCapacity = function _scheduleCapacity( val ) {
            if( (!this.isPreconfigured && (!val || 0 === +val)) ) {
                return true;
            }
            return parseInt( val, 10 ) > 0 && parseInt( val, 10 ) <= Y.doccirrus.schemas.scheduletype.MAX_CAPACITY;
        };

        DCValidations.prototype._scheduleNumberOfSuggestedAppointments = function _scheduleCapacity( val ) {
            return parseInt( val, 10 ) > 0 && parseInt( val, 10 ) <= Y.doccirrus.schemas.scheduletype.MAX_NUMBER_OF_SUGGESTED_APPOINTMENTS;
        };

        DCValidations.prototype._zip4 = function _zip4( val ) {
            return null !== /^([0-9]{4})$/.exec( val );
        };

        DCValidations.prototype._zip5 = function _zip5( val ) {
            return null !== /^([0-9]{5})$/.exec( val );
        };
        DCValidations.prototype._zipLess10 = function _zipLess10( val ) {
            return null !== /^([0-9]{0,10})$/.exec( val );
        };
        DCValidations.prototype._zip = function _zip() {
            return validationLibrary._zip5 || validationLibrary._zip4;
        };

        DCValidations.prototype._euroalpha = function _euroalpha( val ) {
            return null !== /^[a-zA-ZÂÀÅÃâàåãáÄäÇçÉÊÈËéêèëíÓÔÒÕØóôòõÖöŠšßÚÛÙúûùÜüÝŸýÿŽžľť]+$/.exec( val );
        };

        DCValidations.prototype._numRangeString = function _num( val ) {
            var x, y, result = /^(\d{1,3})(-\d{1,3})?$/.exec( val );
            if( !val || 'UTILITY' !== this.actType ) {
                return true;
            } // not mandatory
            if( !result ) {
                return false;
            }
            x = Number( result[1] );
            y = Number( result[2] );
            if( isNaN( x ) ) {
                return false;
            }
            if( (x && !y) ||
                (x < -y)   // the until sign '-' turns y into a negative number...
            ) {
                return true;
            }
            return false;
        };

        DCValidations.prototype._recurrence_T_interval = function _num( val ) {
            if( 'NONE' === this.repetition && !val ) {
                return true;
            }
            return null !== /^(\d)+$/.exec( val );
        };

        DCValidations.prototype._num = function _num( val ) {
            return null !== /^(\d)+$/.exec( val );
        };


        DCValidations.prototype._numOrEmpty = function _num( val ) {
            return !val ||
                   null !== /^(\d)+$/.exec( val );
        };

        DCValidations.prototype._gt0 = function _num( val ) {
            //Greater than zero
            return null !== /^[1-9]\d*$/.exec( val );
        };


        DCValidations.prototype._uppercaseAlphanum = function _phone( val ) {
            return null !== /^[A-Z0-9]+$/g.exec( val );
        };

        DCValidations.prototype._euroalphanum = function _euroalphanum( val ) {
            return null !== /^[0-9a-zA-ZÂÀÅÃâàåãáÄäÇçÉÊÈËéêèëíÓÔÒÕØóôòõÖöŠšßÚÛÙúûùÜüÝŸýÿŽžľť]+$/.exec( val );
        };

        DCValidations.prototype._euroalphanumDotAt = function _euroalphanumDotAt( val ) {
            return null !== /^[0-9a-zA-ZÂÀÅÃâàåãáÄäÇçÉÊÈËéêèëíÓÔÒÕØóôòõÖöŠšßÚÛÙúûùÜüÝŸýÿŽžľť@.\-_+]+$/.exec( val );
        };

        DCValidations.prototype._euroalphanumDotAtCol = function _euroalphanumDotAtCol( val ) {
            return null !== /^[0-9a-zA-ZÂÀÅÃâàåãáÄäÇçÉÊÈËéêèëíÓÔÒÕØóôòõÖöŠšßÚÛÙúûùÜüÝŸýÿŽžľť@.:\/\\\-_+]+$/.exec( val );
        };

        DCValidations.prototype._euroalphanumspac = function _euroalphanumspac( val ) {
            return null !== /^[0-9a-zA-ZÂÀÅÃâàåãáÄäÇçÉÊÈËéêèëíÓÔÒÕØóôòõÖöŠšßÚÛÙúûùÜüÝŸýÿŽžľť ]+$/.exec( val );
        };

        DCValidations.prototype._url = function _url( val ) {
            var valI;
            valI = val ? val.toLowerCase() : '';
            return null !== /^(https?:\/\/)?([\da-z\.\-]+)\.([a-z]{2,16})\b([\/\w \?=.\-]*)*\/?$/.exec( valI );
        };
        DCValidations.prototype._iban = function _iban( val ) {
            val = val || null; // Prevent casting undefined to string
            return null !== /^(([a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{11,30})|([0-9]{10,12}))$/.exec( val ); // Previous regex that was blocking some BICs
        };

        DCValidations.prototype._bic = function _bic( val ) {
            if( undefined === val ) {
                return false;
            }
            return null !== /^[a-zA-Z0-9]{8,11}$/.exec( val );
            // return null !== /^(([a-zA-Z]{6}[2-9a-zA-Z]{2}[a-zA-Z0-9]{0,3})|[0-9]{5,8})$/.exec( val );
        };

        DCValidations.prototype._floatNumber = function _decNumber( val ) {
            if( !val && 0 !== val ) {
                return false;
            }
            return null !== /^\d+(\.\d{1,2})?$/.exec( val );
        };

        DCValidations.prototype._decNumber = function _decNumber( val ) {
            if( !val ) {
                return true;
            }
            return null !== /^\d+(\.\d{1,2})?$/.exec( val );
        };

        DCValidations.prototype._decNumberNegative = function _decNumberNegative( val ) {
            if( !val ) {
                return true;
            }
            return null !== /^\-?\d+(\.\d{1,2})?$/.exec( val );
        };

        /**
         * only works for required fields which are not empty!
         * @param val
         * @returns {boolean}
         * @private
         */
        DCValidations.prototype._date = function _date( val ) {
            var
                momentVal = getMoment()( val );
            return Boolean( val && momentVal.isValid() );
        };

        DCValidations.prototype._dateDDMMYYYY = function _dateDDMMYYYY( val ) {
            var
                momentVal = getMoment()( val, 'DD.MM.YYYY' );
            return Boolean( val && momentVal.isValid() );
        };

        DCValidations.prototype._time = function _time( val ) {
            var
                momentVal = getMoment()( val, 'hh:mm' );
            return Boolean( val && momentVal.isValid() );
        };

        DCValidations.prototype._timeNotRequired = function _timeNotRequired( val ) {
            if( !val ) {
                return true;
            }
            // note: type="time" really needs HH:mm - for moment its fine to get a h:mm
            return validationLibrary._time( val ) && (null !== /^\d{2}:\d{2}$/.exec( val ));
        };

        DCValidations.prototype._dateNotRequired = function _dateNotRequired( val ) {
            //as empty values are allowed, empty is true
            if( !val ) {
                return true;
            }
            return validationLibrary._date( val );
        };

        DCValidations.prototype._lanr = function _lanr( val ) {
            var i,
                sum = 0,
                checkNo,
                calcCheckNo,
                id,
                isAsvPseudoNo;

            if( null === /^([0-9]{9})$/.exec( val ) ) {
                return false;
            }

            isAsvPseudoNo = null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( val );

            if( isAsvPseudoNo ) {
                return true;
            }
            checkNo = +val.substring( 6, 7 );
            id = val.substring( 0, 6 );
            for( i = 0; i < id.length; i++ ) {
                sum += (+id[i] * ((i % 2) ? 9 : 4));
            }
            calcCheckNo = Math.abs( ( sum % 10) - 10 );
            if( 10 === calcCheckNo ) {
                calcCheckNo = 0;
            }
            return (calcCheckNo === checkNo);
        };

        DCValidations.prototype._bsnr = function _bsnr( val ) {
            return null !== /^([0-9]{9})$/.exec( val );
        };

        DCValidations.prototype._eanNumber = function _eanNumber( val ) {
            return null !== /^([0-9]{13})$/.exec( val );
        };

        DCValidations.prototype._inpacsmodality_T_name = function _inpacsmodality_T_name( val ) {
            return null !== Y.doccirrus.regexp.modalityName.exec( val );
        };

        DCValidations.prototype._regex = function _regex( val ) {
            try {
                new RegExp( val, "g" ); //eslint-disable-line
                return true;
            } catch( e ) {
                return false;
            }
        };

        DCValidations.prototype._esrNumber = function _esrNumber( val ) {
            return val && val.length === 9 && null !== /01[0-9]{7}/.exec(val);
        };

        DCValidations.prototype._quantityOrdered = function _quantityOrdered( val ) {
            if( !this.quantityDelivered ) {
                //Greater than zero
                return validationLibrary._gt0( val );
            }
            return true;
        };

        /**
         * Type and value must be validated together.
         * @param val
         * @return Boolean
         * @constructor
         */
        DCValidations.prototype._Communication_T_type = function _Communication_T_type() {
            return Y.doccirrus.validations.common._Communication_T_value.call( this, this.value );
        };
        DCValidations.prototype._Communication_T_value = function _Communication_T_value( val ) {
            // bug in mongoose, sends incorrect this, sometimes: MOJ-1428
            // fix for MOJ-1325
            if( this.communications ) {
                return true;
            }
            // this.type refers to the type of communication value.
            switch( this.type ) {
                case "PHONEPRIV":
                case "FAXPRIV":
                case "MOBILEPRIV":
                case "PHONEJOB":
                case "FAXJOB":
                case "MOBILEJOB":
                case 'PHONEEMERGENCY':
                    return validationLibrary._phone( val );
                case "EMAILPRIV":
                case "EMAILJOB":
                    return validationLibrary._email( val );
                case "FACEBOOK":
                case "GOOGLE":
                case "LINKEDIN":
                case "XING":
                case "URL":
                    return validationLibrary._url( val );
                case "OTHER":
                    return validationLibrary._notEmpty( val );
                case "PHONEEXT":
                    return true;
            }
            return false;
        };

        DCValidations.prototype._Address_T_street = function _Address_T_street( val ) {
            if( this.kind && 'POSTBOX' === this.kind ) {
                return true;
            }
            // TODO: MOJ-1428
            if( this.addresses ) {
                return true;
            }
            if( !this.postbox ) {
                if( this.countryCode && ( 'CH' === this.countryCode || 'D' === this.countryCode ) ) {
                    return validationLibrary._mandatory( val ) && _lengthString( val, 0, 46 );
                }
                return _lengthString( val, 0, 46 );
            }
            return true;
        };

        DCValidations.prototype._Address_CH_T_cantonCode = function _Address_CH_T_cantonCode( val ) {
            if( this.countryCode && 'CH' === this.countryCode ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._Address_T_houseno = function _Address_T_houseno( val ) {
            if( this.kind && 'POSTBOX' === this.kind ) {
                return true;
            }
            return _lengthString( val, 0, 9 );
        };

        DCValidations.prototype._Address_T_housenoMandatory = function _Address_T_houseno( val ) {
            if( this.countryCode && 'CH' === this.countryCode ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._Contact_T_communications = function _Contact_T_communications() {
            var communications = this.communications;
            return communications.some( function( communication ) {
                var type = communication.type;
                if( 'EMAILPRIV' === type || 'EMAILJOB' === type ) {
                    return true;
                }
                return false;
            } );
        };

        DCValidations.prototype._Company_T_addresses = function _Company_T_addresses() {
            var addresses = this.addresses;
            return 0 !== addresses.length;
        };

        DCValidations.prototype._Treatment_T_linkedPercentage = function _Treatment_T_linkedPercentage( val ) {
            return !val || 25 >= val;
        };

        DCValidations.prototype._Treatment_CH_T_side = function _Treatment_CH_T_side( val ) {
            return !this.sideMandatory || val;
        };
        DCValidations.prototype._reasonType_CH_T = function _reasonType_CH_T( val ) {
            return validationLibrary._mandatory( val );
        };

        DCValidations.prototype._Company_T_customerNo = function _Company_T_customerNo() {

            var customerNo = this.customerNo || "";
            if( this.serverType === Y.doccirrus.schemas.company.serverTypes.PRC ) {
                return true;
            } else {
                return validationLibrary._mandatory( customerNo );
            }

        };

        DCValidations.prototype._Company_T_vprcFQHostName = function _Company_T_vprcFQHostName() {

            var vprcFQHostName = this.vprcFQHostName || "";

            if( ( ( Y.doccirrus.auth.isDCPRC() && Y.doccirrus.schemas.company.serverTypes.VPRC === this.serverType && '0' === this.tenantId) ||
                ( Y.doccirrus.auth.isVPRCAdmin() && '0' === this.tenantId ) ) && Y.doccirrus.schemas.company.systemTypes.APPLIANCE === this.systemType ) {
                if( vprcFQHostName.length > 255 ) {
                    return false;
                }
                return null !== Y.doccirrus.regexp.vprcFQHostName.exec( vprcFQHostName );
            }
            return true;
        };

        DCValidations.prototype.Company_T_systemId = function Company_T_systemId() {
            var systemId = this.systemId;
            if( this.commissionKey && '0' === this.tenantId ) {
                return validationLibrary._mandatory( systemId ) && validationLibrary._uppercaseAlphanum( systemId );
            }
            // if( this.serverType === Y.doccirrus.schemas.company.serverTypes.PRC ) {
            //     return validationLibrary._mandatory( systemId );
            // }
            return true;
        };
        /**
         * Check for postalcode only if the address is the country of the configured countryMode. KAP-94
         * @param val
         * @returns {boolean|*}
         * @private
         */
        DCValidations.prototype._Address_T_zip = function _Address_T_zip( val ) {
            var
                countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs();

            if( this.addresses ) {
                return true;
            }

            if( this.countryCode === countryMode[0] ) {
                switch( this.countryCode ) {
                    case 'D':
                        return validationLibrary._mandatory( val ) && validationLibrary._zip5( val );
                    case 'CH':
                        return validationLibrary._mandatory( val ) && validationLibrary._zip4( val );
                    default:
                        return true;
                }
            }
            return true;
        };

        DCValidations.prototype._Address_T_postbox = function _Address_T_postbox( val ) {
            if( this.kind && 'POSTBOX' === this.kind ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };
        DCValidations.prototype._Person_T_dob = function _Person_T_dob( val ) {
            if( undefined === val || null === val ) {
                return false;
            }

            var
                moment = getMoment(),
                dob = moment( val );

            // different formats are passed to this function...
            if( !dob || !dob.isValid() ) {
                dob = moment( val, 'DD.MM.YYYY', true );
            }
            // invalid value if it is still no date object
            if( !dob ) {
                return false;
            }

            // allow only realist DOB years
            if( dob.isValid() && 140 > Math.abs( moment().diff( dob, 'years' ) ) ) {
                return true;
            }

            return false;
        };

        DCValidations.prototype._Person_T_dateOfDeath = function( val ) {

            var
                moment = getMoment(),
                dateOfDeath = moment( val ),
                dob = this.dob;

            if( val ) {
                return validationLibrary._date( val ) && dateOfDeath.isAfter( dob );
            }
            return true;
        };

        DCValidations.prototype._Patient_T_patientSince = function( val ) {
            if( val ) {
                return validationLibrary._date( val );
            }
            return true;
        };

        DCValidations.prototype._Patient_T_gender_CH = function _Patient_T_gender_CH( val ) {
            return !val || ['MALE', 'FEMALE'].indexOf( val ) > -1;
        };
        DCValidations.prototype._Patient_T_talk_CH = function _Patient_T_talk_CH( val ) {
            return !val || ['MR', 'MS'].indexOf( val ) > -1;
        };

        DCValidations.prototype._PatientAlert_T_emailOrPhone = function _PatientAlert_T_emailOrPhone() {
            var
                result = ( validationLibrary._email( this.email ) && '' === this.mobile ) ||
                         ( validationLibrary._phone( this.mobile ) && '' === this.email ) ||
                         ( validationLibrary._email( this.email ) && validationLibrary._phone( this.mobile ) );
            if( 'wantsAlert' !== this.wantsAlert ) {
                return true;
            }
            Y.log( '_PatientAlert_T_emailOrPhone ' + result, 'debug', NAME );
            return result;
        };

        DCValidations.prototype._PatientAlert_T_praxid = function _PatientAlert_T_praxid( val ) {
            return null !== /^(\d){1,8}$/.exec( val );
        };
        DCValidations.prototype._PatientAlert_T_waitno = function _PatientAlert_T_waitno( val ) {
            return null !== /^(\d){1,5}$/.exec( val );
        };

        DCValidations.prototype._Patient_T_asvTeamNumbers = function _Patient_T_asvTeamNumbers( val ) {
            if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.ASV === this.partnerId ) {
                return val && 0 < val.length;
            } else {
                return true;
            }
        };

        /**
         * BankAccount_T fields have multiple dependencies
         * @param val
         * @constructor
         */
        DCValidations.prototype._BankAccount_T = function _BankAccount_T( val ) {
            var
                ok = true;
            if( !val || 'bitte wählen' === val ) {
                // not required!
                // this is required if field is visible
                ok = true;
            } else if( 'BANK' === val ) {
                // if bank account check these...
                if(
                    !(
                        this.bankName &&
                        this.accountOwner &&
                        this.bankBIC &&
                        this.bankIBAN
                    ) ||
                    this.trial ) {
                    ok = false;
                }
            } else {
                // val ===
                //                    "EC"
                //                    "VISA",
                //                    "MASTER",
                //                    "AMEX",
                //                    "OTHERCC",
                // if credit card check these fields
                if(
                    !(
                        this.cardNo &&
                        this.cardValidToMonth &&
                        this.cardValidToYear &&
                        this.cardCheckCode
                    )
                ) {
                    ok = false;
                }
            }
            return ok;
        };
        /**
         * @param cardType
         * @param val
         * @return {Boolean}  should you go ahead and check the value, for a bank field?  Y/N
         */
        function checkBank( cardType ) {
            if( 'BANK' === cardType ) {
                return true;
            }
            return false;
        }

        function checkCC( cardType ) {
            if( !cardType ) {
                return true;
            }
            if( !('BANK' === cardType || 'bitte wählen' === cardType) ) {
                return true;
            }
            return false;
        }

        DCValidations.prototype._BankAccount_T_trial = function _BankAccount_T_trial( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( !val || val > 0 ) {
                return true;
            }
            return false;
        };
        DCValidations.prototype._BankAccount_T_bankName = function _BankAccount_T_bankName( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkBank( this.cardType, val ) ) {
                if( !val ) {
                    return false;
                }
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_bankIBAN = function _BankAccount_T_bankIBAN( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkBank( this.cardType, val ) ) {
                return validationLibrary._iban( val ) || ( 'CH' === this.countryCode && val );
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_bankBIC = function _BankAccount_T_bankBIC( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkBank( this.cardType, val ) ) {
                return validationLibrary._bic( val );
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_accountOwner = function _BankAccount_T_accountOwner( val ) {
            if( this.isOptional || 'CH' === this.countryCode ) {
                return true;
            }

            if( checkBank( this.cardType, val ) ) {
                if( !val ) {
                    return false;
                }
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_cardNo = function _BankAccount_T_cardNo( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkCC( this.cardType, val ) ) {
                if( !val ) {
                    return false;
                }
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_cardCheckCode = function _BankAccount_T_cardCheckCode( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkCC( this.cardType, val ) ) {
                if( !val ) {
                    return false;
                }
                if( 3 > val.length ) {
                    return false;
                }
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_cardValidToMonth = function _BankAccount_T_cardValidToMonth( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkCC( this.cardType, val ) ) {
                return validationLibrary._monthNum( val );
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_cardValidToYear = function _BankAccount_T_cardValidToYear( val ) {
            if( this.isOptional ) {
                return true;
            }

            if( checkCC( this.cardType, val ) ) {
                return validationLibrary._yearFutureD( val );
            }
            return true;
        };
        DCValidations.prototype._BankAccount_T_paymentRequired = function _BankAccount_T_paymentRequired() {
            return this.ps === 'INTIME';
        };
        DCValidations.prototype._Physician_T_officialNo = function _Physician_T_officialNo( val ) {
            if( this.allowNonStandardOfficialNo === true ) {
                return true;
            }
            if( val ) {
                return validationLibrary._lanr( val );
            }
            return true;
        };
        DCValidations.prototype.glnNumber_CH = function glnNumber_CH( val ) {
            // For BaseContacts we only need this GLN check on the Physicians not the therapist or person
            if(this.hasOwnProperty('baseContactType') && this.baseContactType !== "PHYSICIAN") {
                return true;
            } else {
                return !val || validationLibrary._eanNumber( val );
            }

        };
        DCValidations.prototype.phContinuousMed = function phContinuousMed( val ) {
            if( 'MEDICATION' === this.actType && !this.phContinuousMedDate && val ) {
                return false;
            } else {
                return true;
            }

        };
        DCValidations.prototype.phContinuousMedDate = function phContinuousMedDate( val ) {
            if( 'MEDICATION' === this.actType && this.phContinuousMed && (!val || val === " " ) ) {
                return false;
            } else {
                return true;
            }
        };
        /**
         * MOJ-13016: Validation only tests the existence of an input. No format testing yet, as no information about a schema is known.
         * @param {string|number} val
         * @returns {boolean}
         */
        DCValidations.prototype.kNumber_CH = function kNumber_CH( val ) {
            // Dont do this check for basecontacts, only for employees
            if( !this.hasOwnProperty( 'baseContactType' )) {
                if( this.ownZsrNumber ) {
                    return true;
                }
                switch( typeof (val) ) {
                    case "number":
                        val = val.toString();
                    case "string":
                        return val.length > 0;
                }
                return false;
            } else {
                return true;
            }
        };
        DCValidations.prototype.zsrNumber_CH = function zsrNumber_CH( val ) {
            return !val || val.length <= 8;
        };
        DCValidations.prototype.mandatoryIfOwnZsrNumber_CH = function mandatoryIfOwnZsrNumber_CH( val ) {
                return val || !this.ownZsrNumber;
        };
        DCValidations.prototype.mandatoryIfNotOwnZsrNumber_CH = function mandatoryIfNotOwnZsrNumber_CH( val ) {
            if( !this.hasOwnProperty( 'baseContactType' )) {
                return val || this.ownZsrNumber;
            } else {
                return true;
            }
        };
        DCValidations.prototype.mandatoryGlnNumber_CH = function mandatoryGlnNumber_CH( val ) {
            // For BaseContacts we only need this GLN check on the Physicians not the therapist or person
            if(this.hasOwnProperty('baseContactType') && this.baseContactType !== "PHYSICIAN") {
                return true;
            } else {
                return val || this.glnNumber;
            }
        };


        DCValidations.prototype._Settings_T_avwgNo = function _Settings_T_avwgNo( val ) {
            // [VXYZ]/\d{1, 3}/\d{2}(0[1-9]|1[0-2])/(0[1-9]|[1-9]\d)/[0-9A-Za-z]{3}
            if( 'string' !== typeof val || !val.length ) {
                return true;
            }
            return 15 <= val.length && 17 >= val.length;
        };

        DCValidations.prototype._IntimeConfiguration_T_calendarViewDayStartDuration = function _IntimeConfiguration_T_calendarViewDayStartDuration( val ) {
            if( val && Y.Lang.isString( val ) && /\d{2}:\d{2}/.test( val ) ) {
                return true;
            }
            return false;
        };
        DCValidations.prototype._IntimeConfiguration_T_calendarViewDayStartBeforeEnd = function _IntimeConfiguration_T_calendarViewDayStartBeforeEnd( val ) {
            var
                moment = getMoment(),
                calendarViewDayEnd = this.calendarViewDayEnd;

            if( !(DCValidations.prototype._IntimeConfiguration_T_calendarViewDayStartDuration.apply( this, arguments ) && DCValidations.prototype._IntimeConfiguration_T_calendarViewDayEndDuration.apply( this, arguments )) ) {
                return false;
            }
            return moment.duration( val ).asMilliseconds() < moment.duration( calendarViewDayEnd ).asMilliseconds();
        };
        DCValidations.prototype._IntimeConfiguration_T_calendarViewDayEndDuration = function _IntimeConfiguration_T_calendarViewDayEndDuration( val ) {
            if( val && Y.Lang.isString( val ) && /\d{2}:\d{2}/.test( val ) ) {
                return true;
            }
            return false;
        };
        DCValidations.prototype._IntimeConfiguration_T_calendarViewDayEndAfterStart = function _IntimeConfiguration_T_calendarViewDayEndAfterStart( val ) {
            var
                moment = getMoment(),
                calendarViewDayStart = this.calendarViewDayStart;

            if( !(DCValidations.prototype._IntimeConfiguration_T_calendarViewDayStartDuration.apply( this, arguments ) && DCValidations.prototype._IntimeConfiguration_T_calendarViewDayEndDuration.apply( this, arguments )) ) {
                return false;
            }
            return moment.duration( val ).asMilliseconds() > moment.duration( calendarViewDayStart ).asMilliseconds();
        };

        DCValidations.prototype._PadxSetting_T_oneClickPass = function _PadxSetting_T_oneClickPass( val ) {
            if( !this.oneClickName ) {
                return true;
            }
            return validationLibrary._mandatory( val );
        };

        DCValidations.prototype._PadxSetting_T_recipientRZID = function _PadxSetting_T_recipientRZID( val ) {
            var isValidValue = val && (val.length > 0 && val.length < 5) && null !== val.match( /^\d+$/ );
            return (this.encryption || val) ? isValidValue : true;
        };

        DCValidations.prototype._PadxSetting_T_locationsOrPhysicians = function _PadxSetting_T_locationsOrPhysicians() {
            return 0 !== this.locations.length || 0 !== this.employees.length;
        };

        DCValidations.prototype._PadxSetting_T_senderName = function _PadxSetting_T_oneClickPass( val ) {
            return !/<|&|;|>/.exec( val ); //does not contain <>&; which are xml markup
        };

        DCValidations.prototype._PadxSetting_T_participant_allOrNone = function _PadxSetting_T_participant_allOrNone() {
            return ( this.participantName &&
                     this.participantCustomerNumber &&
                     this.participantValue ) ||
                   ( !this.participantName &&
                     !this.participantCustomerNumber  &&
                     !this.participantValue );
        };

        DCValidations.prototype._PadxSetting_T_participant_stringOrNone = function _PadxSetting_T_participant_stringOrNone( val ) {
            if( !val ) {
                return true;
            }
            return validationLibrary._euroalphanumDotAt( val );
        };

        DCValidations.prototype._KvgSetting_T_locationsOrEmployees = function _KvgSetting_T_locationsOrEmployees() {
            return (Array.isArray( this.locations ) && this.locations.length) || (Array.isArray( this.employees ) && this.employees.length);
        };
        DCValidations.prototype._KvgSetting_T_billerEqualToProviderOrBiller = function _KvgSetting_T_billerEqualToProviderOrBiller() {
            return this.billerEqualToProvider || this.biller;
        };

        DCValidations.prototype._ActivitySequence_T_title = function _ActivitySequence_T_title( val ) {
            return validationLibrary._mandatory( val );
        };
        DCValidations.prototype._Task_T_rolesOrCandidates = function _Task_T_rolesOrCandidates() {
            return 0 !== this.roles.length || 0 !== this.candidates.length;
        };
        DCValidations.prototype._base_Database_T_collectionName = function _base_Database_T_collectionName( val ) {
            if( 'database' === this.__polytype ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }

        };
        DCValidations.prototype._base_SerialDevice_T_serialPath = function _base_Database_T_collectionName( val ) {
            if( 'serialdevice' === this.__polytype ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }

        };
        DCValidations.prototype._serialport_T_path = function _serialport_T_path( val ) {

            return validationLibrary._mandatory( val );

        };
        DCValidations.prototype._base_Database_T_apiMethod = function _base_Database_T_apiMethod( val ) {
            if( 'database' === this.__polytype ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }

        };
        DCValidations.prototype._FileType_E_fileType = function _FileType_E_fileType( val ) {
            if( 'file' === this.__polytype ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }

        };
        DCValidations.prototype._EventName_E_eventName = function _EventName_E_eventName( val ) {
            if( 'event' === this.__polytype ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }

        };
        DCValidations.prototype._base_File_T_smbShare = function _base_File_T_smbShare( val ) {
            if( 'file' === this.__polytype && Y.doccirrus.schemas.file.fileTypes.SMBSHARE === this.fileType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_smbUser = function _base_File_T_smbUser( val ) {
            if( 'file' === this.__polytype && Y.doccirrus.schemas.file.fileTypes.SMBSHARE === this.fileType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_filePath = function _base_File_T_filePath( val ) {
            if( 'file' === this.__polytype && !this.noFile ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_smbPw = function _base_File_T_smbPw( val ) {
            if( 'file' === this.__polytype && Y.doccirrus.schemas.file.fileTypes.SMBSHARE === this.fileType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_deviceServer = function _base_File_T_deviceServer( val ) {
            if( 'file' === this.__polytype && Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER === this.fileType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_executeClient = function _base_File_T_executeClient( val ) {
            if( 'file' === this.__polytype && this.executeApp ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_executePath = function _base_File_T_executePath( val ) {
            if( 'file' === this.__polytype && this.executeApp ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._base_File_T_keepFiles = function _base_File_T_keepFiles( val ) {
            if( 'file' === this.__polytype ) {
                return this.triggerManually || !val; //val must be false if triggerManually is false
            } else {
                return true;
            }
        };
        DCValidations.prototype._Shortcut_T_formId = function _Shortcut_T_formId( val ) {
            if( 'FORM' === this.actType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };

        DCValidations.prototype._LabTest_T_head = function ( val ) {

            if( val ) {
                return null !== val.match( /^[a-zA-Z0-9_\. ]*$/g );
            }

            return false;
        };

        DCValidations.prototype._LabTest_T_testResultValOrSampleResultText = function _Shortcut_T_formId() {
            return validationLibrary._mandatory( this.testResultVal ) || validationLibrary._mandatory( this.sampleResultText );
        };

        DCValidations.prototype._Employee_T_pvsCustomerNo = function _Employee_T_pvsCustomerNo( val ) {
            if( !val ) {
                return true;
            }
            return length1To20Validator.validator( val );
        };

        DCValidations.prototype.cashbookId = function cashbookId( val ) {
            return (Y.doccirrus.commonutils.isClientSide() ? !Y.doccirrus.auth.hasAdditionalService( 'inCash' ) : !Y.doccirrus.licmgr.hasAdditionalService( this.user_ && this.user_.tenantId, 'inCash' ))
                   || this.paymentMethod !== 'CASH' || val;
        };

        DCValidations.prototype.nextNumber = function nextNumber( val ) {
            return (!this.locationId && !val) || validationLibrary._num( val );
        };
        //
        //
        // ****************** HELPER FUNCTIONS ********************

        /**
         * Check if a function is a simple (simple val check)
         * or complex (requires binding to 'this' object which
         * has the data required)
         * @param fn
         * @return Boolean
         */
        DCValidations.prototype.isSimple = function( fn ) {
            var
                item;
            if( 'function' === typeof fn ) {
                // iterate through prototype
                for( item in DCValidations.prototype ) {
                    if( DCValidations.prototype.hasOwnProperty( item ) && fn === DCValidations.prototype[item] ) {
                        return null === /^\w*_T_\w*$/.exec( item );
                    }
                }

            }
            return true;
        };

        /**
         * Get Missing Mandatory Message (MMM)
         */
        DCValidations.prototype.getMMM = function() {
            return MISSING_MANDATORY_VALUE;
        };

        /**
         * Get Missing Mandatory Message (mongoose style)
         */
        DCValidations.prototype.getMongooseMandatoryMessage = function() {
            return MONGOOSE_MISSING_MANDATORY_VALUE;
        };

        DCValidations.prototype._mandatoryIfAdditionalLoocation = function( val ) {
            if( this.isAdditionalLocation ) {
                return validationLibrary._mandatory.call( this, val );
            } else {
                return true;
            }
        };
        DCValidations.prototype._username = function( val ) {
            return validationLibrary._mandatory.call( this, val );
        };

        DCValidations.prototype._startDate = function( val ) {
            if( !this.startBudget && !val ) {
                return true;
            } else if( this.startBudget || this.startBudget === 0 ) {
                return validationLibrary._date.call( this, val );
            } else {
                return false;
            }
        };

        DCValidations.prototype._startBudget = function( val ) {
            if( !this.startDate && !val ) {
                return true;
            } else if( this.startDate ) {
                return val === 0 || validationLibrary._validNumber.call( this, val );
            } else {
                return false;
            }
        };

        DCValidations.prototype._WeeklyTime_T_days = function( val ) {
            if( this.repetitionSettings && this.repetitionSettings[0] && 'WEEKLY' !== this.repetitionSettings[0].freq ) {
                return true;
            }
            return validationLibrary._mandatory.call( this, val );
        };

        DCValidations.prototype._Location_T_gkvInvoiceReceiver = function( val ) {
            if( !this.commercialNo || this.isAdditionalLocation ) {
                return true;
            }
            return validationLibrary._mandatory.call( this, val );
        };

        DCValidations.prototype._Location_T_gkvInvoiceReceiverCH = function() {
            // for CH should be always valid
            return true;
        };

        DCValidations.prototype._Patient_T_patientId = function( val ) {
            if( !this.partnerId || ( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DYNAMIC === this.partnerId && !this.isDisabled && !this.patientId ) ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };

        DCValidations.prototype._Patient_T_cardioSelectedType = function( val ) {
            if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO === this.partnerId && !this.isDisabled && !this.patientId && this.selectedType ) {
                return validationLibrary._mandatory( val );
            } else {
                return true;
            }
        };

        DCValidations.prototype._Patient_T_insuranceType = function _Patient_T_insuranceType( val ) {
            if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.INCARE === this.partnerId ) {
                return val;
            } else {
                return true;
            }
        };

        DCValidations.prototype._Patient_T_careType = function _Patient_T_careType( val ) {
            if( Y.doccirrus.schemas.patient.PartnerIdsPartnerId.INCARE === this.partnerId ) {
                return val;
            } else {
                return true;
            }
        };
        DCValidations.prototype._Patient_T_dayOfLastMenorrhoea = function _Patient_T_dayOfLastMenorrhoea( val ) {
            if( !val ) {
                return true;
            }
            return validationLibrary._pastOrPresentDate.call( this, val );
        };
        DCValidations.prototype._Patient_T_cycleDaysMenorrhoea = function _Patient_T_cycleDaysMenorrhoea( val ) {
            if( !val ) {
                return true;
            }
            val = Number( val );
            if( val >= 21 && val <= 35 ) {
                return true;
            }
            return false;
        };

        DCValidations.prototype._SMB_mandatory = function( val ) {
            return validationLibrary._mandatory( val ) ? true : MISSING_MANDATORY_VALUE;
        };

        DCValidations.prototype._ActivityDataItem_T_count = function( val ) {
            var
                value = Number( val ),
                isInt = 'number' === typeof value && isFinite( value ) && value === Math.floor( value );
            return isInt && 30 >= val && 1 <= val;
        };

        DCValidations.prototype._DeliverySettings_T_1ClickMandatory = function( val ) {
            if( '1CLICK' === this.deliveryType ) {
                return validationLibrary._mandatory( val );
            }

            return true;
        };
        DCValidations.prototype._DeliverySettings_T_ManualMandatory = function( val ) {
            if( 'MANUAL' === this.deliveryType ) {
                return validationLibrary._mandatory( val );
            }

            return true;
        };
        DCValidations.prototype._DeliverySettings_T_kvPortalUrl = function( val ) {
            if( 'MANUAL' === this.deliveryType ) {
                return validationLibrary._url( val );
            }

            return true;
        };

        DCValidations.prototype._Admin_T_proxy = function( val ) {
            var valI;
            valI = val ? val.toLowerCase() : '';

            if( '' === val ){
                return true;
            }

            //To understand please use https://www.debuggex.com/
            return null !== /^(https?:\/\/)((([^:]+):([^@]+))@)?((([\da-z\.\-]+)\.([a-z]{2,16}))|([\d]+\.[\d]+\.[\d]+\.[\d]+))(:(\d{1,5}))$/.exec( valI );
        };

        DCValidations.prototype.Cardreader_T_name = function( val ) {
            if( '' !== val ){
                return true;
            }
            return false;
        };

        DCValidations.prototype.Cardreader_T_port = function( val ) {
            var value = val.toString();
            if( !isNaN(value) && '' !== value && !value.includes('.')){
                return true;
            }
            return false;
        };

        DCValidations.prototype.LabDevice_T_deviceType = function( val ) {
            return _lengthString( val, 0, 60 );
        };

        DCValidations.prototype.LabDevice_T_manufacturer = function( val ) {
            return _lengthString( val, 0, 60 );
        };

        DCValidations.prototype.LabDeviceTest_T_testId = function( val ) {
            return null !== /^\d{3}$/.exec( val );
        };

        DCValidations.prototype.ActionButton_T_name = function( val ) {
            return _lengthString( val, 0, 60 );
        };

        DCValidations.prototype.ActionButton_T_uri = function( val ) {
            if ( !val ) {
                return false;
            }

            return null !== /(^[_a-zA-Z]{1})\w+:(\/?\/?)[^\s]+/.exec( val );
        };

        DCValidations.prototype.appToken_T_goodName = function( val ) {
            return 'admin' !== val;
        };

        // TI validations ----------------------------------------------------------------------------------------------
        DCValidations.prototype.LessThan64Characters = function ( val ) {
            return _lengthString( val, 0, 64 );
        };
        DCValidations.prototype.AlphanumericalCharactersTiId = function ( val ) {
            return !val || DCValidations.prototype._euroalphanumDotAtCol(val);
        };
        // Country Mode Validations ----------------------------------------------------------------------------------------------
        DCValidations.prototype.countriesSupportedByPractice = function( val ) {
            var practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs();

            return !lodash.difference( val, practiceCountryMode ).length; // Data country mode not supported by practice licence
        };
        // ShiftPatients
        DCValidations.prototype._ShiftPatients_T_targetEmployeeId = function( val ) {
            if( val ) {
                return this.sourceEmployeeIds.indexOf( val ) === -1;
            }
            return true;
        };
        // DMP Utilities -----------------------------------------------------------------------------------------------
        DCValidations.prototype.includesAll = function( val, valuesToBeIncluded ) {
            var valArray = Array.isArray( val ) && val || val && [val] || [];
            var valuesToBeIncludedArray = Array.isArray( valuesToBeIncluded ) && valuesToBeIncluded || [valuesToBeIncluded];

            return valuesToBeIncludedArray.filter( function( entry ) { return valArray.indexOf( entry ) > -1; } ).length === valuesToBeIncludedArray.length;
        };
        DCValidations.prototype.includesSome = function( val, valuesToBeIncluded ) {
            var valArray = Array.isArray( val ) && val || val && [val] || [];
            var valuesToBeIncludedArray = Array.isArray( valuesToBeIncluded ) && valuesToBeIncluded || [valuesToBeIncluded];

            return valArray.filter( function( entry ) { return valuesToBeIncludedArray.indexOf( entry ) > -1; } ).length;
        };
        DCValidations.prototype.excludesAll = function( val, valuesNotAllowed ) {
            return !this.includesSome( val, valuesNotAllowed );
        };
        DCValidations.prototype.excludesSome = function( val, valuesNotAllowed ) {
            return !this.includesAll( val, valuesNotAllowed );
        };
        DCValidations.prototype.exclusiveValues = function( val, exclusiveValues ) {
            var valArray = Array.isArray( val ) && val || val && [val] || [];
            var exclusiveValuesArray = Array.isArray( exclusiveValues ) && exclusiveValues || [exclusiveValues];

            return valArray.length <= 1 || !valArray.filter( function( entry ) { return exclusiveValuesArray.indexOf( entry ) > -1; } ).length;
        };
        // DCValidations.prototype.isBefore = function( before, after ) {
        //     return new Date( before ).setHours( 0, 0, 0, 0 ) <= new Date( after ).setHours( 0, 0, 0, 0 );
        // };
        //
        // Custom tarmed catalog entries ---------------------------------------------------------------------------
        DCValidations.prototype.mandatoryIfTarmedDignity = function( val ) {
            var TARMED_DIGNITY_CATALOG_SHORTS = ['TARMED_DIGNI_QUALI', 'TARMED_DIGNI_QUANTI'];

            return val || TARMED_DIGNITY_CATALOG_SHORTS.indexOf(this.catalogShort) === -1;
        };
        DCValidations.prototype.trueIfCustomTarmedDignity = function( val ) {
            var TARMED_DIGNITY_CATALOG_SHORTS = ['TARMED_DIGNI_QUALI', 'TARMED_DIGNI_QUANTI'];

            return val === true || !this.isNew || TARMED_DIGNITY_CATALOG_SHORTS.indexOf( this.catalogShort ) === -1;
        };

        DCValidations.prototype._IncaseConfiguration_T_roles = function() {
            if( this.onPracticeDocumentNew || this.onPracticeDocumentChanged || this.onPracticeDocumentDeleted ) {
                return 0 !== this.roles.length;
            }
            return true;
        };

        DCValidations.prototype._IncaseConfiguration_T_kimMessagePollingIntervalHours = function( val ) {
            if( this.kimMessagePollingIntervalEnabled ) {
                return validationLibrary._rangeInteger( val, 1, 48 );
            }
            return true;
        };

        // Q-Docu values ---------------------------------------------------------------------------

        DCValidations.prototype._totalDigits = function( val, num ) {
            var regex = new RegExp( '^[0-9]{' + num + '}' );
            return regex.test( val );
        };

        DCValidations.prototype._max16Digits = function( val ) {
            return /^[0-9]{0,16}$/.test( val );
        };

        DCValidations.prototype._QDocu_T_programmzk = function( val ) {
            return validationLibrary._lengthString( val, 1, 2 );
        };

        DCValidations.prototype._QDocu_T_produkt = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && 'ZKP' === this.module && ( '1' === this.hpvimpfung || '2' === this.hpvimpfung ) && '1' === this.herkunftimpfstatus ) {
                return validationLibrary._lengthString( val, 1, 32 );
            }

            if( -1 === [2021].indexOf( year ) && 'ZKP' === this.module && ( '1' === this.hpvimpfung || '2' === this.hpvimpfung ) ) {
                return validationLibrary._lengthString( val, 1, 32 );
            }

            if( -1 !== [2021].indexOf( year ) && 'ZKH' === this.module ) {
                return validationLibrary._lengthString( val, 1, 32 );
            }

            if( '0' === this.pznvorhanden || '2' === this.methoabstrentnahme ) {
                return validationLibrary._lengthString( val, 1, 32 );
            }
            
            return true;
        };

        DCValidations.prototype._QDocu_T_pznvorhanden = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKH' === this.module && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_pzn = function( val ) {
            if( this.pznvorhanden === '1' ) {
                return validationLibrary._totalDigits( val, 8 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_versichertenidneu = function( val ) {
            return validationLibrary._lengthString( val, 10, 10 );
        };

        DCValidations.prototype._QDocu_T_untersuchungsnummer = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKZ' === this.module || 'ZKH' === this.module ){
                return validationLibrary._mandatory( val );
            }

            if( 'ZKP' === this.module && -1 !== [2021].indexOf( year )
                && ( '1' === this.untersuchung || '1' === this.artuanlunt || '2' === this.artuanlunt ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_untersuchung = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '3' === this.artuanlunt && -1 !== [2021].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_mandatoryOnZKA = function( val ) {
            if(this.module === 'ZKA'){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_mandatoryOnZKH = function( val ) {
            if(this.module === 'ZKH'){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_mandatoryOnZKP = function( val ) {
            if(this.module === 'ZKP'){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_mandatoryOnZKZ = function( val ) {
            if(this.module === 'ZKZ'){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvtest = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( this.module === 'ZKP' && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }

            if( this.module === 'ZKP' && -1 !== [2021].indexOf( year ) && '3' === this.artuanlunt ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zervixeinstellbar = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_plz3stellig = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) ) {
                return validationLibrary._totalDigits( val, 5 );
            }
            if( this.module === 'ZKP' ) {
                return validationLibrary._totalDigits( val, 5 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefund01 = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '1' === this.zytbefund && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundii = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '2' === this.zytbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundiii = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '3' === this.zytbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundiiid = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '4' === this.zytbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundiv = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '5' === this.zytbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundv = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '6' === this.zytbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvvirustyp = function( val ) {
            if( '1' === this.hpvtergebnis ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_welchhpvtyp = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKH' === this.module && '1' === this.hpvvirustyp && -1 !== [2021].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvtergebnis = function( val ) {
            if( '1' === this.hpvtest ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvorunt01 = function( val ) {
            if( '1' === this.zytbefundvorunt ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvoruntii = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '2' === this.zytbefundvorunt  && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvoruntiii = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '3' === this.zytbefundvorunt && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvoruntiiid = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '4' === this.zytbefundvorunt && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvoruntiv = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '5' === this.zytbefundvorunt && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvoruntv = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '6' === this.zytbefundvorunt && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvtvorbefund = function( val ) {
            if( '1' === this.hpvtvoruntvorhand ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvvirustypvorbefund = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '1' === this.hpvtvorbefund && -1 !== [2020].indexOf( year ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_pzgsichtbar = function( val ) {
            if( '1' === this.kolposkbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_tztyp = function( val ) {
            if( '1' === this.kolposkbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_normalbefund = function( val ) {
            if( '1' === this.kolposkbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_gradabnbefunde = function( val ) {
            if( '0' === this.normalbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_verdachtais = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( '0' === this.normalbefund && -1 !== [2020].indexOf( year ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_lokalabnbefunde = function( val ) {
            if( '0' === this.normalbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_groesselaesion = function( val ) {
            if( '0' === this.normalbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_verdachtinvasion = function( val ) {
            if( '0' === this.normalbefund ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_weiterebefunde = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if(  -1 === [2021].indexOf( year ) && '0' === this.normalbefund ) {
                return validationLibrary._mandatory( val );
            }

            if( -1 !== [2021].indexOf( year ) && 'ZKA' === this.module ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_weiterebefunde1Mandatory = function( val ) {
            if( '1' === this.weiterebefunde
                && !( this.kongenanomalie || this.kondylome || this.endometriose || this.ektoendopolypen || this.entzuendung || this.stenose || this.postopveraend || this.sonstweitbefunde ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_sonstweitbefundeMandatory = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ( '1' === this.sonstweitbefunde || '88' === this.histologvorbefundvorunt ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_sonstbef = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ('88' === this.histobef ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_karzinomtyp = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ( '8' === this.histologvorbefundvorunt || '8' === this.befundbiopskueret ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_karzinomtyp2 = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ('8' === this.histobef ) ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_anzahlbiopsien = function( val ) {
            if( '1' === this.massnahmen || '4' === this.massnahmen ){
                return validationLibrary._lengthString( val, 1, 2 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_befundbiopskueret = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && ( '1' === this.massnahmen || '2' === this.massnahmen ) ){
                return validationLibrary._mandatory( val );
            }

            if( -1 !== [2021].indexOf( year ) && ( '1' === this.massnahmen || '4' === this.massnahmen ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_histobef = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ( '1' === this.op || '1' === this.opeingriff ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_sonstbefbiopskueret = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2021].indexOf( year ) && ( '1' === this.sonstmetaplasiebefunde || '88' === this.befundbiopskueret ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_befundbiopskueret2Mandatory = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 !== [2020].indexOf( year ) && ( '2' === this.befundbiopskueret || '2' === this.histologvorbefundvorunt )
                && !( this.metaplasievorgaenge || this.adenocarcinomainsitu || this.invasivplattenepithelkarz || this.invasivadenokarz || this.sonstmetaplasiebefunde ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_empfohlenekontrabkl = function( val ) {
            if( '1' === this.empfohlenemassnahmebiops || '1' === this.empfohlenemassnahme ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zeithorizontkontrabkl = function( val ) {
            if( '4' === this.empfohlenekontrabkl || '1' === this.empfohlenemassnahme ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zeithorizont = function( val ) {
            if( '2' === this.zeithorizontkontrabkl ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zeithorizontMonth = function( val ) {
            if( '2' === this.zeithorizontkontrabkl ){
                return validationLibrary._lengthString( val, 1, 2 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_therapieempfehlung = function( val ) {
            if( '2' === this.empfohlenemassnahmebiops ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_op = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 !== [2021].indexOf( year ) && ('1' === this.therapieempfehlung || '2' === this.therapieempfehlung) ) {
                    return validationLibrary._mandatory( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_opeingriff = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 !== [2021].indexOf( year ) && '0' === this.op ){
                    return validationLibrary._mandatory( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_sonstopeingr = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && '3' === this.therapieempfehlung ){
                return validationLibrary._mandatory( val );
            }

            if( -1 !== [2021].indexOf( year ) && '2' === this.therapieempfehlung ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_weiteretherapieempf = function( val ) {
            if( '8' === this.therapieempfehlung ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_endhistolbefundvorh = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 === [2021].indexOf( year ) && ( '1' === this.therapieempfehlung || '2' === this.therapieempfehlung || '3' === this.therapieempfehlung || '1' === this.befundevoruntvorh ) ){
                    return validationLibrary._mandatory( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_artopeingriff = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 === [2021].indexOf( year ) && ( '1' === this.therapieempfehlung || '2' === this.therapieempfehlung || '3' === this.therapieempfehlung || '1' === this.befundevoruntvorh ) ) {
                    return validationLibrary._mandatory( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_opdatum = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 === [2021].indexOf( year ) && ( '1' === this.therapieempfehlung || '2' === this.therapieempfehlung || '3' === this.therapieempfehlung || '1' === this.befundevoruntvorh ) ){
                    return validationLibrary._mandatory( val );
                }

                if( -1 !== [2021].indexOf( year ) && ( '1' === this.op || '1' === this.opeingriff ) ) {
                    return validationLibrary._mandatory( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_hpvtvoruntvorhand = function( val ) {
            if( '1' === this.befundevoruntvorh ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_histologvorbefundvorunt = function( val ) {
            if( '1' === this.befundevoruntvorh ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_opdatumDate = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( 'ZKA' === this.module ) {
                if( -1 === [2021].indexOf( year ) && ( '1' === this.therapieempfehlung || '2' === this.therapieempfehlung || '3' === this.therapieempfehlung ) ) {
                    return validationLibrary._date( val );
                }

                if( -1 !== [2021].indexOf( year ) && ( '1' === this.op || '1' === this.opeingriff ) ) {
                    return validationLibrary._date( val );
                }
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_methokonisation = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && '1' === this.artopeingriff ) {
                return validationLibrary._mandatory( val );
            }
            if( -1 !== [2021].indexOf( year ) && '1' === this.op ) {
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_tiefekonus = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && '1' === this.artopeingriff ) {
                return  /[\+\-]?[0-9]*\.[0-9]{2}/.test( val );
            }
            if( -1 !== [2021].indexOf( year ) && '1' === this.op ) {
                return  /[\+\-]?[0-9]+/.test( val ) && validationLibrary._lengthString( val, 1, 3 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_umfangexzision = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) &&  '2' === this.artopeingriff ){
                return  /[\+\-]?[0-9]*\.[0-9]{2}/.test( val );
            }

            if( -1 !== [2021].indexOf( year ) &&  '1' === this.op ){
                return  /[\+\-]?[0-9]+/.test( val ) && validationLibrary._lengthString( val, 1, 3 );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_methoexzision = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && '2' === this.artopeingriff ){
                return validationLibrary._mandatory( val );
            }

            if( -1 !== [2021].indexOf( year ) && '1' === this.op ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_sonstopeingr2 = function( val ) {
            if( '8' === this.artopeingriff ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_endhistolbefundvorh1Mandatory = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();
            if( -1 === [2021].indexOf( year ) && '1' === this.endhistolbefundvorh ){
                return validationLibrary._mandatory( val );
            }

            if( -1 !== [2021].indexOf( year ) && ( '6' === this.histobef || '7' === this.histobef || '8' === this.histobef ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_residualstatus = function( val ) {
            var
                moment = getMoment(),
                year = moment( this.datumunt ).year();

            if( -1 !== [2021].indexOf( year ) && ( '2' === this.histobef || '3' === this.histobef || '4' === this.histobef || '5' === this.histobef || '6' === this.histobef || '7' === this.histobef || '8' === this.histobef ) ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_befundevoruntvorh1Mandatory = function( val ) {
            if( '1' === this.befundevoruntvorh ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_befundevoruntvorhRelatedDate = function( val ) {
            if( '1' === this.befundevoruntvorh ){
                return /^[0-1][0-9]\.[12][0-9]{3}/.test( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_zytbefundvorunt = function( val ) {
            if( '1' === this.zytbefundvoruntvorh ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_anamabweichvorunt = function( val ) {
            if( '3' === this.artuanlunt ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        DCValidations.prototype._QDocu_T_artuanluntAndAusflusspathblutungMandatory = function( val ) {
            if( '1' === this.artuanlunt || '2' === this.artuanlunt || '1' === this.anamabweichvorunt || '9' === this.anamabweichvorunt ){
                return validationLibrary._mandatory( val );
            }
            return true;
        };

        // xDT Frontend Validations ---------------------------------------------------------------------------
        DCValidations.prototype._lengthIsExactly4XDT = function ( val ) {
            return _lengthString( val, 4, 4 );
        };


        validationLibrary = new DCValidations();
        validationLibrary.getMoment = getMoment;

        Y.namespace( 'doccirrus' ).validations = {
            common: validationLibrary
        };

    },
    '0.0.1',
    {
        requires: [
            'yui-base',
            'doccirrus',
            'validator-factory',
            'validator-registry',
            'dccommonutils',
            'dcregexp'
        ]
    }
);

