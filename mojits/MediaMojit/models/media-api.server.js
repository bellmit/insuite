/**
 *  Added to move REST actions from controller.server.js to new REST API
 *
 *  This is first used by the PUC for retrieving PRC media by proxy
 *
 *  User: strix
 *  Date: 10/08/14  13:27
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0 */
/*global YUI */



YUI.add(
    'media-api',
    function( Y, NAME ) {
        const
            {formatPromiseResult} = require('dc-core').utils,
            util = require( 'util' );

        var
            fs = require( 'fs' ),
            path = require( 'path' ),
            async = require( 'async' ),
            moment = require( 'moment' ),

            i18n = Y.doccirrus.i18n,
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        /**
         *  REST action to add a media item to the database, will return new media ID
         *
         *  This should be called by POST, expected / supported properties arguments
         *
         *  Files to be added to the database should be in dataURI format (base 64)
         *
         *  Expected parameters are:
         *
         *      ownerCollection     {String}    Collection of object this media object belongs to
         *      ownerId             {String}    Database _id of object this media item belongs to
         *      source              {String}    File in DataURI format
         *      name                {String}    Title of media object
         *      fileName            {String}    Original file name
         *      label               {String}    Assigns media object to some role or group
         *
         *  @param  args    {Object}    As passed by RestController_new
         */

        function uploadmedia64( args ) {

            var
                params = args.originalParams,
                tempMedia = {                               //  temporary image is saved to disk for analysis
                    '_id': 'img' + new Date().getTime(),
                    '_tempFiles': []
                };

            Y.log( 'uploadmedia64 params: ' + JSON.stringify( params, undefined, 2 ).substring( 0, 512 ), 'debug', NAME );

            async.series(
                [
                    checkParams,
                    saveToTemp,
                    normalizeAndImport,
                    cleanupTempFiles
                ],
                onAllDone
            );

            //  1. Sanity checks on request
            function checkParams( itcb ) {
                if( !params.hasOwnProperty( 'source' ) ) {
                    itcb( Y.doccirrus.errors.rest( 400, 'Image not sent.', true ) );
                    return;
                }

                tempMedia.source = params.source;

                if( !params.hasOwnProperty( 'fileName' ) ) {
                    itcb( Y.doccirrus.errors.rest( 'fileName not sent.', 'warn', NAME ) );
                    return;
                }

                tempMedia.fileName = params.fileName;
                tempMedia.name = params.fileName;

                if(
                    (false === params.hasOwnProperty( 'ownerCollection' )) ||
                    (false === params.hasOwnProperty( 'ownerId' ))
                ) {
                    itcb( Y.doccirrus.errors.rest( 400, 'Please specify the collection and id of the object this belongs to.', true ) );
                    return;
                }

                tempMedia.ownerCollection = params.ownerCollection;
                tempMedia.ownerId = params.ownerId;

                if( !params.hasOwnProperty( 'label' ) ) {
                    params.label = '';
                }

                tempMedia.label = params.label;

                if( !params.hasOwnProperty( 'docType' ) ) {
                    params.docType = 'OTHER';
                }

                tempMedia.docType = params.docType;

                tempMedia.mimeType = Y.doccirrus.media.types.getMimeFromDataURI( params.source );
                tempMedia.mime = Y.doccirrus.media.types.getMime( tempMedia.mimeType );

                itcb( null );
            }

            //  2. Store the upload image in temp dir for validation with ImageMagick
            function saveToTemp( itcb ) {
                function onSavedToDisk( err /* , fileName */ ) {
                    if( err ) {
                        Y.log( 'Could not write new image to disk: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }
                    itcb( null );
                }

                var
                    tempDir = Y.doccirrus.media.getTempDir(),
                    imgBuffer = Y.doccirrus.media.dataUriToBuffer( tempMedia.source );

                tempMedia._diskFile = Y.doccirrus.media.getTempFileName( tempMedia );
                tempMedia.source = '';
                Y.doccirrus.media.writeFile( tempMedia._diskFile, tempDir, imgBuffer, onSavedToDisk );
            }

            //  3. Import file
            function normalizeAndImport( itcb ) {
                function onMediaImported( err, newMediaObj ) {
                    if( err ) {
                        Y.log( 'Could not import media into database: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    tempMedia = newMediaObj;
                    itcb( null );
                }

                Y.doccirrus.media.importMediaFromFile(
                    args.user,
                    tempMedia._diskFile,
                    tempMedia.ownerCollection,
                    tempMedia.ownerId,
                    tempMedia.name,
                    tempMedia.label,
                    tempMedia.docType,
                    onMediaImported
                );
            }

            //  3. Clean up
            function cleanupTempFiles( itcb ) {
                Y.doccirrus.media.cleanTempFiles( tempMedia );
                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Problem loading / storing media: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                delete tempMedia._diskFile;
                delete tempMedia._tempFiles;
                args.callback( null, tempMedia );
            }

        }

        /**
         *  Handle upload of media as multipart form attachment
         *
         *  DEPRECATED: used by MIS mojit to handle old browsers without File support
         *
         *  @param  args    {Object}    REST args from post
         */

        function uploadMedia( args ) {

            var
                newId = 'img' + new Date().getTime(), //  temporary identifier
                params = args.originalParams,
                files = args.originalfiles,
                lastFile = {},
                k;

            //  Check passed file uploads

            if( 'object' !== (typeof files) ) {
                args.callback( Y.doccirrus.errors.rest( 500, 'Please upload a single file.', true ) );
                return;
            }

            if( !params.hasOwnProperty( 'label' ) ) {
                params.label = '';
            }

            //  Can only process a single upload at a time, select last file in set

            for( k in files ) {
                if( files.hasOwnProperty( k ) ) {
                    if( files[k].hasOwnProperty( 'path' ) ) {
                        lastFile = files[k];
                    }
                }
            }

            //  Check that this belongs to something

            if(
                (false === params.hasOwnProperty( 'ownerCollection' )) ||
                (false === params.hasOwnProperty( 'ownerId' ))
            ) {
                args.callback( Y.doccirrus.errors.rest( 500, 'Please specify the collection and id of the object this belongs to.', true ) );
                return;
            }

            //  Check that at least one file was passed

            if( false === lastFile.hasOwnProperty( 'path' ) ) {
                args.callback( Y.doccirrus.errors.rest( 500, 'Invalid file upload.', true ) );
                return;
            }

            //  Validate, normalize and stat the uploaded image

            Y.doccirrus.media.images.imageFromUpload( lastFile, newId, onNormalized );

            function onNormalized( err, img ) {

                if( err ) {
                    args.callback( err );
                    return;
                }

                Y.log( 'Uploaded image has been normalized, adding to database.', 'info', NAME );

                delete img.id;      //  a new one will be assigned by model.post(...) ?
                delete img._id;     //  a new one will be assigned by model.post(...) ?

                img.ownerCollection = params.ownerCollection;
                img.ownerId = params.ownerId;
                img.label = params.label;

                //TODO: send to gridfsSave instead
                //Y.doccirrus.media.logMedia('Storing image:', img, 'debug', NAME);
                Y.doccirrus.media.mediaToDB( args.user, img, onMediaSaved );
            }

            function onMediaSaved( err, response ) {
                if( err ) {
                    args.callback( err );
                    return;
                }

                args.callback( null, { 'data': response, 'status': 'ok' } );
            }

        }

        /**
         *  Endpoint for chunked files sent by FineUploader
         *
         *  see: http://fineuploader.com/
         *
         *  Adapted from NodeJS sample code on the FineUploader GitHub repo:
         *
         *  https://github.com/FineUploader/fine-uploader/commit/1212b839a283627eaaabc6cdd69081e1a0d031b9
         *
         *  This method:
         *      (*) handles CORS environments
         *      (*) Ensures the file size does not exceed the max
         *      (*) Handles chunked upload requests
         *
         *  Requirements:
         *      (*) express (for handling requests)
         *      (*) rimraf (for "rm -rf" support)
         *      (*) mkdirp (for "mkdir -p" support)             TODO: use or adapt mediastore method
         *
         *  Process overview:
         *
         *      1. Store file chunk on disk, assemble complete file if this is the last chunk
         *      2. When upload is complete, create media object and save to MongoDB/GridFS
         *      3. When upload is complete, tidy up temp directories, chunks, intermediate files, etc
         *      Finally, call back to client with status and mew media _id if complete
         *
         *  @param  args                            {Object}    REST args from /1/ API
         *  @param  args.originalParams             {Object}    POST args in this case
         *  @param  args.originalParams.qquuid      {String}    UID of this upload (file?)
         *  @param  args.originalParams.qqfilename  {String}    Original file name on disk
         *  @param  args.originalParams.qqpartindex {Number}    Optional, if more than one chunk
         *  @param  args.originalfiles              {Object}    From multipart forms upload
         *  @param  args.originalfiles.qqfile       {Object}    Single file metadata
         *
         *  Should finally call back with { status: (true|false) } as expected by client-side lib
         */

        function uploadMediaChunked( args ) {
            var
                params = args.originalParams,
                partIndex = ( params.hasOwnProperty( 'qqpartindex' ) ? params.qqpartindex : null ),
                files = args.originalfiles || {},
                combinedFile = '',
                uploadComplete = false,
                mediaObj;

            async.series( [handleChunk, saveToDb, cleanupTempFiles], onAllDone );

            //  1. Store file chunk on disk, assemble complete file if this is the last chunk
            function handleChunk( itcb ) {
                if( null === partIndex ) {
                    Y.log( 'Performing simple file upload...', 'debug', NAME );
                    Y.doccirrus.media.upload.simple( files.qqfile, params, onUploadPartComplete );
                } else {
                    Y.log( 'Performing chunked file upload...', 'debug', NAME );
                    Y.doccirrus.media.upload.chunked( files.qqfile, params, onUploadPartComplete );
                }

                function onUploadPartComplete( err, complete, fileName ) {
                    if( err ) {
                        Y.log( 'Could not upload new image to disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    combinedFile = fileName || '';
                    uploadComplete = complete;
                    itcb( null );
                }
            }

            //  2. When upload is complete, create media object and save to MongoDB/GridFS
            function saveToDb( itcb ) {
                //  if still waiting on file parts then we can skip this step
                if( !uploadComplete ) {
                    return itcb( null );
                }

                Y.log( 'Validating file and adding to db: ' + combinedFile, 'debug', NAME );

                var
                    ownerId = params.ownerId || '',
                    ownerCollection = params.ownerCollection || '',
                    docType = params.docType || 'OTHER',
                    label = params.label || 'user',
                    originalName = params.qqfilename ? params.qqfilename : 'Untitled.xxx'; // should always have a name

                Y.doccirrus.media.importMediaFromFile(
                    args.user,
                    combinedFile,
                    ownerCollection,
                    ownerId,
                    originalName,
                    label,
                    docType,
                    onMediaImported
                );

                function onMediaImported( err, newMediaObj ) {
                    if( err ) {
                        //  File may have failed normalization or security checks, or may be unsupported type
                        Y.log( 'Did not add file to GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    mediaObj = newMediaObj;
                    itcb( null );
                }
            }

            //  3. When upload is complete, tidy up temp directories, chunks, intermediate files, etc
            function cleanupTempFiles( itcb ) {
                //  if still waiting on file parts then we can skip this step
                if( !uploadComplete ) {
                    return itcb( null );
                }

                //  remove chunks directory
                if( !params.qquuid || '' === Y.doccirrus.media.cleanFileName( params.qquuid ) ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Missing qquuid of chunked upload', true ) );
                }

                Y.doccirrus.media.upload.removeChunkedUploadDir( params.qquuid, onRemoveChunks );

                function onRemoveChunks() {
                    Y.log( 'Media imported, cleaning up temp files and chunks dir.', 'debug', NAME );
                    Y.doccirrus.media.cleanTempFiles( mediaObj );
                    itcb( null );
                }
            }

            //  Finally, call back to client with status and mew media _id if complete
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Problem handling chunked upload: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if( !uploadComplete ) {
                    //  We are still waiting for additional file parts, call back to let the client know to send them
                    return args.callback( null, { 'success': true } );
                }

                //  all parts uploaded and media added to GridFS
                mediaObj.ext = Y.doccirrus.media.getExt( mediaObj.mimeType );
                args.callback( null, { 'success': true, 'mediaId': mediaObj._id, 'mediaObj': mediaObj } );
            }
        }

        /**
         *  Create a PDF from a representation of state of client-side form template
         *
         *  @param  args                            {Object}    As sent by RestController_new.js
         *  @param  args.user                       {Object}
         *  @param  args.originalParams
         *  @param  args.originalParams.document    {Object}    dc form serialized for PDF rendering
         *  @param  args.callback                   {Function}  Of the form fn( err, newMediaId )
         */

        function makepdf( args ) {
            var
                params = args.originalParams,
                onPdfProgress = args.onPdfProgress ? args.onPdfProgress : onPdfProgressDefault;

            function onPdfProgressDefault( evt ) {
                //  MOJ-6996 Send ws event to single user who requested pdf
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

            function onPDFCreated( err, newId ) {
                if( err ) {
                    Y.log( 'Could not compile PDF from form representation: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                var
                    tempDir = Y.doccirrus.media.getTempDir(),
                    cacheDir = Y.doccirrus.media.getCacheDir();

                if( newId && ( 'object' === typeof newId ) && newId.hasOwnProperty( 'tempId' ) ) {
                    newId.tempId = newId.tempId.replace( tempDir, '' );
                    newId.tempId = newId.tempId.replace( cacheDir, '' );
                }

                Y.log( 'PDF created and stored, returning id: ' + newId, 'info', NAME );

                args.callback( null, newId );
            }

            //  check passed arguments
            if( !params.hasOwnProperty( 'document' ) ) {
                Y.log( 'Cannot render document, none sent', 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 400, 'Document not sent', true ) );
            }

            //  create the document
            Y.doccirrus.media.hpdf.compileFromForm( args.user, params.document, onPdfProgress, onPDFCreated );
        }

        /**
         *  Get a page of a document as a jpeg image with the given size
         *
         *  TODO: move to dcmedia-transform
         *
         *  @param  args    {Object}
         */

        function pdfPageAsJpeg( args ) {
            var
                params = args.originalParams,

                defaultWidth = 200,
                defaultHeight = -1,

                mediaId = params._id || params.id || '',
                width = params.width || params.w || defaultWidth,       // px
                height = params.height || params.h || defaultHeight,    // px

                abstractPageImg = {
                    '_id': mediaId,
                    'transform': width + 'x' + height,
                    'mime': 'IMAGE_JPEG'
                },

                cacheFileName = Y.doccirrus.media.getCacheFileName( abstractPageImg, false );

            if( !mediaId || '' === mediaId ) {
                //args.callback( Y.doccirrus.errors.rest( 404, 'Media _id not given' ) );
                Y.doccirrus.utils.redirectRest1( args, '/img/image-not-found-in-db.jpg' );
                return;
            }

            Y.doccirrus.utils.redirectRest1( args, '/media/' + cacheFileName );
        }

        /**
         *  Download the original uploaded file in binary format
         *
         *  Expected params: _id
         *
         *  NB: this functionality is superseded by the dcmedia middleware, route is kept to redirect old data
         *
         *  @param args
         */

        function download( args ) {
            //args.callback( Y.doccirrus.errors.rest( 404, 'Removed, please use /media/ middleware', true ) );

            var
                params = args.originalParams,
                cacheUrl,
                mediaObj;

            if( !params._id ) {
                args.callback( Y.doccirrus.errors.rest( 404, 'No media _id given', true ) );
                return;
            }

            if( params.w || params.h ) {
                //  request is for a scaled version of an image, not a plain download
                Y.log( 'Scale and download routes are now separate, please use /1/media/:scale', 'info', NAME );
                scale( args );
                return;
            }

            Y.log( 'Preparing media for download: ' + params._id, 'debug', NAME );

            async.series( [loadMediaFromDatabase], onAllDone );

            function loadMediaFromDatabase( itcb ) {
                function onDbLoadMedia( err, data ) {
                    if( err ) {
                        return itcb( err );
                    }

                    if( !data._id && 0 === data.length ) {
                        itcb( Y.doccirrus.errors.rest( 404, 'Media not found' ), true );
                        return;
                    }

                    mediaObj = data[0] ? data[0] : data;
                    cacheUrl = '/media/' + Y.doccirrus.media.getCacheFileName( mediaObj, false );
                    itcb( null );
                }

                //Y.doccirrus.mongodb.runDb( dbSetup, onDbLoadMedia );
                Y.doccirrus.media.mediaFromDB( args.user, params._id, onDbLoadMedia );
            }

            function onAllDone( err ) {

                if( err ) {
                    Y.log( 'Could not prepare media download: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                Y.doccirrus.utils.redirectRest1( args, cacheUrl );
            }
        }

        /**
         *  Prepare and return an image transform (binary file) in the requested size and format
         *
         *  NB: this functionality is now handled by dcmedia middleware, route left in place to redirect old data
         *
         *  @param args
         */

        function scale( args ) {
            //args.callback( Y.doccirrus.errors.rest( 404, 'Removed, please user /media/ middleware', true ) );

            var
                params = args.originalParams,
                cacheFileName;

            Y.log( 'called scale, params: ' + JSON.stringify( args.originalParams ), 'debug', NAME );

            if( false === params.hasOwnProperty( '_id' ) ) {
                Y.log( 'Client requested media download, but document id not given.', 'warn', NAME );
                args.callback( Y.doccirrus.errors.rest( 400, 'Client requested media download, but document id not given.', true ) );
                return;
            }

            if( params.hasOwnProperty( 't' ) ) {
                params.transform = params.t;
            }
            if( params.hasOwnProperty( 'm' ) ) {
                params.mime = params.m;
            }
            if( params.hasOwnProperty( 'w' ) ) {
                params.widthPx = params.w;
            }
            if( params.hasOwnProperty( 'h' ) ) {
                params.heightPx = params.h;
            }

            if( false === params.hasOwnProperty( 'widthPx' ) ) {
                params.widthPx = -1;
            }

            if( false === params.hasOwnProperty( 'heightPx' ) ) {
                params.heightPx = -1;
            }

            if( false === params.hasOwnProperty( 'mime' ) ) {
                params.mime = 'IMAGE_JPEG';
            }

            if( ('true' === params._fixAspect) || (-1 === params.heightPx) || ('-1' === params.heightPx) ) {
                params._fixAspect = true;
            }

            if( -1 === params.heightPx && -1 === params.widthPx ) {
                params.transform = 'original';
            } else {
                params.transform = params.widthPx + 'x' + ( params._fixAspect ? 'fixed' : params.heightPx );
            }

            cacheFileName = Y.doccirrus.media.getCacheFileName( params, false );
            //  experimental hard redirect with express
            Y.doccirrus.utils.redirectRest1( args, '/media/' + cacheFileName );
        }

        /**
         *  Delete a media item from the collection and clear it from the cache
         *
         *  Expected arguments:
         *
         *      id  - database _id of a media object
         *
         *  @param args
         */

        function deleteMedia( args ) {
            var
                params = args.originalParams;

            //  legacy API used id, not _id
            if( params.hasOwnProperty( 'id' ) ) {
                params._id = params.id;
            }

            if( !params.hasOwnProperty( '_id' ) ) {
                args.callback( new Error( 'image id not specified' ) );
                return;
            }

            Y.log( 'Deleting attached media: ' + params.id, 'info', NAME );

            //  delete any cached transforms from media store
            Y.doccirrus.media.cacheRemove( { '_id': params.id }, onCacheClear );

            /**
             *  get db model and execute deleteFn
             *
             *  @param  err                 {String}    Error message or null
             *  @param  deletedTransforms   {Array}     Set of deleted transform files
             */

            function onCacheClear( err, deletedTransforms ) {

                if( err ) {
                    Y.log( 'Could not clear cached transforms: ' + err, 'warn', NAME );
                } else {
                    Y.log( 'Deleted transforms: ' + JSON.stringify( deletedTransforms, undefined, 2 ), 'info', NAME );
                }

                var
                    dbSetup = {
                        user: args.user,
                        model: 'media',
                        action: 'delete',
                        query: {
                            '_id': ( params.id + '')
                        }
                    };

                //TODO: also delete from gidfs here
                Y.doccirrus.mongodb.runDb( dbSetup, args.callback );
            }
        }

        /*
         * Delete media by ownerId and ownerCollection
         *
         * @param args argument object
         *        ex. args.originalParams  = {ownerId: <database Id>, ownerCollection: <collection name>}
         *            args.user = <user>
         *            args.callback = <function> callback to reply to
         * */
        function deleteMediaByOwnerCollectionAndId( args ) {
            const params = args.originalParams;
            const ownerId = params.ownerId;
            const ownerCollection = params.ownerCollection;

            if( ownerId === null || ownerCollection === null ) {
                return args.callback( new Error( 'ownerId and ownerCollection are required' ) );
            }

            Y.log( `Deleting media by ownerId: ${ownerId} and ownerCollection: ${ownerCollection}`, 'info', NAME );

            listMedia( {
                user: args.user,
                originalParams: {
                    collection: ownerCollection,
                    id: ownerId
                },
                callback: onListMedia
            } );

            function onListMedia( err, mediaList ) {
                if( err ) {
                    return args.callback( err );
                } else if( mediaList && mediaList[0] ) {
                    deleteMedia( {
                        originalParams: {
                            id: mediaList[0]._id
                        },
                        user: args.user,
                        callback: args.callback
                    } );
                }
            }
        }

        /**
         *  Export a file from GridFS to disk and pass it to the CUPS driver
         *
         *  @param  args                                {Object}
         *  @param  args.user                           {Object}
         *  @param  args.originalParams                 {Object}
         *  @para,  args.originalParams.printerName     {String}    Should be in the list of available CUPS printers
         *  @param  args.originalParams.mediaId         {String}    database _id of a media object
         *  @param  args.originalParams.numCopies       {Number}    number of copies to print
         *  @param  args.callback                       {Function}  Of the form fn( err, msg )
         */

        function printMedia( args ) {
            var
                params = args.originalParams,
                printerName = params.printerName || '',
                mediaId = params.mediaId || '',
                numCopies = params.numCopies || 1,
                mediaObj,
                stdout;

            if( '' === printerName || '' === mediaId ) {
                Y.log( 'Missing arguments, printerName: ' + printerName + ' mediaId: ' + mediaId, 'warn', NAME );
                args.callback( Y.doccirrus.errors.rest( 404, 'Please send mediaId and printerName', true ) );
                return;
            }

            Y.log( 'Preparing to print media: ' + mediaId + ' on printer: ' + printerName );

            Y.dcforms.runInSeries( [loadMetaObj, saveTempFile, printTempFile, cleanUp], onAllDone );

            //  1. Get the requested item from the media collection
            function loadMetaObj( itcb ) {
                function onMediaLoaded( err, data ) {
                    if( !err && !data ) {
                        err = Y.doccirrus.errors.rest( 404, 'Could not find requested media item: ' + mediaId, true );
                    }
                    if( err ) {
                        return itcb( Y.doccirrus.errors.rest( 404, 'Could not load media ' + mediaId, true ) );
                    }

                    mediaObj = data;
                    Y.log( 'Loaded media item: ' + mediaObj._id, 'debug', NAME );
                    itcb( null );
                }

                Y.doccirrus.media.mediaFromDB( args.user, mediaId, onMediaLoaded );
            }

            //  2. Export the referenced file from GridFS to temp directory
            function saveTempFile( itcb ) {
                function onTempFileExported( err ) {
                    if( err ) {
                        Y.log( 'Could not save media to disk for printing: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'Media saved to temp directory: ' + mediaObj._diskFile, 'debug', NAME );
                    itcb( null );
                }

                mediaObj._diskFile = Y.doccirrus.media.getTempFileName( mediaObj );
                Y.doccirrus.media.gridfs.exportFile( args.user, mediaObj._id, mediaObj._diskFile, false, onTempFileExported );
            }

            //  3. Pass the file into the requested CUPS printer
            function printTempFile( itcb ) {
                function onCUPSPrint( err, cupsStdout ) {
                    if( err ) {
                        Y.log( 'Could not save media to disk for printing: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    stdout = cupsStdout;
                    Y.log( 'CUPS returns: ' + stdout, 'debug', NAME );
                    itcb( null );
                }

                for( let i = 0; i < numCopies; i++) {
                    Y.doccirrus.printer.printFile( {
                        printerName: printerName,
                        filePath: mediaObj._diskFile
                    }, onCUPSPrint );
                }
            }

            //  4. Delete the temp file
            function cleanUp( itcb ) {
                function onCleanup( err ) {
                    if( err ) {
                        //  can happen when an instance is restarting, should not be a problem, next daily cleanup
                        //  or restart will try again
                        Y.log( 'Could not remove temp file ' + mediaObj._diskFile + ': ' + JSON.stringify( err ), 'warn', NAME );
                    }

                    itcb( null );
                }

                Y.doccirrus.media.tempRemove( mediaObj._diskFile, onCleanup );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Could not spool/print file: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, { 'msg': i18n( 'PrinterMojit.messages.DOCUMENT_PRINTED' ) + ' <!--' + stdout + '-->' } );
            }

        }

        /**
         *  Look for a named file in the media cache (used by backup polling for PDF render, MOJ-10143)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.cacheFileName   Name of a file in the cache
         *  @param  {Function}  args.callback
         */

        function checkCache( args ) {
            let
                params = args.originalParams || {},
                cacheFileName = params.cacheFileName || '',
                cacheDir = Y.doccirrus.media.getCacheDir();

            //  sanity
            if ( !cacheFileName || '' === cacheFileName ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'Invalid filename, cannot locate.' ) );
            }

            fs.stat( cacheDir + '/' + cacheFileName, onStatCacheFile );

            function onStatCacheFile( err /*, result */ ) {
                var inCache = false;

                if ( err ) {
                    Y.log( ' ... Could not find item in cache.', 'debug', NAME );
                } else {
                    inCache = true;
                }

                args.callback( null, { 'found': inCache, 'fileName': cacheFileName, 'url': '/pdf/' + cacheFileName } );
            }
        }

        /**
         *  Pass a file in the cache folder to the CUPS driver
         *
         *  @param  args                                {Object}
         *  @param  args.originalParams                 {Object}
         *  @param  args.originalParams.printerName     {String}    should be in the list of available CUPS printers
         *  @param  args.originalParams.tempFile        {String}    a file in the temp folder
         *  @param  args.originalParams.deleteOnPrint   {String}    true if the temp file should be deleted
         *  @param  args.originalParams.printCopies     {Number}    number of copies should be printed
         *  @param  args.callback                       {Function}
         */

        function printCache( args ) {
            var
                cacheDir = Y.doccirrus.media.getCacheDir(),
                params = args.originalParams,
                printerName = params.printerName || '',
                untrustedTempFile = params.tempFile || '',
                deleteOnPrint = params.deleteOnPrint || false,
                printCopies = parseInt( params.printCopies, 10 ) || 0,
                baseName,
                diskFile;

            if( '' === printerName || '' === untrustedTempFile ) {
                Y.log( 'Missing arguments, printerName: ' + printerName + ' tempFile: ' + untrustedTempFile, 'warn', NAME );
                args.callback( new Error( 'Please send tempFile and printerName' ) );
                return;
            }

            baseName = path.basename( untrustedTempFile );
            diskFile = cacheDir + baseName;

            Y.log( 'Checking temp file: ' + untrustedTempFile + ' on printer: ' + printerName );
            Y.log( 'Checking temp file: ' + diskFile + ' on printer: ' + printerName );

            fs.exists( diskFile, onTempFileChecked );

            function onTempFileChecked( exists ) {
                if( !exists ) {
                    Y.log( 'Media not present on disk.', 'warn', NAME );
                    args.callback( new Error( 'Media not present on disk' ) );
                    return;
                }

                Y.log( 'File confirmed in temp directory: ' + diskFile, 'debug', NAME );
                for( let i = 0; i < printCopies; i++) {
                    Y.doccirrus.printer.printFile( { printerName: printerName, filePath: diskFile }, onCUPSPrint );
                }
            }

            function onCUPSPrint( errPrint, stdout ) {

                Y.log( 'CUPS returns: ' + stdout, 'debug', NAME );

                if( true === deleteOnPrint || 'true' === deleteOnPrint ) {
                    Y.doccirrus.media.tempRemove( diskFile, onCleanup );
                } else {
                    onCleanup( null );
                }

                function onCleanup( errCleanup ) {

                    if( errCleanup ) {
                        //  can happen when an instance is restarting, should not be a problem, next daily cleanup
                        //  or restart will try again
                        Y.log( 'Could not remove temp file ' + diskFile + ': ' + JSON.stringify( errCleanup ), 'warn', NAME );
                    }

                    if( errPrint ) {
                        Y.log( 'Could not spool/print file: ' + JSON.stringify( errPrint ), 'warn', NAME );
                    }

                    args.callback( errPrint, { 'msg': 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--' + stdout + '-->' } );

                }
            }

        }

        /**
         *  Save a file from the cache as a new media object
         *
         *  Used when converting temporary PDFs into attachments of activities, MOJ-9363
         *
         *  @param  args                                {Object}
         *  @param  args.user                           {Object}    REST user or equivalent
         *  @param  args.originalParams                 {Object}
         *  @param  args.originalParams.cacheFile       {String}    Name of a file in the cache
         *  @param  args.originalParams.ownerCollection {String}    Name of collection which this belongs to
         *  @param  args.originalParams.ownerId         {String}    _id of object this file belongs to
         *  @param  args.originalParams.label           {String}    Optional, default to 'user',
         *  @param  args.originalParams.docType         {String}    Role of document in medical practice, default 'OTHER'
         *  @param  args.callback                       {Function}  Of the form fn( err, newMediaObj )
         */

        function saveFromCache( args ) {
            var
                params = args.originalParams,
                cacheFile = params.cacheFile || '',
                cacheDir = Y.doccirrus.media.getCacheDir();

            if ( !cacheFile || '' === cacheFile ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Cache file not specified.' ) );
            }

            Y.doccirrus.media.importMediaFromFile(
                args.user,
                cacheDir + cacheFile,
                params.ownerCollection || '',
                params.ownerId || '',
                cacheFile,
                params.label || 'user',
                params.docType || 'OTHER',
                args.callback
            );
        }

        /**
         *  Load a PDF from the database and save it to disk
         *
         *  Expected params:
         *
         *      zipid       {String}    An open zip archive
         *      activityid  {String}    An activity which may have an attached PDF
         *      mediaId     {String}    Optional - only add this single media item (optional)
         *      prefername  {String}    Desired filename in ZIP archive
         *
         *  @param args {Object} REST request
         */

        function copyPdfToZip( args ) {
            var
                params = args.originalParams,
                currentDoc,
                currentMedia,
                currentTempFile;

            if( !params.activityid || !params.zipid ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'Missing property, please supply activityid and zipid.' ), true );
                return;
            }

            loadDocument();

            function loadDocument() {
                var
                    dbSetup = {
                        user: args.user,
                        model: 'document',
                        action: 'get',
                        callback: onDbLoadDocument,
                        query: {
                            type: 'FORMPDF',
                            activityId: (params.activityid || 'noid')
                        },
                        options: {}
                    };

                if ( params.mediaid ) {
                    dbSetup.query = {
                        mediaId: params.mediaid,
                        activityId: (params.activityid || 'noid')
                    };
                }

                Y.doccirrus.mongodb.runDb( dbSetup );
            }

            function onDbLoadDocument( err, result ) {
                //  We will need to extract the media ID from the linked URL, this is a little awkward
                if( err ) {
                    Y.log( 'Could not load FORMPDF document: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                if( 0 === result.length ) {
                    Y.log( 'Could not find FORMPDF/mediaId document for activity: ' + params.activityid, 'warn', NAME );
                    args.callback( Y.doccirrus.errors.rest( 404, 'Could not find FORMPDF document for ' + params.activityid, true ) );
                    return;
                }

                var
                    document = result[0],
                    mediaId = params.mediaId || document.mediaId || getMediaIdFromDocument( document ),
                    dbSetup = {
                        user: args.user,
                        model: 'media',
                        action: 'get',
                        callback: onDbLoadMedia,
                        query: {
                            '_id': (mediaId || 'noid')
                        },
                        options: {}
                    };

                currentDoc = document;

                if( '' === mediaId ) {
                    Y.log( 'Could not find PDF media _id in document: ' + ( document.url || '' ), 'warn', NAME );
                    args.callback( Y.doccirrus.errors.rest( 404, 'Could not find PDF media _id in document: ' + (document.url || ''), true ) );
                    return;
                }

                Y.doccirrus.mongodb.runDb( dbSetup );
            }

            function onDbLoadMedia( err, result ) {
                if( err ) {
                    Y.log( 'Could not load media object: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                if( 0 === result.length ) {
                    Y.log( 'Could not find mediaobject for document: ' + currentDoc._id, 'warn', NAME );
                    args.callback( Y.doccirrus.errors.rest( 404, 'Could not find FORMPDF document for ' + params.activityid, true ) );
                    return;
                }

                currentMedia = result[0];

                Y.doccirrus.media.gridfs.mediaToTemp( args.user, currentMedia, onTempStore );
            }

            function onTempStore( err, fileName ) {
                if( err ) {
                    Y.log( 'Could not write PDF to tempDirectory: ' + JSON.stringify( err ), 'wanr', NAME );
                    args.callback( err );
                    return;
                }

                var tempDir = Y.doccirrus.media.getTempDir();
                currentTempFile = fileName;

                Y.doccirrus.media.zip.addFile(
                    params.zipid,               //  an open zip archive, should have been created first
                    currentTempFile,            //  local PDF file to add to disk
                    tempDir,                    //  temp folder, used to check for directory traversal
                    params.prefername,          //  name of file in zip, if possible
                    true,                       //  delete the temp file once added to zip
                    onAddedToZip                //  callback
                );
            }

            function onAddedToZip( err ) {
                if( err ) {
                    Y.log( 'Could not copy temp file to Zip: ' + JSON.stringify( err ), 'wanr', NAME );
                    args.callback( err );
                    return;
                }

                var
                    confirmation = {
                        'tempFile': currentTempFile,
                        'mediaId': currentMedia._id,
                        'documentId': currentDoc._id
                    };

                args.callback( null, confirmation );
            }

            //  this should probably be moved to a helper method on the document API

            function getMediaIdFromDocument( doc ) {
                var
                    url = doc.url || '',
                    parts = url.split( '&' ),
                    halves,
                    i;

                for( i = 0; i < parts.length; i++ ) {
                    halves = parts[i].split( '=' );
                    if( 2 === halves.length && 'id' === halves[0] ) {
                        return halves[1];
                    }
                }

                return '';
            }

        }

        /**
         *  Concatenate set of PDF documents in the database into a single PDF file in temp directory
         *
         *  This expects a POSTed parameter called 'mediaIds' to contain an array of _ids of PDFs in the database
         *
         *  @param  args    {object}    REST request
         */

        function concatenatePdfs( args ) {
            var
                params = args.originalParams;

            function onMergeComplete( err, tempFileName ) {

                if ( params.waitCallback ) {
                    return args.callback( err, { fileName: tempFileName } );
                }

                var eventData = { 'status': 'mergeComplete', 'tempFile': tempFileName };

                if( err ) {
                    Y.log( 'Could not merge set of PDFs: ' + JSON.stringify( err ), 'debug', NAME );
                    eventData = { 'status': 'mergeFailed', 'err': err };
                }

                if( params.notifyPrint ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        nsp: 'default',
                        event: 'mediaConcatenatePDFsPrint',
                        msg: { data: eventData }
                    } );
                } else {
                    //Y.doccirrus.communication.emitNamespaceEvent({
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        nsp: 'default',
                        event: 'mediaConcatenatePDFs',
                        msg: { data: eventData }
                    } );
                }
            }

            //  callback immediately and track progress with Socket IO events
            Y.doccirrus.media.pdf.concatenatePDFs( { user: args.user, mediaIds: params.mediaIds, notUpdate: params.notifyPrint }, onMergeComplete );

            if ( !params.waitCallback ) {
                return args.callback( null, { 'status': 'starting' } );
            }
        }

        /**
         *  Temporary / development
         *  @param args
         */

        function loadTestSvg( args ) {

            function onLoadSvgTxt( err, strXml ) {
                if( err ) {
                    Y.log( 'Error loading test SVG', 'warn', NAME );
                    args.callback( err );
                    return;
                }

                Y.log( 'Converting SVG XML to Object', 'warn', NAME );
                var objPlain = Y.doccirrus.svg.svgToObj( strXml );

                Y.log( 'Parsed XML document to type: ' + (typeof objPlain), 'debug', NAME );
                Y.log( 'Parsed XML document to: ' + JSON.stringify( objPlain ), 'debug', NAME );

                args.callback( null, objPlain );
            }

            Y.doccirrus.svg.loadTestSvg( onLoadSvgTxt );
        }

        /**
         *  Change ownership of a set of media objects
         *
         *  This is used to reassign media which may have been linked to a temporary _id.  Expect these parameters:
         *
         *      fromCollection      {String}    Name of collection previous owner belongs to
         *      fromId              {String}    Mongo _id of object which may own media
         *      toCollection        {String}    Name of collection new owner belongs to
         *      toId                {String}    Mongo _id of object which may own media after this operation
         *
         *  @param  args    {Object}    REST args
         */

        function chown( args ) {
            var
                params = args.originalParams,

                fromCollection = params.fromCollection || '',
                fromId = params.fromId || '',
                toCollection = params.toCollection || '',
                toId = params.toId || '',

                toChown = [],
                dbGetSetup = {
                    'user': args.user,
                    'model': 'media',
                    'action': 'get',
                    'query': {
                        'ownerCollection': fromCollection,
                        'ownerId': fromId
                    },
                    'options': {}
                };

            if( '' === fromCollection || '' === toCollection || '' === fromId || '' === toId ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'Missing required argument', true ) );
                return;
            }

            Y.log( 'Changing ownership of media ' + fromCollection + '::' + fromId + '-->' + toCollection + '::' + toId, 'debug', NAME );

            Y.doccirrus.mongodb.runDb( dbGetSetup, onMediaLoaded );

            function onMediaLoaded( err, result ) {
                if( err ) {
                    Y.log( 'Could not load media owned by ' + fromCollection + '::' + fromId + ':' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                var i;
                for( i = 0; i < result.length; i++ ) {
                    Y.log( 'Changing ownership of document ' + result[i]._id + ' to ' + toId, 'debug', NAME );
                    toChown.push( result[i] );
                }

                chownNext();
            }

            function chownNext() {
                if( 0 === toChown.length ) {
                    //  all done
                    args.callback( null );
                    return;
                }

                //  note, reassigning media resets deletion, to simplify casefile and activity transitions

                var
                    nextMediaObj = toChown.pop(),
                    putData = {
                        'ownerCollection': toCollection,
                        'ownerId': toId,
                        'deleteAfter': '',
                        'fields_': ['ownerCollection', 'ownerId', 'deleteAfter']
                    },
                    dbPutSetup = {
                        'user': args.user,
                        'model': 'media',
                        'action': 'put',
                        'query': { '_id': (nextMediaObj._id + '') },
                        'field': putData.fields_,
                        'options': { ignoreReadOnly: true }
                    };

                dbPutSetup.data = Y.doccirrus.filters.cleanDbObject( putData );

                Y.log( 'Chown media ' + nextMediaObj._id + ': ' + toCollection + ' --> ' + toId, 'debug', NAME );
                Y.doccirrus.mongodb.runDb( dbPutSetup, onOwnerChanged );

            }

            function onOwnerChanged( err ) {
                if( err ) {
                    Y.log( 'Could not chown media: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                chownNext();
            }
        }

        /**
         *  Set or clear a date after which media will be deleted - to prevent unnecessary files from
         *  accumulating in the database
         *
         *  Expected params
         *
         *      id          - database _id of a media object
         *      deleteAfter - date or empty string
         *
         *  @param args
         */

        function scheduleDeletion( args ) {
            var
                params = args.originalParams,
                mediaId = params.id || '',
                deleteAfter = params.deleteAfter || '',
                putData = {
                    'deleteAfter': deleteAfter,
                    'fields_': ['deleteAfter']
                },
                dbSetup = {
                    'user': args.user,
                    'model': 'media',
                    'action': 'put',
                    'query': { '_id': (mediaId + '') },
                    'field': putData.fields_,
                    'options': { ignoreReadOnly: true }
                };

            if( '' === mediaId ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'media id not given', true ) );
                return;
            }

            dbSetup.data = Y.doccirrus.filters.cleanDbObject( putData );

            Y.doccirrus.mongodb.runDb( dbSetup, args.callback );
        }

        /**
         *  Stash an image in the temp directory
         *
         *  Expected params:
         *
         *  @param  args
         */

        function tempStore( args ) {
            Y.log( 'called tempstore, wraps pdf.js', 'debug', NAME );

            var
                callback = args.callback,
                tempDir = Y.doccirrus.media.getTempDir(),
                params = args.originalParams,
                base64Image = params.base64Image || '';

            if( '' === base64Image ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'base64Image not sent in request', true ) );
                return;
            }

            Y.doccirrus.media.pdf.storeTempJpeg( base64Image, onTempImageSaved );

            function onTempImageSaved( err, tempFileName ) {
                if( err ) {
                    Y.log( 'Could not save base64 image to disk: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( Y.doccirrus.errors.rest( 500, 'Could not save base64 image to disk', true ) );
                    return;
                }

                //  do not send full file path to client, security, information leakage
                tempFileName = tempFileName.replace( tempDir, '' );
                callback( null, { 'tempFile': tempFileName } );
            }
        }

        /**
         *  Convert a series of temporary images into a PDF in the temp directory
         *  @param args { { originalParams: { widthmm:string, heightmm:string } } }
         */

        function compilePdf( args ) {
            var
                mediaObj,

                params = args.originalParams,
                saveTo = params.saveTo || 'temp',
                imageset = params.imageset || [],
                //  orientation = params.orientation || 'portrait',
                //  widthmm = params.widthmm || 210,
                //  heightmm = params.heightmm || 297,
                //  resolutiondpmm = 7.874; // 200 DPI
                ownerCollection = params.ownerCollection || 'test',
                ownerId = params.ownerId || 'test',
                label = params.label || '',
                name = params.name || 'newpdf',
                docType = params.docType || 'OTHER';

            if( 0 === imageset.length ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'No images specified', true ) );
                return;
            }

            Y.log( 'Compiling PDF from ' + imageset.length + ' images to ' + saveTo, 'debug', NAME );

            //  Using ImageMagick, slow, deprecated due to MOJ-5492
            // Y.doccirrus.media.pdf.compilePDF(imageset, orientation, widthmm, heightmm, resolutiondpmm, onPDFCompiled);

            //  Using HPDF.js, experimental
            Y.doccirrus.media.hpdf.compileFromImagesSerial( args.user, imageset, onPDFCompiled );

            function onPDFCompiled( err, tempFile ) {
                if( err ) {
                    Y.log( 'Problem compiling PDF from temp files: ' + JSON.stringify( err ), 'debug', NAME );
                }

                if( 'temp' === saveTo ) {
                    args.callback( err, { 'tempFile': tempFile } );
                    return;
                }

                var randId = Y.doccirrus.comctl.getRandId();
                Y.doccirrus.media.mediaFromFile( tempFile, randId, 'original', onMediaLoaded );
            }

            function onMediaLoaded( err, newMedia ) {
                if( err ) {
                    Y.log( 'Problem reading PDF from temp file: ' + JSON.stringify( err ), 'debug', NAME );
                    args.callback( err );
                    return;
                }

                if( 'cache' === saveTo ) {
                    Y.doccirrus.media.cacheStore( newMedia, onSavedInCache );
                    return;
                }

                mediaObj = newMedia;

                mediaObj.ownerCollection = ownerCollection;
                mediaObj.ownerId = ownerId;
                mediaObj.label = label;
                mediaObj.name = name;
                mediaObj.docType = docType;
                delete mediaObj._id;

                Y.doccirrus.media.mediaToDB( args.user, mediaObj, onMediaSaved );
            }

            function onMediaSaved( err, mediaId ) {
                if( err ) {
                    Y.log( 'Could not save media to db: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                mediaObj._id = mediaId[0] ? mediaId[0] : mediaId;
                Y.doccirrus.media.gridfs.importFile( args.user, mediaObj._id, mediaObj._diskFile, false, onGridFSSave );
            }

            function onGridFSSave( err ) {
                if( err ) {
                    Y.log( 'Could not save compiled PDF to GirdFS: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                args.callback( null, mediaObj._id );
            }

            function onSavedInCache( err, cacheFile ) {
                args.callback( err, Y.doccirrus.media.getCacheUrl( cacheFile ) );
            }
        }

        /**
         *  List media attached to some item
         *
         *  This action expects 'collection' and 'id' rest params to look up owner objects
         */

        function listMedia( args ) {
            var
                params = args.originalParams,
                ownerCollection = params.collection || (params.data && params.data.collection) || '',
                ownerId = params.id || (params.data && params.data.id) || '',
                dbSetup = {
                    'user': args.user,
                    'model': 'media',
                    'action': 'get',
                    'query': {
                        'ownerCollection': ownerCollection,
                        'ownerId': ownerId
                    }
                };

            //  (1) Check REST parameters

            if( ('' === ownerCollection) || ('' === ownerId) ) {
                Y.log( 'Invalid request, missing ownerCollection or ownerId', 'debug', NAME );
                args.callback( Y.doccirrus.errors.rest( 400, 'Please specify collection and id these images belong to', true ) );
                return;
            }

            Y.log( 'Loading media belonging to ' + ownerCollection + '::' + ownerId, 'info', NAME );

            //  (2) Look up matching media items in the database

            Y.doccirrus.mongodb.runDb( dbSetup, onDbQuery );

            function onDbQuery( err, results ) {

                if( err ) {
                    Y.log( 'Could not select media: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                var
                    i,
                    ext,
                    mimeType;

                for( i = 0; i < results.length; i++ ) {
                    if( results[i]._id ) {

                        mimeType = Y.doccirrus.media.getMimeType( results[i].mime );

                        switch( results[i].mime ) {
                            case 'IMAGE_JPEG':
                                ext = 'jpg';
                                mimeType = 'image/jpeg';
                                break;
                            case 'IMAGE_PNG':
                                ext = 'png';
                                mimeType = 'image/png';
                                break;
                            case 'IMAGE_GIF':
                                ext = 'gif';
                                mimeType = 'image/gif';
                                break;
                            case 'APPLICATION_PDF':
                                ext = 'pdf';
                                mimeType = 'application/pdf';
                                break;
                            default:
                                ext = 'xxx';
                                mimeType = 'application/unknown';
                                break;
                        }

                        results[i].mimeType = mimeType;
                        results[i]._original = '/media/' + results[i]._id + '_original.' + results[i].mime + '.' + ext;
                        results[i].ext = ext;
                    }
                }

                //Y.log( 'Sending response: ' + JSON.stringify( results, undefined, 2 ), 'debug', NAME );
                args.callback( null, results );
            }

        } // end listmedia

        /**
         *  Creates a temporary directory to hold files for a new zip archive
         *
         *  This will call back with a handle to be used to add files to the temp directory
         *
         *  @param  args    {Object}    REST args as passed by /1/ API
         */

        function createZip( args ) {
            var
                params = args.originalParams,
                preferName = params.preferName || '';

            function onZipCreated( err, zipHandle ) {
                if( err ) {
                    args.callback( Y.doccirrus.errors.rest( 500, 'Could not create new zip archive: ' + err, true ) );
                    return;
                }
                args.callback( null, zipHandle );
            }

            Y.doccirrus.media.zip.create( preferName, onZipCreated );
        }

        /**
         *  Reset and return the cached list of custom fonts
         *
         *  @param  args    {Object}    REST args as passed by /1/ API
         */

        function reloadFonts( args ) {
            Y.doccirrus.media.fonts.reloadFontList( args.user, args.callback );
        }

        /**
         *  Return the cached list of custom fonts
         *
         *  @param  args    {Object}    REST args as passed by /1/ API
         */

        function listFonts( args ) {
            args.callback( null, Y.doccirrus.media.fonts.ttf );
        }

        /**
         *  Copy media and file in GridFS
         *
         *  Overall process:
         *
         *      1.  Load the media metadata object from database
         *      2.  Load media file from GridFS as buffer
         *      3.  Save a copy of the media object with new ownership
         *      4.  Save a new copy of the buffer under new mediaId
         *      (call back with error or new mediaId)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.mediaId             media object to copy
         *  @param  {String}    args.originalParams.ownerCollection     type of object which will own copy
         *  @param  {String}    args.originalParams.ownerId             _id of owner of new copy
         *  @param  {Function}  args.callback                           Of the form fn( err, newMediaId )
         */

        function makeCopy( args ) {
            var
                inMigration = args.migrate ? args.migrate : false,
                params = args.originalParams,
                oldMediaId = params.mediaId || '',
                newOwnerCollection = params.ownerCollection || '',
                newOwnerId = params.ownerId || '',
                newMediaId,
                mediaObj,
                bufferObj;

            if ( '' === oldMediaId ) { return args.callback( Y.doccirrus.errors.rest( 500, 'Missing mediaId' ) ); }

            async.series( [ loadMedia, loadBuffer, postMedia, postBuffer ], onAllDone );

            //  1.  Load the media metadata object from database
            function loadMedia( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'media',
                    'migrate': inMigration,
                    'query': { '_id': oldMediaId },
                    'callback': onMediaLoaded
                } );

                function onMediaLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( '404', 'Media not found' ); }
                    if ( err ) { return itcb( err ); }
                    mediaObj = result[0];
                    itcb( null );
                }
            }

            //  2.  Load media file from GridFS as buffer
            function loadBuffer( itcb ) {
                Y.doccirrus.media.gridfs.exportBuffer( args.user, oldMediaId, inMigration, onBufferLoaded );
                function onBufferLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    bufferObj = result;
                    itcb( null );
                }
            }

            //  3.  Save a copy of the media object with new ownership
            function postMedia( itcb ) {
                delete mediaObj._id;

                //  add new owner if specified
                mediaObj.ownerCollection = ( '' === newOwnerCollection ) ? mediaObj.ownerCollection : newOwnerCollection;
                mediaObj.ownerId = ( '' === newOwnerId ) ? mediaObj.ownerId : newOwnerId;

                mediaObj = Y.doccirrus.filters.cleanDbObject( mediaObj );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'media',
                    'migrate': inMigration,
                    'action': 'post',
                    'data': mediaObj,
                    'callback': onMediaSaved
                } );

                function onMediaSaved( err, result ) {
                    if ( err ) { return itcb( err ); }
                    newMediaId = result[0];
                    itcb( null );
                }
            }

            //  4.  Save a new copy of the buffer under new mediaId
            function postBuffer( itcb ) {
                Y.doccirrus.media.gridfs.importBuffer( args.user, newMediaId, bufferObj, inMigration, itcb  );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not copy media: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, newMediaId, mediaObj );
            }
        }

        /**
         *  Remove all entries from the media collection where deleteAfter exteeds current datetime
         *
         *  Expected arguments
         *
         *      user        {Object}    REST user or equivalent
         *      callback    {Function}  Of the fn(err, report)
         *
         *  @param  args
         */

        function cleanupExpiredMedia( args ) {

            Y.log( 'Cleaning up expired media for tenant: ' + args.user.tenantId );

            var
                dateExpire, dateNow,
                dbSetup = {
                    'user': args.user,
                    'model': 'media',
                    'action': 'get',
                    'query': { $and: [{ 'deleteAfter': { $ne: '' } }, { 'deleteAfter': { $exists: true } }] },
                    'options': {
                        'fields': { 'deleteAfter': 1 }
                    }
                },
                toDelete = [];

            Y.doccirrus.mongodb.runDb( dbSetup, onMediaLoaded );

            function onMediaLoaded( err, data ) {

                if( err ) {
                    Y.log( 'Error looking up media: ' + JSON.stringify( err ), 'warn', NAME );
                    args.callback( err );
                    return;
                }

                data.forEach( function( mediaObj ) {
                    if( mediaObj.deleteAfter && '' !== mediaObj.deleteAfter ) {
                        dateExpire = moment( mediaObj.deleteAfter );
                        dateNow = moment();

                        if( dateNow.isAfter( dateExpire ) ) {
                            Y.log( 'Queue expired unsaved media for deletion: ' + mediaObj._id, 'info', NAME );
                            toDelete.push( mediaObj );
                        } else {
                            Y.log( 'Unsaved media not expired yet: ' + mediaObj._id, 'debug', NAME );
                        }
                    }
                } );

                deleteNext();
            }

            function deleteNext() {

                if( 0 === toDelete.length ) {
                    args.callback( null );
                    return;
                }

                var nextItem = toDelete.pop();

                Y.log( 'Deleting expired media: ' + nextItem._id + ' expired on ' + nextItem.deleteAfter, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'media',
                    'action': 'delete',
                    'query': { '_id': (nextItem._id + '') }
                }, onDeletedMedia );
            }

            function onDeletedMedia( err ) {
                if( err ) {
                    Y.log( 'Error deleting expired media: ' + JSON.stringify( err ), 'warn', NAME );
                }
                if( err && {} !== err ) {
                    args.callback( err );
                    return;
                }
                deleteNext();
            }
        }

        /**
         *  REST route to run the gridFS migration for media
         *
         *  dev/support only
         *
         *  @param args
         */

        function testMigrateGridFs( args ) {
        Y.log('Entering Y.doccirrus.api.media.testMigrateGridFs', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.testMigrateGridFs');
        }
            function onMigrationComplete( err, report ) {
                if( err ) {
                    Y.log( 'testMigrateGridFs calls back with error', 'warn', NAME );
                }
                args.callback( err, { data: report } );
            }

            Y.doccirrus.media.migrationhelper.moveToGridFs( args.user, {}, false, onMigrationComplete );
        }

        /**
         *  REST route to correct image orientation from Exif tags
         *
         *  dev/support only
         *
         *  @param args
         */

        function testMigrateExif( args ) {
            Y.log('Entering Y.doccirrus.api.media.testMigrateExif', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.testMigrateExif');
            }
            var callback = args.callback;

            function onMigrationComplete( err, report ) {
                if( err ) {
                    Y.log( 'testMigrateGridFs calls back with error: ' + JSON.stringify( err ), 'warn', NAME );
                }
                callback( err, { data: report } );
            }

            Y.doccirrus.media.migrationhelper.migrateExif( args.user, false, onMigrationComplete );
        }

        //  Temporary, EXTMOJ-123, to be removed shortly

        function gridfsSaveBufferTest( args ) {
            Y.log('Entering Y.doccirrus.api.media.gridfsSaveBufferTest', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.gridfsSaveBufferTest');
            }
            var
                mediaId = '5787a5b45348ff497000dd53',       //   add your own test id here
                testId = 'testbuffer';

            Y.log( 'Getting buffer from gridfs with iod: ' + mediaId, 'debug', NAME );
            Y.doccirrus.media.gridfs.exportBuffer( args.user, mediaId, false, onBufferLoaded );

            //  load from GridFS
            function onBufferLoaded( err, fileBuffer ) {
                if( err ) {
                    Y.log( 'Error loading buffer: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                Y.log( 'Received buffer: ' + fileBuffer.length, 'debug', NAME );
                Y.log( 'Saving buffer to gridfs with id: ' + testId, 'debug', NAME );
                Y.doccirrus.media.gridfs.importBuffer( args.user, testId, fileBuffer, false, onBufferSaved );
            }

            //  save to GridFS with new filename
            function onBufferSaved( err, response ) {
                if( err ) {
                    Y.log( 'Error saving buffer: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                Y.log( 'Saved buffer: ' + response.length, 'debug', NAME );
                Y.doccirrus.media.gridfs.exportBuffer( args.user, testId, false, onBufferReLoaded );
            }

            //  load from GridFS with new filename
            function onBufferReLoaded( err, fileBuffer ) {
                if( err ) {
                    Y.log( 'Error reloading buffer: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }
                Y.log( 'Received buffer: ' + fileBuffer.length, 'debug', NAME );
                args.callback( null, fileBuffer );
            }

        }

        /**
         *  Used when editing images on fabric.js in client, or adding from charts, see imagesCanvas API
         */

        function loadDataURI( args ) {
            return Y.doccirrus.imagesCanvas.loadDataURI( args );
        }

        function saveDataURI( args ) {
            return Y.doccirrus.imagesCanvas.saveDataURI( args );
        }

        function saveChartPDF( args ) {
            return Y.doccirrus.imagesCanvas.saveChartPDF( args );
        }

        /**
         *  Used to show charts of infant growth
         */

        function makePediatricChart( args ) {
            return Y.doccirrus.imagesCanvas.makePediatricChart( args );
        }

        /**
         *  Create a FROMPATIENTMEDIA activity given a file in dataURI format from patient portal or external API
         *
         *  OverallProcess
         *
         *      1. Check that this patient exists and is authorised to send files to PRC
         *      2. Sanitize and import dataURI to GridFS
         *      3. Create a document object to hold the new media item
         *      4. Create a FROMPATIENTMEDIA object to hold the new document
         *      X. Call back with new, reduced document object (format for external API)
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.dataURI     File in dataURI format, must be an allowed type
         *  @param  {String}    args.originalParams.docType     Type of document, default to OTHER
         *  @param  {String}    args.originalParams.caption     File name / image caption / activity content
         *  @param  {String}    args.originalParams.patientId   Patient from whom we are receiving a file
         *  @param  {Function}  args.callback                   Of the form fn( err, document )
         */

        function saveDataURIAsActivity( args ) {

            var
                params = args.originalParams,
                query = args.query,
                patientId = ( query && ( query.pid || query.patientId ) ) || ( params && ( params.pid || params.patientId ) ),
                dataURI = params.dataURI,
                docType = params.docType || 'OTHER',
                caption = params.caption || 'untitled',     //  should not be left blank

                mimeType = Y.doccirrus.media.getDataUrlMimeType( dataURI ),
                patientObj,
                documentObj,

                //  use default location if none can be determined from patient insurance status
                locationId = Y.doccirrus.schemas.location.getMainLocationId(),
                employeeId = ( params && 'MochaTest' === params.browser ) ? params.employeeId : null,

                mediaId,
                activityId = new ObjectId(),
                documentId = new ObjectId();

            //  check arguments

            if ( !patientId ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required parameter: patientId' ) );
            }

            if ( !dataURI ) {
                return args.callback( Y.doccirrus.errors.rest( 400, 'Missing required parameter: dataURI' ) );
            }

            async.series(
                [
                    checkPermissions,
                    lookupEmployeeId,
                    importDataURIAsMedia,
                    createDocument,
                    createActivity,
                    loadDocument
                ],
                onAllDone
            );

            //  1. Check that this patient exists and is authorised to send files to PRC
            function checkPermissions( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'patient',
                    'query' : { '_id': patientId },
                    'callback': onPatientLoaded
                } );

                function onPatientLoaded( err, result ) {
                    if ( !err && !result[0] ) {
                        err = Y.doccirrus.errors.rest( 404, 'Patient not found: ' + patientId );
                    }

                    if ( err ) { return itcb( err ); }
                    patientObj = result[0];

                    //  check that patient is allowed to send documents to the PRC
                    if ( !patientObj.accessPRC ) {
                        return itcb( Y.doccirrus.errors.rest( 403, 'Patient does not have PRC access.' ) );
                    }

                    //  check for an employee
                    if ( !employeeId && patientObj.primaryDoc ) {
                        employeeId = patientObj.primaryDoc;
                    }

                    if ( !employeeId && patientObj.scheinEmployeeIds && patientObj.scheinEmployeeIds[0] ) {
                        employeeId = patientObj.scheinEmployeeIds[0];
                    }

                    //  check for a location
                    if ( patientObj.insuranceStatus && patientObj.insuranceStatus[0] && patientObj.insuranceStatus[0].locationId ) {
                        locationId = patientObj.insuranceStatus[0].locationId;
                    }

                    if ( patientObj.locationId ) {
                        locationId = patientObj.locationId;
                    }

                    itcb( null );
                }
            }

            //  2. Find an employeeId if none are immediately available on the patient object
            function lookupEmployeeId( itcb ) {
                //  if we already have an employeeId then we can skip this step
                if ( employeeId ) { return itcb( null ); }

                Y.doccirrus.api.patient.guessBestEmployeeId( args.user, patientObj._id, onEmployeeLookup );
                function onEmployeeLookup( err, foundEmployeeId ) {
                    if ( err ) { return itcb( null ); }
                    employeeId = foundEmployeeId;
                    itcb( null );
                }
            }

            //  2. Sanitize and import dataURI to GridFS
            function importDataURIAsMedia( itcb ) {
                Y.doccirrus.imagesCanvas.saveDataURI( {
                    'user': args.user,
                    'originalParams': {
                        'dataURI': dataURI,
                        'ownerCollection': 'activity',
                        'ownerId': activityId,
                        'docType': docType
                    },
                    'callback': onMediaCreated
                } );

                function onMediaCreated( err, newMediaId ) {
                    if ( err ) { return itcb( err ); }
                    mediaId = ( newMediaId && newMediaId._id ) || newMediaId;
                    itcb( null );
                }
            }

            //  3. Create a document object to hold the new media item
            function createDocument( itcb ) {
                var
                    patientName = patientObj.firstname + ' ' + patientObj.lastName,
                    mime = Y.doccirrus.media.getMime( mimeType ),
                    postData = {
                        '_id': documentId,
                        'type': docType,
                        'url': '/media/' + mediaId.toString() + '_original.' + mime + '.jpg&from=friend',
                        'publisher': patientName,                   //  current patient's name
                        'contentType': mimeType,
                        'attachedTo': patientId,                    //  deprecated, see MOJ-9190
                        'activityId': activityId.toString(),
                        'patientId': patientId,                     //  available in patient portal
                        'mediaId': mediaId,
                        'locationId': locationId,
                        'isEditable': true,
                        'caption': caption,
                        'createdOn': new Date(),
                        'tags': [],
                        'accessBy': [ patientId ],                  //  patient has access to their own upload
                        'usesMedia': []
                    };

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'document',
                    'action': 'post',
                    'data': Y.doccirrus.filters.cleanDbObject( postData ),
                    'callback': onDocumentSaved
                } );

                function onDocumentSaved( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            //  4. Create a FROMPATIENTMEDIA object to hold the new document
            function createActivity( itcb ) {

                var
                    newActivity = {
                        '_id': activityId,
                        'actType': 'FROMPATIENTMEDIA',
                        'patientId': patientId,
                        'locationId': locationId,
                        'employeeId': employeeId,
                        'timestamp': moment( new Date() ).toISOString(),
                        'attachments': [ documentId ],
                        'userContent': caption,
                        'status': 'VALID'
                    };

                //  Note that pre-process 'checkFromPatient' will create FROM_PATIENT casefolder if one does not exist
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'activity',
                    'action': 'post',
                    'data': Y.doccirrus.filters.cleanDbObject( newActivity ),
                    'callback': onActivitySaved
                } );

                function onActivitySaved( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function loadDocument( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'document',
                    'query': { '_id': documentId },
                    'callback': onDocumentLoaded
                } );

                function onDocumentLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( 400, 'Could not load new document' ); }
                    if ( err ) { return itcb( err ); }

                    //  We do not send all properties, strip internal IDs and features not useful to extrnal API
                    documentObj = Y.doccirrus.schemas.document.redactForExternalAPI( result[0] );
                    itcb( null );
                }
            }

            //  X. Call back with new, reduced document object (format for external API)
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem storing dataURI as activity: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                args.callback( null, documentObj );
            }

        }

        //  Test route to clean up duplicated images

        function deduplicateImagesTest( args ) {
            Y.log('Entering Y.doccirrus.api.media.deduplicateImagesTest', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.deduplicateImagesTest');
            }
            Y.doccirrus.media.migrationhelper.deduplicateImages( args );
        }

        /**
         * @method PRIVATE
         *
         * This method removes "ownerId" and "ownerCollection" references from the media objectd with _id = mediaId
         *
         * @param {Object} user :REQUIRED:
         * @param {String} mediaId :REQUIRED: media ID to unclaim
         * @returns {*}
         */
        function unclaimMedia( user, mediaId ) {
            if( !user || !mediaId ) {
                return Promise.reject(`'user' and 'mediaId' required`);
            }

            return Y.doccirrus.mongodb.runDb( {
                     user: user,
                     model: 'media',
                     action: 'put',
                     query: {
                         _id: mediaId
                     },
                     data: Y.doccirrus.filters.cleanDbObject( {ownerCollection: "", ownerId: ""} ),
                     fields: ['ownerCollection', 'ownerId']
                  } );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method check if the media, which the user wants to delete, is contained/referenced by devicelogs.
         * If yes
         *  then it removes "ownerId" and "ownerCollection" references from the mediaObj
         * else
         *  this method first deletes the cache associated with this media and then hard deletes the media from the DB
         *
         * @param {Object} args :REQUIRED:
         * @param {Object} args.user :REQUIRED:
         * @param {Object} args.query :REQUIRED:
         * @param {String} args.model :OPTIONAL: If present or not should always be equals to 'media'
         * @param {Object} args.options :OPTIONAL: will be present for JSONPRC call but for local calls can be absent
         * @param {Function} args.callback :OPTIONAL: If present then results will be passed via callback or else via promise
         *
         * @returns {Promise<undefined>}
         */
        async function DELETE( args ) {
            const
                {user, query, model = "media", callback} = args;

            let
                err,
                result,
                deletedTransformsArr,
                mediaObjArr;

            // ------------------------ 1. Query all the media's which the user is trying to delete ------------------------
            [err, mediaObjArr] = await formatPromiseResult(
                                         Y.doccirrus.mongodb.runDb( {
                                             action: 'get',
                                             model: model,
                                             user: user,
                                             query: query
                                         } )
                                       );

            if(err) {
                Y.log(`DELETE: Error querying media from DB for query: ${JSON.stringify(query)}. Error: ${err.stack || err}`, "error", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest('26002') );
                } else {
                    throw Y.doccirrus.errors.rest('26002');
                }
            }

            if( !mediaObjArr || !Array.isArray(mediaObjArr) || !mediaObjArr.length ) {
                // This could happen if the media is already deleted (or if the query which user build did not match any media)
                Y.log(`DELETE: No media object found for query: ${JSON.stringify(query)}`, "warn", NAME);

                if( callback ) {
                    return callback( Y.doccirrus.errors.rest('26005') );
                } else {
                    throw Y.doccirrus.errors.rest('26005');
                }
            }
            // ------------------------------------------------- 1. END --------------------------------------------------------


            // ------ 2. For each mediaObj, if 'mediaObj_id' is not contained by devicelog then DELETE the media from DB else do nothing ----------
            for( let mediaObj of mediaObjArr ) {    // eslint-disable-line no-unused-vars

                // --------------------- 2a. Check if mediaObj_id is contained by devicelog --------------------------------------------
                [err, result] = await formatPromiseResult(
                                        Y.doccirrus.api.devicelog.checkIfDeviceLogContainsMediaId({
                                            user,
                                            data: {
                                                mediaId: mediaObj._id.toString()
                                            }
                                        })
                                      );

                if( err ) {
                    Y.log(`DELETE: Error in 'devicelog.checkIfDeviceLogContainsMediaId' for mediaId: ${mediaObj._id.toString()}. Error: ${err.stack || err}`, "error", NAME);

                    if( callback ) {
                        return callback( Y.doccirrus.errors.rest('26003') );
                    } else {
                        throw Y.doccirrus.errors.rest('26003');
                    }
                }
                // ------------------------------------------- 2a. END ---------------------------------------------------------------------


                // ---------------------- 2b (If). If the mediaObj._id is not contained by devicelog then DELETE its cache and from the DB  --------------
                if( result === "NOT_FOUND" ) {

                    // ---------------------------- a] Clear any existing cache for mediaObj._id -----------------------------------------------
                    [err, deletedTransformsArr] = await formatPromiseResult(
                                                          new Promise( (resolve, reject) => {
                                                              Y.doccirrus.media.cacheRemove( { _id: mediaObj._id.toString() }, (err, resArr) => {
                                                                  if(err) {
                                                                      reject(err);
                                                                  } else {
                                                                      resolve(resArr);
                                                                   }
                                                             } );
                                                          } )
                                                        );

                    if( err ) {
                        Y.log(`DELETE: Error while clearing cached transforms for mediaId: ${mediaObj._id.toString()}. Error: ${err.stack || err}`, 'warn', NAME );
                    } else {
                        Y.log(`DELETE: Successfully deleted cached transforms: ${JSON.stringify( deletedTransformsArr, null, 2 )} for mediaId: ${mediaObj._id.toString()}`, 'info', NAME );
                    }
                    // ------------------------------------------------ a] END ---------------------------------------------------------------


                    // ----------------------------- b] Delete mediaobj._id from the database ------------------------------------------------
                    [err] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        action: 'delete',
                                        model: model,
                                        user: user,
                                        query: {_id: mediaObj._id.toString()}
                                    } )
                                  );

                    if( err ) {
                        Y.log(`DELETE: Error while deleting mediaId: ${mediaObj._id.toString()} from DB. Error: ${err.stack || err}`, "error", NAME );

                        if( callback ) {
                            return callback( Y.doccirrus.errors.rest('26003') );
                        } else {
                            throw Y.doccirrus.errors.rest('26003');
                        }
                    }
                    // -------------------------------------------- b] END -------------------------------------------------------------------

                    continue;
                }
                // ------------------------------------------------- 2b (If). END ---------------------------------------------------------------


                // ----- 2b (Else). If mediaObj._id is referred by deviceLog then remove "ownerId" and "ownerCollection" reference from mediaObj ---------------
                [err] = await formatPromiseResult( unclaimMedia(user, mediaObj._id.toString()) );

                if( err ) {
                    // Just log it as it is still not a error condition
                    Y.log(`DELETE: Error while unclaiming mediaId: ${mediaObj._id} from DB. Error: ${err.stack || err}`, "warn", NAME);
                }
                // ----------------------------------------------- 2b (else). END ------------------------------------------------------------------------------

            }
            // -------------------------------------------------------- 2. END ---------------------------------------------------------------------------------

            if( callback ) {
                return callback();
            }
        }

        /**
         *  Special dev/test route to dump all patient files to a zip file
         */

        function exportAllMediaToZip( args ) {
            Y.log('Entering Y.doccirrus.api.media.exportAllMediaToZip', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.exportAllMediaToZip');
            }
            Y.doccirrus.media.migrationhelper.exportGridFS( args );
        }

        /**
         *  Dump all attached files for activities into a zip
         *
         *  Process:
         *
         *      1. Start a new zip
         *      2. Get an activity model (with mongoose model)
         *      3. load all activities attachments
         *
         *  @param args
         */

        async function exportActivitiesAttachmentsToZip( args ) {
            Y.log('Entering Y.doccirrus.api.media.exportActivitiesAttachmentsToZip', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.media.exportActivitiesAttachmentsToZip');
            }
            const
                moment = require( 'moment' ),
                { user, data: {activitiesIds}, callback } = args,
                zipName = `activities-export-perf-${moment( new Date ).format( 'YYYY-MM-DD_H-mm-ss' )}`,
                tempDir = Y.doccirrus.media.getTempDir();

            let
                zipId, err,
                activityModel,
                inMigration = false,
                fileNames = [];

            if( !activitiesIds || !activitiesIds.length ) {
                // no need to run if no activities
                return callback( null );
            }

            Y.log( `Exporting all activities files to zip: ${zipName}`, 'debug', NAME );

            const
                createZipFileP = util.promisify( Y.doccirrus.media.zip.create ),
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                writeFileP = util.promisify( fs.writeFile ),
                renameFileP = util.promisify( fs.rename );

            //  1. Start a new zip
            [err, zipId] = await formatPromiseResult( createZipFileP( zipName ) );

            if( err ) {
                Y.log( `exportActivitiesAttachmentsToZip: Error in creating zip file. ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            //  2. Get an activity model (with mongoose model)
            [err, activityModel] = await formatPromiseResult( getModelP(  user, 'activity', inMigration ) );

            if( err ) {
                Y.log( `exportActivitiesAttachmentsToZip: Error in getting activity model. ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            //  3. Stream all activities

            let
                activityQuery = { '_id': { $in: activitiesIds } },
                activityFields = {
                    '_id:': 1,
                    'attachments': 1,
                    'actType': 1,
                    'timestamp': 1,
                    'attachmedMedia': 1,
                    'employeeName': 1,
                    'locationId': 1,
                    'formId': 1,
                    'formVersion': 1,
                    'l_extra': 1
                },
                cursor,
                activityEntry;

            cursor = activityModel.mongoose.find( activityQuery, activityFields, { timeout: true } ).lean().cursor();

            while ( activityEntry = await cursor.next() ) {    //  eslint-disable-line no-cond-assign
                if ( !activityEntry.attachments || 0 === activityEntry.attachments.length ) {
                    Y.log( `Activity has no attachments, skipping ${activityEntry._id} ${activityEntry.actType}`, 'debug', NAME );
                    continue;
                }
                let result;
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    'model': 'location',
                    'query': {
                        '_id': activityEntry.locationId
                    },
                    'options': {
                        'select': {
                            'locname': 1
                        }
                    }
                } ) );

                if ( err ) {
                    Y.log( `Problem getting location from activity ${ activityEntry._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                    continue;
                }

                let locationName = result && result[0] && result[0].locname || '';

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    'model': 'document',
                    'query': {'_id': { '$in': activityEntry.attachments }, 'mediaId': { '$exists': true }}
                } ) );

                if ( err ) {
                    Y.log( `Problem getting attached documents ${ activityEntry._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                    continue;
                }

                Y.log( `Loaded ${result.count} media attachments for activity ${activityEntry._id} ${activityEntry.actType}`, 'debug', NAME );
                if ( 0 === result.length ) { continue; }

                for( let item of result ) {     // eslint-disable-line no-unused-vars
                    const
                        exportFileP = util.promisify( Y.doccirrus.media.gridfs.exportFile ),
                        addFileP = util.promisify( Y.doccirrus.media.zip.addFile );

                    let
                        mimeType = item.contentType,
                        tempFile = Y.doccirrus.media.getTempFileName( { 'mime': mimeType, 'transform': 'export' } ),
                        dateStr = moment( activityEntry.timestamp ).format( 'DDMMYYYY' ),
                        ext = Y.doccirrus.media.getExt( mimeType ),
                        friendlyName = dateStr + '_' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activityEntry.actType, 'i18n', 'k.A.' ) + '_' + activityEntry.employeeName +
                                       '_' + locationName + '_' + item.mediaId + '.' + ext,
                        wroteFile,
                        newFileName;

                    Y.log( `ZIPEXPORT writing to zip: ${zipId}}` , 'info', NAME );
                    Y.log( `ZIPEXPORT writing to temp directory: ${tempFile}`, 'info', NAME );

                    [err, wroteFile] = await formatPromiseResult( exportFileP( user, item.mediaId, tempFile, inMigration ) );

                    if ( err ) {
                        Y.log( `Problem exporting media file from activity ${ activityEntry._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue anyway
                        continue;
                    }

                    Y.log( `ZIPEXPORT write file to temp dir: ${wroteFile}`, 'debug', NAME );

                    [err, newFileName] = await formatPromiseResult( addFileP( zipId, tempFile, tempDir, friendlyName, true ) );

                    if ( err ) {
                        Y.log( `Problem adding file to zip from activity ${ activityEntry._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                        //  continue anyway
                        continue;
                    }

                    Y.log( `Wrote file to zip: ${newFileName}`, 'debug', NAME );
                    fileNames.push( friendlyName );

                }
            }

            //  X finsihed
            // set list of files to text file
            [err] = await formatPromiseResult( writeFileP( `${tempDir}/${zipName}/created.txt`, fileNames.join( '\n' ) ) );

            if( err ) {
                Y.log( `Cannot set attacments names to text file: ${err.stack || err}`, 'error', NAME );
               return callback( err );
            }
            [err] = await formatPromiseResult( renameFileP( `${tempDir}/${zipName}/created.txt`, `${tempDir}/${zipName}/${i18n( 'InCaseMojit.casefile_browser.print.menuitem.FILES_LIST' )}.txt` ) );

            if( err ) {
                Y.log( `Cannot rename text file: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            callback( null, { zipId: zipId, fileNames: fileNames } );

        }

        /**
         *  Mark a file which has been flagged by the malware scanner as a false positive
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user                               Must be admin
         *  @param  {String}    args.originalParams.mediaId
         *  @param  {Boolean}   args.originalParams.isFalsePositive
         *  @param  {Object}    args.callback
         *  @return {Promise<void>}
         */

        async function markFalsePositive( args ) {
            const
                user = args.user,
                params = args.originalParams,
                mediaId = params.mediaId || null,
                isFalsePositive = params.isFalsePositive || false;

            if ( !mediaId ) { return args.callback( new Error( 'Please pass a mediaId' ) ); }

            //  check user role

            let
                isAdminOrSupport,
                err, result, i, data;

            for ( i = 0; i < user.groups.length; i++ ) {
                if ( 'ADMIN' === user.groups[i].group || 'SUPPORT' === user.groups[i].group ) {
                    isAdminOrSupport = true;
                }
            }

            if ( !isAdminOrSupport ) {
                Y.log( `User ${user.U} without privileges attempted to mark faile as false positive: ${mediaId}`, 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 403 ) );
            }

            //  mark the media

            if ( isFalsePositive ) {
                data = { $set: { malwareFalsePositive: isFalsePositive } };
            } else {
                data = { $unset: { malwareFalsePositive: '' } };
            }

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'media',
                    action: 'update',
                    query: {_id: mediaId},
                    data
                } )
            );

            if ( err ) {
                Y.log( `Could not update false positive status of media ${mediaId}: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  dummy save to trigger post-processes

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'media',
                    action: 'put',
                    query: {_id: mediaId},
                    fields: [ 'gridfs' ],
                    data: { gridfs: true, skipcheck_: true }
                } )
            );

            //  record audit log entry
            Y.doccirrus.media.recordMalwareAuditEntry( user, mediaId, `Als falsch positiv markieren: ${isFalsePositive}` );

            args.callback( err, result );
        }

        /**
         *  Clear a file from GridFS on suspicion of malware, and clear malware warning from media object
         *
         *  @param  {Object}    args
         *  @param  {Object}    arg.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.mediaId
         *  @params {Function}  args.callback
         *  @return {Promise<void>}
         */

        async function deleteMalware( args ) {
            const
                removeFileP = util.promisify( Y.doccirrus.media.gridfs.removeFile ),
                importBufferP = util.promisify( Y.doccirrus.media.gridfs.importBuffer ),
                params = args.originalParams,
                mediaId = params.mediaId || null;

            let
                mediaObj, msg,
                err, result;

            if ( !mediaId ) {
                return args.callback( new Error( 'Please provide a mediaId' ) );
            }

            //  load the media object

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'media',
                    query: { _id: mediaId }
                } )
            );

            if ( ! err && !result[0] ) {
                err = Y.doccirrus.errors.rest( 404, 'media not found' );
            }

            if ( err ) {
                Y.log( `Error loading media object: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            mediaObj = result[0];

            //  remove the file and replace it with a warning message (just for auditing)

            msg = 'File removed due to suspicion of malware:\n' + mediaObj.malwareWarning;

            [ err ] = await formatPromiseResult( removeFileP( args.user, mediaId, false ) );

            if ( err ) {
                Y.log( `Could not clear file in GridFS ${mediaId}: ${err.stack}`, 'error', NAME );
                return args.callback( Y.doccirrus.errors.rest( 404, 'GridFS file not found' ) );
            }

            [ err ] = await formatPromiseResult( importBufferP( args.user, mediaId, msg, false ) );

            if ( err ) {
                Y.log( `Could not replace file in GridFS ${mediaId}: ${err.stack}`, 'error', NAME );
                return args.callback( Y.doccirrus.errors.rest( 404, 'GridFS file not replaced' ) );
            }

            //  clear the media object

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'media',
                    action: 'update',
                    query: { _id: mediaObj._id },
                    data: {
                        $set: {
                            mime: 'TEXT_PLAIN'
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not update media after clearing malware: ${err.stack||err}`, 'warn', NAME );
                return args.callback( err );
            }

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'media',
                    action: 'update',
                    query: { _id: mediaObj._id },
                    data: {
                        $unset: {
                            malwareWarning: '',
                            malwareFalsePositive: ''
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not update media after clearing malware: ${err.stack||err}`, 'warn', NAME );
                return args.callback( err );
            }

            //  update the document

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'document',
                    action: 'update',
                    query: { mediaId: mediaId },
                    data: {
                        $set: {
                            contentType: 'text/plain'
                        }
                    }
                } )
            );

            if ( err ) {
                Y.log( `Could not update document after clearing malware: ${err.stack||err}`, 'warn', NAME );
                return args.callback( err );
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'document',
                    action: 'update',
                    query: { mediaId: mediaId },
                    data: {
                        $unset: {
                            malwareWarning: '',
                            malwareFalsePositive: ''
                        }
                    }
                } )
            );

            //  record audit log entry
            //  TRANSLATEME
            Y.doccirrus.media.recordMalwareAuditEntry( args.user, mediaId, `Vermutete Malware gelöscht: ${mediaId}` );

            args.callback( err, result );
        }

        /**
         *  JSONRPC call used to get PDF layout information for displaying pages inline (EXTMOJ-1985)
         *
         *  Note that this will add the PDF to the media cache, to prime for extracting pages.
         *
         *  TODO: handleResult - return promise if no callback
         *
         *  @param  args
         *  @param  args.user
         *  @param  args.originalParams
         *  @param  args.originalParams.mediaId
         *  @param  args.callback
         */

        async function getPdfPageLayout( args ) {
            const
                params = args.originalParams || {},
                mediaId = params.mediaId || null;

            let err, result;

            if ( !mediaId ) { return args.callback( Y.doccirrus.errors.rest( 500, 'Media not specified' ) ); }
            [err, result] = await formatPromiseResult( Y.doccirrus.media.pdf.getPdfPageLayout( args.user, mediaId ) );
            args.callback( err, result );
        }

        /**
         *  Test/support route to run ClamAV against a file in GridFS
         *
         *  @param  args.user
         *  @param  args.originalParams
         *  @param  args.originalParams.mediaId
         *  @param  args.callback
         */

        function testVirusScan( args ) {
            if ( !args.originalParams.mediaId ) {
                return args.callback( new Error( 'Please pass a mediaId' ) );
            }
            Y.doccirrus.media.virusScanGridFS( args.user, args.originalParams.mediaId, args.callback );
        }

        //  MEDIA REST API

        Y.namespace( 'doccirrus.api' ).media = {
            delete: DELETE,
            'upload': uploadMedia,
            'upload64': uploadmedia64,
            'uploadchunked': uploadMediaChunked,
            'download': download,
            'scale': scale,
            'print': printMedia,
            'list': listMedia,
            'remove': deleteMedia,
            'checkCache': checkCache,
            'printCache': printCache,
            'saveFromCache': saveFromCache,
            'makepdf': makepdf,
            'pdfjpg': pdfPageAsJpeg,
            'concatenatepdfs': concatenatePdfs,
            'copypdftozip': copyPdfToZip,
            'loadtestsvg': loadTestSvg,
            'scheduleDeletion': scheduleDeletion,
            'chown': chown,
            'tempstore': tempStore,
            'compilepdf': compilePdf,
            'cleanupExpiredMedia': cleanupExpiredMedia,
            'deleteMediaByOwnerCollectionAndId': deleteMediaByOwnerCollectionAndId,

            'createzip': createZip,
            'reloadfonts': reloadFonts,
            'listfonts': listFonts,

            'loadDataURI': loadDataURI,
            'saveDataURI': saveDataURI,
            'saveChartPDF': saveChartPDF,
            'saveDataURIAsActivity': saveDataURIAsActivity,
            'makePediatricChart': makePediatricChart,

            'makecopy': makeCopy,

            getPdfPageLayout: getPdfPageLayout,

            markFalsePositive,
            deleteMalware,

            // allow get for 1530
            //'get': (args) => { args.callback(); /*work-in-progress*/ },
            //'post': (args) => { args.callback(); /*work-in-progress*/ },
            // remove in use
            // put in use

            //  dev / support routes
            testMigrateGridFs: testMigrateGridFs,
            testMigrateExif: testMigrateExif,
            gridfsSaveBufferTest: gridfsSaveBufferTest,
            deduplicateImagesTest: deduplicateImagesTest,
            exportAllMediaToZip: exportAllMediaToZip,
            exportActivitiesAttachmentsToZip,
            testVirusScan
        };

    },
    '0.0.1', {
        requires: [
            'media-schema',
            'mediamojit-migrationhelper',
            'dcmedia-store',
            'dcmedia-images',
            'dcmedia-audio',
            'dcmedia-video',
            'dcmedia-hpdf',
            'dcmedia-pdf',
            'dcmedia-svg',
            'dcmedia-upload',
            'dcprinter',
            'devicelog-api'
        ]
    }
);