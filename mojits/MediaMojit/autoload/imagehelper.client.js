/*
 @author: mp
 @date: 2013/11/10
 */

/*jshint latedef:false */
/*global YUI, $ */

'use strict';

YUI.add(
    'dcmedia',
    function( Y, NAME ) {

        //  Private memebrs

        var
            i18n = Y.doccirrus.i18n,
            //  Relative to VPRC
            // TODO update instances using '/img/not-found.png' to follow the bellow methodology
            defaultImagePath = i18n( 'missingImagePath' ),

            //  Cache media metadata
            cacheMediaMeta = {};

        //  IMG DOM OPERATIONS

        /**
         *  Find the first image attachment with the given details and apply to a DOM image object
         *  Note: this worked with dataURIs prior to 2.17
         * 
         *  @param  patientRegId    {String}    Allow operation through PUC proxy
         *  @param  domId           {String}    DOM ID of img element
         *  @param  mediaItem       {Object}    A single reduced media item
         *  @param  widthPx         {Number}    Optional
         *  @param  heightPx        {Number}    Optional
         *  @param  callback        {Function}  Called when image loaded, of the form fn(err)
         */

        function setImgContentMR( patientRegId, domId, mediaItem, widthPx, heightPx, callback ) {

            var
                jqImg = $('#' + domId.replace('#', '')),
                transform = parseInt( widthPx, 10 ) + 'x' + parseInt( heightPx, 10 ),
                transUrl = getMediaUrl( mediaItem, transform );

            if ( !mediaItem || !mediaItem.mime ) {
                transUrl = defaultImagePath;
            }

            if ( patientRegId ) {
                Y.log( 'TODO: make transform URL for patient portal through PUC proxy when binary requests are supported', 'WARN', NAME );
            }

            jqImg.attr('src', Y.doccirrus.infras.getPrivateURL( transUrl ) );
            jqImg.width(widthPx);
            jqImg.height(heightPx);

            callback( null );
        }

        /**
         *  DEPRECATED, please use setImgContentMR for new code
         *
         *  @param domId
         *  @param mediaItem
         *  @param widthPx
         *  @param heightPx
         *  @param callback
         */

        function setImgContent( domId, mediaItem, widthPx, heightPx, callback ) {
            setImgContentMR( '', domId, mediaItem, widthPx, heightPx, callback );
        }

        /**
         *  Set the contents of an image in the page to a MediaMojit image from the VPRC
         *
         *  Note: if image withPx or heightPx are not given then they will be read from the
         *  current dimensions of the img tag
         *
         *  @param  patientRegId       {String}    Allow operation through PUC proxy
         *  @param  domId           {String}    DOM ID of an image element
         *  @param  ownerCollection {String}    Type of object which may own images
         *  @param  ownerId         {String}    Database _id of owner object
         *  @param  label           {String}    Image category or disposition
         *  @param  widthPx         {Number}    Desired width of image (optional)
         *  @param  heightPx        {Number}    Desired height of image (optional)
         *  @param  callback        {Function}  Called when image has been set
         */

        function setImgFromDefaultMR( patientRegId, domId, ownerCollection, ownerId, label, widthPx, heightPx, callback) {

            function onMetaLoaded(err, metaData) {

                if (err) {
                    callback(err);
                    return;
                }

                var mediaItem = null;
                if (metaData.length > 0) { mediaItem = metaData[0]; }

                setImgContent(domId, mediaItem, widthPx, heightPx, callback);
            }

            listAttachmentsMR(patientRegId, ownerCollection, ownerId, label, onMetaLoaded);
        }

        /**
         *  DEPRECATED, please use setImgFromDefaultMR in new code
         *
         *  @param domId
         *  @param ownerCollection
         *  @param ownerId
         *  @param label
         *  @param widthPx
         *  @param heightPx
         *  @param callback
         */

        function setImgFromDefault( domId, ownerCollection, ownerId, label, widthPx, heightPx, callback) {
            setImgFromDefaultMR( '', domId, ownerCollection, ownerId, label, widthPx, heightPx, callback);
        }

            /**
         *  Bind an DOM/HTML img object to a modal editor
         *
         *  @param  settings    {Object}    DOCUMENTME
         *  @param  domId       {String}    DOM ID to attach a click event to
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function addEditor( settings, domId, callback ) {

            domId = domId.replace('#', '');

            var
                chainOnChange,
                jqImg = $('#' + domId);


            function onImgUpdated(err) {
                if (err) {
                    Y.log('Could not update element  ' + domId + ':' + err, 'warn', NAME);
                }
            }

            function onAttachmentsChanged(imgSet) {

                var mediaItem = null;

                if ( (imgSet.length > 0) && (imgSet[0].hasOwnProperty('url'))) {
                    mediaItem = imgSet[0];
                }

                //Y.log('Attachment changed, updating bound image element: ' + domId + ' media item: ' + mediaItem, 'debug', NAME);
                setImgContent( domId, mediaItem, settings.widthPx, settings.heightPx, onImgUpdated );

                //  pass up to any handler in the parent binder
                if (chainOnChange) {
                    chainOnChange(imgSet);
                }

            }

            function onFilesDropped(files) {
                settings.addFiles = files;
                attachImages( settings, callback );
            }

            //  we will capture any onChange events to automatically update the registered image
            if (settings.onChange) {
                chainOnChange = settings.onChange;
            }
            settings.onChange = onAttachmentsChanged;

            jqImg.off( 'click.media' ).on( 'click.media', function() { attachImages( settings, callback ); } );
            makeDroppable(domId, onFilesDropped);
        }

        //  Attachments need an ID, use a temporary one for new objects not yet saved to db

        function tempId() {
            return ('localTempId' + new Date().getTime() + Math.floor( Math.random() * 100000 )).replace('.', '');
        }

        function isTempId( id ) {
            id = String( id );
            return id.indexOf( 'localTempId' ) === 0;
        }

        /**
         *  Change the owner of a media item
         *
         *  @param  patientRegId    {String}    Allows operation through PUC proxy
         *  @param  mediaId         {String}    Database _id of something in the media collection
         *  @param  ownerCollection {String}    Type of object which may own attached media
         *  @param  ownerId         {String}    Database _id of new owner object
         *  @param  callback        {Function}  Of the form fn(err)
         *
         */

        function chownMR(patientRegId, mediaId, ownerCollection, ownerId, callback) {

            Y.log('chown single item ' + mediaId + ' ==> ' + ownerCollection + '::' + ownerId, 'debug', NAME);

            function onChownComplete(err, result) {
                if (err) {
                    Y.log('Error changing owner: ' + err, 'warn', NAME);
                    callback('Error changing owner: ' + err);
                    return;
                }

                result = (result && result.data) ? result.data : result;
                clearCache(ownerCollection, ownerId);
                callback( null, result );
            }

            var params = {
                'data': {
                    'ownerCollection': ownerCollection,
                    'ownerId': ownerId,
                    'fields_': [ 'ownerId', 'ownerCollection' ]
                },
                'query': { '_id': mediaId }
            };

            if (!patientRegId || '' === patientRegId) {
                //Y.doccirrus.comctl.privatePost('/1/media/', params, onChownComplete);
                Y.doccirrus.jsonrpc.api.media.update( params )
                    .then( function( newId ) {
                        callback( null, newId );
                    } );

            } else {
                Y.doccirrus.blindproxy.putSingle(patientRegId, '/1/media/', params, onChownComplete);
            }
        }

        /**
         *  DEPRECATED, please use chownMR in new code
         *  @param mediaId
         *  @param ownerCollection
         *  @param ownerId
         *  @param callback
         */

        function chown(mediaId, ownerCollection, ownerId, callback) {
            chownMR('', mediaId, ownerCollection, ownerId, callback);
        }

        /**
         *  Change ownership of all media attachments from on eobject to another
         *
         *  @method switchIds
         *  @param  patientRegId       {String}    Allows opperation through PUC proxy
         *  @param  fromCollection  {String}    Original / current owner type
         *  @param  fromId          {String}    Original / current owner _id
         *  @param  toCollection    {String}    New owner type
         *  @param  toId            {String}    New owner _id
         *  @param  callback        {Function}  of the form fn _err();
         */

        function chownAllMR( patientRegId, fromCollection, fromId, toCollection, toId, callback ) {

            Y.log('chown ' + fromCollection + '::' + fromId + ' ==> ' + toCollection + '::' + toId, 'debug', NAME);

            /**
             *  Called with array of trimmed media objects (no dataUrls)
             *
             *  @param  err     {String}
             *  @param  imgSet  {Array}
             */

            function onLoadMetaData( err, imgSet ) {

                if ( err ) {
                    Y.log( err, 'warn', NAME );
                    return;
                }

                var
                    outstanding = 1,
                    i;

                function onChownImg(err) {
                    outstanding = outstanding - 1;
                    if (err) {
                        Y.log('Could not switch owner for image: ' + err, 'warn', NAME);
                    }
                    if (0 === outstanding) {
                        clearCache(fromCollection, fromId);
                        clearCache(toCollection, toId);
                        return callback( null );
                    }
                }

                for (i = 0; i < imgSet.length; i++) {
                    if (imgSet[i].hasOwnProperty('_id')) {
                        outstanding = outstanding + 1;
                        chownMR(patientRegId, imgSet[i]._id, toCollection, toId, onChownImg);
                    }
                }

                onChownImg( null );
            }


            //self.apiListMedia( collection, id, onLoadSuccess, onLoadFailure );
            clearCache(fromCollection, fromId);
            clearCache(toCollection, toId);
            listAttachmentsMR(patientRegId, fromCollection, fromId, '', onLoadMetaData);
        }

        /**
         *  DEPRECATED, please use chownAllMR in new code
         *
         *  @param fromCollection
         *  @param fromId
         *  @param toCollection
         *  @param toId
         *  @param callback
         */

        function chownAll( fromCollection, fromId, toCollection, toId, callback ) {
            chownAllMR( '', fromCollection, fromId, toCollection, toId, callback );
        }

        /**
         *  Pops a modal for attaching images to something
         *
         *  Settings object:
         *
         *      'ownerCollection'   -   type of object which will oen this image [string]
         *      'ownerId'           -   database _id of object which will own this image [string]
         *      'label'             -   differentiates different types of image something might have [string]
         *      'onChange'          -   event will be fired when image attached or removed [function]
         *      'thumbWidth'        -   Optional, if you want a special thumb size, pixels [int]
         *      'thumbHeight'       -   Optional, if you want a special thumb size, pixels [int]
         *      'title'             -   Optional, if you want to set modal title
         *      'single'            -   Set to true to enforce attachment of single image [bool]
         *
         *  @param  settings    {Object}
         *  @param  callback    {Function}  Calls when view is displayed, not when image chosen
         */

        function attachImages(settings, callback) {

            var divId = ('divEditImgSingle' + (Math.random() * 999999)).replace('.', ''),
                _nodeObj;

            if ('function' !== typeof callback) {
                callback = function(err) {
                    if (err) {
                        Y.log('Error opening image attachment modal: ' + err, 'warn', NAME);
                    }
                    Y.log('No callback set for load of image attachment modal.', 'debug', NAME);
                };
            }

            function onEditFormLoaded(err, status, nodeObj) {
                _nodeObj = nodeObj;
                if (err) {
                    callback('jadeLoader could not inject the form: ' + err);
                    return;
                }
                callback(null);
            }

            function onModalCreated(err) {

                if (err) {
                    callback('Could not spawn img edit modal: ' + err);
                    return;
                }

                var
                    viewName = settings.single ? 'img_edit' : 'list_attachments',
                    targetNode = Y.one( '#' + divId );

                targetNode.passToBinder = settings;

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    viewName,                           //  Mojit name
                    'MediaMojit',                             //  View name
                    {},                                     //  ...
                    targetNode,                             //  YUI node object to render into
                    onEditFormLoaded                        //  Load callback
                );
            }

            function onHide(){
                if(_nodeObj){
                    _nodeObj.destroy();
                }
            }
            function onDictLoaded( err ) {

                var divDefinition = '<div id="' + divId + '">Loading...</div>';

                if (err) {
                    callback('Could not node dictorary: ' + err);
                    return;
                }

                if (!settings.title) {
                    settings.title = Y.doccirrus.i18n('MediaMojit.main.TITLE_EDIT_IMAGE');
                }

                if (!settings.single) {
                    settings.single = false;
                }

                Y.doccirrus.comctl.setModal(
                    settings.title,                         //  title
                    divDefinition,                          //  body
                    true,                                   //  closeButton
                    null,                                   //  event handler for 'OK' button
                    onModalCreated,                          //  callback when spawned
                    onHide
                );

            }

            //  migrated from the MediaMojit, translations are in that lang file for now
            //Y.doccirrus.comctl.getIl8nDict('MediaMojit', onDictLoaded);
            onDictLoaded();

        }         // end attachImages

        /**
         *  List images attached to something
         *
         *  @method     imgList
         *  @param      patientRegId           {String}    Allows PUC proxy to reference (V)PRC, empty string if none
         *  @param      ownerCollection     {String}    Type of object which owns images
         *  @param      ownerId             {String}    Database _d of object which owns images
         *  @param      label               {String}    Label for attached images [optional]
         *  @param      callback            (Function}  Of the form fn(err, data)
         */

        function listAttachmentsMR(patientRegId, ownerCollection, ownerId, label, callback) {

            Y.log('listing attached media: ' + ownerCollection + '::' + ownerId + ' (' + label + ')', 'debug', NAME);

            function onMetaDataLoaded(err, data) {
                if (err) {
                    callback('Could not load image metadata: ' + JSON.stringify(err));
                    return;
                }
                data = (data && data.data) ? data.data : data;
                cacheMediaMeta[cacheKey] = data;
                filterMetaData(data);
            }

            function filterMetaData(data) {
                var
                    i,
                    tempUrl,
                    filteredToLabel = [];

                //Y.log('list attachements ' + ownerCollection + '::' + ownerId + ': ' + JSON.stringify(data), 'debug', NAME);

                //  set display size and check there is a label field
                for (i = 0; i < data.length; i++) {

                    if (!data[i].hasOwnProperty('label')) {
                        data[i].label = '';
                    }

                    data[i].mimeType = Y.doccirrus.media.types.getMimeType( data[i].mime );
                    data[i].category = Y.doccirrus.media.types.getCategory( data[i].mime );

                    tempUrl = getMediaUrl( data[i], 'original' );
                    tempUrl = Y.doccirrus.infras.getPrivateURL( tempUrl );
                    data[i].url = tempUrl;
                    data[i].thumbUrl = getMediaThumbUrl( data[i], 100, true );
                }

                //  skip filtering of results if not label set
                if ((!label) || ('' === label)) {
                    callback(null, data);
                    return;
                }

                //  filter results to specific label
                for (i = 0; i < data.length; i++) {
                    if (data[i].label === label) {
                        filteredToLabel.push(data[i]);
                    }
                }

                callback(null, filteredToLabel);
            }

            var
                cacheKey = ownerCollection + '_' + ownerId,
                params = { 'collection': ownerCollection, 'id': ownerId };

            //  first check the cache
            if (cacheMediaMeta.hasOwnProperty(cacheKey)) {
                filterMetaData(cacheMediaMeta[cacheKey]);
                return;
            }

            //  attachments not cached, ask the MediaMojit on the VPRC
            Y.doccirrus.blindproxy.getSingle(patientRegId, '/1/media/:list', params, onMetaDataLoaded);
        }

        /**
         *  DEPRECATED, use listAttachmentsMR for new code
         *
         *  @param ownerCollection
         *  @param ownerId
         *  @param label
         *  @param callback
         */

        function listAttachments(ownerCollection, ownerId, label, callback) {
            listAttachmentsMR('', ownerCollection, ownerId, label, callback);
        }

        /**
         *  Clear cache of media metadata (call if directly modifying attached media)
         *
         *  If no params are passed then the entire cache will be cleared, not a single key
         *
         *  @method clearMediaCache
         *  @param  ownerCollection {String}    Type of object which may have attached media
         *  @param  ownerId         {String}    Database _id of object with attached media
         */

        function clearCache(ownerCollection, ownerId) {

            if ((!ownerCollection) || (!ownerId)) {
                cacheMediaMeta = {};
            }

            var cacheKey = ownerCollection + '_'  + ownerId;
            if (cacheMediaMeta.hasOwnProperty(cacheKey)) {
                cacheMediaMeta[cacheKey] = null;
                delete cacheMediaMeta[cacheKey];
            }
        }

        /**
         *  Delete an attached image or PDF given its database _id, ownership details are to invalidate local cached
         *
         *  @param  patientRegId       {String}    Allows operation through PUC proxy
         *  @param  ownerCollection {String}    Schema/type/collection of object which owns image
         *  @param  ownerId         {String}    Datbase _id of object which owns attached media
         *  @param  mediaId         {String}    Database _id of a media item
         *  @param  callback        {Function}  Of the form fn(err)
         */

        function deleteAttachmentMR(patientRegId, ownerCollection, ownerId, mediaId, callback) {
            Y.log('Deleting attachment ' + mediaId + ' from ' + ownerCollection + '::' + ownerId, 'info', NAME);
            clearCache(ownerCollection, ownerId);

            var
                params = {
                    '_id': mediaId,
                    'id': mediaId
                };

            Y.doccirrus.blindproxy.postSingle(patientRegId, '/1/media/:remove', params, callback);
            //Y.doccirrus.comctl.privatePost( '/1/media/:remove', params, callback );
        }


        /**
         *  DEPRECATED, use deleteAttachmentMR for new code
         *
         *  @param  ownerCollection {String}    Schema/type/collection of object which owns image
         *  @param  ownerId         {String}    Datbase _id of object which owns attached media
         *  @param  mediaId         {String}    Database _id of a media item
         *  @param  callback        {Function}  Of the form fn(err)
         */

        function deleteAttachment(ownerCollection, ownerId, mediaId, callback) {
            deleteAttachmentMR('', ownerCollection, ownerId, mediaId, callback);
        }


        /**
         *  Upload a file from an input element or drop event as base64 strings
         *
         *  This is the default upload method for modern browsers (where the FileReader object is available)
         *
         *  @param  patientRegId       {String}    Allows PUC proxy to be used, send empty string is none
         *  @param  ownerCollection {String}    Type of object which may have file attachments
         *  @param  ownerId         {String}    Database _id of object which may own files
         *  @param  label           {String}    Optional label to categorize / divide up attachments
         *  @param  file            {Object}    An array of browser file objects
         *  @param  callback        {Function}  Of the form fn(err, newMediaId)
         */

        function uploadFileMR(patientRegId, ownerCollection, ownerId, label, file, callback) {

            Y.log( 'Uploading file: ' + file.name, 'info', NAME );

            // after uploading the file, invalidate cache for this owner and label before calling back

            function onFilePost(err, newMediaObj ) {
                if (err) {
                    callback(err);
                    return;
                }
                newMediaObj = (newMediaObj && newMediaObj.data) ? newMediaObj.data : newMediaObj;
                Y.log('Media added, invalidating cached lists for ' + ownerCollection + '::' + ownerId, 'debug', NAME);
                clearCache(ownerCollection, ownerId);
                callback(null, newMediaObj._id);
            }

            // called when file has been read into base64 string, POST it to the VPRC

            function onFileReadFromDisk( file64evt ) {

                Y.log( 'Read file successfully, POSTing to mediamojit', 'info', NAME );

                var
                    newId = ('upload' + (new Date().getTime()) + (Math.random() * 999999)).replace( '.', '' ),
                    settings = {
                        'ownerCollection': ownerCollection,
                        'ownerId': ownerId,
                        //  deprecated - TODO: rename
                        'source': file64evt.target.result,
                        'id': newId,
                        'name': file.name,
                        'fileName': file.name,
                        'label': label
                    };

                if (!patientRegId || '' === patientRegId) {
                    //  not passing through PUC proxy
                    Y.doccirrus.comctl.privatePost('/1/media/:upload64', settings, onFilePost);
                } else {
                    //  must be routed to originating (V)PRC
                    Y.doccirrus.blindproxy.postSingle(patientRegId, '/1/media/:upload64', settings, onFilePost);
                }
            }

            var readerObj = new FileReader();
            readerObj.onload = onFileReadFromDisk;
            readerObj.readAsDataURL( file );
        }

        /**
         *  DEPRECATED: this is retained for backwards compatability, new code should use uploadFileMR
         *
         *  @param  ownerCollection {String}    Type of object which may have file attachments
         *  @param  ownerId         {String}    Database _id of object which may own files
         *  @param  label           {String}    Optional label to categorize / divide up attachments
         *  @param  file            {Object}    An array of browser file objects
         *  @param  callback        {Function}  Of the form fn(err, newMediaId)
         */

        function uploadFile(ownerCollection, ownerId, label, file, callback) {
            uploadFileMR('', ownerCollection, ownerId, label, file, callback);
        }

        /**
         *  Cause an element to become a drop target which will pass dropped files to a function
         *
         *  @param  domId           {String}    DOM ID of element to make into a drop target
         *  @param  onFilesDropped  {Function}  Called with array of dropped files, fn (files, domId)
         */

        function makeDroppable(domId, onFilesDropped) {

            //  Boilerplate to prevent browser default action on drop
            //  PLANNED: may in future add special behavior to these, such as custom cursor, background change, etc

            function onDragEnter(evt) {
                //jqCache.divDragDrop.css('background-color', colorDropHover);
                evt.stopPropagation();
                evt.preventDefault();
            }

            function onDragOver(evt) {
                //jqCache.divDragDrop.css('background-color', colorDropHover);
                evt.stopPropagation();
                evt.preventDefault();
            }

            function onDragExit(evt) {
                //jqCache.divDragDrop.css('background-color', colorDropTarget);
                evt.stopPropagation();
                evt.preventDefault();
            }


            function onDrop(evt) {
                //jqCache.divDragDrop.css('background-color', colorDropTarget);
                Y.log('Drop event raised on: ' + domId, 'debug', NAME);

                evt.stopPropagation();
                evt.preventDefault();

                if ((!evt) || (!evt.dataTransfer) || (!evt.dataTransfer.files)) {
                    //  dragged in something other than a file
                    Y.log('Drop event does not carry files.', 'warn', NAME);
                    return;
                }

                if (evt.dataTransfer.files.length > 0) {
                    //Y.log('DROP! ' + evt.dataTransfer.files + ' files into ' + domId, 'debug', NAME);
                    onFilesDropped(evt.dataTransfer.files, domId);
                } else {
                    Y.log('Drop event carries 0 files.', 'warn', NAME);
                    //Y.log(JSON.stringify(evt, 'undefined', 2));
                }

            }

            //  jQuery events didn't work for me here, using basic DOM
            //Y.log('Attaching file drop listeners to ' + domId, 'debug', NAME);
            var dropdiv = document.getElementById(domId);

            if (!dropdiv || !dropdiv.addEventListener) {
                Y.log('Could not make droppable, missing element: ' + domId, 'warn', NAME);
                return;
            }

            dropdiv.addEventListener("dragenter", onDragEnter, false);
            dropdiv.addEventListener("dragexit", onDragExit, false);
            dropdiv.addEventListener("dragover", onDragOver, false);
            dropdiv.addEventListener("drop", onDrop, false);
        }

        /**
         *  Returns relative location of the default or 'not found' image
         */

        function getDefaultImage() {
            return defaultImagePath;
        }

        /**
         *  Change the default / 'not found' image for the current page
         *
         *  @param  newRelUrl   {String}    Static or user image relative to infras privateUrl
         */

        function setDefaultImage(newRelUrl) {
            defaultImagePath = newRelUrl;
        }

        /**
         *  Shortcut method to contruct the cache key URL of a transform
         *
         *  @param  mediaObj                {Object}
         *  @param  mediaObj.mime           {String}    MIME_TYPE to display
         *  @param  mediaObj._id            {String}    Database _id of a media object
         *  @param  mediaObj.contentType    [string]    Optional, pass contentType instead of mime
         *  @param  transform               {String}    Transform name, eg, "original", "200x100", "150x-1"
         *  @returns                        {String}    Relative URL
         */

        function getMediaUrl( mediaObj, transform ) {
            if ( mediaObj && mediaObj.contentType && !mediaObj.mime ) { mediaObj.mime = Y.doccirrus.media.getMime( mediaObj.contentType ); }
            if ( !mediaObj || !mediaObj.mime || !mediaObj._id ) { return ''; }
            if ( !transform || '' === transform ) { transform = 'original'; }

            var
                ext = Y.doccirrus.media.types.getExt( mediaObj.mime ),
                url = '/media/' + mediaObj._id + '_' + transform + '.' + mediaObj.mime + '.' + ext;

            return url;
        }

        /**
         *  Return 100x100 default thumbnail URL
         *
         *  @param  mediaObj        {Object}    Media metadata object
         *  @param  mediaObj._id    {String}
         *  @param  mediaObj.mime   {String}    MIME_TYPE
         *  @param  thumbSize       {Number}    Pixels
         *  @param  relative        {Boolean}   True to return relative URL
         *  @return                 {String}    Relative URL
         */

        function getMediaThumbUrl( mediaObj, thumbSize, relative ) {
            var
                mime = mediaObj.mime,
                transform = thumbSize + 'x' + thumbSize,
                category = Y.doccirrus.media.types.getCategory( mediaObj.mime ),
                thumbUrl;

            thumbUrl = '/media/' + mediaObj._id + '_' + transform + '.IMAGE_JPEG.jpg';

            if( 'VIDEO_MP4' === mime || 'VIDEO_X-MSVIDEO' === mime || 'VIDEO_X-QUICKTIME' === mime ) {
                thumbUrl = '/static/MediaMojit/assets/images/playthumb.png';
            }

            if ( mime === 'APPLICATION_PDF' ) {
                thumbUrl = '/media/' + mediaObj._id + '_' + thumbSize + 'x-1.IMAGE_JPEG.jpg';
            }

            if ( mime === 'IMAGE_GIF' ) {
                thumbUrl = '/media/' + mediaObj._id + '_' + transform + '.IMAGE_GIF.gif';
            }

            if ( mime ==='AUDIO_MPEG' || mime === 'AUDIO_MP3' || mime === 'AUDIO_OGG' || mime === 'AUDIO_X-DSS' || mime === 'AUDIO_X-DS2' ) {
                thumbUrl = '/static/MediaMojit/assets/images/playthumb.png';
            }

            //  TODO: add icon files to dcmedia-filetypes
            if ( 'document' === category && 'APPLICATION_PDF' !== mime ) {
                thumbUrl = '/static/MediaMojit/assets/images/docthumb.png';
            }

            if ( 'tfdata' === category ) {
                thumbUrl = '/static/MediaMojit/assets/images/docthumb.png';
            }

            if ( 'font' === category ) {
                thumbUrl = '/static/MediaMojit/assets/images/fontthumb.png';
            }

            if ( !relative ) {
                thumbUrl =  Y.doccirrus.infras.getPrivateURL( thumbUrl );
            }

            return thumbUrl;
        }

        /**
         *  Resize an image using HTML canvas
         *
         *  @param  imgObj      {Element}   DOM image object
         *  @param  mime        {String}    IMAGE_PNG or IMAGE_JPG
         *  @param  toWidthPx   {Number}    Pixels
         *  @param  toHeightPx  {Number}    Pixels, -1 for matching aspect
         *  @param  callback    {Object}    Of the form fn( err, newImg )
         */

        function canvasResize( imgObj, mime, toWidthPx, toHeightPx, callback ) {
            var
                mimeType = mime.replace( '_', '/' ).toLowerCase(),
                cnvFrom = document.createElement( 'canvas' ),
                cnvTo = document.createElement( 'canvas' ),
                aspect = ( imgObj.width / imgObj.height ),
                ctxFrom, ctxTo, newImgObj;

            if ( -1 === toHeightPx ) {
                toHeightPx = parseInt( toWidthPx / aspect, 10 );
            }

            cnvFrom.width = imgObj.width;
            cnvFrom.height = imgObj.height;
            cnvTo.width = toWidthPx;
            cnvTo.height = toHeightPx;

            ctxFrom = cnvFrom.getContext( '2d' );
            ctxTo = cnvTo.getContext( '2d' );

            ctxFrom.drawImage( imgObj, 0, 0 );
            ctxTo.drawImage( cnvFrom, 0, 0, imgObj.width, imgObj.height, 0, 0, toWidthPx, toHeightPx );

            newImgObj = new Image( toWidthPx, toHeightPx );
            newImgObj.onload = onImageResized;
            newImgObj.src = cnvTo.toDataURL( mimeType );

            function onImageResized() {
                callback( null, newImgObj );
            }
        }

        /*
         *  Export public methods
         */

        var
            myNS = Y.namespace( 'doccirrus' ).media,
            mixMethods = {

                DEFAULT_THUMB_SIZE: 68,

                'setImgContent': setImgContent,
                'setImgContentMR': setImgContentMR,
                'setImgFromDefault': setImgFromDefault,
                'setImgFromDefaultMR': setImgFromDefaultMR,
                'addEditor': addEditor,
                'attachImages': attachImages,
                'delete': deleteAttachment,
                'deleteMR': deleteAttachmentMR,
                'chown': chown,
                'chownMR': chownMR,
                'chownAll': chownAll,
                'chownAllMR': chownAllMR,
                'tempId': tempId,
                'isTempId': isTempId,
                'list': listAttachments,
                'listMR': listAttachmentsMR,
                'uploadFile': uploadFile,
                'uploadFileMR': uploadFileMR,
                'clearCache': clearCache,
                'makeDroppable': makeDroppable,
                'getDefaultImage': getDefaultImage,
                'setDefaultImage': setDefaultImage,
                'getMediaUrl': getMediaUrl,
                'getMediaThumbUrl': getMediaThumbUrl,
                'canvasResize': canvasResize,

                //  redirect to types module TODO: remove
                'getMime': function( mimeType ) { return Y.doccirrus.media.types.getMime( mimeType ); },
                'getMimeType': function( mime ) { return Y.doccirrus.media.types.getMimeType( mime ); },
                'getCategory': function( mimeType ) { return Y.doccirrus.media.types.getCategory( mimeType ); },
                'getExt': function( mimeType ) { return Y.doccirrus.media.types.getExt( mimeType ); }
            }, k;

        // mix in media utilities
        for( k in mixMethods ) {
            if ( mixMethods.hasOwnProperty( k ) ) {
                myNS[k] = mixMethods[k];
            }
        }

    },
    '0.0.1', { requires: [ 'dc-comctl', 'dcinfrastructs', 'dcmedia-filetypes', 'dcmedia-fonts'] }
);
