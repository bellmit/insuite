/**
 * User: strix
 * Date: 2017-09-21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, $, ko, fabric */
/*eslint prefer-template:0, strict:0 */

'use strict';

YUI.add( 'dceditimagemodal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable();

        function FabricEditorModel( config ) {
            FabricEditorModel.superclass.constructor.call( this, config );
        }

        Y.extend( FabricEditorModel, Disposable, {

            MAX_WIDTH: 1024,
            BORDER_WHITESPACE: 50,

            currentWidth: 660,
            srcWidth: 1,
            srcHeight: 1,

            lastScale: 1,
            lastWidth: 660,

            mediaId: null,
            resetId: null,
            mediaUrl: null,

            //  for saving the image
            ownerCollection: null, //  owner of media when image is saved
            ownerId: null, //  ...

            imgWidth: 10, //  set to real values when image is loaded
            imgHeight: 10, //  ...


            jqCanvas: null, //  jQuery reference to DOM node of canvas
            canvas: null, //  fabric.js canvas wrapper
            bgImg: null, //  fabric.js image

            fillColor: null,
            borderColor: 'white',
            strokeWidth: null,
            showShapeButtons: null,

            showLoadingThrobber: null,
            debugString: null,

            initializer: function (options) {
                var self = this;
                self._initData(options);
            },

            destructor: function () {
                var self = this;

                self.isDrawingMode.destroy();
                self.isDrawingMode = null;
                self.mediaId.destroy();
                self.mediaId = null;
            },

            /**
             *  Request full dataset from server is not available
             */

            _initData: function ___initData(options) {
                var self = this;

                self.showLoadingThrobber = ko.observable(true);
                self.showSaveButton = ko.computed(function () {
                    return !self.showLoadingThrobber();
                });
                self.debugString = ko.observable('debug');

                self.fillColor = ko.observable('#FF0000');
                self.borderColor = ko.observable('black');
                self.strokeWidth = ko.observable('1');
                self.mediaUrl = ko.observable('');
                self.mediaId = ko.observable(options.mediaId);
                self.resetId = ko.observable(options.resetId || '');
                self.isDrawingMode = ko.observable(false);
                self.showShapeButtons = ko.computed(function () {
                    //return !self.isDrawingMode();
                    return true;
                });

                self.ownerCollection = options.ownerCollection;
                self.ownerId = options.ownerId;

                self.getMediaUntainted();

                //  set event handler for save / image creation
                if (options.onImageSaved) {
                    self.onImageSaved = options.onImageSaved;
                }

                //  listen for changes to stroke width dropdown
                self.listForStrokeWidth = self.strokeWidth.subscribe(function (newValue) {
                    if (self.canvas && self.canvas.freeDrawingBrush) {
                        self.canvas.freeDrawingBrush.width = newValue;
                    }
                });
            },

            getMediaUntainted: function __getMediaUntainted() {
                var
                    self = this;

                self.showLoadingThrobber(true);
                Y.doccirrus.jsonrpc.api.media.loadDataURI({
                    mediaId: self.mediaId(),
                    maxWidth: self.currentWidth
                }).then(handleDataURI);

                function handleDataURI(result) {
                    var
                        mediaObj = result.data,
                        imgDom = new Image();

                    if (!mediaObj) {
                        Y.log('Could not load image: ' + JSON.stringify(result), 'debug', NAME);
                        return;
                    }

                    imgDom.onload = onImageInitialized;
                    imgDom.src = mediaObj.dataURI;

                    function onImageInitialized() {
                        var
                            bgProperties = {
                                'left': 0,
                                'top': 0,
                                'angle': 0,
                                'opacity': 1,
                                'selectable': false
                            };

                        self.bgImg = new fabric.Image(imgDom, bgProperties);
                        self.bgImg.originalWidth = imgDom.width;
                        self.bgImg.originalHeight = imgDom.height;
                        self.bgImg.originalAspect = ( imgDom.width / imgDom.height );
                        self.srcWidth = imgDom.width;
                        self.srcHeight = imgDom.height;
                        self.initFabricIfReady();
                    }

                }
            },

            //  initialize the editor when both the modal and the background image are loaded
            initFabricIfReady: function () {
                var
                    self = this,
                    scale;

                if ( !self.bgImg || !self.jqCanvas || !self.jqCanvas[0] ) {
                    Y.log( 'Waiting for editor components...', 'debug', NAME );
                    return;
                }

                scale = ( self.currentWidth / self.bgImg.width );
                self.bgImg.set( { scaleX: scale, scaleY: scale } );

                if (!self.canvas) {
                    self.canvas = new fabric.Canvas( 'cnvImageFabric' );
                } else {
                    self.canvas.clear();
                }

                self.showLoadingThrobber( false );
                self.canvas.add( self.bgImg );
                Y.log( 'Initialized fabric.js image editor.', 'debug', NAME );

                self.resizeToCurrentWidth();
            },

            initColorPicker: function __initColorPicker() {
                var
                    self = this,
                    jqCacheMC = $('#txtFillColor');

                jqCacheMC.minicolors(
                    'create',
                    {
                        'opacity': true,
                        'theme': 'default',
                        'swatchPosition': 'left',
                        'change': onColorChange
                    }
                );

                function onColorChange() {
                    self.fillColor(jqCacheMC.minicolors('rgbaString'));

                    if (self.canvas && self.canvas.freeDrawingBrush) {
                        self.canvas.freeDrawingBrush.color = self.fillColor();
                    }

                    //  attempt to update color of selected object (lines, shapes, etc)
                    if (!self.canvas) {
                        return;
                    }

                    var activeObject = self.canvas.getActiveObject();

                    if (!activeObject) {
                        return;
                    }

                    if (activeObject.fill && activeObject.fill !== 'rgba(0,0,0,0)') {
                        activeObject.fill = self.fillColor();
                    }

                    if (activeObject.stroke) {
                        activeObject.stroke = self.fillColor();
                    }

                    //  invalidate cached canvas before redraw
                    activeObject.dirty = true;
                    self.canvas.renderAll();
                }
            },

            resizeToCurrentWidth: function __resizeToCurrentWidth() {
                var
                    self = this,
                    scale = ( self.currentWidth / self.bgImg.originalWidth ),
                    adjustScale = ( self.currentWidth / self.lastWidth ),
                    objects = self.canvas.getObjects(),
                    i;

                self.canvas.setWidth(self.currentWidth);
                self.canvas.setHeight(self.currentWidth / self.bgImg.originalAspect);

                //self.bgImg.set( { scaleX: scale, scaleY: scale } );

                if (!objects || !objects[0]) {
                    return;
                }

                //  scale adjustment based on answer to
                //  https://stackoverflow.com/questions/30862356/fabric-js-resize-canvas-to-fit-screen

                for (i = 0; i < objects.length; i++) {
                    objects[i].scaleX = objects[i].scaleX * adjustScale;
                    objects[i].scaleY = objects[i].scaleY * adjustScale;
                    objects[i].left = objects[i].left * adjustScale;
                    objects[i].top = objects[i].top * adjustScale;
                    objects[i].setCoords();
                }

                self.canvas.renderAll();
                self.canvas.calcOffset();

                self.lastScale = scale;
                self.lastWidth = self.currentWidth;
            },

            //  EVENT HANDLERS (IO)

            onContainerLoaded: function __onContainerLoaded() {
                var self = this;
                self.jqCanvas = $('#cnvImageFabric');
                self.initColorPicker();
                self.initFabricIfReady();
            },

            onSaveClick: function __onSaveClick() {
                var
                    self = this,
                    dataURI;

                if (!fabric.Canvas.supports('toDataURL')) {
                    Y.log('Browser does not support export of canvas, cannot save.', 'warn', NAME);
                    return;
                }

                self.showLoadingThrobber(true);
                self.currentWidth = self.MAX_WIDTH;
                self.resizeToCurrentWidth();
                dataURI = self.canvas.toDataURL('jpeg');

                //  grey out current image while saving

                Y.doccirrus.jsonrpc.api.media
                    .saveDataURI({
                        'dataURI': dataURI,
                        'ownerCollection': self.ownerCollection,
                        'ownerId': self.ownerId
                    })
                    .then(onSaveComplete)
                    .fail(onSaveErr);

                function onSaveComplete(result) {
                    var data = result.data ? result.data : null;

                    if (data) {
                        self.onImageSaved(data);
                    }

                    if (self.modal) {
                        self.showLoadingThrobber(false);
                        self.modal.close();
                    }
                }

                function onSaveErr(err) {
                    Y.log('Could not save dataURI: ' + JSON.stringify(err), 'warn', NAME);
                }
            },

            //  EVENT HANDLERS (Canvas)

            onClearClick: function __onClearClick() {
                var self = this;

                if (!self.resetId || '' === self.resetId()) {
                    self.canvas.clear();
                    if (self.bgImg) {
                        self.canvas.add(self.bgImg);
                    }
                    return;
                }

                self.mediaId(self.resetId());
                self.getMediaUntainted();
            },

            onArrowClick: function __onArraowClick() {
                // create an arrow path
                var
                    self = this,
                    path = new fabric.Path(
                        'M 4 0 ' +
                        'L 28 24 ' +
                        'L 28 16 ' +
                        'L 32 16 ' +
                        'L 32 32 ' +
                        'L 16 32 ' +
                        'L 16 28 ' +
                        'L 24 28 ' +
                        'L 0 4 ' +
                        'z'
                    );

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                //  add arrow path
                path.set({left: 40, top: 40, fill: self.fillColor()});
                self.canvas.add(path);
            },

            onCrossClick: function __onCrossClick() {
                // create an X path
                var
                    self = this,
                    path = new fabric.Path(
                        'M 4 0 ' +
                        'L 16 12 ' +
                        'L 28 0 ' +
                        'L 32 4 ' +
                        'L 20 16 ' +
                        'L 32 28 ' +
                        'L 28 32 ' +
                        'L 16 20 ' +
                        'L 4 32 ' +
                        'L 0 28 ' +
                        'L 12 16 ' +
                        'L 0 4 ' +
                        'z'
                    );

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                //  add X path
                path.set({left: 40, top: 40, fill: self.fillColor()});
                self.canvas.add(path);
            },

            onCircleClick: function __onCircleClick() {
                var
                    self = this,
                    circle = new fabric.Circle({
                        radius: 16,
                        fill: 'rgba(0,0,0,0)',
                        stroke: self.fillColor(),
                        left: 40,
                        top: 40
                    });

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                // "add" rectangle onto canvas
                self.canvas.add(circle);
            },

            onBoxClick: function __onBoxClick() {

                var
                    self = this,
                    rect = new fabric.Rect({
                        left: 40,
                        top: 40,
                        fill: 'rgba(0,0,0,0)',
                        stroke: self.fillColor(),
                        width: 32,
                        height: 32
                    });

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                // "add" rectangle onto canvas
                self.canvas.add(rect);
            },

            /**
             *  Repurposed to toggle fill color, MOJ-9005
             */

            onFilledBoxClick: function __onBoxClick() {

                var
                    self = this,
                    activeObject = self.canvas.getActiveObject();

                if (!activeObject) {
                    return;
                }

                if (activeObject.fill && activeObject.fill === 'rgba(0,0,0,0)') {
                    if ( activeObject.stroke && activeObject.stroke !== 'rgba(0,0,0,0)' ) {
                        activeObject.fill = activeObject.stroke;
                    }
                } else {
                    activeObject.fill = 'rgba(0,0,0,0)';
                }

                //  invalidate cached canvas before redraw
                activeObject.dirty = true;
                self.canvas.renderAll();


                /*
                var
                    self = this,
                    rect = new fabric.Rect({
                        left: 40,
                        top: 40,
                        fill: self.fillColor(),
                        stroke: self.fillColor(),
                        width: 32,
                        height: 32
                    });

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                // "add" rectangle onto canvas
                self.canvas.add(rect);

                */
            },


            onPencilClick: function __onPencilClick() {
                var
                    self = this;

                self.isDrawingMode(true);
                self.canvas.set({
                    'isDrawingMode': self.isDrawingMode(),
                    'fill': self.fillColor(),
                    'stroke': self.fillColor()
                });

                if (self.canvas.freeDrawingBrush) {
                    self.canvas.freeDrawingBrush.color = self.fillColor();
                    self.canvas.freeDrawingBrush.width = parseFloat(self.strokeWidth());
                }
            },

            //  to be replaced with function passed in options
            onImageSaved: function () {
                Y.log('No event handler set for media creation.', 'warn', NAME);
            },

            onResizeModal: function (evt) {
                var
                    self = this,
                    pxWidth = evt.info.offsetWidth,
                    pxHeight = evt.info.offsetHeight;

                //  do not resize while loading or saving
                if (self.showLoadingThrobber()) {
                    return;
                }

                self.debugString(pxWidth + 'x' + pxHeight);
                //Y.log( 'Setting canvas currentWidth: ' + ( pxWidth - 30 ), 'debug', NAME );
                self.currentWidth = ( pxWidth - self.BORDER_WHITESPACE );
                self.resizeToCurrentWidth();
            },

            onDeleteClick: function () {
                var
                    self = this,
                    activeObject = self.canvas.getActiveObject();

                if (!activeObject) {
                    return;
                }

                self.canvas.remove(activeObject);
            },

            onTextClick: function () {
                var self = this;

                //  disable free drawing
                self.isDrawingMode(false);
                self.canvas.set({'isDrawingMode': self.isDrawingMode()});

                Y.doccirrus.DCWindow.prompt({
                    'title': i18n('MediaMojit.img_fabric.ADD_TEXT'),
                    'callback': onTextAvailable
                });

                function onTextAvailable(result) {
                    //  only add text entry if available
                    if (!result || !result.data || '' === result.data) {
                        return;
                    }

                    var textObj = new fabric.Text(result.data);

                    textObj.set({
                        left: 40,
                        top: 40,
                        fill: self.fillColor(),
                        width: 32,
                        height: 32,
                        fontFamily: 'Helvetica',
                        fontSize: 20,
                        hasControls: true
                    });

                    self.canvas.add(textObj);
                }

            },

            onTestClick: function () {
                Y.log('Test button for development', 'debug', NAME);
            }
        } );

        /**
         *  Instantiate the editor
         *
         *  @param  {Object}    options
         *  @param  {Object}
         */

        function showEditImageModal( options ) {
            var
                modal,

                node = Y.Node.create( '<div id="divModalFabricEditor"></div>' ),
                bindings = new FabricEditorModel( options ),

                btnMaximize = {
                    label: '',
                    name: 'maximize',
                    value: 'maximize',
                    section: 'header',
                    template: '<button type="button" />',
                    classNames: 'glyphicon glyphicon-chevron-up close',
                    action: onMaximizeClick
                },

                windowDefinition = {
                    className: 'DCWindow-Resize',
                    bodyContent: node,
                    title: i18n( 'MediaMojit.img_fabric.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: true,
                    resizeable: true,
                    width: 710,
                    height: 550,
                    render: document.body,
                    buttons: {
                        header: ['close', btnMaximize ],
                        footer: [ ]
                    },
                    after: {
                        destroy: function () {
                            if (node) {
                                node.destroy();
                            }
                        }
                    }
                };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'img_fabric',
                'MediaMojit',
                {},
                node,
                onViewLoaded
            );

            function onViewLoaded( err ) {
                if ( err ) {
                    Y.log( 'Problem creating image editor modal: ' + JSON.stringify( err ), 'warn', NAME );
                }

                modal = new Y.doccirrus.DCWindow( windowDefinition );
                bindings.modal = modal;
                bindings.btnClearI18n = i18n("MediaMojit.img_fabric.BTN_CLEAR");
                bindings.btnSaveI18n = i18n("MediaMojit.img_fabric.BTN_SAVE");
                ko.applyBindings( bindings, node.getDOMNode() );

                Y.log( 'Fabric editor window created.', 'debug', NAME );
                bindings.onContainerLoaded();

                modal.resize.on( 'resize:resize', function ( evt ) { bindings.onResizeModal( evt ); } );
            }

            //  custom maximize button to allow resize of contents
            function onMaximizeClick() {
                var rM = modal.resizeMaximized;
                if( rM ) {
                    rM.set( 'maximized', !rM.get( 'maximized' ) );

                    if ( rM.get( 'maximized' ) ) {
                        //  set width to new static, maximized state
                        bindings.currentWidth = ( modal.bodyNode.get( 'offsetWidth' ) - bindings.BORDER_WHITESPACE );
                        bindings.resizeToCurrentWidth();
                    } else {
                        //  set width to previous resizable state
                        bindings.currentWidth = ( rM._lastRegion.width - bindings.BORDER_WHITESPACE );
                        bindings.resizeToCurrentWidth();
                    }

                }
            }

        }

        Y.namespace( 'doccirrus.modals' ).editImageFabric = {
            show: showEditImageModal
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcmedia',
            'resize'
        ]
    }
);