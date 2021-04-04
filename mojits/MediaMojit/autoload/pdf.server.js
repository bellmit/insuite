/*
 * Copyright (c) 2012 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  This extends the functionality of the images.server.js autoload component to allow creation of PDF documents.
 */

/*global YUI*/

YUI.add( 'dcmedia-pdf', function( Y, NAME ) {

        const

            //  node modules
            fs = require( 'fs' ),
            async = require( 'async' ),
            shellexec = require( 'child_process' ).exec,
            moment = require( 'moment' ),
            util = require( 'util' ),

            dcCoreUtils = require( 'dc-core' ).utils,

            binutilsapi = Y.doccirrus.binutilsapi,

            formatPromiseResult = dcCoreUtils.formatPromiseResult,

            //  compiling PDFs is a very CPU and memory intensive operation, this is to try to cut down on server DoS
            //  by requesting impractically large render sizes

            maxWidthMm = 3500,                      //  change if we need to print something larger than this
            maxHeightMm = 3500;

        /**
         *  Utility to wrap shellexec in a promise
         *
         *  Should probably be added to utils at some point
         *
         *  @param command
         *  @return {Promise}
         */

        function shellexecP( command ) {
            return new Promise( function runShellCommand( resolve, reject ) {
                shellexec( command, onCommandComplete );

                function onCommandComplete( err, stdout, stderr ) {
                    if( err ) {
                        Y.log( `Problem executing shell command: ${err.stack || err}`, 'error', NAME );
                        reject( err );
                        return;
                    }

                    if( stderr ) {
                        Y.log( `Shell returns stderr: ${stderr}`, 'warn', NAME );
                    }

                    resolve( stdout );
                }
            } );
        }

        /**
         *  For unit testing mostly, return true if this object initialized right
         *  @returns    {Boolean}   Which isn't wildly informative.
         */

        function initialized() {
            return Y.doccirrus.media.initialized();
        }

        /**
         *  Stub for function to normalize uploaded PDF documents
         *
         *  @param document
         *  @param callback
         */

        function normalize( document, callback ) {
            //  TODO: strip out any scripting, embeds or remote assets from uploaded PDFs, these format features are a
            //  security risk and not used by documents we generate or serve.

            if( !document.tempFile ) {
                callback( null, document );
                return;
            }

            Y.doccirrus.media.images.identify( document.tempFile, onReadMeta );

            function onReadMeta( err, metadata ) {
                if( err ) {
                    callback( `Could not read document metadata: ${err}` );
                    return;
                }

                document.widthPx = metadata.widthPx;
                document.heightPx = metadata.heightPx;

                callback( null, document );
            }

        }

        /**
         *  Extract a single page from a PDF, convert, resize and save to cache
         *
         *  If this does not work and you are getting convert:not authorized errors, update ImageMagick policy xml:
         *
         *  https://stackoverflow.com/questions/42928765/convertnot-authorized-aaaa-error-constitute-c-readimage-453
         *
         *  TODO: use imagecache - more efficient than exporting from gridfs n times
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  document    {Object}    Media, as described in media-schema.common.js
         *  @param  pageNo      {Number}    Default is 0
         *  @param  widthPx     {Number}    Pixels
         *  @param  heightPx    {Number}    Pixels
         *  @param  callback    {Function}  Of the form fn( err, cacheFile )
         */

        function getPageAsImage( user, document, pageNo, widthPx, heightPx, callback ) {

            const
                VIRTUAL_DPI = 200,          //  ghostscript quality setting for ImageMagick
                JPEG_QUALITY = 96;          //  percent

            let
                tempDocumentFile = '',
                tempImageFile = Y.doccirrus.media.getTempFileName( {mime: 'IMAGE_JPEG'} ),
                tempImage;

            async.series(
                [
                    savePdfToDisk,
                    extractSinglePage,
                    loadSinglePage,
                    resizeSinglePage,
                    moveToCache
                ],
                onAllDone
            );

            //  1. Write the document to disk so convert can pull out a page
            function savePdfToDisk( itcb ) {
                Y.doccirrus.media.gridfs.mediaToTemp( user, document, onDocumentStored );

                function onDocumentStored( err, tempFileName ) {
                    if( err ) {
                        return itcb( err );
                    }

                    tempDocumentFile = tempFileName;
                    document._tempFiles = document._tempFiles ? document._tempFiles : [];
                    document._tempFiles.push( tempFileName );
                    itcb( null );
                }
            }

            //  2. Extract a page as .jpg using ImageMagick convert
            async function extractSinglePage( itcb ) {
                function onPageExtracted( err, stdout, stderr ) {
                    if( err ) {
                        Y.log( `Could not extract page from document: ${err}STDERR: ${stderr}`, 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( `Convert STDOUT: ${stdout}`, 'debug', NAME );
                    itcb( null );
                }

                //var extractCmd = 'convert ' + tempDocumentFile + '[' + pageNo + '] "' + tempImageFile + '"';

                //  note -flatten / -alpha remove gets rid of black boxes in JPG when PDF has transparent sections:
                //  https://stackoverflow.com/questions/10934456/imagemagick-pdf-to-jpgs-sometimes-results-in-black-background

                let [err, extractCmd] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            `-density`,
                            VIRTUAL_DPI,
                            `-background white`,
                            `-flatten`,
                            `${tempDocumentFile}[${pageNo}]`,
                            `-quality`,
                            JPEG_QUALITY,
                            `"${tempImageFile}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                shellexec( extractCmd, onPageExtracted );
            }

            //  3. Load the extracted page as an image
            function loadSinglePage( itcb ) {
                function onImageLoaded( err, newPageImg ) {
                    if( err ) {
                        Y.log( `Could not load page image: ${err}`, 'warn', NAME );
                        return itcb( err );
                    }

                    tempImage = newPageImg;
                    itcb( null );
                }

                let transform = `page${pageNo}s${widthPx}x${heightPx}`;
                Y.doccirrus.media.images.imageFromFile( tempImageFile, document._id, transform, onImageLoaded );
            }

            //  4. Resize page image to requested dimensions
            function resizeSinglePage( itcb ) {
                function onImageResized( err, resizedTempImage ) {
                    if( err ) {
                        return itcb( err );
                    }
                    tempImage = resizedTempImage;
                    itcb( null );
                }

                //  do not resize if no target dimensions given
                if( (-1 === widthPx) || (0 === widthPx) ) {
                    return itcb( null, tempImage );
                }

                Y.doccirrus.media.images.resize( tempImage, widthPx, heightPx, onImageResized );
            }

            //  5. Store in dcmedia cache
            function moveToCache( itcb ) {
                Y.log( `Moving temp image to cache: ${tempImage}`, 'debug', NAME );
                tempImage._id = document._id;
                if( -1 === widthPx && -1 === heightPx ) {
                    //  extracted page at PDF resolution
                    tempImage.transform = `pdfpage${pageNo}`;
                } else {
                    //  requested a document thumbnail at a specific size
                    tempImage.transform = `${widthPx}x${heightPx}`;
                }
                Y.doccirrus.media.cacheStore( tempImage, itcb );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Problem while generating PDF thumbnail: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                Y.doccirrus.media.cleanTempFiles( tempImage );
                callback( null, tempImage._cacheFile );
            }

        }

        /**
         *  Given an array of pages / temp file names, compile into a PDF document (with ImageMagick)
         *
         *  A note about PostScript conversion: 1 PostScript point = 0.352777778 millimeters
         *
         *  TODO: tidy, async
         *
         *  @param  imageset        {object}    Array of file names
         *  @param  orientation     {string}    ('portrait'|'landscape')
         *  @param  widthmm         {number}    paper width in mm
         *  @param  heightmm        {number}    paper height in mm
         *  @param  resolutiondpmm  {number}    dots per mm on printed page
         *  @param  callback        {function}  Of the form fn(err, tempFileName)
         */

        function compilePDF( imageset, orientation, widthmm, heightmm, resolutiondpmm, callback ) {

            Y.log( 'called pdf.server.js::compilepdf', 'debug', NAME );
            Y.log( `orientation: w: ${widthmm} h: ${heightmm} res: ${resolutiondpmm}`, 'info', NAME );

            if( (!Array.isArray( imageset )) || (0 === imageset.length) ) {
                callback( Y.doccirrus.errors.rest( 404, 'No images/pages to create .pdf from', true ) );
                return;
            }

            if( isNaN( widthmm ) || isNaN( heightmm ) || (widthmm < 1) || (heightmm < 1) ) {
                callback( Y.doccirrus.errors.rest( 401, 'SECURITY: Paper dimensions must be numbers', true ) );
                return;
            }

            if( (widthmm > maxWidthMm) || (heightmm > maxHeightMm) ) {
                callback( Y.doccirrus.errors.rest( 401, 'Requested render was too large', true ) );
                return;
            }

            var
                //resolution = 11.811,

                newPDF = {
                    'mime': 'APPLICATION_PDF',
                    'mimeType': 'application/pdf',
                    'transform': 'original'
                },

                pdfFile = Y.doccirrus.media.getTempFileName( newPDF ),           //% temp file on disk
                tempDir = Y.doccirrus.media.getTempDir(),                      //% current instance's /tmp/

                pointSize = 0.352777778,                                //% millimeters
                widthPt = parseInt( widthmm / pointSize, 10 ),            //% postscript points
                heightPt = parseInt( heightmm / pointSize, 10 ),          //% http://en.wikipedia.org/wiki/Point_(typography)

                expandFileName,

                sanitized = [],                                         //% array of sanitized image file names
                toRotate = [],                                          //% array of images to be rotated
                i;                                                      //% loop counter

            //  swap width and height if rotating landscape page

            if( 'landscape' === orientation ) {
                i = widthPt;
                widthPt = heightPt;         //jshint ignore:line
                heightPt = i;
            }

            //  sanitize the list of images

            for( i = 0; i < imageset.length; i++ ) {

                if( false === Y.doccirrus.filters.isLegalFileName( tempDir + imageset[i] ) ) {
                    callback( 'Given file rejected by security layer' );
                    return;
                }

                expandFileName = imageset[i];
                if( -1 === expandFileName.indexOf( tempDir ) ) {
                    expandFileName = tempDir + imageset[i];
                }

                Y.log( `Adding to render: ${imageset[i]}`, 'info', NAME );
                sanitized.push( `"${expandFileName}"` );

                if( 'landscape' === orientation ) {
                    toRotate.push( `"${expandFileName}"` );
                }
            }

            rotateAll90();

            /**
             *  Sequentially rotate any landscape pages
             */


            async function rotateAll90() {

                //  If we have no more images to rotate (or none to start with) then compile the PDF
                if( 0 === toRotate.length ) {
                    compileAndCompress();
                    return;
                }

                const nextImg = toRotate.pop();

                let [err, rotateCmd] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            nextImg,
                            '-rotate',
                            `90`,
                            nextImg
                        ]
                    } )
                );

                if( err ) {
                    throw err;
                }

                shellexec( rotateCmd, onRotateComplete );
            }

            /**
             *  Callback after rotating a single page
             *
             *  @param error
             *  @param stdout
             *  @param stderr
             */

            function onRotateComplete( error, stdout, stderr ) {
                if( error ) {
                    Y.log( `Could not rotate page, STDERR: ${stderr}`, 'warn', NAME );
                    callback( `Could not preprocess PDF page: ${error}` );
                    return;
                }

                Y.log( `Rotated landscape page, STDOUT: ${stdout}`, 'info', NAME );

                //  rotate the next one, or continue to compilation
                rotateAll90();
            }

            /**
             *  Join all images into PDF
             */

            async function compileAndCompress() {

                //  TODO: increase density if necessary
                //  -density --> dpmm converted to pixels per centimeter
                //  -unit PixelsPerCentimeter

                let [err, shellCmd] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            ...sanitized,
                            '-page',
                            `${widthPt}x${heightPt}`,
                            '-density',
                            '72',
                            '-compress',
                            'jpeg',
                            `"${pdfFile}"`
                        ]
                    } )
                );

                if( err ) {
                    throw err;
                }

                Y.log( `running: ${shellCmd}`, 'warn', NAME );
                shellexec( shellCmd, onConvertComplete );
            }

            /**
             *  Callback from ImageMagick convert
             *
             *  @param  error   {String}    Error message or null
             *  @param  stdout  {String}    STDOUT of convert command
             *  @param  stderr  {String}    STDERR of convert command
             */

            function onConvertComplete( error, stdout, stderr ) {

                if( error !== null ) {
                    callback( error );
                    return;
                }

                Y.log( `STDOUT: ${stdout}`, 'debug', NAME );
                Y.log( `STDERR: ${stderr}`, 'debug', NAME );

                Y.log( `Converted ${imageset.length} images to PDF: ${pdfFile}`, 'info', NAME );
                callback( null, pdfFile );

            }
        }

        /**
         *  Concatenate a set of PDF documents in the database into a single PDF on disk
         *
         *      1. Export all PDF files from GridFS to temp directory
         *      --> 1.5 Export a single PDF file from GridFS
         *      2. Make a text file listing all PDFs for join operation (MOJ-6665)
         *      3. Concatenate all the temp files together with GhostScript
         *      4. Copy new PDF from GhostScript to download cache with friendly name
         *      5. Clean up all intermediate files from this operation
         *      --> 5.5 Remove a single temp file
         *      Finally let the client know outcome by websocket
         *
         *  NOTE: this is slow, may be able to replace this with sejda-console
         *
         *  @param  {Object} config
         *  @param  {Object} config.user REST user or equivalent
         *  @param  {Array} [config.mediaIds] Array of database _ids of PDF media objects. Should be set if "fileNames" is not set.
         *  @param  {Array} [config.fileNames] Array of file names. Should be set if "mediaIds" is not set.
         *  @param  {String} [config.newFileName] name of the file.
         *  @param  {Boolean} [config.notUpdate] not need to display modal
         *  @param  {Boolean} [config.doNotClean] not clean temp files
         *  @param  {Function} callback Of the form fn(err, tempFileName)
         */

        async function concatenatePDFs( config, callback ) {
            var
                {user, mediaIds, fileNames, newFileName, notUpdate, doNotClean = false} = config,
                hasFileNames = fileNames && fileNames.length,
                hasMediaIds = mediaIds && mediaIds.length,
                //  list of PDF files to pass to GhostScript
                listDir = Y.doccirrus.media.getTempDir(),
                listFile = Y.doccirrus.media.getTempFileName( {mime: 'TEXT_PLAIN', transform: 'original'} ),
                //  list of files to clean up after this operation
                toDelete = [],
                //  output file to be stored in cache
                outFile = Y.doccirrus.media.getTempFileName( {'mime': 'APPLICATION_PDF', 'transform': 'concat'} ),
                eventData,
                cacheFile;

            let [err, cmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'gs',
                    shellArgs: [
                        '-dBATCH',
                        '-dNOPAUSE',
                        '-q',
                        '-sDEVICE=pdfwrite',
                        '-dPDFSETTINGS=/prepress',
                        `-sOutputFile="${outFile}"`,
                        `@${listFile}`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            if( !hasFileNames && !hasMediaIds ) {
                //  nothing to do
                return callback( Y.doccirrus.errors.rest( 500, 'No mediaIds or filenames to concatenate into single PDF' ) );
            }

            if( newFileName ) {
                cacheFile = newFileName;
            } else {
                let
                    numFiles = mediaIds && parseInt( mediaIds.length, 10 ) || fileNames && fileNames.length;     // from client, untrusted
                //  using friendly name for MOJ-2240, only used for invoices at present
                cacheFile = `${moment().format( 'YYYYMMDD' )}_${moment().format( 'HHmmss' )}_` + `Rechnungen_x${numFiles}.pdf`;
            }

            async.series(
                [
                    writePdfsToDisk,
                    makeListFile,
                    runGhostScript,
                    moveOutputToCache,
                    cleanupTempFiles
                ],
                onAllDone
            );

            //  1. Export all PDF files from GridFS to temp directory
            function writePdfsToDisk( itcb ) {
                if( hasFileNames ) {
                    toDelete.push( ...fileNames );
                    return setImmediate( itcb );
                }
                //  let client know that we're starting the process
                eventData = {'status': 'startBatch', 'num': mediaIds.length};
                sendUserEvent( {msg: {data: eventData}} );

                //  save each PDF to temp directory
                async.eachSeries( mediaIds, writeSinglePdfToDisk, itcb );
            }

            //  1.5 Export a single PDF file from GridFS
            function writeSinglePdfToDisk( mediaId, itcb ) {
                // look up the media metadata object
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'media',
                    action: 'get',
                    query: {'_id': mediaId},
                    callback: onDbLoadMedia
                } );

                //  store it in temp directory
                function onDbLoadMedia( err, data ) {
                    if( err ) {
                        Y.log( `Could not load media object form database: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    if( 0 === data.length ) {
                        Y.log( `Missing media object: ${mediaId}`, 'warn', NAME );
                        return itcb( Y.doccirrus.errors.rest( 404, `PDF document not found: ${mediaId}` ) );
                    }

                    var pdfObj = data[0];

                    if( 'APPLICATION_PDF' !== pdfObj.mime ) {
                        Y.log( `Media is not a PDF document, ignoring: ${mediaId}`, 'warn', NAME );
                        return itcb( null );
                    }

                    pdfObj._diskFile = Y.doccirrus.media.getTempFileName( pdfObj );
                    Y.doccirrus.media.gridfs.exportFile( user, pdfObj._id, pdfObj._diskFile, false, onFileSaved );
                }

                //  remember the random filename assigned to the temp file, to clean it up later
                function onFileSaved( err, fileName ) {
                    if( err ) {
                        Y.log( `Could not save PDF file to disk: ${mediaId}`, 'debug', NAME );
                        return itcb( err );
                    }

                    eventData = {'status': 'savedFile', 'mediaId': mediaId};

                    sendUserEvent( {msg: {data: eventData}} );

                    toDelete.push( fileName );
                    itcb( null );
                }
            }

            //  2. Make a text file listing all PDFs for join operation (MOJ-6665)
            function makeListFile( itcb ) {
                var listTxt = toDelete.join( '\n' );

                if( 0 === toDelete.length ) {
                    Y.log( 'No PDF documents to concatenate, cannot create PDF from nothing.', 'warn', NAME );
                    return itcb( Y.doccirrus.errors.rest( 404, 'Cannot concatenate PDFs, nothing to do.', true ) );
                }

                Y.doccirrus.media.writeFile( listFile, listDir, listTxt, onListFileWritten );

                function onListFileWritten( err ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.log( `Created list file for GhostScript, ${toDelete.length} entries:\n${listTxt}`, 'debug', NAME );
                    itcb( null );
                }
            }

            //  3. Concatenate all the temp files together with GhostScript
            function runGhostScript( itcb ) {
                Y.log( `running command: ${cmd}`, 'debug', NAME );

                if( !config.compileOnly ) {
                    // update client on progress
                    eventData = {'status': 'mergingFiles', 'num': toDelete.length};
                    sendUserEvent( {msg: {data: eventData}} );
                }

                var cmdOptions = {
                    'timeout': 0,
                    'maxBuffer': 32 * 1024 * 1025     //  there may be a lot of output from GS, MOJ-6665
                };

                shellexec( cmd, cmdOptions, onGsComplete );

                //  check for errors and log gs messages

                function onGsComplete( err, stdout, stderr ) {
                    if( err ) {
                        return itcb( err );
                    }

                    //  note that we do not threat the existence of text in stderr as an error due to OS X sometimes placing
                    //  stdout in this stream, and because gs produces warnings for libharu PDFs which do not affect the
                    //  concatenated PDF

                    Y.log( `STDOUT: ${stdout}`, 'debug', NAME );
                    Y.log( `STDERR: ${stderr}`, 'debug', NAME );

                    if( !config.compileOnly ) {
                        //  update client on progress
                        eventData = {'status': 'mergeComplete', 'num': toDelete.length};
                        sendUserEvent( {msg: {data: eventData}} );
                    }

                    itcb( null );
                }
            }

            //  4. Copy new PDF from GhostScript to download cache with friendly name
            function moveOutputToCache( itcb ) {
                var
                    cacheFilePath = Y.doccirrus.media.getCacheDir() + cacheFile;

                if( config.compileOnly && -1 !== cacheFile.indexOf( '/' ) ) {
                    //  rename as requested
                    cacheFilePath = cacheFile;
                }

                //cacheFile = Y.doccirrus.media.getCacheFileName( cacheMedia, true );

                Y.log( `Moving concatenated PDF to the media cache: ${cacheFilePath}`, 'debug', NAME );
                fs.rename( outFile, cacheFilePath, onCopiedToCache );

                function onCopiedToCache( err ) {
                    if( err ) {
                        Y.log( `Could not copy compiled PDF to cache directory: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    Y.log( `Compiled PDF copied to cache as: ${cacheFile}`, 'debug', NAME );
                    itcb( null );
                }
            }

            //  5. Clean up all intermediate files from this operation
            function cleanupTempFiles( itcb ) {
                if( !doNotClean ) {
                    toDelete.push( listFile );          //  also get rid of the file list
                    toDelete.push( outFile );           //  also get rid of the copied output

                    async.eachSeries( toDelete, deleteSingleFile, itcb );
                } else {
                    Y.log( 'do not clean files', 'debug', NAME );
                    return itcb( null );
                }
            }

            //  5.5 Remove a single temp file
            function deleteSingleFile( fileName, itcb ) {
                Y.log( `Deleting temp file: ${fileName}`, 'debug', NAME );
                Y.doccirrus.media.tempRemove( fileName, onTempRemove );

                function onTempRemove( err ) {
                    if( err ) {
                        Y.log( `Could not remove temp file, already cleaned up: ${fileName}`, 'debug', NAME );
                        //  non-fatal error, continue
                    }
                    itcb( null );
                }
            }

            //  Finally let the client know outcome by websocket
            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Could not concatenate PDFs: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                //  all done
                eventData = {
                    'status': 'endBatch',
                    'cacheUrl': `/pdf/${cacheFile}`,
                    'cacheFile': cacheFile
                };

                if( notUpdate ) {
                    eventData.notUpdate = notUpdate;
                }

                if( !config.compileOnly ) {
                    //  if caller uses websocket
                    sendUserEvent( {msg: {data: eventData}} );
                }

                //  if caller waits on the server
                callback( null, cacheFile );
            }

            function sendUserEvent( evt ) {
                evt.targetId = config.user.identityId;
                evt.nsp = 'default';
                evt.event = 'mediaConcatenatePDFs';
                Y.doccirrus.communication.emitEventForUser( evt );
            }

        } // end concatenatePDFs

        /**
         *  Alternative implementation of concatenatePDFs using sejda-console instead of GhostScript
         *
         *  gs is throwing some mysterious errors and is quite resource heavy, so testing sejda
         *
         *  TODO: security review and additonal checks - needs to be hardened against injection
         *
         *  @param config
         *  @param callback
         */

        async function concatenatePDFsSejda( config, callback ) {
            let [err, sejdaCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'sejda-console',
                    shellArgs: [
                        'merge',
                        `-f`,
                        ...config.fileNames,
                        `-o`,
                        config.newFileName
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( `Joining PDF files with sejda-console: ${sejdaCmd}`, 'info', NAME );
            [err] = await formatPromiseResult( shellexecP( sejdaCmd ) );
            callback( err, config.newFileName );
        }

        /**
         *  Store an image from scanner in the temp directory to be compiled into a page of a PDF
         *
         *  @param  dataUri
         *  @param  callback
         */

        function storeTempJpeg( dataUri, callback ) {
            var
                stubMedia = {'mime': 'IMAGE_JPEG', 'transform': 'tempscan'},
                tempDir = Y.doccirrus.media.getTempDir(),
                tempFile = Y.doccirrus.media.getTempFileName( stubMedia ),
                tempBuffer = Y.doccirrus.media.dataUriToBuffer( dataUri );

            function onFileStored( err ) {
                if( err ) {
                    Y.log( `Could not write temp file: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                callback( null, tempFile );
            }

            Y.doccirrus.media.writeFile( tempFile, tempDir, tempBuffer, onFileStored );
        }

        /**
         * 1. save file to tmp folder
         * 2. import via importMediaFromFile
         * 3. remove tmp file
         * @method importDocumentFromBase64
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} [args.data.fileName]
         * @param {String} args.data.base64
         * @param {String} args.data.ownerCollection
         * @param {String} args.data.ownerId
         * @param {String} args.data.label
         * @param {String} args.data.docType
         * @param {Function} args.callback
         * @see Y.doccirrus.media.importMediaFromFile
         *
         * @returns {module:mediaSchema.media} mediaObj
         */
        function importDocumentFromBase64( args ) {
            let
                user = args.user,
                callback = args.callback,
                data = args.data,

                fileName = data.fileName || 'tmpFile',
                base64 = data.base64,
                ownerCollection = data.ownerCollection,
                ownerId = data.ownerId,
                label = data.label,
                docType = data.docType,

                tempDir = Y.doccirrus.auth.getTmpDir(),
                tmpName = require( 'path' ).join( tempDir, (new require( 'mongoose' ).Types.ObjectId()).toString() + fileName ),
                shouldRemoveTmp;

            if( !base64 || !ownerCollection || !ownerId ) {
                Y.log( `importDocumentFromBase64. Invalid data. base64: ${Boolean( base64 )}, ownerCollection: ${Boolean( ownerCollection )}, ownerId: ${Boolean( ownerId )}`, 'debug', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid data'} ) );
            }
            async.waterfall( [
                function( next ) {
                    let fs = require( 'fs' );
                    fs.writeFile( tmpName, base64, 'base64', function( err ) {
                        shouldRemoveTmp = !Boolean( err );
                        next( err );
                    } );
                },
                function( next ) {
                    Y.doccirrus.media.importMediaFromFile( user, tmpName, ownerCollection, ownerId, fileName, label, docType, function( err, mediaObj ) {
                        next( err, mediaObj );
                    } );
                }
            ], function( err, mediaObj ) {
                if( shouldRemoveTmp ) {
                    fs.unlink( tmpName, function( err ) {
                        if( err ) {
                            Y.log( `importDocumentFromBase64. Could not unlink file ${tmpName}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            return;
                        }
                        Y.log( `importDocumentFromBase64. File: ${tmpName} has been successfully deleted.`, 'debug', NAME );
                    } );
                }
                if( err ) {
                    return callback( err );
                }
                callback( null, mediaObj );
            } );
        }

        /**
         *  Given a PDF file on disk, rotate all pages to portrait orientation (used when faxing)
         *
         *  This requires sejda-console, see:
         *
         *      http://sejda.org/
         *      https://github.com/torakiki/sejda/
         *
         *  example command:  sejda-console rotate -f input_file.pdf -r 90 -m all -o output_file.pdf
         *
         *  @param  sourceFile  {String}    Location of PDF file on disk
         *  @param  callback    {Function}  Of the form fn( err, fileName )
         */

        async function rotatePdfToPortrait( sourceFile, callback ) {

            var
                tempFile = Y.doccirrus.media.getTempFileName( {mime: 'APPLICATION_PDF', transform: 'forceportrait'} ),
                tempDir = Y.doccirrus.media.getTempDir(),
                pdfMeta,
                correctRotation = '';

            let [err, rotateCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'sejda-console',
                    shellArgs: [
                        'rotate', //  rotation operation
                        '--files',
                        sourceFile, //  input file
                        '--rotation',
                        '%%CORRECTROTATION%%', //  rotation angle, degrees
                        '--predefinedPages', //  all pages
                        'all',
                        '--output',
                        tempDir, //  output directory
                        '--existingOutput',
                        'overwrite'
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            async.series( [checkFileExists, dumpPdfMeta, checkFileOrientation, rotatePdf], onAllDone );

            //  make sure that file actually exists (CMD injection, etc)
            function checkFileExists( itcb ) {
                fs.stat( sourceFile, itcb );
            }

            function dumpPdfMeta( itcb ) {
                getRotation( sourceFile, Y.doccirrus.media.getTempDir(), onMetaRead );

                function onMetaRead( err, meta ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.log( `Read PDF page size and rotation: ${JSON.stringify( meta )}`, 'debug', NAME );
                    pdfMeta = meta;
                    itcb( null );
                }
            }

            function checkFileOrientation( itcb ) {

                //  NOTE: this covers the cases we encounter with PDFS we generate ourselves, may need to be extended
                //  in future to be more general

                //  rotated portrait
                if( 90 === pdfMeta.rotation && pdfMeta.height > pdfMeta.width ) {
                    correctRotation = '90';
                }

                //  unrotated landscape
                if( 0 === pdfMeta.rotation && pdfMeta.width > pdfMeta.height ) {
                    correctRotation = '90';
                }

                itcb( null );
            }

            function rotatePdf( itcb ) {
                //  only rotate landscape documents
                if( '' === correctRotation ) {
                    tempFile = sourceFile;
                    return itcb( null );
                }

                var
                    //  set Java temp dir to match mediamojit temp dir for this invocation
                    shellEnvVars = {
                        'env': {
                            'JAVA_OPTS': `-Djava.io.tmpdir=${Y.doccirrus.media.getTempDir()}`
                        }
                    };

                rotateCmd = rotateCmd.replace( '%%CORRECTROTATION%%', correctRotation );

                Y.log( `Rotate pdf: ${rotateCmd}`, 'debug', NAME );
                shellexec( rotateCmd, shellEnvVars, onCallPdftk );

                function onCallPdftk( err, stdout, stderr ) {

                    if( err ) {
                        Y.log( `Error invoking sejda-console: ${JSON.stringify( err )}`, 'warn', NAME );
                        Y.log( `sejda-console stderr: ${stderr}`, 'debug', NAME );
                        return itcb( err );
                    }

                    Y.log( `rotate pdf STDOUT: ${stdout}`, 'debug', NAME );
                    Y.log( `rotate pdf STDERR: ${stderr}`, 'debug', NAME );

                    tempFile = sourceFile;
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Problem while rotating PDF to landscape mode: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                callback( null, tempFile );
            }
        }

        /**
         *  Given a PDF file, find the mediabox and rotation values of the first page
         *
         *  @param  fileName    {String}    Location of file on disk
         *  @param  inDir       {String}    File must be in this directory
         *  @param  callback    {Function}  Of the form fn( err, meta ) where meta has width, height, rotation
         */

        function getRotation( fileName, inDir, callback ) {

            Y.doccirrus.media.readFile( fileName, inDir, onFileRead );

            function onFileRead( err, pdfBuffer ) {
                if( err ) {
                    Y.log( `Error reading PDF file: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                var
                    pdfStr = pdfBuffer.toString(),

                    meta = {
                        'width': -1,
                        'height': -1,
                        'rotation': 0
                    },

                    START_PAGE = '/Type /Page',
                    END_PAGE = '>>',
                    ROTATION = '/Rotate',
                    MEDIABOX = '/MediaBox',

                    lines = pdfStr.split( '\n' ),
                    line,
                    inPage = false,
                    parts,
                    i;

                for( i = 0; i < lines.length; i++ ) {

                    line = lines[i].trim();

                    if( !inPage && begins( line, START_PAGE ) ) {
                        inPage = true;
                    }

                    if( inPage && begins( line, END_PAGE ) ) {
                        inPage = false;
                    }

                    //  eg, /Rotate 90
                    if( inPage && begins( line, ROTATION ) ) {
                        Y.log( `Found PDF page rotation: ${line}`, 'debug', NAME );
                        meta.rotation = parseFloat( line.replace( ROTATION, '' ).trim() );
                    }

                    //  eg, /MediaBox [0.0 0.0 595.27563 841.8898]
                    if( inPage && begins( line, MEDIABOX ) ) {
                        Y.log( `Found PDF page mediabox: ${line}`, 'debug', NAME );

                        parts = line
                            .replace( MEDIABOX, '' )
                            .replace( '[', '' )
                            .replace( ']', '' )
                            .trim()
                            .split( ' ' );

                        meta.width = parseFloat( parts[2] );
                        meta.height = parseFloat( parts[3] );
                    }

                }

                callback( null, meta );
            }

            function begins( line, match ) {
                return (line.substr( 0, match.length ) === match);
            }
        }

        /**
         *  Return output of identity run against a PDF (page sizes, resolutions, etc)
         *
         *  Overall process:
         *
         *      (1) Check if PDF is in cache
         *      (2) Load the PDF to cache if not already there
         *      (3) Run identify against the PDF
         *      (4) Parse results to JSON
         *
         *  @param  {Object}    user
         *  @param  {String}    mediaId
         */

        async function getPdfPageLayout( user, mediaId ) {
            const
                cacheHasP = util.promisify( Y.doccirrus.media.cacheHas ),
                exportFileP = util.promisify( Y.doccirrus.media.gridfs.exportFile ),
                fileExistsP = util.promisify( fs.exists ),
                readFileP = util.promisify( fs.readFile ),
                writeFileP = util.promisify( fs.writeFile ),

                mediaStub = {
                    _id: mediaId,
                    transform: 'original',
                    mime: 'APPLICATION_PDF'
                },

                cacheDir = Y.doccirrus.media.getCacheDir(),
                cacheFileName = Y.doccirrus.media.getCacheFileName( mediaStub, false ),
                cacheFullPath = `${cacheDir}${cacheFileName}`,
                cacheLayoutPath = `${cacheDir}${cacheFileName}.layout`;

            let [err, identifyCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'identify',
                        cacheFullPath
                    ]
                } )
            );

            if( err ) {
                throw err;
            }

            let
                pageLayout = [],
                lines, line, words, tempPage;

            let
                isInCache, isLayoutCached, stdout;

            //  (X) Check if PDF page layout data is already in the media cache, load and return it if so

            //  Don't regenerate if we can avoid it, identify can be heavy on PDFs
            //  TODO: in future this information could be kept on the media object

            [err, isLayoutCached] = await formatPromiseResult( fileExistsP( cacheLayoutPath ) );
            if( err ) {
                Y.log( `Could not check media cache for layout: ${err.stack || err}`, 'warn', NAME );
                //  not necessarily a problem, try continue execution
            }

            if( isLayoutCached ) {
                Y.log( 'Gettinbg page layout information from media cache.', 'debug', NAME );
                [err, lines] = await formatPromiseResult( readFileP( cacheLayoutPath ) );

                if( err ) {
                    Y.log( `Could not load cached PDF layout: ${err.stack || err}`, 'warn', NAME );
                    //  not necessarily a problem, try continue execution
                } else {
                    try {
                        pageLayout = JSON.parse( lines );
                        return pageLayout;
                    } catch( parseErr ) {
                        Y.log( `Could not parse cached PDF layout: ${err.stack || err}`, 'warn', NAME );
                        //  not necessarily a problem, try continue execution
                    }
                }
            }

            //  (1) Check if PDF is in cache
            [err, isInCache] = await formatPromiseResult( cacheHasP( mediaStub ) );

            if( err ) {
                Y.log( `Could not check media cache: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            //  (2) Add to cache if not already there
            if( !isInCache ) {
                [err] = await formatPromiseResult( exportFileP( user, mediaId, cacheFullPath, false ) );
            }

            if( err ) {
                Y.log( `Could not add PDF to media cache: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            //  (3) Get page layout information from ImageMagick identify
            Y.log( `Running external program: ${identifyCmd}`, 'info', NAME );
            [err, stdout] = await formatPromiseResult( shellexecP( identifyCmd ) );

            if( err ) {
                Y.log( `Could not read PDF properties: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            //  (4) Split out page properties
            lines = stdout.split( '\n' );
            for( line of lines ) {
                if( '' !== line.trim() ) {
                    words = line.split( ' ' );

                    tempPage = {
                        'idx': pageLayout.length,
                        'identifier': words[0].replace( cacheDir, '' ),
                        'documentType': words[1],
                        'wxh': words[2],
                        'wxhOffset': words[3],
                        'colorDepth': words[4],
                        'colorSpace': words[5]
                    };

                    words = tempPage.wxh.split( 'x' );
                    tempPage.width = parseInt( words[0], 10 );
                    tempPage.height = parseInt( words[0], 10 );
                    pageLayout.push( tempPage );
                }
            }

            //  (X) Store it in the cache for next time
            [err] = await formatPromiseResult( writeFileP( cacheLayoutPath, JSON.stringify( pageLayout, undefined, 2 ) ) );
            if( err ) {
                Y.log( `Could not store PDF page layout in the media cache: ${err.stack || err}`, 'warn', NAME );
                //  not necessarily a problem, try continue execution
            }

            return pageLayout;
        }

        /**
         *  Utility method to take a batch of media _ids and call back with filenames on disk
         *
         *  callback to work with existing hpdf.server.js code, intial version for demo
         *
         *  Assumes smallish batches of media, not thousands
         *
         *  @param  user
         *  @param  pdfMediaIds
         *  @param  callback
         */

        async function exportBatchToCache( user, pdfMediaIds, callback ) {
            const
                gridFsExportP = util.promisify( Y.doccirrus.media.gridfs.exportFile ),
                cacheHasP = util.promisify( Y.doccirrus.media.cacheHas ),
                cacheDir = Y.doccirrus.media.getCacheDir(),
                fileNames = [];

            let
                err, result,
                mediaId, mediaObj,
                cacheFile, isInCache;

            //  (1) Load the media objects

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'media',
                    query: {_id: {$in: pdfMediaIds}}
                } )
            );

            if( err ) {
                Y.log( `Problem loading media from database: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            //  (2) For each of them check cache and export from GridFs

            for( mediaObj of result ) {

                isInCache = false;
                mediaId = mediaObj._id.toString();
                cacheFile = Y.doccirrus.media.getCacheFileName( mediaObj );

                //  (2.1) Check to see if it is already in the cache

                [err, isInCache] = await formatPromiseResult( cacheHasP( mediaObj ) );

                if( err ) {
                    Y.log( `Problem rechecking if media ${mediaObj._id} is in cache: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }

                if( !isInCache ) {

                    //  2.2 Export from GridFS

                    [err] = await formatPromiseResult( gridFsExportP( user, mediaId, cacheDir + cacheFile, false ) );
                    if( err ) {
                        Y.log( `Could not export PDF file to media cache: ${err.stack || err}`, 'warn', NAME );
                        //  not good, but continue with next file anyway, best effort
                    } else {

                        //  2.3 Check that the export was successful

                        [err, isInCache] = await formatPromiseResult( cacheHasP( mediaObj ) );

                        if( err ) {
                            Y.log( `Problem rechecking if media ${mediaObj._id} is in cache: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        }

                    }

                }

                if( isInCache ) {
                    fileNames.push( cacheDir + cacheFile );
                }
            }

            callback( null, fileNames );
        }

        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).pdf = {
            initialized,
            compilePDF,
            storeTempJpeg,
            concatenatePDFs,
            concatenatePDFsSejda,
            normalize,
            importDocumentFromBase64,
            getPageAsImage,
            rotatePdfToPortrait,
            getPdfPageLayout,
            exportBatchToCache
        };

    },
    '0.0.1', {
        requires: [
            'dcmedia-images',
            'binutils-api'
        ]
    }
);