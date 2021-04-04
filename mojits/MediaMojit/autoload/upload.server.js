/*
 * Copyright (c) 2012 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  Endpoint / Helper object to manage chunked file uploads
 *
 *  see: http://fineuploader.com/
 *
 *  Code is adapted from NodeJS sample code on the FineUploader GitHub repo:
 *
 *  https://github.com/FineUploader/fine-uploader/commit/1212b839a283627eaaabc6cdd69081e1a0d031b9
 */

/*global YUI*/
/*jshint latedef:false */



YUI.add( 'dcmedia-upload', function( Y, NAME ) {
    
        var
            fs = require( 'fs' ),
            rimraf = require( 'rimraf' ),
            mkdirp = require( 'mkdirp' ),
            async = require( 'async' ),

            CHUNK_DIR_NAME= 'chunks';

        /**
         *  Receive upload of a file sent as a single multiplart encoded form
         *
         *  NOTE: this previously used the file uuid, removed to simplify cleanup of temp files
         *
         *  @param  file            {Object}    As found in REST args.originalfiles
         *  @param  meta            {Object}    Properties of this upload
         *  @param  meta.qquuid     {String}    UID of this file upload
         *  @param  meta.qqfilename {String}    Original file name from client
         *  @param  callback        {Function}  Of the form fn( err, fileName )
         */

        function uploadSimple( file, meta, callback ) {

            function onFileMoved( err ) {
                if ( err ) {
                    Y.log( `Could not copy uploaded file: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                Y.log( `Cleaning up file in system temp: ${tempFile}`, 'debug', NAME );
                fs.unlink( tempFile, onTempFileUnlinked );

                Y.log( `Simple upload complete: ${  uuid}`, 'debug', NAME );
                callback( null, true, fileDestination );
            }

            function onTempFileUnlinked( err ) {
                if ( err ) {
                    Y.log( `Error deleting temp file: ${JSON.stringify( err )}`, 'warn', NAME );
                }
            }

            var
                uuid = Y.doccirrus.media.cleanFileName( meta.qquuid ),
                destinationDir = Y.doccirrus.media.getTempDir(),
                fileDestination = destinationDir + Y.doccirrus.media.cleanFileName( file.name ),
                tempFile = file.path;

            file.name = meta.qqfilename;

            if ( !fileIsValid( file.size ) ) {
                failWithTooBigFile( file.size, callback );
                return;
            }

            moveFile( destinationDir, tempFile, fileDestination, onFileMoved );
        }

        /**
         *  Receive upload of file parts sent in chunks
         *
         *  @param  file                {Object}    As found in REST args.originalfiles
         *  @param  meta                {Object}    Properties of this upload
         *  @param  meta.qquuid         {String}    UID of this file upload
         *  @param  meta.qqfilename     {String}    Original file name from client
         *  @param  meta.qqpartindex    {Number}    Chunk number, integer
         *  @param  callback            {Function}  Of the form fn( err, complete, fileName )
         */

        function uploadChunked( file, meta, callback ) {
            var
                size = parseInt( meta.qqtotalfilesize, 10 ),
                uuid = Y.doccirrus.media.cleanFileName( meta.qquuid ),
                index = parseInt( meta.qqpartindex, 10 ),
                totalParts = parseInt( meta.qqtotalparts, 10 );

            function onChunksCombined( err, fileName ) {
                if ( err ) {
                    Y.log( `Could not combine file chunks: ${JSON.stringify( err )}`, 'warn', NAME );
                    callback( err );
                    return;
                }
                //  file is now completely uploaded
                callback( null, true, fileName );
            }

            function onChunkStored( err, fileName ) {
                if ( err ) {
                    Y.log( `Could not store chunk ${index}: ${JSON.stringify( err )}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                if ( index < totalParts - 1 ) {
                    //  file is still in progress, wait for next chunk
                    callback( null, false, fileName );
                    return;
                }

                //  all chunks uploaded, assemble file and move to temp directory
                combineChunks( file, uuid, onChunksCombined );
            }

            file.name = meta.qqfilename;

            if ( !fileIsValid( size ) ) {
                failWithTooBigFile( size, callback );
                return;
            }

            storeChunk(file, uuid, index, totalParts, onChunkStored );
        }

        /**
         *  Upload was larger than configured limit
         *
         *  @param  fileSize    {Number}    From config via mediastore
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function failWithTooBigFile( fileSize, callback ) {
            var maxFileSize = Y.doccirrus.media.getMaxFileSize();
            callback( Y.doccirrus.errors.rest( 500, `File size ${  fileSize  } exceeds limit: ${  maxFileSize}` ) );
        }

        /**
         *  Sanity check the upload
         *
         *  TODO: more tests to be added here
         *
         *  @param  size    {Number}
         *  @returns        {Boolean}
         */

        function fileIsValid( size ) {
            var maxFileSize = Y.doccirrus.media.getMaxFileSize();
            return maxFileSize === 0 || size < maxFileSize;
        }

        /**
         *  Move a file
         *  TODO: tidy up and move to mediastore
         *
         *  @param  destinationDir      {String}
         *  @param  sourceFile          {String}
         *  @param  destinationFile     {String}
         *  @param  callback            {Function}  Of the form fn( err, newFileName )
         */

        function moveFile( destinationDir, sourceFile, destinationFile, callback ) {
            function onDirectoryCreated( err ) {
                var sourceStream, destStream;

                if (err) {
                    Y.log( `Problem creating directory ${  destinationDir  }: ${  JSON.stringify( err )}`, 'warn', NAME );
                    callback( Y.doccirrus.errors.rest( 500, `Problem creating directory ${  destinationDir  }: ${  JSON.stringify( err )}`, true ) );
                    return;
                }

                sourceStream = fs.createReadStream( sourceFile );
                destStream = fs.createWriteStream( destinationFile );

                function onMoveStreamError( err ) {
                    Y.log( `Problem copying file: ${  JSON.stringify( err )}`, 'warn', NAME );
                    destStream.end();
                    callback( Y.doccirrus.errors.rest( 500, `Could not move file ${  sourceFile  } to ${  destinationFile}`, true ) );
                }

                function onMoveStreamEnd() {
                    destStream.end();
                    destStream.end();
                    callback( null, destinationFile );
                }

                sourceStream
                    .on( "error", onMoveStreamError )
                    .on( "end", onMoveStreamEnd )
                    .pipe( destStream );
            }

            Y.log( `Moving file: ${  sourceFile  } to ${  destinationDir}`, 'debug', NAME );

            mkdirp( destinationDir, onDirectoryCreated );
        }

        /**
         *  Naming conventions for intermediate chunk files
         *
         *  @param  index   {Number}    Ordinal
         *  @param  count   {Number}    Cardinal
         *  @returns        {String}
         */

        function getChunkFilename(index, count) {
            var
                digits = count.toString().length,
                zeros = new Array(digits + 1).join("0");

            return (zeros + index).slice(-digits);
        }

        function storeChunk(file, uuid, index, numChunks, callback ) {
            var
                uploadedFilesPath = Y.doccirrus.media.getTempDir(),
                destinationDir = `${ uploadedFilesPath + uuid }/${ CHUNK_DIR_NAME }/`,
                chunkFilename = getChunkFilename(index, numChunks),
                tempFile = file.path,
                fileDestination = destinationDir + chunkFilename;

            moveFile(destinationDir, tempFile, fileDestination, onMovedFromTemp );

            function onMovedFromTemp( err, fileName ) {
                fs.unlink( file.path, onCleanupChunk );
                callback( err, fileName );
            }

            function onCleanupChunk( err ) {
                if ( err ) {
                    Y.log( `Could not remove chunk from system temp directory: ${JSON.stringify( err )}`, 'warn', NAME );
                    return;
                }
            }
        }

        /**
         *  Join a set of file chunks into a single file on disk, then delete the chunks
         *
         *  @param  file        {Object}    File metadata object
         *  @param  uuid        {String}    Upload ID, identifies chunks directory
         *  @param  callback    {Function}  Of the form fn( err, combinedFile )
         */

        function combineChunks(file, uuid, callback) {
            var
                uploadedFilesPath = Y.doccirrus.media.getTempDir(),
                chunksDir = `${uploadedFilesPath + uuid  }/${  CHUNK_DIR_NAME }/`,
                destinationDir = uploadedFilesPath,
                fileDestination,
                fileSafeName = Y.doccirrus.media.cleanFileName( file.name ),
                destFileStream;

            fileDestination = destinationDir + fileSafeName;

            fs.readdir( chunksDir, onReadDir );

            function onReadDir(err, fileNames) {

                if (err) {
                    Y.log( `Problem listing file chunks: ${JSON.stringify( err )}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                fileNames.sort();
                destFileStream = fs.createWriteStream( fileDestination, {flags: "a"} );

                async.eachSeries( fileNames, processChunk, onAppendToStream );

            }

            function processChunk( chunkFile, itcb ) {
                Y.log( `Combining file chunk: ${chunkFile}`, 'debug', NAME );
                appendToStream( destFileStream, chunksDir, chunkFile, itcb );
            }

            function onAppendToStream( err ) {
                if ( err ) {
                    Y.log( `Problem appending file chunk to stream: ${JSON.stringify( err )}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                destFileStream.end();
                callback( null, fileDestination );
                //  cleanup of chunks dir now done after import to GridFS
            }
        }

        /**
         *  Pipe a file chunk into a stream
         *
         *  @param  destStream      {Object}    NodeJS stream object
         *  @param  srcDir          {String}    Location of chunks
         *  @param  srcFilesnames   {Object}    Array of chunk filenames
         *  @param  index           {Number}
         *  @param  callback        {Function}  Of the form fn( err )
         */

        function appendToStream( destStream, srcDir, chunkFile, callback ) {

            function onReadStreamEnd() {
                //appendToStream( destStream, srcDir, srcFilesnames, (index + 1), success, failure );
                callback( null );
            }

            function onReadStreamError(err) {
                Y.log( `Problem appending chunk: ${JSON.stringify( err )}`, 'warn', NAME );
                destStream.end();
                callback( Y.doccirrus.errors.rest( 500, `Problem appending chunk: ${JSON.stringify( err )}`, true ) );
            }

            fs.createReadStream( srcDir + chunkFile )
                .on( "end", onReadStreamEnd )
                .on( "error", onReadStreamError )
                .pipe( destStream, { end: false } );
        }

        /**
         *  Delete upload directory and all chunks / intermediate files
         *
         *  @param  uuid        {String}    Unique ID of this file upload
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function removeChunkedUploadDir( uuid, callback ) {
            var uploadDir = `${Y.doccirrus.media.getTempDir() + uuid  }/`;

            rimraf( uploadDir, onRimraf );

            function onRimraf( err ) {
                if ( err ) {
                    Y.log( `Problem deleting chunks directory: ${JSON.stringify( err )}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                callback( null );
            }
        }

        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).upload = {
            'simple': uploadSimple,
            'chunked': uploadChunked,
            'removeChunkedUploadDir': removeChunkedUploadDir
        };

    },
    '0.0.1', {requires: [
        'dcmedia-images'
    ]}
);