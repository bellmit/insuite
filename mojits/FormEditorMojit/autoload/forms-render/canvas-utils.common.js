/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Routines used to draw form elements on HTML canvas
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-canvas-utils',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }

        /*
         *  A temporary canvas (not attached to DOM) is sometimes needed for blitting, compositing or
         *  measuring text
         */

        Y.dcforms.tempCanvas = null;

        /**
         *  Alias of fillRect
         *
         *  @param  ctx         {Object}    HTML5 canvas drawing context
         *  @param  color       {String}    CSS compatible color
         *  @param  x           {Number}    pixels
         *  @param  y           {Number}    pixels
         *  @param  width       {Number}    pixels
         *  @param  height      {Number}    pixels
         */

        Y.dcforms.drawBox = function(ctx, color, x, y, width, height) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, width, height);
        };

        /**
         *  Draw a small circle to represent schema binding (as in previous version of FEM)
         *
         *  @param  ctx         {Object}    HTML5 canvas drawing context
         *  @param  color       {String}    A CSS color
         *  @param  x           {Number}    Left position of element (px)
         *  @param  y           {Number}    Top position of element (px)
         *  @param  width       {Number}    Width of element (px)
         *  @param  height      {Number}    Height of element (px)
         */

        Y.dcforms.drawBindingMark = function( ctx, color, x, y, width, height ) {

            var
                r = Y.dcforms.TOUCH_RADIUS,
                cx = x + width,
                cy = y + height;

            ctx.fillStyle = color;
            ctx.beginPath();

            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - r, cy);
            ctx.lineTo(cx, cy - r);
            ctx.lineTo(cx, cy);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();

        };

        /**
         *  Draw a small circle to represent schema binding (as in previous version of FEM)
         *
         *  @param  ctx         {Object}    HTML5 canvas drawing context
         *  @param  color       {String}    A CSS color
         *  @param  x           {Number}    Left position of element (px)
         *  @param  y           {Number}    Top position of element (px)
         */

        Y.dcforms.drawMovingMark = function( ctx, color, x, y ) {

            var
                r = Y.dcforms.TOUCH_RADIUS,
                halfr = r / 2,
                cx = x,
                cy = y;

            ctx.fillStyle = color;
            ctx.fillRect( cx - halfr, cy - halfr, r, r );

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fill();

        };

        /**
         *  Draw an element outline rect, may be adapted in future to draw border in mm, single px for now
         *
         *  @param  {Object}    ctx         2d context of an HTML5 canvas object
         *  @param  {String}    color       A CSS color
         *  @param  {Number}    x           Left position of element (px)
         *  @param  {Number}    y           Top position of element (px)
         *  @param  {Number}    width       Width of element (px)
         *  @param  {Number}    height      Height of element (px)
         */

        Y.dcforms.drawBorder = function(ctx, color, x, y, width, height) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();
            ctx.closePath();
        };

        /**
         *  Paint dataUrl into canvas via an image element
         *
         *  @param  cnv         {Object}    HTML5 canvas object
         *  @param  dataUrl     {String}    Base64 serialized images
         *  @param  left        {Number}    Canvas pixels
         *  @param  top         {Number}    Canvas pixels
         *  @param  width       {Number}    Canvas pixels
         *  @param  height      {Number}    Canvas pixels
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.paintDataUrl = function(cnv, dataUrl, left, top, width, height, callback) {
            var
                img = new Image();

            if(!dataUrl || '' === dataUrl) {
                callback(null);
                return;
            }

            Y.log('Painting image onto canvas...', 'debug', NAME);

            function onImageLoaded() {
                //  draw image into subelement framebuffer
                var ctx = cnv.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height, left, top, width, height);
                //  update this framebuffer on the page
                Y.log('Painted image onto new canvas...', 'debug', NAME);
                callback(null);
            }

            function onImageError() {
                Y.log('Could not load image', 'debug', NAME);
                callback(null);
            }

            $(img).load(onImageLoaded).error(onImageError).attr('src', dataUrl);
        };

        /**
         *  Wrap a string element value into an array of subElements (box models which can be bumped between pages)
         *
         *  We try to draw canvas text in pixels (derived from mm height of text).  If this must be changed in future,
         *  note that one PostScript Point is 0.3527mm
         *
         *  DEPRECATED: in general this is now handled by the markdown component
         *
         *  @param  zoom        {Number}    Scale factor mm -> px, float
         *  @param  font        {String}    Font to be used when measuring
         *  @param  text        {String}    Plain text to be wrapped
         *  @param  left        {Number}    Offset within element, in mm
         *  @param  top         {Number}    Offset within element, in mmm
         *  @param  maxWidth    {Number}    Wrap this width, in mm
         *  @param  lineHeight  {Number}    In mm
         *  @param  lineSpace   {Number}    Proportion of lineHeight
         *  @returns            {Array}     Of subElement objects
         */

        Y.dcforms.textToSubElements = function(zoom, font, text, left, top, maxWidth, lineHeight, lineSpace) {

            if ('object' === typeof text) {
                text = JSON.stringify(text);
            }

            if ('number' !== typeof text || !text.split) {
                text = text.toString();
            }

            if (!text) { text = ''; }

            if (!lineSpace) { lineSpace = 1.0; }

            var
                subElements = [],
                subElement,
                overMeasure = 1,      //   contstant to fix Chrome bug on text measurement
                pxWidth = parseInt(maxWidth * zoom * overMeasure, 10),
                lines = text.split("\n"),
                leading = 0.1,                      //  additional line separation
                fontFraction = (3/4),
                pxFontHeight = Math.floor(lineHeight * zoom * fontFraction),
                fontString = pxFontHeight + 'px ',
                words,
                trial,
                metrics,
                i,
                j,
                ctx,
                cy = top + (lineHeight * zoom * leading);


            //console.log('max width of text (px) ' + pxWidth + ' (mm) ' + maxWidth);

            if (!Y.dcforms.tempCanvas) {
                Y.dcforms.tempCanvas = Y.dcforms.makeTempCanvas();
            }

            //  use temporary canvas to measure text
            //  awkward way to do it, but simplifies load order of forms
            Y.dcforms.tempCanvas.width  = maxWidth;
            Y.dcforms.tempCanvas.height = lineHeight;

            //  We don't have the exact PDF fonts, and all browsers would render them differently if we did, but these
            //  give an approximation
            switch(font) {
                case '':
                case 'Helvetica':       fontString = fontString + '"Trebuchet MS", Helvetica, sans-serif';       break;
                case 'Courier':         fontString = fontString + '"Courier New", Courier, monospace';           break;
                case 'Times New Roman': fontString = fontString + '"Times New Roman", Times, serif';             break;
            }

            //Y.log('Render text with line spacing: ' + lineSpace, 'debug', NAME);

            ctx = Y.dcforms.tempCanvas.getContext('2d');
            ctx.font = fontString;

            //console.log('Rendering text of ' + lineHeight + 'mm as ' + Math.floor(lineHeight * zoom) + 'px (zoom is ' + zoom + ')');
            //console.log('Font string: ' + fontString);

            for (i = 0; i < lines.length; i++) {
                //  create a minimum of one subelement per line
                subElement = Y.dcforms.createSubElement(left, cy, maxWidth, lineHeight, lineHeight, '');
                subElement.font = font;
                cy = cy + ((lineHeight + (lineHeight * leading)) * lineSpace);

                lines[i] = Y.dcforms.trim(lines[i]);
                words = lines[i].split(' ');

                for (j = 0; j < words.length; j++) {
                    trial = subElement.text + ' ' + words[j];
                    ctx.font = fontString;
                    metrics = { 'width': Y.dcforms.measureTextWidth(Y.dcforms.trim(trial), font, pxFontHeight)};

                    //metrics = ctx.measureText(jQuery.trim(trial));

                    //alert('metrics.width: ' + metrics.width + ' pxWidth: ' + pxWidth);
                    //alert('DOM measure: ' + Y.dcforms.measureTextWidth(jQuery.trim(trial), font, pxFontHeight));
                    //alert('trial string: "' + jQuery.trim(trial) + '"');

                    if (metrics.width > pxWidth && j > 0) {
                        //  start a new line unless first word is wider than width
                        subElement.text = Y.dcforms.trim(subElement.text);
                        subElements.push(subElement);
                        subElement = Y.dcforms.createSubElement(left, cy, maxWidth, lineHeight, lineHeight, ' ' + Y.dcforms.trim(words[j]));
                        subElement.font = font;
                        //cy = cy + lineHeight + (lineHeight * leading);
                        cy = cy + ((lineHeight + (lineHeight * leading)) * lineSpace);

                    } else {
                        //  add to the current subelement
                        subElement.text = subElement.text + ' ' + words[j];
                    }
                }

                //  add any remainder of the current line
                subElement.text = Y.dcforms.trim(subElement.text);
                subElements.push(subElement);
            }

            return subElements;
        };

        /**
         *  Get properties of a piece of text useful for laying out tables
         *
         *  @param  text            {String}    Plain UTF-8 text to be measured
         *  @param  font            {String}
         *  @param  pxFontHeight    {Number}
         *  @return                 {Object}    With max and total width of words
         */

        Y.dcforms.measureTextMetrics = function(text, font, pxFontHeight) {
            var
                words,
                measurement,
                rv = {
                    max: 0,
                    total: 0
                },
                i;

            if ( 'string' !== typeof text) {
                if ( null === text || undefined === text ) { text = ''; }
                if ( text.toString ) { text = text.toString(); }
                text = text + '';
            }

            //  allow breaking on some punctuation.
            //console.log( 'string, replace commas: ', text );
            //text = text.replace( new RegExp(',', 'g'), ' ' );

            //console.log( 'string, replace commas: ', text );
            text = text.replace( new RegExp('ꟸ', 'g'), ' ' );

            words = ((text && 'string' === typeof text) ? text.split(' ') : '');

            if ('' === text) {
                return rv;
            }

            //  skip charts in measurement, as they overweight column widths MOJ-9074
            for (i = 0; i < words.length; i++) {
                if ( 'CHARTMINMAX|' === words[i].substring( 0, 12 ) ) {
                    words[i] = 'chart';
                }
            }

            for (i = 0; i < words.length; i++) {
                measurement = Y.dcforms.measureTextWidth( font, false, false, pxFontHeight, Y.dcforms.trim(words[i]) );
                rv.total = rv.total + measurement;
                if (measurement > rv.max) {
                    rv.max = measurement;
                }
            }

            return rv;
        };

        /**
         *  Work out how tall text would be on canvas if it was printed
         *  credit: http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
         *
         *  @param  ctx         {Object}        Canvas 2d drawing context
         *  @param  text        {String}        Text to measure
         *  @param  maxWidth    {Number}        pixels
         *  @param  lineHeight  {Number}        pixels
         */

        Y.dcforms.measureTextHeight = function(ctx, text, maxWidth, lineHeight) {

            var
                x = 0,
                y = 0,
                lines = text.split('\n'),
                words,

                cursorX,
                cursorY,

                metrics,
            //  floatUp = Math.floor(lineHeight / 3),
                i,
                n;

            ctx.font = Math.floor( 2 * lineHeight / 3) + 'px Calibri';
            cursorY = y;

            for (i = 0; i < lines.length; i++) {
                words = lines[i].split(' ');

                cursorX = x;
                cursorY += lineHeight;

                for (n = 0; n < words.length; n++) {
                    metrics = ctx.measureText(words[n] + ' ');

                    if ((cursorX + metrics.width) > (x + maxWidth)) {
                        cursorX = x;
                        cursorY = cursorY + lineHeight;
                    }

                    cursorX = cursorX + metrics.width;
                }


            }

            //alert('measureTextHeight: ' + cursorY + ' lineHeight: ' + lineHeight);

            return (cursorY - y);
        };

        /**
         *  Make and return a canvas object
         *  Unified call for browser and node
         *
         *  @param  {Number}    width       Optional, pixels
         *  @param  {Number}    height      Optional, pixels
         *  @return {*|Element}
         */

        Y.dcforms.makeCanvasObject = function( width, height ) {
            var newCnv = null;

            if (false === Y.dcforms.isOnServer) {
                newCnv = document.createElement('canvas');
                newCnv.width = width ? width : 100;
                newCnv.height = height ? height : 100;
                return newCnv;
            }

            const
                Canvas = require('canvas'); //eslint-disable-line no-undef

            try {

                if ( Canvas.createCanvas ) {
                    //  canvas 2.6+, for Node 12 on CentOS 7
                    newCnv = Canvas.createCanvas(100, 100);
                } else {
                    //  canvas 1.6.7, for Node 10 on CentOS 6 (deprecated)
                    newCnv = new Canvas(100, 100);
                }

                newCnv.width = width ? width : 100;
                newCnv.height = height ? height : 100;

            } catch (missingCanvasErr) {
                Y.log('Canvas not present, please add with: npm install canvas', 'warn', NAME);
                Y.log('see: https://github.com/Automattic/node-canvas/wiki', 'warn', NAME);
            }

            return newCnv;
        };

        /**
         *  When rendering PDFs on server we do not always need an actual canvas
         *  This is a stub object to save memory when generating large PDFs such as reports
         *
         *  @param  {Number}    width       Optional, width of stub canvas
         *  @param  {Number}    height      Optional, height of stub canvas
         */

        Y.dcforms.makeStubCanvasObject = function( width, height ) {
            var
                stubCanvas = {
                    'width': ( width ? width : 100 ),
                    'height': ( height ? height : 100 ),
                    'getContext': getContext
                },
                stubContext = {
                    'fillStyle': '',
                    'lineWidth': 0,
                    'strokeStyle': '',
                    'font': '',
                    'font-family': '',
                    'font-size': '',

                    'clearRect': makeNullFn( 'clearRect' ),
                    'fillRect': makeNullFn( 'fillRect' ),
                    'rect': makeNullFn( 'rect' ),
                    'drawImage': makeNullFn( 'drawImage' ),
                    'fillText': makeNullFn( 'fillText' ),
                    'moveTo': makeNullFn( 'moveTo' ),
                    'lineTo': makeNullFn( 'lineTo' ),
                    'stroke': makeNullFn( 'stroke' ),

                    'measureText': measureText
                };

            function getContext() {
                stubContext.canvas = stubCanvas;
                return stubContext;
            }

            function makeNullFn( fnName ) {
                return function() {
                    if ( Y.dcforms.verboseLogging ) {
                        Y.log( 'Skip operation on null canvas context: ' + fnName, 'debug', NAME );
                    }
                };
            }

            //  we need this for aligning text within subelements
            function measureText(text) {
                if ( !Y.dcforms.tempCanvas ) { Y.dcforms.makeTempCanvas(); }

                var ctx = Y.dcforms.tempCanvas.getContext('2d');

                if ( '' !== stubContext.font ) { ctx.font = stubContext.font; }
                if ( '' !== stubContext['font-size'] ) { ctx['font-size'] = stubContext['font-size']; }
                if ( '' !== stubContext['font-family'] ) { ctx['font-family'] = stubContext['font-family']; }

                if ( '' !== stubContext.fillStyle ) { ctx.fillStyle = stubContext.fillStyle; }

                return ctx.measureText(text);
            }

            return stubCanvas;
        };

        /**
         *  Return the horizontal width of a string at the given font and size
         *
         *  Implents out own measureText function due to problems with node canvas on CentOS
         *
         *  @param  fontName    {String}    Type2 or uploaded TTF
         *  @param  isBold      {Boolean}   True if font is bold
         *  @param  isItalic    {Boolean}   True if font is italic
         *  @param  sizePx      {Number}    Canvas pixels (will be adjusted for leading)
         *  @param  text        {String}    String to measure
         */

        Y.dcforms.measureTextWidth = function( fontName, isBold, isItalic, sizePx, text ) {
            //  ensure we have a canvas
            if ( !Y.dcforms.tempCanvas ) { Y.dcforms.makeTempCanvas(); }

            var fontMetricName = fontName;

            //  Hack for Arial on AOK until MOJ-11209 can be implemented
            if ( 'arial-sfd-copy' === fontName ||'arial-sfd' === fontName ) {
                fontName = 'Helvetica';
            }

            if ( Y.doccirrus.media.fonts.isType2( fontName ) ) {
                //  remove any spaces from type2 name
                fontName = fontName.replace( new RegExp( ' ', 'g' ), '' );
                fontMetricName = fontName + ( isBold ? '-Bold' : '' ) + ( isItalic ? '-Italic' : '' );
            }

            if ( false === Y.doccirrus.media.fonts.hasFontMetrics( fontMetricName ) ) {
                return Y.dcforms.measureTextWidthCanvas( fontName, isBold, isItalic, sizePx, text );
            }

            var
                metrics = Y.doccirrus.media.fontmetrics[ fontMetricName ],
                totalChar = 0,
                totalKern = 0,
                width100px,
                widthSizePx,
                aspect,
                char,
                lastChar = '',
                i;

            //  hack due to missing spaces
            text = text.replace( new RegExp( ' ', 'g' ), 'f' );

            for ( i = 0; i < text.length; i++ ) {
                try {
                    char = encodeURIComponent( text.substr( i, 1 ) );
                } catch( err ){
                    char = encodeURIComponent( text.substr( i, 2 ) );
                    i++;
                }

                // no special metrics for non-breaking space
                if ( '%C2%A0' === char ) { char = ' '; }

                if ( !metrics.baseWidth.hasOwnProperty( char ) ) {
                    //  missing glyph in font metrics
                    //Y.log( 'Missing char metrics ' + fontName + ', char: ' + char + ' text: ' + text, 'warn', NAME );
                    return Y.dcforms.measureTextWidthCanvas( fontName, isBold, isItalic, sizePx, text );
                }

                totalChar = totalChar + metrics.baseWidth[ char ];

                if ( metrics.kernPairs.hasOwnProperty( lastChar + char ) ) {
                    totalKern = totalKern + metrics.kernPairs[ lastChar + char ];
                }

                lastChar = char;
            }

            //  width of text at 100px
            width100px = totalChar + totalKern;

            //  scale to sizePx and account for leading
            aspect = width100px / 100;
            widthSizePx = aspect * sizePx * (3/4);

            //console.log( 'text: ' + text + ' font: ' + fontName )
            //console.log( 'totalChar: ' + totalChar + ' totalKern: ' + totalKern );
            //console.log( 'widthSizePx: ' + widthSizePx + ' canvas value: ' + Y.dcforms.measureTextWidthCanvas( fontName, isBold, isItalic, sizePx, text ) );

            return widthSizePx;
        };

        /**
         *  Return the horizontal width of a string at the given font and size
         *
         *  Fallback, use node canvas if font metrics are not available
         *
         *  @param  fontName    {String}    Type2 or uploaded TTF
         *  @param  isBold      {Boolean}   True if  font is bold
         *  @param  isItalic    {Boolean}   Trus if font is italic
         *  @param  sizePx      {Number}    Canvas pixels (will be adjusted for leading)
         *  @param  text        {String}    String to measure
         */

        Y.dcforms.measureTextWidthCanvas = function( fontName, isBold, isItalic, sizePx, text ) {
            //  ensure we have a canvas
            if ( !Y.dcforms.tempCanvas ) { Y.dcforms.makeTempCanvas(); }

            //console.log( '(****) measuretextWidthCanvas ', fontName, isBold, isItalic, sizePx, text );

            var
                ctx = Y.dcforms.tempCanvas.getContext( '2d' ),
                fontString = Y.dcforms.makeFontString( fontName, isBold, isItalic, 100 ),
                measurement,
                adjust = 1,
                aspect,
                width;

            ctx.font = fontString;

            //console.log( 'fontString: ', fontString );

            if (Y.dcforms.isOnServer) {
                ctx['font-size'] = '100px';
                ctx['font-family'] = fontName;
                ctx['font-style'] = isItalic ? 'italic' : 'normal';
                ctx['font-weight'] = isBold ? 'bold': 'normal';
            }

            measurement = ctx.measureText( text );

            aspect = measurement.width / 100;
            width = aspect * sizePx * (3/4) * adjust;

            return width;
        };

        /**
         *  Produce a CSS font-face string from element font properties
         *
         *  @param  fontName    {String}    Name of font without modifiers for bold, oblique, italic, etc
         *  @param  isBold      {Boolean}   True if font is to be drawn bold
         *  @param  isItalic    {Boolean}   True if font is to be drawn italic
         *  @param  sizePx      {Number}    Line height in pixels
         */

        Y.dcforms.makeFontString = function( fontName, isBold, isItalic, sizePx ) {
            var
                fontStyle = (isBold || isBold ? 'bold ' : '') + (isItalic || isItalic ? 'italic ' : ''),
                fontString = fontStyle + sizePx + 'px ' + fontName;

            if ( !Y.doccirrus.media.fonts.isType2( fontName ) ) {
                //  custom fonts do not take bold or italic
                fontString = sizePx + 'px ' + fontName;
            }

            return fontString;
        };

        /**
         *  Remove leading and trailing whitespace
         */

        Y.dcforms.trim = function(txt) {
            if ('undefined' === typeof txt || null === txt) {
                txt = '';
            }
            if ('number' === typeof txt) {
                txt = txt + '';
            }
            if (!txt.replace) {
                txt = '';
            }
            return txt.replace(/^\s+|\s+$/gm,'');
        };

        /**
         *  Create a new box object that contains both given boxes
         *
         *  @param  box1    {Object}    left, top, width, height
         *  @param  box2    {Object}    left, top, width, height
         */

        Y.dcforms.mergeBoxes = function(box1, box2) {

            box1.extent = box1.left + box1.width;
            box2.extent = box2.left + box2.width;
            box1.bottom = box1.top + box1.height;
            box2.bottom = box2.top + box2.height;

            var
                newBox = {
                    'left': Math.min(box1.left, box2.left),
                    'top': Math.min(box1.top, box2.top),
                    'extent': Math.max(box1.extent, box2.extent),
                    'bottom': Math.max(box1.bottom, box2.bottom),
                    'width': -1,
                    'height': -1
                };

            newBox.width = newBox.extent - newBox.left;
            newBox.height = newBox.bottom - newBox.top;

            return newBox;
        };


        /**
         *  Initialize temp canvas used to measure text, etc
         *
         *  On server this must be initialized with any custom TTF files used in forms
         */

        Y.dcforms.makeTempCanvas = function() {
            var
                ttfFonts = Y.doccirrus.media.fonts.ttf,
                tempCanvas = Y.dcforms.makeCanvasObject( 100, 100 ),
                i;

            tempCanvas.customFonts = {};

            if ( Y.dcforms.isOnServer ) {
                for ( i = 0; i < ttfFonts.length; i++ ) {
                    Y.log( 'Adding custom TTF font to markdown parser canvas: ' + ttfFonts[i].name, 'info', NAME );

                    Y.doccirrus.media.fonts.addToCanvas( tempCanvas, ttfFonts[i].name );
                }
            }

            Y.dcforms.tempCanvas = tempCanvas;
        };

        /**
         *  Check if two boxes overlap
         *
         *  @param  {Object}    box1    Subelement, etc
         *  @param  {Object}    box2    Subelement, etc
         */

        Y.dcforms.doBoxesOverlap = function __doBoxesOverlap( box1, box2 ) {
            var
                right = box1.left + box1.width,
                bottom = box1.top + box1.height;

            return (
                Y.dcforms.pointIsInBox( box1.left, box1.top, box2 ) ||
                Y.dcforms.pointIsInBox( right, box1.top, box2 ) ||
                Y.dcforms.pointIsInBox( box1.left, bottom, box2 ) ||
                Y.dcforms.pointIsInBox( right, bottom, box2 )
            );
        };

        /**
         *  Check if a point falls within a box
         *
         *  @param  {Number}    x               mm
         *  @param  {Number}    y               mm
         *  @param  {Object}    mmBox           Subelement or similar
         *  @param  {Number}    mmBox.left      mm
         *  @param  {Number}    mmBox.top       mm
         *  @param  {Number}    mmBox.width     mm
         *  @param  {Number}    mmBox.height    mm
         *
         *  @return {Boolean}   true if the point is in the box, false if not
         */

        Y.dcforms.pointIsInBox = function ( x, y, mmBox ) {
            return (
                ( x >= mmBox.left ) && ( x <= ( mmBox.left + mmBox.width ) ) &&
                ( y >= mmBox.top ) && ( y <= ( mmBox.top + mmBox.height ) )
            );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'dcforms-utils',
            'dcforms-subelement',
            'dcmedia-fonts'
        ]
    }
);