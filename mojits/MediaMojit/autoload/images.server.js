/*
 * Copyright (c) 2012 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  This is a place for common image processing functions which may be used by multiple mojits.
 *
 *  This module wraps the Imagemagick suite of CLI tools:
 *
 *    https://github.com/rsms/node-imagemagick
 *    http://www.imagemagick.org/
 *
 *  Images are assumed to be in gif, png or jpeg format when supplied.  .jpeg files are preferred for reasons of
 *  performance (smaller size in database, faster page load, less memory use by client and server), .png files are used
 *  where fidelity is more important (eg, for printing from FormEditorMojit).
 *
 *  Since reading image metadata from dataUrls is expensive, these are read when the image is first added to the system.
 *  After initial normalization, images are assumed to be an object with the following properties.
 *
 *  {
 *      _id:            '1234567890',                           //  ID database object [string]
 *      name:           'My Picture',                           //  [string]
 *      descr:          'Description of picture',               //  [string]
 *      source:         'image/jpeg;base64,iVBOR...etc',        //  [string]
 *      origFilename:   '/i_was_read_from_here.jpg'             //  where this was read from [string]
 *      mime:           'image/jpeg',                           //  (jpeg|png|gif|pdf) [string]
 *      widthPx:        640,                                    //  pixels [number]
 *      heightPx:       480,                                    //  pixels [number]
 *      label:          'profilepicture',                       //  category this file belongs to [string]
 *      transform:      'original'                              //  how was this was transformed from original [string]
 *  }
 *
 *  Note that images are stored in the database (base64 encoded dataURLs), but must be written to disk to be processed
 *  by imagemagick.  Since images uploaded by the user may be a security threat, they are written to the filesystem with
 *  a random name and deleted as soon as practical.
 *
 *
 *  Usage:
 *
 *     (DOCUMENTME)
 *
 */

//  Allowing late definitions for readbaility - lets us put the callback chains is execution order from top to bottom

/*jslint latedef:false */
/*global YUI */

YUI.add( 'dcmedia-images', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            async = require( 'async' ),

            { Image } = require('canvas'),

            briefeDirPath = `${Y.doccirrus.auth.getImportDir()}/BRIEFE`,

            {formatPromiseResult} = require( 'dc-core' ).utils,

        //  configuration - these may be moved to application.json in the future
            MAX_IMAGE_WIDTH = 4096,
            MAX_IMAGE_HEIGHT = 4096,

        //  node modules
            shellexec = require( 'child_process' ).exec,

        //  constants
            EXIF_ORIENTATION_MARKER = 'exif:Orientation:';

        /**
         *  Run on server start, used to check setup and import any default images
         */

        function initialize() {
            Y.log( 'Images module ready.', 'debug', NAME );
        }

        /**
         *  Takes a media object and enforces security / performance restrictions on its content
         *
         *  Current normalization tasks for images:
         *
         *      (*) Get expanded image information
         *      (*) Enforce maximum size of raster images
         *      (*) Apply EXIF rotations to JPG images
         *
         *  More rules and tasks may be added in future.
         *
         *  @param  image       {Object}        Media object, see media-schema.common.js
         *  @param  callback    {Function}      Of the form fn(err, newImageObj)
         */

        function normalize(image, callback) {

            if( false === Y.doccirrus.media.initialized() ) {
                return callback( 'Media store not initialized.', null );
            }

            Y.log( 'Normalizing image', 'info', NAME );

            image = Y.doccirrus.media.checkMedia( image );

            //  don't try to resize vector images, it won't save space
            if ('IMAGE_SVG' === image.mime || 'image/svg' === image.mimeType) {
                return callback( null, image );
            }

            var orientStr;

            async.series( [ getExpandedMeta, checkExifRotation, checkMaxSize ], onAllDone );

            //  1. Get expanded image metadata
            function getExpandedMeta( itcb ) {
                Y.doccirrus.media.images.getExifData( image, EXIF_ORIENTATION_MARKER, onMetaStringReady );

                function onMetaStringReady( err, tagValue ) {
                    if( err && !(image._diskFile && image._diskFile.includes( briefeDirPath )) ) {
                        Y.log( 'Problem extracting EXIF orientation: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }
                    orientStr = tagValue;
                    Y.log( 'EXIF orientation tag value: ' + tagValue, 'debug', NAME );
                    itcb( null );
                }
            }

            //  3. Apply correct orientation to images from mobile devices
            function checkExifRotation( itcb ) {
                //  If not a jpeg we can skip this step
                if ( 'IMAGE_JPEG' !== image.mime && 'image/jpeg' !== image.mimeType && 'image/jpg' !== image.mimeType ) {
                    return itcb( null );
                }
                Y.doccirrus.media.images.applyExifOrientation( image, orientStr, onExifRotate );
                function onExifRotate( err ) {
                    if ( err ) {
                        Y.log( 'Problem applying exif orientation: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  2. Enforce size restriction on images
            function checkMaxSize( itcb ) {
                var
                    doResize = false,
                    resizeWidth = parseInt( image.widthPx, 10 ),
                    resizeHeight = parseInt( image.heightPx, 10 ),
                    aspect = ( resizeWidth / resizeHeight );

                if ( isNaN( resizeWidth ) || isNaN( resizeHeight ) ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Could not read image dimensions', true ) );
                }

                if ( resizeWidth > MAX_IMAGE_WIDTH ) {
                    resizeWidth = MAX_IMAGE_WIDTH;
                    resizeHeight = parseInt((MAX_IMAGE_WIDTH / aspect), 10);
                    doResize = true;
                }

                if ( resizeHeight > MAX_IMAGE_HEIGHT ) {
                    resizeHeight = MAX_IMAGE_HEIGHT;
                    resizeWidth = parseInt((resizeHeight * aspect), 10);
                    doResize = true;
                }

                if (false === doResize) {
                    return itcb( null );
                }

                Y.doccirrus.media.images.resize( image, resizeWidth, resizeHeight, onImageResized );

                function onImageResized( err, scaledImage ) {
                    if ( err ) {
                        Y.log( 'Problem resizing image: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    image = scaledImage;
                    itcb( null );
                }
            }

            //  Finally, call back with compliant image or error
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not normalize image: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, image );
            }

        }

        /**
         *  Get expanded image metadata including exif tags
         *
         *  @param  image       {Object}    Should be a JPEG image
         *  @param  tag         {String}    Optional, if empty will call back with complete meta string
         *  @param  callback    {Function}  Of the form fn( err, string )
         */

        async function getExifData( image, tag, callback ) {
            var
                tagValue = '';

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'identify',
                        '+ping',
                        '-verbose',
                        `"${image._diskFile.replace( /"/g, '' )}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( 'Checking image ' + image._id + ' metadata, cmd: ' + shellCmd, 'debug', NAME );
            shellexec( shellCmd, onGetMeta );

            function onGetMeta( err, stdout, stderr ) {
                if( err ) {
                    return callback( err );
                }

                if( stderr && '' !== stderr ) {
                    //  Not fatal, but log this information for analysis
                    Y.log( 'Problem while checking image meta, stderr:\n' + stderr, 'warn', NAME );
                }

                if( stdout && '' !== stdout ) {
                    Y.log( 'Extracted detailed image matadata.', 'debug', NAME );
                }

                if( !tag || '' === tag ) {
                    return callback( null, stdout );
                }

                var
                    lines = stdout.split( '\n' ),
                    i;

                for( i = 0; i < lines.length; i++ ) {
                    if( -1 !== lines[i].indexOf( tag ) ) {
                        tagValue = lines[i].replace( tag, '' ).trim();
                    }
                }

                //  TEMP/DEV - show process list after this step, looking for zombies (MOJ-7112)
                if( require( 'os' ).type() === "Darwin" ) {
                    shellexec( 'ps aux', onPS );
                } else {
                    shellexec( 'ps -aux', onPS );
                }

                //callback( null, tagValue );
            }

            function onPS( err, stdout, stderr ) {
                if( err ) {
                    return callback( err );
                }
                if( stderr && '' !== stderr ) {
                    Y.log( 'Error listing processes: ' + stderr, 'warn', NAME );
                }

                var lines = stdout.split( '\n' ), i;

                for( i = 0; i < lines.length; i++ ) {
                    if( -1 !== lines[i].indexOf( 'identify' ) ) {
                        Y.log( 'Found stray identify process: ' + lines[i], 'warn', NAME );
                    }
                }

                callback( null, tagValue );
            }
        }

        /**
         *  Rotate/translate an image file on disk to match exif orientation, then clear Exif orientation tag
         *
         *  @param  image               {Object}    Should already be written to disk
         *  @param  image._diskFile     {String}    Current location of JPEG file on disk
         *  @param  image._tempFiles    {[String]}  Ste of intermediate files to be cleaned up
         *  @param  orientStr           {String}    Value of Exif orientation tag ('1' to '8')
         *  @param  callback            {Function}  Of the form fn( err, newDiskFile )
         */

        async function applyExifOrientation( image, orientStr, callback ) {
            var
                rotateFile = Y.doccirrus.media.getTempFileName( image ),
                transform = '',
                swapSize = false;

            //  see: http://sylvana.net/jpegcrop/exif_orientation.html
            switch( orientStr ) {
                case '2':
                    transform = '-flop';
                    swapSize = false;
                    break;
                case '3':
                    transform = '-rotate 180';
                    swapSize = false;
                    break;
                case '4':
                    transform = '-flip';
                    swapSize = false;
                    break;
                case '5':
                    transform = '-transpose';
                    swapSize = false;
                    break;
                case '6':
                    transform = '-rotate 90';
                    swapSize = true;
                    break;
                case '7':
                    transform = '-transverse';
                    swapSize = false;
                    break;
                case '8':
                    transform = '-rotate 270';
                    swapSize = true;
                    break;
            }

            //  no reorientation, nothing to do here
            if( '1' === orientStr || '' === transform ) {
                return callback( null, image._diskFile );
            }

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'convert',
                        transform,
                        `"${image._diskFile}"`,
                        `"${rotateFile}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( 'Rotating image to match Exif orientation: ' + orientStr, 'debug', NAME );
            Y.log( 'cmd: ' + shellCmd, 'debug', NAME );

            shellexec( shellCmd, onTransform );

            async function onTransform( err, stdout, stderr ) {
                if( err ) {
                    return callback( err );
                }
                if( stderr && '' !== stderr ) {
                    //  non-fatal, ImageMagick can spam warnings sometimes
                    Y.log( 'Problem while rotating image, stderr: ' + stderr, 'warn', NAME );
                }

                if( stdout && '' !== stdout ) {
                    Y.log( 'Image reoriented, stdout: ' + stdout, 'debug', NAME );
                }

                //  add unrotated image to list of temp files to be cleaned up
                image._tempFiles = image._tempFiles ? image._tempFiles : [];
                image._tempFiles.push( image._diskFile );
                image._diskFile = rotateFile;

                //  NB: there is a bug in the older version of exiftool found on our CentOS deployments, hence the
                //  flag -m, please see:
                //
                //  https://www.loggn.de/exiftool-fehlermeldung-bad-makernotes-directory-und-makernotes-offsets-may-be-incorrect/
                //  http://u88.n24.queensu.ca/exiftool/forum/index.php?topic=5720.0
                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'exiftool',
                        shellArgs: [
                            '-overwrite_original_in_place', //  do not create a backup file
                            '-lang', //  use english language tag aliases
                            'en',
                            '-Orientation=', //  clear the orientation tag
                            '-m', //  downgrade minor errors to warnings
                            `"${image._diskFile}"` //  image to modify
                        ]
                    } )
                );

                if( err ) {
                    return callback( err );
                }

                Y.log( 'Image transformed, updating Exif orientation tag: ' + shellCmd, 'debug', NAME );

                shellexec( shellCmd, onUpdateExif );
            }

            function onUpdateExif( err, stdout, stderr ) {
                if ( err ) { return callback( err ); }

                var tempSide;

                if ( stderr && '' !== stderr ) {
                    //  non-critical
                    Y.log( 'Problem stripping Exif orientation, stderr:\n ' + JSON.stringify( err ), 'warn', NAME );
                }

                if ( stdout && '' !== stdout ) {
                    Y.log( 'Updated image Exif orientation, stdout: ' + stdout.trim(), 'debug', NAME );
                }

                if ( true === swapSize ) {
                    Y.log( 'Updating image size meta: ' + image.heightPx + 'x' + image.widthPx, 'debug', NAME );
                    tempSide = image.widthPx;
                    image.widthPx = image.heightPx;
                    image.heightPx = tempSide;
                }

                callback( null, image );
            }
        }

        /**
         *  Create a transform of this image in the disk cache
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mediaObj    {Object}    As described by media-schema.common.js
         *  @param  opts        {Object}    Interpreted from cache URL
         *  @param  callback    {Function}  Of the form fn( err, cacheFile )
         */

        function transform( user, mediaObj, opts, callback ) {
            Y.log( 'Creating transform: ' + JSON.stringify( opts ), 'debug', NAME );

            async.series( [ saveToTemp, reformatDiskImage, resizeDiskImage, copyToCache ], onAllDone );

            //  1. If not already on disk then read this file from GridFS to the temp directory
            function saveToTemp( itcb ) {
                //  if already saved to disk then we can skip this step
                if ( mediaObj._diskFile ) { return itcb( null ); }

                function onFileSavedToTemp( err, tempFile ) {
                    if ( err ) {
                        Y.log( 'Could not write file to temp directory from Gridfs: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    mediaObj._diskFile = tempFile;
                    mediaObj._tempFiles = mediaObj._tempFiles ? mediaObj._tempFiles : [];
                    mediaObj._tempFiles = [ tempFile ];
                    itcb( null );
                }

                /*
                var tempFile = Y.doccirrus.media.getTempFileName( mediaObj );
                Y.doccirrus.media.gridfs.exportFile( user, mediaObj._id, tempFile, false, onFileSavedToTemp );
                */

                Y.doccirrus.media.gridfs.mediaToTemp( user, mediaObj, onFileSavedToTemp );
            }
            //  2. If the requested transform is in a different format than the current image, then transcode
            function reformatDiskImage( itcb ) {
                //  if media is already in target format then we can skip this step
                if ( opts.mime === mediaObj.mime ) { return itcb( null ); }

                function onChangeFormat( err, newMediaObj ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Transcoded image ' + mediaObj._id + ' to: ' + opts.mime + ' from ' + mediaObj.mime, 'info', NAME);
                    mediaObj = newMediaObj;
                    itcb( null );
                }

                Y.doccirrus.media.images.transcode( mediaObj, opts.mime, onChangeFormat );
            }

            //  3. If the requested image is a different size than the original then crop/scale
            function resizeDiskImage( itcb ) {
                //  if media is already at the correct size then we can skip this
                if ( mediaObj.widthPx === opts.widthPx && mediaObj.heightPx === opts.heightPx ) { return itcb( null ); }

                function onImageResized( err, newMediaObj ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Resized image ' + mediaObj._id + ' to: ' + opts.widthPx + 'x' + opts.heightPx, 'info', NAME);
                    mediaObj = newMediaObj;
                    itcb( null );
                }

                Y.doccirrus.media.images.resize( mediaObj, opts.widthPx, opts.heightPx, onImageResized );
            }

            //  4. move file to media cache and clean temp directory
            function copyToCache( itcb ) {
                function onCacheStore( err, cacheFileName ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( 'Copied new image transform to cache: ' + cacheFileName );
                    itcb( null );
                }
                Y.doccirrus.media.cacheStore( mediaObj, onCacheStore );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not create image transform: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                mediaObj._tempFiles.forEach( Y.doccirrus.media.tempRemove );
                callback( null, mediaObj._cacheFile );
            }

        }

        /**
         *  Given the location of an image file, convert it to an image as described in the head of this document
         *
         *  @param  fileName            {String}    Location of an image in the filesystem
         *  @param  id                  {String}    Image identifier, common to transforms of the same image
         *  @param  transformName       {String}    Describes how this media object was derived from another
         *  @param  callback            {Function}  Of the form fn(err, image)
         */

        function imageFromFile( fileName, id, transformName, callback ) {

            if( false === Y.doccirrus.media.initialized() ) {
                return callback( 'Wrapper not initialized.', null );
            }

            if( 'string' !== (typeof fileName) ) {
                return callback( 'Filename must be a string', null );
            }

            if( 'number' !== (typeof id) ) {
                id = id.toString();
            }

            if( 'string' !== (typeof id) ) {
                return callback( 'Image ID must be a string, is ' + (typeof id) + ': ' + id.toString(), null );
            }

            if( 'string' !== (typeof transformName) ) {
                return callback( 'Transform name must be a string', null );
            }

            var image = {};     //  final callback value

            Y.doccirrus.media.mediaFromFile( fileName, id, transformName, onMediaCreated );

            /**
             *  Callback from mediastore, file has been loaded into a media object
             *
             *  @param  err     {String}    Error message or null
             *  @param  media   {Object}    Media object without any image-specific metadata
             */

            function onMediaCreated(err, media) {

                if (err) {
                    callback('Could not load image from disk: ' + err);
                    return;
                }

                image = media;
                identify( fileName, onIdentifyComplete);
            }

            /**
             *  Callback from ImageMagick identify, used to validate image and extract properties
             *
             *  @param err
             *  @param imageMeta
             */

            function onIdentifyComplete(err, imageMeta) {

                if (err) {
                    callback('Could not load image from disk: ' + err);
                    return;
                }

                image.widthPx = imageMeta.widthPx;
                image.heightPx = imageMeta.heightPx;
                image.layers = imageMeta.layers;
                image.mime = imageMeta.mime;
                image.mimeType = imageMeta.mimeType;

                callback( null, image );

            }

        }

        /**
         *  Creates a normalized image object given an express file upload (see req.files)
         *
         *  DEPRECATED: To be replaced with standard chunked binary upload lib
         *
         *  @param  upload      {Object}    Express file upload object
         *  @param  id          {String}    Unique ID for this image
         *  @param  callback    {Function}  Of the form (err, image)
         */

        function imageFromUpload( upload, id, callback ) {
            //  validation of upload here

            Y.log( 'Creating image object from file upload: ' + (upload.name || ''), 'debug', NAME );

            Y.log( 'Upload type: ' + upload.type );

            if( 'image' !== Y.doccirrus.media.getCategory( upload.type || upload.mimetype ) ) {
                callback( 'Uploaded file is not an image, it is: ' + upload.type, null );
                return;
            }

            var image = {};         //  final callback value

            Y.doccirrus.media.mediaFromUpload( upload, id, onMediaCreated );

            function onMediaCreated( err, media ) {
                if( err ) {
                    callback( err, null );
                    return;
                }

                image = media;
                identify(upload.path, onIdentifyComplete);
            }

            function onIdentifyComplete(err, metaData) {

                if (err) {
                    callback('Could not read image properties: ' + err);
                    return;
                }

                Y.log('Image identified as: ' + JSON.stringify(metaData), 'debug', NAME);

                image.widthPx = metaData.widthPx;
                image.heightPx = metaData.heightPx;
                image.layers = metaData.layers;
                image.mime = metaData.mime;
                image.mimeType = metaData.mimeType;

                Y.log('Normalizing image: ' + JSON.stringify(image), 'debug', NAME);

                normalize( image, callback );
            }
        }

        /**
         *  Get additional metadata for and image file
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mediaObj    {Object}    As defined in media-schema.common.js
         *  @param  callback    {Function}  Of the form fn( err, mediaObj )
         */

        function expandMeta( user, mediaObj, callback ) {

            async.series( [ saveToDisk, identifyFile ], onAllDone );

            //  1. Copy the file from GridFS to temp directory if not already done
            function saveToDisk( itcb ) {
                //  if already on disk then we can skip this step
                if ( mediaObj._diskFile ) { return itcb( null ); }
                Y.doccirrus.media.gridfs.mediaToTemp( user, mediaObj, itcb );
            }

            //  2. Run ImageMagick identify utility against this image
            function identifyFile( itcb ) {
                function onIdentify( err, imgMeta ) {
                    if ( err ) {
                        Y.log( 'Could not invoke ImageMagick: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    mediaObj.widthPx = imgMeta.widthPx;
                    mediaObj.heightPx = imgMeta.heightPx;
                    mediaObj.layers = imgMeta.layers;

                    itcb( null );
                }

                identify( mediaObj._diskFile, onIdentify );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not expand image metadata: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }
                callback( null, mediaObj );
            }

        }

        /**
         *  Wrapper for command line identify
         *
         *  @param  fileName    {String}    Location of an image on disk [string]
         *  @param  callback    {Function}  Of the form fn(err, imgMeta)
         */

        async function identify( fileName, callback ) {

            if( false === Y.doccirrus.filters.isLegalFileName( fileName ) ) {
                Y.log( 'SECURITY: attempt include unsafe file name in shell command: ' + fileName, 'warn', NAME );
                callback( 'File name not allowed by security layer' );
                return;
            }

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'identify',
                        '+ping',
                        `"${fileName.replace( /"/g, '' )}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            let imageMeta = {
                'fileName': fileName,
                'widthPx': -1,
                'heightPx': -1,
                'layers': 1,
                'mime': '',
                'mimeType': ''
            };

            shellexec( shellCmd, onIdentifyComplete );

            function onIdentifyComplete( err, stdout, stderr ) {
                Y.log( 'identify() STDOUT:' + stdout, 'debug', NAME );

                if( err ) {
                    Y.log( 'STDERR:' + stderr, 'debug', NAME );
                    callback( err, null );
                    return;
                }

                //  there may be multiple frames or layers in an image, here we just want the first

                var
                    lines = stdout.split( "\n" ),
                    parts = lines[0].split( ' ' ),
                    imgsize;

                if( !parts || !parts[2] ) {
                    callback( new Error( 'Image properties could not be read: ' + stdout ), null );
                    return;
                }

                imageMeta.parts = parts;
                imageMeta.layers = lines.length;

                Y.log( 'identify() parts: ' + JSON.stringify( imageMeta.parts ), 'debug', NAME );

                imgsize = parts[2].split( 'x' );

                if(
                    ('PNG' === parts[1]) ||
                    ('GIF' === parts[1]) ||
                    ('JPEG' === parts[1]) ||
                    ('PDF' === parts[1]) ||
                    ('SVG' === parts[1]) ||
                    ('TIFF' === parts[1])
                ) {
                    imageMeta.mime = ('PDF' === parts[1]) ? 'APPLICATION_PDF' : 'IMAGE_' + parts[1];
                    imageMeta.mimeType = Y.doccirrus.media.getMimeType( imageMeta.mime );
                    imageMeta.widthPx = imgsize[0];
                    imageMeta.heightPx = imgsize[1].match( /\d+/g )[0];
                }

                callback( null, imageMeta );
            }
        }

        /**
         *  Create a new image (media object) of the same format in a different size
         *
         *  Note: this assumes that the image file is already written to disk
         *  Note: this calls back a new object, the previous one is still in memory
         *
         *  @param  imageObj                {Object}    See description at top
         *  @param  [imageObj._id]          {String}    Of object in media collection, if any
         *  @param  [imageObj._transformOf] {String}    Of original object in media collection, if any
         *  @param  [imageObj._tempFiles]   {Object}    Array of files to clean up
         *  @param  imageObj._diskFile      {String}    Location of file on disk
         *  @param  imageObj.widthPx        {Number}    Current width, pixels
         *  @param  imageObj.heightPx       {Number}    Current height, pixels
         *  @param  imageObj.mime           {String}    MIME_TYPE of this image
         *  @param  [imageObj.mimeType]     {String}    mime/type used by some legacy code
         *  @param  toWidthPx               {Number}    Pixels, integer
         *  @param  toHeightPx              {Number}    Pixels, integer
         *  @param  callback                {Function}  of the form fn(err, newImageObj )
         */

        async function resizeImage( imageObj, toWidthPx, toHeightPx, callback ) {
            Y.log( 'resizeimage: ' + toWidthPx + 'x' + toHeightPx, 'debug', NAME );

            var newImageObj;
            let shellArgs = [];

            //  Check image and arguments
            if( 'string' === typeof toWidthPx ) {
                toWidthPx = parseInt( toWidthPx, 10 );
            }
            if( 'string' === typeof toHeightPx ) {
                toHeightPx = parseInt( toHeightPx, 10 );
            }

            if( isNaN( toWidthPx ) || isNaN( toHeightPx ) ) {
                callback( 'Invalid dimensions to resize: ' + (toWidthPx || 'NaN') + 'x' + (toHeightPx || 'NaN') );
                return;
            }

            //  Check that a valid size or placeholder value was passed MOJ-7937
            if( 0 > toWidthPx || 0 > toHeightPx ) {
                if( (-1 !== toWidthPx) && (0 > toWidthPx) ) {
                    Y.log( 'images.resize received invalid width: ' + toWidthPx, 'warn', NAME );
                    toWidthPx = Math.abs( toWidthPx );
                }
                if( (-1 !== toHeightPx) && (0 > toHeightPx) ) {
                    Y.log( 'images.resize received invalid height: ' + toWidthPx, 'warn', NAME );
                    toHeightPx = Math.abs( toHeightPx );
                }
            }

            //  If image exceeds max dimensions then use maximum width at original aspect, MOJ-10631
            if( toWidthPx > MAX_IMAGE_WIDTH ) {
                toWidthPx = MAX_IMAGE_WIDTH;
                toHeightPx = -1;
            }

            if( toHeightPx > MAX_IMAGE_HEIGHT ) {
                toHeightPx = MAX_IMAGE_HEIGHT;
            }

            if( 'IMAGE_SVG' === imageObj.mime || 'image/svg' === imageObj.mimeType ) {
                //  no point in trying to resize these as vector images, causes imagemagick to use a lot of memory
                callback( null, imageObj );
                return;
            }

            //  don't try to use this method for layered images, too many possible GIF features to work reliably
            if( 'IMAGE_GIF' === imageObj.mime ) {
                resizeAnimation( imageObj, toWidthPx, toHeightPx, callback );
                return;
            }

            if( !imageObj._tempFiles ) {
                imageObj._tempFiles = imageObj._tempFiles ? imageObj._tempFiles : [];
                imageObj._tempFiles.push( imageObj._diskFile );
            }

            //  Set up a new image object to hold the transform
            newImageObj = JSON.parse( JSON.stringify( imageObj ) );
            newImageObj._id = null;
            newImageObj._transformOf = imageObj._id || imageObj._transformOf || null;
            newImageObj.widthPx = toWidthPx;
            newImageObj.heightPx = toHeightPx;
            newImageObj._diskFile = Y.doccirrus.media.getTempFileName( newImageObj );
            newImageObj.transform = Math.ceil( toWidthPx ) + 'x' + Math.ceil( toHeightPx );

            Y.log( 'Entering resizeImage ' + (imageObj._id || '(transform)') + ' ' + toWidthPx + 'x' + toHeightPx, 'debug', NAME );
            Y.log( 'Assuming image has a single layer, resizing: ' + imageObj._diskFile, 'debug', NAME );

            var
                aspectSource = (imageObj.widthPx / imageObj.heightPx),
                aspectDest = (toWidthPx / toHeightPx),
                originalSize = imageObj.widthPx + 'x' + imageObj.heightPx,
                sizeLine = ('-1x-1' === originalSize) ? '' : ' -size ' + originalSize,
                cropWidthPx = 0,
                cropHeightPx = 0,
                cropDelta = 0;              //  difference in height/width due to aspect

            //  If toHeightPx is -1 then maintain aspect ratio of source
            if( -1 === toHeightPx ) {
                aspectDest = aspectSource;
                newImageObj.heightPx = Math.ceil( toWidthPx / aspectSource );

                if( newImageObj.heightPx > MAX_IMAGE_HEIGHT ) {
                    newImageObj.heightPx = MAX_IMAGE_HEIGHT;
                }

                newImageObj._aliasTransform = newImageObj.transform;
                newImageObj.transform = Math.ceil( newImageObj.widthPx ) + 'x' + Math.ceil( newImageObj.heightPx );
            }

            //  Work out which way we're cropping
            if( aspectSource === aspectDest ) {

                //  aspect ratios match, no need to crop
                shellArgs = [
                    sizeLine,
                    `"${imageObj._diskFile}"`,
                    '-resize',
                    newImageObj.transform,
                    `"${newImageObj._diskFile}"`
                ];
            }

            if( aspectSource < aspectDest ) {

                //  destination is relatively less tall, cropping vertically (eg, TV -> widescreen)
                //  crop half the vertical difference to center output

                cropWidthPx = imageObj.widthPx;
                cropHeightPx = Math.ceil( imageObj.widthPx / aspectDest );
                cropDelta = (imageObj.heightPx - cropHeightPx) / 2;

                if( cropHeightPx > MAX_IMAGE_HEIGHT ) {
                    cropHeightPx = MAX_IMAGE_HEIGHT;
                }

                shellArgs = [
                    sizeLine,
                    `"${imageObj._diskFile}"`,
                    '-crop',
                    `${cropWidthPx}x${cropHeightPx}+0+${cropDelta}`,
                    '-gravity center',
                    '-resize',
                    newImageObj.transform,
                    `"${newImageObj._diskFile}"`
                ];
            }

            if( aspectSource > aspectDest ) {

                //  destination is relatively taller, cropping horizontally (eg, widescreen -> TV)
                //  crop half the horizontal difference to center output

                cropWidthPx = Math.ceil( imageObj.heightPx * aspectDest );
                cropHeightPx = imageObj.heightPx;
                cropDelta = (imageObj.widthPx - cropWidthPx) / 2;

                if( cropHeightPx > MAX_IMAGE_HEIGHT ) {
                    cropHeightPx = MAX_IMAGE_HEIGHT;
                }

                shellArgs = [
                    sizeLine,
                    `"${imageObj._diskFile}"`,
                    '-crop',
                    `${cropWidthPx}x${cropHeightPx}+${cropDelta}+0`,
                    '-gravity center',
                    '-resize',
                    newImageObj.transform,
                    `"${newImageObj._diskFile}"`
                ];
            }

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'convert',
                        ...shellArgs
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            //  Debug information
            Y.log( 'Resizing file: ' + imageObj._diskFile + ' --> ' + newImageObj._diskFile, 'info', NAME );
            Y.log( 'Crop: ' + imageObj.widthPx + 'x' + imageObj.heightPx + ' (' + aspectSource + ') --> ' + toWidthPx + 'x' + toHeightPx + ' (' + aspectDest + ')', 'info', NAME );
            Y.log( '>> shell_exec: ' + shellCmd, 'info', NAME );

            if( !shellCmd ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid image, cannot resize' ) );
            }

            try {
                shellexec( shellCmd, onFileResized );
            } catch( execErr ) {
                Y.log( 'Problem executing resize of image: ' + JSON.stringify( execErr ), 'warn', NAME );
                return callback( execErr );
            }

            /**
             *  Callback from ImageMagick convert utility
             *
             *  @param  err     {String}    Error message or null
             *  @param  stdout  {String}    STDOUT of shell command
             *  @param  stderr  {String}    STDERR of shell command
             */

            function onFileResized( err, stdout, stderr ) {

                Y.log( 'onFileConverted() STDOUT: ' + stdout, 'info', NAME );         // should be empty

                if( err ) {
                    Y.log( 'STDERR: ' + stderr + ' err: ' + err, 'warn', NAME );
                    callback( 'Could not convert: ' + err, null );
                    return;
                }

                //Y.doccirrus.media.tempRemove(oldFileName, nullCallback );
                //Y.doccirrus.media.tempRemove(newFileName, nullCallback );

                //  requested file at source aspect ratio
                if( -1 === toHeightPx ) {
                    newImageObj.transform = newImageObj._aliasTransform;
                }

                //  note new temp file for cleanup later
                newImageObj._tempFiles = newImageObj._tempFiles ? newImageObj._tempFiles : [];
                newImageObj._tempFiles.push( newImageObj._diskFile );
                callback( null, newImageObj );
            }

        }

        /**
         *  Create a new image (media object) of the same format in a different size
         *
         *  This version is used for images with multiple layers or frames, such as asnimated gofs
         *
         *  Note: this calls back a new object, the previous one is still in memory
         *
         *  This was hastily migrated to new GridFS system, could use some tidying
         *
         *  @param  image       {Object}    See description at top
         *  @param  toWidthPx   {Number}    Pixels, integer
         *  @param  toHeightPx  {Number}    Pixels, integer
         *  @param  callback    {Function}  of the form fn(err, newImage)
         */

        function resizeAnimation( image, toWidthPx, toHeightPx, callback ) {

            Y.log( 'Entering resizeAnimation ' + image._id + ' ' + toWidthPx + 'x' + toHeightPx, 'debug', NAME );

            //  If image exceeds max dimensions then use maximum width at original aspect, MOJ-10631
            if( toWidthPx > MAX_IMAGE_WIDTH || toHeightPx > MAX_IMAGE_HEIGHT ) {
                toWidthPx = MAX_IMAGE_WIDTH;
                toHeightPx = -1;
            }

            var
                oldFileName,                                                            //  source animation
                flatFileName = Y.doccirrus.media.getTempFileName( image ),                //  flattened layers
                resizedFileName = Y.doccirrus.media.getTempFileName( image ),             //  resized animation
                croppedFileName = Y.doccirrus.media.getTempFileName( image ),             //  cropped animation
                repagedFileName = Y.doccirrus.media.getTempFileName( image ),             //  repaged animation

                transform = Math.ceil( toWidthPx ) + 'x' + Math.ceil( toHeightPx ),      //  transform name
                originalSize = image.widthPx + 'x' + image.heightPx,                    //  for ImageMagick

                aspectSource = (image.widthPx / image.heightPx),                        //  aspect of original viewport
                aspectDest = (toWidthPx / toHeightPx),                                  //  aspect of final viewport

                resize = {
                    'width': -1,                                                        //  width of resized animation
                    'height': -1                                                        //  height of resized animation
                },

                crop = {
                    'width': -1,                                                        //  width of cropped animation
                    'height': -1                                                        //  height of cropped animation
                },

                repage = {
                    'x': 0,                                                             //  repage offset x
                    'y': 0                                                              //  repage offset y
                },

                tempSide,                                                               //  make jslint happy

                newImageObj;

            let shellArgs = [];

            async.series(
                [
                    makeResizeCommand,
                    //writeFileToTemp,
                    coalesceImage,
                    resizeAllLayers,
                    cropAllLayers,
                    repageLayers,
                    getNewMeta
                ],
                onAllDone
            );

            //  1. work out which way we're cropping
            function makeResizeCommand( itcb ) {
                if( aspectSource === aspectDest ) {

                    //  aspect ratios match, no need to crop
                    shellArgs = [
                        '-size',
                        originalSize,
                        `"${flatFileName}"`,
                        '-repage',
                        '0x0',
                        '-resize',
                        transform,
                        `"${resizedFileName}"`
                    ];
                }

                if( aspectSource < aspectDest ) {

                    //  destination is relatively less tall, will be cropping vertically (eg, TV -> widescreen)
                    //  crop half the vertical difference to center output

                    resize.width = toWidthPx;
                    resize.height = Math.ceil( toWidthPx / aspectSource );

                    crop.width = toWidthPx;
                    crop.height = toHeightPx;
                    repage.y = (resize.height - crop.height) / 2;

                    shellArgs = [
                        '-size',
                        originalSize,
                        `"${flatFileName}"`,
                        '-repage',
                        '0x0',
                        '-resize',
                        `${resize.width}x${resize.height}`,
                        `"${resizedFileName}"`
                    ];
                }

                if( aspectSource > aspectDest ) {

                    //  destination is relatively taller, will be cropping horizontally (eg, widescreen -> TV)
                    //  crop half the horizontal difference to center output

                    resize.width = Math.ceil( toHeightPx * aspectSource );
                    resize.height = toHeightPx;

                    tempSide = toHeightPx;
                    crop.width = tempSide;
                    tempSide = toWidthPx;
                    crop.height = tempSide;

                    repage.x = (resize.width - crop.width) / 2;

                    shellArgs = [
                        '-size',
                        originalSize,
                        `"${flatFileName}"`,
                        '-repage',
                        '0x0',
                        '-resize',
                        `${resize.width}x${resize.height}`,
                        `"${resizedFileName}"`
                    ];
                }
                itcb( null );
            }

            /*
            function writeFileToTemp( itcb ) {
                //  skip this step if the file is already written to disk
                if ( image._diskFile ) { return itcb( null ); }

             var mediaId = image._id || image._transformOf;
                Y.log( 'Resize: saving to temp directory', 'info', NAME );


                /-**
                 *  On saving, check for image formats with multiple layers, these will need to be flattened
                 *  or coalesced before resizing
                 *
                 *  @param  err             {String}    Error message or null
                 *  @param  tempFileName    {String}    Location of file in local /var/imagetmp/
                 *-/

                function onSavedToTempDir(err, tempFileName) {

                    if( err ) {
                        Y.log( 'Could not make temp image: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    oldFileName = tempFileName;     //  keep filename in parent context for unlinking later
                    itcb( null );
                }

             image._diskFile = Y.doccirrus.media.getTempFileName( image );
                Y.doccirrus.media.gridfs.exportFile( user, mediaId, image._diskFile, false, onSavedToTempDir);
            }
             */

            async function coalesceImage( itcb ) {

                /**
                 *  Callback from ImageMagick coalesce operation, all image layers should now be the same size
                 *
                 *  see: http://www.imagemagick.org/script/convert.php
                 *  see: http://askubuntu.com/questions/257831/how-can-i-resize-an-animated-gif-file-using-imagemagick
                 *
                 *  @param  err
                 *  @param  stdout
                 *  @param  stderr
                 */

                function onCoalesced( err, stdout, stderr ) {

                    if( err ) {
                        Y.log( 'resizeImage() coalesce STDERR: ' + stderr, 'warn', NAME );
                        Y.log( 'Could not coalesce layers of this animation: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    if( '' !== stdout ) {
                        Y.log( 'resizeImage() coalesce STDOUT: ' + stdout, 'debug', NAME );
                    }

                    itcb( null );
                }

                oldFileName = image._diskFile;

                let [err, coalesceCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            `"${oldFileName}"`,
                            '-coalesce',
                            '-repage',
                            '0x0',
                            `"${flatFileName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                Y.log( 'Coalescing layers: ' + coalesceCmd, 'debug', NAME );
                shellexec( coalesceCmd, onCoalesced );
            }

            async function resizeAllLayers( itcb ) {

                /**
                 *  Callback from ImageMagick resize operation, all image layers should now be scaled to a width or height
                 *  which will minimize crop.
                 *
                 *  @param  err
                 *  @param  stdout
                 *  @param  stderr
                 */

                function onResized( err, stdout, stderr ) {

                    if( err ) {
                        Y.log( 'resizeImage() resize STDERR: ' + stderr, 'warn', NAME );
                        Y.log( 'Could not resize all layers of this animation: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    if( '' !== stdout ) {
                        Y.log( 'resizeImage() resize STDOUT: ' + stdout, 'debug', NAME );
                    }

                    itcb( null );
                }

                let [err, resizeCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            ...shellArgs
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                Y.log( 'Resizing file: ' + flatFileName + ' --> ' + resizedFileName, 'info', NAME );
                Y.log( 'Resizing layers: ' + resizeCmd, 'debug', NAME );
                shellexec( resizeCmd, onResized );
            }

            async function cropAllLayers( itcb ) {

                /**
                 *  Callback from ImageMagick crop operation, all image layers should now be at final size, but viewport
                 *  may need to be adjusted
                 *
                 *  @param  err     {String}    Error message or null
                 *  @param  stdout  {String}    STDOUT of shell command
                 *  @param  stderr  {String}    STDERR of shell command
                 */

                function onCropped( err, stdout, stderr ) {
                    Y.log( 'resizeImage() crop STDOUT: ' + stdout, 'debug', NAME );

                    if( err ) {
                        Y.log( 'resizeImage() crop STDERR: ' + stderr, 'warn', NAME );
                        Y.log( 'Could not crop all layers of this animation: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( null );
                    }

                    itcb( null );
                }

                let [err, cropCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            `"${resizedFileName}"`,
                            '-crop',
                            `${transform}+${repage.x}+${repage.y}`,
                            `"${croppedFileName}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                Y.log( 'Cropping file: ' + resizedFileName + ' --> ' + croppedFileName, 'info', NAME );
                Y.log( 'Cropping all layers: ' + cropCmd, 'debug', NAME );
                shellexec( cropCmd, onCropped );
            }

            async function repageLayers( itcb ) {
                /**
                 *  Callback from ImageMagick convert utility
                 *
                 *  @param  err     {String}    Error message or null
                 *  @param  stdout  {String}    STDOUT of shell command
                 *  @param  stderr  {String}    STDERR of shell command
                 */

                function onRepaged( err, stdout, stderr ) {

                    Y.log( 'onFileRepaged() STDOUT: ' + stdout, 'info', NAME );         // should be empty

                    if( err ) {
                        Y.log( 'STDERR: ' + stderr, 'warn', NAME );
                        Y.log( 'Could not repage: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    itcb( null );
                }

                let [err, repageCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'gm',
                        shellArgs: [
                            'convert',
                            `"${croppedFileName}"`,
                            '+repage',
                            `"${repagedFileName}"`
                        ]
                    } )
                );

                if( err ) {
                    return callback( err );
                }

                Y.log( 'Repaging layers: ' + repageCmd, 'debug', NAME );
                shellexec( repageCmd, onRepaged );
            }

            function getNewMeta( itcb ) {

                /**
                 *  Done creating resized image, clean up before calling back
                 *
                 *  @param  err             {String}    Error message or null
                 *  @param  resizedImage    {Object}    A media object with image metadata
                 */

                function onResizedImageLoaded( err, resizedImage ) {
                    if( err ) {
                        Y.log( 'Could not load resized image: ' + JSON.stringify( err ), 'debug', NAME );
                        return itcb( null );
                    }

                    //  commented out for debugging
                    //Y.doccirrus.media.tempRemove(oldFileName);
                    //Y.doccirrus.media.tempRemove(flatFileName);
                    //Y.doccirrus.media.tempRemove(resizedFileName);
                    //Y.doccirrus.media.tempRemove(croppedFileName);

                    newImageObj = resizedImage;
                    newImageObj._id = null;
                    newImageObj._transformOf = image._id || image._transformOf;
                    newImageObj._diskFile = repagedFileName;
                    newImageObj._tempFiles = [
                        repagedFileName,
                        croppedFileName,
                        resizedFileName,
                        oldFileName
                    ];
                    resizedImage.transform = transform;

                    itcb( null );
                }

                imageFromFile( repagedFileName, image._id.toString(), transform, onResizedImageLoaded );
            }

            //  TODO: cleanup step here

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Could not resize animation: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, newImageObj );
            }

        }   // end resizeAnimation

        /**
         *  Change the format of an image (calls back a new image / media object)
         *
         *  This expects that the file is already on disk
         *
         *  @param  imageObj                {Object}    see top of this file
         *  @param  imageObj._diskFile      {String}    Location of file on disk
         *  @param  imageObj.mime           {String}    Format of file on disk (IMAGE_PNG|IMAGE_JPEG|IMAGE_GIF)
         *  @param  [imageObj._id]          {String}    Database _id of this object (may not be saved to database)
         *  @param  [imageObj._transformOf] {String}    Database _id of original object (if any)
         *  @param  [imageObj._tempFiles]   {Object}    Array of files to clean up
         *  @param  mime                    {String}    Format to transcode to (IMAGE_PNG|IMAGE_JPEG|IMAGE_GIF)
         *  @param  callback                {Function}  Of ths form fn( err, newImageObj )
         */

        async function transcodeImage( imageObj, mime, callback ) {
            var newImageObj;

            //  Check the given image meta object

            if( !imageObj._diskFile || '' === imageObj._diskFile ) {
                //  no file to convert
                return callback( Y.doccirrus.errors.rest( 500, 'Missing disk file, cannot transcode' ) );
            }

            if( imageObj.mime === mime ) {
                //  nothing to do
                return callback( null, imageObj );
            }

            if( !imageObj._tempFiles ) {
                imageObj._tempFiles = [imageObj._diskFile];
            }

            //  Create a new image meta object for the transform
            newImageObj = JSON.parse( JSON.stringify( imageObj ) );
            newImageObj.mime = mime;
            newImageObj.mimeType = Y.doccirrus.media.getMimeType( mime );
            newImageObj._diskFile = Y.doccirrus.media.getTempFileName( newImageObj );
            newImageObj._transformOf = imageObj._id || imageObj._transformOf || null;
            newImageObj._id = null;

            Y.log( 'Changing image format from ' + imageObj.mime + ' to ' + newImageObj.mime, 'info', NAME );

            var frameNumber = ('IMAGE_GIF' === imageObj.mime) ? '[0]' : '';

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'convert',
                        `"${imageObj._diskFile}${frameNumber}"`,
                        `"${newImageObj._diskFile}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( '>> exec: ' + shellCmd, 'debug', NAME );
            shellexec( shellCmd, onImageTranscoded );

            /**
             *  After by ImageMagick convert
             *
             *  @param  err     {String}    Null or error message
             *  @param  stdout  {String}    STDOUT returned by ImageMagick convert
             *  @param  stderr  {String}    STDERR returned by ImageMagick convert
             */

            function onImageTranscoded( err, stdout, stderr ) {

                Y.log( 'transcodeImage() STDOUT: ' + stdout, 'info', NAME );
                Y.log( 'trancodeImage() STDERR: ' + stderr, 'info', NAME );

                if( err ) {
                    Y.log( 'STDERR: ' + stderr, 'warn', NAME );
                    callback( 'Could not change image format: ' + err, null );
                    return;
                }

                //  note the new temp file for cleanup
                newImageObj._tempFiles = newImageObj._tempFiles ? newImageObj._tempFiles : [];
                newImageObj._tempFiles.push( newImageObj._diskFile );
                callback( null, newImageObj );
            }
        }

        function getPdfImageKey( subElem ) {
            var
                fixAspect = ( subElem.hasOwnProperty('imgFixed') && true === subElem.imgFixed ) ? 'fixed' : '',
                imgKey = subElem.imgId + '_' + subElem.width + 'x' + subElem.height + '_' + fixAspect;

            //  MOJ-8655 Sprite images now follow foreground color: re-use in cache only if same size and color
            if ( subElem.imgId && ':' === subElem.imgId.substr( 0, 1 ) && subElem.fgColor ) {
                imgKey = imgKey + '_c' + subElem.fgColor;
            }

            imgKey = imgKey.replace(':', '');
            imgKey = imgKey.replace('.', '_');
            imgKey = imgKey.replace(',', '__');
            imgKey = imgKey.replace(',', '__');

            return imgKey;
        }

        /**
         *  Private method to load an image/transform to the temp directory for use by HPDF
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  subElem     {Object}    A page element which specifies an image
         *  @param  callback    {Function}  Of the form fn( err, tempFileName, mime )
         */

        function preparePdfImage( user, subElem, callback ) {

            var
                cacheDir = Y.doccirrus.media.getCacheDir(),
                mediaObj,
                mime,
                spriteFile = null,
                opts = {};

            if ( ':' === subElem.imgId.substring(0, 1) ) {
                // MOJ-8655 Colored sprites according to fgColor
                Y.log( 'Image is a sprite, compositing as mask: ' + subElem.imgId + ' ' + subElem.fgColor, 'debug', NAME );
                return preparePdfSprite( user, subElem, callback );
            }

            if ( '!' === subElem.imgId.substring(0, 1) ) {
                //  MOJ-8754 Literal temp JPEG image created on server, not present in database
                return callback( null, subElem.imgId.substr( 1 ), 'IMAGE_JPEG' );
            }

            if ( '%' === subElem.imgId.substring(0, 1) ) {
                //  MOJ-8754 Literal temp PNG image created on server, not present in database
                subElem.toCleanUp = subElem.imgId.substr( 1 );
                return callback( null, subElem.imgId.substr( 1 ), 'IMAGE_PNG' );
            }

            async.series(
                [
                    checkIfSprite,
                    setupOpts,
                    checkCache,
                    loadImageFromDb,
                    loadFileFromGridFS,
                    handleSvgImages,
                    makeTransform,
                    cleanTempFiles
                ],
                onAllDone
            );

            //  1. Check if this is a static sprite (eg, a checkbox graphic), sprites begin with ':'
            function checkIfSprite( itcb ) {
                //  form sprites / assets are prefixed with a colon, to distinguish from user images
                if ( ':' !== subElem.imgId.substring(0, 1) ) { return itcb( null ); }

                spriteFile = '/mojits/FormEditorMojit/assets/images/' + subElem.imgId.replace(':', '');
                spriteFile = Y.doccirrus.media.pathIsInDir(spriteFile, '/mojits/FormEditorMojit/assets/images/');
                spriteFile = process.cwd() + spriteFile;
                mime = 'IMAGE_PNG';
                itcb( null );
            }

            //  2. Make transform / cache options for this subElement
            function setupOpts( itcb ) {
                var
                    //  scale resolution of images, in pixels per postscript point
                    scaleResolution = subElem.printResolution ? subElem.printResolution : 1,
                    resolution = Y.doccirrus.media.hpdf.getImageResolution() * scaleResolution,
                    scaleWidth = parseInt( subElem.width * resolution, 10 ),
                    scaleHeight = parseInt( subElem.height * resolution, 10 );

                opts = {
                    '_id': subElem.imgId,
                    'widthPx': scaleWidth,
                    'heightPx': scaleHeight,
                    'transform': scaleWidth + 'x' + scaleHeight,
                    '_fixAspect': ( subElem.hasOwnProperty('imgFixed') && true === subElem.imgFixed ),
                    //  always use jpeg images in PDF (may change in future)
                    'mime': 'IMAGE_JPEG'
                };

                if ( opts._fixAspect ) {
                    opts.heightPx = -1;
                    opts.transform = scaleWidth + 'x-1';
                }

                itcb( null );
            }

            //  3. Check if this image/transform has already been generated
            function checkCache( itcb ) {
                //  if we already have a file we can skip this step
                if ( spriteFile ) { return itcb( null ); }

                function onCacheCheck( err, inCache, cacheFileName ) {
                    if ( err ) {
                        Y.log( 'Error while checking disk cache: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    if ( inCache ) {
                        Y.log( 'Image to embed in PDF exists in cache: ' + spriteFile + ' ' + mime, 'debug', NAME );

                        mime = Y.doccirrus.media.getCacheMime( cacheFileName );
                        spriteFile = cacheFileName;
                        return itcb( null );
                    }

                    Y.log( 'Embedded PDF image not in cache, generating...', 'debug', NAME );

                    //  not in cache, continue with next step
                    itcb( null );
                }

                Y.doccirrus.media.cacheHas( opts, onCacheCheck );
            }

            //  4. Load image metadata from media collection
            function loadImageFromDb( itcb ) {
                //  if we already have a file we can skip this step
                if ( spriteFile ) { return itcb( null ); }

                function onImageLoaded(err, foundMedia) {
                    if ( !err && !foundMedia ) {
                        err = Y.doccirrus.errors.rest( 404, 'Could not find media: ' + subElem.imgId, true );
                    }

                    if ( err ) {
                        Y.log( 'Could not load image for transform into PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    mediaObj = foundMedia;
                    mime = mediaObj.mime;

                    Y.log( 'Loaded ' + mime + ' metadata for inclusion in PDF: ' + subElem.imgId, 'debug', NAME );
                    itcb( null );
                }

                Y.log( 'Loading media metadata from database: ' + subElem.imgId, 'debug', NAME );
                Y.doccirrus.media.mediaFromDB(user, subElem.imgId, onImageLoaded);
            }

            //  5. Load file from GridFS to temp directory
            function loadFileFromGridFS( itcb ) {
                //  if we already have a file we can skip this step
                if ( spriteFile ) { return itcb( null ); }

                mediaObj._diskFile = Y.doccirrus.media.getTempFileName( mediaObj );
                Y.log( 'Loading media from GridFS to: ' + mediaObj._diskFile, 'debug', NAME );
                Y.doccirrus.media.gridfs.exportFile( user, mediaObj._id, mediaObj._diskFile, false, itcb );
            }

            //  6. SVG images are handled differently, either rasterized or drawn directly into the PDF as paths
            function handleSvgImages( itcb ) {
                //  if we already have a file we can skip this step
                if ( spriteFile ) { return itcb( null ); }

                //  if not an SVG we can skip this step
                if ('IMAGE_SVG' !== mediaObj.mime) { return itcb( null ); }

                function onFileRead( err, xmlSvg) {
                    if ( err ) {
                        Y.log( 'Could not read SVG data from disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    spriteFile = xmlSvg.toString( 'utf-8' );

                    //  clean up the SVG in temp
                    mediaObj._tempFiles = mediaObj._tempFiles ? mediaObj._tempFiles : [];
                    mediaObj._tempFiles.push( mediaObj._diskFile );
                    itcb( null );
                }

                //  SVG are drawn directly as PDF paths and text spans
                //  HACK: raw SVG XML is returned instead of a filename

                var tempDir = Y.doccirrus.media.getTempDir();
                Y.doccirrus.media.readFile( mediaObj._diskFile, tempDir, onFileRead );
            }

            //  7. Make transform of a raster image at print resolution
            function makeTransform( itcb ) {
                //  if we already have a file we can skip this step
                if ( spriteFile ) { return itcb( null ); }

                function onTransformCached( err, cacheFileName ) {
                    if ( err ) { return itcb( err ); }

                    Y.log( 'Created and cached transform: ' + cacheFileName, 'debug', NAME );

                    spriteFile = cacheDir + cacheFileName;
                    mime = Y.doccirrus.media.getCacheMime( cacheFileName );
                    itcb( null );
                }

                mediaObj._tempFiles = mediaObj._tempFiles ? mediaObj._tempFiles : [];
                mediaObj._tempFiles.push( mediaObj._diskFile );
                Y.doccirrus.media.images.transform( user, mediaObj, opts, onTransformCached );
            }

            //  8. Remove intermediate files
            function cleanTempFiles( itcb ) {
                //  skip this step if nothing to clean up
                if ( !mediaObj || !mediaObj._tempFiles ) { return itcb( null ); }

                Y.log( 'Removing intermediate files: ' + JSON.stringify( mediaObj._tempFiles ), 'debug', NAME );
                Y.doccirrus.media.cleanTempFiles( mediaObj );
                itcb( null );
            }

            //  Finally, callback to hpdf.server.js with location of transform on disk
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not prepare image transform for PDF: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, spriteFile, mime );
            }

        }

        function preparePdfSprite( user, subElem, callback ) {
            var
                //  scale resolution of images, in pixels per postscript point
                resolution = Y.doccirrus.media.hpdf.getImageResolution(),
                scaleWidth = parseInt( subElem.width * resolution, 10 ),
                scaleHeight = parseInt( subElem.height * resolution, 10 ),

                cnv,
                ctx,

                cnvImg,
                mime = 'IMAGE_PNG',
                spriteFile,

                tempFile = Y.doccirrus.media.getTempFileName( { 'mime': mime, 'transform': 'sprite' } );

            async.series( [ getSpriteFileName, createSpriteCanvas, loadImageToCanvas, saveCanvasToFile ], onAllDone );

            function getSpriteFileName( itcb ) {
                //  form sprites / assets are prefixed with a colon, to distinguish from user images
                if ( ':' !== subElem.imgId.substring(0, 1) ) { return itcb( null ); }

                spriteFile = '/mojits/FormEditorMojit/assets/images/' + subElem.imgId.replace( ':', '' );
                spriteFile = Y.doccirrus.media.pathIsInDir( spriteFile, '/mojits/FormEditorMojit/assets/images/' );
                spriteFile = process.cwd() + spriteFile;

                Y.log( 'Sprite file name (abs): ' + spriteFile, 'debug', NAME );

                itcb( null );
            }

            function createSpriteCanvas( itcb ) {
                Y.log( 'Creating node canvas to composite sprite: ' + scaleWidth + 'x' + scaleHeight, 'debug', NAME );
                cnv = Y.dcforms.makeCanvasObject( scaleWidth, scaleHeight );
                ctx = cnv.getContext( '2d' );
                itcb( null );
            }

            function loadImageToCanvas( itcb ) {
                fs.readFile( spriteFile, onFileLoaded );

                async function onFileLoaded( err, spriteBuffer ) {

                    if ( err ) {
                        Y.log( 'Could not read sprite PNG from disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    cnvImg = new Image();
                    cnvImg.src = spriteBuffer;

                    ctx.fillStyle = subElem.fgColor;
                    ctx.fillRect( 0, 0, cnv.width, cnv.height );

                    ctx.globalCompositeOperation = 'destination-in';

                    ctx.drawImage(
                        cnvImg,                                     //  image
                        0, 0,                                       //  source x, source y
                        cnvImg.width, cnvImg.height,                //  source width, source height
                        0, 0,                                       //  dest x, dest y
                        cnv.width, cnv.height                       //  dest width, dest height
                    );

                    ctx.globalCompositeOperation = 'source-over';   //  default

                    itcb( null );
                }
            }

            /* More efficient, but currently producing PNGs incompatible with HPDF.js
            function saveCanvasToFile( itcb ) {
                var
                    streamHandle = fs.createWriteStream( tempFile ),
                    pngStream = cnv.pngStream();

                //console.log( '(****) writing canvas to temp PNG by stream: ', tempFile );

                pngStream.on( 'data', onPngChunk );
                pngStream.on( 'end', onPngWritten );

                function onPngChunk( chunk ) {
                    //console.log( '(****) writing chunk to temp file: ', tempFile );
                    streamHandle.write( chunk );
                }

                function onPngWritten() {
                    itcb( null );
                }
            }
            */

            function saveCanvasToFile( itcb ) {
                var
                    dataURI = cnv.toDataURL( 'image/png' ),
                    parts = dataURI.split( ';base64,', 2 ),
                    imgBuffer = new Buffer( parts[1], 'base64' );

                fs.writeFile( tempFile, imgBuffer, 'utf8', itcb );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not create image from sprite: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err );
                }

                callback( null, tempFile, mime );
            }
        }

        /*
         *  MediaMojit images API
         */

        Y.namespace( 'doccirrus.media' ).images = {
            'initialize': initialize,
            'normalize': normalize,
            'transform': transform,
            'resize': resizeImage,
            'imageFromFile': imageFromFile,
            'imageFromUpload': imageFromUpload,         //  DEPRECATED
            'transcode': transcodeImage,
            'expandMeta': expandMeta,                   //  DANGEROUS, SSI
            'identify': identify,                       //  DANGEROUS, SSI
            'preparePdfImage': preparePdfImage,
            'getPdfImageKey': getPdfImageKey,
            'getExifData': getExifData,
            'applyExifOrientation': applyExifOrientation
        };

    },
    '0.0.1', {requires: [ 'dcforms-canvas-utils' ] }
);