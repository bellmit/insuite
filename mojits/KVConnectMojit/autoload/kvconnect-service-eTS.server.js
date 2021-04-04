/**
 * User: do
 * Date: 15/10/19  16:66
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */




/*global YUI */

/**
 * @module kvconnect eTS
 */
YUI.add( 'kvconnect-service-eTS', function( Y, NAME ) {

    const {formatPromiseResult} = require( 'dc-core' ).utils;
    const uuid = require( 'node-uuid' );
    const XmlParser = require( 'xml2js' ).Parser;
    const xmlParser = new XmlParser();

    const ADDRESSEE = 'eTerminservice@kv-safenet.de';
    const TEST_ADDRESSEE = 'eTerminservice.test@kv-safenet.de';

    const ETS_ARRANGEMENT_CODE_REQUEST_M06_KVC_SERVICE_ID = 'eTS;Vermittlungscode-Anforderung-Muster06;V2.0';
    const ETS_ARRANGEMENT_CODE_REQUEST_PTV11_KVC_SERVICE_ID = 'eTS;Vermittlungscode-Anforderung-PTV11;V2.0';

    function getFile( user, id ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.gridfs.get( user, id, ( err, result ) => {
                if( err ) {
                    return reject( err );
                }
                resolve( result );
            } );
        } );
    }

    async function parseXmlReponse( response ) {
        return new Promise( ( resolve, reject ) => {
            xmlParser.parseString( response, ( err, result ) => {
                if( err ) {
                    reject( err );
                } else {
                    resolve( result );
                }
            } );
        } );
    }

    // TODO: eTS use different service names for form types?
    function getETSServiceId( formType ) {
        let result;
        switch( formType ) {
            case 'M06':
                result = ETS_ARRANGEMENT_CODE_REQUEST_M06_KVC_SERVICE_ID;
                break;
            case 'PTV11':
                result = ETS_ARRANGEMENT_CODE_REQUEST_PTV11_KVC_SERVICE_ID;
                break;
            default:
                throw Error( 'unknown eTS form type' );
        }

        return result;
    }

    const createMessageBundle = ( args ) => {
        return {
            id: uuid.v4(),
            resourceType: 'Bundle',
            type: 'message',
            meta: {
                profile: ['https://fhir.kbv.de/StructureDefinition/74_PR_ETS_Bundle']
            },
            entry: args.entry
        };
    };

    const createMessageHeaderResource = ( args ) => {
        const messageHeaderResourceId = uuid.v4();
        return {
            fullUrl: `urn:uuid:${messageHeaderResourceId}`,
            resource: {
                resourceType: 'MessageHeader',
                id: messageHeaderResourceId,
                meta: {
                    profile: [
                        'https://fhir.kbv.de/StructureDefinition/74_PR_ETS_MH_Vermittlungscodes-anfordern_Request'
                    ]
                },
                event: {
                    system: 'https://fhir.kbv.de/CodeSystem/74_CS_ETS_Events',
                    code: 'vermittlungscode-anfordern'
                },
                timestamp: args.timestamp,
                source: {
                    endpoint: `mailto:${args.username}@kv-safenet.de`
                },
                focus: [
                    {
                        reference: `urn:uuid:${args.payloadResourceId}`
                    }
                ]
            }
        };
    };

    const createIdentifier = ( args ) => {
        return {
            identifier: args
        };
    };

    const createBasicReferralRequest = ( args ) => {
        return {
            fullUrl: `urn:uuid:${args.payloadResourceId}`,
            resource: {
                resourceType: 'ReferralRequest',
                id: args.payloadResourceId,
                status: 'draft',
                intent: 'order',
                subject: {
                    display: '-'
                },
                requester: {
                    agent: createIdentifier( {
                        system: 'http://fhir.de/NamingSystem/kbv/lanr',
                        value: args.lanr
                    } ),
                    onBehalfOf: createIdentifier( {
                        system: 'http://fhir.de/NamingSystem/kbv/bsnr',
                        value: args.bsnr
                    } )
                }
            }
        };

    };

    const createReferralRequest = ( args ) => {
        let speciality = {};
        if( args.specialitiesCodeSystem ) {
            const parts = args.specialitiesCodeSystem.split( ' ' );
            speciality.coding = [{system: parts[1], code: parts[0]}];
        } else {
            speciality.text = args.specialities || '';
        }
        if( Array.isArray( args.additionalQualifications ) ) {
            speciality.extension = args.additionalQualifications.map( additionalQualification => {
                return {
                    url: 'https://fhir.kbv.de/StructureDefinition/74_EX_ETS_AdditionalQualification',
                    valueCoding: {
                        system: 'https://fhir.kbv.de/CodeSystem/74_CS_SFHIR_BAR_ZUSATZBEZEICHNUNG', // fix value here
                        code: additionalQualification.code
                    }
                };
            } );
        }

        const basicReferralRequest = createBasicReferralRequest( args );

        basicReferralRequest.resource = {
            ...basicReferralRequest.resource,
            meta: {
                profile: [
                    'https://fhir.kbv.de/StructureDefinition/74_PR_ETS_Referralrequest_anforderung_muster06'
                ]
            },
            type: {
                coding: [
                    {
                        system: 'http://www.kbv.de/fhir/CodeSystem/74_CS_AW_Anlagetyp',
                        code: 'KV-Muster_6'
                    }
                ]
            },
            priority: args.urgency,
            /**
             * For "Fachgruppe" only 'coding' (only one entry) or 'text" (free text) is allowed inside 'speciality'.
             * "Zusätzliche Qualifikationen" 'extension' can have many entries. All of them must come from catalog.
             * At least coding or text is mandatory!
             *
             * @example
             * specialty: {
             *   extension: [
             *       {
             *           url: 'https://fhir.kbv.de/StructureDefinition/74_EX_ETS_AdditionalQualification',
             *           valueCoding: {
             *               system: 'https://fhir.kbv.de/CodeSystem/74_CS_SFHIR_BAR_ZUSATZBEZEICHNUNG',
             *               code: '027'
             *           }
             *       },
             *       {
             *           url: 'https://fhir.kbv.de/StructureDefinition/74_EX_ETS_AdditionalQualification',
             *           valueCoding: {
             *               system: 'https://fhir.kbv.de/CodeSystem/74_CS_SFHIR_BAR_ZUSATZBEZEICHNUNG',
             *               code: '028'
             *           }
             *       }
             *
             *   ],
             *   coding: [
             *       {
             *           system: 'https://fhir.kbv.de/CodeSystem/74_CS_SFHIR_BAR2_WBO',
             *           code: '080'
             *       }
             *   ],
             *   text:'Facharzt für den Hals'
             * }
             *
             */
            specialty: speciality
        };

        return basicReferralRequest;
    };

    const getProbatorikMethodCodings = ( args ) => {
        const probatorikMethods = [
            {
                path: 'analytischePsychotherapie',
                coding: [
                    {
                        system: 'https://fhir.kbv.de/CodeSystem/74_CS_ETS_Ptv11-probatorik-verfahren',
                        code: 'analytische-psychotherapie'
                    }
                ]
            }, {
                path: 'tiefenpsychologischFundiertePsychotherapie',
                coding: [
                    {
                        system: 'https://fhir.kbv.de/CodeSystem/74_CS_ETS_Ptv11-probatorik-verfahren',
                        code: 'tiefenpsychologisch-fundierte-psychotherapie'
                    }
                ]
            }, {
                path: 'verhaltenstherapie',
                coding: [
                    {
                        system: 'https://fhir.kbv.de/CodeSystem/74_CS_ETS_Ptv11-probatorik-verfahren',
                        code: 'verhaltenstherapie'
                    }
                ]

            }];

        return probatorikMethods.map( probatorikMethod => args[probatorikMethod.path] && {coding: probatorikMethod.coding} ).filter( Boolean );
    };

    function createPtv11Request( args ) {
        const serviceRequested = [];
        const services = {
            akut: {
                "coding": [
                    {
                        "system": "https://fhir.kbv.de/CodeSystem/74_CS_ETS_Ptv11-services",
                        "code": "pt-akutbehandlung"
                    }
                ]
            },
            probatorik: {
                "coding": [
                    {
                        "system": "https://fhir.kbv.de/CodeSystem/74_CS_ETS_Ptv11-services",
                        "code": "pt-probatorik"
                    }
                ]
            }
        };
        const basicReferralRequest = createBasicReferralRequest( args );
        const probatorikMethodCodings = getProbatorikMethodCodings( args );

        if( args.ambulantePsychotherapeutischeAkutbehandlung ) {
            serviceRequested.push( services.akut );
        }

        if( args.ambulantePsychoTherapie && args.zeitnahErforderlich ) {
            serviceRequested.push( services.probatorik );
        }

        basicReferralRequest.resource = {
            ...basicReferralRequest.resource,
            meta: {
                profile: [
                    'https://fhir.kbv.de/StructureDefinition/74_PR_ETS_Referralrequest_anforderung_Ptv11'
                ]
            },
            type: {
                coding: [
                    {
                        system: 'http://www.kbv.de/fhir/CodeSystem/74_CS_AW_Anlagetyp',
                        code: 'KV-Muster_PTV11'
                    }
                ]
            },
            serviceRequested: serviceRequested.concat( probatorikMethodCodings )
        };

        return basicReferralRequest;
    }

    function createRequestResource( args ) {
        switch( args.formType ) {
            case 'M06':
                return createReferralRequest( args );
            case 'PTV11':
                return createPtv11Request( args );
            default:
                throw Error( 'unknown eTS form type' );
        }
    }

    const createArrangementCodeRequestMessageBundle = ( args ) => {
        const payloadResourceId = uuid.v4();
        const timestamp = new Date();
        return createMessageBundle( {
            entry: [
                createMessageHeaderResource( {
                    ...args,
                    timestamp,
                    payloadResourceId
                } ),
                createRequestResource( {
                    ...args,
                    timestamp,
                    payloadResourceId
                } )
            ]
        } );
    };

    function getContentType( args ) {
        switch( args.formType ) {
            case 'M06':
                return 'application/fhir+json; charset=UTF-8';
            case 'PTV11':
                return 'application/fhir+json; charset="UTF-8"';
            default:
                throw Error( 'unknown eTS form type' );
        }
    }

    function getAttachmentFileName( args ) {
        switch( args.formType ) {
            case 'M06':
                return 'Vermittlungscode-Anforderung-Muster06.json';
            case 'PTV11':
                return 'Vermittlungscode-Anforderung-PTV11.json';
            default:
                throw Error( 'unknown eTS form type' );
        }
    }

    /**
     * Sends arrangment code request to eTS server.
     * @param {Object}          args
     * @param {Object}          args.user
     * @param {String}          args.username
     * @param {String}          args.formType
     * @return {Promise<*>}
     */
    async function sendArrangementCodeRequest( args ) {

        Y.log( `sendArrangementCodeRequest`, 'info', NAME );

        const kvconnectConfig = Y.doccirrus.kvconnect.getConfig();
        const isTest = kvconnectConfig && true === kvconnectConfig.test;
        const kvcServiceId = getETSServiceId( args.formType );
        const username = args.username;

        const messageBundle = createArrangementCodeRequestMessageBundle( {
            username,
            ...args
        } );


        Y.log( `sendArrangementCodeRequest sending message bundle for form ${args.formType} from kvcAccount ${username}`, 'info', NAME );
        Y.log( `sendArrangementCodeRequest message bundle: ${JSON.stringify( messageBundle )}`, 'debug', NAME );

        return Y.doccirrus.kvconnect.send( {
            user: args.user,
            username,
            // addressee: 'signatur.test@kv-safenet.de',
            addressee: isTest ? TEST_ADDRESSEE : ADDRESSEE,
            kvcServiceId,
            subject: kvcServiceId,
            messageType: 'ETS_ARRANGEMENT_CODE_REQUEST',
            text: `eTerminservice: Anforderungscodeanfrage von ${username}`,
            attachments: [
                {
                    content: JSON.stringify( messageBundle ),
                    contentTransferEncoding: 'base64',
                    contentType: getContentType( args ),
                    filename: getAttachmentFileName( args )
                }
            ]
        } );
    }

    async function processErrorMessage( message ) {
        const getObject = Y.doccirrus.commonutils.getObject;
        const errorMessageAttachment = message && message.attachments.find( attachment => attachment.filename === 'fehlermeldung.xml' );
        if( !errorMessageAttachment ) {
            throw Error( '"fehlermeldung.xml" attachment not found' );
        }
        const errorMessageXmlText = errorMessageAttachment.content.toString();
        let errorMessageObj = await parseXmlReponse( errorMessageXmlText );
        // let messageId = getObject( 'fehlermeldung.messageid.0', errorMessageObj );
        let errorCode = getObject( 'fehlermeldung.fehler.0', errorMessageObj );
        let errorText = getObject( 'fehlermeldung.fehlertext.0', errorMessageObj );
        // messageId = messageId && decodeURIComponent( messageId ); // "<" and ">" of message id are decoded

        return {status: 'ERROR', errors: [{code: errorCode, message: errorText, type: 'KBV-Fehlernachricht'}]};
    }

    function processMessageBundleErrors( messageBundle ) {
        const getObject = Y.doccirrus.commonutils.getObject;
        const errors = [];
        const issues = getObject( 'entry.1.resource.issue', messageBundle );

        if( issues ) {
            issues.forEach( issue => {
                const codings = getObject( 'details.coding', issue );
                if( codings ) {
                    codings.forEach( coding => {
                        errors.push( {
                            code: coding.code,
                            message: coding.display,
                            type: 'KBV-FHIR-MESSAGE-BUNDLE'
                        } );
                    } );
                }
            } );
        }

        if( !errors.length ) {
            errors.push( {code: -6, message: 'Could not parse errors', type: 'DC'} );
        }

        return errors;
    }

    function formatArrangementCode( arrangementCode ) {
        return `${arrangementCode.substring( 0, 4 )}-${arrangementCode.substring( 4, 8 )}-${arrangementCode.substring( 8, 12 )}`;
    }

    async function processDeliveryMessage( args ) {

        const {user, message} = args;
        const getObject = Y.doccirrus.commonutils.getObject;
        let responseMessageBundle;

        const responseAttachment = message.attachments.find( attachment => attachment.filename.startsWith( 'Vermittlungscode-Lieferung' ) );

        if( !responseAttachment ) {
            return {status: 'ERROR', errors: [{code: -2, message: 'Delivery attachment not found', type: 'DC'}]};
        }

        if( responseAttachment.contentType !== 'application/fhir+json' ) {
            return {
                status: 'ERROR',
                errors: [{code: -2, message: 'Delivery attachment content type not supported', type: 'DC'}]
            };
        }

        if( responseAttachment.content ) {
            responseMessageBundle = responseAttachment.content.toString();
        } else if( responseAttachment.contentFileId ) {
            let [err, file] = await formatPromiseResult( getFile( user, responseAttachment.contentFileId ) );
            if( err ) {
                Y.log( `processDeliveryMessage: could not get responseMessageBundle ${responseAttachment.contentFileId} from message ${message.messageId}`, 'warn', NAME );
                return {
                    status: 'ERROR',
                    errors: [{code: -4, message: 'Delivery attachment could not be loaded', type: 'DC'}]
                };
            }
            responseMessageBundle = file && file.data && file.data.toString();
        }

        if( !responseMessageBundle ) {
            Y.log( `processDeliveryMessage: could not find responseMessageBundle from message ${message.messageId}`, 'warn', NAME );
            return {
                status: 'ERROR',
                errors: [{code: -3, message: 'No delivery message bundle file found', type: 'DC'}]
            };
        }

        try {
            responseMessageBundle = JSON.parse( responseMessageBundle );
        } catch( err ) {
            Y.log( `processDeliveryMessage: could parse responseMessageBundle json from message ${message.messageId}` );
            return {
                status: 'ERROR',
                errors: [{code: -5, message: 'Could not parse message bundle json', type: 'DC'}]
            };
        }

        const response = getObject( 'entry.0.resource.response', responseMessageBundle );
        const arrangementCode = getObject( 'entry.1.resource.identifier.0.value', responseMessageBundle );

        if( !response || response.code !== 'ok' ) {
            return {status: 'ERROR', errors: processMessageBundleErrors( responseMessageBundle )};
        }

        if( !arrangementCode ) {
            return {
                status: 'ERROR',
                errors: [{code: -7, message: 'Could not find arrangement code', type: 'DC'}]
            };
        }

        if( arrangementCode.length !== 12 ) {
            return {
                status: 'ERROR',
                errors: [{code: -8, message: 'Arrangement code has invalid format.', type: 'DC'}]
            };
        }

        return {status: 'OK', arrangementCode: formatArrangementCode( arrangementCode )};
    }

    async function processDelivery( args ) {
        const {message} = args;

        switch( message.messageType ) {
            case 'ETS_ARRANGEMENT_CODE_ERROR_MESSAGE':
                return processErrorMessage( message );
            case 'ETS_ARRANGEMENT_CODE_DELIVERY':
                return processDeliveryMessage( args );
        }

        return {status: 'ERROR', errors: [{code: -1, message: 'Unknown Message Type', type: 'DC'}]};
    }

    /**
     * @class kvconnect
     * @namespace doccirrus
     */
    Y.namespace( 'doccirrus.kvconnect.service' ).eTS = {
        sendArrangementCodeRequest,
        processDelivery
    };
}, '0.0.1', {
    requires: [
        'dc_kvconnect'
    ]
} );
