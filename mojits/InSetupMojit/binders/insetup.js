/*jslint anon:true, sloppy:true, nomen:true*/
/* global YUI, ko */

YUI.add( 'InSetupMojitBinder', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        InSetupTextBlocksImportExportViewModel = KoViewModel.getConstructor( 'InSetupImportExportTextBlocksViewModel' ),

        IMPORT_EXPORT_TEXT_BLOCKS = 'importExportTextBlocksTab';

    /**
     * @class InSight2Binder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function InSetupBinder() {
        InSetupBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSetupBinder, Y.doccirrus.DCBinder, {
        /**
         * @property currentView
         * @type {null|ko.observable(null|ViewModel)}
         */
        currentView: null,

        /** @private */
        initializer: function() {
            var
                self = this,
                currentView = ko.observable( null );

                Y.doccirrus.DCBinder.initToggleFullScreen();

            self.currentView = ko.computed( {
                read: currentView,
                write: function( value ) {
                    var previousView;
                    if( value !== peek( currentView ) ) { // prevent change for same value

                        //  clean up previous view models, including their hotkey subscriptions MOJ-7531
                        previousView = currentView();
                        if ( previousView && previousView.destroy ) {
                            Y.log( 'Disposing view from closed tab.', 'debug', NAME );
                            previousView.destroy();
                        }

                        currentView( value );
                    }
                }
            } );
        },
        /** @private */
        destructor: function() {
        },
        setupNavigation: function() {
            var
                self = this,
                navigation = self.get( 'navigation' );

            Y.doccirrus.catalogmap.init( self.get( 'mojitProxy' ).pageData.get( 'catalog-descriptors' ) );

            navigation.addItems( Y.doccirrus.ItemsTabFactory.createInSetupNavItems() );
        },

        /**
         * Handler of the toggle full-screen action
         */
        viewPortBtnI18n : Y.doccirrus.DCBinder.viewPortBtnI18n,
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },

        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'insetup' ) );
            router.set( 'routes', [
                {
                    routeId: 'default',
                    path: '/',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSetupMojit.import_export_text_blocks')) {
                            self.route_importExportTextBlocksTab( req );
                        }
                    }
                },
                {
                    routeId: 'importExportTextBlocks',
                    path: '/import_export_text_blocks',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSetupMojit.import_export_text_blocks')) {
                            self.route_importExportTextBlocksTab( req );
                        }
                    }
                }
            ] );

        },
        /**
         * @method navigateToRoot
         */
        navigateToRoot: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/' );
        },
        /**
         * @method navigateToRoot
         */
        route_importExportTextBlocksTab: function() {
            var
                self = this,
                importExportTextBlocksViewModel;

            self.showLoadingMask();

            importExportTextBlocksViewModel = KoViewModel.getViewModel( 'InSetupImportExportTextBlocksViewModel' );
            if( !importExportTextBlocksViewModel ) {
                importExportTextBlocksViewModel = new InSetupTextBlocksImportExportViewModel();
            } else {
                importExportTextBlocksViewModel.importExportModel.exportTree.reload();
            }

            self.currentView( importExportTextBlocksViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( IMPORT_EXPORT_TEXT_BLOCKS );
        }

    } );

    Y.namespace( 'mojito.binders' )[NAME] = new InSetupBinder( {
        binderName: NAME,
        initialData: {}
    } );


}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',
        'ItemsTabFactory',
        'doccirrus',
        'promise',
        'DCBinder',
        'DCRouter',
        'KoViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'dcauth',

        'InSetupImportExportTextBlocksViewModel',
        'dccatalogmap'
    ]
} );
