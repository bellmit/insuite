/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  YUI module to render UI for selecting and configuring report tables
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-reporttableeditor',

    /* Module code */
    function(Y, NAME) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms reporttable types.', 'debug', NAME);

        /**
         *  Subdialog of the element properties, for changing default text values
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Rendering context (edit/fill/renderpdf/etc)
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.reportTableEditor = function(domId, initialValue, onChange) {
            var
                jq = { 'me': $('#' + domId) },                              //  cached jQuery selectors
                callWhenChanged = onChange,                                 //  general purpose 'onchange' event
                txtValue = Y.dcforms.stripHtml(initialValue.preset || ''),  //  current preset
                extraField = initialValue.extra || '',                      //  rendering options

                addSumLine = false,
                addAvgLine = false,
                addMinLine = false,
                addMaxLine = false,
                addLineNum = false,
                stripeLine = false;
            
            function init() {
                addSumLine = hasExtra( 'LINESUM' );
                addAvgLine = hasExtra( 'LINEAVG' );
                addMinLine = hasExtra( 'LINEMIN' );
                addMaxLine = hasExtra( 'LINEMAX' );
                addLineNum = hasExtra( 'LINENUM' );
                stripeLine = hasExtra( 'STRIPES' );
            }

            //  PUBLIC METHODS
            
            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {

                Y.log( 'rendering insight2 select box with default: ' + txtValue, 'debug', NAME );

                var
                    presets = Y.dcforms.getInsight2PresetList(),
                    html = '<option value=""></option>',
                    safeValue = txtValue || '',
                    selected = '',
                    i;

                for ( i = 0; i < presets.length; i++ ) {
                    selected = ( safeValue === presets[i]._id ) ? ' selected="selected"' : '';
                    html = html + '<option value="' + presets[i]._id + '"' + selected + '>' + presets[i].csvFilename + '</option>';
                }

                jq.me.html(' ' +
                    '<select ' +
                        'style="width: 95%" ' +
                        'class="form-control" ' +
                        'id="selPreset' + domId + '">' +
                        html +     
                    '</select><br/>' +
                    '<table nobrder="noborder">' +
                    '<tr>' +
                    '<td>' + getCheckbox( 'LINEMIN', i18n( 'FormEditorMojit.reportTableEditor.LINEMIN' ) ) + '</td>' +
                    '<td>' + getCheckbox( 'LINEMAX', i18n( 'FormEditorMojit.reportTableEditor.LINEMAX' ) ) + '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>' + getCheckbox( 'LINEAVG', i18n( 'FormEditorMojit.reportTableEditor.LINEAVG' ) ) + '</td>' +
                    '<td>' + getCheckbox( 'LINESUM', i18n( 'FormEditorMojit.reportTableEditor.LINESUM' ) ) + '</td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td>' + getCheckbox( 'LINENUM', i18n( 'FormEditorMojit.reportTableEditor.LINENUM' ) ) + '</td>' +
                    '<td>' + getCheckbox( 'STRIPES', i18n( 'FormEditorMojit.reportTableEditor.STRIPES' ) ) + '</td>' +
                    '</tr>' +
                    '</table>'
                );
                
                jq.sel = $('#selPreset' + domId);

                jq.sel.off('keyup.element').on('keyup.element', function() {
                    txtValue = jq.sel.val();
                    Y.log( 'set insight2 report _id: ' + jq.sel.val() );
                    callWhenChanged( txtValue, makeExtra() );
                });

                jq.sel.off('change.element').on('change.element', function() {
                    txtValue = jq.sel.val();
                    Y.log( 'set insight2 report _id: ' + jq.sel.val() );
                    callWhenChanged( txtValue, makeExtra() );
                });

                bindCheckBox( 'LINEMAX' );
                bindCheckBox( 'LINEMIN' );
                bindCheckBox( 'LINEAVG' );
                bindCheckBox( 'LINESUM' );
                bindCheckBox( 'LINENUM' );
                bindCheckBox( 'STRIPES' );
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue(newValue) {
                txtValue = newValue;
                Y.log( 'PARENT set insight2 report _id: ' + jq.sel.val() );
                jq.sel.val(newValue);
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

            function getCheckbox( value, label ) {
                var html = '' +
                    '<div class="checkbox">' +
                        '<input type="checkbox" id="chkReportTable' + value + '"/>' +
                        '<label class="checkbox-inline" for="chkReportTable' + value + '">' +
                            '<span style="margin-left: 15px;">' + label + '</span>' +
                        '</label>' +
                    '</div>';

                return html;
            }

            function bindCheckBox( fieldName ) {
                var jqChk = $( '#chkReportTable' + fieldName );

                switch( fieldName ) {
                    case 'LINEMAX':     jqChk.prop( 'checked', addMaxLine );    break;
                    case 'LINEMIN':     jqChk.prop( 'checked', addMinLine );    break;
                    case 'LINESUM':     jqChk.prop( 'checked', addSumLine );    break;
                    case 'LINEAVG':     jqChk.prop( 'checked', addAvgLine );    break;
                    case 'LINENUM':     jqChk.prop( 'checked', addLineNum );    break;
                    case 'STRIPES':     jqChk.prop( 'checked', stripeLine );    break;
                }

                jqChk
                    .off( 'click.forms' )
                    .on( 'click.forms', makeCheckboxHandler( fieldName, jqChk ) )
                    .off( 'click.forms' )
                    .on( 'click.forms', makeCheckboxHandler( fieldName, jqChk ) );
            }

            function makeCheckboxHandler( fieldName, jqChk ) {
                return function() {
                    var chkVal = jqChk.is(':checked');

                    switch( fieldName ) {
                        case 'LINESUM':    addSumLine = chkVal;         break;
                        case 'LINEAVG':    addAvgLine = chkVal;         break;
                        case 'LINEMIN':    addMinLine = chkVal;         break;
                        case 'LINEMAX':    addMaxLine = chkVal;         break;
                        case 'LINENUM':    addLineNum = chkVal;         break;
                        case 'STRIPES':    stripeLine = chkVal;         break;
                    }
                    
                    callWhenChanged( txtValue, makeExtra() );
                };
            }

            /**
             *  Check whether a report table option is enabled
             *  
             *  @param  fieldName   {String}
             *  @returns            {Boolean}
             */

            function hasExtra( fieldName ) {
                return ( -1 !== extraField.indexOf( fieldName ) );
            }

            function makeExtra( ) {
                var opts = [];

                if ( addSumLine ) { opts.push( 'LINESUM' ); }
                if ( addAvgLine ) { opts.push( 'LINEAVG' ); }
                if ( addMaxLine ) { opts.push( 'LINEMAX' ); }
                if ( addMinLine ) { opts.push( 'LINEMIN' ); }
                if ( addLineNum ) { opts.push( 'LINENUM' ); }
                if ( stripeLine ) { opts.push( 'STRIPES' ); }

                if ( 0 === opts.length ) { return ''; }

                return opts.join(',');
            }

            //  EVENT HANDLERS

            init();

            return {
                'render': render,
                'getValue': getValue,
                'setValue': setValue,
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