/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Set of stacked canvasses to represent layers of a single fixed page
 */

/*eslint prefer-template:0, strict:0 */

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-canvas-set',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }

        var
            //  border colors when dragging out element rectangles
            BOX_COLOR_VALID = '#666666',
            BOX_COLOR_INVALID = '#ff0000';


        Y.dcforms.createCanvasSet = function(page, idx) {
            var
                self = {
                    'page': page,
                    'idx': idx,
                    'id': 'cnvP' + page.UID + 'f' + idx,
                    'width': Math.floor(page.form.paper.width * page.form.zoom),
                    'height': Math.floor(page.form.paper.height * page.form.zoom),

                    'subElements': [],
                    'interactiveSubElements': [],
                    'isInDOM': false,

                    //  canvasses
                    'bg': null,
                    'text': null,
                    'interaction': null

                };

            self.createBrowserCanvas = function( lbl ) {
                var cnv = document.createElement( 'canvas' );
                cnv.width = self.width;
                cnv.height = self.height;
                cnv.id = self.id + lbl;
                return cnv;
            };

            self.addToDOM = function() {

                if ( Y.dcforms.isOnServer || page.form.isHidden ) {
                    Y.log( 'Not adding canvasses to DOM (form is hidden or on server.', 'warn', NAME );
                    return;
                }

                var
                    divFixed = page.jqSelf('fixed'),
                    vadjust = {},
                    html = '' +
                        //'<b>Fixed canvas ' + page.name + '::' + idx + '</b></br>' +
                        '<div id="div' + self.id + '" style="border: 1px #000000;">' +
                        /*
                         '<canvas id="' + self.id + 'bg" width="' + self.width + '" height="' + self.height + '"></canvas>' +
                         '<canvas id="' + self.id + 'text" width="' + self.width + '" height="' + self.height + '"></canvas>' +
                         '<canvas id="' + self.id + 'interaction" width="' + self.width + '" height="' + self.height + '"></canvas>' +
                         */
                        '</div><br/><hr/><br/>';

                if ( !divFixed || !divFixed.length || !divFixed.get( 0 ) ) {
                    Y.log('Could not create canvasses, container not present', 'debug', NAME);
                    //console.log('Stack trace follows', (new Error().stack));
                    return;
                }

                divFixed.append( html );

                //  clear any previous offsets
                $( self.text ).css( 'position', 'auto' ).css( 'top', 0 );
                $( self.interaction ).css( 'position', 'auto' ).css( 'top', 0 );

                //  add canvasses to page
                $( '#div' + self.id )
                    .append( self.bg )
                    //.append( '<br/>' )
                    .append( self.text )
                    //.append( '<br/>' )
                    .append( self.interaction );

                //  overlay canvasses
                vadjust.text = $( self.bg ).position().top - $( self.text ).position().top;
                vadjust.interaction = $( self.bg ).position().top - $( self.interaction ).position().top;

                //  layer offsets are not always measurable, keep good values if they exist
                if ( 0 !== vadjust.text && 0 !== vadjust.interaction ) {
                    $( self.text ).css( 'position', 'relative' ).css( 'top', vadjust.text );
                    $( self.interaction ).css( 'position', 'relative' ).css( 'top', vadjust.interaction );
                    $( '#div' + self.id ).css( 'height', self.height );
                }

                //  attach event handlers
                $( self.interaction ).off( 'mousemove' ).on( 'mousemove', onMouseMove );
                $( self.interaction ).off( 'mousedown' ).on( 'mousedown', onMouseDown );
                $( self.interaction ).off( 'mouseup' ).on( 'mouseup', onMouseUp );

                self.isInDOM = true;
            };

            self.removeFromDOM = function () {
                var jqContainer;

                if ( Y.dcforms.isOnServer || page.form.isHidden ) {
                    Y.log( 'Not adding canvasses to DOM (form is hidden or on server.', 'warn', NAME );
                    return;
                }

                jqContainer = $( '#div' + self.id );

                self.isInDOM = false;

                if ( jqContainer && jqContainer.length && jqContainer.get( 0) ) {
                    jqContainer.remove();
                    return true;
                }

                return false;
            };

            self.createCanvasses = function() {
                if ( Y.dcforms.isOnServer ) {
                    self.serverInit();
                } else {
                    self.browserInit();
                }
            };

            /**
             *  Insert new canvas objects into DOM
             */

            self.browserInit = function() {
                self.bg = self.createBrowserCanvas( 'bg' );
                self.text = self.createBrowserCanvas( 'text' );
                self.interaction = self.createBrowserCanvas( 'interaction' );
            };

            /**
             *  Create node canvas object for drawing on server
             *
             *  Note that on server all layers are represented by a single canvas
             *  This routine is also used on the client when initializing forms which are not directly drawn
             */

            self.serverInit = function() {
                var
                    customFonts = self.page.form.getCustomFonts(),
                    i;

                if ( page.form.noCanvas ) {
                    self.bg = Y.dcforms.makeStubCanvasObject( self.width, self.height );
                } else {
                    self.bg = Y.dcforms.makeCanvasObject( self.width, self.height );
                }

                self.text = self.bg;
                self.interaction = self.bg;

                //  Add custom TTF fonts
                self.bg.customFonts = {};
                Y.log( 'Custom fonts: ' + JSON.stringify(customFonts, undefined, 2), 'debug', NAME );
                for ( i = 0; i < customFonts.length; i++ ) {
                    if ( Y.doccirrus.media.fonts.addToCanvas ) {
                        Y.log( 'Adding custom TTF font to node canvas for page ' + page.pageNo, 'debug', NAME );
                        Y.doccirrus.media.fonts.addToCanvas( self.bg, customFonts[i] );
                    } else {
                        // if here then we are actually on the client, but will not draw this form
                        Y.log( 'Assuming font ' + customFonts[i] + ' for page ' + page.pageNo, 'debug', NAME );
                    }
                }
            };

            /**
             *  Add a DOM event listener to the interaction layer
             *
             *  @param  evtName {String}
             *  @param  handler {Function}
             */

            self.addListener = function(evtName, handler) {
                if (Y.dcforms.isOnServer) { return; }

                $(self.interaction)
                    .off(evtName)
                    .on(evtName, handler);
            };

            /**
             *  Collect the subelements belonging to this fixed page
             */

            self.claimSubElements = function() {
                var i, j, elem, subelem, spliceElements, magic = self.page.getMagicVars(self.idx);

                self.subElements = [];

                //  cloned interaction subelements
                for ( i = 0; i < page.clonedSubElements.length; i++ ) {
                    subelem = page.clonedSubElements[i];
                    if (subelem.fixedPage === self.idx && !subelem.hideOnCanvas ) {
                        subelem.magic = magic;
                        self.subElements.push(subelem);

                        if ( subelem.interactive ) {
                            subelem.layer = Y.dcforms.LAYER_INTERACTION;
                        } else {
                            //subelem.layer = Y.dcforms.LAYER_TEXT;
                            subelem.layer = Y.dcforms.LAYER_TEXT;
                        }

                    }
                }

                for (i = 0; i < page.tabMap.length; i++) {
                    elem = page.elements[ page.tabMap[i] ];

                    spliceElements = elem.subElements;

                    if ('subform' === elem.elemType) {
                        spliceElements = elem.renderer.getSubElements();
                        if ('edit' === self.page.form.mode) {
                            spliceElements.push(elem.subElements[0]);
                        }
                    }

                    for (j = 0; j < spliceElements.length; j++) {
                        subelem = spliceElements[j];
                        if ( subelem.fixedPage === self.idx && !subelem.hideOnCanvas ) {
                            subelem.magic = magic;
                            self.subElements.push(subelem);
                        }

                        if ( subelem.interactive ) {
                            subelem.layer = Y.dcforms.LAYER_INTERACTION;
                        }
                    }
                }

                if (page.bgElem && page.bgElem.subElements && page.bgElem.subElements[0]) {
                    subelem = page.bgElem.subElements[1];
                    subelem.fixedTop = page.bgElem.mm.top;
                    subelem.layer = Y.dcforms.LAYER_BG;
                    subelem.element = page.bgElem;
                    subelem.isPageBg = true;

                    self.subElements.push(subelem);
                }

                if ( self.idx > 0 ) {
                    //  on overflow page, use overflow header and footer
                    if (page.headerOverflowElem && page.headerOverflowElem.renderer && page.headerOverflowElem.renderer.getSubElements ) {
                        spliceElements = page.headerOverflowElem.renderer.getSubElements();
                        for (i = 0; i < spliceElements.length; i++) {
                            subelem = spliceElements[i];
                            //subelem.fixedTop = 10; //subelem.element.mm.top;
                            subelem.layer = Y.dcforms.LAYER_TEXT;
                            subelem.magic = magic;
                            self.subElements.push( subelem );
                        }
                    }

                    if (page.footerOverflowElem && page.footerOverflowElem.renderer && page.footerOverflowElem.renderer.getSubElements) {
                        spliceElements = page.footerOverflowElem.renderer.getSubElements();
                        for (i = 0; i < spliceElements.length; i++) {
                            subelem = spliceElements[i];
                            subelem.subformTop = page.abstract.headerOverflow + page.abstract.usableOverflow;
                            subelem.layer = Y.dcforms.LAYER_BG;
                            subelem.magic = magic;
                            self.subElements.push( subelem );
                        }
                    }

                } else {
                    //  on first page, use default header and footer

                    if (page.headerElem && page.headerElem.renderer && page.headerElem.renderer.getSubElements ) {
                        spliceElements = page.headerElem.renderer.getSubElements();
                        for (i = 0; i < spliceElements.length; i++) {
                            subelem = spliceElements[i];
                            //subelem.fixedTop = 10; //subelem.element.mm.top;
                            subelem.layer = Y.dcforms.LAYER_TEXT;
                            subelem.magic = magic;
                            self.subElements.push(subelem);
                        }
                    }

                    if (page.footerElem && page.footerElem.renderer && page.footerElem.renderer.getSubElements) {
                        spliceElements = page.footerElem.renderer.getSubElements();
                        for (i = 0; i < spliceElements.length; i++) {
                            subelem = spliceElements[i];
                            subelem.subformTop = page.abstract.header + page.abstract.usable;
                            subelem.layer = Y.dcforms.LAYER_BG;
                            subelem.magic = magic;
                            self.subElements.push(subelem);
                        }
                    }
                }


            };

            /**
             *  Redraw one or all of the layers
             *
             *  @param  layer   {Number}    Corresponds to page.LAYER_X
             */

            self.redraw = function( layer ) {

                if ( !self.bg ) {
                    self.createCanvasses();
                }

                if (!Y.dcforms.isOnServer) {
                    if (page.isHidden()) {
                        $('#div' + self.id).hide();
                        $('#' + page.getDomId()).hide();
                        return;
                    } else {
                        $( '#div' + self.id ).show();
                        $( '#' + page.getDomId() ).show();
                    }
                }

                if (!layer || Y.dcforms.LAYER_ALL === layer) {
                    self.redraw(Y.dcforms.LAYER_BG);
                    self.redraw(Y.dcforms.LAYER_TEXT);
                    self.redraw(Y.dcforms.LAYER_INTERACTION);
                    return;
                }

                self.claimSubElements();

                var
                    scaleBy = page.form.zoom,
                    cnv,
                    ctx,
                    i,
                    subelem;


                switch (layer) {
                    case Y.dcforms.LAYER_BG:            cnv = self.bg; break;
                    case Y.dcforms.LAYER_TEXT:          cnv = self.text; break;
                    case Y.dcforms.LAYER_INTERACTION:   cnv = self.interaction; break;
                }

                if (!cnv) {
                    Y.log('Unknown layer requested: ' + JSON.stringify(layer), 'warn', NAME);
                    return;
                }

                ctx = cnv.getContext('2d');
                ctx.clearRect(0, 0, cnv.width, cnv.height);

                /*
                //  debug only -- highlight layers in different colors, more useful when separated
                switch (layer) {
                    case Y.dcforms.LAYER_BG:            ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';    break;
                    case Y.dcforms.LAYER_TEXT:          ctx.fillStyle = 'rgba(0, 255, 0, 0.25)';    break;
                    case Y.dcforms.LAYER_INTERACTION:   ctx.fillStyle = 'rgba(0, 0, 255, 0.25)';    break;
                }
                ctx.fillRect(0, 0, cnv.width, cnv.height);
                */

                for (i = 0; i < self.subElements.length; i++) {
                    subelem = self.subElements[i];

                    //  Overlays for form editor and captive form portal

                    if (layer === subelem.layer && subelem.element) {

                        subelem.renderToCanvas(
                            ctx,                                //  2d canvas drawing context
                            scaleBy,                            //  scale factor
                            subelem.element.mm.left,            //  element left (fixed page)
                            subelem.fixedTop,                   //  position from top of fixed page
                            0,                                  //  voffset
                            true,                               //  draw background
                            'fixed'                             //  cache key
                        );

                    }
                }

                if ( Y.dcforms.LAYER_INTERACTION === layer ) {
                    self.redrawInteractive( ctx );
                }
            };

            /**
             *  Redraw interaction elements only (fewer elements, only done on client, needs to be fast)
             *  @param ctx
             */

            self.redrawInteractive = function( ctx ) {
                var
                    useHighlight = ( page.form.highlightEditable && ( 'locked' !== page.form.mode ) ) || false,
                    isFillMode = ( 'fill' === page.form.mode ),
                    isEditMode = ( 'edit' === self.page.form.mode ),
                    isLockMode = ( 'locked' === self.page.form.mode ),
                    scaleBy = page.form.zoom,
                    isBound, isLinked, markColor,
                    i, subelem;

                //  show structure in form editor
                if ( isEditMode ) {
                    //  highlight header and footer in edit mode
                    if ( self.idx === 0 ) {

                        //  header and footer on first page

                        if (self.page.headerElem) {
                            ctx.fillStyle = Y.dcforms.COLOR_HEADER_HIGHLIGHT;

                            //  first page header
                            ctx.fillRect(
                                0, 0,
                                self.page.headerElem.mm.width * self.page.form.zoom,
                                self.page.headerElem.mm.height * self.page.form.zoom
                            );
                        }

                        if ( self.page.footerElem ) {
                            ctx.fillStyle = Y.dcforms.COLOR_FOOTER_HIGHLIGHT;
                            ctx.fillRect(
                                0,
                                ((self.page.abstract.header + self.page.abstract.usable) * self.page.form.zoom),
                                self.page.footerElem.mm.width * self.page.form.zoom,
                                self.page.footerElem.mm.height * self.page.form.zoom
                            );
                        }

                    } else {

                        //  header and footer on overflow pages

                        if (self.page.headerOverflowElem) {
                            ctx.fillStyle = Y.dcforms.COLOR_HEADER_HIGHLIGHT;

                            //  first page header
                            ctx.fillRect(
                                0, 0,
                                self.page.headerOverflowElem.mm.width * self.page.form.zoom,
                                self.page.headerOverflowElem.mm.height * self.page.form.zoom
                            );
                        }

                        if ( self.page.footerOverflowElem ) {
                            ctx.fillStyle = Y.dcforms.COLOR_FOOTER_HIGHLIGHT;
                            ctx.fillRect(
                                0,
                                ( ( self.page.abstract.headerOverflow + self.page.abstract.usableOverflow ) * self.page.form.zoom ),
                                self.page.footerOverflowElem.mm.width * self.page.form.zoom,
                                self.page.footerOverflowElem.mm.height * self.page.form.zoom
                            );
                        }

                    }

                    //  show outlines and drag handles of elements
                    for ( i = 0; i < self.subElements.length; i++ ) {
                        subelem = self.subElements[i];
                        if ( Y.dcforms.LAYER_INTERACTION === subelem.layer && subelem.element) {

                            subelem.highlight(
                                ctx,                            //  2d canvas drawing context
                                page.form.zoom,                 //  scale factor
                                subelem.element.mm.left,        //  element left (fixed page)
                                subelem.fixedTop,               //  element top (fixed page)
                                Y.dcforms.COLOR_EDITOR,         //  highlight fill color
                                Y.dcforms.COLOR_EDITOR          //  highlight border color
                            );

                            if ( subelem.element && subelem.element.inGroupSelection ) {
                                subelem.highlight(
                                    ctx,                            //  2d canvas drawing context
                                    page.form.zoom,                 //  scale factor
                                    subelem.element.mm.left,        //  element left (fixed page)
                                    subelem.fixedTop,               //  element top (fixed page)
                                    Y.dcforms.COLOR_GROUP_SELECT,         //  highlight fill color
                                    Y.dcforms.COLOR_GROUP_SELECT          //  highlight border color
                                );
                            }

                            if ( subelem.bindmark && 0 === subelem.subformTop) {
                                isBound = ( subelem.element.schemaMember && '' !== subelem.element.schemaMember );
                                isLinked = ( subelem.element.inheritFrom && '' !== subelem.element.inheritFrom );

                                markColor = ( isBound ? Y.dcforms.COLOR_BOUND : Y.dcforms.COLOR_UNBOUND );
                                markColor = ( isLinked ? Y.dcforms.COLOR_LINKED : markColor );

                                Y.dcforms.drawBindingMark(
                                    ctx,
                                    markColor,
                                    subelem.fixedLeft * scaleBy,
                                    subelem.fixedTop * scaleBy,
                                    subelem.width * scaleBy,
                                    subelem.height * scaleBy
                                );
                                Y.dcforms.drawMovingMark(
                                    ctx,
                                    markColor,
                                    subelem.fixedLeft * scaleBy,
                                    subelem.fixedTop * scaleBy,
                                    subelem.width * scaleBy,
                                    subelem.height * scaleBy
                                );
                            }

                            //if ( self.page.form.hoverSubElement === subelem ) {
                            //    Y.dcforms.drawHoverName( ctx, subelem );
                            //}

                        }

                    }

                }

                //  show element highlights
                for ( i = 0; i < self.subElements.length; i++ ) {
                    subelem = self.subElements[i];
                    if ( Y.dcforms.LAYER_INTERACTION === subelem.layer && subelem.element ) {

                        //  show editable elements on captive form portal

                        if ( useHighlight && subelem.hasHighlight ) {
                            subelem.highlight(
                                ctx,                            //  2d canvas drawing context
                                page.form.zoom,                 //  scale factor
                                subelem.element.mm.left,        //  element left (fixed page)
                                subelem.fixedTop,               //  element top (fixed page)
                                Y.dcforms.COLOR_HIGHLIGHT,      //  highlight fill color
                                Y.dcforms.COLOR_HIGHLIGHT       //  highlight border color
                            );
                        }

                        //  show entries with invalid input in 'fill' mode
                        if ( ( isFillMode || isLockMode ) && subelem.hasError ) {
                            subelem.highlight(
                                ctx,                            //  2d canvas drawing context
                                page.form.zoom,                 //  scale factor
                                subelem.element.mm.left,        //  element left (fixed page)
                                subelem.fixedTop,               //  element top (fixed page)
                                Y.dcforms.COLOR_INVALID,        //  highlight fill color
                                Y.dcforms.COLOR_BORDER_INVALID  //  highlight border color
                            );
                        }

                        //  show hover element in fill or edit mode
                        if ( subelem.hasHover ) {
                            subelem.highlight(
                                ctx,                            //  2d canvas drawing context
                                page.form.zoom,                 //  scale factor
                                subelem.element.mm.left,        //  element left (fixed page)
                                subelem.fixedTop,               //  element top (fixed page)
                                Y.dcforms.COLOR_HOVER,          //  highlight fill color
                                Y.dcforms.COLOR_BORDER_HOVER    //  highlight border color
                            );
                        }


                    }

                    /* debug element cloning
                    if ( subelem.cloneable ) {
                        subelem.highlight(
                            ctx,                            //  2d canvas drawing context
                            page.form.zoom,                 //  scale factor
                            subelem.element.mm.left,        //  element left (fixed page)
                            subelem.fixedTop,               //  element top (fixed page)
                            'rgba(0,255,0,0.5)',            //  highlight fill color
                            Y.dcforms.COLOR_BORDER_HOVER    //  highlight border color
                        );
                    }
                    */

                }

            };

             self.resize = function(callback) {

                 self.width = Math.floor(page.form.paper.width * page.form.zoom);
                 self.height = Math.floor(page.form.paper.height * page.form.zoom);

                 self.bg.width = self.width;
                 self.bg.height = self.height;

                 if ( Y.dcforms.isOnServer ) {
                     // on server there is only one canvas and no DOM to update
                     return callback(null);
                 }

                 self.text.width = self.width;
                 self.text.height = self.height;
                 self.interaction.width = self.width;
                 self.interaction.height = self.height;

                 if ( !self.isInDOM ) {
                     // this is an abstract or hidden form, not present in DOM
                     return callback( null );
                 }

                 var vadjust = {};

                 // change canvas style size (like image size, does not change resolution)
                 $( self.bg ).width( self.width ).height( self.height );
                 $( self.text ).width( self.width ).height( self.height );
                 $( self.interaction ).width( self.width ).height( self.height );

                 // change canvas viewport size (change resolution)
                 self.bg.width = self.width;
                 self.bg.height = self.height;
                 self.text.width = self.width;
                 self.text.height = self.height;
                 self.interaction.width = self.width;
                 self.interaction.height = self.height;

                 $(self.text).css('position', 'auto').css('top', 0);
                 $(self.interaction).css('position', 'auto').css('top', 0);

                 vadjust.text = $(self.bg).position().top - $(self.text).position().top;
                 vadjust.interaction = $(self.bg).position().top - $(self.interaction).position().top;

                 $(self.text).css('position', 'relative').css('top', vadjust.text);
                 $(self.interaction).css('position', 'relative').css('top', vadjust.interaction);

                 $('#div' + self.id).css('height', self.height);

                 callback(null);
             };

            /**
             *  Set hover highlight on element under mouse
             *
             *  @param  localized     {Object}    From mousemove event
             */

             function setHover( localized ) {
                var i;

                //  clear bg hover from previous element
                if ( self.page.form.hoverSubElement ) {
                    self.page.form.hoverSubElement.hasHover = false;
                }

                //  add bg hover to new element
                if ( localized.subElem && ( 'fill' === self.page.form.mode ) ) {
                    localized.subElem.hasHover = true;
                }

                self.page.form.hoverElement = localized.elem;
                self.page.form.hoverSubElement = localized.subElem;

                for ( i = 0; i < self.page.canvasses.length; i++ ) {
                    self.page.canvasses[i].redraw( Y.dcforms.LAYER_INTERACTION );
                }

             }

            //  EVENT HANDLERS

            function onMouseDown( evt ) {

                //  locked forms do not respond to any input
                if ( 'locked' === page.form.mode ) {
                    return;
                }

                var
                    localized = Y.dcforms.handle.localizeEventFixed( self, evt ),
                    onEdge = ( localized.atTop || localized.atBottom || localized.atLeft || localized.atRight );

                if ( !localized.elem ) {
                    //  user clicked the background of page, if in add element mode then drag out a box
                    if ( 'addelement' === page.form.drag.mode ) {
                        page.form.drag.mode = 'addelementsize';
                        self.page.form.drag.addbox = localized.mm;
                        return;
                    }

                    //  start selection of elements on the page
                    page.form.drag.mode = 'groupselect';
                    self.page.form.drag.groupbox = localized.mm;
                    self.page.form.drag.startLoc = localized.mm;        //  TODO: unify with add element
                    return;
                }

                //  select element to group if ctrl+click in edit mode
                if ( 'edit' === self.page.form.mode && localized.elem && localized.elem.elemId && self.page.form.kb.ctrl ) {
                    localized.elem.inGroupSelection = !localized.elem.inGroupSelection;
                    self.page.form.updateGroupSelect( self.page );
                    page.form.drag.mode = 'groupadd';
                    return;
                }

                //  start drag of element group if mousedown on a group selection
                if ( 'edit' === self.page.form.mode && localized.elem && localized.elem.elemId && localized.elem.inGroupSelection ) {
                    Y.log( 'Starting group move: ' + localized.elem.elemId, 'debug', NAME );
                    Y.dcforms.handle.startDragGroup( self, localized );
                    return;
                }

                //  select the element in left panel if editing
                if ( 'edit' === self.page.form.mode && localized.elem && localized.elem.elemId ) {
                    Y.log( 'Mousedown localized to element: ' + localized.elem.elemId, 'debug', NAME );
                    page.form.setSelected( 'fixed', localized.elem );
                }

                //  start drag events if mousedown is on drag handle
                if ( onEdge && 'edit' === self.page.form.mode ) {

                    if ( localized.atRight && localized.atBottom ) {
                        Y.log( 'Starting element resize: ' + localized.elem.elemId, 'debug', NAME );
                        Y.dcforms.handle.startResizeFixed( self, localized, 'resize' );
                        return;
                    }

                    if ( localized.atTop || localized.atLeft ) {
                        Y.log( 'Starting element move: ' + localized.elem.elemId, 'debug', NAME );
                        Y.dcforms.handle.startDragFixed( self, localized );
                        //return;
                    }

                }

            }

            function onMouseMove(evt) {
                self.interaction.style.cursor = 'auto';

                //  locked forms do not respond to any input
                if ('locked' === page.form.mode) {
                    self.interaction.style.cursor = 'not-allowed';
                    return;
                }

                var
                    localized = Y.dcforms.handle.localizeEventFixed(self, evt),
                    drag = self.page.form.drag,
                    scaleBy,
                    //onEdge = (localized.atTop || localized.atBottom || localized.atLeft || localized.atRight),
                    ctx;

                self.interaction.style.cursor = 'auto';
                if (localized.subElem && localized.subElem.cursor) {
                    self.interaction.style.cursor = localized.subElem.cursor;
                }

                if ( 'edit' === self.page.form.mode ) {
                    switch ( drag.mode ) {
                        case '':
                            if (localized.atTop || localized.atLeft) { self.interaction.style.cursor = 'move'; }
                            if (localized.atBottom) { self.interaction.style.cursor = 'ns-resize'; }
                            if (localized.atRight) { self.interaction.style.cursor = 'ew-resize'; }
                            if (localized.atBottom && localized.atRight) { self.interaction.style.cursor = 'nwse-resize'; }
                            break;

                        case 'addelement':
                            if ('edit' === page.form.mode) {
                                self.interaction.style.cursor = localized.elem ? 'auto' : 'crosshair';
                            }
                            break;

                        case 'addelementsize':
                            //if ('edit' === page.form.mode) {
                                self.interaction.style.cursor = localized.elem ? 'auto' : 'crosshair';
                                scaleBy = self.page.form.zoom;

                                drag.dx = localized.mm.x - drag.addbox.x;
                                drag.dy = localized.mm.y - drag.addbox.y;

                                drag.boxValid = (!( Math.abs( drag.dx ) < 3 || Math.abs( drag.dy ) < 3));
                                drag.boxColor = drag.boxValid ? BOX_COLOR_VALID : BOX_COLOR_INVALID;

                                ctx = self.interaction.getContext('2d');
                                ctx.clearRect(0, 0, self.interaction.width, self.interaction.height);

                                Y.dcforms.drawBorder(
                                    ctx,
                                    drag.boxColor,
                                    drag.addbox.x * scaleBy,
                                    (drag.addbox.y + self.page.abstract.header) * scaleBy,
                                    drag.dx * scaleBy,
                                    drag.dy * scaleBy
                                );
                            //}

                            break;

                        case 'groupselect':

                            self.interaction.style.cursor = 'crosshair';
                            scaleBy = self.page.form.zoom;

                            drag.dx = localized.mm.x - drag.groupbox.x;
                            drag.dy = localized.mm.y - drag.groupbox.y;

                            drag.boxValid = (!( Math.abs( drag.dx ) < 3 || Math.abs( drag.dy ) < 3));
                            drag.boxColor = drag.boxValid ? BOX_COLOR_VALID : BOX_COLOR_INVALID;

                            ctx = self.interaction.getContext('2d');
                            //ctx.clearRect(0, 0, self.interaction.width, self.interaction.height);

                            self.redraw( Y.dcforms.LAYER_INTERACTION );

                            Y.dcforms.drawBorder(
                                ctx,
                                drag.boxColor,
                                drag.groupbox.x * scaleBy,
                                (drag.groupbox.y + self.page.abstract.header) * scaleBy,
                                drag.dx * scaleBy,
                                drag.dy * scaleBy
                            );

                            break;

                        case 'groupmove':
                            Y.dcforms.handle.moveGroupFixed(self, localized);
                            break;

                        case 'resize':
                        case 'resizev':
                        case 'resizeh':
                            Y.dcforms.handle.resizeElemFixed(self, localized);
                            page.form.raise('elementResize', page.form.drag.elem);
                            break;

                        case 'move':
                            Y.dcforms.handle.moveElemFixed(self, localized);
                            page.form.raise('elementMove', page.form.drag.elem);
                            break;

                        case 'schema':
                            if (localized.elem) {
                                page.form.drag.over = localized.elem;
                                page.form.drag.canvasSet = self;
                                Y.log('schema drag over ' + localized.elem.elemId, 'debug', NAME);

                            } else {
                                //Y.log('schema drag over page', 'debug', NAME);
                                page.form.drag.over = null;
                                page.form.drag.canvasSet = self;
                            }
                            break;
                    }
                }

                //  update hover
                if (
                //    ( 'fill' === self.page.form.mode ) &&
                    ( localized.subElem !== self.page.form.hoverSubElement )
                ) {

                    setHover( localized );

                }
            }

            function onMouseUp(evt) {

                var
                    localized = Y.dcforms.handle.localizeEventFixed( self, evt ),
                    drag = self.page.form.drag,
                    newDrag =  { 'mode': '', 'elem': null },
                    selection = window.getSelection(),
                    selectedText = selection.toString();

                //  drag mode might be undefined
                drag.mode = drag.mode || '';

                //  finalize adding an element to the page
                if ( 'addelementsize' === drag.mode && drag.boxValid ) {
                    Y.dcforms.handle.addElementToPage(self, localized);
                    return;
                }

                //  finalize dragging out a box on the page to select a group of elements
                if ( 'groupselect' === drag.mode ) {
                    if ( drag.boxValid  ) {
                        Y.dcforms.handle.groupSelect(self, localized);
                    }

                    drag.mode = '';
                    drag.elem = null;
                    delete drag.groupbox;
                    delete drag.startLoc;
                }

                //  finalize dragging out a box on the page to select a group of elements
                if ( 'groupadd' === drag.mode ) {
                    drag.mode = '';
                    self.redraw( Y.dcforms.LAYER_INTERACTION );
                    self.page.form.updateGroupSelect( self.page );
                    return;
                }

                //  finalize a drag-resize operation
                if ( drag.updateOnMouseUp ) {
                    drag.elem.renderer.update(function() {
                        drag.elem.isDirty = true;
                        drag.elem.page.redraw();
                    });
                }


                //  if text is selected, do not unselect the element, allow mouse selection in text/html areas
                if ( selection && 1 === selection.rangeCount && selection.anchorNode && selectedText ) {
                    //  ignore this mouseup to preserve the text selection
                    return;
                }

                //  raise event when element or page background is clicked
                if ( localized.elem ) {

                    //console.log('clicked editable element: ' + localized.elem.elemId, 'debug', NAME);
                    if ( localized.elem.renderer.handleClick ) {
                        localized.elem.renderer.handleClick( localized );
                        page.redrawDirty();
                    } else {
                        page.form.setSelected( 'fixed', localized.elem );
                    }

                } else {
                    //  no element was clicked or created, raise 'page selected' event and deselect any element
                    Y.log( 'No element was clicked, selecting page and not element -' + drag.mode, 'debug', NAME );
                    self.page.form.setSelected( 'fixed', null );


                    if ( self.page.form.selectedElement || self.page.form.valueEditor ) {
                        self.page.form.setSelected( 'fixed', null );
                    }

                    self.page.form.raise( 'pageSelected', self.page );
                }

                if ( drag && drag.mode && '' !== drag.mode ) {

                    $( self.interaction ).css( 'cursor', 'auto' );

                    //  snap element size to include all subelements
                    if ( drag.elem && drag.elem.renderer ) {
                        Y.dcforms.handle.autoEnlarge( drag.elem );
                    }

                    //  allow element to redefine subelement positions
                    if ( drag.elem && drag.elem.renderer && drag.elem.renderer.update ) {
                        //  element should not need an update on move
                        if ( 'move' !== drag.mode ) {
                            drag.elem.renderer.update( onElemUpdate );
                            drag.elem.isDirty = true;
                            //page.form.setSelected( 'fixed', null );
                        }
                        self.page.form.drag = newDrag;
                        return;
                    }

                    onElemUpdate();
                }

                function onElemUpdate() {
                    //  tell form editor to update
                    self.page.form.raise( 'layoutChanged', self.page.form );

                    //  element order may have changed
                    self.page.setTabIndexes();
                    self.page.redraw( Y.dcforms.LAYER_TEXT );
                }

                self.page.form.drag = newDrag;
            }

            if (Y.dcforms.isOnServer) {
                self.serverInit();
            } else {
                self.browserInit();
            }

            return self;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-utils' ]
    }
);