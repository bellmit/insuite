/**
 * User: do
 * Date: 19.11.14  12:02
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * Some helper function to work with filesystem.
 */

/*global YUI*/

'use strict';

YUI.add( 'dcfileutils', function( Y, NAME ) {

        var
            fs = require( 'fs' ),
            Path = require( 'path' ),
        // this is the singleton Utils Object for the application
        // at the moment offers static functions
            myUtils;

        /**
         * Constructor for the module class.
         *
         * @class DCFileUtils
         * @private
         */
        function DCFileUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        DCFileUtils.prototype.init = function() {
            Y.log( 'init file utils', 'info', NAME );
        };

        /**
         * Creates directory at the specified path.
         * Also creates not existing subdirectories.
         *
         * @param path
         */
        DCFileUtils.prototype.mkdirpSync = function( path ) {
            //
            var stats,
                pathToCheck = '/',
                pathArr = Path.resolve( path ).split( Path.sep );

            function makeDir( p ) {
                fs.mkdirSync( p );
            }

            while( pathArr.length ) {
                pathToCheck = Path.join( pathToCheck, pathArr.shift() );
                try {
                    stats = fs.statSync( pathToCheck );
                } catch( err ) {
                    if( 'ENOENT' === err.code ) {
                        makeDir( pathToCheck );
                    } else {
                        throw err;
                    }
                }
                if( !stats.isDirectory() ) {
                    throw new Error( 'Could not create directory ' + pathToCheck + '. This path is a File' );
                }
            }
        };
        /**
         * Determines if path is absolute.
         * See discussion here http://stackoverflow.com/questions/21698906/how-to-check-if-a-path-is-absolute-or-relative
         * @param path
         * @returns {boolean}
         */
        DCFileUtils.prototype.isAbsolute = function( path ) {
            return Path.resolve( path ) === Path.normalize( path ).replace( new RegExp( Path.sep + '$' ), '' );
        };

        /**
         * Returns absolute path, if path is not already an absolute path.
         * Uses process.cwd to resolve path.
         * @param path
         * @returns {*}
         */
        DCFileUtils.prototype.resolve = function( path ) {
            if( Y.doccirrus.fileutils.isAbsolute( path ) ) {
                return path;
            } else {
                return Path.join( process.cwd(), path );
            }
        };

        /**
         * Removes all files in specified path recursively.
         *
         * @param path
         * @param includePath delete the whole path?
         * @param excludeList list of paths that should be left out
         */
        DCFileUtils.prototype.cleanDirSync = function cleanDir( path, includePath, excludeList ) {
            var
                config,
                imageCacheDir= 'var/tmp/imagecache';

            try {
                config = require( 'dc-core' ).config.load( process.cwd() + '/env.json' );

                imageCacheDir = config.directories.tmp + '/imagecache';

                Y.log('imagecache dir location: ' + imageCacheDir, 'info', NAME);

            } catch( e ) {
                Y.log( 'Could not define imagecache folder location. Error: ' + JSON.stringify( e ), 'error', NAME );
            }

            if ( excludeList && Array.isArray(excludeList) && excludeList.includes(imageCacheDir) ) {
                excludeList.push(imageCacheDir);
            } else {
                excludeList = [imageCacheDir];
            }

            fs.readdirSync( path ).forEach( function( file ) {

                //  when starting two instances simultaneously this can fail, when both read the directory list at
                //  the same time, one deleted the file, the other gets ENOENT

                var
                    curPath = Path.join( path, file ),
                    curStat;

                try {
                    curStat = fs.statSync( curPath );
                } catch( statErr ) {
                    Y.log( 'Could not stat' + curPath + ': ' + JSON.stringify( statErr ), 'warn', NAME );
                }

                if( curStat && curStat.isDirectory && curStat.isDirectory() && !(excludeList && -1 < excludeList.indexOf( curPath )) ) {

                    cleanDir( curPath );

                    try {
                        fs.rmdirSync( curPath );
                    } catch( delErr ) {
                        Y.log( 'Could not delete directory ' + curPath + ': ' + JSON.stringify( delErr ), 'warn', NAME );
                    }

                } else {

                    try {
                        fs.unlinkSync( curPath );
                    } catch( delErr ) {
                        Y.log( 'Could not delete file ' + curPath + ': ' + JSON.stringify( delErr ), 'warn', NAME );
                    }

                }
            } );
            if( includePath ) {
                //  catch this error to prevent crash / race condition on server start
                try {
                    fs.rmdirSync( path );
                } catch (rmErr) {
                    Y.log('Could not remove directory: ' + JSON.stringify(rmErr), 'warn', NAME);
                }

            }
        };

        DCFileUtils.prototype.isDirectorySync = function( path ) {
            var stats = fs.statSync( path );
            return stats.isDirectory();
        };

        DCFileUtils.prototype.isWritableSync = function( path ) {
            var filepath = Path.join( path, 'test' );
            try {
                fs.writeFileSync( filepath, 'test' );
            } catch( err ) {
                return false;
            }
            fs.unlinkSync( filepath );
            return true;
        };

        /**
         * The listener callback gets two arguments (event, filename / directory ).
         * event is either 'rename' or 'change', and filename is the name of the file which triggered the event.
         *
         * WARNING: the functionality is not fully cross platform and the callback might be called twice with a single change
         *  https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener
         *
         * @param path
         * @param callback
         * @returns {fs.FSWatcher}
         * @see https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener
         */
        DCFileUtils.prototype.watch = function( path, listener, callback ) {
            fs.exists( path, function( exists ) {
                var
                    fsWatcher;
                if( exists ) {
                    try {
                        fsWatcher = fs.watch( path, {persistent: false}, listener );
                        callback( null, fsWatcher );
                    } catch( e ) {
                        callback( e );
                    }
                } else {
                    callback( 'the file / directory does not exist' );
                }
            } );
        };

        /**
         * Creates directory at specified path and deletes it after done (passed to onCreated) is called.
         * Callback will be called with arguments passed to done
         *
         * @param {String} path
         * @param {Function} onCreated(done)
         * @param {Function} callback
         */
        DCFileUtils.prototype.createTmpAndDeleteAfter = function ( path, onCreated, callback ) {
            var Path = require('path' ),
                fs = require( 'fs' );

            function done() {
                // delete
                Y.doccirrus.fileutils.cleanDirSync( path, true );
                callback.apply( null, arguments );
            }

            function makeTmpTmpCb( err ) {
                if( err ) {
                    Y.log( 'Could not create tmp dir in tmp directory at ' + path + '/tmp : ' + err, 'error', NAME );
                    callback( err );
                    return;
                }
                onCreated( done );
            }

            function makeTmpDirCb( err ) {
                if( err ) {
                    Y.log( 'Could not create tmp dir directory at ' + path + ' : ' + err, 'error', NAME );
                    callback( err );
                    return;
                }
                fs.mkdir( Path.join(path, 'tmp'), makeTmpTmpCb );
            }

            fs.mkdir( path, makeTmpDirCb );
        };

        DCFileUtils.prototype.recursiveCopySync = function ( srcDir, dstDir ) {
            let
                self = this,
                list = fs.readdirSync( srcDir ),
                src,
                dst;

            list.forEach( function( file) {
                src = srcDir + '/' + file;
                dst = dstDir + '/' + file;
                let stat = fs.statSync( src );
                if ( stat && stat.isDirectory() ) {
                    try {
                        Y.log( 'creating dir: ' + dst );
                        fs.mkdirSync( dst );
                    } catch(e) {
                        Y.log( 'directory already exists: ' + dst );
                    }
                    self.recursiveCopySync( src, dst );
                } else {
                    try {
                        Y.log( 'copying file: ' + dst );
                        fs.writeFileSync( dst, fs.readFileSync( src ) );
                    } catch(e) {
                        Y.log( 'could\'t copy file: ' + src );
                    }
                }
            });
        };


        myUtils = new DCFileUtils();
        myUtils.init();
        myUtils.tmpName = '_tmp_';

        Y.namespace( 'doccirrus' ).fileutils = myUtils;

    },
    '0.0.1', {requires: [] }
);
