/**
 *	Complex element types such as tables may be further divided into additional sections which split across page
 *  boundaries or may respond differently to events
 *
 *  Subelements display a maximum of one image or line of text (for simplicity of rendering and calculations)
 *
 *  Additionally, they maintain a framebuffer of their contents in a small canvas
 */

/*global YUI*/
/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-subelement',

    /* Callback */

    function(Y, NAME ) {

        Y.log('Adding Y.dcforms.element', 'info', 'dcforms-template');
        if (!Y.dcforms) { Y.dcforms = {}; }

        /**
         *  Smallest individible unit of content (a text line, table call, image, etc)
         *
         *  These objects are created and updated by element renderers, and used for low-level rendering
         *  and canvas or pdf
         *
         *  @param left         {Number}    Relative to parent, in mm
         *  @param top          {Number}    Relative to parent, in mm
         *  @param width        {Number}    Maximum, in mm
         *  @param height       {Number}    Maximum, in mm
         *  @param lineHeight   {Number}    Absolute, in mm
         *  @param text         {String}    Part or all of parent's value as shown in canvas, optional
         *  @param img          {Object}    A plain DOM image object to use as sub-element background, optional
         *  @returns            {Object}
         */

        Y.dcforms.createSubElement = function(left, top, width, height, lineHeight, text, img) {

            var
                self = {

                    //  public properties

                    'left': left || 0,
                    'top': top || 0,
                    'width': width || 0,
                    'height': height || 0,
                    'lineHeight': lineHeight || 10,
                    'lineSpace': 1.0,
                    'clipHeight': -1,                       //  prevent content overflow in some cases
                    'text': text || '',
                    'bgColor': Y.dcforms.COLOR_BG_DEFAULT,
                    'fgColor': Y.dcforms.COLOR_FG_DEFAULT,
                    'borderColor': '',
                    'highlightColor': '',
                    'img': img || null,
                    'imgId': '',
                    'imgFixed': false,
                    'font': Y.dcforms.defaultFont,
                    'isBold': false,
                    'isItalic': false,
                    'isUnderline': false,
                    'isWrong': false,                       //  highlight color for incorrect transcription
                    'hasHighlight': false,
                    'align': 'left',

                    'layer': Y.dcforms.LAYER_TEXT,          //  by default subelements join the text layer

                    'absTop': 0,            //  vertical position of this subelement on absolute page (mm)
                    'fixedTop': 0,          //  vertical position of this subelement on fixed page (mm)
                    'fixedLeft': 0,         //  horizontal position of this subelement of fixed page (mm)

                    'subformLeft': 0,       //  adjustment for rendering child form subelements onto canvas
                    'subformTop': 0,        //  adjustment for rendering child form subelements onto canvas
                    'subformScale': 1,      //  subform co-ordinate space scale

                    'fixedPage': 0,         //  fixed page this subelement belongs to
                    'pageTop': 0,           //  fixed page at top of subelement
                    'pageBottom': 0,        //  fixed page at bottom of subelement
                    'boffset': 0,           //  page break offset, set on abstract layout of page

                    'buffer': null,
                    'hash': '',
                    'imageData': null,
                    'nocorrect': false,

                    'magic': {},            //  special strings substituted at runtime

                    //  public methods
                    'scaleFrom': scaleFrom,
                    'renderToCanvas': renderToCanvas,
                    'toServer': toServer,
                    'reblit': reblit,
                    'highlight': highlight,
                    'containsPoint': containsPoint,
                    'containsPx': containsPx,
                    'toScale': toScale,
                    'toString': toString,
                    'getMagicText': getMagicText,
                    'saved': {}
                };

            /**
             *  Resize this box based on another box and a scale factor
             */

            function scaleFrom(box, factor) {
                self.width = box.width * factor;
                self.height = box.height * factor;
                self.left = box.left * factor;
                self.top = box.top * factor;
                self.lineHeight = box.lineHeight * factor;
            }

            /**
             *  Assumes own dimensions are in mm
             *
             *  @param  ctx         {Object}    2d canvas context
             *  @param  scaleBy     {Number}    Zoom factor, mm to px, float
             *  @param  elemLeft    {Number}    Position of element (parent) on page, mm
             *  @param  elemTop     {Number}    Position of element (parent) on page, mm
             *  @param  vOffset     {Number}    Vertical displacement due to other elements or page breaks
             *  @param  drawBg      {Boolean}   Draws the background color if true
             *  @param  saveAs      {String}    Key used to record subelement position for subsequent query
             */

            function renderToCanvas(ctx, scaleBy, elemLeft, elemTop, vOffset, drawBg, saveAs) {
                if (!scaleBy) { scaleBy = 1; }
                if (!vOffset) { vOffset = 0; }

                if (0 === self.clipHeight) {
                    return;
                }

                var
                    fontRatio = 0.75,    // calculated as 3/4 line height when laying out subelements
                    pxBox = toScale(scaleBy * self.subformScale),
                    pxFloat = (pxBox.lineHeight * (5 / 7)),
                    magicText = getMagicText(self.text),
                    fontStyle = (self.isBold ? 'bold ' : '') + (self.isItalic ? 'italic ' : ''),
                    newHash,
                    tempCanvas,
                    tempCtx,
                    bufferCtx;

                //  save pixel positions for reference later (eg, detecting mouse events, splitting pages)

                if (saveAs) {
                    self.saved[saveAs] = {
                        'canvasId': ctx.canvas.id,
                        'scaleBy': scaleBy * self.subformScale,
                        'left': pxBox.left,                 //  relative to elem, px
                        'top': pxBox.top,                   //  relative to elem, px
                        'width': pxBox.width,
                        'height': pxBox.height,
                        'mmLeft': self.left + 0,
                        'mmTop': self.top + vOffset,
                        'mmWidth': self.width,
                        'mmHeight': self.height,
                        'mmElemLeft': elemLeft,
                        'mmElemTop': elemTop
                    };
                }

                //console.log('render save.elemTop: ' + pxElemTop + ' ' + pxOffset + ' save.top: ' + pxBox.top);
                //console.log('render fixedTop: ' + self.fixedTop + ' pageBottom: ' + self.pageBottom + ' usable: ' + self.element.page.abstract.usable);

                //  calculate a hash of this subelement, only redraw the buffer if the hash changes
                //  changes to the position of the element do not require redraw, only to size or content

                newHash = Y.dcforms.fastHash('' +
                    pxBox.width + '-' +
                    pxBox.height + '-' +
                    magicText + '-' +
                    self.lineHeight + '-' +
                    self.font + '-' +
                    self.align + '-' +
                    self.bgColor + '-' +
                    self.fgColor + '-' +
                    ((self.img) ? 'HASIMAGE' : '')
                );

                if (newHash === self.hash && self.buffer && self.buffer.width > 0  && self.buffer.height > 0) {
                    //Y.log('Reblitting existing canvas: ' + JSON.stringify(pxBox), 'debug', NAME);
                    if (false === Y.dcforms.isOnServer) {
                        reblit(ctx, scaleBy);
                        return;
                    }
                }

                self.hash = newHash;

                //  render to local buffer before blitting onto page (to be reused in future)
                //self.imageData = ctx.getImageData(pxBox.left, pxBox.top, pxBox.width, pxBox.height);

                //  note that the local buffer is slightly wider (x1.1) and than subelement, this is to allow text
                //  sections to be slightly overdrawn to account for a Firefox bug in measuring the width of italic and
                //  bold text on canvas, and to allow for rounding errors when converting to px units.

                pxBox.widthExtraPadding = pxBox.width * 1.1;

                if ( Y.dcforms.isOnServer ) {
                    //  test supression of canvas draw on server
                    self.buffer = Y.dcforms.makeStubCanvasObject( pxBox.widthExtraPadding, pxBox.height );
                } else {
                    self.buffer = Y.dcforms.makeCanvasObject( pxBox.widthExtraPadding, pxBox.height );
                }

                if (self.imgFixed && self.img) {
                    self.buffer.height = self.buffer.width * (self.img.height / self.img.width);
                }

                if (self.clipHeight > 0) {
                    self.buffer.height = self.clipHeight * scaleBy * self.subformScale;
                }

                bufferCtx = self.buffer.getContext('2d');

                //  draw background color, if requested
                if ( drawBg ) {
                    bufferCtx.fillStyle = self.bgColor || '#ffffff';
                    bufferCtx.fillRect(0, 0, pxBox.width, pxBox.height);
                }

                if ( self.isWrong ) {
                    if( self.highlightColor ) {
                        bufferCtx.fillStyle = self.highlightColor;
                    } else {
                        bufferCtx.fillStyle = Y.dcforms.COLOR_WRONG;
                    }

                    bufferCtx.fillRect(0, 0, pxBox.width, pxBox.height);
                }

                //  draw background image, if present
                if (self.img && 'object' === typeof self.img && self.img.width && self.img.height) {
                    if ( self.imgId && ':' === self.imgId.substr( 0, 1 ) ) {
                        //  static sprites are scaled to subelement size and act as a mask for fgColor
                        //  MOJ-8655 use sprite canvas as mask for fgColor
                        //  MOJ-8655 skip static sprites on server, hpdf.server.js processes them separately

                        if ( !Y.dcforms.isOnServer ) {

                            if ( !self.imgPlainSprite ) {
                                //  plain sprites do not follow element color, are just scaled into the box without
                                //  compositing (MOJ-9025)
                                bufferCtx.fillStyle = self.fgColor;
                                bufferCtx.fillRect( 0, 0, pxBox.width, pxBox.height );
                                bufferCtx.globalCompositeOperation = 'destination-in';
                            }

                            bufferCtx.drawImage(
                                self.img,                                       //  DOM image
                                0, 0, self.img.width, self.img.height,          //  clip region (LTWH)
                                0, 0, pxBox.width, pxBox.height                 //  dest region (LTWH)
                            );

                            bufferCtx.globalCompositeOperation = 'source-over'; //  default
                        }

                    } else {
                        //  user media should already have been requested at correct size
                        bufferCtx.drawImage(
                            self.img,                                       //  DOM image
                            0, 0, self.img.width, self.img.height,          //  clip region (LTWH)
                            0, 0, self.img.width, self.img.height           //  dest region (LTWH)
                        );
                    }

                }

                //  draw text
                //  alignment here is now done in markdown parser, necessary here for font size correction in Firefox

                if (self.text && '' !== self.text) {

                    bufferCtx.font = fontStyle + (pxBox.lineHeight * fontRatio) + 'px ' + self.font;
                    bufferCtx['font-size'] = (pxBox.lineHeight * fontRatio) + 'px';
                    bufferCtx['font-family'] = self.font;

                    bufferCtx.fillStyle = self.fgColor || '#000000';
                    //pxBox.widthMeasure = bufferCtx.measureText(magicText).width;

                    pxBox.widthMeasure = Y.dcforms.measureTextWidth(
                        self.font,
                        self.isBold,
                        self.isItalic,
                        pxBox.lineHeight,
                        magicText
                    );

                    //console.log( 'measure: ' + pxBox.widthMeasure + ' canvas:' + bufferCtx.measureText(magicText).width );

                    pxBox.fontDiff = (pxBox.width - pxBox.widthMeasure);

                    if (self.nocorrect) {
                        pxBox.widthMeasure = pxBox.width;
                        pxBox.fontDiff = 0;
                    }

                    switch (self.align) {
                        case 'justify':
                        case 'left':
                            bufferCtx.textAlign = 'start';
                            bufferCtx.fillText(magicText, 0, pxFloat);
                            break;

                        case 'center':
                            bufferCtx.textAlign = 'center';
                            bufferCtx.fillText(magicText, (pxBox.widthMeasure / 2), pxFloat);
                            break;

                        case 'right':
                            bufferCtx.textAlign = 'right';
                            bufferCtx.fillText(magicText, pxBox.widthMeasure, pxFloat);
                            break;

                    }

                    //  if more than one pixel difference
                    if (Math.abs(pxBox.fontDiff) >= 1) {
                        if (Y.dcforms.isOnServer) {
                            tempCanvas = Y.dcforms.makeStubCanvasObject( self.buffer.width, self.buffer.height );
                        } else {
                            tempCanvas = Y.dcforms.makeCanvasObject( self.buffer.width, self.buffer.height);
                        }

                        tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(self.buffer, 0, 0);

                        pxBox.correction = Math.abs(pxBox.width - pxBox.widthMeasure) / pxBox.width;

                        bufferCtx.clearRect(0, 0, self.buffer.width, self.buffer.height);

                        bufferCtx.drawImage(
                            tempCanvas,
                            0, 0,
                            tempCanvas.width, tempCanvas.height,
                            0, 0,
                            tempCanvas.width - (tempCanvas.width * pxBox.correction), tempCanvas.height
                        );

                    }

                }

                //  underline text, if set
                if (self.isUnderline) {
                    bufferCtx.lineWidth = (self.lineHeight * scaleBy * self.subformScale) / 16; //***
                    bufferCtx.strokeStyle = self.fgColor || '#000000';
                    bufferCtx.moveTo(0, pxBox.height - ((self.lineHeight * scaleBy * self.subformScale) / 5));
                    bufferCtx.lineTo(pxBox.width + 1, pxBox.height - ((self.lineHeight * scaleBy * self.subformScale) / 5));
                    bufferCtx.stroke();
                }

                //  draw border, if set
                if (self.borderColor && '' !== self.borderColor && pxBox.width > 1 && pxBox.height > 1) {
                    bufferCtx.lineWidth = 1;
                    bufferCtx.strokeStyle = self.borderColor;
                    bufferCtx.rect(0, 0, pxBox.width - 1, pxBox.height - 1);
                    bufferCtx.stroke();
                }

                //  run any special additional drawing operations (currently only used by charting, may add audio, etc)
                if ( self.drawSpecial ) {
                    self.drawSpecial( self, pxBox, bufferCtx );
                }

                //  blit onto canvas
                if (self.buffer && self.buffer.width > 0  && self.buffer.height > 0) {
                    reblit(ctx, scaleBy);
                }
            }

            /**
             *  If this subelement is unchanged since last render we can reblit it rather than redrawing it
             *
             *  @param  ctx         {Object}    Canvas 2d drawing context
             *  @param  scaleBy     {Number}    Zoom factor
             */

            function reblit(ctx, scaleBy) {
                var
                    pxLeft = (self.fixedLeft * scaleBy * self.subformScale) + (self.subformLeft * scaleBy),
                    pxTop = (self.fixedTop * scaleBy * self.subformScale) + (self.subformTop * scaleBy);

                if (!self.buffer || 0 === self.buffer.width || 0 === self.buffer.height) {
                    Y.log('Buffer not yet ready, waiting on load', 'debug', NAME);
                    return;
                }

                if ( Y.dcforms.isOnServer ) {
                    //  skip during PDF generation
                    return;
                }

                try {
                    ctx.drawImage(self.buffer, pxLeft, pxTop);
                } catch (blitErr) {
                    //console.log('Error blitting subelement', blitErr, blitErr.stack);
                    Y.log('Error blitting subelement buffer: ' + self.buffer.width + 'x' + self.buffer.height, 'warn', NAME);
                }
            }

            /**
             *  Show colored subelement bounding box for edit mode or when highlighting selected elements
             *
             *  @param  ctx         {Object}    HTML5 canvas context
             *  @param  scaleBy     {Number}    Zoom factor
             *  @param  elemLeft    {Number}    Relative to fixed page
             *  @param  elemTop     {Number}    Relative to fixed page
             *  @param  bgColor     {String}    CSS color as supported by canvas
             *  @param  borderColor {String}    CSS color as supported by canvas
             */

            function highlight( ctx, scaleBy, elemLeft, elemTop, bgColor, borderColor ) {
                var
                    pxBox = toScale( scaleBy * self.subformScale ),
                    pxLeft = ( ( self.fixedLeft * self.subformScale * scaleBy ) + ( self.subformLeft * scaleBy ) ),
                    pxTop = ( ( self.fixedTop * self.subformScale * scaleBy ) + ( self.subformTop * scaleBy ) ),
                    cornerRadius = 5;

                ctx.fillStyle = bgColor;
                ctx.fillRect( pxLeft, pxTop, pxBox.width, pxBox.height );

                //  approximate bootstrap error highlighting

                //  rectangle corners drawn as by juan-mendez:
                //  https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas

                ctx.strokeStyle = borderColor;

                ctx.beginPath();
                ctx.moveTo( pxLeft + cornerRadius, pxTop );
                ctx.lineTo( pxLeft + pxBox.width - cornerRadius, pxTop );
                ctx.quadraticCurveTo( pxLeft + pxBox.width, pxTop, pxLeft + pxBox.width, pxTop + cornerRadius );
                ctx.lineTo( pxLeft + pxBox.width, pxTop + pxBox.height - cornerRadius );
                ctx.quadraticCurveTo( pxLeft + pxBox.width, pxTop + pxBox.height, pxLeft + pxBox.width - cornerRadius, pxTop + pxBox.height );
                ctx.lineTo( pxLeft + cornerRadius, pxTop + pxBox.height );
                ctx.quadraticCurveTo( pxLeft, pxTop + pxBox.height, pxLeft, pxTop + pxBox.height - cornerRadius );
                ctx.lineTo( pxLeft, pxTop + cornerRadius );
                ctx.quadraticCurveTo( pxLeft, pxTop, pxLeft + cornerRadius, pxTop );
                ctx.closePath();

                //ctx.rect( pxLeft, pxTop, pxBox.width, pxBox.height );
                ctx.stroke();
            }

            /**
             *  Export in format used by server-side renderer
             *
             *  @param  scaleBy     {Number}     Conversion factor from mm to Post Script points (PDF units)
             */

            function toServer(scaleBy) {
                var
                //  one font point is 1/72 inches, an inch is 25.4mm

                    fontScale = (72 / 25.4),
                    serialization =  {
                        'left': ((self.fixedLeft * scaleBy * self.subformScale) + (self.subformLeft * scaleBy)),
                        'top': ((self.fixedTop * scaleBy * self.subformScale) + (self.subformTop * scaleBy)),
                        'width': (self.width * scaleBy * self.subformScale),
                        'height': (self.height * scaleBy * self.subformScale),
                        'align': self.align,
                        'text': getMagicText(self.text),
                        'lineHeight': self.lineHeight * fontScale * self.subformScale,
                        'lineSpace': self.lineSpace,
                        'imgId': self.imgId,
                        'bgColor': self.bgColor,
                        'fgColor': self.fgColor,
                        'borderColor': self.borderColor,
                        'isBold': self.isBold,
                        'isItalic': self.isItalic,
                        'isUnderline': self.isUnderline
                    };

                /*
                serialization.left = parseInt(serialization.left, 10);
                serialization.top = parseInt(serialization.top, 10);
                serialization.width = parseInt(serialization.width, 10);
                serialization.height = parseInt(serialization.height, 10);
                serialization.lineHeight = parseInt(serialization.lineHeight, 10);
                */

                serialization.left = parseFloat( serialization.left );
                serialization.top = parseFloat( serialization.top );
                serialization.width = parseFloat( serialization.width );
                serialization.height = parseFloat( serialization.height );
                serialization.lineHeight = parseFloat( serialization.lineHeight );

                //  specical case for barcode elements
                if (self.hasOwnProperty('barcode')) {
                    serialization.barcode = self.barcode;
                    serialization.barcodeType = self.barcodeType;
                    serialization.barcodeExtra = self.barcodeExtra;
                }

                //  specical case for barcode elements
                if (self.hasOwnProperty('font')) {
                    serialization.font = self.font;
                }

                if (serialization.imgId && '' !== serialization.imgId) {
                    serialization.imgFixed = self.imgFixed;

                    if ( self.img && serialization.imgFixed ) {
                        //  enforce aspect on image element or HPDF.js will stretch it
                        serialization.imgAspect = ( self.img.width / self.img.height );
                        serialization.height = ( serialization.width / serialization.imgAspect );
                    }
                }

                //  special case for hyperlink elements
                if ( self.hasOwnProperty( 'linkUrl' ) && self.linkUrl ) {
                    serialization.linkUrl = self.linkUrl;
                }

                //  special case for chart elements
                if ( self.hasOwnProperty( 'isChart' ) && self.isChart ) {
                    serialization.chartOpts = self.chartOpts;
                    serialization.chartPoints = self.chartPoints;
                }

                //  Special case for embedding magic elements on server, used for Laborblatt charts MOJ-8754
                if ( self.cloneInputGroup && '' !== self.cloneInputGroup ) {
                    serialization.cloneInputGroup = self.cloneInputGroup;
                }

                if ( self.printResolution ) {
                    serialization.printResolution = self.printResolution;
                }

                //console.log('PDF scale: ' + scaleBy);
                //console.log(serialization);

                return serialization;
            }

            /**
             *  Return true if the point is within the given box
             */

            function containsPoint(x, y, scaleBy) {
                if (!scaleBy) { scaleBy = 1; }

                //  don't check subform subelements, they have a different co-ordinate space
                if (1 !== self.subformScale) {
                    return false;
                }

                var bounds = toScale(scaleBy);

                return (
                    (x >= bounds.left) &&
                        (x <= (bounds.left + bounds.width)) &&
                        (y >= bounds.top) &&
                        (y <= (bounds.top + bounds.height))
                    );
            }

            /**
             *  Return true if pixel is in saved render canvas and co-ordinates
             *
             *  TODO: rename to containsPx
             */

            function containsPx(x, y) {
                /*
                if (!self.saved.hasOwnProperty(saveAs)) {
                    Y.log('Subelement has not been saved as: ' + saveAs, 'warn', NAME);
                    return false;
                }
                */

                var
                //    save = self.saved[saveAs],
                    scaleBy = self.element.page.form.zoom,
                    myLeftPx = ((self.fixedLeft + self.subformLeft) * scaleBy),
                    myTopPx = ((self.fixedTop + self.subformTop) * scaleBy),
                    myWidthPx = (self.width * scaleBy),
                    myHeightPx = (self.height * scaleBy);

                //console.log('myLeftPx: ' + myLeftPx + ' myTopPx: ' + myTopPx + ' x: ' + x + ' y: ' + y);
                //console.log('save.elemTop: ' + save.elemTop + ' save.top: ' + save.top);
                //console.log('fixedTop: ' + self.fixedTop + ' pageBottom: ' + self.pageBottom + ' usable: ' + self.element.page.abstract.usable);

                return (
                    (x >= myLeftPx) &&
                    (x <= (myLeftPx + myWidthPx)) &&
                    (y >= myTopPx) &&
                    (y <= (myTopPx + myHeightPx))
                );
            }

            /**
             *  Returns bounds of this box at the given scale
             *
             *  @param  scaleBy     {Number}    Float
             *  @param  asInteger   {Boolean}   Currently unused
             */

            function toScale(scaleBy, asInteger) {
                if (!scaleBy) { scaleBy = 1; }

                var atScale = {
                    'left': (self.left * scaleBy),
                    'top': (self.top * scaleBy),
                    'width': (self.width * scaleBy),
                    'height': (self.height * scaleBy),
                    'lineHeight': (self.lineHeight * scaleBy)
                };

                if (asInteger) {
                    atScale.left = parseInt(atScale.left, 10);
                    atScale.top = parseInt(atScale.top, 10);
                    atScale.width = parseInt(atScale.width, 10);
                    atScale.height = parseInt(atScale.height, 10);
                }

                return atScale;
            }

            /**
             *  Return text with automatic substitutions
             */

            function getMagicText() {
                var
                    txt = self.text || '',
                    k;

                if ('' === txt || ' ' === txt) {
                    return txt;
                }

                for (k in self.magic) {
                    if (self.magic.hasOwnProperty(k)) {
                        if (-1 !== txt.indexOf(k)) {
                            txt = txt.replace(k, self.magic[k]);
                            self.nocorrect = true;
                        }

                    }
                }
                return txt;
            }

            /**
             *  Return subelement params as a string, used to make checksum
             */

            function toString(scaleBy) {
                if (!scaleBy) { scaleBy = 1; }
                var px = toScale(scaleBy, true);
                return '' +
                    px.left + ',' + px.top + ',' +
                    px.width + ',' + px.height + ',' +
                    px.lineHeight + ',' + self.text;
            }

            return self;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module configuration */
    {
        requires: []
    }
);
