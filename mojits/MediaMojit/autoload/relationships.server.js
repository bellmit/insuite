/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Dev / troubleshooting code to check relationships between GridFS, media, documents and activities
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */


YUI.add(
    /* YUI module name */
    'dcmedia-relationships',

    /* Module code */
    function( Y, NAME ) {

        var
            async = require( 'async' ),
            fs = require( 'fs' ),
            crypto = require( 'crypto' );

        /**
         *  Go through media and confirm that their owning object exists
         *
         *  Note: This will save a report in the temp directory, since the operation may be too slow for HAProxy
         *
         *  @param  args
         *  @param  args.user       {Object}    REST user or equivalent
         *  @param  args.callback
         */

        function checkMediaOwners( args ) {

            var
                report = '',
                tempDir = Y.doccirrus.media.getTempDir(),
                reportFile = tempDir + '/media_owner_report.txt',
                mediaCount = 0,
                issueCount = 0,
                mediaModel;

            //  add a line to the report
            function rec( prefix, line ) {
                report = report + '[' + prefix + prefix + ']' + line + '\n';
                Y.log( 'checkMediaOwners: ' + line, 'debug', NAME );
            }

            rec( '-', 'Checking media owners exists for all media objects' );

            async.series( [ getMediaModel, streamAllMedia, writeReportToDisk ], onAllDone );

            function getMediaModel( itcb ) {
                rec( '-', 'Creating media model...' );
                Y.doccirrus.mongodb.getModel( args.user, 'media', true, onMediaModelCreated );
                function onMediaModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    mediaModel = newModel;
                    itcb( null );
                }
            }

            function streamAllMedia( itcb ) {
                var
                    mediaStream,
                    query = {};

                function onStreamData( mediaObj ) {
                    Y.log( 'Processing next media object from stream: ' + mediaObj._id, 'debug', NAME );

                    //  pause the stream while processing this
                    mediaStream.pause();
                    checkSingleMediaObject( mediaObj, onSingleProcessed );

                    function onSingleProcessed( err ) {
                        if ( err ) {
                            //  Log the error but do not cancel or interrupt migration
                            rec( '!', 'Error while processing media object: ' + JSON.stringify( err ), 'warn', NAME );
                            issueCount = issueCount + 1;
                        }

                        //  resume the stream to get next object
                        mediaStream.resume();
                    }
                }

                function onStreamEnd() {
                    rec( '-', 'Finished checking ownership all ' + mediaCount + ' media objects.  Issues found: ' + issueCount );
                    itcb( null );
                }

                function onStreamError( err ) {
                    rec( 'Error in media stream: ' + JSON.stringify( err ) );
                    itcb( err );
                }

                mediaStream = mediaModel.mongoose.find( query, {}, { timeout: true } ).stream();
                mediaStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            function checkSingleMediaObject( mediaObj, itcb ) {
                rec( '>', 'Checking single media object: ' + mediaObj._id + ' owned by ' + mediaObj.ownerCollection + '::' + mediaObj.ownerId );

                mediaCount = mediaCount + 1;

                if ( !mediaObj.ownerCollection || '' === mediaObj.ownerCollection + '' ) {
                    return itcb( 'Media does not have owner collection: ' + mediaObj._id );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': mediaObj.ownerCollection + '',
                    'query': { '_id': mediaObj.ownerId },
                    'callback': onOwnerLoaded
                } );

                function onOwnerLoaded( err, result ) {
                    if ( !err && 0 === result.length ) {
                        err = 'Owner of media object ' + mediaObj._id + ' does not exist: ' + mediaObj.ownerCollection + '::' + mediaObj.ownerId ;
                    }

                    if ( err) {

                        if ( 'forms' === mediaObj.ownerCollection + '' || 'formtemplate' === mediaObj.ownerCollection + '' ) {
                            //  it's normal for forms to be deleted, but form versions to be kept, or for there to be images from very
                            //  early forms which used a different collection before migration
                            return itcb( null );
                        }

                        return itcb( 'Could load owner of media ' + mediaObj._id + ': ' + JSON.stringify( err ) );
                    }

                    //  brevity, don't note successful lookup
                    itcb( null );
                }
            }

            function writeReportToDisk( itcb ) {
                fs.writeFile( reportFile, report, onReportSaved );
                function onReportSaved( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem while checking media owners: ' + JSON.stringify( err ) );
                    return args.callback( err );
                }
                args.callback( null, report );
            }

        }

        /**
         *  Go through media collection and find duplicate files
         *
         *  @param  args
         *  @param  args.user
         *  @param  args.callback
         */

        function checkMediaDuplicates( args ) {

            var
                //  only hash objects smaller than 32MB (prevent crash on massive files in memory)
                MAX_SIZE = 32 * 1024 * 1024,

                tempDir = Y.doccirrus.media.getTempDir(),
                reportFile = tempDir + '/media_duplicate_report.txt',
                report = '',
                mediaModel,
                hashes = {};

            //  add a line to the report
            function rec( prefix, line ) {
                report = report + '[' + prefix + prefix + ']' + line + '\n';
                Y.log( 'checkMediaDuplicates: ' + line, 'debug', NAME );
            }

            //  call back immediately, process takes too long to pass HAproxy or zombie killer
            args.callback( null, 'started generation of duplicate media report' );  // eslint-disable-line callback-return

            rec( '-', 'Looking up duplicate media objects' );

            async.series( [ getMediaModel, streamAllMedia, checkDuplicates, writeReportToDisk ], onAllDone );

            function getMediaModel( itcb ) {
                rec( '-', 'Creating media model...' );
                Y.doccirrus.mongodb.getModel( args.user, 'media', true, onMediaModelCreated );
                function onMediaModelCreated( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    mediaModel = newModel;
                    itcb( null );
                }
            }

            function streamAllMedia( itcb ) {
                var
                    mediaStream,
                    query = {},
                    issueCount = 0,
                    mediaCount = 0;

                function onStreamData( mediaObj ) {
                    Y.log( 'Processing next media object from stream: ' + mediaObj._id, 'debug', NAME );

                    //  pause the stream while processing this
                    mediaStream.pause();
                    checkSingleMediaObject( mediaObj, onSingleProcessed );

                    function onSingleProcessed( err ) {
                        if ( err ) {
                            //  Log the error but do not cancel or interrupt migration
                            rec( '!', 'Error while processing media object: ' + JSON.stringify( err ), 'warn', NAME );
                            issueCount = issueCount + 1;
                        }

                        //  resume the stream to get next object
                        mediaStream.resume();
                    }
                }

                function onStreamEnd() {
                    rec( '-', 'Finished checking ownership all ' + mediaCount + ' media objects.  Issues found: ' + issueCount );
                    itcb( null );
                }

                function onStreamError( err ) {
                    rec( 'Error in media stream: ' + JSON.stringify( err ) );
                    itcb( err );
                }

                rec( '-', '' );
                rec( '-', '' );
                rec( '*', 'Creating hashes of all media in GridFS...' );
                rec( '-', '' );
                rec( '-', '' );

                mediaStream = mediaModel.mongoose.find( query, {}, { timeout: true } ).stream();
                mediaStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  get sha1 hash of referenced file and collect media ids by matching hash
            function checkSingleMediaObject( mediaObj, itcb ) {
                rec( '>', 'Checking single media object: ' + mediaObj._id + ' owned by ' + mediaObj.ownerCollection + '::' + mediaObj.ownerId );

                Y.doccirrus.media.gridfs.loadFileMeta( args.user, mediaObj._id + '', false, onLoadMeta );

                function onLoadMeta( err, metaObj ) {
                    if ( err ) { return itcb( err ); }

                    //  skip export of very large files - crashes server
                    if ( metaObj.length > MAX_SIZE ) {
                        rec( '!', 'Skipping large file ' + mediaObj._id + ', size: ' + metaObj.size );
                        return itcb( null );
                    }

                    Y.doccirrus.media.gridfs.exportBuffer( args.user, mediaObj._id, false, onLoadBuffer );
                }

                function onLoadBuffer( err, buf ) {
                    if ( err ) { return itcb( err ); }

                    var
                        shasum = crypto.createHash('sha1'),
                        digest;

                    shasum.update( buf );
                    digest = shasum.digest('hex');

                    if ( !hashes.hasOwnProperty( digest ) ) {
                        rec( 'i', 'Found first occurrence of file ' + digest + ' with media id: ' + mediaObj._id );
                        hashes[ digest ] = [];
                    } else {
                        rec( 'i', 'Found duplicate occurrence of file ' + digest + ' with media id: ' + mediaObj._id );
                    }

                    hashes[ digest ].push( mediaObj._id + '' );
                    itcb( null );
                }

            }

            function checkDuplicates( itcb ) {
                var k;

                rec( '-', '' );
                rec( '-', '' );
                rec( '*', 'Counting duplicates...' );
                rec( '-', '' );
                rec( '-', '' );

                for ( k in hashes ) {
                    if ( hashes.hasOwnProperty( k ) ) {
                        if ( hashes[k].length > 1 ) {
                            rec( '-', 'Multiple copies of files with hash ' + k + ' (' + hashes[k].length + '): ' + JSON.stringify( hashes[k] ) );
                        }
                    }
                }

                itcb( null );
            }

            function writeReportToDisk( itcb ) {
                fs.writeFile( reportFile, report, onReportSaved );
                function onReportSaved( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem while checking media owners: ' + JSON.stringify( err ) );
                }
            }

        }

        /**
         *  Extend YUI object with a method to instantiate these
         */

        Y.namespace( 'doccirrus.media' ).relationships = {
            checkMediaOwners: checkMediaOwners,
            checkMediaDuplicates: checkMediaDuplicates
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);