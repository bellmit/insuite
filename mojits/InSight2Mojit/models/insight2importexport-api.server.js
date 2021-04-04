/*global YUI */


YUI.add( 'insight2importexport-api', function( Y, NAME ) {

        const
            metaFileName = 'insight2_meta.json',
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            makeExportDir = Promise.promisify( Y.doccirrus.api.ruleimportexport.makeExportDir ),
            loadMetadata = Promise.promisify( Y.doccirrus.api.ruleimportexport.loadMetadata ),
            writeFile = Promise.promisify( Y.doccirrus.media.writeFile ),
            readFile = Promise.promisify( Y.doccirrus.media.readFile ),
            _ = require( 'lodash' );

        function listSetOnDB( args ) {
            Y.log('Entering Y.doccirrus.api.insight2importexport.listSetOnDB', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2importexport.listSetOnDB');
            }

            const
                {callback, user, options, query} = args;

            runDb( {
                action: 'get',
                model: 'insight2',
                user: user,
                query: query,
                options: Object.assign( options, {lean: true} )
            } )
                .then( ( result ) => result.result.map( transformResult ) )
                .then( ( result ) => callback( null, result ) )
                .catch( ( err ) => {
                    Y.log( 'Failed to listSetOnDB: ' + err.message, 'error', NAME );
                    callback( err );
                } );
        }

        function listSetOnDisk( args ) {
            Y.log('Entering Y.doccirrus.api.insight2importexport.listSetOnDisk', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2importexport.listSetOnDisk');
            }
            const
                {callback, user} = args;

            makeExportDir( user )
                .then( ( exportDir ) => loadMetadata( exportDir, metaFileName ) )
                .then( ( metaFile ) => callback( null, metaFile ) )
                .catch( ( err ) => {
                    Y.log( 'Failed to listSetOnDisk: ' + err.message, 'error', NAME );
                    callback( err );
                } );
        }

        function exportSet( args ) {
            Y.log('Entering Y.doccirrus.api.insight2importexport.exportSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2importexport.exportSet');
            }

            const {callback, user, data} = args;

            let exportDir = null,
                exportData = null;

            Y.log( `Exporting insight2 report with id ${data.ruleId}`, 'info', NAME );

            makeExportDir( user )
                .then( ( dir ) => exportDir = dir )//eslint-disable-line
                .then( () => runDb( {
                        user: user,
                        model: 'insight2',
                        action: 'get',
                    query: data.ruleId ? {_id: {$in: [data.ruleId]}} : {},
                        options: {
                            lean: true
                        }
                    } )
                )
                .then( ( dataToExport ) => {
                    exportData = dataToExport;
                    return Promise.all( dataToExport.map( ( report ) =>
                        writeFile( exportDir + 'insight2_' + report._id + '.json', exportDir, JSON.stringify( _.omit( report, ['__v', 'user_'] ) ) ) ) );
                } )
                .then( () => loadMetadata( exportDir, metaFileName ) )
                .then( ( metaDataFromDisk ) => {
                    let mergedMeta = metaDataFromDisk.concat( exportData.filter( ( expDat ) => !metaDataFromDisk.find( ( mdd ) => mdd._id.toString() === expDat._id.toString() ) ).map( transformResult ) );
                    return writeFile( exportDir + metaFileName, exportDir, JSON.stringify( mergedMeta ) );
                } )
                .then( () => {
                    Y.log( 'Successfully exported ' + exportData.length.toString() + ' report(s).', 'info', NAME );
                    emitSocketIOEvent( user.sessionId, 'ruleExportDone', {} );
                } )
                .catch( ( err ) => {
                    Y.log( 'Failed to exportSet: ' + err.message, 'error', NAME );
                    emitSocketIOEvent( user.sessionId, 'ruleExportDone', {error: err} );
                } );

            callback( null );
        }

        function importSet( args ) {
            Y.log('Entering Y.doccirrus.api.insight2importexport.importSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2importexport.importSet');
            }
            const {callback, user, data} = args;
            let
                exportDir = null,
                metaToImport = null;

            makeExportDir( user ) // Create dir read read from if not exist
                // Save it
                .then( ( dir ) => exportDir = dir )//eslint-disable-line
                .then( ( dir ) => loadMetadata( dir, metaFileName ) ) //Load file meta with all reports refs
                .then( ( metaDataFromDisk ) => { // Save loaded meta and filter only that we need
                    metaToImport = data.ruleId ? metaDataFromDisk.filter( ( md ) => md._id === data.ruleId ) : metaDataFromDisk;
                    return Promise.all( metaToImport.map( ( meta ) => readFile( `${exportDir}insight2_${meta._id}.json`, exportDir ) ) );
                } )
                .then( ( result ) => {
                    // Parse and save to DB
                    result.map( ( r ) => {
                        let rep = JSON.parse( r );
                        if( !rep.country ) {
                            // no country in imported reports, set default D
                            rep.country = [ 'D' ];
                        }
                        return runDb( {
                            user: user,
                            action: 'upsert',
                            model: 'insight2',
                            fields: Object.keys( rep ),
                            data: Y.doccirrus.filters.cleanDbObject( rep )
                        } );
                    } );
                } )
                .then( () => {
                    Y.log( 'Successfully imported ' + metaToImport.length.toString() + ' report(s).', 'info', NAME );
                    emitSocketIOEvent( user.sessionId, 'ruleImportDone', {} );
                } )
                .catch( ( err ) => {
                    Y.log( 'Failed to importSet: ' + err.message, 'error', NAME );
                    emitSocketIOEvent( user.sessionId, 'ruleImportDone', {error: err} );
                } );

            callback( null );
        }

        function transformResult( item ) {
            return {
                '_id': item._id,
                'parent': null,
                'isLocked': false,
                'isDirectory': false,
                'name': item.csvFilename
            };
        }

        function emitSocketIOEvent( sessionId, eventName, data ) {
            Y.doccirrus.communication.emitEventForSession( {
                sessionId: sessionId,
                event: eventName,
                msg: {
                    data: data
                }
            } );
        }

        Y.namespace( 'doccirrus.api' ).insight2importexport = {

            name: NAME,

            listSetOnDB: listSetOnDB,
            listSetOnDisk: listSetOnDisk,
            exportSet: exportSet,
            importSet: importSet
        };
    },

    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils',
            'ruleimportexport-api'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcfilters',
            // 'dcmedia-store',
            // 'dcmongodb'
        ]
    }
);