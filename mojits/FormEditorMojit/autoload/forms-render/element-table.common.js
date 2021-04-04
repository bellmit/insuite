/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render table elements and attach element-specific events
 */

/*jslint anon:true, sloppy:true, nomen:true*/

//  Allowing late definitions for readability - lets us put the callback chains is execution order from top to bottom

/*eslint prefer-template:0 */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-table',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms table types.', 'debug', NAME);

        /**
         *  Factory method for table element renderers
         *
         *  This differs from the previous table renderer in overflowing onto next page.  Controls to add and
         *  remove rows have been removed from this version due to lack of use - tables are trypically bound
         *  rather than filled by the user.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeTableRenderer = function(element, creationCallback) {

            var
                dataset = [],                               //_ set of objects to be mapped / displayed [array:object]

                userLang = element.getCurrentLang(),        //_ language and gender [string]
                strValue = element.defaultValue[userLang],  //_ table definition from editor [string]
                dcCols = Y.dcforms.stringToCols(strValue),  //_ table definition, parsed [object]

                padOffset = 1,                              //_ shift cell borders slightly to avoid text
                //padHardCols = 3,                          //_ A little margin for cols which should not be crushed on table overflow

                //tableOverflow = false,
                pubMethods;

            /* nothing to do at present
            function initialize() {
                Y.log('Initializing form table', 'debug', NAME);
            }
            */

            /**
             *  Experimental table column layout for client and server
             *
             *  Approach to deciding on column widths:
             *
             *  (*) Get minimum width of each column (max: width of widest word)
             *  (*) Get total width of all content in column (sum: width of all words)
             *  (*) Subtract from total width of table element to get 'free' width
             *  (*) Assign portion of free width to each column according to square root of total column width
             *
             *  Edge case:
             *
             *  (*) If total min width of columns is greater than width of table element then the largest word in the
             *      table must be broken in half and this process repeated until content fits table.
             *
             *  (*) There should be a minimum width of tables for n columns so that there is not a situation where
             *      table columns are narrower than a singe glyph, or a vertical line of letters.
             *
             *  Considerations:
             *
             *  (*) Performance?
             *  (*) Embedded mapped values / javascript snippets
             *
             *  @return     {Object}    Array of column widths in mm
             */

            function estimateColumnWidths() {
                var
                    pxFontHeight = element.mm.lineHeight * element.page.form.zoom,
                    col,
                    sumSqrt = 0,
                    colWidth = [],
                    widthPx =  element.mm.width * element.page.form.zoom,
                    fixedWidthPx = 0,
                    freeWidthPx,
                    minWidthTotal = 0,
                    maxWidthTotal = 0,
                    tableWrap,
                    tableOverflow,
                    metrics,
                    dataRow,
                    dataCell,
                    whitespaceShare,
                    x,
                    y;

                //Y.log( 'Estimate col widths, table width ' + widthPx + 'px', 'debug', NAME );

                //  Process column headers
                for (x = 0; x < dcCols.cols.length; x++) {
                    col = dcCols.cols[x];

                    //  legacy
                    col.fixWidth = col.hasOwnProperty( 'fixWidth' ) ? parseFloat( col.fixWidth ) : -1;

                    if ( col.fixWidth && -1 !== col.fixWidth ) {
                        //  fixed width column, defined as percentage of element width
                        col.widthPx = ( col.fixWidth / 100 ) * widthPx;
                        col.minWidth = col.widthPx;
                        col.maxWidth = col.widthPx;
                        col.totalWidth = col.widthPx;
                        col.hard = true;
                        fixedWidthPx = fixedWidthPx + col.widthPx;

                    } else {
                        //  elastic column
                        metrics = Y.dcforms.measureTextMetrics( col.title, element.font, pxFontHeight );
                        col.minWidth = metrics.max;
                        col.maxWidth = metrics.total;
                        col.totalWidth = metrics.total;
                        col.hard = false;
                        //Y.log('Title row metrics ' + x + ': ' + dcCols.cols[x].title + ' - ' + JSON.stringify(metrics), 'debug', NAME);

                    }
                }

                //  Process data cells
                for (y = 0; y < dataset.length; y++) {
                    dataRow = dataset[y];
                    for (x = 0; x < dcCols.cols.length; x++) {
                        col = dcCols.cols[x];

                        if ( col.hard ) {
                            //  fixed width col, completely occupied regardless of content
                            col.totalWidth = col.totalWidth + col.minWidth;

                        } else {
                            //  elastic width column, measure contents
                            dataCell = dataRow.hasOwnProperty( col.member ) ? dataRow[ col.member ] : '';
                            dataCell = ( '' === dataCell ) ? '.' : dataCell;    //  for measurement purposes

                            metrics = Y.dcforms.measureTextMetrics(dataCell, element.font, pxFontHeight);
                            //Y.log('Cell metrics ' + x +',' + y + ': ' + dataCell + ' - ' + JSON.stringify(metrics), 'debug', NAME);

                            //  largest unbreakable word
                            if ( metrics.max > col.minWidth ) { col.minWidth = metrics.max; }

                            //  longest unwrapped cell
                            if ( metrics.total > col.maxWidth ) { col.maxWidth = metrics.total; }

                            //  total content length of column
                            col.totalWidth = col.totalWidth + metrics.total;
                        }
                    }
                }

                //  collect totals of elastic columns and measure table
                //  freeWidthPx = element.mm.width * element.page.form.zoom

                //console.log( 'Estimating column widths: ', dcCols )

                for (x = 0; x < dcCols.cols.length; x++) {
                    col = dcCols.cols[x];
                    if ( !col.hard ) {
                        minWidthTotal = minWidthTotal + col.minWidth;
                        maxWidthTotal = maxWidthTotal + col.maxWidth;

                        //  Take the square root of the content length
                        col.totalSqrt = Math.sqrt( col.totalWidth );

                        //  Sum for assigning free space
                        sumSqrt = sumSqrt + col.totalSqrt;
                    }
                }

                //  unassigned space remaining after accounting for fixed-width cols and cell content
                freeWidthPx = widthPx - (fixedWidthPx + maxWidthTotal );
                //  true if at least one cell must wrap
                tableWrap = ( maxWidthTotal > ( widthPx - fixedWidthPx ) );
                //  true if at least one cell must overflow
                tableOverflow = ( minWidthTotal > ( widthPx - fixedWidthPx ) );

                if ( tableWrap ) {
                    Y.log( 'Table wraps but does not overflow, using min values to calculate column widths', 'debug', NAME );
                    freeWidthPx = ( widthPx - ( minWidthTotal + fixedWidthPx ) );
                } else {
                    Y.log( 'Table does not wrap, there is whitespace to spare', 'debug', NAME );
                    freeWidthPx = ( widthPx - ( maxWidthTotal + fixedWidthPx ) );
                }

                /*
                 Y.log(
                 'Col width estimation:\n' +
                 '  total: ' + widthPx + '\n' +
                 '  free: ' + freeWidthPx + '\n' +
                 '  minWidthTotal: ' + minWidthTotal + '\n' +
                 '  maxWidthTotal: ' + maxWidthTotal + '\n' +
                 '  tableWrap: ' + tableWrap.toString() + '\n' +
                 '  overflow: ' + tableOverflow.toString()
                 'debug', NAME);
                */

                //  divide up remaining free space among elastic columns in proportion to sqrt of column content length
                for (x = 0; x < dcCols.cols.length; x++) {
                    col = dcCols.cols[x];
                    if ( !col.hard ) {
                        whitespaceShare = ( freeWidthPx * ( col.totalSqrt / sumSqrt ) );
                        //console.log( 'whitespace share ' + x + ': ' + whitespaceShare + ' on min: ' + col.minWidth, col.minWidth + whitespaceShare );

                        if ( tableWrap || tableOverflow ) {
                            //  cells wrap on multiple lines or must be compressed
                            col.widthPx = col.minWidth + whitespaceShare;
                        } else {
                            //  enough space that no cell needs to be split into multiple lines
                            col.widthPx = col.maxWidth + whitespaceShare;
                        }
                    }
                }

                //  Convert back to mm for use in layout
                for (x = 0; x < dcCols.cols.length; x++) {
                    col = dcCols.cols[x];
                    col.widthMm = ( col.widthPx / element.page.form.zoom );
                    colWidth[x] = col.widthMm;
                }

                return colWidth;
            }

            /**
             *  Add a row of cells
             *
             *  @param  values      {Object}    Array of strings (text)
             *  @param  colWidths   {Object}    Array of column widths in mm
             *  @param  vOffset     {Number}    Top of row, (in mm from top of table)
             *  @param  rowIdx      {Number}    Index of this row in dataset
             *  @return             {Number}    Base of row, (in mm from top of table)
             */

            function addRow(values, colWidths, vOffset, rowIdx) {
                var
                    tempElementsCell = [],
                    tempElementsRow = [],
                    tempElementBorder,
                    tempElementInteraction,
                    tempElementButton,
                    rowSpacing = 0,
                    striped = hasExtra( 'STRIPES' ),
                    cellTxt,
                    bgSe,
                    cursor = 0,
                    lineBase = 0,
                    base = 0,
                    x, y, i;

                //  independent of row content
                if ( element.table && element.table.rowSpacing ) {
                    rowSpacing = parseFloat( element.table.rowSpacing );
                }

                //  wrap text for all table cells

                for (x = 0; x < colWidths.length; x++) {

                    cellTxt = ( values[x] + '' );
                    if ( '' === cellTxt ) { cellTxt = ' '; }        //  prevent empty rows from having no height

                    cellTxt = cellTxt.replace( new RegExp( '&nbsp;', 'g' ), ' ' );

                    //  text in a single cell may wrap into multiple rows
                    tempElementsCell = Y.dcforms.markdownToSubElements(
                        cellTxt + '',                               //  markdown text
                        element.font,                               //  typeface name
                        element.mm.lineHeight,                      //  line height
                        parseFloat(element.mm.lineSpace),           //  leading factor
                        cursor,                                     //  x offset (mm)
                        vOffset,                                    //  y offset (mm)
                        dcCols.cols[x].align,                       //  text alignment (left / right / center)
                        colWidths[x],                               //  wrapping width (mm)
                        element.isBold,                             //  make bold
                        element.isItalic,                           //  make italic
                        element.isUnderline                         //  make underline
                    );

                    //Y.log('Adding table cell: ' + cellTxt + ' as ' + tempElementsCell.length + ' subelements.', 'debug', NAME);

                    for (y = 0; y < tempElementsCell.length; y++) {

                        //tempElementsCell[y].align = dcCols.cols[x].align;

                        tempElementsCell[y].fgColor = tempElementsCell[y].overrideColor || dcCols.cols[x].fgColor;

                        //  used to position editor
                        tempElementsCell[y].tableRow = rowIdx;
                        tempElementsCell[y].tableCol = x;
                        tempElementsCell[y].cellLine = y;
                        tempElementsCell[y].cellWidth = colWidths[x];
                        tempElementsCell[y].rowMember = x;

                        //  bump the text slight down and left to pad the table cell border
                        tempElementsCell[y].left = tempElementsCell[y].left + padOffset;
                        tempElementsCell[y].top = tempElementsCell[y].top + padOffset;
                        tempElementsCell[y].cloneInputGroup = element.elemId + '_' + rowIdx + '_' + x;

                        tempElementsRow.push(tempElementsCell[y]);

                        //  base of this text fragment
                        lineBase = tempElementsCell[y].top + tempElementsCell[y].height + rowSpacing;
                        //Y.log('Subelement: ' + tempElementsCell[y].top + ' (top) ' + tempElementsCell[y].height + ' (height) ' + cellTxt, 'debug', NAME);

                        //  base of entire row is max base of the set of all text fragments
                        if (lineBase > base) {
                            //Y.log('Set row base to: ' + lineBase, 'debug', NAME);
                            base = lineBase;
                        }

                    }

                    //  add a subelement to for the cell border
                    if ( !element.useMarkdownEditor ) {
                        //  skip border element if using 'large text' mode
                        tempElementBorder = Y.dcforms.createSubElement(
                            cursor, vOffset,                                    //  left, top (mm)
                            colWidths[x], 0,                                    //  width, height (mm)
                            element.mm.lineHeight, '', null                     //  not used
                        );

                        if ( striped ) {
                            if (rowIdx % 2 === 1) {
                                tempElementBorder.bgColor = element.borderColor;
                            }

                            /*
                            if ( -1 === rowIdx ) {
                                tempElementBorder.bgColor = element.bgColor;
                            }
                            */

                            //  slightly wider to prevent intermittent vertical lines in PDF due to rounding
                            tempElementBorder.width = tempElementBorder.width;
                            //  slightly lower
                            tempElementBorder.top = tempElementBorder.top;

                        } else {
                            tempElementBorder.borderColor = element.borderColor;
                        }

                        //  test
                        tempElementBorder.left = cursor;
                        tempElementBorder.width = colWidths[x];

                        tempElementBorder.cloneable = true;                //  split over multiple pages
                        tempElementBorder.cloneInputGroup = element.elemId + '_' + rowIdx + '_' + x;

                        tempElementBorder.isCellBorder = true;

                        tempElementsRow.unshift( tempElementBorder );
                    }

                    //  add a subelement for the interaction layer
                    //console.log( '(****) element.canEdit(): ', element.canEdit(), ' rowIdx: ', rowIdx, ' mode: ', element.page.form.mode );
                    if ( element.canEdit() && rowIdx >= 0 && 'fill' === element.page.form.mode ) {
                        tempElementInteraction = Y.dcforms.createSubElement(
                            cursor, vOffset,                                    //  left, top (mm)
                            colWidths[x], 0,                                    //  width, height (mm)
                            element.mm.lineHeight, '', null                     //  not used
                        );
                        tempElementInteraction.left = cursor;
                        tempElementInteraction.width = colWidths[x];
                        tempElementInteraction.tableRow = rowIdx;
                        tempElementInteraction.tableCol = x;
                        tempElementInteraction.interactive = true;              //  respond to mouse and keyboard events
                        tempElementInteraction.cloneable = true;                //  split over multiple pages
                        tempElementInteraction.cloneInputGroup = element.elemId + '_' + rowIdx + '_' + x;

                        tempElementsRow.push( tempElementInteraction );
                    }

                    //  move on to next column
                    cursor = cursor + colWidths[x];
                }

                //  fix height of cell borders
                for (i = 0; i < tempElementsRow.length; i++) {
                    if ( tempElementsRow[i].isCellBorder || tempElementsRow[i].interactive ) {
                        tempElementsRow[i].height = ( base - vOffset ) /*+ rowSpacing */;

                        //  can happen with empty table rows that base is 0
                        if ( tempElementsRow[i].height < 0 ) { tempElementsRow[i].height = 0; }
                    }
                }

                //  add a subelement for the header row background
                if ( -1 === rowIdx ) {
                    bgSe = Y.dcforms.createSubElement(
                        0, vOffset,                                         //  left, top (mm)
                        element.mm.width, ( base - vOffset ),               //  width, height (mm)
                        element.mm.lineHeight, '', null                     //  not used
                    );

                    bgSe.special = 'bgse';
                    bgSe.bgColor = element.bgColor;
                    bgSe.noncontent = true;
                    //  bgSe.nopdf = true;

                    //  add all text fragments on top of the background
                    element.subElements.push( bgSe );
                }

                //  add a subelement for the 'add row' and 'delete row' buttons
                if ( 'fill' === element.page.form.mode && element.canEdit() && !Y.dcforms.isOnServer ) {

                    tempElementButton = Y.dcforms.createSubElement(
                        element.mm.width, vOffset,                                  //  left, top (mm)
                        element.mm.lineHeight * 1.0, element.mm.lineHeight,         //  width, height (mm)
                        element.mm.lineHeight, '',                                  //  line height, text
                        Y.dcforms.assets.btnPlus                                    //  img
                    );

                    tempElementButton.interactive = true;
                    tempElementButton.tableRow = rowIdx;
                    tempElementButton.isButton = true;
                    tempElementButton.imgId = ':btnPlus.png';
                    tempElementButton.img = Y.dcforms.assets.btnPlus;
                    tempElementButton.imgPlainSprite = true;

                    tempElementsRow.push( tempElementButton );

                    if ( -1 !== rowIdx ) {
                        tempElementButton = Y.dcforms.createSubElement(
                            element.mm.width + element.mm.lineHeight + 0.5, vOffset,  //  left, top (mm)
                            element.mm.lineHeight * 1.0, element.mm.lineHeight,     //  width, height (mm)
                            element.mm.lineHeight, '',                              //  line height, text
                            Y.dcforms.assets.btnTrash                               //  img
                        );

                        tempElementButton.interactive = true;
                        tempElementButton.tableRow = rowIdx;
                        tempElementButton.isButton = true;
                        tempElementButton.imgId = ':btnTrash.png';
                        tempElementButton.imgPlainSprite = true;

                        tempElementsRow.push( tempElementButton );
                    }

                }

                for ( x = 0; x < tempElementsRow.length; x++ ) {
                    tempElementsRow[x].cellHeight = ( base - vOffset ) /*+ rowSpacing */ + 1;
                    element.subElements.push( tempElementsRow[x] );
                }

                if ( isNaN( base ) || 0 === base ) { base = vOffset; }
                return base;
            }

            /**
             *  Check whether one of the meta lines is enabled on this table
             *  @param  fieldName   {String}    One of (LINEMAX|LINEMIN|LINEAVG|LINESUM)
             *  @returns            {boolean}   True if enabled
             */

            function hasExtra( fieldName ) {
                if ( !element || !element.extra || 'string' !== typeof element.extra ) { return false; }
                return ( -1 !== element.extra.indexOf( fieldName ) );
            }

            /**
             *  Currently only used for GRAVIDOIGRAMM tables, optional full width text beneath the row
             *  @param footerText
             *  @param height
             *  @return {*}
             */

            function addRowFooter( footerText, vOffset ) {
                var
                    tempElementsFooter,
                    lineBase = 0,
                    base = vOffset,
                    bgSe,
                    i;

                //  lay out footer text
                tempElementsFooter = Y.dcforms.markdownToSubElements(
                    footerText + '',                            //  markdown text
                    element.font,                               //  typeface name
                    element.mm.lineHeight,                      //  line height
                    parseFloat(element.mm.lineSpace),           //  leading factor
                    0,                                          //  x offset (mm)
                    vOffset,                                    //  y offset (mm)
                    element.align,                              //  text alignment (left / right / center)
                    element.mm.width,                           //  wrapping widt, full width of table (mm)
                    element.isBold,                             //  make bold
                    element.isItalic,                           //  make italic
                    element.isUnderline                         //  make underline
                );

                //  measure height of footer block
                for ( i = 0; i < tempElementsFooter.length; i++ ) {
                    lineBase = tempElementsFooter[i].top + tempElementsFooter[i].height;
                    //  base of footer is max base of the set of all text fragments
                    if (lineBase > base) {
                        //Y.log('Set row base to: ' + lineBase, 'debug', NAME);
                        base = lineBase;
                    }
                }

                //  add a background element
                bgSe = Y.dcforms.createSubElement(
                    0, vOffset,                                         //  left, top (mm)
                    element.mm.width, ( base - vOffset ),               //  width, height (mm)
                    element.mm.lineHeight, '', null                     //  not used
                );

                bgSe.special = 'bgse';
                bgSe.bgColor = element.bgColor;
                bgSe.noncontent = true;
                //  bgSe.nopdf = true;

                element.subElements.push( bgSe );

                //  add all text fragments on top of the background
                for ( i = 0; i < tempElementsFooter.length; i++ ) {
                    element.subElements.push(tempElementsFooter[i]);
                }

                return base;
            }

            /**
             *  Lay out table columns, rows and cells and generate all subelements
             */

            function generateSubElements() {
                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return;
                }

                var
                    bgSubElem,
                    intSubElem,
                    colWidths = estimateColumnWidths(),
                    dataRow,
                    currentRow = [],
                    x,
                    y,
                    height = 0;

                //Y.log('Table columns: ' + dcCols.cols.length + ' rows: ' + dataset.length + "\n" + JSON.stringify(colWidths), 'debug', NAME);
                //Y.log('Table data: ' + JSON.stringify(dataset, undefined, 2), 'debug', NAME);

                //  Clear any existing subelements
                element.subElements = [];

                //  Do not create any subelements if
                //  (*) this table is empty
                //  (*) we are on server and this is to be omitted from PDF

                if ( Y.dcforms.isOnServer && isEmpty() && element.omitFromPDFIfEmpty ) {
                    Y.log( 'Removing empty table from pdf: ' + element.elemId, 'debug', NAME );
                    return;
                }

                //  add a subelement for the page background and border
                bgSubElem = Y.dcforms.createSubElement(
                    0,
                    0,
                    element.mm.width,
                    element.mm.height,
                    element.mm.height,
                    '',
                    ''
                );

                //bgSubElem.bgColor = element.bgColor;          // (cell background rules take precedence)
                //bgSubElem.borderColor = element.borderColor;  // (cell borders are canonical)

                bgSubElem.noncontent = true;
                bgSubElem.nopdf = true;
                element.subElements.unshift(bgSubElem);

                //  Add column headers
                for (x = 0; x < dcCols.cols.length; x++) {
                    currentRow[x] = dcCols.cols[x] ? (dcCols.cols[x].title || '') : '';
                }
                height = addRow( currentRow, colWidths, height, -1);

                //  Add data cells
                for (y = 0; y < dataset.length; y++) {
                    dataRow = dataset[y];
                    currentRow = [];
                    for (x = 0; x < colWidths.length; x++) {
                        currentRow[x] = (dataRow[dcCols.cols[x].member] || '');
                    }
                    height = addRow(currentRow, colWidths, height, y);


                    if ( dataRow._tableRowFooter && '' !== dataRow._tableRowFooter ) {
                        height = addRowFooter( dataRow._tableRowFooter, height );
                    }
                }

                //  add a subelement for interaction in the editor
                if ( 'edit' === element.page.form.mode ) {
                    intSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.width, element.mm.height,
                        element.mm.lineHeight, '', null
                    );

                    //bgSubElem.bgColor = element.bgColor;          // (cell background rules take precedence)
                    //bgSubElem.borderColor = element.borderColor;  // (cell borders are canonical)

                    intSubElem.noncontent = true;
                    intSubElem.nopdf = true;
                    intSubElem.bindmark = true;                      //  show binding
                    intSubElem.interactive = true;
                    element.subElements.push( intSubElem );
                }

            }

            //  PUBLIC METHODS

            /**
             *  Plot subelements onto abstract canvas (all text rows of all cells)
             *
             *  @param  voffset     {Number}    Displacement due to overflow of elements above this one
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function renderAbstract(voffset, callback) {
                //Y.log('Rendering table on abstract canvas, voffset: ' + voffset + ' subelements: ' + element.subElements.length, 'debug', NAME);
                var
                    ctx = element.page.canvasElastic.getContext('2d'),
                    zoom = element.page.form.zoom,
                    subElem,
                    i;

                //  value not set
                if (0 === element.subElements.length) {
                    Y.log('Rendering table before selected value has been set, or null table', 'warn', NAME);
                }

                /*
                if (0 === element.subElements[0].width) {
                    Y.log('Rendering table to undisplayed div, column widths will be 0', 'warn', NAME);
                    return;
                }
                */

                //  this will clear the set of subelements if element.isHiddenBFB
                generateSubElements();

                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    subElem.fgColor = element.fgColor;
                    subElem.renderToCanvas(ctx, zoom, element.mm.left, element.mm.top, voffset, true, 'abstract');
                }

                callback(null);
            }

            /**
             *  Table elements no longer support their own edit mode
             *
             *  Tables currently have no mode-specific behavior
             *
             *  @param  newMode     {string}    Form mode name
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                Y.log('Table set to mode: ' + newMode, 'debug', NAME);
                //  interaction subelements are different between edit and fill modes
                generateSubElements();
                callback(null);
            }

            /**
             *  Tables are mapped with a special dataset property of the parent element
             *  This dataset is then broken up into subsets for rendering over multiple pages in an overflow subform
             */

            function map(newValue, callback) {

                element.page.isDirty = true;

                if (!newValue || '' === newValue || '{}' === newValue || {} === newValue) {
                    newValue = [];
                }

                if ('string' === typeof newValue) {
                    try {
                        newValue = JSON.parse(newValue);
                    } catch (parseErr) {
                        Y.log('Could not parse stored table values: ' + JSON.stringify(parseErr), 'warn', NAME);
                        Y.log('Table Dataset Literal: ' + newValue, 'warn', NAME);
                        newValue = [];
                    }
                }

                //  applying filters, EXTMOJ-1893

                if ( newValue && Array.isArray( newValue ) ) {
                    newValue = Y.dcforms.applyTableFilters( newValue, dcCols.filters );
                }

                //  do not override user-edited fields (MOJ-3160)

                var i, j, found;

                if ( !element.readonly ) {
                    for (i = 0; i < dataset.length; i++) {

                        found = false;

                        for (j = 0; j < newValue.length; j++) {
                            if (dataset[i].activityId && newValue[j].activityId && dataset[i].activityId === newValue[j].activityId) {

                                // special case for MOJ-4250
                                if (
                                    dataset[i].hasOwnProperty('date') &&
                                    newValue[j].hasOwnProperty('date') &&
                                    (dataset[i].date !== newValue[j].date)
                                ) {
                                    //  if date from mapper has changed we need to update it regardless of user edit
                                    dataset[i].date = newValue[j].date;
                                }

                                newValue[j] = dataset[i];
                            }

                            if ( dataset[i].randId && newValue[j].randId && dataset[i].randId === newValue[j].randId ) {
                                found = true;
                            }
                        }

                        //  shuffle manually added rows into newValue (MOJ-8185)
                        if ( !found && dataset[i].randId ) {
                            newValue.splice( i, 0, dataset[i] );
                        }

                    }
                }

                try {
                    dataset = JSON.parse( JSON.stringify( newValue ) );
                } catch( parseErr ) {
                    Y.log( 'Attempted to map invalid value into table: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    return callback( parseErr );
                }
                //Y.log('setting data: ' + JSON.stringify(newValue, undefined, 2), 'debug', NAME);

                generateSubElements();

                //  and we're done, mapping call will re-render the page once all elements have been updated
                callback(null);
            }

            function unmap() {
                return dataset;
            }

            /**
             *  Cleanly unsubscribe from any events and free memory
             */

            function destroy() {
                Y.log('Destroying table element: ' + element.getDomId(), 'debug', NAME);
            }

            function getValue() {
                return element.value;
            }

            function getCols() {
                return dcCols;
            }

            /**
             *  Just sets table column structure in most cases
             */

            function setValue(newValue, callback) {
                //Y.log('Set table: ' + newValue, 'debug', NAME);

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;
                //  note - this resides in the
                dcCols = Y.dcforms.stringToCols(newValue);

                generateSubElements();

                callback(null);
            }

            /**
             *  Called after a change to the element, eg, font or background change
             *  @param callback
             */

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback( null ); }
            }

            /**
             *  Request value of a single table cell
             *  @param  row     {Number}    Row index in dataset
             *  @param  col     {Number}    Col index in dataset
             *  @returns {String}
             */

            function getCellValue(row, col) {

                if (!dataset[row]) {
                    return '';
                }

                var dataRow = dataset[row];

                if (!dcCols.cols[col] || !dcCols.cols[col].member || !dataRow[dcCols.cols[col].member]) {
                    return '';
                }

                return dataRow[dcCols.cols[col].member];
            }

            function setCellValue( newValue, row, col ) {
                element.page.isDirty = true;

                if( col === -1 || row === -1 || dataset[row] === -1 || dcCols.cols[col] === -1 ) {
                    Y.log( 'Row or column not found, discarding value: ' + newValue, 'warn', NAME );
                    return;
                }

                var
                    memberName = dcCols.cols[col].member;

                dataset[row][memberName] = newValue;
                element.page.form.raise('valueChanged', element);
                generateSubElements();
                element.isDirty = true;
                element.page.redrawDirty();
            }

            /**
             *  Raised by page when user clicks within a table
             *  Used to open a value edit box for table cells if element is editable
             *
             *  @param localized
             */

            function handleClick(localized) {

                if (!element.canEdit() || !localized || !localized.subElem || element.isHiddenBFB) {
                    return false;
                }

                function onMarkdownChanged( newValue ) {
                    setCellValue( newValue, selRow, selCol );
                }

                var
                    subElem = localized.subElem,
                    selRow = subElem.hasOwnProperty( 'tableRow' ) ? subElem.tableRow : -1,
                    selCol = subElem.hasOwnProperty( 'tableCol' ) ? subElem.tableCol : -1;
                    //cellValue = getCellValue( selRow, selCol );

                if ( subElem && subElem.isButton ) {
                    if ( ':btnMinus.png' === subElem.imgId || ':btnTrash.png' === subElem.imgId ) {
                        return removeDataRow( selRow );
                    }
                    if ( ':btnPlus.png' === subElem.imgId ) {
                        return addNewDataRow( selRow );
                    }
                }

                if ( !subElem.saved || 0 === subElem.saved.fixed ) {
                    // re-render in progress, cannot select
                    return;
                }

                element.page.form.setSelected( 'fixed', element );
                if ( !element.useMarkdownEditor || element.page.form.isFromToolbox ) {
                    //  TODO: fix this editor MOJ-
                    //element.page.form.valueEditor = Y.dcforms.createTableValueEditor('fixed', element, selRow, selCol, onCellValueChanged);
                    element.currentRow = selRow;
                    element.currentCol = selCol;
                    element.selectedSubElem = subElem;
                    element.page.form.valueEditor = Y.dcforms.createMarkdownValueEditor('fixed', element, onMarkdownChanged );
                } else {
                    if ( element.page.form.mode !== 'edit' ) {
                        /*
                        Y.doccirrus.modals.editFormText.show( {
                            'value': cellValue,
                            'showDocTree': true,
                            'onUpdate':                         element.page.form.raise( 'requestMarkdownModal', element );

                        } );
                        */

                        element.selRow = selRow;
                        element.selCol = selCol;
                        element.page.form.raise( 'requestMarkdownModal', element );

                    }

                }

            }

            function addNewDataRow( selRow ) {
                //  TODO: raise event to update document
                var i, newRow = { 'randId': Y.doccirrus.comctl.getRandId() };
                for ( i = 0; i < dcCols.cols.length; i++ ) {
                    switch( dcCols.cols[i].valueType ) {
                        case 'String':
                            newRow[ dcCols.cols[i].member ] = '-';
                            break;
                        case 'Number':
                            newRow[ dcCols.cols[i].member ] = '0';
                            break;
                        default:
                            newRow[ dcCols.cols[i].member ] = dcCols.cols[i].valueType;
                    }
                }

                dataset.splice( ( selRow + 1 ), 0, newRow );
                generateSubElements();
                element.page.redraw();
            }

            function removeDataRow( idx ) {
                var lostRow = dataset[idx];
                dataset.splice( idx, 1 );
                element.page.form.raise( 'removeTableRow', lostRow );

                generateSubElements();
                //  TODO: raise event to update document
                element.page.redraw();
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  for tables each cell may be tabbed to / editable
             *
             *  @returns {number}
             */

            function countTabStops() {
                if (!element.canEdit() || !dataset || !dataset.length || !dcCols || !dcCols.cols || element.isHiddenBFB) {
                    return 0;
                }
                return dataset.length * dcCols.cols.length;
            }

            /**
             *  Returns true if table has no rows
             */

            function isEmpty() {
                return ( 0 === dataset.length );
            }

            //  SET UP AND RETURN THE NEW RENDERER

            //initialize();

            pubMethods = {
                'renderAbstract': renderAbstract,
                'handleClick': handleClick,
                'addNewDataRow': addNewDataRow,
                'removeDataRow': removeDataRow,
                'setMode': setMode,
                'destroy': destroy,
                'map': map,
                'unmap': unmap,
                'update': update,
                'getValue': getValue,
                'getCols': getCols,
                'getCellValue': getCellValue,
                'setCellValue': setCellValue,
                'setValue': setValue,
                'isEmpty': isEmpty,
                'countTabStops': countTabStops
            };

            creationCallback(null, pubMethods);
        };




    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'edittext-modal', 'dcforms-table-utils' ]
    }
);
