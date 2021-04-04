/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover value editor for radio elements
 *  This uses an invisible
 */

/*jslint latedef:false */
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-radio',

    /* Module code */
    function( Y ) {

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createRadioValueEditor = function(selectedOn, elem, callWhenChanged) {
            var
            //stageDomId = elem.page.getDomId(),
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
                //  zoom = elem.page.form.zoom,
                //  toFont = (elem.mm.lineHeight * zoom * fontFraction) + 'px ' + (elem.font || Y.dcforms.defaultFont),
                    bounds = getBounds(),
                    html = '' +
                        '<div id="' + stageDomId + 'divFloatEditor" ' +
                        'style="position: absolute; left: ' + bounds.left + ';top: ' + bounds.top + ';"' +
                        '>' +
                        '<textarea ' +
                        'id="' + stageDomId + 'taFloatEditor" ' +
                        'style="width: ' + bounds.width + 'px; height: 0px; overflow: hidden;"' +
                        '>' +
                        '</textarea>' +
                        '</div>';

                self.bounds = bounds;

                self.jqEditor.html(html);

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqTxt = $('#' + stageDomId + 'taFloatEditor');

                self.jqFloat.css('position', 'absolute');

                //  extended to also update color and font
                //reposition();

                self.jqTxt.css('resize', 'none');
                self.jqTxt.css('border', 'none');
                self.jqTxt.css('outline', 'none');

                self.jqTxt.off('keyup').on('keyup', onTaKeyUp);
                self.jqTxt.off('keydown').on('keydown', onTaKeyDown);
                self.jqTxt.off('blur').on('blur', onBlur);

                self.jqTxt.focus();
            }

            /**
             *  Get an outline for the editor on the page matching the bounding box on canvas
             *  @returns {*}
             */

            function getBounds() {

                //  with page header and footer element bounds become more complex
                if ('fixed' === selectedOn) {
                    return getBoundsFixed();
                }

                var
                    bounds = elem.mm.toScale(elem.page.form.zoom),
                    subElem,
                    save,
                    cnv,
                    cnvOffset,
                    curr = {},
                    minX, minY, maxX, maxY,
                    i;

                bounds.bottom = -1;

                //  find absolute dimensions of subelement relative to document
                for (i = 0; i < elem.subElements.length; i++) {
                    subElem = elem.subElements[i];
                    if (subElem.saved.hasOwnProperty(selectedOn)) {
                        save = subElem.saved[selectedOn];
                        cnv = $('#' + save.canvasId);
                        cnvOffset = cnv.offset();

                        curr = {
                            'left': cnvOffset.left + save.left + save.elemLeft,
                            'top': cnvOffset.top + save.top + save.elemTop,
                            'width': save.width,
                            'height': save.height
                        };

                        //  first subelement
                        if (0 === i) {
                            minX = curr.left;
                            minY = curr.top;
                            maxX = curr.left + curr.width;
                            maxY = curr.top + curr.height;
                        }

                        if (curr.left < minX) {
                            minX = curr.left;
                        }

                        if (curr.top < minY) {
                            minY = curr.left;
                        }

                        if ((curr.left + curr.width) > maxX) {
                            maxX = (curr.left + curr.width);
                        }

                        if ((curr.top + curr.height) > maxY) {
                            maxY = (curr.top + curr.height);
                        }

                    }
                }


                bounds.left = parseInt(minX, 10);
                bounds.top = parseInt(minY, 10);
                bounds.width = parseInt(maxX - minX, 10);

                //  splits across a page
                if ((maxY - minY) > bounds.height) {
                    bounds.height = parseInt(maxY - minY, 10);
                }

                return bounds;
            }

            /**
             *  Bounds for a text editor on fixed canvasses ay span more than one canvas
             */

            function getBoundsFixed() {
                var
                    bounds = null,
                    subElemBox,
                    subElem,
                    save,
                    cnvPos,
                    i;


                for (i = 0; i < elem.subElements.length; i++) {
                    subElem = elem.subElements[i];
                    if (subElem.saved.hasOwnProperty(selectedOn)) {

                        save = subElem.saved[selectedOn];
                        cnvPos = $('#' + save.canvasId).offset();

                        subElemBox = {
                            'left': save.elemLeft + save.left + cnvPos.left,
                            'top': save.elemTop + save.top + cnvPos.top,
                            'width': save.width,
                            'height': save.height
                        };

                        if (!bounds) {
                            bounds = subElemBox;
                        }

                        bounds = Y.dcforms.mergeBoxes(bounds, subElemBox);
                    }
                }

                return bounds;
            }

            /**
             *  Inject text at cursor position in textarea (used to add dropped schema members)
             *
             *  credit: http://stackoverflow.com/questions/11076975/insert-text-into-textarea-at-cursor-position-javascript
             *
             *  @param txt
             */

            function inject(txt) {
                var sel;

                if (document.selection) {
                    //  IE
                    self.jqTxt[0].focus();
                    sel = document.selection.createRange();
                    sel.text = txt;

                } else if (self.jqTxt[0].selectionStart || self.jqTxt[0].selectionStart === '0') {
                    //  MOZILLA and others
                    var
                        startPos = self.jqTxt[0].selectionStart,
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
                self.jqEditor.html('');
            }

            function onTaKeyUp(evt) {
                //console.log('keyup ' + evt.keyCode);

                if(evt.preventDefault) {
                    evt.preventDefault();
                }

                switch (evt.keyCode) {
                    case 32:
                    case 13:
                    case 10:
                        elem.renderer.incrementValue();
                        elem.isDirty = true;
                        elem.page.redrawDirty();
                        break;

                    case 9:
                        self.jqTxt.focus();
                        break;

                }


            }


            /**
             *  Listen for control keys (tab, shift, etc)
             *
             *  credit: http://stackoverflow.com/questions/3362/capturing-tab-key-in-text-box
             */

            function onTaKeyDown(evt) {
                if (9 === evt.keyCode) {
                    elem.page.form.tabNext(selectedOn, elem.elemId);
                    if(evt.preventDefault) {
                        evt.preventDefault();
                    }
                    return false;
                }
            }

            function onBlur() {
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

            function setValue(newValue) {
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