/*global YUI */


YUI.add( 'catalogusageimportexport-api', function( Y, NAME ) {

        const
            async = require( 'async' ),
            _ = require( 'lodash' ),
            exportDir = Y.doccirrus.auth.getTmpDir() + '/export/',
            metaFileName = 'catalogusages_meta.json',
            NOT_PROVIDED = 'Eigene Einträge';

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

        function listSetOnDB( args ) {
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.listSetOnDB', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.listSetOnDB');
            }
            const
                user = args.user,
                model = 'catalogusage',
                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            let promise,
                query = args.query;

            if( null === query.catalogShort && null === query.locationId && !query.level) {
                promise = Prom.props( {
                    catalogs: runDb( {
                           action: 'aggregate',
                           pipeline: [
                               {$group: {_id: '$locationId', totalCount: {$sum: 1}}},
                               {
                                   $project: {
                                       title: "$_id",
                                       totalCount: 1,
                                       level: {$literal: 1}
                                   }
                               }
                           ],
                           model: model,
                           user: user,
                           options: Object.assign( args.options, {lean: true} )
                    } ),
                    locations: runDb( {
                        action: 'get',
                        model: 'location',
                        user: user,
                        query: {},
                        options: {select: {'locname': 1}}
                    } )
                } );
            } else if( null === query.catalogShort && query.level ) {
                promise = runDb( {
                    action: 'aggregate',
                    pipeline: [
                        {$match: {locationId: query.locationId}},
                        {$project: {catalogShort: {$ifNull: ['$catalogShort', '']}, locationId: 1, catalogShortOrg: '$catalogShort'}},
                        {$group: {_id: '$catalogShort', totalCount: {$sum: 1}, locationId: {$first: "$locationId"}, catalogShortOrg: {$first: "$catalogShortOrg"}}},
                        {
                            $project: {
                                title: {$cond: [{$eq: ['$_id', '']}, NOT_PROVIDED, '$_id']},
                                catalogShort: '$catalogShortOrg',
                                locationId: 1,
                                totalCount: 1,
                                level: {$literal: 2}
                            }
                        },
                        {$sort: {title: 1}}
                    ],
                    model: model,
                    user: user,
                    options: Object.assign( args.options, {lean: true} )
                } );
            } else {
                delete query.level;
                promise = Prom.props( {
                    catalogs: runDb( {
                        action: 'get',
                        model: model,
                        user: user,
                        query: query,
                        options: Object.assign( args.options, {lean: true} )
                    } ),
                    locations: runDb( {
                        action: 'get',
                        model: 'location',
                        user: user,
                        query: {},
                        options: {select: {'locname': 1}}
                    } )
                } );
            }

            promise.then( results => {
                if( results && results.catalogs ) {
                    let locations = {};
                    ( results.locations || [] ).forEach( el => {
                        locations[el._id.toString()] = el.locname;
                    } );
                    results = results.catalogs || [];

                    if( results && results.result && results.result.length && Object.keys( locations ).length ) {
                        results.result = results.result.map( el => {
                            el.locname = locations[el.locationId];

                            if( 1 === el.level ){
                                el.locationId = el.title;
                                if(locations[el.title]){
                                    el.title = locations[el.title];
                                } else {
                                    el.title = Y.doccirrus.i18n( 'IncaseAdminMojit.catalogusage_importexport.unknown_location' );
                                }
                            }

                            return el;
                        } );
                        results.result = _.sortByAll( results.result, ['locname', 'title'] );
                    }
                }

                return args.callback( null, results );
            } ).catch( err => {
                return args.callback( err );
            } );
        }

        function listSetOnDisk( args ) {
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.listSetOnDisk', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.listSetOnDisk');
            }
            const
                user = args.user,
                callback = args.callback;

            var dir = null,
                metaDataFromDisk = [],
                query = args.query,
                locations = {};

            async.waterfall( [
                ( next ) => makeExportDir( user, next ),
                ( expDir, next ) => {
                    dir = expDir;
                    getExportData( user, 'location', {}, next );
                },
                ( loadedLocations, next ) => {
                    (loadedLocations || []).forEach( el => {
                        locations[el._id.toString()] = el.locname;
                    } );
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;
                    if( null === query.catalogShort && null === query.locationId && !query.level) {
                        let groupsObj = _.groupBy( metaDataFromDisk, 'locationId' ) || {},
                            unknownTitle = Y.doccirrus.i18n( 'IncaseAdminMojit.catalogusage_importexport.unknown_location' );
                        metaDataFromDisk = Object.keys( groupsObj ).map( key => {
                            let locationNameFromGroup = groupsObj[key] && groupsObj[key][0] && groupsObj[key][0].locationName;
                            return {
                                title: (locations[key]) ? locations[key] : ((key === 'null' ? '' : unknownTitle) + (locationNameFromGroup ? ' [' + locationNameFromGroup + ']' : '')),
                                totalCount: (groupsObj[key] || []).length,
                                locationId: key,
                                level: 1,
                                _id: key
                            };
                        } );
                        metaDataFromDisk = _.sortBy( metaDataFromDisk, 'title' );
                    } else if( null === query.catalogShort && query.level ) {
                        metaDataFromDisk = metaDataFromDisk.filter( el => el.locationId === query.locationId || ( 'null' === query.locationId && null === el.locationId));
                        let groupsObj = _.groupBy( metaDataFromDisk, 'catalogShort' ) || {};
                        metaDataFromDisk = Object.keys( groupsObj ).map( key => {
                            return {
                                title: ( '' === key ) ? NOT_PROVIDED : key,
                                totalCount: (groupsObj[key] || []).length,
                                catalogShort: key,
                                locationId: query.locationId,
                                level: 2,
                                _id: key
                            };
                        } );
                        metaDataFromDisk = _.sortBy( metaDataFromDisk, 'title' );
                    } else {
                        metaDataFromDisk = metaDataFromDisk.filter( el => {
                            return el.catalogShort === query.catalogShort && ( el.locationId === query.locationId || ( 'null' === query.locationId && null === el.locationId) );
                        } ).map( el => {
                            el.locname = locations[el.locationId];
                            return el;
                        } );
                        metaDataFromDisk = _.sortByAll( metaDataFromDisk, ['locname', 'title'] );
                    }

                    next();
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( 'Error during listing export directory export: ' + JSON.stringify( err ) + 'error' );
                }
                callback( err, metaDataFromDisk );
            } );
        }

        function exportSet( args ) {
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.exportSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.exportSet');
            }
            const
                {user, callback, data} = args;

            let
                dir = null,
                exportData = [],
                metaDataFromDisk = [],
                metaData = [],
                locations = {},
                entry = data && data.entry || {},
                getQuery;

            if( !data.ruleId && !entry.level ){
                getQuery = {};
            } else if( entry.level && 1 === entry.level ){
                getQuery = { locationId: entry.locationId };
            } else if( entry.level && 2 === entry.level ){
                getQuery = { locationId: entry.locationId, catalogShort: entry.catalogShort };
            } else {
                getQuery = {_id: {$in: [data.ruleId]}};
            }


            Y.log( `Exporting catalogusage with id ${data.ruleId}`, 'info', NAME );

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
                    getExportData( user, 'location', {}, next );
                },
                ( loadedLocations, next ) => {
                    (loadedLocations || []).forEach( el => {
                        locations[el._id.toString()] = el.locname;
                    } );
                    getExportData( user, 'catalogusage', getQuery, next );
                },
                ( expData, next ) => {
                    exportData = expData;

                    function iterator( catalogusage, cb ) {
                        let catalogUsageId = catalogusage._id.toString(),
                            filtered = metaData.filter( mtd => {
                                return mtd._id === catalogUsageId;
                            } );
                        if( !filtered.length ) {
                            metaData.push( {
                                _id: catalogUsageId,
                                catalogShort: catalogusage.catalogShort,
                                seq: catalogusage.seq,
                                title: catalogusage.title,
                                locationName: locations[catalogusage.locationId],
                                locationId: catalogusage.locationId
                            } );
                        }
                        Y.doccirrus.media.writeFile( dir + 'catalogusage_' + catalogUsageId + '.json', dir, JSON.stringify( _.omit( catalogusage, ["__v", "user_"] ) ), cb );
                    }

                    async.eachLimit( exportData, 200, iterator, ( err ) => {
                        next( err );
                    } );

                },
                ( next ) => {
                    //merge loaded array of metadata with newly exported
                    metaData.forEach( ( el ) => {
                        let filtered = metaDataFromDisk.filter( mdt => mdt._id === el._id.toString() );
                        if( !filtered.length ) {
                            metaDataFromDisk.push( el );
                        }
                    } );

                    Y.doccirrus.media.writeFile( dir + metaFileName, dir, JSON.stringify( metaDataFromDisk ), next );
                },
                ( next ) => {
                    Y.log( 'Successfully exported ' + exportData.length.toString() + ' catalogusages.', 'info' );
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

                callback( null );
            } );
        }

        function importSet( args ){
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.importSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.importSet');
            }
            const
                {user, callback, data} = args,
                model = 'catalogusage';

            Y.log( `Importing catalogusages with id ${data.ruleId}`, 'info', NAME );

            var dir = null,
                metaDataFromDisk = [],
                dataFromDisk = [],
                entry = data && data.entry || {},
                mappedLocation = data && data.mappedLocation,
                locations = {};

            async.waterfall( [
                ( next ) => {
                    makeExportDir( user, next );
                },
                ( expDir, next ) => {
                    dir = expDir;
                    getExportData( user, 'location', {}, next );
                },
                ( loadedLocations, next ) => {
                    (loadedLocations || []).forEach( el => {
                        locations[el._id.toString()] = el.locname;
                    } );
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;

                    let filtered;

                    if( !data.ruleId && !entry.level ){
                        filtered = metaDataFromDisk;
                    } else if( entry.level && 1 === entry.level ){
                        filtered = metaDataFromDisk.filter( el => ( el.locationId === entry.locationId || ( 'null' === entry.locationId && null === el.locationId) ) );
                    } else if( entry.level && 2 === entry.level ){
                        filtered = metaDataFromDisk.filter( el => el.catalogShort === entry.catalogShort && ( el.locationId === entry.locationId || ( 'null' === entry.locationId && null === el.locationId) ) );
                    } else {
                        filtered = metaDataFromDisk.filter( el => el._id === data.ruleId );
                    }

                    if( !filtered.length ) {
                        return next();
                    }

                    async.eachLimit( filtered, 200, iterator, ( err ) => {
                        next( err );
                    } );

                    function iterator( catalogUsageMeta, cb ) {
                        Y.doccirrus.media.readFile( dir + 'catalogusage_' + catalogUsageMeta._id + '.json', dir, ( err, result ) => {
                            if( !err && result ) {
                                dataFromDisk.push( JSON.parse( result ) );
                            }
                            cb( err );
                        } );
                    }
                },
                ( next ) => {
                    if( !dataFromDisk.length ) {
                        return next();
                    }

                    async.eachLimit( dataFromDisk, 200, iterator, ( err ) => {
                        next( err );
                    } );

                    function iterator( catalogusage, cb ) {
                        if(mappedLocation || 'null' === mappedLocation || null === mappedLocation){
                            catalogusage.locationId = mappedLocation;
                        }

                        delete catalogusage.count;
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: model,
                            action: 'upsert',
                            query: {
                                seq: catalogusage.seq,
                                catalogShort: catalogusage.catalogShort,
                                locationId: catalogusage.locationId
                            },
                            fields: Object.keys( catalogusage ),
                            options: {omitQueryId: true},
                            data: Y.doccirrus.filters.cleanDbObject( catalogusage )
                        }, cb );
                    }
                },
                ( next ) => {
                    Y.log( 'Successfully imported ' + dataFromDisk.length.toString() + ' catalogusages.', 'info' );
                    next();
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( 'Error during catalogusages import: ' + JSON.stringify( err ) + 'error' );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: args.user.sessionId,
                    event: 'ruleImportDone',
                    msg: {
                        data: {
                            error: err
                        }
                    }
                } );

                if( 'function' === typeof callback ) {
                    return callback( err );
                }

            } );
        }

        function clearByMetadata( args ) {
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.clearByMetadata', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.clearByMetadata');
            }
            const
                {user, data, callback} = args;

            let exportDir = '',
                metaDataFileName = data.metaDataFileName;

            async.waterfall( [
                ( next ) => makeExportDir( user, next ),
                ( expDir, next ) => {
                    exportDir = expDir;
                    loadMetadata( expDir, metaDataFileName, next );
                },
                ( loadedMetadata, next ) => {
                    let
                        ids = _.chain( loadedMetadata )
                            .filter()
                            .uniq()
                            .map( v => (v._id) )
                            .value();

                    async.each( ids, ( id, cb ) => Y.doccirrus.media.tempRemove( `${exportDir}catalogusage_${id}.json`, ( err ) => {
                        if( err ){
                            Y.log(`catalogusage:clearByMetadata error on deleting catalogusage_${id}.json : ${err.stack || err}`, 'debug', NAME);
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

        function uploadbackup( args ) {
            Y.log('Entering Y.doccirrus.api.catalogusageimportexport.uploadbackup', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusageimportexport.uploadbackup');
            }
            const
                {callback} = args,
                newId = 'catalogusage_' + new Date().getTime(), //% temporary identifier
                files = args.originalfiles;
            let
                lastFile = {},
                k;

            Y.log( 'Called /1/catalogusageimportexport/:uploadbackup', 'info', NAME );

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
                return callback( Y.doccirrus.errors.rest( 500, 'Invalid file upload.', true ) );
            }
            Y.doccirrus.forms.importutils.handleArchiveUpload( args.user, lastFile, newId, onExtractArchive, clearExportDir );

            function onExtractArchive( err ) {

                if( err ) {
                    callback( Y.doccirrus.errors.rest( 500, 'Could not extract archive.', 500 ) );
                    return;
                }

                callback( null, {'status': 'ok'} );
            }

        }

        Y.namespace( 'doccirrus.api' ).catalogusageimportexport = {
            name: NAME,
            listSetOnDB: listSetOnDB,
            listSetOnDisk: listSetOnDisk,
            exportSet: exportSet,
            importSet: importSet,
            clearByMetadata: clearByMetadata,
            uploadbackup: uploadbackup
        };
    },
    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dcerror',
            // 'dcfilters',
            // 'dcforms-importutils',
            // 'dcmedia-store',
            // 'dcmongodb'
        ]
    }
);