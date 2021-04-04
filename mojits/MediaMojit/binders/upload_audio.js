/**
 *  jadeLoaded widget to record and/or upload audio
 *
 *  Usage:
 *
 *      When instantiating, please add 'passToBinder' property to the YUI node this will be rendered into
 *
 *          node.passToBinder.ownerCollection = 'myschemaname'
 *          node.passToBinder.ownerId = '123_DB_ID_OF_OWNER'
 *
 *      The parent view should also pass an 'onChange' method, which will be called with any image chosen
 *      by the user, and the cropping or scaling requested.
 *
 */

/*global ko, $ */

/*eslint prefer-template:0, strict:0 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*exported _fn */

function _fn( Y, NAME ) {       // eslint-disable-line
    'use strict';

    //  PRIVATE PROPERTIES

    var
        callWhenChanged,        //  called when an upload completes
        jqCache,                //  cached jQuery selectors
        ownerCollection,        //  collection top which owner object belongs
        ownerId,                //  database ID of object which owns these images
        label = '',             //  optionally divides the set of attachements into categories

        maxFileSize = 3884588,  //  this seems to be the largest size which will fit in the database
        patientRegId = '';      //  allow operation therough PUC proxy

    //  defaultId = '';         //  default selection, if any
    //  selectedId = '',        //  currently selected media _id, if any
    //  mediaList;              //  set of metadata describing attached media items [array:object]

    function onShowStatus(msg) {
        jqCache.divRecordingStatus.html(msg);
    }

    /**
     *  Present an upload dialog, similar to how zips are added
     */

    function onUploadClick() {

        function onMp3FileSelected(fileElem) {
            Y.log('User has ' + fileElem.files.length + ' selected files to upload.', 'info', NAME);

            if (0 === fileElem.files.length) {
                jqCache.btnUpload.show();
                return;
            }

            function onFileUploaded(err, newMediaId) {

                if (err) {
                    Y.log('Error uploading file: ' + err, 'warn', NAME);
                    onShowStatus('Fehler beim Upload: ' + err);
                    return;
                }

                Y.log('Attached file as: ' + newMediaId, 'debug', NAME);

                //  update the upload line in the UI
                onShowStatus('Upload abgeschlossen: ' + mp3File.name);

                //  reload the list of attachments (will update display)
                Y.doccirrus.media.clearCache(ownerCollection, ownerId);
                callWhenChanged(newMediaId);
            }

            mp3File = fileElem.files[0];

            fileNameLc = mp3File.name.toLowerCase();

            if (-1 === fileNameLc.indexOf('.mp3')) {
                jqCache.spanNotSupported.hide();
                jqCache.spanAudioSupported.hide();
                onShowStatus("Bitte wählen Sie eine MP3-Datei.");
                return;
            }

            //if (!patientRegId || '' === patientRegId) {
            //    //  PUC proxy is more limited in the size it will accept
            //    maxFileSize = maxFileSize * 2;
            //}

            if (mp3File.size > maxFileSize) {
                jqCache.spanNotSupported.hide();
                jqCache.spanAudioSupported.hide();
                onShowStatus("Die Audiodatei darf maximal 3,8 MB groß sein!");
                return;
            } else {
                jqCache.spanNotSupported.hide();
                jqCache.spanAudioSupported.hide();
                onShowStatus(
                    Y.doccirrus.comctl.getThrobber() + '&nbsp;&nbsp;&nbsp;' + 'Die Audiodatei wird gesendet'
                );
            }

            jqCache.btnUpload.hide();

            Y.doccirrus.media.uploadFileMR( patientRegId, ownerCollection, ownerId, label, mp3File, onFileUploaded );

        }

        var
            mp3File,
            fileNameLc;

        jqCache.fileUploadMp3 = $('#fileUploadMp3');

        jqCache.fileUploadMp3.off('change.audio').on('change.audio', function() {
            onMp3FileSelected(jqCache.fileUploadMp3[0]);
            //  value cannot be directly set, see
            //  http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery
            jqCache.fileUploadMp3.replaceWith( jqCache.fileUploadMp3 = jqCache.fileUploadMp3.clone( true ) );
            jqCache.btnUpload.hide();

        });

        jqCache.fileUploadMp3.click();
    }

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {
            var k,
            i18n = Y.doccirrus.i18n;

            Y.log('Registered upload_audio node', 'debug', NAME);

            ownerCollection = 'test';
            ownerId = 'test';

            //  check for media library

            if ((!Y.doccirrus) || (!Y.doccirrus.media)) {
                Y.log('The attachments list view requires Y.doccirrus.media (dcmedia autoloaded YUI module)', 'warn', NAME);
            }

            //  cache some jQuery selectors

            jqCache = {
                'btnStop': $('#btnStop'),
                'btnUpload': $('#btnUpload'),
                'preRecorderLog': $('#preRecorderLog'),
                'divRecordingStatus': $('#divRecordingStatus'),
                'spanAudioSupported': $('#spanAudioSupported'),
                'spanNotSupported': $('#spanNotSupported'),
                'divUserMediaDebugLog': $('#divUserMediaDebugLog'),
                'fileUploadMp3': $('#fileUploadMp3')
            };

            if( node && node.passToBinder && node.passToBinder.modal ) {
                //  add move buttons to modal footer
                node.passToBinder.modal.getButton( 'btnUpload' ).button.set( 'label', jqCache.btnUpload.text() ); // that's not the way it should be
                node.passToBinder.modal.getButton( 'btnUpload' ).on( 'click', onUploadClick ); // that's not the way it should be
                jqCache.btnUpload.hide();
                jqCache.btnUpload = $( node.passToBinder.modal.getButton( 'btnUpload' ).getDOMNode() ); // that's not the way it should be
            } else {
                //  bind buttons in place
                jqCache.btnUpload.off('click.audio').on('click.audio', function () { onUploadClick();  });
            }

            //  TODO: add a button to delete the current attached recording
            //jqCache.btnClearImage.off('click.media').on('click.media', function () { onClearImageClick() ;} );

            //  read any settings passed by parent binder

            callWhenChanged = function() {
                Y.log('Audio file uploaded, no listener set', 'debug', NAME);
            };

            if ('undefined' !== node.passToBinder) {

                for (k in node.passToBinder) {
                    if (node.passToBinder.hasOwnProperty(k) && ('function' !== typeof node.passToBinder[k])) {
                        Y.log('received ' + (typeof node.passToBinder[k]) + ' ' + k + ': ' + node.passToBinder[k], 'debug', NAME);
                    }
                }

                if (node.passToBinder.hasOwnProperty('ownerCollection')) {
                    ownerCollection = node.passToBinder.ownerCollection;
                }

                if (node.passToBinder.hasOwnProperty('ownerId')) {
                    ownerId = node.passToBinder.ownerId;
                }

                if (node.passToBinder.hasOwnProperty('label')) {
                    label = node.passToBinder.label;
                }

                if (node.passToBinder.hasOwnProperty('patientRegId')) {
                    patientRegId = node.passToBinder.patientRegId;
                }

                if (node.passToBinder.hasOwnProperty('onChanged')) {
                    //Y.log('setting onChange to ' + node.passToBinder.onChange, 'info', NAME);
                    callWhenChanged = node.passToBinder.onChanged;
                }

                //  may be used in future to overwrite existing recording, editing not yet implemented
                //if (node.passToBinder.hasOwnProperty('default')) {
                //    defaultId = parseInt(node.passToBinder.default, 10);
                //}

                if (node.passToBinder.hasOwnProperty('debug')) {
                    if (node.passToBinder.debug) {
                        jqCache.divUserMediaDebugLog.show();
                    }
                }

                if (node.passToBinder.hasOwnProperty('debug')) {
                    if (node.passToBinder.debug) {
                        jqCache.divUserMediaDebugLog.show();
                    }
                }

            }

            if ('undefined' === (typeof ownerCollection) || 'undefined' === (typeof ownerId)) {
                jqCache.btnUpload.hide();
                onShowStatus('Bitte Eintrag zunächst Speichern.');
            }

            function UploadAudioVM() {
                var
                    self = this;

                self.audioNotSupportedI18n = i18n('MediaMojit.upload_audio.LBL_AUDIO_NOT_SUPPORTED');
                self.audioSupportedI18n = i18n('MediaMojit.upload_audio.LBL_AUDIO_SUPPORTED');
                self.btnUploadAudioI18n = i18n('MediaMojit.upload_audio.BTN_UPLOAD_AUDIO');

            }

            ko.applyBindings( new UploadAudioVM(), document.querySelector( '#divUploadAudioContainer' ) );

        },

        deregisterNode: function( /* node */ ) {
            //  SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //  Commented out because doing so can cause unexpected behavior when reloadeding, can happen in FEM
            //node.destroy();

            Y.log('Unloading media attachments list', 'debug', NAME);

        }
    };
}