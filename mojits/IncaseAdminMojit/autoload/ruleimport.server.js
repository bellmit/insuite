/**
 * User: do
 * Date: 11/12/15  15:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcruleimport', function( Y, NAME ) {
        /**
         * How to create new rules from catalogs
         * 1. Create new rules from current catalogs: /1/rule/:importFromCatalog?catalogShort=EBM|GOÄ
         * 2. Add Rule Meta to created rules: /1/methodsTest/:setRuleMeta
         */
        const
            RULESETS_PER_DIRECTORY = 50,
            {formatPromiseResult} = require('dc-core').utils,
            Prom = require( 'bluebird' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            getCatalogShortByName = Y.doccirrus.ruleimportutils.getCatalogShortByName,
            forEachCatalogEntry = Y.doccirrus.ruleimportutils.forEachCatalogEntry,
            mapCatalogShortToCaseFolderType = Y.doccirrus.ruleimportutils.mapCatalogShortToCaseFolderType,
            removeImportedRuleSets = Y.doccirrus.ruleimportutils.removeImportedRuleSets,
            needsNewDirectory = Y.doccirrus.ruleimportutils.needsNewDirectory,
            CATALOG_SHORT_TO_RULE_MAPPER = new Map([
                ['EBM', 'ebmRuleMapper'],
                ['GOÄ', 'ebmRuleMapper'],
                ['UVGOÄ', 'ebmRuleMapper'],
                ['TARMED', 'tarmedRuleMapper'],
                ['TARMED_UVG_IVG_MVG', 'tarmedRuleMapper'],
                ['Pandemieleistungen', 'tarmedRuleMapper']
            ]);

        function getRuleSetForRefArea( kbvRefArea, ruleSetBasicData ) {
            const newRuleSet = Object.assign( {rules: []}, ruleSetBasicData, kbvRefArea.ruleSetConfig );
            if( kbvRefArea.name !== '0' ) {
                newRuleSet.description = `${newRuleSet.description} ${kbvRefArea.name}`;
            }
            return newRuleSet;
        }

        /**
         * @method importFromEBM
         * @private
         *
         * for each related to catalogShort catalog entry generate rules using appropriate mapper:
         * - tarmed-rulemapper
         * - ebm-rulemapper
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.catalogShort
         * @param {Number} args.nRemoved
         *
         * @returns {Nothing} - send events to client about progress and finish
         */
        async function importFromEBM( args ) {

            let ruleSetCount = 0,
                ruleCount = 0,
                lastDirectoryId = null,
                ruleSetProcessed = 0;

            const
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                newDirectories = [],
                catalogShort = args.catalogShort,
                baseParentId = Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( catalogShort ),
                caseFolderType = mapCatalogShortToCaseFolderType( catalogShort ),
                emitCount = 100;

            let apxTotalCount = 2000,
                treatmentGroups,
                treatmentBlocks;

            if( catalogShort === 'EBM' ) {
                apxTotalCount = 4500;
            } else if( catalogShort === 'GOÄ' ) {
                apxTotalCount = 1500;
            } else if( catalogShort === 'TARMED_UVG_IVG_MVG' || catalogShort === 'TARMED' ) {
                apxTotalCount = 7500;
            }

            function onEntry( entry ) {

                const ruleSetsMap = {};
                const ruleSetBasicData = {
                    description: `${(catalogShort === 'TARMED_UVG_IVG_MVG' ? 'TARMED' : catalogShort)} ${entry.seq}`,
                    caseFolderType: caseFolderType,
                    fromCatalog: entry.catalog,
                    fromCatalogShort: getCatalogShortByName( entry.catalog ),
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( catalogShort ),
                    isLocked: true
                };
                const u_extra = entry.u_extra;

                if( !u_extra ) {
                    return;
                }

                return Prom.each( Object.keys( u_extra ), key => {
                    return new Prom( function( resolve ) {
                        setImmediate( function() {
                            const ruleMapper = CATALOG_SHORT_TO_RULE_MAPPER.get( catalogShort );
                            const result = Y.doccirrus[ruleMapper].map( key, u_extra[key], {
                                catalogShort,
                                validFrom: entry.validFrom,
                                validUntil: entry.validUntil,
                                code: entry.seq,
                                actType: 'TREATMENT',
                                treatmentCategory: entry.treatmentCategory,
                                treatmentGroups,
                                treatmentBlocks
                            }, u_extra );

                            if( result && result.rules && result.rules.length ) {
                                ruleCount += result.rules.length;
                                result.rules.forEach( rule => {
                                    let ruleSet = ruleSetsMap[rule._refArea.code] || getRuleSetForRefArea( rule._refArea, ruleSetBasicData );
                                    if( ruleSet ) {
                                        ruleSetsMap[rule._refArea.code] = ruleSet;
                                        ruleSet.rules.push( rule );
                                    } else {
                                        Y.log( 'no rule set found for refA', rule._refArea, 'debug', NAME );
                                    }
                                    delete rule._refArea;
                                } );
                            }
                            resolve();
                        } );
                    } );
                } ).then( () => {
                    let results = [];
                    Object.values( ruleSetsMap ).forEach( ruleSet => {

                        if( needsNewDirectory( ruleSetCount, RULESETS_PER_DIRECTORY ) ) {
                            lastDirectoryId = new ObjectId().toString();
                            newDirectories.push( {
                                _id: lastDirectoryId,
                                idStr: lastDirectoryId,
                                parent: baseParentId,
                                isDirectory: true,
                                isLocked: true,
                                name: (ruleSetCount + 1) + '-' + (ruleSetCount + RULESETS_PER_DIRECTORY),
                                fromCatalog: ruleSet.fromCatalog,
                                fromCatalogShort: ruleSet.fromCatalogShort
                            } );
                        }

                        ruleSet.parent = lastDirectoryId;

                        ruleSetCount++;
                        if( (ruleSetProcessed++) >= emitCount ) {
                            ruleSetProcessed = 0;

                            Y.doccirrus.communication.emitEventForSession( {
                                sessionId: args.user.sessionId,
                                event: 'ruleImport',
                                msg: {
                                    data: {
                                        status: 'processing',
                                        nRuleSets: ruleSetCount,
                                        percents: 100 * ruleSetCount / apxTotalCount
                                    }
                                }
                            } );

                        }
                        ruleSet.rules = Y.doccirrus.schemautils.prepareKey( ruleSet.rules );

                        let meta = Y.doccirrus.ruleutils.getMeta( ruleSet.rules, ruleSet );
                        ruleSet.rules = ruleSet.rules.map( rule => {
                            if( rule.ruleId ) {
                                return rule;
                            }
                            rule.ruleId = ( new ObjectId() ).toString();
                            return rule;
                        });

                        ruleSet._id = new ObjectId();
                        ruleSet.idStr = ruleSet._id.toString();

                        ruleSet.metaActTypes = meta.actTypes;
                        ruleSet.metaActCodes = meta.actCodes;
                        ruleSet.metaCriterias = (meta.criterias || []).filter( el => el.indexOf( '$' ) !== 0 );
                        ruleSet.metaFuzzy = meta.metaFuzzy;
                        ruleSet.metaCaseOpen = meta.metaCaseOpen;

                        results.push( ruleSet );

                    } );

                    if( results.length ) {
                        return new Prom( function( resolve, reject ) {
                            Y.doccirrus.api.rule.post( {
                                user: args.user,
                                data: results,
                                options: {
                                    isImport: true
                                },
                                callback: err => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve();
                                    }
                                }
                            } );
                        } );
                    }
                    return results;
                } );

            }

            if( !catalogShort ) {
                Y.log( 'could not import rules: catalogShort not defined', 'error', NAME );
                throw Error( 'could not import rules: catalogShort not defined' );
            }

            if( !caseFolderType ) {
                Y.log( 'could not import rules from ' + catalogShort, 'error', NAME );
                throw Error( 'could not import rules from ' + catalogShort );
            }

            if( ['TARMED_UVG_IVG_MVG', 'TARMED', 'Pandemieleistungen'].includes( catalogShort ) ) {
                let catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: catalogShort
                } );

                if( catalog && catalog.filename ) {
                    //collect treatment groups members
                    let [err, aggregation] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'catalog',
                            action: 'aggregate',
                            pipeline: [
                                {
                                    $match: {
                                        catalog: catalog.filename,
                                        'u_extra.treatmentGroups': {$not: {$size: 0}}
                                    }
                                },
                                {$project: {seq: 1, code: '$u_extra.treatmentGroups.code'}},
                                {$unwind: '$code'},
                                {$group: {_id: '$code', groupMembers: {$addToSet: '$seq'}}}

                            ]
                        } )
                    );

                    if( err ) {
                        Y.log( `importFromEBM: Error aggregating Treatment groups: ${err.stack || err}`, "error", NAME );
                        throw err;
                    }

                    treatmentGroups = aggregation && aggregation.result;

                    //collect treatment blocks items
                    [err, aggregation] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'catalog',
                            action: 'aggregate',
                            pipeline: [
                                {
                                    $match: {
                                        catalog: catalog.filename,
                                        'u_extra.blocRules': {$not: {$size: 0}}
                                    }
                                },
                                {$project: {seq: 1, code: '$u_extra.blocRules.code'}},
                                {$unwind: '$code'},
                                {$group: {_id: '$code', groupMembers: {$addToSet: '$seq'}}}

                            ]
                        } )
                    );

                    if( err ) {
                        Y.log( `importFromEBM: Error aggregating Treatment blocks: ${err.stack || err}`, "error", NAME );
                        throw err;
                    }
                    treatmentBlocks = aggregation && aggregation.result;
                }
            }

            return forEachCatalogEntry( args.catalogShort, 'TREATMENT', onEntry )
                .then( results => {
                    if( newDirectories.length ) {
                        return runDb( {
                            user: args.user,
                            model: 'rule',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( newDirectories )
                        } ).then( function() {
                            return results;
                        } );
                    } else {
                        return results;
                    }
                } ).then( () => {
                    Y.doccirrus.communication.emitEventForSession( {
                        sessionId: args.user.sessionId,
                        event: 'ruleImport',
                        msg: {
                            data: {
                                status: 'done',
                                nRemoved: args.nRemoved,
                                nRuleSets: ruleSetCount,
                                nRules: ruleCount
                            }
                        }
                    } );

                    return {nRemoved: args.nRemoved, nRuleSets: ruleSetCount, nRules: ruleCount};
                } );
        }

        function fromCatalog( args ) {

            if( !args.catalogShort ) {
                return Prom.reject( Error( 'missing parameter: catalogShort' ) );
            }

            return removeImportedRuleSets( args.user, args.catalogShort ).then( nRemoved => {
                args.nRemoved = nRemoved;
                Y.log( 'removed ' + nRemoved + ' ruleSets before importing' + args.catalogShort + ' catalog rules', 'debug', NAME );
                switch( args.catalogShort ) {
                    case 'GOÄ':
                    case 'UVGOÄ':
                    case 'EBM': // TODOOO handle kv-specific EBM catalogs
                    case 'TARMED':
                    case 'Pandemieleistungen':
                    case 'TARMED_UVG_IVG_MVG':
                        return importFromEBM( args );
                    default:
                        return Prom.reject( Error( 'could not find importer for catalogShort ' + args.catalogShort ) );
                }

            } );
        }

        Y.namespace( 'doccirrus' ).ruleimport = {

            name: NAME,
            fromCatalog: fromCatalog

        };
    },
    '0.0.1', {requires: ['dcruleimportutils', 'dcebmrulemapper', 'dctarmedrulemapper', 'rule-schema', 'schemautils']}
);

