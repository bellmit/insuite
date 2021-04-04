/**
 * User: pi
 * Date: 03/09/2014  15:13
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jshint esnext:true */


YUI.add( 'catalog-api', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCCatalog
         */

        var {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            async = require( 'async' ),
            migrate = require( 'dc-core' ).migrate,
            Path = require( 'path' ),
            metaData,
            medicationCatalogMeta = require('./medicationscatalogmeta.json'),
            catalogsPath = Y.doccirrus.auth.getDirectories( 'catalogs' ),
            catalogMetaPath,
            gopCodeMap = new Map(),
            insuranceTypeToCatalogShort = {
                'PUBLIC': 'SDKT',
                'PRIVATE': 'PKV',
                'PUBLIC_A': 'SDKT',
                'PRIVATE_A': 'PKV',
                'BG': 'BG',
                'PRIVATE_CH': 'IVG_KVG_MVG_UVG_VVG',
                'PRIVATE_CH_IVG': 'IVG_KVG_MVG_UVG_VVG',
                'PRIVATE_CH_MVG': 'IVG_KVG_MVG_UVG_VVG',
                'PRIVATE_CH_UVG': 'IVG_KVG_MVG_UVG_VVG',
                'PRIVATE_CH_VVG': 'IVG_KVG_MVG_UVG_VVG'
            },
            SERVICE_INSPECTORAPO = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO,
            SERVICE_INSPECTORDOCSOLUI = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI,
            SERVICE_INSPECTORDOC = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC;

        const _ = require( 'lodash' ),
            moment = require( 'moment' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        /**
         * Loads and sets catalog meta data.
         * @param {Function} callback
         */
        function initCatalogService( callback ) {
            const
                cluster = require( 'cluster' ),
                async = require( 'async' );

            if( !catalogsPath && Y.doccirrus.auth.isDCPRC() ) {
                Y.log( 'DCPRC, skipping: Initialize catalog-api, add MMI descriptor', 'info', NAME );
                callback();
                return;

            } else if( '' === catalogsPath ) {
                // empty string is an error condition when not in DCPRC
                Y.log( 'Catalog directories not specified in auth.getDirectories()', 'error', NAME );
                console.error( 'Bad configuration: catalogs not specified. ' );     //  eslint-disable-line no-console
                process.exit( 44 );

            } else {
                Y.log( 'Initialize catalog-api, add MMI descriptor', 'warn', NAME );

            }

            catalogMetaPath = Path.join( catalogsPath, 'catalogmeta.json' );

            try {
                metaData = require( catalogMetaPath );
                Y.log( `catalogmeta initialised, got version ${metaData && metaData.version}`, 'info', NAME );
            } catch( err ) {
                console.error( `Can not load catalogmeta.json from ${catalogMetaPath} : ${err}` );   // eslint-disable-line no-console
                process.exit( 44 );
            }
            async.series( [
                function( next ) {
                    addMedicationsCatalog();
                    if( metaData ) {
                        addMMIDescriptor();

                        if( cluster.isMaster && !Y.doccirrus.auth.isPUC() ) {
                            // PUC only needs the catalog meta data to be set correctly
                            checkCatalogsVersion( next );
                        } else {
                            return setImmediate( next );
                        }
                    } else {
                        Y.log( 'Empty metadata.json in catalog init. Throwing error.', 'error', NAME );
                        // recursively retry after 1s
                        console.error( 'Empty metadata.json in catalog, cannot start.' );   // eslint-disable-line no-console
                        process.exit( 44 );
                    }
                },
                function( next ) {
                    updateGopList( next );
                },
                function( next ) {
                    updateTarmedGopList( next );
                }
            ], callback );

        }

        function updateGopList( callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                action: 'get',
                migrate: true,
                model: 'catalog',
                query: { seq: /000$/, "u_extra.sub_gop_liste.gnrs": { $exists: true }, "catalog": /^DC-EBM-D/ },
                options: { select: { seq: 1, "u_extra.sub_gop_liste.gnrs": 1 } }
            }, ( err, results = [] ) => {
                if( err ) {
                    Y.log( `updateGopList: catalog init could not get "sub gop list". Error: ${err.stack || err}`, 'warn', NAME );
                    return callback();
                }
                results.forEach( catalogCode => {
                    (catalogCode.u_extra.sub_gop_liste && catalogCode.u_extra.sub_gop_liste.gnrs || []).forEach( subCode => {
                        gopCodeMap.set( `EBM_${subCode.code}`, catalogCode );
                    } );
                } );
                callback();
            } );

        }

        async function updateTarmedGopList( callback ) {
            let [err, entries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                action: 'get',
                model: 'catalog',
                migrate: true,
                query: {
                    catalog: /DC-TARMED-CH-/,
                    seq: /^00\./,
                    "u_extra.ageRules": {$size: 1},
                    "title": /über 6 Jahren und unter 75 Jahre|unter 6 Jahren und Personen über 75 Jahre/
                },
                options: {
                    select: { seq: 1, title: 1, "u_extra.ageRules": 1 },
                    sort: { title: 1 }
                }
            } ) );
            if( err ) {
                Y.log( `updateTarmedGopList: catalog init could not get "sub gop list" entries. Error: ${err.stack || err}`, 'warn', NAME );
                return callback();
            }

            let ind = 0,
                now = new Date(),
                re = /Behandlungsbedarf/i;
            while( ind < entries.length ){
                let gnrs = [],
                    template = { u_extra: { sub_gop_liste: { gnrs } } };

                //we expect 3 entries in same area (title should start with same patern )
                if( entries[ ind ].title.substring(0, 10) !== entries[ ind + 1 ].title.substring(0, 10) ||
                    entries[ ind ].title.substring(0, 10) !== entries[ ind + 2 ].title.substring(0, 10) ){
                    Y.log( `updateTarmedGopList: wrong entries order in catalog ${entries[ ind ].seq}`, 'warn', NAME );
                    ind += 3;
                    continue;
                }

                for(let i=0; i<3; i++){
                    let entry = entries[ ind + i ] || {},
                        ageRule = entry.u_extra && entry.u_extra.ageRules && entry.u_extra.ageRules[0] || {};

                    if( ageRule.unit !== 'years' || ( ageRule.validUntil && ageRule.validUntil < now ) ){
                        Y.log( `updateTarmedGopList: not valid age validation in ${entry.seq} ${ageRule}`, 'warn', NAME );
                        continue;
                    }

                    if( ageRule.from < ageRule.until ){
                        gnrs.push({
                            "code": entry.seq,
                            "text": entry.title,
                            "treatmentNeeds": re.test( entry.title ),
                            "alter": [{
                                "value": ageRule.from.toString(),
                                "unit": "8",
                                "type": "MIN"
                            }, {
                                "value": ageRule.until.toString(),
                                "unit": "8",
                                "type": "MAX"
                            }]
                        } );
                    } else {
                        gnrs.push(
                            {
                                "code": entry.seq,
                                "text": entry.title,
                                "treatmentNeeds": "_all_",
                                "alter": [{
                                    "value": "0",
                                    "unit": "8",
                                    "type": "MIN"
                                }, {
                                    "value": ageRule.until.toString(),
                                    "unit": "8",
                                    "type": "MAX"
                                }]
                            }, {
                                "code": entry.seq,
                                "text": entry.title,
                                "treatmentNeeds": "_all_",
                                "alter": [{
                                    "value": ageRule.from.toString(),
                                    "unit": "8",
                                    "type": "MIN"
                                }, {
                                    "value": "250",
                                    "unit": "8",
                                    "type": "MAX"
                                }]
                            }
                        );
                    }
                }

                gopCodeMap.set( `TARMED_${entries[ind].seq}`, {seq: entries[ind].seq, ...template} );
                gopCodeMap.set( `TARMED_${entries[ind+1].seq}`, {seq: entries[ind+1].seq, ...template} );
                gopCodeMap.set( `TARMED_${entries[ind+2].seq}`, {seq: entries[ind+2].seq, ...template} );
                ind += 3;
            }

            callback();
        }

        function addMMIDescriptor() {
            if( !metaData ) {
                return;
            }

            metaData.KBVUTILITY.cat.push( {country: "D", short: "HMV", version: '', filename: 'HMV', extensible: false, virtual: true} );
            // add process for biotronik catalog, by copying MEASUREMENT
            if (metaData.MEASUREMENT) {
                if (!metaData.PROCESS) {
                    metaData.PROCESS = {
                        cat: []
                    };
                }
                metaData.PROCESS.cat.push( ...metaData.MEASUREMENT.cat );
            }
        }

        function addMedicationsCatalog() {
            if (!medicationCatalogMeta) {
                return;
            }

            if( !metaData.MEDICATION ) {
                metaData.MEDICATION = {
                    cat: []
                };
            }

            if( !Array.isArray( metaData.MEDICATION.cat ) ) {
                metaData.MEDICATION.cat = [];
            }

            metaData.MEDICATION.cat.push( {
                country: "D",
                short: "MMI",
                version: '',
                filename: "MMI",
                extensible: true,
                virtual: true
            });

            metaData.MEDICATION.cat.push( {
                country: "CH",
                short: medicationCatalogMeta.MEDICATION.catalogShort,
                version: '',
                filename:  medicationCatalogMeta.MEDICATION.filename,
                extensible: true,
                virtual: true
            });
        }

        async function getTreatmentCatalogCatalogDescriptor( user, catalogShort, locationId ) {
            const DCError = Y.doccirrus.commonerrors.DCError;
            let err, desc;
            switch( catalogShort ) {
                case 'EBM':
                    [err, desc] = await formatPromiseResult( getEBMDescriptorByLocationIdAsync( user, locationId ) );
                    if( err ) {
                        throw err;
                    }
                    break;
                case 'GOÄ':
                    desc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: 'GOÄ'
                    } );
                    break;
                case 'UVGOÄ':
                    desc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: 'UVGOÄ'
                    } );
                    break;
                case 'GebüH':
                    desc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: 'GebüH'
                    } );
                    break;
                default:
                    desc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: catalogShort
                    } );
                    if( !catalogShort || !desc ) {
                        throw DCError( 500, {message: `no catalog descriptor found for ${catalogShort} and locationId ${locationId}`} );
                    }
            }

            return desc;
        }

        async function updateCatalogUsageEntry( user, cuEntry ) {
            Y.log( `check catalogusage entry ${cuEntry.seq} (${cuEntry.catalogShort})`, 'info', NAME );

            if( !cuEntry || !cuEntry.locationId ) {
                let errMsg = 'location id missing: can not get kv';
                Y.log( errMsg, 'error', NAME );
                throw new Error( errMsg );
            }

            const SU = Y.doccirrus.auth.getSUForLocal();
            const defaultEBMDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'EBM'
            } );

            let err, desc, matchingCatalogEntries;

            [err, desc] = await formatPromiseResult( getTreatmentCatalogCatalogDescriptor( user, cuEntry.catalogShort, cuEntry.locationId ) );

            [err, matchingCatalogEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                migrate: true,
                query: {
                    catalog: desc.filename,
                    seq: cuEntry.seq
                }
            } ) );

            if( !matchingCatalogEntries || !matchingCatalogEntries.length ) {
                // delete catalogusage in case it was chosen from an catalog and seq is no more in new/current catalog
                if( cuEntry.catalog ) {
                    Y.log( `updateCatalogUsageEntry: remove catalogusage entry that was chosen from but is not in actual catalog anymore`, 'info', NAME );
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        migrate: true,
                        model: 'catalogusage',
                        action: 'delete',
                        query: {
                            _id: cuEntry._id
                        }
                    } ) );
                    if( err ) {
                        Y.log( `updateCatalogUsageEntry: could not delete old catalogusage entry ${cuEntry._id}: ${err.stack || err}`, 'error', NAME );
                    } else {
                        Y.log( `updateCatalogUsageEntry: deleted old catalogusage entry: ${cuEntry._id}`, 'info', NAME );
                    }
                }

                return;
            } else if( ['GOÄ', 'UVGOÄ', 'GebüH'].includes( cuEntry.catalogShort ) && !cuEntry.catalog ) {
                Y.log( `updateCatalogUsageEntry: do not update 'GOÄ', 'UVGOÄ', 'GebüH' catalogusage entries where catalog flag was overridden to false`, 'info', NAME );
                return;
            }

            Y.log( `update catalogusage entry ${cuEntry.seq} (${cuEntry.catalogShort})`, 'info', NAME );

            const catEntry = matchingCatalogEntries[0];

            cuEntry.catalog = true;
            // for EBM always set default global catalog filename like frontend does.
            cuEntry.catalogRef = cuEntry.catalogShort === 'EBM' ? defaultEBMDescriptor.filename : desc.filename;
            cuEntry.value = catEntry.value;
            cuEntry.unit = catEntry.unit;
            cuEntry.u_extra = catEntry.u_extra;
            cuEntry.title = catEntry.title;
            cuEntry.chapter = catEntry.l3 && catEntry.l3.seq;

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalogusage',
                action: 'put',
                query: {
                    _id: cuEntry._id
                },
                fields: Object.keys( cuEntry ),
                data: Y.doccirrus.filters.cleanDbObject( cuEntry )
            } ) );

            if( err ) {
                Y.log( `updateCatalogUsageEntry: could not update catalogusage entry ${cuEntry._id}: ${err.stack || err}`, 'error', NAME );
            } else {
                Y.log( `updateCatalogUsageEntry: updated catalogusage entry ${cuEntry._id}`, 'debug', NAME );
            }
        }

        async function updateCatalogusageForTenant( user ) {
            const
                getModel = require('util').promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `updateCatalogusageForTenant: ${user.tenantId}`, 'info' );

            let err, result, catalogUsageModel;

            [err, catalogUsageModel] = await formatPromiseResult( getModel( user, 'catalogusage', true ) );

            if( err ) {
                Y.log( `Error while getting 'catalogusage' model. Error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err, result] = await formatPromiseResult( catalogUsageModel.mongoose.find( {
                catalogShort: {$in: ['EBM', 'GOÄ', 'UVGOÄ']}
            }, {}, {lean: true} ).cursor().eachAsync( cuEntry => updateCatalogUsageEntry( user, cuEntry ).catch( err => {
                Y.log( `could not update catalog usage entry: ${err.stack || err}`, 'warn', NAME );
            }) ) );

            if( err ) {
                Y.log( `Error while updating 'catalogusage'. Error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return result;
        }

        function updateCatalogusage( callback ) {
            migrate.eachTenantParallelLimit( ( user, cb ) => {
                updateCatalogusageForTenant( user ).then( () => {
                    Y.log( `updated catalogusage on tenant ${user.tenantId}`, 'info', NAME );
                    cb();
                } ).catch( ( err ) => {
                    Y.log( `could not update catalogusage on tenant ${user.tenantId}`, 'error', NAME );
                    cb( err );
                } );
            }, 1, callback );
        }

        /**
         * Searches omim catalog for 'term' param by grouping by fieldName indicated by type param.
         *
         * @param   {Object}                args
         * @param   {Object}                args.user
         * @param   {Object}                args.originalParams
         * @param   {String}                args.originalParams.type             indicates which fieldName will be searched
         * @param   {String}                args.originalParams.term             search term
         * @param   {Function| Promise}    args.callback                        return promise if no callback provideds
         * @return {Promise<*>}
         */
        async function searchOmimCatalog( args ) {
            Y.log( 'Entering Y.doccirrus.api.catalog.searchOmimCatalog', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.catalog.searchOmimCatalog' );
            }

            const {originalParams, callback} = args;
            const SU = Y.doccirrus.auth.getSUForLocal();
            const catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'OMIM'
            } );
            let fieldName;

            switch( originalParams.type ) {
                case 'g':
                    fieldName = 'omimG';
                    break;
                case 'p':
                    fieldName = 'omimP';
                    break;
                case 'n':
                    fieldName = 'genName';
                    break;
                default:
                    fieldName = 'desc';
            }

            const pipeline = [
                {
                    $match: {
                        catalog: catalogDesc.filename,
                        key: {$exists: false}
                    }
                },
                {
                    $group: {
                        _id: `$${fieldName}`,
                        omimP: {$first: '$omimP'},
                        omimG: {$first: '$omimG'},
                        genName: {$first: '$genName'},
                        desc: {$first: '$desc'}
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                },
                {
                    $match: {
                        [fieldName]: {$regex: originalParams.term, $options: 'i'}
                    }
                },
                {
                    $limit: originalParams.itemsPerPage || 10
                }
            ];

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                action: 'aggregate',
                pipeline,
                model: 'catalog'
            } ) );

            if( err ) {
                Y.log( `could not search omim catalog with term ${originalParams.term}`, 'warn', NAME );
            }

            return handleResult( err, result.result, callback );
        }

        function checkOmimChains() {
            Y.log( 'checkOmimChains', 'debug', NAME );

            const
                async = require( 'async' ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'OMIM'
                } );

            function finalCb( err ) {
                if( err ) {
                    Y.log( 'error checking omim chains', 'error', NAME );
                } else {
                    Y.log( 'successfully checking omim chains', 'debug', NAME );
                }
            }

            function checkTenant( user, callback ) {

                Y.log( 'check omim chains for tenant ' + user.tenantId, 'debug', NAME );

                function modelCb( err, omimChainModel ) {
                    var
                        omimChainStream;

                    function onStreamData( omimChain ) {
                        Y.log( 'Processing next omim chain from stream: ' + omimChain._id, 'debug', NAME );

                        omimChainStream.pause();

                        function omimChainChecked( err ) {
                            if( err ) {
                                Y.log( 'could not check omim chain: ' + err, 'error', NAME );
                            }
                            omimChainStream.resume();
                        }

                        function filteredItemsCb( results ) {

                            if( omimChain.chain.length === results.length ) {
                                omimChainChecked();
                                return;
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'omimchain',
                                action: 'put',
                                query: {
                                    _id: omimChain._id
                                },
                                data: {
                                    chain: results,
                                    skipcheck_: true
                                },
                                fields: ['chain'],
                                callback: omimChainChecked
                            } );
                        }

                        function checkChainItem( omimChainItem, cb ) {

                            function catalogCb( err, entries ) {
                                if( err ) {
                                    Y.log( 'could not get catalog entries for omim chain check: ' + err, 'error', NAME );
                                    cb( true );
                                    return;
                                }

                                cb( 0 < entries.length );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: SU,
                                model: 'catalog',
                                query: {
                                    omimG: omimChainItem.omimG,
                                    omimP: omimChainItem.omimP,
                                    catalog: catalogDesc.catalog
                                },
                                callback: catalogCb
                            } );
                        }

                        async.filter( omimChain.chain, checkChainItem, filteredItemsCb );
                    }

                    function onStreamEnd() {
                        Y.log( 'finished omim chain check on catalog update', 'debug', NAME );
                        callback();
                    }

                    function onStreamError( err ) {
                        Y.log( 'error occurred on omim chain check on catalog update: ' + err, 'debug', NAME );
                    }

                    if( err ) {
                        Y.log( 'could not get omim chain model to check chains on catalog update', 'error', NAME );
                        return;
                    }

                    omimChainStream = omimChainModel.mongoose.find( {}, {}, {timeout: true} ).stream();
                    omimChainStream
                        .on( 'data', onStreamData )
                        .on( 'error', onStreamError )
                        .on( 'end', onStreamEnd );
                }

                Y.doccirrus.mongodb.getModel( user, 'omimchain', true, modelCb );
            }

            migrate.eachTenantParallelLimit( checkTenant, 1, finalCb );
        }

        function checkCatalogsVersion( callback ) {
            var admins,
                maxRetries = 5,
                waitFor = 10000,
                retries = 1,
                user = Y.doccirrus.auth.getSUForLocal();

            Y.log( 'check catalog version', 'debug', NAME );

            async function adminCb( err ) {
                var admin;

                function restoreFinished( err ) {
                    if( err ) {
                        Y.log( 'catalog restore finished with error: ' + JSON.stringify( err ), 'error', NAME );
                        if( maxRetries <= retries ) {
                            Y.log( 'catalog restore failed ' + maxRetries + ' times - terminating process...', 'error', NAME );
                            process.exit( 44 );
                        } else {
                            Y.log( 'catalog restore failed ' + retries + ' times - try again in ' + waitFor + ' ms', 'error', NAME );
                            retries++;
                            setTimeout( function() {
                                adminCb( null );
                            }, waitFor );
                        }
                    } else {
                        Y.log( 'catalog restore finished and version was updated', 'debug', NAME );
                        return callback();
                    }
                }

                function adminSavedCb( err ) {
                    if( err ) {
                        Y.log( 'can not save new catalog version ' + err, 'error', NAME );
                        restoreFinished( err );
                        return;
                    }
                    Y.log( 'successfully restored indexed catalogs', 'info', NAME );
                    updateCatalogusage( restoreFinished );
                    checkOmimChains();
                    invalidateKbvUtility();
                    invalidateNonStandardOfficialNos();
                    Y.doccirrus.api.kbvutilityprice.invalidatePrices();
                }

                function setNewCatalogVersion() {
                    admin.catalogsVersion = metaData.version;

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'admin',
                        action: 'put',
                        query: {
                            _id: admin._id
                        },
                        fields: Object.keys(admin),
                        data: Y.doccirrus.filters.cleanDbObject(admin)
                    }, adminSavedCb);
                }

                async function verifyCatalogEntryCount( count ) {

                    function countIsOKCb() {
                        Y.doccirrus.mongoutils.restore( 'catalogviewerindexes', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, 'catalogviewerindexes.bson' ), catalogViewerIndexesRestoredCb );

                        function catalogViewerIndexesRestoredCb( err ) {
                            if(err){
                                Y.log( `catalogViewerIndexesRestoredCb: could not restore catalogviewerindexes: ${err}`, 'error', NAME );
                                restoreFinished(err);
                            } else {
                                Y.doccirrus.mongoutils.restore( 'opscodes', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, 'opscodes.bson' ), opsCodesRestoredCb );
                            }
                        }
                        function opsCodesRestoredCb( err ) {
                            if( err ) {
                                Y.log( `opsCodesRestoredCb: could not restore opscodes: ${err}`, 'error', NAME );
                                restoreFinished( err );
                            } else {
                                Y.doccirrus.mongoutils.restore( 'medicationscatalogs', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, 'medicationscatalogs.bson' ), medicationsCatalogRestoredCb );
                            }
                        }

                        function medicationsCatalogRestoredCb( err) {
                            if ( err ) {
                                Y.log( `medicationCatalogRestoredCb: could not restore medicationscatalogs: ${err.stack || err}`, 'error', NAME );
                                restoreFinished( err );
                            } else {
                                Y.doccirrus.mongoutils.restore( 'cdscodes', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, 'cdscodes.bson' ), cdsCodesRestoredCb );
                            }
                        }

                        function cdsCodesRestoredCb( err) {
                            if ( err ) {
                                Y.log( `cdsCodesRestoredCb: could not restore cdsCodes: ${err.stack || err}`, 'error', NAME );
                                restoreFinished( err );
                            } else {
                                Y.doccirrus.mongoutils.restore( 'fhir_codesystems', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, 'fhir_codesystems.bson' ), fhir_codesystemsRestoredCb );
                            }
                        }

                        function fhir_codesystemsRestoredCb( err ) {
                            if( err ) {
                                Y.log( `fhir_codesystemsRestoredCb: could not restore fhir_codesystems: ${err}`, 'error', NAME );
                                restoreFinished( err );
                            } else {
                                setNewCatalogVersion();
                            }
                        }
                    }

                    function checkCount( err, actualCount ) {
                        if( err ) {
                            restoreFinished( err );
                        } else {
                            if( count === actualCount ) {
                                countIsOKCb();
                            } else {
                                Y.log( 'could not verify catalog entry count expected ' + count + ' but found ' + actualCount, 'error', NAME );
                                process.exit( 44 );
                            }
                        }
                    }

                    let [err, catalogModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                            Y.doccirrus.mongodb.getModel(
                                user,
                                'catalog',
                                ( err, result ) => err ? reject( err ) : resolve( result )
                            );
                        } )
                    );

                    if( err ) {
                        Y.log( `Error getting catalog collection model. Error:\n${err.stack || err}`, "error", NAME );
                        return restoreFinished( err );
                    }

                    catalogModel.mongoose.collection.count( {catalogExtension: {$ne: true}}, checkCount );

                }

                // called when restore is finished
                function restoredCb( err ) {
                    if( err ) {
                        Y.log( 'can not restore index catalogs ' + err, 'error', NAME );
                        restoreFinished( err );
                        return;
                    }

                    if( 0 === metaData.count || metaData.count ) {
                        Y.log( 'catalogmeta has a count so verify...', 'debug', NAME );
                        verifyCatalogEntryCount( metaData.count );
                    } else {
                        // old catalog dumps before Q2 do not have a count property to verify
                        setNewCatalogVersion();
                    }
                }

                if( err || !admins.length ) {
                    err = err ? err : 'No Admin Doc Found';
                    Y.log( 'checkCatalogsVersion error ' + JSON.stringify( err ), 'error', NAME );
                    restoreFinished( err );
                    return;
                }
                admin = admins[0];
                Y.log( `Catalog version check: DB ${admin.catalogsVersion}  /   CatalogMeta ${metaData.version}`, 'info', NAME );
                if( admin.catalogsVersion !== metaData.version ) {
                    let err, catalogModel;
                    Y.log( 'outdated catalog version, restore new catalog dump', 'info', NAME );

                    [err, catalogModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                            Y.doccirrus.mongodb.getModel(
                                user,
                                'catalog',
                                true,
                                ( err, result ) => err ? reject( err ) : resolve( result )
                            );
                        } )
                    );

                    if( err ) {
                        Y.log( `Error getting catalog collection model. Error:\n${err.stack || err}`, "error", NAME );
                        return restoreFinished( err );
                    }

                    [err] = await formatPromiseResult(
                        catalogModel.mongoose.collection.remove( {catalogExtension: {$ne: true}} )
                    );

                    if( err ) {
                        Y.log( `Error removing catalog entries. Error:\n${err.stack || err}`, "error", NAME );
                        return restoreFinished( err );
                    }

                    Y.doccirrus.mongoutils.restore( 'catalogs', '0', '0', Path.join( catalogsPath, metaData.dumpCollectionName, metaData.dumpCollectionName + '.bson' ), restoredCb, true );
                } else {
                    return callback();
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                migrate: true,
                model: 'admin',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                },
                callback: function( err, _admins ) {
                    admins = _admins;
                    adminCb( err );
                }
            } );
        }

        /**
         * Returns the local path to the directory where catalogs are stored.
         * Directory is stored in package.json.
         * @returns {string}
         */
        function getCatalogsPath() {
            return catalogsPath;
        }

        /**
         * If no options are specified metaData is returned. metaData can be filtered by
         * passing an options object.
         *
         * @param {object} [options]
         * @param {object} [options.actType]
         * @param {object} [options.country]
         * @param {object} [options.short]
         * @param {boolean} [strict=false] - every option must match if true
         * @returns {*}
         */
        function getCatalogDescriptors( options, strict ) {
            var allCatalogs = metaData,
                result = {};

            options = options || {};

            function searchActType( actType ) {
                var actTypeCat = allCatalogs[actType],
                    catalogs;
                if( !actTypeCat || !actTypeCat.cat ) {
                    return;
                }

                catalogs = Y.doccirrus.commonutils.filterByCriteria( actTypeCat.cat, options, {
                    pass: strict ? 'every' : 'some',
                    blacklist: ['actType']
                } );

                if( catalogs && catalogs.length ) {
                    result[actType] = {
                        cat: catalogs,
                        name: actTypeCat.name
                    };
                }
            }

            // do not modify original catalog descriptors
            allCatalogs = _.cloneDeep( allCatalogs );

            let
                user = Y.doccirrus.auth.getSUForLocal(),
                AUTH_AMTS = Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORAPO ) || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORDOC ) || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORDOCSOLUI );

            // do not return ATMS catalog if licenses are not ON.
            if( !AUTH_AMTS && allCatalogs.TREATMENT && Array.isArray( allCatalogs.TREATMENT.cat ) ) {
                allCatalogs.TREATMENT.cat = allCatalogs.TREATMENT.cat.filter( function( entry ) {
                    return entry.short !== 'AMTS';
                } );
            }

            if( 'object' !== typeof options ) {
                return allCatalogs;
            }

            if( options.actType ) {
                searchActType( options.actType );
            } else {
                Y.Object.each( allCatalogs, function( val, key ) {
                    searchActType( key );
                } );
            }

            return result;
        }

        /**
         * Same as getCatalogDescriptors, but returns only one catalog and actType is mandatory.
         *
         * @param {object} options
         * @param {object} options.actType
         * @param {object} [options.country]
         * @param {object} [options.short]
         * @param {boolean} [strict=false] - every option must match if true
         * @returns {*}
         */
        function getCatalogDescriptor( options, strict ) {
            var desc;
            desc = getCatalogDescriptors( options, strict );
            if( !options.actType ) {
                return;
            }
            if( desc[options.actType] && desc[options.actType].cat && desc[options.actType].cat[0] ) {
                return desc[options.actType].cat[0];
            }
        }

        /**
         * Returns all catalog descriptors the frontend needs to know.
         * At the moment we hide all kv specific EBM-Catalogs (851).
         * @param  {Object}            options
         * @param  {Boolean}           strict
         * @returns {*}
         */
        function getFrontendCatalogDescriptors( options, strict ) {
            let
                descriptors = getCatalogDescriptors( options, strict ),
                user = Y.doccirrus.auth.getSUForLocal(),
                AUTH_AMTS = Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORAPO ) || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORDOC ) || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, SERVICE_INSPECTORDOCSOLUI );

            // do not modify original catalog descriptors
            descriptors = Y.clone( descriptors, true );
            if( descriptors.TREATMENT && descriptors.TREATMENT.cat ) {
                descriptors.TREATMENT.cat = Y.Array.filter( descriptors.TREATMENT.cat, function( entry ) {
                    if ( !AUTH_AMTS && entry.short === 'AMTS' ) {
                        return false;
                    }
                    // eg. only allow 'EBM' not 'EBM20'
                    // also omit HMV low level catalogs
                    if( (-1 !== entry.short.indexOf( 'EBM' ) && 3 < entry.short.length) || 'SDHM' === entry.short || 'SDHMA' === entry.short ) {
                        return false;
                    } else {
                        return true;
                    }
                } );
            }

            if( descriptors.UTILITY && descriptors.UTILITY.cat ) {
                descriptors.UTILITY.cat = Y.Array.filter( descriptors.UTILITY.cat, function( entry ) {
                    // eg. only allow 'EBM' not 'EBM20'
                    return 'PHYSIOITEMS' !== entry.short && 'ERGOITEMS' !== entry.short;
                } );
            }

            return descriptors;
        }

        /**
         * Returns default or custom parser for the specified catalog name.
         * @param {string} catName
         * @returns {Object} Parser
         */
        function getParserForCatalogName( catName ) {
            var catalogDescriptors = getCatalogDescriptors(),
                parser;

            Y.Object.each( catalogDescriptors, function( val ) {
                if( !val.cat ) {
                    return;
                }
                val.cat.some( function( cat ) {
                    if( cat.filename === catName ) {
                        if( 'GebüH' === cat.short ) {
                            // force default parser for GebüH catalog
                            parser = Y.doccirrus.catalogparser.default;
                        } else {
                            parser = Y.doccirrus.catalogparser[cat.parser || 'default'];
                        }
                        return true;
                    }
                } );
            } );
            return parser;
        }

        /**
         * Get descriptor for catalog file name
         * @param {string} catName
         * @returns {*}
         */
        function getCatalogDescriptorForName( catName ) {
            var catalogDescriptors = getCatalogDescriptors();
            var catalog = null;
            Y.Object.each( catalogDescriptors, function( val, key ) {
                if( !val.cat ) {
                    return;
                }
                val.cat.some( function( cat ) {
                    if( cat.filename === catName ) {
                        catalog = cat;
                        catalog.actType = key;
                        return true;
                    }
                } );
            } );
            return catalog;
        }

        /**
         * REST call to search current catalogs.
         * Read dccatalogindex for further information.
         *
         * @method  catsearch
         * @param   {Object}            args
         */
        function catsearch( args ) {
            var
                callback = args.callback,
                params = {
                    rest: {
                        originalparams: args.originalParams,
                        options: args.options,
                        user: args.user,
                        query: args.query,
                        model: args.model,
                        action: args.action,
                        method: args.method,
                        data: args.data,
                        originalfiles: args.originalfiles
                    }
                };
            // with paging parser throws a error
            params.rest.options.paging = undefined;

            Y.doccirrus.catalogindex.search( params, callback );
        }

        /**
         * Get kv specific EBM catalog (851) by locationId
         * @param   {Object}            args
         */
        function getEBMDescriptorByLocationId( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getEBMDescriptorByLocationId', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getEBMDescriptorByLocationId');
            }
            var catalog,
                user = args.user,
                locationId = args.originalParams.locationId,
                callback = args.callback;

            function kvCb( err, kv ) {
                if( err ) {
                    Y.log( 'Error getting kv from locationId for EBM(851)' );
                    callback( err );
                    return;
                }
                kv = ('string' === typeof kv ? kv : '');
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM' + kv
                } );
                callback( null, catalog );
            }

            Y.doccirrus.api.kbv.kvFromLocationId( {
                user: user,
                originalParams: {
                    locationId: locationId
                },
                callback: kvCb
            } );
        }

        function getEBMDescriptorByLocationIdAsync( user, locationId ) {
            return new Promise( ( resolve, reject ) => {
                getEBMDescriptorByLocationId( {
                    user: user,
                    originalParams: {
                        locationId: locationId
                    },
                    callback: function( err, desc ) {
                        if( err ) {
                            reject( err );
                            return;
                        }
                        resolve( desc );
                    }
                } );
            } );
        }

        /**
         * REST call to check if a KT (from card) is valid. If not try to find a responsible KT through 'fusion' process.
         * This means we search a valid KT in case the attribute existenzbeendigung_vk is given.
         * If no valid KT is found, the card is invalid and false is returned.
         *
         * REST-Paramter:
         *  catalog: name of the catalog (required)
         *  ik: iknr number (required)
         *  ktab: ktab id (required)
         *  lq: Leistungs Quartal  (optional)
         *  lqFormat: Format to parse lq (default JSON date, optional)
         *
         * @method verifyKT
         * @param   {Object}            args
         *
         * @return {Function}           {callback}
         */
        function verifyKT( args ) {
            var
                callback = args.callback,
                restUser = args.user,
                user = Y.doccirrus.auth.getSUForLocal(),
                params = args.originalParams,
                cat = params.catalog,
                ik = params.ik,
                vk = params.vk,
                lq,
                ktab = params.ktab,
                kv,
                originalKT,
                ktIsFused = false;

            if( params.lq && params.lqFormat ) {
                lq = moment( params.lq, params.lqFormat );
            } else if( params.lq ) {
                lq = moment( params.lq );
            } else {
                lq = moment();
            }

            if( !cat || !ik || !ktab ) {
                return callback( new Error( 'Wrong params' ) );
            }

            function getResponse( code, data ) {
                var res = {},
                    status = [
                        {msg: 'Unbekannter Fehler'},                                                                                                  // 0
                        {msg: 'Erfolgreich'},                                                                                                         // 1
                        {code: '3004'},                                                                                                               // 2
                        {code: '3005'},                                                                                                               // 3
                        {code: '3006'},                                                                                                               // 4
                        {code: '3007'},                                                                                                               // 5
                        {code: '3008'},                                                                                                               // 6
                        {code: '3009'},                                                                                                               // 7
                        {code: '3010'},                                                                                                               // 8
                        {code: '3013'},                                                                                                                // 9
                        {code: '3014'}                                                                                                                // 10
                    ];
                res.status = status[code];
                if( !res.status ) {
                    res = status[0];
                }
                if( !res.code ) {
                    res.code = code;
                }
                res.ktIsFused = ktIsFused;
                res.data = data || null;
                return res;
            }

            function isValid( from, to ) {
                return (lq.isAfter( from ) && lq.isBefore( to ));
            }

            // check ik and ktab
            function checkKTABAndIKNR( kt ) {

                if( ktIsFused ) {
                    kt = JSON.parse( JSON.stringify( kt ) );
                    kt.fusedFrom = originalKT.vknr;
                    kt.fusedToInsuranceId = kt.iknr;
                    kt.iknr = originalKT.iknr;
                    kt.ik_gueltigkeit_start = originalKT.ik_gueltigkeit_start;
                    kt.ik_gueltigkeit_end = originalKT.ik_gueltigkeit_end;
                    kt.fused = ktIsFused;
                } else {
                    kt = originalKT;
                }

                // is ktab closed?
                if( kt.ktab_gueltigkeit_end && lq.isAfter( kt.ktab_gueltigkeit_end ) ) {
                    // if ktab is closed and kt is fused, just callback back with closed kt
                    if( ktIsFused ) {
                        callback( null, getResponse( 3 ) );
                        return;
                    }
                    callback( null, getResponse( 7 ) );
                    return;
                }
                // is ktab not yet valid?
                if( kt.ktab_gueltigkeit_start && lq.isBefore( kt.ktab_gueltigkeit_start ) ) {
                    // if ktab is no yet valid and kt is fused, just callback back with closed kt
                    if( ktIsFused ) {
                        callback( null, getResponse( 3 ) );
                        return;
                    }
                    callback( null, getResponse( 8 ) );
                    return;
                }
                // is ik closed?
                if( kt.ik_gueltigkeit_end && lq.isAfter( kt.ik_gueltigkeit_end ) ) {
                    callback( null, getResponse( 5, [kt] ) );
                    return;
                }
                // is ik not yet valid?
                if( kt.ik_gueltigkeit_start && lq.isBefore( kt.ik_gueltigkeit_start ) ) {
                    callback( null, getResponse( 6 ) );
                    return;
                }

                callback( null, getResponse( 1, [kt] ) );

            }

            function kvAllowed( kt ) {
                var passed;
                if( !Array.isArray( kt.unzkv ) ) {
                    return true;
                }
                passed = kt.unzkv.some( function( notAllowedKv ) {
                    return kv === notAllowedKv;
                } );
                return !passed;
            }

            function getKT( _ik, _ktab, _vk ) {

                function handleKT( err, data ) {
                    var kt;
                    if( err ) {
                        callback( err );
                        return;
                    }
                    if( !data || !data[0] ) {
                        callback( null, getResponse( 2 ) );
                        return;
                    }
                    kt = data[0];

                    if( !ktIsFused ) {
                        // store original KT
                        originalKT = JSON.parse( JSON.stringify( kt ) );
                    }

                    if( !kvAllowed( kt ) ) {
                        callback( null, getResponse( 10 ) );
                        return;
                    }

                    // check if kt is valid or if last invoice quarter is before lq
                    if( isValid( kt.kt_gueltigkeit_start, kt.kt_gueltigkeit_end ) ||
                        ( kt.existenzbeendigung_q && lq.isAfter( moment( kt.kt_gueltigkeit_start ) ) && lq.isBefore( moment( kt.existenzbeendigung_q, 'YYYYQ' ) ) ) ) {
                        checkKTABAndIKNR( kt );
                        return;
                    }

                    // check if kt is closed, do fusion, if there is a kt to fuse
                    if( lq.isAfter( kt.kt_gueltigkeit_end ) ) {
                        if( !kt.existenzbeendigung_vk ) {
                            return callback( null, getResponse( 3 ) );
                        }
                        // do fusion
                        ktIsFused = true;
                        getKT( undefined, ktab, kt.existenzbeendigung_vk );
                        return;
                    }

                    // check if kt is not yet valid
                    if( lq.isBefore( kt.kt_gueltigkeit_start ) ) {
                        callback( null, getResponse( 4 ) );
                        return;
                    }

                }

                var query = {
                    catalog: cat,
                    key: {$exists: false}
                };

                if( _ik ) {
                    query.iknr = _ik;
                }
                if( _vk ) {
                    query.vknr = _vk;
                }
                if( _ktab ) {
                    query.ktab = _ktab;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalog',
                    query: query
                }, handleKT );
            }

            function kvCb( err, _kv ) {
                if( err ) {
                    callback( err );
                    return;
                }
                kv = _kv;
                getKT( ik, ktab, vk );
            }

            function locationCb( err, location ) {
                if( err || !location[0] ) {
                    callback( err || 'Location Not Found' );
                    return;
                }
                Y.doccirrus.utils.getKvFromLocation( restUser, location[0], kvCb );
            }

            Y.doccirrus.mongodb.runDb( {
                user: restUser,
                model: 'location',
                query: {
                    _id: Y.doccirrus.schemas.location.getMainLocationId()
                }
            }, locationCb );
        }

        function getPKVKT( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getPKVKT', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getPKVKT');
            }
            var callback = args.callback,
                params = args.originalParams,
                catalog, query;

            if( !params.name ) {
                return callback( null, [] );
            }

            catalog = getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'PKV'
            } );
            query = {
                catalog: catalog.filename,
                key: {$exists: false},
                suchname: {
                    $regex: params.name,
                    $options: 'i'
                }
            };

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: query
            }, callback );
        }

        /**
         * Searches for given term in given catalogs seq field. If limit is not reached after first search, the gap will
         * be filled with another search with the same term in title or info fields.
         *
         * @param   {Object}            args
         * @param   {String}            args.params.term
         * @param   {Array}             args.params.catalogs
         * @param   {Number}            args.params.limit
         * @param   {Object}            args.params.fields
         * @param   {Function}          args.callback
         */
        function searchCatalogs( args ) {
            var user = Y.doccirrus.auth.getSUForLocal(),
                params = args.params,
                callback = args.callback,
                options = {
                    limit: params.limit,
                    sort: {
                        unifiedSeq: 1,
                        seq: 1
                    },
                    lean: true,
                    fields: params.fields
                },
                limit = options.limit || 10,
                regExStr;

            function get( _query, _options, _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalog',
                    query: _query,
                    options: _options
                }, _cb );
            }

            function seqCb( err, seqEntries, skipTitleQuery ) {
                var exisitingSeqs;

                function finalCb( err, finalEntries ) {
                    if( err ) {
                        return callback( err );
                    }
                    if(finalEntries && Array.isArray(finalEntries)) {
                        return callback( null, seqEntries.concat( finalEntries ) );
                    }
                    callback( null, seqEntries );
                }

                if( err ) {
                    return callback( err );
                }

                if( seqEntries.length >= limit ) {
                    return callback( null, seqEntries );
                }

                options.limit = limit - seqEntries.length;
                exisitingSeqs = seqEntries.map( function( entry ) {
                    return entry.seq;
                } );

                if(!skipTitleQuery) {
                    let titleQuery = {
                        $and: [
                            {seq: {$nin: exisitingSeqs}},
                            {$or: params.catalogs},
                            {seq: {$exists: true}},
                            {title: {$regex: buildSearchRegExStr(params.term), $options: 'i'}}
                        ]
                    };

                    if( params.asvSpecializations ) {
                        titleQuery.$and.push( {'u_extra.asvQualifications': {$in: params.asvSpecializations}} );
                    }
                    if( params.catalogDate ){
                        titleQuery.$and.push( {'start': { $lte: params.catalogDate }} );
                        titleQuery.$and.push( {'end': { $gt: params.catalogDate }} );
                    }

                    get( titleQuery, options, (titleError, titleEntriesArr) => {
                        if( titleError ) {
                            return callback( titleError );
                        } else if(titleEntriesArr && Array.isArray(titleEntriesArr)) {
                            seqCb(null, seqEntries.concat( titleEntriesArr ), true );
                        } else {
                            seqCb(null, seqEntries, true);
                        }
                    } );
                    return;
                }

                regExStr = buildSearchRegExStr(params.term);

                let query = {
                    $and: [

                        {seq: {$nin: exisitingSeqs}},
                        {$or: params.catalogs},
                        {seq: {$exists: true}},
                        {
                            $or: [
                                {messages: {$regex: regExStr, $options: 'i'}},
                                {infos: {$regex: regExStr, $options: 'i'}}
                            ]
                        },
                        {$or: [
                            { validUntil: null},
                            { validUntil: { $exists: false}}
                        ]}
                    ]
                };
                if( params.asvSpecializations ) {
                    query.$and.push( {'u_extra.asvQualifications': {$in: params.asvSpecializations}} );
                }
                if( params.catalogDate ){
                    query.$and.push( {'start': { $lte: params.catalogDate }} );
                    query.$and.push( {'end': { $gt: params.catalogDate }} );
                }

                get( query, options, finalCb );
            }

            let query = {
                $and: [
                    {$or: params.catalogs},
                    {seq: {$exists: true}},
                    {seq: {$regex: '^' + params.term, $options: 'i'}},
                    {$or: [
                        { validUntil: null},
                        { validUntil: { $exists: false}}
                    ]}
                ]
            };

            if( params.asvSpecializations ) {
                query.$and.push( {'u_extra.asvQualifications': {$in: params.asvSpecializations}} );
            }
            if( params.catalogDate ){
                query.$and.push( {'start': { $lte: params.catalogDate }} );
                query.$and.push( {'end': { $gt: params.catalogDate }} );
            }
            get( query, options, seqCb );
        }

       /*
       * we want to search whatever user types. So the way we are doing it here is as below:
       * If user types "str1 str2" then we are converting it to RegExp string: "(?=.*str1)(?=.*str2)"
       * This regexp makes sure that str1 AND str2 are included in the search results IRRESPECTIVE of the
       * ordering i.e the order in which user types does not matter. It will be made sure that the searched result will
       * have all the words user has typed. Credit [https://stackoverflow.com/questions/5176384/regexp-logic-and-or]
       * */
        function buildSearchRegExStr(term) {
            return "^(?=.*"+term.trim().split(" ").join(")(?=.*")+")";
        }

        /**
         * @method catalogCodeSearch
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.term query string('code' or 'content')
         * @param {String} args.query.locationId location Id to get catalog to search
         * @param {Array} args.query.tags location Id to get catalog to search
         * @param {Array} args.query.catalogs list of catalogs to search
         * @param {Boolean} args.query.reduceData if true, returns reduced set of data for entry
         * @param {Object} [args.originalParams] original rest params
         * @param {Number} [args.originalParams.itemsPerPage=10] the items limit
         * @param {Function} args.callback
         * @returns {*}
         */
        async function catalogCodeSearch( args ) {
            var queryParams = args.query || {},
                itemsPerPage = args.originalParams.itemsPerPage || 10,
                isASV = true === args.originalParams.isASV,
                noCatalogUsage = queryParams.noCatalogUsage,
                catalogDate = queryParams.catalogDate,
                asvSpecializations = null,
                async = require( 'async' ),
                locationId = queryParams.locationId,
                employeeId = queryParams.employeeId,
                tags = queryParams.tags || [],
                titleQuery,
                catalogs = [],
                takeFromCatalogEntry = ['value, unit', 'u_extra', 'catalog', 'catalogEntry', 'messages'],
                isTarmed = queryParams.catalogs ? queryParams.catalogs.filter( catalog => Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.includes( catalog.short ) ).length > 0 : undefined,
                regExStr;

            regExStr = buildSearchRegExStr( queryParams.term );

            try{
                titleQuery = [
                    {
                        title: {
                            $regex: regExStr,
                            $options: 'i'
                        }
                    },
                    {
                        infos: {
                            $in: [new RegExp( queryParams.term, 'i' )]
                        }
                    }
                ];
            } catch(err) {
                Y.log( 'catalogCodeSearch: Cannot build regex because of invalid user input', 'error', NAME );
                return args.callback( err );
            }

            function setFields( hausecatalog ) {
                var result = {
                    seq: 1,
                    title: 1,
                    catalog: 1,
                    catalogShort: 1
                };
                if( queryParams.reduceData ) {
                    result.count = 1;
                    return result;
                }
                if( hausecatalog ) {
                    return {};
                }
                result.u_extra = 1;
                result.infos = 1;
                result.value = 1;
                result.unit = 1;
                result.pkv1 = 1;
                result.pkv2 = 1;
                result.beihilfe = 1;
                result.postb = 1;
                result.gesetzlich = 1;
                result.getsetzlichkl = 1;
                result.l1 = 1;
                result.l2 = 1;
                result.l3 = 1;
                result.messages = 1;
                result.areTreatmentDiagnosesBillable = 1;

                // CH
                result.treatmentCategory = 1;
                result.divisionText = 1;
                result.divisionCode = 1;
                result.anaesthesiaCode = 1;
                result.anaesthesiaText = 1;
                result.medicalText = 1;
                result.technicalText = 1;
                result.taxPoints = 1;
                result.medicalTaxPoints = 1;
                result.technicalTaxPoints = 1;
                result.assistanceTaxPoints = 1;
                result.medicalScalingFactor = 1;
                result.technicalScalingFactor = 1;
                result.treatmentTime = 1;
                result.preparationAndFollowUpTime = 1;
                result.reportTime = 1;
                result.roomOccupancyTime = 1;
                result.rotationTime = 1;
                result.assistanceQuantity = 1;
                result.benefitsCode = 1;
                result.benefitsText = 1;
                result.sideMandatory = 1;

                return result;
            }

            function mergeCatalogEntries( catalogEntries, catalogusageEntries, instockEntries = [] ) {
                var lookup = {},
                    catalogMap = {};

                catalogs.forEach( function( data ) {
                    catalogMap[data.catalog] = data.short;
                } );

                catalogusageEntries.forEach( function( record ) {
                    record.customEntry = !Boolean(record.catalog);
                    record.catalogEntry = Boolean(record.catalog);
                    lookup[record.seq] = record;
                } );

                instockEntries.forEach( function( record ) {
                    record.catalogEntry = false;
                    record.customEntry = false;
                    record.instockEntry = true;

                    if( !lookup[record.seq] ) {
                        catalogusageEntries.push( record );
                        lookup[record.seq] = record;
                    } else {
                        lookup[record.seq].instockEntry = true;
                    }
                } );

                catalogEntries.forEach( function( record ) {
                    let
                        catalogShort = catalogMap[record.catalog];
                    record.catalogShort = catalogShort;
                    record.catalogEntry = true;
                    record.customEntry = false;

                    if( !lookup[record.seq] ) {
                        catalogusageEntries.push( record );
                    } else {
                        lookup[record.seq].catalogEntry = true;
                        /**
                         * keep important props up-to-date
                         */
                        if( 'GOÄ' === catalogShort || 'UVGOÄ' === catalogShort || 'EBM' === catalogShort ) {
                            for( let prop of takeFromCatalogEntry ) {
                                if( prop === 'catalog' ) {
                                    lookup.catalogRef = record[prop];
                                } else {
                                    lookup[record.seq][prop] = record[prop];
                                }
                            }
                        }
                    }

                } );
                catalogusageEntries = catalogusageEntries.slice( 0, itemsPerPage );
                return catalogusageEntries;
            }

            function _catalogusageEntries( done ) {
                var orCatalogs = [],
                    fields = setFields( true ),
                    sort = {
                        unifiedSeq: 1
                    },
                    lean = true,
                    catalogUsageLimit = 0 < tags.length ? itemsPerPage : 5;

                let catalogUsageResults;

                if( true === noCatalogUsage ) {
                    return done( null, [] );
                }

                const query = [
                    {
                        seq: {
                            $regex: '^' + queryParams.term,
                            $options: 'i'
                        }
                    }
                ];

                if( catalogs && 0 < catalogs.length ) {
                    catalogs.forEach( function( catalog ) {
                        orCatalogs.push( {
                            catalogShort: catalog.short
                        } );
                    } );
                }

                query.push( {$or: orCatalogs} );

                if( tags.length ) {
                    query.push( {tags: {$in: tags}} );
                }

                if( isASV ) {
                    query.push( {'u_extra.asvQualifications': {$in: asvSpecializations}} );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'catalogusage',
                    query: {
                        seq: {$exists: true},
                        $and: query,
                        locationId: locationId

                    },
                    options: {
                        lean,
                        limit: catalogUsageLimit,
                        fields,
                        sort
                    }
                } ).then( results => {
                    const textQueryLimit = catalogUsageLimit - results.length;

                    catalogUsageResults = results;
                    query.shift(); // remove full match query
                    query.push( {$or: titleQuery} );
                    query.push( {_id: {$nin: catalogUsageResults.map( entry => entry._id )}} );
                    query.push( {seq: {$exists: true}} );

                    if( textQueryLimit <= 0 ) {
                        return [];
                    }

                    return Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'catalogusage',
                        query: {
                            $and: query,
                            locationId: locationId

                        },
                        options: {
                            lean,
                            limit: textQueryLimit,
                            fields,
                            sort
                        }
                    } );
                } )
                    .then( textQueryResults => done( null, catalogUsageResults.concat( textQueryResults ) ) )
                    .catch( err => done( err ) );
            }


            function search( catalogs ) {
                async.parallel( {
                    catalogEntries: function( done ) {
                        var orCatalogs = [];

                        if( tags.length ) {
                            Y.log( 'catalogCodeSearch.search: Skip code search into original catalog. Tags are set => search only into catalogusage', 'info', NAME );
                            return setImmediate( done, null, [] );
                        }
                        if( catalogs && catalogs[0] && 'MMI' === catalogs[0].catalog ) {
                            Y.log( 'catalogCodeSearch.search: Skip MMI code search into original catalog. There are no MMI entries in original catalog', 'info', NAME );
                            return setImmediate( done, null, [] );
                        }
                        if( catalogs && 0 < catalogs.length ) {
                            catalogs.forEach( function( catalog ) {
                                orCatalogs.push( {
                                    catalog: catalog.catalog
                                } );
                            } );
                        }
                        searchCatalogs( {
                            params: {
                                asvSpecializations: isASV ? asvSpecializations || [] : undefined,
                                term: queryParams.term,
                                catalogs: orCatalogs,
                                limit: itemsPerPage,
                                fields: setFields( false ),
                                catalogDate: catalogDate,
                                u_extra: {$exists: true}
                            },
                            callback: done
                        } );

                    },
                    catalogusageEntries: _catalogusageEntries

                }, function( err, results ) {
                    var
                        entries;
                    if( err ) {
                        return args.callback( err );
                    }

                    entries = mergeCatalogEntries( results.catalogEntries || [], results.catalogusageEntries || [] );

                    args.callback( err, entries );
                } );
            }

            function getCatNames( catalog, done ) {
                if( 'EBM' === catalog.short && locationId ) {
                    Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                        user: args.user,
                        originalParams: {
                            locationId: locationId
                        },
                        callback: function( err, desc ) {
                            if( err ) {
                                Y.log( 'Error getting kv from locationId for EBM(851)' );
                                return done( err );
                            }
                            catalogs.push( {
                                catalog: desc.filename,
                                short: catalog.short
                            } );
                            done();
                        }
                    } );
                } else {
                    catalogs.push( {
                        catalog: catalog.filename,
                        short: catalog.short
                    } );
                    return done();
                }

            }


            function searchInMedicationsCatalog( ) {
                async.parallel( {
                    catalogEntries: function( done ) {
                        var user = Y.doccirrus.auth.getSUForLocal(),
                            params = args.originalParams;

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'medicationscatalog',
                            action: 'get',
                            query: {
                                $and: [
                                    {catalogShort: medicationCatalogMeta.MEDICATION.catalogShort},
                                    {
                                        $or: [
                                            {
                                                phDescription: {
                                                   $regex: buildSearchRegExStr(queryParams.term),
                                                    $options : 'i'
                                                }
                                            },
                                            {
                                                phPZN: {
                                                    $regex: buildSearchRegExStr(queryParams.term),
                                                    $options : 'i'
                                                }
                                            }]
                                    }
                                ]
                            },
                            options: params.options
                        }, medCatalogResults  );

                        function medCatalogResults(err, result ) {
                            if (err) {
                                return done(err);
                            }
                            result = result.map(item => {
                              return {
                                  ...item,
                                  seq: item.phPZN,
                                  title: item.phDescription,
                                  phNLabel: item.phDescription,
                                  short: item.catalogShort,
                                  phAtc: item.phAtc === null ? [] : [item.phAtc],
                                  vat:  Y.doccirrus.schemas.instock.getVatByVatType( item.vatType )
                                };
                            });

                            done(err,  result);
                        }
                    },
                    catalogusageEntries: _catalogusageEntries,
                    instockEntries: function( done ) {
                        var
                            params = args.originalParams;

                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            model: 'instock',
                            action: 'get',
                            query: {
                                $or: [
                                    {
                                        description: {
                                            $regex: buildSearchRegExStr( queryParams.term ),
                                            $options: 'i'
                                        }
                                    },
                                    {
                                        phPZN: {
                                            $regex: buildSearchRegExStr( queryParams.term ),
                                            $options: 'i'
                                        }
                                    }]
                            },
                            options: params && params.options
                        }, ( err, result ) => {
                            if( err ) {
                                Y.log( `searchInMedicationsCatalog. Could not get instock items: ${err.stack || err}`, 'warn', NAME );
                                return done( err );
                            }

                            if( !result || !result[0] ) {
                                return done( null, [] );
                            }
                            result = result.map( item => {
                                return {
                                    ...item,
                                    seq: item.phPZN,
                                    title: item.description,
                                    phNLabel: item.description,
                                    phGTIN: item.gtinCode
                                };
                            } );

                            return done( null, result );
                        } );
                    }
                }, function( err, results ) {
                    var
                        entries;
                    if( err ) {
                        return args.callback( err );
                    }

                    entries = mergeCatalogEntries( results.catalogEntries || [], results.catalogusageEntries || [], results.instockEntries );
                    args.callback( err, entries );
                } );
            }

            if( isTarmed || isASV ) {
                let [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'employee',
                    query: {_id: employeeId || args.user.specifiedBy},
                    options: {
                        lean: true,
                        fields: {
                            qualiDignities: 1,
                            asvSpecializations: 1
                        }
                    }
                } ) );

                if( error ) {
                    Y.log( `catalogCodeSearch(): error in finding employee by id ${employeeId}.\nError: ${error.stack || error}`, 'error', NAME );
                    return args.callback( error );
                }

                if( isASV && result && result[0] && result[0].asvSpecializations) {
                    asvSpecializations = result && result[0] && result[0].asvSpecializations;
                }
            }
            startCatalogSearch();

            function startCatalogSearch() {
                if( queryParams.catalogs && 0 < queryParams.catalogs.length ) {
                    async.each( queryParams.catalogs, getCatNames, function( err ) {
                        if( err ) {
                            Y.log( 'Error getting catalogs names' );
                            return args.callback( err );
                        }

                        if (catalogs.length && catalogs[0].catalog === medicationCatalogMeta.MEDICATION.catalogShort) {
                            searchInMedicationsCatalog(catalogs);
                        } else {
                            search( catalogs );
                        }
                    } );
                }
            }
        }

        /**
         * Get catalogShort depending on latest "Schein"
         * @param   {Object}            args
         */
        function getCatalogShortByTimestamp( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getCatalogShortByTimestamp', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getCatalogShortByTimestamp');
            }
            var user = args.user,
                callback = args.callback,
                params = args.originalParams,
                catalogShortMap = {
                    SCHEIN: 'EBM',
                    BGSCHEIN: 'UVGOÄ',
                    PKVSCHEIN: 'GOÄ'
                };

            function latestScheinCb( err, schein ) {
                if( err || !schein.length ) {
                    err = err || 'Schein Not Found';
                    Y.log( 'Could not get latest schein: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                schein = schein[0];

                callback( null, {catalogShort: catalogShortMap[schein.actType]} );
            }

            if( !params.timestamp ) {
                callback( new Error( 'Missing timestamp Param' ) );
                return;
            }
            if( !params.patientId ) {
                callback( new Error( 'Missing patientId Param' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                query: {
                    $or: [
                        {actType: 'SCHEIN'},
                        {actType: 'BGSCHEIN'},
                        {actType: 'PKVSCHEIN'}
                    ],
                    patientId: params.patientId,
                    timestamp: {
                        $lte: params.timestamp
                    }
                },
                options: {
                    limit: 1,
                    sort: {
                        timestamp: 1
                    }
                },
                callback: latestScheinCb
            } );
        }

        /**
         * Searches for entries which are not in HK eat.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.term term of 'seq'
         * @param {String} args.query.catalogShort short name of catalog
         * @param {String} args.query.catalog filename of catalog
         * @param {Function} args.callback
         */
        function searchNotHK( args ) {
            var queryParams = args.query || {},
                async = require( 'async' ),
                superUser = Y.doccirrus.auth.getSUForLocal();
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'catalogusage',
                        user: args.user,
                        action: 'get',
                        query: {
                            seq: {
                                $regex: '^' + queryParams.term,
                                $options: 'i'
                            },
                            catalogShort: queryParams.catalogShort
                        },
                        options: {
                            select: {
                                seq: 1
                            }
                        }
                    }, next );
                },
                function( entriesHK, next ) {
                    var $nin = entriesHK.map( function( entry ) {
                        return entry.seq;
                    } );
                    var query = {
                        seq: {
                            $regex: '^' + queryParams.term,
                            $options: 'i'
                        },
                        catalog: queryParams.catalog

                    };
                    if( $nin.length ) {
                        query.seq.$nin = $nin;
                    }
                    Y.doccirrus.mongodb.runDb( {
                        model: 'catalog',
                        user: superUser,
                        action: 'get',
                        query: query,
                        options: {
                            limit: 10,
                            select: {
                                seq: 1,
                                title: 1,
                                catalog: 1,
                                bezeichnung: 1
                            },
                            sort: {
                                seq: 1
                            }
                        }
                    }, next );
                }
            ], args.callback );
        }

        function catalogusageSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.catalogusageSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.catalogusageSearch');
            }
            var user = args.user,
                query = args.query || {},
                params = args.originalParams || {},
                page = params.page,
                itemsPerPage = params.itemsPerPage,
                options = { lean: true, sort: params.sort },
                tags = query.tags,
                locationId = query.locationId,
                callback = args.callback,
                mongoQuery = {
                    seq: {$exists: true},
                    tags: {$in: tags},
                    locationId: locationId
                };

            if( 'undefined' !== typeof options.sort.seq ) {
                options.sort.unifiedSeq = options.sort.seq;
                delete options.sort.seq;
            }

            function finalCb( err, results ) {
                var count = results[0],
                    entries = results[1];
                if( err ) {
                    return callback( err );
                }

                callback( null, {
                    meta: {
                        errors: [],
                        warnings: [],
                        query: null,
                        itemsPerPage: itemsPerPage,
                        totalItems: count,
                        page: page || 1,
                        replyCode: 200
                    },
                    data: entries
                } );
            }

            function getCount( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'count',
                    query: mongoQuery,
                    options: options
                }, done );
            }

            function getEntries( done ) {
                let
                    incaseConfig;

                if( !tags || !tags.length ) {
                    return callback( null, [] );
                }
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.incaseconfiguration.readConfig( {
                            user: user,
                            callback: function( err, result ) {
                                if( err ) {
                                    return next( err );
                                }
                                incaseConfig = result;
                                return next();
                            }
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'catalogusage',
                            query: mongoQuery,
                            options: options
                        }, next );
                    },
                    function( results, next ) {
                        async.each( results, ( item, done ) => {

                            function setBillingFactorValue() {
                                const
                                    u_extra = item.u_extra,
                                    rechnungsfaktor = u_extra && u_extra.rechnungsfaktor,
                                    billingFactorValue = rechnungsfaktor && rechnungsfaktor[query.billingFactorType];

                                if( billingFactorValue ) {
                                    item.billingFactorValue = billingFactorValue;
                                }

                                done();
                            }

                            Y.doccirrus.api.catalogtext.get( {
                                user,
                                options: {
                                    lean: true
                                },
                                query: {
                                    catalogShort: mongoQuery.catalogShort,
                                    locationId: mongoQuery.locationId,
                                    code: item.seq
                                },
                                callback( err, results ){
                                    if( err ) {
                                        return done( err );
                                    }
                                    if( !incaseConfig.catalogTextHidden ) {
                                        if( results[0] && results[0].items && results[0].items[0] ) {
                                            let
                                                originalCatalogText = item.title;
                                            item.title = results[ 0 ].items[ 0 ].text;
                                            item.catalogText = results[0].items;
                                            item.originalCatalogText = originalCatalogText;
                                        }
                                    }

                                    if( 'GOÄ' === mongoQuery.catalogShort && query.billingFactorType) {
                                        setBillingFactorValue();
                                    } else {
                                        return done();
                                    }

                                }
                            } );
                        }, ( err ) => next( err, results ) );
                    }
                ], done );

            }

            function start() {
                require( 'async' ).parallel( [getCount, getEntries], finalCb );
            }

            if( !tags || !tags.length ) {
                return finalCb( null, [0, []] );
            }

            if( page && itemsPerPage ) {
                options.limit = itemsPerPage;
                options.skip = itemsPerPage * (page - 1);
            }
            if( params.sort ){
                options.sort = params.sort;
            }
            // catalogusage doesnt care about kv specific ebm catalogs atm
            /*
             if( query.catalog && 'EBM' === query.catalog.short && query.locationId ) {
             Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
             user: args.user,
             originalParams: {
             locationId: query.locationId
             },
             callback: function( err, desc ) {
             if( err ) {
             Y.log( 'Error getting kv from locationId for EBM(851)' );
             }
             mongoQuery.catalogRef = desc && desc.filename || query.catalog.filename;

             start();
             }
             } );

             return;
             }*/
            if( query.catalog ) {
                mongoQuery.catalogShort = query.catalog.short;
            }

            start();
        }

        function getEntry( args ) {
            Y.doccirrus.mongodb.runDb( {
                model: 'catalog',
                user: Y.doccirrus.auth.getSUForLocal(),
                action: 'get',
                query: args.query,
                options: args.options
            }, args.callback );
        }

        // reset mongorestore lock before attempt to import
        function resetCatalogImportLock( callback ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                return callback();
            }
            Y.doccirrus.schemas.sysnum.resetMongorestoreLock( Y.doccirrus.auth.getSUForLocal(), callback );
        }

        function hmvSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.hmvSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.hmvSearch');
            }
            var query = args.query.filterQuery || {},
                options = args.options || {},
                callback = args.callback;

            if( !args.query.catalog ) {
                return callback( new Error( 'could not find catalog descriptor for hmv catalog' ) );
            }

            query.catalog = args.query.catalog;

            if( args.query.type ) {
                query.typ = Array.isArray( args.query.type ) ? {$in: args.query.type} : args.query.type;
            }

            if( args.query.term ) {
                query.$or = [
                    {
                        bezeichnung: {$regex: args.query.term, $options: 'i'}
                    },
                    {
                        seq: {$regex: args.query.term, $options: 'i'}
                    }
                ];
            }

            options.limit = 20;

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: query,
                options: options
            }, callback );

        }

        function hmvCatalogUsageSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.hmvCatalogUsageSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.hmvCatalogUsageSearch');
            }
            var user = args.user,
                callback = args.callback,
                options = {
                    limit: 20,
                    select: {
                        'assDescription': 1,
                        'assManufacturer': 1,
                        'assCharacteristics': 1,
                        'assDateAdded': 1,
                        'assDateChanged': 1,
                        'assDose': 1,
                        'assPrescPeriod': 1,
                        'assId': 1,
                        'seq': 1
                    }
                };
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalogusage',
                query: {
                    catalogShort: 'HMV',
                    locationId: args.query.locationId,
                    tags: (args.query.tags && args.query.tags.length) ? {$in: args.query.tags} : undefined,
                    $or: [
                        {assDescription: {$regex: args.query.term, $options: 'i'}},
                        {seq: {$regex: args.query.term, $options: 'i'}}
                    ]
                },
                options: options
            }, callback );
        }

        function utItemSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.utItemSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.utItemSearch');
            }
            var
                catalogDesc,
                params = args.originalParams,
                callback = args.callback;

            if( !params.short || !params.group ) {
                return callback( new Error( 'ut item group and short must be specified' ) );
            }

            catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'UTILITY',
                short: params.short + 'ITEMS'
            } );

            if( !catalogDesc ) {
                return callback( new Error( 'could not find catalog descriptor for ' + params.short ) );
            }

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: {
                    catalog: catalogDesc.filename,
                    group: params.group,
                    $or: [
                        {name: {$regex: params.term, $options: 'i'}},
                        {seq: {$regex: params.term, $options: 'i'}}
                    ]
                }
            }, callback );

        }

        function getKvList( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getKvList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getKvList');
            }
            const
                user = Y.doccirrus.auth.getSUForLocal(),
                params = args.originalParams,
                callback = args.callback;
            let catalog, query;

            function modelCb( err, model ) {
                if( err ) {
                    Y.log( 'could not get catalog model ' + err, 'error', NAME );
                    return callback( err );
                }
                model.mongoose.aggregate( [
                    {
                        $match: query
                    },
                    {
                        $group: {
                            _id: "$kvKey",
                            kvName: {$first: "$kvName"}
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            kv: "$_id",
                            name: "$kvName"
                        }
                    }
                ], callback );
            }

            catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'KVREG'
            } );

            if( !catalog ) {
                Y.log( 'KVREG catalog not found!', 'error', NAME );
                return callback( Error( 'KVREG catalog not found!' ) );
            }

            query = {catalog: catalog.filename};

            if( params.kv ) {
                query.kvKey = params.kv;
            }

            Y.doccirrus.mongodb.getModel( user, 'catalog', true, modelCb );
        }

        /**
         * Gets catalog descriptors according user country code.
         * @method getCatalogDescriptorsByActType
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.actType='']
         * @param {Function} args.callback
         */
        function getCatalogDescriptorsByActType( args ) {
            var
                queryParams = args.query || {},
                callback = args.callback,
                catalogDescriptors;
            catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                actType: queryParams.actType || ''
            } );

            // MOJ-3453: if country has no catalogs fall back to german catalogs
            if( Y.Object.isEmpty( catalogDescriptors ) ) {
                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                    actType: queryParams.actType || ''
                } );
            }
            callback( null, catalogDescriptors );
        }

        function getInsuranceCatalogByInsuranceType( insuranceType ) {
            var catDescriptor,
                catalogShort = insuranceTypeToCatalogShort[insuranceType];

            if( catalogShort ) {
                catDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: catalogShort
                } );
            }
            return catDescriptor && catDescriptor.filename || null;
        }

        function getPublicInsurances( args ) {

            var nameOrLocation,
                user = args.user,
                SU = Y.doccirrus.auth.getSUForLocal(),
                params = args.originalParams,
                callback = args.callback,
                query = args.query,
                options = args.options || {},
                limit = options.limit,
                CATALOG_NOT_FOUND = 'catalog for insurance type ' + params.insuranceType + ' not found',
                catalog = getInsuranceCatalogByInsuranceType( params.insuranceType );

            function get( _query, _options, _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalog',
                    query: _query,
                    options: _options
                }, _cb );
            }

            function insurancesInKv( err, results ) {

                var nResults;

                function insurancesNotInKv( err, results2 ) {
                    if( err ) {
                        Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }
                    results2.result = results.result.concat( results2.result );
                    callback( null, results2 );
                }

                if( err ) {
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                nResults = results.result.length;

                if( nResults < limit ) {
                    query.kv = {$ne: query.kv};
                    options.limit = limit - nResults;
                    get( query, options, insurancesNotInKv );
                } else {
                    return callback( null, results );
                }
            }

            function kvCb( err, kv ) {
                if( err ) {
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                query.kv = kv;
                get( query, options, insurancesInKv );
            }

            function locationCb( err, location ) {
                if( err || !location[0] ) {
                    err = err || 'location not found';
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                Y.doccirrus.utils.getKvFromLocation( user, location[0], kvCb );
            }

            if( !catalog ) {
                Y.log( CATALOG_NOT_FOUND, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500, CATALOG_NOT_FOUND ) );
            }
            query.catalog = catalog;

            // "suchname" matches suchname or ortssuchname
            if( query.suchname ) {

                nameOrLocation = query.suchname;
                query.$or = [
                    {suchname: nameOrLocation},
                    {ortssuchnamen: nameOrLocation}
                ];
                delete query.suchname;
            }

            // exclude catalog tables
            query.key = {$exists: false};

            // exclude non abrechungs_iks, if user doesn't search for iknr
            if( !query.iknr && !params.disableOnlyInvoiceIK ) {
                query.abrechnungs_ik = true;
            }

            if( !options.sort ) {
                options.sort = {};
            }

            if( !options.sort.ktab ) {
                options.sort.ktab = 1;
            }

            if( !params.locationId ) {
                get( query, options, callback );
            } else {

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'location',
                    query: {_id: params.locationId}
                }, locationCb );
            }

        }

        function getPrivateOrBgInsurances( args ) {
            var user = Y.doccirrus.auth.getSUForLocal(),
                options = args.options || {},
                query = args.query || {},
                callback = args.callback,
                params = args.originalParams,
                CATALOG_NOT_FOUND = 'catalog for insurance type ' + params.insuranceType + ' not found',
                catalog = getInsuranceCatalogByInsuranceType( params.insuranceType );

            if( !catalog ) {
                Y.log( CATALOG_NOT_FOUND, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500, CATALOG_NOT_FOUND ) );
            }
            query.catalog = catalog;
            query.key = {$exists: false};

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalog',
                query: query,
                options: options
            }, callback );

        }

        async function getSwissInsurances( {query, options, originalParams, callback}, lawCode ) {
            let err = null;
            let result = null;
            const user = Y.doccirrus.auth.getSUForLocal();
            const {insuranceType} = originalParams;

            const catalog = getInsuranceCatalogByInsuranceType( originalParams.insuranceType );

            if( !catalog ) {
                err = Y.doccirrus.errors.rest( 500, `catalog for insurance type ${insuranceType} not found`, true );
                Y.log( `getSwissInsurances: catalog for insurance type ${insuranceType} not found:\n${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, result, callback );
            }

            [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.runDb( {
                    user, options,
                    model: 'catalog',
                    query: {...query, catalog, lawCode}
                }, ( err, result ) => err ? reject( err ) : resolve( result ) );
            } ) );

            if( err ) {
                err = Y.doccirrus.errors.rest( 500, 'error in getting "KVG" catalog entries from DB', true );
                Y.log( `getSwissInsurances: error in getting "KVG" catalog entries from DB:\n${err && err.stack || err}`, 'error', NAME );
            }

            return handleResult( err, result, callback );
        }

        function getInsurances( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getInsurances', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getInsurances');
            }
            var
                params = args.originalParams,
                callback = args.callback,
                MISSING_INSURANCE_TYPE = 'missing parameter "insuranceType"',
                INSURANCE_TYPE_NOT_FOUND = 'insuranceType not found';

            if( 'string' !== typeof params.insuranceType ) {
                Y.log( MISSING_INSURANCE_TYPE, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500, MISSING_INSURANCE_TYPE ) );
            }

            switch( params.insuranceType ) {
                case 'PUBLIC':
                case 'PUBLIC_A':
                    getPublicInsurances( args );
                    break;
                case 'PRIVATE':
                case 'PRIVATE_A':
                case 'BG':
                    getPrivateOrBgInsurances( args );
                    break;
                case 'PRIVATE_CH_UVG':
                    getSwissInsurances( args, 'UVG' );
                    break;
                case 'PRIVATE_CH_IVG':
                    getSwissInsurances( args, 'IVG' );
                    break;
                case 'PRIVATE_CH_MVG':
                    getSwissInsurances( args, 'MVG' );
                    break;
                case 'PRIVATE_CH_VVG':  //MOJ-12261 VVG must offer same Insurances as KVG
                    getSwissInsurances( args, 'KVG' );
                    break;
                case 'PRIVATE_CH':
                    getSwissInsurances( args, 'KVG' );
                    break;
                default:
                    Y.log( INSURANCE_TYPE_NOT_FOUND, 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( 500, INSURANCE_TYPE_NOT_FOUND ) );
            }

        }

        function ghdHmvSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.ghdHmvSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.ghdHmvSearch');
            }
            var term = args.query && args.query.term || '',
                query = {},
                options = args.options || {},
                callback = args.callback,
                catalogDescriptor = getCatalogDescriptor( {actType: '_CUSTOM', short: 'HMV-GHD'} );

            if( !catalogDescriptor ) {
                return callback( new Error( 'could not find catalog descriptor for hmv catalog' ) );
            }

            if( term ) {
                query.$or = [
                    {
                        bezeichnung: {$regex: term, $options: 'i'}
                    },
                    {
                        pzn: {$regex: term, $options: 'i'}
                    },
                    {
                        hmvNo: {$regex: term, $options: 'i'}
                    }
                ];
            }

            query.catalog = catalogDescriptor.filename;
            options.limit = 20;

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: query,
                options: options
            }, callback );

        }

        /**
         * Aggregate all available costCarrierBillingGroup.
         * Result will look like [{id: '00', name: 'AOK'}, ...]
         *
         * @param   {Object}            args
         * @param   {Object}            args.query
         * @returns {*}
         */
        function getCostCarrierBillingGroups( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getCostCarrierBillingGroups', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getCostCarrierBillingGroups');
            }
            const
                Promise = require( 'bluebird' ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                query = args.query || {},
                callback = args.callback,
                ktsCatalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'SDKT'
                } ),
                pipeline = [
                    {$match: query},
                    {$match: {'catalog': ktsCatalogDesc && ktsCatalogDesc.filename, key: null}},
                    {$sort: {"kostentraegergruppeId": 1}},
                    {"$group": {"_id": {id: "$kostentraegergruppeId", name: "$kostentraegergruppe"}}},
                    {$project: {_id: 0, id: "$_id.id", name: "$_id.name"}}
                ];

            if( !ktsCatalogDesc || !ktsCatalogDesc.filename ) {
                return callback( Y.doccirrus.errors.rest( 400, 'could not find kts catalog descriptor' ) );
            }

            getModel( SU, 'catalog', true ).then( model => {
                return new Promise( ( resolve, reject ) => {
                    model.mongoose.aggregate( pipeline, ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    } );
                } );
            } ).then( results => {
                callback( null, results );
            } ).catch( err => {
                callback( err );
            } );
        }

        function getSddaEntries( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getSddaEntries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getSddaEntries');
            }
            const
                user = args.user,
                callback = args.callback,
                SU = Y.doccirrus.auth.getSUForLocal(),
                catDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'SDDA'
                } );
            let query;

            function getSddaCatalogUsageEntries( err, results ) {
                if( err ) {
                    return callback( err );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    query: Object.assign( {}, args.query, {catalogShort: 'SDDA'} ),
                    options: {
                        lean: true
                    }
                }, function( err, catalogUsageResults ) {
                    if( err ) {
                        return callback( err );
                    }

                    callback( null, results.concat( catalogUsageResults.map( entry => {
                        entry.catalogUsage = true;
                        return entry;
                    } ) ) );
                } );

            }

            query = Object.assign( {}, args.query || {}, {catalog: catDesc.filename} );

            Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query: query,
                options: {
                    lean: true
                }
            }, getSddaCatalogUsageEntries );
        }

        function createIcdCriteria( icd ) {
            let lastChar = icd[icd.length - 1];
            if( -1 !== ['-', '*'].indexOf( lastChar ) ) {
                return {$regex: '^' + icd.substring( 0, icd.length - 1 ), $options: 'i'};
            }
            return icd;
        }

        /**
         * @deprecated
         * @param   {Object}            args
         */
        function searchKbvUtility( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.searchKbvUtility', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.searchKbvUtility');
            }
            const
                getChapterBySubType = Y.doccirrus.kbvutilitycatalogcommonutils.getChapterBySubType,
                Promise = require( 'bluebird' ),
                _ = require( 'lodash' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                params = args.originalParams || {},
                options = args.options || {},
                term = params.indicationSearch || '',
                icd = params.icd,
                icd2 = params.icd2,
                subTypes = params.subTypes && params.subTypes.length ? params.subTypes : null,
                callback = args.callback,
                sdhm = getCatalogDescriptor( {
                    actType: 'KBVUTILITY',
                    short: 'SDHM'
                } );

            let promise = Promise.resolve();

            function createIcdQuery( icdCode, icdCode2 ) {
                if( 'string' !== typeof icdCode ) {
                    return [];
                }

                const
                    icdQuery = {
                        icd_code: createIcdCriteria( icdCode )
                    };

                if( options.checkIcd2 ) {
                    icdQuery['heilmittel_liste.sekundaercode'] = icdCode2 ? createIcdCriteria( icdCode2 ) : null;
                }

                return icdQuery;
            }

            function getIndicationsByIcd() {
                const sdhma = getCatalogDescriptor( {
                    actType: 'KBVUTILITY',
                    short: 'SDHMA'
                } ),
                    query = Object.assign( {
                        catalog: sdhma.filename,
                        $or: [
                            {geltungsbereich_kv: null},
                            {geltungsbereich_kv: params.kv}
                        ]
                    }, createIcdQuery( icd, icd2 ) );

                return runDb( {
                    user: SU,
                    model: 'catalog',
                    query: query,
                    options: {
                        lean: true
                    }
                } );
            }

            function getSDHMEntries( diagnosisGroups ) {
                const orQuery = {
                    catalog: sdhm.filename,
                    $or: [
                        {seq: {$regex: term, $options: 'i'}},
                        {title: {$regex: term, $options: 'i'}},
                        {kapitel: {$regex: term, $options: 'i'}},
                        {unterkapitel: {$regex: term, $options: 'i'}},
                        {leitsymptomatik_name: {$regex: term, $options: 'i'}},
                        {erkrankung_liste: {$in: [new RegExp( term, 'i' )]}},
                        {['heilmittelverordnung.vorrangiges_heilmittel_liste.name']: {$regex: term, $options: 'i'}},
                        {['heilmittelverordnung.vorrangiges_heilmittel_liste.positionsnr_liste']: {$in: [new RegExp( term, 'i' )]}},
                        {['heilmittelverordnung.optionales_heilmittel_liste.name']: {$regex: term, $options: 'i'}},
                        {['heilmittelverordnung.optionales_heilmittel_liste.positionsnr_liste']: {$in: [new RegExp( term, 'i' )]}},
                        {['heilmittelverordnung.ergaenzendes_heilmittel_liste.name']: {$regex: term, $options: 'i'}},
                        {['heilmittelverordnung.ergaenzendes_heilmittel_liste.positionsnr_liste']: {$in: [new RegExp( term, 'i' )]}},
                        {['heilmittelverordnung.standardisierte_heilmittel_liste.name']: {$regex: term, $options: 'i'}},
                        {['heilmittelverordnung.standardisierte_heilmittel_liste.positionsnr_liste']: {$in: [new RegExp( term, 'i' )]}}
                    ]
                };

                if( subTypes ) {
                    const
                        _ = require( 'lodash' ),
                        chapters = _.flatten( subTypes.map( subType => getChapterBySubType( subType ) ).filter( Boolean ) );
                    orQuery.kapitel = chapters.length ? {$in: chapters} : undefined;
                }

                let query;

                if( Array.isArray( diagnosisGroups ) ) {
                    if( 0 === diagnosisGroups.length ) {
                        return [];
                    }
                    query = {
                        $and: [
                            {
                                diagnosegruppe_value: {$in: diagnosisGroups},
                                catalog: sdhm.filename
                            },
                            orQuery
                        ]
                    };
                } else {
                    query = orQuery;
                }

                return runDb( {
                    user: SU,
                    model: 'catalog',
                    query: query,
                    options: {
                        lean: true
                    }
                } );
            }

            if( icd ) {
                promise = promise.then( getIndicationsByIcd ).map( entry => {
                    var results = [];
                    if( !entry.heilmittel_liste ) {
                        return null;
                    }
                    entry.heilmittel_liste.forEach( ut => {
                        if( !ut.kapitel_liste ) {
                            return;
                        }
                        ut.kapitel_liste.forEach( chapter => {
                            if( !chapter.diagnosegruppe_liste ) {
                                return;
                            }
                            chapter.diagnosegruppe_liste.forEach( diag => {
                                results.push( diag.diagnosegruppe_value );
                            } );
                        } );
                    } );
                    return results;
                } ).filter( Boolean ).then( _.flatten ).then( _.uniq );
            }

            promise.then( getSDHMEntries ).then( results => {
                callback( null, results );
            } ).catch( err => {
                Y.log( 'ccould not search kbv utlity ' + err, 'error', NAME );
                callback( err );
            } );

        }

        /**
         *
         * @param {module:authSchema.auth} user
         * @param {String} icdCodeTerm
         * @param {Object} query
         * @return {module:v_diagnosisSchema.v_diagnosis}
         */
        function searchDistinctPatientIcds( user, icdCodeTerm, query ) {
            const
                Promise = require( 'bluebird' ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel );

            const settings = Y.doccirrus.api.settings.getSettings( {user} );
            if( settings && settings.noCrossLocationAccess ) {
                query.locationId = {
                    $in: (user.locations && user.locations.map( loc => ObjectId( loc._id ) )) || []
                };
            }

            return getModel( user, 'activity', true ).then( activityModel => {
                return new Promise( ( resolve, reject ) => {
                    activityModel.mongoose.aggregate( [
                        {
                            $match: {
                                $and: [
                                    query,
                                    {
                                        $or: [
                                            {
                                                code: {
                                                    $regex: '^' + icdCodeTerm,
                                                    $options: 'i'
                                                }
                                            },
                                            {
                                                userContent: {
                                                    $regex: icdCodeTerm,
                                                    $options: 'i'
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: '$code',
                                actId: {$last: '$_id'},
                                userContent: {$last: '$userContent'},
                                timestamp: {$last: '$timestamp'},
                                code: {$last: '$code'},
                                diagnosisCert: {$last: '$diagnosisCert'}
                            }
                        }, {
                            $sort: {
                                timestamp: -1
                            }
                        }, {
                            $project: {
                                _id: '$actId',
                                timestamp: 1,
                                code: 1,
                                userContent: 1,
                                diagnosisCert: 1
                            }
                        }
                    ], ( err, results ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( results );
                        }
                    } );
                } );
            } );
        }

        function searchIcdsInCatalogAndPatient( args ) {
            Y.log( 'Entering Y.doccirrus.api.catalog.searchIcdsInCatalogAndPatient', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.catalog.searchIcdsInCatalogAndPatient' );
            }
            const
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                user = args.user,
                query = args.query,
                options = args.options || {},
                callback = args.callback,
                icdCatalog = getCatalogDescriptor( {
                    actType: 'DIAGNOSIS',
                    short: 'ICD-10'
                } );

            let icdCodeTerm;

            if( !query.patientId ) {
                return callback( Y.doccirrus.errors.rest( 500, 'insufficient arguments' ) );
            }

            icdCodeTerm = query.term || '';

            Promise.resolve().then( () => {
                return Promise.props( {
                    fromCatalog: runDb( {
                        user: SU,
                        model: 'catalog',
                        query: {
                            $and: [
                                {catalog: icdCatalog.filename},
                                {seq: {$ne: null}},
                                {
                                    $or: [
                                        {
                                            seq: {
                                                $regex: '^' + icdCodeTerm,
                                                $options: 'i'
                                            }
                                        },
                                        {
                                            title: {
                                                $regex: icdCodeTerm,
                                                $options: 'i'
                                            }
                                        },
                                        {
                                            infos: {
                                                $in: [new RegExp( icdCodeTerm, 'i' )]
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        options: {
                            lean: true,
                            select: {
                                seq: 1,
                                title: 1
                            },
                            limit: options.limit || 10
                        }
                    } ).map( entry => {
                        entry.fromCatalog = true;
                        return entry;
                    } ),
                    fromCaseFolders: searchDistinctPatientIcds( user, icdCodeTerm, {
                        actType: 'DIAGNOSIS',
                        status: {$nin: ['CANCELLED', 'PREPARED']},
                        patientId: query.patientId
                    } ).map( entry => {
                        entry.fromCaseFolders = true;
                        return entry;
                    } )
                } );
            } ).then( result => {
                callback( null, result.fromCaseFolders.concat( result.fromCatalog ) );
            } ).catch( err => {
                Y.log( 'could not get icds from catalog and patient: ' + err, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * @deprecated
         * @param   {Object}            args
         *
         * @return {*}
         */
        function getIcdsFromDiagnosisGroup( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getIcdsFromDiagnosisGroup', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getIcdsFromDiagnosisGroup');
            }
            const
                Promise = require( 'bluebird' ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                user = args.user,
                query = args.query,
                options = args.options || {},
                callback = args.callback,
                sdhma = getCatalogDescriptor( {
                    actType: 'KBVUTILITY',
                    short: 'SDHMA'
                } ),
                icdCatalog = getCatalogDescriptor( {
                    actType: 'DIAGNOSIS',
                    short: 'ICD-10'
                } );

            let icdCodeTerm;

            if( (query.searchByAgreement && !query.diagnosisGroup) || !query.patientId || !query.kv ) {
                return callback( Y.doccirrus.errors.rest( 500, 'insufficient arguments' ) );
            }

            icdCodeTerm = query.term || '';

            getModel( SU, 'catalog', true ).then( catalogModel => {
                return new Promise( ( resolve, reject ) => {
                    const
                        sdhmaQuery = {
                            catalog: sdhma.filename,
                            $or: [
                                {geltungsbereich_kv: null},
                                {geltungsbereich_kv: query.kv}
                            ]
                        },
                        distinctPath = !query.searchByAgreement || query.icd ? 'heilmittel_liste.sekundaercode' : 'icd_code';

                    if( query.searchByAgreement && query.diagnosisGroup ) {
                        sdhmaQuery['heilmittel_liste.kapitel_liste.diagnosegruppe_liste.diagnosegruppe_value'] = query.diagnosisGroup;
                    }

                    if( query.searchByAgreement && query.icd ) {
                        sdhmaQuery.icd_code = createIcdCriteria( query.icd );
                    }

                    catalogModel.mongoose.distinct( distinctPath, sdhmaQuery, ( err, results ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( results );
                    } );
                } );
            } ).then( icdCodes => {
                if( !Array.isArray( icdCodes ) || !icdCodes.length ) {
                    return Promise.resolve( [] );
                }

                return Promise.props( {
                    fromCatalog: runDb( {
                        user: SU,
                        model: 'catalog',
                        query: {
                            $and: [
                                {catalog: icdCatalog.filename},
                                {seq: {$in: icdCodes}},
                                {
                                    $or: [
                                        {
                                            seq: {
                                                $regex: '^' + icdCodeTerm,
                                                $options: 'i'
                                            }
                                        },
                                        {
                                            title: {
                                                $regex: icdCodeTerm,
                                                $options: 'i'
                                            }
                                        },
                                        {
                                            infos: {
                                                $in: [new RegExp( icdCodeTerm, 'i' )]
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        options: {
                            lean: true,
                            select: {
                                seq: 1,
                                title: 1
                            },
                            limit: options.limit || 10
                        }
                    } ).map( entry => {
                        entry.fromCatalog = true;
                        return entry;
                    } ),
                    fromCaseFolders: searchDistinctPatientIcds( user, icdCodeTerm, {
                        code: {$in: icdCodes},
                        actType: 'DIAGNOSIS',
                        status: {$nin: ['CANCELLED', 'PREPARED']},
                        patientId: query.patientId
                    } ).map( entry => {
                        entry.fromCaseFolders = true;
                        return entry;
                    } )
                } );
            } ).then( result => {
                callback( null, result.fromCaseFolders.concat( result.fromCatalog ) );
            } ).catch( err => {
                Y.log( 'could not get icds from indication code: ' + err, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * @deprecated
         * @param   {Object}            args
         *
         * @return {*}
         */
        function getUtilityAgreement( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getUtilityAgreement', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getUtilityAgreement');
            }
            const
                _ = require( 'lodash' ),
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                params = args.originalParams || {},
                callback = args.callback,
                sdhma = getCatalogDescriptor( {
                    actType: 'KBVUTILITY',
                    short: 'SDHMA'
                } );

            if( !params.diagnosisGroup || !params.kv ) {
                return callback( Y.doccirrus.errors.rest( 500, 'insufficient arguments' ) );
            }
            let query = {
                catalog: sdhma.filename,
                $or: [
                    {geltungsbereich_kv: null},
                    {geltungsbereich_kv: params.kv}
                ],
                'heilmittel_liste.kapitel_liste.diagnosegruppe_liste.diagnosegruppe_value': params.diagnosisGroup
            };

            Promise.resolve().then( () => {
                if( !params.icd ) {
                    return runDb( {
                        user: SU,
                        model: 'catalog',
                        query: Object.assign( {icd_code: null}, query ),
                        options: {
                            limit: 1
                        }
                    } ).then( results => {
                        if( 0 < results.length ) {
                            return {needsIcd2: false, needsIcd: false, result: results, agreed: true};
                        }

                        return runDb( {
                            user: SU,
                            model: 'catalog',
                            action: 'count',
                            query: query,
                            options: {
                                limit: 1
                            }
                        } ).then( count => {
                            return {needsIcd: Boolean( count ), agreed: false};
                        } );

                    } );
                }

                query = Object.assign( query, {
                    icd_code: createIcdCriteria( params.icd ),
                    'heilmittel_liste.sekundaercode': params.icd2 ? createIcdCriteria( params.icd2 ) : null
                } );

                return runDb( {
                    user: SU,
                    model: 'catalog',
                    query: query,
                    options: {
                        lean: true,
                        limit: 1
                    }
                } ).then( result => {
                    if( result && result.length ) {
                        return {needsIcd2: Boolean( params.icd2 ), needsIcd: true, result: result, agreed: true};
                    }
                    return runDb( {
                        user: SU,
                        model: 'catalog',
                        action: 'count',
                        query: _.omit( query, 'heilmittel_liste.sekundaercode' ),
                        options: {
                            limit: 1
                        }
                    } ).then( count => {
                        return {needsIcd2: Boolean( count ), needsIcd: true, agreed: false};
                    } );
                } );
            } ).then( result => {
                callback( null, result );
            } ).catch( err => {
                callback( err );
            } );

        }

        function lookup( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.lookup', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.lookup');
            }
            const
                SU = Y.doccirrus.auth.getSUForLocal(),
                Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
                params = args.originalParams || {},
                callback = args.callback,

                descriptorCriteria = {};

            return Promise.resolve().then( () => {
                let {actType = '_CUSTOM', catalogShort, seqField = 'seq', seq} = params;
                let descriptor;
                if( actType ) {
                    descriptorCriteria.actType = actType;
                }

                if( catalogShort ) {
                    descriptorCriteria.short = catalogShort;
                } else {
                    throw Error( 'could not lookup catalog entry: catalogShort not defined' );
                }

                descriptor = getCatalogDescriptor( descriptorCriteria );
                if( !descriptor ) {
                    throw Error( 'could not lookup catalog entry: catalog descriptor not found for criteria ' + descriptorCriteria );
                }

                let query = {
                    catalog: descriptor.filename
                };
                if( seq ) {
                    query[seqField] = seq;
                } else {
                    throw Error( 'could not lookup catalog entry: missing seq param to search' );
                }
                return runDb( {
                    user: SU,
                    model: 'catalog',
                    query: query,
                    options: {
                        lean: true,
                        limit: 1
                    }
                } ).get( 0 );
            } ).then( entry => {
                callback( null, entry || null );
            } ).catch( err => {
                Y.log( 'could not lookup catalog entry: ' + err, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * Reaturns all all kbv kbvutility names.
         * See searchKbvUtilityNamesAndPositions for a searchable version.
         *
         * @return {Promise<Array<String>>}
         */
        function getKbvUtilitesFromCatalog() {
            const
                SU = Y.doccirrus.auth.getSUForLocal(),
                _ = require( 'lodash' ),
                Promise = require( 'bluebird' ),
                getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
                sdhm = getCatalogDescriptor( {
                    actType: 'KBVUTILITY2',
                    short: 'SDHM2'
                } ),
                baseQuery = {
                    catalog: sdhm.filename
                },
                catalogUtilityPaths = [
                    'heilmittelverordnung.vorrangiges_heilmittel_liste.name',
                    'heilmittelverordnung.ergaenzendes_heilmittel_liste.name',
                    'heilmittelverordnung.standardisierte_heilmittel_kombination.name'
                ];

            return getModel( SU, 'catalog', true ).then( catalogModel => {
                return Promise.map( catalogUtilityPaths, path => {
                    return new Promise( ( resolve, reject ) => {
                        catalogModel.mongoose.collection.distinct( path, baseQuery, ( err, results ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( results );
                            }
                        } );
                    } );
                }, {concurrency: 1} ).then( _.flatten ).then( _.uniq );
            } );
        }

        function getKbvUtilities( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getKbvUtilities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getKbvUtilities');
            }
            getKbvUtilitesFromCatalog().then( results => args.callback( null, results ) ).catch( err => args.callback( err ) );
        }

        /**
         * Searches matching kbv utility name. Can be searched by Name and Position No.
         *
         * @param   {Object}            args
         * @return {Promise<Array<String>>}
         */
        function searchKbvUtilityNamesAndPositions( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.searchKbvUtilityNamesAndPositions', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.searchKbvUtilityNamesAndPositions');
            }
            const callback = args.callback;
            const SU = Y.doccirrus.auth.getSUForLocal();
            const Promise = require( 'bluebird' );
            const getModel = Promise.promisify( Y.doccirrus.mongodb.getModel );
            const term = args.originalParams && args.originalParams.query || '';
            const sdhm = getCatalogDescriptor( {
                actType: 'KBVUTILITY2',
                short: 'SDHM2'
            } );

            return getModel( SU, 'catalog', true ).then( catalogModel => {
                return catalogModel.mongoose.aggregate( [
                    {$match: {catalog: sdhm.filename}},
                    {
                        $project: {
                            vorrangiges_heilmittel_liste: '$heilmittelverordnung.vorrangiges_heilmittel_liste',
                            ergaenzendes_heilmittel_liste: '$heilmittelverordnung.ergaenzendes_heilmittel_liste',
                            standardisierte_heilmittel_kombination: '$heilmittelverordnung.standardisierte_heilmittel_kombination'
                        }
                    },
                    {$project: {hms: {$concatArrays: ['$vorrangiges_heilmittel_liste', '$ergaenzendes_heilmittel_liste', '$standardisierte_heilmittel_kombination']}}},
                    {$unwind: '$hms'},
                    {$group: {_id: '$hms.name', positionsnr_liste: {$addToSet: '$hms.positionsnr_liste'}}},
                    {
                        $project: {
                            _id: 0, name: '$_id', positionsnr_liste: {
                                $reduce: {
                                    input: '$positionsnr_liste',
                                    initialValue: [],
                                    in: {$concatArrays: ["$$value", "$$this"]}
                                }
                            }
                        }
                    },
                    {
                        $match: {
                            $or: [
                                {
                                    name: {
                                        $regex: term,
                                        $options: 'i'
                                    }
                                },
                                {positionsnr_liste: {$in: [new RegExp( term, 'i' )]}}
                            ]
                        }
                    }
                ] );
            } ).then( result => {
                Y.log( `found ${result.length} matching kbv utility names for term ${term}`, 'info', NAME );
                callback( null, result );
            } ).catch( err => {
                Y.log( `could not search kbvutility (sdhm) names and positions ${err.stack || err}`, 'error', NAME );
                callback( err );
            } );

        }

        function invalidateKbvUtility() {
            getKbvUtilitesFromCatalog().then( utilities => {
                return new Promise( ( resolve, reject ) => {
                    function finalCb( err ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve();
                        }
                    }

                    function checkTenant( user, callback ) {

                        Y.doccirrus.api.kbvutilityprice.checkPrices( {
                            user,
                            originalParams: {
                                utilities
                            },
                            callback: callback
                        } );
                    }

                    migrate.eachTenantParallelLimit( checkTenant, 1, finalCb );
                } );
            } );
        }

        function catalogViewerList( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.catalogViewerList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.catalogViewerList');
            }
            const
                SU = Y.doccirrus.auth.getSUForLocal(),
                {query, callback} = args;

            Promise.resolve().then( () => {

                if( !query.catalogShort ) {
                    throw Error( 'insufficent arguments' );
                }

                return Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalogviewerindex',
                    query: query,
                    options: {
                        sort: {
                            sortIndex: 1
                        }
                    }
                } );

            } ).then( results => {
                callback( null, results );
            } ).catch( err => {
                callback( err );
            } );

        }

        /**
         * [MOJ-12105]
         * Create an API endpoint to get all available catalogs for the catalogViewerList
         * @param   {Object}            args
         * @returns {Promise<*>}
         */
        async function catalogViewerListAvailableCatalogs( args ) {
            Y.log( 'Entering Y.doccirrus.api.catalog.catalogViewerListAvailableCatalogs', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.catalog.catalogViewerListAvailableCatalogs' );
            }
            const
                getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                {user, callback} = args,
                pipeline = [
                    {
                        $group: {
                            _id: "$catalogShort",
                            catalog: {$first: "$catalog"}
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ].filter( Boolean );

            let result, err, model;

            [err, model] = await formatPromiseResult( getModel( SU, 'catalogviewerindex' ) );
            if( err ) {
                Y.log( `could not get catalogviewerindex model: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult( model.mongoose.aggregate( pipeline ) );
            if( err ) {
                Y.log( `could not aggregate unique catalogs: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                result = result.filter( ( catalog ) => {
                    return -1 === catalog._id.indexOf( 'ARV' );
                });
            } else {
                let userLocations;
                [err, userLocations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    query: {
                        _id: {$in: user.locations.map( location => location._id )},
                        kv: {$ne: null}
                    },
                    options: {
                        select: {kv: 1}
                    }
                } ) );
                if( err ) {
                    Y.log( `could not get user location to filter arv catalogs by kv: ${err.stack || err}`, 'warn', NAME );
                } else {
                    const kvList = userLocations.map( userLocation => userLocation.kv );
                    result = result.filter( catalogEntry => {
                        const split = catalogEntry._id.split( '-' );
                        return split[0] !== 'ARV' || kvList.includes( split[1] );
                    } );
                }
            }

            callback( null, result.map( o => {
                return {
                    id: o._id,
                    text: (typeof o.catalog === "string" && o.catalog !== "") ? o.catalog : o._id
                };
            } ) );
        }

        function getQueriesByCatalogShort( term ) {
            const
                query = [
                    {
                        'data.seq': {
                            $regex: '^' + term,
                            $options: 'i'
                        }
                    },
                    {
                        'data.title': {
                            $regex: buildSearchRegExStr( term ),
                            $options: 'i'
                        }
                    },
                    {
                        'data.infos': {
                            $in: [new RegExp( term, 'i' )]
                        }
                    }
                ];

            return query;
        }

        function catalogViewerSearch( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.catalogViewerSearch', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.catalogViewerSearch');
            }
            const
                Promise = require( 'bluebird' ),
                SU = Y.doccirrus.auth.getSUForLocal(),
                {query, options = {}, callback} = args,
                resultTree = {children: []},
                nodesToFetchLater = {};

            let match, count;

            Promise.resolve().then( () => {
                match = {
                    catalogShort: query.catalogShort,
                    $or: getQueriesByCatalogShort( query.term )
                };

                if( !match.catalogShort ) {
                    throw Error( 'insufficent arguments' );
                }

                return Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    action: 'count',
                    model: 'catalogviewerindex',
                    query: match
                } );

            } ).then( c => {
                count = c;

                if( 0 === count ) {
                    Y.log( `inital count procduced zero results so skip aggregation`, 'debug', NAME );
                    return {result: []};
                }

                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    query: match,
                    model: 'catalogviewerindex',
                    options: {
                        ...options, select: {
                            path: 1
                        }
                    }
                } ) );
            } ).then( results => {
                return results.result;
            } ).then( results => {
                const findNode = ( tree, nodeId ) => {
                    return tree.find( node => {
                        return node._id === nodeId;
                    } );
                };
                const ensurePath = ( tree, path ) => {
                    let nodeId = path[0];
                    let node = findNode( tree, nodeId );
                    if( !node ) {
                        node = {_id: nodeId, children: []};
                        nodesToFetchLater[nodeId.toString()] = node;
                        tree.push( node );
                    }
                    if( path.length >= 2 ) {
                        ensurePath( node.children, path.slice( 1 ) );
                    }
                };

                results.forEach( result => {
                    result.path.push( result._id.toString() );
                    ensurePath( resultTree.children, result.path );
                } );

            } ).then( () => {
                const nodeIds = Object.keys( nodesToFetchLater );
                return Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalogviewerindex',
                    query: {_id: {$in: nodeIds}}
                } );
            } ).then( fetchedNodes => {
                const sortTree = ( node ) => {
                    if( Array.isArray( node.children ) ) {
                        node.children = node.children.sort( ( a, b ) => a.sortIndex - b.sortIndex );
                        node.children.forEach( sortTree );
                    }
                };

                fetchedNodes.forEach( fetchedNode => {
                    const node = nodesToFetchLater[fetchedNode._id.toString()];
                    if( node ) {
                        Object.assign( node, fetchedNode );
                        if( node.isDirectory === false ) {
                            node.children = null;
                        }
                    }
                } );

                sortTree( resultTree );

                callback( null, {
                    meta: {
                        errors: [],
                        warnings: [],
                        query: query,
                        itemsPerPage: options.limit,
                        totalItems: count,
                        page: (options.skip / options.limit) + 1,
                        replyCode: 200
                    },
                    data: resultTree.children
                } );
            } ).catch( err => {
                Y.log( `could not search catalog viewer indexes ${err.stack || err}`, 'error', NAME );
                callback( err );
            } );

        }

        function convertGopCode( activity ) {
            let gopCode = gopCodeMap.get( `${activity.catalogShort}_${activity.code}` );
            if( gopCode ) {
                activity.code = gopCode.seq;
                activity.u_extra = activity.u_extra || {};
                activity.u_extra.sub_gop_liste = Object.assign( {}, gopCode.u_extra.sub_gop_liste );
            }
        }

        function getEntriesByLocationId( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getEntriesByLocationId', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getEntriesByLocationId');
            }
            const { callback, originalParams } = args;
            const { select } = originalParams;

            args.options.select = select || {};

            getEBMDescriptorByLocationId( {
                ...args,
                callback: ( err, res ) => {
                    const filename = res && res.filename || null;
                    if ( err ) {
                        Y.log( `Could not get EBM descriptor by location id. ${err}`, 'error', NAME );
                        return callback(err);
                    }

                    args.query.catalog = filename;
                    getEntry( args );
                }
            } );
        }

        async function getTreatmentCatalogEntry( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getTreatmentCatalogEntry', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getTreatmentCatalogEntry');
            }
            const {user, originalParams, options, callback} = args;
            const SU = Y.doccirrus.auth.getSUForLocal();
            const {code, catalogShort, locationId} = originalParams;

            const inMigration = options && options.migrate ? options.migrate : false,
                ignoreHouseCatalog = options && options.ignoreHouseCatalog || false;

            let [err, desc] = await formatPromiseResult( getTreatmentCatalogCatalogDescriptor( user, catalogShort, locationId ) );

            const getCatalogEntry = async () => {
                if( err ) {
                    throw err;
                }

                return Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalog',
                    query: {
                        seq: code,
                        catalog: desc.filename
                    },
                    migrate: inMigration,
                    options: {
                        limit: 1
                    }
                } );
            };

            const getCatalogUsageEntry = async () => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalogusage',
                    query: {
                        seq: code,
                        catalogShort,
                        locationId
                    },
                    migrate: inMigration,
                    options: {
                        limit: 1
                    }
                } );
            };

            let result;

            if( !catalogShort || !locationId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'invalid params'} ) );

            }
            switch( catalogShort ) {
                case 'EBM':
                case 'TARMED':
                case 'TARMED_UVG_IVG_MVG':
                    [err, result] = await formatPromiseResult( getCatalogEntry() );

                    if( err ) {
                        Y.log( `could not get data for ${code} from catalog ${err.stack || err}`, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500 ) );
                    }
                    if( (!result || !result.length) && !ignoreHouseCatalog ) {
                        [err, result] = await formatPromiseResult( getCatalogUsageEntry() );

                        if( err ) {
                            Y.log( `could not get data for ${code} from catalogusage ${err.stack || err}`, 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500 ) );
                        }
                    }
                    break;
                case 'GOÄ':
                case 'UVGOÄ':
                case 'GebüH':
                    [err, result] = await formatPromiseResult( getCatalogUsageEntry() );
                    if( err ) {
                        Y.log( `could not get data for ${code} from catalogusage ${err.stack || err}`, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500 ) );
                    }
                    if( !result || !result.length ) {
                        [err, result] = await formatPromiseResult( getCatalogEntry() );
                        if( err ) {
                            Y.log( `could not get data for ${code} from catalog ${err.stack || err}`, 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500 ) );
                        }
                    }
                    break;
                default:
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `catalog ${catalogShort} not allowed`} ) );
            }
            const entry = result && result[0];
            if( entry ) {
                const defaultEBMDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );
                entry.catalog = true;
                // for EBM always set default global catalog filename like frontend does.
                entry.catalogRef = entry.catalogShort === 'EBM' ? defaultEBMDescriptor.filename : desc.filename;
            }
            callback( null, entry );
        }

        /**
         * This method is to retrive and search original and custom TARMED dignity catalog entries (qualitative and quantitative).
         *
         * @method getTarmedDignities
         * @JsonRpcApi
         * @PUBLIC
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED: User object for performing DB operation
         * @param {Object} args.model :REQUIRED: 'catalog'
         * @param {Object} args.query :OPTIONAL: Additional query params
         * @param {Object} args.options :OPTIONAL: Additional query options
         *
         * Backend params:
         * @param {String} args.type :OPTIONAL: Type 'quali' or 'quanti' (defaults to 'quali')
         * @param {String} args.searchTerm :OPTIONAL: Search term
         *
         * JsonRpc params:
         * @param {Object} args.callback :OPTIONAL: callback function for responding to JsonRpc call
         * @param {Object} args.originalParams :OPTIONAL:
         * @param {String} args.originalParams.type :OPTIONAL: Type 'quali' or 'quanti' (defaults to 'quali')
         * @param {String} args.originalParams.searchTerm :OPTIONAL: Search term
         *
         * @returns {Array} Dignity catalog and custom entries.
         */
        async function getTarmedDignities( args ) {
            Y.log( 'Entering Y.doccirrus.api.catalog.getTarmedDignities', 'info', NAME );
            let err, result;
            const
                {callback, originalParams, model = 'catalog', query = {}, options = {}} = args;
            const
                superUser = Y.doccirrus.auth.getSUForLocal();

        // Catalog Short & Catalog Descriptor ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            const type = originalParams && originalParams.type || args.type;
            const catalogShort = type === 'quanti' ? 'TARMED_DIGNI_QUANTI' : 'TARMED_DIGNI_QUALI';
            const catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: catalogShort
            } );

            if( !catalogDescriptor ) {
                Y.log( `getTarmedDignities(): could not get catalogDescriptor for catalog short ${catalogShort}. Tarmed dignities cannot be queried`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.catalog.getTarmedDignities', 'info', NAME );
                err = Y.doccirrus.errors.rest( `dignity_04_${type}` ); // dignity_04_quali || dignity_04_quanti
                if( callback ) {
                    return callback( err );
                } else {
                    throw err;
                }
            }

        // Search Term •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            let searchQuery;
            const searchTerm = (originalParams && originalParams.searchTerm !== undefined) ? originalParams.searchTerm : // Checking for undefined to allow for empty string
                args.searchTerm !== undefined ? args.searchTerm :
                    null;
            if( searchTerm !== null ) {
                const literalQuery = _.escapeRegExp( searchTerm.replace( /[^a-zA-Z\s]|(?<=[^a-zA-Z\s])([a-zA-Z]*)|([a-zA-Z]*)(?=[^a-zA-Z\s])/g, "" ) ); // Removes everything that is not a letter or whitespace as well as letters that are surrounded by other non-letter characters.

                searchQuery = {
                    $or: [
                        {
                            code: {
                                $regex: _.escapeRegExp( searchTerm ).trim().split( /(?![.-])/g ).join( "[-\.]?" ),
                                $options: 'i'
                            }
                        },
                        {
                            text: {
                                $regex: literalQuery.replace( /\s/g, "" ) ? `^(?=.*${literalQuery.trim().split( " " ).join( ")(?=.*" )})` : 'a^', // 'a^' does not match anything
                                $options: 'i'
                            }

                        }
                    ]
                };
            }

        // DB Request ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: superUser, model, options,
                query: {
                    ...query,
                    $and: [
                        {
                            $or: [
                                {catalog: catalogDescriptor.filename}, // Catalog entries
                                {catalogShort} // Custom Entries
                            ]
                        },
                        ...(searchQuery ? [searchQuery] : []) // Optionally adding a search query
                    ]
                }
            } ) );

            if( err ) {
                Y.log( `getTarmedDignities(): error in fetching Tarmed dignities:\n${err && err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.catalog.getTarmedDignities', 'info', NAME );
                err = Y.doccirrus.errors.rest( `dignity_00_${type}` ); // dignity_00_quali || dignity_00_quanti

                if( callback ) {
                    return callback( err );
                } else {
                    throw err;
                }
            }

        // Exiting •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            Y.log( 'Exiting Y.doccirrus.api.catalog.getTarmedDignities', 'info', NAME );
            return callback ? callback( null, result ) : result;
        }

        /**
         * This method is to retrieve TARMED canton catalog entries for a given code.
         *
         * @method getTarmedCantonsByCode
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object for performing DB operation
         * @param {Object} args.model :REQUIRED: 'catalog'
         * @param {Object} args.query :OPTIONAL: Additional query params
         * @param {Object} args.options :OPTIONAL: Query options
         * @param {Object} args.originalParams :REQUIRED: Params from JsonRpc call
         * @param {String} args.originalParams.code :REQUIRED: dignity code that is
         *
         * @returns {Array} Catalog entries found corresponding to the canton code
         */
        async function getTarmedCantonsByCode( args ) {
            let err, result;
            const {originalParams: {code}} = args;
            const suUser =  Y.doccirrus.auth.getSUForLocal();
            const {model, query, options, callback} = args;
            const catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'TARMED_CANTON'
            } );

            Object.assign( query, {
                code,
                catalog: catalogDescriptor.filename
            } );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {user: suUser, model, query, options} ) );

            if( err ) {
                Y.log( `getTarmedCantonsByCode(): error in getting TARMED cantons by code. code: ${code}\n ${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( `canton_01` ) );
            }

            return callback( null, result );
        }

        /**
         * This method is to search for TARMED canton catalog entries by code or text.
         *
         * @method searchTarmedCantonsByCodeOrName
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :REQUIRED: User object for performing DB operation
         * @param {Object} args.model :REQUIRED: 'catalog'
         * @param {Object} args.query :OPTIONAL: Additional query params
         * @param {Object} args.options :OPTIONAL: Query options
         * @param {Object} args.originalParams :REQUIRED: Params from JsonRpc call
         * @param {String} args.originalParams.searchTerm :REQUIRED: search term
         * @param {Boolean} args.originalParams.isSwiss :REQUIRED: is it Swiss version
         *
         * @returns {Array} Canton catalog entries found for the given search term
         */
        async function searchTarmedCantonsByCodeOrName( args ) {
            let err, result;
            const { originalParams: { isSwiss, searchTerm }} = args;
            const { model, query, options, callback } = args;
            const catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'TARMED_CANTON'
            } );
            const literalQuery = _.escapeRegExp( searchTerm.replace( /[^a-zA-Z\s]|(?<=[^a-zA-Z\s])([a-zA-Z]*)|([a-zA-Z]*)(?=[^a-zA-Z\s])/g, "" ) );//eslint no-invalid-regexp // Removes everything that is not a letter or whitespace as well as letters that are surrounded by other non-letter characters.

            Object.assign( query, {
                catalog: catalogDescriptor.filename
            } );
            if ( isSwiss ) {
                query.text = searchTerm;
            } else {
                query.$or = [
                    {
                        code: {
                            $regex: _.escapeRegExp( searchTerm ).trim().split( /(?![.-])/g ).join( "[-\.]?" ),
                            $options: 'i'
                        }
                    },
                    {
                        text: {
                            $regex: literalQuery.replace( /\s/g, "" ) ? `^(?=.*${literalQuery.trim().split( " " ).join( ")(?=.*" )})` : 'a^',//eslint no-invalid-regexp // 'a^' does not match anything
                            $options: 'i'
                        }

                    }
                ];
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {user: Y.doccirrus.auth.getSUForLocal(), model, query, options} ) );

            if( err ) {
                Y.log( `searchTarmedCantonsByCodeOrName(): error in searching for TARMED cantons. searchTerm: ${searchTerm}\n${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( `canton_00` ) );
            }

            return callback( null, result );
        }

        /**
         * Runs after each catalog deployment. Resets nonStandardOfficialNo if new lanr numbers are available.
         */
        function invalidateNonStandardOfficialNos() {
            function finalCb( err ) {
                if( err ) {
                    Y.log( `error while invalidating official nos ${err.stack || err}`, 'error', NAME );
                } else {
                    Y.log( 'successfully invalidated officinal nos', 'debug', NAME );
                }
            }

            async function invalidateTenant( user ) {
                Y.log( `invalidate official nos on tenant ${user.tenantId}`, 'info', NAME );
                const checkLanr = promisifyArgsCallback( Y.doccirrus.api.kbv.checkLanr );
                const models = ['employee', 'basecontact'];
                const query = {
                    nonStandardOfficialNo: true
                };
                let err, docs;
                for( let model of models ) {
                    Y.log( `invalidate non standard official nos on model ${model}`, 'info', NAME );
                    [err, docs] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {user, model, query} ) );
                    if( err ) {
                        Y.log( `invalidate non standard official nos on model ${model}: could not get documents: ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }
                    const officialNosToUpdate = [];

                    for( let doc of docs ) {
                        let result;
                        [err, result] = await formatPromiseResult( checkLanr( {user, query: {lanr: doc.officialNo}} ) );
                        if( err ) {
                            Y.log( `could not check lanr ${doc.officialNo}: ${err.stack || err}`, 'warn', NAME );
                            continue;
                        }

                        if( result.exists ) {
                            officialNosToUpdate.push( doc.officialNo );
                        }
                    }
                    if( officialNosToUpdate.length ) {
                        let results;
                        [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            model,
                            action: 'update',
                            query: {
                                officialNo: {$in: officialNosToUpdate}
                            },
                            data: {
                                nonStandardOfficialNo: false
                            }
                        } ) );
                        if( err ) {
                            Y.log( `could not reset nonStandardOfficialNo flag for ${model} officialNos ${officialNosToUpdate}: ${err.stack || err}`, 'warn', NAME );
                        } else {
                            Y.log( `successfully reset nonStandardOfficialNo flag for ${model} officialNos ${officialNosToUpdate}: ${results}`, 'info', NAME );
                        }

                    } else {
                        Y.log( `no officialNos to update found on model ${model}`, 'info', NAME );
                    }
                }
            }

            migrate.eachTenantParallelLimit( ( user, callback ) => {
                invalidateTenant( user ).then( () => callback() ).catch( err => callback( err ) );
            }, 1, finalCb );
        }

        /**
         * This method is to search for hierarchyRules codes and validate each by SubGopMap
         *
         * @method getHierarchyCodesByAge
         *
         * @param   {Object}            args
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Object} args.data.patient        contains SubGop related data (age, death modifcator, treatmentNeeds )
         * @param {Object} args.data.catalogShort
         *
         * @returns {Array<Object>} Catalog entries found for the given query and mark by SubGopMap substitution
         */
        async function getHierarchyCodesByAge( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getHierarchyCodesByAge', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getHierarchyCodesByAge');
            }
            const {query, options, data: {patient, catalogShort, actType}, callback} = args,
                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: actType,
                    short: catalogShort
                } ),
                codesDisabledForKVG = ['39.0020'];

            if( !patient || !catalogShort ) {
                Y.log( `getHierarchyCodesByAge: missed required data.`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'insufficient data' ) );
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        ...query,
                        catalog: catalogDescriptor && catalogDescriptor.filename || ''
                    },
                    options
                })
            );

            if( err ) {
                Y.log( `getHierarchyCodesByAge: error in getting hierarchy catalogs. ${query}\n${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500 ) );
            }

            const
                deathmom = patient.dateOfDeath,
                age = deathmom ? (patient.kbvDob ? moment( deathmom ).diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '') :
                    (patient.kbvDob ? moment().diff( moment( patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : '');

            result.result = (result.result || []).map( entry => {
                const mappedSubGop = gopCodeMap.get( `${catalogShort}_${entry.seq}` );

                if(!mappedSubGop){
                    return entry;
                }
                const subGop = Y.doccirrus.schemas.catalog.getSubGop( mappedSubGop.u_extra, age, {treatmentNeeds: patient.treatmentNeeds || false} );

                if( entry.seq !== subGop ){
                    entry.disabledByAge = true;
                }

                return entry;
            });

            result.result.forEach( ( entry ) => {
                if( 'TARMED_UVG_IVG_MVG' === catalogShort && -1 !== codesDisabledForKVG.indexOf( entry.seq ) ) {
                    entry.disabledByAge = true;
                }
            });

            return callback( null, result );
        }

        /**
         * This method is to search for hierarchyRules codes for Referenzleistung and Zuschlagsleistung
         *
         * @method getSecondaryHierarchyCodes
         * @param   {Object}            args
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Object} args.data.actType
         * @param {Object} args.data.catalogShort
         *
         * @returns {Array<Object>} Catalog entries found for the given query
         */
        async function getSecondaryHierarchyCodes( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getSecondaryHierarchyCodes', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getSecondaryHierarchyCodes');
            }
            const {query, options, data: {actType, catalogShort}, callback} = args,
                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: actType,
                    short: catalogShort
                } );

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        ...query,
                        catalog: catalogDescriptor && catalogDescriptor.filename || ''
                    },
                    options
                })
            );

            if( err ) {
                Y.log( `getSecondaryHierarchyCodes: error in getting hierarchy catalogs. ${query}\n${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500 ) );
            }

            return callback( null, result );
        }

        /**
         * @param   {Object}            args
         * @param {Object} args.query
         * @param {Object} args.data
         * @param {Object} args.callback
         * @return {Promise<{}[]>}
         */
        async function getIcd10Catalog( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getIcd10Catalog', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getIcd10Catalog');
            }
            const { options, data: { title = '' }, callback } = args,
                catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'DIAGNOSIS',
                    short: 'ICD-10'
                } );

            let
                err,
                result,
                query = {
                    $and: [
                        { catalog: catalogDescriptor.filename },
                        { seq: { $ne: null } },
                        {
                            $or: [
                                {
                                    seq: {
                                        $regex: '^' + title,
                                        $options: 'i'
                                    }
                                },
                                {
                                    title: {
                                        $regex: buildSearchRegExStr( title ),
                                        $options: 'i'
                                    }
                                },
                                {
                                    infos: {
                                        $in: [new RegExp( title, 'i' )]
                                    }
                                }
                            ]
                        }
                    ]
                };

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query,
                    options
                })
            );

            if( err ) {
                Y.log( `getIcd10Catalog: error trying to get an ICD10 catalog result. query term:  ${title} \n ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            return callback( null, result );
        }

        /**
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.options
         * @param {Object} args.callback
         * @return {Promise<{}[]>}
         */
        async function getHouseCatalog( args ) {
            Y.log('Entering Y.doccirrus.api.catalog.getHouseCatalog', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getHouseCatalog');
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'catalogusage',
                user: Y.doccirrus.auth.getSUForLocal(),
                action: 'get',
                query: {
                    catalogShort: 'MMI',
                    locationId: args.data.locationId
                },
                options: args.data.options
            }, args.callback );
        }

        Y.namespace( 'doccirrus.api' ).catalog = {
            name: NAME,
            init: initCatalogService, // will be called by dcdb on startup
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.get');
                }
                getEntry( args );
            },
            getCatalogsPath: getCatalogsPath,
            getHouseCatalog: getHouseCatalog,
            getCatalogDescriptors: getCatalogDescriptors,
            getCatalogDescriptor: getCatalogDescriptor,
            getParserForCatalogName: getParserForCatalogName,
            getCatalogDescriptorForName: getCatalogDescriptorForName,
            getFrontendCatalogDescriptors: getFrontendCatalogDescriptors,
            getCatalogDescriptorsByActType: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.getCatalogDescriptorsByActType', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.getCatalogDescriptorsByActType');
                }
                getCatalogDescriptorsByActType( args );
            },
            getCatalogDescriptorsForFrontend: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.catalog.getCatalogDescriptorsForFrontend', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.catalog.getCatalogDescriptorsForFrontend');
                }
                var
                    params = parameters.originalParams,
                    callback = parameters.callback,
                    result;

                result = getFrontendCatalogDescriptors( params );

                callback( null, result );
            },
            getEBMDescriptorByLocationId: getEBMDescriptorByLocationId,
            getCatalogShortByTimestamp: getCatalogShortByTimestamp,
            getPKVKT: getPKVKT,
            catsearch: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.catsearch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.catsearch');
                }
                catsearch( args );
            },
            verifyKT: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.verifyKT', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.verifyKT');
                }
                verifyKT( args );
            },
            catalogCodeSearch: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.catalogCodeSearch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.catalogCodeSearch');
                }
                catalogCodeSearch( args );
            },
            searchNotHK: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalog.searchNotHK', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalog.searchNotHK');
                }
                searchNotHK( args );
            },
            catalogusageSearch: catalogusageSearch,
            resetImportLock: resetCatalogImportLock,
            hmvSearch: hmvSearch,
            hmvCatalogUsageSearch: hmvCatalogUsageSearch,
            utItemSearch: utItemSearch,
            getKvList: getKvList,
            getInsurances: getInsurances,
            ghdHmvSearch: ghdHmvSearch,
            getCostCarrierBillingGroups: getCostCarrierBillingGroups,
            getSddaEntries: getSddaEntries,
            searchKbvUtility: searchKbvUtility,
            getUtilityAgreement: getUtilityAgreement,
            getIcdsFromDiagnosisGroup: getIcdsFromDiagnosisGroup,
            searchIcdsInCatalogAndPatient: searchIcdsInCatalogAndPatient,
            lookup: lookup,
            getKbvUtilities: getKbvUtilities,
            catalogViewerList,
            catalogViewerListAvailableCatalogs,
            catalogViewerSearch,
            convertGopCode,
            getEntriesByLocationId,
            searchKbvUtilityNamesAndPositions,
            getTreatmentCatalogEntry,
            getTarmedCantonsByCode,
            searchTarmedCantonsByCodeOrName,
            getTarmedDignities,
            searchOmimCatalog,
            getTreatmentCatalogCatalogDescriptor,
            getHierarchyCodesByAge,
            getSecondaryHierarchyCodes,
            getIcd10Catalog
        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'dccommonutils',
            'dcmongoutils',
            'dccatalogparser',
            'dckbvutils',
            'dcauth',
            'admin-schema',
            'kbv-api',
            'kbvutilitycatalogcommonutils',
            'catalogviewerindex-schema',
            'kbv-api'
        ]
    }
);
