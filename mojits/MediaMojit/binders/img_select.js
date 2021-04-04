/**
 *  jadeLoaded widget to to select an image from a set of attachments
 *
 *  Usage:
 *
 *      When instantiating, please add 'passToBinder' property to the YUI node this will be rendered into
 *
 *          node.passToBinder.ownerCollection = 'myschemaname'
 *          node.passToBinder.ownerId = '123_DB_ID_OF_OWNER'
 *          node.passToBinder.widthPx = 123                     //  used to preview scale or crop
 *          node.passTobinder.heightPx = 456                    //  used to preview scale or crop
 *
 *      The parent view should also pass an 'onSelected' method, which will be called with any image chosen
 *      by the user, and the cropping or scaling requested.
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
 */

// Do not define anything here --
//    the first code in the binder
// MUST be the following line:

/*global $, ko */

/*eslint prefer-template:0, strict:0 */

/*exported _fn */

function _fn( Y, NAME ) {
    'use strict';

    //  PRIVATE PROPERTIES

    var
        callWhenSelected,       //  called when user chooses an image
        jqCache,                //  cached jQuery selectors
        ownerCollection,        //  collection top which owner object belongs
        ownerId,                //  database ID of object which owns these images
        label = '',             //  optionally divides the set of attachements into categories

        widthPx = 100,          //  width of destination container
        heightPx = 200,         //  height of destination container
        aspect = -1,
        defaultId = '',         //  default selection, if any
        selectedId = '',        //  currently selected media _id, if any

        previewWidth = 260,     //  Size of preview containers
        previewHeight = 400,    //  Size of Preview containers


        mediaList;              //  set of metadata describing attached media items [array:object]

    //  PRIVATE METHODS

    /**
     *  Render attachments list and attach event handlers1
     *  Assumes mediaList is already populated
     */

    function renderAttachmentsList() {

        var
            defaultExists = false,
            html = '<option value=""></option>',
            i;

        for (i = 0; i < mediaList.length; i++) {
            html = html + '<option value="' + mediaList[i]._id + '">' + mediaList[i].name + '</option>';
            if (mediaList[i]._id === defaultId) {
                defaultExists = true;
            }
        }

        html = '<select id="selImageEmbed" class="form-control">' + html + '</select>';

        jqCache.divSelectImage.html(html);

        jqCache.selImageEmbed = $('#selImageEmbed');
        jqCache.selImageEmbed.off('change.media').on('change.media', function () { onSelectionChanged(); });

        if (true === defaultExists) {
            selectedId = defaultId;
            jqCache.divSelectImage.val(defaultId);
        }

        //  update display with any default image
        onSelectionChanged();
    }

    //  BROWSER AND SERVER IO

    /**
     *  Reload the metadata for attached media from server
     */

    function requestAttachmentsList() {
        Y.log('Loading list of attachments from MediaMojit', 'info', NAME);

        function onMetaLoaded(err, data) {

            if (err) {
                Y.log( 'Could not load attachment metadata: ' + err, 'warn', NAME);
                return;
            }

            //  cache for later
            mediaList = data;

            //  update display
            renderAttachmentsList();
        }

        Y.doccirrus.media.list(ownerCollection, ownerId, label, onMetaLoaded);

    }

    //  EVENT HANDLERS

    function onSelectionChanged() {
        var
            //  always show proviews as .jpg
            imgType = '.IMAGE_JPEG.jpg',
            previewCroppedUrl,
            previewScaledUrl;

        selectedId = jqCache.selImageEmbed.val();
        aspect = ( widthPx / heightPx );
        previewHeight = parseInt( (previewWidth / aspect), 10 );

        previewCroppedUrl = '/media/' + selectedId + '_' + (previewWidth || 300) + 'x' + (previewHeight || 500) + imgType;
        previewScaledUrl = '/media/' + selectedId + '_' + (previewWidth || 300) + 'x-1' + imgType;

        //Y.log('Aspect ratio: ' + aspect + ' widthPx: ' + widthPx + ' heightPx: ' + heightPx, 'debug', NAME);
        //Y.log('previewCropped: ' + previewCropped, 'debug', NAME);
        //Y.log('previewScaled: ' + previewScaled, 'debug', NAME);

        if ('' === selectedId) {
            jqCache.btnClearImage.show();
            jqCache.divPreviewImage.hide();
            return;
        } else {
            jqCache.btnClearImage.hide();
        }

        jqCache.divPreviewCropped.css('width', previewWidth).css('height', previewHeight);
        jqCache.divPreviewScaled.css('width', previewWidth).css('height', previewHeight);

        jqCache.divPreviewCropped.html('<img src="' +  Y.doccirrus.infras.getPrivateURL( previewCroppedUrl ) + '" />');
        jqCache.divPreviewScaled.html('<img src="' + Y.doccirrus.infras.getPrivateURL( previewScaledUrl ) + '" />');

        jqCache.divPreviewImage.show();

    }

    /**
     *  Called when user has chosen to crop the selected image into the bounding box
     */

    function onSelectCroppedClick() {

        var i;

        for (i = 0; i < mediaList.length; i++) {
            if (mediaList[i]._id === selectedId) {
                callWhenSelected(mediaList[i], false);
            }
        }
    }

    /**
     *  Called when user has chosen to scale the selected image into the bounding box
     */

    function onSelectScaledClick() {
        var i;
        for (i = 0; i < mediaList.length; i++) {
            if (mediaList[i]._id === selectedId) {
                callWhenSelected(mediaList[i], true);
            }
        }
    }

    function onClearImageClick() {
        callWhenSelected(null, false);
    }

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            var
                i18n = Y.doccirrus.i18n,
                k;

            Y.log('Registered list_attachments node', 'debug', NAME);

            ownerCollection = 'test';
            ownerId = 'test';

            //  check for media library

            if ((!Y.doccirrus) || (!Y.doccirrus.media)) {
                Y.log('The attachments list view requires Y.doccirrus.media (dcmedia autoloaded YUI module)', 'warn', NAME);
            }

            //  cache some jQuery selectors

            jqCache = {
                'divSelectImage': $('#divSelectImage'),
                'btnSelectCropped': $('#btnSelectCropped'),
                'btnSelectScaled': $('#btnSelectScaled'),
                'btnClearImage': $('#btnClearImage'),
                'divPreviewImage': $('#divPreviewImage'),
                'divPreviewCropped': $('#divPreviewCropped'),
                'divPreviewScaled': $('#divPreviewScaled')
            };

            //  bind selection buttons

            jqCache.btnSelectCropped.off('click.media').on('click.media', function () { onSelectCroppedClick() ;} );
            jqCache.btnSelectScaled.off('click.media').on('click.media', function () { onSelectScaledClick() ;} );
            jqCache.btnClearImage.off('click.media').on('click.media', function () { onClearImageClick() ;} );

            //  read any settings passed by parent binder

            callWhenSelected = function() {
                Y.log('Image selected, no listener set', 'debug', NAME);
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

                if (node.passToBinder.hasOwnProperty('onSelected')) {
                    //Y.log('setting onChange to ' + node.passToBinder.onChange, 'info', NAME);
                    callWhenSelected = node.passToBinder.onSelected;
                }

                if (node.passToBinder.hasOwnProperty('default')) {
                    defaultId = parseInt(node.passToBinder.default, 10);
                }

                if (node.passToBinder.hasOwnProperty('widthPx')) {
                    widthPx = parseInt(node.passToBinder.widthPx, 10);
                }

                if (node.passToBinder.hasOwnProperty('heightPx')) {
                    heightPx = parseInt(node.passToBinder.heightPx, 10);
                }


            }

            //  initialize the display and load attached media
            requestAttachmentsList();

            function EditPagePropertiesVM() {
                var
                    self = this;

                self.btnIsClearI18n = i18n('MediaMojit.img_select.BTN_IS_CLEAR');
                self.btnIsCropI18n = i18n('MediaMojit.img_select.BTN_IS_CROP');
                self.btnIsScaleI18n = i18n('MediaMojit.img_select.BTN_IS_SCALE');
            }

            ko.applyBindings( new EditPagePropertiesVM(), document.querySelector( '#divSelectImageContainer' ) );
        },

        deregisterNode: function( /* node */ ) {
            //  SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //  Commented out because doing so can cause unexpected behavior when reloadeding, can happen in FEM
            //node.destroy();

            Y.log('Unloading media attachments list', 'debug', NAME);

        }
    };
}
