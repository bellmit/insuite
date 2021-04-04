/*jslint anon:true, sloppy:true, nomen:true*/
/* global YUI, ko */

YUI.add( 'InSight2MojitBinderInsight2', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        //unwrap = ko.unwrap,

        //catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,
        Tab1ViewModel = KoViewModel.getConstructor( 'Tab1ViewModel' ),
        InSightReportingViewModel = KoViewModel.getConstructor( 'InSightReportingViewModel' ),
        InfoTabViewModel = KoViewModel.getConstructor( 'InfoTabViewModel' ),
        PredefinedReportsViewModel = KoViewModel.getConstructor( 'PredefinedReportsViewModel' ),
        InSightAnalysisViewModel = KoViewModel.getConstructor( 'InSightAnalysisViewModel' ),
        InSightImportExportViewModel = KoViewModel.getConstructor( 'InSightImportExportViewModel' ),
        InSightSettingsViewModel = KoViewModel.getConstructor( 'InSightSettingsViewModel' ),

        TAB1 = 'tab1',
        TABLES1 = 'tables1',
        TABLES2 = 'tables2',
        TABLES3 = 'tables3',
        TABLES4 = 'tables4',
        INFOTAB = 'infotab',
        ANALYSIS = 'analysistab',
        IMPORT_EXPORT = 'importExportTab',
        MYREPORTS = 'myreports',
        STANDARDREPORTS = 'standardreports',
        SETTINGS = 'settings';

    /**
     * @class InSight2Binder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function InSight2Binder() {
        InSight2Binder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSight2Binder, Y.doccirrus.DCBinder, {
        /**
         * @property currentView
         * @type {null|ko.observable(null|ViewModel)}
         */
        currentView: null,


        customFieldsLoaded: false,
        customFields: null,

        /** @private */
        initializer: function() {
            var
                self = this,
                currentView = ko.observable( null );

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
            self.customFields = ko.observableArray( [] );

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

            navigation.addItems( Y.doccirrus.ItemsTabFactory.createInSight2AdminNavItems() );
        },
        /**
         * Handler of the toggle full-screen action
         */
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },

        /**
         *  Load any inSight properties defined by the user in forms
         *  (should cache result from server)
         *
         *  @param  {Function}  callback
         */

        loadUserDefinedFields: function( callback ) {
            var self = this;

            //  skip this if already loaded
            if ( self.customFieldsLoaded ) {
                Y.log( 'Skipping duplicate load of custom reporting fields.', 'debug', NAME );
                return callback( null );
            }

            Y.doccirrus.jsonrpc.api.formtemplate
                .getUserReportingFields()
                .then( onCustomFieldsLoaded );

            function onCustomFieldsLoaded( result ) {
                var
                    customFields = result.data ? result.data : [],
                    i;

                //  add custom fields to result
                for ( i = 0; i < customFields.length; i++ ) {
                    self.customFields.push( customFields[i] );
                }

                self.customFieldsLoaded = true;
                callback( null );
            }
        },

        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'insight' ) );
            router.set( 'routes', [
                {
                    routeId: 'tab1route',
                    path: '/',
                    callbacks: function ( req ) {
                        if( Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.root' ) ) {
                            if( Y.doccirrus.auth.isDOQUVIDE() ) {
                                self.route_myReports( req );
                            } else {
                                self.route_standardReports( req );
                            }
                        }
                    }
                },
                {
                    routeId: 'tab1route',
                    path: '/tab1',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.tab1')) {
                            self.route_tab1( req );
                        }
                    }
                },
                {
                    routeId: 'tables1route',
                    path: '/patienten',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.patienten')) {
                            self.route_tables1( req );
                        }
                    }
                },
                {
                    routeId: 'tables2route',
                    path: '/diagnosen',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.diagnosen')) {
                            self.route_tables2( req );
                        }
                    }
                },
                {
                    routeId: 'tables3route',
                    path: '/leistungen',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.leistungen')) {
                            self.route_tables3( req );
                        }
                    }
                },
                {
                    routeId: 'tables4route',
                    path: '/abrechnung',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.abrechnung')) {
                            self.route_tables4( req );
                        }
                    }
                },
                {
                    routeId: 'infotabroute',
                    path: '/infotab',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.infotab')) {
                            self.route_infotab( req );
                        }
                    }
                },
                {
                    routeId: 'standardreports',
                    path: '/standard-reports',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.standard-reports')) {
                            self.route_standardReports( req );
                        }
                    }
                },
                {
                    routeId: 'analysistab',
                    path: '/analysis',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.analysis')) {
                            self.route_analysisTab( req );
                        }
                    }
                },
                {
                    routeId: 'importExport',
                    path: '/import_export',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.import_export')) {
                            self.route_importExportTab( req );
                        }
                    }
                },
                {
                    routeId: 'myreports',
                    path: '/myreports',
                    callbacks: function ( req ) {
                        if( Y.doccirrus.auth.hasSectionAccess( 'InSight2Mojit.myreports' ) ) {
                            self.route_myReports( req );
                        }
                    }
                },
                {
                    routeId: 'settings',
                    path: '/settings',
                    callbacks: function ( req ) {
                        if (Y.doccirrus.auth.hasSectionAccess('InSight2Mojit.settings')) {
                            self.route_settingsTab( req );
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
         * @method navigateToTab1
         */
        navigateToTab1: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/' );
        },
        /**
         * @protected
         * @method route_tab1
         * @param {Object} request
         * @param {String} request.params
         * @param {Object} request.route
         * @param {Object} response
         * @param {Function} next
         * @returns {void}
         */
        route_tab1: function( /*request, response, next*/ ) {
            var
                self = this,
                aTab1ViewModel;

            self.showLoadingMask();

            aTab1ViewModel = KoViewModel.getViewModel( 'Tab1ViewModel' );

            if( !aTab1ViewModel ) {
                aTab1ViewModel = new Tab1ViewModel();
            }

            self.currentView( aTab1ViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( TAB1 );
        },
        /** @protected */
        route_tables1: function( /*request, response, next*/ ) {
            var
                self = this,
                aTables1ViewModel;

            self.showLoadingMask();

            aTables1ViewModel = KoViewModel.getViewModel( 'Tables1ViewModel' );

            if( !aTables1ViewModel ) {
                aTables1ViewModel = new InSightReportingViewModel( {
                    containerName: 'inSightPatientsTab'
                } );
            }

            self.currentView( aTables1ViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( TABLES1 );
        },
        /** @protected */
        route_tables2: function( /*request, response, next*/ ) {
            var
                self = this,
                aTables2ViewModel;

            self.showLoadingMask();

            aTables2ViewModel = KoViewModel.getViewModel( 'Tables2ViewModel' );

            if( !aTables2ViewModel ) {
                aTables2ViewModel = new InSightReportingViewModel( {
                    containerName: 'inSightDiagnosisTab'
                } );
            }

            self.currentView( aTables2ViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( TABLES2 );
        },
        /** @protected */
        route_tables3: function( /*request, response, next*/ ) {
            var
                self = this,
                aTables3ViewModel;

            self.showLoadingMask();

            aTables3ViewModel = KoViewModel.getViewModel( 'Tables3ViewModel' );

            if( !aTables3ViewModel ) {
                aTables3ViewModel = new InSightReportingViewModel( {
                    containerName: 'inSightServicesTab'
                } );
            }

            self.currentView( aTables3ViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( TABLES3 );
        },
        /** @protected */
        route_tables4: function( /*request, response, next*/ ) {
            var
                self = this,
                aTables4ViewModel;

            self.showLoadingMask();

            aTables4ViewModel = KoViewModel.getViewModel( 'Tables4ViewModel' );

            if( !aTables4ViewModel ) {
                aTables4ViewModel = new InSightReportingViewModel( {
                    containerName: 'inSightAccountingTab'
                } );
            }

            self.currentView( aTables4ViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( TABLES4 );
        },
        /** @protected */
        route_infotab: function( /*request, response, next*/ ) {
            var
                self = this,
                infoTabViewModel;

            self.showLoadingMask();
            self.loadUserDefinedFields( onCustomFieldsLoaded );

            function onCustomFieldsLoaded() {
                infoTabViewModel = KoViewModel.getViewModel( 'InfoTabViewModel' );

                if( !infoTabViewModel ) {
                    infoTabViewModel = new InfoTabViewModel();
                }

                self.currentView( infoTabViewModel );
                self.hideLoadingMask();
                self.get( 'navigation' ).activateTab( INFOTAB );
            }

        },
        /** @protected */
        route_standardReports: function( /*request, response, next*/ ) {
            var
                self = this,
                predefinedReportsViewModel;

            self.showLoadingMask();

            predefinedReportsViewModel = KoViewModel.getViewModel( 'PredefinedReportsViewModel2' );

            if( !predefinedReportsViewModel ) {
                predefinedReportsViewModel = new PredefinedReportsViewModel( {
                    containerName: 'inSightStandardReports',
                    origin: 'INSIGHT'
                } );
            }

            self.currentView( predefinedReportsViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( STANDARDREPORTS );
        },
        /** @protected */
        route_analysisTab: function( /*request, response, next*/ ) {
            var
                self = this,
                inSightAnalysisViewModel;

            self.showLoadingMask();

            inSightAnalysisViewModel = KoViewModel.getViewModel( 'InSightAnalysisViewModel' );

            if( !inSightAnalysisViewModel ) {
                inSightAnalysisViewModel = new InSightAnalysisViewModel();
            }

            self.currentView( inSightAnalysisViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( ANALYSIS );
        },
        /** @protected */
        route_myReports: function( /*request, response, next*/ ) {
            var
                moduleName = 'InSight2Mojit',
                self = this,
                aMyReportsViewModel;

            if( !Y.doccirrus.auth.hasModuleAccess( moduleName ) ) {
                document.location = '/license?licenseType=' + Y.doccirrus.auth.getRequiredLicense( moduleName );
                return;
            }

            self.showLoadingMask();

            self.showLoadingMask();
            self.loadUserDefinedFields( onCustomFieldsLoaded );

            function onCustomFieldsLoaded() {
                aMyReportsViewModel = KoViewModel.getViewModel( 'aMyReportsViewModel' );

                if( !aMyReportsViewModel ) {
                    aMyReportsViewModel = new InSightReportingViewModel( {
                        containerName: 'inSightMyReportsTab'
                    } );
                }

                self.currentView( aMyReportsViewModel );
                self.hideLoadingMask();
                self.get( 'navigation' ).activateTab( MYREPORTS );
            }

        },

        route_importExportTab: function() {
            var
                self = this,
                importExportViewModel;

            self.showLoadingMask();

            importExportViewModel = KoViewModel.getViewModel( 'InSightImportExportViewModel' );
            if( !importExportViewModel ) {
                importExportViewModel = new InSightImportExportViewModel();
            } else {
                importExportViewModel.importExportModel.exportTree.reload();
            }

            self.currentView( importExportViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( IMPORT_EXPORT );
        },

        route_settingsTab: function() {

            var
                self = this,
                settingsViewModel = KoViewModel.getViewModel( 'InSightSettingsViewModel' );

            self.showLoadingMask();
            if( !settingsViewModel ) {
                settingsViewModel = new InSightSettingsViewModel();
            }
            self.currentView( settingsViewModel );
            self.hideLoadingMask();
            self.get( 'navigation' ).activateTab( SETTINGS );
        }
    } );

    Y.namespace( 'mojito.binders' )[NAME] = new InSight2Binder( {
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

        'Tab1ViewModel',
        'InSightReportingViewModel',
        'InfoTabViewModel',
        'PredefinedReportsViewModel',
        'InSightAnalysisViewModel',
        'InSightImportExportViewModel',
        'InSightSettingsViewModel',
        'dccatalogmap',
        'catalog-schema'
    ]
} );
