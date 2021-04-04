/**
 * User: Richard Strickland
 * Date: 10.07.13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 *  This middleware component gives clients access to media cached on the server, and utilities to format shift them
 *  or bundle them in archives.
 *
 *  What does this do, why?
 *
 *      Serves image files in their native, binary format: this is not possible for ordinary mojits on Mojito 0.5.1
 *      because ac.done() performs an implicit convertsion to UTF-8 of all data passed to it - this corrupts images.
 *
 *      Serves cache control headers and ETags for image files, allowing client-side caching of images.  This is
 *      to reduce page load times and load on the server.
 *
 *      Keeps a store of image transforms (eg, a profile picture rescaled to thumbnail size), so that they do not
 *      have to be repeatedly generated.
 *
 *      Cleans the store of cached transforms which have not been used recently.
 *
 *  Where do the images come from?
 *
 *      Images are created by autoload/images.server.js and stored in ../var/tmp/imagecache/ - this step is performed
 *      by Mojit actions calling methods on Y.doccirrus.dcimages, which in turn may case a redirect to a /img/ URL
 *      which will be handled by this component.
 *
 *  What do the filenames mean?
 *
 *      Cached images have the following format:
 *
 *          ../var/tmp/imagecache/{uniqueId}__{width}_{height}.{format}
 *
 *      Where unique ID is determined by the mojit which created this image, width and height are in pixels, and the
 *      format may be .png or .jpeg
 *
 *      WARNING: it should not be necessary for your code to access these files, and the format of filenames may change
 *      in future to include information for access control, limiting which clients may access an image.  The cache
 *      directory may also be structured into a tree to prevent too many files from being created in the same directory.
 *
 *  How do I use this from my own mojit?
 *
 *      If you would like to use the image cache with your mojit, you will need at least one REST action to allow
 *      clients to access images, eg:
 *
 *          /1/myapi/:getimage?_id=imgId
 *
 *      This rest action will then call Y.doccirrus.dcimages.restSendImage(ac, image, [format], [width], [height]).
 *      This will cause an image transform to be created and stored in this cache if it does not already exist, and will
 *      then use ac.done() to send an HTTP 302 to redirect the client to this middleware.
 *
 *      Your Mojit would then use images in its views and binders as one would with HTML
 *
 *  How to I invalidate items in the cache?
 *
 *      If an image has changed or been deleted, call Y.doccirrus.media.images.clear(identifier)
 *
 *  Where are the original images stored?
 *
 *      In the database, to allow replication alongside other data.  Images should be stored in dataURI format as a
 *      member of some object maintained by your mojit, and should be normalized before storage.  Normalization
 *      is done for reasons fo security and performance, plase see ../autoload/images.server.js for details.
 *
 *  How do the ETags work?
 *
 *      ETags refer to a file, a single cached image on disk.  They change when the file does, thereby invalidating
 *      client caches.  An identifier may thus remain constant while the image it refers to has changed.
 *
 *      Practical example:  There may this be a canonical location for a user's profile picture, defined by the
 *      mojit which keeps track of a user's profile.  The image may be changed by the user while the URL of their
 *      current profile picture remains constant.
 *
 *      The eTag is an MD5 sum of the cached file's location and modification date - it will change if the file is
 *      changed.  For more information on ETags, see: http://en.wikipedia.org/wiki/HTTP_ETag
 *
 *  Roadmap
 *
 *      This component is experimental and alpha quality at present.  Further development will depend on early usages,
 *      but likely additions will be:
 *
 *          (-) auth checks on requests?
 *
 *          (-) quality adjustments to optimize different devices? eg higher compression for mobile clients?
 *
 *          (-) ticket system for security - mojit issues ticket to trusted client, used in imaage cache URL, checked
 *          before sending image
 *
 */

/*jshint latedef:false */

'use strict';

/**  DCImageCache class
 *
 *
 * "forward" declaration
 *    - class prototypes come at end of this file.
 */

function DCImageCache() {
    //logger.log( '**Initializing dc image cache**', 'info', 'debug', 'mojito-dcimagecache' );
}

var
    basePath = '',
    directories = {},
    formsExportPath,
    rulesExportPath,
    tempPath,
    failImage = process.cwd() + '/mojits/DocCirrus/assets/images/failure-image.png',
    failETag = 'blublublu',

    shellexec = require( 'child_process' ).exec,
    crypto = require( 'crypto' ),
    fs = require( 'fs' ),

    logger = console,

    binutils = {},

    //  remove temp files once the user has had a chance to download their zip (milliseconds) - give them an hour

    zipCleanupDelay = 60 * 60 * 1000,

    //  mime types are assumed from file extensions
    //  future versions may use file --mime-type if user-uploaded files could complicate detection

    extToMimeType = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'svgz': 'image/svg+xml',
        'png': 'image/png',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'mov': 'video/mp4',             //  hack - iOS quicktime should be similar enough to mp4 for HTML5 video
        'pdf': 'application/pdf',
        'zip': 'application/zip'
    };

/**
 *  Location of image cache and temp may be set by user in env.json (MOJ-2563)
 *
 *  @param callback
 */

function checkCustomDirectories( callback ) {

    if( !directories ) {
        //  this is fine, the user doesn't have to specify a custom directory
        logger.log( 'no directories in env.json' );
    } else {

        if( directories['media-tmp'] ) {
            tempPath = directories['media-tmp'] + '/';
            tempPath = tempPath.replace( '//', '/' );

            if( '/' !== basePath.substr( 0, 1 ) ) {
                tempPath = process.cwd() + '/' + tempPath;
            }

            logger.log( 'Set custom temp directory: ' + tempPath, 'info', 'mojito-dcimagecache' );
        }

        if( directories['media-cache'] ) {
            basePath = directories['media-cache'] + '/';
            basePath = basePath.replace( '//', '/' );

            if( '/' !== basePath.substr( 0, 1 ) ) {
                basePath = process.cwd() + '/' + basePath;
            }

            logger.log( 'Set custom cache directory: ' + basePath, 'info', 'mojito-dcimagecache' );
        }
    }
    //logger.log('Package object: ' + JSON.stringify(packageObj), 'warn', 'mojito-dcimagecache');
    callback( null );

}

checkCustomDirectories( function onDirectoryInit() {
    logger.log( 'Checked custom directories for dcimagecache middleware', 'info', 'mojito-dcimagecache' );
} );

/**
 *  Private method to make an ETag given a file name in the cache
 *
 *  @param  fileName    {String}    Disk location of cached image
 *  @param  callback    {Function}  Should have the form fn(err, etag)
 */


function makeETag( fileName, callback ) {
    fs.stat( fileName, function onStat( err, stats ) {
        if( err ) {
            logger.log( '(dcimagecache) could not stat cached image on disk, sending failure image', 'debug', 'mojito-dcimagecache' );
            callback( err, null );
            return;
        }

        var
            md5 = crypto.createHash( 'md5' ),
            etagstr = fileName + stats.mtime.toString(),
            etag = md5.update( etagstr ).digest( 'hex' );

        callback( null, etag );
    } );
}

/**
 *  Private method to guess the mime type of a file from its extension
 *
 *  @param  fileName    {String}    A file/transform cached in the media store
 *  @return             {String}    Best guess at mime type
 */

function guessMimeType( fileName ) {
    var
        parts = fileName.split( '.' ),
        ext = parts.pop();

    if( extToMimeType.hasOwnProperty( ext ) ) {
        return extToMimeType[ext];
    }

    //  forces download
    return 'application/octet-stream';
}

/**
 *  Private method to return an image to the client
 *
 *  @param  fileName    {String}    Disk location of cached image
 *  @param  etag        {String}    Browser cache key of this file
 *  @param  res         {Object}    HTTP response object
 */

function sendMedia( fileName, etag, res ) {
    logger.log( '(dcimagecache) sending cached media: ' + fileName + '(etag:' + etag + ')', 'debug', 'mojito-dcimagecache' );

    fs.readFile( fileName, function onFileLoaded( readerr, data ) {

        if( readerr ) {
            logger.log( '(dcimagecache) error loading cached media: ' + readerr, 'warn', 'mojito-dcimagecache' );
            logger.log( '(dcimagecache) error loading cached media from disk, sending failure image', 'warn', 'mojito-dcimagecache' );
            sendMedia( failImage, failETag, res );
            return;
        }

        var headers = {
            'content-type': guessMimeType( fileName )
            //'content-length': data.length,
            //'cache-control': 'max-age=86400',
            //'eTag': etag
        };

        res.writeHead( 200, 'OK', headers );
        res.end( data, 'binary' );

    } );

}

/**
 *  Private method to tar and gzip the forms export directory and return the archive to the user
 */

function sendFormsExport( req, res, exportPath, suppressSTDOUT, exportType, zip ) {

    if( !binutils.tar ) {
        notifyBinErr( 'tar utility is not configured', res );
        return;
    }

    if( !binutils.gzip ) {
        notifyBinErr( 'gzip utility is not configured', res );
        return;
    }

    if( zip && !binutils.gzip ) {
        notifyBinErr( 'zip utility is not configured', res );
        return;
    }

    //  Believe safe against tar execution, something to be aware of going forward:
    //  http://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt

    var
        tenantId = req.user.tenantId,
        tenantExportPath = exportPath + tenantId + '/',
        tempId = Math.random().toString( 36 ).slice( 2 ),
        tarCmd = binutils.tar + ' -cvzf formsout_' + tempId + '.tar' +
                 ' --exclude=*.zip --exclude=*.tar --exclude=*.gz' + ' ./' +
                 ((exportType) ? exportType : '') + '*_*' +
                 ((suppressSTDOUT) ? ' 1>/dev/null' : ''),
        gzCmd = binutils.gzip + ' formsout_' + tempId + '.tar',
        zCmd = binutils.zip + ' -m --junk-paths formsout_' + tempId + '.zip ./formsout_' + tempId + '.tar',
        //rmCmd = 'rm formsout_' + tempId + '.tar.gz',
        binData;

    if( !tenantId || '' === tenantId ) {
        tenantId = '0';
        tenantExportPath = exportPath + tenantId + '/';
    }

    fs.exists( tenantExportPath, onTenantPathExists );

    function onTenantPathExists( extant ) {

        if( !extant ) {
            logger.log( 'Export directory does not exist - no exported forms: ' + tenantExportPath, 'debug', 'mojito-dcimagecache' );
            onError( new Error( 'Export directory does not exist - no exported forms: ' + tenantExportPath ) );
            return;
        }

        logger.log( 'Using tenant ID: ' + tenantId, 'debug', 'mojito-dcimagecache' );
        logger.log( 'Archiving exported forms collection for download: ' + tenantExportPath + ' --> ' + tarCmd, 'debug', 'mojito-dcimagecache' );
        shellexec( tarCmd, {'cwd': tenantExportPath}, onTarComplete );
    }

    function onTarComplete( err, stdout, stderr ) {
        if( err ) {
            onError( err );
            return;
        }

        if( stderr ) {
            //  on OSX some versions of node mix up stdout and stderr, so this is not fatal
            logger.log( 'STDERR: ' + stderr, 'debug', 'mojito-dcimagecache' );
        }

        logger.log( 'STDOUT: ' + stdout, 'debug', 'mojito-dcimagecache' );
        logger.log( 'Compressing exported forms collection for download: ' + (zip) ? zCmd : gzCmd, 'debug', 'mojito-dcimagecache' );
        shellexec( (zip) ? zCmd : gzCmd, {'cwd': tenantExportPath}, onGzComplete );
    }

    function onGzComplete( err, stdout, stderr ) {
        if( err ) {
            onError( err || stderr );
            return;
        }

        logger.log( 'STDOUT: ' + stdout, 'debug', 'mojito-dcimagecache' );

        logger.log( 'STDOUT: ' + stdout, 'debug', 'mojito-dcimagecache' );
        logger.log( 'Loading archive from disk... ', 'debug', 'mojito-dcimagecache' );
        fs.readFile( tenantExportPath + 'formsout_' + tempId + ( zip ? '.zip' : '.tar.gz' ), onReadArchive );
    }

    function onReadArchive( err, data ) {
        if( err ) {
            logger.log( 'Could not load compressed forms archive from disk... ', 'warn', 'mojito-dcimagecache' );
            onError( err );
            return;
        }

        binData = data;
        var rmFile = tenantExportPath + 'formsout_' + tempId + ( zip ? '.zip' : '.tar.gz' );

        logger.log( 'Archive loaded to memory, removing temp file: ' + rmFile, 'debug', 'mojito-dcimagecache' );
        fs.unlink( rmFile, onRmComplete );

    }

    function onRmComplete( err ) {
        if( err ) {
            onError( err );
            return;
        }

        logger.log( 'Sending to client... ', 'debug', 'mojito-dcimagecache' );

        var headers = {'content-type': 'application/octet-stream'};

        res.writeHead( 200, 'OK', headers );
        res.end( binData, 'binary' );

    }

    function onError( err ) {

        logger.log( 'Error creating forms download: ', 'warn', 'mojito-dcimagecache' );
        logger.log( err, 'warn', 'mojito-dcimagecache' );

        var
            errStr,
            headers = {
                'content-type': 'text/plain'
            };

        try {
            errStr = JSON.stringify( err );
        } catch( serializeErr ) {
            logger.log( serializeErr, 'error', 'mojito-dcimagecache' );
            errStr = 'Could not create archive';
        }

        res.writeHead( 500, 'Server-side error', headers );
        res.end( errStr, 'binary' );
    }

}

/* used when testing configured binutils, development only */

function testConfig( res ) {
    var
        k,
        content = '',
        headers = {'content-type': 'text/plain'};

    //  tool locations from env.json have first priority
    content = content + 'BINUTILS:' + "\n\n";
    for( k in binutils ) {
        if( binutils.hasOwnProperty( k ) ) {
            content = content + k + ' := ' + binutils[k] + "\n";
        }
    }

    //  directories from env.json
    content = "\n\n" + content + 'DIRECTORIES:' + "\n\n";
    for( k in directories ) {
        if( directories.hasOwnProperty( k ) ) {
            content = content + k + ' := ' + directories[k] + "\n";
        }
    }

    res.writeHead( 200, 'OK', headers );
    res.end( content, 'binary' );
}

function notifyBinErr( msg, res ) {
    var headers = {'content-type': 'text/plain'};
    res.writeHead( 500, 'Error', headers );
    res.end( msg );

}

/**
 *  Creates HTML content of an iframe to print PDF documents
 *  This is necessary due to same-origin policy of iframe scripts
 *
 *  @param  pdfUrl  {String}    Relative local URL of PDF document to print
 *  @param  res     {Object}    Express response object
 */

function printPdf( pdfId, res ) {
    var
        headers = {'content-type': 'text/html'},
        printDoc;

    printDoc = '<html>' + "\n" +
               '<head>' + "\n" +
               '<script>' + "\n" +
               'function loadPDF() {' + "\n" +
               '  function onLoadedPDF() {' + "\n" +
               '    ifPDF.contentWindow.focus();' + "\n" +
               '    ifPDF.contentWindow.print();' + "\n" +
               '  }' + "\n" +
               '  var ifPDF = document.getElementById("ifPDF");' + "\n" +
               '  ifPDF.onload = onLoadedPDF;' + "\n" +
               '  ifPDF.src = "/1/media/download?_&id=' + pdfId + '";' +
               '}' + "\n" +
               '</script>' + "\n" +
               '</head>' + "\n" +
               '<body onload="loadPDF();">' + "\n" +
               '<iframe id="ifPDF" style="width: 100%;" frameborder="no">' + "\n" +
               '</body>' + "\n" +
               '</html>';

    res.writeHead( 200, 'OK', headers );
    res.end( printDoc );
}

/**
 *  Compress and send a zip file and schedule the folder for cleanup
 *
 *  @param  zipId   {string}    Handle to a zip archive
 *  @param  res     {object}    Response to client
 */

function sendZip( req, res ) {
    var
        zipId = req.url.replace( '/zip/', '' ).replace( '.zip', '' ),
        EXTENSIONS = ['pdf', 'csv', 'txt', 'data', 'sh'],
        fileExt = req.query && req.query.ext;
    
    if( -1 === EXTENSIONS.indexOf( fileExt ) ) {
        fileExt = 'pdf';
    }

    if ( -1 !== req.url.indexOf( 'perf-' ) ) {
        fileExt = '*';
    }

    if( !binutils.zip ) {
        notifyBinErr( 'zip utility is not configured', res );
        return;
    }

    //  check for attempted directory traversel
    if( -1 !== zipId.indexOf( '.' ) || -1 !== zipId.indexOf( '/' ) || -1 !== zipId.indexOf( '\\' ) ) {
        onZipFailure( 'Attempted directory traversal on zip: ' + zipId, 'warn', 'mojito-dcimagecache' );
        return;
    }

    var
        zipCmd = binutils.zip + ' --junk-paths ' + zipId + '.zip ./' + zipId + '/*.' + fileExt,
        binData;

    logger.log( 'Creating zip archive from collection: ' + zipId, 'info', 'mojito-dcimagecache' );

    //  first check if zip directory exists - this is a way to prevent SSI / command injection - zipId will have
    //  been generated by MediaMojit

    fs.stat( tempPath + zipId + '/', onDirStat );

    function onDirStat( err ) {
        if( err ) {
            onZipFailure( err );
            return;
        }

        shellexec( zipCmd, {'cwd': tempPath}, onZipComplete );
    }

    function onZipComplete( err, stdout, stderr ) {

        if( err ) {
            onZipFailure( err || stderr );
            return;
        }

        logger.log( 'STDOUT: ' + stdout, 'debug', 'mojito-dcimagecache' );
        logger.log( 'Created zip archive, loading from disk', 'debug', 'mojito-dcimagecache' );
        fs.readFile( tempPath + zipId + '.zip', onReadArchive );
    }

    function onReadArchive( err, data ) {
        if( err ) {
            logger.log( 'Could not load zip archive from disk... ', 'warn', 'mojito-dcimagecache' );
            onZipFailure( err );
            return;
        }

        binData = data;

        var rmFile = tempPath + zipId + '.zip';
        logger.log( 'Archive loaded to memory, removing temp file: ' + rmFile, 'debug', 'mojito-dcimagecache' );

        fs.unlink( rmFile, onRmComplete );
    }

    function onRmComplete( err ) {
        if( err ) {
            onZipFailure( err );
            return;
        }

        logger.log( 'Sending to client... ', 'debug', 'mojito-dcimagecache' );

        var headers = {'content-type': 'application/zip'};

        res.writeHead( 200, 'OK', headers );
        res.end( binData, 'binary' );

        setTimeout( onZipExpired, zipCleanupDelay );
        //        logger.log('STDOUT: ' + stdou, 'debug', 'mojito-dcimagecache't);
        //        logger.log('Loading archive from disk... , 'debug', 'mojito-dcimagecache'');
        //        fs.readFile(tempPath + 'formsout.tar.gz', onReadArchive);
    }

    function onZipExpired() {
        deleteZipDir( zipId );
    }

    function onZipFailure( err ) {

        logger.log( 'Error creating zip archive: ', 'warn', 'mojito-dcimagecache' );
        logger.log( err, 'warn', 'mojito-dcimagecache' );

        var
            errStr,
            headers = {
                'content-type': 'text/plain'
            };

        try {
            errStr = JSON.stringify( err );
        } catch( serializeErr ) {
            logger.log( serializeErr, 'error', 'mojito-dcimagecache' );
            errStr = 'Could not create zip archive';
        }

        res.writeHead( 500, 'Server-side erroro', headers );
        res.end( errStr, 'binary' );
    }

}

/**
 *  Delete a zip staging / temp directory
 *
 *  Called after an interval (say, an hour) to clean up temporary files
 *
 *  @param  zipId   {string}    Handle to a zip archive which has been downloaded
 */

function deleteZipDir( zipId ) {

    function onComplete() {
        logger.log( 'Finished removing: ' + zipDir );
    }

    function onTempFileDeleted( err ) {
        if( err ) {
            logger.log( 'Could not delete temp file (time delayed cleanup): ' + err, 'warn', 'mojito-dcimagecache' );
        }
        deleteNext();
    }

    function deleteNext() {

        if( 0 === toDelete.length ) {
            fs.rmdir( zipDir, onComplete );
            return;
        }

        var nextFile = toDelete.pop();
        fs.unlink( zipDir + nextFile, onTempFileDeleted );
    }

    function onFilesRead( err, files ) {
        if( err ) {
            return;
        }

        toDelete = files;
        deleteNext();
    }

    var
        zipDir = tempPath + zipId + '/',
        toDelete;
    logger.log( 'Cleaning up expired zip: ' + zipDir, 'info', 'mojito-dcimagecache' );
    fs.readdir( zipDir, onFilesRead );
}

/**
 *  Private method to return an image to the client as a dataURL
 *
 *  @param  fileName    {String}    Disk location of cached image
 *  @param  etag        {String}    Browser cache key of this file
 *  @param  res         {Object}    HTTP response object
 */

function sendMediaDataUrl( fileName, etag, res ) {
    logger.log( '(dcimagecache) sending cached media as dataurl: ' + fileName + '(etag:' + etag + ')', 'debug', 'mojito-dcimagecache' );

    function onFileLoaded( readerr, data ) {

        if( readerr ) {
            //logger.log('(dcimagecache) error loading cached image: ' + er, 'debug', 'mojito-dcimagecache'r);
            //logger.log('(dcimagecache) error loading cached image from disk, sending failure image, 'debug', 'mojito-dcimagecache'');
            sendMediaDataUrl( failImage, failETag, res );
            return;
        }

        var
            data64 = data.toString( 'base64' ),
            dataMimeType = guessMimeType( fileName ),
            headers;

        data64 = 'data:' + dataMimeType + ';base64,' + data64;

        headers = {
            'content-type': 'text/plain',
            'content-length': data64.length
        };

        logger.log( 'Guessed mime type to be: ' + dataMimeType, 'debug', 'mojito-dcimagecache' );

        res.writeHead( 200, 'OK', headers );
        res.end( data64, 'binary' );

    }

    fs.readFile( fileName, onFileLoaded );
}

/**
 *  Ensure that directory for storing cached images exists and that we can use it
 *
 *  @param  cacheDirPath    {String}    Location of cached image transforms, see basePath above
 */

function checkCacheDir( cacheDirPath ) {
    //TODO: check permissions here, directory is no good to us if we can't read and write it

    fs.stat( cacheDirPath, function onStat( err ) {
        if( err ) {
            //logger.log('(dcimagecache) creating directory to hold cached images, 'debug', 'mojito-dcimagecache'');
            fs.mkdir( cacheDirPath );
        }
    } );
}

/**
 *  Private method to look up image on disk
 *  @param  url     {String}    Requested cache item
 *  @returns        {String}    Disk file, or empty string on error
 */


function getCacheFileName( url ) {
    var
        parts = url.split( '/' ),
        fileName;

    fileName = parts.pop();
    parts = fileName.split( '\\' );
    fileName = parts[0];

    return basePath + fileName;
}

/**
 *  Check for an IF-NONE-MATCH header in the request
 *
 *  This will return a 304 if appropriate, otherwise send the image
 *
 *  @param  fileName    {String}    Expected location on disk
 *  @param  req         {Object}    HTTP server's request object
 *  @param  res         {Object}    HTTP server's response object
 *  @param  asDataUrl   {Boolean}   Experimental
 */

function checkETag( fileName, req, res, asDataUrl ) {

    //logger.log( '(dcimagecache) checking request headers', 'debug', 'mojito-dcimagecache' );
    //logger.log( JSON.stringify( req.headers, undefined, 2 ), 'debug', 'mojito-dcimagecache' );

    makeETag( fileName, function onETag( err, etag ) {

        if( err ) {
            //  could not make the ETag, image not in cache or something is wrong
            logger.log( '(dcimagecache) could not create etag', 'debug', 'mojito-dcimagecache' );

            if( asDataUrl ) {
                sendMediaDataUrl( failImage, failETag, res );
            } else {
                sendMedia( failImage, failETag, res );
            }

            return;
        }

        var headers;
        if(
            (req.headers.hasOwnProperty( 'if-none-match' )) &&
            (req.headers['if-none-match'] === etag)
        ) {
            //  client already has this transform cached, return 304
            headers = {
                'content-type': guessMimeType( fileName ),
                //'content-length': data.length,
                'eTag': etag
            };

            res.writeHead( 304, 'Not Modified', headers );
            res.end( '', 'binary' );

            return;
        }

        if( asDataUrl ) {
            sendMediaDataUrl( fileName, etag, res );
        } else {
            sendMedia( fileName, etag, res );
        }
    } );

}

/**
 *  The object this returns will form part of the mojito middleware stack
 *
 *  Process:
 *
 *      (1) Check that we handle this url
 *      (2) OK, check IF-NONE-MATCH header
 *      (3) Send image
 *
 *  @returns {Function}
 */

DCImageCache.prototype.handle = function() {

    //  Check that image cache dir exists when loading this middleware
    checkCacheDir( basePath );

    return function( req, res, next ) {
        ////logger.log('(dcimagecache) **Entering mojito-dcimagecacge** , 'debug', 'mojito-dcimagecache'');

        if(
            ( 0 !== req.url.lastIndexOf( '/img/', 0 ) ) &&
            ( 0 !== req.url.lastIndexOf( '/mp4/', 0 ) ) &&
            ( 0 !== req.url.lastIndexOf( '/pdf/', 0 ) ) &&
            ( 0 !== req.url.lastIndexOf( '/tgz/', 0 ) ) &&
            //  ( 0 !== req.url.lastIndexOf( '/test/', 0 ) ) &&
            ( 0 !== req.url.lastIndexOf( '/printpdf/', 0 ) ) &&
            ( 0 !== req.url.lastIndexOf( '/zip/', 0 ) )
        ) {
            ////logger.log('(dcimagecache) Skipping this URL, it is not an image cache request, 'debug', 'mojito-dcimagecache'');
            next();
            return;
        }

        var asDataUrl = false;

        if( -1 !== req.url.indexOf( '?' ) ) {

            if( req.url.indexOf( 'dataurl=true' ) > 0 ) {
                logger.log( 'converting to dataurl', 'debug', 'mojito-dcimagecache' );
                asDataUrl = true;
            }

            req.url = req.url.split( '?' )[0];
            logger.log( 'Removed querystring: ' + req.url, 'debug', 'mojito-dcimagecache' );
        }

        var fileName = getCacheFileName( req.url );

        //        logger.log('Cache fileName: ' + fileNam, 'debug', 'mojito-dcimagecache'e);
        //        logger.log('req URL: ' + req.ur, 'debug', 'mojito-dcimagecache'l);
        //        logger.log('req.url substring: ' + req.url.substring(0, 5, 'debug', 'mojito-dcimagecache'));

        if( '/tgz/' === req.url.substring( 0, 5 ) ) {
            //  download a form export archive
            if( req.url.includes( '/rules-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'rule' );
            } else if( req.url.includes( '/reports-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'insight2' );
            } else if( req.url.includes( '/flows-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'flow' );
            } else if( req.url.includes( '/catalogusages-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'catalogusage' );
            } else if( req.url.includes( '/profiles-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'profile' );
            } else if( req.url.includes( '/textblocks-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'textblocks' );
            } else {
                sendFormsExport( req, res, formsExportPath );
            }
            return;
        }

        if( '/zip/' === req.url.substring( 0, 5 ) ) {
            if( req.url.includes( '/rules-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'rule', true );
            } else if( req.url.includes( '/reports-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'insight2', true );
            } else if( req.url.includes( '/flows-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'flow', true );
            } else if( req.url.includes( '/catalogusages-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'catalogusage', true );
            } else if( req.url.includes( '/profiles-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'profile', true );
            } else if( req.url.includes( '/textblocks-export-' ) ) {
                sendFormsExport( req, res, rulesExportPath, true, 'textblocks', true );
            } else {
                //  download a form/dataTable export archive
                sendZip( req, res );
            }
            return;
        }

        if( '/test/' === req.url.substring( 0, 6 ) ) {
            //  show the configured binutils
            testConfig( res );
            return;
        }

        if( '/printpdf/' === req.url.substring( 0, 10 ) ) {
            //  show the configured binutils
            printPdf( req.url.replace( '/printpdf/', '' ), res );
            return;
        }

        //  download an image or PDF
        logger.log( 'Using cache file name: ' + fileName, 'debug', 'mojito-dcimagecache' );
        checkETag( fileName, req, res, asDataUrl );

    };
};

module.exports = function( Y ) {

    var
        imgcache = new DCImageCache();

    directories = Y.doccirrus.auth.getDirectories() || {};
    binutils = Y.doccirrus.binutilsapi.getBinUtils() || {};
    logger = Y;

    //tempDir = Y.doccirrus.auth.getTmpDir();

    basePath = Y.doccirrus.media.getCacheDir();
    tempPath = Y.doccirrus.media.getTempDir();
    formsExportPath = Y.doccirrus.forms ? Y.doccirrus.forms.exportutils.getExportDir() : '0';
    rulesExportPath = Y.doccirrus.auth.getTmpDir() + '/export/';

    return imgcache.handle();
};