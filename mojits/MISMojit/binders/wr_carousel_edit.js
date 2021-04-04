// Do not define anything here --
//    the first code in the binderp
// MUST be the following line:

/*global $, FileReader, ko */
/*exported _fn */

function _fn( Y, NAME ) {
    'use strict';

    var
        numImages = 5, //  number of images in carousel [int]
        myNode, //  passed by constructor [object]
        myData = [], //  set of media items loaded from media mojit [array:object]
        ownerCollection, //  always 'intime' [string]
        ownerId, //  database id of owner object [string]

        //  Detect legacy browsers for fallback mode
        //  Uncomment below to force legacy or HTML5 behavior in testing
        useAjax = (typeof FileReader !== "undefined"),
        //useAjax = false,
        //useAjax = true,

        throbberImage = Y.doccirrus.infras.getPrivateURL( '/static/FormEditorMojit/assets/images/throbber.gif' ),
        defaultImage = Y.doccirrus.infras.getPrivateURL( '/img/not-found.png' );

    /**
     *  Show throbber image in thumbnail spot
     *
     *  @param  idx     {number}    Control set to mark busy
     */

    function setThrobber( idx ) {
        $( '#thumb' + idx ).attr( 'src', throbberImage );
    }

    /**
     *  Remove throbber and restore thumbnail after change complete
     *
     *  @param  idx     {number}    Control set to mark busy
     */

    function clearThrobber( idx ) {
        var currImg = findImageByLabel( 'carousel' + idx );

        if( currImg.hasOwnProperty( '_id' ) ) {
            $( '#thumb' + idx ).attr( 'src', currImg.source + '&w=100&h=100' );
        } else {
            $( '#thumb' + idx ).attr( 'src', defaultImage );
        }

    }

    /**
     *  Upload a file to the server via Ajax
     *
     *  @param e            {Object}    An event which may have attached file(s)
     *  @param idx          {Number}    Index of control set this was uploaded from
     *  @param callback     {Function}  of the form fn(err, newImageId)
     */

    function uploadImage( e, idx, callback ) {

        if( e.target.files && e.target.files[0] ) {
            Y.log( 'User dropped files.', 'info', NAME );
        } else {
            Y.log( 'Files not dropped or not available.', 'info', NAME );
            return;
        }

        var
            reader = new FileReader(),
            label = 'carousel' + idx,
            file = e.target.files[0];

        Y.log( 'Uploading dropped file: ' + file.name, 'info', NAME );

        // called when file has been read into base64 string

        reader.onload = function( file64evt ) {

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
     *  Delete an image on the server
     *
     *  @param  imgId       {string}    Database id of the image to be deleted
     *  @param  callback    {function}  Of the form fn(err, status)
     */

    function deleteImage( imgId, callback ) {
        Y.log( 'Deleting: ' + imgId, 'info', NAME );
        Y.doccirrus.comctl.privatePost( '/1/media/:remove', { 'id': imgId }, callback );
    }

    /**
     *  Called when one of the file upload boxes has changed
     *
     *  @param  idx         {Number}    Index of the file box in question
     *  @param  e           {Object}    DOM event with files
     *  @param callback    {Function}  Of the form fn(err)
     */

    function onUploadChanged( idx, e, callback ) {

        var
            label = 'carousel' + idx,
            currImg = findImageByLabel( label ),
            fileSizeExceeds = Y.doccirrus.utils.notifyAboutFileSizeExceeds( e.target.files );

        if( fileSizeExceeds ) {
            callback( 'file size exceeded' );
            return;
        }

        setThrobber( idx );

        uploadImage( e, idx, function( err, newImageObj ) {

            if( err ) {
                Y.log( 'Error uploading image ' + label + ': ' + err, 'warn', NAME );
                clearThrobber( idx );
                callback( err );
                return;
            }

            newImageObj = newImageObj.data ? newImageObj.data : newImageObj;
            
            Y.log( 'Replaced image ' + newImageObj._id + ' with label ' + label );

            if( currImg.hasOwnProperty( '_id' ) ) {
                //  we need to delete the previous image
                deleteImage( currImg._id, function( err /*, status */ ) {

                    if( err ) {
                        Y.log( 'Error deleting image ' + currImg._id + ': ' + err, 'warn', NAME );
                        clearThrobber( idx );
                        callback( err );
                        return;
                    }

                    Y.log('Deleted previous item, reloading images');
                    reloadImages();

                } );

            } else {
                Y.log('No previous _id, reloading images');
                reloadImages();
            }
        } );

    }

    /**
     *  Reset (ie, delete) an attached media item
     *  @param  idx {number}    Index of the reset button which was clicked
     */

    function onResetClicked( idx ) {
        var
            currImg = findImageByLabel( 'carousel' + idx );

        if( !currImg.hasOwnProperty( '_id' ) ) {
            Y.log( 'Could not reset image: ' + idx, 'warn', NAME );
            return;
        } //  nothing to do

        setThrobber( idx );
        deleteImage( currImg._id, function( err /*, status */ ) {
            clearThrobber( idx );

            if( err ) {
                Y.log( 'Could not reset image: ' + err, 'warn', NAME );
                return;
            }

            $( '#reset' + idx + 'btn' ).attr( 'disabled', 'disabled' );
            reloadImages();
        } );
    }

    //  LEGACY - previous upload callback

    //  function handleSuccess( /* data, text */ ) {
    //      $( '#myModal' ).modal( 'hide' );
    //      location.reload();
    //  }

    /**
     *  Find and return a media attachment given an image
     *  @param  label   {string}    The label field of an attached media item
     *  @return         {object}    Media metadata, or empty object if not found
     */

    function findImageByLabel( label ) {
        var i;

        Y.log( 'Finding attachment with label: ' + label );

        for( i = 0; i < myData.length; i++ ) {
            if( myData[i].hasOwnProperty( 'label' ) ) {
                if( myData[i].label === label ) {
                    return myData[i];
                }
            }
        }

        Y.log( 'No media attachment with label: ' + label, 'debug', NAME );
        return { 'source': '/img/not-found.png' };
    }

    /**
     *  Update thumbnails and file upload boxes from myData
     */

    function updateDisplay() {
        var
            idx,
            currImg,
            pvtUrl, //  URL of thumbnail on VPRC
            jqc = {}; //  jQuery selector cache

        for( idx = 0; idx < numImages; idx++ ) {

            currImg = findImageByLabel( 'carousel' + idx );
            Y.log( 'Finding image: ' + idx, 'debug', NAME );

            //  the original disabled the button, so leaving the option
            //$('#reset' + idx + 'btn').attr( 'disabled', 'disabled' );
            jqc.btnReset = $( '#reset' + idx + 'btn' );
            jqc.divFilename = $( '#filename' + idx );
            jqc.imgThumb = $( '#thumb' + idx );

            jqc.btnReset.hide();

            if( currImg.hasOwnProperty( '_id' ) ) {

                //  this image is set
                pvtUrl = Y.doccirrus.media.getMediaUrl( currImg, '100x100' );
                jqc.divFilename.val( currImg.name );
                jqc.imgThumb.attr( 'src', Y.doccirrus.infras.getPrivateURL( pvtUrl ) );
                jqc.btnReset.show();

            } else {

                //  this image is not set
                //$( '#filename0' ).val( '' );
                jqc.divFilename.val( '' );
                jqc.imgThumb.attr( 'src', defaultImage );

            }

        }

    }

    /**
     *  Called back when set of media items has been returned from server
     *
     *  @param  data    {String}     Array of media objects
     */

    function onImageSetLoaded( data /*, text */ ) {
        Y.log( 'Loaded image data...', 'info', NAME );

        if( 'string' === typeof data ) {
            myData = JSON.parse( data );
        }
        if( 'object' === typeof data ) {
            myData = data;
        }

        //  new style API
        myData = myData.data ? myData.data : myData;

        updateDisplay();
    }

    /**
     *  Load set of attached media items via ajax
     */

    function reloadImages() {

        $.ajax( {
            url: Y.doccirrus.infras.getPrivateURL( '/1/media/:list' ),
            data: { 'collection': ownerCollection, 'id': ownerId },
            type: 'GET',
            xhrFields: {
                withCredentials: true
            },
            success: onImageSetLoaded,
            error: onImageSetError
        } );
    }

    /**
     *  Called on failure of reloadImages()
     *
     *  TODO: bring this up to date with current REST error reporting
     *
     *  @param err
     */

    function onImageSetError( err ) {
        Y.log( 'Could not load image set: ' + err, 'warn', NAME );
        $( '#myModal' ).modal( 'hide' );
    }

    /**
     *  Fired when files (hopefullu) are dropped into divb64upload
     *  @param  evt     {Object}    Drop event
     *  @param  idx     {Number}    Index of the carousel spot
     */

    function onDrop( evt, idx ) {
        Y.log( 'DROP! Attempting to attach dropped files in place ' + idx, 'debug', NAME );

        var
            dt = evt.dataTransfer, //  get drag/drop data
            newEvt = { //  dummy event for onUploadChanged
                'target': {
                    'files': dt.files
                }
            },
            files = dt.files, //  array of file objects
            i; //  loop counter


        for( i = 0; i < files.length; i++ ) {
            Y.log( 'file ' + i + ': ' + JSON.stringify( files[i] ), 'debug', NAME );
        }

        if( files.length > 0 ) {
            onUploadChanged( idx, newEvt, function( err ) {
                if( err ) {
                    Y.log( 'Error attaching dropped files: ' + err, 'warn', NAME );
                }
            });
        }

        //  don't replace the page with the dropped files
        evt.stopPropagation();
        evt.preventDefault();
    }

    //  Boilerplate to prevent browser default action on drop
    //  Prevents replacement of page with dropped file

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
     *  Set event handlers for one of the image control sets, called by setupHandlers
     *  @param idx  {number}    Index of control set, 0-5
     */

    function setIndexedHandlers( idx ) {

        // dropdiv is actually an image @now
        var dropdiv = document.getElementById( 'thumb' ), //  jQuery events didn't work for me here;
            upload = document.getElementById( 'upload' ),
            filename = document.getElementById( 'filename' ),
            resetbtn = document.getElementById( 'resetbtn' );

        dropdiv.setAttribute('id', 'thumb' + idx);
        upload.setAttribute('id', 'upload' + idx);
        filename.setAttribute('id', 'filename' + idx);
        filename.setAttribute('name', 'filename' + idx);
        resetbtn.setAttribute('id', 'reset' + idx + 'btn');

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
            onDrop( evt, idx );
            return false;
        }, false );

        $( '#upload' + idx ).change( function( e ) {
            onUploadChanged( idx, e , function (err){
                if (err) {
                    Y.log('Error uploading from file box: ' + err.toString(), 'warn', NAME);
                }
            });
        } );

        $( '#reset' + idx + 'btn' ).click( function() {
            Y.log( 'Reset button clicked: ' + idx, 'debug', NAME );
            onResetClicked( idx );
        } );
    }

    /*
     *  Setup event handlers of this jade snippet
     *
     *  @param   node    {Object}    This is a Y.node object passed by waitingroom.js
     */

    function setupHandlers( node ) {

        var
            i, //  loop counter [int]
            jqSaveBtn = $( '#savebtn' );

        //  keep these for later

        myNode = node;
        ownerCollection = node.dcimages.ownerCollection;
        ownerId = node.dcimages.ownerId;

        Y.log( 'Setting up handlers: ' + ownerCollection + '::' + ownerId, 'debug', NAME );

        //  attach events to file boxes

        for( i = 0; i < numImages; i++ ) {
            setIndexedHandlers( i );
        }

        jqSaveBtn.click( function() {
            //  do nothing in this version, close modal?
            //alert('Save button clicked');
        } );

        if( !useAjax ) {
            jqSaveBtn.show.click( function() {
                //  do nothing in this version, close modal?
                //  alert( 'Save button clicked' );
            } );
        }

        //  request details of the set of attached files from server

        reloadImages( myNode );
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
            throbberImage = Y.doccirrus.infras.getPrivateURL( '/static/FormEditorMojit/assets/images/throbber.gif' );
            defaultImage = Y.doccirrus.infras.getPrivateURL( '/img/not-found.png' );

            setupHandlers( node );

            function WrCarouselEdit() {
                var
                    self = this;

                self.titleEditImagesI18n = i18n('MediaMojit.main.TITLE_EDIT_IMAGES');
                self.lblUploadInstructionsI18n = i18n('MediaMojit.main.LBL_UPLOAD_INSTRUCTION');
                self.btnResetI18n = i18n('MediaMojit.main.BTN_RESET');
                self.btnSaveI18n = i18n('MediaMojit.main.BTN_SAVE');
            }

            ko.applyBindings( new WrCarouselEdit(), document.querySelector( '#myModal' ) );
        },

        deregisterNode: function( /* node */ ) {
            //  SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //  Currently commented out because this causesweirdness on reload
            //node.destroy();

            Y.log('Unloading carousel edit form', 'debug', NAME);
        }
    };
}