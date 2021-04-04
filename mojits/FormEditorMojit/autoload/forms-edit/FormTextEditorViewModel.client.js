/**
 * User:strix
 * Date: 29/05/2019
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
/*eslint prefer-template: 0 */

'use strict';

YUI.add( 'FormTextEditorViewModel', function( Y, NAME ) {
        /**
         * @module FormTextEditorViewModel
         */

        var
            i18n = Y.doccirrus.i18n;

        if ( !Y.dcforms ) { Y.dcforms = {}; }

        /**
         * @class FormTextEditorViewModel
         * @constructor
         */
        function FormTextEditorViewModel() {
            var self = this;

            function init() {
                //  observables
                self.element = ko.observable();

                self.currentLanguageValue = ko.observable( '' );
                self.maxLen = ko.observable( 0 );

                self.scaleOverflow = ko.observable( false );
                self.omitFromPDFIfEmpty = ko.observable( false );
                self.useMarkdownEditor = ko.observable( false );

                self.omitFromPDFIfEmpty = ko.observable( false );
                self.useMarkdownEditor = ko.observable( false );

                self.showMoreOptions = ko.observable( true );

                //  translations
                self.BTN_MORE_OPTIONS = i18n( 'FormEditorMojit.tableproperties_modal.button' );
                self.LBL_EE_OMITIFEMPTY = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_OMITIFEMPTY' );
                self.LBL_EE_LARGETEXT = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_LARGETEXT' );

                self.scaleOverflowLabel = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_SCALEOVERFLOW' );
                self.maxLengthLabel = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_MAXLEN' );
                self.useTextEditorModal = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_LARGETEXT' );

                //  subscriptions
                //  raised when user changes values in the panel

                self.subscribeText = self.currentLanguageValue.subscribe( function onTextValueChanged( newValue ) {
                    var element = self.element();
                    if ( !element ) { return; }

                    element.defaultValue[ element.getCurrentLang() ] = newValue;
                    element.setValue( newValue, Y.dcforms.nullCallback );

                    self.redraw();
                } );

                self.subscribeMaxLen = self.maxLen.subscribe( function onMaxLenChanged( newValue ) {
                    var
                        element = self.element(),
                        asNumber = parseInt( newValue, 10 );

                    if ( !element || isNaN( asNumber ) ) { return; }
                    if ( asNumber < 0 ) { return; }

                    if ( 'textmatrix' === element.elemType ) {
                        //  textmatrix cannot have 0 cells
                        if ( asNumber < 1 ) { return; }
                        //  legacy, kept for consistency
                        element.extra = asNumber;
                    }

                    element.maxLen = asNumber;

                    //  force regenerate of subelements
                    element.setValue( element.getValue() );
                    self.redraw();
                } );

                self.subscribeScaleText = self.scaleOverflow.subscribe( function onScaleOverflowChanged( newValue ) {
                    var element = self.element();
                    if ( !element ) { return; }

                    element.scaleOverflow = newValue;

                    //  force regenerate of subelements
                    element.setValue( element.getValue() );
                    self.redraw();
                } );

                self.subscribeOmitFromPDFIfEmpty = self.omitFromPDFIfEmpty.subscribe( function onOmitChanged( newValue ) {
                    var element = self.element();
                    if ( !element ) { return; }

                    element.omitFromPDFIfEmpty = newValue;
                    self.redraw();
                } );

                self.subscribeUseMarkdownEditor = self.useMarkdownEditor.subscribe( function onUseMarkdownEditor( newValue ) {
                    var element = self.element();
                    if ( !element ) { return; }

                    element.useMarkdownEditor = newValue;
                    self.redraw();
                } );
            }

            //  public methods

            self.redraw = function() {
                var
                    element = self.element();

                if ( !element ) { return; }

                element.page.form.raise( 'valueChanged', element );
                element.isDirty = true;
                element.page.redrawDirty();
            };

            self.destroy = function() {
                //  should not currently happen in form editor
                Y.log( 'Destroying FormTextEditorViewModel', 'info', NAME );
            };

            /**
             *  Called by parent when an element has been selected in the form
             *
             *  @param  {Object}    elem    A dcform text type element (label, textarea, etc)
             */

            self.setElement = function( elem ) {
                self.element( elem );

                if ( !elem ) { return; }

                self.currentLanguageValue(  elem.getValue() );
                self.maxLen( elem.maxLen || 0 );

                if ( 'textmatrix' === elem.elemType ) {
                    self.maxLen( elem.extra || 1 );
                    self.showMoreOptions( false );
                } else {
                    self.maxLen( elem.maxLen || 0 );
                    self.showMoreOptions( true );
                }

                self.scaleOverflow( elem.scaleOverflow );
                self.omitFromPDFIfEmpty( elem.omitFromPDFIfEmpty );
                self.useMarkdownEditor( elem.useMarkdownEditor );
            };

            //  SETUP

            init();
        }

        Y.dcforms.FormTextEditorViewModel = FormTextEditorViewModel;

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'tableproperties-modal',
            'dcforms-table-utils'
        ]
    }
)
;