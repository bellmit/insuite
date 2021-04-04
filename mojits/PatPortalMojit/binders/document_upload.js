/**
 * User: strix
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

//TRANSLATION INCOMPLETE!! MOJ-3201
/*global $, jQuery, moment, fun:true */
/*exported fun */
/*jslint latedef:false */

'use strict';

fun = function _fn( Y, NAME ) {

    var i18n = Y.doccirrus.i18n;

    function fileMultiChange( e ) {
        Y.doccirrus.utils.notifyAboutFileSizeExceeds( e.target.files );
    }

    return {
        registerNode: function( node ) {

            var
                patientReg,
                locationId,
                activityId,
                patientObj,
                callOnComplete,

                jqCache = {
                    'divPPUploadContainer': $( '#divPPUploadContainer' ),
                    'divAttachmentsAdd': $( '#divAttachmentsAdd' ),
                    'divDragDrop': $( '#divDragDrop' ),
                    'divUploadList': $( '#divUploadList' ),
                    'divMultiUpload': $( '#divMultiUpload' ),
                    'btnMulti': $( '#btnMulti' ),
                    'fileMulti': $( '#fileMulti' ),
                    'divUploadStatus': $( '#divUploadStatus' ),
                    'spanUploadStatus': $( '#spanUploadStatus' )
                };

            node.one( '.document_upload-uploadInfo' ).set( 'text', Y.Lang.sub( i18n( 'PatPortalMojit.intime_documents_tab.uploadFile.uploadInfo' ), {
                bytesAsNameString: Y.doccirrus.utils.getUploadMaxFileSizeAsString()
            } ) );

            /*
             *  Move upload button into modal footer
             */

            if( node && node.passToBinder && node.passToBinder.modal ) {
                node.passToBinder.modal.getButton( 'btnMulti' ).on( 'click', onUploadButtonClick ); // that's not the way it should be
                jqCache.btnMulti.hide();
            }

            /*
             *  Get configuration passed by parent
             */

            if( node.hasOwnProperty( 'passToBinder' ) ) {

                if( node.passToBinder.patientReg ) {
                    patientReg = node.passToBinder.patientReg;
                } else {
                    jqCache.spanUploadStatus.html( 'missing patientreg' );
                    return;
                }

                if( node.passToBinder.locationId ) {
                    locationId = node.passToBinder.locationId;
                } else {
                    jqCache.spanUploadStatus.html( 'missing locationId' );
                    return;
                }

                if( node.passToBinder.onUploadComplete ) {
                    callOnComplete = node.passToBinder.onUploadComplete;
                } else {
                    jqCache.spanUploadStatus.html( 'missing callback onUploadComplete' );
                    return;
                }

            }

            /*
             *  Attach events / make droppable
             */

            lookupPatientRecord( onPatientLoaded );

            /**
             *  Upload a file from an input element or drop event as base64 strings
             *
             *  This is a version of Y.doccirrus.media.uploadFile adapted to use the PP blind proxy
             *
             *
             *  @param  ownerCollection {String}    Type of object which may have file attachments
             *  @param  ownerId         {String}    Database _id of object which may own files
             *  @param  label           {String}    Optional label to categorize / divide up attachments
             *  @param  file            {Object}    An array of browser file objects
             *  @param  callback        {Function}  Of the form fn(err, newMediaId)
             */

            function uploadFile( ownerCollection, ownerId, label, file, callback ) {
                var
                    readerObj,
                    fileSizeExceeds = Y.doccirrus.utils.notifyAboutFileSizeExceeds( [file] );

                Y.log( 'Uploading file: ' + file.name, 'info', NAME );

                // after uploading the file, invalidate cache for this owner and label before calling back

                function onFilePost( err, newImageObj ) {
                    if( err ) {
                        callback( err );
                        return;
                    }

                    // also shut down any modal messages on success
                    if( notice ) {
                        notice.close();
                    }

                    newImageObj = (newImageObj && newImageObj.data) ? newImageObj.data : newImageObj;

                    Y.log( 'Media added with new id: ' + JSON.stringify( newImageObj._id ), 'debug', NAME );
                    //console.log( 'Media added with new id: ' + JSON.stringify( newImageObj._id ) );

                    Y.log( 'Media added, invalidating cached lists for ' + ownerCollection + '::' + ownerId, 'debug', NAME );
                    Y.doccirrus.media.clearCache( ownerCollection, ownerId );
                    callback( null, newImageObj._id );
                }

                // called when file has been read into base64 string, POST it to the VPRC

                function onFileReadFromDisk( file64evt ) {

                    Y.log( 'Read file successfully, POSTing to mediamojit', 'info', NAME );

                    var
                        newId = ('upload' + (new Date().getTime()) + (Math.random() * 999999)).replace( '.', '' ),
                        settings = {
                            'ownerCollection': ownerCollection,
                            'ownerId': ownerId,
                            'source': file64evt.target.result,
                            'id': newId,
                            'name': file.name,
                            'fileName': file.name,
                            'label': label
                        };

                    //console.log('saving media: ', settings);

                    Y.doccirrus.blindproxy.postSingle( patientReg._id, '/1/media/:upload64', settings, onFilePost );
                }

                var notice;

                if( fileSizeExceeds ) {
                    return callback( 'file size exceeded' );
                }

                if( file.size > 2 * 1024 * 1024 ) {
                    notice = Y.doccirrus.DCWindow.notice( {
                        title: 'Hinweis',
                        message: 'Die von Ihnen gewählte Datei ist groß (' +
                        (file.size / 1024 / 1024).toFixed( 2 ) +
                        ' Mb). \n\nDie Übertragungszeit ist abhängig von Ihrer Netzwerkverbindung.',
                        window: {
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true
                                    } )
                                ]
                            }
                        }
                    } );
                    notice.close = function() {
                        notice = null;
                        Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
                    };

                    //  TODO: callback or return here?

                }
                readerObj = new FileReader();
                readerObj.onload = onFileReadFromDisk;
                readerObj.readAsDataURL( file );

            }

            /**
             *  Get the full patient record from the PRC (needed to get primary physician for activity record)
             *
             *  @param  callback    {function}  Of the form fn(err, patientObj)
             */

            function lookupPatientRecord( callback ) {

                var
                    patientLookup = {
                        _id: patientReg.patientId
                    };

                if ( !patientReg || !patientReg.patientId || '' === patientReg.patientId ) {
                    //  TODO: translateme
                    return callback( 'Patient not specified.' );
                }

                Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/patient/' + patientReg.patientId, patientLookup, callback );
            }

            /**
             *  Create a new activity on the PRC
             *
             *  (will be updated with documents array after media is posted)
             *
             *  @param  callback    Of the form fn(err, activityId)
             */

            function createDocumentActivity( fileNames, callback ) {

                var
                    newActivity = {
                        'attachments': [],
                        'actType': 'FROMPATIENTMEDIA',
                        'timestamp': moment().utc().toJSON(),
                        'patientId': patientReg.patientId,
                        'employeeId': patientObj.primaryDoc,
                        'locationId': locationId,
                        'content': 'Datei von Patient: ' + fileNames,
                        'status': 'VALID'
                    };

                newActivity.timestamp = moment().utc().toJSON();
                Y.doccirrus.blindproxy.postSingle( patientReg._id, '/1/activity/', newActivity, callback );
            }

            //  EVENT HANDLERS

            function onPatientLoaded( err, body ) {
                var
                    patients = body && body.data;

                if( err ) {
                    jqCache.divUploadStatus.html( 'Could not load patient details: ' + '<br/>' + JSON.stringify( err ) );
                    return;
                }

                patients = (patients && patients.data) ? patients.data : patients;

                if ( !patients || 0 === patients.length ) {
                    //  TODO: translateme
                    jqCache.divUploadStatus.html( 'Could not load patient details.' );
                    return;
                }

                if ( patients.length > 1 ) {
                    //  TODO: translateme
                    jqCache.divUploadStatus.html( 'More than one patient matched.' );
                    return;
                }

                patientObj = patients[0];

                // fix for MOJ-5180. Employee will be set automatically(api.activity.post)
                //if( !patientObj.hasOwnProperty( 'primaryDoc' ) ) {
                //    jqCache.divUploadStatus.html( 'Patient does not have a primary physician.' );
                //    return; ---
                //}

                jqCache.divAttachmentsAdd.show();
                Y.doccirrus.media.makeDroppable( 'divDragDrop', onFilesDropped );

                jqCache.btnMulti.off( 'click.ppupload' ).on( 'click.ppupload', onUploadButtonClick );
                jqCache.fileMulti.off( 'change.ppupload' ).on( 'change.ppupload', fileMultiChange );

                if( node && node.passToBinder && node.passToBinder.modal ) {
                    // recenter modal
                    node.passToBinder.modal.centered();
                }
            }

            function onUploadButtonClick() {
                var fileElem = document.getElementById( 'fileMulti' );
                Y.log( 'User has ' + fileElem.files.length + ' selected files to upload.', 'info', NAME );
                onFilesDropped( fileElem.files );
            }

            function onFilesDropped( files ) {
                if( 0 === files.length ) {
                    Y.log( 'No files posted.', 'info', NAME );
                    return;
                }

                jqCache.divAttachmentsAdd.hide();
                jqCache.divUploadStatus.show();
                jqCache.spanUploadStatus.html( Y.doccirrus.comctl.getThrobber() );

                var i,
                    toPost = [],
                    mediaIds = [],
                    documentIds = [],
                    fileNames = [],
                    attachedMedia = [],
                    fileNamesStr,
                    lastFile,
                    lastMediaId,
                    lastDocId;

                for( i = 0; i < files.length; i++ ) {
                    toPost.push( files[i] );
                }

                function onNewDocumentCreated( err, newDocumentId ) {

                    var
                        docId = (newDocumentId && newDocumentId.data);
                    if( err ) {
                        Y.log( 'Error linking media from new document: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue with any other uploaded which are queued
                        uploadNext();
                        return;
                    }

                    // either use a valid ID or the string null
                    lastDocId = (docId && docId[0]) ? docId[0] + '' : 'null';
                    documentIds.push( lastDocId );

                    fileNames.push(lastFile.name);

                    uploadNext();
                }

                function onMediaMetaFound( newMedia ) {

                    //  create a new document object
                    Y.log( 'Found uploaded media: ' + JSON.stringify( newMedia, undefined, 2 ), 'debug', NAME );

                    var
                        mediaCaption = i18n( 'top_menu.LBL_MENU_PATIENT_PORTAL' ) + ' - ' + moment().format( 'DD.MM.YYYY' ) + ' - ' + newMedia.name,
                        jqUserCaption = $('#txtUploadCaption');

                    if (jqUserCaption && jqUserCaption.length && jqUserCaption.val() !== '') {
                        mediaCaption = i18n( 'top_menu.LBL_MENU_PATIENT_PORTAL' ) + ' - ' + moment().format( 'DD.MM.YYYY' ) + ' - ' + jqUserCaption.val();
                    }

                    //  TODO: use patient profile on PUC, instead of patient object from PRC

                    var
                        newDocument = {
                            'type': 'FROMPATIENT',
                            'contentType': newMedia.mime.replace( '_', '/' ).toLowerCase(),
                            'createdOn': moment().utc().toJSON(),
                            'isEditable': false,
                            'author': patientObj.firstname + ' ' + patientObj.lastname,
                            'locationId': locationId,
                            'mediaId': newMedia._id,
                            'accessBy': [ (patientObj._id + '') ],
                            'url': newMedia.source + '&from=patient',
                            'caption': mediaCaption,
                            'publisher': patientObj.firstname + ' ' + patientObj.lastname,
                            'attachedTo': patientReg.patientId,     //  deprecated. MOJ-9190
                            'patientId': patientReg.patientId,
                            'activityId': activityId,
                            'postFromPP': true
                        },
                        smallMeta = {
                            'mediaId': newMedia._id,
                            'contentType': newMedia.mime,
                            'caption': newMedia.mime.toUpperCase()
                        },
                        parts = newMedia.mime.split('_');

                    //  make a note if the media properties for activity
                    if (parts && parts[1]) { smallMeta.caption = parts[1]; }
                    attachedMedia.push(smallMeta);

                    //  save a new document
                    Y.doccirrus.blindproxy.postSingle( patientReg, '/1/document', newDocument, onNewDocumentCreated );
                }

                function onMediaMetaLoaded( err, mediaList ) {
                    if( err ) {
                        Y.log( 'Error loading media metadata: ' + err, 'warn', NAME );
                        uploadNext();
                        return;
                    }

                    mediaList = (mediaList && mediaList.data) ? mediaList.data : mediaList;

                    var j;
                    for( j = 0; j < mediaList.length; j++ ) {
                        if( (mediaList[j]._id + '') === (lastMediaId + '') ) {
                            onMediaMetaFound( mediaList[j] );
                            return;
                        }
                    }

                    Y.log( 'Could not find media meta in ' + JSON.stringify( mediaList, 'undefined', 2 ), 'warn', NAME );
                    uploadNext();
                }

                function onFileUploaded( err, newMediaId ) {

                    if( err ) {
                        Y.log( 'Error uploading media: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue with any other uploaded which are queued
                        uploadNext();
                        return;
                    }

                    Y.log( 'Uploaded media with id: ' + JSON.stringify( newMediaId ), 'debug', NAME );
                    lastMediaId = newMediaId;
                    mediaIds.push( newMediaId );

                    var
                        mediaLookup = { 'collection': 'patient', 'id': patientReg.patientId };

                    Y.doccirrus.blindproxy.postSingle( patientReg._id, '/1/media/:list', mediaLookup, onMediaMetaLoaded );

                }

                function uploadNext() {
                    if( 0 === toPost.length ) {

                        fileNamesStr = $('#txtUploadCaption').val();

                        if ('' === jQuery.trim(fileNamesStr)) {
                            fileNamesStr = fileNames.join(', ');
                        }

                        onAllFilesUploaded( documentIds, fileNamesStr, attachedMedia );
                        return;
                    }

                    var nextFile = toPost.pop();
                    lastFile = nextFile;
                    uploadFile( 'patient', patientReg.patientId, 'frompatient', nextFile, onFileUploaded );
                }

                function onActivityCreated( err, newActId ) {
                    var errorMessage;
                    if( newActId && newActId.data && 0 < newActId.data.length ) {
                        newActId = newActId.data;
                    }
                    if( err ) {
                        if( node && node.passToBinder && node.passToBinder.modal ) {
                            node.passToBinder.modal.close();
                        }
                        if( 504 === err.code ) {
                            errorMessage = 'Die Kommunikation mit dieser Praxis ist gestört. Die Praxis ist nicht erreichbar.';

                        } else {
                            errorMessage = err.reasonPhrase;
                        }
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            title: 'Dokument nicht hochgeladen',
                            message: errorMessage
                        } );
                        return;

                    }
                    activityId = newActId[0];
                    uploadNext();
                }

                createDocumentActivity( '', onActivityCreated );
            }

            /**
             *  Called after a set of files have been sent to PRC and linked by documents
             *
             *  Updates activity with attachment set
             *
             *  @param  documentIds     {Object}    Array of document _ids on the PRC
             *  @param  fileNames       {Object}    Array of file names (just a label)
             *  @param  attachedMedia   {Object}    Now stored on activity object to save lookup
             */

            function onAllFilesUploaded( documentIds, fileNames, attachedMedia ) {

                function onActivityUpdated( err ) {
                    if( err ) {
                        jqCache.spanUploadStatus.html( 'All done: ' + activityId );
                        return;
                    }

                    callOnComplete( activityId );
                }

                var
                    userContent = 'Datei von Patient: ' + fileNames,
                    activityFields = {
                        'fields_': 'attachments,userContent,content,attachedMedia',
                        'attachments': documentIds,
                        'content': userContent,
                        'userContent': userContent,
                        'attachedMedia': attachedMedia,
                        'options': { ignoreReadOnly: true }
                    };

                Y.doccirrus.blindproxy.putSingle( patientReg._id, '/1/activity/' + activityId, activityFields, onActivityUpdated );
            }

        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};
