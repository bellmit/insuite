/*
 * Copyright (c) 2015 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  Image utilities using node canvas
 *
 *  Using node canvas over imagemagick may offer performance, but only works for a subset of the media formats we 
 *  support (JPG and PNG).  This is to be used where possible to speed up generation of form and profile images.
 */

/*jshint latedef:false */
/*global YUI, require */



YUI.add( 'dcimages-canvas', function( Y, NAME ) {

        const
            //  node modules
            { Image } = require( 'canvas' ),
            async = require( 'async' );

        /**
         *  Convert a dataURI into a canvas image
         *
         *  @param  dataURI     {String}    Usually from media object source
         */

        function dataURIToImage( dataURI ) {
            var newImage = new Image();
            newImage.src = dataURIToBuffer( dataURI );
            return newImage;
        }

        /**
         *  Convert a dataURI into a canvas image
         *
         *  @param  dataURI     {String}    Usually from media object source
         */

        function dataURIToBuffer(dataURI) {
            var bin, parts;
            //Y.log('Converting dataUrl to buffer: ' + dataUrl, 'debug', NAME);
            parts = dataURI.split(',', 2);
            bin = Buffer.from(parts[1], 'base64');
            return bin;
        }

        /**
         *  Create a new image (media object) of the same format in a different size
         *
         *  Note: this calls back a new object, the previous one is still in memory
         *  Note: this should only be used for JPG and PNG images
         *
         *  @param  image       {Object}    See description at top
         *  @param  toWidthPx   {Number}    Pixels, integer
         *  @param  toHeightPx  {Number}    Pixels, integer
         *  @param  crop        {Boolean}   Cut (true) or stretch (false) image to fit new aspect
         *  @param  toMime      {String}    IMAGE_JPEG or IMAGE_PNG
         *  @param  callback    {Function}  of the form fn(err, newImage)
         */

        function resample( image, toWidthPx, toHeightPx, crop, toMime, callback ) {

            Y.log('Entering resizeImageCanvas ' + image._id + ' ' + toWidthPx + 'x' + toHeightPx, 'debug', NAME);

            //  check / sanitize passed values

            toWidthPx = ('string' === typeof toWidthPx) ? parseInt(toWidthPx, 10) : toWidthPx;
            toHeightPx = ('string' === typeof toHeightPx) ? parseInt(toHeightPx, 10) : toHeightPx;

            if (isNaN(toWidthPx) || isNaN(toHeightPx)) {
                callback(new Error('Invalid dimensions to resize: ' + (toWidthPx || 'NaN') + 'x' + (toHeightPx || 'NaN')));
                return;
            }

            if (-1 === toWidthPx) { toWidthPx = image.widthPx; }
            if (-1 === toHeightPx) { toHeightPx = image.heightPx; }

            if ('image/jpg' === toMime || 'image/jpeg' === toMime) { toMime = 'IMAGE_JPEG'; }
            if ('image/png' === toMime) { toMime = 'IMAGE_PNG'; }

            if (
                ('IMAGE_JPEG' !== image.mime && 'IMAGE_JPG' !== image.mime && 'IMAGE_PNG' !== image.mime) ||
                ('IMAGE_JPEG' !== toMime && 'IMAGE_JPG' !== toMime && 'IMAGE_PNG' !== toMime)
            ) {
                //  no point in trying to resize these as vector images, causes imagemagick to use a lot of memory
                Y.log('Canvas resize only supports IMAGE_PNG and IMAGE_JPEG images, ' + image.mime + ' given', 'warn', NAME);
                callback(null, image);
                return;
            }

            //  create canvas and calculate any crop

            var
                img = dataURIToImage(image.source),
                cnv = Y.dcforms.makeCanvasObject(toWidthPx, toHeightPx),
                ctx = cnv.getContext('2d'),

                aspectSource = (img.width / img.height),
                aspectDest = (toWidthPx / toHeightPx),

                resizedImage = {
                    'ownerCollection': image.ownerCollection || '',
                    'ownerId': image.ownerId || '',
                    'label': image.label || '',
                    'mime': toMime,
                    'mimeType': Y.doccirrus.media.getMimeType( toMime ),
                    'name': image.name,
                    'descr': 'Transform of ' + image._id + new Date().toString(),
                    'widthPx': toWidthPx,
                    'heightPx': toHeightPx,
                    'transform': Math.ceil( toWidthPx ) + 'x' + Math.ceil( toHeightPx ),
                    'source': ''
                },

                sx = 0,
                sy = 0,
                swidth = img.width,
                sheight = img.height;

            //  if cropping the image
            if ( crop ) {
                if( aspectSource < aspectDest ) {

                    //  destination is relatively less tall, cropping vertically (eg, TV -> widescreen)
                    //  crop half the vertical difference to center output

                    swidth = img.width;
                    sheight = Math.ceil( img.width / aspectDest );
                    sy = (img.height - sheight) / 2;

                }

                if( aspectSource > aspectDest ) {

                    //  destination is relatively taller, cropping horizontally (eg, widescreen -> TV)
                    //  crop half the horizontal difference to center output

                    swidth = Math.ceil( img.height * aspectDest );
                    sheight = img.height;
                    sx = (img.width - swidth) / 2;

                }
            }

            //  resample image
            ctx.drawImage(img, sx, sy, swidth, sheight, 0, 0, toWidthPx, toHeightPx);
            resizedImage.source = cnv.toDataURL(resizedImage.mimeType);

            callback( null, resizedImage );
        }

        /**
         *  Used for Fabric.js on the client where we need to load an image cross-domain without tainting the canvas
         *
         *  Overall process:
         *
         *      1. check argments
         *      2. load metadata object (check type, get size)
         *      3. load file form GridFS and convert to dataURI format
         *      X. return the image to the caller
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user                       REST user or equivalent
         *  @param  {Function}  args.callback                   Passed via JSONRPC
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.mediaId     Database _id of a media object
         *  @param  {String}    args.originalParams.mimeType    Should be image/jpeg or image/png for fabric.js
         *  @param  {String}    args.originalParams.transform   Default is 'original'
         */

        function loadDataURI( args ) {

            var
                params = args.originalParams,
                mimeType,
                mediaId,
                transform,
                requestMimeType,
                mediaObj,
                buffer;

            async.series( [ checkParams, loadMedia, loadSimpleBuffer, makeTransform ], onAllDone );

            //  1. check argments
            function checkParams( itcb ) {
                if (!params.mediaId || '' === params.mediaId ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'mediaId not given' ) );
                }

                mediaId = params.mediaId;
                transform = params.transform || 'original';

                requestMimeType = params.mimeType || null;

                itcb( null );
            }

            //  2. load metadata object (check type, get size)
            function loadMedia( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'media',
                    'query': { '_id': mediaId },
                    'callback': onMediaLoaded
                } );
                function onMediaLoaded( err, result ) {
                    if ( !err && !result[0] ) { err = Y.doccirrus.errors.rest( '404', 'Image not found' ); }
                    if ( err ) { return itcb( err ); }

                    mediaObj = result[0];
                    mimeType = Y.doccirrus.media.getMimeType( mediaObj.mime || '' );

                    if ( !requestMimeType ) {
                        //   if out mime type was not specified then assume original
                        requestMimeType = mimeType;
                    }

                    /*  TODO: add option to only return images
                    if ( ( mimeType !== 'image/jpeg' ) && ( mimeType !== 'image/png' ) ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Media is not an image' ) );
                    }
                    */

                    itcb( null );
                }
            }

            //  3. load file form GridFS and convert to dataURI format if original file was requested
            function loadSimpleBuffer( itcb ) {
                //  if we need to make a transform then this is not a simple load from disk, skip this step
                if ( 'original' !== transform ) { return itcb( null ); }
                //  if we need to format shift then this is not a simple load from disk, skip this step
                if (  mimeType !== requestMimeType ) { return itcb( null ); }

                Y.doccirrus.media.gridfs.exportBuffer( args.user, mediaId, false, onBufferLoaded );
                function onBufferLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    Y.log( 'Loaded media ' + mediaId + ' as buffer: ' + result.length, 'debug', NAME );
                    buffer = result;
                    itcb( null );
                }
            }

            //  4. create a transform of the file in GridFS and load that as a buffer
            function makeTransform( itcb ) {
                //  if we have already loaded a buffer then we do not need to make a transform, skip this step
                if ( buffer ) { return itcb( null ); }

                var
                    parts = transform.split( 'x' ),
                    stub = {
                        '_id': mediaId,
                        'transform': transform,
                        'mime': Y.doccirrus.media.getMime( requestMimeType )
                    },
                    cacheFile = Y.doccirrus.media.getCacheFileName( stub ),
                    cacheDir = Y.doccirrus.media.getCacheDir(),
                    opts = {
                        '_id': mediaId,
                        '_transform': transform,
                        'widthPx': parseInt( parts[0], 10 ),
                        'heightPx': parseInt( parts[1], 10 ),
                        '_cacheFile': cacheFile,
                        'mime': Y.doccirrus.media.getMime( requestMimeType )
                    };

                Y.doccirrus.media.transform.create( args.user, opts, onTransformCreated );

                function onTransformCreated( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }

                    // read the file into a buffer
                    Y.doccirrus.media.readFile( cacheDir + cacheFile, cacheDir, onFileRead );
                }

                function onFileRead( err, result ) {
                    if ( err ) { return itcb( err ); }
                    buffer = result;
                    itcb( null );
                }

            }

            //  X. return the image to the caller
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not create dataURI from file in GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                var
                    dataURIHeader = 'data:' + requestMimeType + ';base64,',
                    dataURI = dataURIHeader + buffer.toString( 'base64' ),
                    result = JSON.parse( JSON.stringify( mediaObj ) );

                result.binary = false;
                result.dataURI = dataURI;
                args.callback( null, result );
            }
        }

        /**
         *  Given a dataURI and ownership information, add it to the media collection and GridFS
         *
         *  Overall process:
         *
         *      1. sanity checks
         *      2. write the file to disk
         *      3. invoke media import process
         *      X. call back with new media _id
         *
         *  @param  {Object}    args                                    JSONRPC API
         *  @param  {Object}    args.user                               REST user or equivalent
         *  @param  {Function}  args.callback                           JSONRPC API
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.dataURI             Image file from client
         *  @param  {String}    args.originalParams.ownerCollection     Type of object which owns this media
         *  @param  {String}    args.originalParams.ownerId             _id of object which owns this media
         *  @param  {String}    args.originalParams.docType             optional, type of document which owns this
         *  @param  {String}    args.originalParams.label               optional, default is 'user'
         */

        function saveDataURI( args ) {
            var
                params = args.originalParams,
                dataURI = params.dataURI || '',
                ownerCollection = params.ownerCollection || '',
                ownerId = params.ownerId || '',
                docType = params.docType || 'OTHER',
                label = params.label || 'user',
                tempFile,
                result,
                mimeType;

            async.series( [ checkParams, saveAsFile, importToDatabase ], onAllDone );

            //  1. sanity checks
            function checkParams( itcb ) {
                if ( '' === ownerId || '' === ownerCollection ) {
                    return itcb( Y.doccirrus.errors.rest( 400, 'Could not save media, missing owner information' ) );
                }
                if ( '' === dataURI ) {
                    return itcb( Y.doccirrus.errors.rest( 400, 'Could not save media, missing dataURI' ) );
                }

                mimeType = Y.doccirrus.media.getDataUrlMimeType( dataURI );
                Y.log( 'Received dataURI with mime type: ' + mimeType, 'debug', NAME );
                itcb( null );
            }

            //  2. write the file to disk
            function saveAsFile( itcb ) {
                var
                    tempDir = Y.doccirrus.media.getTempDir(),
                    stubObj = { 'mime': Y.doccirrus.media.getMime( mimeType ) },
                    buffer;

                try {
                    buffer = Y.doccirrus.media.dataUriToBuffer( dataURI );
                } catch ( parseErr ) {
                    Y.log( 'Invalid dataURI, could not parse: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    return itcb( parseErr );
                }

                tempFile = Y.doccirrus.media.getTempFileName( stubObj );
                Y.doccirrus.media.writeFile( tempFile, tempDir, buffer, onTempFileSaved );

                function onTempFileSaved( err ) {
                    if ( err ) {
                        Y.log( 'Could not write temp file to disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  3. invoke media import process
            function importToDatabase( itcb ) {
                Y.doccirrus.media.importMediaFromFile(
                    args.user,
                    tempFile,
                    ownerCollection,
                    ownerId,
                    'fabric.jpg',
                    label,
                    docType,
                    onMediaImported
                );

                function onMediaImported( err, newMedia ) {
                    if ( err ) {
                        Y.log( 'Could not import media from dataURI: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    result = newMedia;
                    itcb( null );
                }
            }

            //  X. call back with new media _id
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not save dataURI: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                Y.log( 'Created media ' + JSON.stringify( result ), 'debug', NAME );
                args.callback( null,  result );
            }

        }

        /**
         *  Given a dataURI and ownership information, embed in a PDF and save to disk or db
         *
         *  Overall process:
         *
         *      1.  Sanity checks
         *      2.  Write the file to disk
         *      3.  Look up form from role
         *      4.  Create a form to map this into
         *      5.  Map this image from temp directory (special PDF process)
         *      6.  Export template in HPDF format and fix image aspect ratio
         *      7.  Export form to PDF in database
         *      8.  Load new media object
         *      X.  Call back with new media _id or temp filename         *
         *
         *  @param  {Object}    args                                    JSONRPC API
         *  @param  {Object}    args.user                               REST user or equivalent
         *  @param  {Function}  args.callback                           JSONRPC API
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.dataURI             Image file from client
         *  @param  {Number}    args.originalParams.widthPx             Width of image
         *  @param  {Number}    args.originalParams.heightPx            Height of image
         *  @param  {String}    args.originalParams.ownerCollection     Type of object which owns this media
         *  @param  {String}    args.originalParams.ownerId             _id of object which owns this media
         *  @param  {String}    args.originalParams.docType             optional, type of document which owns this
         *  @param  {String}    args.originalParams.label               optional, default is 'user'
         */

        function saveChartPDF( args ) {
            var
                path = require( 'path' ),
                params = args.originalParams,
                dataURI = params.dataURI || '',
                ownerCollection = params.ownerCollection || '',
                ownerId = params.ownerId || '',
                formRole = 'labdata-chart',
                saveTo = params.saveTo || 'db',
                mapData = params.formData || {},
                widthPx = params.widthPx || -1,
                heightPx = params.heightPx || -1,
                tempFile,
                result,
                mimeType,
                formMeta,
                template,
                documentState,
                pdfMediaId;

            async.series(
                [
                    checkParams,
                    saveAsFile,
                    lookupFormRole,
                    createFormTemplate,
                    addTempImageToForm,
                    formatForHPDF,
                    renderPdfToDb,
                    loadMediaObject
                ],
                onAllDone
            );

            //  1.  Sanity checks
            function checkParams( itcb ) {
                if ( '' === ownerId || '' === ownerCollection ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Could not save media, missing owner information' ) );
                }
                if ( '' === dataURI ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Could not save media, missing dataURI' ) );
                }
                if ( -1 === widthPx || -1 === heightPx ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Could not save media, missing image dimensions' ) );
                }

                mimeType = Y.doccirrus.media.getDataUrlMimeType( dataURI );
                Y.log( 'Received dataURI with mime type: ' + mimeType, 'debug', NAME );
                itcb( null );
            }

            //  2.  Write the file to disk
            function saveAsFile( itcb ) {
                var
                    tempDir = Y.doccirrus.media.getTempDir(),
                    stubObj = { 'mime': Y.doccirrus.media.getMime( mimeType ) },
                    buffer;

                try {
                    buffer = Y.doccirrus.media.dataUriToBuffer( dataURI );
                } catch ( parseErr ) {
                    Y.log( 'Invalid dataURI, could not parse: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    return itcb( parseErr );
                }

                tempFile = Y.doccirrus.media.getTempFileName( stubObj );
                Y.doccirrus.media.writeFile( tempFile, tempDir, buffer, onTempFileSaved );

                function onTempFileSaved( err ) {
                    if ( err ) {
                        Y.log( 'Could not write temp file to disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  3.  Look up form from role
            function lookupFormRole( itcb ) {
                Y.doccirrus.formsconfig.getFormByRole( args.user, formRole, onConfigLoaded );
                function onConfigLoaded( err, result ) {
                    if ( !err && !result ) { err = Y.doccirrus.errors.rest( 404, 'Form not found.' ); }
                    if ( err ) { return itcb( err ); }
                    formMeta = result;
                    itcb( null );
                }
            }

            //  4.  Create a form to map this into
            function createFormTemplate( itcb ) {
                template = Y.dcforms.createTemplate( {
                    'user': args.user,
                    'canonicalId': formMeta.canonicalId,
                    'formversionId': formMeta.latestVersionId,
                    'doRender': false,
                    'callback': onTemplateLoaded
                } );
                function onTemplateLoaded( err, newTemplate ) {
                    if ( err ) { return itcb( err ); }
                    template = newTemplate;
                    template.map( mapData, true, itcb );
                }
            }

            //  5.  Map this image from temp directory (special PDF process)
            function addTempImageToForm( itcb ) {
                var
                    imgElem = template.getBoundElement( 'labdataImage' ),
                    imgSubElem = null,
                    i;

                if ( !imgElem ) {
                    Y.log( 'Could not find image mapped to InSuite_T.labdataImage in form: ' + formMeta.canonicalId, 'warn', NAME );
                    return itcb( null );
                }

                //  see images.server.js / preparePdfImage
                for ( i = 0; i < imgElem.subElements.length; i++ ) {
                    if ( imgElem.subElements[i].imgId ) {
                        imgSubElem = imgElem.subElements[i];
                    }
                }

                if ( !imgSubElem ) {
                    Y.log( 'Could not find matching image subelement in form: ' + formMeta.canonicalId, 'warn', NAME );
                    return itcb( null );
                }

                //  set literal image on subElement
                imgSubElem.imgId = '!' + tempFile;

                itcb( null );
            }

            //  6.  Export template in HPDF format and fix image aspect ratio
            function formatForHPDF( itcb ) {
                template.renderPdfServer(saveTo, '', 'chart.pdf', onFormatHpdf);

                function onFormatHpdf(err, result) {
                    if (err) {
                        return itcb(err);
                    }

                    var
                        imgAspect = widthPx / heightPx,
                        elemAspect,
                        docPage, docSubElem,
                        i, j;

                    documentState = result;

                    for (i = 0; i < documentState.pages.length; i++) {
                        docPage = documentState.pages[i];
                        for ( j = 0; j < docPage.subElements.length; j++ ) {
                            docSubElem = docPage.subElements[j];
                            if ( docSubElem.imgId === '!' + tempFile ) {

                                //  adjust image element to given image aspect
                                elemAspect = ( docSubElem.width / docSubElem.height );
                                if ( elemAspect > imgAspect ) {
                                    //  reduce the width of the image element
                                    docSubElem.width = parseInt( ( imgAspect * docSubElem.height ), 10 );
                                } else {
                                    //  reduce the height of the image element
                                    docSubElem.height = parseInt( ( docSubElem.width / imgAspect ), 10 );
                                }

                            }
                        }
                    }

                    itcb(null);
                }
            }

            //  7.  Export form to PDF in database
            function renderPdfToDb( itcb ) {
                Y.doccirrus.media.hpdf.compileFromForm(
                    args.user,
                    documentState,
                    onProgress,
                    onPdfWritten
                );

                //  used to update progress bars on client, not currently in use for this PDF
                function onProgress( evt ) {
                    Y.log( 'PDF render progress: ' + JSON.stringify( evt ), 'debug', NAME );
                }

                function onPdfWritten( err, newPdfMeta ) {
                    if ( err ) { return itcb( err ); }

                    result = newPdfMeta;
                    pdfMediaId = newPdfMeta._id;

                    if ( 'temp' === saveTo ) {
                        //  used when opening the PDF in border
                        result.documentFileName = path.basename( result.tempId );
                    }

                    itcb( null );
                }
            }

            //  8.  Load new media object
            function loadMediaObject( itcb ) {
                //  if not saved to DB then we can skip this step
                if ( 'db' !== saveTo ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'media',
                    'query': { _id: pdfMediaId },
                    'callback': onMediaLoaded
                } );
                function onMediaLoaded( err, foundMedia ) {
                    if ( !err && !foundMedia[0] ) { err = Y.doccirrus.errors.rest( 404, 'Media not found.' ); }
                    if ( err ) { return itcb( err ); }
                    result = foundMedia[0];
                    itcb( null );
                }
            }

            //  X.  Call back with new media _id or temp filename
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not save dataURI: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                //  clean up chart image in temp directory
                //Y.doccirrus.media.cleanTempFiles( { '_tempFiles': [ tempFile ] } );

                Y.log( 'Created media ' + JSON.stringify( result ), 'debug', NAME );
                args.callback( null, result );
            }
        }

        Y.namespace( 'doccirrus' ).imagesCanvas = {
            'resample': resample,
            'dataURIToImage': dataURIToImage,
            'loadDataURI': loadDataURI,
            'saveDataURI': saveDataURI,
            'saveChartPDF': saveChartPDF
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcforms-canvas-utils' ]}
);