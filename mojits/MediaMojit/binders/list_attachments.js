/**
 *  jadeLoaded widget to display, add and manage files attached to some object
 *
 *  Usage:
 *
 *      When instantiating, please add 'passToBinder' property to the YUI node this will be rendered into
 *
 *      node.passToBinder.ownerCollection = 'myschemaname'
 *      node.passToBinder.ownerId = '123_DB_ID_OF_OWNER'
 *
 *      Optionally, one can pass a method wich will be called when the list of media changes
 *
 *      node.passToBinder.onLoad = function(err, MediaMetaData) { ... };
 *
 *  Roadmap:
 *
 *      It may be useful to add further configuration to the display, to set thumbnail sizes, max number of attachments,
 *      colors, etc from the parent.  It may also launch an 'edit_attachments' child view to crop images, change
 *      file names, add captions to images, etc.
 *
 *      Server IO may be outsourced to a YUI module for convenience, to prevent duplication in further client-side
 *      views.
 *
 *      Depending on the types of media which may be attached in future (videos, documents, etc) it may also be
 *      necessary to filter the display to particular types.
 *
 *      Am considering splitting individual rows of the display into a separate jadeLoaded view
 */

// Do not define anything here --
//    the first code in the binder
// MUST be the following line:

/*global $, FileReader, moment, ko */

/*eslint prefer-template:0 strict:0 */
/*exported _fn */

function _fn( Y, NAME ) {
    'use strict';

    //  PRIVATE PROPERTIES

    var
        myNode, //  YUI DOM node view renders into

        callWhenChanged, //  called when media set loaded
        callWhenDeleted, //  called when a media item is deleted
        callWhenAdded, //  called when a media item is created / uploaded
        callWhenDocFieldChanged, //  called when date or type are changed or set

        jqCache,                    //  cached jQuery selectors
        ownerCollection,            //  collection top which owner object belongs
        ownerId,                    //  database ID of object which owns these images
        label = '',                 //  optionally divides the set of attachements into categories
        mediaList,                  //  set of metadata describing attached media items [array:object]

        singular = false, //  if only one attachment with this label is allowed
        linkToDownload = true, //  make thumbnail clickable
        documentFields = false, //  show date and type metadata fields
        showList = true, //  list of attachments should be visible by default

        transitionListener = null, //  we need to listen for an event in new casefile

        //  these may be configurable by parent binder in future

        thumbWidth = 100, //  pixels [int]
        thumbHeight = 100, //  pixels [int]

        allowCategories = [ 'image' ],
        i18nTemplate = Y.doccirrus.i18n,

        scanDocType = 'OTHER',// eslint-disable-line no-unused-vars
        scanDocTitle = 'scan';// eslint-disable-line no-unused-vars
    // DEPRECATED:
    //    scanIdx = 0;
    //    colorDropTarget = 'rgba(100,255,100,0.3)',
    //    colorDropHover = 'rgba(100,255,100,0.3)';

    //  PRIVATE METHODS

    /**
     *  Initialize this view (add event handlers, etc)
     *  Assumes myNode was set when registering with jadeLoader
     */

    function setupView() {

        if (typeof FileReader !== 'undefined') {

            //  modern browser, supports file drag and drop
            $('#divAttachmentsAdd').show();

            jqCache.fileMulti.off('change').on('change', function onChangedMulti() {
                onMultiUploadClick();
                //  value cannot be directly set, see
                //  http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery
                jqCache.fileMulti.replaceWith( jqCache.fileMulti = jqCache.fileMulti.clone( true ) );
            });
            jqCache.btnMulti.off( 'click' ).on( 'click', function onClickedMulti() { onMultiUploadClick(); } );

            jqCache.btnUploadIndirect.off( 'click' ).on( 'click', onUploadIndirect );
            jqCache.btnScan.off( 'click' ).on( 'click', onScanClick );
            jqCache.btnWebcam.off( 'click' ).on( 'click', onWebcamClick );

            //  hidden rather than deleted while this is tested on older browsers
            jqCache.btnMulti.hide();

            if (document.getElementById('divDragDrop')) {
                Y.doccirrus.media.makeDroppable('divDragDrop', onFilesDropped);
            } else {
                Y.log('Not initializing media drop target, not visible', 'debug', NAME);
            }



            jqCache.divAttachmentsLegacy.hide();

        } else {

            //  legacy browser, upload with multipart form targeting a hidden iframe
            jqCache.divAttachmentsLegacy.show();
            jqCache.hdnOwnerCollection.val(myNode.dcimages.ownerCollection);
            jqCache.hdnOwnerId.val(myNode.dcimages.ownerId);
            jqCache.btnReloadManual.on('click', function onReloadClicked() { requestAttachmentsList(); });
        }

    }

    /**
     *  Render attachments list and attach event handlers1
     *  Assumes mediaList is already populated
     */

    function renderAttachmentsList() {

        var
            i,
            html = '',
            dnLinkStart,
            dnLinkEnd,
            item,
            imgUrl,
            shortName,
            descStr;

        Y.log('Loaded data on ' + mediaList.length + ' attached files', 'info', NAME);

        //  inject the html

        for (i = 0; i < mediaList.length; i++) {

            item = mediaList[i];
            item.category = Y.doccirrus.media.types.getCategory( item.mime );

            //  add document fields if not already present
            if (!item.hasOwnProperty('docType') || !item.docType) {
                item.docType = 'FORMIMAGE';
            }
            if (!item.hasOwnProperty('createdOn') || !item.createdOn) {
                item.createdOn = moment().format();
            }

            //Y.log(JSON.stringify(item), 'debug', NAME);

            shortName = item.name;
            if (shortName.length > 10) {
                shortName = shortName.substring(0, 30) + '...';
            }

            dnLinkStart = '';
            dnLinkEnd = '';

            if (true === linkToDownload) {
                dnLinkStart = '<a href="' + item.url + '" target="_media' + item._id + '">';
                dnLinkEnd = '</a>';
            }

            imgUrl = Y.doccirrus.media.getMediaThumbUrl( item, thumbWidth, false );

            descStr = item.mimeType;

            if ( 'image' === item.category ) {
                descStr = mediaList[i].widthPx + 'x' + item.heightPx + ' ' + item.mimeType;
            }

            //  This wants some tidying up - perhaps a separate jadeLoaded view
            html = html +
                '<div id="divManage' + item._id + '">' +
                    '<table ' + 'noborder' + ' style="width: 100%;">' +
                        '<tr>' +
                            '<td ' + 'valign' + '="top" width="65px">' +
                                dnLinkStart +
                                '<img id="image' + item._id + '"' +
                                    'src="' + imgUrl + '" ' +
                                    'border="0" ' +
                                    'style="border-radius: 5px;" ' +
                                    'width="' + thumbWidth + 'px" ' +
                                    'height="' + thumbHeight + 'px" ' +
                                '/>' +
                                dnLinkEnd + '<div style="height: 5px;"></div>' +
                            '</td>' +
                            '<td style="width: 5px;"></td>' +
                            '<td ' + 'valign' + '="top">' +
                                '<div class="form-group">' +
                                    (documentFields ? renderDocHTML(mediaList[i]) : '') +
                                    '<b>' + dnLinkStart + shortName + dnLinkEnd + '</b><br/>' +
                                    '<small>' +
                                        descStr +
                                    '</small>' +
                                '</div>' +
                            '</td>' +
                            '<td ' + 'valign' + '="top" width="20px">' +
                                '<button type="button" class="btn" id="btnDelImg' + item._id + '">' +
                                    '<i class="fa fa-trash-o"></i>' +
                                '</button>' +
                            '</td>' +
                        '</tr>' +
                    '</table>' +
                '</div>';
        }

        //  Hide attachment list if no items

        if (0 === mediaList.length || !showList) {
            jqCache.divAttachmentsList.html('').hide();

            if (showList) {
                jqCache.divNoAttachments.show();
            } else {
                jqCache.divNoAttachments.hide();
            }

            for (i = 0; i < mediaList.length; i++) {
                addDeleteHandler('btnDelImg' + mediaList[i]._id, mediaList[i]._id);
            }

            return;
        }

        //  Hide upload controls if in single attachment mode

        if (true === singular) {
            if (mediaList.length > 0) {
                jqCache.divAttachmentsAdd.hide();
            } else {
                jqCache.divAttachmentsAdd.show();
            }
        }

        //  Otherwise render list and attach event handlers

        jqCache.divNoAttachments.hide();
        jqCache.divAttachmentsList.show().html('<div>' + html + '</div>');

        for (i = 0; i < mediaList.length; i++) {
            addDeleteHandler('btnDelImg' + mediaList[i]._id, mediaList[i]._id);
            if (documentFields) {
                addDocFieldHandlers(mediaList[i]._id);
            }
        }

    }

    /**
     *  Add document form controls to a media item in the list
     *
     *  DEPRECATED, moved to CaseFile attachments view
     *
     *  @param  mediaItem   {object}
     *  @returns            {string}
     */

    function renderDocHTML(mediaItem) {
        var
            userLang = Y.doccirrus.comctl.getUserLang(),
            txtDate = moment(mediaItem.createdOn).format('DD.MM.YYYY'),
            typeEnum = Y.doccirrus.schemas.document.types.DocType_E.list,
            selected,
            typeOpts = '',
            i,
            html;

        if( Y.config.debug ) {
            Y.log('render docHTML for ' + JSON.stringify(mediaItem));
        }

        for (i = 0; i < typeEnum.length; i++) {

            //  types which are programatically generated should not be selected by the user, since user attachments
            //  will lack required metadata

            if (typeEnum[i].val !== 'FORMPDF' && typeEnum[i].val !== 'QUESTIONNAIRE' && typeEnum[i].val !== 'FORMIMAGE') {
                selected = (mediaItem.hasOwnProperty('docType') && mediaItem.docType === typeEnum[i].val) ? ' selected="selected"' : '';
                typeOpts = typeOpts + '<option value="' + typeEnum[i].val + '"' + selected + '>' + typeEnum[i]['-' + userLang] + '</option>';
            }

        }

        html = '' +
            '<div class="form-group" id="divDateGroup' + mediaItem._id + '">' +
            '<table noborder="noborder" width="100%">' +
              '<tr>' +
                '<td><b>Type:&nbsp;</b></td>' +
                '<td><select class="form-control" id="selType' + mediaItem._id + '">' + typeOpts + '</select></td>' +
                '<td><b>&nbsp;Date:&nbsp;</b></td>' +
                '<td><input type="text" class="form-control" id="txtDate' + mediaItem._id + '" value="' + txtDate + '"/></td>' +
              '</tr>' +
            '</table>' +
            '</div><br/><br/>';

        return html;
    }

    //  attach event listeners - this is easier with jQuery but perhaps YUI should be used?

    function addDeleteHandler(domId, imgId) {
        //Y.log('Adding delete button for ' + imgId, 'debug', NAME);
        $('#' + domId).off('click.mediamojit').on('click.mediamojit', function() {
            deleteMediaItem(imgId);
        });
    }

    function addDocFieldHandlers(mediaId) {
        var
            jqDoc = {
                'txtDate': $('#txtDate' + mediaId),
                'selType': $('#selType' + mediaId)
            };

        jqDoc.txtDate.off('keyup.media').on('keyup.media', function onDocDateChange() { onDocFieldChange(mediaId); } );
        jqDoc.selType.off('keyup.media').on('keyup.media', function onDocTypeChange() { onDocFieldChange(mediaId); } );
        jqDoc.selType.off('click.media').on('click.media', function onDocTypeChange() { onDocFieldChange(mediaId); } );
    }

    //  BROWSER AND SERVER IO

    /**
     *  Request the server delete an image
     *
     *  @param  imgId   {string}    Database id of a media item
     */

    function deleteMediaItem(imgId) {
        Y.log('Deleting: ' + imgId, 'info', NAME);

        var jqLine = $('#divManage' + imgId);

        jqLine.html(Y.doccirrus.i18n('MediaMojit.list_attachments.view.LBL_DELETING'));

        function onImageDeleted(err) {

            if ( err ) {
                jqLine.html('Error: ' + err);
                Y.log( 'ERROR: ' + err, 'warn', NAME);
            }

            //  raise event for parent binder
            callWhenDeleted(imgId);

            //  remove from display
            jqLine.hide();

            //  reload the list of attachments
            requestAttachmentsList();
        }

        Y.doccirrus.media.delete(ownerCollection, ownerId, imgId, onImageDeleted);

    }

    /**
     *  Reload the metadata for attached media from server
     */

    function requestAttachmentsList( newMediaId ) {
        Y.log('Loading list of attachments from MediaMojit, new is: ' + newMediaId, 'info', NAME);

        function onMetaLoaded(err, data) {

            if (err) {
                Y.log( 'Could not load attachment metadata: ' + err, 'warn', NAME);
                return;
            }

            //  cache for later
            mediaList = data;

            //  update display
            renderAttachmentsList();

            //  inform any interested parent binder
            callWhenChanged( data );

            if ( newMediaId ) {
                //  raise event for parent binder
                //console.log( 'newMediaid: ', newMediaId );
                //console.log( 'list_attachments.js raise callWhenAdded mediaId: ' + newMediaId + ' data: ' + JSON.stringify(data) );
                callWhenAdded( newMediaId + '', data );
            }
        }

        Y.doccirrus.media.list( ownerCollection, ownerId, label, onMetaLoaded );

    }

    /**
     *  Upload an image file dragged and droppped into the display
     *  @param file
     */

    function readAndUploadDroppedFile(file) {
        Y.log('Uploading dropped file: ' + file.name, 'info', NAME);

        var divId = 'divUp' + Y.doccirrus.media.tempId();

        //  add a line to the test console for this upload
        jqCache.divAttachmentsNote.append('' +
            '<div id="' + divId + '" style="background-color: rgba(255, 255, 100, 0.3);">' +
            Y.doccirrus.i18n('MediaMojit.list_attachments.view.LBL_UPLOADING') + ': ' + file.name +
            '</div>'
        );

        function onFileUploaded(err, newMediaId) {

            var jqNoticeDiv = $('#' + divId), cleanText;

            if (err) {
                Y.log( 'Error uploading file: ' + JSON.stringify( err ), 'warn', NAME );
                if ( err && !err.statusText ) { err = { 'statusText': 'Die Datei konnte nicht erkannt werden.' }; }
                cleanText = err.statusText.replace('500', '').replace( new RegExp( '"', 'g'), '');

                jqNoticeDiv.html( 'Fehler: ' + cleanText + '<br/>Datei: ' + file.name );
                jqNoticeDiv.css( 'background-color', 'rgba(255, 100, 100, 0.3)' );

                //  pop a notice to the user
                Y.doccirrus.DCWindow.notice( {
                    type: 'notice',
                    title: 'Hinweis',
                    message: cleanText + '<br/>Datei: ' + file.name,
                    window: { id: 'list_attachments_upload_fail', width: 'medium' }
                } );

                window.setTimeout(function() { jqNoticeDiv.hide(); }, 2800);
                return;
            }

            Y.log('Attached file as: ' + newMediaId, 'debug', NAME);

            //  update the upload line in the UI
            jqNoticeDiv.html( Y.doccirrus.i18n('MediaMojit.list_attachments.view.LBL_COMPLETE') + ': ' + file.name);
            window.setTimeout(function() { jqNoticeDiv.hide(); }, 800);


            //  reload the list of attachments (will update display)
            Y.doccirrus.media.clearCache(ownerCollection, ownerId);
            requestAttachmentsList(newMediaId);
        }

        Y.log( 'Checking upload of type: ' + file.type, 'debug', NAME );

        var category = Y.doccirrus.media.types.getCategory( file.type );
        if ( -1 === allowCategories.indexOf( category ) && 'unknown' !== category ) {
            Y.log( 'Blocked: file is of category: ' + category + ', allowed categories: ' + JSON.stringify( allowCategories ), 'warn', NAME );
            $( '#' + divId ).html( 'Bitte eine Datei vom Typ wählen:<br/> ' + listAllowedExt().join( ', ' ) );

            //  fade this out after a few seconds
            window.setTimeout( function() { $( '#' + divId ).fadeOut(); }, 5000 );
            return;
        }

        Y.log( 'Recognized file as belonging to category: ' );
        Y.doccirrus.media.uploadFile(ownerCollection, ownerId, label, file, onFileUploaded);
    }

    /**
     *  Make a list of file extensions accepted by this upload control
     */

    function listAllowedExt() {
        var
            fileTypes = Y.doccirrus.media.types.fileTypes,
            allowedExt = [],
            i;

        for ( i = 0; i < fileTypes.length; i++ ) {
            if ( -1 !== allowCategories.indexOf( fileTypes[i].group ) ) {
                allowedExt.push( fileTypes[i].ext );
            }
        }

        return allowedExt;
    }

    //  EVENT HANDLERS

    /**
     *  Fired when files (hopefullu) are dropped into divb64upload
     *
     *  @param  files   {Object}    Array of DOM file objects
     */

    function onFilesDropped(files) {
        var i;
        for (i = 0; i < files.length; i++) {
            readAndUploadDroppedFile(files[i]);
            if (true === singular) { return; }
        }

    }

    /**
     *  Called when upload button is clicked after selecting files from fs dialog
     */

    function onMultiUploadClick() {
        var
            i,
            fileElem = document.getElementById('fileMulti');

        Y.log('User has ' + fileElem.files.length + ' selected files to upload.', 'info', NAME);

        if ((true === singular) && (mediaList.length > 0)) {
            Y.log('no uploading more than one file');
            return;
        }

        for (i = 0 ; i < fileElem.files.length; i++) {
            readAndUploadDroppedFile(fileElem.files[i]);
            if (true === singular) { return; }
        }

    }

    function onDocFieldChange(mediaId) {
        var
            isDirty = false,
            mediaItem,
            docFields = {},
            jqDoc = {
                divDate: $('#divDateGroup' + mediaId),
                txtDate: $('#txtDate' + mediaId),
                selType: $('#selType' + mediaId)
            },
            docDate = moment(jqDoc.txtDate.val(), 'DD.MM.YYYY', true),
            i;

        //  get the current media item
        for (i =0 ; i < mediaList.length; i++) {
            if (mediaList[i]._id === mediaId) {
                mediaItem = mediaList[i];
            }
        }

        //  validate the date
        if (docDate.isValid()) {
            jqDoc.divDate.removeClass('has-error');
            docFields.createdOn = docDate.format();
            if (mediaItem.createdOn !== docFields.createdOn) {
                mediaItem.createdOn = docFields.createdOn;
                isDirty = true;
            }
        } else {
            jqDoc.divDate.addClass('has-error');
        }

        //  add the selected type
        docFields.docType = jqDoc.selType.val();
        if (mediaItem.docType !== docFields.docType) {
            mediaItem.docType = docFields.docType;
            isDirty = true;
        }

        //  if noting has changed then no further action needs to be taken
        if (false === isDirty) {
            return;
        }

        //  save to server
        Y.doccirrus.comctl._ajax('PUT', 'VPRC', '/1/media/' + mediaId, docFields, onDocFieldsSaved);

        //  let any parent binder know about this change
        function onDocFieldsSaved() {
            if (callWhenDocFieldChanged) {
                callWhenDocFieldChanged(mediaId, docFields);
            }
        }
    }

    /**
     *  Open file selection dialog from hidden multi-upload element
     */

    function onUploadIndirect() {
        //credit: http://stackoverflow.com/questions/6463439/how-to-open-a-file-browse-dialog-using-javascript
        var
            elem = document.getElementById( 'fileMulti' ),
            evt;

        if (elem && document.createEvent) {
            evt = document.createEvent( 'MouseEvents' );
            evt.initEvent( 'click', true, false );
            elem.dispatchEvent(evt);
        } else {
            elem.click();
        }
    }

    /**
     *  Open scanner plugin modal
     */

    function onScanClick() {

        var
            options = { 'ownerCollection': ownerCollection, 'ownerId': ownerId, 'saveTo': 'db' },
            dialog = Y.doccirrus.utils.dynamsoft.showScanDialog( options );

        dialog.on( 'mediaadded64', function( mediaId ) {
            onImageScanned64( mediaId );
        } );

        dialog.on( 'doctypechange', function( facade, data ) {
            scanDocType = data.type;
            Y.log( 'Set document type for new media from scanner: ' + scanDocType, 'debug', NAME );
        } );

        dialog.on( 'doctitlechange', function( facade, data ) {
            scanDocTitle = data.title;
            Y.log( 'Changed title of new media from scanner: ' + scanDocTitle, 'debug', NAME );
        } );

        Y.doccirrus.jsonrpc.api.settings.dynamsoft()
            .then( function( response ) {
                Y.log('Dynamsoft Web TWAIN settings: ' + JSON.stringify(response), 'debug', NAME);
                return response.data || false;
            } )
            .done( function( dynamsoft ) {
                if( !dynamsoft.useWebTwain ) {
                    Y.log('TWAIN API not present', 'debug', NAME);
                }
            } );

    }

    function onImageScanned64( mediaId ) {
        Y.doccirrus.media.clearCache(ownerCollection, ownerId);
        requestAttachmentsList( mediaId );
        return;
    }

    function onWebcamClick() {
        var
            settings = {
                'ownerCollection': ownerCollection,
                'ownerId': ownerId,
                'label': label,
                'onChange': onWebcamMediaChange,
                'onAdd': callWhenAdded
            };

        Y.doccirrus.modals.cameraInput.show( settings );

        function onWebcamMediaChange( media ) {
            //alert( 'webcam image captured: ' + JSON.stringify( media ) );
            callWhenChanged( media );
        }
    }

    return {

        /**
         *  Default function to setup -- automatically used by Jade Loader
         *
         *  @param  node                                {Object}
         *  @param  node.passToBinder                   {Object}    Options for this control
         *  @param  node.passToBinder.dropAreaLabel     {String}    (optional) Label for drop area
         *  @param  node.passToBinder.emptyListLabel    {String}    (optional) Label for empty file list
         */

        registerNode: function( node ) {
            Y.log('Registered list_attachments node', 'debug', NAME);

            myNode = node;
            ownerCollection = 'test';
            ownerId = 'test';

            //  check for media library

            if ((!Y.doccirrus) || (!Y.doccirrus.media)) {
                Y.log('The attachments list view requires Y.doccirrus.media (dcmedia autoloaded YUI module)', 'warn', NAME);
            }

            //  cache some jQuery selectors

            jqCache = {
                'divNoAttachments': $('#divNoAttachments'),
                'divAttachmentsList': $('#divAttachmentsList'),
                'divAttachmentsAdd': $('#divAttachmentsAdd'),
                'divAttachmentsNote': $('#divAttachmentsNote'),
                'divAttachmentsLegacy': $('#divAttachmentsLegacy'),
                'divDragDrop': $('#divDragDrop'),

                'fileMulti': $('#fileMulti'),
                'btnMulti': $('#btnMulti'),
                'btnReloadManual': $('#btnReloadManual'),

                'btnUploadIndirect': $('#btnUploadIndirect'),
                'btnScan': $('#btnScan'),
                'btnWebcam': $('#btnWebcam'),

                'hdnOwnerCollection': $('#hdnOwnerCollection'),
                'hdnOwnerId': $('#hdnOwnerId'),

                'spanDropLabel': $('#spanDropLabel')
            };

            //  read any settings passed by parent binder

            callWhenChanged = function() {
                Y.log('Image set (re)loaded, no listener set', 'debug', NAME);
            };

            callWhenAdded = function() {
                Y.log('Image added, no listener set', 'debug', NAME);
            };

            callWhenDeleted = function() {
                Y.log('Image deleted, no listener set', 'debug', NAME);
            };

            if ('undefined' !== node.passToBinder) {

                //var k;
                //for (k in node.passToBinder) {
                //    if (node.passToBinder.hasOwnProperty(k) && ('function' !== typeof node.passToBinder[k])) {
                //        Y.log('received ' + (typeof node.passToBinder[k]) + ' ' + k + ': ' + node.passToBinder[k], 'debug', NAME);
                //    }
                //}

                if (node.passToBinder.hasOwnProperty('ownerCollection')) {
                    ownerCollection = node.passToBinder.ownerCollection;
                }

                if (node.passToBinder.hasOwnProperty('ownerId')) {
                    ownerId = node.passToBinder.ownerId;
                }

                if (node.passToBinder.hasOwnProperty('label')) {
                    label = node.passToBinder.label;
                }

                if (node.passToBinder.hasOwnProperty('onChange')) {
                    //Y.log('setting onChange to ' + node.passToBinder.onChange, 'info', NAME);
                    callWhenChanged = node.passToBinder.onChange;
                }

                if (node.passToBinder.hasOwnProperty('onDocFieldChange')) {
                    //Y.log('setting onChange to ' + node.passToBinder.onChange, 'info', NAME);
                    callWhenDocFieldChanged = node.passToBinder.onDocFieldChange;
                }

                if (node.passToBinder.hasOwnProperty('onAdd')) {
                    //Y.log('setting onAdd to ' + node.passToBinder.onAdd, 'info', NAME);
                    callWhenAdded = node.passToBinder.onAdd;
                }

                if (node.passToBinder.hasOwnProperty('onRemove')) {
                    //Y.log('setting onRemove to ' + node.passToBinder.onRemove, 'info', NAME);
                    callWhenDeleted = node.passToBinder.onRemove;
                }

                if (node.passToBinder.hasOwnProperty('widthPx')) {
                    thumbWidth = parseInt(node.passToBinder.widthPx, 10);
                }

                if (node.passToBinder.hasOwnProperty('heightPx')) {
                    thumbHeight = parseInt(node.passToBinder.heightPx, 10);
                }

                if (node.passToBinder.hasOwnProperty('thumbWidth')) {
                    thumbWidth = parseInt(node.passToBinder.thumbWidth, 10);
                }

                if (node.passToBinder.hasOwnProperty('thumbHeight')) {
                    thumbHeight = parseInt(node.passToBinder.thumbHeight, 10);
                }

                if (node.passToBinder.hasOwnProperty('singular')) {
                    singular = node.passToBinder.singular;
                }

                if (node.passToBinder.hasOwnProperty('linkToDownload')) {
                    linkToDownload = node.passToBinder.linkToDownload;
                }

                if (node.passToBinder.hasOwnProperty('showList')) {
                    showList = node.passToBinder.showList;
                }

                if (node.passToBinder.hasOwnProperty('documentFields')) {
                    documentFields = node.passToBinder.documentFields;
                }

                if (node.passToBinder.hasOwnProperty('allowCategories')) {
                    allowCategories = node.passToBinder.allowCategories;
                }

                if (node.passToBinder.hasOwnProperty('scanner') && node.passToBinder.scanner === true) {
                    jqCache.btnScan.show();
                } else {
                    jqCache.btnScan.hide();
                }

                if (node.passToBinder.hasOwnProperty('webcam') && node.passToBinder.webcam === true) {
                    jqCache.btnWebcam.show();
                } else {
                    jqCache.btnWebcam.hide();
                }

                if ( node.passToBinder.hasOwnProperty('dropAreaLabel') ) {
                    jqCache.spanDropLabel.html( '<small>' + node.passToBinder.dropAreaLabel + '</small>' );
                }

                if ( node.passToBinder.hasOwnProperty('emptyListLabel') ) {
                    jqCache.divNoAttachments.html( '<small>' + node.passToBinder.emptyListLabel + '</small>' );
                }

                //  LEGACY, DEPRECATED, REMOVEME

                if (('function' !== typeof callWhenChanged) && (node.passToBinder.hasOwnProperty('onLoad'))) {
                    Y.log('Set legacy onLoad event handler, TODO find and replace it with onChange', 'warn', NAME);
                    callWhenChanged = node.passToBinder.onLoad;
                }

            }

            //  this allows correct linking of media documents in new CaseFile without reloading this view
            //  temporary, until such time as this view is rewritten as a KO component

            transitionListener = Y.on( 'activityTransitioned', function onCaseFileSaveActivity( evt ) {
                if ( evt.isNew && evt.data && evt.data._id) {
                    ownerId = evt.data._id;
                    Y.log('New media attachments will belong to: ' + ownerId, 'debug', NAME);
                }
            } );

            //  LEGACY, DEPRECATED, REMOVEME

            if (node.dcimages && node.dcimages.ownerCollection) {
                ownerCollection = node.dcimages.ownerCollection;
            }

            if (node.dcimages && node.dcimages.ownerId) {
                ownerId = node.dcimages.ownerId;
            }

            //  add null callback if none given

            if ('function' !== typeof callWhenChanged) {
                callWhenChanged = function() {
                    Y.log('No callback set for onChange', 'debug', NAME);
                };
            }

            //  initialize the display and load attached media

            setupView( );
            requestAttachmentsList();

            function AttachmentsListVM() {
                var
                    self = this;

                self.lblLoadingI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_LOADING');
                self.lblNoAttachmentsI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_NO_ATTACHMENTS');
                self.lblDropFilesHereI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_DROP_FILES_HERE');
                self.buttonScanI18n = i18nTemplate( 'general.button.SCAN' );
                self.buttonWebcamI18n = i18nTemplate( 'general.button.WEBCAM' );
                self.buttonUploadI18n = i18nTemplate( 'general.button.UPLOAD' );
                self.buttonMultiUploadI18n = i18nTemplate('MediaMojit.list_attachments.view.BTN_UPLOAD');
                self.lblFileNameI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_FILENAME');
                self.lblUploadingI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_UPLOADING');
                self.lblDeletingI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_DELETING');
                self.lblCompleteI18n = i18nTemplate('MediaMojit.list_attachments.view.LBL_COMPLETE');

            }

            ko.applyBindings( new AttachmentsListVM(), document.querySelector( '#divMediaAttachmentsContainer' ) );
        },

        deregisterNode: function( /* node */ ) {
            //  SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //  Commented out because doing so can cause unexpected behavior when reloadeding, can happen in FEM
            //node.destroy();

            Y.log('Unloading media attachments list', 'debug', NAME);

            if ( transitionListener ) {
                transitionListener.detach();
            }
        }
    };
}
