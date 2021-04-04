/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Parser to convert HTML from WYSWYG editor into markdown
 */

/*eslint prefer-template:0, no-control-regex:0, no-regex-spaces: 0 */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-html-markdown',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.log('Adding markdown to html converter for WYSWYG editor.', 'debug', NAME);

        var
            ALLOW_HTML_TAGS = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'u', 'i', 'b', 'ul', 'ol', 'li', 'span', 'blockquote', 'br', 'div', 'small' ],
            ALLOW_ATTR = {
                'span': [ 'style', 'class' ]
            };

        /**
         *  Setup event listener to intercept paste of HTML into contentEditable divs
         *  @param elem
         */

        Y.dcforms.setHtmlPaste = function ( elem ) {
            $( elem ).off( 'paste' ).on( 'paste', handlePaste );

            function handlePaste( evt ) {
                var
                    //  IE/edge does not implement clipboardEvent, credit maerics in this stack overlow thread:
                    //  https://stackoverflow.com/questions/6035071/intercept-paste-event-in-javascript
                    hasClipEvent = evt.originalEvent && evt.originalEvent.clipboardData && evt.originalEvent.clipboardData.getData,
                    hasIEClipboard =  window.clipboardData && window.clipboardData.getData,
                    html = '',
                    markdown;

                if ( hasIEClipboard ) {
                    html = window.clipboardData.getData('Text');
                }

                if ( hasClipEvent ) {
                    html = evt.originalEvent.clipboardData.getData( 'text/html' );
                }

                if ( hasClipEvent && !html ) {
                    html = evt.originalEvent.clipboardData.getData( 'text' );
                    if ( html ) {
                        html = html.replace( new RegExp( '\r\n', 'g' ), '<br/>' );
                        html = html.replace( new RegExp( '\r', 'g' ), '<br/>' );
                        html = html.replace( new RegExp( '\n', 'g' ), '<br/>' );
                    }
                }

                if ( !html ) {
                    //  no text to paste
                    Y.log( 'Pasted content cannot be converted to html.', 'warn', NAME );
                    return false;
                }

                //  convert through markdown to clean the pasted content of rich text features we don't support
                markdown = Y.dcforms.htmlToMarkdown( html );

                if ( !markdown ) {
                    Y.log( 'Pasted content can not be converted to markdown: ' + html, 'warn', NAME );
                }

                markdown = cleanPastedMarkdown( markdown );
                html = Y.dcforms.markdownToHtml( markdown );

                //  put the cleaned html back into the target element
                document.execCommand( 'insertHTML', false, html );

                // Prevent the default handler from running
                return false;
            }
        };

        /**
         *  Render markdown to HTML
         *
         *  @param      {String}    mdTxt   Markdown text
         *  @returns    {String}
         */

        Y.dcforms.htmlToMarkdown = function( html ) {
            var
                segments = parseHtml( html ),
                segment,
                inUL = false,
                inOL = false,
                inBlockQuote = false,
                markdown = '',
                i;

            //  Match opening and closing tags, so that both can be transformed together
            segments = linkTags( segments );

            //  Clean empty tags - editing in browser can cause things like <h2></h2> which make for broken markdown
            //  Or nested block elements which are incompatible with markdown formatting
            segments = cleanEmptyTags( segments );

            //  Parse css out of style attributes
            segments = parseSegmentStyles( segments );

            //  Add the implicit line breaks caused by div tags
            segments = blockElementsToBr( segments );

            //  Find special spans created by the highlight button
            segments = findHighlightSpans( segments );

            //  Remove non-text content such as scripts, inline stylesheets, etc
            segments = cleanHtmlMeta( segments );

            //console.log( '(****) parsing HTML: ', html );
            //console.log( '(****) cleaned segments: ', segments );

            for ( i = 0; i < segments.length; i++ ) {
                segment = segments[i];

                //  opening tags of block elements have implicit break before the tag
                //  for example: "some text<p>starts a new line</p>starts another line
                if ( segment.implicitBreak && !segment.isClosing && i !== 0 ) {
                    markdown = markdown + '\n';
                }

                switch( segment.tagName ) {

                    //  Text nodes

                    case 'text':
                        if ( segment.isStartOfLine && inBlockQuote ) {
                            //  start of a line which should be indented
                            markdown = markdown + '> ' + segment.text;
                        } else {
                            markdown = markdown + segment.text;
                        }
                        break;

                    //  Inline markdown

                    case 'p':
                        //  affects implicit breaks only
                        break;

                    case 'br':
                        //  breaks always have implicitBreak set
                        break;

                    case 'b':
                        markdown = markdown + '**';
                        break;

                    case 'em':
                    case 'i':
                        markdown = markdown + '//';
                        break;

                    case 'highlight':
                        if( !segment.isClosing && segment.style && segment.style["background-color"] ) {
                            markdown = markdown + '~~!bg=' + segment.style["background-color"] + '=bg!';
                        } else {
                            markdown = markdown + '~~';
                        }
                        break;

                    case 'u':
                        markdown = markdown + '__';
                        break;

                    //  Block / line based markdown

                    case 'ul':
                        if ( segment.isClosing ) {
                            inUL = false;
                        } else {
                            inUL = true;
                        }
                        break;

                    case 'ol':
                        if ( segment.isClosing ) {
                            inOL = false;
                        } else {
                            inOL = true;
                        }
                        break;

                    case 'li':
                        if ( segment.isClosing ) {
                            //markdown = markdown + '\n';
                        } else {
                            if ( inUL ) {
                                markdown = markdown + '- ';
                            }
                            if ( inOL ) {
                                markdown = markdown + '1. ';
                            }
                        }
                        break;

                    case 'h1':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '# ';
                        }
                        break;

                    case 'h2':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '## ';
                        }
                        break;

                    case 'h3':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '### ';
                        }
                        break;

                    case 'h4':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '#### ';
                        }
                        break;

                    case 'h5':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '##### ';
                        }
                        break;

                    case 'h6':
                        if ( !segment.isClosing ) {
                            markdown = markdown + '###### ';
                        }
                        break;

                    case 'blockquote':
                        inBlockQuote = segment.isClosing ? false : true;
                        break;

                    default:
                        //console.log( '(****) skipping unsupported tag: ', segment.tagName, segment.original );
                        break;
                }

                //  closing tags have implicit breaks after the tag
                if ( segment.implicitBreak && segment.isClosing ) {
                    markdown = markdown + '\n';
                }
            }

            //  remove extra newline on end of text
            if ( '\n' === markdown.substring( markdown.length - 1, markdown.length ) ) {
                markdown = markdown.substring( 0, markdown.length -1 );
            }

            //console.log( '(****) have markdown: ', markdown.replace( new RegExp( '\n', 'g' ), 'X\n' ) );

            return markdown;
        };

        /**
         *  Parse the HTML into tags and text sections, link matching tags together, return an array of metadata
         *  objects called sections which can be assembled into markdown
         *
         *  @param      {String}    html
         *  @return     {Object}
         */

        function parseHtml( html ) {
            var
                segments = [],

                char,
                lastChar,
                inTag = false,
                inAttrSingle = false,
                inAttrDouble = false,
                buffer = '',
                i;

            function bufferToTextSegment() {
                if ( '' !== buffer ) {
                    segments.push( {
                        tagName: 'text',
                        text: buffer
                    } );
                }

                buffer = '';
            }

            for ( i = 0; i < html.length; i++ ) {
                char = html.substr( i, 1 );


                //  contentEditable will sometimes leave an exra space on the end of HTML, which can cause incorrect
                //  interpretation of markdown, remove if present
                if ( ' ' === char && i === ( html.length - 1 ) )  {
                    char = '';
                }

                switch ( char ) {
                    case '<':
                        /* TODO: this in Sprint 4.11
                        if ( inTag && !inAttrSingle && !inAttrDouble ) {
                            //  Previous < was not start of a tag, was a 'less than' MOJ-11950
                            txtStr = txtStr + '&lt' + ltrim( tagStr, 1 );
                            tagStr = '';
                        } else {
                            segments.push( '' )
                            inTag = true;
                        }
                        */

                        bufferToTextSegment();
                        inTag = true;

                        break;

                    case '>':
                        if ( !inAttrSingle && !inAttrDouble ) {
                            inTag = false;
                        }
                        buffer = buffer + char;
                        segments.push( cleanSingleTag( buffer ) );
                        char = '';
                        buffer = '';
                        inTag = false;
                        break;

                    case "'":
                        if ( inTag && !inAttrDouble ) {
                            //  start or end of a single quoted string in an HTML entity
                            inAttrSingle = !inAttrSingle;
                        }
                        break;

                    case '"':
                        if ( inTag && !inAttrSingle ) {
                            //  start or end of a double quoted string in an HTML entity
                            inAttrDouble = !inAttrDouble;
                        }
                        break;

                    case '\r':
                    case '\n':
                        //  Clipboard sometimes adds newlines inside of HTML when pasting
                        if ( !inTag ) {
                            char = (' ' === lastChar ) ? '' : ' ';
                        }
                        break;
                }

                buffer = buffer + char;
                lastChar = char;
            }

            if ( buffer ) {
                bufferToTextSegment();
            }

            return segments;
        }

        /**
         *  Reduce HTML tag to only those entities and attributes which can be made into markdown
         *
         *  @param html
         */

        function cleanSingleTag( tag ) {
            var
                tagObj = {},
                tokens = [],
                buffer = '',
                inAttrSingle = false,
                inAttrDouble = false,
                i, char,
                parts;

            for ( i = 0; i < tag.length; i++ ) {
                char = tag.substr( i, 1 );

                switch ( char ) {
                    //  break tokens on whitespace
                    case ' ':               //  deliberate fallthrough
                    case "\n":              //  deliberate fallthrough
                    case "\r":              //  deliberate fallthrough
                    case "\t":              //  deliberate fallthrough
                        if ( !inAttrDouble && !inAttrSingle ) {
                            if ( buffer !== '' ) {
                                tokens.push( buffer );
                                buffer = '';
                            }
                            char = '';
                        }
                        break;

                    //  note closing tag
                    case "/":
                        if ( !inAttrDouble && !inAttrSingle ) {
                            tokens.push( char );
                            char = '';
                        }
                        break;

                    // ignore these outside of attributes
                    case ">":
                    case "<":
                        if ( !inAttrDouble && !inAttrSingle ) {
                            char = '';
                        }
                        break;


                    case '"':
                        if ( !inAttrSingle ) {
                            inAttrDouble = !inAttrDouble;
                        }
                        break;

                    case '\'':
                        if ( !inAttrSingle ) {
                            inAttrSingle = !inAttrSingle;
                        }
                }

                buffer = buffer + char;

            }

            if ( '' !== buffer ) {
                tokens.push( buffer );
            }

            tagObj.original = tag;
            tagObj.isClosing = ( '/' === tokens[0] );
            tagObj.tagName = ( tagObj.isClosing ) ? tokens[1] : tokens[0];
            tagObj.tagName = tagObj.tagName.toLowerCase();
            tagObj.allowedAttr = ALLOW_ATTR.hasOwnProperty( tagObj.tagName ) ? ALLOW_ATTR[ tagObj.tagName ] : [];

            //  keep only allowed tags
            if ( -1 === ALLOW_HTML_TAGS.indexOf( tagObj.tagName ) ) {
                tagObj.omit = true;
                return tagObj;
            }

            //  keep only allowed attributes
            for ( i = 0;  i < tokens.length; i++ ) {
                parts = tokens[i].split( '=' );
                if ( parts[0] !== tagObj.tagName && parts[0] !== '/' && -1 === tagObj.allowedAttr.indexOf( parts[0] ) ) {
                    tokens[i] = '';
                }
            }

            tag = tokens.join( ' ' )
                .replace( new RegExp( '  ', 'g' ), ' ')
                .replace( new RegExp( '  ', 'g' ), ' ')
                .replace( '/ ', '/' );

            tagObj.tag = '<' + tag.trim() + '>';
            tagObj.tokens = tokens;

            return tagObj;
        }

        /**
         *  Link opening and closing tags to each other
         *  @param segments
         */

        function linkTags( segments ) {
            var
                startOfLineAfter = [ 'br', 'blockquote', 'p', 'div', 'ol', 'li' ],
                i, j, depth, lastSegment = {};

            for ( i = 0; i < segments.length; i++ ) {
                //  for each opening tag which is not a text fragment
                if ( 'text' !== segments[i].tagName && !segments[i].isClosing ) {

                    //  search forward for first closing tag at same depth
                    j = i + 1;
                    depth = 1;

                    while ( j < segments.length ) {
                        if ( segments[j].tagName === segments[i].tagName ) {

                            if ( segments[j].isClosing ) {
                                depth = depth - 1;
                                if ( 0 === depth ) {
                                    //  found it
                                    segments[i].closingTag = j;
                                    segments[j].openingTag = i;
                                    break;
                                }
                            } else {
                                //  nested tag, not a closing tag
                                depth = depth + 1;
                            }

                        }
                        j = j + 1;
                    }

                }

                //  for the text fragments, note which of them follow a line break of paragraph
                if ( 'text' === segments[i].tagName ) {
                    if ( -1 !== startOfLineAfter.indexOf( lastSegment.tagName ) || !lastSegment ) {
                        segments[i].isStartOfLine = true;
                    }
                }

                lastSegment = segments[i];
            }

            return segments;
        }

        /**
         *  Add the implicit line break caused by divs, blockquotes, etc
         *
         *  @param segments
         *  @return {*}
         */

        function blockElementsToBr( segments ) {
            var
                blockElements = [ 'div', 'ol', 'ul', 'li', 'blockquote', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
                lastSegment = {},
                i;

            //  TODO: handle color, etc

            //  multiple nested block level elements should not cause multiple breaks
            for ( i = 0; i < segments.length; i++ ) {
                if ( -1 !== blockElements.indexOf( lastSegment.tagName ) && 'br' !== segments[i].tagName ) {
                    // last tag was a block element, don't double the break
                    segments[i].omitBr = true;
                }

                lastSegment = segments[i];
            }

            //  replace divs with breaks
            for ( i = 0; i < segments.length; i++ ) {
                if ( -1 !== blockElements.indexOf( segments[i].tagName ) && !segments[i].omitBr ) {
                    segments[i].implicitBreak = true;
                }
            }

            return segments;
        }

        /**
         *  Expand any style attributes
         *  @param segments
         *  @return {*}
         */

        function parseSegmentStyles( segments ) {
            var
                i, j, token;

            for ( i = 0; i < segments.length; i++ ) {
                if ( segments[i].tagName !== 'text' && segments[i].tokens ) {
                    for ( j = 0; j < segments[i].tokens.length; j++ ) {
                        token = segments[i].tokens[j];
                        if ( 'style=' === token.substr( 0, 6 ) ) {
                            token = token.substr( 7 ).replace( new RegExp( '"', 'g' ), '' ).replace( new RegExp( '\'', 'g' ), '' );
                            segments[i].style = parseStyle( token );
                        }
                    }

                }
            }

            return segments;
        }

        /**
         *  The highlighter function uses spans with a special class, we treat them as a magic highlight element type.
         *  Other spans are ignored for now.
         *
         *  @param  {Object}    segments        Output of html parser
         */

        function findHighlightSpans( segments ) {
            var
                highlightClass = 'dcWyswygHighlight',
                i, j;

            for ( i = 0; i < segments.length; i++ ) {
                if ( !segments[i].isClosing && 'span' === segments[i].tagName ) {
                    for ( j = 0; j < segments[i].tokens.length; j++ ) {
                        if ( -1 !== segments[i].tokens[j].indexOf( highlightClass ) ) {
                            segments[i].tagName = 'highlight';
                            if ( segments[i].closingTag ) {
                                segments[segments[i].closingTag].tagName = 'highlight';
                            }
                        }
                    }
                }
            }

            return segments;
        }

        /**
         *  Remove non-text parts of HTML such as headers, script blocks and inline stylesheets
         *
         *  Support for parsing CSS styles (color, font) may be added in future
         *
         *  @param segments
         */

        function cleanHtmlMeta( segments ) {
            var
                inScriptTag = false,
                inStyleTag = false,
                inHead = false,
                i;

            for ( i = 0; i < segments.length; i++ ) {
                if ( 'style' === segments[i].tagName ) {
                    if ( segments[i].isClosing ) {
                        inStyleTag = false;
                    } else {
                        inStyleTag = true;
                    }
                }
                if ( 'script' === segments[i].tagName ) {
                    if ( segments[i].isClosing ) {
                        inScriptTag = false;
                    } else {
                        inScriptTag = true;
                    }
                }
                if ( 'head' === segments[i].tagName ) {
                    if ( segments[i].isClosing ) {
                        inHead = false;
                    } else {
                        inHead = true;
                    }
                }

                if ( inScriptTag ) {
                    segments[i].tagName = 'script';
                }

                if ( inStyleTag ) {
                    segments[i].tagName = 'style';
                }

                if ( inHead ) {
                    segments[i].tagName = 'head';
                }
            }

            return segments;
        }

        /**
         *  Remove clumps of empty html tag pairs like <h1><b></b></h1>, these can mess up the markdown
         *  @param segments
         */

        function cleanEmptyTags( segments ) {
            var segment, i, j, hasText;

            for ( i = 0; i < segments.length; i++ ) {
                segment = segments[i];
                hasText = false;

                if ( segment.closingTag ) {
                    //  if this is an opening html tag, then check between it and its closing tag for any text
                    //  if there is no text between them the html tag pair should not be processed into markdown
                    for ( j = i + 1; j < segment.closingTag; j++ ) {
                        if ( 'text' === segments[j].tagName ) {
                            hasText = true;
                            break;
                        }
                    }

                    if ( !hasText ) {
                        segment.tagName = 'empty';
                        segments[ segment.closingTag ].tagName = 'empty';
                    }

                }
            }

            return segments;
        }

        /**
         *  Parse a style attribute into key/value pairs
         *  @param segment
         */
        function parseStyle( attr ) {
            var
                css = {}, key, value,
                dividerIndex,
                cssRules = attr.split( ';' ).filter( Boolean );

            cssRules.forEach( function( rule ) {
                dividerIndex = rule.indexOf( ':' );
                key = rule.substring( 0, dividerIndex );
                value = rule.substring( dividerIndex + 1 );
                css[key] = value;
            } );
            //  TODO: implement font options for markdown

            return css;
        }

        /**
         *  Clean markdown from pasted HTML, remove common junk
         */

        function cleanPastedMarkdown( markdown ) {
            var
                removeLines = [ '*', '1.', '#', '##', '###', '####', '#####', '######', '&nbsp;' ],
                lines = markdown.split( '\n' ),
                i;

            for ( i = 0; i < lines.length; i++ ) {

                lines[i] = lines[i].trim();

                if ( -1 !== removeLines.indexOf( lines[i] ) ) {
                    lines[i] = '';
                }
            }

            //  remove big chunks of whitespace between paragraphs

            markdown = lines.join( '\n' );

            while ( -1 !== markdown.indexOf( '\n\n\n' ) ) {
                markdown = markdown.replace( new RegExp( '\n\n\n' ), '\n\n' );
            }

            markdown = markdown.trim();

            return markdown;
        }


    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
