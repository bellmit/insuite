/**
 * User: oliversieweke
 * Date: 18.03.19  10:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/**
 * User: oliversieweke
 * Date: 29.11.18  16:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'sumex-tarmedValidator100', function( Y, NAME ) {

        const {inspect} = require( 'util' );
        const _ = require( 'lodash' );
        const needle = require( 'needle' );
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const {addSumexOperation} = Y.doccirrus.sumexUtils;

// ================================================================================================================== \\
// ================================================ SUMEX INTERFACES ================================================ \\
// The methods below are written so as to correspond to the SUMEX API described here:
// http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/index.html#importantDocs
// Note that there is no immediate interaction with the Sumex module though, the methods are synchronous and only
// used to build together a JSON object of operations that will be sent in one go to the Sumex Sol through the static
// IValidate.sendOperationsToSumexSol() method.

    // IValidate -------------------------------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/IValidate/index.html
         * The IValidate interface checks whether supplied service data conform to the Tarmed rules. In case of a conflict
         * with another service, the service will be rejected. Textual information explaining why the code was rejected
         * can be retrieved, in order to provide appropriate feedback to the user.
         *
         * @class IValidate
         */
        class IValidate {
            constructor( invoicelogId ) {
                this.id = invoicelogId;
                this.name = 'IValidate';
                this.operations = [];
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/IValidate/Initialize_method.html
             * Initializes the validation, clears all the entered records.
             *
             * @method Initialize
             */
            Initialize() {
                addSumexOperation.call( this, 'Initialize' );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/IValidate/AddService_method.html
             * Adds a new service which will be validated against all the previously entered services of the same session.
             * If the code passed all the Validations a true value is returned. If the code was not accepted a value of
             * false is returned and the variable plStatus contains the error code.
             *
             * @method AddService
             * @param {Object} serviceInputData :REQUIRED:
             * @param {Object} serviceInputData.ITarmedInput :REQUIRED: ITarmedInput instance
             * @param {String} serviceInputData.bstrCode :OPTIONAL: Code of the Tarmed service
             * @param {String} serviceInputData.bstrReferenceCode :OPTIONAL: Reference code
             * @param {Number} serviceInputData.dQuantity :REQUIRED: Quantitiy value
             * @param {Number} serviceInputData.lSessionNumber :REQUIRED: Session number
             * @param {Date} serviceInputData.dDate :REQUIRED: Date of the service
             * @param {Number} serviceInputData.enSide :OPTIONAL: Side type
             * @param {Boolean} serviceInputData.enIgnoreValidate :OPTIONAL: Flag indicating whether the validation was ignored.
             */
            AddService( {iTarmedInput, ...service} ) {
                const iTarmedInputCopy = ITarmedInput.clone( iTarmedInput );
                ITarmedInput.clearOperations( iTarmedInput );

                addSumexOperation.call( this, 'AddService', {ITarmedInput: iTarmedInputCopy, ...service} );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/IValidate/GetAbortInfo_method.html
             * GetAbortInfo() is not used inSuite side as it is called automatically by the Sumex sol, if AddService()
             * results in an error. (It was only added here so it can be searched)
             *
             * @method GetAbortInfo
             */
            GetAbortInfo() {
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/IValidate/CalculateSum_method.html
             * Calculate the sum of all services which have been added through the AddService method.
             *
             * @method CalculateSum
             */
            CalculateSum() {
                addSumexOperation.call( this, 'CalculateSum' );
            }

            /**
             * This method is used to send all JSON opperations to the Sumex Sol
             *
             * @method sendOperationsToSumexSol
             * @param {Object} iValidate :REQUIRED: IValidate instance
             * @param {Object} additionalParams :REQUIRED:
             * @param {String} additionalParams.invoicelogId :OPTIONAL: used for logging
             * @param {Object} additionalParams.tarmedlog :REQUIRED: some fields are required for saving validation errors
             * @param {Object} additionalParams.user :REQUIRED: required for DB requests when handling response
             * @returns {Promise} resolving to {errors: {Array}, warnings: {Array}, priceTotal: {Number}}
             */
            static async sendOperationsToSumexSol( iValidate, {invoicelogId, user, caseFolderId, schein, treatmentsFromSchein} ) {
                let err, result;

                // Stringifying Operations to Send -------------------------------------------------------------------------
                let stringifiedOperations;

                try {
                    stringifiedOperations = JSON.stringify( iValidate );
                } catch( err ) {
                    Y.log( `SUMEX: sendOperationsToSumexSol(): error in JSON stringifying sumex interface, impossible to send operations for invoicelog/invoice ${invoicelogId}.\n${err && err.stack || err}`, 'error', NAME );
                    throw Y.doccirrus.errors.rest( 'sumex_02', null, true );
                }

                // Sending Data --------------------------------------------------------------------------------------------
                Y.log( `SUMEX: sendOperationsToSumexSol(): sending Sumex operations for invoicelog/invoice ${invoicelogId}:\n${stringifiedOperations}`, 'debug', NAME );


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
                    Y.log( `SUMEX: sendOperationsToSumexSol(): error in sending operations to Sumex Sol for invoicelog/invoice ${invoicelogId}.\n${err && err.stack || err}`, 'error', NAME );
                    if (err.code === 'ECONNREFUSED') {
                        //means sumex is off or unreachable
                        throw Y.doccirrus.errors.rest('sumex_01', null, true);
                    }
                    throw Y.doccirrus.errors.rest('sumex_03', null, true);
                }

                // Handling Result -----------------------------------------------------------------------------------------
                const {body} = result;

                if( !body ) {
                    Y.log( `SUMEX: sendOperationsToSumexSol(): no body in the Sumex Sol response for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                    throw Y.doccirrus.errors.rest('sumex_16', null, true);
                }

                return handleIValidateResponse( body, {invoicelogId, user, caseFolderId, schein, treatmentsFromSchein} );
            }
        }

    // ITarmedInput ----------------------------------------------------------------------------------------------------
        /**
         * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/index.html
         * The ITarmedInput interface provides methods for the input of data which will mainly stay constant for a
         * particular installation of the program, such as the dignities of the physicians, or stay constant throughout
         * a session, such as the patient sex or patient birth date. It is used in conjunction with the IValidate
         * interface. The physician, patient and treatment data are entered via the ITarmedInput interface, then the
         * service data are entered via the IValidate interface.
         *
         * @class ITarmedInput
         */
        class ITarmedInput {
            constructor( patientId ) {
                this.id = patientId;
                this.name = 'ITarmedInput';
                this.operations = [];
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/Initialize_method.html
             * Initializes the input data.
             *
             * @method Initialize
             */
            Initialize() {
                addSumexOperation.call( this, 'Initialize' );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/SetPatient_method.html
             * Set the patient input data.
             *
             * @method SetPatient
             * @param {Object} patient :REQUIRED:
             * @param {String} patient.dBirthDate :REQUIRED: Patient's birth date
             * @param {Number} patient.eSex :REQUIRED: Sex type
             */
            SetPatient( patient ) {
                addSumexOperation.call( this, 'SetPatient', patient );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/SetPhysician_method.html
             * Set the physician input data.
             *
             * @method SetPhysician
             * @param {Object} physician :REQUIRED:
             * @param {Number} physician.eMedicalRole :REQUIRED: Medical role type
             * @param {Number} physician.eBillingRole :REQUIRED: Billing role type
             * @param {String} physician.bstrEanNumberProvider :REQUIRED: EAN number of the provider
             * @param {String} physician.bstrEanNumberResponsible :REQUIRED: EAN number of the responsible physician
             */
            SetPhysician( physician ) {
                addSumexOperation.call( this, 'SetPhysician', physician );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/InitDignity_method.html
             * Initializes the dignity-relevant input data.
             *
             * @method InitDignity
             */
            InitDignity() {
                addSumexOperation.call( this, 'InitDignity' );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/AddDignity_method.html
             * Adds the qualitative dignity for the supplied physician EAN number.
             *
             * @method AddDignity
             * @param {Object} dignity :REQUIRED:
             * @param {String} dignity.bstrEanNumber :REQUIRED: EAN number of the physician
             * @param {String} dignity.bstrQLCode :REQUIRED: Qualitative dignity code
             */
            AddDignity( dignity ) {
                addSumexOperation.call( this, 'AddDignity', dignity );
            }

            /**
             * http://www.sumex1.net/en/validators/tarmed/api_cpp/v100/ITarmedInput/SetTreatment_method.html
             * Set the treatment input data.
             *
             * @method SetTreatment
             * @param {Object} treatmentInputData :REQUIRED:
             * @param {Number} treatmentInputData.eCanton :REQUIRED: Canton type
             * @param {Number} treatmentInputData.eLaw :REQUIRED: Law type
             * @param {Number} treatmentInputData.eType :REQUIRED: Treatment type
             * @param {Number} treatmentInputData.eSettlement :REQUIRED: Settlement type
             * @param {String} treatmentInputData.bstrEanNumberSection :OPTIONAL: EAN number of the section
             */
            SetTreatment( {bstrEanNumberSection, ...treatment} ) {
                bstrEanNumberSection = bstrEanNumberSection === undefined ? null : bstrEanNumberSection;
                addSumexOperation.call( this, 'SetTreatment', {bstrEanNumberSection, ...treatment} );
            }

            static clone( ITarmedInput ) {
                return _.cloneDeep( ITarmedInput );
            }

            static clearOperations( ITarmedInput ) {
                ITarmedInput.operations = [];
            }
        }

    // tarmedValidator100 ----------------------------------------------------------------------------------------------
        const tarmedValidator100 = {
            IValidate,
            ITarmedInput
        };

// ================================================================================================================== \\
// ================================================ HELPER FUNCTIONS ================================================ \\
        const INTERFACES = new Set( Object.keys( tarmedValidator100 ) );
        const OPERATIONS = new Set( Object.entries( tarmedValidator100 ).reduce( ( operations, currentEntry ) => {
            const currentOperations = Object.getOwnPropertyNames( currentEntry[1].prototype );
            return [...operations, ...currentOperations];
        }, [] ) );
        OPERATIONS.delete( 'constructor' ); // Removing constructor property which is not an operation.

        async function handleIValidateResponse( response, {invoicelogId, caseFolderId, schein, treatmentsFromSchein} ) {
            Y.log( `SUMEX: handleResponse(): response received from Sumex for tarmed log ${invoicelogId}:\n${response}`, 'debug', NAME );
            let err;
            const mainLocationId = schein.data.locationId || schein.data.mainLocationId,
                patientId = schein.data.patientId;

            // The result object will get populated with the errors and priceTotals returned from the operation results:
            const result = {
                errors: [],
                warnings: [],
                priceTotal: 0
            };

            if( !(response && typeof response === 'object') ) {
                Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the response '${response}' is expected to be an object.`, 'error', NAME );
                //todo throw error code from response (503, 504, etc.)
                throw new Y.doccirrus.commonerrors.DCError( 500, { message: `Could not interpret the response data structure` } );
            }
            const {name, id, operations} = response;

            if( !name || !INTERFACES.has( name ) ) {
                Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: ${name} is not a valid interface name.`, 'error', NAME );
                throw Y.doccirrus.errors.rest('sumex_16', null, true);
            }

            if( !(Array.isArray( operations ) && operations.length) ) {
                Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${name} interface object with id ${id} is expected to have an operations field with an non empty array value.`, 'error', NAME );
                throw Y.doccirrus.errors.rest('sumex_16', null, true);
            }

            [err] = await formatPromiseResult( checkOperations( operations ) );

            if( err ) {
                Y.log( `SUMEX: handleResponse(): Error in checking operations for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                throw err;
            }

            return result;

            async function checkOperations( operations ) {
                let err;
                for( let operation of operations ) {
                    const operationNames = Object.keys( operation ).filter( key => OPERATIONS.has( key ) );

                    if( !(operation && typeof operation === 'object') ) {
                        Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${operation} is expected to be an object.`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
                    }

                    if( !operationNames.length ) {
                        Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${inspect( operation, {depth: 1} )} does not contain a valid operation name key.`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
                    }
                    if( operationNames.length > 1 ) {
                        Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the operation ${inspect( operation, {depth: 1} )} contains more than one valid operation name key.`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
                    }

                    const operationName = operationNames[0];
                    const params = operation[operationName];

                    if( !(Array.isArray( params )) ) {
                        Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${operationName} field of the operation object: ${inspect( operation, {depth: 1} )} is expected to be an array.`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
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
                        Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the param field ${param} of the operation object:\n${inspect( operation, {depth: 1} )}\nis expected to be an object.`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
                    }
                    const {name, id, operations} = param; // Nested Interface

                    if( INTERFACES.has( name ) ) {
                        if( !(Array.isArray( operations ) && operations.length) ) {
                            Y.log( `SUMEX: handleResponse(): Could not interpret the response data structure for invoicelog/invoice ${invoicelogId}: the ${name} interface object with id ${id} is expected to have an operations field with an non empty array value.`, 'error', NAME );
                            throw Y.doccirrus.errors.rest('sumex_16', null, true);
                        }

                        [err] = await formatPromiseResult( checkOperations( param ) );

                        if( err ) {
                            Y.log( `SUMEX: checkParams(): Error in checking operations for invoicelog/invoice ${invoicelogId}.`, 'error', NAME );
                            throw err;
                        }
                    }
                }
            }

            async function checkStatus( operation, operationName ) {
                const {status} = operation;

                // All Operations ------------------------------------------------------------------------------------------
                    if( status !== true ) {
                        Y.log( `SUMEX: handleResponse(): Could not validate tarmed log with id ${invoicelogId}: SUMEX operation ${operationName} failed with status ${status}. Full operation:\n${inspect( operation, {depth: 2} )}`, 'error', NAME );
                        throw Y.doccirrus.errors.rest('sumex_16', null, true);
                    }

                const {commandStatus, pbstrAbort, plStatus} = operation;
                // AddService Operation ------------------------------------------------------------------------------------
                if( commandStatus === false ) { // Need to check for validation errors retrieved through GetAbortInfo()
                    const errorObj = Y.doccirrus.ruleset.sumex.getFieldsByMessage( pbstrAbort ) || {};
                    let id, link, affectedActivities = [];

                    if( operationName === 'AddService' ) {
                        const bstrCode = operation[operationName].map( service => service.bstrCode).find(bstrCode => bstrCode);
                        Y.log( `SUMEX: handleResponse(): Validation error for invoicelog/invoice ${invoicelogId}: ${pbstrAbort}`, 'debug', NAME );
                        affectedActivities = treatmentsFromSchein.filter(treatment => bstrCode === treatment.code).map(treatment => {
                            return  {
                                id: treatment._id,
                                code: treatment.code,
                                actType: treatment.actType,
                                timestamp: treatment.timestamp,
                                employeeId: treatment.employeeId,
                                locationId: treatment.locationId
                            };
                        });
                    }

                    let matchedActivity = affectedActivities[0];

                    switch( errorObj.entry ) {
                        case 'location':
                            id = matchedActivity ? matchedActivity.locationId : mainLocationId;
                            link = `/admin/insuite#/location/${id}`;
                            break;
                        case 'activity':
                            link = matchedActivity ? `/incase#/activity/${matchedActivity.id}` : null;
                            break;
                        case 'employee':
                            id = matchedActivity ? matchedActivity.employeeId : schein.data.employeeId;
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
                }

            // CalculateSum Operation ----------------------------------------------------------------------------------
                if( operationName === 'CalculateSum' ) {
                    const {pdTotal} = operation; // TODO: Check here how this works out with technical medical etc, do we want to save/display both?
                    result.priceTotal = pdTotal;
                }
            }
        }

        /**
         * @class sumex
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus' ).sumexTarmedValidator100 = {
            name: NAME,
            tarmedValidator100
        };
    },
    '0.0.1', {
        requires: ['sumex-utils']
    }
);

