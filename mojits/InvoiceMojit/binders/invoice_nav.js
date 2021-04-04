/**
 * User: do
 * Date: 31/03/14  16:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InvoiceNavigationBinderIndex', function( Y, NAME ) {
    'use strict';

    /**
     * @module InvoiceNavigationBinderIndex
     */

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        SPEC_VERSION = i18n( 'invoiceconfiguration-schema.PadxSetting_T.specVersion' );

    /**
     * @class InvoiceNavigationBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'InvoiceMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            this.invoiceconfiguration = ko.observable( null );
        },
        
        bind: function() {
            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'invoiceTopLevelMenuButton' );
            Y.doccirrus.DCBinder.initToggleFullScreen();

            var
                hasInVoice = Y.doccirrus.auth.hasBaseServices( Y.doccirrus.schemas.settings.baseServices.INVOICE ),
                hasASV = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV ),
                hasEDocs = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ||
                          Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EHKS ),
                navigation,
                router,
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                rootPath = Y.doccirrus.utils.getUrl( 'invoice' ),
                fullScreenToggle = {
                    toggleFullScreenHandler() {
                        Y.doccirrus.DCBinder.toggleFullScreen();
                    },
                    viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
                };

            // MOJ-1172: get rid of this workaround.
            Y.doccirrus.comctl.setUserLang( 'de' );

            // initializes the "catalogmap" with data from the InvoiceMojit provided by the server for this binder
            Y.doccirrus.catalogmap.init( this.mojitProxy.pageData.get( 'catalog-descriptors' ) );


            function handleTab( tabName, data, callback ) {
                var getInvoiceConfig = function (callback){
                    if (self.invoiceconfiguration() === null){

                        Y.doccirrus.jsonrpc.api.invoiceconfiguration
                            .read()
                            .done( function( response ) {
                                var
                                    data = response && response.data,
                                    anInvoiceConfigurationModel;
                                if( data && data[0] ) {
                                    anInvoiceConfigurationModel = KoViewModel.createViewModel( {
                                        NAME: 'InvoiceConfigurationModel',
                                        config: { data: data[0] }
                                    } );

                                    anInvoiceConfigurationModel._locationList = Y.doccirrus.KoViewModel.utils.createAsync( {
                                        initialValue: [],
                                        jsonrpc: Y.doccirrus.jsonrpc.api.location.read,
                                        converter: function( response ) {
                                            function sortLocation( a, b ) {
                                                return a._id > b._id;
                                            }
                                            var sorted = [].concat( response.data );
                                            if( sorted && sorted.length ) {
                                                sorted.sort( sortLocation );

                                                if( 0 > sorted[0].locname.indexOf( 'Standard ( ') ) { // just a hack to avoid multiple 'Standard (' appearing in a locname
                                                    sorted[0].locname = 'Standard ( ' + sorted[0].locname + ' )'; // rename default location
                                                }
                                            }
                                            return sorted;
                                        }
                                    } );

                                    anInvoiceConfigurationModel.specialVersion = Y.doccirrus.KoViewModel.utils.createAsync( {
                                        initialValue: '',
                                        jsonrpc: Y.doccirrus.jsonrpc.api.padx.getSpecVersion,
                                        converter: function( response ) {
                                            var version = response && response.data;
                                            return version && Y.Lang.sub( SPEC_VERSION, { specVersion: version.replace(/^0+/, '') || '' } );
                                        }
                                    } );

                                    anInvoiceConfigurationModel._sortInvoiceFactors();
                                    self.invoiceconfiguration( anInvoiceConfigurationModel );
                                    callback( );

                                }
                            } )
                            .fail( function( err ) {
                                Y.log( 'InvoiceConfiguration error loading ' + err, 'debug', NAME );
                            } );
                    } else {
                        callback( );
                    }
                },
                cbLoadTemplate  = function(){
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        templateName,
                        self.jaderef,
                        { binder: self, data: data },
                        Y.one( node ),
                        function() {
                            var tab = navigation.getItemByName( tabName );
                            if( tab ) {
                                tab.active( true );
                            }
                            if( callback ) {
                                callback.apply( undefined, arguments );
                            }
                        }
                    );
                };

                var node = document.querySelector( "#upperDiv" ),
                    templateName = tabName;
                if(tabName === 'cashlog'){
                    data.cashlog = true;
                    templateName = 'pvs_browser';
                }

                if( 'function' === typeof data ) {
                    callback = data;
                    data = null;
                }
                if( node ) {
                    ko.cleanNode( node );
                }

                getInvoiceConfig(cbLoadTemplate, this);

            }

            function getPhysicians() {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.employee.read( {
                    query: {
                        type: 'PHYSICIAN',
                        status: 'ACTIVE'
                    }
                } ) ).then( function( response ) {
                    var data = response.data;
                    return data;
                } );
            }

            function routeToGKV( req ) {
                if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ) ) {
                    if( Y.config.debug ) {
                        Y.log( 'Follow gkv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                    }
                    handleTab( 'gkv_browser', req.params );
                }
            }

            function routeToPrivateLogs( req, tabName ) {
                if( Y.config.debug ) {
                    Y.log( 'Follow pvs Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                }

                var
                    tabConfig = {
                        pvslogId: req.params.pvslogId || null,
                        patientId: req.params.patientId || null,
                        physicians: []
                    };

                getPhysicians().then( function( physicians ) {
                    tabConfig.physicians = physicians;
                    handleTab( tabName, tabConfig);
                } ).catch( function( err ) {
                    Y.log( 'could not get physicians: ' + err, 'error', NAME );
                    handleTab( tabName, tabConfig );
                } );
            }

            function routeToTarmed( req ) {
                if( Y.config.debug ) {
                    Y.log( 'Follow tarmed Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                }

                handleTab( 'kvg_browser', req.params );
            }

            function routeToReceiptsBook( req ) {
                if( Y.config.debug ) {
                    Y.log( 'Follow receiptsbook Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                }

                handleTab( 'receiptsbook', req.params );
            }

            navigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInvoiceNavItems( {
                        rootPath: rootPath,
                        hasASV: hasASV,
                        hasInVoice: hasInVoice,
                        hasEDocs: hasEDocs,
                        isVPRCAdmin: Y.doccirrus.auth.isVPRCAdmin()
                    } )
                }
            } );

            ko.applyBindings( navigation, document.querySelector( '#mainInvoiceNavigation' ) );
            ko.applyBindings( fullScreenToggle, document.querySelector( '#fullScreenToggle' ) );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow default Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'gkv_browser' );
                            }
                        } : routeToTarmed
                    },
                    {
                        path: '/gkv',
                        callbacks: routeToGKV
                    },
                    {
                        path: '/gkv/:kbvlogId',
                        callbacks: routeToGKV
                    },
                    {
                        path: '/gkv/:kbvlogId/:patientId',
                        callbacks: routeToGKV
                    },
                    hasASV ? {
                        path: '/asv',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.asv_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow asv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'asv_browser' );
                            }
                        }
                    } : undefined,
                    {
                        path: '/eDocumentations',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.edmp_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow edocs Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'edmp_browser' );
                            }
                        }
                    },
                    {
                        path: '/pvs',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'pvs_browser'); }
                    },
                    {
                        path: '/pvs/:pvslogId',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'pvs_browser'); }
                    },
                    {
                        path: '/pvs/:pvslogId/:patientId',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'pvs_browser'); }
                    },
                    {
                        path: '/cashlog',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'cashlog'); }
                    },
                    {
                        path: '/cashlog/:pvslogId',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'cashlog'); }
                    },
                    {
                        path: '/cashlog/:pvslogId/:patientId',
                        callbacks: function( req ){ routeToPrivateLogs( req, 'cashlog'); }
                    },
                    {
                        path: '/tarmed',
                        callback: routeToTarmed
                    },
                    {
                        path: '/tarmed/:invoiceLogId',
                        callback: routeToTarmed
                    },
                    {
                        path: '/tarmed/:invoiceLogId/:patientId',
                        callback: routeToTarmed
                    },
                    {
                        path: '/cashbook',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cashbook' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow cashbook Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'cashbook' );
                            }
                        }
                    },
                    {
                        path: '/receiptsbook',
                        callback: routeToReceiptsBook
                    },
                    {
                        path: '/rlv',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.rlv' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow rlv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'rlv_browser' );
                            }
                        }
                    },
                    {
                        path: '/medication-budget',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.med_budget' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow rlv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'med_budget' );
                            }
                        }
                    },
                    {
                        path: '/utility-budget',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.ut_budget' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow rlv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'ut_budget' );
                            }
                        }
                    },
                    {
                        path: '/billing',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.billing' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow billing Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'billing' );
                            }
                        }
                    },
                    {
                        path: '/reports',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.reports' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow reports Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'reports' );
                            }
                        }
                    },
                    {
                        path: '/quarterlyReports',
                        callback: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow general Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'quarterlyReports' );
                            }
                        }
                    },
                    {
                        path: '/pkvQuarterlyReports',
                        callback: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow general Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'pkvQuarterlyReports' );
                            }
                        }
                    },
                    {
                        path: '/okfe_export',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_browser' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow export okfe Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'okfe_export' );
                            }
                        }
                    }
                ].filter( Boolean )
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( 'invoice#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        }
    };
}, '0.0.1', {
    requires: [
        "DCBinder",
        'edmpdelivery-schema',
        'NavBarHeader',
        'JsonRpcReflection-doccirrus',
        'router',
        'dcviewmodel',
        'dcsubviewmodel',
        'event-mouseenter',
        'mojito-client',
        'dcvalidations',
        'dcutils',
        'dcauth',
        'dcutils-uam',
        'dcloadhelper',
        'DCRouter',
        'dcformloader',
        'dccatalogmap',
        'dccontactmodel',
        'dcinvoicemodel',
        'json',
        'model-sync-rest',
        'intl',
        'mojito-intl-addon',
        'dc-comctl',
        'dcmedia',
        'dcmarkermodel',
        'dcmarkerarraymodel',
        'DCWindow',
        'DCSystemMessages',
        'InvoiceFactorModel',
        'InvoiceNumberSchemeModel',
        'dcmanualsendsmodel',
        'dcerrortable',
        'activitysettings-api',
        'dcvat',
        'DcCreateIncashModal',
        'dcinvoicelogmodal',
        'dcinvoiceerrorlogmodal',
        'dcinvoicelogapprovemodal',
        'dccommunication-client',
        'dcinvoicelogutils',
        'KoUI-all',
        'invoicelog-schema',
        'pvslog-schema',
        'kbvlog-schema',
        'dcbatchpdfzip',
        'BudgetViewModel',
        'PredefinedReportsViewModel',
        'KoViewModel',
        'dccommonutils',
        'edmp-commonutils',
        'dcruleloggmodal',
        'ItemsTabFactory',
        //  modal for linking receipts to invoices
        'dcinvoicereceiptmodal',
        'casefolder-schema',
        'promise-utils',
        'edmp-utils',
        'EdmpActor',
        'EdmpDeliveryModel',
        'ActivityActionButtonsViewModel',
        'dcschemaloader',
        'person-schema',
        'filterinvoicelogitems-modal',
        'filterKVGinvoicelogitems-modal',
        'selectlocations-modal',
        'selectemployees-modal',
        'selectpvsinsurance-modal',
        'kbvlog-create-modal',
        'chooseinvoiceform-modal',
        'gkv_deliverysettings-schema',
        'edmpdelivery-schema',
        'patient-schema',
        'invoicelog_content_has_changed_modal',
        'tag-schema',
        'InvoiceConfigurationModel'
    ]
} );