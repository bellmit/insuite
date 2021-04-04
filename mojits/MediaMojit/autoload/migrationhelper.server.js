/**
 *  Utilities to update media to new versions and features
 *  @author: strix
 *  @date: 2016-06-29
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'mediamojit-migrationhelper', function( Y, NAME ) {

        var
            async = require( 'async' ),
            fs = require( 'fs' ),
            crypto = require( 'crypto' ),

            EXIF_ORIENTATION_MARKER = 'exif:Orientation:';
    
        /**
         *  Stream all media to a callback
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  query           {Object}    Mongoose query
         *  @param  inMigration     {Boolean}   True if in migration
         *  @param  forEachItem     {Function}  Of the form fn( item, callback )
         *  @param  callback        {Function}  Of the form fn( err, count )
         */

        function streamMediaTo( user, query, inMigration, forEachItem, callback ) {
            var mediaModel, mediaCount = 0;

            Y.log( 'Streaming objects from media collection, ' + ( inMigration ? 'IN MIGRATION' : 'test migration' ) );

            async.series( [ makeMediaModel, streamAllMedia ], callback );

            //  1. Make a media model, use its mongoose model to stream media objects from the database
            function makeMediaModel( itcb ) {
                function onModelCreated( err, model ) {
                    if ( err ) { return itcb( err ); }
                    mediaModel = model;
                    itcb( null );
                }

                Y.doccirrus.mongodb.getModel( user, 'media', true, onModelCreated );
            }

            //  2. Stream and update all media objects
            function streamAllMedia( itcb ) {
                var mediaStream;

                function onStreamData( mediaObj ) {
                    Y.log( 'Processing next media object from stream: ' + mediaObj._id, 'debug', NAME );

                    //  pause the stream while processing this
                    mediaStream.pause();
                    forEachItem( mediaObj, onSingleProcessed );


                    function onSingleProcessed( err ) {
                        if ( err ) {
                            //  Log the error but do not cancel or interrupt migration
                            Y.log( 'Error while processing stream: ' + JSON.stringify( err ), 'warn', NAME );
                        }

                        //  resume the stream to get next object
                        mediaCount = mediaCount + 1;
                        mediaStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( 'Finished processing all ' + mediaCount + ' media objects.', 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( 'Error in media stream: ' + JSON.stringify( err ), 'debug', NAME );
                    itcb( err );
                }

                mediaStream = mediaModel.mongoose.find( query, {}, { timeout: true } ).stream();
                mediaStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

        }

        /**
         *  Move a file from mediaObj.source (dataURI) to GridFS (binary)
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mediaObj    {Object}    As in media-schema.common.js
         *  @param  mediaModel  {Object}    A dc media model
         *  @param  inMigration {Boolean}   True if in migration
         *  @param  callback    {Function}  Of the form fn( err, strReport )
         */

        function migrateSingleMediaObject( user, mediaObj, mediaModel, inMigration, callback ) {

            var strReport = '';

            async.series(
                [
                    saveSourceToDisk,
                    getFileSize,
                    moveSourceToGridFs,
                    cleanUpDisk,
                    updateMediaObject
                ],
                onMediaDone
            );

            //  1. Write mediaObj.source dataURI to temp directory on disk
            function saveSourceToDisk( itcb ) {
                function onLegacyMediaWritten( err, tempFile ) {
                    if ( err ) {
                        report( '!' , 'Could save legacy source file to temp directory: ' + JSON.stringify( err ) );
                        return itcb( err );
                    }
                    report( 'i', 'Saved temp file: ' + tempFile );
                    mediaObj._diskFile = tempFile;
                    itcb( null );
                }
                report( '>', 'Decoding dataURI and writing to temp directory' );
                tempStoreLegacy64( mediaObj, checkSingleCB( onLegacyMediaWritten, 'onLegacyMediaWritten' ) );
            }

            //  2. Get size of file on disk
            function getFileSize( itcb ) {
                function onFileStat( err, stats ) {
                    if ( err ) { return itcb( err ); }
                    //report( 'i', 'Disk file stats: ' + JSON.stringify( stats ) );
                    report( 'i', 'Size of file on disk: ' + stats.size + ' bytes' );
                    if ( mediaObj.fileSize !== stats.size ) {
                        report( '>', 'Updating fisize recorded in media object: ' + mediaObj.fileSize + ' --> ' + stats.size + ' bytes' );
                        mediaObj.filesize = stats.size;
                    }
                    itcb( null );
                }
                fs.stat( mediaObj._diskFile, checkSingleCB( onFileStat, 'onFileStat' ) );
            }

            //  3. Load file into GridFS from disk
            function moveSourceToGridFs( itcb ) {
                function onAddedGFS( err, GFSID ) {
                    if ( err ) {
                        report( '!', 'Could not add file to GridFS: ' + JSON.stringify( err ) );
                        return itcb( err );
                    }
                    report( 'i', '... Binary file added to gridfs with GFS filename: ' + GFSID + ' (' + mediaObj.filesize + ' bytes)' );
                    itcb( null );
                }
                report( '>', 'Copying file into GridFS...' );
                Y.doccirrus.media.gridfs.importFile( user, mediaObj._id, mediaObj._diskFile, inMigration, checkSingleCB(onAddedGFS,'onAddedGFS') );
            }

            //  4. Clean up temp file
            function cleanUpDisk( itcb ) {
                //report( '>', 'Not cleaning up temp file...' );
                //itcb( null );
                report( '>', 'Cleaning up temp file...' );

                function onTempRemove( err ) {
                    if ( err ) { return itcb( err ); }
                    mediaObj._diskFile = null;
                    itcb( null );
                }

                Y.doccirrus.media.tempRemove( mediaObj._diskFile, checkSingleCB( onTempRemove, 'onTempRemove' ) );
            }

            //  5. Update media object and save back to database
            function updateMediaObject( itcb ) {

                function onMediaUpdated( err ) {
                    if ( err ) {
                        report( '!', 'Could not update media object... ' + JSON.stringify( changes ) );
                        return itcb( err );
                    }
                    report( 'i', 'Media object ' + mediaObj._id + ' saved back to database.' );
                    itcb( null );
                }

                var
                    changes = {
                        'source': '',
                        'gridfs': true,
                        'binary': true,
                        'filesize': mediaObj.filesize
                    //  'fields_': [ 'source', 'gridfs', 'binary', 'filesize' ]
                    };

                report( '>', 'Updating media object ' + mediaObj._id + ': ' + JSON.stringify( changes ) );
                mediaModel.mongoose.update( { '_id': mediaObj._id }, changes, {}, onMediaUpdated );

                /*
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'media',
                    'migrate': inMigration,
                    'action': 'put',
                    'query': {
                        '_id': mediaObj._id + ''
                    },
                    'data': changes,
                    'callback': checkSingleCB( onMediaUpdated, 'onMediaUpdated' )
                } );
                */
            }

            //  Finished with this media object
            function onMediaDone( err ) {
                if ( err ) {
                    report( '!', 'Problem while moving file to GridFS: ' + JSON.stringify( err ) );
                }

                callback( null, strReport );
            }

            //  Shortcut, add lines to report and copy warnings/errors to Y.log
            function report( ico, line ) {
                if ('' !== ico ) {
                    line = '  (' + ico + ico + ') ' + line;
                }
                Y.log( line, ( '!' === ico) ? 'warn' : 'debug', NAME );
                strReport = strReport + line + '\n';
            }
        }

        /**
         *  Write a small file from the media collection to disk
         *
         *  (small, legacy media objects prior to GridFS were stored as dataURI in mediaObj.source)
         *
         *  @param  mediaObj    {Object}    Media object to place in temp
         *  @param  callback    {Function}  Of the form fn(err, fileName)
         */

        function tempStoreLegacy64( mediaObj, callback ) {
            var
                tempFileName = Y.doccirrus.media.getTempFileName( mediaObj ),
                dataUrlString = mediaObj.source + '',
                b64String = ((-1 !== dataUrlString.indexOf(',')) ? dataUrlString.split( ',', 2 )[1] : dataUrlString),
                fileBuffer;

            Y.log( 'Serializing legacy mediaObj source to disk: ' + mediaObj.source.length + 'bytes (dataUri) / ' + b64String.length + ' bytes (base64)', 'debug', NAME );

            if( 'string' !== typeof b64String || '' === b64String ) {
                return callback( Y.doccirrus.errors.rest( 500, 'split source is not a string, original source' + mediaObj.source, true ) );
            }

            fileBuffer = Buffer.from( b64String, 'base64' );

            function onFileSaved(err) {
                if (err) {
                    Y.log( 'Could not save legacy media object to disk: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback(err);
                }
                mediaObj._diskFile = tempFileName;
                callback( null, tempFileName );
            }

            Y.log( 'Saving buffer to: ' + tempFileName + ' ' + fileBuffer.length + ' bytes (binary)', 'debug', NAME );

            fs.writeFile( tempFileName, fileBuffer, checkSingleCB( onFileSaved, 'onFileSaved' ) );
        }

        /**
         *  Check and correct metadata for all media objects in database
         *
         *  Migration for 2.17, following MOJ-5466
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  query           {Object}    Used to migrate single media objects when importing forms
         *  @param  inMigration     {Boolean}   True if in migration
         *  @param  callback        {Function}  Of the form fn( err, report )
         */

        function moveToGridFs( user, query, inMigration, callback ) {
            var
                //objectCount = -1,
                tempDir = Y.doccirrus.media.getTempDir(),
                mediaModel,
                gfsMeta = {},
                strReport = '';

            report( '', '<h1>Checking / repairing media objects</h1>' );
            streamMediaTo( user, query, inMigration, checkMediaObj, onAllDone );

            function checkMediaObj( mediaObj, onMediaChecked ) {

                mediaObj._isDirty = false;
                mediaObj._category = Y.doccirrus.media.getCategory( mediaObj.mime || 'UNKNOWN_UNKNOWN' );
                mediaObj._inMigration = inMigration;

                report( 'i', 'Checking media ' + mediaObj._id + ' / ' + mediaObj.mime + ' / ' + mediaObj.fileSize, 'debug', NAME );

                async.series(
                    [
                        //saveSnapshot,
                        getMediaModel,
                        checkLegacyFormat,
                        getGridMeta,
                        checkMediaDimensions,
                        saveIfChanged,
                        cleanupTempFiles,
                        saveReportToDisk
                    ],
                    onMediaChecked
                );

                //  1. Ensure we have a media model
                function getMediaModel( itcb ) {
                    //  if we already have on then we can skip this step
                    if ( mediaModel ) { return itcb( null ); }

                    function onMediaModelLoaded( err, newModel ) {
                        if ( err ) {
                            report( '!', 'Could not create media model: ' + JSON.stringify( err ) );
                            return itcb( err );
                        }

                        report( 'i', 'Media model created...' );
                        mediaModel = newModel;
                        itcb( null );
                    }

                    report( '>', 'Initializing new media model...' );
                    Y.doccirrus.mongodb.getModel( user, 'media', true, onMediaModelLoaded );
                }

                //  2. Move file to GridFS if still stored in mediaObj.source (legacy, pre 2.17)
                function checkLegacyFormat( itcb ) {
                    //  if already migrated then we can skip this step
                    if ( !mediaObj.source || '' === mediaObj.source ) { return itcb( null ); }
                    
                    function onMigratedSingle( err, addReport ) {
                        if ( err ) {
                            report( '!', 'Could not migrate item from media colection: ' + JSON.stringify( err ) );
                            return itcb( err );
                        }
                        strReport = strReport + addReport;
                        itcb( null );
                    }
                    
                    report( 'i', 'Media is in legacy format, migrating...' );
                    migrateSingleMediaObject( user, mediaObj, mediaModel, inMigration, checkSingleCB( onMigratedSingle, 'onMigratedSingle' ) );
                }

                //  3. Load gridfs file object, check that it exists and that media.size === file.size
                function getGridMeta( itcb ) {
                    function onGridFsMeta( err, foundMeta ) {
                        if ( err ) {
                            report( '!', 'Could not get GridFS metadata: ' + JSON.stringify( err ) );
                            return itcb( null );
                        }

                        if ( !foundMeta ) {
                            report( '!', 'Could not load file meta for ' + mediaObj._id + ', missing from GridFS?' );
                            return itcb( null );
                        }

                        gfsMeta = foundMeta;

                        report( 'i', 'Loaded GridFS metadata: ' + JSON.stringify( gfsMeta ) );

                        //  Update size in media collection if incorrect
                        if ( gfsMeta.length !== mediaObj.filesize ) {
                            report( '>', 'Correcting media filesize: ' +  gfsMeta.length );
                            mediaObj.filesize = gfsMeta.length;
                            mediaObj._isDirty = true;
                        }

                        itcb( null );
                    }
                    Y.doccirrus.media.gridfs.loadFileMeta( user, mediaObj._id + '', inMigration, checkSingleCB( onGridFsMeta, 'onGridFsMeta' ) );
                }

                //  4. Examine mediaObj and check that type-specific metadata is present, try to generate if not
                function checkMediaDimensions( itcb ) {

                    function onExpandMeta( err ) {
                        if ( err ) { return itcb( null ); }
                        report( 'i', 'New image dimensions: ' + mediaObj.widthPx + 'x' + mediaObj.heightPx + ' layers: ' + mediaObj.layers );
                        mediaObj._isDirty = true;
                        itcb( null );
                    }

                    if ( 'image' === mediaObj._category && -1 === mediaObj.widthPx && -1 === mediaObj.heightPx ) {
                        report( '*', 'Image is missing dimensions, correcting... ' );
                        Y.doccirrus.media.images.expandMeta( user, mediaObj, checkSingleCB( onExpandMeta, 'onExpandMeta' ) );
                        return;
                    }

                    // dimensions are OK
                    itcb( null );
                }

                //  5. Save media object back to database
                function saveIfChanged( itcb ) {
                    //  Skip this step if nothing was changed during migration
                    if ( !mediaObj || !mediaObj._isDirty ) { return itcb( null ); }


                    function onMediaSaved( err ) {
                        if ( err ) {
                            report( '!', 'Problem saving image back to database: ' + JSON.stringify( err ) );
                            return itcb( err );
                        }

                        report( 'i', 'Saved media ' + mediaObj._id + ' back to database.' );
                        itcb( null );
                    }

                    //Y.doccirrus.media.mediaToDB( user, mediaObj, checkSingleCB( onMediaSaved, 'onMediaSaved' ) );

                    var
                        updateParams = {
                            'source': mediaObj.source,
                            'gridfs': mediaObj.gridfs,
                            'binary': mediaObj.binary,
                            'filesize': mediaObj.filesize
                        };

                    report( '>', 'Updating media object ' + mediaObj._id + ' via mongo...' );
                    mediaModel.mongoose.update( { '_id': mediaObj._id }, updateParams, {}, onMediaSaved );
                }

                //  6. Clean up any temp files
                function cleanupTempFiles( itcb ) {
                    //  Skip this step if the media was not written to disk
                    if ( !mediaObj._diskFile ) { return itcb( null ); }
                    //  Don't need to wait for this, so not setting a callback
                    Y.doccirrus.media.tempRemove( mediaObj._diskFile );
                    itcb( null );
                }

                //  7. Save the report to disk (may time out REST during testing)
                function saveReportToDisk( itcb ) {
                    Y.doccirrus.media.writeFile( tempDir + '/media_migrate_2.17.log', tempDir, strReport, checkSingleCB( itcb, 'onWriteFile' ));
                }
            }
            
            //  Finally
            function onAllDone( err ) {
                if ( err ) { report( '!', 'Error while migrating media to GridFS: ' + JSON.stringify( err ) ); }
                //Y.log( '\n\n' + strReport + '\n\n', 'info', NAME );
                callback( err, strReport );
            }

            //  Shortcut, add lines to report and copy warnings/errors to Y.log
            function report( ico, line ) {
                if ('' !== ico ) {
                    line = '  (' + ico + ico + ') ' + line;
                }
                Y.log( line, ( '!' === ico) ? 'warn' : 'debug', NAME );
                strReport = strReport + line + '\n';
                //strReport = '';
            }
        }


        /**
         *  Ensures that the callback is only called once
         *  Used to find errors in deep async code
         *
         *  Assumes callback has no more than four arguments
         *
         *  Note: Use of this should be deprecated in favor of static analysis with ESLint
         *
         *  @param  callback    {Function}  Callback to be counted
         *  @param  label       {String}    Optional descriptive string to locate caller if not in stack trace
         */

        function checkSingleCB( callback, label ) {
            var called = 0;

            label = label || 'none';

            return function checkCBCount( arg1, arg2, arg3, arg4 ) {
                var i;
                called = called + 1;
                if( called > 1 ) {

                    for (i = 0; i < 400; i++ ) {
                       console.log( '!!!!!!!!!! >>>> ' + i + ' Callback called multiple times: ' + called + ' (label: ' + label + ')'); //eslint-disable-line no-console
                    }

                    Y.log( 'Callback called multiple times: ' + called + ' (label: ' + label + ')', 'error', NAME );
                    console.log( 'stack trace follows: ', new Error().stack ); //   eslint-disable-line no-console
                    return;
                }
                callback( arg1, arg2, arg3, arg4 );
            };
        }

        /**
         *  Check all media in the database for exif orientation tags and apply transforms if necessary
         *
         *  Since this is a slow and heavy operation, it will call back immediately and then run in the background
         *  Note that only JPEG images will be reoriented - video functionality may be added in future.
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  inMigration {Boolean}   True if run in migration context, false if run manually by REST
         *  @param  callback    {Function}  Of the form fn( err, report )
         */

        function migrateExif( user, inMigration, callback ) {
            var
                tempDir = Y.doccirrus.media.getTempDir(),
                reportFile = tempDir + '/media_exif_migration_report.txt',
                strReport = 'Applying any Exif orientation tags to images in GridFS\n\n',
                query = { 'mime': 'IMAGE_JPEG' };

            //  this is a slow operation, call back immediately
            callback( null, 'EXIF migration started, report will be saved as: ' + reportFile );    //  eslint-disable-line callback-return

            report( '', '<h1>Checking / repairing media objects</h1>' );
            streamMediaTo( user, query, inMigration, checkJpegOrientation, onAllDone );

            function checkJpegOrientation( mediaObj, streamcb ) {

                if ( 'IMAGE_JPEG' !== mediaObj.mime ) {
                    //  not a JPEG image, skip this one
                    return streamcb( null );
                }

                var tagValue = '1';

                async.series(
                    [
                        saveJpegToDisk,
                        getExifTag,
                        applyExifReorientation,
                        saveJpegToGridFs,
                        updateMediaObject,
                        checkImageDimensions,
                        cleanUpTempFiles
                    ],
                    onDoneWithMedia
                );

                //  write to disk
                function saveJpegToDisk( itcb ) {
                    report( 'i', 'Loading JPEG image from GridFs: ' + mediaObj._id );
                    mediaObj._diskFile = Y.doccirrus.media.getTempFileName( mediaObj );
                    Y.doccirrus.media.gridfs.exportFile( user, mediaObj._id, mediaObj._diskFile, inMigration, itcb );
                }

                //  get Exif information
                function getExifTag( itcb ) {
                    report( 'i', 'Extracting Exif tags for media: ' + mediaObj._id );
                    Y.doccirrus.media.images.getExifData( mediaObj, EXIF_ORIENTATION_MARKER, onExifTagRead );
                    function onExifTagRead( err, foundTagValue ) {
                        if ( err ) { return itcb( err ); }

                        tagValue = foundTagValue;
                        itcb( null );
                    }
                }

                //  apply any reorientation required by Exif tag
                function applyExifReorientation( itcb ) {
                    //  skip this step if no rotation to apply
                    if ( !tagValue || '' === tagValue || '1' === tagValue ) {
                        report( '-', 'No Exif reorientation applies to this image.\n' );
                        return itcb( null );
                    }

                    report( '*', 'Applying Exif reorientation: ' + tagValue );
                    Y.doccirrus.media.images.applyExifOrientation( mediaObj, tagValue, itcb );
                }

                //  save the transformed image back to GridFS
                function saveJpegToGridFs( itcb ) {
                    //  skip this step if no rotation to apply
                    if ( !tagValue || '' === tagValue || '1' === tagValue ) { return itcb( null ); }

                    report( '*', 'Saving reoriented image back to GridFS: ' + mediaObj._id );

                    Y.doccirrus.media.gridfs.importFile(
                        user,                                   //  current/system user
                        mediaObj._id + '',                      //  GridFS filename
                        mediaObj._diskFile,                     //  disk filename
                        inMigration,                            //  true
                        onReImported                            //  callback
                    );

                    function onReImported( err, mediaId, newFileSize ) {
                        if ( err ) { return itcb( err ); }
                        report( 'i', 'Reimported media file to database: ' + mediaId + ' (' + newFileSize + ' bytes)', 'debug', NAME );

                        if ( parseInt( mediaObj.filesize, 10 ) !== parseInt( newFileSize, 10 ) ) {
                            mediaObj.filesize = newFileSize;
                            mediaObj._isDirty = true;
                        }

                        itcb( null );
                    }
                }

                //  write new filesize to media metadata object
                function updateMediaObject( itcb ) {
                    //  skip this step if no rotation to apply or file size unchanged
                    if ( !tagValue || '' === tagValue || '1' === tagValue ) { return itcb( null ); }
                    if ( !mediaObj._isDirty ) { return itcb( null ); }

                    report( '*', 'Writing new file size to database: ' + mediaObj.fileSize );

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'media',
                        'action': 'put',
                        'query': { _id: mediaObj._id + '' },
                        'data': Y.doccirrus.filters.cleanDbObject( {
                            'fields_': [ 'filesize' ],
                            'filesize': mediaObj.filesize
                        } ),
                        'callback': itcb
                    } );
                }

                //  reorienting images may change the dimensions, eg, 640x480 -> 480x640 (MOJ-7175)
                function checkImageDimensions( itcb ) {
                    report( 'i', 'Checking image dimensions: ' + mediaObj._id + ' (' + mediaObj.widthPx + 'x' + mediaObj.heightPx + ')' );
                    Y.doccirrus.media.images.identify( mediaObj._diskFile, onIdentifyComplete);

                    function onIdentifyComplete( err, newMeta ) {
                        if ( err ) { return itcb( err ); }

                        //  skip this step if measured values match those in database
                        if (
                            ( parseFloat( newMeta.widthPx ) === parseFloat( mediaObj.widthPx ) ) &&
                            ( parseFloat( newMeta.heightPx ) === parseFloat( mediaObj.heightPx ) )
                        ) {
                            report( '-', 'Stored image dimensions are correct: ' + newMeta.widthPx + 'x' + newMeta.heightPx + ' ' + mediaObj.mime );
                            return itcb( null );
                        }

                        //  force update of media if dimensions are incorrect (legacy, import or migration issues, MOJ-7175)
                        report( '*', 'Writing new image dimensions to database: ' + newMeta.widthPx + 'x' + newMeta.heightPx + ' ' + mediaObj.mime + ' from ' + mediaObj.widthPx + 'x' + mediaObj.heightPx  );

                        Y.doccirrus.mongodb.runDb( {
                            'user': user,
                            'model': 'media',
                            'action': 'put',
                            'query': { _id: mediaObj._id + '' },
                            'data': Y.doccirrus.filters.cleanDbObject( {
                                'fields_': [ 'widthPx', 'heightPx' ],
                                'widthPx': newMeta.widthPx,
                                'heightPx': newMeta.heightPx
                            } ),
                            'callback': itcb
                        } );
                    }
                }

                //  delete any versions of this file left in temp directory
                function cleanUpTempFiles( itcb ) {
                    if ( !mediaObj._tempFiles ) { mediaObj._tempFiles = []; }
                    mediaObj._tempFiles.push( mediaObj._diskFile );
                    report( 'i', 'Cleaning up temp file: ' + JSON.stringify( mediaObj._tempFiles ) );
                    Y.doccirrus.media.cleanTempFiles( mediaObj );
                    //  not necessary to wait for deletion
                    itcb( null );
                }

                function onDoneWithMedia( err ) {
                    if ( err ) {
                        Y.log( 'Problem reorienting image ' + mediaObj._id + ' : ' + JSON.stringify( err ), 'warn', NAME );
                        report( '!', 'Problem reorienting image ' + mediaObj._id + ' : ' + JSON.stringify( err ) );
                        //  continue despite error (best effort, don't block migration because of a broken user image)
                        return streamcb( null );
                    }
                    streamcb( null );
                }

            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not check Exif orientation on database images: ' + JSON.stringify( err ), 'warn', NAME );
                    report( '!', 'Could not check Exif orientation on database images: ' + JSON.stringify( err ) );
                }

                function onReportSaved( err ) {
                    if ( err ) {
                        Y.log( 'Problem saving report to disk: ' + JSON.stringify( err ) );
                    }
                }

                Y.log( 'Completed check for image Exif tags on tenant: ' + ( user.tenantId || '' ), 'debug', NAME );
                writeReportToDisk( onReportSaved );
            }

            //  save report of deletions to temp directory
            function writeReportToDisk( itcb ) {
                fs.writeFile( reportFile, strReport, onReportSaved );
                function onReportSaved( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            //  Shortcut, add lines to report and copy warnings/errors to Y.log
            function report( ico, line ) {
                if ('' !== ico ) { line = '  (' + ico + ico + ') ' + line; }
                Y.log( line, ( '!' === ico) ? 'warn' : 'debug', NAME );
                strReport = strReport + line + '\n';
                //strReport = '';
            }
        }

        /**
         *  Remove duplicate media objects / attachments (slow)
         *
         *  Since this is a very slow operation it will call back immediately and write a report to the temp directory
         *  when it is complete.
         *
         *  Overall process is:
         *
         *      --> 1. generate a SHA1 hash of all media in GridFS smaller than MAX_SIZE
         *          --> 1.5 generate SHA1 hash of a single media item, record with owner information
         *      --> 2. find media objects where multiple copies exist for the same owner
         *      --> 3. remove duplicate document, media and gridfs entries, update activities
         *          --> 3.5 delete a single media object, along with GridFS meta+chunks, document, etc
         *              --> 3.5.1 find any documents which reference the media which is to be deleted
         *              --> 3.5.2 delete all document objects which refer to this media
         *                  --> 3.5.2.1 delete a single document object
         *                      --> 3.5.2.1.1 load any activity referenced by this document
         *                      --> 3.5.2.1.2 delete the document object
         *                      --> 3.5.2.1.3 re-save the activity without references to the document or media objects
         *              --> 3.5.3 delete the media object itself
         *              --> 3.5.4 delete the file from GridFS (meta and chunks)
         *      --> 4. save report of deletions to temp directory
         *      --> X. finished
         *
         *  @param  args            {Object}
         *  @param  args.user       {Object}
         *  @param  args.callback   {Object}
         */

        function deduplicateImages( args ) {

            var
                //  only hash objects smaller than 32MB (prevent crash on massive files in memory)
                MAX_SIZE = 32 * 1024 * 1024,

                tempDir = Y.doccirrus.media.getTempDir(),
                reportFile = tempDir + '/media_deduplication_report.txt',

                mediaCount = 0,
                report = '',
                hashes = {},
                toDelete = [];

            //  add a line to the report
            function rec( prefix, line ) {
                report = report + '[' + prefix + prefix + '] ' + line + '\n';
                Y.log( 'deduplicateImages: ' + line, 'debug', NAME );
            }

            //  call back immediately, this is a very slow process
            args.callback( null, 'started deduplication process' );     // eslint-disable-line callback-return

            async.series(
                [
                    hashAllMedia,
                    checkDuplicatesByOwner,
                    removeAllDuplicates,
                    writeReportToDisk
                ],
                onAllDone
            );

            //  1. generate a SHA1 hash of all media in GridFS smaller than MAX_SIZE
            function hashAllMedia( itcb ) {
                streamMediaTo( args.user, {}, false, onMediaStreamNext, itcb );
            }

            //  1.5 generate SHA1 hash of a single media item, record with owner information
            function onMediaStreamNext( mediaObj, itcb ) {

                rec( '>', 'Checking single media object: ' + mediaObj._id + ' owned by ' + mediaObj.ownerCollection + '::' + mediaObj.ownerId );
                mediaCount = mediaCount + 1;
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

                    hashes[ digest ].push( {
                        'mediaId': mediaObj._id + '',
                        'ownerCollection': mediaObj.ownerCollection || '',
                        'ownerId': mediaObj.ownerId,
                        'deleteme': false
                    } );
                    itcb( null );
                }

            }

            //  2. find media objects where multiple copies exists for the same owner
            function checkDuplicatesByOwner( itcb ) {
                var i, k, digest, owners, summary, ownerStr;

                rec( 'i', 'Checking for duplicated media' );

                //  media is considered duplicate if there are more than 1 identical copy per activity
                for ( k in hashes ) {
                    if ( hashes.hasOwnProperty( k ) ) {

                        digest = hashes[k];
                        owners = [];

                        if ( 1 !== digest.length ) {
                            rec( 'i', 'Checking for duplicate of file with hash: ' + k  + ' (' + digest.length + ' ocurrences)');

                            for ( i = 0; i < digest.length; i++ ) {

                                summary = digest[i];
                                ownerStr = summary.ownerCollection + '::' + summary.ownerId;

                                if ( -1 === owners.indexOf( ownerStr ) ) {
                                    //  no other copies of this attachment on this activity, record for later
                                    owners.push( ownerStr );
                                } else {
                                    //  another copy exists, delete this copy
                                    if ( -1 === ownerStr.indexOf( 'undefined' ) && 'forms::' !== ownerStr && 'OBSERVATION::' !== ownerStr ) {
                                        rec( 'i', 'Found duplicate file with same owner, queueing for deletion: ' + k + ' on ' + ownerStr );
                                        summary.deleteme = true;
                                        toDelete.push( summary );
                                    } else {
                                        rec( 'i', 'Retaining file with legacy/incomplete owner information: ' + k + ' on ' + ownerStr );
                                    }
                                }
                            }
                        }

                    }
                }

                itcb( null );
            }

            //  3. remove duplicate document, media and gridfs entries, update activities
            function removeAllDuplicates( itcb ) {
                rec( 'i', 'Deleting ' + toDelete.length + ' duplicate media attachments' );
                async.eachSeries( toDelete, deleteSingleMediaObj, itcb  );
            }

            //  3.5 delete a single media object, along with GridFS meta+chinks, document, etc
            function deleteSingleMediaObj( summary, mediaCb ) {

                var
                    activityId = null,
                    document = null,
                    activity = null,
                    documents = [];

                rec( 'i', 'Deleting media and related objects: ' + summary.mediaId );

                async.series(
                    [
                        findDocuments,
                        deleteAllDocuments,
                        deleteMediaObj,
                        deleteGridFsFile
                    ],
                    onMediaCleanUp
                );

                //  3.5.1 find any documents which reference the media which is to be deleted
                function findDocuments( itcb ) {
                    rec( '-', 'Finding documents which reference media: ' + summary.mediaId );

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'document',
                        'query': { 'mediaId': summary.mediaId },
                        'callback': onDocumentQuery
                    } );

                    function onDocumentQuery( err, data ) {
                        if ( err ) { return itcb( err ); }
                        // there should only be one, but we can't be certain
                        documents = data;
                        itcb( null );
                    }
                }

                //  3.5.2 delete all document objects which refer to this media
                function deleteAllDocuments( itcb ) {
                    if ( 0 === documents.length ) { return itcb( null ); }

                    var i;
                    for ( i = 0; i < documents.length; i++ ) {
                        if ( documents[i].type && documents[i].type === 'FORMPDF') {
                            rec( '>', 'media refers to a FORMPDF document, not deleting in case of share with patients, other instances, etc' );
                            return mediaCb( null );
                        }
                    }

                    rec( '-', 'Deleting all documents referring to media ' + summary.mediaId + ': ' + JSON.stringify( documents ) );
                    async.eachSeries( documents, deleteSingleDocument, itcb );
                }

                //  3.5.2.1 delete a single document object
                function deleteSingleDocument( doc, itcb ) {
                    rec( '-', 'Deleting single document: ' + doc._id );

                    activityId = null;
                    document = doc;
                    activity = null;

                    if ( doc.activityId && '' !== doc.activityId ) {
                        activityId = doc.activityId + '';
                    }

                    async.series( [ loadActivity, deleteDocumentObject, saveActivity ], itcb );
                }

                //  3.5.2.1.1 load any activity referenced by this document
                function loadActivity( itcb ) {
                    if ( !activityId || '' === activityId ) {
                        rec( 'i', 'no activity linked from document for media: ' + summary.mediaId );
                        return itcb( null );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'query': { '_id': activityId },
                        'callback': onActivityLoaded
                    } );
                    function onActivityLoaded( err, data ) {
                        if ( err ) { return itcb( err ); }
                        if ( 0 === data.length ) { return itcb( null ); }
                        activity = data[0];
                        itcb( null );
                    }
                }

                //  3.5.2.1.2 delete the document object
                function deleteDocumentObject( itcb ) {

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'document',
                        'action': 'delete',
                        'query': { '_id': document._id },
                        'callback': itcb
                    } );
                }

                //  3.5.2.1.3 re-save the activity without references to the document or media objects
                function saveActivity( itcb ) {
                    //  there may not be an activity to update
                    if ( !activity ) { return itcb( null ); }

                    var
                        putData = {
                            'fields_': [ 'attachments', 'attachedMedia' ],
                            'attachments': [],
                            'attachedMedia': []
                        }, i;

                    for ( i = 0; i < activity.attachments.length; i++ ) {
                        if ( activity.attachments[i] + '' === document._id + '' ) {
                            rec( 'i', 'Unlinking attached document ' + document._id + ' from activity ' + activity._id );
                        } else {
                            rec( '-', 'Retaining attached document ' + activity.attachments[i] + ' on activity ' + activity._id );
                            putData.attachments.push( activity.attachments[i] + '' );
                        }
                    }

                    for ( i = 0; i < activity.attachedMedia.length; i++ ) {
                        if ( activity.attachedMedia[i].mediaId === summary.mediaId ) {
                            rec( 'i', 'Unlinking media summary for ' + summary.mediaId + ' from activity ' + activity._id );
                        } else {
                            rec( '-', 'Retaining media summary for ' + activity.attachedMedia[i].mediaId );
                            putData.attachedMedia.push( JSON.parse( JSON.stringify( activity.attachedMedia[i] ) ) );
                        }
                    }

                    putData = Y.doccirrus.filters.cleanDbObject( putData );
                    rec( 'i', 'Updating activity attachments for ' + activity._id );

                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'activity',
                        'action': 'put',
                        'query': { '_id': activity._id + '' },
                        'data': putData,
                        'options': {
                            'ignoreReadOnly': [ 'attachments', 'attachedMedia' ]
                        },
                        'callback': itcb
                    } );
                }

                //  3.5.3 delete the media object itself
                function deleteMediaObj( itcb ) {
                    rec( 'i', 'Deleting media object: ' + summary.mediaId );
                    Y.doccirrus.mongodb.runDb( {
                        'user': args.user,
                        'model': 'media',
                        'action': 'delete',
                        'query': { '_id': summary.mediaId },
                        'callback': itcb
                    } );
                }

                //  3.5.4 delete the file from GridFS (meta and chunks)
                function deleteGridFsFile( itcb ) {
                    rec( '-', 'delete GridFS file: ' + summary.mediaId );

                    if ( 'activity' === summary.ownerCollection || 'activities' === summary.ownerCollection ) {
                        activityId = summary.ownerId;
                    }

                    Y.doccirrus.media.gridfs.removeFile( args.user, summary.mediaId, false, itcb );
                }

                function onMediaCleanUp( err ) {
                    if ( err ) {
                        rec( '!', 'Problem cleaning up deleted media: ' + summary.mediaId );
                        return mediaCb( err );
                    }

                    rec( 'i', 'Finished cleaning up after duplicate media: ' + summary.mediaId );
                    mediaCb( null );
                }
            }

            //  4. save report of deletions to temp directory
            function writeReportToDisk( itcb ) {
                rec( '-', 'Saving report after processing ' + mediaCount + ' media objects' );
                fs.writeFile( reportFile, report, onReportSaved );
                function onReportSaved( err ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            //  X. finished
            function onAllDone( err ) {
                if ( err ) {
                    Y.log(  'Problem deduplicating media: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

        }

        /**
         *  Dump all attached files for all patients into a zip
         *
         *  TEMPORARY CODE TO EXPORT A WHOLE CUSTOMER DATABASE,
         *  quick copy/paste adaptation of a migration, may be brought up to code standards if needed
         *
         *  Process:
         *
         *      1. Start a new zip
         *      2. Get an activity model (with mongoose model)
         *      3. Get a patient model (with mongoose model)
         *      4. Stream all patients (we only need the _id and name)
         *        4.1 Stream all activities for a patient
         *          4.1.1  Given a patient and activity, load all documents and export all attached media to ZIP
         *          4.1.2 Export a single file to disk from GridFS
         *
         *  export will be available at yourprc.tld/zip/export when complete
         *
         *  @param args
         */

        function exportGridFS( args ) {
            const
                moment = require( 'moment' );

            let
                user = args.user,
                params = args.originalParams,
                zipName = params.zipName || 'export',
                zipId,
                inMigration = false,
                patientCount = 0,
                patientModel,
                activityModel;

            Y.log( `Exporting all patient files to zip: ${zipName}`, 'debug', NAME );

            async.series(
                [
                    createZip,
                    getActivityModel,
                    getPatientModel,
                    streamAllPatientIds
                ],
                onAllDone
            );

            //  1. Start a new zip
            function createZip( itcb ) {
                Y.doccirrus.media.zip.create( zipName, onZipCreated );
                function onZipCreated( err, newZipId ) {
                    if ( err ) { return itcb( err ); }
                    zipId = newZipId;
                    Y.log( 'Created new zip for export: ' + zipId, 'info', NAME );
                    itcb( null );
                }
            }

            //  2. Get an activity model (with mongoose model)
            function getActivityModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'activity', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    activityModel = newModel;
                    itcb( null );
                }
            }

            //  3. Get a patient model (with mongoose model)
            function getPatientModel( itcb ) {
                Y.doccirrus.mongodb.getModel( user, 'patient', inMigration, onModelLoaded );
                function onModelLoaded( err, newModel ) {
                    if ( err ) { return itcb( err ); }
                    patientModel = newModel;
                    itcb( null );
                }
            }

            //  4. Stream all patients (we only need the _id and name)
            function streamAllPatientIds( itcb ) {
                let
                    patientFields = {
                        '_id': true,
                        'firstname': true,
                        'lastname': true
                    },
                    patientStream;

                function onStreamData( patientObj ) {
                    patientCount = patientCount + 1;

                    //  TEMP/DEV/LIMIT
                    //  if ( patientCount > 150 ) { return; }

                    patientStream.pause();

                    exportAllDocumentsForPatient( patientObj, onPatientDone );

                    function onPatientDone( err ) {
                        if ( err ) {
                            Y.log( `Problem exporting documents for patient ${ patientObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }
                        patientStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ patientCount } patients to export documents`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in patient stream: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                patientStream = patientModel.mongoose.find( {}, patientFields, { timeout: true } ).stream();
                patientStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  4.1 Stream all activities for a patient
            function exportAllDocumentsForPatient( patientObj, itcb ) {
                let
                    patientId = patientObj._id.toString(),
                    activityQuery = { 'patientId': patientId },
                    activityFields = {
                        '_id:': 1,
                        'attachments': 1,
                        'actType': 1,
                        'timestamp': 1,
                        'attachmedMedia': 1
                    },
                    activityStream;

                Y.log( `Exporting all documents for patient: ${patientObj.firstname} ${patientObj.lastname}`, 'debug', NAME );

                function onStreamData( activityObj ) {
                    if ( !activityObj.attachments || 0 === activityObj.attachments.length ) {
                        Y.log( `Activity has no attachments, skipping ${activityObj._id} ${activityObj.actType}`, 'debug', NAME );
                        return;
                    }

                    activityStream.pause();

                    exportAllDocumentsForActivity( patientObj, activityObj, onPatientDone );

                    function onPatientDone( err ) {
                        if ( err ) {
                            Y.log( `Problem exporting media ttached to activity ${ activityObj._id }: ${ JSON.stringify( err )}`, 'warn', NAME );
                            //  continue with migration regardless (best effort)
                        }
                        activityStream.resume();
                    }
                }

                function onStreamEnd() {
                    Y.log( `Finished processing all ${ patientCount } patients to (re)set latestMedData`, 'debug', NAME );
                    itcb( null );
                }

                function onStreamError( err ) {
                    Y.log( `Error in activity stream for patient ${patientId}: ${ JSON.stringify( err )}`, 'debug', NAME );
                    itcb( err );
                }

                activityStream = activityModel.mongoose.find( activityQuery, activityFields, { timeout: true } ).stream();
                activityStream
                    .on( 'data', onStreamData )
                    .on( 'error', onStreamError )
                    .on( 'end', onStreamEnd );
            }

            //  4.1.1  Given a patient and activity, load all documents and export all attached media to ZIP

            function exportAllDocumentsForActivity( patientObj, activityObj, itcb ) {

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'query': {
                        '_id': { '$in': activityObj.attachments },
                        'mediaId': { '$exists': true }
                     },
                    'callback': onActDocumentsLoaded
                } );

                function onActDocumentsLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( `Loaded ${result.count} media attachments for activity ${activityObj._id} ${activityObj.actType}`, 'debug', NAME );
                    if ( 0 === result.length ) { return itcb( null ); }
                    async.eachSeries( result, indirectExport, itcb );

                    //  indirection to add argument to eachSeries
                    function indirectExport( docObj, _cb ) {
                        exportMediaToDisk( patientObj, activityObj, docObj, _cb );
                    }
                }

            }

            //  4.1.2 Export a single file to disk from GridFS
            function exportMediaToDisk( patientObj, activityObj, docObj, itcb ) {
                let
                    mimeType = docObj.contentType,
                    tempDir = Y.doccirrus.media.getTempDir(),
                    tempFile = Y.doccirrus.media.getTempFileName( { 'mime': mimeType, 'transform': 'export' } ),

                    patientName = patientObj.lastname + '_' + patientObj.firstname,
                    dateStr = moment( activityObj.timestamp ).format( 'DDMMYYYY' ),
                    ext = Y.doccirrus.media.getExt( mimeType ),
                    friendlyName = patientName + '_' + dateStr + '_' + activityObj.actType + '_' + docObj.mediaId + '.' + ext;

                Y.log( `ZIPEXPORT writing to zip: ${zipId}/${friendlyName}` , 'debug', NAME );
                Y.log( `ZIPEXPORT writing to temp directory: ${tempFile}`, 'debug', NAME );

                //return itcb( null );
                Y.doccirrus.media.gridfs.exportFile( user, docObj.mediaId, tempFile, inMigration, onWriteToDisk );

                function onWriteToDisk( err, wroteFile ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( `ZIPEXPORT write file to temp dir: ${wroteFile}`, 'debug', NAME );
                    Y.doccirrus.media.zip.addFile( zipId, tempFile, tempDir, friendlyName, true, onAddedToZip );
                }

                function onAddedToZip( err, newFileName ) {
                    if ( err ) { return itcb( err ); }
                    Y.log( `Wrote file to zip: ${newFileName}`, 'debug', NAME );
                    itcb( null );
                }

            }

            //  X finsihed

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( `Could not add latestMedData to patients: ${ JSON.stringify( err )}`, 'warn', NAME );
                    return args.callback( null );
                }

                Y.log( `Completed migration to all latestMedData to ${ patientCount } patients on tenant: ${ user.tenantId}`, 'info', NAME );
                args.callback( null );
            }

        }

        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.media' ).migrationhelper = {
            'moveToGridFs': moveToGridFs,
            'migrateExif': migrateExif,
            'tempStoreLegacy64': tempStoreLegacy64,
            'fixImageDimensions': migrateExif,
            'deduplicateImages': deduplicateImages,
            'exportGridFS': exportGridFS
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcmedia-gridfs' ]}
);