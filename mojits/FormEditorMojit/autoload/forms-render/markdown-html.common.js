/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Parser to convert markdown into HTML for WYSWYG editor
 */

/*eslint prefer-template:0, no-control-regex:0 */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-markdown-html',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.log('Adding markdown to html converter for WYSWYG editor.', 'debug', NAME);

        Y.dcforms.HIGHLIGHT_SPAN_OPEN = '<span style="background-color: #FFFF33;" class="dcWyswygHighlight">';
        Y.dcforms.HIGHLIGHT_SPAN_CLOSE = '</span>';

        /**
         *  Render markdown to HTML
         *
         *  @param      {String}    mdTxt   Markdown text
         *  @returns    {String}
         */

        Y.dcforms.markdownToHtml = function( mdTxt ) {

            var
                lines,
                linesObj = [],
                asHtml = '',
                i;

            //  split markdown into lines and process line based blocks and indents
            mdTxt = mdTxt.replace( new RegExp( '\r\n', 'g' ), '\n' );
            mdTxt = mdTxt.replace( new RegExp( '\r', 'g' ), '\n' );

            lines = mdTxt.split( '\n' );

            for ( i = 0; i < lines.length; i++ ) {
                linesObj.push( {
                    'line': lines[i],
                    'type': 'line',
                    'openColorTags': 0,
                    'openFontTags': 0,
                    'openSizeTags': 0
                } );
            }

            linesObj = processLineBasedMarkdown( linesObj );

            //  process inline markdown for things like bold, underline, color, etc
            for ( i = 0; i < linesObj.length; i++ ) {
                processInlineMarkdown( linesObj[i] );
            }

            //  add highlighted spans
            linesObj = addHighlights( linesObj );

            //  join up all sections into HTML
            for ( i = 0; i < linesObj.length; i++ ) {
                asHtml = asHtml + linesObj[i].line;
            }

            //  join sequential blockquotes into a single HTML element
            asHtml = asHtml.replace( new RegExp( '</blockquote><blockquote>', 'g' ), '<br/>' );

            return asHtml;
        };

        /**
         *  Convert block / line level markdown to HTML
         *  @param linesObj
         */

        function processLineBasedMarkdown( linesObj ) {
            var i, line, lastLineType = '', nextLineType;

            for ( i = 0; i < linesObj.length; i++ ) {
                line = linesObj[i].line;

                //  empty line
                if ( '' === line ) {
                    linesObj[i].type = 'blank';
                }

                //  unordered list item
                if ( '- ' === line.substr( 0, 2 ) ) {
                    linesObj[i].type = 'ulitem';
                    linesObj[i].line = ltrim( line, 2 );
                }

                //  ordered list item
                if ( '1. ' === line.substr( 0, 3 ) ) {
                    linesObj[i].type = 'olitem';
                    linesObj[i].line = ltrim( line, 3 );
                }

                //  indent
                if ( '> ' === line.substr( 0, 2 ) ) {
                    linesObj[i].type = 'indent';
                    linesObj[i].line = ltrim( line, 2 );
                }

                //  headings
                if ( '# ' === line.substr( 0, 2 ) ) {
                    linesObj[i].type = 'h1';
                    linesObj[i].line = ltrim( line, 2 );
                }

                if ( '## ' === line.substr( 0, 3 ) ) {
                    linesObj[i].type = 'h2';
                    linesObj[i].line = ltrim( line, 3 );
                }

                if ( '### ' === line.substr( 0, 4 ) ) {
                    linesObj[i].type = 'h3';
                    linesObj[i].line = ltrim( line, 4 );
                }

                if ( '#### ' === line.substr( 0, 5 ) ) {
                    linesObj[i].type = 'h4';
                    linesObj[i].line = ltrim( line, 5 );
                }

                if ( '##### ' === line.substr( 0, 6 ) ) {
                    linesObj[i].type = 'h5';
                    linesObj[i].line = ltrim( line, 6 );
                }

                if ( '###### ' === line.substr( 0, 7 ) ) {
                    linesObj[i].type = 'h6';
                    linesObj[i].line = ltrim( line, 7 );
                }
            }

            //  group lists together, space paragraphs
            for ( i =  0; i < linesObj.length; i++ ) {
                nextLineType = ( linesObj[ i + 1 ] && linesObj[ i + 1 ].type ) ? linesObj[ i + 1 ].type : '';

                switch( linesObj[i].type ) {
                    case 'olitem':
                        //  check if this is the first item in the list
                        if ( 'olitem' !== lastLineType && 'olstart' !== lastLineType ) {
                            linesObj[i].type = 'olstart';
                        }

                        //  check if this is the last item in the list
                        if ( 'olitem' !== nextLineType ) {
                            if ( 'olstart' === linesObj[i].type ) {
                                //  ordered list with a single item
                                linesObj[i].type = 'olsingle';
                            } else {
                                linesObj[i].type = 'olend';
                            }
                        }
                        break;

                    case 'ulitem':
                        //  check if this is the first item in the list
                        if ( 'ulitem' !== lastLineType && 'ulstart' !== lastLineType ) {
                            linesObj[i].type = 'ulstart';
                        }

                        //  check if this is the last item in the list
                        if ( 'ulitem' !== nextLineType ) {
                            if ( 'ulstart' === linesObj[i].type ) {
                                //  unordered list with a single item
                                linesObj[i].type = 'ulsingle';
                            } else {
                                linesObj[i].type = 'ulend';
                            }
                        }
                        break;
                }

                lastLineType = linesObj[i].type;
            }

            //  wrap in tags
            for ( i = 0; i < linesObj.length; i++ ) {
                line = linesObj[i].line;

                //  TODO: less/css classes for block elements

                switch( linesObj[i].type ) {
                    //  indents
                    case 'indent':      line = '<blockquote>' + line + '</blockquote>';       break;

                    //  ordedred lists
                    case 'olitem':      line = '<li>' + line + '</li>';                         break;
                    case 'olsingle':    line = '<ol><li>' + line + '</li></ol>';                break;
                    case 'olstart':     line = '<ol><li>' + line + '</li>';                     break;
                    case 'olend':       line = '<li>' + line + '</li></ol>';                    break;

                    //  unordered lists
                    case 'ulitem':      line = '<li>' + line + '</li>';                         break;
                    case 'ulsingle':    line = '<ul><li>' + line + '</li></ul>';                break;
                    case 'ulstart':     line = '<ul><li>' + line + '</li>';                     break;
                    case 'ulend':       line = '<li>' + line + '</li></ul>';                    break;

                    //  headings
                    case 'h1':          line = '<h1 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h1>';                         break;
                    case 'h2':          line = '<h2 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h2>';                         break;
                    case 'h3':          line = '<h3 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h3>';                         break;
                    case 'h4':          line = '<h4 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h4>';                         break;
                    case 'h5':          line = '<h5 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h5>';                         break;
                    case 'h6':          line = '<h6 style="margin-top: 1px; margin-bottom: 1px;">' + line + '</h6>';                         break;

                    case 'blank':       line = '<br/>';                                         break;

                    case 'line':
                        //  do not add a line break at end of text, MOJ-12222
                        if ( i !== ( linesObj.length - 1 ) ) {
                            line = line + '<br/>';
                        }
                        break;
                }

                linesObj[i].line = line;
            }

            return linesObj;
        }

        /**
         *  Convert inline markdown to html
         *  @param  {Object}    lineObj
         */

        function processInlineMarkdown( lineObj ) {
            var
                line = lineObj.line,
                htmlLine = '',
                inBold = false,
                inItalic = false,
                inUnderline = false,
                char, next, i;

            //  look for bold/italic/underline and tags to set color/size/font
            for ( i = 0; i < line.length; i++ ) {
                char = line.substr( i , 1 );
                next = ( i !== line.length - 1 ) ? line.substr( i + 1, 1 ) : '';

                if ( '_' === char && '_' === next ) {
                    inUnderline = !inUnderline;
                    i = i + 1;
                    htmlLine = htmlLine + ( inUnderline ? '<u>' : '</u>' );
                    char = '';
                }

                if ( '*' === char && '*' === next ) {
                    inBold = !inBold;
                    i = i + 1;
                    htmlLine = htmlLine + ( inBold ? '<b>' : '</b>' );
                    char = '';
                }

                if ( '/' === char && '/' === next ) {
                    inItalic = !inItalic;
                    i = i + 1;
                    htmlLine = htmlLine + ( inItalic ? '<i>' : '</i>' );
                    char = '';
                }

                if ( '!' === char && '!color=' === line.substr( i, 6 ) ) {
                    //  TODO, implement color in WYSWYG editor
                }

                htmlLine = htmlLine + char;
            }

            //  close off any open tags
            htmlLine = htmlLine + ( inUnderline ? '</u>' : '' );
            htmlLine = htmlLine + ( inBold ? '</b>' : '' );
            htmlLine = htmlLine + ( inItalic ? '</i>' : '' );

            lineObj.line = htmlLine;
        }


        /**
         *  Highlights can span multiple lines / block based elements
         */

        function addHighlights( linesObj ) {
            var
                inHighlight = false,
                line,
                tildeIndex,
                colorStartIndex, colorEndIndex, colorValue,
                i;

            for ( i = 0; i < linesObj.length; i++ ) {
                line = linesObj[i].line;
                while ( -1 !== line.indexOf( '~~' ) ) {
                    inHighlight = !inHighlight;
                    tildeIndex = line.indexOf( '~~' );
                    colorStartIndex = line.indexOf( '!bg=' );
                    colorEndIndex = line.indexOf( '=bg!' );


                    if ( inHighlight ) {
                        //  start a new span, replace the ~~
                        if( -1 < colorStartIndex ) {
                            colorValue = line.substring( colorStartIndex + 4, colorEndIndex );
                            line = line.substr( 0, tildeIndex ) + '<span style="background-color:' + colorValue + ';" class="dcWyswygHighlight">' + line.substr( colorEndIndex + 4 );
                        } else {
                            line = line.substr( 0, tildeIndex ) + Y.dcforms.HIGHLIGHT_SPAN_OPEN + line.substr( tildeIndex + 2 );
                        }
                    } else {
                        //  close current span, replace the ~~
                        line = line.substr(0 , tildeIndex ) + Y.dcforms.HIGHLIGHT_SPAN_CLOSE + line.substr( tildeIndex + 2 );
                    }

                    linesObj[i].line = line;
                }
            }

            //  check that we're not leaving a span hanging open
            //  shouldn't generally happen, but possible with legacy data or when users type their own markdown into the box
            if ( inHighlight ) {
                Y.log( 'Broken markdown left a hanging highlight span.', 'warn', NAME );
                linesObj[ linesObj.length - 1 ].line = linesObj[ linesObj.length - 1 ].line + Y.dcforms.HIGHLIGHT_SPAN_CLOSE;
            }

            return linesObj;
        }

        /**
         *  Trim n characters from the beginning of a string
         *
         *  @param  {String}    txt
         *  @param  {Number}    length
         *  @return {String}
         */

        function ltrim( txt, length ) {
            return txt.substr( length );
        }

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
