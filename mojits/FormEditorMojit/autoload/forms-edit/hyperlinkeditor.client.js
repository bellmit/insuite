/*
 *  Copyright DocCirrus GmbH 2018
 *
 *  YUI module to render UI for editing hyperlink values
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $, async, ko */

YUI.add(
    /* YUI module name */
    'dcforms-hyperlinkeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n;

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms hyperlink types.', 'debug', NAME);

        /**
         *  Subdialog of the element properties, for changing hyperlink values
         *
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}      Rendering context (edit/fill/renderpdf/etc)
         *  @param  element         {Object}        Fornm element
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.hyperlinkEditor = function(domId, initialValue, element, onChange) {
            var
                jq = { 'me': $('#' + domId) },                          //  cached jQuery selectors
                txtValue = Y.dcforms.stripHtml( initialValue ),         //  current value
                toUrl = element.extra || Y.dcforms.HYPERLINK_DEFAULT,   //  URL
                isRendered = false, // eslint-disable-line no-unused-vars
                callWhenChanged = onChange;                             //  general purpose 'onchange' event

            //  PUBLIC METHODS

            /**
             *  Public method this object into the domId given to constructor
             */

            function render( callback ) {
                var
                    panelNode = Y.Node.create( '<div></div>' );

                async.series( [ loadPanelHtml, setupJQuery ], onAllDone );

                function loadPanelHtml( itcb ) {
                    //  clear any existing content
                    jq.me.html( '' );
                    isRendered = false;

                    //  load the panel template
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'editor_hyperlink',
                        'FormEditorMojit',
                        {},
                        panelNode,
                        onPanelHtmlLoaded
                    );

                    //  add panel template to page
                    function onPanelHtmlLoaded( err ) {
                        if ( err ) { return itcb( err ); }
                        Y.one( '#' + domId ).append( panelNode );
                        itcb( null );
                    }
                }

                function setupJQuery( itcb ) {
                    var safeValue = txtValue || '';

                    jq.taTxtHyperlink = $( '#taTxtHyperlink' );
                    jq.taTxtHyperlink.val( safeValue );
                    jq.taTxtHyperlink.off( 'keyup.element' ).on( 'keyup.element', onLabelValueChanged );

                    jq.txtHyperlinkUrl = $( '#txtHyperlinkUrl' );
                    jq.txtHyperlinkUrl.val( toUrl );
                    jq.txtHyperlinkUrl.off('keyup.element').on('keyup.element', onUrlValueChanged );

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem initializing chart editor: ' + JSON.stringify( err ), 'warn', NAME );
                        if ( callback ) { callback( err ); }
                        return;
                    }
                    function EditHyperlinkVM() {
                        var
                            self = this;

                        self.lblEETourI18n = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_TOURL' );

                    }

                    ko.applyBindings( new EditHyperlinkVM(), document.querySelector( '#divElementEditPanelHyperlink' ) );
                    isRendered = true;
                    if ( callback ) { callback( null ); }
                }

            }

            function onLabelValueChanged() {
                txtValue = jq.taTxtHyperlink.val();
                callWhenChanged( txtValue, toUrl );
            }

            function onUrlValueChanged() {
                toUrl = jq.txtHyperlinkUrl.val();
                callWhenChanged( txtValue, toUrl );
            }

            /**
             *  Public method to set the value of this control (when user types on form in edit mode)
             *  @param  newValue    {String}    Serialized list
             */

            function setValue( newValue ) {
                txtValue = newValue;
                jq.taTxtHyperlink.val( newValue );
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return txtValue;
            }

            /**
             *  Set a new event handler for UI events
             *
             *  @param  newHandler  {Function}  of the form fn(txtLabel,txtUrl)
             */

            function setOnChanged( newHandler ) {
                callWhenChanged = newHandler;
            }

            //  EVENT HANDLERS

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