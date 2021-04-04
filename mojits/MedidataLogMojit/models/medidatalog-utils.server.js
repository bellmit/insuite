/**
 * User: dcdev
 * Date: 3/19/21  2:51 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'medidatalogUtils', function( Y, NAME ) {

    const {formatPromiseResult} = require('dc-core').utils,
        getObject = Y.doccirrus.commonutils.getObject,
        DCError = Y.doccirrus.commonerrors.DCError,
        i18n = Y.doccirrus.i18n,
        parserMap = new Map([
            ['NOTIFICATION', parseNotification],
            ['RECEIVED', parseReceived]
        ]);


    function parseReceived( received ) {
        return Object.assign({type: 'RECEIVED'}, received);
    }

    function parseNotification( notification ) {
        const newEntry = {
            type: 'NOTIFICATION',
            notificationId: notification.id,
            status: notification.read ? "CONFIRMED" : "UNCONFIRMED"
        };

        newEntry.subject = getObject( 'subject.de', notification );
        newEntry.transmissionReference = notification.transmissionReference ||
                                         getObject( 'notificationParameters.transmissionReference', notification );
        newEntry.correlationReference = notification.correlationReference ||
                                        getObject( 'notificationParameters.correlationReference', notification );
        newEntry.documentReference = notification.documentReference ||
                                     getObject( 'notificationParameters.documentReference', notification );
        newEntry.notificationType = notification.severity;
        newEntry.createdDate = notification.created;
        newEntry.technicalInfo = notification.technicalInformation;
        newEntry.errorCode = notification.errorCode || getObject( 'notificationParameters.code', notification );

        const potentialReasons = getObject( 'potentialReasons.de', notification ) || '',
            possibleSolution = getObject( 'possibleSolutions.de', notification ) || '';

        newEntry.description = `${potentialReasons} ${possibleSolution }`;

        return newEntry;
    }
    /**
     * Send request and handle request result for each log in parallel
     *
     * @param {Object} args
     * @param {Array} args.logs
     * @param {Function} args.request
     * @param {Function} args.handler
     */
    async function handleRequestsInParallel( {logs, request, handler} ) {
        Y.log( 'Entering Y.doccirrus.medidatalogUtils.handleRequestsInParallel', 'info', NAME );
        let error, result;

        function _handleError( log, error ) {
            Y.log( `handleRequestsInParallel: error occured with medidatalog ${log._id}:\n${error.message || error}`, 'error', NAME );
            errorList.push( {
                logId: log._id ? log._id : undefined,
                error
            } );
        }

        const errorList = [],
            promises = logs.map( async function( log ) {
                [error, result] = await formatPromiseResult( request( log ) );
                if( error ) {
                    return _handleError( log, error );
                }

                if( !result ) {
                    return _handleError( log, new DCError( 500, {message: 'Cannot get response'} ) );
                }

                [error] = await formatPromiseResult( handler( {requestResult: result, log} ) );
                if( error ) {
                    return _handleError( log, error );
                }
            } );

        [error] = await formatPromiseResult( Promise.all( promises ) );

        if( error ) {
            Y.log(`handleRequestsInParallel: Error occured in parallel request handling.\nError: ${error.stack || error}`, 'error', NAME);
            if( !errorList.length ) {
                _handleError( {}, error );
            }
        }
        Y.log( 'Exiting Y.doccirrus.medidatalogUtils.handleRequestsInParallel', 'info', NAME );
        return {
            errors: errorList
        };
    }

    /**
     * Send request to get logs from medidata, skip existing ones and save new entries
     *
     * @param {Object} args
     * @param {Array} args.user
     * @param {String} args.type
     * @param {Function} args.request
     */
    async function fetchLogsFromMedidata( {user, type, request} ) {
        Y.log( 'Entering Y.doccirrus.medidataUtils.fetchLogsFromMedidata', 'info', NAME );
        let error, result, errors = [], results = [];

        [error, result] = await formatPromiseResult( request() );

        if( error ) {
            Y.log( `fetchLogsFromMedidata: request to Medidata failed.\nError: ${error.stack || error}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.medidataUtils.fetchLogsFromMedidata', 'info', NAME );
            throw error;
        }

        const {statusCode, statusMessage, body} = result;

        if( statusCode !== 200 ) {
            error = new DCError( statusCode, {message: statusMessage} );
            Y.log( `fetchLogsFromMedidata: request to Medidata returned with code ${statusCode}. Message: ${statusMessage}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.medidataUtils.fetchLogsFromMedidata', 'info', NAME );
            throw error;
        }

        const transmissionRefs = body.map( item => item.transmissionReference );

        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'medidatalog',
            query: {
                type: type,
                transmissionReference: {$in: transmissionRefs}
            },
            options: {
                fields: {
                    transmissionReference: 1
                }
            }
        } ) );

        if( error ) {
            Y.log( `fetchLogsFromMedidata: Couldn't get existing notifications.\nError: ${error.stack || error}`, 'error', NAME );
            result = [];
        }

        const existingTransmissionRefs = result.map( res => res.transmissionReference );

        for( let item of body ) {
            const transmissionReference = item.transmissionReference;

            if( !transmissionReference || existingTransmissionRefs.includes( transmissionReference ) ) {
                continue;
            }

            const parser = parserMap.get(type),
                newEntry = parser( item );

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medidatalog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( newEntry )
            } ) );

            if( error ) {
                Y.log( `fetchLogsFromMedidata: Failed to post new ${type.toLowerCase()} medidatalog with transmissionReference ${transmissionReference}. Error:\n${error.stack || error}`, 'error', NAME );
                errors.push(error);
                continue;
            }

            results.push( result );
        }
        Y.log( 'Exiting Y.doccirrus.medidataUtils.fetchLogsFromMedidata', 'info', NAME );
        return {
            errors,
            results
        };
    }

    /**
     * Parse response xml from Medidata, create communication activity out of it, save response xml
     *
     * @param {Object} args
     * @param {Array} args.user
     * @param {Buffer} args.buffer
     * @param {Function} args.errorHandler
     */
    async function parseResponseXml( {user, buffer, errorHandler} ) {
        Y.log( 'Entering Y.doccirrus.medidataUtils.parseResponseXml', 'info', NAME );
        let err, result, xml, status, location;
        const INVOICE_NO_i18n = i18n( 'InvoiceMojit.cashbookJS.title.INVOICENO' ),
            PATIENT_NAME_i18n = i18n( 'patienttransfer-schema.PatientTransfer_T.patientName.i18n' ),
            INSURANCE_i18n = i18n( 'patient-schema.PartnerIds_T.insuranceType.i18n' ),
            TELEPHONE_i18n = i18n( 'dispatchrequest-schema.DispatchRequest_T.carePhone' ),
            EMPLOYEE_i18n = i18n( 'task-schema.Task_T.employee.i18n' ),
            STATUS_i18n = i18n( 'activity-schema.Activity_T.status.i18n' ),
            EXPLANATION_i18n = i18n( 'activity-schema.Activity_T.explanations.i18n' ),
            MESSAGE_i18n = i18n( 'rulelog-schema.RuleLog_T.message.i18n' );

        function _getResponseTypeMessage( status, explanation, messages ) {
            let responseTypeMessage = '';
            responseTypeMessage += `\n${EXPLANATION_i18n}: ${explanation}\n`;
            responseTypeMessage += `\n${STATUS_i18n}: ${i18n( `activity-schema.ActStatus_E.${status}` )};`;

            if( messages && messages ) {
                messages.forEach( message => {
                    responseTypeMessage += `\n${MESSAGE_i18n}: ${message.$.text}`;
                } );
            }
            return responseTypeMessage;
        }

        const parser = require( 'xml2js' ).Parser;
        const processor = function( name ) {
            const prefixIndex = name.indexOf( ':' ) + 1;
            if( prefixIndex > 0 ) {
                return name.substring( prefixIndex, name.length );
            }
            return name;
        };

        const xmlParser = new parser( {tagNameProcessors: [processor]} );
        if( !buffer ) {
            Y.log( `parseResponseXml: No data buffer from Mediport response xml document`, 'error', NAME );
            Y.log('Exiting Y.doccirrus.medidataUtils.parseResponseXml', 'info', NAME);
            throw Y.doccirrus.errors.rest( 'medidata_05' );
        }

        [err, xml] = await formatPromiseResult( xmlParser.parseStringPromise( buffer ) );

        if( err || !xml ) {
            Y.log( `parseResponseXml: Missing xml in xmlParser response.\nError: ${err && err.stack || err}`, 'error', NAME );
            Y.log('Exiting Y.doccirrus.medidataUtils.parseResponseXml', 'info', NAME);
            throw Y.doccirrus.errors.rest( 'medidata_05' );
        }

        const invoice = getObject( 'response.payload.0.invoice.0.$', xml ),
            body = getObject( 'response.payload.0.body.0', xml ),
            locationGln = getObject( 'provider.0.$.ean_party', body ),
            patientSsn = getObject( 'patient.0.$.ssn', body ),
            patientBirthDate = getObject( 'patient.0.$.birthdate', body ),

            personSalutaion = getObject( 'patient.0.person.0.$.salutation', body ),
            personGivenName = getObject( 'patient.0.person.0.givenname.0', body ),
            personFamilyName = getObject( 'patient.0.person.0.familyname.0', body ),

            insuranceName = getObject( 'contact.0.company.0.companyname.0', body ),
            insuranceStreet = getObject( 'contact.0.company.0.postal.0.street.0', body ),
            insuranceCity = getObject( 'contact.0.company.0.postal.0.city.0', body ),
            insuranceZip = getObject( 'contact.0.company.0.postal.0.zip.0._', body ) ||
                           getObject( 'contact.0.company.0.postal.0.zip.0', body ),
            insurancePhone = getObject( 'contact.0.company.0.telecom.0.phone.0', body ),

            employee = getObject( 'contact.0.employee.0', body ),
            employeeSalutaion = getObject( 'contact.0.employee.0.$.salutation', body ),
            employeeGivenName = getObject( 'contact.0.employee.0.givenname.0', body ),
            employeeFamilyName = getObject( 'contact.0.employee.0.familyname.0', body ),
            employeePhone = getObject( 'contact.0.employee.0.telecom.0.phone.0', body ),
            employeeEmail = getObject( 'contact.0.employee.0.online.0.email.0', body ),

            rejected = getObject( 'rejected.0', body ),
            pending = getObject( 'pending.0', body ),
            accepted = getObject( 'accepted.0', body ),

            communicationData = {
                actType: 'COMMUNICATION',
                userContent: '',
                subType: 'Mediport'
            };

        //------------------------------- Filling context of communication -----------------------------------
        if( rejected ) {
            const explanation = (getObject( 'explanation.0', rejected ) || '').replace( new RegExp( /\t/, 'g' ), '' );
            status = 'MEDIDATAREJECTED';
            communicationData.userContent += _getResponseTypeMessage( status, explanation, rejected.error );
        } else if( pending ) {
            const explanation = (getObject( 'explanation.0', pending ) || '').replace( new RegExp( /\t/, 'g' ), '' );
            status = 'INCOMPLETE';
            communicationData.userContent += _getResponseTypeMessage( status, explanation, pending.message );
        } else if( accepted ) {
            const explanation = (getObject( 'explanation.0', accepted ) || '').replace( new RegExp( /\t/, 'g' ), '' );
            status = 'ACCEPTED';
            communicationData.userContent += _getResponseTypeMessage( status, explanation, accepted.message );
        }
        communicationData.userContent += invoice.request_id ? `\n${INVOICE_NO_i18n}: ${invoice.request_id};` : '';

        const query = {
            actType: {$in: ['INVOICEREF', 'INVOICE']},
            invoiceNo: {$regex: new RegExp( invoice.request_id )}
        };

        if( locationGln ) {
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                query: {
                    glnNumber: locationGln
                },
                options: {
                    fields: {'_id': 1}
                }
            } ) );
            if( err || !Array.isArray( result ) || !result.length ) {
                Y.log( `parseResponseXml: Error in getting location from request by GLN number: ${locationGln}.\n Error: ${err && err.stack || err}`, 'error', NAME );
            } else {
                location = result[0];

                // Some invoices have locationId type string, some - ObjectId
                query.locationId = {
                    $in: [location._id.toString(), location._id]
                };
            }
        }

        const patientQuery = {};
        if( patientSsn ) {
            patientQuery.socialSecurityNo = patientSsn;
        }
        if( personFamilyName || personGivenName || patientBirthDate ) {
            Object.assign( patientQuery, {
                ...(personGivenName ? {firstname: personGivenName} : {}),
                ...(personFamilyName ? {lastname: personFamilyName} : {}),
                ...(patientBirthDate ? {
                    dob: {
                        $gte: new Date( new Date( patientBirthDate ).setHours( 0, 0, 0, 0 ) ),
                        $lte: new Date( new Date( patientBirthDate ).setHours( 23, 59, 59, 999 ) )
                    }
                } : {})

            } );
        }
        if( Object.keys( patientQuery ).length ) {
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                query: patientQuery,
                options: {
                    fields: {'_id': 1}
                }
            } ) );

            if( err || !Array.isArray( result ) || !result.length ) {
                Y.log( `parseResponseXml: Error in getting patient from request by socialSecurityNo: ${patientSsn}. \n Error: ${err && err.stack || err}`, 'error', NAME );
            } else {
                query.patientId = result[0]._id.toString();
            }
        }

        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'get',
            query
        } ) );

        if( err || !result || !result.length ) {
            Y.log( `parseResponseXml: Error in getting invoiceRef with request_id: ${invoice.request_id}. \nError: ${err && err.stack || err}`, 'error', NAME );
            await errorHandler( {
                patientSsn,
                searchParams: {
                    $locationGln: locationGln,
                    $invoiceNo: invoice.request_id,
                    $patientSsn: patientSsn
                },
                buffer: buffer,
                fileName: 'MediportResponse',
                fileType: 'xml',
                message: communicationData.userContent
            } );

            Y.log('Exiting Y.doccirrus.medidataUtils.parseResponseXml', 'info', NAME);
            throw new DCError('medidata_00', {data: {$locationGln: locationGln, $invoiceNo: invoice.request_id, $patientSsn: patientSsn }});
        }

        const invoiceRef = result[0];

        communicationData.caseFolderId = invoiceRef.caseFolderId;
        communicationData.locationId = invoiceRef.locationId;
        communicationData.employeeId = invoiceRef.employeeId;

        if( personGivenName && personFamilyName ) {
            communicationData.userContent += `\n${PATIENT_NAME_i18n}: `;
            if( personSalutaion ) {
                communicationData.userContent += `${personSalutaion} `;
            }
            communicationData.userContent += `${personGivenName} ${personFamilyName};`;
        }

        if( insuranceName ) {
            communicationData.userContent += `\n${INSURANCE_i18n}: ${insuranceName}`;
            communicationData.userContent += insuranceStreet ? `, ${insuranceStreet};` : '';
            communicationData.userContent += insuranceCity ? `, ${insuranceCity};` : '';
            communicationData.userContent += insuranceZip ? `, ${insuranceZip};` : '';

            communicationData.userContent += insurancePhone ? ` ${TELEPHONE_i18n}: ${insurancePhone};` : '';
        }

        if( employee ) {
            communicationData.userContent += `\n${EMPLOYEE_i18n}: `;
            communicationData.userContent += employeeSalutaion ? `${employeeSalutaion} ` : '';
            communicationData.userContent += employeeGivenName ? `${employeeGivenName} ` : '';
            communicationData.userContent += employeeFamilyName ? `${employeeFamilyName};` : '';
            communicationData.userContent += employeePhone ? `${TELEPHONE_i18n}: ${employeePhone};` : '';
            if( employeeEmail ) {
                communicationData.userContent += employeeEmail ? ` ${employeeEmail};` : '';
            }
        }

        //------------------------------- Attaching documents if there are some ---------------------------------
        let documents = [];
        if( body.documents && body.documents.length ) {
            const attachedDocuments = body.documents[0];
            attachedDocuments.document.forEach( document => {
                const {filename, mimeType} = document.$;
                const fileType = mimeType.substring( mimeType.indexOf( '/' ) + 1, mimeType.length );
                documents.push( {
                    fileName: filename, fileType, file: document.base64[0]
                } );
            } );
        }

        Y.log( `Exiting Y.doccirrus.medidatalogUtils.parseResponseXml`, 'info', NAME );
        return {
            communicationData,
            invoiceRef,
            documents,
            status
        };
    }

    Y.namespace( 'doccirrus' ).medidatalogUtils = {
        name: NAME,
        handleRequestsInParallel,
        fetchLogsFromMedidata,
        parseResponseXml
    };
}, '0.0.1', {requires: []});
