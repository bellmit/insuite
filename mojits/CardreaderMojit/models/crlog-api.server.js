/**
 * User: do
 * Date: 28/04/17  09:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


/**
 * @module crlog-schema
 *
 * @description
 * Process:
 * 1. Create a new crlog with attached raw card read data
 * 2. Deleted card data on actual card reader
 * 3. Parse raw data and map to dc patient structure
 * 3.1 Run validation that only need mapped data
 * 3.2 Show feedback to the user
 * 4. Match patient created from card data with patients in database
 * 4.1 If one patient matches go to 5)
 * 4.2 If more then one patient matches show patient selection dialog
 * 4.3 If none found show selection dialog with option to create new patient
 * 5 Process matched patient
 * 5.1 Run validation that need matched patient
 * 5.2 Show feedback to the user
 * 6. If patient is not new, then diff card data patient with matched patient
 * 6.1 If diff is created, then show diff to the user for confirmation
 * 7. Merge and update matched patient
 *
 * Questions
 * - Is it possible to restart process after user cancelled the read?
 *   Card data is already deleted after read.
 *   => Show history of card reads and allow to restart of cancelled attempts.
 */

YUI.add( 'crlog-api', function( Y, NAME ) {

        const
            _ = require( 'lodash' ),
            dateFormat = 'DD.MM.YYYY',
            $regexLikeUmlaut = Y.doccirrus.commonutils.$regexLikeUmlaut,
            getObject = Y.doccirrus.commonutils.getObject,
            DCError = Y.doccirrus.commonerrors.DCError,
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            migrate = require( 'dc-core' ).migrate,
            moment = require( 'moment' ),
            Promise = require( 'bluebird' ),
            assignPatientNo = Promise.promisify( Y.doccirrus.schemaprocess.patient.assignPatientNo ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            patientSchema = Y.doccirrus.schemas.patient.schema,
            rearrangeArrayByType = Y.doccirrus.compareutils.rearrangeArrayByType,
            TIMESTAMP_FORMAT = Y.doccirrus.i18n( 'general.TIMESTAMP_FORMAT' ),
            /**
             * Fields that will be merged on patient match.
             * Lookout for new mapped values that must be mapped with merged patient.
             * See matchedPatientSelect and patientComparator:
             */
            matchedPatientSelect = {
                "dob_MM": 1,
                "dob_DD": 1,
                "dob": 1,
                "insuranceStatus": 1,
                "addresses": 1,
                "title": 1,
                "fk3120": 1,
                "nameaffix": 1,
                "kbvDob": 1,
                "talk": 1,
                "gender": 1,
                "lastname": 1,
                "firstname": 1,
                "patientNo": 1,
                "activeCaseFolderId": 1
            },
            patientComparator = Y.doccirrus.compareutils.getComparator( {
                schema: patientSchema,
                whiteList: [
                    'title',
                    'firstname',
                    'nameaffix',
                    'fk3120',
                    'lastname',
                    'kbvDob',
                    'gender',
                    'insuranceStatus.0.type',
                    'insuranceStatus.0.insuranceNo',
                    'insuranceStatus.0.insuranceId',
                    'insuranceStatus.0.insuranceName',
                    'insuranceStatus.0.insurancePrintName',
                    'insuranceStatus.0.insuranceGrpId',
                    'insuranceStatus.0.costCarrierBillingSection',
                    'insuranceStatus.0.fk4133',
                    'insuranceStatus.0.fk4110',
                    'insuranceStatus.0.insuranceKind',
                    'insuranceStatus.0.persGroup',
                    'insuranceStatus.0.dmp',
                    'insuranceStatus.0.locationFeatures',
                    'addresses.0.street',
                    'addresses.0.houseno',
                    'addresses.0.zip',
                    'addresses.0.city',
                    'addresses.0.postbox',
                    'addresses.0.kind',
                    'addresses.0.country',
                    'addresses.0.countryCode',
                    'addresses.0.addon'
                ]
            } ),
            pushFeedback = ( crlog, code, level, options ) => {
                crlog.feedback.push( {
                    code: code,
                    message: (new DCError( code, options )).message,
                    level: level
                } );
            };

        function objectIdWithTimestamp( timestamp ) {
            let
                // Convert date object to hex seconds since Unix epoch
                hexSeconds = Math.floor( timestamp / 1000 ).toString( 16 ),
                // Create an ObjectId with that hex timestamp
                constructedObjectId = ObjectId( hexSeconds + "0000000000000000" );
            return constructedObjectId;
        }

        function invalidateCRLogs() {

            const
                twoYearsAgo = moment().subtract( 2, 'years' ).toDate(),
                oId = objectIdWithTimestamp( twoYearsAgo );

            function allTenantsInvalidated( err, results ) {
                if( err ) {
                    Y.log( 'invalidateCRLogs: an error occurred while invalidating crlogs on all tenants ' + err, 'error', NAME );
                } else {
                    Y.log( 'invalidateCRLogs: checked ' + (results && results.length) + 'tenants', 'info', NAME );
                }
            }

            function invalidateTenant( user, callback ) {

                Y.log( `invalidateCRLog: cleaning crlog on tenant ${user.tenantId}`, 'debug', NAME );

                runDb( {
                    user,
                    model: 'crlog',
                    action: 'delete',
                    query: {
                        _id: {
                            $lt: oId
                        }
                    },
                    options: {
                        override: true
                    }
                } ).then( result => callback( null, result ) ).catch( err => callback( err ) );

            }

            Y.log( `invalidateCRLog: cleaning crlog - delete all data before ${twoYearsAgo}`, 'debug', NAME );
            migrate.eachTenantParallelLimit( invalidateTenant, 1, allTenantsInvalidated );
        }

        function put( args ) {
            Y.log('Entering Y.doccirrus.api.crlog.put', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crlog.put');
            }
            args.callback( new Y.doccirrus.commonerrors.DCError( 500 ) );
        }

        function searchCR( args ) {
            Y.log('Entering Y.doccirrus.api.crlog.searchCR', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crlog.searchCR');
            }
            const
                moment = require( 'moment' ),
                user = args.user,
                callback = args.callback,
                params = args.originalParams;

            Promise.resolve().then( () => {
                if( !params.patientId || !params.timestamp ) {
                    throw new Y.doccirrus.commonerrors.DCError( 500 );
                }

                let timestampMoment = moment( params.timestamp ),
                    query = {
                        matchedPatientId: params.matchedPatientId,
                        cardSwipe: {
                            $gte: timestampMoment.clone().startOf( 'quarter' ).toDate(),
                            $lte: timestampMoment.clone().endOf( 'quarter' ).toDate()
                        }
                    };

                return runDb( {
                    user,
                    model: 'crlog',
                    query,
                    options: {
                        lean: true
                    }
                } );
            } ).then( results => {
                callback( null, results );
            } ).catch( err => {
                callback( err );
            } );
        }

        function getHistory( args ) {
            Y.log('Entering Y.doccirrus.api.crlog.getHistory', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crlog.getHistory');
            }
            const {user, query, options, callback} = args;
            let item;
            //cardSwipe || initiatedAt were replaced by _id because sorting
            if(query._id && ( query._id.$gte || query._id.$gte )) {
                item = query._id;
                delete query._id;
                query.$or = [{cardSwipe: item}, {initiatedAt: item}];
            }
            runDb( {
                user,
                model: 'crlog',
                query,
                options
            } )
                .then(results => callback( null, results ))
                .catch( err => callback( err ) );
        }

        function storeCardRead( args ) {
            const {user, rawCardData, deviceName = null} = args;
            if( !rawCardData ) {
                return Promise.reject( Error( 'no data passed' ) );
            }
            return runDb( {
                user,
                model: 'crlog',
                action: 'post',
                data: {
                    status: 'READ',
                    eventStatus: 'NONE',
                    validationStatus: 'NONE',
                    initiatorId: user.identityId,
                    initiator: user.id,
                    initiatedAt: new Date(),
                    rawData: rawCardData,
                    deviceName,
                    skipcheck_: true
                }
            } ).catch( err => {
                const crlogRejection = new Y.doccirrus.commonerrors.DCError( 110000 );
                crlogRejection.originalError = err;
                throw crlogRejection;
            } );
        }

        /**
         *
         * @param {Object}          args
         * @returns {Promise.<*>}
         */
        async function storeCardReadJSON( args ) {
            const { user,
                    rawCardData,
                    deviceName = null } = args;
            Y.log( '', 'debug', NAME );

            if ( !rawCardData ) {
                Y.log( '', 'error', NAME );
                return await formatPromiseResult( Promise.reject( Error( 'no data passed' ) ) );
            }

            const data = {
                status: 'PARSED',
                eventStatus: 'NONE',
                validationStatus: 'NONE',
                initiatorId: user.identityId,
                initiator: user.id,
                initiatedAt: new Date(),
                rawData: rawCardData,
                deviceName,
                skipcheck_: true,
                parsedPatient: rawCardData
            };

            return runDb( {
                user,
                model: 'crlog',
                action: 'post',
                data
            } );
        }

        function updateCrLog( user, id, data ) {
            return runDb( {
                user,
                model: 'crlog',
                action: 'put',
                query: {
                    _id: id
                },
                data: Object.assign( {skipcheck_: true}, data ),
                fields: Object.keys( data )
            } );

        }

        async function parseRawCardData( user, rawCardData ) { //jshint ignore:line
            if( !rawCardData ) {
                throw Error( 'no raw data passed' );
            }

            return Promise.resolve().then( () => {
                if( 'KVK' === rawCardData.cardVersion ) {
                    return Y.doccirrus.cardreader.parsers.kvk.parse( user, rawCardData );
                } else {
                    return Y.doccirrus.cardreader.parsers.egk.parse( user, rawCardData );
                }
            } ).then( result => {
                return refineParsedData( user, result.patient ).then( () => {
                    return result;
                } );
            } );
        }

        function validateParsedPatient( crlog, incaseConfig ) {

            const
                stopProcessImmediatelyCodes = ['3000', '3005', '3023'],
                onlyAllowCopyOfInsuranceCodes = ['3015', '3019', '3020', '3004'],
                onlyAllowReplacementCodes = ['3006', '3008', '3009', '3010'],
                isTest = 'gematik Musterkasse1GKV' === getObject( 'parsedPatient.insuranceStatus.0.insuranceName', crlog ),
                isPrivate = 'PRIVATE' === getObject( 'parsedPatient.insuranceStatus.0.type', crlog ),
                cardSwipe = getObject( 'parsedPatient.insuranceStatus.0.cardSwipe', crlog ),
                persGroup = getObject( 'parsedPatient.insuranceStatus.0.persGroup', crlog );

            // return early if private card was read
            if( isPrivate ) {
                // (DC)   3012 PKV card: System Messaage "Eine Privatversichertenkarte liegt vor."
                pushFeedback( crlog, '3012', 'WARNING' );
                return {cancelled: false, validationStatus: 'OK'};
            }
            // remove errors from verifyKT because there is no test kt in catalog data
            if( isTest ) {
                crlog.feedback = crlog.feedback.filter( feed => !onlyAllowReplacementCodes.concat( ['3004'] ).includes( feed.code ) );
            }

            // 0. check for persGroup=9 asylum law: "Hinweis anzeigen wenn der Patient Empfänger von Gesundheitsleistungen nach den §§ 4 und 6 AsylbLG ist." if configuration is set
            if( incaseConfig && incaseConfig.showPersGroup9Info && '9' === persGroup ) {
                pushFeedback( crlog, '3025', 'WARNING' );
            }

            // 1. Check for errors that must cancel process immediately

            // 1.0 (DC)   3011 cr error: "Kartenleser Server nicht verfügbar." TODO: remove from error table?

            // 1.1 (DC)   3023 CardSwipe in future
            if( moment( cardSwipe ).isAfter( moment( crlog.initiatedAt ).endOf( 'day' ) ) ) {
                pushFeedback( crlog, '3023', 'ERROR' );
            }

            // 1.2 (KBV) 3000 [KP2-107] invalid cardTypeGenerations
            // - Requirement was removed in Q2 2019.

            // 1.3 (KBV) 3005 [2.2.2.1: P2-230]: closed insurance
            // => Already tested by catalog-api->verifyKT

            // as said return if process must be stopped
            if( crlog.feedback.some( feed => stopProcessImmediatelyCodes.includes( feed.code ) ) ) {
                return {cancelled: true, validationStatus: 'INVALID_CARD'};
            }

            // 2. Check for errors where the data can only be copied

            // 2.1 (KBV) 3015 [P2-100, P2-101] KVK card read: "Die Krankenversichertenkarte ist seit dem 01.01.2015 ungültig und darf zur Abrechnung nicht verwendet werden."
            const
                cardType = getObject( 'parsedPatient.insuranceStatus.0.cardType', crlog ),
                insuranceGrpId = getObject( 'parsedPatient.insuranceStatus.0.insuranceGrpId', crlog );
            if( 'KVK' === cardType && (!insuranceGrpId || +insuranceGrpId.substring( 2, 5 ) < 800) ) {
                pushFeedback( crlog, '3015', 'ERROR' );
            }

            // 2.2 (KBV) 3019 [P2-166] Card not valid yet: "Die Karte war nur bis $insurance.ends gültig und darf zur Abrechnung nicht verwendet werden."
            const
                fk4133 = getObject( 'parsedPatient.insuranceStatus.0.fk4133', crlog );
            if( fk4133 && moment( fk4133 ).isAfter( cardSwipe ) ) {
                const startDateString = moment( fk4133 ).format( dateFormat );
                pushFeedback( crlog, '3020', 'ERROR', {data: {"$insurance.starts": startDateString}} );
            }

            // 2.3 (KBV) 3020 [P2-166] Card no more valid: "Die Karte ist erst ab dem $insurance.starts gültig und darf zur Abrechnung noch nicht verwendet werden."
            const
                fk4110 = getObject( 'parsedPatient.insuranceStatus.0.fk4110', crlog );
            if( fk4110 && moment( fk4110 ).isBefore( cardSwipe ) ) {
                const endDateString = moment( fk4110 ).format( dateFormat );
                pushFeedback( crlog, '3019', 'ERROR', {data: {"$insurance.ends": endDateString}} );
            }

            // 2.4 (KBV) 3004 [2.2.2.1: P2-270] "Die IKNR/VKNR/KTAB Kombination dieser Karte ist nicht bekannt. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung."
            // => Already tested by catalog-api->verifyKT

            if( crlog.feedback.some( feed => onlyAllowCopyOfInsuranceCodes.includes( feed.code ) ) ) {
                return {cancelled: true, validationStatus: 'ONLY_ALLOW_COPYING_DATA'};
            }

            // 3. Check for errors where data can be use for "Ersatzverfahren" but cardSwipe of insurance must be deleted
            // => can only be done after patient merge
            // TODO: ... will be ingored if ERRROS of 1, 2 or 4 already exist

            // 4. Check for errors where data can be use for "Ersatzverfahren" but insurance must be deleted
            // 4.1 (KBV) 3006 [2.2.2.1: P2-210] "Der Kostenträger dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung."
            // 4.2 (KBV) 3008 [2.2.2.1: P2-260] "Die IKNR dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung."
            // 4.3 (KBV) 3009 [2.2.2.1: P2-285] "Der KT-Abrechnungsbereich dieser Karte ist nicht mehr gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung."
            // 4.4 (KBV) 3010 [2.2.2.1: P2-285] "Der KT-Abrechnungsbereich dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung."
            // => Already tested by catalog-api->verifyKT
            if( crlog.feedback.some( feed => onlyAllowReplacementCodes.includes( feed.code ) ) ) {
                return {cancelled: false, validationStatus: 'ONLY_ALLOW_REPLACEMENT_WITHOUT_INSURANCE'};
            }

            // 5. warnings

            // 5.1 (DC)   3024 cardSwipe more then two quarters in the past: Die Kartendaten sind älter als 2 Quartale. $cardSwipe
            if( moment( cardSwipe ).isBefore( moment( crlog.initiatedAt ).subtract( 2, 'quarters' ) ) ) {
                pushFeedback( crlog, '3024', 'WARNING', {
                    data: {$cardSwipe: moment( cardSwipe ).format( dateFormat )}
                } );
            }

            // 5.2 (DC)   3012 PKV card: System Messaage "Eine Privatversichertenkarte liegt vor."
            // => see isPrivate check above

            // 5.3 (KBV) 3007 [2.2.2.1: P2-260] "Die IKNR dieser Karte ist nicht mehr gültig. Ein Weiterarbeiten mit ungültiger IKNR ist möglich."
            // => Already tested by catalog-api->verifyKT
            return {cancelled: false, validationStatus: 'OK'};
        }

        function compareBeforeMerge( crlog ) {
            const
                onlyAllowReplacementCodes = ['3001', '3018'],
                {parsedPatient, matchedPatient} = crlog,
                parsedPatientInsurance = parsedPatient && parsedPatient.insuranceStatus[0],
                insuranceType = parsedPatient.type,
                matchedPatientInsurance = (matchedPatient && matchedPatient.insuranceStatus || []).find( insurance => insurance.type === insuranceType );

            // (KBV) 3001 [KP2-106] KVK card is read after eGK was read last time "Bitte Hinweis an Patient, dass KVK veraltet ist."
            if( matchedPatientInsurance && matchedPatientInsurance.cardSwipe &&
                parsedPatientInsurance.insuranceGrpId === matchedPatientInsurance.insuranceGrpId &&
                parsedPatientInsurance.cardType === 'KVK' && matchedPatientInsurance.cardType === 'EGK' ) {
                pushFeedback( crlog, '3001', 'ERROR' );
            }

            // (KBV) 3018 [KP2-106] Card has older cardTypeGeneration then last read card: "Bitte Hinweis an Patient, dass eGK veraltet. Eine neuere Karte wurde bereits im aktuellen Quartal gelesen!"
            if( Y.doccirrus.kbvcommonutils.readNewerCardTypeGenerationBefore( matchedPatientInsurance, parsedPatientInsurance ) ) {
                pushFeedback( crlog, '3018', 'ERROR' );
            }

            if( crlog.feedback.some( feed => onlyAllowReplacementCodes.includes( feed.code ) ) ) {
                return {cancelled: false, validationStatus: 'ONLY_ALLOW_REPLACEMENT_WITHOUT_CARDSWIPE'}; // TODO: distingish between cardSwipe and insurance deletion and add this to merge/ diff
            }

        }

        /**
         * Set attributes that relate to data already set by the parser.
         *
         * @param   {Object}            user
         * @param   {Object}            parsedData
         * @return  {Promise}
         */
        function refineParsedData( user, parsedData ) {
            return Promise.props( {
                countries: Promise.resolve().then( () => {

                    const countryCodes = parsedData.addresses.map( address => address.countryCode ).filter( Boolean );

                    if( !countryCodes.length ) {
                        return null;
                    }

                    const
                        catalog = Y.doccirrus.api.catalog.getCatalogDescriptor(
                            {
                                actType: '_CUSTOM',
                                short: 'SDCOUNTRIES',
                                country: 'D'
                            }, true );

                    if( !catalog ) {
                        throw Error( 'catalog descriptor not found' );
                    }

                    return runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'catalog',
                        query: {
                            sign: {$in: countryCodes},
                            catalog: catalog.filename
                        }
                    } );

                } )
            } ).then( result => {
                parsedData.addresses.forEach( address => {
                    const
                        countryCode = address.countryCode;

                    result.countries.some( countryObj => {
                        if( countryObj.sign === countryCode ) {
                            address.country = countryObj.country;
                            return true;
                        }
                    } );
                } );

                if( parsedData.kbvDob ) {
                    let dobString = parsedData.kbvDob,
                        dd = dobString.slice( 0, 2 ),
                        mm = dobString.slice( 3, 5 );

                    parsedData.dob_DD = dd;
                    parsedData.dob_MM = mm;
                }

                // MOJ-11245: for new patients country mode must be set. Because swiss card parsing has different process
                // we can just set Germany.
                parsedData.countryMode = ['D'];

                // only for testing purposes
                if( 'gematik Musterkasse1GKV' === getObject( 'insuranceStatus.0.insuranceName', parsedData ) ) {
                    const insurance = parsedData.insuranceStatus[0];
                    insurance.feeSchedule = '1';
                    insurance.insuranceGrpId = '12345';
                }

            } );
        }

        function getPatients( user, query ) {
            return runDb( {
                user,
                model: 'patient',
                query,
                options: {
                    select: matchedPatientSelect
                }
            } );
        }

        async function matchPatient( user, parsedPatient ) { //jshint ignore:line
            let err, result;
            const
                insuranceId = getObject( 'insuranceStatus.0.insuranceId', parsedPatient ),
                insuranceNo = getObject( 'insuranceStatus.0.insuranceNo', parsedPatient ),
                firstname = getObject( 'firstname', parsedPatient ),
                lastname = getObject( 'lastname', parsedPatient ),
                kbvDob = getObject( 'kbvDob', parsedPatient ),
                getByNameAndDob = () => {
                    return getPatients( user, {
                        lastname: $regexLikeUmlaut( lastname ),
                        firstname: $regexLikeUmlaut( firstname ),
                        kbvDob: kbvDob
                    } );
                },
                getByInsurance = () => {
                    return getPatients( user, {
                        'insuranceStatus.insuranceId': insuranceId,
                        'insuranceStatus.insuranceNo': insuranceNo
                    } );
                };

            if( insuranceId && insuranceNo ) {
                [err, result] = await formatPromiseResult( getByInsurance() ); //jshint ignore:line
                if( result && result.length ) {
                    return result;
                }
                if( err ) {
                    Y.log( `could not match patient on card read by insurance ${err}`, 'warn', NAME );
                }
            }

            if( firstname && lastname && kbvDob ) {
                [err, result] = await formatPromiseResult( getByNameAndDob() ); //jshint ignore:line

                if( result.length ) {
                    return result;
                }

                if( err ) {
                    Y.log( `could not match patient on card read by name and dob ${err}`, 'warn', NAME );
                }
            }
            return [];
        }

        function mergeInsurances( insurances, insurancesFromCard, validationStatus ) {
            insurancesFromCard.forEach(insuranceFromCard => {
                let found,
                    foundIndex,
                    type = insuranceFromCard.type;

                // delete cardSwipe in "Ersatzverfahren"
                if( 'ONLY_ALLOW_REPLACEMENT_WITHOUT_CARDSWIPE' === validationStatus ) {
                    insuranceFromCard.cardSwipe = null;
                } else if( 'ONLY_ALLOW_REPLACEMENT_WITHOUT_INSURANCE' === validationStatus ) {
                    // TODO: delete cardSwipe of original insurance if there is one?
                    // TODO: otherwise aw update address of existing cardSwipe? or refuse card swipe if there is already one and data is not valid?
                    insuranceFromCard = {};
                }

                insurances = JSON.parse( JSON.stringify( insurances ) );

                insurances.some( function( insurance, index ) {
                    if( insurance.type === type ) {
                        found = insurance;
                        foundIndex = index;
                        return true;
                    }
                } );

                if( !found ) {
                    // check for type in case insurance was reseted
                    if( insuranceFromCard.type ) {
                        insurances.push( insuranceFromCard );
                    }
                } else {
                    insuranceFromCard.unknownInsurance = false;
                    insurances[foundIndex] = _.merge( found, insuranceFromCard );
                }
            });

            return insurances;
        }

        function mergeAddresses( addresses, addressesFromCard ) {

            const
                officialAddresses = ['OFFICIAL', 'POSTBOX'];

            addresses = JSON.parse( JSON.stringify( addresses ) ).filter( addr => !officialAddresses.includes( addr.kind ) );
            addressesFromCard = JSON.parse( JSON.stringify( addressesFromCard ) );

            [].push.apply( addressesFromCard, addresses );

            return addressesFromCard;
        }

        /**
         * Set locationId of insurance on new patients.
         * For PUBLIC insurances the first location with commercialNo (BSNR) or the first location is taken.
         * For other insurance types the first location is always considered.
         *
         * @param   {Object}          user
         * @param   {Object}          patient
         * @param   {String}          readInsuranceType
         */
        function setMissingLocationId( user, patient, readInsuranceType ) {
            const firstLocationWithCommercialNo = user.locations.find( location => location.commercialNo );
            const firstLocationWithCommercialNoId = firstLocationWithCommercialNo && firstLocationWithCommercialNo._id;
            const firstLocationId = user.locations[0] && user.locations[0]._id;
            (patient.insuranceStatus || []).some( insuranceStatus => {
                if( insuranceStatus.type === readInsuranceType && !insuranceStatus.locationId ) {
                    if( 'PUBLIC' === insuranceStatus.type ) {
                        insuranceStatus.locationId = firstLocationWithCommercialNoId || firstLocationId;
                    } else {
                        insuranceStatus.locationId = firstLocationId;
                    }
                    return true;
                }
            } );
        }

        async function mergePatient( user, patient, patientFromCard, validationStatus, actionConfig ) {
            const
                omitPaths = ['addresses', 'insuranceStatus'],
                // do not override countryMode of existing patient
                omitPathsFromCard = patient.countryMode ? [...omitPaths, 'countryMode'] : omitPaths,
                readInsurance = getObject( 'insuranceStatus.0', patientFromCard ),
                hasPublicCardRead = patient && patient.insuranceStatus && patient.insuranceStatus.some( insurance => 'PUBLIC' === insurance.type && insurance.cardSwipe );

            let [ err, result ] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.incaseconfiguration.readConfig({
                        user: user,
                        callback: function( err, res ) {
                            if( err ) {
                                reject( err );
                            }
                            resolve( res );
                        }
                    });
                } )
            );
            if( err ) {
                Y.log(`cannot get in case configuration: ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            let patientDataAddressMandatory = result.patientDataAddressMandatory,
                patientDataPhoneNumberMandatory = result.patientDataPhoneNumberMandatory,
                patientDataEmailMandatory = result.patientDataEmailMandatory;

            // MOJ-10283: do not override data read from public insurance with cardSwipe
            if( readInsurance && readInsurance.type.includes('PRIVATE') && hasPublicCardRead ) {
                patientFromCard = {insuranceStatus: patientFromCard.insuranceStatus};
            }

            const mergedPatient = _.merge( _.omit( patient, omitPaths ), _.omit( patientFromCard, omitPathsFromCard ) );

            mergedPatient.addresses = mergeAddresses( patient.addresses || [], patientFromCard.addresses );
            // if address required and patient has not addresses add empty address box
            if( patientDataAddressMandatory && !mergedPatient.addresses.length ) {
                mergedPatient.addresses.push({});
            }
            mergedPatient.insuranceStatus = mergeInsurances( patient.insuranceStatus || [], patientFromCard.insuranceStatus, validationStatus );

            // MOJ-8715: add and copy additional insurances
            if( actionConfig && 'add_additional_insurances' === actionConfig.appliedAction && actionConfig.addInsuranceTypes.length ) {

                actionConfig.addInsuranceTypes.forEach( function( type ) {
                    if( !mergedPatient.insuranceStatus.some( insurance => insurance.type === type ) ) {
                        mergedPatient.insuranceStatus.push( {
                            type: type,
                            feeSchedule: 'PRIVATE' === type ? '3' : null
                        } );
                    }
                } );

                actionConfig.copyInsuranceTypes.forEach( function( type ) {
                    for( let i = 0; i < mergedPatient.insuranceStatus.length; i++ ) {
                        if( mergedPatient.insuranceStatus[i].type === type ) {
                            mergedPatient.insuranceStatus[i] = Object.assign( JSON.parse( JSON.stringify( readInsurance ) ), {
                                type: type,
                                feeSchedule: 'PRIVATE' === type ? '3' : null,
                                cardSwipe: null
                            } );
                        }
                    }
                } );
            }

            /*
                New patient was created by card read, we need to set some fields that are otherwise set in UI or pre-process,
                because not in UI and no patient are created invalid because of empty communications block.
            */
            if( 0 === Object.keys( patient ).length ) {
                // if communication required set according to inCaseConfiguration else leave empty
                mergedPatient.communications = [];
                if( patientDataPhoneNumberMandatory ) {
                    mergedPatient.communications.push({});
                }
                if( patientDataEmailMandatory ) {
                    mergedPatient.communications.push({});
                    mergedPatient.communications[mergedPatient.communications.length - 1].type = "EMAILPRIV";
                }
                let [err, result] = await formatPromiseResult( getInVoiceConfig( user ) );
                if( err ) {
                    Y.log( `could not get invoice config to check invoiceConfig.pvsNeedsApprovalCheck. ${err.stack || err}: Skip...`, 'warn', NAME );
                } else if( result && false === result.pvsNeedsApproval ) {
                    mergedPatient.dataTransmissionToPVSApproved = true;
                }
                mergedPatient.patientSince = new Date();
            }

            if( readInsurance && readInsurance.type ) {
                setMissingLocationId( user, mergedPatient, readInsurance.type );
            }

            return mergedPatient;
        }

        function getDiff( matchedPatient, mergedPatient ) {
            let clonedMatchedPatient = JSON.parse( JSON.stringify( matchedPatient ) ),
                clonedMergedPatient = JSON.parse( JSON.stringify( mergedPatient ) );
            rearrangeArrayByType( clonedMatchedPatient, clonedMergedPatient, 'insuranceStatus', 'type' );
            rearrangeArrayByType( clonedMatchedPatient, clonedMergedPatient, 'addresses', 'kind', ['OFFICIAL', 'POSTBOX'] );

            const
                compareResult = patientComparator.compare( clonedMergedPatient, clonedMatchedPatient, {} );

            return compareResult;
        }

        function isNewestVersion( user, patientId, cardSwipe ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.patient.isNewestVersion( {
                    migrate: true,
                    user: user,
                    originalParams: {
                        patientId,
                        timestamp: cardSwipe
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                            return;
                        }
                        resolve( result );
                    }
                } );
            } );
        }

        /**
         * MOJ-9127: PKV family injured members have same insuranceId and insuranceNo, which leads to wrong patient assignment.
         * So check if firstname or dob is different.
         * @param   {Object}            cardData
         * @param   {Object}            dbData
         * @return {Boolean}
         */
        function pkvFamilyInjured( cardData, dbData ) {
            var cardDataInsurance = cardData.insuranceStatus[0],
                type = cardDataInsurance && cardDataInsurance.type,
                dbDataInsurance;

            if( !type || 'PRIVATE' !== type || !dbData.insuranceStatus || !dbData.insuranceStatus.length ) {
                return false;
            }

            dbData.insuranceStatus.some( function( insurance ) {
                if( insurance.type === type ) {
                    dbDataInsurance = insurance;
                    return true;
                }
            } );

            if( !dbDataInsurance ) {
                return false;
            }

            if( !dbDataInsurance || ((cardDataInsurance.insuranceId !== dbDataInsurance.insuranceId && cardDataInsurance.insuranceNo !== dbDataInsurance.insuranceNo) ||
                (cardData.firstname === dbData.firstname || cardData.kbvDob === dbData.kbvDob)) ) {
                return false;
            }

            return true;
        }

        function getInCaseConfig( user ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.incaseconfiguration.readConfig( {
                    user: user,
                    callback: ( err, config ) => {
                        if( err ) {
                            Y.log( 'could not get incaseconfiguration ' + err, 'error', NAME );
                            reject( err );
                            return;
                        }

                        resolve( config );
                    }
                } );
            } );
        }

        function getInVoiceConfig( user ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.invoiceconfiguration.getUnpopulated( user, ( err, config ) => {
                    if( err ) {
                        Y.log( 'could not get invoiceconfiguration ' + err, 'error', NAME );
                        reject( err );
                        return;
                    }

                    resolve( config && config[0] );
                } );
            } );
        }

        function checkForEvents( user ) {
            return getInCaseConfig( user );
        }

        function checkSchedule( user, patientId, updateArrivalStatus ) {
            return new Promise( ( resolve ) => {
                Y.doccirrus.api.calevent.checkSchedule( {
                    user,
                    originalParams: {
                        patientId,
                        updateArrivalStatus: updateArrivalStatus
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            Y.log( `error while checking schedules on card read ${err}`, 'error', NAME );
                        }
                        resolve( result );
                    }
                } );
            } );
        }

        function getEventStatus( user, patientId ) {
            return checkForEvents( user ).then( config => {
                if( !( config && config.autoEventsOnCardRead || config.autoEventsOnCardReadNoAppointment ) ) {
                    return 'NONE';
                }

                return checkSchedule( user, patientId, config.autoEventsOnCardRead ).then( result => {
                    if( result ) {
                        if( result.eventFound ) {
                            if( config.autoEventsOnCardRead ) {
                                return 'UPDATED_EVENT_ARRIVED';
                            }
                            return 'NONE';
                        }
                        if( config.autoEventsOnCardReadNoAppointment ) {
                            return 'NEEDS_EVENT';
                        }
                        return 'NONE';
                    }
                    return 'NONE';
                } );
            } ).catch( err => {
                Y.log( `could not get event status but fail silently: ${err}`, 'debug', NAME );
                return 'NONE';
            } );

        }

        function applyCardRead( user, crlog ) {
            const
                upsertPatient = ( mergedPatient ) => {
                    let isNew = false;
                    if( !mergedPatient._id ) {
                        isNew = true;
                        mergedPatient._id = new ObjectId();
                    }
                    return (isNew ?
                        assignPatientNo( user, mergedPatient ) :
                        Promise.resolve()).then( () => {
                        return runDb( {
                            user,
                            model: 'patient',
                            action: 'update',
                            query: {_id: mergedPatient._id},
                            data: Object.assign( {}, {skipcheck_: true}, mergedPatient ),
                            options: {
                                upsert: true
                            }
                        } );
                    } ).then( () => {
                        return mergedPatient;
                    } );
                },
                putPatient = ( mergedPatient ) => {
                    return runDb( {
                        user,
                        model: 'patient',
                        action: 'put',
                        query: {_id: mergedPatient._id},
                        data: Object.assign( {}, {skipcheck_: true, ignoreReadOnly_: true}, mergedPatient ), // ignoreReadOnly_ flag must be set to override cardSwipe
                        fields: Object.keys( mergedPatient )
                    } );
                },
                createPatient = ( mergedPatient ) => {
                    return runDb( {
                        user,
                        model: 'patient',
                        action: 'post',
                        data: Object.assign( {}, {skipcheck_: true}, mergedPatient ),
                        options: {
                            entireRec: true,
                            lean: true
                        }
                    } ).get( 0 );
                };
            return Promise.resolve().then( () => {
                if( 'MERGED' !== crlog.status ) {
                    let msg = 'Crlog must be in status "MERGED" to be applied to patient!';
                    Y.log( msg, 'error', NAME );
                    throw DCError( 500, {message: msg} );
                }

                const
                    mergedPatient = crlog.mergedPatient,
                    mergedPatientId = crlog.mergedPatient._id;

                let promise;

                if( mergedPatientId ) {
                    promise = putPatient( mergedPatient );
                } else {
                    promise = createPatient( mergedPatient );
                }
                return promise.catch( err => {
                    if( err && err.name && 'ValidationError' === err.name ) {
                        Y.log( `handle validation errors on saving patient from card read: ${JSON.stringify( err )}`, 'debug', NAME );
                        const
                            errObjs = err && err.errors || {},
                            commonErrors = [],
                            kvkErrors = [];

                        let errors = Object.keys( errObjs ).map( path => {
                            const errObj = errObjs[path];
                            errObj._path = path;
                            return errObj;
                        } );

                        if( crlog.matchedPatients[0] && 0 === Object.keys( crlog.matchedPatients[0] ).length ) {
                            // empty communication object is created for new patient while merging
                            // remove related errors from common error and add specific error
                            const allErrorsLength = errors.length;
                            errors = errors.filter( errObj => !errObj._path.includes( 'communications.0' ) );
                            if( errors.length !== allErrorsLength ) {
                                pushFeedback( crlog, '111004', 'WARNING' );
                            }
                        }

                        errors.forEach( error => {
                            if( error.properties && ['talk', 'gender'].includes( error.properties.path ) ) {
                                kvkErrors.push( error );
                            } else {
                                commonErrors.push( error );
                            }
                        } );

                        if( kvkErrors.length ) {
                            pushFeedback( crlog, '111003', 'WARNING' );
                        }

                        if( commonErrors.length ) {
                            const
                                commonErrorStr = commonErrors.map( function( error ) {
                                    return error.message || '';
                                } ).filter( Boolean ).join( ' ' );

                            pushFeedback( crlog, '111001', 'WARNING', {data: {"$errors": commonErrorStr}} );
                        }

                        return upsertPatient( mergedPatient );
                    } else if( err.code === 4001 ) {
                        // patient was saved as version
                        Y.log( `patient (${err.data && err.data._id}) was saved as version`, 'debug', NAME );
                        return err.data;

                    } else {
                        Y.log( `could not save patient read from card ${err}`, 'error', NAME );
                        throw err;
                    }
                } );
            } );
        }

        /**
         * Crlogs in status 'APPLIED' or 'CANCELLED' are considered as "Open".
         * Before crlog gets applied to patient discard all other "open" crlogs.
         *
         * @param   {Object}            user
         * @param   {Object}            crlog
         *
         * @return {Promise | undefined}
         */
        function cancelOpenCrLogsOfPatient( user, crlog ) {
            const
                patientId = crlog.matchedPatientId,
                currentCrLogId = crlog._id;

            return Promise.resolve().then( () => {
                if( !patientId || !currentCrLogId ) {
                    return;
                }
                return runDb( {
                    user,
                    model: 'crlog',
                    action: 'put',
                    query: {
                        _id: {$ne: currentCrLogId},
                        status: {$nin: ['APPLIED', 'CANCELLED']},
                        matchedPatientId: patientId
                    },
                    data: {status: 'CANCELLED', skipcheck_: true, multi_: true},
                    fields: ['status']
                } );
            } ).then( result => {
                if( result ) {
                    Y.log( `cancelled ${result.length} crlogs of patnent ${patientId} because crlog ${currentCrLogId} was applied`, 'debug', NAME );
                }
            } ).catch( err => {
                Y.log( `could not cancel open crlogs before new one can be applied: ${err && err.stack || err}`, 'warn', NAME );
            } );
        }

        async function parseCovercardRawData(user, rawData, cardData) {
            Y.log(`Parsing Covercard raw data`, 'info', NAME);
            let parsedData = {
                insuranceStatus: []
            }, institution = {};

            if(!rawData) {
                return parsedData;
            }

            //return if card not valid
            if(rawData.validCard !== '0') {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: 'showInvalidCard',
                    msg: {
                        data: {
                            errorCode: rawData.validCard
                        }
                    }
                } );
                if(rawData.validCard === '67') {
                    throw new Y.doccirrus.commonerrors.DCError( 112104 );
                }
                return parsedData;
            }

            if(!rawData['CH-Baseinformation']) {
                return parsedData;
            }

            const baseInfo = rawData['CH-Baseinformation'];
            const getDescription = function( title, value, map ) {
                return value ? `\n${title}: ${value} ${map.get(value)}` : '';
            };
            // parsing insurance data from covercard
            parseInsuranceFromCoverCard({baseInfo, institution, cardData});

            const insuranceGLN = getObject('nationalExtension.insurerInformation.contactEanNumber', baseInfo);
            if(insuranceGLN) {
                institution.insuranceGLN = insuranceGLN;
                const getInsurancesPromise = promisifyArgsCallback(Y.doccirrus.api.catalog.getInsurances),
                    query = { insuranceGLN };

                let [err, insurancesFromCatalog] = await formatPromiseResult(getInsurancesPromise({
                    user, originalParams: {insuranceType: 'PRIVATE_CH'}, query
                }));
                if(err || !Array.isArray(insurancesFromCatalog) || !insurancesFromCatalog.length) {
                    Y.log(`Failed to get insurance from catalog by GLN(EAN) number: ${insuranceGLN}`, 'warn', NAME);
                } else {
                    Y.log(`Fetched insurance from catalog by GLN(EAN) number: ${insuranceGLN}`, 'info', NAME);
                    institution = {
                        ...institution,
                        ...insurancesFromCatalog[0]
                    };
                }
            }
            // parse patient data from covercard to insurance which is not in catalog
            parsePatientFromCoverCard({patient: parsedData, baseInfo});

            const cantonCode = getObject('addresses.0.cantonCode', parsedData);
            if(cantonCode) {
                const getCantonCode = promisifyArgsCallback(Y.doccirrus.api.catalog.searchTarmedCantonsByCodeOrName);
                let [err, res] = await formatPromiseResult(getCantonCode({
                    user,
                    originalParams: {searchTerm: cantonCode},
                    model: 'catalog',
                    query: {}
                }));
                if(err || !Array.isArray(res) || res.length === 0 || !res[0].code) {
                    Y.log(`Canton by name ${cantonCode} not found!`, 'warn', NAME);
                    delete parsedData.addresses[0].cantonCode;
                } else {
                    parsedData.addresses[0].cantonCode = res[0].code;
                }
            }

            const coverageRestriction = getObject('ofacExtension.medicalServiceCoverageRestriction', baseInfo),
                KVGInfo = getObject('nationalExtension.KVGInformation', baseInfo),
                VVGInfo = getObject('nationalExtension.VVGInformation', baseInfo);

            if(coverageRestriction === '04') {
                //notify if person is on military service
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    nsp: 'default',
                    event: 'showInvalidCard',
                    msg: {
                        data: {
                            errorCode: '04'
                        }
                    }
                } );
            }
            if(coverageRestriction) {
                const coverageRestrictionMap = new Map([
                    ['00', 'keine Leistungsunterbrechung'],
                    ['01', 'TG Exklusiv für OKP-Deckungen'],
                    ['02', 'TG Exklusiv für die VVG-Deckungen'],
                    ['03', ' TG Exklusiv für OKP und VVG'],
                    ['04', 'Leistungsunterbrechung für: Auslandsaufenthalt / Militär']
                ]);
                institution.notes = `${institution.notes || ''}${getDescription('Leistungsunterbrechung', coverageRestriction, coverageRestrictionMap)}`;
            }
            let kvgNotes = institution.notes || '', vvgNotes = institution.notes || '';
            if(KVGInfo) {
                const KVG_BASE_MAP = new Map ([
                    ['01', 'obligatorische Krankenpflegeversicherung']
                ]),
                    KVG_MODEL_MAP = new Map ([
                        ['01', 'Standardmodell (ohne Einschränkung der Leistungserbringer)'],
                        ['02', 'Hausarzt-Model'],
                        ['03', 'HMO-Modell'],
                        ['04', 'Listen-Modell (PPO)'],
                        ['05', 'Andere'],
                        ['99', 'Unbekannt']
                    ]),
                    KVG_COVERAGE_MAP = new Map ([
                        ['01', 'Unfalldeckung'],
                        ['02', 'Keine Unfalldeckung '],
                        ['99', 'Unbekannt']
                    ]);
                kvgNotes = kvgNotes +
                           getDescription('OKP-Versicherung', KVGInfo.KVGBase, KVG_BASE_MAP) +
                           getDescription('Versicherungsform', KVGInfo.KVGModel, KVG_MODEL_MAP) +
                           getDescription('Unfalldeckung KVG', KVGInfo.KVGAccidentCoverage, KVG_COVERAGE_MAP);
            }
            parsedData.insuranceStatus.push({
                ...institution,
                type: 'PRIVATE_CH',
                notes: kvgNotes
            });
            if(VVGInfo) {
                const VVG_MEDICATION_MAP = new Map([
                        ['01', 'Deckung'],
                        ['02', 'Eingeschränke Deckung'],
                        ['00', 'Keine Deckung'],
                        ['99', 'Unbekannt']
                    ]),
                    VVG_MEDICATION_COVERAGE_MAP = new Map([
                        ['01', 'Unfalldeckung'],
                        ['00', 'Keine Unfalldeckung'],
                        ['99', 'Unbekannt']
                    ]),
                    VVG_MEDICAL_SERVICE_MAP = new Map([
                        ['01', 'Allgemeine Spitalabteilung ganze Schweiz'],
                        ['02', 'Halbprivate Spitalabteilung'],
                        ['03', 'Private Abteilung'],
                        ['04', 'Halbprivate Spitalabteilung ganze Schweiz'],
                        ['05', 'Private Abteilung ganze Schweiz'],
                        ['00', 'Keine private / Halbprivate Abteilung'],
                        ['99', 'Unbekannt']
                    ]),
                    VVG_HOSPITAL_BED_MAP = new Map([
                        ['00', 'Keine Hotellerie-Versicherung'],
                        ['01', 'Hotellerie-Versicherung 1 Bett-Zimmer'],
                        ['02', 'Hotellerie-Versicherung 2 Bett-Zimmer'],
                        ['99', 'Unbekannt']
                    ]),
                    VVG_MEDICATION_DOC_MAP = new Map([
                        ['01', 'Keine Arztwahl-Versicherung'],
                        ['00', 'Arztwahl-Versicherung'],
                        ['99', 'Unbekannt']
                    ]);
                vvgNotes = vvgNotes +
                           getDescription('Hors-Liste-Medikamente', VVGInfo.medicationHL, VVG_MEDICATION_MAP) +
                           getDescription('Unfalldeckung für Hors-Liste-Medikament', VVGInfo.medicationAccidentCoverageHL, VVG_MEDICATION_COVERAGE_MAP) +
                           getDescription('Medikamente Komplementärmedizin', VVGInfo.medicationKM, VVG_MEDICATION_MAP) +
                           getDescription('Unfalldeckung für Medikamente Komplementärmedizin', VVGInfo.medicationAccidentCoverageKM, VVG_MEDICATION_COVERAGE_MAP) +
                           getDescription('Spitalabteilung', VVGInfo.medicalServiceCoverageVVG, VVG_MEDICAL_SERVICE_MAP) +
                           getDescription('Spitalmodell: Hotellerie-Versicherung', VVGInfo.hospitalModelBedVVG, VVG_HOSPITAL_BED_MAP) +
                           getDescription('Spitalmodell: Arztwahl-Versicherung', VVGInfo.hospitalModelDocVVG, VVG_MEDICATION_DOC_MAP) +
                           getDescription('Unfalldeckung Spitalversicherung', VVGInfo.accidentCoverageVVG, VVG_HOSPITAL_BED_MAP);

            }
            parsedData.insuranceStatus.push({
                ...institution,
                type: 'PRIVATE_CH_VVG',
                notes: vvgNotes
            });
            return parsedData;
        }

        function parseInsuranceFromCoverCard({baseInfo, institution, cardData}) {
            function getPhone() {
                const insurerInformation = getObject('nationalExtensionData.insurerInformation', baseInfo);
                if(!insurerInformation) {
                    return;
                }
                const phoneKey = Object.keys(insurerInformation).find(key => ~key.indexOf("contactNumber")), //looks for key which starts with contactNumber. May be contactNumberFrench, contactNumberGerman, etc.
                    phoneObj = insurerInformation[phoneKey];
                if(phoneObj) {
                    const internationalCode = phoneObj['international-code'],
                        localCode = phoneObj['local-code'];

                    return localCode ? `${internationalCode ? internationalCode : ''} ${localCode} ${phoneObj.number}` : '';
                }
            }
            function getVekaCardNo() {
                return cardData.vekaCardNo || getObject('administrativeData.insuredPersonNumber', baseInfo);
            }
            function buildDateFromArray( dateArray ) {
                return new Date(dateArray[2], dateArray[1] - 1, dateArray[0]);
            }
            function getExpiryDate() {
                const expiryDate = cardData.expiryDate.inputDate,
                    expiryDateParams = expiryDate.split(".");
                return buildDateFromArray(expiryDateParams);
            }
            function getCardValidationDate() {
                return buildDateFromArray(cardData.expiryDate._validator.dateArray);
            }
            function fillNotes() {
                const institutionId = getObject('administrativeData.identificationNumberOfTheInstitution', baseInfo),
                    coverCardNo = getObject('administrativeData.coverCardNo', baseInfo);
                return `BAG-Nummer des OKP-Versicherers: ${institutionId}\nCovercard-Nummer des OKP-Versicherers:${coverCardNo}`;
            }
            const insuranceMapper = new Map([
                ['vekaCardNo', getVekaCardNo],
                ['kbvDate', 'baseInfo.administrativeData.expiryDate'],
                ['cardExpiryDate', getExpiryDate],
                ['cardValidationDate', getCardValidationDate],
                ['insuranceName', 'administrativeData.nameOfTheInstitution'],
                ['insurancePrintName', 'administrativeData.nameOfTheInstitution'],
                ['insuranceNo', 'administrativeData.insuredNumber'],
                ['city', 'nationalExtension.insurerInformation.billingAddress.town'],
                ['zipcode', 'nationalExtension.insurerInformation.billingAddress.swissZipCode'],
                ['address1', 'nationalExtension.insurerInformation.billingAddress.addressLine1'],
                ['phone', getPhone],
                ['notes', fillNotes]
            ]);
            applyCoverCardMapper(insuranceMapper, institution, baseInfo);
        }

        function parsePatientFromCoverCard({patient, baseInfo}) {
            function titleCase(str) {
                if(!str) {
                    return str;
                }
                return str.split(' ').map(item =>
                    item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()).join(' ');
            }
            function mapGender() {
                const rawGender = getObject('identificationData.sex', baseInfo),
                    genderMap = {
                        1: "FEMALE",
                        2: "MALE",
                        0: "UNKNOWN",
                        9: "UNDEFINED"
                    };
                return genderMap[rawGender];
            }
            function getKbvDob() {
                const yearMonthDay = getObject('identificationData.dateOfBirth.yearMonthDay', baseInfo);
                return yearMonthDay ? moment( yearMonthDay ).format( TIMESTAMP_FORMAT ) : undefined;
            }
            function mapAddress() {
                const addressLine = getObject('nationalExtension.mailAddress.addressLine1', baseInfo) || '',
                    city = getObject('nationalExtension.mailAddress.town', baseInfo) || '',
                    zip = getObject('nationalExtension.mailAddress.swissZipCode', baseInfo) || '',
                    cantonCode = getObject('nationalExtension.KVGInformation.KVGcanton.KVGcanton', baseInfo) || '',
                    countryCode = 'CH', country = 'Schweiz', kind = 'OFFICIAL',
                    addressArray = addressLine.split(' ');
                let street = '', houseno = '';
                if(Array.isArray(addressArray) && addressArray.length > 0) {
                    const lastElement = addressArray[addressArray.length - 1];
                    if(Number.isInteger(parseInt(lastElement, 10))) {
                        houseno = lastElement;
                        street = addressArray.slice(0, -1).join(' ').trim();
                    } else {
                        street = addressArray.join(' ').trim();
                    }
                }
                return [{street, ...(cantonCode ? {cantonCode} : {}), houseno, city, zip, countryCode, country, kind}];
            }
            const patientMapper = new Map([
                ['socialSecurityNo', 'identificationData.cardholderIdentifier'],
                ['gender', mapGender],
                ['firstname', () => titleCase(getObject('identificationData.name.firstName', baseInfo))],
                ['lastname', () => titleCase(getObject('identificationData.name.officialName', baseInfo))],
                ['dob', 'identificationData.dateOfBirth.yearMonthDay'],
                ['kbvDob', getKbvDob],
                ['addresses', mapAddress]
            ]);
            applyCoverCardMapper(patientMapper, patient, baseInfo);
        }

        function applyCoverCardMapper(mapper, object, baseInfo) {
            mapper.forEach((value, key) => {
                if(typeof value === 'string') {
                    object[key] = getObject(value, baseInfo);
                } else if(typeof value === 'function') {
                    object[key] = value();
                }
            });
        }

        /**
         * Triggers processing of crlog.
         * Starts where it stopped last time so not expected errors can be ignored.
         * If parsing faild user must trigger processing again.
         *
         * @param   {Object}            args
         */
        async function processCardRead( args ) { //jshint ignore:line
            const {user, crLogId, config = {}} = args;
            let err, result, crLog/*, parsedPatient, feedback, matchedPatient*/;

            [err, result] = await formatPromiseResult( runDb( { //jshint ignore:line
                user,
                model: 'crlog',
                query: {
                    _id: crLogId
                }
            } ) );

            if( err ) {
                Y.log( `triggered crlog processing: could not get crLog with ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                throw Error( `crLog with ID: ${crLogId} not found` );
            }
            Y.log( `triggered crlog processing: ID: ${crLogId}`, 'debug', NAME );

            if( !result || !result.length ) {
                Y.log( `crLog with ID: ${crLogId} not found`, 'error', NAME );
                throw Error( `crLog with ID: ${crLogId} not found` );
            }

            crLog = result[0];

            // 1. Step parse raw data and get feedback
            if( 'READ' === crLog.status ) {
                [err, result] = await formatPromiseResult( parseRawCardData( user, crLog.rawData ) ); //jshint ignore:line

                if( err ) {
                    Y.log( `could not parse crLog with ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                    throw Error( `crLog with ID: ${crLogId} not found` );
                }

                // fixed reader need cardSwipe. only public insurances
                if( !result.patient.insuranceStatus[0].cardSwipe && 'PUBLIC' === result.patient.insuranceStatus[0].type ) {
                    result.patient.insuranceStatus[0].cardSwipe = moment( crLog.initiatedAt ).startOf( 'day' ).toDate();
                }

                Object.assign( crLog, {
                    status: 'PARSED',
                    cardSwipe: result.patient.insuranceStatus[0].cardSwipe,
                    parsedPatient: result.patient,
                    feedback: result.feedback
                } );

                // need options and fails silently
                [err, result] = await formatPromiseResult( getInCaseConfig( user ) ); //jshint ignore:line

                if( err ) {
                    Y.log( `could not get incase config for persGroup9Info check ID: ${crLogId}: ${err && err.stack || err}`, 'warn', NAME );
                }

                result = validateParsedPatient( crLog, result );

                crLog.validationStatus = result.validationStatus;

                if( result.cancelled ) {
                    if( 'ONLY_ALLOW_COPYING_DATA' === crLog.validationStatus ) {
                        // create "diff" for copy data modal
                        crLog.diff = getDiff( {}, crLog.parsedPatient );
                    }
                    crLog.status = 'CANCELLED';
                    [err, result] = await formatPromiseResult( updateCrLog( user, crLogId, crLog ) ); //jshint ignore:line

                    if( err ) {
                        Y.log( `could not update crLog with ID to PARSED status: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                        throw Error( `could not update crLog with ID to PARSED status: ${crLogId}: ${err && err.stack || err}` );
                    }

                    return;
                }

            }

            // 2. Step match parsePatient with existing patients
            if( 'PARSED' === crLog.status ) {
                if(crLog.parsedPatient.countryMode && crLog.parsedPatient.countryMode.includes('CH')) {
                    let covercardRawData;

                    [err, covercardRawData] = await formatPromiseResult(
                        Y.doccirrus.api.patient.getPatientOFACInfo( {
                            user,
                            cardNo: crLog.parsedPatient.vekaCardNo
                        } )
                    );

                    if( err ) {
                        Y.log( `could not get covercard data from service: ${err && err.stack || err}`, 'error', NAME );
                    } else {
                        let parsedCovercardData;
                        try{
                            parsedCovercardData = await parseCovercardRawData(user, covercardRawData, crLog.rawData );
                        } catch(error) {
                            Y.log( `Error in parsing data from OFAC service: ${error && error.stack || error}`, 'error', NAME );
                            [err] = await formatPromiseResult(cancelOpenCrLogsOfPatient(user, crLog));
                            if(err) {
                                Y.log(`Error in updating crlog: ${err && err.stack || err}`, 'error', NAME);
                                throw err;
                            }
                            return;
                        }
                        if(!crLog.rawData.firstname || !crLog.rawData.lastname || !crLog.rawData.kbvDob || !crLog.rawData.dob || !crLog.rawData.socialSecurityNo) {
                            const { firstname, lastname, kbvDob, dob, socialSecurityNo } = parsedCovercardData;
                            [err] = await formatPromiseResult( updateCrLog( user, crLogId, {
                                rawData: {
                                    ...crLog.rawData,
                                    firstname, lastname, kbvDob, dob, socialSecurityNo
                                }
                            } ) );

                            if( err ) {
                                Y.log( `could not update crLog with ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                                throw Error( `could not update crLog with ID: ${crLogId}: ${err && err.stack || err}` );
                            }
                        }

                        crLog.parsedPatient = {
                            ...crLog.parsedPatient,
                            ...parsedCovercardData
                        };
                    }
                }
                [err, result] = await formatPromiseResult( matchPatient( user, crLog.parsedPatient ) ); //jshint ignore:line
                if( err ) {
                    Y.log( `could not match patient for crLog with ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                    throw Error( err );
                }

                crLog.matchedPatients = result;

                if( 1 < result.length || (1 === result.length && pkvFamilyInjured( crLog.parsedPatient, crLog.matchedPatients[0] )) ) {
                    crLog.status = 'MATCHING';

                    [err, result] = await formatPromiseResult( updateCrLog( user, crLogId, crLog ) ); //jshint ignore:line
                    if( err ) {
                        Y.log( `could not update crLog with ID to MATCHING status: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                        throw Error( `could not update crLog with ID to MATCHING status: ${crLogId}: ${err && err.stack || err}` );
                    }

                    return;
                }

                // on zero results create new patient without confirmation
                if( 0 === result.length ) {
                    config.appliedAction = 'matching_create_new';
                }
                crLog.status = 'MATCHING';
            }

            if( 'MATCHING' === crLog.status ) {

                // if process is triggered by an applied user action then we need to set up matchedPatient array first
                if( 'matching_create_new' === config.appliedAction ) {
                    crLog.matchedPatients = [{}];
                } else if( 'matching_select' === config.appliedAction ) {
                    if( !config.matchPatientId ) {
                        throw DCError( 500, {message: 'missing argument matchPatientId'} );
                    }

                    [err, result] = await formatPromiseResult( getPatients( user, { //jshint ignore:line
                        _id: config.matchPatientId
                    } ) );

                    if( err ) {
                        Y.log( `could not get selected matching patient with id ${config.matchPatientId} of crLog with ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                        throw Error( `could not get selected matching patient with id ${config.matchPatientId} of crLog with ID: ${crLogId}: ${err && err.stack || err}` );
                    }

                    if( !result || !result[0] ) {
                        Y.log( `could not find selected matching patient with id ${config.matchPatientId} of crLog with ID: ${crLogId}`, 'error', NAME );
                        throw Error( `could not find selected matching patient with id ${config.matchPatientId} of crLog with ID: ${crLogId}` );
                    }
                    crLog.matchedPatients = result;
                }
                crLog.status = 'MATCHED';

                // TODO: check additional insurance options and save with user feedback
                [err, result] = await formatPromiseResult( getInVoiceConfig( user ) ); //jshint ignore:line
                if( err ) {
                    Y.log( `could not get incase config for crLog with ID: ${crLogId}  ${err}`, 'error', NAME );
                }
                if( result && result.askForCreationOfAdditionalInsurancesAfterCardread ) {

                    crLog.askForCreationOfAdditionalInsurancesAfterCardread = result.askForCreationOfAdditionalInsurancesAfterCardread;
                    crLog.copyPublicInsuranceDataToAdditionalInsurance = result.copyPublicInsuranceDataToAdditionalInsurance;

                    [err, result] = await formatPromiseResult( updateCrLog( user, crLogId, crLog ) ); //jshint ignore:line
                    if( err ) {
                        const msg = `could not update crLog with ID to MATCHED status: ${crLogId}: ${err && err.stack || err}`;
                        Y.log( msg, 'error', NAME );
                        throw Error( msg );
                    }
                    return;
                }
            }

            if( 'MATCHED' === crLog.status ) {
                let mergedPatient;
                [err, mergedPatient] = await formatPromiseResult( mergePatient( user, crLog.matchedPatients[0], crLog.parsedPatient, crLog.validationStatus, config ) );
                if( err ) {
                    Y.log( `could not merge patient ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                crLog.mergedPatient = mergedPatient;
                crLog.diff = getDiff( crLog.matchedPatients[0], crLog.mergedPatient );

                // Only compare if crlogs is valid, otherwise card is already invalid or insurance must be deleted anyway
                if( ['NONE', 'OK'].includes( crLog.validationStatus ) ) {
                    result = compareBeforeMerge( crLog );
                    if( result && result.validationStatus ) {
                        crLog.validationStatus = result.validationStatus;
                    }
                }
                crLog.matchedPatientId = crLog.mergedPatient && crLog.mergedPatient._id;
                crLog.status = 'MERGED';

                if( crLog.matchedPatients[0] && crLog.matchedPatients[0]._id ) {
                    const cardSwipe = getObject( 'parsedPatient.insuranceStatus.0.cardSwipe', crLog );
                    if( cardSwipe ) {
                        [err, result] = await formatPromiseResult( isNewestVersion( user, crLog.matchedPatientId, cardSwipe ) ); //jshint ignore:line

                        if( err ) {
                            const msg = `could not check if patient is newest version: ${crLogId}: ${err && err.stack || err}`;
                            Y.log( msg, 'error', NAME );
                            throw Error( msg );
                        }

                        if( result && !result.isNewestVersion ) {
                            pushFeedback( crLog, '3026', 'INFO' );
                        }
                    }
                }

                // if there diffs then let the user confirm these, otherwise apply card read
                if( 0 < Object.keys( crLog.matchedPatients[0] ).length && 0 < crLog.diff.nDiffs ) {
                    [err, result] = await formatPromiseResult( updateCrLog( user, crLogId, crLog ) ); //jshint ignore:line

                    if( err ) {
                        Y.log( `could not update crLog with ID to MERGED status: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                        throw Error( `could not update crLog with ID to MERGED status: ${crLogId}: ${err && err.stack || err}` );
                    }
                    return result;
                }

            }

            if( 'MERGED' === crLog.status ) {
                [err, result] = await formatPromiseResult( applyCardRead( user, crLog ) ); //jshint ignore:line

                if( err ) {
                    const msg = `could not apply card read to patient with id ${config.matchPatientId} of crLog with ID: ${crLogId}: ${err && err.stack || err}`;
                    Y.log( msg, 'error', NAME );
                    throw Error( msg );
                }

                crLog.status = 'APPLIED';

                // patient was just created set id for ui navigation
                if( !crLog.matchedPatientId ) {
                    crLog.matchedPatientId = result._id.toString();
                }

                const isPublicInsurance = getObject( 'parsedPatient.insuranceStatus.0.type', crLog ) === 'PUBLIC';
                const hasCardSwipe = Boolean( getObject( 'parsedPatient.insuranceStatus.0.cardSwipe', crLog ) );
                if( isPublicInsurance && hasCardSwipe ) {
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        event: `patient.cardRead`,
                        tenantId: user && user.tenantId,
                        msg: {
                            data: crLog.matchedPatientId
                        }
                    } );
                }

                // need options and fails silently
                [err, result] = await formatPromiseResult( getEventStatus( user, crLog.matchedPatientId ) ); //jshint ignore:line
                crLog.eventStatus = result;

                [err, result] = await formatPromiseResult( updateCrLog( user, crLogId, crLog ) ); //jshint ignore:line

                if( err ) {
                    const msg = `could not update crLog with ID to APPLIED status: ${crLogId}: ${err && err.stack || err}`;
                    Y.log( msg, 'error', NAME );
                    throw Error( msg );
                }

                [err, result] = await formatPromiseResult( cancelOpenCrLogsOfPatient( user, crLog ) ); //jshint ignore:line

                return result;
            }

        }

        function applyAction( args ) {
            Y.log('Entering Y.doccirrus.api.crlog.applyAction', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.crlog.applyAction');
            }
            const
                {user, originalParams, callback} = args,
                crLogId = originalParams.crLogId,
                action = originalParams.action;

            if( !crLogId ) {
                callback( new DCError( 500, {message: 'missing crlog id'} ) );
                return;
            }

            switch( action ) {
                case 'cancel':
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'crlog',
                        action: 'put',
                        query: {
                            _id: crLogId
                        },
                        data: {
                            status: 'CANCELLED',
                            skipcheck_: true
                        },
                        fields: ['status'],
                        callback: callback
                    } );
                    break;
                case 'matching_select':
                case 'matching_create_new':
                    if( 'matching_select' === action && !originalParams.matchPatientId ) {
                        callback( new DCError( 500, {message: 'missing params matchPatientId for action "matching_select"'} ) );
                        return;
                    }
                    processCardRead( {
                        user,
                        crLogId,
                        config: {appliedAction: action, matchPatientId: originalParams.matchPatientId}
                    } ).then( ( result ) => {
                        callback( null, result );
                    } ).catch( err => {
                        Y.log( `could not match (${action}) card read to patient crlog ID: ${crLogId}: ${err && err.stack || err}`, 'error', NAME );
                        callback( err );
                    } );
                    break;
                case 'add_additional_insurances':
                case 'do_not_add_additional_insurances':
                    processCardRead( {
                        user,
                        crLogId,
                        config: {
                            appliedAction: action,
                            addInsuranceTypes: originalParams.addInsuranceTypes,
                            copyInsuranceTypes: originalParams.copyInsuranceTypes
                        }
                    } ).then( ( result ) => {
                        callback( null, result );
                    } ).catch( err => {
                        Y.log( `could not apply card read to patient crlog ID: ${crLogId}: ${err}`, 'error', NAME );
                        callback( err );
                    } );
                    break;
                case 'apply':
                    processCardRead( {
                        user,
                        crLogId
                    } ).then( ( result ) => {
                        callback( null, result );
                    } ).catch( err => {
                        Y.log( `could not apply card read to patient crlog ID: ${crLogId}: ${err}`, 'error', NAME );
                        callback( err );
                    } );
                    break;
                default:
                    callback( new DCError( 111000, {data: {$action: action}} ) ); //eslint-disable-line callback-return
                    break;
            }
        }

        Y.namespace( 'doccirrus.api' ).crlog = {

            name: NAME,
            server: {
                storeCardRead,
                storeCardReadJSON,
                processCardRead
            },
            put,
            invalidateCRLogs, // TODOOO add cron job
            searchCR,
            getHistory,
            applyAction,
            parseCovercardRawData,
            matchPatient
        };

        Y.doccirrus.auth.onReady( function() {
            var cluster = require( 'cluster' );
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                return;
            }
            if( cluster.isMaster ) {
                // MOJ-2445
                setTimeout( invalidateCRLogs, 5000 );
            }
        } );

    },
    '0.0.1', {requires: ['crlog-schema', 'dccommonutils', 'dckbvutils', 'calevent-api', 'kvk-parser', 'egk-parser']}
);

