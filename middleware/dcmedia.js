/*
 * Copyright (c) 2016 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  Middleware to manage media caching, transforms and downloads from GridFS
 *
 *  Usage:
 *
 *      /media/
 *      /media/<mediaId>_<width>x<height>.<mime_type>.<ext>
 *
 *      OR:
 *
 *      /media/grid_<fileName>
 */

"use strict";
var
    async = require( 'async' ),
    fs = require( 'fs' ),

    NAME = 'dcmedia',
    YY;

/**
 *  Interpret a URL passed to this component
 *
 *  @param  urlStr  {String}
 *  @returns        {Object}
 */

function expandUrl( urlStr ) {
    var
        parts = [ urlStr.replace( '/media/', '' ) ],
        urlObj = {
            'method': 'download',
            'transform': 'original',
            'mime': '',
            'widthPx': -1,
            'heightPx': -1,
            '_ext': '',
            '_fixAspect': false,
            '_id': '',
            '_toDataUri': false,
            '_cacheFile': parts[0] + '',
            '_inCache': false,
            '_category': '',
            '_pdfpage': -1
        };

    //  get MIME_TYPE (may contain periods) TODO: handle multiple periods in MIME string
    parts = parts[0].split( '.' );
    if ( parts[1] && '' !== parts[1] ) { urlObj.mime = parts[1].toUpperCase(); }
    if ( parts[2] && '' !== parts[2] ) { urlObj.ext = parts[2].toLowerCase(); }

    //  get media _id and transform
    parts = parts[0].split( '_' );
    if ( parts[0] && '' !== parts[0] ) { urlObj._id = parts[0]; }
    if ( parts[1] && '' !== parts[1] ) { urlObj.transform = parts[1]; }

    //  get transform size
    if ( -1 !== urlObj.transform.indexOf( 'x' ) ) {
        parts = urlObj.transform.split( 'x' );
        urlObj.widthPx = parseInt( parts[0], 10);
        urlObj.heightPx = parseInt( parts[1], 10);

        if ( isNaN( urlObj.widthPx ) ) { urlObj.widthPx = -1; }
        if ( isNaN( urlObj.heightPx ) ) { urlObj.heightPx = -1; }
    }

    //  if the aspect is fixed then we don't know what height we are requesting in advance
    if ( -1 === urlObj.heightPx ) {
        urlObj._fixAspect = true;
    }

    if ( urlObj.transform && 'pdfpage' === urlObj.transform.substr( 0, 7 ) ) {
        urlObj._pdfpage = parseInt( urlObj.transform.replace( 'pdfpage', '' ), 10 );
    } else {
        if ( -1 !== urlObj.widthPx || -1 !== urlObj.heightPx ) {
            urlObj.transform = 'resize';
        } else {
            urlObj.transform = 'original';
        }
    }

    if ( 'datauri' === urlObj.transform ) {
        urlObj.transform = 'original';
        urlObj._toDataUri = true;
    }
    
    return urlObj;
}

/**
 *  Middleware components must either respond to the request or call next() to pass to next component
 *
 *  @param  req     {Object}    Express request
 *  @param  res     {Object}    Express response
 *  @param  next    {Function}  Pass control to next component
 */

function handle( req, res, next ) {

    //  MOJ-8207 Alias /media/ routes to /2/media
    if ( '/2/media/' === req.url.substr( 0, 9 ) ) {
        YY.log( 'Matched URL as alias of /media/: ' + req.url, 'debug', NAME );
        req.url = req.url.replace( '/2/media/', '/media/' );
    }

    //  should not happen, app.get should not route here
    if ( '/media/' !== req.url.substr( 0, 7 ) ) {
        YY.log( 'Not a dcmedia route, passing to next handler', 'debug', NAME );
        next();
        return;
    }

    //  In special cases we store a file directly in GridFS, with no media object, and stream it on request
    //  This is used for compiled batch PDFs, ZIP files, etc, or direct access to raw files
    if ( '/media/grid_' === req.url.substr( 0, 12 ) ) {
        YY.doccirrus.media.gridfs.streamToClient( req.url.substr( 12 ), req, res );
        return;
    }

    var urlObj = expandUrl( req.url );

    async.series( [ checkCache, makeTransform, statSize, auditMediaOpening ], onAllDone );

    //  1. Check if the requested transform / object already exists in the cache
    function checkCache( itcb ) {
        function onCacheCheck( err, inCache ) {
            if ( err ) { return itcb( err ); }
            YY.log( 'File is in cache: ' + ( inCache ? 'TRUE' : 'FALSE' ), 'debug', NAME );
            urlObj._inCache = inCache;

            //  rebuild the filename for security and validation
            urlObj._cacheFile = YY.doccirrus.media.getCacheFileName( urlObj, false );

            itcb( null );
        }

        YY.log( 'Checking disk cache for: ' + urlObj._cacheFile, 'debug', NAME );
        YY.doccirrus.media.cacheHas( urlObj, onCacheCheck );
    }

    //  2. Make requested transform
    function makeTransform( itcb ) {
        //  skip this step if already cached
        if ( urlObj._inCache ) { return itcb( null ); }

        function onTransformCreated( err, cacheFile ) {
            urlObj._inCache = err ? false : true;
            urlObj._cacheFile = cacheFile;
            itcb( err );
        }

        YY.doccirrus.media.transform.create( req.user, urlObj, onTransformCreated );
    }

    //  3. Get the content length
    function statSize( itcb ) {
        //  skip this step if not in cache
        if ( !urlObj._inCache ) {
            return itcb( YY.doccirrus.errors.rest( 404, 'File not found in cache: ' + urlObj._cacheFile, true ) );
        }

        function onStat( err, stats ) {
            if ( err ) { return itcb( err ); }
            urlObj._contentLength = stats.size;
            itcb( null );
        }

        urlObj._diskFile = YY.doccirrus.media.getCacheDir() + urlObj._cacheFile;
        fs.stat( urlObj._diskFile, onStat );
    }

    // 4. Audit media opening if comes from PatientPortal
    function auditMediaOpening( itcb ) {
        if( !req.query || !req.query.isFromPortal ) {
            return itcb( null );
        }
        YY.doccirrus.utils.auditPPAction( req.user, {model: 'document', action: 'open', who: req.query.pid, mediaId: urlObj._id } );
        itcb( null );
    }

    function onAllDone( err ) {
        if ( err ) {
            res.writeHead( 404, { 'Content-type': 'text/plain' } );
            res.write( 'Could not load or generate media transform: ' + JSON.stringify( err ) );
            res.end();
            return;
        }

        var
            readStream = fs.createReadStream( urlObj._diskFile ),
            addHeaders = {
                'Content-Type': YY.doccirrus.media.types.getMimeType( urlObj.mime ),
                'Content-Length': urlObj._contentLength
            };

        //  force download of binary files
        if ( 'tfdata' === urlObj.ext || 'xml' === urlObj.ext ) {
            addHeaders['Content-Disposition'] = "attachment; filename=" + urlObj._cacheFile;
        }

        YY.log( 'Piping file to client: ' + urlObj._diskFile, 'debug', NAME );

        res.writeHead( 200, addHeaders );
        readStream.pipe( res );
    }
}

/*
 *  see server.js
 */

module.exports = function( _Y ) {
    YY = _Y;
    return handle;
};