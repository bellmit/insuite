/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render textarea elements and attach element-specific events
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-chartmd',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms chart types.', 'debug', NAME);

        /**
         *  Factory method for input element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeChartMDRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
            //  isRendered = false,
            //  checksum = '',

                //  default chart opts
                chartOpts = {
                    'xMin': 10,
                    'xMax': 80,
                    'xDatum': 'DAY_SINCE_ACTIVITY',
                    'yMin': 0,
                    'yMax': 20,
                    'yDatum': 'WEIGHT',
                    'patientId': '{{InCase_T.patientDbId}}',            //  to be mapped in inCase
                    'patientDOB': '{{InCase_T.dobPlain}}',              //  to be mapped in inCase
                    'timestamp': '{{InCase_T.timestampDate}}'           //  to be mapped in inCase
                },

                chartPoints = [],
                pubMethods;

            //  PUBLIC METHODS

            /**
             *  Recreate subelements from the current element properties
             */

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return;
                }

                var
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    chartDebugText = ( element.canEdit() ? chartOptsAsText() : '' ),
                    textSubElems,
                    newSubElem,
                    contentHeight = element.mm.height,
                    i;

                if (element.mm.height < element.mm.lineHeight) {
                    element.mm.height = element.mm.lineHeight;
                }

                element.subElements = [];

                //  add a single subelement for the background and border
                newSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.lineHeight,
                    '', null
                );

                newSubElem.cursor = useCursor;
                newSubElem.bgColor = element.bgColor;
                newSubElem.borderColor = element.borderColor;

                //  add method to draw chart data on top of background element
                newSubElem.drawSpecial = function bgSubelemPreBlit( subElem, pxBox, bufferCtx ) {
                    renderBeforeBlit( subElem, pxBox, bufferCtx );
                };

                //  special case for setting chart background image
                if ( element.imgCache && element.imgCache.imgObj ) {
                    newSubElem.img = element.imgCache.imgObj;
                    newSubElem.imgId = element.extra;
                    newSubElem.imgFixed = element.imgFixAspect;
                    newSubElem.hash = '';   //  void subelement level cache
                }

                //  special case for setting chart background image on server
                if ( Y.dcforms.isOnServer && element.extra && element.extra !== '' ) {
                    newSubElem.imgId = element.extra;
                    newSubElem.imgFixed = element.imgFixAspect;
                    newSubElem.hash = '';   //  void subelement level cache
                }

                element.subElements.push( newSubElem );

                if ( !element.value ) {
                    element.value = '';
                }

                //  parse and wrap markdown/text
                if ( ''  !== element.value ) {

                    textSubElems = Y.dcforms.markdownToSubElements(
                        chartDebugText,                                 //  markdown text
                        element.font,                                   //  typeface name
                        ( element.mm.lineHeight ),                      //  line height
                        parseFloat( element.mm.lineSpace ),             //  leading factor
                        0,                                              //  x offset (mm)
                        0,                                              //  y offset (mm)
                        element.align,                                  //  text alignment (left / right / center)
                        element.mm.width,                               //  wrapping width (mm)
                        element.isBold,                                 //  make bold
                        element.isItalic,                               //  make italic
                        element.isUnderline                             //  make underlined
                    );

                    for (i = 0; i < textSubElems.length; i++) {
                        newSubElem = textSubElems[i];
                        newSubElem.cursor = useCursor;
                        newSubElem.fgColor = element.fgColor;       //  fix inclusion of foreground color
                        //newSubElem.bgColor = 'rgba(0,0,0,0.4)';   //  transparent: element above colord background
                        newSubElem.align = element.align || 'left';
                        newSubElem.cloneInputGroup = element.elemId + 'input';

                        if ((newSubElem.top + newSubElem.height) > (element.mm.height + 1)) {
                            contentHeight = newSubElem.top + newSubElem.height;
                        }

                        if (element.clipOverflow) {
                            //  elements are given +1 mm to prevent slight rendering variations from dropping lines
                            if ((newSubElem.top + newSubElem.height) < (element.mm.height + 1)) {
                                element.subElements.push(newSubElem);
                            }
                        } else {
                            element.subElements.push(newSubElem);
                        }
                    }
                }

                //  add a single subelement for the interaction layer
                if ( element.canEdit() ) {
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,                                       //  left, top
                        element.mm.width, contentHeight,            //  width, height
                        ( element.mm.lineHeight ),                  //  line height
                        '', null                                    //  text, image
                    );

                    newSubElem.interactive = true;                  //  respond to mouse and keyboard events
                    newSubElem.cloneable = true;                    //  can split over multiple fixed pages
                    newSubElem.cloneInputGroup = element.elemId + 'input';
                    newSubElem.useCursor = useCursor;
                    newSubElem.hasHighlight = !element.readonly;    //  hint for touch devices
                    newSubElem.noncontent = true;                   //  allow size reduction
                    newSubElem.bindmark = true;                     //  show binding
                    newSubElem.hasError = !isValid();               //  show validation
                    element.subElements.push( newSubElem );
                }

            }

            /**
             *  Setup / cache image to be used as chart background, if any
             *  Note that charts store image _id in element.extra
             */

            function setImage( callback ) {
                //  if no image then we can skip this
                if ( !element.extra || '' === element.extra ) { return callback( null ); }

                //  do not need to draw the image on on server, hpdf.js will scale and inject it into PDF
                if ( Y.dcforms.isOnServer ) { return callback( null ); }

                if ( !element.imgCache ) {
                    //  on server we need the user to access database
                    //  on client we need patientregid to use PUC proxy
                    element.imgCache = Y.dcforms.createImageCache( element.page.form.user, element.page.form.patientRegId );
                }

                //  element dimensions in canvas pixels
                var
                    imgId = element.extra,
                    px = element.mm.toScale(element.page.form.zoom),
                    useHeight = element.imgFixAspect ? -1 : px.height,
                    subElemImg = element.subElements[0] || null;

                element.isDirty = true;
                element.imgCache.check(
                    imgId,
                    'de',                       //  no translation of background image at present
                    px.width, useHeight,
                    onCacheCheck
                );

                function onCacheCheck( err ) {

                    if ( err ) {
                        Y.log( 'Error checking image cache: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite error
                    }

                    if ( subElemImg ) {
                        subElemImg.img = element.imgCache.imgObj;
                        subElemImg.imgFixed = element.imgFixAspect;
                        subElemImg.hash = '';   //  void subelement level cache
                        element.isDirty = true;
                    }

                    if ( element.page.form.isRendered ) {
                        element.page.redrawDirty();
                    }

                    callback(err);
                }

            }

            /**
             *  Called when value of this element if changed
             */

            function setValue( newValue, callback ) {
                var newOpts;

                newValue = Y.dcforms.stripHtml( newValue );
                newOpts = chartOptsFromString( newValue );

                if ( !newOpts ) {
                    Y.log( 'Skipping invalid value assigned to chart element: ' + newValue, 'warn', NAME );
                    return callback(null);
                }
                
                if ( element.value !== newValue ) {
                    element.value = newValue;
                    element.page.isDirty = true;
                }

                chartOpts.xMin = newOpts.xMin;
                chartOpts.xMax = newOpts.xMax;
                chartOpts.xDatum = newOpts.xDatum;
                chartOpts.yMin = newOpts.yMin;
                chartOpts.yMax = newOpts.yMax;
                chartOpts.yDatum = newOpts.yDatum;

                chartOpts.patientId = newOpts.patientId ? newOpts.patientId : chartOpts.patientId;
                chartOpts.patientDOB = newOpts.patientDOB ? newOpts.patientDOB : chartOpts.patientDOB;
                chartOpts.timestamp = newOpts.timestamp ? newOpts.timestamp : chartOpts.timestamp;

                if ( 'edit' === element.page.form.mode ) {
                    element.defaultValue[ element.getCurrentLang() ] = newValue;
                }

                generateSubElements();

                //  this element type is always synchronous
                setImage( callback );
            }

            /**
             *  Hook for sanitization and formatting
             *
             *  returns     {String}    Plain text
             */

            function getValue() {
                return element.value;
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                if ('edit' === newMode) {
                    setValue( element.defaultValue[element.page.form.userLang], callback );
                    return;
                }

                //  when making PDFs, copy chart data onto the background subelement to be rendered as PDF path
                if ('pdf' === newMode && element.subElements[0] ) {
                    //  magic
                    element.subElements[0].chartOpts = JSON.parse( JSON.stringify( chartOpts ) );
                    element.subElements[0].chartPoints = JSON.parse( JSON.stringify( chartPoints ) );
                    element.subElements[0].isChart = true;
                }

                if ('fill' === newMode ) {
                    //  hide debug information visible in edit mode
                    generateSubElements();
                }

                if ( callback ) { return callback(null); }
            }

            /**
             *  Set a value according to schema binding
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map( newValue, callback ) {

                if ( 'string' !== typeof newValue ) {
                    newValue = JSON.stringify( newValue );
                }

                setValue( newValue, onValueSet );

                function onValueSet( err ) {
                    if ( err ) { return callback( err ); }

                    var
                        //  on server we need to pass the user
                        serverUser = element.page.form.user || null,
                        queryParams = JSON.parse( JSON.stringify( chartOpts ) );

                    Y.dcforms.getChartData( serverUser, queryParams, onChartPointsLoaded );
                }

                function onChartPointsLoaded( err, data ) {
                    if ( err ) {
                        //  callback without error, do not block render of the rest of the form, best effort
                        Y.log( 'Could not load chart data: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( null );
                    }
                    chartPoints = data.points || [];
                    callback( null );
                }
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
                if ( Y.dcforms.isOnServer ) {
                    return;
                }
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            //  EVENT HANDLERS

            /**
             *  Show value editor / refresh chart data
             *  @param selectedOn
             */

            function createValueEditor( /* selectedOn */ ){
                Y.log( 'Chart has no value editor.', 'warn', NAME );
            }

            /**
             *  Called when element has been changed in edit mode
             */

            function update(callback) {
                setImage( onImageSet );

                function onImageSet( err ) {
                    generateSubElements();
                    if ( callback ) { return callback( err ); }
                }

            }

            /**
             *  Elements may have a variable number of tab stops
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            /**
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( '' === element.value.trim() ) { return false; }
                return true;
            }

            /**
             *  Convert current chart options to a string
             *
             *  @param  {Object}    fromObj     Same format as chartOpts above
             */

            function chartOptsToString( fromObj ) {
                return '' +
                    fromObj.xMin + '|' +
                    fromObj.xMax + '|' +
                    fromObj.xDatum + '|' +
                    fromObj.yMin + '|' +
                    fromObj.yMax + '|' +
                    fromObj.yDatum + '|' +
                    fromObj.patientId + '|' +
                    fromObj.patientDOB + '|' +
                    fromObj.timestamp;
            }

            /**
             *  Return a text value of the chart element as an object
             */

            function chartOptsFromString( txt ) {
                var parts;

                if ( 'string' !== typeof txt ) { return null; }
                parts = txt.split( '|' );

                if ( parts.length < 6 ) { return null; }

                return {
                    'xMin': parts[0],
                    'xMax': parts[1],
                    'xDatum': parts[2],
                    'yMin': parts[3],
                    'yMax': parts[4],
                    'yDatum': parts[5],
                    'patientId': parts[6],
                    'patientDOB': parts[7],
                    'timestamp': parts[8]
                };
            }

            function chartOptsAsText() {
                return '' +
                    'CHART MEDDATA\n' +
                    'X: ' + chartOpts.xDatum + ' [' + chartOpts.xMin + ' - ' + chartOpts.xMax + ']' + '\n' +
                    'Y: ' + chartOpts.yDatum + ' [' + chartOpts.yMin + ' - ' + chartOpts.yMax + ']' + '\n' +
                    'patient mapping: ' + chartOpts.patientId + '\n' +
                    'dob mapping: ' + chartOpts.patientDOB + '\n' +
                    'timestamp mapping: ' + chartOpts.timestamp + '\n' +
                    '' + element.mm.width + 'x' + element.mm.height + ' mm';
            }

            /**
             *  Called to draw any lines on the chart canvas wheen blitting onto canvas
             *
             *  @param  subElem     Background subelem of this chartmd element
             *  @param  bufferCtx   Drawing context of the subelement's cached canvas
             */

            function renderBeforeBlit( subElem, pxBox, bufferCtx ) {
                var
                    SCALE_MM_TO_LINE_SIZE = 0.1 * element.page.form.zoom,  //  scale points of font size to line width
                    sorted = chartPoints.sort( sortByX ),
                    xRange = ( chartOpts.xMax - chartOpts.xMin ),
                    yRange = ( chartOpts.yMax - chartOpts.yMin ),
                    xPx, yPx, lastXPx = 0, lastYPx = 0,
                    radius = ( SCALE_MM_TO_LINE_SIZE * subElem.lineHeight * 2 ),
                    i;

                if ( Y.dcforms.isOnServer ) {
                    return;
                }

                function sortByX( a, b ) {
                    if ( a.x > b.x ) { return 1; }
                    if ( a.x < b.x ) { return -1; }
                    return 0;
                }

                for ( i = 0; i < sorted.length; i++ ) {
                    xPx = ( ( ( sorted[i].x - chartOpts.xMin ) / xRange ) * pxBox.width ) ;
                    yPx = ( ( ( sorted[i].y - chartOpts.yMin ) / yRange ) * pxBox.height );

                    //  origin is at bottom left, not top left
                    yPx = ( pxBox.height - yPx );

                    bufferCtx.fillStyle = element.fgColor;
                    bufferCtx.beginPath();
                    bufferCtx.arc( xPx, yPx, radius, 0, 2 * Math.PI );
                    bufferCtx.fill();

                    if ( i > 0 ) {
                        bufferCtx.strokeStyle = element.fgColor;
                        bufferCtx.beginPath();
                        bufferCtx.moveTo( xPx, yPx );
                        bufferCtx.lineWidth = ( SCALE_MM_TO_LINE_SIZE * subElem.lineHeight );
                        bufferCtx.lineTo( lastXPx, lastYPx );
                        bufferCtx.stroke();
                    }

                    lastXPx = xPx;
                    lastYPx = yPx;
                }


            }

            //  returns a copy of the points array, not the points array itself
            function getChartPoints() {
                return JSON.parse( JSON.stringify( chartPoints ) );
            }

            function setChartPoints( newPoints ) {
                chartPoints = JSON.parse( JSON.stringify( newPoints ) );
            }

            //  SET UP AND RETURN THE NEW RENDERER
            pubMethods = {
                'chartOpts': chartOpts,
                'chartOptsToString': chartOptsToString,
                'chartOptsFromString': chartOptsFromString,
                'createValueEditor': createValueEditor,
                'setMode': setMode,
                'destroy': destroy,
                'setValue': setValue,
                'getValue': getValue,
                'getChartPoints': getChartPoints,
                'setChartPoints': setChartPoints,
                'update': update,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops,
                'isValid': isValid
            };

            creationCallback( null, pubMethods );
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dcforms-markdown-utils']
    }
);