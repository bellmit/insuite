/**
 *  WYSWYG controls view model
 *
 *  User: strix
 *  Date: 19/11/19
 *  (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, $ */

'use strict';

YUI.add( 'WYSWYGViewModel', function( Y, NAME ) {

        /**
         * @module WYSWYGViewModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            WHITE_COLOR = '#fff',
            YELLOW_HIGHLIGHT = '#FFFF33',
            GREEN_HIGHLIGHT = '#75F94C',
            i18n = Y.doccirrus.i18n;

        /**
         * Helper function to replace node with it's content to remove all formatting based on the node tagName
         *
         * @param {Node} node
         */
        function replaceNodeWithItContent( node ) {
            switch( node.tagName && node.tagName.toLowerCase() ) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                case 'blockquote':
                    $( node ).replaceWith( node.innerHTML + '<br>' );
                    break;
                case 'span':
                    if( node.classList && node.classList.contains( 'dcWyswygHighlight' ) ) {
                        $( node ).replaceWith( node.innerHTML );
                    }
                    break;
                case 'li':
                case 'ol':
                case 'ul':
                    $( node ).find( 'li' ).replaceWith( function() {
                        return $( this ).html() + '<br>';
                    } );
                    $( node ).replaceWith( function() {
                        return $( this ).contents();
                    } );
                    break;
            }
        }

        /**
         * Finds next child or sibling node for the given node
         *
         * @param {Node} node
         * @returns {Node} next node
         */
        function getNextNode( node ) {
            if( node.firstChild ) {
                return node.firstChild;
            }
            while( node ) {
                if( node.nextSibling ) {
                    return node.nextSibling;
                }

                node = node.parentNode;
            }
        }

        /**
         * Gets all nodes in given range from selection inside of divFloatEditorMDFloatEditor
         *
         * @param {Range} range
         * @returns {Array} nodes
         */
        function getNodesInRange( range ) {
            var start = range.startContainer,
                end = range.endContainer,
                isProperStart = start && '#text' === start.nodeName,
                isProperEnd = end && '#text' === end.nodeName,
                nodes = [], node;

            if( !isProperStart || !isProperEnd ) {
                // wrong selection, should not happened
                return [];
            }

            // walk parent nodes from start to editor div
            for( node = start.parentNode; node; node = node.parentNode ) {
                nodes.push( node );
                if( 'DIV' === node.tagName && (['divFloatEditorMDFloatEditor', 'divFloatEditordivFloatEditor'].includes( node.id ) ||
                                               (node.classList && node.classList.contains( 'markdown-editor' ))) ) {
                    break;
                }
            }
            nodes.reverse();

            // walk children and siblings from start until end is found
            for( node = start; node; node = getNextNode( node ) ) {
                nodes.push( node );
                if( node === end ) {
                    break;
                }
            }

            return nodes;
        }


        /**
         *  @class WYSWYGViewModel
         *  @constructor
         *  @extends KoViewModel
         *
         *  @param  {Object}    config
         *  @param  {Object}    config.content      markdown, KO observable of string
         */
        function WYSWYGViewModel( config ) {
            WYSWYGViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( WYSWYGViewModel, KoViewModel.getBase(), {

                //  PROPERTIES

                options: null,
                textArea: null,
                isDisabled: null,
                selectedHighlightColor: null,
                isColorPickerVisible: null,

                initializer: function FormsTreeViewModel_initializer( options ) {
                    var self = this;

                    if( !options ) {
                        options = {};
                    }

                    //  CONFIGURATION

                    self.options = options;

                    self.textArea = ko.observable();
                    self.isEditable = ko.observable( true );
                    self.markdownContent = ko.observable();
                    self.htmlContent = ko.observable();
                    self.isColorPickerVisible = ko.observable( false );
                    self.selectedHighlightColor = ko.observable( Y.doccirrus.utils.localValueGet( 'selectedHighlightColor' ) || WHITE_COLOR );

                    self.isRendered = ko.observable(false);
                    self.isPinned = ko.observable(options.isPinned || false);
                    self.manageContainerClasses = ko.computed(function () {
                        var
                            isPinned = unwrap( self.isPinned ),
                            isEditable = unwrap( self.isEditable );

                        return isPinned && isEditable ? 'affix-enabled' : 'affix-disabled';
                    });

                    self.isDisabled = ko.computed( function() {
                        return !self.isEditable();
                    } );

                    if ( options && options.content ) {
                        self.htmlContent( Y.dcforms.markdownToHtml( unwrap( options.content ) ) );
                    }

                    self.htmlContentListen = self.htmlContent.subscribe( function( newVal ) {
                        self.markdownContent( Y.dcforms.htmlToMarkdown( newVal ) );
                        if( self.orgElement ){
                            self.orgElement.setValue(Y.dcforms.htmlToMarkdown( newVal ));
                            self.orgElement.page.redraw();
                        }
                        if ( options && options.content ) {
                            options.content( self.markdownContent() );
                        }
                    } );

                    $( '.btn-stub' ).on( "mousedown", function( e ) {
                        return false;
                    } );

                    //  dropdown to change text modes
                    self.toggleLineStyle = ko.observable( '' );
                    self.toggleLineStyleListen = self.toggleLineStyle.subscribe( function( newVal ) {
                        if ( '' === newVal ) { return; }
                        switch( newVal ) {
                            case 'p':   self.onClearClick();    break;
                            case 'h1':  self.onH1Click();       break;
                            case 'h2':  self.onH2Click();       break;
                            case 'h3':  self.onH3Click();       break;
                            case 'h4':  self.onH4Click();       break;
                            case 'h5':  self.onH5Click();       break;
                            case 'h6':  self.onH6Click();       break;
                        }
                        self.toggleLineStyle( '' );
                    } );

                    //  TRANSLATIONS

                    self.HEADING_1 = i18n( 'FormEditorMojit.wyswyg.HEADING_1' );
                    self.HEADING_2 = i18n( 'FormEditorMojit.wyswyg.HEADING_2' );
                    self.HEADING_3 = i18n( 'FormEditorMojit.wyswyg.HEADING_3' );
                    self.HEADING_4 = i18n( 'FormEditorMojit.wyswyg.HEADING_4' );
                    self.HEADING_5 = i18n( 'FormEditorMojit.wyswyg.HEADING_5' );
                    self.HEADING_6 = i18n( 'FormEditorMojit.wyswyg.HEADING_6' );
                    self.PARAGRAPH = i18n( 'FormEditorMojit.wyswyg.PARAGRAPH' );
                    self.noColorI18n = i18n( 'FormEditorMojit.wyswyg.NO_COLOR' );

                    self.yellowHighlightColor = YELLOW_HIGHLIGHT;
                    self.greenHighlightColor = GREEN_HIGHLIGHT;
                },

                templateReady: function FormsTreeViewModel_templateReady() {
                    this.isRendered(true);
                },

                destructor: function FormsTreeViewModel_destructor() {
                    //self.selectionSubscription.dispose();
                },

                /**
                 *  Set up to intercept paste events
                 *
                 *  We reduce pasted rich text to the subset compatible with our editor before showing it.  This is to
                 *  prevent the situation where  the user pastes something unsupported, and it looks fine, then looks
                 *  different after save or in PDF.
                 *
                 *  @param  {Object}    elem
                 */

                setTextArea: function( elem, orgElement ) {
                    var
                        self = this;

                    self.textArea( elem );
                    self.orgElement = orgElement;
                    Y.dcforms.setHtmlPaste( elem );
                },

                /**
                 *  Useful for wrapping selected text
                 */

                getSelectedHTML: function( ) {
                    var
                        range = window.getSelection().getRangeAt(0),
                        content = range.extractContents(),
                        span = document.createElement('SPAN'),
                        htmlContent;

                    span.appendChild(content);
                    htmlContent = span.innerHTML;
                    range.insertNode(span);

                    //alert(htmlContent);
                    return htmlContent;
                },

                /**
                 *  Check if the cursor is inside a block level element, we don't currently nest them
                 *  eg, no ol inside a blockquote, but fine to have an italic section or a highlight
                 *
                 *  @returns    {Boolean}
                 */

                isInBlockElement: function() {
                    var
                        self = this,
                        elem = self.textArea(),
                        sel = window.getSelection(),
                        searchMore = true,
                        selNode;

                    if ( !elem ) {
                        Y.log( 'WYSWYG editor is not bound to an editable div.', 'warn', NAME );
                        return;
                    }

                    if ( !sel || !sel.anchorNode ) { return false; }

                    //  Check if we are inside of a highlight segment, remove the highlight if so

                    selNode = sel.anchorNode;

                    while ( searchMore ) {
                        if ( !selNode.parentNode || 'true' === selNode.contentEditable || true === selNode.contentEditable || 'BODY' === selNode.tagName ) {
                            //  reached the container div, end of search
                            searchMore = false;
                        } else {

                            if ( selNode.tagName ) {
                                switch( selNode.tagName.toLowerCase() ) {
                                    case 'blockquote':
                                    case 'ol':
                                    case 'ul':
                                        //  cursor/selection is inside one of these
                                        return selNode;
                                }
                            }
                        }

                        selNode = selNode.parentNode;
                    }

                    return false;
                },

                //  EVENT HANDLERS

                //  text decoration

                onBoldClick: function() {
                    document.execCommand( 'bold' );
                },

                onItalicClick: function() {
                    document.execCommand( 'italic' );
                },

                onUnderlineClick: function() {
                    document.execCommand( 'underline' );
                },

                onHighlightClick: function() {
                    var
                        self = this,
                        selectedHTML = self.getSelectedHTML(),
                        color = Y.doccirrus.utils.localValueGet( 'selectedHighlightColor' ),
                        elem = self.textArea();

                    // there should be some color always selected OR NO_COLOR is chosen
                    if( !color ) { return; }

                    if ( !selectedHTML ) { return; }

                    if ( !elem ) {
                        Y.log( 'WYSWYG editor is not bound to an editable div.', 'warn', NAME );
                    }

                    if ( elem && document.activeElement !== elem ) {
                        elem.focus();
                    }

                    selectedHTML = '<span style="background-color:' + color + ';" class="dcWyswygHighlight">' + selectedHTML + Y.dcforms.HIGHLIGHT_SPAN_CLOSE;

                    document.execCommand( 'insertHTML', false, selectedHTML );
                },

                /**
                 *  Click handler for the eraser button
                 */

                onClearHighlightClick: function() {
                    var
                        self = this,
                        elem = self.textArea(),
                        sel = window.getSelection(),
                        numHighlights = $( elem ).find( '.dcWyswygHighlight' ).length,
                        searchMore = true,
                        selNode;

                    if ( !elem ) {
                        Y.log( 'WYSWYG editor is not bound to an editable div.', 'warn', NAME );
                        return;
                    }

                    if ( 0 === numHighlights ) {
                        //  nothing to do
                        return;
                    }

                    //  Check if we are inside of a highlight segment, remove the highlight if so

                    if ( sel && sel.anchorNode ) {
                        selNode = sel.anchorNode;

                        while ( searchMore ) {
                            if ( !selNode.parentNode || 'true' === selNode.contentEditable || true === selNode.contentEditable || 'BODY' === selNode.tagName ) {
                                //  reached the container div, end of search
                                searchMore = false;
                            } else {
                                if ( $( selNode ).hasClass( 'dcWyswygHighlight' ) ) {
                                    //  found a highlight span
                                    $( selNode ).css( 'background-color', 'rgba(255,255,255,0)' );
                                    $( selNode ).removeClass( 'dcWyswygHighlight' );
                                    self.htmlContent( elem.innerHTML );
                                    return;
                                }
                            }

                            selNode = selNode.parentNode;
                        }
                    }

                    //  Check if there is only one highlight segment, remove the highlight if so
                    if ( 1 === numHighlights ) {
                        $( elem ).find( '.dcWyswygHighlight' ).css( 'background-color', 'rgba(255,255,255,0)' );
                        $( elem ).find( '.dcWyswygHighlight' ).removeClass( 'dcWyswygHighlight' );
                        self.htmlContent( elem.innerHTML );
                        return;
                    }

                    Y.doccirrus.DCWindow.confirm( {
                        'title': i18n( 'general.button.CONFIRM' ),
                        'message': i18n( 'FormEditorMojit.wyswyg.CLEAR_MARKED' ).replace( '{number}', numHighlights ),
                        'callback': onConfirmClear
                    } );

                    function onConfirmClear( result ) {
                        if ( !result.success ) { return; }
                        $( elem ).find( '.dcWyswygHighlight' ).css( 'background-color', 'rgba(255,255,255,0)' );
                        $( elem ).find( '.dcWyswygHighlight' ).removeClass( 'dcWyswygHighlight' );
                        self.htmlContent( elem.innerHTML );
                    }

                },

                //  blockquote

                onIndentClick: function() {
                    var self = this;
                    if ( self.isInBlockElement() ) { return; }
                    document.execCommand( 'indent' );
                },

                onOutdentClick: function() {
                    var
                        self = this,
                        nested = self.isInBlockElement();

                    if ( !nested ) { return; }

                    switch( nested.tagName.toLowerCase() ) {
                        case 'blockquote':
                            $( nested ).replaceWith( nested.innerHTML );
                            return;

                        case 'li':
                        case 'ol':
                            $( nested ).find( 'li' ).replaceWith( function() { return $(this).html() + '<br/>'; } );
                            $( nested ).replaceWith( function() { return $(this).contents(); } );
                            return;
                    }

                    document.execCommand( 'outdent' );

                },

                //  lists

                onULClick: function() {
                    var
                        self = this,
                        nested = self.isInBlockElement();

                    if ( !nested ) {
                        //  simple injection of unordered list
                        document.execCommand( 'insertUnorderedList' );
                        return;
                    }

                    switch (nested.tagName.toLowerCase() ) {
                        case 'ol':
                            $( nested ).replaceWith( function() { return '<ul>' + $( this ).html() + '</ul>'; } );
                            return;

                        case 'blockquote':
                            $( nested ).replaceWith( function() { return '<span>' + $( this ).html() + '<span>'; } );
                            document.execCommand( 'insertUnorderedList' );
                            return;

                    }
                },
                onOLClick: function() {
                    var
                        self = this,
                        nested = self.isInBlockElement();

                    if ( !nested ) {
                        //  simple injection of unordered list
                        document.execCommand( 'insertOrderedList' );
                        return;
                    }

                    switch (nested.tagName.toLowerCase() ) {
                        case 'ul':
                            $( nested ).replaceWith( function() { return '<ol>' + $( this ).html() + '</ol>'; } );
                            return;

                        case 'blockquote':
                            $( nested ).replaceWith( function() { return '<span>' + $( this ).html() + '<span>'; } );
                            document.execCommand( 'insertOrderedList' );
                            return;

                    }
                },

                //  headings

                onH1Click: function() {
                    document.execCommand( 'formatBlock', false, '<h1>' );
                },

                onH2Click: function() {
                    document.execCommand( 'formatBlock', false, '<h2>' );
                },

                onH3Click: function() {
                    document.execCommand( 'formatBlock', false, '<h3>' );
                },

                onH4Click: function() {
                    document.execCommand( 'formatBlock', false, '<h4>' );
                },

                onH5Click: function() {
                    document.execCommand( 'formatBlock', false, '<h5>' );
                },

                onH6Click: function() {
                    document.execCommand( 'formatBlock', false, '<h6>' );
                },

                onClearClick: function() {
                    document.execCommand( 'formatBlock', false, '<p>' );
                },

                // choose color for highlight
                onChooseColorClick: function( model, evt ) {
                    var self = this,
                        selectedColor;

                    selectedColor = evt.currentTarget && evt.currentTarget.style && evt.currentTarget.style.backgroundColor;
                    if( selectedColor ) {
                        // save selected highlight color in localStorage
                        Y.doccirrus.utils.localValueSet( 'selectedHighlightColor', selectedColor );
                        // set selected color in color preview
                        self.selectedHighlightColor( selectedColor );
                        self.onHighlightClick();
                    }
                    // hide color picker popup
                    self.toggleColorPicker();
                },

                toggleColorPicker: function() {
                    var self = this;
                    self.isColorPickerVisible( !self.isColorPickerVisible() );
                },

                onNoColorClick: function() {
                    var self = this;

                    // reset highlight color value in localStorage
                    Y.doccirrus.utils.localValueSet( 'selectedHighlightColor', '' );
                    self.selectedHighlightColor( WHITE_COLOR );
                    self.toggleColorPicker();
                },

                // clear all formatting
                onClearFormatClick: function() {
                    var i,
                        selection = window.getSelection(),
                        range = selection && selection.getRangeAt( 0 ),
                        nodes = getNodesInRange( range );

                    if( !nodes.length ) {
                        return;
                    }

                    if( nodes[0] && 'divFloatEditorMDFloatEditor' !== nodes[0].id && !(nodes[0].classList && nodes[0].classList.contains( 'markdown-editor' )) ) {
                        // editor div should be always first in list of nodes
                        return;
                    }

                    document.execCommand( 'removeFormat', false, "" );

                    for( i = 0; i < nodes.length; i++ ) {
                        replaceNodeWithItContent( nodes[i] );
                    }
                }
            },
            {
                NAME: 'WYSWYGViewModel'
            }
        );

        KoViewModel.registerConstructor( WYSWYGViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dcforms-html-markdown',
            'dcforms-markdown-html'
        ]
    }
);
