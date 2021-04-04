/*global YUI, async */
/*jshint latedef:false */
'use strict';

YUI.add( 'dcutils-dynamsoft', function( Y, NAME ) {

        Y.namespace( 'doccirrus.utils.dynamsoft' );
        var
            ns = Y.doccirrus.utils.dynamsoft;
        /**
         * provides scan capabilities via dialog
         * subscribe to event 'select' to receive the selected scans
         * subscribe to event 'cancel' to receive cancellation
         * @example
         *
         * @method showScanDialog
         * @param {Object} [options]
         * @param {Object} [options.windowConfig=default] a config object which overwrites defaults for the window
         * @param {Object} [options.buttonSelectConfig=default] a config object which overwrites defaults for the select button
         * @param {Object} [options.buttonSPDFConfig=default] a config object which overwrites defaults for the select button
         * @param {Object} [options.buttonCancelConfig=default] a config object which overwrites defaults for the cancel button
         * @param {Object} [options.buttonScanConfig=default] a config object which overwrites defaults for the scan button
         * @return {EventTarget}
         */
        ns.showScanDialog = function( options ) {
            options = options || {};
            var
                currentDocType = 'OTHER',
                currentDocTitle = 'Scan',
                eventTarget = new Y.EventTarget(),
                tempPages = [],
                imgType = {//webTwain internal values
                    bmp: 0,
                    jpg: 1,
                    tif: 2,
                    png: 3,
                    pdf: 4
                };

            //Y.log('Creating scan modal with options: ' + JSON.stringify(options), 'info', NAME);

            eventTarget.publish( 'cancel', {preventable: false} );
            //eventTarget.publish( 'select', {preventable: false} ); - DEPRECATED, MOJ-6005
            eventTarget.publish( 'doctypechange', {preventable: false} );
            eventTarget.publish( 'doctitlechange', {preventable: false} );
            eventTarget.publish( 'mediaadded64', {preventable: false} );

            Y.use( [
                'doccirrus',
                'DCWindow'
            ], function showScanDialogUse() {

                var
                    i18n = Y.doccirrus.i18n,
                    bodyContent = Y.Node.create( '<iframe src="/dynamsoftIframe" style="height: 100%; width: 100%; border:0 none; overflow: hidden" scrolling="no" frameborder="0"></iframe>' ),
                    bodyContentDomNode = bodyContent.getDOMNode(),
                    windowConfig = options.windowConfig || {},
                    dialog,
                    dialogButtonSelectName = 'SELECT',
                    dialogButtonPDFName = 'PDF',
                    dialogButtonScanName = 'SCAN';

                /** build the dialog */
                dialog = new Y.doccirrus.DCWindow( Y.aggregate( {
                    className: 'DCWindow-showScanDialog',
                    bodyContent: bodyContent,
                    title: i18n( 'dcutils-dynamsoft.showScanDialog.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    height: 525,
                    minHeight: 525,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    resizeable: false,
                    maximizable: false,
                    fitOnViewPortResize: !Y.UA.touchEnabled, // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.merge( Y.doccirrus.DCWindow.getButton( 'CANCEL' ), options.buttonCancelConfig ),
                            Y.merge( Y.doccirrus.DCWindow.getButton( dialogButtonSelectName, {
                                name: dialogButtonSelectName,
                                action: actionSelect,
                                label: i18n( 'dcutils-dynamsoft.showScanDialog.buttons.images.label' ),
                                disabled: true
                            } ), options.buttonSelectConfig ),
                            Y.merge( Y.doccirrus.DCWindow.getButton( dialogButtonPDFName, {
                                name: dialogButtonPDFName,
                                action: actionPDF,
                                label: 'PDF',
                                disabled: true
                            } ), options.buttonPDFConfig ),
                            Y.merge( {
                                isDefault: true,
                                name: dialogButtonScanName,
                                label: i18n( 'dcutils-dynamsoft.showScanDialog.buttons.scan.label' ),
                                action: actionScan,
                                disabled: true
                            }, options.buttonScanConfig )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            // also captures cancel for e.g.: ESC
                            if( !yEvent.newVal ) {

                                setTimeout( function() { // delay for letting others fire first
                                    eventTarget.fire( 'cancel' );
                                    eventTarget.detachAll();

                                }, 10 );
                            }
                        }
                    }
                }, windowConfig, true ) );

                /**
                 *  Make a dataURI (base64 encoded file) from a raw blob pulled from Dynamsoft Web TWAIN
                 *
                 *  This relates to MOJ-6005 - Web TWAIN has its own method to produce a base64 encoded file,
                 *  but it is missing or broken on OS X
                 *
                 *  @param  index       {Number}    Index of (selected) scan
                 *  @param  callback    {Function}  Of the form fn(err, dataURI)
                 */

                function convertBlobToDataURI( index, callback ) {

                    var iframeBinder = bodyContentDomNode.getBinder();

                    iframeBinder.DWObject.SelectedImagesCount = 1;
                    iframeBinder.DWObject.SetSelectedImageIndex( 0, index );
                    iframeBinder.DWObject.GetSelectedImagesSize( imgType.jpg );

                    //  SUP-5822, convert 1-bit B7W images to greyscale, see:
                    //  https://developer.dynamsoft.com/dwt/kb/2130
                    if ( iframeBinder.DWObject.GetImageBitDepth( iframeBinder.DWObject.CurrentImageIndexInBuffer ) === 1 ) {
                        iframeBinder.DWObject.ConvertToGrayScale( iframeBinder.DWObject.CurrentImageIndexInBuffer );
                    }
                    
                    //  SUP-5822, replace deprecated call to SaveSelectedImagesToBase64Binary, see:
                    //  https://developer.dynamsoft.com/dwt/converttobase64
                    iframeBinder.DWObject.ConvertToBase64(
                        [ index ],
                        imgType.jpg,
                        onBinaryLoadSuccess,
                        onBinaryLoadFailure
                    );

                    function onBinaryLoadSuccess( b64Result ) {
                        var
                            dataLength = b64Result.getLength(),
                            imgData = b64Result.getData(0, dataLength );

                        if ( !imgData || imgData.length < 4 ) { //length check to avoid broken responses like "0;"
                            Y.log( 'Invalid image data returned by WebTWAIN: ' + JSON.stringify( imgData ), 'warn', NAME );
                            return onBinaryLoadFailure( 'No image data returned by WebTWAIN' );
                        }

                        imgData = 'data:image/jpeg;base64,' + imgData;
                        callback( null, imgData );
                    }

                    function onBinaryLoadFailure( err ) {
                        Y.log( 'CALLBACK: Convert to binary failure: ' + JSON.stringify( err ), 'warn', NAME );
                        Y.log( 'DWObject: ' + JSON.stringify( iframeBinder.DWObject ), 'warn', NAME );
                        Y.log( 'DWObject.ErrorCode: ' + JSON.stringify( iframeBinder.DWObject.ErrorCode ), 'warn', NAME );
                        Y.log( 'DWObject.ErrorString: ' + JSON.stringify( iframeBinder.DWObject.ErrorString ), 'warn', NAME );
                        callback( err );
                    }
                }

                /**
                 *  On error saving to server
                 */

                function showUploadErrorModal( err ) {
                    Y.log( 'Error uploading scanned docudment: ' + JSON.stringify( err ), 'warn', NAME );
                    var ERR_uploadFailure =  i18n( 'dcutils-dynamsoft.showScanDialog.messages.uploadFailure' );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: ERR_uploadFailure + '<br/><br/><pre>' + JSON.stringify( err ) + '</pre>',
                        window: {
                            width: 'medium'
                        }
                    } );
                }

                /**
                 *  Upload a single scan as a base64 encoded JPG image
                 */

                function uploadSingle64JPG( index, itcb )   {

                    function onScanEncoded( err, base64data ) {

                        if ( err ) {
                            Y.log( 'Error converting scan to dataURI: ' + JSON.stringify( err ), 'debug', NAME );
                            itcb( err );
                            return;
                        }

                        /*  REST API:
                         *
                         *      ownerCollection     {String}    Collection of object this media object belongs to
                         *      ownerId             {String}    Database _id of object this media item belongs to
                         *      source              {String}    File in DataURI format
                         *      name                {String}    Title of media object
                         *      fileName            {String}    Original file name
                         *      label               {String}    Assigns media object to some role or group
                         */

                        var
                            postArgs = {
                                'ownerCollection': options.ownerCollection || 'activity',
                                'ownerId': options.ownerId || 'temp',
                                'source': base64data,
                                'name': currentDocTitle + '_' + index + '.jpg',
                                'fileName': currentDocTitle + '_' + index + '.jpg',
                                'label': options.label || 'user',
                                'docType': currentDocType
                            };

                        Y.doccirrus.comctl.privatePost( '/1/media/:upload64', postArgs, onMediaUploaded );
                    }

                    /**
                     *  Added media. load its metadata and raise event for parent
                     *
                     *  @param  err             {Object}
                     *  @param  response        {Object}
                     *  @param  response.data   {Object}    Should be a media object / media-schema.common.js
                     */

                    function onMediaUploaded( err, response ) {

                        if ( err ) {
                            Y.log( 'Error uploading media: ' + JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }
                        
                        var mediaObj = response.data ? response.data : response;
                        Y.log( 'Media uploaded from scanner, new _id is: ' + JSON.stringify( mediaObj._id ), 'info', NAME );

                        eventTarget.fire( 'mediaadded64', mediaObj );

                        itcb( null );

                        /*
                        function onMetadataLoaded( response ) {
                            response = response.data ? response.data : response;
                            response = response[0] ? response[0] : response;
                            eventTarget.fire( 'mediaadded64', response );
                            itcb( null );
                        }

                        function onMetadataFail( err ) {
                            Y.log( 'Could not load metadata of scanned object: ' + JSON.stringify( err ), 'error', NAME );
                            itcb( err );
                        }

                        Y.doccirrus.jsonrpc.api.media
                            .read( { query: { '_id': mediaId } } )
                            .done( onMetadataLoaded )
                            .fail( onMetadataFail );
                        */
                    }

                    //console.log( 'sending TWAIN data: ' + index + ' mime: image/jpeg' );

                    //  Here we make our own base64 version of the selected image from the buffer, doe to
                    //  missing base64 functionality on Mac version of Web TWAIN

                    convertBlobToDataURI( index, onScanEncoded );
                }
                
                function uploadSingleTemp64( index, itcb ) {

                    function onScanEncoded( err, base64data ) {

                        if ( err ) {
                            Y.log( 'Error converting scan to dataURI: ' + JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }

                        var postArgs = { 'base64Image': base64data };
                        Y.doccirrus.comctl.privatePost( '/1/media/:tempstore', postArgs, onTempStore );
                    }

                    function onTempStore( err, tempFile ) {
                        if ( err ) {
                            Y.log( 'Error uploading media: ' + JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }

                        tempFile = tempFile.data ? tempFile.data : tempFile;
                        tempFile = tempFile.tempFile ? tempFile.tempFile + '': tempFile;

                        tempPages.push( tempFile );

                        Y.log( 'Media uploaded from scanner to temp directory: ' + JSON.stringify( tempFile ), 'info', NAME );
                        itcb( null );
                    }

                    //  Here we make our own base64 version of the selected image from the buffer, doe to
                    //  missing base64 functionality on Mac version of Web TWAIN

                    convertBlobToDataURI( index, onScanEncoded );
                }

                /** dialog button actions */

                /**
                 * button for jpg upload
                 * @param evt
                 */

                function actionSelect( evt ) {
                    var
                        iframeBinder = bodyContentDomNode.getBinder(),
                        selectedIndices = iframeBinder.getSelectedIndices();

                    function onAllUploaded64( err ) {
                        if ( err ) {
                            showUploadErrorModal( err );
                        } else {
                            Y.log( 'All  scanned images uploaded.', 'debug', NAME );
                        }

                        evt.target.button.disable();
                        dialog.close( evt );
                        eventTarget.detachAll();
                    }

                    if (0 === selectedIndices.length) {
                        //  nothing to do, no scans selected
                        Y.log( 'No scanned pages selected, nothing to do.', 'debug', NAME );
                        return;
                    }

                    async.eachSeries( selectedIndices, uploadSingle64JPG, onAllUploaded64 );
                }

                /**
                 * button for pdf upload
                 *  @param evt
                 */

                function actionPDF( evt ) {

                    var
                        iframeBinder = bodyContentDomNode.getBinder(),
                        selectedIndices = iframeBinder.getSelectedIndices();

                    function onAllUploadedTemp64( err ) {
                        if ( err ) {
                            showUploadErrorModal( err );
                        } else {
                            Y.log( 'All temp images uploaded.', 'debug', NAME );
                        }

                        var
                            postArgs = {
                                'saveTo': 'db',
                                'imageset': tempPages,
                                'ownerCollection': options.ownerCollection || 'activity',
                                'ownerId': options.ownerId || 'temp',
                                'label': options.label || 'user',
                                'name': currentDocTitle + '.pdf',
                                'docType': currentDocType
                            };

                        Y.doccirrus.comctl.privatePost( '/1/media/:compilepdf', postArgs, onPDFCompiled );
                    }

                    function onPDFCompiled( err, mediaId ) {

                        tempPages = [];

                        if ( err ) {
                            //  TODO: translateme
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'PDF konnte nicht erzeugt werden:' +
                                         '<br/><br/><pre>' + JSON.stringify( err ) + '</pre>',
                                window: {
                                    width: 'medium'
                                }
                            } );
                            return;
                        }

                        mediaId = mediaId.data ? mediaId.data : mediaId;
                        mediaId = ( 'object' === typeof mediaId && mediaId[0] ) ? mediaId[0] + '' : mediaId;

                        function onMetadataLoaded( response ) {
                            response = response.data ? response.data : response;
                            response = response[0] ? response[0] : response;
                            eventTarget.fire( 'mediaadded64', response );

                            evt.target.button.disable();
                            dialog.close( evt );
                            eventTarget.detachAll();
                        }

                        function onMetadataFail( err ) {
                            Y.log( 'Could not load metadata of scanned object: ' + JSON.stringify( err ), 'error', NAME );
                        }

                        Y.doccirrus.jsonrpc.api.media
                            .read( { query: { '_id': mediaId } } )
                            .done( onMetadataLoaded )
                            .fail( onMetadataFail );
                    }


                    if (0 === selectedIndices.length) {
                        //  nothing to do, no scans selected
                        return;
                    }

                    tempPages = [];

                    async.eachSeries( selectedIndices, uploadSingleTemp64, onAllUploadedTemp64 );

                }

                /**
                 * Performs the scan action
                 * @/param e
                 */
                function actionScan( /*e*/ ) {

                    var
                        iframeBinder = bodyContentDomNode.getBinder();

                    iframeBinder.scan();

                }

                // wait for the iframe to load
                bodyContent.on( 'load', function() {
                    var
                        iframeBinder = bodyContentDomNode.getBinder();

                    /** Subscribe to events of iframe functionality */

                    iframeBinder.events.on( 'twainReady', function( facade, data ) {

                        if( data.sourceNames.length ) {
                            //dialog.getButton( dialogButtonSelectName ).button.enable();
                            dialog.getButton( dialogButtonScanName ).button.enable();
                        }

                    } );

                    iframeBinder.events.on( 'twainNotFound', function() {
                        dialog.getButton( dialogButtonSelectName ).button.disable();
                        dialog.getButton( dialogButtonScanName ).button.disable();
                    } );

                    iframeBinder.events.on( 'twainPreExecute', function() {
                        //dialog.getButton( dialogButtonSelectName ).button.disable();
                        dialog.getButton( dialogButtonScanName ).button.disable();
                    } );

                    iframeBinder.events.on( 'twainPostExecute', function(facade, data) {

                        if (data && data.numImages && data.numImages > 0) {
                            dialog.getButton( dialogButtonSelectName ).button.enable();
                            dialog.getButton( dialogButtonPDFName ).button.enable();
                        } else {
                            dialog.getButton( dialogButtonSelectName ).button.disable();
                            dialog.getButton( dialogButtonPDFName ).button.disable();
                        }

                        dialog.getButton( dialogButtonScanName ).button.enable();
                    } );

                    iframeBinder.events.on( 'twainDocTypeChange', function(facade, data) {
                        //  pass up to parent
                        currentDocType = data.type ? data.type : data;
                        eventTarget.fire( 'doctypechange', facade, data );
                    } );

                    iframeBinder.events.on( 'twainDocTitleChange', function(facade, data) {
                        //  pass up to parent
                        currentDocTitle = data.title ? data.title : data;
                        eventTarget.fire( 'doctitlechange', facade, data );
                    } );

                    /** Initialise iframe functionality */

                    Y.doccirrus.jsonrpc.api.settings.dynamsoft()
                        .then( function( response ) {
                            return response.data || false;
                        } )
                        .done( function( settings ) {
                            iframeBinder.run( settings );
                        } );

                } );

            } );

            return eventTarget;
        };

        ns.osSupported = ['windows', 'macintosh'].indexOf( Y.UA.os ) > -1;

    },
    '0.0.1', {
        requires: [
            'oop',
            'dcutils',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
