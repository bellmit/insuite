/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover table cell editor used in forms (DOM textarea hovers over canvas)
 */

/*jslint latedef:false */
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-table',

    /* Module code */
    function( Y ) {

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createTableValueEditor = function(selectedOn, elem, row, col, callWhenChanged) {
            var
                stageDomId = 'divFloatEditor',
                fontFraction = (3/4),
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
                    'destroy': destroy
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                var
                    zoom = elem.page.form.zoom,
                    toFont = (elem.mm.lineHeight * zoom * fontFraction) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    bounds = getBounds(),
                    html = '' +
                        '<div id="' + stageDomId + 'divFloatEditor" ' +
                        'style="position: absolute; left: ' + bounds.left + ';top: ' + bounds.top + ';"' +
                        '>' +
                        '<textarea ' +
                        'id="' + stageDomId + 'taFloatEditor" ' +
                        'style="width: ' + bounds.width + 'px; height: ' + bounds.height + 'px; overflow: hidden;"' +
                        '>' +
                        elem.renderer.getCellValue(row, col) +
                        '</textarea>' +
                        '</div>';

                if (0 === bounds.width) {
                    //self.jqEditor.html('');
                    return;
                }

                self.bounds = bounds;
                self.jqEditor.html( html );

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqTxt = $('#' + stageDomId + 'taFloatEditor');

                self.jqFloat.css('position', 'absolute');
                self.jqFloat.css('z-index', 2001);

                //  extended to also update color and font
                reposition();
                if( elem.page.form.isFromToolbox ) {
                    // remove scroll subscription from window and add add it on form div
                    $( window ).off( 'scroll.tablevalueeditor' );
                    $( '#divFormFillToolBox' ).off( 'scroll.tablevalueeditor' ).on( 'scroll.tablevalueeditor', reposition );
                } else {
                    $( window ).off( 'scroll.tablevalueeditor' ).on( 'scroll.tablevalueeditor', reposition );
                }

                self.jqTxt.css('font', toFont);
            //  self.jqTxt.css('line-height', (elem.mm.lineHeight * fontCorrection * zoom) + 'px');
                self.jqTxt.css('text-align', elem.align);
                self.jqTxt.css('resize', 'none');
                self.jqTxt.css('border', '1px solid ' + elem.borderColor);

                //self.jqTxt.off('keyup').on('keyup', onTaKeyUp);
                self.jqTxt.off('keydown').on('keydown', onTaKeyDown);
                self.jqTxt.off('blur').on('blur', onBlur);

                self.jqTxt.focus();
            }

            /**
             *  Get an outline for the editor on the page matching the bounding box on canvas
             *  @returns {*}
             */

            function getBounds() {
                var
                    navAdjust = Y.dcforms.handle.navAdjust(),
                    scaleBy = elem.page.form.zoom,
                    subElemBounds,
                    subElem = getSubElement(),
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

                return subElemBounds;
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
                callWhenChanged(self.jqTxt.val(), row, col);
            }

            function destroy() {
                $( window ).off( 'scroll.tablevalueeditor' );
                self.jqEditor.html( '' );
            }

            /*
            function onTaKeyUp() {
                callWhenChanged(self.jqTxt.val(), row, col);
            }
            */

            /**
             *  Listen for control keys (tab, shift, etc)
             *
             *  credit: http://stackoverflow.com/questions/3362/capturing-tab-key-in-text-box
             */

            function onTaKeyDown(evt) {
                if (9 === evt.keyCode) {
                    callWhenChanged(self.jqTxt.val(), row, col);
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

                callWhenChanged( self.jqTxt.val(), row, col );

                //  lost focus, should cuase this editor to be destroyed
                if ('edit' !== elem.page.form.mode) {
                    elem.page.form.setSelected(selectedOn, null);
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
                    bounds = getBounds();

                if (0 === bounds.width) {
                    return;
                }

                self.jqFloat.css('left', bounds.left + 'px');
                self.jqFloat.css('top', bounds.top + 'px');
                self.jqFloat.css('width', bounds.width + 'px');
                self.jqFloat.css('height', bounds.height + 'px');

                //  TODO: replace
                self.jqFloat.css('background-color', '#ffffff');

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

                callWhenChanged( self.jqTxt.val(), row, col );

                //  Hack for Firefox focus events on Mac, see:
                //  http://stackoverflow.com/questions/7046798/jquery-focus-fails-on-firefox
                window.setTimeout( reFocusOnTxt, 100 );

                function reFocusOnTxt() {
                    self.jqTxt.focus();
                    self.jqTxt[0].selectionStart = txtStart;
                    self.jqTxt[0].selectionEnd = txtEnd;
                }
            }

            function setValue(newValue) {
                self.jqTxt.val(newValue);
            }

            /**
             *  Find the interaction subelement associated with the selected table cell
             */

            function getSubElement() {
                var i, subElem;
                for ( i = 0; i < elem.subElements.length; i++ ) {
                    subElem = elem.subElements[i];
                    if ( subElem.interactive && subElem.tableRow === row && subElem.tableCol === col ) {
                        return subElem;
                    }
                }
                return null;
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