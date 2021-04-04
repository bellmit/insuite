/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover text editor used in forms (DOM textarea hovers over canvas)
 */

/*jslint latedef:false */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-text',

    /* Module code */
    function( Y, NAME ) {

        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createTextValueEditor = function(selectedOn, elem, callWhenChanged) {
            var
                //stageDomId = elem.page.getDomId(),
                stageDomId = 'divFloatEditor',
                fontFraction = (3/4),
                MAX_FAST_LENGTH = 20,
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
                    'ignoreUpdates': false
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                if (!elem) { return; }

                var
                    zoom = elem.page.form.zoom,
                    toFont = (elem.mm.lineHeight * zoom * fontFraction) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    bounds = Y.dcforms.handle.getBounds(elem, selectedOn),
                    html = '' +
                        '<div id="' + stageDomId + 'divFloatEditor" ' +
                        'style="position: absolute; left: ' + bounds.left + ';top: ' + bounds.top + ';"' +
                        '>' +
                        '<textarea ' +
                        'id="' + stageDomId + 'taFloatEditor" ' +
                        'style="width: ' + bounds.width + 'px; height: ' + bounds.height + 'px; overflow: hidden;"' +
                        '>' +
                        elem.getValue() +
                        '</textarea>' +
                        '</div>';

                self.bounds = bounds;

                self.jqEditor.html(html);

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqTxt = $('#' + stageDomId + 'taFloatEditor');

                //  property to hold max length of text, MOJ-4690
                if (elem.maxLen && '' !== elem.maxLen && 0 !== elem.maxLen) {
                    self.jqTxt.attr('maxlength', elem.maxLen);
                } else {
                    //  this is the default max length for all form text elements
                    self.jqTxt.attr('maxlength', 524288);
                }

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

                self.jqTxt.css('font', toFont);
            //  self.jqTxt.css('line-height', (elem.mm.lineHeight * fontCorrection * zoom) + 'px');
                self.jqTxt.css('text-align', elem.align);
                self.jqTxt.css('resize', 'none');
                self.jqTxt.css('border', '1px solid ' + elem.borderColor);

                self.jqTxt.off('keyup').on('keyup', onTaKeyUp);
                self.jqTxt.off('keydown').on('keydown', onTaKeyDown);
                self.jqTxt.off('blur').on('blur', onBlur);

                self.jqTxt.off( 'focus' ).on( 'focus', ensureElemSelected );

                self.jqTxt.focus();
            }

            /**
             *  Inject text at cursor position in textarea (used to add dropped schema members)
             *
             *  credit: http://stackoverflow.com/questions/11076975/insert-text-into-textarea-at-cursor-position-javascript
             *
             *  @param txt
             */

            function inject(txt) {
                var sel, startPos, endPos;

                if (document.selection) {
                    //  IE
                    self.jqTxt[0].focus();
                    sel = document.selection.createRange();
                    sel.text = txt;

                } else if (self.jqTxt[0].selectionStart || self.jqTxt[0].selectionStart === '0') {
                    //  MOZILLA and others
                    startPos = self.jqTxt[0].selectionStart;
                    endPos = self.jqTxt[0].selectionEnd;

                    self.jqTxt.val('' +
                        self.jqTxt.val().substring(0, startPos) +
                        txt +
                        self.jqTxt.val().substring(endPos, self.jqTxt[0].value.length)
                    );

                } else {
                    self.jqTxt.val(self.jqTxt.val() + txt);
                }
                //  update element and FEM UI
                callWhenChanged(self.jqTxt.val());
            }

            function destroy() {
                $(window).off('scroll.textvalueeditor');
                self.jqEditor.html('');
            }

            function onTaKeyUp() {
                if (
                    ( self.jqTxt.val().length > MAX_FAST_LENGTH ) &&
                    ( 'edit' !== elem.page.form.mode )
                ) {
                    return;
                }
                callWhenChanged(self.jqTxt.val());
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

            function onTaKeyDown(evt) {
                if (9 === evt.keyCode) {
                    callWhenChanged(self.jqTxt.val());
                    elem.page.form.tabNext(selectedOn, elem.elemId);
                    if(evt.preventDefault) {
                        evt.preventDefault();
                    }
                    return false;
                }
            }

            function onBlur( evt ) {

                //  special case for Firefox and Safari on Mac, MOJ-7746
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
                        setTimeout(function() {
                            //  if not documentation node then the user is navigating the tree of textbausteine
                            //  do not destroy the editor
                            self.jqTxt.focus();
                        }, 0);
                        return false;
                    }
                }

                //  lost focus, should cause this editor to be destroyed
                if ('edit' !== elem.page.form.mode) {
                    callWhenChanged( self.jqTxt.val() );
                    elem.page.form.setSelected(selectedOn, null);
                }
            }

            function insertTextComponent( targetElem ) {
                var
                    plainElem = self.jqTxt[0],
                    plainText = self.jqTxt.val(),
                    insertText = targetElem.textContent || '',
                    txtStart = 0,
                    txtEnd = 0;

                if ( !isNaN( plainElem.selectionStart ) && !isNaN( plainElem.selectionEnd ) ) {
                    txtStart = plainElem.selectionStart;
                    txtEnd = plainElem.selectionEnd;

                    //  do not add text if this is not a documentation node in the Textbausteine stree
                    if ( !$(targetElem).hasClass( 'isDocumentationNode' ) ) {
                        Y.log( 'Not a documentation node, maintaining focus on text area.', 'debug', NAME );
                        window.setTimeout( reFocusOnTxt, 100 );
                        return;
                    }

                    if ( txtStart !== txtEnd ) {
                        //  insert over a selection
                        plainText = plainText.substr( 0, txtStart ) + insertText + plainText.substr( txtEnd );
                        txtEnd = txtStart + insertText.length;
                    } else {
                        //  insert at cursor
                        plainText = plainText.substr( 0, txtStart ) + insertText + plainText.substr( txtStart );
                        txtEnd = txtStart + insertText.length;
                        txtStart = txtEnd;
                    }

                    self.jqTxt.val( plainText );
                } else {
                    plainText = plainText + ' ' + insertText;
                    self.jqTxt.val( plainText );
                }

                callWhenChanged( self.jqTxt.val() );

                //  Hack for Firefox focus events on Mac, see:
                //  http://stackoverflow.com/questions/7046798/jquery-focus-fails-on-firefox
                window.setTimeout( reFocusOnTxt, 100 );

                function reFocusOnTxt() {
                    self.jqTxt.focus();
                    self.jqTxt[0].selectionStart = txtStart;
                    self.jqTxt[0].selectionEnd = txtEnd;
                }
            }

            /**
             *  Canvas position and style to move to match any changes to element
             */

            function reposition() {
                if ( !elem ) { return destroy(); }

                var
                    zoom = elem.page.form.zoom,
                    toFont = (elem.mm.lineHeight * fontFraction * zoom) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    bounds = Y.dcforms.handle.getBounds(elem, selectedOn);

                if ( !bounds.allOk && elem === elem.page.form.selectedElement ) {
                    //  render in progress or canvas not visible
                    Y.log('Could not get element bounds, waiting for canvas to be available', 'debug', NAME);
                    window.setTimeout( function() { reposition(); }, 300 );
                    return;
                }

                self.jqFloat.css('left', bounds.left + 'px');
                self.jqFloat.css('top', bounds.top + 'px');
                self.jqFloat.css('width', bounds.width + 'px');
                self.jqFloat.css('height', bounds.height + 'px');

                if ('barcode' === elem.elemType) {
                    self.jqFloat.css('background-color', 'rgba(255, 255, 255, 0.5)');
                } else {
                    self.jqFloat.css('background-color', '#ffffff');
                }

                self.jqTxt.css('width', bounds.width + 'px');
                self.jqTxt.css('height', bounds.height + 'px');
                self.jqTxt.css('border', '1px solid ' + elem.borderColor);
                self.jqTxt.css('background-color', elem.bgColor);
                self.jqTxt.css('color', elem.fgColor);
                self.jqTxt.css('font', toFont);
                self.jqTxt.css('text-align', elem.align);
                self.jqTxt.css('resize', 'none');
                self.jqTxt.css('border', '1px solid ' + elem.borderColor);
            //    self.jqTxt.css('line-height', (elem.mm.lineHeight * zoom) + 'px');
            }

            /**
             *  Set text value in editor
             *  @param newValue
             */

            function setValue(newValue) {
                if ( self.ignoreUpdates ) { return; }
                self.jqTxt.val(newValue);
            }

            render();

            return self;
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);