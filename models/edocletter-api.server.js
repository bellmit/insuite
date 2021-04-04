/**
 * User: do
 * Date: 08.02.21  15:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'edocletter-api', function( Y, NAME ) {
    const i18n = Y.doccirrus.i18n;
    const ADDITIONAL_CASEFOLDER_TYPES_ERROR = i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' );
    const DOCLETTER_SENT_TREATMENT_AUTO_CREATED = i18n( 'edocletter-api.messages.DOCLETTER_SENT_TREATMENT_AUTO_CREATED' );
    const DOCLETTER_RECEIVED_TREATMENT_AUTO_CREATED = i18n( 'edocletter-api.messages.DOCLETTER_RECEIVED_TREATMENT_AUTO_CREATED' );
    const getObject = Y.doccirrus.commonutils.getObject;
    const ObjectId = require( 'mongoose' ).Types.ObjectId;
    const uuid = require( 'node-uuid' );
    const {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;
    const {promisify} = require( 'util' );
    const updateTreatment = promisify( Y.doccirrus.treatmentutils.updateTreatment );

    const {
        ClinicalDocument,
        AssignedCustodian,
        Custodian,
        Author,
        AssignedAuthor,
        AssignedPerson,
        Code,
        Time,
        Organization,
        PatientRole,
        Patient,
        PersonName,
        OrganizationName,
        Address,
        Telecommunication,
        InstanceIdentifier,
        RecordTarget,
        Authenticator,
        CustodianOrganization,

        // enum exports
        ParticipationType,
        AdministrativeGender,
        PostalAddressUse,
        NullFlavorType,
        TelecommunicationType,
        DocumentTypeCode,
        ConfidentialityCode,
        CodeSystemTypes,
        ParticipationSignature
    } = Y.doccirrus.api.edocletterxml;

    const DOCLETTER_COMMUNICATION_TYPE_MAP = {
        [TelecommunicationType.tel]: [
            'PHONEPRIV',
            'MOBILEPRIV',
            'PHONEJOB',
            'PHONEEXT',
            'PHONEEMERGENCY',
            'PHONEJOB'
        ],
        [TelecommunicationType.fax]: [
            'FAXPRIV',
            'FAXFAXJOBPRIV'
        ],

        [TelecommunicationType.mailto]: [
            'EMAILPRIV',
            'EMAILJOB'
        ],

        [TelecommunicationType.http]: [
            'FACEBOOK',
            'XING',
            'LINKEDIN',
            'GOOGLE',
            'URL'
        ]
    };

    const COMMUNICATION_TYPE_DOCLETTER_MAP = Object.keys( DOCLETTER_COMMUNICATION_TYPE_MAP ).reduce( ( acc, val ) => {
        const communicationTypes = DOCLETTER_COMMUNICATION_TYPE_MAP[val];
        communicationTypes.forEach( communicationType => {
            acc[communicationType] = val;
        } );
        return acc;
    }, {} );

    async function getBasicDataFromDocLetter( args ) {
        const readInCaseConfig = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.readConfig );
        const {user, docletter} = args;

        let [err, inCaseConfig] = await formatPromiseResult( readInCaseConfig( {
            user
        } ) );

        if( err ) {
            Y.log( `getBasicDataFromDocLetter: could not get inCase config for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let casefolders;
        [err, casefolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            model: 'casefolder',
            user,
            query: {
                _id: docletter.caseFolderId
            },
            options: {
                lean: true,
                limit: 1
            }
        } ) );

        if( err ) {
            Y.log( `getBasicDataFromDocLetter: could not get casefolder ${docletter.caseFolderId} of docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        if( !casefolders[0] ) {
            throw Y.doccirrus.errors.rest( 404, 'casefolder not found' );
        }

        return {
            inCaseConfig: inCaseConfig || {},
            caseFolder: casefolders[0]
        };

    }

    async function createTreatment( args ) {
        const checkCaseFolder = promisifyArgsCallback( Y.doccirrus.api.casefolder.checkCaseFolder );
        const _ = require( 'lodash' );
        const {user, code, docletter} = args;
        const timestamp = docletter.timestamp;
        const activity = {
            actType: 'TREATMENT',
            catalogShort: 'EBM',
            status: 'VALID',
            areTreatmentDiagnosesBillable: '1',
            code,
            timestamp,
            ..._.pick( docletter, ['locationId', 'employeeId', 'caseFolderId', 'patientId'] )
        };
        let [err, treatment] = await formatPromiseResult( updateTreatment( {
            user,
            activity,
            timestamp,
            useOriginalValues: true,
            _doNotSetUserContent: false
        } ) );

        if( err ) {
            Y.log( `createTreatment: could not updateTreatment ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let results;
        [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( treatment )
        } ) );

        if( !err ) {
            return results;
        }

        treatment.status = 'CREATED';

        Y.log( `createTreatment: could post treatment for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
        Y.log( `createTreatment: post treatment for docletter ${docletter._id}: in inbox`, 'info', NAME );

        [err, results] = await formatPromiseResult( checkCaseFolder( {
            user: user,
            query: {
                patientId: treatment.patientId,
                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
            },
            data: {
                patientId: treatment.patientId,
                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                start: new Date(),
                title: ADDITIONAL_CASEFOLDER_TYPES_ERROR,
                skipcheck_: true
            },
            options: {
                lean: true
            }
        } ) );

        if( err ) {
            Y.log( `createTreatment: could not ensure error casefolder for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        treatment._id = ObjectId();
        treatment.caseFolderId = results._id.toString();

        [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            'migrate': true,
            user,
            action: 'upsert',
            model: 'activity',
            data: Y.doccirrus.filters.cleanDbObject( treatment )
        } ) );

        if( err ) {
            Y.log( `createTreatment: could not store treatment in error casefolder for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        return [results._id.toString()];
    }

    /**
     * Allow creation if allow flag is set and and configured locations are empty or match docletter location.
     * @param {Object} docletter
     * @param {Boolean} allowed
     * @param {[String]} allowedLocationIds
     * @return {boolean}
     */
    function autoCreationAllowed( {docletter, allowed, allowedLocationIds} ) {
        const docletterLocationId = docletter.locationId.toString();
        return allowed && (!allowedLocationIds.length || allowedLocationIds.includes( docletterLocationId ));
    }

    async function updateDocLetterWithFlatFee( {user, docLetterId, treatmentId} ) {
        await Y.doccirrus.mongodb.runDb( {
            user,
            action: 'update',
            model: 'activity',
            query: {
                _id: docLetterId
            },
            data: {$set: {flatFeeTreatmentId: treatmentId}}
        } );
    }

    /**
     * Creates a flat fee treatment for sent docletter if possible.
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Object} args.originalParams.docletter
     * @param {Function} args.callback
     * @return {Promise<*>}
     */
    async function createTreatmentForSentDocLetter( args ) {
        args.code = '86900';
        return createTreatmentForDocLetter( args );
    }

    /**
     * Creates a flat fee treatment for received docletter if possible.
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.originalParams
     * @param {Object} args.originalParams.docletter
     * @param {Function} args.callback
     * @return {Promise<*>}
     */
    async function createTreatmentForReceivedDocLetter( args ) {
        args.code = '86901';
        return createTreatmentForDocLetter( args );
    }

    async function flatFeeTreatmentExists( {user, treatmentId} ) {
        const count = await Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'count',
            query: {
                _id: treatmentId
            },
            options: {
                limit: 1
            }
        } );
        return count > 0;
    }

    function informUser( {user, code} ) {
        const message = code === '86900' ?
            DOCLETTER_SENT_TREATMENT_AUTO_CREATED :
            DOCLETTER_RECEIVED_TREATMENT_AUTO_CREATED;

        Y.doccirrus.communication.emitEventForUser( {
            targetId: user.identityId,
            event: 'message',
            msg: {
                data: message
            },
            meta: {
                level: 'INFO'
            }
        } );
    }

    async function createTreatmentForDocLetter( args ) {
        Y.log( 'Entering Y.doccirrus.api.edocletter.createTreatmentForDocLetter', 'info', NAME );
        if( args.callback ) {
            args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edocletter.createTreatmentForDocLetter' );
        }
        const
            {user, docletter, code, callback} = args;

        if( !docletter ) {
            return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient data' ), undefined, callback );
        }

        if( docletter.flatFeeTreatmentId ) {
            let [err, exists] = await formatPromiseResult( flatFeeTreatmentExists( {
                user,
                treatmentId: docletter.flatFeeTreatmentId
            } ) );

            if( err ) {
                Y.log( `createTreatmentForDocLetter: could not check if flat fee treatment ${docletter.flatFeeTreatmentId} exists for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            } else if( exists ) {
                return handleResult( null, {code: '11502'}, callback );
            } else {
                Y.log( `createTreatmentForDocLetter: flat fee treatment ${docletter.flatFeeTreatmentId} does not exist anymore for docletter ${docletter._id} and can be created again`, 'info', NAME );
            }
        }

        let [err, basicData] = await formatPromiseResult( getBasicDataFromDocLetter( {user, docletter} ) );

        if( err ) {
            Y.log( `createTreatmentForDocLetter: could not get basic data: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        const {inCaseConfig, caseFolder} = basicData;

        if( !autoCreationAllowed( {
            docletter,
            allowed: inCaseConfig.kimTreatmentAutoCreationOnEDocLetterSent,
            allowedLocationIds: inCaseConfig.kimTreatmentAutoCreationOnEDocLetterSentLocations
        } ) ) {
            Y.log( `createTreatmentForDocLetter: skip treatment creation for edocletter: not allowed by config`, 'info', NAME );
            return handleResult( null, {code: '11500'}, callback );
        }

        if( !Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
            Y.log( `createTreatmentForDocLetter: skip treatment creation for edocletter: no PUBLIC case folder`, 'info', NAME );
            return handleResult( null, {code: '11502'}, callback );
        }

        let results;
        [err, results] = await formatPromiseResult( createTreatment( {user, code: code, docletter} ) );

        if( err ) {
            Y.log( `createTreatmentForDocLetter: could not create treatment from docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        informUser( {user, code} );

        [err] = await formatPromiseResult( updateDocLetterWithFlatFee( {
            user,
            docLetterId: docletter._id,
            treatmentId: results[0]
        } ) );

        if( err ) {
            Y.log( `createTreatmentForDocLetter: could not link flat fee treatment with docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, {code: 0, createdTreatment: results}, callback );
    }

    function getFileBuffer( user, fileId ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.gridfs.get( user, fileId, function( err, result ) {
                if( err ) {
                    reject( err );
                    return;
                }
                resolve( result );
            } );
        } );
    }

    function mapGenderFromXml( gender ) {
        if( !gender ) {
            return;
        }
        switch( gender ) {
            case AdministrativeGender.Male:
                return 'MALE';
            case AdministrativeGender.Female:
                return 'FEMALE';
            default:
                return 'UNDEFINED';
        }
    }

    function getDateFrom( timeObj ) {
        if( !timeObj || !timeObj.time ) {
            return;
        }
        return timeObj.time;
    }

    function getNamePart( prop, nameObj ) {
        return getObject( `${prop}.0.value`, nameObj );
    }

    function getNameFromXml( nameObj = {} ) {
        return {
            firstname: getNamePart( 'given', nameObj ),
            lastname: getNamePart( 'family', nameObj ),
            title: getNamePart( 'prefix', nameObj ),
            nameaffix: getNamePart( 'suffix', nameObj )
        };
    }

    function getCommunicationEntryFromXml( telcom ) {
        const types = DOCLETTER_COMMUNICATION_TYPE_MAP[telcom.type];
        if( types && telcom.value ) {
            return {
                type: types[0],
                value: telcom.value
            };
        }
    }

    async function refineCountryCodes( addresses ) {
        const countries = addresses.map( addr => addr.country );
        const sdCountryEntries = await Y.doccirrus.mongodb.runDb( {
            user: Y.doccirrus.auth.getSUForLocal(),
            model: 'catalog',
            query: {
                country: {$in: countries},
                catalog: /DC-SDCOUNTRIES-D/
            }
        } );

        addresses.forEach( addr => {
            const sdCountryEntry = sdCountryEntries.find( _sdCountryEntry => _sdCountryEntry.country === addr.country );
            addr.countryCode = sdCountryEntry && sdCountryEntry.sign;
        } );
    }

    async function parseAndMapDocLetterXml( {xmlString} ) {
        const moment = require( 'moment' );
        let [err, clinicalDocument] = await formatPromiseResult( ClinicalDocument.fromXMLString( xmlString ) );
        if( err ) {
            Y.log( `parseDocLetterXml: could not create clinicalDocument from XML string: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        Y.log( `parseAndMapDocLetterXml: clinicalDocument: ${JSON.stringify( clinicalDocument )}`, 'debug', NAME );

        const patientRole = getObject( 'recordTarget.0.patientRole.0', clinicalDocument );
        let insuranceNo, insuranceId, insuranceGrpId;
        patientRole.id.forEach( id => {
            switch( id.root ) {
                case CodeSystemTypes.PatientInsuranceNr:
                    insuranceNo = id.extension;
                    break;
                case CodeSystemTypes.InsuranceIKNr:
                    insuranceId = id.extension;
                    break;
                case CodeSystemTypes.InsuranceVKNr:
                    insuranceGrpId = id.extension;
                    break;
            }
        } );

        const name = getNameFromXml( getObject( 'patient.name.0', patientRole ) );
        const dob = getDateFrom( getObject( 'patient.birthTime', patientRole ) );
        let hasOfficial = false;
        const patient = {
            ...name,
            dob,
            kbvDob: dob && moment( dob ).format( 'DD.MM.YYYY' ),
            gender: mapGenderFromXml( getObject( 'patient.administrativeGenderCode.code', patientRole ) ),
            addresses: (patientRole.addr || []).map( addr => {
                if( addr.nullFlavor ) {
                    return;
                }
                const postalKind = !hasOfficial ? 'OFFICIAL' : 'POSTAL';
                const result = {
                    kind: addr.postBox ? 'POSTBOX' : postalKind,
                    street: addr.streetName,
                    houseno: addr.houseNumber,
                    zip: addr.postalCode,
                    city: addr.city,
                    postbox: addr.postBox,
                    country: addr.country
                };

                if( result.kind === 'OFFICIAL' ) {
                    hasOfficial = true;
                }

                return result;
            } ).filter( Boolean ),
            communications: (patientRole.telecom || []).map( getCommunicationEntryFromXml ).filter( Boolean ),
            insuranceStatus: (insuranceNo || insuranceId || insuranceGrpId) ? [
                {
                    type: 'PUBLIC',
                    insuranceNo, insuranceId, insuranceGrpId
                }
            ] : []
        };

        [err] = await formatPromiseResult( refineCountryCodes( patient.addresses ) );

        if( err ) {
            Y.log( `parseAndMapDocLetterXml: could not refine addresses with country code: ${err.stack || err}`, 'warn', NAME );
        }

        return {patient};
    }

    async function getPatientFromDocLetterTransfer( args ) {
        Y.log( 'Entering Y.doccirrus.api.edocletter.getPatientFromDocLetterTransfer', 'info', NAME );
        if( args.callback ) {
            args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edocletter.getPatientFromDocLetterTransfer' );
        }

        const {user, transfer, callback} = args;
        const xmlMedia = transfer.attachedMedia.find( media => media.contentType === 'application/xml' );

        if( !xmlMedia ) {
            Y.log( `getPatientFromDocLetterTransfer: could not find xml in received docletter transfer ${transfer._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( '11503', 'attached media not found' ), undefined, callback );
        }

        let [err, files] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'fs.files',
            query: {
                filename: xmlMedia.mediaId
            }
        } ) );

        if( err ) {
            Y.log( `getPatientFromDocLetterTransfer: could not get fs.file ${xmlMedia.mediaId} for received docletter transfer ${transfer._id}: ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        if( !files || !files[0] ) {
            Y.log( `getPatientFromDocLetterTransfer: could not find fs.files ${xmlMedia.mediaId} for received docletter transfer ${transfer._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( '11503', 'fs.files not found' ), undefined, callback );
        }

        let fileResult;
        [err, fileResult] = await formatPromiseResult( getFileBuffer( user, files[0]._id ) );

        if( err ) {
            Y.log( `getPatientFromDocLetterTransfer: could not get file data for file ${files[0]._id} for received docletter transfer ${transfer._id}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !fileResult || !fileResult.data ) {
            Y.log( `getPatientFromDocLetterTransfer: could not find fs.files data for ${files[0]._id}/ ${xmlMedia.mediaId} for received docletter transfer ${transfer._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( '11503', 'file buffer not found' ), undefined, callback );
        }

        let parsedXml;
        [err, parsedXml] = await formatPromiseResult( parseAndMapDocLetterXml( {xmlString: fileResult.data.toString()} ) );

        if( err ) {
            Y.log( `getPatientFromDocLetterTransfer: could not parse and map patient for received docletter transfer ${transfer._id}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return handleResult( null, parsedXml.patient, callback );
    }

    function mapGender( gender ) {
        switch( gender ) {
            case 'MALE':
                return AdministrativeGender.Male;
            case 'FEMALE':
                return AdministrativeGender.Female;
            default:
                return AdministrativeGender.Undifferentiated;
        }
    }

    function getPersonName( person ) {
        return new PersonName( {
            prefix: person.title,
            given: person.firstname,
            family: person.lastname,
            suffix: person.nameaffix
        } );
    }

    function getWebTelecommunicationType( value ) {
        return value.match( /^https/i ) ? TelecommunicationType.https : TelecommunicationType.http;
    }

    function mapCommunications( communications ) {
        // only consider mappable items
        communications = communications.filter( communication => COMMUNICATION_TYPE_DOCLETTER_MAP[communication.type] );
        return !communications.length ?
            [{type: NullFlavorType.Unknown}] :
            communications.map( communication => {
                let type = COMMUNICATION_TYPE_DOCLETTER_MAP[communication.type];
                const value = communication.value;

                if( type === TelecommunicationType.http ) {
                    type = getWebTelecommunicationType( value );
                }

                return {
                    type,
                    value
                };
            } );
    }

    function mapAddresses( addresses = [] ) {
        const officialAddress = addresses.find( address => address.kind === 'OFFICIAL' );
        const postboxAddress = addresses.find( address => address.kind === 'POSTBOX' );
        const postalAddress = addresses.find( address => address.kind === 'POSTAL' );
        const address = officialAddress || postboxAddress || postalAddress || addresses[0] || {};
        const hasAddress = Boolean( officialAddress || postboxAddress || postalAddress || addresses[0] );
        return new Address( {
            nullFlavor: hasAddress ? undefined : NullFlavorType.Unknown,
            streetName: address.street,
            houseNumber: address.houseno,
            postalCode: address.zip,
            postBox: address.postbox,
            city: address.city,
            country: address.country
        } );
    }

    function getProviderOrganization( familyDoctor ) {
        const id = [];

        if( familyDoctor.officialNo ) {
            id.push( new InstanceIdentifier( {
                extension: familyDoctor.officialNo,
                root: CodeSystemTypes.LANR
            } ) );
        }

        (familyDoctor.bsnrs || []).forEach( bsnr => {
            id.push( new InstanceIdentifier( {
                extension: bsnr,
                root: CodeSystemTypes.BSNR
            } ) );
        } );

        return {
            id,
            name: familyDoctor.content,
            addr: mapAddresses( familyDoctor.addresses || [] ),
            telecom: mapCommunications( familyDoctor.communications )
        };
    }

    function getRecordTarget( {patient, caseFolder, familyDoctor, systemOID} ) {
        const insurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, caseFolder.type );
        const providerOrganization = familyDoctor && getProviderOrganization( familyDoctor );

        return new RecordTarget( {
            patientRole: new PatientRole( {
                id: [
                    new InstanceIdentifier( {
                        extension: patient._id.toString(),
                        root: systemOID
                    } ),
                    insurance.insuranceNo && (new InstanceIdentifier( {
                        extension: insurance.insuranceNo,
                        root: CodeSystemTypes.PatientInsuranceNr
                    } )),
                    insurance.insuranceId && (new InstanceIdentifier( {
                        extension: insurance.insuranceId,
                        root: CodeSystemTypes.InsuranceIKNr
                    } )),
                    insurance.insuranceGrpId && (new InstanceIdentifier( {
                        extension: insurance.insuranceGrpId,
                        root: CodeSystemTypes.InsuranceVKNr
                    } ))
                ].filter( Boolean ),
                patient: new Patient( {
                    name: getPersonName( patient ),
                    administrativeGenderCode: new Code( {
                        code: mapGender( patient.gender ),
                        codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                        codeValidation: AdministrativeGender
                    } ),
                    birthTime: new Time( patient.dob )
                } ),
                addr: mapAddresses( patient.addresses ),
                telecom: mapCommunications( patient.communications ),
                providerOrganization
            } )
        } );
    }

    function getTelecommunicationsFromLocation( location ) {
        const results = [];

        if( location.phone ) {
            results.push( new Telecommunication( {
                use: PostalAddressUse.WorkPlace,
                value: location.phone,
                type: TelecommunicationType.tel
            } ) );
        }
        if( location.fax ) {
            results.push( new Telecommunication( {
                use: PostalAddressUse.WorkPlace,
                value: location.fax,
                type: TelecommunicationType.fax
            } ) );
        }
        if( location.email ) {
            results.push( new Telecommunication( {
                use: PostalAddressUse.WorkPlace,
                value: location.email,
                type: TelecommunicationType.mailto
            } ) );
        }
        if( location.website ) {
            results.push( new Telecommunication( {
                use: PostalAddressUse.WorkPlace,
                value: location.website,
                type: getWebTelecommunicationType( location.website )
            } ) );
        }

        return results;
    }

    function getAddressFromLocation( location ) {
        return new Address( {
            streetName: location.street,
            houseNumber: location.houseno,
            postalCode: location.zip,
            city: location.city,
            country: location.country
        } );
    }

    function getAssignedEntity( {employee, location} ) {
        return new AssignedAuthor( {
            id: [
                new InstanceIdentifier( {
                    extension: employee.officialNo,
                    root: CodeSystemTypes.LANR
                } ),
                new InstanceIdentifier( {
                    extension: location.commercialNo,
                    root: CodeSystemTypes.BSNR
                } )
            ],
            assignedPerson: new AssignedPerson( {
                name: getPersonName( employee )
            } ),
            representedOrganization: new Organization( {
                name: new OrganizationName( location.locname ),
                telecom: getTelecommunicationsFromLocation( location ),
                addr: getAddressFromLocation( location )
            } )
        } );
    }

    function getAuthor( {docletter, employee, location} ) {
        return new Author( {
            assignedAuthor: getAssignedEntity( {employee, location} ),
            time: new Time( docletter.timestamp ),
            functionCode: new Code( {
                code: ParticipationType.Admitter,
                codeSystem: CodeSystemTypes.ParticipationType,
                codeValidation: ParticipationType
            } )
        } );
    }

    function getCustodian( {location} ) {
        return new Custodian( {
            assignedCustodian: new AssignedCustodian( {
                representedCustodianOrganization: new CustodianOrganization( {
                    id: new InstanceIdentifier( {
                        extension: location.commercialNo,
                        root: CodeSystemTypes.BSNR
                    } ),
                    name: new OrganizationName( location.locname ),
                    telecom: getTelecommunicationsFromLocation( location ),
                    addr: getAddressFromLocation( location )
                } )
            } )
        } );
    }

    function getLegalAuthenticator( authObj ) {
        if( !authObj ) {
            return;
        }
        const {location, employee, kimSigner} = authObj;
        return new Authenticator( {
            time: new Time( kimSigner.timestamp ),
            signatureCode: new Code( {
                code: ParticipationSignature.Signed,
                codeValidation: ParticipationSignature
            } ),
            assignedEntity: getAssignedEntity( {location, employee} )
        } );
    }

    function getAuthenticator( authObjs ) {
        return authObjs.map( getLegalAuthenticator );
    }

    async function saveXmlFileToDocLetter( {user, docletter, xmlString, setId} ) {
        const {writeFile} = require( 'fs' ).promises;
        const {promisify} = require( 'util' );
        const {extname} = require( 'path' );
        const importMediaFromFileAsync = promisify( Y.doccirrus.media.importMediaFromFile );

        const {join} = require( 'path' );
        const filename = 'Arztbrief.xml';
        let [err, tempDir] = await formatPromiseResult( Y.doccirrus.tempFileManager.get( user, 'kimTempDir' ) );

        if( err ) {
            Y.log( `saveXmlFileToDocLetter: unable to create tmp folder for docletter ${docletter._id} xml: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        [err] = await formatPromiseResult( writeFile( join( tempDir.path, filename ), xmlString ) );

        if( err ) {
            Y.log( `saveXmlFileToDocLetter: write xml of docletter ${docletter._id} to tmp folder: ${err.stack || err}`, 'warn', NAME );
            throw err;
        }

        let media;
        [err, media] = await formatPromiseResult( importMediaFromFileAsync(
            user,
            join( tempDir.path, filename ),
            'activity',
            docletter._id.toString(),
            filename,
            'user',
            'OTHER'
        ) );

        if( err ) {
            Y.log( `saveXmlFileToDocLetter: Unable to import media from filesystem for docletter ${docletter._id}: ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        let newDocumentId;
        [err, newDocumentId] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            action: 'post',
            model: 'document',
            data: Y.doccirrus.filters.cleanDbObject( {
                type: 'DOCLETTER',
                contentType: 'application/xml',
                url: `/media/${media._id.toString()}_original.${media.mime}.${extname( media.name ) || extname( media.origFilename ) || ''}&from=casefile`,
                mediaId: media._id.toString(),
                caption: media.name,
                patientId: docletter.patientId
            } )
        } ) );

        if( err ) {
            Y.log( `saveXmlFileToDocLetter: error posting new document for docletter ${docletter._id}: ${err.stack || err}`, 'error', NAME );
            throw err;
        }

        if( newDocumentId && newDocumentId[0] ) {
            docletter.attachments.push( newDocumentId[0] );
        } else {
            Y.log( `saveXmlFileToDocLetter: document for media ${media._id.toString()} could not be created for docletter ${docletter._id}`, 'warn', NAME );
        }

        let results;
        [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'put',
            query: {_id: docletter._id},
            data: {
                attachments: docletter.attachments,
                xmlSetId: setId,
                skipcheck_: true
            },
            options: {lean: true},
            fields: ['attachments', 'xmlSetId']
        } ) );

        if( err ) {
            Y.log( `saveXmlFileToDocLetter: could not save docletter ${docletter._id} with attached media: ${err && err.stack || err}`, 'error', NAME );
            throw err;
        }

        results = results.toObject();
        docletter.xmlSetId = results.xmlSetId;
        docletter.attachments = results.attachments;
        docletter.attachedMedia = results.attachedMedia;
    }

    /**
     * First, fetches all deps and creates xml according to standard.
     * Finally attaches the file data to the docletter.
     * @param {Object} args
     * @param {Object} args.docletter
     * @param {Function} [args.callback]
     * @return {Promise<{callback}|*>}
     */
    async function generateDocLetterXML( args ) {
        Y.log( 'Entering Y.doccirrus.api.edocletter.generateDocLetterXML', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edocletter.generateDocLetterXML' );
        }
        const {user, docletter, callback} = args;

        let [err, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'casefolder',
            query: {
                _id: docletter.caseFolderId
            }
        } ) );

        if( err ) {
            Y.log( `generateDocLetterXML: could not get casefolder ${docletter.caseFolderId} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !caseFolders[0] ) {
            Y.log( `generateDocLetterXML: could find casefolder ${docletter.caseFolderId} for docletter ${docletter._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, 'case folder not found' ), undefined, callback );
        }

        const caseFolder = caseFolders[0];

        // applies only for GKV
        if( caseFolder.type !== 'PUBLIC' ) {
            return handleResult( null, {}, callback );
        }

        let locations;
        [err, locations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'location',
            query: {
                _id: docletter.locationId
            }
        } ) );

        if( err ) {
            Y.log( `generateDocLetterXML: could not get location ${docletter.locationId} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !locations[0] ) {
            Y.log( `generateDocLetterXML: could find location ${docletter.locationId} for docletter ${docletter._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, 'location not found' ), undefined, callback );
        }

        const location = locations[0];

        let practices;
        [err, practices] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'practice',
            query: {},
            options: {limit: 1, select: ['dcCustomerNo']}
        } ) );

        if( err ) {
            Y.log( `generateDocLetterXML: could not get practices for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !practices[0] ) {
            Y.log( `generateDocLetterXML: could find practices for docletter ${docletter._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, 'practice not found' ), undefined, callback );
        }

        const practice = practices[0];

        let employees;
        [err, employees] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'employee',
            query: {
                _id: docletter.employeeId
            }
        } ) );

        if( err ) {
            Y.log( `generateDocLetterXML: could not get employee ${docletter.employeeId} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !employees[0] ) {
            Y.log( `generateDocLetterXML: could find employee ${docletter.caseFolderId} for docletter ${docletter._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, 'employee not found' ), undefined, callback );
        }

        const employee = employees[0];
        let legalSigner, additionalSigners = [];

        if( docletter.kimSignedBy && docletter.kimSignedBy.length ) {
            for( let kimSigner of docletter.kimSignedBy ) {
                let signerEmployee;
                if( kimSigner.employeeId === employee._id.toString() ) {
                    signerEmployee = employee;
                } else {
                    [err, signerEmployee] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        query: {
                            _id: kimSigner.employeeId
                        },
                        options: {lean: true}
                    } ) );

                    if( err ) {
                        Y.log( `generateDocLetterXML: could not get signerEmployee ${kimSigner.employeeId} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( !signerEmployee[0] ) {
                        Y.log( `generateDocLetterXML: could find signerEmployee ${kimSigner.employeeId} for docletter ${docletter._id}`, 'warn', NAME );
                        return handleResult( Y.doccirrus.errors.rest( 404, 'signerEmployee not found' ), undefined, callback );
                    }
                    signerEmployee = signerEmployee[0];
                }

                if( !legalSigner ) {
                    legalSigner = {location, employee: signerEmployee, kimSigner};
                } else {
                    additionalSigners.push( {location, employee: signerEmployee, kimSigner} );
                }
            }
        }

        let patients;
        [err, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'patient',
            query: {
                _id: docletter.patientId
            }
        } ) );

        if( err ) {
            Y.log( `generateDocLetterXML: could not get patient ${docletter.patientId} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        if( !patients[0] ) {
            Y.log( `generateDocLetterXML: could find patient ${docletter.patientId} for docletter ${docletter._id}`, 'warn', NAME );
            return handleResult( Y.doccirrus.errors.rest( 404, 'case folder not found' ), undefined, callback );
        }
        const patient = patients[0];
        let familyDoctors, familyDoctor;

        if( patient.familyDoctor ) {
            [err, familyDoctors] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'basecontact',
                action: 'get',
                query: {_id: patient.familyDoctor}
            } ) );

            if( err ) {
                Y.log( `generateDocLetterXML: could not get familyDoctor ${patient.familyDoctor} for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !familyDoctors[0] ) {
                Y.log( `generateDocLetterXML: could find familyDoctor ${patient.familyDoctor} for docletter ${docletter._id}`, 'warn', NAME );
            }

            familyDoctor = familyDoctors && familyDoctors[0];
        }

        const systemOID = InstanceIdentifier.getSystemGUID( practice.dcCustomerNo, location.commercialNo );
        const setId = uuid.v4();

        const clinicalDocument = new ClinicalDocument( {
            id: new InstanceIdentifier( {
                extension: docletter._id.toString(),
                root: systemOID
            } ),
            setId: new InstanceIdentifier( {
                extension: setId,
                root: systemOID
            } ),
            versionNumber: '1',
            code: new Code( {
                code: DocumentTypeCode.DischargeSummarizationNoteAmbulantPhysician,
                codeSystem: CodeSystemTypes.DocumentTypeCode,
                codeValidation: DocumentTypeCode
            } ),
            title: docletter.content,
            effectiveTime: new Time( docletter.timestamp ),
            confidentialityCode: new Code( {
                code: ConfidentialityCode.Normal,
                codeSystem: CodeSystemTypes.ConfidentialityCode,
                codeValidation: ConfidentialityCode
            } ),
            languageCode: 'de-DE',
            recordTarget: getRecordTarget( {patient, caseFolder, familyDoctor, systemOID} ),
            author: getAuthor( {docletter, employee, location} ),
            custodian: getCustodian( {location} ),
            informationRecipient: [],
            authenticator: getAuthenticator( additionalSigners ),
            legalAuthenticator: getLegalAuthenticator( legalSigner ),
            participant: [],
            relatedDocument: [],
            authorization: []
        } );

        let xmlString;

        try {
            xmlString = clinicalDocument.toXMLString();
        } catch( err ) {
            Y.log( `generateDocLetterXML: could not create xml string for docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        [err] = await formatPromiseResult( saveXmlFileToDocLetter( {user, docletter, xmlString, setId} ) );
        if( err ) {
            Y.log( `generateDocLetterXML: could not save xml to docletter ${docletter._id}: ${err.stack || err}`, 'warn', NAME );
            return handleResult( err, undefined, callback );
        }

        return docletter;
    }

    /**
     * Updates the activity for sending an "eArztbrief". It gets the activity and updates the state and checks if a
     * treatment flat with exist and manages to add on to the casefolder.
     * @param {string} args.activityId: The activity to update.
     * @returns {Promise<Object|Error>}: Returns updated activity ids or error.
     */
    async function updateActivityStatus( args ) {
        Y.log( 'Entering Y.doccirrus.api.edocletter.updateActivityStatus', 'info', NAME );
        if( args.callback ) {
            args.callback = require( '../server/utils/logWrapping.js' )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edocletter.updateActivityStatus' );
        }

        let
            {user, activityId, callback} = args,
            activity,
            result = {},
            err;

        [err, result.activity] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            action: 'get',
            model: 'activity',
            user: user,
            query: {
                _id: activityId,
                actType: 'DOCLETTER'
            }
        } ) );

        if( err ) {
            Y.log( `#updateActivityStatus(): Unable to get activity ${activityId} from collection : ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, activity, callback );
        }

        [err, result.treatmentCreation] = await formatPromiseResult( createTreatmentForSentDocLetter( {
            user: user,
            docletter: result.activity[0]
        } ) );

        if( err ) {
            Y.log( `#updateActivityStatus(): Unable to create treatment for flat fee : ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, result, callback );
        }

        [err, result.activityUpdate] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            action: 'update',
            model: 'activity',
            user: user,
            query: {
                _id: activityId
            },
            data: {
                $set: {
                    kimState: 'SEND'
                }
            }
        } ) );

        if( err ) {
            Y.log( `#updateActivityStatus(): Unable to update activity ${activityId} kimState in collection: ${err && err.stack || err}`, 'error', NAME );
            return handleResult( err, result, callback );
        }

        return handleResult( err, result, callback );
    }

    /**
     * Removes all flat fee treatments related to one of the docletters specified in `docLetterIds`.
     *
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.docLetterIds
     * @param {Function} [args.callback]
     * @return {Promise<*>}
     */
    async function removeRelatedTreatments( args ) {
        Y.log( 'Entering Y.doccirrus.api.edocletter.removeRelatedTreatments', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.edocletter.removeRelatedTreatments' );
        }
        const {user, docLetterIds, callback} = args;
        let result;
        let [err, docLetters] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            query: {
                _id: {$in: docLetterIds},
                flatFeeTreatmentId: {$exists: true}
            },
            options: {
                select: {flatFeeTreatmentId: 1}
            }
        } ) );

        if( err ) {
            Y.log( `could not get docletters with ids ${docLetterIds}: ${err.stack || err}`, 'error', NAME );
            return handleResult( err, undefined, callback );
        }

        const flatFeeTreatmentIds = docLetters.map( docLetter => docLetter.flatFeeTreatmentId );

        if( flatFeeTreatmentIds.length ) {
            [err, result] = await formatPromiseResult( (new Promise( ( resolve, reject ) => {
                Y.doccirrus.activityapi.doTransitionBatch(
                    user,
                    {},
                    flatFeeTreatmentIds,
                    'delete',
                    () => {
                    },
                    ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    }
                );
            } )) );

            if( err ) {
                Y.log( `could not delete flat fee treatments ${flatFeeTreatmentIds} of docletters with ids ${docLetterIds}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            Y.log( `removeRelatedTreatments: removed docletter flat fees: ${flatFeeTreatmentIds}`, 'debug', NAME );
        }

        return handleResult( null, result, callback );
    }

    /**
     * Class case Schemas -- gathers all the schemas that the case Schema works with.
     */
    /**
     * @class edocletter
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.api' ).edocletter = {
        name: NAME,
        createTreatmentForReceivedDocLetter,
        createTreatmentForSentDocLetter,
        getPatientFromDocLetterTransfer,
        generateDocLetterXML,
        parseAndMapDocLetterXml,
        updateActivityStatus,
        removeRelatedTreatments
    };

}, '0.0.1', {
    requires: [
        'patient-schema',
        'edocletterxml-api',
        'tempdir-manager'
    ]
} );
