/**
 *  Forms editor page, intializes the editor components
 *
 *  @author: strix
 *  @copyright: Doc Cirrus GmbH 2012
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $ */

YUI.add( 'FormEditorMojitBinderFormsEditor', function( Y, NAME ) {
        /**
         * The FormEditorMojitBinderIndex module.
         *
         * @module FormEditorMojitBinderFormsEditor
         */

        'use strict';

        /**
         * Constructor for the FormEditorMojitBinderForms class.
         *
         * @class FormEditorMojitBinderForms
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {
            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                //change active tab in toplevel menu
                Y.doccirrus.NavBarHeader.setActiveEntry( 'forms' );
                this.node = node;

                //  Disable AJAX event blocking behavior for this page
                Y.doccirrus.ajax.disableBlocking();

                Y.dcforms._async.series(
                    [
                        //  Load / precache BFB certification numbers and status
                        Y.dcforms.loadCertNumbers,
                        //  Load / precache the list of CUPS printers available to this instance
                        loadPrinterList,
                        //  Load / precache the set of available insight2 reports which can be bound to tables
                        Y.dcforms.loadInsight2PresetList,
                        //  Load / precache custom font set
                        getCustomFonts,
                        //  Load old-style translation dictionary through jadeLoaderMojit
                        getLegacyTranslations,
                        //  Load editor UI via JadeLoader
                        embedFormEditor
                    ],
                    onAllDone
                );

                function loadPrinterList( itcb ) {
                    Y.dcforms.loadPrinterList(onPrinterListLoaded);
                    function onPrinterListLoaded(err) {
                        if (err) {
                            Y.log('Problem loading printer details: ' + JSON.stringify(err), 'warn', NAME);
                            //  continue load of form editor despite issue, some hosts do not have CUPS or lpstat
                        }

                        itcb(null);
                    }
                }

                function getCustomFonts( itcb ) {
                    Y.doccirrus.media.fonts.loadFontList( onFontsListed );
                    function onFontsListed( err ) {
                        if ( err ) {
                            Y.log( 'Error loading custom fonts: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue despite error
                            return itcb( null );
                        }

                        Y.doccirrus.media.fonts.addFontsToPage();
                        itcb( null );
                    }
                }

                function getLegacyTranslations( itcb ) {
                    //  Set YUI translation language to language code passed by the server
                    Y.Intl.setLang( 'FormEditorMojit', $( '#YUI_SERVER_LANG' ).val() );
                    Y.log( 'Set language from hidden element: ' + Y.Intl.getLang( 'FormEditorMojit' ), 'info', NAME );

                    //  Load legacy translation dictionary for this user's browser language
                    //Y.doccirrus.comctl.getIl8nDict('FormEditorMojit', onDictLoaded);
                    onDictLoaded(null, Y.Intl.get('FormEditorMojit'));
                    function onDictLoaded(err, dict) {
                        if (err) {
                            Y.dcforms.il8nDict = Y.Intl.get('FormEditorMojit');
                        } else {
                            Y.dcforms.il8nDict = dict;
                        }
                        itcb( null );
                    }
                }

                function embedFormEditor( itcb ) {
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'forms_editor',
                        'FormEditorMojit',
                        { },
                        node.one( '#divFormEditor' ),
                        itcb
                    );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Error initializing form editor: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'NavBarHeader',
            'dc-comctl',
            'dcmedia',
            'dcforms-utils',
            'dcforms-reducedschema',
            'dcforms-template',
            'dcforms-categories',
            'dcforms-pdf',
            'dcforms-listeditor',
            'dcforms-barcodeeditor',
            'dcforms-reporttableeditor',
            'dcforms-labdatatableeditor',
            'dcforms-hyperlinkeditor',
            'dcforms-imageeditor',
            'dcforms-papersizes',
            'dcforms-reorder',
            'dcforms-translation',
            'dcforms-categoriesselect',
            'dcforms-schema-all',

            'node-event-simulate',
            'DCWindow',
            'FormsTreeViewModel',

            'event-mouseenter',
            'mojito-client',
            'intl',
            'mojito-intl-addon',
            'mojito-rest-lib',

            'dcforms-map-casefile',
            'dcforms-map-invoice',
            'dcforms-map-docletter',
            'dcforms-map-patient',
            'dcforms-map-infotree',
            'dcforms-map-prescription',
            'dcforms-map-pubreceipt',
            'dcforms-map-incase',

            'dcmedia-fonts',

            //  used for translation dialog
            'dcforms-canvas-mini',

            //  used by forms with audio recording
            'microphoneinputmodal',
            'dcresizepapermodal',
            'formimportexport-modal',
            'formhistory-modal',

            'activity-schema',

            //  replacing older jQuery components with KO
            'FormTextEditorViewModel',
            'FormTableEditorViewModel',

            //  markdown controls
            'WYSWYGViewModel'
        ]
    }
);