/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover for elements which capture keypresses but do not accept text (checkbox, radio, image. etc)
 */

/*jslint latedef:false */
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-nontext',

    /* Module code */
    function( Y /* , NAME */ ) {

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createNonTextValueEditor = function(selectedOn, elem /*, callWhenChanged */) {

            var
            //stageDomId = elem.page.getDomId(),
                stageDomId = 'divFloatEditor',
                self = {
                    //  public methods
                    'inRender': false,
                    'jqEditor': $('#' + stageDomId),
                    'jqFloat': null,
                    'jqTxt': null,
                    'bounds': null,
                    'setValue': setValue,
                    'reposition': reposition,
                    'destroy': destroy
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                var
                    bounds = getBounds(),

                    html = '' +
                        '<div ' +
                        'id="' + stageDomId + 'divFloatEditor" ' +
                        'style="position: absolute; left: ' + bounds.left + ';top: ' + bounds.top + bounds.height + ';"' +
                        '>' +
                        '</div>';

                self.bounds = bounds;

                self.jqEditor.html(html);

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqFloat.css('position', 'absolute');
                self.jqFloat.css('left', bounds.left + 'px').css('top', bounds.top + 'px');
                self.jqFloat.css('width', bounds.width + 'px').css('height', bounds.height + 'px');
                self.jqFloat.css('background-color', 'rgba(255, 255, 255, 0.3)').css('border', '1px solid #ffaaaa');
                self.jqFloat.css('z-index', 2001);

                self.jqFloat.off('keydown').on('keydown', onKeyDown);

                //TODO: keyboard events
            }

            function onKeyDown(evt) {
                Y.log('Keypress:' + evt.keyCode);
                if (elem.renderer && elem.renderer.handleKeyDown) {
                    elem.renderer.handleKeyDown(evt.keyCode);
                }

            }

            function getBounds() {
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

            function destroy() {
                self.jqEditor.html('');
            }

            /**
             *  Canvas position to move to
             *  @param  x
             *  @param  y
             */

            function reposition() {
                if ( !elem ) { return destroy(); }

                var bounds = getBounds();
                self.jqFloat.css('left', bounds.left + 'px').css('top', bounds.top + 'px');
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