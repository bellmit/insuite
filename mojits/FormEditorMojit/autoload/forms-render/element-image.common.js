/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render image elements and handle some of their UI events
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-image',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        var i18n = Y.doccirrus.i18n;

        Y.log('Adding renderer for dcforms image type.', 'debug', NAME);

        /**
         *  Factory method for input element renderers - these make the actual DOM elements representing an element
         *
         *  Image elements have a single subelement and so cannot be split across pages
         *
         *  Roadmap:
         *
         *   (*) move the image cache to this element or a central location on dcForms
         *   (*) allow user upload of images from device camera or disk (on click or keyboard select)
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeImageRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                lastMode = '',
                isInitialized = false,
                subElemBg,
                subElemImg,
                subElemInt,
                pubMethods;

            //  Check that elements has an image cache

            if (!element.imgCache) {
                //  on server the user is needed to access media collection in database
                //  on patient portal patientRegId allows loading of images through PUC proxy
                element.imgCache = Y.dcforms.createImageCache(element.page.form.user, element.page.form.patientRegId);
            }

            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {
                if ( Y.dcforms.usePackage ) {
                    //  if we are in the captive form portal then the media API is unavailable
                    element.readonly = true;
                }

                generateSubElements();
                isInitialized = true;
            }

            /**
             *  Create or refresh the set of subelements necessary to draw and interact with this image this image
             */

            function generateSubElements() {
                var
                //  TODO: translateme
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    label = i18n( 'FormEditorMojit.generic.LBL_ADD_IMAGE' ),
                    labelSubElements,
                    imgAspect,
                    i;

                //  element may not be visible on BFB forms depending on client certification
                if ( element.isHiddenBFB ) {
                    element.subElements = [];
                    return;
                }

                //  create background rect if not already done (bg color, border, placeholder)
                if (!subElemBg) {
                    subElemBg = Y.dcforms.createSubElement(
                        0,                                              //  relative to element
                        0,                                              //  relative to element
                        element.mm.width,
                        element.mm.height,
                        '',
                        null
                    );

                    subElemBg.noncontent = true;                        //  visible to events
                    subElemBg.nopdf = true;                             //  not added to PDF
                }

                subElemBg.width = element.mm.width;
                subElemBg.height = element.mm.height;
                subElemBg.bgColor = element.bgColor;                    //  element background
                subElemBg.borderColor = element.borderColor;            //  element boarder

                //  create image subelement if not already done
                if (!subElemImg) {
                    subElemImg = Y.dcforms.createSubElement(
                        0,                                              //  relative to element
                        0,                                              //  relative to element
                        element.mm.width,
                        element.mm.height,
                        '',
                        null
                    );
                }

                subElemImg.width = element.mm.width;
                subElemImg.height = element.mm.height;
                subElemImg.printResolution = element.printResolution;

                //  resize image subelement to match content, if editable and fixed aspect MOJ-7819
                if ( !element.readonly && element.imgFixAspect && subElemImg.img && subElemImg.img.height ) {
                    imgAspect = ( subElemImg.img.width / subElemImg.img.height );
                    subElemImg.height = ( element.mm.width / imgAspect );
                }

                //  add image rects
                element.subElements = [];
                element.subElements.push(subElemBg);
                element.subElements.push(subElemImg);

                //  add a label if the image input is editable and image has not been changed from default
                if (
                    true === element.canEdit() &&
                    false === element.readonly &&
                    'pdf' !== element.page.form.mode &&
                    (
                        !element.value ||
                        '' === element.value ||
                        element.value === element.defaultValue.de ||
                        element.value === element.defaultValue.en
                    )
                ) {

                    labelSubElements = Y.dcforms.markdownToSubElements(
                        label,                                      //  markdown text
                        element.font,                               //  typeface name
                        element.mm.lineHeight,                      //  line height
                        parseFloat(element.mm.lineSpace),           //  leading factor
                        0,                                          //  x offset (mm)
                        0,                                          //  y offset (mm)
                        element.align,                              //  text alignment (left / right / center)
                        element.mm.width,                           //  wrapping width (mm)
                        element.isBold,                             //  make bold
                        element.isItalic,                           //  make italic
                        element.isUnderline                         //  make underlined
                    );

                    for (i = 0; i < labelSubElements.length; i++) {
                        labelSubElements[i].lineHeight = labelSubElements[i].lineHeight;
                        labelSubElements[i].cursor = useCursor;
                        labelSubElements[i].fgColor = element.fgColor;            //  transparent: element above colors background
                        labelSubElements[i].bgColor = 'rgba(0,0,0,0.0)';          //  transparent: element above colors background
                        labelSubElements[i].align = element.align || 'left';
                        labelSubElements[i].nopdf = true;                         //  not added to PDF

                        if (element.clipOverflow) {
                            //  elements are given +1 mm to prevent slight rendering variations from dropping lines
                            if ((labelSubElements[i].top + labelSubElements[i].height) < (element.mm.height + 1)) {
                                element.subElements.push(labelSubElements[i]);
                            }
                        } else {
                            element.subElements.push(labelSubElements[i]);
                        }
                    }
                }

                //  create interaction subelement, if on client and does not already exist
                if ( !Y.dcforms.isOnServer ) {
                    //  create interaction subelement if not already done (click catcher)
                    if (!subElemInt) {
                        subElemInt = Y.dcforms.createSubElement(
                            0,                                              //  relative to element
                            0,                                              //  relative to element
                            element.mm.width,
                            element.mm.height,
                            '',
                            null
                        );

                        subElemInt.noncontent = true;                        //  visible to events
                        subElemInt.bindmark = true;                          //  show binding
                        subElemInt.nopdf = true;                             //  not added to PDF
                    }

                    subElemInt.width = element.mm.width;
                    subElemInt.height = element.mm.height;
                    subElemInt.hasError = !isValid();
                    subElemInt.interactive = true;
                    element.subElements.push( subElemInt );
                }
            }

            /**
             *  Paint this image on the abstract canvas
             *
             *  Unlike most elements, the image element need to be aware of drag mode on render, since resize mouse
             *  events could cause a large number of image transforms to be requested from the server.
             *
             *  @param  newValue    {String}    Database _id of a media object
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue(newValue, callback) {

                //console.log('settimg image value: ', newValue)
                //console.log('call stack: ', (new Error().stack));

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    generateSubElements();
                    callback(null);
                    return;
                }

                //  element dimensions in canvas pixels
                var
                    px = element.mm.toScale(element.page.form.zoom),
                    useHeight = element.imgFixAspect ? -1 : px.height;

                if (!isInitialized) {
                    initialize();
                }

                if (newValue !== element.value) {
                    element.isDirty = true;
                }

                element.value = newValue;
                subElemImg.imgId = element.value + '';
                subElemImg.imgFixed = element.imgFixAspect;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.getCurrentLang()] = newValue;
                }

                //  check if image has been cleared
                if ( !newValue || '' === newValue ) {
                    Y.log( 'Cleared image element value: ' + element.elemId, 'debug', NAME );
                    element.imgCache.clear();
                    subElemImg.img = '';
                    subElemImg.hash = '';
                    generateSubElements();
                    callback(null);
                    return;
                }

                if (!element.imgCache) {
                    //  on server we need the user to access database
                    //  on client we need patientregid to use PUC proxy
                    element.imgCache = Y.dcforms.createImageCache(element.page.form.user, element.page.form.patientRegId);
                }

                element.isDirty = true;
                element.imgCache.check(
                    newValue,
                    element.getBestLang(),
                    px.width, useHeight,
                    onCacheCheck
                );

                function onCacheCheck( err ) {

                    if ( err ) {
                        Y.log( 'Error checking image cache: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite error
                    }

                    subElemImg.img = element.imgCache.imgObj;
                    subElemImg.imgFixed = element.imgFixAspect;
                    subElemImg.hash = '';   //  void subelement level cache
                    element.isDirty = true;

                    if ( element.defaultValue[element.getCurrentLang()] !== newValue ) {
                        Y.log( 'User / non-default image set: ' + newValue + ' default: ' + element.defaultValue.de, 'debug', NAME );
                        if ( element.page.form.isRendered ) {
                            generateSubElements();
                            element.page.redrawDirty();
                        }
                    }

                    callback(err);
                }
            }

            function getValue() {
                return element.value;
            }

            /**
             *  This element type no longer has mode-specific behavior
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                if ('shutdown' === newMode) {
                    destroy();
                }
                //  in PDF mode we need to remove the label
                generateSubElements();
                callback(null);
            }

            /**
             *  Set a value according to schema binding
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map(newValue, callback) {
                element.value = newValue;
                setValue(newValue, callback);
            }

            /**
             *  Get value for schema binding
             */

            function unmap() {
                return element.value;
            }

            /**
             *  Called before unlinking this renderer
             */

            function destroy() {
                if ( Y.dcforms.isOnServer ) { return; }
                var jqMe = element.jqSelf();
                jqMe.html('');
            }

            function setUserImage(selectedOn) {

                if (!element.canEdit() || element.isHiddenBFB || 'edit' === lastMode || 'pdf' === lastMode) {
                    Y.log( 'Cannot edit this image in current context: ' + selectedOn, 'info', NAME );
                    return;
                }

                function onValueSet(err) {
                    if (err) {
                        Y.log( 'Could not set user image as element value: ' + JSON.stringify(err), 'warn', NAME );
                        //  continue anyway, render element background color
                    }
                    element.isDirty = true;
                    element.page.form.raise('valueChanged', element);
                    element.page.redraw();
                }

                function onImageChanged( currentImg ) {
                    if( Y.config.debug ) {
                        Y.log( 'User changed changed form image: ' + JSON.stringify(currentImg), 'debug', NAME );
                    }

                    if (!currentImg || '' === currentImg._id) {
                        //  image has been cleared, deleted or is invalid, use default from form element
                        currentImg = { '_id': element.defaultValue[element.getCurrentLang()], isDefault: true };
                    }

                    if (element.value !== currentImg._id) {
                        element.value = currentImg._id;
                        setValue(element.value, onValueSet);

                        if ( currentImg.isDefault && true === currentImg.isDefault ) {
                            //  do not attach a document for the form default image
                            return;
                        }

                        element.page.form.raise('addUserImage', {
                            'ownerCollection': element.page.form.ownerCollection,
                            'ownerId': element.page.form.ownerId,
                            'mediaId': currentImg._id,
                            'newMedia': currentImg
                        });

                    }
                }

                function onDialogLoaded() {
                    Y.log('CALLBACK: loaded image change dialog', 'debug', NAME);
                }

                function onModalReady() {
                    //var formNode = myNode.one('#divEditForm');
                    var imgDialogNode = Y.one('#divImgChange');

                    imgDialogNode.passToBinder = {
                        'ownerCollection': element.page.form.ownerCollection,
                        'ownerId': element.page.form.ownerId,
                        'label': 'user',
                        'patientRegId': element.page.form.patientRegId || '',
                        'currentValue': element.value,
                        'defaultValue': element.defaultValue[ element.getCurrentlang() ],
                        'keepOld': true,
                        'onChange': onImageChanged
                    };

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'img_edit_form',
                        'MediaMojit',
                        {},
                        imgDialogNode,
                        onDialogLoaded
                    );
                }

                //  TRANSLATEME
                Y.doccirrus.comctl.setModal('Bild mit Auswahl', '<div id="divImgChange"></div>', true, null, onModalReady);

            }

            /**
             *  Which canvas this was selected on should not matter to this element type
             *  @param selectedOn
             */

            function createValueEditor( selectedOn ) {
                var form = element.page.form;

                if ( Y.dcforms.usePackage ) {
                    //  if we are in the captive form portal then media APIS are not available, we can't set
                    //  user images or change media
                    return;
                }

                if ( 'edit' === element.page.form.mode ) {
                    //  don't open the image selection modal on click, it will be available in the element properties
                    return;
                }

                /*
                if ('edit' !== element.page.form.mode) {
                    setUserImage(selectedOn);
                    return;
                }
                */

                Y.log('Creating image selection modal from: ' + selectedOn, 'debug', NAME);

                function onSetValue() {
                    element.page.form.raise('valueChanged', element);

                    //  there is a strange bug on chrome where image load from dataUri can call back synchronously but
                    //  not be immediately ready to blit onto canvas, giving it a half second seems to let it catch up
                    //  with itself

                    Y.log('Changed image to: ' + element.value, 'info', NAME);
                    element.isDirty = true;
                    window.setTimeout(function() { element.page.redraw(); }, 500);
                }

                function onImageSelected( media, fixedAspect ) {
                    var newValue = media && media._id ? media._id : '';
                    element.imgCache.clear();

                    if ( !media || !media._id || '' === media._id ) {
                        //  allows user images to bump text beneath them according to aspect
                        element.imgFixAspect = !element.readonly;
                        element.setValue( '', onSetValue );
                        Y.doccirrus.comctl.clearModal();
                        return;
                    }

                    element.imgFixAspect = fixedAspect;
                    element.setValue( newValue, onSetValue );
                    Y.doccirrus.comctl.clearModal();
                }

                element.page.form.raise('requestImage', {
                    'ownerCollection': form.ownerCollection,
                    'ownerId': form.ownerId,
                    'widthPx': element.mm.width,
                    'heightPx': element.mm.height,
                    'currentValue': element.value,
                    'defaultValue': element.defaultValue[ element.getBestLang() ],
                    'fixAspect': element.imgFixAspect,
                    'behavior': element.extra,
                    'onSelected': onImageSelected
                });

            }

            /**
             *  Update this element's representation in edit mode before re-render
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function update( callback ) {

                if (!callback) {
                    Y.log('Missing callback to update() on image element: ' + (new Error().stack), 'warn', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback( null );
                    return;
                }

                if (0 === element.subElements.length) {
                    initialize();
                }

                //  used in PDF rendering
                subElemImg.imgId = element.value + '';
                subElemImg.imgFixed = element.imgFixAspect;

                setValue(element.value, onValueSet);

                function onValueSet() {
                    generateSubElements();
                    callback( null );
                }
            }

            /**
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( '' === element.value.trim() ) { return false; }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            pubMethods = {
                'createValueEditor': createValueEditor,
                'setUserImage': setUserImage,               //  alternate value editor
                'setValue': setValue,
                'update': update,
                'getValue': getValue,
                'setMode': setMode,
                'destroy': destroy,
                'map': map,
                'unmap': unmap
            };

            creationCallback( null, pubMethods );
        };


    },  //  end module function

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
