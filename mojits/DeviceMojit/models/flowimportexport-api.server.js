/*global YUI */


YUI.add( 'flowimportexport-api', function( Y, NAME ) {

    const
        async = require( 'async' ),
        _ = require( 'lodash' ),
        exportDir = Y.doccirrus.auth.getTmpDir() + '/export/',
        importDir = Y.doccirrus.auth.getTmpDir() + '/import/',
        metaFileName = 'flows_meta.json';

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
        Y.log('Entering Y.doccirrus.api.flowimportexport.listSetOnDB', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.listSetOnDB');
        }
        const
            user = args.user,
            model = 'flow';

        Y.doccirrus.mongodb.runDb( {
            action: 'get',
            model: model,
            user: user,
            query: args.query,
            options: Object.assign( args.options, {lean: true} )
        }, ( err, results ) => {
            return args.callback( err, results );
        } );
    }

    function listSetOnDisk( args ) {
        Y.log('Entering Y.doccirrus.api.flowimportexport.listSetOnDisk', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.listSetOnDisk');
        }
        const
            user = args.user,
            callback = args.callback;

        var dir = null,
            metaDataFromDisk = [];

        async.waterfall( [
            ( next ) => makeExportDir( user, next ),
            ( expDir, next ) => {
                dir = expDir;
                loadMetadata( dir, metaFileName, next );
            },
            ( loadedMetadata, next ) => {
                metaDataFromDisk = loadedMetadata;
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
        Y.log('Entering Y.doccirrus.api.flowimportexport.exportSet', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.exportSet');
        }
        const
            { user, callback, data } = args;

        let
            dir = null,
            exportData = [],
            metaDataFromDisk = [],
            metaData = [],
            getQuery = ( data.ruleId ) ? {_id: {$in: [data.ruleId]}} : {};      Y.log( `Exporting flow with id ${data.ruleId}`, 'info', NAME );
        Y.log(`Exporting flow with id ${ data.ruleId }`, 'info', NAME);

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
                getExportData( user, 'flow', getQuery, next );
            },
            ( expData, next ) => {
                exportData = expData;

                function iterator( flow, cb ) {
                    let flowId = flow._id.toString(),
                        filtered = metaData.filter( mtd => { return mtd._id === flowId; } );
                    if( !filtered.length ){
                        metaData.push( {
                            _id: flowId,
                            title: flow.title
                        } );
                    }
                    Y.doccirrus.media.writeFile( dir + 'flow_' + flowId + '.json', dir, JSON.stringify( _.omit( flow, ["__v", "user_"] ) ), cb );
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

    function importSet( args ) {
        Y.log('Entering Y.doccirrus.api.flowimportexport.importSet', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.importSet');
        }
        const
            {user, callback, data} = args,
            isImport = args.import || false,
            model = 'flow';

        Y.log( `Importing flows with id ${data.ruleId}`, 'info', NAME );

        var dir = null,
            metaDataFromDisk = [],
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
                metaDataFromDisk = loadedMetadata;
                let filtered = metaDataFromDisk.filter( el => !data.ruleId || el._id === data.ruleId );

                if( !filtered.length ){
                    return next();
                }

                async.eachLimit( filtered, 200, iterator, ( err ) => {
                    next( err );
                } );

                function iterator( flowMeta, cb ) {
                    Y.doccirrus.media.readFile( dir + 'flow_' + flowMeta._id + '.json', dir, ( err, result ) => {
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

                function iterator( flow, cb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: model,
                        action: 'upsert',
                        query: { _id: flow._id },
                        fields: Object.keys(flow),
                        data:  Y.doccirrus.filters.cleanDbObject( flow )
                    }, cb );
                }
            },
            ( next ) => {
                Y.log( 'Successfully imported ' + dataFromDisk.length.toString() + ' flows.', 'info' );
                next();
            }
        ], ( err ) => {
            if( err ) {
                Y.log( 'Error during flows import: ' + JSON.stringify( err ) + 'error' );
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

            if( isImport ) {
                return callback( err );
            }

        } );

        if(!isImport) {
            return callback( null );
        }
    }

    function clearByMetadata( args ) {
        Y.log('Entering Y.doccirrus.api.flowimportexport.clearByMetadata', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.clearByMetadata');
        }
        const
            { user, data, callback } = args;

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

                async.each( ids, ( id, cb ) => Y.doccirrus.media.tempRemove( `${exportDir}flow_${id}.json`, ( err ) => {
                    if( err ){
                        Y.log(`flow:clearByMetadata error on deleting flow_${id}.json : ${err.stack || err}`, 'debug', NAME);
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

    function getImportDir( user, callback ) {
        callback(null, importDir);
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
        Y.log('Entering Y.doccirrus.api.flowimportexport.uploadbackup', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flowimportexport.uploadbackup');
        }
        const
            { callback } = args,
            newId = 'flow_' + new Date().getTime(), //% temporary identifier
            files = args.originalfiles,
            isImport = args.import || false;
        let
            lastFile = {},
            k;

        Y.log( 'Called /1/flowimportexport/:uploadbackup', 'info', NAME );

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
        Y.doccirrus.forms.importutils.handleArchiveUpload( args.user, lastFile, newId, onExtractArchive, isImport ? getImportDir : clearExportDir );

        function onExtractArchive( err ) {

            if( err ) {
                callback( Y.doccirrus.errors.rest( 500, 'Could not extract archive.', 500 ) );
                return;
            }

            callback( null, {'status': 'ok'} );
        }

    }

    Y.namespace( 'doccirrus.api' ).flowimportexport = {
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