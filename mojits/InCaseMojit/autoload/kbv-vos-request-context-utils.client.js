/*global YUI, _ */

YUI.add( 'kbv-vos-request-context-utils', function( Y, NAME ) {
        'use strict';

        /**
         * Request request context id and forward user to configured vos url.
         *
         * @param {object} args
         * @note When it's clear how to call an external prescription software from the server, this must be changed to an event emitter. For now we can only call such a software locally and for this we need a FHIR identifier for the context.
         * @return {*}
         */
        function requestIdentifier( args ) {
            var requestContextCode = args.requestContextCode;
            var userId = args.userId;
            var patientId = args.patientId;
            var insuranceId = args.insuranceId;
            var employeeId = args.employeeId;
            var locationId = args.locationId;
            var requestId = args.requestId;
            var documents = args.documents;
            var caseFolderId = args.caseFolderId;
            var source;

            if( !insuranceId ) {
                Y.doccirrus.DCWindow.notice( {
                    message: Y.doccirrus.i18n( 'InCaseMojit.KbvVosRequestContextUtils.messages.NO_INSURANCE' )
                } );
                return;
            }

            if( !employeeId || !locationId ) {
                Y.doccirrus.DCWindow.notice( {
                    message: Y.doccirrus.i18n( 'InCaseMojit.KbvVosRequestContextUtils.messages.NO_EMPLOYEE_OR_LOCATION_SET_DOCUMENT_FOR' )
                } );
                return;
            }

            source = {
                // code of the context to create
                code: requestContextCode,
                // identifier of the current user
                user: {
                    identity: userId
                },
                practitioner: {
                    employee: employeeId
                },
                // identifier of the location which from which the physician prescribes
                organization: {
                    location: locationId
                },
                // identifier of the patient for whom the prescription is being made
                patient: {
                    patient: patientId
                },
                // identifier of the insurance which covers the prescription
                coverage: {
                    status: insuranceId,
                    caseFolder: caseFolderId
                }
            };

            if( requestId ) {
                // identifier of the prescriptions
                source.requests = [
                    {activity: requestId}
                ];
            }

            if( documents && documents.length ) {
                source.documents = documents;
            }

            // creates an logical FHIR identifier to pass to an external prescription software
            return Y.doccirrus.jsonrpc.api['fhir-identifier'].post( {
                target: 'https://fhir.kbv.de/StructureDefinition/74_PR_VoS_Bundle_PVS_VoS',
                version: '1.10.010',
                source: source
            } ).done( function( response ) {
                if( !response || !response.data ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: Y.doccirrus.i18n( 'InCaseMojit.KbvVosRequestContextUtils.messages.NO_VOS_KID_RECEIVED' )
                    } );
                    return;
                }
                // see MOJ-14518
                window.location.href = args.externalPrescriptionSoftwareUrl.replace( '{kid}', response.data );
                Y.log( JSON.stringify( response ), 'info', NAME );
            } ).fail( function( error ) {
                Y.log( JSON.stringify( error ), 'error', NAME );
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        }

        function getMatchingInsurance( patient, caseFolder ) {
            return patient.insuranceStatus.filter( function( item ) {
                return item.type === caseFolder.type;
            } )[0];
        }

        Y.namespace( 'doccirrus.incase.kbv.vos' ).requestContextUtils = {
            requestIdentifier: requestIdentifier,
            getMatchingInsurance: getMatchingInsurance
        };
    },
    '1.0.0',
    {
        requires: [
            'doccirrus',
            'DCWindow',
            'JsonRpc'
        ]
    }
);
