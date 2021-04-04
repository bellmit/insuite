/**
 * User: do
 * Date: 09.12.19  16:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

/**
 * @module changelog-schema
 *
 */

YUI.add( 'changelog-api', function( Y, NAME ) {
        const i18n = Y.doccirrus.i18n;
        const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;
        const {promisify} = require( 'util' );
        const medicationDiffList = [
            'phTer',
            'phTrans',
            'phImport',
            'phNegative',
            'phLifeStyle',
            'phLifeStyleCond',
            'phGBA',
            'phGBATherapyHintName',
            'phMed',
            'phPrescMed',
            'phCompany',
            'phOnly',
            'phRecipeOnly',
            'phBTM',
            'phContraceptive',
            'phOTC',
            'phOTX',
            'phIngr',
            'phForm',
            'phPriceSale',
            'phPriceRecommended',
            'phPatPay',
            'phPatPayHint',
            'phFixedPay',
            'phRefundAmount',
            'phCheaperPkg',
            'phNLabel',
            'phPZN',
            'phSalesStatus',
            'phNormSize',
            'phPackSize'
        ];
        const activitySchema = Y.doccirrus.schemas.activity.schema;
        const medicationComparator = Y.doccirrus.compareutils.getComparator( {
            schema: activitySchema,
            whiteList: medicationDiffList
        } );
        const {logEnter, logExit} = require( '../../../server/utils/logWrapping' )( Y, NAME );

        async function clean( args ) {
            const {user, version, catalogShort} = args;
            if( !version || !catalogShort ) {
                throw Error( 'insufficient arguments' );
            }
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'changelog',
                action: 'delete',
                migrate: true,
                query: {
                    version,
                    catalogShort
                },
                options: {
                    override: true
                }
            } );
        }

        function removeCatalogUsageEntryById( user, id ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'delete',
                query: {
                    _id: id
                },
                migrate: true
            } ).catch( err => {
                Y.log( `could not remove catalogusage entry ${id} of mmi medication that is not in db any more: ${err.stack || err}`, 'warn', NAME );
                return null;
            } );
        }

        function updateCatalogUsageEntry( user, catalogUsageEntry, mmiMedication ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'put',
                query: {
                    _id: catalogUsageEntry._id
                },
                fields: medicationDiffList,
                data: {...mmiMedication, skipcheck_: true},
                migrate: true
            } ).catch( err => {
                Y.log( `could not update catalogusage entry ${catalogUsageEntry._id} of mmi medication with new db data: ${err.stack || err}`, 'warn', NAME );
                return null;
            } );
        }

        /**
         *
         * @param {Object} args
         * @param {module:authSchema.auth} args.user
         * @param {String} args.version
         * @param {module:catalogusageSchema.catalogusage} args.medicationCatalogUsageEntry
         * @param {module:locationSchema.location} args.location
         * @return {Promise<undefined|Error>}
         */
        async function processMedicationCatalogUsageEntry( args ) {
            const timer = logEnter( 'Y.doccirrus.api.changelog.processMedicationCatalogUsageEntry' );
            const {user, version, medicationCatalogUsageEntry, location} = args;

            if( !location || !location._id ) {
                Y.log( `processMedicationCatalogUsageEntry - could not process medication catalog usage entry. ERROR: locationId of catalogUsage entry does NOT exist anymore: ${medicationCatalogUsageEntry && medicationCatalogUsageEntry.locationId}`, 'warn', NAME );
                logExit( timer );
                return;
            }

            let [err, mmiMedication] = await formatPromiseResult( Y.doccirrus.api.mmi.getMMIMedicationByPZN( {
                originalParams: {
                    pzn: medicationCatalogUsageEntry.phPZN,
                    bsnr: location && location.commercialNo
                }
            } ) );

            if( err ) {
                Y.log( `could not get mmi medication for PZN ${medicationCatalogUsageEntry.phPZN}: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                throw err;
            }
            let changeLogData;

            if( mmiMedication ) {
                const diff = medicationComparator.compare( medicationCatalogUsageEntry, mmiMedication );
                const updated = await updateCatalogUsageEntry( user, medicationCatalogUsageEntry, mmiMedication );
                if( updated ) {
                    changeLogData = {
                        title: `${medicationCatalogUsageEntry.phPZN} ${mmiMedication.phNLabel}`,
                        diff
                    };
                }
            } else {
                const removed = await removeCatalogUsageEntryById( user, medicationCatalogUsageEntry._id );
                if( removed ) {
                    changeLogData = {
                        title: `${medicationCatalogUsageEntry.phPZN} ${medicationCatalogUsageEntry.phNLabel}`,
                        comment: i18n( 'CatalogMojit.changelog-api.texts.MEDICATION_NOT_DB', {data: {pzn: medicationCatalogUsageEntry.phPZN}} )
                    };
                }
            }

            if( changeLogData ) {
                changeLogData.locationId = location._id.toString();
                changeLogData.locname = location.locname;
                changeLogData.commercialNo = location.commercialNo;
                let postChangeLogResult;
                [err, postChangeLogResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'changelog',
                    action: 'post',
                    migrate: true,
                    data: {...changeLogData, catalogShort: 'MMI', version, skipcheck_: true}
                } ) );

                if( err ) {
                    Y.log( `could not post changelog entry for PZN ${medicationCatalogUsageEntry.phPZN}: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `posted changelog entry for PZN ${medicationCatalogUsageEntry.phPZN}: ${postChangeLogResult}`, 'debug', NAME );
                }

            }
            logExit( timer );
        }

        async function getLocationBsnrMap( user ) {
            const result = {};
            const locations = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                query: {},
                options: {
                    select: {
                        locname: 1,
                        commercialNo: 1
                    },
                    lean: true
                },
                migrate: true
            } );

            locations.forEach( location => {
                result[location._id.toString()] = location;
            } );
            return result;
        }

        async function createMMIChangeListForTenant( args ) {
            const timer = logEnter( 'Y.doccirrus.api.changelog.createMMIChangeListForTenant' );
            const getModelAsync = promisify( Y.doccirrus.mongodb.getModel );
            const {user, mmiVersion} = args;

            let [err, locationBsnrMap] = await formatPromiseResult( getLocationBsnrMap( user ) );
            if( err ) {
                Y.log( `could not get location to create location id BSNR map: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                throw err;
            }

            let results;
            [err, results] = await formatPromiseResult( clean( {
                user,
                catalogShort: 'MMI',
                version: mmiVersion
            } ) );

            if( err ) {
                Y.log( `could not clean any existing changelog for MMI version ${mmiVersion}: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                throw err;
            }

            Y.log( `cleaned any existing changelog for MMI version ${mmiVersion}: ${results}`, 'debug', NAME );

            Y.log( `create create change list for tenant ${user.tenantId}`, 'info', NAME );
            let catalogUsageModel;
            [err, catalogUsageModel] = await formatPromiseResult( getModelAsync( user, 'catalogusage', true ) );

            if( err ) {
                Y.log( `could not get catalog usage model: ${err.stack || err}`, 'warn', NAME );
                logExit( timer );
                throw err;
            }

            const cursor = catalogUsageModel.mongoose.find( {
                'seqId.actType': 'MEDICATION',
                $and: [
                    {phPZN: {$ne: null}},
                    {phPZN: {$ne: ''}},
                    {phNLabel: {$ne: null}},
                    {phNLabel: {$ne: ''}}
                ]
            } ).lean().cursor();

            logExit( timer );
            return cursor.eachAsync( medicationCatalogUsageEntry => processMedicationCatalogUsageEntry( {
                user,
                medicationCatalogUsageEntry,
                version: mmiVersion,
                location: locationBsnrMap[medicationCatalogUsageEntry.locationId.toString()]
            } ) );
        }

        function hasCustomCodeDataPerLocation( args ) {
            return Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'incaseconfiguration',
                action: 'get',
                query: {},
                options: {
                    limit: 1,
                    select: {
                        customCodeDataPerLocation: 1
                    }
                }
            } ).then( results => {
                return results[0] && results[0].customCodeDataPerLocation;
            } );
        }

        async function getChangeLogList( args ) {
            const {user, query, callback} = args;
            const pipeline = [];

            let [err, showPerLocation] = await formatPromiseResult( hasCustomCodeDataPerLocation( args ) );

            if( err ) {
                Y.log( `getChangeLogList: coult not get hasCustomCodeDataPerLocation: ${err.stack || err}`, 'warn', NAME );
            }

            if( query ) {
                pipeline.push( {$match: query} );
            }

            if( showPerLocation ) {
                pipeline.push( {
                    $group: {
                        _id: {
                            version: '$version',
                            catalogShort: '$catalogShort',
                            locname: '$locname',
                            locationId: '$locationId'
                        }
                    }
                } );
            } else {
                pipeline.push( {
                    $group: {
                        _id: {
                            version: '$version',
                            catalogShort: '$catalogShort'
                        }
                    }
                } );
            }

            pipeline.push( {
                $project: {
                    version: '$_id.version',
                    catalogShort: '$_id.catalogShort',
                    locname: '$_id.locname',
                    locationId: '$_id.locationId',
                    _id: 0
                }
            } );

            let results;
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'changelog',
                action: 'aggregate',
                pipeline
            } ) );

            if( err ) {
                Y.log( `could not get change log list: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            return handleResult( null, {showPerLocation, results: results.result}, callback );
        }

        async function getChangeLog( args ) {
            const {user, query, options = {}, callback} = args;
            let results;
            if( !query.version || !query.catalogShort ) {
                err = Y.doccirrus.errors.rest( 500, 'insufficient arguments', true );
                return handleResult( err, undefined, callback );
            }

            let [err, showPerLocation] = await formatPromiseResult( hasCustomCodeDataPerLocation( args ) );

            if( showPerLocation ) {
                if( !query.locationId ) {
                    err = Y.doccirrus.errors.rest( 500, 'insufficient arguments: missing locationId', true );
                    return handleResult( err, undefined, callback );
                }
                [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'changelog',
                    query,
                    options
                } ) );

                return handleResult( err, results, callback );
            }

            const pipeline = [
                {
                    $match: query
                },
                {
                    $group: {
                        _id: {
                            locationId: '$locationId'
                        },
                        entries: {$addToSet: '$$ROOT'}
                    }
                }
            ];

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'changelog',
                action: 'aggregate',
                pipeline
            } ) );

            if( err ) {
                Y.log( `getChangeLogL could not aggregate change log: ${err.stack || err}`, 'warn', NAME );
            }

            return handleResult( err, results.result && results.result[0] && results.result[0].entries || [], callback );
        }

        Y.namespace( 'doccirrus.api' ).changelog = {

            name: NAME,
            server: {
                createMMIChangeListForTenant,
                clean
            },
            getChangeLog,
            getChangeLogList
        };
    },
    '0.0.1', {
        requires: [
            'changelog-schema'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activity-schema',
            // 'compareutils',
            // 'dcerror',
            // 'dcmongodb',
            // 'mmi-api'
        ]
    }
);

