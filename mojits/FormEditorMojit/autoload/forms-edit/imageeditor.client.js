/*
 *  Copyright DocCirrus GmbH 2018
 *
 *  YUI module to render UI for editing image element values
 */

/*eslint prefer-template:0 */
/*global YUI, $, async, ko */

YUI.add(
    /* YUI module name */
    'dcforms-imageeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        var
            //PDF_RESOLUTION_OPTIONS = [ '1', '2', '5' ],
            i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms image types.', 'debug', NAME);

        /**
         *  ViewModel to bind into the image editor (very basic for now)
         *
         *  @param  {Object}    element     'image' type form element
         */

        function ImageElementEditorVM( element ) {
            var self = this;

            self.init = function() {
                //  translated strings
                self.btnChooseImageI18n = i18n('FormEditorMojit.ctrl.BTN_CHOOSE_IMAGE');
                self.btnAttachImageI18n = i18n('FormEditorMojit.el_properties_panel.BTN_ATTACH_IMAGE');
                self.imageClickI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_IMAGE_CLICK');
                self.optEEChooseImageI18n = i18n('FormEditorMojit.el_properties_panel.OPT_EE_CHOOSE_IMAGE');
                self.optEditImageI18n = i18n('FormEditorMojit.el_properties_panel.OPT_EE_EDIT_IMAGE');
                self.printResolutionI18n = i18n('FormEditorMojit.el_properties_panel.LBL_PRINT_RESOLUTION');

                //  label computed
                self.hasDefaultValue = ko.observable( false );
                self.selectedImageLabel = ko.observable( '' );
                self.updateImageLabel();

                //  print resolution observable
                self.printResolution = ko.observable( element.printResolution );
                self.listenPrintResolution = self.printResolution.subscribe( function( newPrintResolution ) {
                    element.setProperty( 'printResolution', parseInt( newPrintResolution, 10 ) );
                } );

                //  image selection / edit mode
                self.selectionMode = ko.observable( element.extra );
                self.listenSelectionMode = self.selectionMode.subscribe( function( newSelectionMode ) {
                    Y.log( 'Changed image check handler behavior: ' + newSelectionMode, 'debug', NAME );
                    element.extra = newSelectionMode;
                    element.page.form.autosave();
                } );
            };

            self.dispose = function() {
                Y.log( 'Cleaning up image editor viewmodel', 'debug', NAME );
                self.listenPrintResolution.dispose();
                self.listenSelectionMode.dispose();
            };

            self.updateImageLabel = function() {
                var
                    currentLang = element.getCurrentLang(),
                    valueCurrentLang = element.defaultValue[ currentLang ];

                self.hasDefaultValue( valueCurrentLang && '' !== valueCurrentLang );
                self.selectedImageLabel( valueCurrentLang + ' [' + currentLang + ']' );
            };

            self.onRequestImage = function() {
                var template = element.page.form;

                element.page.form.raise('requestImage', {
                    'ownerCollection': 'forms',
                    'ownerId': template.canonicalId,
                    'widthPx': element.mm.toScale(template.zoom).width,
                    'heightPx': element.mm.toScale(template.zoom).height,
                    'default': element.defaultValue[element.getCurrentLang()],
                    'onSelected': onImageChosen
                });

                /**
                 *  Called when a picture has been chosen in the image selection modal
                 *
                 *  @param  mediaItem     {Object}      Media metadata object
                 *  @param  fixAspect     {Boolean}     True if image is scaled to container, false if cropped
                 */

                function onImageChosen(mediaItem, fixAspect) {

                    function onImageSet() {
                        //  redraw the form
                        template.render(Y.dcforms.nullCallback);
                    }

                    if (null === mediaItem) {
                        element.defaultValue[element.getCurrentLang()] = '';
                        element.imgCache.clear();
                        element.value = '';
                        element.imgFixAspect = false;
                        element.display = '';
                        element.imgCacheLang = element.getCurrentLang();

                        element.setValue( '', onImageSet );

                    } else {
                        element.defaultValue[element.getCurrentLang()] = mediaItem._id;
                        element.imgCache.clear();
                        element.imgCacheLang = element.getCurrentLang();
                        element.imgFixAspect = fixAspect;
                        element.value = mediaItem._id;
                        element.display = mediaItem.name;

                        element.setValue( mediaItem._id, onImageSet );
                    }

                    //  TODO: fix friendly file name for images
                    self.updateImageLabel();

                    //  TODO: replace legacy modal
                    Y.dcforms.clearModal();
                }
            };

            self.init();
        }

        /**
         *  Subdialog of the element properties, for changing image properties
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Rendering context (edit/fill/renderpdf/etc)
         *  @param  element         {Object}        Form element
         */

        Y.dcforms.elements.imageEditor = function( domId, element ) {
            var
                imageEditorVM,
                isRendered = false;                                     //  eslint-disable-line no-unused-vars

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render( callback ) {
                var
                    panelNode = Y.Node.create( '<div></div>' );

                async.series( [ loadPanelHtml, bindKoVM ], onAllDone );

                function loadPanelHtml( itcb ) {
                    //  clear any existing content
                    $( '#' + domId ).html( '' );
                    isRendered = false;

                    //  load the panel template
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'editor_image',
                        'FormEditorMojit',
                        {},
                        panelNode,
                        onPanelHtmlLoaded
                    );

                    //  add panel template to page
                    function onPanelHtmlLoaded( err ) {
                        if ( err ) { return itcb( err ); }
                        Y.one( '#' + domId ).append( panelNode );
                        itcb( null );
                    }
                }

                function bindKoVM( itcb ) {
                    //  clear any previous KO ViewModel
                    if ( imageEditorVM ) { dispose(); }
                    //  bind a new KO ViewModel into loaded template
                    imageEditorVM = new ImageElementEditorVM( element );
                    ko.applyBindings( imageEditorVM, document.querySelector( '#' + domId ) );
                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem initializing image editor: ' + JSON.stringify( err ), 'warn', NAME );
                        if ( !callback ) { return; }
                        return callback( err );
                    }

                    isRendered = true;
                    if ( !callback ) { return; }
                    callback( null );
                }

            }

            function dispose() {
                if ( !imageEditorVM ) { return; }
                let jqDomElem = $( '#' + domId );
                imageEditorVM.dispose();
                imageEditorVM = null;
                ko.cleanNode( jqDomElem[0] );
                jqDomElem.html( '' );
            }

            //  EVENT HANDLERS

            return {
                'render': render,
                'dispose': dispose,
                'editorVM': imageEditorVM,
                'element': element
            };
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);