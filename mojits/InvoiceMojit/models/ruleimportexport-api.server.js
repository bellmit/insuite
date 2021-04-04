/*global YUI */


YUI.add( 'ruleimportexport-api', function( Y, NAME ) {

        const
            async = require( 'async' ),
            _ = require( 'lodash' ),
            exportDir = Y.doccirrus.auth.getTmpDir() + '/export/',
            importDir = Y.doccirrus.auth.getTmpDir() + '/import/',
            metaFileName = 'rules_meta.json',
            moment = require('moment'),
            ObjectId = require( 'mongodb' ).ObjectID,
            fs = require( 'fs' ),
            {formatPromiseResult} = require('dc-core').utils;

        const
            ProcessingStatus = {
                PROCESSING: 'PROCESSING',
                NO_PROCESSING: 'NOTPROCESSING'
            };

        //EXTMOJ-1002, EXTMOJ-1056
        function fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, callback ){
            let
                wrong = null;

            async.waterfall([
                (nextWaterFall) => {
                    //find failed folders with wrong ID
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'get',
                        query: {parent: parent, isDirectory: true, name: wrongNameRegexp, _id: {$ne: correctId}},
                        options: {lean: true}
                    }, nextWaterFall );
                },
                (results, nextWaterFall) => {
                    if(results && results.length){
                        wrong = results[0]._id.toString();
                    }
                    nextWaterFall(null, results);
                },
                (results, nextWaterFall) => {
                    // remap child from wrong folder to correct one
                    if( !wrong ){
                        return nextWaterFall(null, {});
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'update',
                        query: { parent: wrong },
                        data: { $set: { parent: correctId.toString() } },
                        options: { multi: true }
                    }, nextWaterFall );
                },
                (results, nextWaterFall) => {
                    // remove wrong folders
                    if( !wrong ){
                        return nextWaterFall(null, {});
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'delete',
                        query: { _id: new ObjectId( wrong ) },
                        options: { multi: false }
                    }, nextWaterFall );
                },
                (results, nextWaterFall) => {
                    // set isLocked = true
                    if( !wrong ){
                        return nextWaterFall(null, {});
                    }
                    Y.doccirrus.ruleutils.walkDownFrom( user, correctId.toString(), (rule) => {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'put',
                            user: user,
                            model: 'rule',
                            query: {_id: rule._id, isLocked: false },
                            fields: ['isLocked'],
                            data: Y.doccirrus.filters.cleanDbObject( { isLocked: true } )
                        }, ( err ) => {
                            if( err ){
                                Y.log(' error on setting Lock state' + err.message, 'error', NAME );
                            }
                        } );
                    } ).then( () => {
                        nextWaterFall( null );
                    } );
                }
            ], (err) => {
                callback(err);
            } );
        }

        function lockRulesDown(user, parentId, callback){ // eslint-disable-line
            let parentNodes = [ parentId ];


            Y.doccirrus.ruleutils.walkDownFrom( user, parentId, (rule) => {
                if(rule.parent){
                    parentNodes.push( rule.parent );
                }
            } ).then( () => {
                parentNodes =_.uniq(parentNodes);
                if( parentNodes ){
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'update',
                        query: {parent: {$in: parentNodes}, isLocked: false },
                        data: { $set: { isLocked: true } },
                        options: { multi: true }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( ' error on setting Lock state Down ' + err.message, 'error', NAME );
                        }
                        callback( null );
                    } );
                } else {
                    return callback( null );
                }
            } );

        }

        function makeExportDir( user, callback ) {
            var
                tenantDir = exportDir + (user.tenantId ? user.tenantId : '') + '/';

            tenantDir = tenantDir.replace( '//', '/0/' );

            function onMkDir( err ) {
                if( err ) {
                    callback( err );
                    return;
                }
                callback( null, tenantDir );
            }

            Y.doccirrus.media.mkdirIfMissing( tenantDir, onMkDir );
        }

        function makeImportDir( cb ) {
            var
                dir = importDir;

            function onMkDir( err ) {
                if( err ) {
                    Y.log('Error on making import dir ' + JSON.stringify( err ), 'error', NAME );
                }
                if( cb ){
                    return cb();
                }
            }

            Y.doccirrus.media.mkdirIfMissing( dir, onMkDir );
        }

        function clearImportDir( callback ) {
             Y.doccirrus.media.deleteRecursive( importDir, '', callback );
        }

        function clearExportDir( user, callback ) {

            var tenantDir;

            function onExportDirCleared( err ) {
                if( err ) {
                    callback( 'Could not clear tenant form export dir: ' + err );
                    return;
                }
                callback( null, tenantDir );
            }

            function onExportDirCreated( err, useTenantDir ) {

                if( err ) {
                    callback( err );
                    return;
                }

                tenantDir = useTenantDir;

                Y.log( 'Clearing rule import/export directory: ' + tenantDir, 'info', NAME );
                Y.doccirrus.media.deleteRecursive( tenantDir, '', onExportDirCleared );
            }

            makeExportDir( user, onExportDirCreated );
        }

        function getImportDir( user, callback ) {
            callback(null, importDir);
        }

        function clearByMetadata( metaDataFileName, user, callback ) {
            let exportDir = '';
            async.waterfall( [
                ( next ) => makeExportDir( user, next ),
                ( expDir, next ) => {
                    exportDir = expDir;
                    loadMetadata( expDir, metaDataFileName, next );
                },
                ( loadedMetadata, next ) => {
                    let
                        fileName = metaDataFileName.replace( '_meta.json', '' ),
                        files = _.chain( loadedMetadata )
                            .pluck( 'files' )
                            .flatten()
                            .filter()
                            .uniq()
                            .map( v => ({'_id': v}) )
                            .value();

                    if( 'rules' === fileName ) {
                        fileName = 'rule';
                    }

                    if( !files.length ) {
                        files = loadedMetadata;
                    }
                    async.each( files, ( fMeta, cb ) => Y.doccirrus.media.tempRemove( `${exportDir}${fileName}_${fMeta._id}.json`, ( err ) => {
                        if( err ){
                            Y.log(`rule:clearByMetadata error on deleting ${fileName}_${fMeta._id}.json : ${err.stack || err}`, 'debug', NAME);
                        }
                        cb();
                    } ), ( err, result ) => next( err, result ) );
                },
                ( result, next ) => {
                    Y.doccirrus.media.tempRemove( `${exportDir}${metaDataFileName}`, () => next() );
                }
            ], ( err, result ) => {
                callback( err, result );
            } );
        }

        function filterMetadataDown( all, ids, res ) {
            let filtered = all.filter( el => ids.indexOf( el.parent ) >= 0 );
            res = res.concat( filtered );
            if( filtered.length ) {
                return filterMetadataDown( all, filtered.map( el => el._id.toString() ), res );
            } else {
                return res;
            }
        }

        function filterMetadataUp( all, id, res, up ) {
            let filtered = all.filter( el => el._id.toString() === id );
            up = up || false;
            filtered = filtered.map( el => {
                if( true === el.isDirectory ){
                    el.up = up;
                }
                return el;
            } );
            res = res.concat( filtered );
            if( filtered[0] && filtered[0].parent ) {
                return filterMetadataUp( all, filtered[0].parent, res, true );
            } else {
                return res;
            }

        }

        function setFullNameDown( all, id, fullName ) {
            let filtered = all.filter( el => id === el.parent );
            filtered.forEach( ( el ) => {
                let fName = fullName + '/' + (el.name.replace('/', '{**}') || '').trim();
                el.fullName = fName;
                setFullNameDown( all, el._id.toString(), fName );
            } );
        }

        function setTotalCountDown( all, parentId ) {

            let nodes = all.filter( el => el.parent === parentId );

            if( !nodes.length ) {
                return 0;
            }

            let sum = 0;
            nodes.forEach( ( nd ) => {
                nd.totalCount = ((nd.files && nd.files.length) || 0) + setTotalCountDown( all, nd._id.toString() );
                sum = sum + nd.totalCount;
            } );
            return sum;
        }

        function mergeDirectoriesDown( cb, user, imported, fromDb, id, dbParentId, ind ) {
            let filtered = imported.filter( el => id === el.parent );
            async.each(filtered, ( el, nextEach ) => {
                let dbFiltered = fromDb.filter( ar => {
                    let importPath = el.fullName && el.fullName.toLowerCase().trim(),
                        importPathCurr = importPath.split('/').filter( (el, indx) => { return indx <= ind; } ).join('/'),
                        dbPath = ar.fullName && ar.fullName.toLowerCase().trim();

                    return dbPath === importPathCurr;
                } );
                if( dbFiltered.length ) {
                    el.dbId = dbFiltered[0]._id.toString();
                    mergeDirectoriesDown( nextEach , user, imported, fromDb, el._id.toString(), el.dbId, 1 + ind );
                } else {
                    el.parent = dbParentId;
                    postMetadata( user, 'rule', el, ( err, result ) => {
                        if( err ) {
                            Y.log( 'Error during creating directory: ' + JSON.stringify( err ), 'error' );
                        }
                        el.dbId = result && result[0] || el._id.toString();
                        mergeDirectoriesDown( nextEach , user, imported, fromDb, el._id.toString(), el.dbId, 1 + ind );
                    } );

                }

            }, (err) => {
                if( err ){
                    Y.log( 'Error on processing folders ' + err.message, 'error', NAME );
                }
                cb(null, imported);
            } );

        }

        function getFolders( user, model, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: {
                    "isDirectory": true
                },
                options: {
                    lean: true
                },
                callback: callback
            } );
        }

        function getMetadata( callback, user, model, filterParent, upOnly = false ) {
            getFolders( user, model, ( err, result ) => {
                if( err ) {
                    return callback( err );
                }

                let filteredResult = result;
                if( filterParent !== null ) {
                    filteredResult = filterMetadataUp( result, filterParent, [], false );
                    if( !upOnly ) {
                        filteredResult = filteredResult.concat( filterMetadataDown( result, [filterParent], [] ) );
                    }
                }
                setFullNameDown( filteredResult, null, 'rules' );
                return callback( null, filteredResult );
            } );
        }

        function postMetadata( user, model, data, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( _.omit( data, ["_id", "fullName", "dbId"] ) ),
                callback: callback
            } );
        }

        function loadMetadata( path, filename, next ) {
            Y.doccirrus.media.readFile( path + filename, path, ( err, result ) => {
                if( !err && result.length ) {
                    result = JSON.parse( result );
                }
                if( err && -2 === err.errno ) {
                    err = null;
                }
                next( err, result || [] );
            } );
        }

        function getExportData( user, model, query, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: query,
                options: {
                    lean: true
                }
            }, callback );
        }

        function getFoldersCount( user, model, query, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'count',
                query: query,
                callback: callback
            } );
        }

        function listSetOnDB( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.listSetOnDB', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.listSetOnDB');
            }
            const
                user = args.user,
                model = 'rule';

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: model,
                user: user,
                query: args.query,
                options: Object.assign( args.options, {lean: true} )
            }, ( err, results ) => {
                let filtered = (results && results.result || []).filter( el => true === el.isDirectory );
                if( !filtered.length ) {
                    return args.callback( err, results );
                }

                getFolders( user, model, ( err, all ) => {
                    const filteredFolders = all.filter(entry => Y.doccirrus.api.rule.filterLicensed(user.tenantId, entry));
                    function iterator( folder, callback ) {
                        let folderId = folder._id.toString(),
                            parentIds = filterMetadataDown( filteredFolders, [folderId], [] ).map( el => el._id.toString() );
                        parentIds.push( folderId );
                        getFoldersCount( user, model, {
                            isDirectory: false,
                            parent: {$in: parentIds}
                        }, ( err, count ) => {
                            if( err ) {
                                Y.log( 'Error on getting folders count ' + JSON.stringify( err ), 'error', NAME );
                            }
                            folder.totalCount = count;
                            callback( null );
                        } );

                    }

                    if( err ) {
                        return args.callback( err );
                    }

                    async.each( filtered, iterator, ( err ) => {
                        return args.callback( err, results );
                    } );
                } );
            } );
        }

        function listSetOnDisk( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.listSetOnDisk', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.listSetOnDisk');
            }
            const
                user = args.user,
                callback = args.callback,
                query = args.query,
                isImport = args.import || false,
                metaFileName = 'rules_meta.json';

            var dir = null,
                metaDataFromDisk = [], // eslint-disable-line
                metaData = [],
                dataFromDisk = [];

            async.waterfall( [
                ( next ) => {
                    if( isImport ) {
                        getImportDir( user, next );
                    } else {
                        makeExportDir( user, next );
                    }
                },
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    /*metaDataFromDisk = loadedMetadata;  -- unused, todo delete*/
                    metaData = loadedMetadata.filter( el => el.parent === query.parent );

                    let files = [],
                        filtered;

                    filtered = loadedMetadata.filter( el => el._id.toString() === query.parent ) || [];
                    filtered.forEach( ( el ) => {
                        if( el.files && el.files.length ) {
                            files = files.concat( el.files );
                        }
                    } );
                    if( files.length ) {
                        async.eachLimit( files, 200, iterator, ( err ) => {
                            next( err );
                        } );
                    } else {
                        return next();
                    }

                    function iterator( ruleId, cb ) {
                        Y.doccirrus.media.readFile( dir + 'rule_' + ruleId + '.json', dir, ( err, result ) => {
                            if( !err && result ) {
                                dataFromDisk.push( JSON.parse( result ) );
                            }
                            cb( err );
                        } );
                    }

                }
            ], ( err ) => {
                if( err ) {
                    Y.log( 'Error during rules export: ' + JSON.stringify( err ) + 'error' );
                }
                callback( err, metaData.concat( dataFromDisk ) );
            } );
        }

        /**
         * Upserts all default items specified in rule-schema.
         * @param {Object} user
         * @param {Function} callback
         */
        function ensureDefaultFoldersExist( user, callback ) {
            Y.doccirrus.mongodb.getModel( user, 'rule', true, ( err, model ) => {
                if( err ) {
                    return callback( err );
                }
                const defaultItems = Y.doccirrus.schemas.rule.defaultItems;
                if( defaultItems ) {
                    async.eachSeries( defaultItems, function( defaultItem, done ) {
                        let id = new ObjectId( defaultItem._id );
                        model.mongoose.findOneAndUpdate( {_id: id}, _.omit( defaultItem, ['_id'] ), {upsert: true}, done );
                    }, (err) => {
                        callback(err);
                    } );
                } else {
                    return callback();
                }
            } );
        }


        /**
         *  check if eule folder should be imported om German/Swiss system
         *  @param {Object} user
         *  @param {String} ruleId
         *  @return {Boolean} true if folder should be imorted
         */
        function checkByCountry( user, ruleId ) {

            const
                german = [
                    Y.doccirrus.schemas.rule.getDcDirId(),
                    Y.doccirrus.schemas.rule.getPracticeDirId(),
                    Y.doccirrus.schemas.rule.getDOQUVIDEDirId(),
                    Y.doccirrus.schemas.rule.getDQSDirId(),
                    Y.doccirrus.schemas.rule.getDcSZId(),
                    Y.doccirrus.schemas.rule.getDcPKVId(),
                    Y.doccirrus.schemas.rule.getEBMDirId(),
                    Y.doccirrus.schemas.rule.getCARDIODirId(),
                    Y.doccirrus.schemas.rule.getPEDIADirId()
                ],
                swiss = [
                    Y.doccirrus.schemas.rule.getDcDirId(),
                    Y.doccirrus.schemas.rule.getPracticeDirId(),
                    Y.doccirrus.schemas.rule.getTarmedId(),
                    Y.doccirrus.schemas.rule.getTarmedUVGId(),
                    Y.doccirrus.schemas.rule.getTarmedOthersId()
                ],
                isSwitzMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() || false,
                { masterDCFormTenant } = Y.doccirrus.utils.getConfig( 'env.json' ),
                isMasterTenant = user.tenantId === masterDCFormTenant;

            return isMasterTenant ||
                   isSwitzMode && swiss.includes( ruleId ) ||
                   !isSwitzMode && german.includes( ruleId );
        }

        /**
         * Imports DC Rules and keeps track of old active states while overriding all rules:
         *
         * 1. Stores all current descendants of root dc folder and its active states.
         * 2. Removes all stored rules.
         * 3. Creates all folders and contained rules sets from present import file.
         * 4. Regenerates rule logs for all casefolders containing errors or warnings.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function importDcSet( args ) {
            const
                { user, callback } = args,
                start = new Date(),
                rootDocCirrus = Y.doccirrus.schemas.rule.getDcDirId(),
                toRuleSetObject = ( err, buff, cb ) => {
                    let ruleSet;
                    if( err ) {
                        return cb( err );
                    }
                    try {
                        ruleSet = _.omit( JSON.parse( buff.toString() ), ['_id', 'fullParentName'] );
                    } catch( err ) {
                        return cb( err );
                    }
                    cb( null, ruleSet );
                },
                forEachRuleSetOnDisk = ( rangerFolders, iterator, forEachRuleCallback ) => {
                    async.eachSeries( rangerFolders, ( rangeFolder, innerNext ) => {
                        async.map( rangeFolder.files, ( ruleId, cb ) => {
                            Y.doccirrus.media.readFile( dir + 'rule_' + ruleId + '.json', dir, ( err, ruleFile ) => toRuleSetObject( err, ruleFile, cb ) );
                        }, ( err, ruleSets ) => {
                            if( err ) {
                                return innerNext( err );
                            }
                            async.each( ruleSets, iterator, innerNext );
                        } );
                    }, ( err ) => {
                        if( err ) {
                            return forEachRuleCallback( err );
                        }
                        forEachRuleCallback();
                    } );
                };

            let activeStates,
                dir,
                dcCatagories,
                dcCategoryRangeFolders,
                dcCategoryIds,
                affectedCaseFolderIds;

            let rulesetFromDiscCount = 0;

            async.waterfall( [
                ( next ) => {
                    // get casefolders with errors or warnings to regenerate rule logs later before rule deletion
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        query: {
                            additionalType: null,
                            type: {$in: ['PUBLIC', 'PRIVATE']},
                            $or: [{ruleWarnings: {$gte: 1}}, {ruleErrors: {$gte: 1}}]
                        },
                        options: {select: {_id: 1}},
                        callback: next
                    } );
                },
                ( affectedCaseFolders, next ) => {
                    async.map( affectedCaseFolders, ( affectedCaseFolder, done ) => setTimeout( () => done( null, affectedCaseFolder._id.toString() ), 0 ), next );
                },
                ( _affectedCaseFolderIds, next ) => {
                    affectedCaseFolderIds = _affectedCaseFolderIds;
                    next();
                },
                // store rules inactive states by (code/dcRuleType/catalogShort) to set set active state on newly imported rules
                // also store all visited ruleSets/directories
                ( next ) => Y.doccirrus.ruleutils.createRuleActiveStates( user, rootDocCirrus ).then( result => next( null, result ) ).catch( err => next( err ) ),
                ( results, next ) => {
                    activeStates = results.activeStates;

                    if( !results.visited || !results.visited.length ){
                        Y.log( `importDcSet: not process rules on db, skipp deleting`, 'debug', NAME );
                        return next();
                    }
                    // remove all visited ruleSets/directories (keeps dc root directory
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'delete',
                        query: {_id: {$in: results.visited}},
                        options: {
                            override: true
                        }
                    }, ( err, results ) => {
                        if( results ) {
                            Y.log( `importDcSet: deleted old dc rules: ${results.length}`, 'debug', NAME );
                        }
                        next( err );
                    } );
                },
                // get default childs of dc root directory like EBM, GOÄ, PKV etc.
                ( next ) => ensureDefaultFoldersExist( user, next ),
                // get dir of import archive and load meta data meaning directories with ids of child ruleSets
                ( next ) => getImportDir( user, next ),
                ( impDir, next ) => {
                    dir = impDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    // filter down meta data entries to dc range folders (1-50, 51-100, ...)
                    dcCatagories = loadedMetadata.filter( entry => entry.parent === rootDocCirrus && checkByCountry( user, entry._id ) );

                    dcCategoryIds = dcCatagories.map( entry => entry._id );
                    dcCategoryRangeFolders = loadedMetadata.filter( entry => dcCategoryIds.includes( entry.parent ) );

                    // post range folders to db
                    async.each( dcCategoryRangeFolders, ( dcCategoryRangeFolder, cb ) => {
                        let data = _.omit( dcCategoryRangeFolder, ['fullName', 'totalCount', 'files'] );
                        data._id = new ObjectId( data._id );

                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'mongoInsertOne',
                            model: 'rule',
                            data
                        }, cb );

                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        // iterate ruleSets of all dc range folder files and post ruleSets to db
                        forEachRuleSetOnDisk( dcCategoryRangeFolders, ( ruleSetFromDisk, cb ) => {
                            // set active states determined before deleting from old ruleSet on new ruleSet
                            rulesetFromDiscCount++;
                            ruleSetFromDisk.isActive = Y.doccirrus.ruleutils.ruleSetWasActive( activeStates, ruleSetFromDisk );
                            ruleSetFromDisk._id = new ObjectId( ruleSetFromDisk._id );

                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'mongoInsertOne',
                                model: 'rule',
                                data: ruleSetFromDisk
                            }, cb );

                        }, next );
                    } );
                },
                ( next ) => {
                    Y.log( `Start: regenerating rule logs of ${affectedCaseFolderIds.length} case folders`, 'info', NAME );
                    reRunRuleEngineForTenant( user, user.tenantId, 1, 1, user, {
                        caseFolderIds: affectedCaseFolderIds,
                        caseFolders: ['PUBLIC', 'PRIVATE'],
                        actTypes: ['SCHEIN', 'PKVSCHEIN', 'TREATMENT']
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `could not regenerate dc rule logs ${err && err.stack || err}`, 'error', NAME );
                        }
                        Y.log( `Finish: regenerating rule logs of ${affectedCaseFolderIds.length} case folders`, 'info', NAME );
                        next();
                    } );
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `importDcSet: finished importing dc rules in tenant ${user.tenantId} with error: ${err}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `importDcSet: Successfully imported ${rulesetFromDiscCount} rules for tenant ${user.tenantId} in ${(new Date()).getTime() - start.getTime()}ms`, 'info', NAME );
                callback( null, 0 );
            } );

        }

        function importSet( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.importSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.importSet');
            }
            const
                user = args.user,
                callback = args.callback,
                data = args.data,
                isImport = args.import || false,
                regenerate = data && data.regenerate,
                totalCount = data && data.totalCount,
                model = 'rule';

            let
                processed = data && data.processed || 0;

            Y.log( `Importing ${isImport ? '' : '(triggered manually)'} rule with id ${data.ruleId}`, 'info', NAME );
            if( isImport && !checkByCountry( user, data.ruleId ) ){
                Y.log( `importSet: Import ${data.ruleId} for tenant ${user.tenantId} skipped due to country mismatch`, 'info', NAME );
                return callback( null, 0 );
            }

            let dir = null,
                metaDataFromDisk = [],
                metaData = [],
                metaDataFromDb = [],
                files = [],
                dataFromDisk = [];

            async.waterfall( [
                ( next ) => {
                    let
                        correctId = new ObjectId(Y.doccirrus.schemas.rule.getDOQUVIDEDirId()),
                        parent = null,
                        wrongNameRegexp = /^doquvide$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                ( next ) => {
                    let
                        correctId = new ObjectId( '000000000000000000000011' ), //old GOÄ
                        parent = Y.doccirrus.schemas.rule.getDcDirId(),
                        wrongNameRegexp = /^GOÄ PKV$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                ( next ) => {
                    let
                        correctId = new ObjectId( '000000000000000000000015' ),
                        parent = Y.doccirrus.schemas.rule.getDcDirId(),
                        wrongNameRegexp = /^GOÄ SZ$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                (next) => {
                    //read rules to populate default values
                    ensureDefaultFoldersExist(user, next);
                },
                ( next ) => {
                    if( isImport ) {
                        getImportDir( user, next );
                    } else {
                        makeExportDir( user, next );
                    }
                },
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;

                    //id could be in the files arrays
                    let directoryId = data.ruleId,
                        filtered = metaDataFromDisk.filter( el => el.files && (el.files).indexOf( data.ruleId ) >= 0 );
                    if( filtered.length ) {
                        directoryId = filtered[0]._id.toString();
                    }


                    metaData = filterMetadataUp( metaDataFromDisk, directoryId, [], false );

                    // if started by folder import
                    if( !filtered.length ){
                        metaData = metaData.concat( filterMetadataDown( metaDataFromDisk, [directoryId], [] ) );
                    }

                    //get full list of directories from the db
                    getMetadata( next, user, 'rule', null );
                },
                ( getMetadata, next ) => {
                    metaDataFromDb = getMetadata;
                    setFullNameDown( metaDataFromDb, null, 'rules' );

                    // merge import directories with one from db
                    mergeDirectoriesDown( next, user, metaData, metaDataFromDb, null, null, 1 );
                },
                ( processedFolders, next ) => {
                    metaData = processedFolders;
                    //filter groups with files
                    metaData = metaData.filter( el => el.files && el.files.length && !el.up );
                    metaData.forEach( function( el ){ files = files.concat( el.files ); } );

                    //only one item could be imported
                    if( files.indexOf( data.ruleId ) >= 0 ) {
                        files = [data.ruleId];
                    }

                    //load elements
                    if( files.length ) {
                        async.eachLimit( files, 200, iterator, ( err ) => {
                            next( err );
                        } );
                    } else {
                        return next();
                    }

                    function iterator( ruleId, cb ) {
                        Y.doccirrus.media.readFile( dir + 'rule_' + ruleId + '.json', dir, ( err, result ) => {
                            if( !err && result ) {
                                dataFromDisk.push( JSON.parse( result ) );
                            }
                            cb( err );
                        } );
                    }
                },
                ( next ) => {
                    if( dataFromDisk.length ) {

                        async.waterfall( [
                            function( nextModel ) {
                                Y.doccirrus.mongodb.getModel( user, model, true, nextModel );
                            },
                            function( ruleModel, nextModel ) {
                                async.eachLimit( dataFromDisk, 200, iterator, ( err ) => {
                                    nextModel( err );
                                } );

                                function iterator( rule, cb ) {
                                    let filtered = metaData.filter( md => md._id.toString() === rule.parent );
                                    rule.parent = filtered[0].dbId;


                                    processed = processed + 1;
                                    let ruleData = _.omit( rule, ["fullParentName"] ),
                                        passPcnt;

                                    if( totalCount ){
                                        passPcnt = Math.round( ( 100 * processed / totalCount ) * 100 ) / 100 ;
                                        if ( passPcnt % 5 === 0 ) {
                                            Y.doccirrus.communication.emitEventForSession( {
                                                sessionId: args.user.sessionId,
                                                event: 'ruleImport',
                                                msg: {
                                                    data: {
                                                        status: 'processing',
                                                        nRuleSets: processed,
                                                        percents: 100 * processed / totalCount,
                                                        text: Y.doccirrus.i18n( 'IncaseAdminMojit.rules.tree.importExport_load' )
                                                    }
                                                }
                                            } );
                                        }
                                    }

                                    let foundMetaOnRule = false;
                                    for(let rule of (ruleData.rules || []) ){ //eslint-disable-line
                                       if( rule.metaActTypes && rule.metaActTypes.length ){
                                           foundMetaOnRule = true;
                                           break;
                                       }
                                    }

                                    if( !ruleData.metaActTypes || !foundMetaOnRule || !ruleData.hasOwnProperty('metaCaseOpen') || rule.metaCaseOpen === null){
                                        let meta = Y.doccirrus.ruleutils.getMeta( ruleData.rules, ruleData );
                                        if( Object.keys(meta).length ){
                                            ruleData.metaActTypes = meta.actTypes;
                                            ruleData.metaActCodes = meta.actCodes;
                                            ruleData.metaFuzzy = meta.metaFuzzy;
                                            ruleData.metaCaseOpen = meta.metaCaseOpen;
                                        }
                                    }
                                    if( ruleData.rules ) {
                                        ruleData.rules.forEach( rule => {
                                            if( !rule.ruleId ) {
                                                rule.ruleId = ( new ObjectId() ).toString();
                                            }
                                        } );
                                    }

                                    ruleModel.mongoose.findOne( {_id: ruleData._id}, ( error, document ) => {
                                        if( error ) {
                                            return cb( error );
                                        }
                                        if( document ) {
                                            ruleData.isActive = document.isActive;
                                            let isLocked = document.isLocked,
                                                ruleSetActive = ruleData.isActive;
                                            // deep comparison of rules
                                            if( ruleData.rules && document.rules ) {
                                                ruleData.rules.forEach( rule => {
                                                    let found = false,
                                                        foundState = document.isActive;
                                                    document.rules.forEach( wasRule => {
                                                        if( !found && _.isEqual( _.omit( rule, ['isActive', 'parent'] ), _.omit( wasRule, ['isActive', 'parent'] ) ) ) {
                                                            found = true;
                                                            foundState = wasRule.isActive;
                                                        }
                                                    } );
                                                    if( found ) {
                                                        rule.isActive = foundState;
                                                    }
                                                    if( isLocked ) {
                                                        //overwrite individual rule isActive by RuleSet isActive state
                                                        rule.isActive = ruleSetActive;
                                                    }
                                                } );
                                            }
                                            if( regenerate ) {

                                                Y.doccirrus.mongodb.runDb( {
                                                    action: 'put',
                                                    user: user,
                                                    model: 'rule',
                                                    query: {_id: ruleData._id},
                                                    fields: Object.keys(ruleData),
                                                    data: Object.assign( {}, ruleData, { skipcheck_: true } )
                                                }, cb );

                                            } else {
                                                ruleModel.mongoose.update( {_id: ruleData._id}, ruleData, cb );
                                            }
                                        } else {
                                            Y.doccirrus.mongodb.runDb( {
                                                action: 'post',
                                                user: user,
                                                model: 'rule',
                                                data: Y.doccirrus.filters.cleanDbObject( ruleData )
                                            }, cb );
                                        }
                                    } );
                                }

                            }
                        ], next );
                    } else {
                        return next();
                    }
                },
                /* commented out, to allow copy locked
                ( next ) => {
                    lockRulesDown( user, Y.doccirrus.schemas.rule.getDcDirId().toString(), next );
                },
                ( next ) => {
                    lockRulesDown( user, Y.doccirrus.schemas.rule.getDOQUVIDEDirId().toString(), next );
                },
                ( next ) => {
                    lockRulesDown( user, Y.doccirrus.schemas.rule.getCARDIODirId().toString(), next );
                },
                ( next ) => {
                    lockRulesDown( user, Y.doccirrus.schemas.rule.getDQSDirId().toString(), next );
                },
                */
                ( next ) => {
                    Y.log( `importSet: Successfully imported ${dataFromDisk.length} rules for tenant ${user.tenantId}`, 'info', NAME );
                    next();
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `importSet: Error during rules import: ${err.stack || err}`, 'error', NAME );
                }
                if( isImport ) {
                    return callback( err, processed );
                } else {
                    // manual import from UI
                    Y.doccirrus.communication.emitEventForSession( {
                        sessionId: user.sessionId,
                        event: 'ruleImportDone',
                        msg: {
                            data: {
                                error: err
                            }
                        }
                    } );
                }

            } );

            if(!isImport) {
                return callback( null, processed );
            }
        }

        function exportSet( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.exportSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.exportSet');
            }
            const
                { user, callback, data } = args;

            let
                dir = null,
                exportData = [],
                metaDataFromDisk = [],
                metaData = [];

            Y.log( `Exporting rule with id ${data.ruleId}`, 'info', NAME );

            async.waterfall( [
                ( next ) => {
                    makeExportDir( user, next );
                },
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;
                    getExportData( user, 'rule', {_id: {$in: [data.ruleId]}}, next );
                },
                ( expData, next ) => {
                    if( expData[0] && false === expData[0].isDirectory ) {
                        exportData = expData;
                        getMetadata( next, user, 'rule', expData[0].parent, true );
                    } else {
                        getMetadata( next, user, 'rule', data.ruleId );
                    }
                },
                ( expMetadata, next ) => {
                    metaData = expMetadata;
                    if( exportData.length ) {
                        return next( null, exportData );
                    }

                    getExportData( user, 'rule', {
                        isDirectory: false,
                        parent: {$in: metaData.filter( el => !el.up ).map( el => el._id.toString() )}
                    }, next );
                },
                ( expData, next ) => {
                    exportData = expData;

                    function iterator( rule, cb ) {
                        let filtered = metaData.filter( el => el._id.toString() === rule.parent ),
                            ruleId = rule._id.toString();
                        if( filtered[0] ) {
                            if( !filtered[0].files ) {
                                filtered[0].files = [];
                            }
                            if( ruleId ) {
                                filtered[0].files.push( ruleId );
                            }
                            rule.fullParentName = filtered[0].fullName;
                        }
                        Y.doccirrus.media.writeFile( dir + 'rule_' + ruleId + '.json', dir, JSON.stringify( _.omit( rule, ["__v", "user_"] ) ), cb );
                    }

                    async.eachLimit( exportData, 200, iterator, ( err ) => {
                        next( err );
                    } );

                },
                ( next ) => {
                    //merge loaded array of metadata with newly exported
                    metaData.forEach( ( el ) => {
                        let filtered = metaDataFromDisk.filter( mdt => mdt._id === el._id.toString() );
                        if( filtered.length ) {
                            if( el.files && el.files.length ) {
                                filtered[0].files = _.uniq( (filtered[0].files || []).concat( el.files ) );
                            }
                        } else {
                            metaDataFromDisk.push( el );
                        }
                    } );

                    metaDataFromDisk = metaDataFromDisk.map( el => {
                        el.totalCount = 0;
                        return _.omit( el, ["__v", "user_"] );
                    } );

                    //calculating totalCount for directories
                    setTotalCountDown( metaDataFromDisk, null );

                    Y.doccirrus.media.writeFile( dir + metaFileName, dir, JSON.stringify( metaDataFromDisk ), next );
                },
                ( next ) => {
                    Y.log( 'Successfully exported ' + exportData.length.toString() + ' rules.', 'info' );
                    next();
                }
            ], ( err ) => {

                if( err ) {
                    Y.log( 'Error during rules export: ' + JSON.stringify( err ) + 'error' );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: args.user.sessionId,
                    event: 'ruleExportDone',
                    msg: {
                        data: {
                            error: err
                        }
                    }
                } );
            } );

            callback( null );

        }

        function deleteArchive( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.deleteArchive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.deleteArchive');
            }

            const
                callback = args.callback;

            function onExportsCleared( err/*, data*/ ) {
                if( err ) {
                    Y.log( `Could not empty contents of export dir: ${JSON.stringify( err )}`, 'debug', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Emptied rules exports directory.', 'info', NAME );

                callback( null, {'status': 'ok'} );
            }

            clearExportDir( args.user, onExportsCleared );
        }

        function uploadbackup( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.uploadbackup', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.uploadbackup');
            }

            const
                callback = args.callback,
                newId = 'rulezip_' + new Date().getTime(), //% temporary identifier
                files = args.originalfiles,
                isImport = args.import || false;
            let
                lastFile = {},
                k;

            Y.log( 'Called /1/ruleimportexport/:uploadbackup', 'info', NAME );

            if( 'object' !== (typeof files) ) {
                callback( Y.doccirrus.errors.rest( 500, 'Please upload a single file.', true ) );
                return;
            }

            for( k in files ) {
                if( files.hasOwnProperty( k ) ) {
                    if( files[k].hasOwnProperty( 'path' ) ) {
                        lastFile = files[k];
                    }
                }
            }
            if( false === lastFile.hasOwnProperty( 'path' ) ) {
                callback( Y.doccirrus.errors.rest( 500, 'Invalid file upload.', true ) );
                return;
            }
            Y.doccirrus.forms.importutils.handleArchiveUpload( args.user, lastFile, newId, onExtractArchive, isImport ? getImportDir : clearExportDir );

            function onExtractArchive( err ) {

                if( err ) {
                    Y.log( `Failure installing rules: ${err.message || JSON.stringify(err)} \n  ${JSON.stringify(args)} `, 'warn', NAME );
                    callback( Y.doccirrus.errors.rest( 500, `Could not extract archive. (${err.message || err})`, 500 ) );
                    return;
                }

                callback( null, {'status': 'ok'} );
            }
        }

        function importDocCirrus( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.importDocCirrus', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.importDocCirrus');
            }
            const
                { user, options, callback } = args,
                rootDocCirrus = Y.doccirrus.schemas.rule.getDcDirId(),
                rootDOQUVIDE = Y.doccirrus.schemas.rule.getDOQUVIDEDirId(),
                rootDQS = Y.doccirrus.schemas.rule.getDQSDirId(),
                rootCARDIO = Y.doccirrus.schemas.rule.getCARDIODirId(),
                regenerate = options && options.regenerate,
                totalCount = options && options.count;

            var
                folderIds = [],
                ruleSetIds = [],
                ruleSetModel,
                processed = options && options.processed;

            async.waterfall( [
                // 0. fix issues in existed structure
                /* for now commented out to allow copy locked items
                ( next ) => {
                    let
                        correctId = new ObjectId(Y.doccirrus.schemas.rule.getDOQUVIDEDirId()),
                        parent = null,
                        wrongNameRegexp = /^doquvide$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                ( next ) => {
                    let
                        correctId = new ObjectId( '000000000000000000000011' ), //old GOÄ
                        parent = Y.doccirrus.schemas.rule.getDcDirId(),
                        wrongNameRegexp = /^GOÄ PKV$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                ( next ) => {
                    let
                        correctId = new ObjectId( '000000000000000000000015' ),
                        parent = Y.doccirrus.schemas.rule.getDcDirId(),
                        wrongNameRegexp = /^GOÄ SZ$/i;
                    fixDefaultFolderName( user, correctId, parent, wrongNameRegexp, next );
                },
                */
                // 1.1 No need to clean up existed DocCirrus rule sets here
                ( next ) => {
                    // 1.2 Clean up existed Doquvide rule sets
                    getMetadata( next, user, 'rule', rootDOQUVIDE );
                },
                ( filteredFolders, next ) => {
                    folderIds = filteredFolders.map( el => el._id.toString() );
                    // 1.3 Clean up existed DQS rule sets
                    getMetadata( next, user, 'rule', rootDQS );
                },
                ( filteredFolders, next ) => {
                    folderIds = [...folderIds, ...filteredFolders.map( el => el._id.toString() ) ];
                    getMetadata( next, user, 'rule', rootCARDIO );
                },
                ( filteredFolders, next ) => {
                    folderIds = [...folderIds, ...filteredFolders.map( el => el._id.toString() ) ];
                    getExportData( user, 'rule', {isDirectory: false, parent: {$in: folderIds}}, next );
                },
                ( filteredRuleSets, next ) => {
                    ruleSetIds = filteredRuleSets.map( el => el._id.toString() );
                    Y.log('Mark for updating ' + ruleSetIds.length, 'debug', NAME);
                    Y.doccirrus.mongodb.getModel( user, 'rule', true, next );
                },
                ( ruleModel, next ) => {
                    ruleSetModel = ruleModel;
                    ruleSetModel.mongoose.update( {_id: {$in: ruleSetIds}}, {$set:{ parent: 'toUpdate' } }, {multi:true}, next );
                },
                ( updated, next ) => {
                    folderIds = folderIds.filter( el => -1 === [
                        rootDocCirrus,
                        rootDOQUVIDE,
                        rootDQS,
                        "000000000000000000000011",
                        "000000000000000000000021",
                        '000000000000000000000015',
                        '000000000000000000000031',
                        rootCARDIO
                    ].indexOf( el ) );
                    ruleSetModel.mongoose.remove( {_id: {$in: folderIds}}, next );
                },
                // 2.1 Import rule sets doccirrus
                ( deleted, next ) => {
                    importDcSet( {
                        user: user,
                        data: {
                            regenerate: regenerate,
                            totalCount: totalCount,
                            processed: processed
                        },
                        callback: next
                    } );
                },
                // 2.2 Import rule sets DOQUVIDE
                ( result, next ) => {
                    processed = result;
                    importSet( {
                        user: user,
                        data: {
                            ruleId: rootDOQUVIDE,
                            regenerate: regenerate,
                            totalCount: totalCount,
                            processed: processed
                        },
                        import: true,
                        callback: next
                    } );
                },
                // 2.3 Import rule sets CARDIO
                ( result, next ) => {
                    processed = result;
                    Y.doccirrus.api.ruleimportexport.importSet( {
                        user: user,
                        data: { ruleId: rootCARDIO,
                            regenerate: regenerate,
                            totalCount: totalCount,
                            processed: processed
                        },
                        import: true,
                        callback: next
                    } );
                },
                // 2.4 Import rule sets DQS
                ( result, next ) => {
                    processed = result;
                    importSet( {
                        user: user,
                        data: {
                            ruleId: rootDQS,
                            regenerate: regenerate,
                            totalCount: totalCount,
                            processed: processed
                        },
                        import: true,
                        callback: next
                    } );
                },
                // 3. Cleanup remaining rule sets that are not in the latest import
                ( result, next ) => {
                    processed = result;
                    ruleSetModel.mongoose.remove( { parent: 'toUpdate' }, ( err ) => next( err ) );
                    //next( null, folderIds);
                }

            ], ( err ) => {
                if( err ){
                    Y.log('Error on importing DocCirrus rules ' + JSON.stringify( err ), 'error', NAME );
                }
                callback( err, processed );
            } );
        }

        function calculateFileHash( file, callback ) {
            const crypto = require( 'crypto' );

            // Algorithm depends on availability of OpenSSL on platform
            var algorithm = 'sha1',
                shasum = crypto.createHash( algorithm );

            // Updating shasum with file content
            var s = fs.ReadStream( file );

            s.on( 'data', function( data ) {
                shasum.update( data );
            } );

            // making digest
            s.on( 'end', function() {
                var hash = shasum.digest( 'hex' );
                callback( null, hash );
            } );
        }

        function getImportFile(args){
            Y.log('Entering Y.doccirrus.api.ruleimportexport.getImportFile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.getImportFile');
            }
            const
                {callback} = args; //jshint ignore:line

            let importDir = Y.doccirrus.auth.getDirectories( 'rules' ) + '/',
                importFile = null,
                importFileExt,
                importFileStat,
                importFileHash,
                adminFileHash,
                result = {
                    file: importFile,
                    wasImported: false
                };

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.media.listRecursive( importDir, '*.tar.gz, *.zip', next );
                },
                ( files, next ) => {
                    if( files && files.length ) {
                        importFile = files[0].filename;
                        importFileExt = files[0].ext;
                        fs.stat( importDir + importFile, next );
                    } else {
                        return next( null, null );
                    }

                },
                ( stats, next ) => {
                    importFileStat = stats;

                    if( !importFile ) {
                        return next( null, '' );
                    }
                    calculateFileHash( importDir + importFile, next );
                },
                ( fileHash, next ) => {
                    importFileHash = fileHash;
                    if( !importFile) {
                        return next( null, '' );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'admin',
                        action: 'get',
                        query: {
                            _id: Y.doccirrus.schemas.admin.getId()
                        },
                        useCache: false
                    }, next );
                },
                ( adminHash, next ) => {
                    adminFileHash = adminHash && adminHash[0] && adminHash[0].rulesImportHash;
                    result = {
                        file: importFile,
                        ext: importFileExt,
                        hash: importFileHash,
                        modifyDate: importFileStat.mtime && moment(importFileStat.mtime).format('DD.MM.YYYY'),
                        wasImported: adminFileHash === importFileHash
                    };
                    next( null );
                }
            ], ( err ) => {
                if( err ){
                    Y.log('Error on calculation previous import file' + err.message, 'error', NAME );
                }
                callback( err, result );
            } );
        }

        function docCirrusImportAll(args) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.docCirrusImportAll', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.docCirrusImportAll');
            }
            const
                {originalParams, callback} = args; //jshint ignore:line

            let force = ( '1' === ( originalParams && originalParams.force ) ),
                regenerate = ( '1' === ( originalParams && originalParams.regenerate ) ),
                specificTenantUser = originalParams.specificTenantUser,
                tenants = originalParams && originalParams.tenants || [];

            let user = args.user || Y.doccirrus.auth.getSUForLocal();

            Y.log( 'Trigger import doc cirrus rules with force=' + force.toString(), 'info', NAME );

            let importDir = Y.doccirrus.auth.getDirectories( 'rules' ) + '/',
                importFile,
                importFileExt,
                importFileHash,
                wasImported,
                totalImportCount,
                wasCallback = false;

            async.waterfall( [
                    ( next ) => {
                        getImportFile( {
                            callback: next
                        } );
                    },
                    ( result, next ) => {
                        if( result && result.file ) {
                            importFile = result.file;
                            importFileExt = result.ext;
                            importFileHash = result.hash;
                            wasImported = result.wasImported;
                        }
                        if( !importFile ) {
                            wasCallback = true;
                            callback(null, 'DocCirrus rules import file not found ');
                            return next( null );
                        }
                        makeImportDir( next );
                    },
                    ( next ) => {
                        if( !importFile || force) {
                            return next( null );
                        }

                        if( wasImported ) { //import already processed skip all next
                            Y.log( 'DocCirrus rules already imported from ' + importFileHash, 'info', NAME );
                            importFile = undefined;
                            wasCallback = true;
                            return  callback(null, 'DocCirrus rules already imported from ' + importFileHash);
                        }

                        next( null );
                    },
                    ( next ) => {
                        if( !importFile ) {
                            return next( null, {} );
                        }

                        uploadbackup( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            originalfiles: {
                                tgzFile: {
                                    path: importDir + importFile,
                                    extension: importFileExt
                                }
                            },
                            import: true,
                            callback: next
                        } );
                    },
                    //calculate total count of rules in import
                    ( status, next ) => {
                        if( !importFile ) {
                            return next( null );
                        }

                        listSetOnDisk( {
                            user: user,
                            import: true,
                            query: {parent: null, isDirectory: true},
                            options: {},
                            callback: ( err, result ) => {
                                totalImportCount = !err && ( result || [] ).map( el => el.totalCount ).reduce( (sum, value) => sum + value, 0 );
                                next( null );
                            }
                        } );

                    },
                    ( next ) => {
                        if( !importFile ) {
                            return next( null );
                        }
                        docCirrusRulesImport( { specificTenantUser: specificTenantUser, regenerate: regenerate, tenants: tenants, totalCount: totalImportCount }, next );
                    },
                    ( next ) => {
                        if( !importFile ) {
                            return next( null, {} );
                        }
                        clearImportDir( next );
                    },
                    ( cleared, next ) => {
                        if( !importFile ) {
                            return next( null );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            model: 'admin',
                            action: 'put',
                            query: {
                                _id: Y.doccirrus.schemas.admin.getId()
                            },
                            data: {
                                rulesImportHash: importFileHash,
                                skipcheck_: true
                            },
                            fields: ['rulesImportHash']
                        }, next );
                    }
                ],
                ( err ) => {
                    if( err ) {
                        Y.log( 'Error on processing DocCirrus importing ' + JSON.stringify( err ), 'error', NAME );
                    } else {
                        Y.log( 'DocCirrus rules imported successfully', 'info', NAME );
                    }
                    /*
                    Y.doccirrus.communication.emitEventForSession( {
                        sessionId: args.user.sessionId,
                        event: 'ruleImport',
                        msg: {
                            data: {
                                status: 'done'
                            }
                        }
                    } );
                    */
                    if( !wasCallback ) {
                       return  callback( err, null );
                    }
                } );
        }

        function docCirrusRulesImport( options, cb ) {
            var user = Y.doccirrus.auth.getSUForLocal(),
                processed = 0;

            if( options.specificTenantUser ){
                options = Object.assign( options, { count:  options.totalCount, processed: processed } );
                importDocCirrus( {
                    user: options.specificTenantUser,
                    options: options,
                    callback: (err, result) => {
                        processed = result;
                        cb( err );
                    }
                } );
                return;
            }

            if( Y.doccirrus.auth.isVPRC() ) {
                Y.doccirrus.api.company.getActiveTenants( {
                    user: user,
                    callback: function( err, activeTenants ) {
                        if( err ) {
                            Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                            return cb( err );
                        }

                        let activeTenantList = activeTenants.map( doc => doc.tenantId );

                        if( options.tenants && options.tenants.length ){
                            activeTenantList = activeTenantList.filter( el => options.tenants.includes( el ) );
                        }

                        Y.log( 'Importing Rule Sets for ' + JSON.stringify( activeTenantList ), 'debug', NAME );

                        async.eachSeries(
                            activeTenantList,
                            ( tenantId, nextSerie ) => {
                                options = Object.assign( options, { count: (activeTenantList.length * options.totalCount), processed: processed } );
                                Y.log( 'Importing DocCirrus rules for tenant ' + tenantId, 'info', NAME );
                                let tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                importDocCirrus( {
                                    user: tenantSU,
                                    options: options,
                                    callback: (err, result) => {
                                        processed = result;
                                        nextSerie( err );
                                    }
                                } );
                            },
                            ( err ) => {
                                if( err ) {
                                    Y.log( 'Error on importing DocCirrus rulesets ' + JSON.stringify( err ), 'error', NAME );
                                }
                                cb( err );
                            }
                        );
                    }
                } );

            } else if( Y.doccirrus.auth.isPRC() ) {
                options = Object.assign( options, { count:  options.totalCount, processed: processed } );
                Y.log( 'Importing DocCirrus rules for PRC', 'info', NAME );
                importDocCirrus( {
                    user: user,
                    options: options,
                    callback: (err, result) => {
                        processed = result;
                        cb( err );
                    }
                } );
            }
        }

        function countRuleLogsByType( user, type, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'rulelog',
                action: 'count',
                query: {
                    ruleLogType: type
                },
                callback: callback
            } );
        }

        function getPipeLine(count, options ){
            const
                date = moment(),
                skipVendor = 'RULEENGINE|' + Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO;

            let
                activityMatch,
                startOf = date.startOf( 'quarter' ).clone().toDate(),
                endOf = date.endOf( 'quarter' ).toDate(),
                actStatus = ['VALID', 'APPROVED'];

            if( options && options.timestamp && options.timestamp.endOf ) {
                endOf = moment( options.timestamp.endOf ).toDate();
            }

            if( options && options.timestamp && options.timestamp.startOf ) {
                startOf = moment( options.timestamp.startOf ).toDate();
            }

            if( options && options.actStatus ) {
                actStatus = options.actStatus;
            }

            activityMatch = {
                    $and: [
                        {status: {$in: actStatus}},
                        {$or: [{importId: {$exists: false}}, {importId: ''}]},
                        {$or: [{mirrorActivityId: {$exists: false}}, {mirrorActivityId: ''}]},
                        {vendorId: {$not: new RegExp( skipVendor )}},
                        {timestamp: {$gt: startOf, $lt: endOf}},
                        {actType: {$in: options.actTypes}}
                    ]
                };

            if( Array.isArray( options.caseFolderIds ) && options.caseFolderIds.length ) {
                activityMatch.$and.push( {caseFolderId: {$in: options.caseFolderIds}} );
            }

            if( Array.isArray( options.patientId ) && options.patientId.length ) {
                activityMatch.$and.push( {patientId: {$in: options.patientId}} );
            }

            if( Array.isArray( options.locationId ) && options.locationId.length ) {
                activityMatch.$and.push( {locationId: {$in: options.locationId.map( i => new ObjectId( i ))}} );
            }

            let pipeline = [
                { $match: activityMatch},
                { $project: {'caseFolderId': 1, 'patientId': 1}},
                { $lookup: {
                    from: 'casefolders',
                    localField: 'patientId',
                    foreignField: 'patientId',
                    as: 'casefolders' }},
                { $unwind: {path: '$casefolders' }},
                { $project: {
                        activities: "$$ROOT",
                        casefolderType: { $ifNull: [ "$casefolders.type", "$casefolders.additionalType" ] },
                        cid: "$casefolders._id"
                }},
                { $match: {'casefolderType': {$in: options.caseFolders}}},
                { $group:  {_id: {id: '$_id', cid: '$cid'}, activities: {$first : "$activities"}}},
                { $replaceRoot: { newRoot: '$activities' }},
                { $project: {'caseFolderId': 1, 'casefolders._id': 1}}
                //,{ $project: {'casefolders': 0}}
            ];

            if(count){
                pipeline.push( {$count: 'cnt'} );
            }

            return pipeline;
        }

        function reRunRuleEngine( args ) {
            Y.log('Entering Y.doccirrus.api.ruleimportexport.reRunRuleEngine', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.reRunRuleEngine');
            }
            const
                { user, originalParams, callback } = args,
                userOrg = user;


            let
                tenantSU = Y.doccirrus.auth.getSUForLocal();

            if( userOrg ){
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'message',
                    messageId: 'ruleloadregenerate',
                    msg: {
                        data: Y.doccirrus.i18n( originalParams.rulesWasUpdated ?
                            'IncaseAdminMojit.rules.tree.regenerate_system_start' :
                            'IncaseAdminMojit.rules.tree.regenerate_system_start_same'
                        )
                    },
                    meta: {
                        level: 'WARNING'
                    }
                } );
            }

            if( Y.doccirrus.auth.isVPRC() ) {
                Y.doccirrus.api.company.getActiveTenants( {
                    user: tenantSU,
                    callback: function( err, activeTenants ) {
                        if( err ) {
                            Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }

                        let activeTenantList = activeTenants.map( doc => doc.tenantId );

                        if( originalParams.tenants && originalParams.tenants.length ){
                            activeTenantList = activeTenantList.filter( el => originalParams.tenants.includes( el ) );
                        }

                        Y.log( 'Re Evaluating Rule Sets for ' + JSON.stringify( activeTenantList ), 'debug', NAME );

                        let curTenant = 1;
                        async.eachSeries(
                            activeTenantList,
                            ( tenantId, nextSerie ) => {
                                Y.log( 'Re Evaluating DocCirrus rules for tenant ' + tenantId, 'info', NAME );
                                let tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                reRunRuleEngineForTenant( tenantSU, tenantId, curTenant++, activeTenantList.length, userOrg, originalParams, nextSerie );
                            },
                            ( err ) => {
                                if( err ) {
                                    Y.log( 'Error on re Evaluating DocCirrus rules ' + JSON.stringify( err ), 'error', NAME );
                                }
                                callback( err );
                            }
                        );
                    }
                } );

            } else if( Y.doccirrus.auth.isPRC() ) {
                Y.log( 'Re Evaluating DocCirrus rules for PRC', 'info', NAME );
                reRunRuleEngineForTenant( tenantSU, '0', 1, 1, userOrg, originalParams, ( err ) => {
                    if( err ) {
                        Y.log( 'Error on re Evaluating DocCirrus rules for PRC  ' + JSON.stringify( err ), 'error', NAME );
                    }
                    callback( err );
                } );
            }
        }

        function reRunRuleEngineForTenant( user, tenantId, curTenant, totalTenants, userOrg, options, callback ){
            let
                model,
                totalCount = 0,
                processed = 0;

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, next );
                },
                ( ruleModel, next ) => {
                    model = ruleModel;
                    options = options || {};
                    options.allowDiskUse = true;
                    model.mongoose.aggregate( getPipeLine( false, options ), next );
                },
                ( result, next ) => {
                    totalCount = (result || []).filter( el => el.caseFolderId === ( el.casefolders && el.casefolders._id && el.casefolders._id.toString() )).length;
                    if( !totalCount ){
                        return next( null, null );
                    }

                    let cursor = model.mongoose.aggregate( getPipeLine( false, options ) ).allowDiskUse( true ).cursor({ batchSize: totalCount * 3 || 500, useMongooseAggCursor: true }).exec();
                    next( null, cursor );
                },
                ( cursor, next ) => {
                    if( !cursor ){
                        return next( null );
                    }
                    cursor.eachAsync( activityShort => {
                        return new Promise( ( resolve, reject ) => {
                            if( activityShort.caseFolderId !== ( activityShort.casefolders && activityShort.casefolders._id && activityShort.casefolders._id.toString())){
                                return resolve();
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'activity',
                                action: 'get',
                                query: {_id: activityShort._id}
                            }, ( err, activities ) => {
                                if( err ){
                                    Y.log( 'Error on getting activity ' + err.message, 'error', NAME );
                                    return reject(err);
                                }
                                let activity = activities && activities[0];

                                if(!activity){
                                    Y.log(`Activity ${JSON.stringify(activityShort)} not found for options ${JSON.stringify(options)}`, 'debug', NAME);
                                    processNextActivity( null );
                                } else {
                                    reRunREForActivity( user, activity, processNextActivity );
                                }

                                function processNextActivity( err ){
                                    processed = processed + 1;

                                    //let passPcnt = Math.round( ( 100 * processed / totalCount ) * 1000  ) / 1000 ;
                                    if( userOrg ){
                                        Y.doccirrus.communication.emitEventForSession( {
                                            sessionId: user.sessionId,
                                            event: 'ruleImport',
                                            msg: {
                                                data: {
                                                    status: 'processing',
                                                    nRuleSets: processed,
                                                    text: Y.Lang.sub( Y.doccirrus.i18n( 'IncaseAdminMojit.rules.tree.importExport_regenerate' ), {
                                                        curTenant: curTenant.toString(),
                                                        totalTenant: totalTenants.toString()
                                                    } ),
                                                    percents: 100 * processed / totalCount
                                                }
                                            }
                                        } );
                                    }


                                    if( err ){
                                        reject( err );
                                    } else {
                                        resolve();
                                    }
                                }

                            } );

                        } );
                    }).then( () => {
                        next();
                    } ).catch( err => {
                      Y.log( 'Error re Evaluating rules ' + err.message, 'error', NAME );
                    } );

                }
            ], function( err ) {
                if( err ) {
                    Y.log( 're Evaluating rules ' + err.message, 'error', NAME );
                }
                callback( err );
            } );
        }

        async function reRunREForActivity( user, activity, callback ){
            let [ err ] = await formatPromiseResult(
                Y.doccirrus.api.rule.trigger( {
                    user,
                    originalParams: {
                        tenantId: user.tenantId,
                        caseFolderId: activity.caseFolderId,
                        locationId: activity.locationId.toString(),
                        patientId: activity.patientId,
                        type: 'activity',
                        onDelete: false,
                        silent: true,
                        data: JSON.parse( JSON.stringify( activity ) )
                    }
                } )
            );
            if( err ){
               Y.log( `reRunREForActivity: error triggering rule engine ${err.stack || err}`, 'error', NAME );
            }
            callback( err );
        }

        function docCirrusReloadRegenerateProcess(args){
            Y.log('Entering Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerateProcess', 'info', NAME);

            const
                { user, originalParams = {} } = args;

            let wasError, wasWarning, isError, isWarning, rulesWasUpdated;

            async.waterfall([
                ( next ) => {
                    countRuleLogsByType( user, 'ERROR', next );
                },
                ( result, next ) => {
                    wasError = result;
                    countRuleLogsByType( user, 'WARNING', next );
                },
                ( result, next ) => {
                    wasWarning = result;
                    getActiveTenants( {
                        user: user,
                        originalParams: { forServer: '1' },
                        callback: next
                    } );
                },
                (tenantsList, next ) => {
                    let fortenants = [];
                    if( tenantsList && tenantsList.length ){
                        fortenants = (tenantsList || []).filter( el => {
                            return (originalParams.tenants || []).includes( el.commercialNo );
                        }).map( el => el.tenantId );
                    }
                    originalParams.tenants = fortenants;
                    docCirrusImportAll( {
                        user: user,
                        originalParams: Object.assign({}, originalParams, {
                            force: '0',
                            regenerate: '1'
                        }) ,
                        callback: next
                    } );
                },
                ( result, next ) => {
                    rulesWasUpdated = !result;

                    if( !originalParams || 1 === originalParams.deletingLogStrategy ){
                        return next();
                    }

                    let query,
                        date = moment(),
                        startOf = date.startOf( 'quarter' ).clone().toDate(),
                        endOf = date.endOf( 'quarter' ).toDate();

                    if( 2 === originalParams.deletingLogStrategy ){
                        query = {$or: [
                            {timestamp: {$gt: startOf,$lt: endOf}},
                            {referenceAreaFrom: {$gte: startOf,$lt: endOf}}
                        ] };
                    } else if( 3 === originalParams.deletingLogStrategy ){
                        query = {};
                    }

                    Y.doccirrus.ruleutils.cleanRuleLog( user, query, ( err ) => {
                        if( err ){
                            Y.log( 'Error on cleanup rulelogs ' + err.message + ' with remove query ' + JSON.stringify(query), 'error', NAME );
                        }
                        next();
                    });
                },
                ( next ) => {
                    reRunRuleEngine( {
                        user: user,
                        originalParams: Object.assign({}, originalParams, {rulesWasUpdated: rulesWasUpdated}),
                        callback: next
                    } );
                },
                ( next ) => {
                    countRuleLogsByType( user, 'ERROR', next );
                },
                ( result, next ) => {
                    isError = result;
                    countRuleLogsByType( user, 'WARNING', next );
                },
                ( result, next ) => {
                    isWarning = result;
                    next();
                }
            ], ( err) => {
                if( err ){
                    Y.log('Error on loading and re evaluating rules', 'error', NAME );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'message',
                    messageId: 'ruleloadregenerate',
                    msg: {
                        data: Y.Lang.sub( Y.doccirrus.i18n( 'IncaseAdminMojit.rules.tree.regenerate_system_stop' ), {
                            wasE: wasError,
                            wasW: wasWarning,
                            isE: isError,
                            isW: isWarning
                        } )
                    },
                    meta: {
                        level: 'WARNING'
                    }
                } );


                Y.doccirrus.schemas.sysnum.resetRuleImportLock( Y.doccirrus.auth.getSUForLocal(), () => {
                } );
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'ruleImport',
                    msg: {
                        data: {
                            status: 'done'
                        }
                    }
                } );

                Y.log('Exiting Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerateProcess', 'info', NAME);
            } );
        }

        function getActiveTenants(args){
            Y.log('Entering Y.doccirrus.api.ruleimportexport.getActiveTenants', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.getActiveTenants');
            }
            const
                { originalParams, callback } = args;

            let
                tenantSU = Y.doccirrus.auth.getSUForLocal(),
                forServer = ( '1' === ( originalParams && originalParams.forServer ) ),
                tenantsList = [];

            if( Y.doccirrus.auth.isVPRC() ) {
                Y.doccirrus.api.company.getActiveTenants( {
                    user: tenantSU,
                    callback: function( err, activeTenants ) {
                        if( err ) {
                            Y.log( 'error in getting tenants: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }

                        let activeTenantList = activeTenants.map( doc => doc.tenantId );
                        async.eachSeries(
                            activeTenantList,
                            ( tenantId, nextSerie ) => {
                                let tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );
                                Y.doccirrus.mongodb.runDb( {
                                    user: tenantSU,
                                    model: 'practice',
                                    action: 'get',
                                    query: {}
                                }, ( err, result ) => {
                                    if( err ){
                                        return nextSerie( err );
                                    }
                                    if( result && result.length ){
                                        tenantsList.push( {
                                            type: 'vprc',
                                            tenantId: forServer && tenantId,
                                            commercialNo: result[0].commercialNo,
                                            coname: result[0].coname
                                        } );
                                    }
                                    nextSerie();
                                } );
                            }, ( err ) => {
                                if( err ){
                                    Y.log('Error getting active tenants names ' + err.message, 'error', NAME );
                                }
                                return callback( err, tenantsList );
                            }
                        );
                    } } );
            } else if( Y.doccirrus.auth.isPRC() ) {
                Y.doccirrus.mongodb.runDb( {
                    user: tenantSU,
                    model: 'practice',
                    action: 'get',
                    query: {}
                }, ( err, result ) => {
                    if( err ){
                        Y.log('Error getting active tenants names ' + err.message, 'error', NAME );
                    }
                    if( result && result.length ){
                        tenantsList.push( {
                            type: 'prc',
                            tenantId: forServer && '0',
                            commercialNo: result[0].commercialNo,
                            coname: result[0].coname
                        } );
                    }
                    return callback( err, tenantsList );
                } );
            } else {
                return callback( null, tenantsList );
            }
        }

        Y.namespace( 'doccirrus.api' ).ruleimportexport = {

            name: NAME,

            listSetOnDB: listSetOnDB,
            listSetOnDisk: listSetOnDisk,
            importSet: importSet,
            exportSet: exportSet,
            deleteArchive: deleteArchive,
            uploadbackup: uploadbackup,
            makeExportDir: makeExportDir,
            loadMetadata: loadMetadata,
            makeImportDir: makeImportDir,
            clearImportDir: clearImportDir,
            importDocCirrus: importDocCirrus,

            docCirrusImportAll: docCirrusImportAll,
            reRunRuleEngine: reRunRuleEngine,
            docCirrusReloadRegenerateProcess,
            docCirrusReloadRegenerate( args ) {
                Y.log('Entering Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerate', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.docCirrusReloadRegenerate');
                }
                const { user, originalParams, callback } = args,
                    su = Y.doccirrus.auth.getSUForLocal();

                Y.doccirrus.schemas.sysnum.getRuleImportLock( su, ( err, getLock ) => {
                    if( err ){
                        Y.log( 'Error getting import/export lock ' + err.message, 'error', NAME );
                    }
                    if( originalParams.checkOnly ) {
                        Y.doccirrus.schemas.sysnum.releaseRuleImportLock( su, () => {
                        } );
                        return  callback( null, {status: ( getLock !== true ) ? ProcessingStatus.PROCESSING : ProcessingStatus.NO_PROCESSING} );
                    } else {
                        if( getLock === true ) {
                            Y.doccirrus.api.rule.regenerateRules( { user, originalParams } ) ;

                        }
                        return callback( null, { status: ProcessingStatus.PROCESSING } );
                    }
                } );
            },

            clearByMetadata( args ) {
                Y.log('Entering Y.doccirrus.api.ruleimportexport.clearByMetadata', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ruleimportexport.clearByMetadata');
                }
                const
                    { callback, data, user } = args;
                clearByMetadata( data.metaDataFileName, user, callback );
            },
            getImportFile: getImportFile,
            getActiveTenants: getActiveTenants
        };
    },

    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'admin-schema',
            // 'company-api',
            // 'dcauth',
            // 'dccommonutils',
            // 'dcerror',
            // 'dcfilters',
            // 'dcforms-importutils',
            // 'dcmedia-store',
            // 'dcmongodb',
            // 'dcruleutils',
            // 'dcutils',
            // 'patient-schema',
            // 'rule-api',
            // 'rule-schema'
        ]
    }
);