/*
 *  Copyright DocCirrus GmbH 2018
 *
 *  YUI module to render chart table elements and attach element-specific events
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-contacttable',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms charttable types.', 'debug', NAME);

        /**
         *  Factory method for labadata table element renderers
         *
         *  This is a special version of the table element which allows tables of contacts to be added to forms
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeContactTableRenderer = function(element, creationCallback) {

            var
                _async = Y.dcforms._async,

                dataset = [],                               //_ set of objects to be mapped / displayed [array:object]

                userLang = element.getCurrentLang(),        //_ language and gender [string]
                strValue = element.defaultValue[userLang],  //_ table definition from editor [string]
                tableDef = Y.dcforms.stringToCols(strValue),  //_ table definition, parsed [object]

                padOffset = 1,                              //_ shift cell borders slightly to avoid text
                //padHardCols = 3,                          //_ A little margin for cols which should not be crushed on table overflow

                //tableOverflow = false,
                pubMethods;

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
                for (x = 0; x < tableDef.cols.length; x++) {
                    col = tableDef.cols[x];

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
                        //Y.log('Title row metrics ' + x + ': ' + tableDef.cols[x].title + ' - ' + JSON.stringify(metrics), 'debug', NAME);

                    }
                }

                //  Process data cells
                for (y = 0; y < dataset.length; y++) {
                    dataRow = dataset[y];
                    for (x = 0; x < tableDef.cols.length; x++) {
                        col = tableDef.cols[x];

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

                //console.log( 'Estimating column widths: ', tableDef )

                for (x = 0; x < tableDef.cols.length; x++) {
                    col = tableDef.cols[x];
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
                 'debug', NAME );
                */

                //  divide up remaining free space among elastic columns in proportion to sqrt of column content length
                for (x = 0; x < tableDef.cols.length; x++) {
                    col = tableDef.cols[x];
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
                for (x = 0; x < tableDef.cols.length; x++) {
                    col = tableDef.cols[x];
                    col.widthMm = ( col.widthPx / element.page.form.zoom );
                    colWidth[x] = col.widthMm;
                }

                return colWidth;
            }

            /**
             *  Add a row of cells
             *
             *  This calls back with base of new row, which will be the vOffset for the next row, in mm from top
             *  of table.
             *
             *  @param  values      {Object}    Array of strings (text)
             *  @param  colWidths   {Object}    Array of column widths in mm
             *  @param  vOffset     {Number}    Top of row, (in mm from top of table)
             *  @param  rowIdx      {Number}    Index of this row in dataset
             *  @paramm callback    {Function}  Of the form fn( err, baseOfRow )
             */

            function addRow( values, colWidths, vOffset, rowIdx, callback ) {
                var
                    tempElementsRow = [],
                    tempElementBorder,
                    tempElementInteraction,
                    rowSpacing = 0,
                    striped = hasExtra( 'STRIPES' ),
                    cellTxt,
                    bgSe,
                    cursor = 0,
                    lineBase = 0,
                    base = 0,
                    x;

                //  independent of row content
                if ( element.table && element.table.rowSpacing ) {
                    rowSpacing = parseFloat( element.table.rowSpacing );
                }

                //  wrap text for all table cells
                Y.dcforms.runInSeries( [ addAllColumns, correctBorderHeights, addHeaderRowBg ], onAllDone );

                function addAllColumns( itcb ) {
                    var
                        colIndexes = [],
                        x;

                    for (x = 0; x < colWidths.length; x++) {
                        colIndexes.push( x );
                    }

                    if ( 0 === colIndexes.length ) { return itcb( null ); }

                    _async.eachSeries( colIndexes, addSingleColumn, itcb );
                }

                function addSingleColumn( x, itcb ) {
                    var
                        cellWidth = colWidths[x],
                        cellAlign = tableDef.cols[x].align,
                        cellSubElements;

                    cellTxt = ( values[x] + '' );
                    if ( '' === cellTxt ) { cellTxt = ' '; }        //  prevent empty rows from having no height

                    //  text in a single cell may wrap into multiple rows
                    getCellSubelements(
                        cellTxt,                                    //  markdown text, may contain chart definitions
                        cursor,                                     //  x offset
                        vOffset,                                    //  y offset
                        cellWidth,                                  //  column width
                        cellAlign,                                  //  text alignment
                        onCellSubelementsReady
                    );

                    function onCellSubelementsReady( err, tempElementsCell ) {
                        if ( err ) { return itcb( err ); }
                        cellSubElements = tempElementsCell;
                        setBoundsAndAdd( cellSubElements );
                        setCellBorder();
                        setCellInteraction();

                        //  move on to next column
                        cursor = cursor + colWidths[x];

                        itcb( null );
                    }

                    //  add subelement properties specific to table cells and update lower bound of table row if needed
                    function setBoundsAndAdd( tempElementsCell ) {
                        var y;
                        Y.log('Adding table cell: ' + cellTxt + ' as ' + tempElementsCell.length + ' subelements.', 'debug', NAME);

                        for (y = 0; y < tempElementsCell.length; y++) {

                            //tempElementsCell[y].align = tableDef.cols[x].align;
                            tempElementsCell[y].fgColor = tableDef.cols[x].fgColor;

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
                    }

                    //  add a subelement to for the cell border
                    function setCellBorder() {
                        //  skip border element if using 'large text' mode
                        if ( element.useMarkDownEditor ) { return; }

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
                    function setCellInteraction() {
                        //  skip this step if table / cell not in editable state
                        if ( !element.canEdit() || 0 === rowIdx || 'fill' !== element.page.form.mode ) {
                            return;
                        }

                        //console.log( '(****) element.canEdit(): ', element.canEdit(), ' rowIdx: ', rowIdx, ' mode: ', element.page.form.mode );
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

                }   //  end addSingleColumn

                //  fix height of cell borders
                function correctBorderHeights( itcb ) {
                    var i;
                    for (i = 0; i < tempElementsRow.length; i++) {
                        if ( tempElementsRow[i].isCellBorder || tempElementsRow[i].interactive ) {
                            tempElementsRow[i].height = ( base - vOffset ) /*+ rowSpacing */;

                            //  can happen with empty table rows that base is 0
                            if ( tempElementsRow[i].height < 0 ) { tempElementsRow[i].height = 0; }
                        }
                    }
                    itcb( null );
                }

                //  add a subelement for the header row background
                function addHeaderRowBg( itcb ) {
                    //  If current row is not the header then we can skip this step
                    if ( -1 !== rowIdx ) { return itcb( null ); }

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
                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) { return callback( err ); }

                    //  add subelements for this row to the element
                    for ( x = 0; x < tempElementsRow.length; x++ ) {
                        tempElementsRow[x].cellHeight = ( base - vOffset ) /*+ rowSpacing */ + 1;
                        element.subElements.push( tempElementsRow[x] );
                    }

                    //  adjust the current bottom of the table
                    if ( isNaN( base ) || 0 === base ) { base = vOffset; }

                    callback( null, base );
                }
            }

            function getCellSubelements( cellTxt, xOffset, yOffset, cellWidth, align, callback ) {
                var
                    lines = cellTxt.split( '\n' ),
                    cellSubElements;

                cellSubElements = Y.dcforms.markdownToSubElements(
                    lines.join( '\n' ) + '',                            //  markdown text
                    element.font,                                       //  typeface name
                    element.mm.lineHeight,                              //  line height
                    parseFloat(element.mm.lineSpace),                   //  leading factor
                    xOffset,                                            //  x offset (mm)
                    yOffset,                                            //  y offset (mm)
                    align,                                              //  text alignment (left / right / center)
                    cellWidth,                                          //  wrapping width (mm)
                    element.isBold,                                     //  make bold
                    element.isItalic,                                   //  make italic
                    element.isUnderline                                 //  make underline
                );

                return callback( null, cellSubElements );

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
             *
             *  @param  callback    Callback when all subelements have been created - may have async chart elements
             */

            function generateSubElements( callback ) {
                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return callback( null );
                }

                if ( !callback ) {
                    //  TODO: remove when stable
                    console.log( 'MISSING CALLBACK for generateSubElements, stack trace follows: ', new Error().stack );    //  eslint-disable-line no-console
                }

                var
                    bgSubElem,
                    intSubElem,
                    colWidths = estimateColumnWidths(),
                    x,
                    y,
                    height = 0;

                //Y.log('Table columns: ' + tableDef.cols.length + ' rows: ' + dataset.length + "\n" + JSON.stringify(colWidths), 'debug', NAME);
                //Y.log('Table data: ' + JSON.stringify(dataset, undefined, 2), 'debug', NAME);

                //  Clear any existing subelements
                element.subElements = [];

                //  Do not create any subelements if
                //  (*) this table is empty
                //  (*) we are on server and this is to be omitted from PDF

                if ( Y.dcforms.isOnServer && isEmpty() && element.omitFromPDFIfEmpty ) {
                    Y.log( 'Removing empty table from pdf: ' + element.elemId, 'debug', NAME );
                    return callback( null );
                }

                Y.dcforms.runInSeries(
                    [
                        addInteractionSE,
                        addBackgroundSE,
                        addEmptyNotice,
                        addColumnHeaders,
                        addAllDataRows
                    ],
                    onAllDone
                );

                //  add a subelement for interaction in the editor
                function addInteractionSE( itcb ) {
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
                        intSubElem.bindmark = true;                     //  show binding
                        intSubElem.interactive = true;
                        element.subElements.push( intSubElem );
                    }

                    //  add a subelement for interaction in the user in inCase
                    if ( 'fill' === element.page.form.mode ) {
                        intSubElem = Y.dcforms.createSubElement(
                            0, 0,
                            element.mm.width, element.mm.height,
                            element.mm.lineHeight, '', null
                        );

                        //bgSubElem.bgColor = element.bgColor;          // (cell background rules take precedence)
                        //bgSubElem.borderColor = element.borderColor;  // (cell borders are canonical)

                        intSubElem.noncontent = true;
                        intSubElem.nopdf = true;
                        intSubElem.bindmark = false;                    //  show binding
                        intSubElem.interactive = true;
                        element.subElements.push( intSubElem );
                    }

                    itcb( null );
                }

                //  add a subelement for the page background and border
                function addBackgroundSE( itcb ) {
                    bgSubElem = Y.dcforms.createSubElement(
                        0,
                        0,
                        element.mm.width,
                        element.mm.height,
                        element.mm.height,
                        '',
                        ''
                    );

                    bgSubElem.bgColor = element.bgColor;          // (cell background rules take precedence)
                    bgSubElem.borderColor = element.borderColor;  // (cell borders are canonical)

                    bgSubElem.noncontent = true;
                    bgSubElem.nopdf = true;
                    element.subElements.unshift(bgSubElem);
                    itcb( null );
                }

                //  Add a label for the user to click if the table is otherwise empty
                function addEmptyNotice( itcb ) {

                    //  if there is something else to display then we can skip this step
                    if ( element.value && '' !== element.value ) { return itcb( null ); }

                    var
                        extraMsg = element.extra,
                        defaultMsg = Y.doccirrus.i18n( 'FormEditorMojit.generic.LBL_SELECT_CONTACTS' ),
                        useMsg = ( extraMsg && '' !== extraMsg ? extraMsg : defaultMsg ),
                        msgSubElements = Y.dcforms.markdownToSubElements(
                            useMsg + '',                                        //  markdown text
                            element.font,                                       //  typeface name
                            element.mm.lineHeight,                              //  line height
                            parseFloat(element.mm.lineSpace),                   //  leading factor
                            0,                                                  //  x offset (mm)
                            0,                                                  //  y offset (mm)
                            element.align,                                      //  text alignment (left / right / center)
                            element.mm.width,                                   //  wrapping width (mm)
                            element.isBold,                                     //  make bold
                            element.isItalic,                                   //  make italic
                            element.isUnderline                                 //  make underline
                        ),
                        i;

                    for ( i = 0; i < msgSubElements.length; i++ ) {
                        element.subElements.push( msgSubElements[i] );
                    }

                    itcb( null );
                }

                //  Add column headers
                function addColumnHeaders( itcb ){
                    var currentRow = [];

                    for (x = 0; x < tableDef.cols.length; x++) {
                        currentRow[x] = tableDef.cols[x] ? (tableDef.cols[x].title || '') : '';
                    }

                    addRow( currentRow, colWidths, height, -1, onAddHeaderRow );

                    function onAddHeaderRow( err, newHeight ) {
                        if ( err ) { return callback( err ); }
                        height = newHeight;
                        itcb( null );
                    }
                }

                //  Add data cells
                function addAllDataRows( itcb ) {
                    if ( !dataset || 0 === dataset.length ) { return itcb ( null ); }
                    _async.eachSeries( dataset, addSingleDataRow, itcb );
                }

                function addSingleDataRow( dataRow, itcb ) {
                    var currentRow = [];
                    for (x = 0; x < colWidths.length; x++) {
                        currentRow[x] = (dataRow[tableDef.cols[x].member] || '');
                    }

                    addRow(currentRow, colWidths, height, y, onDataRowAdded );

                    function onDataRowAdded( err, newHeight ) {
                        if ( err ) { return itcb( err ); }
                        height = newHeight;

                        if ( dataRow._tableRowFooter && '' !== dataRow._tableRowFooter ) {
                            height = addRowFooter( dataRow._tableRowFooter, height );
                        }
                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Could not load contacts table: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue rendering the rest of the form, best effort
                    }

                    return callback( null );
                }

            }

            //  PUBLIC METHODS

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
                generateSubElements( callback );
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

                //  and we're done, mapping call will re-render the page once all elements have been updated
                generateSubElements( callback );
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

            /**
             *  Just sets table column structure in most cases
             */

            function setValue(newValue, callback) {
                //Y.log('Set contacts table: ' + newValue, 'debug', NAME);

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;
                //  note - this resides in the
                tableDef = Y.dcforms.stringToCols(newValue);

                generateSubElements( callback );
            }

            /**
             *  Called after a change to the element, eg, font or background change
             *  @param callback
             */

            function update(callback) {
                if ( !callback ) {
                    console.log( 'WARN: missing callback to contacttable update, stack trace follows: ', new Error().stack );      //  eslint-disable-line no-console
                    callback = Y.dcforms.nullCallback;
                }
                generateSubElements( callback );
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

                if (!tableDef.cols[col] || !tableDef.cols[col].member || !dataRow[tableDef.cols[col].member]) {
                    return '';
                }

                return dataRow[tableDef.cols[col].member];
            }

            /**
             *  Raised by page when user clicks within a table
             *  Used to open a value edit box for table cells if element is editable
             *
             *  @param localized
             */

            function handleClick(/*localized */) {
                if ( 'edit' === element.page.form.mode ) {
                    element.page.form.setSelected( 'fixed', element );
                    return;
                }

                element.page.form.raise( 'requestContacts', {
                    'ownerCollection': element.page.form.ownerCollection,
                    'ownerId': element.page.form.ownerId,
                    'currentValue': element.value,
                    'currentDates': getDates(),
                    'onSelected': onContactsSelected
                } );

                function onContactsSelected( tableDefinition, data ) {
                    //console.log( '(****) received dynamic table definition: ', tableDefinition );
                    //console.log( '(****) received contacts data: ', data );
                    dataset = data;
                    element.setValue( tableDefinition, onColsUpdated );
                }

                function onColsUpdated() {
                    generateSubElements( onRegenerateElements );
                }

                function onRegenerateElements() {
                    element.page.form.raise( 'valueChanged', element );

                    if ( element.page.form.isRendered ) {
                        element.page.form.render();
                        //element.page.form.redrawDirty();
                    }
                }
            }

            /**
             *  Elements may have a variable number of tab stops
             *
             *  for tables each cell may be tabbed to / editable
             *
             *  @returns {number}
             */

            function countTabStops() {
                if (!element.canEdit() || !dataset || !dataset.length || !tableDef || !tableDef.cols || element.isHiddenBFB) {
                    return 0;
                }
                return dataset.length * tableDef.cols.length;
            }

            /**
             *  Get dates from tored table definition, used to re-initialize select2 in UI
             */

            function getDates() {
                var
                    DYNAMIC_COLUMN = '_dynamic_',
                    dateLabels = [],
                    i;

                if ( !tableDef || !tableDef.cols || 0 === tableDef.cols.length ) { return dateLabels; }

                for ( i = 0; i < tableDef.cols.length; i++ ) {
                    if ( DYNAMIC_COLUMN === tableDef.cols[i].member.substr( 0, DYNAMIC_COLUMN.length ) ) {
                        dateLabels.push( tableDef.cols[i].member.replace( DYNAMIC_COLUMN, '' ) );
                    }
                }

                return dateLabels;
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
                //'renderAbstract': renderAbstract,
                'handleClick': handleClick,
                'setMode': setMode,
                'destroy': destroy,
                'map': map,
                'unmap': unmap,
                'getDates': getDates,
                'update': update,
                'getValue': getValue,
                'getCellValue': getCellValue,
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
        requires: [ 'dcforms-table-utils' ]
    }
);