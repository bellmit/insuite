/*
 * Copyright (c) 2016 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  This module converts between different file types as requested by the dcmedia middleware
 */

/*jslint latedef:false */
/*global YUI */



YUI.add( 'dcmedia-transform', function( Y, NAME ) {

        var async = require( 'async' );
    
        /**
         *  Scale, crop or convert a file from GridFS
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  opts            {Object}    Interpreted from the requested URL by dcmedia middleware
         *  @param  opts._id        {String}    Database _id of a media object
         *  @param  opts._transform {String}    Name of an oprtation to perform on a GridFS file
         *  @param  opts.widthPx    {Number}    Width of requested transform (pixels)
         *  @param  opts.heightPx   {Number}    Height of requested transform (pixels)
         *  @param  opts._cacheFile {String}    Disk location to store transform when generated
         *  @param  opts.mime       {String}    Requested MIME_TYPE of transformed file
         *  @param  callback        {Function}  Of the form fn( err, cacheFileName )
         */
    
        function createTransform( user, opts, callback ) {
            var
                cacheDir = Y.doccirrus.media.getCacheDir(),
                mediaObj;

            //Y.log( 'called createTransform, opts: ' + JSON.stringify( opts ), 'debug', NAME );

            if( false === opts.hasOwnProperty( '_id' ) ) {
                Y.log('Client requested media trasform, but media _id not given.', 'warn', NAME);
                callback( Y.doccirrus.errors.rest( 400, 'Client requested media download, but document id not given.', true ) );
                return;
            }

            async.series(
                [
                    setDefaultParameters,
                    loadMediaFromDatabase,
                    selectTransform
                ],
                onAllDone
            );

            //  1. Check supplied params amd set defaults

            function setDefaultParameters( itcb ) {
                if ( false === opts.hasOwnProperty( 'widthPx' )) {
                    opts.widthPx = -1;
                }

                if ( false === opts.hasOwnProperty( 'heightPx' )) {
                    opts.heightPx = -1;
                }

                //  if no mime type was requested we'll assume the mime type of the mediaObj
                if ( false === opts.hasOwnProperty( 'mime' )) {
                    opts.mime = '';
                }

                //  '-1x-1' is an alias for 'original'
                if ( -1 === opts.heightPx && -1 === opts.widthPx && -1 === opts._pdfpage ) {
                    opts.transform = 'original';
                }

                itcb( null );
            }
            
            //  2. Get metadata object from media collection
            function loadMediaFromDatabase( itcb ) {

                //  try load the media object from the database and copy the file to 
                Y.doccirrus.media.mediaFromDB( user, opts._id, onDbLoadMedia );

                /**
                 *  metadata document loaded from database
                 *
                 *  @param  err             {String}    Error message or null
                 *  @param  mediaMetaObj    {Object}    Single media object
                 */

                function onDbLoadMedia( err, mediaMetaObj ) {
                    if ( err ) {
                        Y.log( 'Could not load media from database: ' + JSON.stringify( err ), 'warn', NAME);
                        return itcb( err );
                    }
                    Y.log( 'Media loaded from database: ' + mediaMetaObj._id, 'debug', NAME );
                    mediaMetaObj.source = '';
                    mediaObj = JSON.parse( JSON.stringify( mediaMetaObj ) );
                    mediaObj._id = mediaObj._id.toString();
                    itcb( null );
                }
            }

            //  3. Select transform to apply given media and request
            function selectTransform( itcb ) {

                function onTransform( err, newCacheFile ) {
                    if ( err ) { return itcb( err ); }
                    opts._cacheFile = newCacheFile;
                    itcb( err );
                }

                //  If no mime type was expecitly requested we'll assume the mime type of the mediaObj
                if ( '' === opts.mime ) { opts.mime = mediaObj.mime; }

                //  Categories of different mime types to simplify rule making
                opts._category = Y.doccirrus.media.types.getCategory( opts.mime );
                mediaObj._category = Y.doccirrus.media.types.getCategory( mediaObj.mime );

                //  Video and audio files cannot be transformed on the server at present
                if ( 'video' === opts._category || 'audio' === opts._category ) {
                    opts.transform = 'original';
                }

                //  MS Office / LibreOffice / OpenOffice documents are untransformed at this point
                if ( 'document' === mediaObj._category && 'APPLICATION_PDF' !== mediaObj.mime ) {
                    opts.mime = mediaObj.mime;          //  TODO: fix parsing of periods in URL MIME section
                    opts.transform = 'original';
                }

                //  TFData and XMl documents are untransformed
                if ( 'tfdata' === mediaObj._category ) {
                    opts.mime = mediaObj.mime;          //  TODO: fix parsing of periods in URL MIME section
                    opts.transform = 'original';
                }

                //  Rewrite the _cacheFile in standard form
                //  This is correct missing or incorrect parts, resist directory traversal attacks
                opts._cacheFile = Y.doccirrus.media.getCacheFileName( opts, false );
                Y.log( 'Cache filename rewritten to: ' + opts._cacheFile );

                //  If the user just wants to download the file as uploaded/generated, then we can stream from GridFS
                //  to the cache directory
                if ( 'original' === opts.transform && opts.mime === mediaObj.mime ) {
                    Y.log( 'Caching untransformed file: ' + opts._cacheFile );
                    mediaObj._diskFile = cacheDir + opts._cacheFile;
                    Y.doccirrus.media.gridfs.exportFile( user, mediaObj._id, mediaObj._diskFile, false, itcb );
                    return;
                }

                //  If a single PDF page as image has been requested (ie, exporting at PDF resolution, not request resolution)
                if ( 'APPLICATION_PDF' === mediaObj.mime && 'pdfpage' === opts.transform.substr( 0, 7 ) ) {
                    if ( 'IMAGE_JPG' !== opts.mime && 'IMAGE_PNG' !== opts.mime && 'IMAGE_JPEG' !== opts.mime ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Can not convert PDF to ' + opts.mime, true ) );
                    }

                    if ( isNaN( opts._pdfpage ) ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Invalid page No ' + opts._pdfpage, true ) );
                    }

                    Y.log('Extracting page ' + opts._pdfpage + ' from PDF: ' + mediaObj._id, 'debug', NAME);
                    Y.doccirrus.media.pdf.getPageAsImage( user, mediaObj, opts._pdfpage, opts.widthPx, opts.heightPx, itcb );
                    return;
                }

                //  If the media is a PDF, and the user requested something else then we will need to convert the PDF
                if ( 'APPLICATION_PDF' === mediaObj.mime && 'APPLICATION_PDF' !== opts.mime ) {
                    if ( 'IMAGE_JPG' !== opts.mime && 'IMAGE_PNG' !== opts.mime && 'IMAGE_JPEG' !== opts.mime ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Can not convert PDF to ' + opts.mime, true ) );
                    }
                    
                    Y.log('Extracting page from PDF: ' + mediaObj._id, 'debug', NAME);
                    Y.doccirrus.media.pdf.getPageAsImage( user, mediaObj, 0, opts.widthPx, opts.heightPx, itcb );
                    return;
                }

                //  If the media and the transform are both png or jpg, we can resize quickly in memory
                //  TODO: implement
                if (
                    ( 'IMAGE_PNG' === opts.mime || 'IMAGE_JPG' === opts.mime || 'IMAGE_JPEG' === opts.mime ) &&
                    ( 'IMAGE_PNG' === mediaObj.mime || 'IMAGE_JPG' === mediaObj.mime || 'IMAGE_JPEG' === mediaObj.mime)
                ) {
                    Y.log( 'TODO: implement fast canvas resize from GridFS to cache.', 'warn', NAME );
                }

                //  If the media is an SVG and the user requested something else then we will have to rasterize it
                if ( 'IMAGE_SVG' === mediaObj.mime ) {
                    Y.doccirrus.media.svgraster.svgToJpegCache( user, mediaObj, opts, itcb );
                    return;
                }

                //  Images can be scaled, cropped and format shifted
                if ( 'image' === opts._category && 'image' === mediaObj._category ) {
                    Y.doccirrus.media.images.transform( user, mediaObj, opts, onTransform );
                    return;
                }

                //  Requested transform not understood or not supported
                itcb( Y.doccirrus.errors.rest( 500, 'Unrecognized transform against ' + mediaObj.mime + ': ' + JSON.stringify( opts ) ) );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not create image transform: ' + JSON.stringify( err ), 'debug', NAME );
                    return callback( err );
                }

                //  experimental hard redirect with express
                callback( null, opts._cacheFile );
            }

        }

        Y.namespace( 'doccirrus.media' ).transform = {
            'create': createTransform
        };

    },
    '0.0.1', {requires: [
        'dcmedia-images'
    ]}
);