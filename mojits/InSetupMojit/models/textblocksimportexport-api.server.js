/*global YUI */


YUI.add( 'textblocksimportexport-api', function( Y, NAME ) {

        const
            metaFileName = 'textblocks_meta.json',
            util = require('util'),
            writeFile = util.promisify( Y.doccirrus.media.writeFile ),
            readFile = util.promisify( Y.doccirrus.media.readFile ),
            {formatPromiseResult} = require('dc-core').utils,
            _ = require( 'lodash' );

        function transformResult( item, parent ) {
            return {
                '_id': item._id,
                'parent': parent || null,
                'isLocked': false,
                'isDirectory': !Boolean( parent ),
                'totalCount': parent ? 0 : item.entries && item.entries.length,
                'name': parent ? item.text : Y.doccirrus.schemaloader.translateEnumValue( 'i18n', item.actType, Y.doccirrus.schemas.activity.types.Activity_E.list, item.actType )
            };
        }

        function sortByName( a, b ) {
            return a.name > b.name ? 1 : -1;
        }

        function emitSocketIOEvent( sessionId, eventName, data ) {
            Y.doccirrus.communication.emitEventForSession( {
                sessionId,
                event: eventName,
                msg: {
                    data
                }
            } );
        }

        /**
         * @method listSetOnDB
         * @public
         *
         * read specific collection for particular type of import/export, transform for view used in import/export tree
         * @param   {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Function} args.callback
         *
         * @returns {Function<Array>} callback
         */
        async function listSetOnDB( args ) {
            Y.log('Entering Y.doccirrus.api.textblocksimportexport.listSetOnDB', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.textblocksimportexport.listSetOnDB');
            }

            const
                {user, query = {}, options = {}, callback} = args;

            let [err, textBlocks] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'documentationtree',
                    query,
                    options
                } )
            );

            if( err ){
                Y.log( `listSetOnDB: error getting model data : ${err.stack || err}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error getting data.' } ) );
            }

            callback( null,
                ( query._id ?
                  (textBlocks && textBlocks.result && textBlocks.result[0] && textBlocks.result[0].entries || []).map( subEl => transformResult( subEl, query._id ) ) :
                  (textBlocks && textBlocks.result || []).map( el => transformResult( el, query._id ) )
                ).sort( sortByName ) );
        }

        /**
         * @method listSetOnDisk
         * @public
         *
         * read specific metadata files for particular type of import export and return array of exported data from this metadata
         * @param {OBjec} args
         * @param {Object} args.user
         * @param {Function} args.callback
         *
         * @returns {Function<Array>} callback
         */
        async function listSetOnDisk( args ) {
            Y.log('Entering Y.doccirrus.api.textblocksimportexport.listSetOnDisk', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.textblocksimportexport.listSetOnDisk');
            }
            const
                {user, query, callback} = args;

            let [err, exportDir] = await formatPromiseResult( Y.doccirrus.api.importexport.makeExportDir( user ) );
            if( err ){
                Y.log( `listSetOnDisk: error getting export dir : ${err.stack || err}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error getting path.' } ) );
            }

            //get entries data from exact exported file
            if( query._id ){
                let fileData;
                [err, fileData] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( exportDir, `textblocks_${query._id}.json`, true ) );
                if( err ){
                    Y.log( `listSetOnDisk: error reading exported file with id ${query._id}: ${err.stack || err}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error reading file.' } ) );
                }

                if( fileData ){
                    return callback( null, (fileData.entries || []).map( el => transformResult( el, query._id ) ).sort( sortByName ) );
                }

                return callback( null, [] );
            }

            //read top level structure from the metafile
            let metaFile;
            [err, metaFile] = await formatPromiseResult( Y.doccirrus.api.importexport.loadMetadata( exportDir, metaFileName ) );
            if( err ){
                Y.log( `listSetOnDisk: error reading meta file ${exportDir}${metaFileName} : ${err.stack || err}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error reading metadata.' } ) );
            }
            callback( null, (metaFile || []).sort( sortByName ) );
        }

        /**
         * @method exportSet
         * @public
         *
         * write to file either one collection entry or whole collection (each entry as separate file), update metadata file with info about exported files
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.id      id of single entry to export, if null export all
         * @param {Function} args.callback
         */
        function exportSet( args ) {
            Y.log('Entering Y.doccirrus.api.textblocksimportexport.exportSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.textblocksimportexport.exportSet');
            }

            const { user, data, callback} = args;

            let exportDir = null,
                exportData = null;

            Y.log( `Exporting text blocks report with id ${data.leaf ? data.entry.parent :data.id }`, 'info', NAME );

            Y.doccirrus.api.importexport.makeExportDir( user )
                .then( ( dir ) => exportDir = dir )//eslint-disable-line
                .then( () => Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'documentationtree',
                        action: 'get',
                        query: data.id ? { _id: data.id } : ( data.leaf ? { _id: data.entry.parent } : {} ),
                        options: {
                            lean: true
                        }
                    } )
                )
                .then( ( dataToExport ) => {
                    exportData = dataToExport;

                    if( !data.leaf ){ // exported all text blocks for activity types
                        return Promise.resolve();
                    }

                    //export only particular textBlock
                    if( exportData.length ){
                        exportData[0].entries = (exportData[0].entries || []).filter( el => el.text === data.entry.name );
                        return Y.doccirrus.api.importexport.loadMetadata( exportDir, `textblocks_${data.entry.parent}.json`, true ).then( exportedData => {
                            if( exportedData ){
                                let mergedEntries = exportData[0].entries,
                                    mergedEntriesTexts = mergedEntries.map( entry => entry.text );
                                (exportedData.entries || []).map( entry => {
                                    if( !mergedEntriesTexts.includes(entry.text) ){
                                        mergedEntries.push( entry );
                                    }
                                } );
                                exportData[0].entries = mergedEntries;
                            }
                        } );
                    }
                } )
                .then( () => {
                    return Promise.all( exportData.map( ( textblock ) =>
                        writeFile( `${exportDir}textblocks_${textblock._id}.json`, exportDir, JSON.stringify( _.omit( textblock, ['__v', 'user_'] ) ) )
                    ) );
                } )
                .then( () => Y.doccirrus.api.importexport.loadMetadata( exportDir, metaFileName ) )
                .then( ( metaDataFromDisk ) => {
                    let mergedMeta = metaDataFromDisk.concat(
                        exportData.filter(
                            ( expDat ) => !metaDataFromDisk.find( ( mdd ) => mdd._id.toString() === expDat._id.toString() )
                        ).map(
                            el => transformResult( el )
                        )
                    );

                    //update total counts
                    mergedMeta = mergedMeta.map( meta => {
                        let currentlyExporting = exportData.find( el => el._id.toString() === meta._id );
                        if( currentlyExporting ){
                            meta.totalCount = (currentlyExporting.entries || []).length;
                        }
                        return meta;
                    });

                    return writeFile( exportDir + metaFileName, exportDir, JSON.stringify( mergedMeta ) );
                } )
                .then( () => {
                    Y.log( `Successfully exported ${exportData.length} text blocks(s).`, 'info', NAME );
                    emitSocketIOEvent( user.sessionId, 'ExportDone', {} );
                } )
                .catch( ( err ) => {
                    Y.log( `exportSet: Failed to exportSet: ${err.stack || err}`, 'error', NAME );
                    emitSocketIOEvent( user.sessionId, 'ExportDone', {error: new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error exporting data.' } )} );
                } );

            callback( null );
        }

        /**
         * @method importSet
         * @public
         *
         * read files with data and upsert into db (by actType key). If destination system already has same entry then
         * merge imported data (entries) with existed one ( by entry text key )
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.id      id of single entry to export, if null export all
         * @param {Function} args.callback
         */
        function importSet( args ) {
            Y.log('Entering Y.doccirrus.api.textblocksimportexport.importSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.textblocksimportexport.importSet');
            }
            const {user, data, callback} = args;
            let
                exportDir = null,
                metaToImport = null;

            Y.doccirrus.api.importexport.makeExportDir( user ) // Create dir read read from if not exist
                // Save it
                .then( ( dir ) => exportDir = dir )//eslint-disable-line
                .then( ( dir ) => Y.doccirrus.api.importexport.loadMetadata( dir, metaFileName ) ) //Load file meta with all reports refs
                .then( ( metaDataFromDisk ) => { // Save loaded meta and filter only that we need
                    metaToImport = data.id ? metaDataFromDisk.filter( ( md ) => md._id === data.id ) :
                        data.leaf ? metaDataFromDisk.filter( ( md ) => md._id === data.entry.parent ) : metaDataFromDisk;
                    return Promise.all( metaToImport.map( ( meta ) => readFile( `${exportDir}textblocks_${meta._id}.json`, exportDir ) ) );
                } )
                .then( result => {
                    return result.map( textblock => {
                        let textblockParsed;
                        try {
                            textblockParsed = JSON.parse( textblock );
                        } catch( err ) {
                            Y.log( `importSet: Error parsing ${textblock} : ${err.stack || err}`, 'error', NAME );
                            throw(err);
                        }
                        return textblockParsed;
                    } );
                } )
                .then( async (result) => {
                    let actTypes = result.map( textblock => textblock.actType );
                    let [err, currentTextBlocks] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'documentationtree',
                            query: {
                                actType: {$in:  actTypes},
                                entries: {$not: {$size: 0}}
                            }
                        } )
                    );

                    if( err ){
                        Y.log( `importSet: Error getting on system data : ${err.stack || err}`, 'error', NAME );
                        throw(err);
                    }

                    if( data.leaf ){
                        //additionally filter for exact textblock
                        result = (result || []).map( impotedTextBlock => {
                            if( impotedTextBlock._id === data.entry.parent ){
                                impotedTextBlock.entries = (impotedTextBlock.entries || []).filter( el => el.text === data.entry.name );
                            }
                            return impotedTextBlock;
                        } );
                    }

                    (currentTextBlocks || []).map( currentText => {
                        let importedText = result.find( textblock => textblock.actType === currentText.actType );
                        if( importedText ){
                            let mergedEntries = currentText.entries,
                                mergedEntriesTexts = mergedEntries.map( entry => entry.text );

                            (importedText.entries || []).map( entry => {
                                if( !mergedEntriesTexts.includes(entry.text) ){
                                    mergedEntries.push( entry );
                                }
                            } );
                            importedText.entries = mergedEntries;
                        }
                    } );
                    return result;
                } )
                .then( async (result) => {
                    for(let textblock of result){
                        let [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'upsert',
                                model: 'documentationtree',
                                query: {actType: textblock.actType },
                                fields: Object.keys( textblock ),
                                data: Y.doccirrus.filters.cleanDbObject( textblock ),
                                options: {
                                    omitQueryId: true
                                }
                            } )
                        );
                        if( err ){
                            Y.log( `importSet: Error upserting data ${textblock} : ${err.stack || err}`, 'error', NAME );
                            throw(err);
                        }
                    }
                } )
                .then( () => {
                    Y.log( `Successfully imported ${metaToImport.length} text blocks(s).`, 'info', NAME );
                    emitSocketIOEvent( user.sessionId, 'ImportDone', {} );
                } )
                .catch( ( err ) => {
                    Y.log( `importSet: Failed to importSet: ${err.stack || err}`, 'error', NAME );
                    emitSocketIOEvent( user.sessionId, 'ImportDone', {error: new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error importing data.' } )} );
                } );

            callback( null );
        }

        Y.namespace( 'doccirrus.api' ).textblocksimportexport = {

            name: NAME,

            listSetOnDB,
            listSetOnDisk,
            exportSet,
            importSet
        };
    },

    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dccommonerrors',
            // 'dcfilters',
            // 'dcmedia-store',
            // 'dcmongodb',
            // 'dcschemaloader',
            // 'importexport-api'
        ]
    }
);