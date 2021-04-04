/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, central place to store paper size data
 */

/*eslint prefer-template:0 */
/*global YUI, he, require */

YUI.add(
    /* YUI module name */
    'dcforms-markdown-utils',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        var
            htmlEntities = Y.doccirrus.commonutils.isClientSide() ? he : require( 'he' ),
            //  How far to indent lists and blockquotes, in lineHeight
            GENERAL_INDENT = 2.5,
            //  How far to indent bullets for unordered lists
            BULLET_INDENT = 1.8;

        Y.log('Adding markdown parser for form text strings.', 'debug', NAME);

        /**
         *  Render markdown wrapped into a box
         *
         *  @param  mdtxt       {String}    Markdown string
         *  @param  fontName    {String}    Font name
         *  @param  lineHeight  {Number}    mm
         *  @param  leading     {Number}    Multiple of line height
         *  @param  x           {Number}    Offset from element position, mm
         *  @param  y           {Number}    Offset from element position, mm
         *  @param  align       {String}    ('left'|'right'|'center'|'justify')
         *  @param  maxWidth    {Number}    Width to wrap to
         *  @param  isBold      {Boolean}   To be added to text elements
         *  @param  isItalic    {Boolean}   To be added to text elements
         *  @param  isUnderline {Boolean}   To be added to text elements
         *
         *  @returns        {Array}     Of subelement objects
         */

        Y.dcforms.markdownToSubElements = function(
            mdtxt,
            fontName,
            lineHeight,
            leading,
            x, y,
            align,
            maxWidth,
            isBold,
            isItalic,
            isUnderline
        ) {

            var
                currToken,
                tokens = Y.dcforms.tokenizeMarkdown(mdtxt + ''),
                currLine,
                lineIdx = 0,
                currElem,
                subElements = [],
                flags = '',
                trimSpace,
                useHeight,
                useFont,
                i;

            // undercount max width to allow for slight variations due to browser fonts
            maxWidth = 0.95 * maxWidth;

            //console.log('tokens: ' + tokens.length);

            //  cut down over-long words (those which exceed one line)

            //  start the first line
            currLine = {
                'left': 0,
                'top': 0,
                'width': maxWidth,
                'height': 0
            };
            bumpLine();

            //console.log('isBold: ' + (isBold ? 'TRUE' : 'FALSE') + ' isItalic: ' + (isItalic ? 'TRUE' : 'FALSE') + ' isUnderline: ' + (isUnderline ? 'TRUE' : 'FALSE'));

            //  wrap tokens into lines
            for (i = 0; i < tokens.length; i++) {
                currToken = tokens[i];

                flags = ':';
                flags = flags + (currToken.isBold ? 'B' : '_');
                flags = flags + (currToken.isItalic ? 'I' : '_');

                //console.log('Token ' + i + ' (' + currToken.type + '): ' + currToken.text + ' ' + flags);
                //currElem =
                //    subElement(page, currToken);

                //  apply overrides from markdown for font and size

                if ( tokens[i].overrideFont ) {
                    useFont = tokens[i].overrideFont;
                } else {
                    useFont = fontName;
                }

                if ( tokens[i].overrideSize ) {
                    useHeight = parseFloat( tokens[i].overrideSize );
                } else {
                    useHeight = lineHeight;
                }

                if ( tokens[i].overrideSizeMul ) {
                    useHeight = useHeight * tokens[i].overrideSizeMul;
                }

                //  create a subelement object

                tokens[i].textWidth = getTextWidth(currToken);

                currElem = Y.dcforms.createSubElement(
                    currToken.left,                         //  left
                    currToken.top,                          //  top
                    tokens[i].textWidth,                    //  width
                    useHeight,                              //  height
                    useHeight,                              //  lineHeight
                    currToken.text,                         //  text
                    null                                    //  image
                );

                //  apply override for color
                if ( tokens[i].overrideColor && '' !== tokens[i].overrideColor ) {
                    currElem.overrideColor = tokens[i].overrideColor;
                }

                if( currToken.highlightColor && '' !== currToken.highlightColor ) {
                    currElem.highlightColor = currToken.highlightColor;
                }

                //  add graphic for OL
                if ( currToken.imgId ) {
                    currElem.imgId = currToken.imgId;
                    currElem.img = currToken.img;
                    currElem.text = '';
                    currElem.height = ( currElem.height * ( 2 / 3 ) );
                    currLine.cursor = currLine.cursor - currElem.width;
                }

                //  sections of text marked as incorrect transcription, not a property of element
                currElem.isWrong = currToken.isWrong;

                currElem.width = getTextWidth(currToken);
                currElem.left = currLine.cursor;
                currElem.type = currToken.type;
                currElem.font = useFont;
                currElem.isBold = currToken.isBold || isBold;
                currElem.isItalic = currToken.isItalic || isItalic;
                currElem.isUnderline = currToken.isUnderline || isUnderline;

                if (currElem.width > maxWidth) {
                    currElem.width = maxWidth;
                    //  disable font correction if subelement is wider than maxWidth (unbroken long string)
                    currElem.nocorrect = true;
                }

                if ( currToken.indent ) {
                    currElem.left = currElem.left + ( currToken.indent * useHeight );
                }

                if ('space' === currToken.type || 'text' === currToken.type || 'punct' === currToken.type ) {

                    if (currElem.left + currElem.width > currLine.width) {
                        //  close off previous line before creating a new one
                        //console.log('Finalizing line ' + lineIdx);

                        //console.log( 'text too wide, line width: ' +  currLine.width + ' elemWidth: ' + currElem.width + ' current token: ', currToken );

                        finalizeLine( true );
                        bumpLine();
                        currElem.left = 0;

                        if ( currToken.indent ) {
                            currElem.left = currElem.left + ( currToken.indent * useHeight );
                        }

                    }

                    //  drop leading spaces at the beginning of the line
                    trimSpace = (('space' === currToken.type) && (0 === currLine.cursor));

                    currElem.top = currLine.top;
                    currElem.lineNo = lineIdx;

                    if (!trimSpace) {
                        currLine.spaceLeft = currLine.spaceLeft - currElem.width;
                        currLine.cursor = currLine.cursor + currElem.width;
                        subElements.push(currElem);
                        currLine.elemCount = currLine.elemCount + 1;
                    }

                    //console.log('currLine ' + currLine.lineNo + ' elements: ' + currLine.elemCount);
                }

                if ('newline' === currToken.type) {
                    //  close off previous line before creating a new one
                    //console.log('Finalizing line ' + lineIdx);
                    finalizeLine( false );
                    bumpLine();

                    //  newline belongs to next line to give it height if otherwise empty
                    currElem.lineNo = lineIdx;
                    currElem.top = currLine.top;
                    currElem.left = 0;
                    subElements.push(currElem);
                }

            }

            //  finish last line
            if (currLine.elemCount > 0) {
                finalizeLine( false );
            }

            //  adjust element positions by static offset
            for (i = 0; i < subElements.length; i++) {
                subElements[i].left = subElements[i].left + x;
                subElements[i].top = subElements[i].top + y;
            }

            return subElements;

            //  HELPER ROUTINES

            function bumpLine() {

                currLine = Y.dcforms.createSubElement(
                    0,                                          //  left
                    currLine.top + (currLine.height * leading), //  top
                    maxWidth,                                   //  width
                    0,                                          //  height
                    lineHeight,                                 //  lineHeight
                    '',                                         //  text
                    null                                        //  image
                );

                currLine.type = 'line';
                currLine.cursor = 0;
                currLine.spaceLeft = maxWidth;
                currLine.lineNo = lineIdx;
                currLine.elemCount = 0;
            }

            /**
             *  Finish the current line and add it to subElements array
             *
             *  @param  isWrap  {Boolean}   True if this is a wrapped section of a line (not the last part)
             */

            function finalizeLine( isWrap ) {
                var
                    elemIdx,
                    elemCount = 0,
                    maxHeight = 0,
                    maxLeft = 0,
                    countSpaces = 0,
                    justifyBy = 0,
                    justifyIdx = 1,
                    justifyCursor = 0,
                    freeWidth;

                //  get height of this line
                for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                    if (subElements[elemIdx].lineNo === currLine.lineNo) {
                        elemCount = elemCount + 1;

                        //  set height of newline token to be that of next subelement, if any
                        //  to prevent bug newlines messing up the leading of small text
                        if ( 'newline' === subElements[elemIdx].type && subElements[ elemIdx + 1 ] ) {
                            subElements[elemIdx].height = subElements[elemIdx + 1].height;
                        }

                        if (subElements[elemIdx].height > maxHeight ) {
                            maxHeight = subElements[elemIdx].height;
                        }

                    }
                }

                currLine.height = maxHeight;

                //  measure free space
                for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                    if (subElements[elemIdx].lineNo === currLine.lineNo) {
                        if (maxLeft < (subElements[elemIdx].left + subElements[elemIdx].width)) {
                            if ('text' === subElements[elemIdx].type) {
                                maxLeft = subElements[elemIdx].left + subElements[elemIdx].width;
                            }
                        }
                    }
                }

                freeWidth = maxWidth - maxLeft;

                //  reposition elements on new baseline (height may vary due to markdown changes to font, size, etc)
                for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                    if (subElements[elemIdx].lineNo === currLine.lineNo) {
                        if (subElements[elemIdx].height !== maxHeight) {
                            //  match baselines of letters, not of bounding boxes, assume leading of one third
                            subElements[elemIdx].top = subElements[elemIdx].top + ( ( 2 / 3 ) * ( maxHeight - subElements[elemIdx].height ) );
                        }
                    }
                }

                //  elements are left aligned by default, move to right if necessary
                //  (ie, move right by total amount of free space at right)
                if ('right' === align) {
                    for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                        if (subElements[elemIdx].lineNo === currLine.lineNo) {
                            subElements[elemIdx].left = subElements[elemIdx].left + freeWidth;
                        }
                    }
                }

                //  elements are left aligned by default, move to center if necessary
                //  (ie, move right by half of free space at right)
                if ('center' === align) {
                    for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                        if (subElements[elemIdx].lineNo === currLine.lineNo) {
                            subElements[elemIdx].left = subElements[elemIdx].left + (freeWidth / 2);
                        }
                    }
                }

                //  elements are left aligned by default, spread out if text has wrapped
                //  (divide up free space between spaces on wrapped lines)
                if ('justify' === align && isWrap ) {
                    for (elemIdx = 0; elemIdx < subElements.length - 1; elemIdx = elemIdx + 1) {
                        //  count words on line
                        if ( subElements[elemIdx].lineNo === currLine.lineNo  && 'space' === subElements[elemIdx].type ) {
                            //subElements[elemIdx].left = subElements[elemIdx].left + (freeWidth / 2);
                            countSpaces = countSpaces + 1;
                        }
                    }

                    //  divide up free space between words
                    justifyBy = ( freeWidth / countSpaces );

                    for (elemIdx = 0; elemIdx < subElements.length; elemIdx = elemIdx + 1) {
                        //  bump words to the right by fraction of free space
                        if (subElements[elemIdx].lineNo === currLine.lineNo  && 'space' === subElements[elemIdx].type ) {
                            justifyCursor = (justifyBy * justifyIdx);
                            subElements[elemIdx].width = subElements[elemIdx].width + justifyBy;
                            justifyIdx = justifyIdx + 1;
                        }

                        if ( subElements[elemIdx].lineNo === currLine.lineNo ) {
                            subElements[elemIdx].left = subElements[elemIdx].left + justifyCursor;
                        }
                    }
                }

                subElements.push(currLine);

                //  increase line index
                lineIdx = lineIdx + 1;
            }

            /**
             *  Measure text width on the current canvas context (mm)
             *
             *  This is done by measuring the text width at 100px and applying the aspect ratio to the current token
             *
             *  @param  token   {object}
             */

            function getTextWidth( token ) {
                return Y.dcforms.measureTextWidth( useFont, token.isBold || isBold, token.isItalic || isItalic, useHeight, token.text );
            }

        };

        /**
         *  Simple state machine to parse markdown
         *
         *  Custom kerning for PDF mode is currently disabled, may be re-enabled if needed in future
         *
         *  @param mdtxt    {String}    Raw markdown string, UTF-8
         *  @/param isPDF    {Bool}      Use custom kerning for PDFs
         *  @returns        {Array}     Array of token objects
         */

        Y.dcforms.tokenizeMarkdown = function(mdtxt /*, isPDF*/) {

            var
                txtLen,
                txtBuffer = '',
                tokens = [],
                charAt = 0,
                inBold = false,
                inItalic = false,
                inUnderline = false,
                inWrong = false,
                tempToken,
                highlightColorValue;

            //  do not tokenize magic embeds
            mdtxt = mdtxt.replace( /\{\{form.pageNo\}\}/g, '[[form_pageNo]]' );
            mdtxt = mdtxt.replace( /\{\{form.pages\}\}/g, '[[form_pages]]' );
            mdtxt = mdtxt.replace( /\{\{form.pageOfPages\}\}/g, '[[form_pageOfPages]]' );
            mdtxt = mdtxt.replace( /\{\{form.date\}\}/g, '[[form_date]]' );

            //  approximate characters no longer supported in ISO 8859-15, MOJ-10273
            mdtxt = mdtxt.replace( /½/g, '1/2' );
            mdtxt = mdtxt.replace( /¼/g, '1/4' );
            mdtxt = mdtxt.replace( /¾/g, '3/4' );
            mdtxt = mdtxt.replace( /™/g, 'TM' );

            mdtxt = htmlEntities.decode( mdtxt );

            mdtxt = mdtxt.replace( new RegExp( '&amp;', 'g' ) , '&' );

            txtLen = mdtxt.length;

            function parseNextChar() {

                //  The ꟸ char is a temporary magic string used to break on commas, a hack until better table controls
                //  can be implemented

                var
                    nextChar = mdtxt.substr(charAt, 1),
                    peekChar = (charAt < txtLen) ? mdtxt.substr(charAt + 1, 1) : '',
                    confirmChar = (charAt + 1 < txtLen) ? mdtxt.substr(charAt + 2, 1) : '',
                    isSpace = (' ' === nextChar || "\t" === nextChar),
                    isPunct = ( /* ',' === nextChar || */ "ꟸ" === nextChar || ";" === nextChar || ":" === nextChar /* ||  "-" === nextChar */ ),
                    isNewline = ("\n" === nextChar),
                    isIgnored = ("\r" === nextChar),
                    isStar = (('*' === nextChar) && ('*' === peekChar) && ('*' !== confirmChar)),
                    isUL = (('_' === nextChar) && ('_' === peekChar) && ('_' !== confirmChar)),
                    isFS = (('/' === nextChar) && ('/' === peekChar) && ('/' !== confirmChar)),
                    isTilde = (('~' === nextChar) && ('~' === peekChar) && ('~' !== confirmChar)),
                    isSpecial = (isSpace || isPunct || isNewline || isStar || isFS || isUL || isIgnored || isTilde),
                    isHighlightColor = isTilde && ('!' === confirmChar) && ('!bg=' === mdtxt.substring( charAt + 2, charAt + 6 )),
                    colorStartIndex = isHighlightColor && mdtxt.indexOf( '!bg=', charAt ),
                    colorEndIndex = isHighlightColor && mdtxt.indexOf( '=bg!', charAt );

                if (isSpecial) {

                    if ('' !== txtBuffer) {
                        tempToken = {
                            'type': 'text',
                            'text': txtBuffer + '',
                            'isBold': inBold,
                            'isItalic': inItalic,
                            'isUnderline': inUnderline,
                            'isWrong': inWrong,
                            'highlightColor': highlightColorValue
                        };
                        tokens.push( tempToken );
                        txtBuffer = '';
                    }

                    if (isSpace) {
                        tempToken = {
                            'type': 'space',
                            'text': ' ',
                            'isBold': inBold,
                            'isItalic': inItalic,
                            'isUnderline': inUnderline,
                            'isWrong': inWrong,
                            'highlightColor': highlightColorValue
                        };
                        tokens.push( tempToken );
                    }

                    if (isPunct) {
                        tempToken = {
                            'type': 'text',
                            'text': nextChar.replace('ꟸ', ','),
                            'isBold': inBold,
                            'isItalic': inItalic,
                            'isUnderline': inUnderline,
                            'isWrong': inWrong,
                            'highlightColor': highlightColorValue
                        };
                        tokens.push( tempToken );
                    }

                    if (isNewline) {
                        tempToken = {
                            'type': 'newline',
                            'text': ' ',
                            'isBold': inBold,
                            'isItalic': inItalic,
                            'isUnderline': inUnderline,
                            'isWrong': inWrong,
                            'highlightColor': highlightColorValue
                        };
                        tokens.push( tempToken );

                        inBold = false;
                        inItalic = false;
                        inUnderline = false;
                    }

                    if (isFS) {
                        charAt = charAt + 1;        //  skip next character in string
                        inItalic = !inItalic;
                    }

                    if (isStar) {
                        charAt = charAt + 1;        //  skip next character in string
                        inBold = !inBold;
                    }

                    if (isUL) {
                        charAt = charAt + 1;        //  skip next character in string
                        inUnderline = !inUnderline;
                    }

                    if ( isTilde ) {
                        charAt = charAt + 1;        //  skip next character in string
                        inWrong = !inWrong;
                        if( isHighlightColor ) {
                            highlightColorValue = mdtxt.substring( colorStartIndex + 4, colorEndIndex );
                            // skip color value from processing
                            charAt = charAt + colorEndIndex + 4 - colorStartIndex;
                        } else {
                            highlightColorValue = null;
                        }
                    }

                } else {
                    txtBuffer = txtBuffer + nextChar;
                }

                charAt = charAt + 1;
            }

            while (charAt < txtLen) {
                parseNextChar();
            }

            //  push any remaining text in the buffer
            if ('' !== txtBuffer) {
                tempToken = {
                    'type': 'text',
                    'text': txtBuffer + '',
                    'isBold': inBold,
                    'isItalic': inItalic,
                    'isWrong': inWrong
                };
                tokens.push( tempToken );
                txtBuffer = '';
            }

            //  apply special overrides to tokes (change color, font, etc)
            tokens = applyTokenOverrides( tokens );

            //  read extended markdown for line-level elements (header, lists, etc)
            tokens = applyLineBasedMarkdown( tokens );

            return tokens;
        };

        Y.dcforms.mmToPoints = function(mm) {
            return mm * 2.83464567;
        };

        Y.dcforms.pointsToMm = function(points) {
            return (0.352778 * points);
        };

        Y.dcforms.mmToPx = function(scale, mm) {
            return scale * mm; //mmToPoints(mm) * 1.333333;
        };


        /**
         *  Check for special markdown tokens which change the font, color or size of text
         */

        function applyTokenOverrides( tokens ) {
            var
                newTokens = [],
                token,
                parts,
                overrideColor = '',
                overrideBackground = '',
                overrideSize = '',
                overrideFont = '',
                i;

            for ( i = 0; i < tokens.length; i++ ) {

                token = tokens[i];

                if ( 'text' === token.type ) {

                    if ( '!color=' === token.text.substr( 0, 7 ) ) {
                        token.type = 'override';
                        parts = token.text.split( '=' );
                        overrideColor = ( !parts[1] || '' === parts[1] ) ? '' : parts[1];
                        overrideColor = overrideColor.replace( '!', '' );
                    }

                    if ( '!bg=' === token.text.substr( 0, 7 ) ) {
                        token.type = 'override';
                        parts = token.text.split( '=' );
                        overrideBackground = ( !parts[1] || '' === parts[1] ) ? '' : parts[1];
                        overrideBackground = overrideBackground.replace( '!', '' );
                    }

                    if ( '!font=' === token.text.substr( 0, 6 ) ) {
                        //console.log( '(****) have override: ', token.text );
                        token.type = 'override';
                        parts = token.text.split( '=' );
                        overrideFont = ( !parts[1] || '' === parts[1] ) ? '' : parts[1];
                        overrideFont = overrideFont.replace( '!', '' );
                    }

                    if ( '!size=' === token.text.substr( 0, 6 ) ) {
                        //console.log( '(****) have override: ', token.text );
                        token.type = 'override';
                        parts = token.text.split( '=' );
                        overrideSize = ( !parts[1] || '' === parts[1] ) ? '' : parts[1];
                        overrideSize = overrideSize.replace( '!', '' );
                    }

                    //  if an override token, check if the next token is a space, skip it if so
                    if ( 'override' === token.type && tokens[ i + 1 ] && 'space' === tokens[ i + 1 ].type ) {
                        tokens[ i + 1 ].type = 'override';
                    }

                    //  if not an override token, apply any overrides to this text token
                    if ( 'text' === token.type ) {
                        if ( '' !== overrideColor ) {
                            token.overrideColor = overrideColor;
                        }
                        if ( '' !== overrideBackground ) {
                            token.overrideBackground = overrideBackground;
                        }
                        if ( '' !== overrideFont ) {
                            token.overrideFont = overrideFont;
                        }
                        if ( '' !== overrideSize ) {
                            token.overrideSize = overrideSize;
                        }
                    }

                }

                if ( 'override' !== token ) {
                    newTokens.push( token );
                }
            }

            return newTokens;
        }

        /**
         *  Parse markdown which applies to whole lines
         *
         *  @param tokens
         *  @return {*}
         */

        function applyLineBasedMarkdown( tokens ) {
            var
                inH1 = false,
                inH2 = false,
                inH3 = false,
                inH4 = false,
                inH5 = false,
                inH6 = false,           //  used for block level 'small' rather than headings
                inOL = false,
                inUL = false,
                inBlockQuote = false,
                olCounter = 1,
                token,
                //  start parsing as if on a newline
                lastToken = { type: 'newline' },
                nextToken,
                i;

            for ( i = 0; i < tokens.length; i++ ) {
                token = tokens[i];
                nextToken = tokens[i + 1] ? tokens[i + 1] : {};

                //  do not process trailing space (allow single dash "-" on line, not a UL without the space)
                if ( 'space' === nextToken.type && ( i + 2 ) === tokens.length ) {
                    break;
                }

                //  headings

                if ( '#' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH1 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ]  ) {
                        nextToken.text = '';
                    }
                }

                if ( '##' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH2 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                if ( '###' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH3 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                if ( '####' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH4 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                if ( '#####' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH5 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                //  h6 used for block level 'small'
                if ( '######' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inH6 = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                //  lists and quotes

                if ( '1.' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inOL = true;
                    token.text = '  ' + olCounter + '. ';
                    olCounter = olCounter + 1;
                    if ( tokens[ i + 1 ] && 'space' === nextToken.type ) {
                        nextToken.text = '';
                    }
                }

                if ( '-' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inUL = true;
                    token.text = '--';
                    token.img = Y.dcforms.assets.radiotruetrans;
                    token.imgId = ':radiotruetrans.png';
                    token.indent = BULLET_INDENT;
                    if ( tokens[ i + 1 ] && 'space' === nextToken.type ) {
                        nextToken.text = '';

                    }
                }

                if ( '>' === token.text && 'newline' === lastToken.type && 'space' === nextToken.type ) {
                    inBlockQuote = true;
                    token.text = '';
                    if ( tokens[ i + 1 ] ) {
                        nextToken.text = '';
                    }
                }

                //  apply size adjustments while in headers
                if ( inH1 ) { /* token.isBold = true; */  token.overrideSizeMul = 2.5; }
                if ( inH2 ) { token.isBold = true;  token.overrideSizeMul = 2.1; }
                if ( inH3 ) { /* token.isBold = true; */  token.overrideSizeMul = 1.5; }
                if ( inH4 ) { /* token.isBold = true; */  token.overrideSizeMul = 1.18; }
                if ( inH5 ) { /* token.isBold = true; */  token.overrideSizeMul = 1.09; }
                if ( inH6 ) { /* token.isBold = true; */  token.overrideSizeMul = 0.7; }

                //  end of line
                if ( 'newline' === token.type ) {
                    inH1 = false;
                    inH2 = false;
                    inH3 = false;
                    inH4 = false;
                    inH5 = false;
                    inH6 = false;
                    inOL = false;
                    inUL = false;
                    inBlockQuote = false;

                    //  reset the counter for ordered lists when reaching the end of one
                    if ( '1.' !== nextToken.text ) {
                        olCounter = 1;
                    }
                }

                //  apply indentation for lists and blockquotes
                if ( ( inOL || inUL || inBlockQuote ) && !token.indent ) {
                    token.indent = GENERAL_INDENT;   //  multiple of the line height
                }

                lastToken = token;
            }

            return tokens;
        }

        /**
         *  Method to extract placeholders for bound values from a piece of text
         *  @param txt
         *  @return {Array}
         */

        Y.dcforms.getEmbeddedBindings = function( txt ) {
            var embeds = [], i, char, lastChar = '', buffer = '', inEmbed = false;

            for ( i = 0; i < txt.length; i++ ) {
                char = txt.substr( i, 1 );

                if ( inEmbed && '}' !== char ) {
                    buffer = buffer + char;
                }

                if ( '{' === char && '{' === lastChar ) {
                    inEmbed = true;
                    buffer = '';
                }

                if ( '}' === char && '}' === lastChar ) {
                    inEmbed = false;
                    embeds.push( buffer + '' );
                    buffer = '';
                }

                lastChar = char;
            }

            return embeds;
        };

        /**
         * MedDataTable object, mappings like: {{InCase_T.mdt.HEIGHT.display}} {{InCase_T.mdt.HEIGHT.unit}}
         * @param {string} txt text where the replacement of the embed shall be done
         * @param {string} embed embed to be searched for
         * @param {string[]} parts embed split into parts (at character ".")
         * @param {object|null} [mapObject] object containing the data to be mapped
         * @param {(string|RegExp)[]} embedKeyChain
         * @param {string[]} embedKeyOverride may be used to override any object-key (i.e. ["md"] => ["latestMedData"])
         * @returns {string} text with the replaced content, or no replacement at all
         */
        Y.dcforms.matchEmbedDataTable = function matchEmbedDataTable( txt, embed, parts, mapObject, embedKeyChain, embedKeyOverride ) {
            var
                localMapObject = mapObject,
                searchKey,
                partsKey,
                i, l;

            // validate input
            switch( true ) {
                case !Array.isArray( embedKeyChain ):
                case !Array.isArray( parts ):
                case parts.length < 3: // min length 3 ["InCase_T", "KEY", "SOME VALUE"]
                case parts.length < embedKeyChain.length - 1: // -1 because parts should start with ["InCase_T"]
                    return txt;
            }

            var
                // kick out the InCase_T prefix
                relevantParts = parts.slice( 1 );

            /**
             * Check, if the current embed has relevance for this MapObject
             * by comparing the embedKeyChain with the object's keys.
             * E.g. the embedKeyChain is configured with [/.+/, /\d+],
             * the embed is configured "with diagnosisTable.0.key1"
             * then the loop will go recursively into a mapObject having
             * {
             *      diagnosisTable: [
             *          {key1: "content to map", key2: "other content"},
             *          {key2: "other content", key3: "other content"}
             *      ]
             * }
             * and extract the first array entry inside the diagnosisTable
             * as new localMapObject = {key1: "content to map", key2: "other content"}.
             * The remaining part of this function then can dive into "key1"
             * and extract the "content to map".
             */
            for( i = 0, l = embedKeyChain.length; i < l; i++ ) {
                searchKey = embedKeyChain[i];
                partsKey = relevantParts[i];

                switch( true ) {

                    // given the searchKey is a RegExp => issue a new search request for the explicit match of that RegExp
                    case searchKey instanceof RegExp && partsKey.match( searchKey ) !== null:
                        embedKeyChain.splice( i, 1, partsKey );
                        return Y.dcforms.matchEmbedDataTable( txt, embed, parts, mapObject, embedKeyChain, embedKeyOverride );

                    // given searchKey is string and there is a direct match with the embed => continue
                    case typeof searchKey === "string" && partsKey === searchKey:
                        // check if the searchKey should be overwritten to match the object
                        // i.e. ["md"] is inside the object {"latestMedDataTable": ...}
                        if( Array.isArray( embedKeyOverride ) && typeof embedKeyOverride[i] === "string" ) {
                            searchKey = embedKeyOverride[i];
                        }

                        // check, if the mapObject has a valid object under that key
                        switch( true ) {
                            case localMapObject === null:
                            case typeof localMapObject !== "object":
                                // no match => return
                                return txt;
                        }

                        // if the mapObject is an array, the key MUST be numeric ... => convert it
                        if( Array.isArray( localMapObject ) ) {
                            searchKey = parseInt( searchKey, 10 );
                        }

                        switch( true ) {
                            case typeof searchKey === "number" && (isNaN( searchKey ) || !isFinite( searchKey )):
                            case !Object.prototype.hasOwnProperty.call( localMapObject, searchKey ):
                            case localMapObject[searchKey] === null:
                            case typeof localMapObject[searchKey] !== "object":
                                // no match => return
                                return txt;
                        }

                        // object found => proceed into the nested object until
                        // we have reached the final mapObject for that embedKeyChain
                        localMapObject = localMapObject[searchKey];
                        break;

                    default:
                        // no match => return
                        return txt;
                }
            }

            // if we reach this point, medData contains the correct object => search for the dynamic parts of the key
            var
                itemKeys = Object.keys( localMapObject ),
                itemKey,
                selectedKey,
                lastPart,
                item,
                j;

            for( i = 0, l = itemKeys.length; i < l; i++ ) {
                itemKey = itemKeys[i];
                item = localMapObject[itemKey];

                /**
                 * Start to concatenate the parts of the embed from the back.
                 * Assume that the concatenated string is the requested object key.
                 * Search for this string inside the object, and return, if possible.
                 * E.g.
                 *      InCase_T.table.0.REQUESTEDKEY
                 *      => search inside the localMapObject for {"REQUESTEDKEY": "requested value"}.
                 *      InCase_T.table.0.REQUESTEDKEY.WITHDOT
                 *      => search inside the localMapObject for {"REQUESTEDKEY.WITHDOT": "requested value"}.
                 *
                 * Starts with the longest possible key but maxes out at embedKeyChain.length,
                 * as embedKeyChain is the known part of the structure of the embed.
                 * E.g. InCase_T.table.0.REQUESTEDKEY.WITHDOT, embedKeyChain = [/.+/, /\d+/]
                 * j = 0: InCase_T
                 * j = 1: table
                 * j = 2: 0                    <-- known part of the embed up to here
                 * j = 3: REQUESTEDKEY         <-- first unknown part of the embed
                 * j = 4: REQUESTEDKEY.WITHDOT <-- start to search for that string as key first
                 */
                for( j = relevantParts.length; j > embedKeyChain.length; j-- ) {
                    selectedKey = relevantParts.slice( embedKeyChain.length, j ).join( "." ).toLowerCase();
                    lastPart = relevantParts.slice( j ).join( "." );

                    switch( true ) {

                        // plain tables may have data directly hosted under the selectedKey itself
                        case typeof item === "string" && itemKey.toLowerCase() === selectedKey:
                        case typeof item === "number" && itemKey.toLowerCase() === selectedKey:
                            return txt.replace( embed, item );

                        // MEDDATA ONLY: (medDataItems stored inside the host object)
                        // * the normal type may be translated during mapping, so take
                        // * or the "clean" type, which never is translated
                        case typeof item === "object" && item !== null && typeof item.type === "string" && item.type.toLowerCase() === selectedKey:
                        case typeof item === "object" && item !== null && typeof item.cleanType === "string" && item.cleanType.toLowerCase() === selectedKey:

                            switch( true ) {

                                // last part is defined on the object => best match
                                case Object.prototype.hasOwnProperty.call( item, lastPart ):
                                    return txt.replace( embed, item[lastPart] );

                                // last part did not match, but the item has a match with that key for the "display" property (default match, and lastPart is empty)
                                case lastPart === "" && Object.prototype.hasOwnProperty.call( item, "display" ):
                                    return txt.replace( embed, item.display );

                            }

                    }

                }
            }

            return txt;
        };

        /**
         *  Clean historical medata emebds if they are not matched
         *  @param  {Array}     emebds
         *  @param  {String}    txt
         */

        Y.dcforms.clearUnmatchedMedatata = function clearUnmatchedMedatata( embeds, txt ) {
            var i;
            for ( i = 0; i < embeds.length; i++ ) {
                if ( 'InCase_T.hmdt' === embeds[i].substr( 0, 13 ) ) {
                    txt = txt.replace( `{{${embeds[i]}}}`, '' );
                }
            }
            return txt;
        };

        /**
         * Match plain text embeds, like: {{InCase_T.patientName}}, {{InCase_T.patientName.SubKey.Something}}
         * @param {string} txt text where the replacement of the embed shall be done
         * @param {string} embed embed to be searched for
         * @param {string[]} parts embed split into parts (at character ".")
         * @param {object|null} [mapObject]
         * @param {string} elemType
         * @returns {string} text with the replaced content, or no replacement at all
         */
        Y.dcforms.matchEmbedPlainValue = function matchEmbedPlainValue( txt, embed, parts, mapObject, elemType ) {
            var
                schemaMember = parts.slice( 1 ).join( "." ),
                item;

            switch( true ) {
                case mapObject === null:
                case typeof mapObject !== "object":
                case !Object.prototype.hasOwnProperty.call( mapObject, schemaMember ):
                    return txt;
            }

            item = mapObject[schemaMember];
            switch( typeof item ) {
                case 'string':
                    if( elemType === 'dropdown' ) {
                        // special case for dropdowns, do not inject new newlines, MOJ-?????
                        // eslint-disable-next-line no-control-regex
                        return txt.replace( embed, item.replace( new RegExp( "\n", "g" ), '{{br}}' ) );
                    }
                    return txt.replace( embed, item );
                case 'number':
                    return txt.replace( embed, item );
            }
            return txt;
        };

        /**
         *  Replace embeds like {{InCase_T.example}} for simple and table types.
         *
         *  Future version might consider schema.
         *
         *  @param  {String}    txt             Text which may have values embedded
         *  @param  {Object}    embeds          Array of embeds extracted from this text
         *  @param  {Object}    mObj            Dict with keys and values
         *  @param  {String}    elemType        Element type we are matching into, dropdown needs special behavior
         */

        Y.dcforms.matchEmbeds = function( txt, embeds, mObj, elemType ) {
            var
                embed,
                parts,
                schemaMember,
                i, l;

            for( i = 0, l = embeds.length; i < l; i++ ) {
                embed = '{{' + embeds[i] + '}}';
                parts = embeds[i].split( '.' );
                schemaMember = parts[1];

                //  plain text embeds, like:  {{InCase_T.patientName}}
                txt = Y.dcforms.matchEmbedPlainValue( txt, embed, parts, mObj, elemType );

                //  LatestMedData object, mappings like: {{InCase_T.md.HEIGHT.display}} {{InCase_T.md.HEIGHT.unit}}
                txt = Y.dcforms.matchEmbedDataTable( txt, embed, parts, mObj, ['md'], ['latestMedDataTable'] );

                //  MedDataTable object, mappings like: {{InCase_T.mdt.HEIGHT.display}} {{InCase_T.mdt.HEIGHT.unit}}
                txt = Y.dcforms.matchEmbedDataTable( txt, embed, parts, mObj, ['mdt'] );

                /**
                 * historical MedDataTable object, mappings like:
                 * {{InCase_T.hmdt.1.HEIGHT.display}} {{InCase_T.hmdt.1.HEIGHT.unit}},
                 * which would result in returning the second latest med data entry
                 */
                txt = Y.dcforms.matchEmbedDataTable( txt, embed, parts, mObj, ['hmdt', /^\d+$/] );
                txt = Y.dcforms.clearUnmatchedMedatata( embeds, txt );

                //  IngredientPlan object, mappings like: {{InCase_T.ip.Ramipril.targetDosis}}
                txt = Y.dcforms.matchEmbedDataTable( txt, embed, parts, mObj, ['ip'] );

                //  table cell embeds like {{InCase_T.myTable.2.exampleCol}}
                txt = Y.dcforms.matchEmbedDataTable( txt, embed, parts, mObj, [/.+/, /^\d+$/] );

                //  remove unmatched / missing table elements only (ie, don't wipe the form on partial map)
                if( Object.prototype.hasOwnProperty.call( mObj, schemaMember ) && Array.isArray( mObj[schemaMember] ) ) {
                    txt = txt.replace( embed, '' );
                }
            }

            return txt;
        };

        /**
         *  Temporary timing utils, may be expanded
         *
         *  @param  {Object}    timing
         *  @param  {Object}    label
         */

        Y.dcforms.addTimingPoint = function( timing, label ) {
            var
                tNow = new Date().getTime(),
                last, diff = 0;

            if ( timing.length > 0 ) {
                last = timing[ timing.length - 1 ];
                diff = tNow - last.t;
            }

            timing.push( {
                step: label,
                t: tNow,
                diff: diff
            } );
        };

        /**
         *  Print sequence timing to console as CSV, used in debugging, investigating performance
         *  @param  {Object}    timing      Array as produced by addTimingPoint
         */

        Y.dcforms.printTiming = function( timing ) {
            var i, total = 0;
            for ( i = 0; i < timing.length; i++ ) {
                total = total + timing[i].diff;
                Y.log( '[---] ' + timing[i].step + ', ' + timing[i].diff, 'debug', NAME );
            }
            Y.log( '[---] total: ' + total + 'ms', 'debug', NAME );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            "dccommonutils"
        ]
    }
);
