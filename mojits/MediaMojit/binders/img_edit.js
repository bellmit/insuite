// Do not define anything here --
//    the first code in the binder
// MUST be the following line:

/*exported _fn */
/*global ko, async */
/*eslint prefer-template:0, strict:0  */

function _fn( Y, NAME ) {                                   //  eslint-disable-line
    'use strict';
    /*globals $, FileReader */

    var
        thumbWidth = 100,
        thumbHeight = 100,

        patientRegId = '',                                  //  identifies (V)PRC when using PUC proxy

        ownerCollection = 'test',                           //  should be set by parent binder
        ownerId = 'test',                                   //  should be set by parent binder

        currentImgId = '',                                  //  Datbase _id of single image with this label

        label = 'logo',                                     //  should be set by parent binder
        jq = {},                                            //  cached jQuery selectors [object]

        myData = [],                                        //  set of media items loaded from media mojit
        //addFiles = [],                                    //  files to upload when initialized
        keepOld = false,                                    //  do not remove old image after change

        useAjax = (typeof FileReader !== "undefined"),      //  detect legacy browsers for fallback mode

        openCamera = false,                                 //  openCamera view by default, not file upload view

        //throbberImage = Y.doccirrus.infras.getPrivateURL( '/static/FormEditorMojit/assets/images/throbber.gif' ),
        defaultImage = Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getDefaultImage() ),

        raiseOnChanged = function( mediaMeta ) {
            Y.log('Unhandled callback - changed image to: ' + JSON.stringify( mediaMeta ), 'debug', NAME);
        },

        raiseOnAdd = function( newImageId, mediaMeta ) {
            Y.log('Unhandled callback - added newImage: ' + newImageId + ' to set ' + JSON.stringify( mediaMeta ), 'debug', NAME);
        },

        settingsObject;

    /**
     *  Show throbber image in thumbnail spot
     */

    function setThrobber() {
        jq.imgThrobber.css('top', jq.imgPreview.position().top + 'px');
        jq.imgThrobber.css('left', jq.imgPreview.position().left + 'px');
        jq.imgThrobber.show();
        //jq.imgPreview.attr('src', throbberImage).hide();
    }

    /**
     *  Restore thumbnail to whatever it should be
     */

    function clearThrobber() {
        jq.imgThrobber.hide();
        if (('' === currentImgId) || (0  === myData.length) || (false === myData[0].hasOwnProperty('_id'))) {
            jq.imgPreview.attr('src', defaultImage);
            return;
        }

        function onPreviewUpdated() {
            Y.log('Throbber cleared / action complete.', 'debug', NAME);
        }

        //jq.imgPreview.attr('src', myData[0].url).show();
        Y.doccirrus.media.setImgContentMR( patientRegId, 'imgPreview', myData[0], thumbWidth, thumbHeight, onPreviewUpdated);

    }

    /**
     *  Upload a file to the server via Ajax
     *
     *  @param e            {object}    An event which may have attached file(s)
     *  @param callback     {function}  of the form fn(err, newImageId)
     */

    function uploadImage( e, callback ) {

        if( e.target.files && e.target.files[0] ) {
            Y.log( 'User dropped files.', 'info', NAME );
        } else {
            Y.log( 'Files not dropped or not avilable.', 'info', NAME );
            return;
        }

        var file = e.target.files[0];

        Y.doccirrus.media.uploadFileMR(patientRegId, ownerCollection, ownerId, label, file, callback);
    }

    /**
     *  Called when the file upload box has changed
     *
     *  @param  e           {object}    DOM event with files
     *  @param  callback    {Function}  Of the form fn(err)
     */

    function onUploadChanged( e, callback ) {
        setThrobber( );

        async.series(
            [
                uploadNewImage,
                reloadAfterUpload
            ],
            onAllDone
        );

        //  2.  Upload the file passed by the user
        function uploadNewImage( itcb ) {
            uploadImage( e, onDirectUpload );

            function onDirectUpload( err, newImageId ) {
                if( err ) {
                    Y.log( 'Error uploading image ' + label + ': ' + JSON.stringify(err), 'warn', NAME );
                    clearThrobber( );
                    itcb( err );
                    return;
                }

                Y.log( 'Replacing image ' + currentImgId + ' with '  + newImageId + ' (label ' + label + ')', 'info', NAME );
                currentImgId = newImageId;
                itcb( null );
            }
        }

        //  3.  Reload the list of attachments
        function reloadAfterUpload( itcb ) {
            reloadImages( onReloadAfterUpload );

            function onReloadAfterUpload( err ) {
                if ( err ) { Y.log( 'Error reloading images: ' + JSON.stringify( err ), 'warn', NAME ); }
                deleteExtraImages( currentImgId, onExtrasDeleted );
            }

            function onExtrasDeleted( err ) {
                if ( err ) { Y.log( 'Error deleteing extra images: ' + JSON.stringify( err ), 'warn', NAME ); }
                if ( settingsObject && Y.Lang.isFunction( settingsObject.uploadCallback ) ) {
                    settingsObject.uploadCallback.apply( undefined, arguments );
                }
                itcb();
            }

        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( 'Problem attaching image: ' + JSON.stringify( err ), 'debug', NAME );
                return;
            }

            updateDisplay();
            raiseOnChanged( myData );
            callback( null );
        }

    }

    /**
     *  This control is for managing a single image, if there is more than one with the given label, delete the etras
     *
     *  @param  saveThisOne {String}    Database _id of a single image to save
     *  @param  callback    {Function}  Of the form fn( err )
     */

    function deleteExtraImages( saveThisOne, callback ) {
        if ( true === keepOld ) {
            Y.log( 'Not deleting extra images (config keepold)', 'debug', NAME );
            callback( null );
            return;
        }

        if (myData.length <= 1) {
            callback( null );
            return;
        }

        Y.log('Deleting all images except: ' + saveThisOne, 'debug', NAME);

        var
            toDelete = [],
            i;

        for (i = 0; i < myData.length; i++ ) {
            if ((myData[i]._id + '') !== (saveThisOne + '')) {
                Y.log( 'Deleting previous image: ' + myData[i]._id );
                toDelete.push( myData[i] );
            }
        }

        async.eachSeries( toDelete, deleteSingleImage, onAllDone );

        function deleteSingleImage( img, itcb ) {
            function onDeleteSingleImage( err, response ) {
                if ( err ) {
                    Y.log( 'Problem deleting single image: ' + JSON.stringify( err ), 'debug', NAME );
                    itcb( null );
                    return;
                }
                Y.log( 'Deleted image ' + img._id + ': ' + JSON.stringify( response ), 'debug', NAME );
                itcb( null );
            }

            Y.log('Removing ' + img._id + ' !== ' + saveThisOne, 'debug', NAME);
            Y.doccirrus.media.deleteMR( patientRegId, ownerCollection, ownerId, img._id, onDeleteSingleImage );
        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( 'Problem deletingimage: ' + JSON.stringify( err ), 'warn', NAME );
            }

            reloadImages( onReloaded );
        }

        function onReloaded( err, mediaMeta ) {
            if ( !callback ) { return; }
            callback( err, mediaMeta );
        }

    }


    /**
     *  Fired when files are dropped
     *  @param  {Object}    files   A browser filelist object
     */
    function onFilesDropped( files ) {
        //Y.log( 'DROP! ' + label, 'debug', NAME );

        var
            newEvt = {                      //  dummy event for onUploadChanged
                'target': {
                    'files': files
                }
            },
            i;                              //  loop counter

        for( i = 0; i < files.length; i++ ) {
            if( Y.config.debug ) {
                Y.log( 'file ' + i + ': ' + JSON.stringify( files[i] ), 'debug', NAME );
            }
        }

        if( files.length > 0 ) {
            onUploadChanged( newEvt, function( err ) {
                if( err ) {
                    Y.log( 'Error attaching dropped files: ' + err, 'warn', NAME );
                }
            } );
        }
    }

    function onBackClick() {
        jq.divCameraControls.hide();
        jq.divUploadControls.show();

        checkAndStopStream();
    }

    function onCameraClick() {
        jq.divCameraControls.show();
        jq.divUploadControls.hide();
        jq.btnSnapshotBack.show();

        function onImagePost(err, newImageObj) {
            Y.doccirrus.media.clearCache(ownerCollection, ownerId);

            if( err ) {
                Y.log( 'Error uploading image ' + label + ': ' + JSON.stringify(err), 'warn', NAME );
                clearThrobber( );
                return;
            }

            newImageObj = (newImageObj && newImageObj.data) ? newImageObj.data : newImageObj;
            currentImgId = newImageObj._id;
            Y.log( 'Replaced image ' + newImageObj._id + ' with label ' + label );

            checkAndStopStream();

            reloadImages( onReloadAfterSnapshot );

            function onReloadAfterSnapshot( err ) {
                if ( err ) { Y.log( 'Error reloading after snapshot: ' + JSON.stringify( err ), 'debug', NAME ); }

                //  delete images which have this label but not this id
                deleteExtraImages(currentImgId , onExtrasDeleted );
            }

            function onExtrasDeleted( err ) {

                if ( err ) {
                    Y.log( 'Could not reload images: ' + JSON.stringify(err), 'debug', NAME );
                }

                updateDisplay();
                raiseOnAdd( currentImgId, myData );
                raiseOnChanged( myData );
                Y.doccirrus.comctl.clearModal();
            }

        }

        //  Using perceived luminance rather than RGB brightness
        //  http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color

        /*
        function desaturateByLuminance(canvas) {
            var context = canvas.getContext("2d"),
                imageData = context.getImageData(0, 0, canvas.width, canvas.height),
                data = imageData.data,
                brightness,
                i;

            for(i = 0; i < data.length; i += 4) {
                brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                // red
                data[i] = brightness;
                // green
                data[i + 1] = brightness;
                // blue
                data[i + 2] = brightness;
            }

            // overwrite original image
            context.putImageData(imageData, 0, 0);
        }
        */

        /**
         *  Invoked when user presses 'Take snapshot' button
         */

        function onSnapshotClick() {
            var
                video = jq.vidStream[0],
                canvas = jq.canvasFrame[0],
                ctx = canvas.getContext("2d"),
                settings = {
                    'ownerCollection': ownerCollection,
                    'ownerId': ownerId,
                    '_id': newId,
                    'name': 'Webcam ' + (new Date().getTime()),
                    'fileName': 'webcam' + (new Date().getTime()) + '.jpg',
                    'label': label
                };

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, video.videoWidth, video.videoHeight);

            //desaturateByLuminance(canvas);

            settings.source = canvas.toDataURL("image/jepg");
            setThrobber();

            if (!patientRegId || '' === patientRegId) {
                Y.doccirrus.comctl.privatePost('/1/media/:upload64', settings, onImagePost);
            } else {
                Y.doccirrus.blindproxy.postSingle(patientRegId, '/1/media/:upload64', settings, onImagePost);
            }

        }

        function onStreamStart( stream ) {

            jq.lastRawStream = stream;

            jq.spanMsgAllow.hide();
            //  necessary for Safari 11
            //  see: https://bugs.webkit.org/show_bug.cgi?id=176843
            jq.vidStream.attr( 'webkit-playsinline', '' );
            jq.vidStream.attr( 'playsinline', '' );

            jq.vidStream.show();
            jq.btnSnapshot.show();

            jq.vidStream[0].srcObject = stream;
            jq.vidStream[0].play();
            jq.btnSnapshot.off('click.media').on('click.media', function() { onSnapshotClick(); });
            //button.disabled = false;
        }

        function onStreamEnd(err) {
            Y.log("Could not get video stream: " + JSON.stringify(err), 'warn', NAME);
            jq.spanMsgAllow.html('Video-Stream konnte nicht erstellt werden.');
            if( !Y.UA.secure && Y.UA.chrome ) {
                jq.spanMsgAllow.html( Y.doccirrus.i18n( 'MediaMojit.message.videoChromeHttps' ) );
            }
            if (err.hasOwnProperty('name')) {
                jq.spanMsgAllow.html('Video-Stream konnte nicht erstellt werden: ' + err.name);
            }
            jq.btnCamera.hide();
            jq.btnSnapshot.hide();
        }

        var newId = ('webcam' + (new Date().getTime()) + (Math.random() * 999999)).replace( '.', '' );

        navigator.mediaDevices.getUserMedia( { video: true } ).then(onStreamStart).catch(onStreamEnd);
    }

    /**
     *  Update thumbnails and file upload boxes from myData
     */

    function updateDisplay() {

        var currImg = (myData.length > 0) ? myData[0] : null;

        if (currImg && (currImg.hasOwnProperty('name'))) {
            //  single image is set
            jq.txtFilename.val( currImg.name );
            jq.btnReset.show();
            jq.imgPreview.width(thumbWidth);
            jq.imgPreview.height(thumbHeight);
        } else {
            //  this image is not set
            jq.txtFilename.val( '' );
            jq.btnReset.hide();
        }

        function onPreviewUpdated() {
            Y.log('Preview image updated.', 'debug', NAME);
            clearThrobber();
        }

        Y.doccirrus.media.setImgContentMR( patientRegId, 'imgPreview', currImg, thumbWidth, thumbHeight, onPreviewUpdated);
    }

    /**
     *  Load set of attached media items via ajax
     *
     *  @param  callback    {Function}  Of the form fn( err )
     */

    function reloadImages( callback ) {

        function onImageSetLoaded(err, mediaMeta) {
            if ( err ) {
                Y.log( 'Could not list attached images: ' + JSON.stringify( err ), 'warn', NAME );
                if ( callback ) { return callback( err ); }
                return;
            }

            Y.log('Images: ' + JSON.stringify(mediaMeta, undefined, 2), 'debug', NAME);

            myData = mediaMeta;

            if (('' === currentImgId) && (myData.length > 0) && (myData[0].hasOwnProperty('_id'))) {
                currentImgId = myData[0]._id;
            }

            callback( null, myData );
        }

        /*
        function onExtrasDeleted( err ) {
            if (myData.length > 1) {
                deleteExtraImages( currentImgId, onExtrasDeleted );
            }

            updateDisplay();
            clearThrobber();

            //  files wating to be uploaded
            if (addFiles.length > 0) {
                onFilesDropped(addFiles);
                addFiles = [];
            }

            raiseOnChanged( myData );

            if ( callback ) {
                callback( null, myData );
            }
        }
        */

        Y.doccirrus.media.clearCache(ownerCollection, ownerId);
        Y.doccirrus.media.listMR( patientRegId, ownerCollection, ownerId, label, onImageSetLoaded );
    }

    /**
     *  Delete the current single image associated with this label, replaces reset action
     *
     *  @param  callback    {Function}  Of the form fn( err )
     */

    function deleteCurrentImage( callback ) {
        //  if no current image then nothing to do (idempodent)
        if ( '' === currentImgId ) { return callback( null ); }

        function onImageDeleted(err , status) {
            if (err) {
                Y.log('Error deleting single image: ' + JSON.stringify(err, undefined, 2), 'warn', NAME);
                return;
            }

            Y.log('Deletion status message: ' + status, 'debug', NAME);
            reloadImages( reloadAfterDeletion );
        }

        function reloadAfterDeletion( err ) {
            updateDisplay();
            raiseOnChanged( myData );

            if ( callback && 'function' === typeof callback ) { return callback( err ); }
        }

        Y.doccirrus.media.deleteMR(patientRegId, ownerCollection, ownerId, currentImgId, onImageDeleted);
        currentImgId = '';
    }

    /**
     *  Called by the fallback upload form for browsers withour FileReader
     */

    function onLegacyFormSubmission( ) {
        Y.log('Form submission', 'info', NAME);

        deleteCurrentImage( onCurrentImageDeleted);

        function onCurrentImageDeleted( err ) {
            if ( err ) { Y.log( 'Error deleting current image: ' + JSON.stringify( err ), 'warn', NAME ); }

            jq.ifSaveTarget.off('load').on('load', function(){
                Y.log('iframe loaded', 'info', NAME);
                Y.doccirrus.media.clearCache(ownerCollection, ownerId);
                reloadImages( onReloadedImages );
            });
        }

        function onReloadedImages( err ) {
            if ( err ) {
                Y.log( 'Problem reloading images after legacy form submission: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }
            Y.log( 'Legacy form submission complete', 'debug', NAME );
        }

    }

    //  when clicking the preview thumbnail, open the best available capture (camera, film roll or file)
    function onImageClick() {
        if (jq.btnCamera.is(":visible")) {
            jq.btnCamera.click();
        } else {
            jq.fileSelect.click();
        }
    }

    // setup event handlers of this jade snippet
    function setupEventHandlers( ) {

        //  set hidden form fields, used to attach the upload correctly
        jq.hdnOwnerCollection.val(ownerCollection);
        jq.hdnOwnerId.val(ownerId);

        jq.frmSingleImg.attr('action', Y.doccirrus.infras.getPrivateURL( '/1/media?/:upload' ));

        Y.log('Setting up handlers: ' + ownerCollection + '::' + ownerId, 'debug', NAME);

        jq.frmSingleImg.off('submit').on( 'submit', onLegacyFormSubmission );

        jq.btnReset.off('click.image').on( 'click.image', deleteCurrentImage );

        jq.imgPreview.off('click.image').on( 'click.image' , onImageClick );

        jq.btnCamera.off('click.image').on( 'click.image', onCameraClick );

        jq.btnSnapshotBack.off('click.image').on( 'click.image', onBackClick );

        jq.fileUploadBox.on('change', function( e ) {
            onUploadChanged( e, function(err) {
                if (err) {
                    Y.log('Error uploading from file upload box: ' + err, 'warn', NAME);
                }
            } );
        } );

        jq.fileSelect.on('change', function( e ) {
            onUploadChanged( e , function(err) {
                if (err) {
                    Y.log('Error uploading from file select: ' + err, 'warn', NAME);
                }
            });
        } );

        if (true === useAjax) {
            jq.btnSubmitLegacy.hide();
        }

        //Y.log('Setting preview size: ' + thumbWidth + 'x' + thumbHeight, 'debug', NAME);
        jq.imgPreview.width(thumbWidth);
        jq.imgPreview.height(thumbHeight);

        Y.doccirrus.media.makeDroppable('imgPreviewDiv', onFilesDropped);

    }

    /**
     *  Load settings passed on load object
     *
     *  @param  settingsObj {Object}    node.passToBinder
     */

    function loadSettings(settingsObj) {

        if (settingsObj.hasOwnProperty('label')) {
            label = settingsObj.label;
        }

        //  allows element to pass media through PUC proxy
        if (settingsObj.hasOwnProperty('patientRegId')) {
            patientRegId = settingsObj.patientRegId;
        }

        //  type of object image is attached to
        if (settingsObj.hasOwnProperty('ownerCollection')) {
            ownerCollection = settingsObj.ownerCollection;
        } else {
            Y.log('Please pass ownerCollection in settings', 'warn', NAME);
        }

        //  object image is attached to
        if (settingsObj.hasOwnProperty('ownerId')) {
            ownerId = settingsObj.ownerId;
        } else {
            Y.log('Please pass ownerId in settings', 'warn', NAME);
        }

        if (settingsObj.hasOwnProperty('thumbWidth')) {
            thumbWidth = parseInt(settingsObj.thumbWidth, 10);
        }

        if (settingsObj.hasOwnProperty('thumbHeight')) {
            thumbHeight = parseInt(settingsObj.thumbHeight, 10);
        }

        if (settingsObj.hasOwnProperty('onChange')) {
            raiseOnChanged = settingsObj.onChange;
        }

        if (settingsObj.hasOwnProperty('onAdd')) {
            raiseOnAdd = settingsObj.onAdd;
        }

        /*
        if (settingsObj.hasOwnProperty('addFiles')) {
            addFiles = settingsObj.addFiles;
        }
        */

        if (settingsObj.hasOwnProperty('keepOld')) {
            keepOld = true;
        }

        if (settingsObj.hasOwnProperty('openCamera')) {
            openCamera = settingsObj.openCamera;
        }

        settingsObject = settingsObj;

    }

    function checkAndStopStream() {
        if(jq.lastRawStream) {
            if (jq.lastRawStream.stop && 'function' === typeof jq.lastRawStream.stop ) {
                jq.lastRawStream.stop();
            } else if(jq.lastRawStream.getVideoTracks && 'function' === typeof jq.lastRawStream.getVideoTracks ) {
                jq.lastRawStream.getVideoTracks().forEach(function(mediaItem){
                    if(mediaItem && mediaItem.stop && typeof mediaItem.stop === 'function') {
                        mediaItem.stop();
                    }
                });
            }
        }
    }

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            var
                i18n = Y.doccirrus.i18n;
            //  Pre-cache jQuery sectors
            jq  = {
                'divUploadControls': $('#divUploadControls'),
                'divCameraControls': $('#divCameraControls'),

                'spanMsgAllow': $('#spanMsgAllow'),
                'vidStream': $('#vidStream'),
                'canvasFrame': $('#canvasFrame'),
                'btnSnapshot': $('#btnSnapshot'),
                'btnSnapshotBack': $('#btnSnapshotBack'),

                'imgPreview': $('#imgPreview'),
                'imgThrobber': $('#imgThrobber'),
                'btnReset': $('#btnReset'),
                'btnCamera': $('#btnCamera'),
                'btnSubmitLegacy': $('#btnSubmitLegacy'),
                'txtFilename': $('#txtFilename'),
                'fileSelect': $('#fileSelect'),
                'fileUploadBox': $('#fileUploadBox'),
                'frmSingleImg': $('#frmSingleImg'),

                'hdnOwnerCollection': $('#hdnOwnerCollection'),
                'hdnOwnerId': $('#hdnOwnerId'),
                'ifSaveTarget': $('#ifSaveTarget')
            };

            //  hide camera button if browser does not support direct access to camera
            if ( !( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) ) {
                jq.btnCamera.hide();
            }

            //  disable this on Safari explicitly
            //  http://www.experts-exchange.com/Programming/Languages/Scripting/JavaScript/Jquery/Q_28366707.html

            if (navigator.userAgent.toLowerCase().indexOf('safari/') > -1) {
                if (navigator.vendor && 0 === navigator.vendor.indexOf('Apple')) {
                    jq.btnCamera.hide();
                }
            }

            //  Load any configuration passed from parent binder
            if (node.hasOwnProperty('passToBinder')) {
                loadSettings(node.passToBinder);
            }

            Y.log('Setting up editor for ' + ownerCollection + '::' + ownerId + ' (' + label + ')', 'info', NAME);

            setupEventHandlers();
            reloadImages( onInitialLoad );

            function onInitialLoad() {
                updateDisplay();
            }

            if ( openCamera ) {
                jq.btnCamera.click();
                jq.btnSnapshotBack.hide();
            }

            function ImgEditVM() {
                var
                    self = this;

                self.lblPleaseApproveWebcamI18n = i18n('MediaMojit.main.LBL_PLEASE_APPROVE_WEBCAM' );
                self.btnBackI18n = i18n('MediaMojit.main.BTN_BACK');
                self.btnSnapshotI18n = i18n('MediaMojit.main.BTN_SNAPSHOT');
                self.lblPreviewI18n = i18n('MediaMojit.main.LBL_PREVIEW');
                self.uLogoFormatI18n = i18n('MediaMojit.main.U_LOGO_FORMAT');
                self.lblLogoFormatI18n = i18n('MediaMojit.main.LBL_LOGO_FORMAT');
                self.btnResetI18n = i18n('MediaMojit.main.BTN_RESET');

            }

            ko.applyBindings( new ImgEditVM(), document.querySelector( '#divImageControls' ) );
        },

        deregisterNode: function( /* node  */ ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();

            //  close any open device stream
            checkAndStopStream();

            Y.log('Removing single image selection dialog.', 'debug', NAME);
        }
    };
}