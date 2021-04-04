/**
 *  Methods to move files to and from GridFS, filesystem and memory
 *
 *  Copyright (c) 2016 Doc-Cirrus GmbH All rights reserved.
 *  @author Richard Strickland
 */

/*jshint latedef:false */
/*global YUI, require */



YUI.add( 'dcmedia-gridfs', function( Y, NAME ) {

        var fs = require( 'fs' );

        /**
         * Store a binary file using GridFS in the current user's tenant DB
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   mediaId         {String}    Owner of this file
         * @param   fileName        {String}    Location of file on disk
         * @param   migrate         {Boolean}   True if we are currently in a migration
         * @param   callback        {Function}  Of the form fn( err, fileName )
         */

        function gridfsSaveFile( user, mediaId, fileName, migrate, callback ) {
            var
                readStream,
                writeStream,
                fileSize = 0,
                calledBack = false;

            Y.log( 'DCDB_gridfsSave fileName: ' + fileName, 'debug', NAME );
            Y.doccirrus.mongodb.gridfsConnectStream( user, migrate, onGridFsReady );

            function onGridFsReady( err, gfs ) {

                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err, null );
                }

                //  First remove any existing file(s) with this name
                gridfsRemoveFile( user, mediaId, migrate, onCleanUp );

                function onCleanUp( err ) {
                    if ( err ) {
                        Y.log( 'Problem clearing file ' + mediaId + ': ' + JSON.stringify( err ), 'warn', NAME );
                        //  attempt the write anyway
                    }

                    //  Create stream into file in GridFS
                    writeStream = gfs.createWriteStream( {'filename': mediaId + ''} );
                    writeStream.on( 'error', onWriteError );
                    writeStream.on( 'data', onWriteChunk );
                    writeStream.on( 'finish', onWriteComplete );

                    //  Pipe into it from file on disk
                    readStream = fs.createReadStream( fileName );
                    readStream.pipe( writeStream );

                }
            }

            function onWriteChunk( chunk ) {
                Y.log( 'Piping chunk into GridFS: ' + chunk.length + ' bytes', 'debug', NAME );
                fileSize = fileSize + chunk.length;
            }

            function onWriteComplete() {
                Y.log( 'Saved media source to GridFS as file: ' + mediaId, 'debug', NAME );
                //  prevent duplicated callback MOJ-6393
                if( callback && !calledBack ) {
                    calledBack = true;
                    return callback( null, mediaId, fileSize );
                }
            }

            function onWriteError( err ) {
                if( !err ) {
                    return;
                }
                Y.log( 'Error storing file in GridFS: ' + JSON.stringify( err ), 'debug', NAME );
                //  prevent duplicated callback MOJ-6393
                if( !calledBack ) {
                    calledBack = true;
                    return callback( err );
                }
            }

        }

        /**
         * Load a binary file using GridFS from the current user's tenant DB and write it to a file
         *
         * Note that this will write the file to a folder on disk
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   mediaId         {String}    Database _id of owner, used to identify file
         * @param   fileName        {String}    Location to store the file to
         * @param   migrate         {Boolean}   True if we are currently in a migration
         * @param   callback        {Function}  Of the form fn( err, fileName )
         */

        function gridfsLoadFile( user, mediaId, fileName, migrate, callback ) {
            Y.log( 'DCDB_gridfsLoad ' + mediaId + ' to file: ' + fileName, 'debug', NAME );
            var readStream, writeStream, fileSize, calledBack = false;

            if( !fileName || !mediaId ) {
                return callback( Y.doccirrus.errors.rest( '500', 'Missing args for GridFS' ) );
            }

            Y.doccirrus.mongodb.gridfsConnectStream( user, migrate, onGridFsReady );

            function onGridFsReady( err, gfs ) {
                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    callback( err, null );
                    return;
                }

                readStream = gfs.createReadStream( { 'filename': mediaId + '' } );

                readStream.on( 'error', onReadError );
                readStream.on( 'data', onReadData );
                readStream.on( 'end', onReadComplete );

                writeStream = fs.createWriteStream( fileName );
                readStream.pipe( writeStream );
            }

            function onReadData( chunk ) {
                Y.log( 'Stream data chunk: ' + chunk.length + ' bytes to file ' + fileName, 'debug', NAME );
                fileSize = fileSize + chunk.length;
            }

            function onReadComplete() {
                Y.log( 'Completed copying media source from GridFS to disk.', 'debug', NAME );
                //  prevent duplicated callback MOJ-6393
                if( !calledBack ) {
                    calledBack = true;
                    return callback( null, fileName, fileSize );
                }
            }

            function onReadError( err ) {
                if( !err ) {
                    return;
                }
                Y.log( 'Error loading media source from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                //  prevent duplicated callback MOJ-6393
                if( !calledBack ) {
                    calledBack = true;
                    return callback( err );
                }
            }
        }

        /**
         * Delete a file from GridFS store
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   mediaId         {String}    Owner of this file
         * @param   migrate         {Boolean}   True if we are currently in a migration
         * @param   callback        {Function}  Of the form fn( err, fileName )
         */

        function gridfsRemoveFile( user, mediaId, migrate, callback ) {
            Y.log( 'DCDB_gridfsRemove deleting file: ' + mediaId, 'debug', NAME );
            Y.doccirrus.mongodb.gridfsConnectStream( user, migrate, onGridFsReady );

            function onGridFsReady( err, gfs ) {

                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err, null );
                }

                gfs.remove( {'filename': mediaId + ''}, callback );
            }
        }

        /**
         * Save a buffer using GridFS to the current user's tenant DB
         *
         * Note that this will write the file to a folder on disk
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   mediaId         {String}    Database _id of owner, used to identify file
         * @param   buf             {Object}    Buffer containing file contents
         * @param   migrate         {Boolean}   True if we are currently in a migration
         * @param   callback        {Function}  Of the form fn( err, mediaId )
         */

        function gridfsSaveBuffer( user, mediaId, buf, migrate, callback ) {
            Y.log( 'DCDB_gridfsLoadBuffer ' + mediaId + ' to buffer.', 'debug', NAME );

            var calledBack = false;

            Y.doccirrus.mongodb.gridfsConnectStream( user, migrate, onGridFsReady );

            function onGridFsReady( err, gfs ) {
                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    if( !calledBack ) {
                        calledBack = true;
                        return callback( null, mediaId );
                    }
                }

                var writeStream = gfs.createWriteStream( {'filename': mediaId + ''} );

                writeStream.on( 'error', onWriteError );
                writeStream.on( 'data', onWriteData );
                writeStream.on( 'end', onWriteComplete );
                writeStream.on( 'finished', onWriteComplete );

                writeStream.write( buf, onBufferWritten );

                function onBufferWritten() {
                    Y.log( 'Finished writing, closing stream.', 'debug', NAME );
                    writeStream.end();
                    if( !calledBack ) {
                        calledBack = true;
                        return callback( null, mediaId );
                    }
                }

            }

            function onWriteData( chunk ) {
                Y.log( 'Stream data chunk: ' + chunk.length + ' bytes to GridFS.', 'debug', NAME );
            }

            function onWriteComplete() {
                Y.log( 'Completed writing media source to GridFS', 'debug', NAME );
                //  prevent duplicated callback MOJ-6393
                if( callback && !calledBack ) {
                    calledBack = true;
                    return callback( null, mediaId );
                }
            }

            function onWriteError( err ) {
                if( !err ) {
                    err = Y.doccirrus.errors.rest( 500, 'GridFS raised undefined error: ' + JSON.stringify( err ), true );
                    return callback( err );
                }

                Y.log( 'Error saving media source to GridFS: ' + JSON.stringify( err ), 'warn', NAME );

                //  prevent duplicated callback MOJ-6393
                if( callback && !calledBack ) {
                    calledBack = true;
                    return callback( err );
                }
            }
        }

        /**
         * Load a binary file using GridFS from the current user's tenant DB and write it to a buffer
         *
         * Note that this will write the file to a folder on disk
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   mediaId         {String}    Database _id of owner, used to identify file
         * @param   migrate         {Boolean}   True if we are currently in a migration
         * @param   callback        {Function}  Of the form fn( err, buffer )
         */

        function gridfsLoadBuffer( user, mediaId, migrate, callback ) {
            var chunks = [], calledBack = false;

            Y.log( 'DCDB_gridfsLoadBuffer ' + mediaId + ' to buffer.', 'debug', NAME );
            Y.doccirrus.mongodb.gridfsConnectStream( user, migrate, onGridFsReady );

            function onGridFsReady( err, gfs ) {
                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    if ( !calledBack ) {
                        calledBack = true;
                        return callback( err, null );
                    }
                    return;
                }

                var readStream = gfs.createReadStream( {'filename': mediaId + ''} );
                readStream.on( 'error', onReadError );
                readStream.on( 'data', onReadData );
                readStream.on( 'end', onReadComplete );
            }

            function onReadData( chunk ) {
                Y.log( 'Stream data chunk: ' + chunk.length + ' bytes to buffer.', 'debug', NAME );
                chunks.push( chunk );
            }

            function onReadComplete() {
                Y.log( 'Completed loading media source from GridFS, calling back with buffer.', 'debug', NAME );
                //  prevent duplicated callback MOJ-6393
                if( !calledBack ) {
                    calledBack = true;
                    return callback( null, Buffer.concat( chunks ) );
                }
            }

            function onReadError( err ) {
                if( !err ) {
                    return;
                }
                Y.log( 'Error loading media source from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                //  prevent duplicated callback MOJ-6393
                if( !calledBack ) {
                    calledBack = true;
                    return callback( err );
                }
            }
        }

        /**
         *  Get GridFS file object
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  fileName    {String}    Database _id of owner object
         *  @param  inMigration {Boolean}   True if in migration
         *  @param  callback    {Function}  Of the form fn( err, meta }
         */

        function loadFileMeta( user, fileName, inMigration, callback ) {
            Y.log( 'GridFS: getMeta ' + fileName + '. ' + ( inMigration ? ' MIGRATION' : '' ), 'debug', NAME );
            Y.doccirrus.mongodb.gridfsConnectStream( user, inMigration, onGridFsReady );

            function onGridFsReady( err, gfs ) {
                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err, null );
                }

                gfs.files.findOne( {filename: fileName + ''}, onFindOne );
            }

            function onFindOne( err, fileMeta ) {
                if( err ) {
                    Y.log( 'Error while looking up file meta: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                if ( !fileMeta || !fileMeta._id ) {
                    Y.log( 'Could not find file meta for: ' + fileName, 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( 404, 'File not found: ' + fileName, true ) );
                }

                callback( null, fileMeta );
            }
        }

        /**
         *  Save GridFS file object
         *
         *  File objects should be immutable, so only insert through this call
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  fileMeta    {Object}    GridFS file object
         *  @param  inMigration {Boolean}   True if in migration
         *  @param  isUpsert    {Boolean}   True to use upsert instead of post
         *
         *  @param  callback    {Function}  Of the form fn( err, meta }
         */

        function saveFileMeta( user, fileMeta, inMigration, isUpsert, callback ) {
            Y.log( 'GridFS: saveFileMeta ' + fileMeta.filename + '. ' + ( inMigration ? ' MIGRATION' : '' ), 'debug', NAME );

            //  don't try to sanitize this
            fileMeta.skipcheck_ = true;

            if( isUpsert ) {
                delete fileMeta.__v;
            }

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'fs.files',
                'action': isUpsert ? 'upsert' : 'post',
                'data': fileMeta,
                'migrate': inMigration,
                'callback': onFileMetaAdded

            } );

            function onFileMetaAdded( err, result ) {

                if( err ) {
                    Y.log( 'Could not save GridFS file meta: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( err, result );
            }
        }

        /**
         *  List extant file parts for the given filename
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  fileName    {String}    Filename in gridfs
         *  @param  inMigration {Boolean}   True if in migration
         *  @param  callback    {Function}  Of the form fn( err, chunks )
         */

        function listFileChunks( user, fileName, inMigration, callback ) {
            Y.log( 'GridFS: listFileChunks ' + fileName + '. ' + ( inMigration ? ' MIGRATION' : '' ), 'debug', NAME );

            var
                chunksList = [],
                fileMeta;

            loadFileMeta( user, fileName, inMigration, onFileMetaLoaded );

            function onFileMetaLoaded( err, foundFileMeta ) {
                if( err ) {
                    Y.log( 'Could not load file meta: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                fileMeta = foundFileMeta;
                Y.doccirrus.mongodb.getModel( user, 'fs.chunks', true, modelCb );
            }

            function modelCb( err, model ) {
                if( err ) {
                    Y.log( 'Could not create fs.chunks model: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                var
                    query = {'files_id': fileMeta._id},
                    projection = {'_id': 1, 'n': 1, 'files_id': 1},
                    stream = model.mongoose.find( query, projection ).stream();

                stream.on( 'data', onStreamData );
                stream.on( 'error', onStreamError );
                stream.on( 'close', onStreamClose );
            }

            function onStreamData( data ) {
                chunksList.push( data );
            }

            function onStreamError( err ) {
                Y.log( 'Error on fs.chunks stream: ' + JSON.stringify( err ), 'warn', NAME );
                callback( err );
            }

            function onStreamClose() {
                Y.log( 'Finished reading chunks stream.', 'debug', NAME );
                callback( null, chunksList );
            }
        }

        /**
         *  Writes a media object's file to the temp dir
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  mediaObj        {Object}    Media object whose file to write to temp
         *  @param  mediaObj._id    {String}    Media objects must have a database _id for lookup in GridFS
         *  @param  callback        {Function}  Of the form fn(err, fileName)
         */

        function mediaToTemp( user, mediaObj, callback ) {

            //  older media objects encoded the file as a dataURI in the media collection
            //  deprecated, to be removed after migration
            //  TODO: deleteme
            if( !mediaObj.gridfs ) {
                return Y.doccirrus.media.migrationhelper.tempStoreLegacy64( mediaObj, callback );
            }

            //  already written to disk
            if( mediaObj._diskFile ) {
                return callback( null, mediaObj._diskFile );
            }

            //  no _id, cannot load from GridFS
            if( !mediaObj._id ) {
                return callback( Y.doccirrus.errors.rest( '500', 'Missing media _id' ) );
            }

            mediaObj._diskFile = Y.doccirrus.media.getTempFileName( mediaObj );
            Y.doccirrus.media.gridfs.exportFile( user, mediaObj._id + '', mediaObj._diskFile, false, callback );
        }

        /**
         *  Load a single GridFS chunk from the database
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  chunkId         {Object}    See listFileChunks above
         *  @param  inMigration     {Boolean}   True if in migration
         *  @param  callback        {Function}  Of the form fn( err )
         */

        function loadChunk( user, chunkId, inMigration, callback ) {

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'fs.chunks',
                'action': 'get',
                'query': {'_id': chunkId + ''},
                'migrate': inMigration,
                'callback': onChunkLoaded
            } );

            function onChunkLoaded( err, result ) {

                if( !err && ( !result || !result[0] ) ) {
                    err = Y.doccirrus.errors.rest( 404, 'File chunk not found' );
                }

                if( err ) {
                    Y.log( 'Could not load GridFS chunk: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, result[0] );
            }
        }

        /**
         *  Save a chunk to the database
         *
         *  Chunks are immutable, so should not be updated, insert only
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  chunk           {Object}    See fs-chunks-schema.common.js
         *  @param  inMigration     {Boolean}   True if in migration
         *  @param  isUpsert        {Boolean}   True to use upsert instead of post
         *  @param  callback        {Function}  Of the form fn( err )
         */

        function saveChunk( user, chunk, inMigration, isUpsert, callback ) {

            if( 'string' === typeof chunk.data ) {
                chunk.data = Buffer.from( chunk.data, 'base64' );
            }

            if( isUpsert ) {
                delete chunk.__v;
            }

            //  don't try to sanitize binary data
            chunk.skipcheck_ = true;

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'fs.chunks',
                'action': isUpsert ? 'upsert' : 'post',
                'data': chunk,
                'migrate': inMigration,
                'callback': onChunkAdded
            } );

            function onChunkAdded( err, result ) {

                if( err ) {
                    Y.log( 'Could not save GridFS chunk: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( err, result );
            }
        }

        /**
         *  Stream a file directly to the client from GridFS
         *
         *  @param  fileName    {String}    GridFS identifier
         *  @param  req         {Object}    Express request object
         *  @param  res         {Object}    Express response object
         */

        function streamToClient( fileName, req, res ) {
            var gfs;

            Y.log( 'GridFS: streamToClient ' + fileName, 'debug', NAME );
            Y.doccirrus.mongodb.gridfsConnectStream( req.user, false, onGridFsReady );

            function onGridFsReady( err, newGfs ) {
                if( err ) {
                    Y.log( 'Error while connecting GridFS to tenant database for user: ' + JSON.stringify( err ), 'debug', NAME );
                    onGridFSReadError( err, 'Cannot connect stream, GridFS is offline.' );
                    return;
                }

                gfs = newGfs;
                gfs.files.findOne( {filename: fileName + ''}, onFindFileMeta );
            }

            function onFindFileMeta( err, fileMeta ) {

                if( !err && !fileMeta ) {
                    err = Y.doccirrus.errors.rest( 404, 'File not found.' );
                }

                if( err ) {
                    onGridFSReadError( err, 'File not found: /media/' + fileName );
                    return;
                }

                var addHeaders = {
                    'Content-Type': fileMeta.contentType,
                    'Content-Length': fileMeta.length
                };

                var readStream = gfs.createReadStream( {filename: fileName} );

                Y.log( 'Sending headers: ' + JSON.stringify( addHeaders, undefined, 2 ), 'debug', NAME );
                res.writeHead( 200, addHeaders );

                Y.log( 'Piping file to client: ' + fileName, 'debug', NAME );
                readStream.on( 'error', onGridFSReadError );
                readStream.pipe( res );
            }

            function onGridFSReadError( err, msg ) {
                Y.log( 'Error while streaming file to client: ' + JSON.stringify( err ), 'warn', NAME );

                var addHeaders = {
                    'Content-Type': 'text/plain',
                    'Content-Length': msg.length
                };

                res.writeHead( 404, addHeaders );
                res.write( msg );
            }
        }

        /*
         *  MediaMojit images API
         */

        Y.namespace( 'doccirrus.media' ).gridfs = {
            importFile: gridfsSaveFile,
            exportFile: gridfsLoadFile,
            removeFile: gridfsRemoveFile,
            importBuffer: gridfsSaveBuffer,
            exportBuffer: gridfsLoadBuffer,
            loadFileMeta: loadFileMeta,
            saveFileMeta: saveFileMeta,
            listFileChunks: listFileChunks,
            mediaToTemp: mediaToTemp,
            loadChunk: loadChunk,
            saveChunk: saveChunk,
            streamToClient: streamToClient
        };

    },
    '0.0.1', {requires: ['fs-chunks-schema', 'fs-files-schema']}
);