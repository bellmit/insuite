/**
 * User: dmitrii.solovev
 * Date: 14/09/16  17:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'mediaimport', function( Y, NAME ) {

        if( !Y.doccirrus.ipc.isMaster() ) {
            return;
        }

        if( !Y.doccirrus.auth.isPRC() ) {
            return;
        }

        const
            Prom = require( 'bluebird' ),
            fs = require( 'fs' ).promises,
            download = Y.doccirrus.auth.getImportDir(),
            runDb = Y.doccirrus.mongodb.runDb,
            user = Y.doccirrus.auth.getSUForLocal(),
            TIMEOUTMS = 300000, //5min
            importObjRexEx = /IMPORT-OBJ:\/BRIEFE/,
            Path = require( 'path' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        let i18n = Y.doccirrus.i18n,
            start;

        class NotDirError extends Error {
        }
        class EmptyDirError extends Error {
        }
        class DirNotExistErr extends Error {
        }
        class NoAccessDir extends Error {
        }
        class FileNotExistErr extends Error {
        }
        class NotFileError extends Error {
        }
        class NoAccessFile extends Error {
        }
        class NotFoundActivityErr extends Error {
        }
        class NoImportedActivitiesErr extends Error {
        }
        class UnlinkErr extends Error {
        }
        class UnknownFileType extends Error {
        }

        function addToAudit( errMsg, file, activity ) {

            //let filename = file.substring( file.lastIndexOf( '/' ) + 1, file.length),
            let entry = Y.doccirrus.api.audit.getBasicEntry( user, 'delete', 'activity', errMsg );

            return Y.doccirrus.api.audit.post( {
                user: user,
                data: Object.assign( {}, entry, {
                    skipcheck_: true,
                    objId: activity._id.toString()
                } )
            } );
        }

        function sendImportEmail( emailText, callback ){
            try{
                let emailOptions = {
                    serviceName: 'dcInfoService_support',
                    subject: i18n("MediaMojit.email.SUBJECT_TEXT"),
                    jadeParams: { text: emailText },
                    jadePath: './mojits/UserMgmtMojit/views/license_email.jade.html',
                    user
                };

                let myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                Y.doccirrus.email.sendEmail( { ...myEmail, user }, callback );
            } catch (e){
                return callback(e);
            }

        }

        function countRecordsOnDisk( path, fileArr ) {
            try {
                let stats,
                    files = fs.readdirSync( path );

                fileArr = fileArr || [];
                files.forEach( ( file ) => {
                    stats = fs.statSync( Path.join( path, file ) );

                    if( stats.isDirectory() ) {
                        fileArr = countRecordsOnDisk( Path.join( path, file ), fileArr );
                    }
                    else if( stats.isFile() ) {
                        fileArr.push( file );
                    }
                } );

                return fileArr;

            } catch( err ) {
                throw err;
            }
        }

        async function checkImportAndSendEmail() { //jshint ignore:line
            let
                text,
                err,
                result,
                recordsOnDBWithNoRefOnDisk,
                recordsOnDisk = countRecordsOnDisk( `${download}/BRIEFE` ).length;

                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'audit',
                                            action: 'get',
                                            query: { descr: {$in: [ 'FileNotExistErr', 'NotFileError']}},
                                            options: {
                                                lean: true
                                            }
                                        } )
                                    );

                if( err ) {
                    Y.log( `checkImportAndSendEmail: Error querying audit. Error: ${err}`, "error", NAME );
                    throw err;
                }

                recordsOnDBWithNoRefOnDisk = result.length;

            if( recordsOnDBWithNoRefOnDisk === 0 && recordsOnDisk === 0 ) {
                text = i18n("MediaMojit.email.SUCCESS_TEXT");
            } else if(  recordsOnDBWithNoRefOnDisk === 0 && recordsOnDisk !== 0){
                text = i18n("MediaMojit.email.SUCCESS_TXT_WITH_RECORDS_ONDISK").replace( '$recordsOnDisk$', recordsOnDisk);
            } else {
                text = i18n("MediaMojit.email.FAILURE_TEXT").replace( '$recordsOnDisk$', recordsOnDisk).replace('$fileNotFount$', recordsOnDBWithNoRefOnDisk);
            }

            [err, result] = await formatPromiseResult( //jshint ignore:line
                                    new Promise((resolve, reject) => {
                                        sendImportEmail( text, (err) =>{
                                            if(err){
                                                reject(err);
                                            } else{
                                                resolve();
                                            }
                                        } );
                                    })
                                  );

            if( err ) {
                Y.log( `checkImportAndSendEmail: Error while sending email. Error: ${err}`, "error", NAME );
                throw err;
            }
        }

        /**
         *  Check directory to int module or not
         *  @param  path {String} Path to BRIEFE directory
         */
        // eslint-disable-next-line no-unused-vars
        function dirExists( path ) {
            return fs.stat( path )
                .then( stats => {
                    if( !stats.isDirectory() ) {
                        throw new NotDirError( `${path} is not a directory.` );
                    }
                    return fs.readdir( path );
                } )
                .then( ( dir ) => {
                    if( !dir.length ) {
                        throw new EmptyDirError( `${path} is empty.` );
                    }
                } )
                .catch( ( err ) => {
                    if( err && err.code === 'ENOENT' ) {
                        throw new DirNotExistErr( `${path} not exists.` );
                    }
                    if( err && err.code === 'EACCES' ) {
                        throw new NoAccessDir( `No permissions to: ${path}.` );
                    }
                    throw err;

                } );
        }

        /**
         *  Check if imported activities exists
         * @returns {Promise}
         */
        async function checkImportedActivities() { //jshint ignore:line
            let
                err,
                result;

            [err, result] = await formatPromiseResult( //jshint ignore:line
                                     runDb( {
                                        user: user,
                                        action: 'get',
                                        model: 'activity',
                                        query: {userContent: importObjRexEx, mediaImportError: false},
                                        options: {
                                            limit: 1
                                        }
                                    } )
                                  );

            if( err ) {
                throw err;
            }

            if( result.length === 0 ) {

                [err, result] = await formatPromiseResult( //jshint ignore:line
                    checkImportAndSendEmail()
                );

                if( err ) {
                    throw err;
                }

                throw new NoImportedActivitiesErr( 'No imported activities found.' );
            }
        }

        /**
         *  Init code only if import needed
         *  @param  dir       {String}        Path to BRIEFE directory
         *  @param  timeoutMs {Number}        Timeout if server load is high
         */
        function init( dir, timeoutMs ) {

            const MAX_LOAD_1M = 0.75;
            const MAX_LOAD_1M_2 = 0.7;
            const MAX_LOAD_5M = 0.8;
            const DARWIN_ADDITION = 0.18;

            const captionMapping = {
                'image/png': 'PNG',
                'image/jpg': 'JPG',
                'image/jpeg': 'JPG',
                'image/tiff': 'TIFF',
                'application/pdf': 'PDF',
                'application/msword': 'DOC'
            };

            const attachmentTypeMapping = {
                'image/png': 'FORMIMAGE',
                'image/jpg': 'FORMIMAGE',
                'image/jpeg': 'FORMIMAGE',
                'image/tiff': 'FORMIMAGE',
                'application/pdf': 'FORMPDF',
                'text/rtf': 'DOCLETTER',
                'application/msword': 'DOCLETTER'
            };

            const os = require( 'os' );
            const importMediaFromFile = Prom.promisify( Y.doccirrus.media.importMediaFromFile );
            const getModel = Y.doccirrus.mongodb.getModel;
            let activityModel;

            /**
             * Checks predicted load average of system
             * @returns {boolean}
             */
            function loadHigh() {
                var avgs = os.loadavg(),
                    cpus = os.cpus().length,
                    fiveMinute = avgs[1] / cpus,
                    load = avgs[0] / cpus,
                    osType = os.type(),
                    max1m = MAX_LOAD_1M,
                    max1m2 = MAX_LOAD_1M_2,
                    max5m = MAX_LOAD_5M;

                if( osType === 'Darwin' ) {
                    max1m = max1m + DARWIN_ADDITION;
                    max1m2 = max1m2 + DARWIN_ADDITION;
                    max5m = max5m + DARWIN_ADDITION;
                }

                return load > max1m || ( load > max1m2 && fiveMinute > max5m );
            }

            /**
             * Get and save mongoose activity model
             * @returns {Promise}
             */
            function getActivityModel() {
                return getModel( user, 'activity', true ).then( model => { activityModel = model.mongoose; } );
            }

            /**
             * Get one activity for step
             * @returns {Promise}
             */
            function getNextActivity() {
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {userContent: importObjRexEx, mediaImportError: false},
                    options: {lean: true, limit: 1}
                } )
                    .then( ( [activity] ) => {
                        if( !activity ) {
                            return checkImportAndSendEmail()
                                .then( () => {
                                    throw new NotFoundActivityErr( 'Activity with imported data not found.' );
                                } );
                        }
                        return activity;
                    } );
            }

            /**
             * Get letter path and name by content string from activity
             * @param  content {String} content or userContent from activity
             * @returns {Object}
             */
            function getLetterInfo( content ) {
                // clean content because there can be stuff like "Dokument an proc: PROCAM 7% IMPORT-OBJ:/BRIEFE%2f214%2f4153AI.DOC"
                const indexOfImportObj = content.indexOf( 'IMPORT-OBJ:' );
                if( indexOfImportObj > 0 ) {
                    content = content.substring( indexOfImportObj );
                }
                try {
                    content = decodeURIComponent( content );
                } catch( err ) {
                    Y.log( `getLetterInfo: error while decoding path to letter: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                const path = content.substr( 'IMPORT-OBJ:'.length );
                return {
                    path: dir + path,
                    name: path.substring( path.lastIndexOf( '/' ) + 1, path.length )
                };
            }

            /**
             * Update activity
             * @param  activity {Object} new Activity to update
             * @returns {Promise}
             */
            function updateActivity( activity ) {
                const promise = activityModel.update(
                    {_id: activity._id},
                    {
                        attachments: activity.attachments || [],
                        attachedMedia: activity.attachedMedia || [],
                        userContent: activity.userContent,
                        content: activity.content
                    }
                );
                return Promise.all( [promise, activity] );
            }

            /**
             * Clean activity content and userContent
             * @param  activity {Object} activity to clean
             * @returns {Promise}
             */
            function cleanActivity( activity ) {
                if ( -1 !== activity.userContent.indexOf( 'IMPORT-OBJ:' ) ) {
                    activity.userContent = activity.userContent.split( 'IMPORT-OBJ:' )[0];
                }
                if ( -1 !== activity.content.indexOf( 'IMPORT-OBJ:' ) ) {
                    activity.content = activity.content.split( 'IMPORT-OBJ:' )[0];
                }
                return updateActivity( activity );
            }

            /**
             * Add error field to activity
             * @param  message {Object} error message
             * @param  activity {Object} activity to mark
             * @returns {Promise}
             */
            function addErrorToActivity( message, activity ) {
                const promise = activityModel.db.collection( 'activities' ).update( {
                    _id: activity._id
                }, {
                    $set: {mediaImportError: message}
                } );
                return Promise.all( [
                    promise,
                    activity
                ] );
            }

            /**
             * Check letter and clean activity if error
             * @param  file     {String} path to letter
             * @param  activity {Object} activity
             * @returns {Promise}
             */
            function checkLetter( file, activity ) {
                return fs.stat( file )
                    .then(
                        stats => {
                            if( !stats.isFile() ) {
                                return addToAudit( "NotFileError", file, activity )
                                        .then( () => {
                                            return cleanActivity( activity );
                                        } )
                                        .then( () => {
                                            throw new NotFileError( `Letter: ${file} is not a file, ${activity._id.toString()}.` );
                                        } );
                            }
                        },
                        err => {
                            if( err && err.code === 'ENOENT' ) {
                                return addToAudit( "FileNotExistErr", file, activity )
                                        .then( () => {
                                            return cleanActivity( activity );
                                        } )
                                        .then( () => {
                                            if( err.code === 'ENOENT' ) {
                                                throw new FileNotExistErr( `Letter not exist: ${file}, ${activity._id.toString()}.` );
                                            }
                                        } );
                            }
                            throw err;
                        }
                    );
            }

            /**
             * Create document for activity and media Object
             * @param  mediaObj {Object} media
             * @param  activity {Object} activity
             * @param  letter   {Object} letter object
             * @returns {Promise}
             */
            function createDocumentForActivity( mediaObj, activity, letter ) {
                const activityId = activity._id.toString();

                const docObj = {
                    type: attachmentTypeMapping[mediaObj.mimeType] || 'OTHER',
                    url: `/1/media/:download?_id=${mediaObj._id}&mime=${mediaObj.mime}&from=casefile`,
                    publisher: 'Media Import',
                    contentType: mediaObj.mimeType,
                    attachedTo: activity.patientId,     //  deprecated, see MOJ-9190
                    patientId: activity.patientId,
                    activityId: activityId,
                    locationId: activity.locationId.toString(),
                    isEditable: false,
                    caption: `Imported from ${letter.name}`,
                    createdOn: new Date(),
                    mediaId: mediaObj._id.toString(),
                    accessBy: []
                };

                let promise = runDb( {
                    user: user,
                    action: 'post',
                    model: 'document',
                    data: Y.doccirrus.filters.cleanDbObject( docObj ),
                    options: {ignoreReadOnly: true},
                    noAudit: true
                } );
                return Promise.all( [promise, activity, mediaObj, docObj, letter] );
            }

            /**
             * Adjust activity
             * @param  documentId {ObjectId}
             * @param  activity   {Object} Activity to adjust
             * @param  mediaObj   {Object}
             * @param  docObj     {Object}
             * @returns {Promise}
             */
            function adjustActivity( documentId, activity, mediaObj, docObj ) {

                if( !activity.attachments ) {
                    activity.attachments = [];
                }

                if( !activity.attachedMedia ) {
                    activity.attachedMedia = [];
                }

                activity.attachments.push( documentId.toString() );
                activity.attachedMedia.push( {
                    caption: captionMapping[docObj.contentType] || 'DOC',
                    contentType: docObj.contentType,
                    mediaId: mediaObj._id.toString()
                } );

                return cleanActivity( activity );

            }

            /**
             * Import one letter for activity
             * @returns {Promise}
             */
            function doImportStep() {
                const promise = loadHigh() ? Prom.delay( timeoutMs ) : Promise.resolve();

                return promise
                    .then( () => getNextActivity() )
                    .then( activity => {
                        if ( activity.attachments && activity.attachments.length > 0 ) {
                            doImportStep();
                            return Promise.reject( new Error( 'attachment already exists' ) );
                        }
                        const letter = getLetterInfo( activity.userContent );
                        return Promise.all( [
                            activity,
                            letter,
                            checkLetter( letter.path, activity )
                        ] );
                    } )
                    .then( ( [activity, letter] ) => {
                        if ( !activity ) { return; }
                        return Promise.all( [
                            importMediaFromFile( user, letter.path, 'activity', activity._id, letter.name, 'user', activity.actType )
                                .catch( err => {
                                    if( err && err.message && err.message.includes( 'Permission denied' ) ) {
                                        const msg = `No access to file: ${letter.path}, ${activity._id.toString()}`;
                                        return addErrorToActivity( msg, activity ).then( () => {
                                            throw new NoAccessFile( msg );
                                        } );
                                    }
                                    if( err && err.data && err.data.includes( 'type not recognized' ) ) {
                                        const msg = `${err.data}: ${letter.path}, ${activity._id.toString()}`;
                                        return addErrorToActivity( msg, activity ).then( () => {
                                            throw new UnknownFileType( msg );
                                        } );
                                    }
                                    throw err;
                                } ),
                            activity,
                            letter
                        ] );
                    } )
                    .then( ( [mediaObj, activity, letter] ) => {
                        return createDocumentForActivity( mediaObj, activity, letter );
                    } )
                    .then( ( [[documentId], activity, mediaObj, docObj, letter] ) => {
                        return Promise.all( [
                            adjustActivity( documentId, activity, mediaObj, docObj ),
                            fs.unlink( letter.path ).catch( err => {
                                return addErrorToActivity( err && err.message || err, activity ).then( () => {
                                    throw new UnlinkErr( err );
                                } );
                            } )
                        ] );
                    } )
                    .then( () => doImportStep() );

            }

            /**
             * Start import process
             * @returns {Promise}
             */

            Y.log( 'Starting media import', 'info', NAME );
            start = () => doImportStep().catch( ( err ) => handleError( err ) );

            getActivityModel().then( start );

        }

        /**
         * Handle error and recovery
         * @param  err {Error}
         * @returns {Promise}
         */
        function handleError( err ) {

            if( err ) {

                switch( true ) {

                    // Skip import
                    case err instanceof NotDirError:
                    case err instanceof EmptyDirError:
                    case err instanceof DirNotExistErr:
                    case err instanceof NoAccessDir:
                    case err instanceof NoImportedActivitiesErr:
                        Y.log( `${err.message || err} Skip import.`, 'warn', NAME );
                        return;

                    // Recovery process
                    case err instanceof NotFileError:
                    case err instanceof FileNotExistErr:
                        Y.log( `${err.message || err} Clean activity and do next activity step.`, 'warn', NAME );
                        start();
                        return;

                    // Recovery process
                    case err instanceof NoAccessFile:
                    case err instanceof UnknownFileType:
                        Y.log( `${err.message || err} Add error on activity and do next activity step.`, 'warn', NAME );
                        start();
                        return;

                    // Recovery process
                    case err instanceof UnlinkErr:
                        Y.log( `${err.message || err} Do next activity step.`, 'warn', NAME );
                        start();
                        return;

                    // Success
                    case err instanceof NotFoundActivityErr:
                        Y.log( `${err.message || err} No more activity. Import success finished.`, 'warn', NAME );
                        return;

                }

            }

            Y.log( `${err && err.message || err} unhandeled import error.`, 'error', NAME );
        }

        Prom.delay( 900000 ) //15min
            .then( () => dirExists( `${download}/BRIEFE` ) )
            .then( () => checkImportedActivities() )
            .then( () => init( download, TIMEOUTMS ) )
            .catch( err => handleError( err ) );

        Y.namespace( 'doccirrus' ).mediaimport = {
            name: NAME
        };
    },
    '0.0.1', {requires: []}
);

