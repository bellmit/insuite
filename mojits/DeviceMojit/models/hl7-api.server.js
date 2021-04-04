/**
 * User: pi
 * Date: 30/06/2015  10:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'hl7-api', function( Y, NAME ) {
        /**
         * @module hl7-api
         */
        var
            path = require( 'path' ),
            moment = require( 'moment' ),
            PipeParser,
            ADTMessage,
            longDateFormat = 'YYYYMMDDHHmmss',
            util = require( 'util' ),
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            fs = require( 'fs' ),
            readFile = util.promisify( fs.readFile );

        const
            javaClasspaths = [
                '../../../assets/lib/hl7/hapi-base-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v21-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v22-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v23-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v24-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v25-2.2.jar',
                '../../../assets/lib/hl7/hapi-structures-v26-2.2.jar',
                '../../../assets/lib/hl7/commons-cli-1.2.jar',
                '../../../assets/lib/hl7/jdom-1.1.jar',
                '../../../assets/lib/hl7/log4j-1.2.17.jar',
                '../../../assets/lib/hl7/slf4j-api-1.6.6.jar',
                '../../../assets/lib/hl7/slf4j-log4j12-1.6.6.jar',
                '../../../assets/lib/hl7/xalan-2.7.0.jar',
                '../../../assets/lib/hl7/xercesImpl-2.4.0.jar'
            ];

        function initJava() {
            var java = require( 'java' );

            for( let i = 0; i < javaClasspaths.length; i++ ) {
                java.classpath.push( path.join( __dirname, javaClasspaths[i] ) );
            }

            java.options.push( '-Xms128M' );
            java.options.push( '-Xmx512M' );

            PipeParser = java.import( 'ca.uhn.hl7v2.parser.PipeParser' );
            ADTMessage = java.import( 'ca.uhn.hl7v2.model.v24.message.ADT_A05' );
        }

        /**
         * @method convertObjectToHL7
         * @param {Object} obj patient object
         * @param {Boolean} oldPatient
         * @returns {String} hl7 representation of specified object
         */
        function convertObjectToHL7( obj, oldPatient ) {
            var adtMessage,
                now = moment().format( longDateFormat ),
                data = JSON.parse( JSON.stringify( obj ) ),
                gender = (data.gender === 'FEMALE' ? 'F' : (data.gender === 'MALE' ? 'M' : 'A')),
                messageType = (oldPatient ? 'A31' : 'A28'),
                messageHeader,
                eventType,
                PID,
                pipeparser;
            initJava();
            adtMessage = new ADTMessage();
            adtMessage.initQuickstartSync( 'ADT', messageType, 'T' );

            messageHeader = adtMessage.getMSHSync();
            messageHeader.getSendingApplicationSync().getNamespaceIDSync().setValueSync( 'DocCirrus' );
            messageHeader.getMessageTypeSync().getMessageStructureSync().setValueSync( 'ADT_A05' );

            eventType = adtMessage.getEVNSync();
            eventType.getRecordedDateTimeSync().getTimeSync().setValueSync( now );

            PID = adtMessage.getPIDSync();
            PID.getPatientIdentifierListSync( 0 ).getIDNumberSync().setValueSync( data._id );
            PID.getPatientNameSync( 0 ).getFamilyNameSync().getSurnameSync().setValueSync( data.lastname );
            PID.getPatientNameSync( 0 ).getGivenNameSync().setValueSync( data.firstname );
            if( data.title ) {
                PID.getPatientNameSync( 0 ).getDegreeEgMDSync().setValueSync( data.title );
            }
            PID.getDateTimeOfBirthSync().getTimeSync().setValueSync( moment( data.dob ).format( longDateFormat ) );
            PID.getAdministrativeSexSync().setValueSync( gender );

            //            PV1 = adtMessage.getPV1Sync();
            //            PV1.getPatientClassSync().setValueSync( 'O' );

            pipeparser = new PipeParser();
            return pipeparser.encodeSync( adtMessage );
        }

        function isMessageAllowed( msh ) {
            if( msh && msh.messageType ) {
                return isMessageOfTypeLabDataAndTreatments( msh ) || isMessageOfTypeLabRequest( msh );
            }
            return false;
        }

        function isMessageOfTypeLabDataAndTreatments( msh ) {
            return msh && msh.messageType && (msh.messageType.messageType === 'ORU' || msh.messageType.triggerEvent === 'R01');
        }

        function isMessageOfTypeLabRequest( msh ) {
            return msh && msh.messageType && (msh.messageType.messageType === 'ORM' || msh.messageType.triggerEvent === 'O01');
        }

        function convertHL7toHL7JSON( message ) {
            let
                pipeparser,
                payload,
                HL7JSON = {};
            initJava();

            pipeparser = PipeParser.getInstanceWithNoValidationSync();

            Y.log( `convertHL7toHL7JSON: converting HL7 to Object. HL7 string: ${message}`, 'debug', NAME );

            try {
                payload = pipeparser.parseSync( message );
                const msh = MSH( payload.getMSHSync() );

                if( !msh || !msh.messageType ) {
                    throw new Error( "HL7.api: HL7 message does not contain MSH!" );
                }
                if( msh && msh.messageType && !isMessageAllowed( msh ) ) {
                    throw new Error( `HL7.api: HL7 message of type: "${msh.messageType.messageType}" is not allowed!` );
                }

                if( isMessageOfTypeLabDataAndTreatments( msh ) ) {
                    HL7JSON = convertHL7ORU_R01toObject( payload );
                } else if( isMessageOfTypeLabRequest( msh ) ) {
                    HL7JSON = convertHL7ORM_O01toObject( payload );
                }

                HL7JSON.MSH = msh;
            } catch( error ) {
                Y.log( `convertHL7toHL7JSON: can not convert HL7 to Object. Error: ${error}`, 'debug', NAME );
                HL7JSON.error = error;
            } finally {
                return HL7JSON;
            }
        }

        /**
         * Convert HL7 ORU_R01 message to Object, does not convert all data to JSON, only needed in MOJ-11466
         * @method  convertHL7ORU_R01toObject
         * @param {Object} payload parsed HL7 payload
         * @returns {Object} HL7Json
         */
        function convertHL7ORU_R01toObject( payload ) {
            let HL7JSON = {};

            try {
                let
                    patient = payload.getPATIENT_RESULTSync().getPATIENTSync(), //only one patient expected
                    PID = patient.getPIDSync(),
                    gender = PID.getAdministrativeSexSync().getValueSync(),
                    patientNTEALL = patient.getNTEAllSync().toArraySync(),
                    observationCount = payload.getPATIENT_RESULTSync( 0 ).getORDER_OBSERVATIONRepsSync(),
                    patientResult = payload.getPATIENT_RESULTSync( 0 ),
                    orderObservations = [],
                    dateOfCreation,
                    labReqNo;

                HL7JSON.patientResult = {
                    PATIENT: {
                        NTE: patientNTEALL.map( nte => NTE( nte ) )
                    },
                    ORDER_OBSERVATIONS: []
                };

                for( let i = 0; i < observationCount; i++ ) {
                    let
                        observation = patientResult.getORDER_OBSERVATIONSync( i ),
                        oruObservationCount = observation.getOBSERVATIONRepsSync(),
                        nteCount = observation.getNTERepsSync();

                    orderObservations[i] = {};
                    orderObservations[i].orc = ORC( observation.getORCSync() );
                    orderObservations[i].obr = OBR( observation.getOBRSync() );
                    orderObservations[i].ctd = CTD( observation.getCTDSync() );
                    orderObservations[i].observations = [];
                    orderObservations[i].ntes = [];

                    if( !dateOfCreation ) {
                        dateOfCreation = orderObservations[i].orc &&
                                         orderObservations[i].orc.quantityTiming &&
                                         orderObservations[i].orc.quantityTiming.startDatetime;
                    }

                    if( !labReqNo ) {
                        labReqNo = orderObservations[i].orc &&
                                   orderObservations[i].orc.fillerOrderNumber &&
                                   orderObservations[i].orc.fillerOrderNumber.entityIdentifier;
                    }

                    for( let j = 0; j < oruObservationCount; j++ ) {
                        let oruObs = observation.getOBSERVATIONSync( j ),
                            obx = oruObs.getOBXSync(),
                            nteCount = oruObs.getNTERepsSync(),
                            scopeResult = {NTE: [], OBX: {}};

                        scopeResult.OBX = OBX( obx );
                        scopeResult.NTE = [];

                        for( let k = 0; k < nteCount; k++ ) {
                            scopeResult.NTE.push( NTE( oruObs.getNTESync( k ) ) );
                        }

                        orderObservations[i].observations.push( scopeResult );
                    }

                    for( let j = 0; j < nteCount; j++ ) {
                        const observationNTE = observation.getNTESync( j );
                        orderObservations[i].ntes.push( NTE( observationNTE ) );
                    }
                }
                HL7JSON.patientResult.ORDER_OBSERVATIONS = orderObservations;
                HL7JSON = {
                    ...HL7JSON,
                    DSC: DSC( payload.getDSCSync() ),
                    title: PID.getPatientNameSync( 0 ).getDegreeEgMDSync().getValueSync(),
                    firstname: PID.getPatientNameSync( 0 ).getGivenNameSync().getValueSync(),
                    lastname: PID.getPatientNameSync( 0 ).getFamilyNameSync().getSurnameSync().getValueSync(),
                    dob: TS( PID.getDateTimeOfBirthSync() ),
                    gender: gender === 'F' ? 'W' : gender === 'M' ? 'M' : 'X',
                    talk: (gender === 'F' ? 'MS' : (gender === 'M' ? 'MR' : '')),
                    dateOfCreation: dateOfCreation,
                    labReqNo: labReqNo
                };
            } catch( error ) {
                Y.log( `convertObjectToHL7: can not convert HL7 to Object. Error: ${error}`, 'debug', NAME );
                HL7JSON.error = error;
            } finally {
                return HL7JSON;
            }
        }

        /**
         * Convert HL7 ORM_O01 message to Object, does not convert all data to JSON
         * @method  convertHL7ORM_O01toObject
         * @param {Object} payload parsed HL7 payload
         * @returns {Object} HL7JSON
         */
        function convertHL7ORM_O01toObject( payload ) {
            let HL7JSON = {};

            try {
                let
                    orderObservations = [],
                    dateOfCreation,
                    labReqNo;

                let
                    patient = payload && payload.getPATIENTSync(),
                    PID = patient && patient.getPIDSync(),
                    gender = PID && PID.getAdministrativeSexSync && PID.getAdministrativeSexSync().getValueSync(),
                    patientNTEALL = patient && patient.getNTEAllSync && patient.getNTEAllSync().toArraySync(),
                    observationCount = payload && payload.getORDERRepsSync();

                HL7JSON = {
                    PATIENT: {
                        NTE: patientNTEALL.map( nte => NTE( nte ) )
                    }
                };

                for( let i = 0; i < observationCount; i++ ) {
                    let
                        order = payload.getORDERSync( i ),
                        orderDetail = order && order.getORDER_DETAILSync && order.getORDER_DETAILSync();

                    orderObservations[i] = {
                        orc: ORC( order && order.getORCSync && order.getORCSync() ),
                        orderDetails: OBR( orderDetail && orderDetail.getOBRSync && orderDetail.getOBRSync() )
                    };

                    if( !dateOfCreation ) {
                        dateOfCreation = orderObservations[i].orc &&
                                         orderObservations[i].orc.quantityTiming &&
                                         orderObservations[i].orc.quantityTiming.startDatetime;
                    }

                    if( !labReqNo ) {
                        labReqNo = orderObservations[i].orc &&
                                   orderObservations[i].orc.placerOrderNumber &&
                                   orderObservations[i].orc.placerOrderNumber.entityIdentifier;
                    }
                }
                HL7JSON.ORDERS = orderObservations;
                HL7JSON = {
                    ...HL7JSON,
                    title: PID.getPatientNameSync( 0 ).getDegreeEgMDSync().getValueSync(),
                    firstname: PID.getPatientNameSync( 0 ).getGivenNameSync().getValueSync(),
                    lastname: PID.getPatientNameSync( 0 ).getFamilyNameSync().getSurnameSync().getValueSync(),
                    dob: TS( PID.getDateTimeOfBirthSync() ),
                    gender: gender === 'F' ? 'W' : gender === 'M' ? 'M' : 'X',
                    talk: (gender === 'F' ? 'MS' : (gender === 'M' ? 'MR' : '')),
                    dateOfCreation: dateOfCreation,
                    labReqNo: labReqNo
                };
            } catch( error ) {
                Y.log( `convertObjectToHL7: can not convert HL7 to Object. Error: ${error}`, 'debug', NAME );
                HL7JSON.error = error;
            } finally {
                return HL7JSON;
            }
        }

        function getValueOrEmpty( value ) {
            return value.getValueOrEmptySync();
        }

        function SI( SI ) {
            return SI.getValueSync();
        }

        function ID( ID ) {
            return getValueOrEmpty( ID );
        }

        function ST( ST ) {
            return getValueOrEmpty( ST );
        }

        function IS( IS ) {
            return getValueOrEmpty( IS );
        }

        function TS( TS ) {
            if( TS && TS.getTimeOfAnEventSync && TS.getTimeOfAnEventSync().getValueSync ) {
                return moment( TS.getTimeOfAnEventSync().getValueSync(), longDateFormat ).toDate();
            } else if( TS && TS.getTs1_TimeSync && TS.getTs1_TimeSync() && TS.getTs1_TimeSync().getValueSync ) {
                return moment( TS.getTs1_TimeSync().getValueSync(), longDateFormat ).toDate();
            } else {
                return "";
            }
        }

        function NM( NM ) {
            return NM.getValueSync();
        }

        function encodeSync( value ) {
            return value.encodeSync();
        }

        function Varies( varies ) {
            return encodeSync( varies );
        }

        function CE( CE ) {
            const componentTypeMap = [
                [0, ST, "identifier"],
                [1, ST, "text"],
                [2, IS, "nameOfCodingSystem"],
                [3, ST, "alternateIdentifier"],
                [4, ST, "alternateText"],
                [5, IS, "nameOfAlternateCodingSystem"]
            ];
            return convertTypeByConfig( CE, componentTypeMap );
        }

        function EI( EI ) {
            const componentTypeMap = [
                [0, ST, "entityIdentifier"],
                [1, IS, "namespaceID"],
                [2, ST, "universalID"],
                [3, ID, "universalIDType"]
            ];

            return convertTypeByConfig( EI, componentTypeMap );
        }

        function FN( FN ) {
            const componentTypeMap = [
                [0, ST, "surname"],
                [1, ST, "ownSurnamePrefix"],
                [2, ST, "ownSurname"],
                [3, ST, "surnamePrefixFromPartnerSpouse"],
                [4, ST, "surnameFromPartnerSpouse"]
            ];

            return convertTypeByConfig( FN, componentTypeMap );
        }

        function HD( HD ) {
            const componentTypeMap = [
                [0, IS, "namespaceID"],
                [1, ST, "universalID"],
                [2, ID, "universalIDType"]
            ];

            return convertTypeByConfig( HD, componentTypeMap );
        }

        function XCN( XCN ) {
            const componentTypeMap = [
                [0, ST, "iDNumber"],
                [1, FN, "familyName"],
                [2, ST, "givenName"],
                [3, ST, "secondAndFurtherGivenNamesOrInitialsThereof"],
                [4, ST, "suffix"],
                [5, ST, "prefix"],
                [6, IS, "degree"],
                [7, IS, "sourceTable"],
                [8, HD, "assigningAuthority"],
                [9, ID, "nameTypeCode"],
                [10, ST, "identifierCheckDigit"],
                [11, ID, "codeIdentifyingTheCheckDigitSchemeEmployed"],
                [12, IS, "identifierTypeCode"],
                [13, HD, "assigningFacility"],
                [14, ID, "nameRepresentationCode"],
                [15, CE, "nameContext"],
                [16, DR, "nameValidityRange"],
                [17, ID, "nameAssemblyOrder"]
            ];

            return convertTypeByConfig( XCN, componentTypeMap );
        }

        function DR( DR ) {
            const componentTypeMap = [
                [0, TS, "rangeStartDate/Time"],
                [1, TS, "rangeEndDate/Time"]
            ];

            return convertTypeByConfig( DR, componentTypeMap );
        }

        function CQ( CQ ) {
            const componentTypeMap = [
                [0, NM, "quantity"],
                [1, CE, "units"]
            ];
            return convertTypeByConfig( CQ, componentTypeMap );
        }

        function RI( RI ) {
            const componentTypeMap = [
                [0, IS, "repeatPattern"],
                [1, ST, "explicitTimeInterval"]
            ];

            return convertTypeByConfig( RI, componentTypeMap );
        }

        function TX( TX ) {
            return TX.getValueOrEmptySync();
        }

        function OSD( OSD ) {
            const componentTypeMap = [
                [0, ID, "sequenceResultsFlag"],
                [1, ST, "entityIdentifier"],
                [2, IS, "namespaceID"],
                [3, ST, "entityIdentifier"],
                [4, IS, "namespaceID"],
                [5, ST, "sequenceConditionValue"],
                [6, NM, "maximumNumberOfRepeats"],
                [7, ST, "universalID"],
                [8, ID, "placerOrderNumber;UniversalIDType"],
                [9, ST, "universalID"],
                [10, ID, "universalIDType"]
            ];

            return convertTypeByConfig( OSD, componentTypeMap );
        }

        function TQ( TQ ) {
            const componentTypeMap = [
                [0, CQ, "quantity"],
                [1, RI, "interval"],
                [2, ST, "duration"],
                [3, TS, "startDatetime"],
                [4, TS, "endDatetime"],
                [5, ST, "priority"],
                [6, ST, "condition"],
                [7, TX, "text(TX)"],
                [8, ID, "conjunctionComponent"],
                [9, OSD, "orderSequencing"],
                [10, CE, "occurrenceDuration"],
                [11, NM, "totalOccurences"]
            ];

            return convertTypeByConfig( TQ, componentTypeMap );
        }

        function EIP( EIP ) {
            const componentTypeMap = [
                [1, EI, "parentsPlacerOrderNumber"],
                [2, EI, "parentsFillerOrderNumber"]
            ];

            return convertTypeByConfig( EIP, componentTypeMap );
        }

        function PL( PL ) {
            const componentTypeMap = [
                [0, IS, "pointOfCare"],
                [1, IS, "room"],
                [2, IS, "bed"],
                [3, HD, "facility"],
                [4, IS, "locationStatus"],
                [5, IS, "personLocationType"],
                [6, IS, "building"],
                [7, IS, "floor"],
                [8, ST, "locationDescription"]
            ];
            return convertTypeByConfig( PL, componentTypeMap );
        }

        function TN( TN ) {
            return TN.getValueSync();
        }

        function XTN( XTN ) {
            const componentTypeMap = [
                [0, TN, "tN"],
                [1, ID, "telecommunicationUseCode"],
                [2, ID, "telecommunicationEquipmentType"],
                [3, ST, "emailAddress"],
                [4, NM, "countryCode"],
                [5, NM, "areacityCode"],
                [6, NM, "phoneNumber"],
                [7, NM, "extension"],
                [8, ST, "anyText"]
            ];
            return convertTypeByConfig( XTN, componentTypeMap );
        }

        function XON( XON ) {
            const componentTypeMap = [
                [0, ST, "organizationName"],
                [1, IS, "organizationNameTypeCode"],
                [2, NM, "iDNumber"],
                [3, ST, "checkDigit"],
                [4, ID, "codeIdentifyingTheCheckDigitSchemeEmployed"],
                [5, HD, "assigningAuthority"],
                [6, IS, "identifierTypeCode"],
                [7, HD, "assigningFacilityID"],
                [8, ID, "nameRepresentationCode"]
            ];
            return convertTypeByConfig( XON, componentTypeMap );
        }

        function SAD( SAD ) {
            const componentTypeMap = [
                [0, ST, "streetOrMailingAddress"],
                [1, ST, "streetName"],
                [2, ST, "dwellingNumber"]
            ];

            return convertTypeByConfig( SAD, componentTypeMap );
        }

        function XAD( XAD ) {
            const componentTypeMap = [
                [0, SAD, "streetAddress"],
                [1, ST, "otherDesignation"],
                [2, ST, "city"],
                [3, ST, "stateOrProvince"],
                [4, ST, "zipOrPostalCode"],
                [5, ID, "country"],
                [6, ID, "addressType"],
                [7, ST, "otherGeographicDesignation"],
                [8, IS, "countyparishCode"],
                [9, IS, "censusTract"],
                [10, ID, "addressRepresentationCode"],
                [11, DR, "addressValidityRange"]
            ];
            return convertTypeByConfig( XAD, componentTypeMap );
        }

        function CWE( CWE ) {
            const componentTypeMap = [
                [0, ST, "identifier"],
                [1, ST, "text"],
                [2, IS, "nameOfCodingSystem"],
                [3, ST, "alternateIdentifier"],
                [4, ST, "alternateText"],
                [5, IS, "nameOfAlternateCodingSystem"],
                [6, ST, "codingSystemVersionID"],
                [7, ST, "alternateCodingSystemVersionID"],
                [8, ST, "originalText"]
            ];

            return convertTypeByConfig( CWE, componentTypeMap );
        }

        function SPS( SPS ) {
            const componentTypeMap = [
                [0, CE, "specimenSourceNameOrCode"],
                [1, TX, "additives"],
                [2, TX, "freeText"],
                [3, CE, "bodySite"],
                [4, CE, "siteModifier"],
                [5, CE, "collectionModifierMethodCode"],
                [6, CE, "specimenRole"]
            ];
            return convertTypeByConfig( SPS, componentTypeMap );
        }

        function MO( MO ) {
            const componentTypeMap = [
                [0, NM, "quantity"],
                [1, ID, "denomination"]
            ];
            return convertTypeByConfig( MO, componentTypeMap );
        }

        function MOC( MOC ) {
            const componentTypeMap = [
                [0, MO, "dollarAmount"],
                [1, CE, "chargeCode"]
            ];
            return convertTypeByConfig( MOC, componentTypeMap );
        }

        function PRL( PRL ) {
            const componentTypeMap = [
                [0, CE, "oBX3ObservationIdentifierOfParentResult"],
                [1, ST, "oBX4SubIDOfParentResult"],
                [2, TX, "partOfOBX5ObservationResultFromParent"]
            ];
            return convertTypeByConfig( PRL, componentTypeMap );
        }

        function CNN( CNN ) {
            const componentTypeMap = [
                [0, ST, "iDNumber(ST)"],
                [1, ST, "familyName"],
                [2, ST, "givenName"],
                [3, ST, "secondAndFurtherGivenNamesOrInitialsThereof"],
                [4, ST, "suffix"],
                [5, ST, "prefix"],
                [6, IS, "degree"],
                [7, IS, "sourceTable"],
                [8, IS, "assigningAuthorityNamespaceID"],
                [9, ST, "assigningAuthorityUniversalID"],
                [10, ID, "assigningAuthorityUniversalIDType"]
            ];
            return convertTypeByConfig( CNN, componentTypeMap );
        }

        function NDL( NDL ) {
            const componentTypeMap = [
                [0, CNN, "oPName"],
                [1, TS, "startDatetime"],
                [2, TS, "endDatetime"],
                [3, IS, "pointOfCare"],
                [4, IS, "room"],
                [5, IS, "bed"],
                [6, HD, "facility"],
                [7, IS, "locationStatus"],
                [8, IS, "personLocationType"],
                [9, IS, "building"],
                [10, IS, "floor"]
            ];

            return convertTypeByConfig( NDL, componentTypeMap );
        }

        function FT( FT ) {
            return FT.getValueOrEmptySync();
        }

        function MSG( MSG ) {
            const componentTypeMap = [
                [0, ID, "messageType"],
                [1, ID, "triggerEvent"],
                [2, ID, "messageStructure"]
            ];

            return convertTypeByConfig( MSG, componentTypeMap );
        }

        function PT( PT ) {
            const componentTypeMap = [
                [0, ID, "processingID"],
                [1, ID, "processingMode"]
            ];
            return convertTypeByConfig( PT, componentTypeMap );
        }

        function VID( VID ) {
            const componentTypeMap = [
                [0, ID, "versionID"],
                [1, CE, "internationalizationCode"],
                [2, CE, "internationalVersionID"]
            ];

            return convertTypeByConfig( VID, componentTypeMap );
        }

        function XPN( XPN ) {
            const componentTypeMap = [
                [0, FN, "familyName"],
                [1, ST, "givenName"],
                [2, ST, "secondAndFurtherGivenNamesOrInitialsThereof"],
                [3, ST, "suffix"],
                [4, ST, "prefix"],
                [5, IS, "degree"],
                [6, ID, "nameTypeCode"],
                [7, ID, "nameRepresentationCode"],
                [8, CE, "nameContext"],
                [9, DR, "nameValidityRange"],
                [10, ID, "nameAssemblyOrder"]
            ];
            return convertTypeByConfig( XPN, componentTypeMap );
        }

        function PI( PI ) {
            const componentTypeMap = [
                [0, ST, "iDNumber"],
                [1, IS, "typeOfIDNumber"],
                [2, ST, "otherQualifyingInfo"]
            ];

            return convertTypeByConfig( PI, componentTypeMap );
        }

        function ORC( ORC ) {
            const componentTypeMap = [
                [1, ID, "orderControl"],
                [2, EI, "placerOrderNumber"],
                [3, EI, "fillerOrderNumber"],
                [4, EI, "placerGroupNumber"],
                [5, ID, "orderStatus"],
                [6, ID, "responseFlag"],
                [7, TQ, "quantityTiming"],
                [8, EIP, "parentOrder"],
                [9, TS, "dateTimeOfTransaction"],
                [10, XCN, "enteredBy"],
                [11, XCN, "verifiedBy"],
                [12, XCN, "orderingProvider"],
                [13, PL, "enterersLocation"],
                [14, XTN, "callBackPhoneNumber"],
                [15, TS, "orderEffectiveDateTime"],
                [16, CE, "orderControlCodeReason"],
                [17, CE, "enteringOrganization"],
                [18, CE, "enteringDevice"],
                [19, XCN, "actionBy"],
                [20, CE, "advancedBeneficiaryNoticeCode"],
                [21, XON, "orderingFacilityName"],
                [22, XAD, "orderingFacilityAddress"],
                [23, XTN, "orderingFacilityPhoneNumber"],
                [24, XAD, "orderingProviderAddress"],
                [25, CWE, "orderStatusModifier"]
            ];

            return convertSegmentByConfig( ORC, componentTypeMap );
        }

        function OBR( OBR ) {
            const componentTypeMap = [
                [1, SI, "setIDOBR"],
                [2, EI, "placerOrderNumber"],
                [3, EI, "fillerOrderNumber"],
                [4, CE, "universalServiceIdentifier"],
                [5, ID, "priority"],
                [6, TS, "requestedDateTime"],
                [7, TS, "observationDateTime"],
                [8, TS, "observationEndDateTime"],
                [9, CQ, "collectionVolume"],
                [10, XCN, "collectorIdentifier"],
                [11, ID, "specimenActionCode"],
                [12, CE, "dangerCode"],
                [13, ST, "relevantClinicalInfo"],
                [14, TS, "specimenReceivedDateTime"],
                [15, SPS, "specimenSource"],
                [16, XCN, "orderingProvider"],
                [17, XTN, "orderCallbackPhoneNumber"],
                [18, ST, "placerField1"],
                [19, ST, "placerField2"],
                [20, ST, "fillerField1"],
                [21, ST, "fillerField2"],
                [22, TS, "resultsRptStatusChng-DateTime"],
                [23, MOC, "chargeToPractice"],
                [24, ID, "diagnosticServSectID"],
                [25, ID, "resultStatus"],
                [26, PRL, "parentResult"],
                [27, TQ, "quantityTiming"],
                [28, XCN, "resultCopiesTo"],
                [29, EIP, "parentNumber"],
                [30, ID, "transportationMode"],
                [31, CE, "reasonForStudy"],
                [32, NDL, "principalResultInterpreter"],
                [33, NDL, "assistantResultInterpreter"],
                [34, NDL, "technician"],
                [35, NDL, "transcriptionist"],
                [36, TS, "scheduledDateTime"],
                [37, NM, "numberOfSampleContainers"],
                [38, CE, "transportLogisticsOfCollectedSample"],
                [39, CE, "collector'SComment"],
                [40, CE, "transportArrangementResponsibility"],
                [41, ID, "transportArranged"],
                [42, ID, "escortRequired"],
                [43, CE, "plannedPatientTransportComment"],
                [44, CE, "procedureCode"],
                [45, CE, "procedureCodeModifier"],
                [46, CE, "placerSupplementalServiceInformation"],
                [47, CE, "fillerSupplementalServiceInformation"]
            ];

            return convertSegmentByConfig( OBR, componentTypeMap );
        }

        function OBX( OBX ) {
            const componentTypeMap = [
                [1, SI, "setIDOBX"],
                [2, ID, "valueType"],
                [3, CE, "observationIdentifier"],
                [4, ST, "observationSubId"],
                [5, Varies, "observationValue"],
                [6, CE, "units"],
                [7, ST, "referencesRange"],
                [8, IS, "abnormalFlags"],
                [9, NM, "probability"],
                [10, ID, "natureOfAbnormalTest"],
                [11, ID, "observationResultStatus"],
                [12, TS, "dateLastObservationNormalValue"],
                [13, ST, "userDefinedAccessChecks"],
                [14, TS, "dateTimeOfTheObservation"],
                [15, CE, "producerSID"],
                [16, XCN, "responsibleObserver"],
                [17, CE, "observationMethod"],
                [18, EI, "equipmentInstanceIdentifier"],
                [19, TS, "dateTimeOfTheAnalysis"]
            ];

            return convertSegmentByConfig( OBX, componentTypeMap );
        }

        function NTE( NTE ) {
            const componentTypeMap = [
                [1, SI, "setIDNTE"],
                [2, ID, "sourceOfComment"],
                [3, FT, "comment"],
                [4, CE, "commentType"]
            ];
            return convertSegmentByConfig( NTE, componentTypeMap );
        }

        function DSC( DSC ) {
            const componentTypeMap = [
                [1, ST, "continuationPointer"],
                [2, ID, "continuationStyle"]
            ];
            return convertSegmentByConfig( DSC, componentTypeMap );
        }

        function MSH( MSH ) {
            const componentTypeMap = [
                [1, ST, "fieldSeparator"],
                [2, ST, "encodingCharacters"],
                [3, HD, "sendingApplication"],
                [4, HD, "sendingFacility"],
                [5, HD, "receivingApplication"],
                [6, HD, "receivingFacility"],
                [7, TS, "dateTimeOfMessage"],
                [8, ST, "security"],
                [9, MSG, "messageType"],
                [10, ST, "messageControlID"],
                [11, PT, "processingID"],
                [12, VID, "versionID"],
                [13, NM, "sequenceNumber"],
                [14, ST, "continuationPointer"],
                [15, ID, "acceptAcknowledgmentType"],
                [16, ID, "applicationAcknowledgmentType"],
                [17, ID, "countryCode"],
                [18, ID, "characterSet"],
                [19, CE, "principalLanguageOfMessage"],
                [20, ID, "alternateCharacterSetHandlingScheme"],
                [21, ID, "conformanceStatementID"]
            ];
            return convertSegmentByConfig( MSH, componentTypeMap );
        }

        function CTD( CTD ) {
            const componentTypeMap = [
                [1, CE, "contactRole"],
                [2, XPN, "contactName"],
                [3, XAD, "contactAddress"],
                [4, PL, "contactLocation"],
                [5, XTN, "contactCommunicationInformation"],
                [6, CE, "preferredMethodOfContact"],
                [7, PI, "contactIdentifiers"]
            ];
            return convertSegmentByConfig( CTD, componentTypeMap );
        }

        /*Extract value from HL7 ca.uhn.hl7v2.model.AbstractType, type should have getComponentSync method*/
        function convertTypeByConfig( type, configs ) {
            let result = {};

            configs.forEach( config => {
                let value = config[1]( type.getComponentSync( config[0] ) );

                if( value ) {
                    result[config[2]] = value;
                }
            } );

            return result;
        }

        /*Extract value from HL7 ca.uhn.hl7v2.model.AbstractSegment*/
        function convertSegmentByConfig( segment, configs ) {
            let result = {};

            configs.forEach( config => {
                let field = segment.getFieldSync( config[0] );

                if( Array.isArray( field ) && field.length > 1 ) {
                    result[config[2]] = field.map( value => {
                        return config[1]( value );
                    } );
                } else if( field.length ) {
                    result[config[2]] = config[1]( field[0] );
                }

            } );

            return result;
        }

        /**
         * convertHL7toObject
         * @method convertHL7toObject
         * @param {String} message hl7 string
         * @returns {Object} patient object
         */
        function convertHL7toObject( message ) {
            var
                pipeparser,
                payload,
                PID, //patientId
                gender,
                result = {};

            initJava();
            pipeparser = new PipeParser();

            Y.log( ` converting HL7 to Object. HL7 string: ${message}`, 'debug', NAME );

            try {
                payload = pipeparser.parseSync( message );
                PID = payload.getPIDSync();
                gender = PID.getAdministrativeSexSync().getValueSync();
                result.data =
                    {
                        _id: PID.getPatientIdentifierListSync( 0 ).getIDNumberSync().getValueSync(),
                        title: PID.getPatientNameSync( 0 ).getDegreeEgMDSync().getValueSync(),
                        firstname: PID.getPatientNameSync( 0 ).getGivenNameSync().getValueSync(),
                        lastname: PID.getPatientNameSync( 0 ).getFamilyNameSync().getSurnameSync().getValueSync(),
                        dob: moment( `${PID.getDateTimeOfBirthSync().getTimeSync()}0100`, longDateFormat ).toISOString(),
                        gender: (gender === 'F' ? 'FEMALE' : (gender === 'M' ? 'MALE' : 'UNKNOWN')),
                        talk: (gender === 'F' ? 'MS' : (gender === 'M' ? 'MR' : ''))
                    };
            } catch( error ) {
                Y.log( ` can not convert HL7 to Object. Error: ${error}`, 'debug', NAME );
                result.error = error;
            }

            return result;
        }

        /**
         *
         * @param config
         * @param user
         * @param callback
         * @returns {Promise<void>}
         */
        async function convertHL7toLDTJSON( args ) {
            const { user = {}, callback, data = {}, calledFromFlowTransformer = false, config = {} } = args,
                Iconv = require( 'iconv' ).Iconv;
            let err,
                result,
                hl7File,
                hl7Converted,
                path = '',
                originalName,
                title,
                ignoreHashExists,
                hl7CreateTreatments,
                respondimmediately;

            if( !calledFromFlowTransformer ) {
                if( args && args.httpRequest && args.httpRequest.files && args.httpRequest.files.ldtFile && args.httpRequest.files.ldtFile.originalname ) {
                    path = args.httpRequest.files.ldtFile.path;
                    originalName = args.httpRequest.files.ldtFile.originalname;
                    ignoreHashExists = data.ignoreHashExists;
                    hl7CreateTreatments = data.hl7CreateTreatments;
                    respondimmediately = data.respondimmediately;

                    [err, hl7File] = await formatPromiseResult(
                        readFile( path )
                    );

                    if( err ) {
                        Y.log( `convertHL7toLDTJSON - readfile err: ${err.stack || err}`, 'warn', NAME );
                        throw Y.doccirrus.errors.rest( 19021 );
                    }
                } else {
                    Y.log( `convertHL7toLDTJSON readHL7File - err: ${Y.doccirrus.errors.rest( 19020 )}`, 'warn', NAME );
                    throw Y.doccirrus.errors.rest( 19020 );
                }
            } else {
                hl7File = config.input.data;
                path = config.input.path;
                ignoreHashExists = false;
                title = config.title;
                hl7CreateTreatments = config.transformer.hl7CreateTreatments;
                originalName = require( 'path' ).basename( config.input.path );
                respondimmediately = false;
            }

            try {
                let iconv = new Iconv( 'ISO-8859-1', 'UTF-8//IGNORE' );
                hl7Converted = iconv.convert( hl7File );
            } catch( ex ) {
                Y.log( `convertHL7toLDTJSON: failed to convert HL7 data using iconv - Error: ${ex}`, 'error', NAME );
                hl7Converted = hl7File.toString( 'utf8' );
            }

            let HL7JSON = Y.doccirrus.api.hl7.convertHL7toHL7JSON( hl7Converted.toString( 'utf8' ) );

            [err, result] = await formatPromiseResult( Y.doccirrus.api.lab.submitHL7 ( {
                user: user,
                callback,
                data: {
                    HL7JSON,
                    config: {
                        ignoreHashExists,
                        billingFlag: true,
                        flow: title,
                        skipParsingLdt: true,
                        sourceFileType: "HL7",
                        hl7CreateTreatments,
                        respondimmediately
                    }
                },
                ldtFile: {
                    path,
                    originalname: originalName,
                    data: hl7File,
                    pmResults: {}
                }
            } ) );

            if( err ) {
                Y.log( `convertHL7toLDTJSON: failed to submit HL7, Error: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            return handleResult( null, result, args.callback );
        }

        /**
         * @class hl7
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).hl7 = {
            /**
             * @property name
             * @type {String}
             * @default hl7-api
             * @protected
             */
            name: NAME,
            convertObjectToHL7,
            convertHL7toObject,
            convertHL7toHL7JSON,
            isMessageOfTypeLabDataAndTreatments,
            isMessageOfTypeLabRequest,
            convertHL7toLDTJSON
        };

    },
    '0.0.1', {requires: []}
);
