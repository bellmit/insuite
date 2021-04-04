/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Generic event handlers to move and resize elements on the canvas when editing forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-canvas-box',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.handle) { Y.dcforms.handle = {}; }

        /**
         *  Get the (x, y) position of a mouse or touch event relative to keyboard, and any element of subelement
         *
         *  @param  canvasSet   {Object}    A canvas-set object
         *  @param  evt         {Object}    jQuery mouse event
         */

        Y.dcforms.handle.localizeEventFixed = function(canvasSet, evt) {

            var
                scrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft,
                scrollTop = document.body.scrollTop + document.documentElement.scrollTop,
                cnvOffset = $(canvasSet.interaction).offset(),
                x = evt.clientX + scrollLeft - Math.floor(cnvOffset.left),
                y = evt.clientY + scrollTop - Math.floor(cnvOffset.top) + 1,
                elem,
                subElem,
                saved,
                radius = Y.dcforms.TOUCH_RADIUS,
                i,
                found = {
                    'x': x,
                    'y': y,
                    'elem': null,
                    'subElem': null,
                    'atLeft': false,
                    'atTop': false,
                    'atRight': false,
                    'atBottom': false,
                    'mm': canvasSet.page.getAbstractPoint(canvasSet, x, y)
                },
                px;

            //  see if this click lies within an element on this canvas set
            for (i = 0; i < canvasSet.subElements.length; i++) {
                subElem = canvasSet.subElements[i];
                elem = subElem.element;

                //  consider only interaction elements
                if ( Y.dcforms.LAYER_INTERACTION === subElem.layer && subElem.saved && subElem.saved.fixed ) {

                    saved = subElem.saved.fixed;

                    px = {
                        'left': ( saved.mmLeft + saved.mmElemLeft ) * saved.scaleBy,
                        'top': saved.mmElemTop * saved.scaleBy,
                        'width': saved.mmWidth * saved.scaleBy,
                        'height': saved.mmHeight * saved.scaleBy
                    };

                    if (                                                            //  is interactive if:
                        ( px.left <= x ) && ( px.left + px.width >= x ) &&          //  x position over element
                        ( px.top <= y ) && ( ( px.top + px.height ) >= y ) &&       //  y position over element
                        ( elem && !elem.isHiddenBFB ) &&                            //  not hidden for KBV
                        ( false === elem.noSelect )  &&                             //  not disabled
                        ( subElem.subformTop === 0 ) &&                             //  not within a subform
                        ( !found.subElem )                                          //  no other subelem already found
                    ) {

                        found.elem = subElem.element;
                        found.subElem = subElem;

                    }

                    //  if near top left corner
                    if ( Y.dcforms.handle.getDistance( px.left, px.top, x, y ) <= radius ) {
                        found.atTop = true;
                        found.atLeft = true;
                        found.elem = subElem.element;
                        found.subElem = subElem;
                    }

                    //  if near bottom right corner
                    if ( Y.dcforms.handle.getDistance( px.left + px.width, px.top + px.height, x, y ) <= radius ) {
                        found.atBottom = true;
                        found.atRight = true;
                        found.elem = subElem.element;
                        found.subElem = subElem;
                    }
                }

            }

            return found;
        };

        /**
         *  Start drag/move of element in edit mode
         *
         *  @param  canvasSet   {Object}    A set of canvasses comprising a fixed page
         *  @param  localized   {Object}    Localized event, see above
         */

        Y.dcforms.handle.startDragFixed = function(canvasSet, localized) {

            if (canvasSet.page.form.valueEditor) {
                //  an open value editor can cause problems with mouse events
                canvasSet.page.form.valueEditor.destroy();
                canvasSet.page.form.valueEditor = null;
            }

            canvasSet.page.form.drag = {
                'mode': 'move',
                'elem': localized.elem,
                'pageName': canvasSet.page.name,
                'pageIdx': canvasSet.idx,
                'startMM': localized.mm,
                'startX': localized.x,
                'startY': localized.y,
                'startLeft': (localized.mm.x - localized.elem.mm.left),
                'startTop': (localized.mm.y  - localized.elem.mm.top)
            };
        };



        /**
         *  Start drag/move of a group of selected elements in edit mode
         *
         *  @param  canvasSet   {Object}    A set of canvasses comprising a fixed page
         *  @param  localized   {Object}    Localized event, see above
         */

        Y.dcforms.handle.startDragGroup = function(canvasSet, localized) {

            var
                selectedElements = canvasSet.page.form.groupSelect,
                i;

            //  Check that we have a selection
            if ( 0 === selectedElements.length ) {
                Y.log( 'No selected elements to drag as a group.', 'warn', NAME );
                return;
            }

            //  Close any open value editor
            if (canvasSet.page.form.valueEditor) {
                //  an open value editor can cause problems with mouse events
                canvasSet.page.form.valueEditor.destroy();
                canvasSet.page.form.valueEditor = null;
            }

            //  Set drag mode
            canvasSet.page.form.drag = {
                'mode': 'groupmove',
                'elem': localized.elem,
                'pageName': canvasSet.page.name,
                'pageIdx': canvasSet.idx,
                'startMM': localized.mm,
                'startX': localized.x,
                'startY': localized.y,
                'startLeft': (localized.mm.x - localized.elem.mm.left),
                'startTop': (localized.mm.y  - localized.elem.mm.top),
                'group': selectedElements
            };

            //  Mark position of selected elements relative to mouse position, to follow mouse movement
            for ( i = 0; i < selectedElements.length; i++ ) {
                selectedElements[i].groupDragX = localized.mm.x - selectedElements[i].mm.left;
                selectedElements[i].groupDragY = localized.mm.y - selectedElements[i].mm.top ;
            }

        };

        /**
         *  Drag a form element around on a singel fixed page
         *
         *  @param  canvasSet   {Object}    Set of fixed canvasses on which the event occurs
         *  @param  localized   {Object}    Localized event, see above
         */

        Y.dcforms.handle.moveElemFixed = function(canvasSet, localized) {
            var
                drag = canvasSet.page.form.drag,
                gridSize = parseInt(canvasSet.page.form.gridSize, 10),
                newLeft = ( localized.mm.x - drag.startLeft ),
                newTop = ( localized.mm.y - drag.startTop );

            if (!drag.elem || !drag.elem.snapToGrid) {
                gridSize = 1;
            }

            Y.log('Moving elem group: ' + drag.elem.elemType, 'debug', NAME);

            //  snap to grid
            newLeft = Y.dcforms.snapToGrid(gridSize, newLeft);
            newTop = Y.dcforms.snapToGrid(gridSize, newTop);

            if (canvasSet.page.name !== drag.pageName) {
                Y.log('Jumping element to new page: ' + canvasSet.page.name, 'debug', NAME);
            }

            //  constrain within page boundaries
            if ((newLeft + drag.elem.mm.width) > canvasSet.page.form.paper.width) {
                newLeft = (canvasSet.page.form.paper.width - drag.elem.mm.width );
            }

            if ( canvasSet.page.form.isFixed ) {
                //  on fixed forms element must lie within the page, on elastic forms they may be dragged onto overflow
                //  pages, MOJ-12057
                if ((newTop + drag.elem.mm.height) > canvasSet.page.form.paper.height) {
                    newTop = (canvasSet.page.form.paper.height - drag.elem.mm.height );
                }
            }

            if (newLeft < 0) { newLeft = 0; }
            if (newTop < 0) { newTop = 0; }

            //  TODO: clip at borders and jump between pages
            drag.elem.mm.left = newLeft;
            drag.elem.mm.top = newTop;
            //Y.log('Dragging ' +  drag.elem.elemType + ': ' + localized.x + ',' + localized.y + ' -- ' + newLeft + ',' + newTop, 'debug', NAME);
            //Y.log('Dragging subelements: ' + drag.elem.subElements[0].top + ',' + drag.elem.subElements[0].left);

            //  if there is a value editor open then it should be moved to match the new element position
            if (canvasSet.page.form.valueEditor) {
                canvasSet.page.form.valueEditor.reposition();
            }

            canvasSet.page.redraw(Y.dcforms.LAYER_INTERACTION);

        };


        /**
         *  Drag a group of form elements around on a single fixed page
         *
         *  @param  canvasSet   {Object}    Set of fixed canvasses on which the event occurs
         *  @param  localized   {Object}    Localized event, see above
         */

        Y.dcforms.handle.moveGroupFixed = function(canvasSet, localized) {
            var
                drag = canvasSet.page.form.drag,
                gridSize = canvasSet.page.form.gridSize,
                //gridSize = parseInt(canvasSet.page.form.gridSize, 10),
                newLeft, newTop,
                i;

            Y.log('Moving elem: ' + drag.elem.elemType, 'debug', NAME);

            for ( i = 0; i < drag.group.length; i++ ) {
                newLeft = localized.mm.x - drag.group[i].groupDragX;
                newTop = localized.mm.y - drag.group[i].groupDragY;

                //  constrain within page boundaries
                if ((newLeft + drag.group[i].mm.width) > canvasSet.page.form.paper.width ) {
                    newLeft = (canvasSet.page.form.paper.width - drag.group[i].mm.width );
                }

                if ( canvasSet.page.form.isFixed ) {
                    //  on fixed forms element must lie within the page, on elastic forms they may be dragged onto overflow
                    //  pages, MOJ-12057
                    if ((newTop + drag.group[i].mm.height) > canvasSet.page.form.paper.height) {
                        newTop = (canvasSet.page.form.paper.height - drag.group[i].mm.height );
                    }
                }

                if (newLeft < 0) { newLeft = 0; }
                if (newTop < 0) { newTop = 0; }

                drag.group[i].mm.left = newLeft - ( newLeft % gridSize );
                drag.group[i].mm.top = newTop - ( newTop % gridSize );

            }

            canvasSet.page.redraw(Y.dcforms.LAYER_INTERACTION);

        };

        Y.dcforms.snapToGrid = function(gridSize, feature) {
            var
                halfGrid = gridSize / 2,
                remainder = (feature % gridSize);

            feature = feature - remainder;

            if (halfGrid < remainder) {
                feature = feature + gridSize;
            }

            if (feature < 3) {
                feature = 3;
            }

            return parseInt(feature, 10);
        };

        /**
         *  Start resize of element in edit mode
         *
         *  @param  canvasSet   {Object}    A stacked set of canvasses constituing a fixed page
         *  @param  localized   {Object}    Localized event, see above
         *  @param  otherMode   {Object}    New resize modes
         */

        Y.dcforms.handle.startResizeFixed = function(canvasSet, localized, otherMode) {
            //var zoom = page.form.zoom;

            if (canvasSet.page.form.valueEditor) {
                //  an open value editor can cause problems with mouse events
                canvasSet.page.form.valueEditor.destroy();
                canvasSet.page.form.valueEditor = null;
            }

            canvasSet.page.form.drag = {
                'mode': otherMode || 'resize',
                'elem': localized.elem,
                'pageName': canvasSet.page.name,
                'pageIdx': canvasSet.idx,
                'startX': localized.x,
                'startY': localized.y,
                'startMm': localized.mm,
                'startWidth': localized.elem.mm.width,
                'startHeight': localized.elem.mm.height
            };
        };

        /**
         *  Resize a form element within a single abstract page
         *
         *  @param  canvasSet   {Object}    Fixed page reporting this event
         *  @param  localized   {Object}    Localized event, see above
         */

        Y.dcforms.handle.resizeElemFixed = function(canvasSet, localized) {
            var
                scaleBy = canvasSet.page.form.zoom,
                drag = canvasSet.page.form.drag,
                gridSize = parseInt(canvasSet.page.form.gridSize, 10),
                dX = localized.mm.x - drag.startMm.x,
                dY = localized.mm.y - drag.startMm.y,
                newWidth = drag.startWidth + dX,
                newHeight = drag.startHeight + dY,
                ctx;

            if (!drag.elem || !drag.elem.snapToGrid) {
                gridSize = 1;
            }

            newWidth = Y.dcforms.snapToGrid( gridSize, newWidth );
            newHeight = Y.dcforms.snapToGrid( gridSize, newHeight );

            if ('resize' === drag.mode || 'resizeh' === drag.mode) {
                drag.elem.mm.width = newWidth;
            }

            if ('resize' === drag.mode || 'resizev' === drag.mode) {
                drag.elem.mm.height = newHeight;
            }

            //Y.log('Resizing ' +  drag.elem.elemType + ': ' + dX + ',' + dY + ' -- ' + newWidth + ',' + newHeight, 'debug', NAME);
            //Y.log('Resizing subelements: ' + drag.elem.subElements[0].width + ',' + drag.elem.subElements[0].height);

            if (drag.elem && drag.elem.renderer && drag.elem.renderer.update) {
                if ('image' === drag.elem.elemType || 'subform' === drag.elem.elemType || 'barcode' === drag.elem.elemType) {

                    //  these elements pull data from the server on resize, so only refresh on mouseup
                    //  draw a box on the interaction layer to show new size

                    drag.dx = localized.mm.x - drag.elem.mm.left;
                    drag.dy = localized.mm.y - drag.elem.mm.top;

                    if ('resizeh' === drag.mode) { drag.dy = drag.elem.mm.height; }
                    if ('resizev' === drag.mode) { drag.dx = drag.elem.mm.width; }

                    drag.boxValid = (!( Math.abs( drag.dx ) < 3 || Math.abs( drag.dy ) < 3));
                    drag.boxColor = drag.boxValid ? '#666666' : '#ff0000';

                    ctx = canvasSet.interaction.getContext('2d');
                    ctx.clearRect(0, 0, canvasSet.interaction.width, canvasSet.interaction.height);

                    //console.log('draw box: ' + drag.elem.mm.left + ',' + drag.elem.mm.top + ' to ' + drag.dx + ',' + drag.dy);

                    Y.dcforms.drawBorder(
                        ctx,
                        drag.boxColor,
                        drag.elem.mm.left * scaleBy,
                        (drag.elem.mm.top + canvasSet.page.abstract.header) * scaleBy,
                        drag.dx * scaleBy,
                        drag.dy * scaleBy
                    );

                    drag.updateOnMouseUp = true;

                } else {

                    //  other elements can be resized directly and immediately drawn
                    drag.elem.renderer.update( Y.dcforms.nullCallback );
                    drag.elem.isDirty = true;
                    //canvasSet.page.redraw( Y.dcforms.LAYER_INTERACTION );
                    canvasSet.page.redraw();
                }
            }

        };

        Y.dcforms.handle.groupSelect = function __pageSelect( canvasSet, localized ) {
            var
                page = canvasSet.page,
                drag = page.form.drag,
                startPos = drag.groupbox,
                endPos = localized.mm,
                elem,
                i;

            var
                selBox = {
                    'left': startPos.x,
                    'top': startPos.y,
                    'width': ( endPos.x - startPos.x ),
                    'height': ( endPos.y - startPos.y )
                };

            selBox = Y.dcforms.normalizeDragBox( selBox );

            //  get a list of elements which touch the box
            for ( i = 0; i < page.elements.length; i++ ) {
                elem = page.elements[i];

                //  TODO: handle shift and ctrl drag

                if ( Y.dcforms.doBoxesOverlap( elem.mm, selBox ) ) {
                    elem.inGroupSelection = true;
                } else {
                    elem.inGroupSelection = false;
                }
            }


            page.form.updateGroupSelect( page );

            canvasSet.redraw( Y.dcforms.LAYER_INTERACTION );
        };

        /**
         *  When the use drags out a box on the page, rearrange its corners to have positive width and height
         *
         *  ie, accept boxes where the user has dragged right to left or bottom to top.
         *
         *  @param  {Object}    box
         *  @param  {Number}    left        Positive
         *  @param  {Number}    top         Positive
         *  @param  {Number}    width       Positive or negative
         *  @param  {Number}    height      Positive or negative
         */

        Y.dcforms.normalizeDragBox = function( box ) {
            if ( 0 > box.width ) {
                box.width = box.width * -1;
                box.left = box.left - box.width;
            }
            if ( 0 > box.height ) {
                box.height = box.height * -1;
                box.top = box.top - box.height;
            }
            return box;
        };

        /**
         *  Called after user selects a new element type int he FEM menu and clicks the page
         *
         *  @param  canvasSet   {Object}    Fixed page canvas set
         *  @param  localized   {Object}    Localized click, see above
         */

        Y.dcforms.handle.addElementToPage = function (canvasSet, localized) {

            if (!canvasSet.page.form.drag.nextElemType || '' === canvasSet.page.form.drag.nextElemType) {
                return;
            }

            if ('edit' !== canvasSet.page.form.mode) {
                return;
            }

            var
                page = canvasSet.page,
                drag = page.form.drag,
                elemType =  page.form.drag.nextElemType,        //  selected in form
                serialized,                                     //  minimal representation of new element
                scaleBox = {},                                  //  size relative to definition (will be scaled to fit)
                newId,                                          //  array index of new element if added [int]
                newElement;

            Y.log( 'Creating new element of type: ' + page.form.drag.nextElemType, 'info', NAME );

            //Y.log(myBox);
            //scaleBox.left = parseInt(((localized.x - myBox.left) * page.form.paper.width) / myBox.width, 10);
            //scaleBox.top = parseInt(((localized.y - myBox.top) * page.form.paper.height) / myBox.height, 10);

            //  expects drag to have completed

            scaleBox.left = parseInt(localized.mm.x - drag.dx, 10);
            scaleBox.top = parseInt(localized.mm.y - drag.dy, 10);
            scaleBox.width = drag.dx;
            scaleBox.height = drag.dy;

            scaleBox = Y.dcforms.normalizeDragBox( scaleBox );

            //  element starts out tiny to allow drag
            //scaleBox.width = 1;
            //scaleBox.height = 1;

            serialized = {
                'id': elemType + Math.floor(Math.random() * 100000),
                'type': elemType,
                'left': scaleBox.left,
                'top': scaleBox.top,
                'width': scaleBox.width,
                'height': scaleBox.height,
                'translationDirty': {
                    "en": true,
                    "de": false,
                    "de_f": true,
                    "de_m": true
                },
                'fontheight': 5,
                "font": "Helvetica",
                'display': '',
                'bgColor': 'rgba(100, 100, 100  , 0.01)',
                'fgColor': 'rgba(0, 0, 0, 1)',
                'borderColor': 'rgba(0, 0, 0, 0)',
                'align': 'left',
                'readonly': 'false'
            };

            switch(elemType) {
                case 'label':
                    serialized.value = 'caption';
                    serialized.readonly = 'true';
                    break;

                case 'textmatrix':
                    serialized.value = 'text';
                    serialized.extra = 4;
                    serialized.maxLen = 4;
                    break;

                case 'hyperlink':
                    serialized.value = 'Link';
                    serialized.fgColor = Y.dcforms.HYPERLINK_COLOR;       //  defined in template.common.js
                    serialized.isUnderline = true;
                    break;

                case 'chartmd':         serialized.value = 'CHART MD';  serialized.readonly = "true";       break;

                case 'input':           serialized.value = 'default';                                       break;
                case 'textarea':        serialized.value = 'default';                                       break;

                case 'checkbox':        //  deliberate fallthrough
                case 'checkboxtrans':
                    serialized.value = 'true';
                    // MOJ-7823 Checkbox size to 5 by default:
                    serialized.fontheight = 5;
                    break;

                case 'togglebox':       serialized.value = '*X';                                            break;
                case 'radio':           serialized.value = 'radio 1\n*radio 2';                             break;
                case 'radiotrans':      serialized.value = 'radio 1\n*radio 2';                             break;
                case 'dropdown':        serialized.value = 'option 1\n*option 2';                           break;

                case 'image':           serialized.value = '';                                              break;
                case 'barcode':         serialized.value = '0';                                             break;
                case 'audio':           serialized.value = '';                                              break;

                case 'reporttable':     serialized.value = '';          serialized.readonly = "true";       break;
                case 'labdatatable':    serialized.value = '';          serialized.readonly = "true";       break;
                case 'contacttable':    serialized.value = '';          serialized.readonly = "true";       break;
                case 'table':           serialized.value = '';          serialized.readonly = "true";       break;

                case 'meddatatable':
                    serialized.value = 'Ingredient_T\n';
                    serialized.readonly = "true";
                    break;

                default:
                    Y.log( 'Unknown element type: ' + elemType, 'warn', NAME );
            }

            serialized.defaultValue = {
                'de': serialized.value,
                'de_f': '',
                'de_m': '',
                'en': ''
            };

            //  handle special cases here (schema / tables / etc)
            switch(elemType) {
                case 'barcode':     //  deliberate fallthrough
                case 'subform':
                    page.form.drag.mode = '';
                    break;

                case 'image':
                    serialized.display = '';
                    break;

            }
            
            //  add to page object
            newId = page.elements.length;
            Y.dcforms.element.create(page, newId, serialized, onNewElementCreated);
            
            function onNewElementCreated(err, theNewElement) {

                if (err) {
                    Y.log('Could not create element: ' + err, 'warn', NAME);
                    return;
                }

                newElement = theNewElement;

                page.elements.push(newElement);
                page.form.raise('layoutChanged', page.form);
                newElement.setMode(page.mode, onNewModeSet);
            }

            function onNewModeSet(err) {
                if (err) {
                    Y.log('Error setting mode on new element: ' + err, 'warn', NAME);
                    //  continue anyway
                }

                //  return to previous edit mode and reset cursor
                //  transition to drag mode to resize the new element
                page.form.drag.mode = '';
                page.form.drag.elem = null;
                page.setTabIndexes();
                page.form.selectedElement = newElement;

                page.form.raise('elementCreated', newElement);
                page.form.raise('elementSelected', newElement);

                newElement.isDirty = true;
                page.redrawDirty();
            }

        };

        /**
         *  Automatically enlarge an element such that it contains all of its subelements
         *
         *  @param  elem    {Object}
         */

        Y.dcforms.handle.autoEnlarge = function(elem) {
            var i, se;

            //  NB: background images fill the element and will be scaled to match new size
            //  we ignore them to allow elements to be sized smaller than the current background image size
            if ( 'image' === elem.elemType || 'barcode' === elem.elemType ) {
                return;
            }

            for (i = 0; i < elem.subElements.length; i++) {
                se = elem.subElements[i];
                if (elem.mm.width < se.left + se.width) {
                    elem.mm.width = se.left + se.width;
                }
                if (elem.mm.height < se.top + se.height) {
                    elem.mm.height = se.top + se.height;
                }
            }
        };

        /**
         *  Get an outline for the editor on the page matching the bounding box on canvas
         *
         *  @param  elem        {Object}    A form element to measure
         *  @param  selectedOn  {String}    'fixed'|'asbtract'
         *  @returns            {Object}    Bounds of object on page
         */

        Y.dcforms.handle.getBounds = function(elem, selectedOn) {
            return Y.dcforms.handle.getBoundsFixed(elem, selectedOn);
        };

        /**
         *  Bounds for a text editor or table on fixed canvasses may span more than one canvas
         *
         *  @param  elem        {Object}    form element to measure
         *  @param  selectedOn  {String}    Should always be 'fixed'
         *  @returns            {Object}    Bounds of object on page
         */

        Y.dcforms.handle.getBoundsFixed = function(elem, selectedOn) {
            var
                bounds = null,
                allOk = true,
                scaleBy = elem.page.form.zoom,
                subElem,
                subElemBox,
                save,
                cnvPos,
                navAdjust = Y.dcforms.handle.navAdjust(),   //  affix can mess up vertical positioning
                i;

            for (i = 0; i < elem.subElements.length; i++) {
                subElem = elem.subElements[i];
                if (subElem && subElem.saved && subElem.saved.hasOwnProperty(selectedOn)) {

                    save = subElem.saved[selectedOn];
                    cnvPos = $('#' + save.canvasId).offset();

                    if (!cnvPos || !cnvPos.left || !cnvPos.top ) {
                        //  there are occasionally situations when subelement has not been
                        //  rendered to a canvas, eg during load or resize operation
                        cnvPos = { 'left': 0, top: 0 };
                        allOk = false;
                    }

                    subElemBox = {
                        'left': (subElem.fixedLeft * scaleBy) + cnvPos.left,
                        'top': (subElem.fixedTop * scaleBy) + cnvPos.top,
                        'width': (subElem.width * scaleBy),
                        'height': (subElem.height * scaleBy)
                    };

                    if ( !bounds ) {
                        bounds = subElemBox;
                    } else {
                        bounds = Y.dcforms.mergeBoxes(bounds, subElemBox);
                    }

                }
            }

            if (!bounds) {
                bounds = elem.mm.toScale( elem.page.form.zoom );
            }

            bounds.lineHeight = (elem.mm.lineHeight * scaleBy);
            bounds.top = bounds.top - navAdjust;
            bounds.allOk = (allOk && (cnvPos && true));

            //console.log('canvas-box element bounds cnv: ', cnvPos, ' navAdjust:', navAdjust, 'allOK: ', (bounds.allOk ? 'TRUE': 'FALSE'));
            return bounds;
        };

        Y.dcforms.handle.navAdjust = function() {
            var navHeader = $('#NavBarHeader');
            if (navHeader[0] && navHeader.hasClass('NavBarHeader-fixed')) {
                return navHeader.height();
            }
            return 0;
        };

        /**
         *  Simple euclidean distance between two points
         *
         *  @param ax   {Number}
         *  @param ay   {Number}
         *  @param bx   {Number}
         *  @param by   {Number}
         *  @returns    {Number}
         */

        Y.dcforms.handle.getDistance = function ( ax, ay, bx, by ) {
            var
                dx = ax - bx,
                dy = ay - by;

            return Math.sqrt( ( dx * dx ) + ( dy * dy ) );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);