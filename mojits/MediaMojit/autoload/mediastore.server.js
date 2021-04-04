/*
 * Copyright (c) 2014 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

//  Allowing late definitions for readability - lets us put the callback chains is execution order from top to bottom

/**
 *  This module manages temporary and cached media - file attachments such as images and PDF documents.
 *
 *  This module wraps the Imagemagick suite of CLI tools:
 *
 *    https://github.com/rsms/node-imagemagick
 *    http://www.imagemagick.org/
 *
 *  Media items are the binary representation of files stored in the 'media' database collection, cached for
 *  performance or temporarily written out for manipulation by exteral programs such as imagemagick, ghostscript, etc.
 *  The primary, canonical documents are maintained in the database for replication purposes.  Only copies and
 *  derivatives of these primary documents are stored on disk, and can be uncached or regerneated at any time.
 *
 *  In addition to allowing the storage of files on disk, the module also handles the settings for external programs
 *  used for manipulating media in the disk stores.
 *
 *  This module was split off from images.server.js during refactoring when it grew too large and beyond its original
 *  scope of image manipulation, to allow more general file attachments.
 *
 *  MEDIA OBJECTS
 *
 *  The canonical representation of attached files is a 'media' object which includes a base 64 serialization of the
 *  file, metadata about file contents (source file name, mime type, image size, PDF resolution, etc), ownership
 *  information  and transisent properties such as the location of temporary files which are being processed.
 *
 *  Most methods on this store work with media objects.  The format of these objects is like:
 *
 *  {
 *      _id:            '1234567890',                           //  ID database object [string]
 *      name:           'My Attached File',                     //  Defaults to original file name [string]
 *      descr:          'Description of picture',               //  A place for text meta, captions, etc [string]
 *      source:         'image/jpeg;base64,iVBOR...etc',        //  in dataURL format [string]
 *      origFilename:   '/home/me/i_was_read_from_here.jpg'     //  where this was read from [string]
 *      mime:           'image/jpeg',                           //  (jpeg|png|gif|pdf) [string]
 *      widthPx:        640,                                    //  pixels [number]
 *      heightPx:       480,                                    //  pixels [number]
 *      transform:      '640x480'                               //  string identifying this transform
 *      gridfs:         true                                    //  if true then source is in gridfs
 *  }
 *
 *  For more information about the DataURI format, please see: http://en.wikipedia.org/wiki/Data_URI_scheme
 *
 *  When storing the file source in gridfs, we use the media _id as filename followed by .b64
 *
 *  TRANSFORMS
 *
 *  The same media object may be represented by multiple trasforms, or different views of the same file.  For example:
 *
 *      - An image might be displayed in its original format, or resized to a thumbnail.
 *      - A PDF might be downloaded in its native format, or as a small image displayed next to a download button.
 *      - A video might be transcoded to multiple bitrates and formats to support mobile users, etc
 *
 *  When adding a file to the cache or temp dirs, or querying same, a transform name should be given to differentiate
 *  these different views of a file.  This transform name will be included in URLs and filenames, so must be contrained
 *  for safety and charset reasons to a short sequence of numbers and alphanumeric characters.
 *
 *  Different media libraries will choose their own transform names as is sensible in their own domains.
 *
 *  OVERVIEW
 *
 *  Initialization of this object:
 *
 *      init(callback)      - runs on start
 *      initialized()       - returns true when media store is ready
 *
 *  Filesystem utils
 *
 *  Note that these wrap node.fs, and all take paths raltive to the process.cwd() - all paths are checked against this
 *  to prevent directory traversal
 *
 *      mkdirIfMissing      -   create a directory if it does not already exist
 *      listRecursive       -   list all files and folders in a filesystem subtree
 *      deleteRecursive     -   delete all files and folders in a filesystem subtree
 *      readFile            -   read a file from disk, within security constraints
 *      writeFile           -   write a file to disk, within security constraints
 *      getFileExt          -   get file extension given filename
 *
 *  GridFS wrapper
 *
 *      gridfsLoad          -   retreive a media object from media and fs collections
 *      gridfsSave          -   store media metadata in media and file content in fs
 *
 *  File and media object IO
 *
 *      mediaFromFile       - attempts to create a media object from a disk file, filling as much metadata as possible
 *      mediaFromUpload     - like mediaFromFile, but accpets express upload objects
 *      mediaFromDB         - loads a media object from the database
 *      checkMedia          - check and if possible update/repair a media object
 *      base64Func          - hack to overcome a limitation in some node/mojito versions
 *      getImageFromMediaObject - Given mediaObject, gets or create and get media from cache.
 *
 *  Cache lookup and management
 *
 *      getCacheFileName    - given a media object, returns a cache filename for  it to use
 *      getCacheUrl         - given a media object, returns a URL to access it via middleware
 *      getTempFileName     - returns a random filename for temporary files
 *
 *      cacheRemove         - given a media item, removes all of its transforms from the cache
 *      cacheStore          - given a media item, writes it to the disk cache (ie, per transform)
 *      cacheHas            - given a media item, checks whether it exists in the cache (ie, per transform)
 *
 *      tempRemove          - given a filename, safely deletes that file from the temp dir
 *
 *  Metadata extraction
 *
 *      getFileMimeType     - given a fileName, guesses the mime type of file contents
 *      getDataUrlMimeType  - given a dataUrl, get the mimeType
 *      identify            - wrapper for command ImageMagick tool, SECURITY WARNING, TBD,
 *
 *  Mime, mimeType and categorization (moved to dcmedia-filetypes module)
 *
 *      getExt              - given a mime type, returns a corresponding file extension
 *      getCategory         - given the mime or mimeType of a media item, decide if it is image, document, video, etc
 *      getMime             - given a mimeType, return mime enum value
 *      getMimeType         - given a mime enum value, get actual mimeType
 *
 *  Getters for this object's properties
 *
 *      getTempDir          - location to place temporary/intermediate files
 *      getCacheDir         - location to keep media transforms to minimize cost of regenerating them later
 *
 *  MISCELLANEOUS
 *
 *  The media-schema.server.js defines a 'mime' enum, which holds values such as 'IMAGE_PNG' and 'APPLICATION_PDF'.
 *  This store will need at times to convert these 'mime' values to actul mime types and vice versa.
 *
 *  Media formats are grouped into categories which may have a common library or API, and similar used within the
 *  program.  They are
 *
 *      image                - image/jpeg, image/png, image/gif
 *      document             - application/pdf
 *      video                - not yet implemented, mentioned in spec
 *      audio                - not yet implemented, mentioned in spec
 */

/*jshint latedef:false */
/*global YUI */

YUI.add( 'dcmedia-store', function( Y, NAME ) {

        const

            //  node modules
            fs = require( 'fs' ),
            path = require( 'path' ),
            shellexec = require( 'child_process' ).exec,
            async = require( 'async' ),
            util = require( 'util' ),
            dcCore = require( 'dc-core' ),
            binutilsapi = Y.doccirrus.binutilsapi,

            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,

            //  logging
            {logEnter, logExit} = require( '../../../server/utils/logWrapping.js' )( Y, NAME ),

            //  maximum allowed size of file uploads, default to 5GB
            UPLOAD_MAX_SIZE = (1024 * 1024 * 1024 * 5),

            // Document Media Preview Thumbnail Image Width
            DOC_PREVIEW_TIMG_WIDTH = 68,

            // Document Media Preview Thumbnail Image Height
            DOC_PREVIEW_TIMG_HEIGHT = 68,

            // Document Media Preview Image Width
            DOC_PREVIEW_IMG_WIDTH = 1217,

            // Document Media Preview Image height, -1 so it the images does not get neither crop nor shrinked
            DOC_PREVIEW_IMG_HEIGHT = -1,

            // MIME for the Document Media images created
            DOC_PREVIEW_MIME = 'IMAGE_JPEG',

            //  location of env file, in which custom directory locations may be set
            config = require( 'dc-core' ).config.load( `${process.cwd()}/env.json` ),
            directories = config.directories,

            //  wild hack, deprecated, TODO: remove
            //  see: http://timnew.github.io/blog/2013/01/30/pitfall-in-node-crypto-and-base64-encoding/

            regPattern = new RegExp( /^0.8..*$/ ),
            versionMatches = process.versions.node.match( regPattern ),
            base64Func = (function base64() {

                if( versionMatches ) { // old 8th version
                    return function( data ) {
                        return Buffer.from( data ).toString( 'base64' );
                    };
                } else { // all other versions
                    return function( data ) {
                        return data;
                    };
                }

            })();

        let
            //  set to true when initialized correctly
            initOk = false,

            //  true if clamdscan is available
            hasAntiVirus = false,

            // app-wide temp directory
            // will always be absolute
            tempDir = Y.doccirrus.auth.getTmpDir(),

            //  cache of transforms (binary files), accessible by clients, trusted contents
            cacheDir = `${tempDir}/imagecache/`,

            //  temporary location for processing with 3rd party utils, untrusted contents
            imagetemp = `${tempDir}/imagetemp/`,

            //  location of custom TTF fonts
            fontDir = `${tempDir}/fonts/`;

        Y.log( `Node Version: ${process.versions.node}`, 'info', NAME );
        if( versionMatches ) {
            Y.log( 'Using Buffer for base64', 'debug', NAME );
        } else {
            Y.log( 'Using enconding=base64', 'debug', NAME );
        }

        /**
         *  Makes sure everything is in place on load
         *
         *      - Create var directories if not already present
         *      - Delete any leftover temp files from last run
         *      - Locate any 3rd party tools
         *
         *  Callback indicates any problem during setup and whether statup should be halted
         *
         *  TODO: use async await
         *
         *  @param  callback    {Function}  Of the form fn(err, isFatal)
         */

        function init( callback ) {

            Y.log( 'Initializing the dcimages module.', 'info', NAME );

            var step = 0;

            function doNextStep( err ) {

                if( err ) {
                    //  failures after step 4 are non-fatal - happens sometimes in dev environment that multiple
                    //  server instances started at the same time race to delete contents of shared symlinked
                    //  temp directory.  Other failures block start, see MOJ-2563

                    Y.log( `Error initializing mediastore: ${err}`, 'warn', NAME );
                    callback( `Error initializing mediastore: ${err}`, (step <= 5) );
                    return;
                }

                step = step + 1;

                switch( step ) {
                    case 1:
                        checkCustomDirectories( doNextStep );
                        return;

                    case 2:
                        // mkdirIfMissing( varDir, doNextStep ); // this step is no longer needed
                        doNextStep( null );
                        return;

                    case 3:
                        mkdirIfMissing( imagetemp, doNextStep );
                        return;

                    case 4:
                        mkdirIfMissing( cacheDir, doNextStep );
                        return;

                    case 5:
                        //  delete any contents of temp directory
                        Y.log( 'Mediastore initialized, cleaning up any leftover temp files...', 'info', NAME );
                        deleteRecursive( imagetemp, '', function onAllDeleted() {
                            Y.doccirrus.media.images.initialize();
                            doNextStep( null );
                        } );
                        return;

                    case 6:
                        //  check if antivirus is available
                        checkAntiVirus( doNextStep );
                        return;

                    case 7:
                        initOk = true;
                        Y.log( 'Mediastore initialized.', 'debug', NAME );
                        return callback( null );
                }

                //  Should not happen
                callback( Y.doccirrus.errors.rest( 500, 'Failed to intialize mediastore.', true ) );
            }

            doNextStep( null );

        } // end initialization routine

        /**
         *  Location of image cache and temp may be set by user in env.json (MOJ-2563)
         *
         *  @param callback
         */

        function checkCustomDirectories( callback ) {

            if( !directories ) {
                //  this is fine, the user doesn't have to specify a custom directory
                Y.log( 'no directories in env.json', 'info', NAME );
            } else {

                if( directories['media-tmp'] ) {
                    imagetemp = `${directories['media-tmp']}/`;
                    imagetemp = imagetemp.replace( '//', '/' );
                    Y.log( `Set custom temp directory: ${imagetemp}`, 'info', NAME );
                }

                if( directories['media-cache'] ) {
                    cacheDir = `${directories['media-cache']}/`;
                    cacheDir = cacheDir.replace( '//', '/' );
                    Y.log( `Set custom cache directory: ${cacheDir}`, 'info', NAME );
                }
            }

            //Y.log('Package object: ' + JSON.stringify(packageObj), 'warn', NAME);
            callback( null );
        }

        /**
         *  Check if antivirus is enabled and available for scanning uploads
         *  @param  callback
         */

        async function checkAntiVirus( callback ) {
            const accessP = util.promisify( fs.access );
            let clamdscan;

            try {
                clamdscan = Y.doccirrus.binutilsapi.getPathToBinUtil( 'clamdscan' );
            } catch( e ) {
                return callback();
            }

            let err, avscanConfig;

            //  Check configuration file avscan.json

            [err] = await formatPromiseResult( accessP( 'avscan.json', fs.constants.R_OK ) );

            if( err ) {
                //  No config file, assume disabled
                Y.log( `clamdscan malware scanner is not configured, please install and configure it. ERR: ${err.stack || err}`, 'info', NAME );
                return callback();
            }

            avscanConfig = dcCore.config.load( process.cwd() + '/avscan.json' );

            if( !avscanConfig ) {
                //  Invalid config, assume disabled
                Y.log( `clamdscan malware scanner is not configured, please install and configure it. ERR: ${err.stack || err}`, 'info', NAME );
                return callback();
            }

            if( !avscanConfig.enabled || 'false' === avscanConfig.enabled ) {
                Y.log( `clamdscan malware scanner is not enabled.`, 'info', NAME );
                return callback();
            }

            //  Check that we have execute permissions on clamdscan

            [err] = await formatPromiseResult( accessP( clamdscan, fs.constants.X_OK ) );

            hasAntiVirus = !err;

            Y.log( `clamdscan malware scanner is ${hasAntiVirus ? 'available' : 'not available, please install it.'}`, 'info', NAME );

            callback();
        }

        /**
         *  For unit testing mostly, return true if this object initialized right
         *  @returns    {Boolean}   Which isn't wildly informative.
         */

        function initialized() {
            return initOk;
        }

        //  GENERAL FILESYSTEM METHODS

        /**
         *  Check that a directory exists, create it if not
         *  /var/* is not present by default and should be created on first run, see MOJ-735
         *
         *  @param  dir         {string}    Relative to process.cwd()
         *  @param  [callback]    {Function}  Of the form fn(err)
         */

        function mkdirIfMissing( dir, callback ) {

            // need to block while we check this or catch errors
            // do not allow the possibility of race conditions here.
            if( fs.existsSync( dir ) ) {
                //  exists, nothing further to do
                return callback && callback( null );
            }

            // does not exist, create it
            Y.log( `Creating directory: ${dir}`, 'info', NAME );

            try {
                Y.doccirrus.fileutils.mkdirpSync( dir );
            } catch( fsErr ) {
                Y.log( `Error creating directory: ${JSON.stringify( fsErr )}`, 'warn', NAME );

                if( callback ) {
                    return callback( fsErr );
                } else {
                    throw fsErr;
                }
            }

            if( callback ) {
                return callback( null );
            }
        }

        /**
         *  Recursively list the contents of a directory (all files and folders, depth first)
         *
         *  This will return a flat array of objects like:
         *
         *  {
         *      'filename':     {String}    basename of file
         *      'directory':    {String}    parent directory
         *      'path':         {String}    absolute location on disk (ie, parent + path)
         *      'ext':          {String}    file extension
         *      'isDirectory':  {Bool}      true if a directory
         *      'isFile':       {Bool}      true if a file
         *      'size':         {Number}    in bytes
         *      'checked':      {Bool}      should always be true
         *  }
         *
         *  The filter parameter will grep for filenames matching the given string
         *
         *  @param  dir         {String}    Start directory
         *  @param  filter      {String}    Unimplemented
         *  @param  callback    {Function}  of the form fn(err, fileList)
         */

        function listRecursive( dir, filter, callback ) {

            //Y.log('Listing all files and folders in: ' + dir, 'info', NAME);

            var
                toCheckIndex = -1,      //  next item to stat
                foundItems = [];        //  callback value

            /**
             *  Callback from node.fs.readdir
             *  @param  err     {String}    Treated as a string error message
             *  @param  files   {Object}    Array of plain filenames
             */

            function onReadDir( err, files ) {

                if( err ) {
                    Y.log( `Could not list directory: ${dir}`, 'warn', NAME );
                    callback( `Could not read directory contents: ${dir} err: ${err}` );
                    return;
                }

                var i;
                for( i = 0; i < files.length; i++ ) {
                    foundItems.push( {
                        'filename': files[i],
                        'directory': dir,
                        'path': dir + files[i],
                        'ext': getFileExt( files[i] ),
                        'isDirectory': undefined,
                        'isFile': undefined,
                        'size': -1,
                        'checked': false
                    } );
                }

                checkNext();
            }

            /**
             *  Stat a single entry from the current directory
             */

            function checkNext() {
                var i;

                toCheckIndex = -1;

                //  iterate over the list of files in this dir and find the next one which has not yet been stat()ed
                for( i = 0; i < foundItems.length; i++ ) {
                    if( (false === foundItems[i].checked) ) {
                        toCheckIndex = i;
                        i = foundItems.length;
                    }
                }

                //  if we've stat()ed all entries then we're done, call back
                if( toCheckIndex === -1 ) {
                    callback( null, foundItems );
                    return;
                }

                //  stat the next item
                fs.stat( foundItems[toCheckIndex].path, onStatNext );
            }

            /**
             *  Callback from node.fs.stat
             *
             *  @param  err     {String}    Error object treated as string
             *  @param  stats   {Object}    see: http://nodejs.org/api/fs.html#fs_class_fs_stats
             */

            function onStatNext( err, stats ) {

                if( err ) {
                    callback( `Could not stat file ${foundItems[toCheckIndex].path} err: ${err}` );
                    return;
                }

                //Y.log('Finished stat of filesystem entry: ' + foundItems[toCheckIndex].filename, 'info', NAME);

                foundItems[toCheckIndex].checked = true;
                foundItems[toCheckIndex].isDirectory = stats.isDirectory();
                foundItems[toCheckIndex].isFile = stats.isFile();
                foundItems[toCheckIndex].size = stats.size;

                //Useful for debugging sometimes, but noisy
                //Y.log('Stat ' + foundItems[toCheckIndex].filename + ': ' + JSON.stringify(foundItems[toCheckIndex], undefined, 2), 'warn', NAME);

                if( foundItems[toCheckIndex].isDirectory ) {
                    //  get subdir contents before continuing
                    //Y.log('Listing subdirectory: ' + dir + foundItems[toCheckIndex].filename + '/', 'info', NAME);
                    listRecursive( `${dir + foundItems[toCheckIndex].filename}/`, filter, onReadChildDirCallback );

                } else {
                    //  finished with this one, carry on to next item
                    checkNext();
                }
            }

            /**
             *  Recurse callback
             *
             *  @param  err         {String}    Any error message
             *  @param  childItems  {Array}     Child items as described in jsDoc above
             */

            function onReadChildDirCallback( err, childItems ) {

                if( err ) {
                    callback( `Could not read subdir: ${err}` );
                    return;
                }

                var i;
                for( i = 0; i < childItems.length; i++ ) {
                    foundItems.push( childItems[i] );
                }

                checkNext();
            }

            //  ensure trailing slash
            dir = `${dir}/`;
            dir = dir.replace( '//', '/' );

            //Y.log('Reading directory: ' + dir, 'info', NAME);
            fs.readdir( dir, onReadDir );
        }

        /**
         *  Delete an entire subtree from the filesystem (list contents, then delete everything)
         *
         *  TODO: use rimraf
         *
         *  @param  dir         {String}    Starting position
         *  @param  filter      {String}    Unimplemented
         *  @param  callback    {Function}  Of the form fn(err, deletedFiles)
         */

        function deleteRecursive( dir, filter, callback ) {

            var
                deleted = [],
                toDelete;

            function onListRecursive( err, files ) {
                if( err ) {
                    callback( `Could not list files for deletion: ${err}` );
                    return;
                }

                //Y.log('found file set: ' + JSON.stringify(files, undefined, 2), 'info', NAME);
                toDelete = files;
                deleteNext();
            }

            function deleteNext( err ) {

                if( err ) {
                    callback( err );
                    return;
                }

                if( 0 === toDelete.length ) {
                    callback( null, deleted );
                    return;
                }

                var nextItem = toDelete.pop();

                deleted.push( nextItem );

                //Y.log('Deleting item: ' + JSON.stringify(nextItem, undefined, 2), 'warn', NAME);

                if( true === nextItem.isDirectory ) {
                    Y.log( `Deleting subdirectory: ${nextItem.path}`, 'debug', NAME );
                    deleted.push( nextItem );
                    fs.rmdir( nextItem.path, deleteNext );
                    return;
                }

                if( true === nextItem.isFile ) {
                    Y.log( `Deleting file: ${nextItem.path}`, 'debug', NAME );
                    deleted.push( nextItem );
                    fs.unlink( nextItem.path, deleteNext );
                    return;
                }

                //  entry is not a file or directory, may be a symplink, block device or other exotic thing
                //  take no action, but continue deletiung the subtree

                deleteNext();
            }

            listRecursive( dir, filter, onListRecursive );
        }

        /**
         *  Get the contents of a file
         *
         *
         *  @param  path        {String}    Absolute location of file
         *  @param  inDir       {String}    Path must be within this
         *  @param  callback    {Function}  Of the form fn(err, contents)
         */

        function readFile( path, inDir, callback ) {
            inDir = inDir ? inDir : 'var/';

            var cleanPath = pathIsInDir( path, inDir );

            if( cleanPath.includes( '/blocked.directory.traversal' ) ) {
                let err = `readFile: Security violation, directory traversal check:${path}`;
                Y.log( err, 'warn', NAME );
                callback( err );
                return;
            }

            fs.readFile( cleanPath, callback );
        }

        function readFileWithHash( path, inDir, callback ) {
            inDir = inDir ? inDir : 'var/';

            var cleanPath = pathIsInDir( path, inDir );

            if( cleanPath.includes( '/blocked.directory.traversal' ) ) {
                let err = `readFileWithHash: Security violation, directory traversal check:${path}`;
                Y.log( err, 'warn', NAME );
                callback( err );
                return;
            }

            const crypto = require( 'crypto' ),
                algorithm = 'sha1',
                shasum = crypto.createHash( algorithm );
            let chunks = [];

            // Updating shasum with file content
            var s = fs.ReadStream( path );

            s.on( 'error', err => {
                // File could not be read
                return callback( err );
            } );

            s.on( 'data', data => {
                shasum.update( data );
                chunks.push( data );
            } );

            s.on( 'end', () => {
                var hash = shasum.digest( 'hex' );
                callback( null, Buffer.concat( chunks ), hash );
            } );
        }

        /**
         *  Put the contents of a file
         *
         *  @param  path        {String}    Absolute location of file
         *  @param  inDir       {String}    Confine path to this directory, security
         *  @param  data        {String}    File contents
         *  @param  callback    {Function}  Of the form fn(err, contents)
         */

        function writeFile( path, inDir, data, callback ) {
            inDir = inDir ? inDir : 'var/';

            var cleanPath = pathIsInDir( path, inDir );

            if( cleanPath.includes( '/blocked.directory.traversal' ) ) {
                const error = `writeFile: Security violation, directory traversal check:${path}`;
                Y.log( `Security violation, directory traversal check:${path}`, 'warn', NAME );
                return callback( error );
            }

            fs.writeFile( path, data, callback );
        }

        /**
         *  Directory traversal check
         *
         *  @param  path    {String}    Untrusted file location
         *  @param  inDir   {String}    relative to process.cwd()
         *  @returns        {String}    Cleaned path or empty string
         */

        function pathIsInDir( path, inDir ) {
            var disallow = ['//', '../', '/..', '\\..', '..\\', '~'], i;

            //    inDir = inDir.replace(baseDir, '');
            //    path = path.replace(baseDir, '');

            for( i = 0; i < disallow.length; i++ ) {
                while( path.indexOf( disallow[i] ) !== -1 ) {
                    path = path.replace( disallow[i], '' );
                }
            }

            if( '*' === inDir || path.substr( 0, inDir.length ) === inDir ) {
                return path;
            }

            return `${inDir}/blocked.directory.traversal`;
        }

        /**
         *  Given a filename, return anything after the last period (.)
         *
         *  @param  filename    {String}
         */

        function getFileExt( filename ) {
            var parts = filename.split( '.' );
            if( 1 === parts.length ) {
                return '';
            }
            return parts.pop();
        }

        /**
         *  Remove disallowed chars from a filename (base name, not path)
         *  @param  fileName    {String}
         */

        function cleanFileName( fileName ) {
            var
                allowed = 'abcdefghijklmnopqrstuvwxyz' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + '1234567890' + '._-',
                cleanName = '',
                char, i;

            // best effort for
            fileName = fileName.replace( new RegExp( 'ä' ), 'a' );
            fileName = fileName.replace( new RegExp( 'ö' ), 'o' );
            fileName = fileName.replace( new RegExp( 'ü' ), 'u' );
            fileName = fileName.replace( new RegExp( 'Ä' ), 'A' );
            fileName = fileName.replace( new RegExp( 'Ö' ), 'O' );
            fileName = fileName.replace( new RegExp( 'Ü' ), 'U' );
            fileName = fileName.replace( new RegExp( 'ß' ), 'ss' );

            for( i = 0; i < fileName.length; i++ ) {
                char = fileName.substr( i, 1 );
                if( -1 === allowed.indexOf( char ) ) {
                    char = '_';
                }
                cleanName = cleanName + char;
            }

            return cleanName;
        }

        /**
         *  Convert data dataURI to a buffer for saving to disk or GridFS
         *
         *  @param  dataUri     {String}    https://en.wikipedia.org/wiki/Data_URI_scheme
         *  @returns            {Buffer}
         */

        function dataUriToBuffer( dataUri ) {
            var base64data = (-1 === dataUri.indexOf( ';base64,' )) ? dataUri : dataUri.split( ';base64,', 2 )[1];
            return Buffer.from( base64data, 'base64' );
        }

        //  SERVER SETUP

        //  HANDLE MEDIA OBJECTS

        /**
         *  This is a stopgap to fix legacy media object while changes are made
         *
         *  @param  media   {Object}    A media object
         *  @return         {Object}    Updated / corrected media object
         */

        function checkMedia( media ) {
            if( (!media.hasOwnProperty( 'transform' )) || (null === media.transform) || ('' === media.transform) ) {
                media.transform = 'original';
            }

            if( (!media.hasOwnProperty( 'label' )) || (null === media.label) || ('' === media.label) ) {
                media.label = '';
            }

            if( (!media.hasOwnProperty( 'mime' )) || (!media.mime) || ('' === media.mime) ) {
                media.mime = Y.doccirrus.media.getMime( media.mimeType );
            }

            if( (!media.hasOwnProperty( 'mimeType' )) || (null === media.mimeType) || ('' === media.mimeType) ) {
                switch( media.mime ) {
                    case 'IMAGE_PNG':
                        media.mimeType = 'image/png';
                }
            }

            return media;
        }

        /**
         *  Safely import media from a file on disk
         *
         *  @param  user                {Object}    REST user or equivalent
         *  @param  fileName            {String}
         *  @param  ownerCollection     {String}    Type of activity this media belongs to
         *  @param  ownerId             {String}    Database _id of object this media belongs to
         *  @param  name                {String}    Original filename or name of media
         *  @param  label               {String}    Used to separate media by purpose, set to 'user' is unsure
         *  @param  docType             {String}    Corresponds to document type
         *  @param  callback            {Function}  Of the form fn( err, newMediaObject )
         */

        function importMediaFromFile( user, fileName, ownerCollection, ownerId, name, label, docType, callback ) {

            const timer = logEnter( `importMediaFromFile ${fileName} ${ownerId}` );

            let
                fileCategory,
                malwareWarning,
                mediaObj = {
                    '_id': `img${new Date().getTime()}`,
                    '_diskFile': fileName,
                    '_tempFiles': []
                };

            async.series(
                [
                    checkForViruses,
                    identifyMedia,
                    instantiateFromDisk,
                    normalizeMedia,
                    saveMediaToDb,
                    saveFileToGridFs,
                    saveDocumentPreviewThumbnail,
                    saveDocumentPreviewImage
                ],
                onAllDone
            );

            //  1. Check against antivirus
            async function checkForViruses( itcb ) {
                if( !hasAntiVirus ) {
                    Y.log( `clamdscan is not available, upload not scanned for malware: ${mediaObj._diskFile}`, 'warn', NAME );
                    return itcb( null );
                }

                const
                    getSettingsP = promisifyArgsCallback( Y.doccirrus.api.settings.get ),
                    virusScanP = util.promisify( virusScan );

                let err, settings;

                //  load inSuite settings
                [err, settings] = await formatPromiseResult( getSettingsP( {user} ) );

                if( err ) {
                    return itcb( err );
                }

                //  run clamdscan against the file
                [err] = await formatPromiseResult( virusScanP( user, mediaObj._diskFile ) );

                //  no warning from malware scan
                if( !err || !err.msg ) {
                    return itcb( null );
                }

                malwareWarning = err.msg;

                //  warn the user
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'antivirusWarning',
                    msg: {
                        data: malwareWarning
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );

                //  option from inSuite settings to prevent save of file to GrisFS
                if( settings[0] && settings[0].blockMalware ) {
                    Y.log( `Blocking save of file due to malware warning: ${mediaObj._diskFile}`, 'info', NAME );
                    return itcb( err );
                }

                itcb( null );
            }

            //  2. Identify the file
            function identifyMedia( itcb ) {

                function onMimeTypeRead( err, mimeType ) {
                    if( err ) {
                        Y.log( `Could not determine type of uploaded file: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    mediaObj.mimeType = mimeType;
                    mediaObj.mime = Y.doccirrus.media.getMime( mimeType );
                    fileCategory = Y.doccirrus.media.getCategory( mimeType );

                    Y.log( `Found media to be of category: ${fileCategory} (${mimeType})`, 'debug', NAME );
                    itcb( null );
                }

                Y.doccirrus.media.getFileMimeType( mediaObj._diskFile, onMimeTypeRead );
            }

            //  3. Now that we know what type it is, instantiate a new media object from disk
            function instantiateFromDisk( itcb ) {

                function onMediaCreated( err, newMedia ) {
                    if( err ) {
                        Y.log( `Could not create media object: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    //  note: ImageMagick identify does not reliably detect SVG when they have embedded images, MOJ-9424
                    if( 'image/svg' === mediaObj.mimeType ) {
                        newMedia.mime = 'IMAGE_SVG';
                        newMedia.mimeType = 'image/svg';
                    }

                    if ( '' === newMedia.mimeType ) { newMedia.mimeType = mediaObj.mimeType; }
                    if ( '' === newMedia.mime ) { newMedia.mime = mediaObj.mime; }

                    Y.log( 'Instantiated new media object from disk...', 'debug', NAME );
                    mediaObj = newMedia;
                    itcb( null );
                }

                switch( fileCategory ) {
                    case 'image':
                        Y.doccirrus.media.images.imageFromFile( mediaObj._diskFile, 'transitional', 'original', onMediaCreated );
                        break;

                    case 'video':               //  deliberate fallthrough
                    case 'audio':               //  deliberate fallthrough
                    case 'font':                //  deliberate fallthrough
                    case 'document':
                    case 'labdata':
                    case 'tfdata':
                        Y.log( `Creating media object from temp file: ${mediaObj._diskFile}`, 'debug', NAME );
                        Y.doccirrus.media.mediaFromFile( mediaObj._diskFile, 'transitional', 'original', onMediaCreated );
                        break;

                    default:
                        Y.log( 'Media file type not recognized, not adding.', 'warn', NAME );
                        return itcb( Y.doccirrus.errors.rest( 401, `Document type not recognized: ${mediaObj.mimeType}`, true ) );
                }
            }

            //  4. Enforce restrictions and security checks on the uploaded file
            function normalizeMedia( itcb ) {
                Y.log( `Normalizing media object before storage: ${fileCategory}`, 'debug', NAME );

                function onMediaNormalized( err, normalizedMedia ) {

                    if( err ) {
                        Y.log( `Error while normalizing media: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'Uploaded media has been normalized, adding to database.', 'info', NAME );

                    delete normalizedMedia.id;      //  a new one will be assigned by model.post
                    delete normalizedMedia._id;     //  a new one will be assigned by model.post

                    normalizedMedia.ownerCollection = ownerCollection;
                    normalizedMedia.ownerId = ownerId;
                    normalizedMedia.label = label;
                    normalizedMedia.name = name;
                    normalizedMedia.docType = docType || 'OTHER';
                    normalizedMedia.transform = 'original';

                    //Y.doccirrus.media.logMedia('Storing ' + fileCategory + ':', normalMedia, 'debug', NAME);

                    mediaObj = normalizedMedia;
                    itcb( null );
                }

                //  check that uploaded media is valid for this category
                switch( fileCategory ) {
                    case 'image':
                        Y.doccirrus.media.images.normalize( mediaObj, onMediaNormalized );
                        break;
                    case 'video':
                        Y.doccirrus.media.video.normalize( mediaObj, onMediaNormalized );
                        break;
                    case 'audio':
                        Y.doccirrus.media.audio.normalize( mediaObj, onMediaNormalized );
                        break;
                    case 'font':
                        Y.doccirrus.media.fonts.normalize( mediaObj, onMediaNormalized );
                        break;
                    //Deliberate fall through as it belongs to the same logical group
                    case 'labdata':
                    case 'tfdata':
                    //  deliberate fallthrough - pdf module currently used to handle arbitrary binary files
                    //  this should be refactored to properly check/import tfdata and other binary formats

                    case 'document':
                        Y.doccirrus.media.pdf.normalize( mediaObj, onMediaNormalized );
                        break;  //  eslint-disable-line no-fallthrough

                    default:
                        return itcb( Y.doccirrus.errors.rest( 500, `Unrecognized media category: ${fileCategory}`, true ) );
                }

            }

            //  5. Save normalized media metadata object to the database
            function saveMediaToDb( itcb ) {

                function onMediaSaved( err, result ) {
                    if( err ) {
                        Y.log( `Media could not be added to collection (err): ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    result = result[0] ? result[0] : result;
                    mediaObj._id = result;

                    if( malwareWarning ) {
                        recordMalwareAuditEntry( user, mediaObj._id, malwareWarning );
                    }

                    //Y.log('Added media to collection, noting new media _id: ' + JSON.stringify( mediaObj._id ), 'warn', NAME);
                    itcb( null );
                }

                mediaObj.source = '';
                mediaObj.gridfs = true;
                mediaObj.binary = true;

                if( malwareWarning ) {
                    mediaObj.malwareWarning = malwareWarning;
                }

                Y.doccirrus.media.mediaToDB( user, mediaObj, onMediaSaved );
            }

            //  6. Save uploaded file into GridFS (normalized)
            function saveFileToGridFs( itcb ) {
                Y.doccirrus.media.gridfs.importFile( user, mediaObj._id, mediaObj._diskFile, false, itcb );
            }

            //  7. Scale a preview image for the search modal
            function saveDocumentPreviewThumbnail( itcb ) {
                function onTransformPreviewThumbnail( err, cacheFileName ) {
                    if( err ) {
                        return itcb( err );
                    }

                    Y.log( 'Created cached document preview thumbnail ' + cacheFileName, 'debug', NAME );

                    itcb( null );
                }

                switch( fileCategory ) {
                    case 'image':
                        Y.doccirrus.media.images.transform(
                            user,
                            {...mediaObj, _diskFile: null},
                            {
                                'widthPx': DOC_PREVIEW_TIMG_WIDTH,
                                'heightPx': DOC_PREVIEW_TIMG_HEIGHT,
                                'mime': DOC_PREVIEW_MIME
                            },
                            onTransformPreviewThumbnail
                        );

                        break;

                    case 'document':
                        if( 'APPLICATION_PDF' === mediaObj.mime ) {
                            Y.log( 'Pre-generating thumbnail from PDF: ' + mediaObj._id, 'debug', NAME );
                            Y.doccirrus.media.pdf.getPageAsImage(
                                user,
                                mediaObj,
                                0,
                                DOC_PREVIEW_TIMG_WIDTH,
                                DOC_PREVIEW_TIMG_HEIGHT,
                                onTransformPreviewThumbnail
                            );
                        } else {
                            return itcb( null );
                        }
                        break;

                    default:
                        return itcb( null );
                }
            }

            //  8. Scale a thumbnail image
            function saveDocumentPreviewImage( itcb ) {
                function onTransformPreviewImage( err, cacheFileName ) {
                    if( err ) {
                        return itcb( err );
                    }

                    Y.log( 'Created cached document preview image ' + cacheFileName, 'debug', NAME );

                    itcb( null );
                }

                switch( fileCategory ) {
                    case 'image':
                        Y.doccirrus.media.images.transform(
                            user,
                            {...mediaObj, _diskFile: null},
                            {
                                'widthPx': DOC_PREVIEW_IMG_WIDTH,
                                'heightPx': DOC_PREVIEW_IMG_HEIGHT,
                                'mime': DOC_PREVIEW_MIME
                            },
                            onTransformPreviewImage
                        );

                        break;
                    default:
                        return itcb( null );
                }
            }

            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Could not import media: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                Y.log( `Media normalized and imported to database and GridFS with _id: ${mediaObj._id}`, 'info', NAME );
                logExit( timer );
                callback( null, mediaObj );
            }

        }

        /**
         *  Given the location of an image file, convert it to an image as described in the head of this document
         *
         *  Note that this method no longer loads the file into the object as a dataURI - change made for efficiency
         *  to support large files with GridFS
         *
         *  @param  fileName        {String}    Location of an image in the filesystem
         *  @param  id              {String}    Image identifier, common to transforms of the same image
         *  @param  transformName   {String}    Use 'original' for canonical file
         *  @param  callback        {Function}  Of the form fn(err, media)
         */

        function mediaFromFile( fileName, id, transformName, callback ) {

            var
                mediaObj = {
                    '_id': id,
                    'ownerCollection': '',
                    'ownerId': '',
                    'label': '',
                    'mime': '',
                    'mimeType': '',
                    'name': fileName,
                    'descr': `Read from disk on ${new Date().toString()}`,
                    'widthPx': -1,
                    'heightPx': -1,
                    'origFilename': fileName,
                    'transform': transformName,
                    'source': '',
                    'binary': true,
                    'gridfs': true,
                    '_diskFile': fileName,
                    '_tempFiles': [fileName]
                }; //  returned via callback on success

            async.series(
                [
                    checkParams,
                    checkFileExists,
                    getNewMimeType,
                    getExtraMeta
                ],
                onAllDone
            );

            //  1. Check the arguments and state of this object
            function checkParams( itcb ) {
                if( !initOk ) {
                    itcb( Y.doccirrus.errors.rest( 500, 'Media store not initialized.', true ) );
                    return;
                }

                if( 'string' !== (typeof fileName) ) {
                    Y.log( 'Filename must be a string', 'warn', NAME );
                    itcb( Y.doccirrus.errors.rest( 500, 'Filename must be a string', true ) );
                    return;
                }

                if( 'object' === (typeof id) ) {
                    id = id.toString();
                }

                if( 'string' !== (typeof id) ) {
                    Y.log( `Media ID must be a string: ${id} (${typeof id})`, 'warn', NAME );
                    itcb( Y.doccirrus.errors.rest( 500, `Media ID must be a string: ${id} (${typeof id})`, true ) );
                    return;
                }

                itcb( null );
            }

            //  2. Check that file exists, and request mimeType if it does
            function checkFileExists( itcb ) {
                Y.log( `Checking that file exists on disk: ${fileName}`, 'debug', NAME );
                fs.exists( fileName, onFileExists );

                function onFileExists( isThere ) {
                    if( !isThere ) {
                        itcb( Y.doccirrus.errors.rest( 404, `File does not exist: ${fileName}`, true ) );
                        return;
                    }
                    Y.log( `File exists: ${fileName}`, 'debug', NAME );
                    itcb( null );
                }
            }

            //  3. Get mime type of file on disk
            function getNewMimeType( itcb ) {
                function onReadMimeType( err, mimeType ) {
                    if( err ) {
                        itcb( Y.doccirrus.errors.rest( 500, `Could not determine file mime type: ${err}`, true ) );
                        return;
                    }

                    Y.log( `Read file mime type: ${mimeType}`, 'debug', NAME );
                    mediaObj.mimeType = mimeType;
                    mediaObj.mime = Y.doccirrus.media.getMime( mimeType );
                    itcb( null );
                }

                getFileMimeType( fileName, onReadMimeType );
            }

            //  4. Get additional metadata specific to this mime type
            function getExtraMeta( itcb ) {
                /*
                var cat = getCategory( mediaObj.mime );

                switch( cat ) {
                    case 'image':
                        Y.doccirrus.media.images.
                        break;
                }
                */

                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, mediaObj );
            }

        }   // end mediaFromFile

        /**
         *  Scan new/uploaded/untrusted files for viruses
         *
         *  Currently using ClamAV:
         *
         *      https://www.clamav.net/documents/scanning
         *
         *  @param  {String}    fileName
         *  @param  {Function}  callback
         */

        async function virusScan( user, fileName, callback ) {
            const
                OUTDATED_WARNING = 'Please update it as soon as possible.',
                SUCCESS_MARKER = 'Infected files: 0';

            let timer = logEnter( `virusScan ${fileName}` ), cleanFileName;

            if ( !hasAntiVirus ) {
                logExit( timer );
                return callback( null );
            }

            let [err, shellCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'clamdscan',
                    shellArgs: [
                        '--fdpass',
                        `"${fileName}"`
                    ]
                } )
            );

            if( err ) {
                logExit( timer );
                return callback( err );
            }

            Y.log( `Scanning new file for malware: ${shellCmd}`, 'info', NAME );
            shellexec( shellCmd, onScanResult );

            function onScanResult( err, stdout, stderr ) {
                if( err ) {
                    Y.log( `Antivirus warning: \n${stdout}`, 'error', NAME );
                }

                //  Do not treat warning of outdated signatuers as positive result
                if( !err && stderr && -1 !== stderr.indexOf( OUTDATED_WARNING ) ) {
                    err = new Error( stderr );
                }

                if( !err && -1 === stdout.indexOf( SUCCESS_MARKER ) ) {
                    Y.log( `Antivirus warning: \n${stdout}`, 'error', NAME );
                    err = new Error( stdout );
                }

                //  do not reveal the temp filename to the user
                cleanFileName = stdout.replace( fileName, '' );

                if( err ) {
                    err.msg = cleanFileName;

                    //  send an email to system admins warning them of the suspicious file
                    Y.doccirrus.api.employee.sendMalwareEmail( user, err.msg, fileName );
                }

                logExit( timer );
                callback( err );
            }

        }

        /**
         *  Record an audit log entry when malware is detected
         *
         *  @param  {Object}    user
         *  @param  {String}    mediaId
         *  @param  {String}    malwareWarning
         *  @return {Promise<void>}
         */

        async function recordMalwareAuditEntry( user, mediaId, malwareWarning ) {
            let
                err,
                auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'malware', 'media', malwareWarning );

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'audit',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( auditEntry )
                } )
            );

            if( err ) {
                Y.log( `Could not save audit log about malware: ${err.stack || err}`, 'error', NAME );
            }
        }

        /**
         *  Run clamdscan against a file in GridFS
         *
         *  @param  {Object}    user
         *  @param  {String}    mediaId     Name of a file in GridFS
         *  @param  {Function}  callback    Of the form fn( err )
         *  @return {Promise<void>}
         */

        async function virusScanGridFS( user, mediaId, callback ) {
            const
                exportFileP = util.promisify( Y.doccirrus.media.gridfs.exportFile ),
                virusScanP = util.promisify( virusScan ),
                tempRemoveP = util.promisify( tempRemove ),
                tempFile = getTempFileName( {mime: 'APPLICATION_BINARY', transform: 'original'} );

            let
                err, result;

            if ( !hasAntiVirus ) {
                //  antivirus not enabled, nothing to do
                return callback( null );
            }

            //  1.  Export the file from GridFS to a randomly named temp file

            [err] = await formatPromiseResult( exportFileP( user, mediaId, tempFile, false ) );

            if( err ) {
                Y.log( `Could not export file for virus scan: ${err.stack || err}`, 'error', NAME );
                return false;
            }

            //  2.  Check for viruses
            [result] = await formatPromiseResult( virusScanP( user, tempFile ) );

            //  3.  Clean up the temp file
            [err] = await formatPromiseResult( tempRemoveP( tempFile ) );

            if( err ) {
                Y.log( `Could not remove temp file: ${err.stack || err}`, 'error', NAME );
            }

            //  4.  Check result
            if( result ) {
                Y.log( `Malware warning in GridFS: ${result.msg}`, 'error', NAME );
                err = result;
            }

            callback( err );
        }

        /**
         *  Check whether antivirus is configured and available
         *  @return {boolean}
         */

        function virusScanEnabled() {
            return hasAntiVirus;
        }

        /**
         *  Creates a media object given an express file upload (see req.files)
         *
         *  This media object is generic, autoload components for media types call this and then fill in additional
         *  metadata of their own.
         *
         *  @param  upload      {Object}    Express file upload object
         *  @param  id          {String}    Unique ID for this image
         *  @param  callback    {Function}  Of the form (err, media)
         */

        function mediaFromUpload( upload, id, callback ) {
            //  validation of upload here

            Y.log( `Creating media object from uploaded file: ${upload.name || ''}`, 'debug', NAME );

            function onFileLoaded( err, media ) {
                if( err ) {
                    callback( err, null );
                    return;
                }

                media.name = upload.name;
                media.descr = `Uploaded on ${new Date().toString()}`;

                callback( null, media );
            }

            mediaFromFile( upload.path, id, 'original', onFileLoaded );
        }

        /**
         *  Load a media object from the database (shortcut method)
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mediaId     {String}    Database _id of a media object
         *  @param  callback    {Function}  Of the form fn (err, mediaObj)
         */

        function mediaFromDB( user, mediaId, callback ) {
            function onDbLoadMedia( err, result ) {
                if( !err && (!result || 0 === result.length) ) {
                    Y.log( `Could not load media object from database, not found: ${mediaId}`, 'warn', NAME );
                    err = Y.doccirrus.errors.rest( 404, 'Media item not found in database.', true );
                }

                if( err ) {
                    Y.log( `Could not load media object from database: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                callback( null, result[0] );
            }

            if( !mediaId || '' === mediaId ) {
                callback( new Error( 'media id not given' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'media',
                action: 'get',
                callback: onDbLoadMedia,
                query: {'_id': `${mediaId}`},
                options: {}
            } );
        }

        /**
         *  Shortcut method to save a media item to the database
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mediaObj    {Object}    As per media schema
         *  @param  callback    {Function}  DB layer callback
         */

        function mediaToDB( user, mediaObj, callback ) {
            function onMediaSaved( err, result ) {
                var errMsg;
                // all of this DB error handling needs to be switched to Objects in the course of MOJ-2231
                if( err ) {
                    errMsg = `Could not save mediaObj to database: ${err.toString()}`;
                    Y.log( errMsg, 'warn', NAME );
                }
                callback( errMsg, result );
            }

            Y.log( `Saving media to database... ${mediaObj._id ? 'put' : 'post'}`, 'debug', NAME );
            // don't clean binaries with this filter
            //mediaObj = Y.doccirrus.filters.cleanDbObject( mediaObj );
            // MOJ-2906 clean binaries
            Y.doccirrus.filters.setSkipCheck( mediaObj, true );

            var
                saveData = {'fields_': []},
                dbSetup = {
                    'user': user,
                    'model': 'media',
                    'action': (mediaObj._id ? 'put' : 'post'),
                    'options': {'overwrite': true},
                    'migrate': mediaObj._inMigration || false,
                    'callback': onMediaSaved
                },
                k;

            if( 'put' === dbSetup.action ) {
                dbSetup.query = {'_id': mediaObj._id};
                if( !mediaObj._id ) {
                    return callback( Y.doccirrus.errors.rest( 500, 'Missing media _id' ) );
                }
            }

            mediaObj.fields_ = mediaObj.fields_ ? mediaObj.fields_ : [];

            for( k in mediaObj ) {
                if( mediaObj.hasOwnProperty( k ) ) {
                    if( '_' !== k.substr( 0, 1 ) ) {
                        if( 'put' === dbSetup.action ) {
                            mediaObj.fields_.push( k );
                        }
                        saveData[k] = mediaObj[k];
                    }
                }
            }

            dbSetup.data = Y.doccirrus.filters.cleanDbObject( saveData );

            Y.doccirrus.mongodb.runDb( dbSetup );
        }

        /**
         *  Method to print a media object to the console without clogging it with too much base64 data
         *
         *  @param  msg         {String}    Log message
         *  @param  media       {Object}    Media object
         *  @param  loglevel    {String}    ('info'|'warn'|'debug')
         *  @param  loggedby    {String}    Module name, attribution
         */

        function logMedia( msg, media, loglevel, loggedby ) {

            var
                tempSrc = media.source,
                mediaStr;

            media.source = `${media.source.substring( 0, 50 )}...`;
            mediaStr = JSON.stringify( media, undefined, 2 );
            media.source = tempSrc;

            Y.log( `${msg}\n${mediaStr}`, loglevel, loggedby );
        }

        /**
         *  Find the mime type of a file on disk (calls 'file' utility)
         *
         *  @param  fileName    {String}    Location of file to identify
         *  @param  callback    {Function}  Of the form fn(err, mimeType)
         */

        async function getFileMimeType( fileName, callback ) {

            fileName = fileName.replace( /"/g, '' );

            function onMimeQueried( err, stdout, stderr ) {
                if( err ) {
                    return callback( err );
                }

                Y.log( `getFileMimeType() STDOUT: ${stdout}`, 'debug', NAME );
                Y.log( `getFileMimeType() STDERR: ${stderr}`, 'debug', NAME );

                var
                    fileTypes = Y.doccirrus.media.types.fileTypes,
                    mimeType = stdout.split( ':' ).pop().trim(),
                    ext = Y.doccirrus.media.getFileExt( fileName ).toLowerCase(),
                    i;

                //  check that output contains a forwardslash (error messages should not)
                if( -1 === mimeType.indexOf( '/' ) ) {
                    callback( stdout, null );
                    return;
                }

                //  inconsistent mime type reported, between OS and applications, always use audio/mp3
                if( 'audio/mpeg' === mimeType ) {
                    mimeType = 'audio/mp3';
                }

                //  centOs reports audio/ogg as application/ogg
                if( 'application/ogg' === mimeType ) {
                    mimeType = 'audio/ogg';
                }

                //  treat quicktime videos as mp4 (experimental, not ideal, may work for iOS devices)
                if( 'video/quicktime' === mimeType || 'video/x-quicktime' === mimeType ) {
                    mimeType = 'video/mp4';
                }

                //  assume webm audio (allows microphone capture to work with RecorderJS in Chrome)
                if( 'video/webm' === mimeType ) {
                    mimeType = 'audio/webm';
                }

                if( 'text/plain' === mimeType && ext && 'con' === ext ) {
                    mimeType = 'application/con';
                }

                if( 'text/plain' === mimeType && ext && 'tfdata' === ext ) {
                    mimeType = 'application/octet-stream';
                }

                if( 'text/plain' === mimeType && ext && 'xml' === ext ) {
                    mimeType = 'application/xml';
                }

                // hack to make MOJ-13367-devtests work
                if( 'text/xml' === mimeType ) {
                    mimeType = 'application/xml';
                }

                if( 'text/plain' === mimeType && ext && 'gdt' === ext ) {
                    mimeType = 'application/gdt';
                }

                if( 'text/plain' === mimeType && ext && 'csv' === ext ) {
                    mimeType = 'application/csv';
                }

                if( 'text/plain' === mimeType && ext && 'pdf' === ext ) {
                    mimeType = 'application/pdf';
                }

                //  most likely to be, but this ambiguous, there should be a further fingerprinting test
                if( 'application/octet-stream' === mimeType ) {
                    switch( ext ) {
                        case 'mp3':
                            mimeType = 'audio/mp3';
                            break;
                        case 'mp4':
                            mimeType = 'video/mp4';
                            break;
                        case 'mov':
                            mimeType = 'video/mp4';
                            break;
                        case 'xml':
                            mimeType = 'application/xml';
                            break;
                        case 'dss':
                            mimeType = 'audio/x-dss';
                            break;
                        case 'ds2':
                            mimeType = 'audio/x-ds2';
                            break;
                        case 'pdf':
                            mimeType = 'application/pdf';
                            break;
                        default:
                            mimeType = 'application/octet-stream';
                    }
                }

                //  Zipped formats all have the same magic bytes, use file extension in this case
                if( 'application/zip' === mimeType ) {

                    Y.log( `Cannot determine file type from magic bytes, trying extension: ${ext}`, 'debug', NAME );

                    for( i = 0; i < fileTypes.length; i++ ) {
                        if( fileTypes[i].ext === ext ) {
                            mimeType = fileTypes[i].mime;
                            Y.log( `Best guess at file contents: ${JSON.stringify( fileTypes[i] )}`, 'debug', NAME );
                        }
                    }
                }

                mimeType = mimeType.replace( 'svg+xml', 'svg' );
                callback( null, mimeType );
            }

            let [err, shellCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'file',
                    shellArgs: [
                        '--mime-type',
                        `"${fileName}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( `Probing mime type: ${shellCmd}`, 'info', NAME );
            shellexec( shellCmd, onMimeQueried );
        }

        /**
         *  Wrapper for command line identify
         *
         *  @param  fileName    {String}    Location of an image on disk [string]
         *  @param  callback    {Function}  Of the form fn(err, imgMeta)
         */

        async function identify( fileName, callback ) {

            if( false === Y.doccirrus.filters.isLegalFileName( fileName ) ) {
                Y.log( `SECURITY: attempt include unsafe file name in shell command: ${fileName}`, 'warn', NAME );
                callback( 'File name not allowed by security layer' );
                return;
            }

            let [err, shellCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'gm',
                    shellArgs: [
                        'identify',
                        `"${fileName.replace( /"/g, '' )}"`
                    ]
                } )
            );

            if( err ) {
                return callback( err );
            }

            var imageMeta = {
                'fileName': fileName,
                'widthPx': -1,
                'heightPx': -1,
                'mime': 'unknown'
            };

            shellexec( shellCmd, onIdentifyComplete );

            function onIdentifyComplete( err, stdout, stderr ) {
                Y.log( `identify() STDOUT:${stdout}`, 'debug', NAME );

                if( err ) {
                    Y.log( `STDERR:${stderr}`, 'debug', NAME );
                    callback( err, null );
                    return;
                }

                var dimensions;

                //  there may be multiple frames or layers in an image, here we just want the first

                stdout = stdout.split( '\n' )[0];
                Y.log( `identify():STDOUT first line: ${stdout}`, 'warn', NAME );
                stdout = stdout.replace( new RegExp( `${fileName}[0]` ), '' );
                Y.log( `identify():STDOUT replace array file name: ${stdout}`, 'warn', NAME );
                stdout = stdout.replace( new RegExp( fileName ), '' );
                Y.log( `identify():STDOUT replace simple file name: ${stdout}`, 'warn', NAME );

                imageMeta.parts = stdout.split( ' ' );
                Y.log( `identify() parts: ${JSON.stringify( imageMeta.parts )}`, 'debug', NAME );

                if(
                    ('PNG' === imageMeta.parts[1]) ||
                    ('GIF' === imageMeta.parts[1]) ||
                    ('JPEG' === imageMeta.parts[1]) ||
                    ('SVG' === imageMeta.parts[1]) ||
                    ('SVG+XML' === imageMeta.parts[1]) ||
                    ('PDF' === imageMeta.parts[1]) ||
                    ('TIFF' === imageMeta.parts[1])
                ) {
                    dimensions = imageMeta.parts[2].split( 'x' );
                    imageMeta.mime = `image/${imageMeta.parts[1].toLowerCase().replace( 'svg+xml', 'svg' )}`;
                    imageMeta.widthPx = parseInt( dimensions[0], 10 );
                    imageMeta.heightPx = parseInt( dimensions[1], 10 );
                }

                callback( null, imageMeta );
            }
        }

        /**
         *  Get the mime type of a dataUrl
         *  @param  dataUrl     {String}
         *  @return             {String}    Mime type of data url
         */

        function getDataUrlMimeType( dataUrl ) {

            var
                dataHead = dataUrl.split( ';', 2 )[0],
                mime = dataHead.split( ':', 2 )[1];

            mime = mime.replace( 'svg+xml', 'svg' );

            //Y.log( 'Extracted MIME type for dataUrl: ' + mime, 'debug', NAME );
            return mime;
        }

        /**
         *  Create a random filename in temp dir, not available to clients
         *  Filenames are preceded by timestamp, in case we want a cron job to remove old ones
         *
         *  @param  mediaObj            {Object}    As in media-schema.server.js
         *  @param  mediaObj.mime       {String}    MIME_TYPE of media
         *  @param  mediaObj.transform  {String}    Transform name
         *  @returns                    {String}    Random filename in temp dir
         */

        function getTempFileName( mediaObj ) {
            var
                timestamp = new Date().getTime(),
                randId = Math.random().toString( 36 ).slice( 2 ),
                ext = Y.doccirrus.media.getExt( mediaObj.mime ),
                transformName = mediaObj.transform ? mediaObj.transform : 'original';

            ext = ext.replace( '.', '' );

            return `${imagetemp + timestamp}_${randId}_${transformName}.${Y.doccirrus.fileutils.tmpName}.${ext}`;
        }

        /**
         *  Delete temporary / intermediate files from greneration of transform
         *
         *  @param  mediaObj                {Object}    media-schema.common.js
         *  @param  mediaObj._tempFiles     {Object}    Array of filenames in imagetemp
         */

        function cleanTempFiles( mediaObj ) {
            function cleanSingleFile( fileName ) {
                function onCleanup( err ) {
                    if( err ) {
                        Y.log( `Could not delete temp file: ${JSON.stringify( err )}` );
                        return;
                    }
                    Y.log( `Removed temp file: ${fileName}`, 'debug', NAME );
                }

                Y.doccirrus.media.tempRemove( fileName, onCleanup );
            }

            if( !mediaObj._tempFiles || 0 === mediaObj._tempFiles.length ) {
                return;
            }
            Y.log( `Cleaning up temporary / intermediate files: ${JSON.stringify( mediaObj._tempFiles, undefined, 2 )}`, 'debug', NAME );
            mediaObj._tempFiles.forEach( cleanSingleFile );
        }

        /**
         *  Check if a file exists in the temp directroy
         *
         *  The callback will give the location in the cache if found, and the expected filename if not
         *
         *  @param  fileName    {String}    File in temp directory
         *  @param  callback    {Function}  Of the form fn(err, fileName)
         */

        function tempHas( fileName, callback ) {

            Y.log( `Checking media temp directory for: ${fileName}`, 'info', NAME );

            var
                baseName = path.basename( fileName ),
                tempFileName = imagetemp + baseName;

            fs.stat( tempFileName, onStat );

            function onStat( err ) {

                if( err ) {
                    //  does not exist in cache, but return the exprect filename anyway
                    callback( err, tempFileName );
                    return;
                }

                //  does exist, and is here
                callback( null, tempFileName );
            }
        }

        /**
         *  This is a simple shortcut function to remove temp files when no longer needed
         *
         *  @param  fileName    {String}    Location of a temp file
         *  @param  [callback]  {Function}  Of the form fn(err), optional
         */

        function tempRemove( fileName, callback ) {

            if( 'function' !== typeof callback ) {
                callback = null;
            }

            if( !fileName || '' === fileName ) {
                //  nothing to delete
                Y.log( 'Cannot remove media from temp directory: fileName not given', 'warn', NAME );
                console.log( 'stack trace follows: ', new Error().stack );  //  eslint-disable-line no-console
                if( callback ) {
                    return callback( null );
                }
                return;
            }

            if( -1 === fileName.indexOf( `.${Y.doccirrus.fileutils.tmpName}` ) && 0 !== fileName.indexOf( tempDir ) ) {
                //  do not delete static files / assets, security
                if( callback ) {
                    return callback( null );
                }
                return;
            }

            fs.exists( fileName, onExistCheck );

            function onExistCheck( isThere ) {
                if( !isThere ) {
                    if( callback ) {
                        return callback( 'File does not exist.' );
                    }
                    return;
                }

                fs.unlink( fileName, onUnlink );
            }

            function onUnlink( err ) {
                if( err ) {
                    Y.log( `Error removing temp file: ${err}`, 'warn', NAME );
                    if( callback ) {
                        return callback( err );
                    }
                    return;
                }
                if( callback ) {
                    return callback( null );
                }
            }
        }

        /**
         *  Create a filename in for media cache, file will be available via dcimagecache middleware
         *
         *  These filenames should follow a predicatble format, so that presence in cache can be established
         *  on future requests.
         *
         *  @param  mediaObj                {Object}    Media object as described in head of this file
         *  @param  [mediaObj._id]          {String}    Database _id of media object, if any
         *  @param  [mediaObj._transformOf] {String}    Database _id of the media this was generated from, if any
         *  @param  mediaObj.transform      {String}    Name of a media transform type
         *  @param  mediaObj.widthPx        {Number}    In pixels
         *  @param  mediaObj.heightPx       {Number}    In pixels
         *  @param  mediaObj.mime           {String}    MIME_TYPE
         *  @param  relPath                 {Boolean}   Return relative path
         *  @return                         {String}    Cache file name for this transform
         */

        function getCacheFileName( mediaObj, relPath ) {
            var
                useId = mediaObj._id || mediaObj._transformOf || 'NOID',
                transName = mediaObj.transform || 'original',
                dir = relPath ? cacheDir : '',
                ext = Y.doccirrus.media.getExt( mediaObj.mime );

            if( 'resize' === transName ) {
                transName = `${mediaObj.widthPx}x${mediaObj.heightPx}`;
            }
            return `${dir + useId}_${transName}.${mediaObj.mime}.${ext.replace( '.', '' )}`;
        }

        /**
         *  Given the location of a file in the cache, return the URL to access it from middleware
         *  @param  cacheFileName   {String}    A file on disk
         *  @return                 {String}    URL of this file
         */

        function getCacheUrl( cacheFileName ) {
            //  This may become more elaborate in future, for access control, etc

            var linkPrefix = (cacheFileName.indexOf( '.pdf' ) > 0) ? '/pdf/' : '/img/';

            return `${cacheFileName.replace( cacheDir, linkPrefix )}?fixCache=${Math.floor( Math.random() * 999999 )}`;
        }

        /**
         *  Check if an image exists in the cache
         *
         *  The callback will give the location in the cache if found, and the expected filename if not
         *
         *  @param  media       {Object}    Object to cache
         *  @param  callback    {Function}  Of the form fn( err, inCache, expectFileName )
         */

        function cacheHas( media, callback ) {
            var cacheFileName = getCacheFileName( media, true );

            function onStatCacheFile( err /*, stats */ ) {
                var inCache = false;

                if( err ) {
                    Y.log( ' ... Could not find item in cache.', 'debug', NAME );
                } else {
                    inCache = true;
                }

                callback( null, inCache, cacheFileName );
            }

            fs.stat( cacheFileName, onStatCacheFile );
        }

        /**
         *  Store a media item in the cache
         *
         *  @param  mediaObj                {Object}    Media item to store in cache
         *  @param  [mediaObj._id]          {String}    Database _id of media object, if any
         *  @param  [mediaObj._transformOf] {String}    Database _id of media object this was created from, if any
         *  @param  [mediaObj._cacheFile]   {String}    Key in media transform cache, see dcmedia middleware
         *  @param  mediaObj.transform      {String}    Describes how file was modified
         *  @param  mediaObj._diskFile      {String}    Location of this file on disk
         *  @param  mediaObj.mime           {String}    MIME_TYPE of file
         *  @param  callback                {Function}  Of the form fn(err, fileName)
         */

        function cacheStore( mediaObj, callback ) {
            var newPath;

            mediaObj._cacheFile = getCacheFileName( mediaObj, false );
            newPath = Y.doccirrus.media.getCacheDir() + mediaObj._cacheFile;

            function onFileMoved( err ) {
                if( err ) {
                    return callback( err );
                }
                mediaObj._diskFile = newPath;
                callback( null, newPath );
            }

            fs.rename( mediaObj._diskFile, newPath, onFileMoved );
        }

        /**
         *  Remove all transforms of an image from the cache
         *
         *  This may be used when an image is deleted (cached copes should also be removed), or when an image
         *  is overwritten at the same UID and cached transforms are no longer valid (not recommended)
         *
         *  Note that the deleted file may not yet be removed from the disk when the callback happens.
         *
         *  @param  media       {Object}    Media object, all transforms of which will be cleared from cache
         *  @param  callback    {Function}  Of the form fn(err, arrayOfDeletedFiles)
         */

        function cacheRemove( media, callback ) {

            if( !callback ) {
                Y.log( 'No callback given for Y.doccirrus.media.cacheRemove', 'warn', NAME );
                callback = function( err, deleted ) {
                    if( err ) {
                        Y.log( `Could not delete files from media cache: ${err}`, 'error', NAME );
                        return;
                    }
                    Y.log( `Deleted files from media cache: ${JSON.stringify( deleted )}`, 'info', NAME );
                };
            }

            function onListDir( err, files ) {
                if( err ) {
                    Y.log( `Could not list contents of cache directory: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }

                var
                    i,
                    id = media._id,
                    deleted = [];

                for( i = 0; i < files.length; i++ ) {
                    if( (`${id}_`) === (`${files[i].substring( 0, id.length )}_`) ) {

                        //  we have found a transform of this image
                        Y.log( `Deleting file: ${files[i]}`, 'info', NAME );
                        deleted.push( files[i] );

                        fs.unlink( cacheDir + files[i], onDeleted );
                    }

                }

                callback( null, deleted );
            }

            function onDeleted( err ) {
                if( err ) {
                    Y.log( 'Could not delete file from cache dir.', 'warn', NAME );
                }
            }

            //  list files in cache beginning with this ID
            fs.readdir( cacheDir, onListDir );
        }

        /**
         *  Given a cache filename, return just the MIME_TYPE string
         *  @param cacheFileName
         */

        function getCacheMime( cacheFileName ) {
            var parts = cacheFileName.split( '.' );
            return parts[1] || 'UNKNOWN';
        }

        //  GETTERS AND SETTERS

        function getTempDir() {
            return imagetemp;
        }

        function getCacheDir() {
            return cacheDir;
        }

        function getFontDir() {
            return fontDir;
        }

        function getMaxFileSize() {
            return UPLOAD_MAX_SIZE;
        }

        /**
         *  Given a media object, will return file detials from cache or crreate a file, save it in cache and return
         *  file details from cache
         *
         *
         *  @param  {Object}    user        User object
         *  @param  {Object}    mediaObj    Media object
         *  @returns    {*}                 Promise
         *
         *  Returns a Promise with success as same mediaObj with additional keys _diskFile, _fileExt, _inCache attached to it or error
         */
        function getImageFromMediaObject( user, mediaObj ) {
            return new Promise( ( resolve, reject ) => {
                cacheHas( mediaObj, function onCacheCheck( err, inCache ) {
                    if( err ) {
                        reject( err );
                    } else {
                        Y.log( `File is in cache: ${inCache ? 'TRUE' : 'FALSE'}`, 'debug', NAME );
                        mediaObj._inCache = inCache;
                        mediaObj._cacheFile = getCacheFileName( mediaObj, false );

                        if( inCache ) {
                            mediaObj._diskFile = getCacheDir() + mediaObj._cacheFile;
                            mediaObj._fileExt = getFileExt( mediaObj._cacheFile ).toLowerCase();
                        }
                        resolve( mediaObj );
                    }
                } );
            } )
                .then( ( mediaObj ) => {
                    return new Promise( ( resolve, reject ) => {
                        if( mediaObj._inCache ) {
                            resolve( mediaObj );
                        } else {
                            Y.doccirrus.media.transform.create( user, mediaObj, function onTransformCreated( err, cacheFile ) {
                                if( err ) {
                                    Y.log( "File not found in cache on transform", 'error', NAME );
                                    reject( err );
                                } else {
                                    mediaObj._inCache = true;
                                    mediaObj._cacheFile = cacheFile;
                                    mediaObj._diskFile = getCacheDir() + mediaObj._cacheFile;
                                    mediaObj._fileExt = getFileExt( cacheFile ).toLowerCase();
                                    resolve( mediaObj );
                                }
                            } );
                        }
                    } );
                } );
        }

        /**
         *  Converts a buffer to an ascii/binary string of its contents
         *
         *  This is of limited use right now, but the output of this function can be returned to a
         *  client via res.end(myString 'binary')
         *
         *  @//param  someBuffer  {Object}    A buffer object contining binary data
         *  @//returns            {String}    Buffer contents as a string
         */

            //        function bufferToRawString( someBuffer ) {
            //            var
            //                i = 0,
            //                str = '';
            //
            //            for( i = 0; i < someBuffer.length; i++ ) {
            //                str = str + String.fromCharCode( someBuffer.readUInt8( i ) );
            //            }
            //            return str;
            //        }

            //  API USED BY MOJITS AND OTHER AUTOLOAD COMPONENTS

        var
            myNS = Y.namespace( 'doccirrus' ).media,
            mixMethods = {
                initialized,
                hasAntiVirus,

                //  Filesystem utils
                mkdirIfMissing,
                listRecursive,
                deleteRecursive,
                pathIsInDir,

                readFile,
                readFileWithHash,
                writeFile,
                virusScan,
                virusScanGridFS,
                virusScanEnabled,
                recordMalwareAuditEntry,

                //  File and media object IO
                'importMediaFromFile': importMediaFromFile,
                'mediaFromFile': mediaFromFile,
                'mediaFromUpload': mediaFromUpload,
                'mediaFromDB': mediaFromDB,
                'mediaToDB': mediaToDB,
                'checkMedia': checkMedia,
                'logMedia': logMedia,
                'cleanFileName': cleanFileName,
                'base64Func': base64Func,
                'dataUriToBuffer': dataUriToBuffer,

                //  cache lookup and management
                'getCacheFileName': getCacheFileName,
                'getCacheUrl': getCacheUrl,

                'cacheRemove': cacheRemove,
                'cacheStore': cacheStore,
                'cacheHas': cacheHas,
                'getCacheMime': getCacheMime,

                //  temp dir lookup and management
                'getTempFileName': getTempFileName,
                'tempRemove': tempRemove,
                'tempHas': tempHas,
                'cleanTempFiles': cleanTempFiles,

                //  metadata extraction
                'getFileExt': getFileExt,                   //  file extension given file name
                'getFileMimeType': getFileMimeType,         //  mime type given file name
                'getDataUrlMimeType': getDataUrlMimeType,   //  mime type given dataurl

                'identify': identify,                       //  DANGEROUS, SSI

                //  getters for this object's properties
                'getTempDir': getTempDir,
                'getCacheDir': getCacheDir,
                'getFontDir': getFontDir,
                'getMaxFileSize': getMaxFileSize,
                'getImageFromMediaObject': getImageFromMediaObject,

                //  redirect to types module TODO: remove
                'getMime': function( mimeType ) {
                    return Y.doccirrus.media.types.getMime( mimeType );
                },
                'getMimeType': function( mime ) {
                    return Y.doccirrus.media.types.getMimeType( mime );
                },
                'getCategory': function( mimeType ) {
                    return Y.doccirrus.media.types.getCategory( mimeType );
                },
                'getExt': function( mimeType ) {
                    return Y.doccirrus.media.types.getExt( mimeType );
                }

            }, k;

        // mix in media utilities
        for( k in mixMethods ) {
            if( mixMethods.hasOwnProperty( k ) ) {
                myNS[k] = mixMethods[k];
            }
        }

        init(
            function onInit( err, isFatal ) {
                if( err ) {
                    if( !isFatal ) {
                        //  not all startup errors are fatal
                        Y.log( `${'Non-fatal error intializing media store store:' + '\n'}${err}`, 'warn', NAME );
                        initOk = true;
                        return;
                    }

                    //  fail early and noisily if the image store can't be set up
                    Y.log( `${'Warning, could not initialize media store, reason:' + '\n'}${err}`, 'warn', NAME );
                    process.exit( 1 );
                }
            }
        );

    },
    '0.0.1', {
        requires: [
            'dcmedia-filetypes',
            'dcmedia-gridfs',
            'dcmedia-transform',
            'dcmedia-images',
            'dcmedia-audio',
            'dcmedia-video',
            'dcmedia-barcode',
            'dcmedia-fonts',
            'dcmedia-hpdf',
            'dcmedia-pdf',
            'dcmedia-relationships'
        ]
    }
);
