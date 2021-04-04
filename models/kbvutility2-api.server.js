/**
 * User: do
 * Date: 30/03/17  17:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'kbvutility2-api', function( Y, NAME ) {

        /**
         * @module kbvutility2-api
         */
        const {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;


        async function init( callback ) {
            const migrate = require( 'dc-core' ).migrate,
                ObjectId = require( 'mongoose' ).Types.ObjectId;

            if( !Y.doccirrus.ipc.isMaster() || Y.doccirrus.auth.isDCPRC() ) {
                callback();
                return;
            }
            migrate.eachTenantParallelLimit( doTenant, 1, finalCb );
            function finalCb( n ) {
                Y.log( `added activitysettings.KBVUTILITY2 for ${n} tenants`, 'info', NAME );
                callback();
            }
            async function doTenant( user, cb ) {

                let [err, as] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activitysettings',
                    query: {}
                } ) );

                if( err ) {
                    cb();
                    return;
                }

                let settings = as[0].settings;
                for( let i = 0; i < settings.length; i++ ) {
                    if( settings[i].actType === "KBVUTILITY2" ) {
                        cb();
                        return;
                    }
                }

                settings.push( {
                    _id: ObjectId( "5e551b7862268cbf8e2c9b47" ),
                    subTypes: [],
                    actType: "KBVUTILITY2",
                    color: "#ffffff",
                    isVisible: true,
                    schein: true,
                    functionality: "sd11",
                    useWYSWYG: false,
                    userContent: ""
                } );

                settings = {settings: settings};
                Y.doccirrus.filters.cleanDbObject( settings );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activitysettings',
                    action: 'put',
                    query: {_id: Y.doccirrus.schemas.activitysettings.getId()},
                    fields: ['settings'],
                    data: settings
                }, cb );
            }
        }

        async function getSdhm( args ) {
            const {query={}, callback} = args;
            const SU = Y.doccirrus.auth.getSUForLocal();
            const sdhm2 = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'KBVUTILITY2',
                short: 'SDHM2'
            } );

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query: {
                    ...query,
                    catalog: sdhm2.filename
                },
                options: {
                    lean: true,
                    sort: {
                        kapitel: 1,
                        diagnosegruppe_value: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `getSdhm: could not get catalog entries: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, results, callback );
        }

        async function searchDiagnoses( args ) {
            const {query, callback} = args;
            const SU = Y.doccirrus.auth.getSUForLocal();
            const searchIcdsInCatalogAndPatientAsync = promisifyArgsCallback( Y.doccirrus.api.catalog.searchIcdsInCatalogAndPatient );
            const sdhm2aResults = [];

            if( query.icdCode && query.kv && query.patientAge ) {
                const sdhm2aEntries = [];
                // strip dash because only left part must match without any dashes
                const icdCode = query.icdCode.replace( /-/g, '' );

                const sdhm2a = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'KBVUTILITY2',
                    short: 'SDHM2A'
                } );

                let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalog',
                    query: {
                        $and: [
                            {
                                $or: [
                                    {geltungsbereich_kv: null},
                                    {geltungsbereich_kv: query.kv}
                                ]
                            },
                            {
                                catalog: sdhm2a.filename,
                                'heilmittel_liste.sekundaercode': {$exists: true}
                            },
                            {
                                $or: [
                                    {icd_code: new RegExp( `^${icdCode}`, 'i' )},
                                    {'heilmittel_liste.sekundaercode': new RegExp( `^${icdCode}`, 'i' )}
                                ]
                            }
                        ]
                    },
                    options: {
                        lean: true,
                        sort: {
                            _id: 1
                        }
                    }
                } ) );

                if( err ) {
                    Y.log( `searchDiagnoses: could not fetch sdhm2a entries for ICD-10 code ${icdCode}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                } else {
                    let foundSdhm2aCatalogEntries;
                    results.forEach( entry => {
                        (entry.heilmittel_liste || []).forEach( hmListEntry => {
                            const hmListEntryMatchesPatientAge = Y.doccirrus.schemas.v_kbvutility2.sdhm2aHmListEntryMatchesPatientAge( query.patientAge, hmListEntry );
                            const hmListEntryHasDiagnosisCode = !query.diagnosisGroupCode || Y.doccirrus.schemas.v_kbvutility2.sdhm2aHmListEntryHasDiagnosisGroupCode( query.diagnosisGroupCode, hmListEntry );

                            if( !hmListEntryMatchesPatientAge ) {
                                Y.log( `could not match patient age ${query.patientAge} with sdhm2a entry: ${JSON.stringify( hmListEntry )}`, 'debug', NAME );
                                return;
                            }

                            if( !hmListEntryHasDiagnosisCode ) {
                                Y.log( `could not match diagnosis code ${query.diagnosisGroupCode} with sdhm2a entry: ${JSON.stringify( hmListEntry )}`, 'debug', NAME );
                                return;
                            }

                            hmListEntry.icd_code = entry.icd_code;
                            sdhm2aEntries.push( hmListEntry );
                        } );
                    } );

                    if( sdhm2aEntries.length ) {
                        const icdCatalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                            actType: 'DIAGNOSIS',
                            short: 'ICD-10'
                        } );

                        let codes = sdhm2aEntries.map( sdhm2aEntry => {
                            return icdCode.includes( sdhm2aEntry.icd_code ) || sdhm2aEntry.icd_code.includes( icdCode ) ? sdhm2aEntry.sekundaercode : sdhm2aEntry.icd_code;
                        } );

                        [err, foundSdhm2aCatalogEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: SU,
                            model: 'catalog',
                            query: {
                                catalog: icdCatalog.filename,
                                seq: {$in: codes}
                            },
                            options: {
                                lean: true,
                                select: {
                                    seq: 1,
                                    title: 1
                                }
                            }
                        } ) );

                        if( err ) {
                            Y.log( `searchDiagnoses: could not get catalog entries found in sdhm2a: ${err.stack || err}`, 'warn', NAME );
                            return handleResult( err, undefined, callback );
                        }

                        for( let foundSdhm2aCatalogEntry of foundSdhm2aCatalogEntries ) {
                            const matchingSdhm2aEntry = sdhm2aEntries.find( sdhm2aEntry => sdhm2aEntry.sekundaercode === foundSdhm2aCatalogEntry.seq || sdhm2aEntry.icd_code === foundSdhm2aCatalogEntry.seq );
                            if( !matchingSdhm2aEntry ) {
                                Y.log( `searchDiagnoses: could not find catalog diagnosis ${foundSdhm2aCatalogEntry.seq} in found sdhm2a entries ${JSON.stringify( sdhm2aEntries )}`, 'debug', NAME );
                                continue;
                            }
                            foundSdhm2aCatalogEntry.fromSdhma = true;
                            foundSdhm2aCatalogEntry.sdhm2aInfo = {
                                anlage_heilmittelvereinbarung_value: matchingSdhm2aEntry.anlage_heilmittelvereinbarung_value,
                                anlage_heilmittelvereinbarung_name: matchingSdhm2aEntry.anlage_heilmittelvereinbarung_name
                            };
                            sdhm2aResults.push( foundSdhm2aCatalogEntry );
                        }
                    }
                }
            }

            let [err, catalogAndPatientResult] = await formatPromiseResult( searchIcdsInCatalogAndPatientAsync( args ) );

            if( err ) {
                Y.log( `searchDiagnoses: could not fetch catalog and patient data: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, sdhm2aResults.concat( catalogAndPatientResult ), callback );
        }

        async function checkAgreement( args ) {
            const _ = require( 'lodash' );
            const SU = Y.doccirrus.auth.getSUForLocal();
            const {originalParams = {}, callback} = args;
            const {
                chapter,
                icdCode,
                icdCode2,
                diagnosisGroup,
                patientAge,
                kv
            } = originalParams;
            const query = {};
            const chapterNumber = chapter && Y.doccirrus.schemas.v_kbvutility2.mapChapterToNumber( chapter );

            const filterPatientAge = hmListEntry => {
                const hmListEntryMatchesPatientAge = Y.doccirrus.schemas.v_kbvutility2.sdhm2aHmListEntryMatchesPatientAge( patientAge, hmListEntry );
                if( !hmListEntryMatchesPatientAge ) {
                    Y.log( `checkAgreement: could not match patient age ${query.patientAge} with sdhm2a entry: ${JSON.stringify( hmListEntry )}`, 'debug', NAME );
                    return false;
                }
                return true;
            };

            const getPossibleDiagnosisGroups = hmListEntry => {
                const values = [];

                (hmListEntry.kapitel_liste || []).filter( kapitel => {
                    return !chapterNumber || chapterNumber === kapitel.kapitel_value;
                } ).forEach( kapitel => {
                    (kapitel.diagnosegruppe_liste || []).forEach( diagnosegruppe => {
                        values.push( diagnosegruppe.diagnosegruppe_value );
                    } );
                } );

                return [{type: 'DIAGNOSIS_GROUP', values}];
            };
            let err, resultsSDHM2A;

            if( !_.isFinite( patientAge ) || !kv ) {
                err = Y.doccirrus.errors.rest( 400, 'Bad params', true );
                Y.log( `checkAgreement: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const sdhm2a = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'KBVUTILITY2',
                short: 'SDHM2A'
            } );

            const $and = [
                {
                    catalog: sdhm2a.filename
                },
                {
                    $or: [
                        {geltungsbereich_kv: null},
                        {geltungsbereich_kv: kv}
                    ]
                },
                query
            ];

            // Get all possible candidates for a agreement

            if( icdCode || icdCode2 ) {
                let $or;
                if( icdCode && !icdCode2 ) {
                    $or = [
                        {icd_code: new RegExp( `^${icdCode}`, 'i' )},
                        {'heilmittel_liste.sekundaercode': new RegExp( `^${icdCode}`, 'i' )},
                        {
                            icd_code: null,
                            'heilmittel_liste.sekundaercode': null
                        }
                    ];
                }
                if( !icdCode && icdCode2 ) {
                    $or = [
                        {icd_code: new RegExp( `^${icdCode2}`, 'i' )},
                        {'heilmittel_liste.sekundaercode': new RegExp( `^${icdCode2}`, 'i' )},
                        {
                            icd_code: null,
                            'heilmittel_liste.sekundaercode': null
                        }
                    ];
                }
                if( icdCode && icdCode2 ) {
                    $or = [
                        {
                            icd_code: new RegExp( `^${icdCode}`, 'i' ),
                            'heilmittel_liste.sekundaercode': new RegExp( `^${icdCode2}`, 'i' )
                        },
                        {
                            icd_code: new RegExp( `^${icdCode2}`, 'i' ),
                            'heilmittel_liste.sekundaercode': new RegExp( `^${icdCode}`, 'i' )
                        },
                        {
                            icd_code: null,
                            'heilmittel_liste.sekundaercode': null
                        }
                    ];
                }
                $and.push( {
                    $or
                } );
            } else {
                $and.push( {
                    icd_code: null,
                    'heilmittel_liste.sekundaercode': null
                } );
            }

            if( chapterNumber ) {
                $and.push( {
                    'heilmittel_liste.kapitel_liste.kapitel_value': chapterNumber
                } );
            }

            [err, resultsSDHM2A] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query: {
                    $and
                },
                options: {
                    lean: true
                }
            } ) );

            if( err ) {
                Y.log( `checkAgreement: could not get sdhm2a entries: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const results = {agreements: [], candidates: [], alternatives: []};

            resultsSDHM2A.forEach( entry => {
                const entryIcdCode = entry.icd_code;

                entry.heilmittel_liste.filter( filterPatientAge ).forEach( hmListEntry => {
                    const entryIcdCode2 = hmListEntry.sekundaercode;
                    const hasDiagnosisGroup = diagnosisGroup && Y.doccirrus.schemas.v_kbvutility2.sdhm2aHmListEntryHasDiagnosisGroupCode( diagnosisGroup, hmListEntry );
                    const base = {
                        type: hmListEntry.anlage_heilmittelvereinbarung_value,
                        advice: hmListEntry.hinweistext,
                        acuteEvent: hmListEntry.zeitraum_akutereignis_unit === 'Jahr' ? hmListEntry.zeitraum_akutereignis_value * 12 : hmListEntry.zeitraum_akutereignis_value
                    };

                    const checkDiagnosisGroup = ( needs = [] ) => {
                        if( !needs.length && hasDiagnosisGroup ) {
                            results.agreements.push( base );
                        } else if( !hasDiagnosisGroup && !diagnosisGroup ) {
                            base.needs = needs.concat( hasDiagnosisGroup ? [] : getPossibleDiagnosisGroups( hmListEntry ) );
                            results.candidates.push( base );
                        } else if( !diagnosisGroup || (diagnosisGroup && hasDiagnosisGroup) && needs.length ) {
                            base.needs = needs;
                            results.candidates.push( base );
                        }
                    };

                    if( icdCode && !icdCode2 && entryIcdCode && !entryIcdCode2 ) {
                        checkDiagnosisGroup();
                    } else if( icdCode && !icdCode2 && entryIcdCode && entryIcdCode2 && icdCode.includes( entryIcdCode ) ) {
                        checkDiagnosisGroup( [{type: 'ICD2', values: [entryIcdCode2]}] );
                    } else if( icdCode && !icdCode2 && entryIcdCode && entryIcdCode2 && icdCode.includes( entryIcdCode2 ) ) {
                        checkDiagnosisGroup( [{type: 'ICD2', values: [entryIcdCode]}] );
                    } else if( icdCode && icdCode2 && entryIcdCode && entryIcdCode2 ) {
                        checkDiagnosisGroup();
                    } else if( !entryIcdCode && !entryIcdCode2 ) {
                        checkDiagnosisGroup();
                    }

                    const alternative = JSON.parse( JSON.stringify( base ) );
                    alternative.needs = getPossibleDiagnosisGroups( hmListEntry );
                    results.alternatives.push( alternative );
                } );

            } );

            return handleResult( null, results, callback );

        }

        async function checkBlankRegulation( args ) {
            const SU = Y.doccirrus.auth.getSUForLocal();
            const {originalParams = {}, callback} = args;
            const {
                icdCode,
                icdCode2,
                diagnosisGroup,
                patientAge
            } = originalParams;
            let err, results;

            if( !icdCode && !icdCode2 && !diagnosisGroup ) {
                err = Y.doccirrus.errors.rest( 400, 'Bad params', true );
                Y.log( `checkBlankRegulation: ${err.message}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const sdhm2bv = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'KBVUTILITY2',
                short: 'SDHM2BV'
            } );

            const query = {
                $and: [
                    {
                        catalog: sdhm2bv.filename
                    },
                    {
                        $or: [
                            {hoechstalter_jahre: null},
                            {hoechstalter_jahre: {$lte: patientAge}}
                        ]
                    },
                    {
                        $or: [
                            {mindestalter: null},
                            {mindestalter: {$gte: patientAge}}
                        ]
                    }
                ]

            };

            if( icdCode ) {
                query.$and.push( {$or: [{erster_icd_code: icdCode}, {erster_icd_code: null}]} );
            } else {
                query.$and.push( {erster_icd_code: null} );
            }

            if( icdCode2 ) {
                query.$and.push( {$or: [{zweiter_icd_code: icdCode2}, {zweiter_icd_code: null}]} );
            } else {
                query.$and.push( {zweiter_icd_code: null} );
            }

            if( diagnosisGroup ) {
                query.$and.push( {$or: [{diagnosegruppe_value: diagnosisGroup}, {diagnosegruppe_value: null}]} );
            } else {
                query.$and.push( {diagnosegruppe_value: null} );
            }

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query,
                options: {
                    lean: true
                }
            } ) );

            if( err ) {
                Y.log( `checkRegulation: could not get sdhm2bv entries ${err.stack || err}`, 'warn', NAME );
            }

            return handleResult( err, results, callback );

        }

        async function getPrescriptionCase( args ) {
            const moment = require( 'moment' );
            const {user, originalParams = {}, callback} = args;
            const {
                activityId,
                patientId,
                employeeId,
                timestamp,
                icdCode,
                icdCode2,
                diagnosisGroup,
                hasBlankRegulation
            } = originalParams;
            let err, results, lastKbvUtility2;
            const caseResult = {
                hasCase: false,
                kbvutility2Id: null
            };
            if( !timestamp || !patientId || !employeeId ) {
                err = Y.doccirrus.errors.rest( 400, 'Bad params', true );
                Y.log( `checkBlankRegulation: ${err.message}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            const getThreeDigitIcd = fullIcdCode => {
                return fullIcdCode.substring( 0, 3 );
            };

            const sixMonthBefore = moment( timestamp ).subtract( 6, 'month' ).toDate();

            const query = {
                patientId,
                actType: 'KBVUTILITY2',
                status: {$in: ['VALID', 'APPROVED']},
                timestamp: {
                    $gt: sixMonthBefore,
                    $lt: timestamp
                }
            };

            if( activityId ) {
                query._id = {$ne: activityId};
            }

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query,
                options: {
                    lean: true,
                    limit: 1,
                    sort: {
                        timestamp: -1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `getPrescriptionCase: could not get last kbvutility2 activity: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            lastKbvUtility2 = results[0];

            if( lastKbvUtility2 ) {
                const validIcdCode = [lastKbvUtility2.utIcdCode, lastKbvUtility2.utSecondIcdCode]
                    .filter( Boolean )
                    .map( getThreeDigitIcd )
                    .some( lastKbvUtility2IcdCode => {
                        return [icdCode, icdCode2]
                            .filter( Boolean )
                            .map( getThreeDigitIcd )
                            .includes( lastKbvUtility2IcdCode );
                    } );
                const validDiagnosisGroup = diagnosisGroup === lastKbvUtility2.ut2DiagnosisGroupCode;
                const validBlankRegulation = Boolean( hasBlankRegulation ) === Boolean( (lastKbvUtility2.ut2BlankRegulation && !lastKbvUtility2.ut2BlankRegulationIgnored) );
                const sameDoctor = employeeId === lastKbvUtility2.employeeId;

                if( sameDoctor && validIcdCode && validDiagnosisGroup && validBlankRegulation ) {
                    caseResult.hasCase = true;
                    caseResult.kbvutility2Id = lastKbvUtility2._id;
                }
            }

            return handleResult( null, caseResult, callback );
        }

        async function calculatePrescriptionCaseUnits( args ) {
            const _ = require( 'lodash' );
            const {user, originalParams = {}, callback} = args;
            const {prescriptionCaseId} = originalParams;
            let unitsSum = 0;
            let massageUnitsSum = 0;
            let standardizedCombinationUnitsSum = 0;
            let err, results;

            const getLast = async activityId => {
                [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: activityId
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        select: {
                            ut2PrescriptionCaseId: 1,
                            ut2Remedy1List: 1,
                            ut2Remedy2List: 1
                        }
                    }
                } ) );
                const addUnits = ( sum, entry ) => {
                    const units = entry.units;
                    if( _.isFinite( units ) ) {
                        sum = sum + units;
                    }
                    return sum;
                };
                const addMassageUnits = ( sum, entry ) => {
                    if( entry.massage ) {
                        return addUnits( sum, entry );
                    }
                    return sum;
                };
                const addStandardizedUnits = ( sum, entry ) => {
                    if( entry.type === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES' ) {
                        return addUnits( sum, entry );
                    }
                    return sum;
                };

                if( err ) {
                    Y.log( `getLast: error while fetching kbvutility2 ${activityId}: ${err.stack || err}`, 'warn' );
                    throw err;
                }

                const lastPrescription = results[0];

                if( !lastPrescription ) {
                    Y.log( `getLast: could not find kbvutility2 ${activityId}; ignoring...`, 'warn', NAME );
                } else {
                    const relevantRemedies = lastPrescription.ut2Remedy1List
                        .concat( !lastPrescription.ut2Remedy1List.length ? lastPrescription.ut2Remedy2List : [] );
                    unitsSum += relevantRemedies.reduce( addUnits, 0 );
                    massageUnitsSum += relevantRemedies.reduce( addMassageUnits, 0 );
                    standardizedCombinationUnitsSum += relevantRemedies.reduce( addStandardizedUnits, 0 );
                }

                if( lastPrescription.ut2PrescriptionCaseId ) {
                    return getLast( lastPrescription.ut2PrescriptionCaseId );
                }

            };

            [err] = await formatPromiseResult( getLast( prescriptionCaseId ) );

            if( err ) {
                Y.log( `calculatePrescriptionCaseUnits: could not get next kbvutility2: ${err.stack || err}`, 'warn', NAME );
            }

            return handleResult( null, {unitsSum, massageUnitsSum, standardizedCombinationUnitsSum}, callback );
        }

        async function getValidApprovals( args ) {
            const {user, originalParams, callback} = args;
            const {patientId, timestamp, insuranceId} = originalParams;

            if( !timestamp || !patientId || !insuranceId ) {
                err = Y.doccirrus.errors.rest( 400, 'Bad params', true );
                Y.log( `getValidApprovals: ${err.message}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            let query = {
                actType: 'KBVUTILITY2APPROVAL',
                status: {$in: ['VALID', 'APPROVED']},
                patientId,
                insuranceId,
                $or: [
                    {unlimitedApproval: true},
                    {approvalValidTo: {$gte: new Date( timestamp )}}
                ]
            };

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query,
                options: {
                    lean: true
                }
            } ) );

            if( err ) {
                Y.log( `getValidApprovals: could not fetch approvals for ${timestamp} ${patientId} ${insuranceId} `, 'warn', NAME );
            }
            return handleResult( err, results, callback );
        }

        async function updatePrescriptionCase( args ) {
            const getPrescriptionCaseAsync = promisifyArgsCallback( getPrescriptionCase );
            const calculatePrescriptionCaseUnitsAsync = promisifyArgsCallback( calculatePrescriptionCaseUnits );
            const {user, data, callback} = args;
            let ut2PrescriptionCaseId = null;
            let ut2PrescriptionCaseUnitsSum = null;
            let ut2PrescriptionCaseMassageUnitsSum = null;
            let ut2PrescriptionCaseStandardizedCombinationUnitsSum = null;
            const results = {};

            if( !data ) {
                let err = Y.doccirrus.errors.rest( 400, 'Bad params', true );
                Y.log( `updatePrescriptionCase: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let [err, result] = await formatPromiseResult( getPrescriptionCaseAsync( {
                user,
                originalParams: data
            } ) );

            if( err ) {
                Y.log( `could not get prescription case: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( result && result.hasCase && result.kbvutility2Id ) {
                ut2PrescriptionCaseId = result.kbvutility2Id;
                [err, result] = await formatPromiseResult( calculatePrescriptionCaseUnitsAsync( {
                    user,
                    originalParams: {
                        prescriptionCaseId: ut2PrescriptionCaseId
                    }
                } ) );

                if( err ) {
                    Y.log( `could not calculate prescription case units: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( result ) {
                    ut2PrescriptionCaseUnitsSum = result.unitsSum;
                    ut2PrescriptionCaseMassageUnitsSum = result.massageUnitsSum;
                    ut2PrescriptionCaseStandardizedCombinationUnitsSum = result.standardizedCombinationUnitsSum;
                }

            }

            results.ut2PrescriptionCaseId = ut2PrescriptionCaseId;
            results.ut2PrescriptionCaseUnitsSum = ut2PrescriptionCaseUnitsSum;
            results.ut2PrescriptionCaseMassageUnitsSum = ut2PrescriptionCaseMassageUnitsSum;
            results.ut2PrescriptionCaseStandardizedCombinationUnitsSum = ut2PrescriptionCaseStandardizedCombinationUnitsSum;

            return handleResult( null, results, callback );
        }



        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class kbvutilityprice
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).kbvutility2 = {
            name: NAME,
            init,
            getSdhm,
            searchDiagnoses,
            checkAgreement,
            checkBlankRegulation,
            getPrescriptionCase,
            calculatePrescriptionCaseUnits,
            getValidApprovals,
            updatePrescriptionCase
        };

    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'v_kbvutility2-schema'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activitysettings-api',
            // 'catalog-api',
            // 'dcauth',
            // 'dcerror',
            // 'dcfilters',
            // 'dcipc'
        ]
    }
);
