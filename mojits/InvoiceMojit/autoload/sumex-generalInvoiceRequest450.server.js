/**
 * User: oliversieweke
 * Date: 29.11.18  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'sumex-generalInvoiceRequest450', function( Y, NAME ) {
        /**
         * @module sumex
         */

        const {inspect} = require( 'util' );
        const needle = require( 'needle' );
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const {addSumexOperation} = Y.doccirrus.sumexUtils;
        const NO_DESCRIPTION_i18n = Y.doccirrus.i18n( 'InvoiceMojit.general.NO_DESCRIPTION' );


// ================================================================================================================== \\
// ================================================ SUMEX INTERFACES ================================================ \\
// The methods below are written so as to correspond to the SUMEX API described here:
// http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/index.html#docs
// Note that there is no immediate interaction with the Sumex module though, the methods are synchronous and only
// used to build together a JSON object of operations that will be sent in one go to the Sumex Sol through the static
// IGeneralInvoiceRequestManager.sendOperationsToSumexSol() method.

// Note that special care needs to be taken concerning default values as the IGeneralInvoiceRequestManager can be a bit
// opinionated about them.

    // IAddress --------------------------------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/index.html
         * With the IAddress interface structured address data can be set and retrieved.
         * The whole address can be seen as a collection of substructures like the name, the postal part, a communication
         * part etc. Where each of these sub structure can be set or retrieved by an interface method. The name part of a
         * person is set by the method SetPerson and a company's name is entered by the method SetCompany. Before setting
         * a new address the internal data has to be initialized by the method Initialize.
         *
         * @class IAddress
         */
        class IAddress {
            constructor( locationId ) {
                this.id = locationId;
                this.name = 'IAddress';
                this.operations = [];
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/AddPhone_method.html
             * Adds a structured phone number.
             * The Swiss international calling code +41 is filtered out in the printing.
             * If the main software does not support structured pone numbers then all data is supplied in the bstrNumber
             * variable. However, +41 is then no longer filtered.
             *
             * @method AddPhone
             * @param {Object} phone                        :REQUIRED:
             * @param {String} phone.bstrNumber             :REQUIRED:  The pure phone number part of the telephone number. It is possible to set the full telephone number in this variable and leave the other parts of the telephone number empty
             * @param {String} phone.bstrLocalCode          :OPTIONAL:  The local area code part of the telephone number.
             * @param {String} phone.bstrInternationalCode  :OPTIONAL:  The international calling code part of the telephone number.
             * @param {String} phone.bstrExt                :OPTIONAL:  The optional extension number part of the telephone number.
             */
            AddPhone( {bstrNumber, bstrLocalCode, bstrInternationalCode, bstrExt} ) {
                addSumexOperation.call( this, 'AddPhone', {
                    bstrNumber,
                    ...(bstrLocalCode ? bstrLocalCode : {}),
                    ...(bstrInternationalCode ? bstrInternationalCode : {}),
                    ...(bstrExt ? bstrExt : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/Initialize_method.html
             * Initializes all internal address variables.
             * This method should be called before new data is supplied to reset all internally stored data.
             *
             * @method Initialize
             */
            Initialize() {
                addSumexOperation.call( this, 'Initialize' );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/SetCompany_method.html
             * Sets the company's naming part of the address.
             * Note that the subaddressing is part of the extended name and is always printed before any postal information.
             *
             * @method SetCompany
             * @param {Object} company                      :REQUIRED:
             * @param {String} company.bstrCompanyName      :REQUIRED:  The company's name.
             * @param {String} company.bstrDepartment       :OPTIONAL:  The optional department part of the company.
             * @param {String} company.bstrSubaddressing    :OPTIONAL:  The optional subaddressing information, e.g. a "c/o" like information as defined by the Post.
             */
            SetCompany( {bstrCompanyName, bstrDepartment = null, bstrSubaddressing = null} ) {
                addSumexOperation.call( this, 'SetCompany', {
                    bstrCompanyName,
                    bstrDepartment,
                    bstrSubaddressing
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/SetFax_method.html
             * Sets a structured fax number.
             * The Swiss international calling code +41 is filtered in the printing.
             * If the main software does not support structured pone numbers then all data is supplied in the bstrNumber
             * variable. However, +41 is then no longer filtered.
             *
             * @method SetFax
             * @param {Object} fax                          :REQUIRED:
             * @param {String} fax.bstrNumber               :REQUIRED:  The pure fax number part of the fax number. It is possible to set the full fax number in this variable and leave the other parts of the fax number empty.
             * @param {String} fax.bstrLocalCode            :OPTIONAL:  The local area code part of the fax number.
             * @param {String} fax.bstrInternationalCode    :OPTIONAL:  The international calling code part of the fax number.
             * @param {String} fax.bstrExt                  :OPTIONAL:  The extension number part of the fax number.
             */
            SetFax( {bstrNumber, bstrLocalCode = null, bstrInternationalCode = null, bstrExt = null} ) {
                addSumexOperation.call( this, 'SetFax', {bstrNumber, bstrLocalCode, bstrInternationalCode, bstrExt} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/SetOnline_method.html
             * Sets the structured online part of the address.
             *
             * @method SetOnline
             * @param {Object} online                       :REQUIRED:
             * @param {String} online.bstrEMail             :OPTIONAL:  A relevant email address.
             * @param {String} online.bstrUrl               :OPTIONAL:  A relevant URL address.
             */
            SetOnline( {bstrEMail, bstrUrl} ) {
                addSumexOperation.call( this, 'SetOnline', {
                    ...(bstrEMail ? {bstrEMail} : {}),
                    ...(bstrUrl ? {bstrUrl} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/SetPerson_method.html
             * Sets the person's naming part of the address.
             * Note that the subaddressing is part of the extended name and is always printed before any postal information.
             *
             * @method SetPerson
             * @param {Object} person                       :REQUIRED:
             * @param {String} person.bstrFamilyname        :REQUIRED:  The family name (or last name) of the person.
             * @param {String} person.bstrGivenname         :REQUIRED:  The given name (or first name) of the person.
             * @param {String} person.bstrSalutation	    :OPTIONAL:  The optional salutation of the person.
             * @param {String} person.bstrTitle	            :OPTIONAL:  The optional title of the person.
             * @param {String} person.bstrSubaddressing     :OPTIONAL:  The optional subaddressing information, e.g. a "c/o" like information as defined by the Post
             */
            SetPerson( {bstrFamilyname, bstrGivenname, bstrSalutation, bstrTitle, bstrSubaddressing} ) {
                addSumexOperation.call( this, 'SetPerson', {
                    bstrFamilyname,
                    bstrGivenname,
                    ...(bstrSalutation ? {bstrSalutation} : {}),
                    ...(bstrTitle ? {bstrTitle} : {}),
                    ...(bstrSubaddressing ? {bstrSubaddressing} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IAddress/SetPostal_method.html
             * Sets the structured postal address part.
             * The Swiss ISO county code is the default but is filtered in the printing.
             *
             * @method SetPostal
             * @param {Object} postal                       :REQUIRED:
             * @param {String} postal.bstrStreet            :OPTIONAL:  The street name part of an address.
             * @param {String} postal.bstrPoBox             :OPTIONAL:  The P.O. box code part of an address. Note that according to the Post the street and poBox parts should be used mutually exclusive.
             * @param {String} postal.bstrZip               :REQUIRED:  The mandatory ZIP code part of an address.
             * @param {String} postal.bstrCity              :REQUIRED:  The mandatory city name of an address.
             * @param {String} postal.bstrStateCode         :OPTIONAL:  The optional state code part of an address.
             * @param {String} postal.bstrCountryCode       :REQUIRED: 	The ISO country code of an address.
             */
            SetPostal( {bstrStreet, bstrPoBox, bstrZip, bstrCity, bstrStateCode, bstrCountryCode} ) {
                addSumexOperation.call( this, 'SetPostal', {
                    ...(bstrStreet ? {bstrStreet} : {}),
                    ...(bstrPoBox ? {bstrPoBox} : {}),
                    bstrZip,
                    bstrCity,
                    ...(bstrStateCode ? {bstrStateCode} : {}),
                    bstrCountryCode
                } );
            }
        }

    // IServiceExInput --------------------------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/index.html
         * The utility interface IServiceExInput provides methods for the input of data basically used in special validators
         * like the tarmedValidator. Among these data are the dignities of the providers as well as other parameters like
         * the Tarmed specific invoicing roles needed just to operate these validators.
         *
         * @class IServiceExInput
         */
        class IServiceExInput {
            constructor( patientId ) {
                this.id = patientId;
                this.name = 'IServiceExInput';
                this.operations = [];
            }


            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/AddDignity_method.html
             * Adds a Qualitative Dignity to the list of dignities for a certain provider.
             * @method AddDignity
             * @param {Object} dignity                  :REQUIRED:
             * @param {String} dignity.bstrEanNumber    :REQUIRED: The provider's EAN for which the Qualitative Dignity is defined
             * @param {String} dignity.bstrQLCode       :REQUIRED: The Qualitative Dignity code - consult e.g. the Tarmed for a list and description of these codes.
             */
            AddDignity( {bstrEanNumber, bstrQLCode} ) {
                addSumexOperation.call( this, 'AddDignity', {bstrEanNumber, bstrQLCode} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/InitDignity_method.html
             * Initializes and empties the Qualitative Dignity set that is filled via the AddDignity method.
             *
             * @method InitDignity
             */
            InitDignity() {
                addSumexOperation.call( this, 'InitDignity' );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/Initialize_method.html
             * Initializes some static data (physician, treatment, patient) that are set via the Set-methods of IServiceExInput
             *
             * @method Initialize
             */
            Initialize() {
                addSumexOperation.call( this, 'Initialize' );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/SetPatient_method.html
             * Sets the patient's primary parameters (sex, birthdate) for the utility interface IServiceExInput.
             *
             * @method SetPatient
             * @param {Object} patient                      :REQUIRED:
             * @param {Date} patient.dBirthdate             :REQUIRED: The patient's birthdate.
             * @param {Number} patient.eSex                 :REQUIRED: The patient's gender.
             */
            SetPatient( {dBirthdate, eSex} ) {
                addSumexOperation.call( this, 'SetPatient', {dBirthdate, eSex} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/SetPhysician_method.html
             * Sets the provider's primary parameters (EAN, medical and billing role) for the utility interface IServiceExInput.
             *
             * @method SetPhysician
             * @param {Object} physician                            :REQUIRED:
             * @param {Number} physician.eMedicalRole               :REQUIRED: The ServiceExInput-relevant medical role given by the MedicalRoleType enumeration
             * @param {Number} physician.eBillingRole               :REQUIRED: The ServiceExInput-relevant billing role given by the BillingRoleType enumeration
             * @param {String} physician.bstrEanNumberProvider      :REQUIRED: The EAN of the provider
             * @param {String} physician.bstrEanNumberResponsible   :REQUIRED: The EAN of the responsible party.
             */
            SetPhysician( {eMedicalRole, eBillingRole, bstrEanNumberProvider, bstrEanNumberResponsible} ) {
                addSumexOperation.call( this, 'SetPhysician', {eMedicalRole, eBillingRole, bstrEanNumberProvider, bstrEanNumberResponsible} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/SetTreatment_method.html
             * Sets the primary treatment parameters (EAN, medical and billing role) for the utility interface IServiceExInput.
             *
             * @method SetTreatment
             * @param {Object} treatmentInputData                       :REQUIRED:
             * @param {Number} treatmentInputData.eCanton               :REQUIRED: Canton type
             * @param {Number} treatmentInputData.eLaw                  :REQUIRED: Law type
             * @param {Number} treatmentInputData.eTreatmentType        :REQUIRED: Treatment type
             * @param {Number} treatmentInputData.eSettlement           :REQUIRED: Settlement type
             * @param {String} treatmentInputData.bstrEanNumberSection  :OPTIONAL: EAN number of the section
             */
            SetTreatment( {eCanton, eLaw, eTreatmentType, eSettlement, bstrEanNumberSection} ) {
                addSumexOperation.call( this, 'SetTreatment', {
                    eCanton,
                    eLaw,
                    eTreatmentType,
                    eSettlement,
                    ...(bstrEanNumberSection ? {bstrEanNumberSection} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/ExternalFactor_MT_property.html
             * Set the external scaling factor for the medical part of Tarmed services.
             *
             * @method ExternalFactor_MT
             * @param {Number} dExternalFactor_MT           :REQUIRED:
             */
            ExternalFactor_MT(dExternalFactor_MT = 1) {
                addSumexOperation.call( this, 'ExternalFactor_MT', {dExternalFactor_MT});
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IServiceExInput/ExternalFactor_TT_property.html
             * Set the external scaling factor for the technical part of Tarmed services.
             *
             * @method ExternalFactor_TT
             * @param {Number} dExternalFactor_TT           :REQUIRED:
             */
            ExternalFactor_TT(dExternalFactor_TT = 1) {
                addSumexOperation.call( this, 'ExternalFactor_TT', {dExternalFactor_TT});
            }
        }

        // IGeneralInvoiceRequest ----------------------------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/index.html
         * With the IGeneralInvoiceRequest interface all invoice/reminder related data and parameters can be set by the
         * available interface methods like SetPatient, SetTreatment,...
         * Alternatively to producing the data from scratch the data of a previously generated XML infoset can be loaded
         * with the IGeneralInvoiceRequestManager::LoadXML method and thereafter data can selectively be changed.
         *
         * @class IGeneralInvoiceRequest
         */
        class IGeneralInvoiceRequest {
            constructor( invoicelogId ) {
                this.id = invoicelogId;
                this.name = 'IGeneralInvoiceRequest';
                this.operations = [];
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/AddService_method.html
             * Adds a service from a simple/normal tariff to the list of services.
             *
             * @method AddService
             * @param {String} service.bstrTariffType               :REQUIRED:  The official tariff type as defined by Forum Datenaustausch
             * @param {String} service.bstrCode                     :REQUIRED:  The service code.
             * @param {String} service.bstrReferenceCode            :OPTIONAL:  The reference code if one must be supplied. Supply an empty string if there is no reference code to set.
             * @param {Number} service.dQuantity                    :REQUIRED:  The floating point quantity. Note that quantity changes the sign if a storno request is produced.
             * @param {Number} service.lSessionNumber               :OPTIONAL:  The session number - use a session value of 1 if no session concept is established for the used tariff
             * @param {Date} service.dDateBegin                     :REQUIRED:  The date of the service's prescription
             * @param {Date} service.dDateEnd                       :OPTIONAL:  The date of the last prescription of the service if and only if the service was applied over a period of time. dDateEnd is ignored if the condition (dDateEnd > dDateBegin+1) is not true! Therefore dDateEnd=0 is supplied for the vast majority of services.
             * @param {String} service.bstrProviderEAN              :REQUIRED:  EAN number of the service provider party.
             * @param {String} service.bstrResponsibleEAN           :OPTIONAL:  EAN number of the service responsible party.
             * @param {String} service.bstrText                     :OPTIONAL:  The name of the service as defined by the used tariff
             * @param {Number} service.dUnit                        :OPTIONAL:  Tax points of the service.
             * @param {Number} service.dUnitFactor                  :REQUIRED:  Tax point value of the service.
             * @param {Number} service.dExternalFactor              :OPTIONAL:  Scale the service e.g. to give a discount or surcharge
             * @param {Number} service.dAmount                      :OPTIONAL:  The amount in CHF for the service as sum over dAmountMT + dAmountTT Note that amount changes the sign if a storno request is produced due to the sign change of dQuantity.
             * @param {Number} service.dVatRate                     :REQUIRED:  The VAT rate in percent or as real number that should be applied to this service.
             * @param {Number} service.eIsObligatory                :OPTIONAL:  Obligatory enumerator indicating whether the given service record has a obligation status regarding the given law (UVG,KVG,...). If the enumerator is set to enObligationAutomatic then the status is set internally using some ad hoc rules.
             * @param {String} service.bstrRemark                   :OPTIONAL:  An optional remark for the given service
             * @param {String} service.bstrSectionCode              :OPTIONAL:  An optional BfS section code where the service was applied as defined by Swiss Federal Statistical Office - this code is only given for eRoleType=enRoleHospital!
             * @param {Number} service.eIgnoreValidate              :REQUIRED:  Flag indicating whether the validation must be ignored that is whether the corresponding validator must be called or not. This flag might be useful in the following situation: the user wants to add the service even if the validation failed, perhaps he has a special agreement with the insurance or patient.
             * @param {Number} service.lServiceAttributes           :OPTIONAL:  lServiceAttributes is a 32-bit integer where each bit position defines a special information. lServiceAttributes is currently not applied to extended service records.
             */
            AddService({
                           bstrTariffType,
                           bstrCode,
                           bstrReferenceCode,
                           dQuantity = 1,
                           lSessionNumber = 1,
                           dDateBegin,
                           dDateEnd = "0001-01-01T12:00:00.000Z",
                           bstrProviderEAN,
                           bstrResponsibleEAN,
                           bstrText = NO_DESCRIPTION_i18n,
                           dUnit = 0,
                           dUnitFactor,
                           dExternalFactor = 0,
                           dAmount = 0,
                           dVatRate = 0,
                           eIsObligatory = 0,
                           bstrRemark,
                           bstrSectionCode,
                           eIgnoreValidate,
                           lServiceAttributes = 0
            }) {
                addSumexOperation.call( this, 'AddService', {
                    bstrTariffType,
                    bstrCode,
                    ...(bstrReferenceCode ? {bstrReferenceCode} : {}),
                    dQuantity,
                    lSessionNumber,
                    dDateBegin,
                    dDateEnd,
                    bstrProviderEAN,
                    bstrResponsibleEAN,
                    bstrText,
                    dUnit,
                    dUnitFactor,
                    dExternalFactor,
                    dAmount,
                    dVatRate,
                    eIsObligatory,
                    ...(bstrRemark ? {bstrRemark} : {}),
                    ...(bstrSectionCode ? {bstrSectionCode} : {}),
                    eIgnoreValidate,
                    lServiceAttributes
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/AddServiceEx_method.html
             * Adds a service from an extended tariff to the list of services.
             * The term "extended" means a tariff whose services are splitted into a medical and technical part
             * (like the Tarmed) as opposed to a simple tariff with a (code, name, tax point) structure. Note, that the
             * IServiceExInput interface is needed to define further data even if a corresponding validator is not used.
             *
             * @method AddServiceEx
             * @param {Object} service                              :REQUIRED:
             * @param {Object} service.IServiceExInput              :REQUIRED:  The instance of the IServiceExInput interface used for the given tariff.
             * @param {String} service.bstrTariffType               :REQUIRED:  The official tariff type as defined by Forum Datenaustausch
             * @param {String} service.bstrCode                     :REQUIRED:  The service code.
             * @param {String} service.bstrReferenceCode            :OPTIONAL:  The reference code if one must be supplied. Supply an empty string if there is no reference code to set.
             * @param {Number} service.dQuantity                    :REQUIRED:  The floating point quantity. Note that quantity changes the sign if a storno request is produced.
             * @param {Number} service.lSessionNumber               :OPTIONAL:  The session number - use a session value of 1 if no session concept is established for the used tariff
             * @param {Date} service.dDateBegin                     :REQUIRED:  The date of the service's prescription
             * @param {Date} service.dDateEnd                       :OPTIONAL:  The date of the last prescription of the service if and only if the service was applied over a period of time. dDateEnd is ignored if the condition (dDateEnd > dDateBegin+1) is not true! Therefore dDateEnd=0 is supplied for the vast majority of services.
             * @param {Number} service.eSide                        :OPTIONAL:  The body side dependency of the service
             * @param {String} service.bstrText                     :OPTIONAL:  The name of the service as defined by the used tariff
             * @param {Number} service.dUnitMT                      :OPTIONAL:  Tax points of the medical part (TP_MT) of the service.
             * @param {Number} service.dUnitFactorMT                :REQUIRED:  Tax point value of the medical part (TPV_MT) of the service.
             * @param {Number} service.dUnitInternalScalingFactorMT	:OPTIONAL:  The internal scaling factor of the medical part of the service. This is a modulation factor to represent percent services and is mostly 1 - set the factor 0 to auto-expand it depending on the service.
             * @param {Number} service.dAmountMT                    :OPTIONAL:  The amount in CHF for the medical part of the service. Note that amount changes the sign if a storno request is produced due to the sign change of dQuantity.
             * @param {Number} service.dUnitTT                      :OPTIONAL:  Tax points of the technical part (TP_TT) of the service.
             * @param {Number} service.dUnitFactorTT                :REQUIRED:  Tax point value of the medical part (TPV_MT) of the service.
             * @param {Number} service.dUnitInternalScalingFactorTT :OPTIONAL:  The internal scaling factor of the technical part of the service. This is a modulation factor to represent percent services and is mostly 1 - set the factor 0 to auto-expand it depending on the service.
             * @param {Number} service.dAmountTT                    :OPTIONAL:  The amount in CHF for the technical part of the service. Note that amount changes the sign if a storno request is produced due to the sign change of dQuantity.
             * @param {Number} service.dAmount                      :OPTIONAL:  The amount in CHF for the service as sum over dAmountMT + dAmountTT Note that amount changes the sign if a storno request is produced due to the sign change of dQuantity.
             * @param {Number} service.dVatRate                     :REQUIRED:  The VAT rate in percent or as real number that should be applied to this service.
             * @param {Number} service.eIsObligatory                :OPTIONAL:  Obligatory enumerator indicating whether the given service record has a obligation status regarding the given law (UVG,KVG,...). If the enumerator is set to enObligationAutomatic then the status is set internally using some ad hoc rules.
             * @param {String} service.bstrRemark                   :OPTIONAL:  An optional remark for the given service
             * @param {Number} service.lGroupSize                   :OPTIONAL:  lGroupSize defines the participating group size of a service whose quantity is calculated by the "Divisor Method". A value of < 2 means that there is no group size dependency!
             * @param {String} service.bstrSectionCode              :OPTIONAL:  An optional BfS section code where the service was applied as defined by Swiss Federal Statistical Office - this code is only given for eRoleType=enRoleHospital!
             * @param {Number} service.eIgnoreValidate              :REQUIRED:  Flag indicating whether the validation must be ignored that is whether the corresponding validator must be called or not. This flag might be useful in the following situation: the user wants to add the service even if the validation failed, perhaps he has a special agreement with the insurance or patient.
             * @param {Number} service.lServiceAttributes           :OPTIONAL:  lServiceAttributes is a 32-bit integer where each bit position defines a special information. lServiceAttributes is currently not applied to extended service records.
             */
            AddServiceEx( {
                              IServiceExInput,
                              bstrTariffType,
                              bstrCode,
                              bstrReferenceCode,
                              dQuantity = 1,
                              lSessionNumber = 1,
                              dDateBegin,
                              dDateEnd = "0001-01-01T12:00:00.000Z",
                              eSide = 0,
                              bstrText = NO_DESCRIPTION_i18n,
                              dUnitMT = 0,
                              dUnitInternalScalingFactorMT = 0,
                              dAmountMT = 0,
                              dUnitFactorMT,
                              dUnitTT = 0,
                              dUnitFactorTT,
                              dUnitInternalScalingFactorTT = 0,
                              dAmountTT = 0,
                              dAmount = 0,
                              dVatRate = 0,
                              eIsObligatory = 0,
                              bstrRemark,
                              lGroupSize = 1,
                              bstrSectionCode,
                              eIgnoreValidate,
                              lServiceAttributes = 0
                          } ) {
                addSumexOperation.call( this, 'AddServiceEx', {
                    IServiceExInput,
                    bstrTariffType,
                    bstrCode,
                    ...(bstrReferenceCode ? {bstrReferenceCode} : {}),
                    dQuantity,
                    lSessionNumber,
                    dDateBegin,
                    dDateEnd,
                    eSide,
                    bstrText,
                    dUnitMT,
                    dUnitInternalScalingFactorMT,
                    dAmountMT,
                    dUnitFactorMT,
                    dUnitTT,
                    dUnitFactorTT,
                    dUnitInternalScalingFactorTT,
                    dAmountTT,
                    dAmount,
                    dVatRate,
                    eIsObligatory,
                    ...(bstrRemark ? {bstrRemark} : {}),
                    lGroupSize,
                    ...(bstrSectionCode ? {bstrSectionCode} : {}),
                    eIgnoreValidate,
                    lServiceAttributes
                } );
            }

            /**
             * @method Print
             *
             * print PDF - processed inside sumex sol
             * and call http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequestManager/Print_method.html
             */
            Print(title) {
                addSumexOperation.call( this, 'Print', {title} );
            }

            LoadXML({bstrInputFile}) {
                addSumexOperation.call( this, 'LoadXML', {bstrInputFile} );
            }

            SetReminder({bstrRequestReminderID, dRequestReminderDate, lRequestReminderTimestamp, lReminderLevel, bstrReminderText = '', dAmountReminder = 0}) {
                addSumexOperation.call( this, 'SetReminder', {bstrRequestReminderID, dRequestReminderDate, lRequestReminderTimestamp, lReminderLevel, bstrReminderText, dAmountReminder} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/Finalize_method.html
             * Finalizes and validates all data set so far in the IGeneralInvoiceRequest interface. This method is the
             * counterpart to the Initialize method.
             * This method should be called after all data have been set in the IGeneralInvoiceRequest interface since
             * higher-level validation rules can only be called at the end of input phase. Therefore, be prepared to get
             * validation errors at that point.
             * Please note, that apart from validation tasks there are automatic assignments of addresses as well, should
             * such an address be missing.
             * Eventually the following addresses are cloned in the given sequence:
             *      if the guarantor address is missing than it is cloned from the patient's address
             *      if the debitor address is missing than dependent on the tiers mode it is clone from the guarantor's address (TG) or the insurance's address (TP)
             *      if the ESR creditor address is missing than it is cloned from the biller's address

             * @method Finalize
             */
            Finalize() {
                addSumexOperation.call( this, 'Finalize' );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/Initialize_method.html
             * Initializes all input data in the IGeneralInvoiceRequest interface. This method is the counterpart to the
             * Finalize method.
             * This method should be called before any input is set in the IGeneralInvoiceRequest interface.
             *
             * @method Initialize
             */
            Initialize() {
                addSumexOperation.call( this, 'Initialize' );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/AddDiagnosis_method.html
             * Adds a diagnosis to the list of diagnoses.
             *
             * @method AddDiagnosis
             * @param {Object} diagnosis
             * @param {String} diagnosis.eDiagnosisType         :REQUIRED:  The type of the diagnosis catalog
             * @param {String} diagnosis.bstrCode               :REQUIRED:  The code of the diagnosis as given in the corresponding diagnosis catalog
             * @param {String} diagnosis.bstrText               :REQUIRED:  The textual description of the diagnosis
             */
            AddDiagnosis({ eDiagnosisType, bstrCode, bstrText }) {
                addSumexOperation.call( this, 'AddDiagnosis', {
                    eDiagnosisType,
                    bstrCode,
                    bstrText: bstrText ? bstrText : ""
                });
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetBiller_method.html
             * Sets the biller's various identifiers (EAN, ZSR,...) as well as the structured address.
             * The structured address is defined via a IAddress interface instance and the address data must be defined
             * prior to call this method.
             *
             * @method SetBiller
             * @param {Object} biller                       :REQUIRED:
             * @param {String} biller.bstrEAN               :REQUIRED:  The EAN number of the biller as supplied by Stiftung Refdata
             * @param {String} biller.bstrZSR               :OPTIONAL:  The optional ZSR number of the biller as supplied by Santesuisse
             * @param {String} biller.bstrNIF               :OPTIONAL:  The optional IV specific identification number NIF of the biller.
             * @param {String} biller.bstrSpecialty         :OPTIONAL:  An optional specialty, i.e. FMH title of the recipient
             * @param {String} biller.IAddress              :OPTIONAL:  The instance of a IAddress interface that holds the structured address parts. A NULL pointer is supplied if no address should be set.
             */
            SetBiller( {bstrEAN, bstrZSR, bstrNIF, bstrSpecialty, IAddress = null} ) {
                addSumexOperation.call( this, 'SetBiller', {
                    bstrEAN,
                    ...(bstrZSR ? {bstrZSR} : {}),
                    ...(bstrNIF ? {bstrNIF} : {}),
                    ...(bstrSpecialty ? {bstrSpecialty} : {}),
                    IAddress
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetEsr_method.html             * Sets the company's naming part of the address.
             * Sets the ESR information of type en9to16or27 or en9to16or27plus.                 *
             * @method SetEsr
             * @param {Object} esr                          :REQUIRED:
             * @param {String} esr.eEsrType                 :REQUIRED:  The type of ESR, either 'en9to16or27' or 'en9to16or27plus'
             * @param {String} esr.bstrParticipantNumber    :REQUIRED:  The ESR participant number
             * @param {String} esr.bstrReferenceNumber      :REQUIRED:  The ESR reference number
             * @param {String} esr.bstrBankAccount          :REQUIRED:  The ESR bank or Postfinance account number.
             * @param {String} esr.IBankAddress             :OPTIONAL:  The instance of an IAddress interface that defines the bank address. Supply a NULL address if the creditor has an Postfinance account.
             * @param {String} esr.ICreditorAddress         :OPTIONAL:  The instance of an IAddress interface that defines the creditor address. If a NULL address is defined than a clone of the biller's address is automatically assigned in the Finalize method. However, due to the Anti-Money Laundering Act, Art. 95, 98 FC, the naming of the creditor should be the same as on the bank account and this naming scheme might be different from the biller's address.
             * @param {Number} esr.lPaymentPeriod           :REQUIRED:  The defined payment period
             */
            SetEsr( {eEsrType, bstrParticipantNumber, bstrReferenceNumber, bstrBankAccount, IBankAddress = null, ICreditorAddress = null, lPaymentPeriod = 25} ) {
                addSumexOperation.call( this, 'SetEsr', {
                    eEsrType,
                    bstrParticipantNumber,
                    bstrReferenceNumber,
                    bstrBankAccount,
                    IBankAddress,
                    ICreditorAddress,
                    lPaymentPeriod
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetInsurance_method.html
             * Sets the EAN and the structured address of the insurance.
             * The address is defined via an IAddress interface pointer and the address data must be defined prior to
             * call this method.
             * Please note, that dependent on the tiers mode a clone of the guarantor's address (TG) or the insurance's
             * address (TP) is automatically assigned as debitor address in the Finalize method should the SetDebitor
             * method not be called.
             *
             * @method SetInsurance
             * @param {Object} insurance                    :REQUIRED:
             * @param {String} insurance.bstrEAN            :REQUIRED:  The EAN number of the insurance as supplied by Stiftung Refdata
             * @param {String} insurance.IAddress           :OPTIONAL:  The instance of a IAddress interface that holds the structured address parts. A NULL pointer is supplied if no address should be set.
             */
            SetInsurance( {bstrEAN, IAddress = null} ) {
                addSumexOperation.call( this, 'SetInsurance', {bstrEAN, IAddress} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetCard_method.html
             * Sets the patient's insurance card information - optional in respect to the dependent XSD schema.
             *
             * @method SetCard
             * @param {Object} card                         :REQUIRED:
             * @param {String} card.bstrCardID              :REQUIRED:  Unique 20 digits card identifier
             * @param {String} card.dExpiryDate             :REQUIRED:  The mandatory expiry date of the card
             * @param {String} card.dValidationDate         :OPTIONAL:  The optional date of the last validation of the card's data
             * @param {String} card.bstrValidationID        :OPTIONAL:  Replied ID when the last validation of the card's data was performed
             * @param {String} card.bstrValidationServer    :OPTIONAL:  Server for the last validation process
             */
            SetCard( {bstrCardID, dExpiryDate, dValidationDate = null, bstrValidationID = null, bstrValidationServer = null} ) {
                addSumexOperation.call( this, 'SetCard', {bstrCardID, dExpiryDate, dValidationDate, bstrValidationID, bstrValidationServer} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetDebitor_method.html
             * SSets the debitor's EAN and the structured address.
             * If the debitor is not supplied than dependent on the tiers mode a clone of the guarantor's address (TG)
             * or the insurance's address (TP) is automatically assigned in the Finalize method.
             *
             * The structured address is defined via a IAddress interface instance and the address data must be defined
             * prior to call this method.
             *
             * @method SetInsurance
             * @param {Object} insurance                    :REQUIRED:
             * @param {String} insurance.bstrEAN            :REQUIRED:  The EAN number of the debitor as supplied by Stiftung Refdata
             * @param {String} insurance.IAddress           :OPTIONAL:  The instance of a IAddress interface that holds the structured address parts. A NULL pointer is supplied if no address should be set.
             */
            SetDebitor( {bstrEAN, IAddress = null} ) {
                addSumexOperation.call( this, 'SetDebitor', {bstrEAN, IAddress} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetInvoice_method.html
             * Sets the invoice object reference parameters.
             * The credit, invoice and reminder object references (if supplied in the request) form a object reference
             * chain (credit -> invoice -> reminder) with the reminder as topmost object reference if supplied in the
             * request otherwise the invoice is the topmost object reference (the invoice object is mandatory in all cases!).
             * The page "object reference" provides an in-depth description of the concepts of "object reference",
             * "object reference chain", and "topmost object reference".
             *
             * @method SetInvoice
             * @param {Object} invoice                          :REQUIRED:
             * @param {String} invoice.bstrRequestInvoiceID     :REQUIRED:  The request ID is the main software's identification of the invoice ("Rechnungsnummer"). This is one of 3 identifiers that form the invoice object reference.
             * @param {Date} invoice.dRequestInvoiceDate        :REQUIRED:  The request date is the main software's date of the invoice request ("Rechnungsdatum") This is one of 3 identifiers that form the invoice object reference.
             * @param {Number} invoice.lRequestInvoiceTimestamp :REQUIRED:  This is a UNIX timestamp defined at the moment of the invoice infoset generation. Set this variable 0 to indicate the generation of a new invoice object reference. The IGeneralInvoiceRequestManager::GetXML and/or IGeneralInvoiceRequestManager::Print method will return the timestamp that must be used from that point on as 3rd parameter of the object reference. This is one of 3 identifiers that form the invoice object reference. The timestamp will be generated once for a certain invoice object reference and thereafter the timestamp is always referenced.
             */

            SetReferrer( { bstrEAN, bstrZSR, bstrNIF, bstrSpecialty, IAddress }) {
                addSumexOperation.call( this, 'SetReferrer', {
                    bstrEAN,
                    bstrZSR,
                    ...(bstrNIF ? {bstrNIF} : {}),
                    bstrSpecialty,
                    ...(IAddress ? {IAddress} : {})
                } );
            }

            /**
             * http://sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetGuarantor_method.html
             * Sets the guarantor's structured address. The guarantor is the legal representative and debtor of the premiums.
             *
             * @method SetGuarantor
             * @param {Object} guarantor                :REQUIRED:
             * @param {String} guarantor.IAddress       :REQUIRED:  The instance of a IAddress interface that holds the structured address parts.
             */

            SetGuarantor( { IAddress }) {
                addSumexOperation.call( this, 'SetGuarantor', {
                    ...(IAddress ? {IAddress} : {})
                } );
            }

            SetInvoice( {bstrRequestInvoiceID, dRequestInvoiceDate, lRequestInvoiceTimestamp} ) {
                addSumexOperation.call( this, 'SetInvoice', {bstrRequestInvoiceID, dRequestInvoiceDate, lRequestInvoiceTimestamp} );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetLaw_method.html
             * Sets the data about the applied law and its dependent information
             *
             * @method SetLaw
             * @param {Object} law                          :REQUIRED:
             * @param {Number} law.eLawType                 :REQUIRED:  The type of law to set from the LawType enumeration.
             * @param {Date} law.dCaseDate                  :OPTIONAL:  The case date of the insurance (e.g. date of accident in UVG). This date might undefined for certain laws and therefore left empty
             * @param {Number} law.bstrCaseID               :OPTIONAL:  The case ID of the insurance (e.g. accident number in UVG). This ID might undefined for certain laws and therefore left empty
             * @param {Number} law.bstrInsuredID            :OPTIONAL:  The patient's ID at the insurance. This ID might undefined for certain laws and therefore left empty
             */
            SetLaw( {eLawType, dCaseDate, bstrCaseID, bstrInsuredID} ) {
                addSumexOperation.call( this, 'SetLaw', {
                    eLawType,
                    ...(dCaseDate ? {dCaseDate} : {}),
                    ...(bstrCaseID ? {bstrCaseID} : {}),
                    ...(bstrInsuredID ? {bstrInsuredID} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetPackage_method.html
             * Defines the identification parameters of the main software.
             *
             * @method SetPackage
             * @param {Object} package                          :REQUIRED:
             * @param {String} package.bstrSoftwarePackage      :REQUIRED:  Name of the main software.
             * @param {Number} package.lSoftwareVersion         :REQUIRED:  Version of the main software coded as 32-bit value where lSoftwareVersion = 100*Major version + Minor version.
             * @param {Number} package.lSoftwareID              :OPTIONAL:  Optional ID of the main software
             * @param {String} package.bstrSoftwareCopyright    :REQUIRED:  The copyright notice of the main software.
             */
            SetPackage( {bstrSoftwarePackage, lSoftwareVersion, lSoftwareID, bstrSoftwareCopyright} ) {
                addSumexOperation.call( this, 'SetPackage', {
                    bstrSoftwarePackage,
                    lSoftwareVersion,
                    ...(lSoftwareID ? {lSoftwareID} : {}),
                    bstrSoftwareCopyright
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetPatient_method.html
             * Sets the primary parameters and structured address of the patient.
             * Please note, that a clone of the patient"s address is automatically assigned as guarantor address in the
             * Finalize method should the SetGuarantor method not be called.
             * The address is defined via an IAddress interface pointer and the address data must be defined prior to
             * call this method.
             *
             * @method SetPatient
             * @param {Object} patient                          :REQUIRED:
             * @param {Number} patient.eSexType                 :REQUIRED:  The patient's gender.
             * @param {Date} patient.dBirthdate                 :REQUIRED:  The patient's birthdate.
             * @param {String} patient.bstrSSN                  :OPTIONAL:  Defines the social security number (SSN) of the patient whereupon 4 distinguished types are allowed: - the old 11 digit Swiss SSN ("AHV-Nummer") as defined by Federal Social Insurance Office. - the new 13 digit Swiss SSN ("SV-Nummer") beginning with 756 as defined by Federal Social Insurance Office. -the new 4-10 digit SSN of Liechtenstein ("AHV-Nummer") as defined by Liechtensteinische AHV-IV-FAK. -the 13 digit IDNR number of Liechtenstein ("IDNR-Nummer") beginning with 438 The SSN can be supplied in its printed (with dots) or electronic (only digits) form.
             * @param {String} patient.IAddress                 :REQUIRED:  Pointer to an IAddress interface instance that holds the structured address parts.
             */
            SetPatient( {eSexType, dBirthdate, bstrSSN = null, IAddress} ) {
                addSumexOperation.call( this, 'SetPatient', {
                    eSexType,
                    dBirthdate,
                    bstrSSN,
                    ...(bstrSSN ? {bstrSSN} : {}),
                    IAddress
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetProvider_method.html
             * Sets the main provider's various identifiers (EAN, ZSR,...) as well as the structured address.
             * The structured address is defined via a IAddress interface instance and the address data must be defined prior to call this method.
             *
             * @method SetProvider
             * @param {Object} provider                       :REQUIRED:
             * @param {String} provider.bstrEAN               :REQUIRED:  The EAN number of the provider as supplied by Stiftung Refdata
             * @param {String} provider.bstrZSR               :REQUIRED:  The ZSR number of the provider as supplied by Santesuisse
             * @param {String} provider.bstrNIF               :OPTIONAL:  The optional IV specific identification number NIF of the provider.
             * @param {String} provider.bstrSpecialty         :OPTIONAL:  An optional specialty, i.e. FMH title of the recipient
             * @param {String} provider.IAddress              :OPTIONAL:  The instance of a IAddress interface that holds the structured address parts. A NULL pointer is supplied if no address should be set.
             */
            SetProvider( {bstrEAN, bstrZSR, bstrNIF, bstrSpecialty, IAddress = null} ) {
                addSumexOperation.call( this, 'SetProvider', {
                    bstrEAN,
                    bstrZSR,
                    ...(bstrNIF ? {bstrNIF} : {}),
                    ...(bstrSpecialty ? {bstrSpecialty} : {}),
                    IAddress
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetProcessing_method.html             * Sets the main provider's various identifiers (EAN, ZSR,...) as well as the structured address.
             * The structured address is defined via a IAddress interface instance and the address data must be defined prior to call this method.
             *
             * @method SetProcessing
             * @param {Object} processing                       :REQUIRED:
             * @param {Number} processing.ePrintAtIntermediate  :REQUIRED:  The Boolean ePrintAtIntermediate is a processing instruction for the last intermediate in a Tiers Garant case. The attribute denotes if the invoice/reminder should be printed and mailed to the debitor (ePrintAtIntermediate=enYes) or if this print process was already done at the practice (ePrintAtIntermediate=enNo). Note, that this instruction is significant for the last intermediate only. If an infoset is sent to any party for statistical purposes then this party must not be included as intermediate.
             * @param {Number} processing.ePrintGuarantorCopy   :REQUIRED:    The Boolean ePrintPatientCopy is an instruction for the last intermediate in a Tiers Payant case regarding a printed copy of the invoice to the guarantor's address, basically to fulfill the legal requirement of a "patient copy". On this printed copy the ESR coding line must be absent, the copy field should be set to "yes", and the title of the invoice should be adapted accordingly to designate the copy situation. Furthermore any attached documents are not included/printed in the copy. Note, that this instruction is significant for the last intermediate only. If an infoset is sent to any party for statistical purposes then this party must not be included as intermediate.
             * @param {String} processing.bstrTCToken           :OPTIONAL:  The optional 2-digit Trust Center token that basically is a routing information which TC to use. This information is possibly set for role=enRolePhysician only.
             */
            SetProcessing( {ePrintAtIntermediate = 0, ePrintGuarantorCopy = 0, bstrTCToken} ) {
                addSumexOperation.call( this, 'SetProcessing', {
                    ePrintAtIntermediate,
                    ePrintGuarantorCopy,
                    ...(bstrTCToken ? {bstrTCToken} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetRequest_method.html
             * Sets the primary parameters of the request, namely the language the data is supplied, the "storno" and
             * "copy" status besides an optional remark.
             * Note, that whenever the "storno" and/or "copy" parameters are set then the timestamp of the topmost object
             * reference (SetInvoice or SetReminder) must be defined as >0 otherwise an error will result in the Finalize method.
             *
             * @method SetRequest
             * @param {Object} request                          :REQUIRED:
             * @param {Number} request.eRoleType                :REQUIRED:  Defines the role categories that the main provider is best categorized. If the main provider has an other role than defined then use enRoleOther and additionally supply a role title with a description of the role
             * @param {Number} request.ePlaceType               :REQUIRED:  Defines the principle place where the main provider is applying the treatment
             * @param {String} request.bstrRoleTitle            :OPTIONAL:  Optional role title/description of the main provider. If a suitable predefined role can not be set then bstrRoleTitle is mandatory (use enRoleOther as role in that case)
             * @param {Boolean} request.eIsStorno               :REQUIRED:  Boolean value that defines the "storno" status of the invoice/reminder. eIsStorno should be false when the initial invoice or reminder is produced. At this step the timestamp is generated and returned in the GeneralInvoiceRequestManager::Print and/or GeneralInvoiceRequestManager::GetXML method. Whenever eIsStorno is true then the invoice or reminder timestamp must be set otherwise an error will result.
             * @param {Boolean} request.eIsCopy                 :REQUIRED:  Boolean value that defines the "copy" status of the invoice/reminder. eIsCopy should be false when the initial invoice or reminder is produced. At this step the timestamp is generated and returned in the IGeneralInvoiceRequestManager::Print and/or IGeneralInvoiceRequestManager::GetXML method. Whenever eIsCopy is true then the invoice or reminder timestamp must be set otherwise an error will result.
             * @param {String} request.bstrRemark               :OPTIONAL:  An overall optional remark for the invoice/reminder. Note that the reminder text is printed instead of the remark if bstrReminderText is set in the SetReminder method.
             */
            SetRequest( {eRoleType, ePlaceType, bstrRoleTitle, eIsStorno, eIsCopy, bstrRemark} ) {
                addSumexOperation.call( this, 'SetRequest', {
                    eRoleType,
                    ePlaceType,
                    ...(bstrRoleTitle ? {bstrRoleTitle} : {}),
                    eIsStorno,
                    eIsCopy,
                    ...(bstrRemark ? {bstrRemark} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetTiers_method.html
             * Sets the Tiers Garant (TG) or Tiers Payant (TP) mode together with the VAT number and prepaid amount.
             *
             * @method SetTiers
             * @param {Object} tiers                          :REQUIRED:
             * @param {Number} tiers.eTiersMode               :REQUIRED:  The tiers mode ("Tiers Garant" or "Tiers Payant") to set from the TiersMode enumeration
             * @param {String} tiers.bstrVatNumber            :OPTIONAL:  The VAT number of the biller as given by the "Swiss Federal Tax Administration". if he possesses one. Both forms the old 6-digit number as well as the new UID dependent number are allowed. The latter one can be given in its full form, as UID, or just the digits whereas the last digit is automatically expanded if missing.
             * @param {Number} tiers.dAmountPrepaid           :REQUIRED:  Prepaid amount. The due amount is calculated as «amount + reminder amount - prepaid amount»
             */
            SetTiers( {eTiersMode, bstrVatNumber, dAmountPrepaid = 0} ) {
                addSumexOperation.call( this, 'SetTiers', {
                    eTiersMode,
                    ...(bstrVatNumber ? {bstrVatNumber} : {}),
                    dAmountPrepaid
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetTransport_method.html
             *
             * Sets transport information that is the routing information going from a sender (from) over the first intermediate
             * (via) to the receiver (to). All the involved parties are defined by EAN numbers as defined by Stiftung Refdata.
             * This method allows to define the parameters needed for sign and/or encrypt the resulting XML infoset.
             * Therefore, read the notes about signature and encryption to get familiar with these concepts.
             *
             * @method SetTransport
             * @param {Object} transport                          :REQUIRED:
             * @param {Number} transport.bstrFromEAN              :REQUIRED:  The EAN number of the sender as supplied by Stiftung Refdata
             * @param {Number} transport.bstrFromPFXFile          :OPTIONAL:  The file name of the PFX certificate that is the private certificate of the "from" entity. If the variable is empty or NULL then no signature is applied otherwise a signature might be applied depending on the lXMLGenerationAttributes of the GetXML method.
             * @param {String} transport.bstrFromPFXPassword      :Optional:  The password to open the PFX certificate. The password is only used if a PFX certificate is supplied.
             * @param {String} transport.bstrViaEAN               :REQUIRED:  The EAN number of the first intermediate as supplied by Stiftung Refdata
             * @param {String} transport.bstrToEAN                :REQUIRED:  The EAN number of the recipient as supplied by Stiftung Refdata
             * @param {String} transport.bstrToBinDERFile         :OPTIONAL:  The file name of the binary DER certificate that is the public certificate of the "to" entity. If the variable is empty or NULL then no encryption is applied otherwise encryption might be applied depending on the lXMLGenerationAttributes of the GetXML
             */
            SetTransport( {bstrFromEAN, bstrFromPFXFile, bstrFromPFXPassword, bstrViaEAN, bstrToEAN, bstrToBinDERFile} ) {
                addSumexOperation.call( this, 'SetTransport', {
                    bstrFromEAN,
                    ...(bstrFromPFXFile ? {bstrFromPFXFile} : {}),
                    ...(bstrFromPFXPassword ? {bstrFromPFXPassword} : {}),
                    bstrViaEAN,
                    bstrToEAN,
                    ...(bstrToBinDERFile ? {bstrToBinDERFile} : {})
                } );
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequest/SetTreatment_method.html
             * Sets the basic treatment parameters.
             *
             * @method SetTreatment
             * @param {Object} treatment                        :REQUIRED:
             * @param {String} treatment.bstrAPID               :OPTIONAL:  The optional Administrative Patient IDentification.
             * @param {String} treatment.bstrACID               :OPTIONAL:  The optional Administrative Case IDentification.
             * @param {Date} treatment.dDateBegin               :REQUIRED:  dDateBegin is the start of the treatment. Note, that the date of every service must be greater or equal dDateBegin otherwise it is a content error
             * @param {String} treatment.dDateEnd               :REQUIRED:  dDateEnd is the end of the treatment. Note, that the date of every service must be less or equal dDateEnd otherwise it is a content error
             * @param {String} treatment.eTreatmentCanton       :REQUIRED:  The treatment canton given by the CantonType enumeration
             * @param {String} treatment.eTreatmentType         :REQUIRED:  The treatment type (ambulatory or stationary) given by the TreatmentType enumeration
             * @param {String} treatment.eTreatmentReason       :REQUIRED:  The treatment reason given by the TreatmentReasonType enumeration
             * @param {String} treatment.dGestationWeek13       :OPTIONAL:  Any day of the 13th gestation week as requested by Article 105 of the Swiss Federal Act on Health Insurance (KVV). This date is set once in the first invoice with treatment reason «maternity» and law type «KVG». In any other case a value of 0 is defined, basically to "empty" the semantic meaning. Please note, that the 13th gestation week is copied onto the law case date if a downgrade to V440 is demanded, such that the information is not lost.
             */
            SetTreatment( {bstrAPID, bstrACID, dDateBegin, dDateEnd, eTreatmentCanton, eTreatmentType, eTreatmentReason, dGestationWeek13 = "0001-01-01T12:00:00.000Z"} ) {
                addSumexOperation.call( this, 'SetTreatment', {
                    ...(bstrAPID ? {bstrAPID} : {}),
                    ...(bstrACID ? {bstrACID} : {}),
                    dDateBegin,
                    dDateEnd,
                    eTreatmentCanton,
                    eTreatmentType,
                    eTreatmentReason,
                    dGestationWeek13
                } );
            }
        }

        // IGeneralInvoiceRequestManager -----------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequestManager/index.html
         * The IGeneralInvoiceRequestManager interface provides all the necessary tools to produce an invoice or a reminder
         * of type generalInvoiceRequest_450 or generalInvoiceRequest_440 for all roles and places.
         * Firstly, an instance of the IGeneralInvoiceRequest interface is created by the GetGeneralInvoiceRequest property.
         * All the invoice/reminder related data and parameters can be set by the supplied interface methods like SetPatient, SetTreatment,...
         * After all information is defined the invoice/reminder is printed or a XML infoset is produced which can be
         * electronically transported to a recipient. In the latter case the invoice/reminder optionally can be signed and/or encrypted .
         * Due to the processing attributes "storno" and "copy" a previously generated invoice or reminder can be canceled
         * or a copy can be produced (cf. Notes about processing attributes).
         *
         * @class IGeneralInvoiceRequestManager
         */
        class IGeneralInvoiceRequestManager {
            constructor( invoicelogId ) {
                this.id = invoicelogId;
                this.name = 'IGeneralInvoiceRequestManager';
                this.operations = [];
            }

            /**
             * http://www.sumex1.net/en/xmlmanagers/generalinvoicerequest/api_cpp/v450/IGeneralInvoiceRequestManager/GetXML_method.html
             * The GetXML method generates the XML infoset based on the data of the IGeneralInvoiceRequest interface and
             * the XML generation attributes, validates the XML against the XSD schema, and stores the XML content as UTF8
             * file in the internal working directory. The full file name to this XML document is replied in the
             * pbstrOutputFile output variable.
             *
             * This method is called automatically inside the Sumex Sol after the 'Finalize' operation. Only included here so it can be searched
             *
             * @method GetXML
             */
            GetXML() {}

            /**
             * This method sends the full JSON operations object to the sumex sol.
             *
             * @method sendOperationsToSumexSol
             * @param {Object} request                          :REQUIRED: The full JSON request object
             * @param {String} invoicelogId                      :REQUIRED: For logging
             * @returns {Promise} resolving to {xml}
             */
            static async sendOperationsToSumexSol( request, {invoicelogId, user, schein = {data: {}}, treatmentsFromSchein = [], medicationsFromSchein = []} ) {
                let err, result;

            // Stringifying Operations to Send -------------------------------------------------------------------------
                let stringifiedOperations;

                try {
                    stringifiedOperations = JSON.stringify( request );
                } catch( err ) {
                    Y.log( `SUMEX: sendOperationsToSumexSol(): error in JSON stringifying sumex interface, impossible to send operations for tarmedlog ${invoicelogId}.\n${err && err.stack || err}`, 'error', NAME );
                    throw Y.doccirrus.errors.rest( 'sumex_02', null, true );
                }

            // Sending Data --------------------------------------------------------------------------------------------
                Y.log( `SUMEX: sendOperationsToSumexSol(): sending Sumex operations for invoicelog/invoice ${invoicelogId}:\n${stringifiedOperations}`, 'debug', NAME );
                // IMPORTANT: The Sumex sol is not running locally on mac environments. You can however directly
                // communicate with the sol module running on DCMSOLS. For this to work execute the following command:
                // ssh -L 9000:localhost:SOLPORT root@dcmsols.ci.intra.doc-cirrus.com
                // Where SOLPORT is the Sumex Sol port that you can read from the database, the configs or systemctl status
                // You can direct the request to any sumex service with sumex.json

                let {appCurrentPort, appCurrentIP} = Y.doccirrus.sumexUtils.getStaticSumexIpAndPort( invoicelogId );
                if( !appCurrentPort ) {
                    [err, appCurrentPort] = await formatPromiseResult( Y.doccirrus.sumexUtils.getSumexSolPort() );
                    if( err ) {
                        Y.log( `SUMEX: sendOperationsToSumexSol(): error in reading sumex port from appreg.\n${err && err.stack || err}`, 'error', NAME );
                        throw Y.doccirrus.errors.rest( 'sumex_03', null, true );
                    }
                }
                if( !appCurrentIP ) {
                    appCurrentIP = '127.0.0.1';
                }
                Y.log( `SUMEX: sendOperationsToSumexSol(): ip:port ${appCurrentIP}:${appCurrentPort}`, 'info', NAME );
                [err, result] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        needle.post( `${appCurrentIP}:${appCurrentPort}`, stringifiedOperations, {timeout: 0, connection: 'Keep-Alive'}, (err, res) => {
                            if( err ){
                                return reject( err );
                            } else {
                                resolve( res );
                            }
                        } );
                    } )
                );

                if( err ) {
                    Y.log( `SUMEX: sendOperationsToSumexSol(): error in sending operations to Sumex Sol for tarmedlog ${invoicelogId}:\n${err && err.stack || err}`, 'error', NAME );
                    if (err.code === 'ECONNREFUSED') {
                        //means sumex is off or unreachable
                        throw Y.doccirrus.errors.rest('sumex_01', null, true);
                    }
                    throw Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
                }

            // Handling Result -----------------------------------------------------------------------------------------
                const {statusCode, statusMessage, body} = result;

                if( [503, 504].includes( statusCode ) ) {
                    Y.log( `SUMEX: sendOperationsToSumexSol(): failed Sumex request for tarmedlog ${invoicelogId}.\nStatus code: ${statusCode}\nStatus message: ${statusMessage}.\n${err && err.stack || err}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( statusCode, { message: statusMessage } );
                }
                if( statusCode !== 200 ) {
                    err = Y.doccirrus.errors.rest( 'sumex_15', null, true ); // Communication error
                    Y.log( `SUMEX: sendOperationsToSumexSol(): failed Sumex request for tarmedlog ${invoicelogId}.\nStatus code: ${statusCode}\nStatus message: ${statusMessage}.\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                if( !body ) {
                    err = Y.doccirrus.errors.rest( 'sumex_16', null, true ); // Communication error
                    Y.log( `SUMEX: sendOperationsToSumexSol(): no body in the Sumex Sol response for tarmedlog ${invoicelogId}.\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                return handleIGeneralInvoiceRequestManagerResponse( body, {invoicelogId, user, schein, treatmentsFromSchein, medicationsFromSchein} );
            }
        }

    // generalInvoiceRequest450 ----------------------------------------------------------------------------------------
        const generalInvoiceRequest450 = {
            IAddress,
            IServiceExInput,
            IGeneralInvoiceRequest,
            IGeneralInvoiceRequestManager
        };


// ================================================================================================================== \\
// ================================================ HELPER FUNCTIONS ================================================ \\
        const INTERFACES = new Set( Object.keys( generalInvoiceRequest450 ) );
        const OPERATIONS = new Set( Object.entries( generalInvoiceRequest450 ).reduce( ( operations, currentEntry ) => {
            const currentOperations = Object.getOwnPropertyNames( currentEntry[1].prototype );
            return [...operations, ...currentOperations];
        }, [] ) );

        async function handleIGeneralInvoiceRequestManagerResponse( response, { invoicelogId, schein, treatmentsFromSchein, medicationsFromSchein } ) {
            Y.log( `SUMEX: handleIGeneralInvoiceRequestManagerResponse(): response received from Sumex for tarmed log ${invoicelogId}:\n${JSON.stringify(response)}`, 'debug', NAME );
            let err;

        // The result object will get populated with the xml result
            const result = {
                xml: null,
                warnings: [],
                errors: []
            };

            if( !(response && typeof response === 'object') ) {
                //todo throw error code from response (503, 504, etc.)
                err = new Y.doccirrus.commonerrors.DCError( 500, { message: `Could not interpret the response data structure` } );
                Y.log( `SUMEX: handleIGeneralInvoiceRequestManagerResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the response '${response}' is expected to be an object.\m${err && err.stack || err}`, 'error', NAME );
                throw err;
            }
            const {name, id, operations} = response;

            if( !name || !INTERFACES.has( name ) ) {
                err = Y.doccirrus.errors.rest( 'sumex_03', null, true ); // Communication error
                Y.log( `SUMEX: handleIGeneralInvoiceRequestManagerResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: ${name} is not a valid interface name.\n${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !(Array.isArray( operations ) && operations.length) ) {
                err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                Y.log( `SUMEX: handleIGeneralInvoiceRequestManagerResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${name} interface object with id ${id} is expected to have an operations field with an non empty array value.\n${err && err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err] = await formatPromiseResult( checkOperations( operations ) );

            if( err ) {
                Y.log( `SUMEX: handleIGeneralInvoiceRequestManagerResponse(): Error in checking operations for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                throw err;
            }

            return result;

            async function checkOperations( operations ) {
                let err;
                for( let operation of operations ) {
                    const operationNames = Object.keys( operation ).filter( key => OPERATIONS.has( key ) );

                    if( !(operation && typeof operation === 'object') ) {
                        err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                        Y.log( `SUMEX: checkOperations(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${inspect( operation, {depth: 1} )} is expected to be an object.\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    if( !operationNames.length ) {
                        err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                        Y.log( `SUMEX: checkOperations(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${inspect( operation, {depth: 1} )} does not contain a valid operation name key.\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    if( operationNames.length > 1 ) {
                        err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                        Y.log( `SUMEX: checkOperations(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${inspect( operation, {depth: 1} )} contains more than one valid operation name key.\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    const operationName = operationNames[0];
                    const params = operation[operationName];

                    if( !(Array.isArray( params )) ) {
                        err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                        Y.log( `SUMEX: checkOperations(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${operationName} field of the operation object: ${inspect( operation, {depth: 1} )} is expected to be an array.\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    [err] = await formatPromiseResult( checkParams( params, operation ) ); // Might include nested interfaces

                    if( err ) {
                        Y.log( `SUMEX: checkOperations(): Error in checking params for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                        throw err;
                    }

                    [err] = await formatPromiseResult( checkStatus( operation, operationName ) );

                    if( err ) {
                        Y.log( `SUMEX: checkOperations(): Error in checking status for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                        throw err;
                    }
                }
            }

            async function checkParams( params, operation ) {
                for( let param of params ) {
                    if( !(param && typeof param === 'object') ) {
                        err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                        Y.log( `SUMEX: checkParams(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the param field ${param} of the operation object:\n${inspect( operation, {depth: 1} )}\nis expected to be an object.\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    const {name, id, operations} = param; // Nested Interface

                    if( INTERFACES.has( name ) ) {
                        if( !(Array.isArray( operations ) && operations.length) ) {
                            err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                            Y.log( `SUMEX: checkParams(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${name} interface object with id ${id} is expected to have an operations field with an non empty array value.${err && err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        [err] = await formatPromiseResult( checkOperations( param ) );

                        if( err ) {
                            Y.log( `SUMEX: checkParams(): Error in checking operations for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                            throw err;
                        }
                    }
                }
            }

            function mapActivityToErrorLog(activity) {
                return  {
                    id: activity._id,
                    code: activity.code,
                    actType: activity.actType,
                    timestamp: activity.timestamp,
                    employeeId: activity.employeeId,
                    locationId: activity.locationId
                };
            }

            async function checkStatus( operation, operationName ) {
                const {status} = operation;
                let err;

            // All Operations ------------------------------------------------------------------------------------------
                if( status !== true ) {
                    err = Y.doccirrus.errors.rest( 'sumex_16', null, true );
                    Y.log( `SUMEX: checkStatus(): Could not generate invoice XML for tarmedlog ${invoicelogId}: SUMEX operation ${operationName} failed with status ${status}. Full operation:\n${inspect( operation, {depth: 2} )}\n${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }
                const {commandStatus, pbstrAbort, plStatus} = operation,
                    mainLocationId = schein.data.locationId || schein.data.mainLocationId,
                    {caseFolderId, patientId} = schein.data;

                if ( commandStatus === false ) {
                    const errorObj = Y.doccirrus.ruleset.sumex.getFieldsByMessage( pbstrAbort ) || {};
                    let matchedActivity, id, link, affectedActivities = [];

                    if(['AddService', 'AddServiceEx'].includes(operationName)) {
                        const bstrCode = operation[operationName].map(field => field.bstrCode).find(bstrCode => bstrCode);
                        affectedActivities = [
                            ...treatmentsFromSchein.filter(treatment => treatment.code === bstrCode).map(mapActivityToErrorLog),
                            ...medicationsFromSchein.filter(medication => medication.code === bstrCode).map(mapActivityToErrorLog)
                        ];
                        matchedActivity = affectedActivities[0];
                    }

                    switch( errorObj.entry ) {
                        case 'location':
                            id = matchedActivity ? matchedActivity.locationId : mainLocationId;
                            link = `/admin/insuite#/location/${id}`;
                            break;
                        case 'activity':
                            link = matchedActivity ? `/incase#/activity/${matchedActivity.id}` : null;
                            break;
                        case 'employee':
                            id = matchedActivity ? matchedActivity.employeeId : schein.employeeId;
                            link =`/admin/insuite#/employee/${id}`;
                            break;
                    }
                    const error = {
                        source: "SUMEX",
                        value: plStatus,
                        text: pbstrAbort,
                        originalText: pbstrAbort,
                        locationId: mainLocationId,
                        patientId: patientId,
                        scheinId: schein._id,
                        caseFolderId: caseFolderId,
                        link,
                        affectedActivities
                    };

                    result.errors.push( error );
                } else if (operation.pbstrAbort && !result.errors.length) {
                    const errorMessage = operation.pbstrAbort,
                        clearMessage = errorMessage.substring(errorMessage.indexOf('reason'), errorMessage.indexOf('line:')),
                        error = {
                        source: "SUMEX",
                        value: plStatus,
                        text: clearMessage,
                        originalText: clearMessage,
                        locationId: mainLocationId,
                        patientId: patientId,
                        scheinId: schein._id,
                        caseFolderId: caseFolderId
                    };
                    result.errors.push( error );
                }

            // Print   ------------------------------------------------------------------------------------------------
                if( operationName === 'Print' ) {
                    const {pdfContent} = operation;

                    if( !pdfContent ) {
                        Y.log( `SUMEX: Print(): No pdfContent was returned for tarmedlog ${invoicelogId}.Full operation:\n${inspect( operation, {depth: 2} )}`, 'debug', NAME );
                    } else {
                        result.pdf = pdfContent;
                    }
                }

            // Finalize ------------------------------------------------------------------------------------------------
                if( operationName === 'Finalize' ) {
                    const {xmlContent} = operation;

                    if( !xmlContent ) {
                        Y.log( `SUMEX: checkStatus(): No xmlContent was returned for tarmedlog ${invoicelogId}.Full operation:\n${inspect( operation, {depth: 2} )}\n${err && err.stack || err}`, 'debug', NAME );
                    }

                    result.xml = xmlContent;
                }
            }
        }

        Y.namespace( 'doccirrus' ).sumexGeneralInvoiceRequest450 = {
            name: NAME,
            generalInvoiceRequest450
        };
    },
    '0.0.1', {
        requires: ['sumex-utils']
    }
);

