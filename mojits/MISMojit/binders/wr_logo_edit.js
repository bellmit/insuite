// Do not define anything here --
//    the first code in the binderp
// MUST be the following line:

/*global $, location, FileReader, ko */
/*exported _fn */

function _fn( Y, NAME ) {
    'use strict';

    var

        jq = {},

        //  passed by constructor
        myNode, // eslint-disable-line no-unused-vars
        myData = [], //  set of media items loaded from media mojit
        ownerCollection, //  always 'intime'
        ownerId, //  database id of owner object

        // /* (typeof FileReader !== "undefined") */
        useAjax = true, //  detect legacy browsers for fallback mode ---

        singleImageLabel = 'logo',

        throbberImage = Y.doccirrus.infras.getPrivateURL( '/static/FormEditorMojit/assets/images/throbber.gif' ),
        defaultImage = Y.doccirrus.infras.getPrivateURL( '/img/not-found.png' );

    /**
     *  Show throbber image in thumbnail spot
     */

    function setThrobber() {
        jq.imgPreview.attr('src', throbberImage);
    }

    /**
     *  Restore thumbnail to whatever it should be
     */

    function clearThrobber() {
        var currImg = findImageByLabel(singleImageLabel);

        if (currImg.hasOwnProperty('_id')) {
            jq.imgPreview.attr('src', currImg.source + '&w=100&h=100');
        } else {
            jq.imgPreview.attr('src', defaultImage);
        }

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

        var
            reader = new FileReader(),
            label = singleImageLabel,
            file = e.target.files[0];

        Y.log( 'Uploading dropped file: ' + file.name, 'info', NAME );

        // called when file has been read into base64 string

        reader.onload = function onFileReadFromDisk( file64evt ) {

            Y.log( 'Read file successfully, POSTing to mediamojit', 'info', NAME );

            var
                newId = ('upload' + (new Date().getTime()) + (Math.random() * 999999 )).replace( '.', '' ),
                postArgs = {
                    'ownerCollection': ownerCollection,
                    'ownerId': ownerId,
                    'source': file64evt.target.result,
                    'id': newId,
                    'fileName': file.name,
                    'label': label
                };

            //  POST this to the server
            Y.doccirrus.comctl.privatePost( '/1/media/:upload64', postArgs, callback );

        };

        reader.readAsDataURL( file );
    }

    /**
     *  Called when the file upload box has changed
     *
     *  @param  e           {Object}    DOM event with files
     *  @param  callback    {Function}  Of the form fn(err)
     */

    function onUploadChanged( e, callback ) {

        var
            label = singleImageLabel,
            currImg = findImageByLabel( label ),
            fileSizeExceeds = Y.doccirrus.utils.notifyAboutFileSizeExceeds( e.target.files );

        if( fileSizeExceeds ) {
            if( Y.Lang.isFunction( callback ) ) {
                callback( 'file size exceeded' );
            }
            return;
        }

        function onImageUploaded( err, newImageObj ) {

            if( err ) {
                Y.log( 'Error uploading image ' + label + ': ' + err, 'warn', NAME );
                clearThrobber( );
                callback( err );
                return;
            }

            newImageObj = newImageObj.data ? newImageObj.data : newImageObj;
            Y.log( 'Replaced image ' + newImageObj._id + ' with label ' + label );

            if( currImg.hasOwnProperty( '_id' ) ) {
                //  we need to delete the previous image
                deleteImage( currImg._id, function( err, status ) {

                    if( err ) {
                        Y.log( 'Error deleting image ' + currImg._id + ': ' + err, 'warn', NAME );
                        clearThrobber( );
                        callback( err );
                        return;
                    }

                    Y.log('Deleted previous item, reloading images: ' + status, 'info', NAME);
                    reloadImages();

                } );

            } else {
                Y.log('No previous _id, reloading images', 'info', NAME);
                reloadImages();
            }
        }

        setThrobber( );

        uploadImage( e, onImageUploaded );

    }

    /**
     *  Delete an image on the server
     *
     *  @param  imgId       {string}    Database id of the image to be deleted
     *  @param  callback    {function}  Of the form fn(err, status)
     */

    function deleteImage(imgId, callback) {
        Y.log('Deleting: ' + imgId, 'info', NAME);

        Y.doccirrus.comctl.privatePost( '/1/media/:remove', { 'id': imgId }, callback );
    }

    /**
     *  Find and return a media attachment given an image
     *  @param  label   {string}    The label field of an attached media item
     *  @return         {object}    Media metadata, or empty object if not found
     */

    function findImageByLabel(label) {
        var i;

        Y.log('Finding attachment with label: ' + label, 'debug', NAME);

        for (i = 0; i < myData.length; i++) {
            if (myData[i].hasOwnProperty('label')) {
                if (myData[i].label === label) {
                    return myData[i];
                }
            }
        }

        Y.log('No media attachment with label: ' + label, 'debug', NAME);
        return { 'source': '/img/not-found.png' };
    }


    /**
     *  Fired when files (hopefullu) are dropped into divb64upload
     *  @param  evt  {object}   Drop event
     */

    function onDrop( evt ) {
        Y.log( 'DROP! ' + singleImageLabel, 'debug', NAME );

        evt.stopPropagation();
        evt.preventDefault();

        var
            dt = evt.dataTransfer, //  get drag/drop data
            newEvt = { //  dummy event for onUploadChanged
                'target': {
                    'files': dt.files
                }
            },
            files = newEvt.target.files, //  array of file objects
            i; //  loop counter

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

    //  Boilerplate to prevent browser default action on drop

    function onDragEnter( evt ) {
        //showStatus('dragEnter: ' + JSON.stringify(evt, undefined, 2));
        //$('#divDragDrop').css('background-color', 'rgba(100,255,255,0.3);');
        evt.stopPropagation();
        evt.preventDefault();
    }

    function onDragOver( evt ) {
        //showStatus('dragOver: ' + JSON.stringify(evt, undefined, 2));
        //$('#divDragDrop').css('background-color', 'rgba(100,255,255,0.3);');
        evt.stopPropagation();
        evt.preventDefault();
    }

    function onDragExit( evt ) {
        //showStatus('dragExit: ' + JSON.stringify(evt, undefined, 2));
        //$('#divDragDrop').css('background-color', 'rgba(100,255,100,0.3);');
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     *  Update thumbnails and file upload boxes from myData
     */

    function updateDisplay() {
        var
            currImg,
            pvtUrl;


        currImg = findImageByLabel(singleImageLabel);

        //  the original disabled the button, so leaving the option
        jq.btnReset.hide();

        if (currImg.hasOwnProperty('_id')) {

            //  logo image is set
            pvtUrl = Y.doccirrus.media.getMediaUrl( currImg, '130x140' );
            jq.txtFilename.val( currImg.name );
            jq.imgPreview.attr( 'src', Y.doccirrus.infras.getPrivateURL( pvtUrl ) );
            //$( '#reset' + idx + 'btn' ).removeAttr( 'disabled' );
            jq.btnReset.show();

        } else {

            //  this image is not set
            jq.txtFilename.val( '' );
            jq.imgPreview.attr( 'src', defaultImage );

        }

    }

    /**
     *  Called back when set of media items has been returned from server
     *
     *  @param  data    {String}     Array of media objects, might be stringified
     */

    function onImageSetLoaded(data) {

        if ('string' === typeof data) { myData = JSON.parse(data); }
        if ('object' === typeof data) { myData = data; }

        //  new style API
        myData = myData.data ? myData.data : myData;

        if( Y.config.debug ) {
            Y.log('Loaded image data: ' + JSON.stringify(myData), 'debug', NAME);
        }

        updateDisplay();
    }

    /**
     *  Load set of attached media items via ajax
     */

    function reloadImages() {

        $.ajax({
            url: Y.doccirrus.infras.getPrivateURL( '/1/media/:list'),
            data: { 'collection': ownerCollection, 'id': ownerId },
            type: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: onImageSetLoaded,
            error: onImageSetError
        });
    }

    function onImageSetError(err ) {
        Y.log( 'Could not load attached images: ' + err, 'warn', NAME );
        $( '#myModal' ).modal( 'hide' );
        location.reload();
    }

    function deleteCurrentLogo() {
        var currImg = findImageByLabel(singleImageLabel);

        if (!currImg.hasOwnProperty('_id')) { return; }
        deleteImage(currImg._id, onLogoDeleted);
    }

    function onLogoDeleted(err) {
        if (err) {
            Y.log('Error deleting logo: ' + err, 'warn', NAME);
            return;
        }
        reloadImages();
    }

    // setup event handlers of this jade snippet
    function setupHandlers( node ) {

        //  keep these for later
        myNode = node;
        ownerCollection = node.dcimages.ownerCollection;
        ownerId = node.dcimages.ownerId;

        //  pre-cache jquery selectors

        jq = {
            hdnOwnerCollection: $('#hdnOwnerCollection'),
            hdnOwnerId: $('#hdnOwnerId'),
            frmLogoImg: $('#frmLogoImg'),
            ifSaveTarget: $('#ifSaveTarget'),
            btnReset: $('#resetbtn'),
            btnSubmit: $('#btnSubmit'),
            fileUploadBox: $('#fileUploadBox'),
            fileUploadLabel: $('#fileUploadLabel'),
            legacyFile: $('#file'),
            imgPreview: $('#logopreview'),
            txtFilename: $('#filename')
        };

        //  set hidden form fields, used to attach the upload correctly
        jq.hdnOwnerCollection.val(ownerCollection);
        jq.hdnOwnerId.val(ownerId);

        // legacy browsers only, under consideration for removal
        jq.frmLogoImg.attr('action', Y.doccirrus.infras.getPrivateURL( '/1/media/:upload' ));

        Y.log('Setting up handlers: ' + ownerCollection + '::' + ownerId, 'debug', NAME);

        if (false === useAjax) {
            jq.btnSubmit.show();
        }

        jq.frmLogoImg.off('submit').on( 'submit', function ( ) {
            Y.log('Form submission', 'info', NAME);
            deleteCurrentLogo();

            jq.ifSaveTarget.off('load').on('load', function(){
                Y.log('iframe loaded', 'info', NAME);
                reloadImages();
            });

        });

        jq.btnReset.off('click').on('click', function() {
            deleteCurrentLogo();
        } );

        jq.fileUploadBox.off('change').on('change', function( e ) {
            onUploadChanged( e );
        } );

        jq.legacyFile.off('change').on('change', function( e ) {
            onUploadChanged( e );
        } );

        if (true === useAjax) {
            jq.btnSubmit.hide();
        }

        // dropdiv is actually an image @now
        var dropdiv = document.getElementById( 'logoDiv' ); //  jQuery events didn't work for me here;

        dropdiv.addEventListener( "dragenter", function( evt ) {
            onDragEnter( evt );
        }, false );

        dropdiv.addEventListener( "dragexit", function( evt ) {
            onDragExit( evt );
        }, false );

        dropdiv.addEventListener( "dragover", function( evt ) {
            onDragOver( evt );
        }, false );

        dropdiv.addEventListener( "drop", function( evt ) {
            onDrop( evt );
            return false;
        }, false );

        reloadImages();
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
            setupHandlers( node );

            function WrLogoEdit() {
                var
                    self = this;

                self.lblPreviewI18n = i18n('MediaMojit.main.LBL_PREVIEW');
                self.uLogoSizeI18n = i18n('MediaMojit.main.U_LOGO_SIZE');
                self.lblLogoSizeI18n = i18n('MediaMojit.main.LBL_LOGO_SIZE');
                self.uLogoFormatI18n = i18n('MediaMojit.main.U_LOGO_FORMAT');
                self.lblLogoFormatI18n = i18n('MediaMojit.main.LBL_LOGO_FORMAT');
                self.btnResetI18n = i18n('MediaMojit.main.BTN_RESET');
                self.btnSaveI18n = i18n('MediaMojit.main.BTN_SAVE');

            }

            ko.applyBindings( new WrLogoEdit(), document.querySelector( '#myModal' ) );
        },
        deregisterNode: function( /* node */ ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();

            Y.log('Unloading edit carousel modal', 'debug', NAME);
        }
    };
}