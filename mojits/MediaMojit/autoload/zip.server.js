/*
 * Copyright (c) 2012 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  This is a helper object to package batches of PDF reports in .zip format
 */

/*global YUI*/
/*jshint latedef:false */



YUI.add( 'dcmedia-zip', function( Y, NAME ) {

        var
            fs = require('fs'),
            tempDir = Y.doccirrus.media.getTempDir();

        function initialized() {
            // Sequence is important
            return Y.doccirrus.media.initialized();
        }

        /**
         *  Create a folder to add zip contents, return a handle to the new zip
         *  @param  preferName  {String}    Filename for ZIP, if possible
         *  @param  callback    {Function}  Of the form fn(err, zipId)
         */

        function create( preferName, callback ) {

            function onMetaWritten(err) {
                if (err) {
                    Y.log('Could not create meta file for zip: ' + metaFile, 'warn', NAME);
                    callback(err);
                    return;
                }

                callback(null, newId);
            }

            function onDirCreated(err) {
                if (err) {
                    Y.log('Could not create zip archive dir: ' + err, 'warn', NAME);
                    callback(err);
                    return;
                }

                var createdOn = new Date().getTime();

                fs.writeFile(metaFile, createdOn, onMetaWritten);
            }

            var
                randId = Math.random().toString(36).slice(2),
                safeName = Y.doccirrus.media.cleanFileName( preferName ),
                newId = ( ( '' === safeName ) ? randId : safeName ),
                zipDir = tempDir + newId + '/',
                metaFile = zipDir + 'created.txt';

            fs.mkdir(zipDir, onDirCreated);
        }


        /**
         *  Add a file to a zip archive
         *
         *  @param  zipId           {string}    Handle to zip archive
         *  @param  localFile       {string}    Absolute path
         *  @param  localPath       {string}    Absolute path
         *  @param  fileName        {string}    pdf preferred file name may be passed from browser
         *  @param  removeAfterCopy {boolean}   Deletes the temp file if true
         *  @param  callback        {function}  Of the form fn(err, newFileName)
         */

        function addFile( zipId, localFile, localPath, fileName, removeAfterCopy, callback ) {

            function onTempFileRemoved(err) {
                if (err) {
                    Y.log('Could not write to zip: ' + err, 'warn', NAME);
                    //  continue anyway
                }
                callback( null, newFileName);
            }

            function onFileWritten(err) {
                if (err) {
                    Y.log('Could not write to zip: ' + err, 'warn', NAME);
                    callback(err);
                    return;
                }

                if (true === removeAfterCopy) {
                    Y.log('Removing temp file: ' + localFile, 'info', NAME);
                    fs.unlink(localFile, onTempFileRemoved);
                    return;
                }

                onTempFileRemoved( null );
            }

            function onFileRead(err, fileData) {
                if (err) {
                    Y.log('Could not load file to add to zip: ' + err, 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.doccirrus.media.writeFile(newFileName, tempDir, fileData, onFileWritten);
            }

            //  prevent directory traversal
            fileName = fileName.split('..').join('');
            fileName = fileName.split('/').join('');
            fileName = fileName.split('\\').join('');

            var newFileName = tempDir + zipId + '/' + fileName;

            Y.log('Copying ' + localFile + ' to ' + newFileName, 'info', NAME);

            Y.doccirrus.media.readFile( localFile, '*', onFileRead );
        }

        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).zip = {
            'initialized': initialized,
            'create': create,
            'addFile': addFile
        };

    },
    '0.0.1', {requires: [
        'dcmedia-store'
    ]}
);