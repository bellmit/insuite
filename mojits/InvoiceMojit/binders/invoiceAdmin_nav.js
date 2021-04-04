/**
 * User: do
 * Date: 31/03/14  16:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InvoiceAdminNavigationBinderIndex', function( Y, NAME ) {
    'use strict';

    /**
     * @module InvoiceAdminNavigationBinderIndex
     */

    var
        unwrap = ko.unwrap,

        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        MESSAGE_SUCCESS = i18n( 'InvoiceMojit.configuration.messages.SUCCESS' ),
        MESSAGE_STD_ERR = i18n( 'general.message.AN_ERROR_OCCURRED' ),
        SPEC_VERSION = i18n('invoiceconfiguration-schema.PadxSetting_T.specVersion'),
        invoiceconfiguration = ko.observable( null ),
        actions = {};

    /**
     * Fill the invoiceconfiguration observable with the loaded InvoiceConfigurationModel
     */
    invoiceconfiguration.load = function() {
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

                    invoiceconfiguration( anInvoiceConfigurationModel );
                }
            } )
            .fail( function( err ) {
                Y.log( 'InvoiceConfiguration error loading ' + err, 'debug', NAME );
            } );
    };

    /**
     * Save handler for invoiceconfiguration
     */
    actions.saveInvoiceconfiguration = function() {
        if( unwrap( invoiceconfiguration ) ) {
            unwrap( invoiceconfiguration )
                ._saveConfig.apply( this, arguments )
                .done( function onSave( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display' );
                    } else {
                        Y.doccirrus.DCWindow.notice( {
                            message: MESSAGE_SUCCESS
                        } );
                    }
                } )
                .fail( function onSaveError() {
                    Y.doccirrus.DCWindow.notice( {
                        message: MESSAGE_STD_ERR
                    } );
                } );
        }
    };

    /**
     * Save handler enabled for invoiceconfiguration
     */
    actions.saveInvoiceconfigurationEnable = ko.computed( function() {
        var invoiceconfig = unwrap( invoiceconfiguration ),
            padxSettings = invoiceconfig && invoiceconfig.padxSettings(),
            invoiceNumberSchemes = invoiceconfig && invoiceconfig.invoiceNumberSchemes(),
            receiptNumberSchemes = invoiceconfig && invoiceconfig.receiptNumberSchemes(),
            dunningSchemes = invoiceconfig && invoiceconfig.dunningSchemes(),
            receiptsSchemes = invoiceconfig && invoiceconfig.receiptsSchemes(),
            gkvExclusionList = invoiceconfig && invoiceconfig.gkvExclusionList(),
            configValid = invoiceconfig && invoiceconfig.isValid(),
            settingsValid = padxSettings && padxSettings.every( function( setting ) {
                    return setting.isValid() && setting.senderNameAdd().every( function( item ) {
                            return item.isValid();
                        } ) && setting.contacts().every( function( item ) {
                            return item.isValid();
                        } );
                } ),
            invoiceNumbersValid = invoiceNumberSchemes && invoiceNumberSchemes.every( function( number ) {
                    return number.isValid();
                } ),
            receiptNumbersValid = receiptNumberSchemes && receiptNumberSchemes.every( function( number ) {
                    return number.isValid();
                } ),
            dunningValid = dunningSchemes && dunningSchemes.every( function( number ) {
                    return number.isValid();
                } ),
            receiptsValid = receiptsSchemes && receiptsSchemes.every( function( number ) {
                    return number.isValid();
                } ),
            gkvExclusionListValid = gkvExclusionList && gkvExclusionList.every( function( gkvInvoiceList ) {
                return gkvInvoiceList.isValid();
            } );

        return configValid && settingsValid && invoiceNumbersValid && receiptNumbersValid && dunningValid && receiptsValid && gkvExclusionListValid;
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'InvoiceMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            this.invoiceconfiguration = invoiceconfiguration;
            this.actions = actions;
        },
        
        bind: function() {
            var
            navigation,
            router,
            routeToTarmed,
            self = this,
            rootPath = Y.doccirrus.utils.getUrl( 'invoiceadmin' ),
            fullScreenToggle = {
                toggleFullScreenHandler() {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };
            
            Y.doccirrus.DCBinder.initToggleFullScreen();

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'invoiceadmin' );

            // MOJ-1172: get rid of this workaround.
            Y.doccirrus.comctl.setUserLang( 'de' );

            // initializes the "catalogmap" with data from the InvoiceMojit provided by the server for this binder
            Y.doccirrus.catalogmap.init( this.mojitProxy.pageData.get( 'catalog-descriptors' ) );

            function handleTab( tabName, options, callback ) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                if( 'function' === typeof options ) {
                    callback = options;
                    options = {};
                }
                if( 'object' !== typeof options ) {
                    options = {};
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    self.jaderef,
                    Object.assign( {binder: self}, options ),
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
            }

            navigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInVoiceAdminNavItems( { rootPath: rootPath } )
                }
            } );

            ko.applyBindings( navigation, document.querySelector( '#mainInvoiceNavigation' ) );
            ko.applyBindings( fullScreenToggle, document.querySelector( '#fullScreenToggle' ) );
            routeToTarmed = function( req ) {
                if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.kvg_settings' ) ) {
                    if( Y.config.debug ) {
                        Y.log( 'Follow kvg_delivery_settings Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                    }
                    handleTab( 'kvg_settings' );
                }
            };
            
            router = new Y.doccirrus.DCRouter( {
                root: rootPath,

                routes: [
                    {
                        path: '/',
                        callbacks:  !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ?
                            function( req ) {
                                if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                    if( Y.config.debug ) {
                                        Y.log( 'Follow default Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                    }
                                    handleTab( 'gkv_settings' );
                                }
                            } : routeToTarmed
                    },
                    {
                        path: '/gkv',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow gkv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'gkv_settings' );
                            }
                        }
                    },
                    {
                        path: '/gkv_delivery_settings',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow gkv_delivery_settings Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'gkv_delivery_settings' );
                            }
                        }
                    },
                    {
                        path: '/gkv_delivery_settings/:deliverySettingId',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.gkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow gkv_delivery_settings Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'gkv_delivery_settings', {params: req.params} );
                            }
                        }
                    },
                    {
                        path: '/tarmed',
                        callbacks: routeToTarmed
                    },
                    {
                        path: '/pvs',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.pvs_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow pvs Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'pvs_settings' );
                            }
                        }
                    },
                    {
                        path: '/cash',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.cash_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow cash settings route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'cash_settings' );
                            }
                        }
                    },
                    {
                        path: '/pkv',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.pkv_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow pkv Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'pkv_settings' );
                            }
                        }
                    },
                    {
                        path: '/bg',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.bg_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow bg Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'bg_settings' );
                            }
                        }
                    },
                    {
                        path: '/eDocumentations',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.edmp_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow edocs/edmp_settings Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'edmp_settings' );
                            }
                        }
                    },
                    {
                        path: '/general',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.general_settings' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow general Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'general_settings' );
                            }
                        }
                    },
                    {
                        path: '/lab_devices_certificates',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.lab_devices_certificates' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow Lab Devices Certificates Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'lab_devices_certificates' );
                            }
                        }
                    },
                    {
                        path: '/shift_patients',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'InvoiceMojit.shift_patients' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow Shift Patients Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'shift_patients' );
                            }
                        }
                    }
                ]
            } );

            self.router = router;

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( 'invoiceadmin#' );
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
        'NavBarHeader',
        'doccirrus',
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
        'KoUI-all',
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
        'DunningSchemeModel',
        'dcmanualsendsmodel',
        'dcerrortable',
        'activitysettings-api',
        'dcvat',
        'dcinvoicelogmodal',
        'dcinvoiceerrorlogmodal',
        'dcinvoicelogapprovemodal',
        'edmp-commonutils',
        'ItemsTabFactory',
        'DeliverySettingsModel',
        'InvoiceConfigurationModel'
    ]
} );
