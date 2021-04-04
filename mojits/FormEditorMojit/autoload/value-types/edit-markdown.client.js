/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover text editor used in forms (DOM textarea hovers over canvas)
 */

/*jslint latedef:false */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-markdown',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createMarkdownValueEditor = function(selectedOn, elem, callWhenChanged) {
            var
                //stageDomId = elem.page.getDomId(),
                stageDomId = 'divFloatEditor',
                fontFraction = ( 3 / 4 ),
                MAX_FAST_LENGTH = 40,
                self = {
                    //  public methods
                    'inRender': false,
                    'jqEditor': $('#' + stageDomId),
                    'jqFloat': null,
                    'jqTxt': null,
                    'bounds': null,
                    'setValue': setValue,
                    'reposition': reposition,
                    'inject': inject,
                    'destroy': destroy,
                    'getMarkdown': getMarkdown,
                    'ignoreUpdates': false
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                if (!elem) { return; }

                var
                    isTableCell = ( 'table' === elem.elemType ),
                    zoom = elem.page.form.zoom,
                    toFont = (elem.mm.lineHeight * zoom * fontFraction) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    bounds = isTableCell ? getTableBounds() : Y.dcforms.handle.getBounds(elem, selectedOn),

                    markdown = isTableCell ? elem.renderer.getCellValue( elem.currentRow, elem.currentCol ) : elem.getValue(),

                    html = '<div id="' + stageDomId + 'divFloatEditor" ' +
                        'style="position: absolute; left: ' + bounds.left + ';top: ' + bounds.top + '; overflow: hidden;"' +
                        '>' +
                        '<div ' +
                        'id="' + stageDomId + 'MDFloatEditor" ' +
                        'style="width: ' + bounds.width + 'px; height: ' + bounds.height + 'px; overflow: hidden; padding: 0 3px;" ' +
                        'contenteditable="true"' +
                        '>' +
                        Y.dcforms.markdownToHtml( markdown ) +
                        '</div>' +
                        '</div>';

                self.bounds = bounds;

                self.jqEditor.html(html);

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqContentEditable = $('#' + stageDomId + 'MDFloatEditor');

                self.jqFloat.css('position', 'absolute');
                self.jqFloat.css('z-index', 2001);

                //  extended to also update color and font
                reposition();
                if( elem.page.form.isFromToolbox ) {
                    // remove scroll subscription from window and add add it on form div
                    $( window ).off( 'scroll.textvalueeditor' );
                    $( '#divFormFillToolBox' ).off( 'scroll.textvalueeditor' ).on( 'scroll.textvalueeditor', reposition );
                } else {
                    $( window ).off( 'scroll.textvalueeditor' ).on( 'scroll.textvalueeditor', reposition );
                }

                self.jqContentEditable.css('font', toFont);
                self.jqContentEditable.css('text-align', elem.align);
                self.jqContentEditable.css('resize', 'none');
                self.jqContentEditable.css('border', '1px solid ' + elem.borderColor);

                //  leading is slightly different in forms and html
                self.jqContentEditable.css('line-height', '135%');

                self.jqContentEditable.off('keyup').on('keyup', onTaKeyUp);
                self.jqContentEditable.off('keydown').on('keydown', onTaKeyDown);
                self.jqContentEditable.off('input').on('input', onTaKeyUp);     //  experimental
                self.jqContentEditable.off('blur').on('blur', onBlur);

                //  clean up paste events
                Y.dcforms.setHtmlPaste( self.jqContentEditable[0] );

                self.jqContentEditable.off( 'focus' ).on( 'focus', ensureElemSelected );

                if ( 'edit' !== elem.page.form.mode ) {
                    //  this can race with rendering and repositioning the markdown
                    //  causing the focus to happen too soon, jumping to the top page in the editor, MOJ-14131
                    self.jqContentEditable.focus();
                }
            }

            /**
             *  Inject text at cursor position in textarea (used to add dropped schema members)
             *
             *  credit: http://stackoverflow.com/questions/11076975/insert-text-into-textarea-at-cursor-position-javascript
             *  credit: https://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
             *
             *  @param txt
             */

            function inject( txt ) {
                if ( !self.jqContentEditable.is(":focus") ) {

                    self.jqContentEditable.focus();

                    //  place cursor at end of existing HTML
                    document.execCommand('selectAll', false, null);
                    document.getSelection().collapseToEnd();
                }

                txt = Y.dcforms.markdownToHtml( txt );
                document.execCommand( 'insertHTML', false, txt );

                //  update element and FEM UI
                callWhenChanged( self.getMarkdown() );
            }

            function destroy() {
                $(window).off('scroll.textvalueeditor');
                self.jqEditor.html('');
            }

            function onTaKeyUp( evt ) {

                if (
                    ( self.jqContentEditable.html().length > MAX_FAST_LENGTH ) &&
                    ( 'edit' !== elem.page.form.mode ) &&
                    ( 10 !== evt.keyCode ) &&
                    ( 13 !== evt.keyCode )
                ) {
                    return;
                }

                var bgHeight;

                if ( self.jqContentEditable.height() < self.jqContentEditable[0].scrollHeight ) {
                    //  set the editor height to be the same as the html content
                    self.jqContentEditable.css( 'height', self.jqContentEditable[0].scrollHeight + 'px' );
                    self.jqFloat.css('height', self.jqContentEditable[0].scrollHeight + 'px');
                    // re-render the page in the background to bump other elements down in flow
                    //callWhenChanged( self.getMarkdown() );
                }
                // remove updating of markdown on each keyUp because of lag with long text (MOJ-13753)
                //callWhenChanged( self.getMarkdown() );

                if ( !elem.bgSubElem ) { return; }

                //  leading may be different between content-editable HTML and form
                bgHeight = elem.bgSubElem.height * elem.page.form.zoom;

                if ( bgHeight > self.jqContentEditable.height() ) {
                    self.jqContentEditable.css( 'height', bgHeight + 'px' );
                    self.jqFloat.css('height', bgHeight + 'px');
                }
            }

            function ensureElemSelected() {
                if ( !elem.page.form.selectedElement || elem !== elem.page.form.selectedElement ) {
                    elem.page.form.setSelected( 'fixed', elem );
                }
            }

            /**
             *  Listen for control keys (tab, shift, etc)
             *
             *  credit: http://stackoverflow.com/questions/3362/capturing-tab-key-in-text-box
             */

            function onTaKeyDown( evt ) {
                if( 9 === evt.keyCode ) {
                    callWhenChanged( self.getMarkdown() );
                    elem.page.form.tabNext( selectedOn, elem.elemId );
                    if( evt.preventDefault ) {
                        evt.preventDefault();
                    }
                    return false;
                } else if( evt.keyCode === 13 && evt.ctrlKey ) {
                    if( elem.table ) {
                        elem.renderer.addNewDataRow( elem.currentRow );
                    }
                    if( evt.preventDefault ) {
                        evt.preventDefault();
                    }
                }
            }

            function onBlur( evt ) {
                if ( !evt.relatedTarget) {

                    //  hack for broken event in Safari, wait a tenth second for the focus to correct
                    //  and patch event with relatedTarget
                    setTimeout( function() {

                        if ( document.activeElement && !Y.dcforms.docTreeElement ) {
                            evt.relatedTarget = document.activeElement;
                        }

                        if ( Y.dcforms.docTreeElement ) {
                            evt.relatedTarget = Y.dcforms.docTreeElement;
                            Y.dcforms.docTreeElement = null;
                        }

                        onBlur( evt );
                    }, 100 );

                    return;
                }

                if ( evt.relatedTarget && $( evt.relatedTarget ).hasClass( 'text-tree-element' ) ) {
                    if ( $( evt.relatedTarget ).hasClass( 'isDocumentationNode' ) ) {
                        insertTextComponent( evt.relatedTarget );
                        return;
                    } else {
                        //  if not documentation node then the user is navigating the tree of textbausteine
                        //  do not destroy the editor, re-focus it immediately
                        setTimeout( function() { self.jqContentEditable[0].focus(); }, 0);
                        return false;
                    }
                }

                if( evt.relatedTarget && $( evt.relatedTarget ).hasClass( 'clear_format' ) ) {
                    //  do not destroy the editor, re-focus it immediately
                    setTimeout( function() {
                        self.jqContentEditable[0].focus();
                    }, 0 );
                    return false;
                }

                if( evt.relatedTarget &&
                    ($( evt.relatedTarget ).hasClass( 'btn-highlight' ) ||
                     $( evt.relatedTarget ).hasClass( 'color-selector' ) ||
                     $( evt.relatedTarget ).hasClass( 'btn-choose-color' )) ) {
                    //  do not destroy the editor, re-focus it immediately
                    setTimeout( function() {
                        self.jqContentEditable[0].focus();
                    }, 0 );
                    return false;
                }
                //  lost focus, should cause this editor to be destroyed
                callWhenChanged( self.getMarkdown() );
            }

            function insertTextComponent( targetElem ) {

                var
                    insertText = targetElem.textContent || '';

                insertText = Y.dcforms.markdownToHtml( insertText );

                document.execCommand( 'insertHTML', false, insertText );
                callWhenChanged( self.getMarkdown() );
            }

            /**
             *  Canvas position and style to move to match any changes to element
             */

            function reposition( count ) {
                if ( !elem ) { return destroy(); }

                var
                    MAX_RETRY_REPOSITION = 12,
                    zoom = elem.page.form.zoom,
                    toFont = (elem.mm.lineHeight * fontFraction * zoom) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    isTableCell = ( 'table' === elem.elemType ),
                    bounds = isTableCell ? getTableBounds() : Y.dcforms.handle.getBounds(elem, selectedOn);

                count = count || 0;

                if ( count > MAX_RETRY_REPOSITION ) {
                    Y.log( 'Destroying orphaned value editor', 'info', NAME );
                    destroy();
                    return;
                }

                if ( !bounds.allOk && elem === elem.page.form.selectedElement ) {
                    //  render in progress or canvas not visible
                    Y.log('Could not get element bounds, waiting for canvas to be available', 'debug', NAME);
                    count = count + 1;
                    window.setTimeout( function() { reposition( count ); }, 300 );
                    return;
                }

                if ( self.jqContentEditable.height() < self.jqContentEditable[0].scrollHeight ) {
                    bounds.height = self.jqContentEditable[0].scrollHeight;
                }

                self.jqFloat.css('left', bounds.left + 'px');
                self.jqFloat.css('top', bounds.top + 'px');
                self.jqFloat.css('width', bounds.width + 'px');
                self.jqFloat.css('height', bounds.height + 'px');
                self.jqFloat.css('background-color', '#ffffff');

                self.jqContentEditable.css('width', bounds.width + 'px');
                self.jqContentEditable.css('height', bounds.height + 'px');
                self.jqContentEditable.css('border', '1px solid ' + elem.borderColor);
                //self.jqContentEditable.css('background-color', elem.bgColor);
                self.jqContentEditable.css('color', elem.fgColor);
                self.jqContentEditable.css('font', toFont);
                self.jqContentEditable.css('text-align', elem.align);
                self.jqContentEditable.css('resize', 'none');
                self.jqContentEditable.css('border', '1px solid ' + elem.borderColor);
                self.jqContentEditable.css('line-height', '135%');
            }

            function getMarkdown() {
                var
                    asHtml = self.jqContentEditable.html(),
                    asMarkdown = Y.dcforms.htmlToMarkdown( asHtml );

                return asMarkdown;
            }

            /**
             *  Get an outline for the editor on the page matching the bounding box of an editable table cell
             *  @returns {*}
             */

            function getTableBounds() {
                var
                    navAdjust = Y.dcforms.handle.navAdjust(),
                    scaleBy = elem.page.form.zoom,
                    subElemBounds,
                    subElem = getTableCellSubElement(),
                    savePos = ( subElem && subElem.saved && subElem.saved.fixed ) ? subElem.saved.fixed : null,
                    cnv = ( savePos && savePos.canvasId ) ?  $('#' + savePos.canvasId) : null ,
                    cnvOffset = cnv ? cnv.offset() : null;

                if ( !subElem || !savePos || !cnvOffset ) {
                    return { 'left': -1, 'top': -1, 'width': 0, 'height': 0 };
                }

                subElemBounds = {
                    'left': cnvOffset.left + ( subElem.fixedLeft * scaleBy ),
                    'top': cnvOffset.top + ( subElem.fixedTop * scaleBy ) - navAdjust,
                    'width': ( savePos.mmWidth * scaleBy ),
                    'height': ( savePos.mmHeight * scaleBy )
                };

                subElemBounds.left = parseInt(subElemBounds.left, 10);
                subElemBounds.top = parseInt(subElemBounds.top, 10);
                subElemBounds.width = parseInt(subElemBounds.width, 10);
                subElemBounds.height = parseInt(subElemBounds.height, 10);
                subElemBounds.allOk = true;

                return subElemBounds;
            }
            /**
             *  Find the interaction subelement associated with the selected table cell
             */

            function getTableCellSubElement() {
                var i, subElem;

                if ( elem.selectedSubElem ) {
                    return elem.selectedSubElem;
                }

                for ( i = 0; i < elem.subElements.length; i++ ) {
                    subElem = elem.subElements[i];
                    if (
                        subElem.interactive &&
                        subElem.tableRow === elem.currentRow &&
                        subElem.tableCol === elem.currentCol
                    ) {
                        return subElem;
                    }
                }
                return null;
            }

            /**
             *  Set text value in editor
             *  @/param newValue
             */

            function setValue( /*newValue*/ ) {
                if ( self.ignoreUpdates ) { return; }
                render();
            }

            render();

            return self;
        };

        /**
         *  Set up listener to intercept paste events
         *
         *  @param  {Object}    elem    A contentEditable div
         */

        Y.dcforms.setHtmlPaste = function ( elem ) {
            $( elem ).off( 'paste' ).on( 'paste', handlePaste );

            function handlePaste( evt ) {
                var
                    //  IE/edge does not implement clipboardEvent, credit maerics in this stack overlow thread:
                    //  https://stackoverflow.com/questions/6035071/intercept-paste-event-in-javascript
                    hasClipEvent = evt.originalEvent && evt.originalEvent.clipboardData && evt.originalEvent.clipboardData.getData,
                    hasIEClipboard =  window.clipboardData && window.clipboardData.getData,
                    html = '';

                if ( hasIEClipboard ) {
                    html = window.clipboardData.getData('Text');
                }

                if ( hasClipEvent ) {
                    html = evt.originalEvent.clipboardData.getData( 'text/html' );
                }

                if ( !html ) {
                    //  no text to paste
                    return false;
                }

                //  convert through markdown to clean the pasted content of rich text features we don't support
                html = Y.dcforms.htmlToMarkdown( html );
                html = Y.dcforms.markdownToHtml( html );

                //  put the cleaned html back into the target element
                document.execCommand( 'insertHTML', false, html );

                // Prevent the default handler from running
                return false;
            }
        };


    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
