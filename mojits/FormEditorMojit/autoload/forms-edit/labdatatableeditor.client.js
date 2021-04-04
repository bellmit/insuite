/*
 *  Copyright DocCirrus GmbH 2018
 *
 *  YUI module to render UI for selecting and configuring labdata tables
 *  This is a stub, as labdata is dynamically selected by user at runtime
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-labdatatableeditor',

    /* Module code */
    function(Y, NAME) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms labdatatable types.', 'debug', NAME);

        /**
         *  Subdialog of the element properties, for changing default values
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *
         *  Currently no content or values to show in this editor:
         *
         *  @//param  initialValue    {Function}    Rendering context (edit/fill/renderpdf/etc)
         *  @//param  onChange        {Function}    Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.labdataTableEditor = function( domId, initialValue, element, onChange ) {
            var
                jq = { 'me': $('#' + domId) },                              //  cached jQuery selectors
                callWhenChanged = onChange;                                 //  currently will not change

            //  PUBLIC METHODS
            
            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {
                var html =
                    '<p>' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_LABDATA_NOT_SHOWN' ) + '</p>' +
                    '<b>' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_LABDATA_CLICK_NOTICE' ) + ':</b>' +
                    '<textarea ' +
                    'style="width: 95%" ' +
                    'rows="5" ' +
                    'class="form-control" ' +
                    'id="taPromptTxt' + domId + '">' +
                    '</textarea>';

                html = html + '<br/>' +
                    '<div class="checkbox">' +
                    '<input type="checkbox" id="cbTableHideIfEmpty' + domId + '" />' +
                    '<label for="cbTableHideIfEmpty' + domId + '" class="checkbox-inline">' +
                    '<span style="margin-left: 15px;">' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_OMITIFEMPTY' ) + '</span>' +
                    '</label>' +
                    '</div>';

                jq.me.html( html );

                jq.taPromptTxt = $( '#taPromptTxt' + domId );
                jq.taPromptTxt.val( element.extra );

                jq.cbTableHideIfEmpty = $( '#cbTableHideIfEmpty' + domId );
                jq.cbTableHideIfEmpty.prop( 'checked', element.omitFromPDFIfEmpty );
                jq.cbTableHideIfEmpty.off( 'click.forms' ).on( 'click.forms', onToggleHideIfEmpty );

                jq.taPromptTxt.off('keyup.element').on('keyup.element', function() {
                    var promptVal = jq.taPromptTxt.val();
                    element.extra = promptVal;
                    callWhenChanged();
                });
            }

            /**
             *  Option to omit tables from PDF if no rows
             */

            function onToggleHideIfEmpty() {
                element.omitFromPDFIfEmpty = jq.cbTableHideIfEmpty.is( ':checked' );
                element.page.form.autosave();
                callWhenChanged();
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue( newValue ) {
                //  should probably not happen
                jq.taPromptTxt.val( newValue );
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return jq.taPromptTxt.val();
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @//param  newHandler  {Function}  of the form fn(txtSerializedList)
             */

            function setOnChanged( /*newHandler*/ ) {
                //callWhenChanged = newHandler;
                Y.log( 'No value updates from labadata editor.', 'debug', NAME );
            }

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