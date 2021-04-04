/**
 * User: dcdev
 * Date: 4/17/20  6:02 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

YUI.add( 'sumex-api', function( Y, NAME ) {

    const {formatPromiseResult} = require( 'dc-core' ).utils,
        {generalInvoiceRequest450: {IServiceExInput, IGeneralInvoiceRequest, IGeneralInvoiceRequestManager}} = Y.doccirrus.sumexGeneralInvoiceRequest450,
        {version} = require( process.cwd() + '/package.json' ),
        fs = require( 'fs' );

    /**
     * This method generates a TARMED invoice for a given patient and schein.
     * I) .... Check Data
     * II) ... Initialize
     * III) .. SetInvoice
     * IV) ... SetPackage
     * V) .... SetRequest
     * VI) ... SetProcessing
     * VII) .. SetTransport
     * VIII) . SetLaw
     * IX) ... SetBiller
     * X) .... SetProvider
     * XI) ... SetInsurance
     * XII) .. SetTiers
     * XIII) . SetEsr
     * XIV) .. SetPatient
     * XV) ... AddServices
     * XVI) .. SetTreatment
     *          A) Intitialize
     *          B) SetPatient
     *          C) SetPhysician
     *          D) SetDignities
     *          E) SetTreatment
     *          F) AddService
     * XVII) . Finalize
     * XVIII)  Send Operations
     *
     * @PUBLIC
     * @method generateInvoiceDocuments
     *
     * @param {Object} args                        :REQUIRED:
     * @param {Object} args.invoicelogId           :REQUIRED: Used for logging
     * @param {Object} args.schein                 :REQUIRED: invoiceentry with type='schein'
     * @param {Object} args.user                   :REQUIRED: Used for DB operations
     * @param {String} args.requestType            :REQUIRED: Used to define weather to generate documents or no
     * @returns {Promise} resolving to {xml}
     */
    async function generalInvoiceRequest( {invoicelogId, schein = {data: {}}, user, requestType = 'validate'} ) {

        Y.log("Entering Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
        let err, result;
        const patientId = schein.data.patientId;

        function escapeXML( str ) {
            str = str || "";
            return str.replace( /&/g, '&amp;' )
                .replace( /</g, '&lt;' )
                .replace( />/g, '&gt;' )
                .replace( /"/g, '&quot;' )
                .replace( /'/g, '&apos;' );
        }

        // I) Check Data -----------------------------------------------------------------------------------------------
        if( !schein ) {
            Y.log( `SUMEX: generateInvoiceDocuments(): no schein entry found for patient ${patientId} and invoicelog/invoice ${invoicelogId}.`, 'warn', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw Y.doccirrus.errors.rest( 'sumex_09', null, true );
        }

        const patient = schein.data && schein.data.patient;

        if( !patient ) {
            err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
            Y.log( `SUMEX: generateInvoiceDocuments(): no patient found on first schein entry for patient ${patientId} and invoicelog/invoice ${invoicelogId}:\n${err.stack}`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw err;
        }

        if( !patient.insuranceStatus || !patient.insuranceStatus.length ) {
            err = Y.doccirrus.errors.rest( 'sumex_18', null, true );
            Y.log( `SUMEX: generateInvoiceDocuments(): no patient insurance found on first schein entry for patient ${patientId} and invoicelog/invoice ${invoicelogId}:\n${err.stack}`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw err;
        }

        const scheinLocationId = schein.data && schein.data.locationId; // The location will be the same on each schein as invoice log entries exist by location.

        if( !scheinLocationId ) {
            err = Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
            Y.log( `SUMEX: generateInvoiceDocuments(): no location found on first schein entry for patient ${patientId} and invoicelog/invoice ${invoicelogId}:\n${err.stack}`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw err; // Data error
        }

        // II) Initialize() --------------------------------------------------------------------------------------------
        const iGeneralInvoiceRequest = new IGeneralInvoiceRequest( invoicelogId );
        let dunningSchema, sumexInvoice;

        [err, sumexInvoice] = await formatPromiseResult( Y.doccirrus.sumexMappers.mapInSuiteInvoiceDataToSumexParams( {
            invoicelogId, schein, user, patientId, version
        } ) );

        if( err || !sumexInvoice ) {
            Y.log( `SUMEX: generateInvoiceDocuments(): failed to get sumex Params for location ${scheinLocationId} \n${err && err.stack || err}`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
        }

        if( sumexInvoice.errors && sumexInvoice.errors.length ) {
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            return {errors: sumexInvoice.errors};
        }
        const sumexInvoiceParams = sumexInvoice.params;

        [err, dunningSchema] = await formatPromiseResult(
            Y.doccirrus.api.invoiceconfiguration.getDunningScheme( user, scheinLocationId )
        );
        if( err || !dunningSchema ) {
            Y.log( `SUMEX: generateInvoiceDocuments(): failed to get dunningSchema for location ${scheinLocationId} \n${err && err.stack || err}`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
        }

        const tierMode = schein.data.isTiersPayant ? 1 : 0,
            insurance = patient.insuranceStatus.find( insurer => insurer.type === schein.data.caseFolderTypeSingle );
        //todo check if schein.caseFolderType can contain several values

        iGeneralInvoiceRequest.Initialize();

        // III) SetInvoice() --------------------------------------------------------------------------------------------
        iGeneralInvoiceRequest.SetInvoice( {
            bstrRequestInvoiceID: schein.data.invoiceNo || "",
            dRequestInvoiceDate: new Date(),
            lRequestInvoiceTimestamp: 0     // 0: new invoice
        } );
        // IV) SetPackage() --------------------------------------------------------------------------------------------
        const {sumexVersionParams} = sumexInvoiceParams;
        iGeneralInvoiceRequest.SetPackage( sumexVersionParams );

        // V) SetRequest() ---------------------------------------------------------------------------------------------
        const bstrRemark = schein.data.scheinNotes || dunningSchema.invoiceText || '';
        iGeneralInvoiceRequest.SetRequest( {
            eRoleType: 1,       // Hard coded intentionally: 1 - The main provider is a physician
            ePlaceType: 1,      // Hard coded intentionally: 1 - The service location is a practice
            eIsStorno: 0,       // TODO: Check - is this correct?
            eIsCopy: 0,         // TODO: Check - is this correct?
            bstrRemark
        } );

        // VI) SetProcessing() -----------------------------------------------------------------------------------------
        //TODO: Check - Token?
        iGeneralInvoiceRequest.SetProcessing( {
            ePrintAtIntermediate: 0,    // TODO: Check - is this correct?
            ePrintGuarantorCopy: 0,     // TODO: Check - is this correct?
            lRequestInvoiceTimestamp: 0     // 0: new invoice
        } );

        // VII) SetTransport() -----------------------------------------------------------------------------------------
        const {sumexTransportParams} = sumexInvoiceParams;
        // TODO: Check - Encryption params?
        iGeneralInvoiceRequest.SetTransport( sumexTransportParams );

        // VIII) SetLaw() ----------------------------------------------------------------------------------------------
        const {sumexLawParams} = sumexInvoiceParams;
        iGeneralInvoiceRequest.SetLaw( sumexLawParams );

        // VIII) SetCard() ----------------------------------------------------------------------------------------------
        if( insurance.vekaCardNo && insurance.cardExpiryDate && insurance.cardValidationDate ) {
            /* Although cardExpiryDate and cardValidationDate are stored in patients collection as ISODate, they are
             * stored in invoiceconfiguration collection as String */
            iGeneralInvoiceRequest.SetCard( {
                bstrCardID: insurance.vekaCardNo,
                dExpiryDate: insurance.cardExpiryDate,
                dValidationDate: insurance.cardValidationDate
            } );
        }

        // IX) SetBiller() ---------------------------------------------------------------------------------------------
        const {sumexBillerParams} = sumexInvoiceParams;
        iGeneralInvoiceRequest.SetBiller( sumexBillerParams );

        // X) SetProvider() --------------------------------------------------------------------------------------------
        const {sumexProviderParams} = sumexInvoiceParams;
        iGeneralInvoiceRequest.SetProvider( sumexProviderParams );

        // XI) Set Insurance and Debitor depending on Tier mode --------------------------------------------------------
        const {sumexInsuranceParams} = sumexInvoiceParams;

        iGeneralInvoiceRequest.SetInsurance( sumexInsuranceParams );

        if( tierMode === 1 ) {
            iGeneralInvoiceRequest.SetDebitor( {bstrEAN: insurance.insuranceGLN || "2000000000008"} );
        }

        // RR) SetReferrer & SetGuarantor() -------------------------------------------------------------------------------------------
        let {sumexReferrerParams, sumexGuarantorParams} = sumexInvoiceParams;

        if( sumexReferrerParams ) {
            iGeneralInvoiceRequest.SetReferrer( sumexReferrerParams );
        }

        if( schein.data.isTiersGarant && sumexGuarantorParams ) {
            iGeneralInvoiceRequest.SetGuarantor( sumexGuarantorParams );
        }

        // XII) SetTiers() ---------------------------------------------------------------------------------------------
        //TODO: Check - hardcoded for now, check what needs to happen with it
        const {sumexTiersParams} = sumexInvoiceParams;
        iGeneralInvoiceRequest.SetTiers( {
            ...sumexTiersParams,
            eTiersMode: tierMode
        } );

        // XIII) SetEsr() ----------------------------------------------------------------------------------------------
        const sumexEsrParams = {
            ...sumexInvoiceParams.sumexBankParams,
            lPaymentPeriod: dunningSchema.invoiceDays || 0
        };
        iGeneralInvoiceRequest.SetEsr( sumexEsrParams );

        // XIV) SetPatient() -------------------------------------------------------------------------------------------
        const {sumexPatientParams} = sumexInvoiceParams;
        if( sumexPatientParams.errors ) {
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            return {errors: sumexPatientParams.errors};
        }
        iGeneralInvoiceRequest.SetPatient( sumexPatientParams );

        // XV) AddServices() -------------------------------------------------------------------------------------------
        const {sumexScheinParams} = sumexInvoiceParams;

        // XV) AddDiagnosis if existing
        const {diagnoses} = sumexScheinParams;

        if( diagnoses && diagnoses.length ) {
            diagnoses.forEach( diagnosis => {
                iGeneralInvoiceRequest.AddDiagnosis( diagnosis );
            } );
        }

        // XV) Set Treatment Configs -----------------------------------------------------------------------------------
        const {treatments, reasonType, treatmentType, cantonCode, medications: sumexMedications} = sumexScheinParams;

        const treatmentsAndMedications = treatments.concat( sumexMedications );

        const dDateBegin = treatmentsAndMedications.length ? treatmentsAndMedications.reduce( ( minDate, currentService ) => {
            return new Date( currentService.dDateBegin ) < new Date( minDate ) ? currentService.dDateBegin : minDate;
        }, new Date( 8640000000000000 ) ) : "0001-01-01T12:00:00.000Z";
        const dDateEnd = treatmentsAndMedications.length ? treatmentsAndMedications.reduce( ( maxDate, currentService ) => {
            return new Date( currentService.dDateBegin ) > new Date( maxDate ) ? currentService.dDateBegin : maxDate;
        }, new Date( -8640000000000000 ) ) : "0001-01-01T12:00:00.000Z";

        iGeneralInvoiceRequest.SetTreatment( {
            dDateBegin,
            dDateEnd,
            eTreatmentCanton: cantonCode,
            eTreatmentType: treatmentType,
            eTreatmentReason: reasonType
        } );

        for( let i = 0; i < treatments.length; i++ ) {
            const {physician, bstrTariffType, bstrCode, bstrReferenceCode,
                dQuantity, lSessionNumber, dDateBegin, eIgnoreValidate, bstrText, eLaw, dVatRate} = treatments[i];

            //For TARMED (001) we do AddServiceEx, but for EAL and MIGEL we do AddService
            if( bstrTariffType !== '001' ) {
                const {dUnit} = treatments[i];

                iGeneralInvoiceRequest.AddService( {
                    bstrTariffType,
                    bstrCode,
                    bstrReferenceCode,
                    dQuantity,
                    lSessionNumber,
                    dDateBegin,
                    bstrProviderEAN: physician.bstrEanNumberProvider,
                    bstrResponsibleEAN: physician.bstrEanNumberResponsible,
                    bstrText,
                    dUnit,
                    dVatRate,
                    dExternalFactor: 1,
                    eIgnoreValidate,
                    dUnitFactor: 1
                } );
                continue;
            }
            const {eTreatmentType, eSettlement, eSide, bstrEanNumberSection, dUnitFactorMT, dUnitInternalScalingFactorTT, dUnitInternalScalingFactorMT, dUnitFactorTT, dUnitMT, dUnitTT} = treatments[i];
            const {bstrQLCodes, bstrEanNumberResponsible} = physician;

            const dAmountMT = dUnitMT * dUnitFactorMT * dUnitInternalScalingFactorMT * dQuantity,
                dAmountTT = dUnitTT * dUnitFactorTT * dUnitInternalScalingFactorTT * dQuantity;

            // A) Initialize -------------------------------------------------------------------------------------------
            const iServiceExInput = new IServiceExInput( patientId );
            iServiceExInput.Initialize();

            // B) SetPatient -------------------------------------------------------------------------------------------
            iServiceExInput.SetPatient( {
                ...sumexPatientParams,
                eSex: sumexPatientParams.eSexType
            } );

            // C) Set Physician ----------------------------------------------------------------------------------------
            iServiceExInput.SetPhysician( physician );

            // D) Set Dignities ----------------------------------------------------------------------------------------
            // 1) Init Dignities -----------------------------------------------------------------------------------
            iServiceExInput.InitDignity();

            // 2) Add Dignities ------------------------------------------------------------------------------------
            for( let j = 0; j < bstrQLCodes.length; j++ ) {
                iServiceExInput.AddDignity( {
                    bstrEanNumber: bstrEanNumberResponsible,
                    bstrQLCode: bstrQLCodes[j]
                } );
            }

            // E) Set Treatment Configs --------------------------------------------------------------------------------
            iServiceExInput.SetTreatment( {
                eCanton: cantonCode,
                eLaw,
                eTreatmentType,
                eSettlement,
                bstrEanNumberSection
            } );

            // F) Add Service (Treatment) ------------------------------------------------------------------------------
            // Note that GetAbortInfo() is called by the Sumex sol if this operation results in an error
            // TODO: bstrReferenceCode needs to come from linked SUMEX treatments
            iGeneralInvoiceRequest.AddServiceEx( {
                IServiceExInput: iServiceExInput,
                bstrTariffType,
                bstrCode,
                bstrReferenceCode,
                dQuantity,
                lSessionNumber,
                dDateBegin,
                eSide,
                eIgnoreValidate,
                dUnitInternalScalingFactorMT,
                dUnitInternalScalingFactorTT,
                dUnitFactorMT,
                dUnitFactorTT,
                dUnitMT,
                dUnitTT,
                dVatRate,
                dAmountMT,
                dAmountTT,
                bstrText
            } );
        }

        // XVII) Add Service (Medications) -----------------------------------------------------------------------------
        // TODO: should price of Medication be included in XML invoice?
        const {medications} = sumexScheinParams;


        for( let i = 0; i < medications.length; i++ ) {
            const {
                physician, bstrTariffType, bstrCode, bstrReferenceCode, dQuantity, lSessionNumber, dDateBegin,
                bstrText, eIgnoreValidate, dUnitFactor, dUnit, dExternalFactor, dVatRate
            } = medications[i];
            iGeneralInvoiceRequest.AddService( {
                bstrTariffType,
                bstrCode,
                bstrReferenceCode,
                dQuantity,
                lSessionNumber,
                dDateBegin,
                bstrProviderEAN: physician.bstrEanNumberProvider,
                bstrResponsibleEAN: physician.bstrEanNumberResponsible,
                bstrText,
                dUnit,
                dVatRate,
                dExternalFactor,
                eIgnoreValidate,
                dUnitFactor
            } );

        }

        // XVII) Finalize ----------------------------------------------------------------------------------------------
        // TODO: SetInsured needed for newborns?

        if( requestType === 'generate' ) {
            iGeneralInvoiceRequest.Print();
            iGeneralInvoiceRequest.Finalize();
        }

        // XVIII) Send Operations --------------------------------------------------------------------------------------
        const {treatmentsFromSchein, medicationsFromSchein} = sumexScheinParams;
        [err, result] = await formatPromiseResult(
            IGeneralInvoiceRequestManager.sendOperationsToSumexSol( iGeneralInvoiceRequest, {
                user,
                schein,
                invoicelogId,
                treatmentsFromSchein,
                medicationsFromSchein
            } )
        );

        if( err || !result ) {
            Y.log( `SUMEX: genereateTarmedInvoice(): error in sending iGeneralInvoiceRequest operations for patient ${patientId} and invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
            Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
            throw err || Y.doccirrus.errors.rest( 'sumex_09', null, true ); // Data error
        }
        let {xml, pdf, errors, warnings, request} = result;

        if( requestType === 'validate' ) {
            return {errors, warnings, request};
        }

        if( xml && tierMode === 0 && insurance && insurance.insuranceGLN ) {
            const companyName = escapeXML( insurance.insurancePrintName || insurance.insuranceName );

            let insuranceSample = `<invoice:insurance ean_party="${insurance.insuranceGLN}">` +
                                  `<invoice:company>` +
                                  `<invoice:companyname>${companyName}</invoice:companyname>`;
            if( insurance.address1 && insurance.zipcode && insurance.city ) {
                const city = escapeXML( insurance.city ),
                    street = escapeXML( insurance.address1 );

                insuranceSample = `${insuranceSample}<invoice:postal>` +
                                  `<invoice:street>${street}</invoice:street>` +
                                  `<invoice:zip>${insurance.zipcode}</invoice:zip>` +
                                  `<invoice:city>${city}</invoice:city>` +
                                  `</invoice:postal>`;
            }
            if( insurance.phone ) {
                insuranceSample = `${insuranceSample}<invoice:telecom><invoice:phone>${insurance.phone}</invoice:phone></invoice:telecom>`;
            }
            if( insurance.email ) {
                const email = escapeXML( insurance.email );
                insuranceSample = `${insuranceSample}<invoice:online><invoice:email>${email}</invoice:email></invoice:online>`;
            }

            insuranceSample = `${insuranceSample}</invoice:company></invoice:insurance>`;

            let providerEnding = '</invoice:provider>';
            let providerEndingIndex = xml.indexOf( providerEnding );
            xml = xml.slice( 0, providerEndingIndex + providerEnding.length ) + insuranceSample + xml.slice( providerEndingIndex + providerEnding.length );
        }
        Y.log("Exiting Y.doccirrus.api.sumex.generateInvoiceDocuments", 'info', NAME);
        return {xml, pdf, errors, request};
    }

    /**
     * This method creates PDF copy of invoice.
     *
     * @PUBLIC
     * @method generateInvoiceCopy
     *
     * @param {Object} args                     :REQUIRED:
     * @param {Object} args.user                :REQUIRED: Used for DB operations
     * @param {Object} args.ownerId             :REQUIRED: copy PDF will be associated with
     * @param {Object} args.schein              :REQUIRED:
     * @param {Object} args.xml                 :REQUIRED: xml of the invoice
     * @returns {Object} with copyPdf (saved through gridfs) or errors
     */
    async function generateInvoiceCopyPdf( {user, ownerId, schein = {data: {}}, xml} ) {
        Y.log( `Entering Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
        let err, resultObj, dunningSchema;
        const locationId = schein.data.locationId || schein.data.mainLocationId;

        [err, dunningSchema] = await formatPromiseResult(
            Y.doccirrus.api.invoiceconfiguration.getDunningScheme( user, locationId )
        );
        if( err || !dunningSchema ) {
            Y.log( `SUMEX: generateInvoiceCopy(): failed to get dunningSchema for location ${locationId} \n${err && err.stack || err}`, 'error', NAME );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            throw Y.doccirrus.errors.rest( 'sumex_07', null, true ); // Generic error
        }

        const iGeneralInvoiceRequestCopy = new IGeneralInvoiceRequest( ownerId ),
            base64InvoiceXml = Buffer.from( xml ).toString( 'base64' ),
            bstrRemark = dunningSchema.invoiceText || '';

        iGeneralInvoiceRequestCopy.LoadXML( {bstrInputFile: base64InvoiceXml} );
        iGeneralInvoiceRequestCopy.SetRequest( {
            eRoleType: 1,       // Hard coded intentionally: 1 - The main provider is a physician
            ePlaceType: 1,      // Hard coded intentionally: 1 - The service location is a practice
            eIsStorno: 0,
            eIsCopy: 1,
            bstrRemark
        } );
        iGeneralInvoiceRequestCopy.Print();
        iGeneralInvoiceRequestCopy.Finalize();
        [err, resultObj] = await formatPromiseResult(
            IGeneralInvoiceRequestManager.sendOperationsToSumexSol( iGeneralInvoiceRequestCopy,
                {
                    user,
                    invoicelogId: ownerId,
                    schein
                } )
        );
        if( err || !resultObj || !resultObj.pdf ) {
            Y.log( `Failed to generate copy of invoice for invoicelog/invoice ${ownerId}`, 'error', NAME );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            throw err || Y.doccirrus.errors.rest( 'sumex_07' );
        }
        return resultObj;
    }

    /**
     * This method creates PDF and XML for warning activity.
     *
     * @PUBLIC
     * @method generateInvoiceCopy
     *
     * @param {Object} args                     :REQUIRED:
     * @param {Object} args.user                :REQUIRED: Used for DB operations
     * @param {Object} args.warning             :REQUIRED:
     * @param {Object} args.invoice             :REQUIRED:
     * @returns {Object} with xml string and pdf base64
     */

    async function generateWarningDocuments( {user, warning, invoice} ) {
        let err, result, sumexWarning, invoiceXml;

        [err, invoiceXml] = await formatPromiseResult( getXmlFromInvoice( {user, invoice, warningId: warning._id} ) );

        if( err || !invoiceXml ) {
            Y.log( `Failed to get xml file from invoice ${invoice._id} for warning ${warning._id}`, 'info', NAME );
            err = err || new Y.doccirrus.commonerrors.DCError( 200, {message: 'XML from invoice not found.'} );
            throw err;
        }

        const base64InvoiceXml = Buffer.from( invoiceXml ).toString( 'base64' );

        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            action: 'get',
            model: 'location',
            query: {
                _id: warning.locationId
            }
        } ) );

        if( err || !result || !result.length ) {
            err = err || Y.doccirrus.errors.rest( 'sumex_07', null, true );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            throw err;
        }
        const location = result[0];

        [err, sumexWarning] = await formatPromiseResult( Y.doccirrus.sumexMappers.mapInSuiteWarningDataToSumexParams( {
            user, warning, invoice
        } ) );

        if( err || !sumexWarning ) {
            Y.log( `Error in mapping inSuite warning ${warning._id} fields to Sumex params for invoice ${invoice._id}.\n${err && err.stack || err}`, 'error', NAME );
            err = Y.doccirrus.errors.rest( 'sumex_02' );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            throw err;
        }

        if( sumexWarning.errors && sumexWarning.errors.length ) {
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            return {errors: sumexWarning.errors};
        }

        const {requestParams, reminderParams, warningBankParams} = sumexWarning.params,
            bankParams = Y.doccirrus.sumexMappers.bankToSumexParams( warning._id, location, invoice.referenceNo ),
            iGeneralInvoiceRequest = new IGeneralInvoiceRequest( warning._id );

        iGeneralInvoiceRequest.LoadXML( {bstrInputFile: base64InvoiceXml} );
        iGeneralInvoiceRequest.SetRequest( {...requestParams} );
        iGeneralInvoiceRequest.SetReminder( {...reminderParams} );
        iGeneralInvoiceRequest.SetEsr( {
            ...bankParams,
            ...warningBankParams
        } );
        iGeneralInvoiceRequest.Print();
        iGeneralInvoiceRequest.Finalize();

        [err, result] = await formatPromiseResult(
            IGeneralInvoiceRequestManager.sendOperationsToSumexSol( iGeneralInvoiceRequest,
                {
                    user,
                    invoicelogId: warning._id,
                    schein: {data: {...warning}}
                } )
        );

        if( err ) {
            Y.log( `SUMEX: generateInvoiceCopy(): error in sending iGeneralInvoiceRequest operations for patient ${warning.patientId} and invoicelog/invoice ${warning._id}.`, 'error', NAME );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
            throw err;
        }
        Y.log( `Exiting Y.doccirrus.api.sumex.generateInvoiceCopy`, 'info', NAME );
        return result;
    }

    /**
     * This method creates inkasso PDF for invoice.
     *
     * @PUBLIC
     * @method generateInvoiceCopy
     *
     * @param {Object} args                     :REQUIRED:
     * @param {Object} args.user                :REQUIRED: Used for DB operations
     * @param {Object} args.invoice             :REQUIRED:
     * @param {Object} args.warning             :REQUIRED: May contain only timestamp and actType
     * @returns {Object} with xml string and pdf base64
     */

    async function generateInkassoPdf( {user, invoice, warning} ) {
        Y.log( `Exiting Y.doccirrus.api.sumex.generateInkassoPdf`, 'info', NAME );
        let error, result, invoiceXml;

        [error, invoiceXml] = await formatPromiseResult( getXmlFromInvoice( {user, invoice, warningId: invoice._id} ) );

        if( error || !invoiceXml ) {
            Y.log( `generateInkassoPdf(): Failed to get xml file from invoice ${invoice._id} `, 'error', NAME );
            error = error || new Y.doccirrus.commonerrors.DCError( 200, {message: 'XML from invoice not found.'} );
            throw error;
        }

        const base64InvoiceXml = Buffer.from( invoiceXml ).toString( 'base64' ),
            iGeneralInvoiceRequest = new IGeneralInvoiceRequest( invoice._id );

        iGeneralInvoiceRequest.LoadXML( {bstrInputFile: base64InvoiceXml} );
        iGeneralInvoiceRequest.SetReminder( {
            bstrRequestReminderID: invoice.invoiceNo,
            dRequestReminderDate: warning.timestamp,
            lRequestReminderTimestamp: Math.round( (new Date( warning.timestamp )).getTime() / 1000 ),
            bstrReminderText: "Inkasso",
            dAmountReminder: 0,
            lReminderLevel: warning.actType === 'WARNING1' ? 2 : 3
        } );
        iGeneralInvoiceRequest.Print( "Inkasso" );
        iGeneralInvoiceRequest.Finalize();

        [error, result] = await formatPromiseResult(
            IGeneralInvoiceRequestManager.sendOperationsToSumexSol( iGeneralInvoiceRequest,
                {
                    user,
                    invoicelogId: invoice._id,
                    schein: {data: {...invoice}}
                } )
        );

        if( error ) {
            Y.log( `generateInkassoPdf(): error in sending iGeneralInvoiceRequest operations for patient ${invoice.patientId} and invoicelog/invoice ${invoice._id}.`, 'error', NAME );
            Y.log( `Exiting Y.doccirrus.api.sumex.generateInkassoPdf`, 'info', NAME );
            throw error;
        }

        Y.log( `Exiting Y.doccirrus.api.sumex.generateInkassoPdf`, 'info', NAME );
        return result;
    }

    /**
     * gets XML from invoice
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.invoice
     * @param {String} args.warningId
     * @returns {Buffer} - invoice XML buffer
     */

    async function getXmlFromInvoice({user, invoice, warningId}) {
        let err, result, xmlDoc, invoiceDocs;
        if( !(invoice && invoice.attachedMedia && invoice.attachedMedia.length) ) {
            Y.log(`no result for invoiceref attachments ${invoice && invoice._id}`, 'error', NAME );
            throw Y.doccirrus.errors.rest( 'sumex_07', null, true );
        }
        [err, invoiceDocs] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({user,
            action: 'get',
            model: 'document',
            query: {_id: {$in: invoice.attachments}}
        }));

        if ( err || !Array.isArray(invoiceDocs) || !invoiceDocs.length) {
            err = err || Y.doccirrus.errors.rest('sumex_12');
            Y.log(`error in getting invoice ${invoice._id} documents:\n${err.stack || err}`, 'error', NAME );
            throw err;
        }
        xmlDoc = invoiceDocs.find(item => 'SUMEXXML' === item.type && item.mediaId);

        if ( !xmlDoc ) {
            err = Y.doccirrus.errors.rest( 'sumex_07', null, true );
            Y.log(`no xml attached to invoice ${invoice._id}`, 'error', NAME );
            throw err;
        }

        let tempFile = `${Y.doccirrus.media.getTempDir()} ${warningId}-${invoice._id}.xml`;

        [err] = await formatPromiseResult( new Promise( ( resolve, reject ) => Y.doccirrus.media.gridfs.exportFile(
            user,
            xmlDoc.mediaId,
            tempFile,
            false,
            (err, res) => {
                if(err) {
                    reject( err );
                }
                resolve(res);
            } )));

        if( err ) {
            Y.log( `error in loading file ${ xmlDoc.mediaId } .\n${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
            fs.readFile(tempFile, 'utf8', function(err, result) {
                if ( err ) {
                    reject( err );
                }
                resolve( result );
            } );
        }));

        if( err ) {
            Y.log( `error when parsing file.\n${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        if( !result ) {
            err = Y.doccirrus.errors.rest( 'sumex_07', null, true );
            Y.log( `no data to build xml.\n${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        return result;
    }

    Y.namespace( 'doccirrus.api' ).sumex = {
        generalInvoiceRequest,
        generateWarningDocuments,
        getXmlFromInvoice,
        generateInvoiceCopyPdf,
        generateInkassoPdf
    };
}, '0.0.1', {requires: []} );