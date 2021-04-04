/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render basic single line text input elements and attach element-specific events
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-barcode',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms barcode type.', 'debug', NAME);

        Y.dcforms.barcodeTypes = [
            "ean2",
            "ean5",
            "ean8",
            "upca",
            "upce",
        //  "isbn",  <-- crashes on start
        //  "ismn",  <-- crashes on start
        //  "issm",  <-- crashes on start
            "code128",
            "gs1-128",
            "ean13",
            "sscc18",
            "code39",
            "code39ext",
            "code32",
            "pzn",
            "code93",
            "code93ext",
            "interleaved2of5",
            "itf14",
            "identcode",
            "leitcode",
            "databaromni",
            "databarstacked",
            "databarstackedomni",
            "databartruncated",
            "databarlimited",
            "databarexpanded",
            "databarexpandedstacked",
            "pharmacode",
            "pharmacode2",
            "code2of5",
            "code11",
            "bc412",
            "rationalizedCodabar",
            "onecode",
            "postnet",
            "planet",
            "royalmail",
            "auspost",
            "kix",
            "japanpost",
            "msi",
            "plessey",
            "telepen",
            "posicode",
            "codablockf",
            "code16k",
            "code49",
            "channelcode",
            "flattermarken",
            "raw",
            "daft",
            "symbol",
            "pdf417",
            "micropdf417",
            "datamatrix",
            "qrcode",
            "maxicode",
            "azteccode",
            "codeone",
            "gs1-cc",
            "ean13composite",
            "ean8composite",
            "upcacomposite",
            "upcecomposite",
            "databaromnicomposite",
            "databarstackedcomposite",
            "databarstackedomnicomposite",
            "databartruncatedcomposite",
            "databarlimitedcomposite",
            "databarexpandedcomposite",
            "databarexpandedstackedcomposite",
            "gs1-128composite",
            "gs1datamatrix",
            "hibccode39",
            "hibccode128",
            "hibcdatamatrix",
            "hibcpdf417",
            "hibcmicropdf417",
            "hibcqrcode",
            "hibccodablockf"
        ];

        /**
         *  Render a barcode element into onto canvas or PDF
         *
         *  @param  element             {object}    A dcforms-element
         *  @param  creationCallback    {Function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeBarcodeRenderer = function(element, creationCallback) {
            var
                isMapping = false,
                isInitialized = false,
                isRendered = false,
                isDownloading = false,
                isOutOfSync = false,
                barcodeUrl = '',
                loadedUrl ='',
                barcodeImg = null,
                pubMethods,
                subElemBg,
                subElemImg;
            
            function initialize() {

                //  subelement to capture clicks in editor
                subElemBg = Y.dcforms.createSubElement(
                    0,                                          //  relative to element (parent)
                    0,                                          //  relative to element (parent)
                    element.mm.width,
                    element.mm.height,
                    '',
                    null
                );

                subElemBg.bindmark = true;                     //  show binding
                subElemBg.noncontent = true;                   //  allow size reduction
                subElemBg.interactive = true;
                subElemBg.bindmark = true;

                element.subElements = [];
                element.subElements[0] = subElemBg;

                //  subelement to capture clicks in editor
                subElemImg = Y.dcforms.createSubElement(
                    0,                                          //  relative to element (parent)
                    0,                                          //  relative to element (parent)
                    element.mm.width,
                    element.mm.height,
                    '',
                    null
                );

                subElemImg.imgFixed = true;
                element.subElements[1] = subElemImg;
                element.page.form.hasBarcode = true;
                isInitialized = true;
            }

            function setValue(newValue, callback) {

                //Y.log('Setting barcode value to: ' + newValue + "\n" + Y.dcforms.tidyStackTrace(new Error().stack), 'debug', NAME);
                Y.log( 'Setting barcode value to: ' + newValue + "\n", 'debug', NAME );

                if (!element.display || element.display === '') {
                    element.display = 'pdf417';
                }

                if (!element.extra || '' === element.extra) {
                    if ('pdf417' === element.display) {
                        element.extra = 'columns=7 eclevel=4';
                    }
                }

                var
                    safeValue = newValue,
                    px = element.mm.toScale(element.page.form.zoom),
                    bcWidth = (px.width > 10 ? px.width : 10);

                if (element.value !== safeValue) {
                    //Y.log('Setting barcode element value to: ' + newValue + "\n" + Y.dcforms.tidyStackTrace(new Error().stack) + "\n\n" + 'element value: ' + element.value, 'debug', NAME);

                    element.isDirty = true;
                    element.value = newValue;

                    if (subElemImg) {
                        subElemImg.barcode = safeValue;
                        subElemImg.hash = '';  // clear cache
                    }

                    if (false === isMapping) {
                        element.page.form.raise('valueChanged', element);
                    }
                }

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }

                barcodeUrl = '/barcode/' +
                    '?type=' + element.display +            //  barcode renderer cannot handle empty strings
                    '&code=' + (('' === safeValue) ? '0' : encodeURIComponent(newValue)) +
                    '&extra=' + (encodeURIComponent(element.extra)) +
                    '&width=' + parseInt(bcWidth, 10) +
                    '&height=-1'; // + parseInt(bcHeight, 10);

                subElemBg.width = element.mm.width;
                subElemBg.height = element.mm.height;

                subElemBg.bgColor = element.bgColor;

                if (Y.dcforms.isOnServer) {
                    updateBarcodeImageServer(onImageLoaded);
                } else {
                    barcodeUrl = Y.doccirrus.infras.getPrivateURL( barcodeUrl );

                    if ('pdf' === element.page.form.mode) {

                        //  record current rendering settings on the subelement for re-use in PDF rendering
                        subElemImg.img = null;
                        subElemImg.barcode = safeValue;
                        subElemImg.barcodeType = element.display? element.display : 'pdf417';
                        subElemImg.barcodeExtra = element.extra ? element.extra : '';
                        subElemImg.width = element.mm.width;
                        subElemImg.hash = '';   //  void subelement level cache

                        subElemBg.bgColor = 'rgba(128, 128, 128, 0.8)';
                        subElemBg.nopdf = true;

                        element.isDirty = true;
                        return callback(null);
                    } else {
                        updateBarcodeImageClient(onImageLoaded);
                    }

                }

                function onImageLoaded(err) {
                    if (err) {
                        Y.log( 'Error generating barcode: ' + JSON.stringify( err ), 'warn', NAME );
                        callback(err);
                        return;
                    }

                    var aspect;

                    if (!barcodeImg || !safeValue || '' === safeValue) {
                        if (!Y.dcforms.isOnServer) {
                            //  no barcode set, nothing to do
                            callback(null);
                            return;
                        }
                    }

                    //  record current rendering settings on the subelement for re-use in PDF rendering
                    subElemImg.img = barcodeImg;
                    subElemImg.barcode = safeValue;
                    subElemImg.barcodeType = element.display? element.display : 'pdf417';
                    subElemImg.barcodeExtra = element.extra ? element.extra : '';
                    subElemImg.width = element.mm.width;
                    subElemImg.hash = '';   //  void subelement level cache

                    if (subElemImg.img) {

                        /*
                        if ('pdf417' === element.display) {
                            //  we need to change the default aspect ratio of these to meet our standard
                            aspect = subElemImg.img.width / (subElemImg.img.height * (2 / 3));
                        } else {
                            aspect = subElemImg.img.width / subElemImg.img.height;
                        }
                        */
                        aspect = subElemImg.img.width / subElemImg.img.height;

                        //Y.log('Barcode subelement image created, setting aspect ' + aspect, 'debug', NAME);
                        subElemImg.height = element.mm.width / aspect;

                        if (subElemImg.height > element.mm.height) {
                            //  prevent barcodes from creating content overflow as text does
                            element.mm.height = subElemImg.height;
                        }

                    } else {
                        subElemImg.height = element.mm.height;
                    }

                    if (element.page.form.valueEditor && element.page.form.selectedElement && element.page.form.selectedElement === element) {
                        // updating the value editor here can cause feedback or dropped characters while typing.
                        //element.page.form.valueEditor.setValue(newValue);
                        element.page.form.valueEditor.reposition();
                    }

                    element.isDirty = true;

                    if ( !Y.dcforms.isOnServer && element.page.form.isInDOM ) {
                        redrawOnCanvas();
                    }

                    callback(null);
                }
            }

            /**
             *  Reload the barcode image from the server if the URL has changed
             *  @param callback
             */

            function updateBarcodeImageClient(callback) {

                if (!callback) {
                    Y.log('Missing callback to updateBarcodeImageClient() on barcode element: ' + (new Error().stack), 'warn', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                //  not ready
                if (!isInitialized) {
                    return callback( null );
                }

                //  already downloading an image
                if ( isDownloading ) {
                    isOutOfSync = true;
                }

                //  the barcode URL is created by calls to setValue, don't reload if this hasn't changed
                if (barcodeUrl === loadedUrl) { return callback(null); }

                var calledBack = false;

                function callbackOnce( err, label ) {

                    Y.log( 'barcode complete, callback label is: ' + label, 'debug', NAME );

                    if (true === calledBack) {
                        Y.log('Duplicate callback on barcode load', 'warn', NAME);
                        return;
                    }

                    calledBack = true;
                    isDownloading = false;

                    // value changed while downloading
                    if ( isOutOfSync ) {
                        isOutOfSync = false;
                        return updateBarcodeImageClient( callback );
                    }

                    return callback( err );
                }

                //  creation success on client
                function onBarcodeLoaded() {

                    if (barcodeImg && barcodeImg.width) {
                        subElemImg.img = barcodeImg;
                        element.isDirty = true;
                        loadedUrl = barcodeUrl;
                    }

                    callbackOnce( null, '(asynchronous) onBarcodeLoaded' );
                }

                //  creation error on client
                function onBarcodeError( err ) {
                    Y.log( 'Error loading barcode: ' + JSON.stringify( err ), 'warn', NAME );
                    callbackOnce( null, '(asynchronous) error' );
                }

                isDownloading = true;

                barcodeImg = new Image();

                barcodeImg.addEventListener( 'load', onBarcodeLoaded );
                barcodeImg.addEventListener( 'error', onBarcodeError );

                //barcodeImg.onload = onBarcodeLoaded;
                //barcodeImg.onerror = onBarcodeError;

                barcodeImg.src = barcodeUrl;

                //  in some browsers and circumstances the image load may be synchronous
                if ( barcodeImg.complete ) { callbackOnce( null, '(synchronous)' ); }
            }

            function updateBarcodeImageServer(callback) {

                Y.log( 'Barcode element rendering on server, skipping actual barcode generation' , 'debug', NAME);

                if (!callback) {
                    Y.log('Missing callback to updateBarcodeImageServer() on barcode element: ' + (new Error().stack), 'warn', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                //  not ready
                if (!isInitialized) { return callback( null ); }

                //  the barcode URL is created by calls to setValue, used here to check for changes
                if (barcodeUrl === loadedUrl) { return callback( null ); }

                //  - do not actually generate barcode - HPDF.js will do that at paper scale
                callback( null );
            }

            /**
             *  Just return current value of the barcode
             *  returns {String}
             */

            function getValue() {
                return element.value;
            }

            function destroy() {
                barcodeImg = null;
            }

            /**
             *  Mapping does not have special significance in this element type
             *
             *  @param  newValue    {String}
             *  @param  callback    {String}
             */

            function map(newValue, callback) {
                isMapping = true;
                //Y.log('Mapping barcode: ' + newValue, 'debug', NAME);
                setValue(newValue, callback);
                isMapping = false;
            }

            function unmap() {
                return element.value;
            }

            /**
             *  Stub: this element type does not behave differently in different modes
             *
             *  @param  newMode     {String}    Form mode name
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                if ('shutdown' === newMode) {
                    Y.log('destroying barcode on shutdown mode', 'debug', NAME);
                    destroy();
                }
                setValue(getValue(), callback);
                //callback(null);
            }

            /**
             *  Show the text edit flyover
             *
             *  Could presumably have some other kinds of editor in future
             *
             *  @param selectedOn
             */

            function createValueEditor(selectedOn){
                function onValueSet() {
                    //alert('barcode value set from editor');
                    element.page.form.raise('valueChanged', element);
                    redrawOnCanvas();
                }

                function onChange(newValue) {
                    element.page.isDirty = true;
                    setValue(newValue, onValueSet);
                }

                if ('locked' === element.page.form.mode) {
                    return;
                }

                element.page.form.valueEditor = Y.dcforms.createTextValueEditor(selectedOn, element, onChange);
            }

            function redrawOnCanvas() {
                //  don't try to draw it until form is ready
                if (false === element.page.form.isLoaded) { return; }

                //  on first render do a full redraw to set subelement offsets
                if ( !isRendered || Y.dcforms.isOnServer ) {
                    element.isDirty = true;
                    element.page.redraw();
                    isRendered = true;
                    return;
                }

                //  on subsequent renders, update/re-use calculated position and re-blit the barcode image
                var
                    pageIdx = subElemImg.pageTop,
                    cnv = element.page.canvasses[ pageIdx ].text,
                    ctx = cnv.getContext( '2d' );

                subElemImg.renderToCanvas(
                    ctx,
                    element.page.form.zoom,
                    element.mm.left,
                    subElemImg.fixedTop,
                    0,
                    true,
                    'fixed'
                );
            }

            /**
             *  Reset the barcode image and subelements
             */

            function update(callback) {

                if (!callback) {
                    Y.log('Callback not passed to barcode update(): ' + (new Error().stack), 'warn', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                subElemImg.width = element.mm.width;
                subElemImg.height = element.mm.height;
                subElemBg.width = element.mm.width;
                subElemBg.height = element.mm.height;

                setValue(element.value, callback);

                //  re-blit the image after resize of form
                if ( !Y.dcforms.isOnServer || !isInitialized ) {
                    redrawOnCanvas();
                }
            }

            /**
             *  Elements may have a variable number of tab stops
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            initialize();

            pubMethods = {
            //  'renderAbstract': renderAbstract,
                'setMode': setMode,
                'destroy': destroy,
                'setValue': setValue,
                'getValue': getValue,
                'createValueEditor': createValueEditor,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops,
                'update': update
            };

            creationCallback( null, pubMethods );
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);