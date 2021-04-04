/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing lists of things
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-dateeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms date types.', 'debug', NAME);

        /**
         *  Subdialog of the element properties, for changing default date values and formats
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Rendering context (edit/fill/renderpdf/etc)
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.dateEditor = function(domId, initialValue, onChange) {
            var
                jq = { 'me': $('#' + domId) },                  //  cached jQuery selectors
                txtValue = Y.dcforms.stripHtml(initialValue),   //  current value
                txtDateFormat = '',                             //  number of boxes in textmatrix elements
                callWhenChanged = onChange;                     //  general purpose 'onchange' event

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {

                jq.me.html(' ' +
                    '<textarea ' +
                        'style="width: 95%;" ' +
                        'rows="1" ' +
                        'class="form-control" ' +
                        'id="taTxt' + domId + '">' +
                    '</textarea>' +
                    '<div id="divDateFormat">' +
                    '<br/>' +
                    'Datumsformat: ' +
                    '<input ' +
                        'id="txtDateFormat' + domId + '" ' +
                        'type="text" ' +
                        'style="width: 95%;" ' +
                        'class="form-control" ' +
                        'value="' + txtDateFormat + '"' +
                    '"/>' +
                    '</div>'
                );

                jq.ta = $('#taTxt' + domId);

                jq.ta.off('keyup.element').on('keyup.element', function() {
                    txtValue = jq.ta.val();
                    callWhenChanged(txtValue, txtDateFormat);
                });

                jq.divNumTxtCols = $('#divNumTxtCols');

                jq.txt = $('#txtDateFormat' + domId);

                jq.txt.off('keyup.element').on('keyup.element', function() {
                    txtDateFormat = jq.txt.val();
                    callWhenChanged(txtValue, txtDateFormat);
                });


                var safeValue = txtValue || '';

                //  possible escaping here TODO: review best point for this
                //txtValue.replace('');

                jq.ta.val(safeValue);
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue( newValue ) {
                txtValue = newValue;
                jq.ta.val( newValue );
            }

            function setFormat(newFormat) {
                if (!newFormat || '' === newFormat) {
                    newFormat = 'DD.MM.YYYY';
                }
                txtDateFormat = newFormat;
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return txtValue;
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @param  newHandler  {Function}  of the form fn(txtSerializedList)
             */

            function setOnChanged(newHandler) {
                callWhenChanged = newHandler;
            }

            //  EVENT HANDLERS

            return {
                'render': render,
                'getValue': getValue,
                'setValue': setValue,
                'setFormat': setFormat,
                'setOnChanged': setOnChanged
            };
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);