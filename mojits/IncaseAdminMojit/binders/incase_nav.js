/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'IncaseAdminMojitBinderIndex', function( Y, NAME ) {
    "use strict";
    var
        catchUnhandled = Y.doccirrus.promise.catchUnhandled;
    /**
     * The IncaseAdminMojitBinderIndex module.
     *
     * @module IncaseAdminMojitBinderIndex
     */

    /**
     * Constructor for the IncaseAdminMojitBinderIndex class.
     *
     * @class IncaseAdminMojitBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'IncaseAdminMojit',

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
            Y.doccirrus.DCBinder.initToggleFullScreen();

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'incase' );

            this.node = node;
            Y.doccirrus.catalogmap.init( this.mojitProxy.pageData.get( 'catalog-descriptors' ) );
            this._initSubNavigation();

        },

        /**
         * initialize main sub navigation
         * @private
         */
        _initSubNavigation: function() {
            var
                self = this,
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                rootPath = Y.doccirrus.utils.getUrl( 'incase' ),
                aSubNavigationModel,
                router,
                fullScreenToggle = {
                    toggleFullScreenHandler() {
                        Y.doccirrus.DCBinder.toggleFullScreen();
                    },
                    viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
                };


            function handleTab( tabName, options ) {
                var node = document.querySelector( "#upperDiv" ),
                    locationList;
                Y.DOM.removeClass( document.body, 'forMarkers' );
                options = options || {};
                if( node ) {
                    ko.cleanNode( node );
                }
                locationList = options.includeLocation ? Promise.resolve( Y.doccirrus.jsonrpc.api.location.read( {} ) )
                    .then( function( response ) {
                        var
                            locations = response.data;
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.invoiceconfiguration.read() )
                            .then( function( response ) {
                                return {
                                    invoiceconfiguration: response.data && response.data[0],
                                    locations: locations
                                };
                            } );
                    } ) : Promise.resolve();

                locationList
                    .then( function( data ) {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries( {
                            query: {
                                catalogShortNames: [ 'MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT' ]
                            }
                        } ) )
                            .then( function( response ) {
                                var
                                    mappings = response && response.data;
                                if( data ) {
                                    data.defaultMappings = mappings;
                                } else {
                                    data = {
                                        defaultMappings: mappings
                                    };
                                }

                                return data;
                            } )
                            .catch( function( error ) {
                                Y.log( 'can not get defaultMappings from MMI' + error.toString(), 'error', NAME );
                                return data;
                            } );

                    }  )
                    .then( function( data ) {
                        return new Promise( function( resolve, reject ) {
                            YUI.dcJadeRepository.loadNodeFromTemplate(
                                tabName,
                                'IncaseAdminMojit',
                                {
                                    locationList: data && data.locations,
                                    invoiceConfig: data && data.invoiceconfiguration,
                                    defaultMappings: data && data.defaultMappings,
                                    confirmKbvUtilityOfficialPrices: options.confirmKbvUtilityOfficialPrices
                                },
                                Y.one( node ),
                                function( err, data ) {
                                    if( err ) {
                                        return reject( err );
                                    }
                                    resolve( data );
                                }
                            );
                        } );
                    } )
                    .then( function() {
                        var
                            tab;
                        tab = self.subNavigation.getItemByName( tabName );

                        if( 'incase_tab_markers' === tabName ) {
                            if( document.body.classList ) {
                                document.body.classList.add( 'forMarkers' );
                            } else {
                                document.body.className += ' forMarkers';
                            }
                        }
                        if( tab ) {
                            tab.active( true );
                        }
                    } )
                    .catch( catchUnhandled );
            }

            aSubNavigationModel = self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: Y.doccirrus.ItemsTabFactory.createInCaseAdminNavItems( { rootPath: rootPath } )
                }
            } );

            ko.applyBindings( aSubNavigationModel, document.querySelector( '#mainIncaseAdminNavigation' ) );
            ko.applyBindings( fullScreenToggle, document.querySelector( '#fullScreenToggle' ) );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_markers' );
                        }
                    },
                    {
                        path: '/markers',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow markers InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_markers' );
                        }
                    },
                    {
                        path: '/catalogs',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow catalogs InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_catalogs', {includeLocation: true, includeInsuranceGroups: true} );
                        }
                    },
                    {
                        path: '/catalogs/kbvutilityprice/confirm',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow catalogs (confirmKbvUtilityOfficialPrices) InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_catalogs', {includeLocation: true, includeInsuranceGroups: true, confirmKbvUtilityOfficialPrices: true} );
                        }
                    },
                    {
                        path: '/activities',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow activities InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_activities' );
                        }
                    },
                    {
                        path: '/configuration',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow configuration InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_configuration', {includeLocation: true} );
                        }
                    },
                    {
                        path: '/shortcuts',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow configuration InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_shortcuts' );
                        }
                    },
                    {
                        path: '/tags',
                        callback: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow configuration InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_tags' );
                        }
                    },
                    {
                        path: '/medLabTags',
                        callback: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow configuration InCase route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_med_lab_tags' );
                        }
                    },
                    {
                        path: '/rules',
                        callbacks: function( req ) {
                            if( Y.doccirrus.auth.hasSectionAccess( 'IncaseAdminMojit.rule_editor' ) ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow rule_editor Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }
                                handleTab( 'rule_editor' );
                            }
                        }
                    },
                    {
                        path: '/patients',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow rule_editor Invoice route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'incase_tab_patients' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( 'incase#' );
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
        'DCBinder',
        'NavBarHeader',
        'event-mouseenter',
        'router',
        'incaseconfiguration-schema',
        'JsonRpcReflection-doccirrus',
        'mojito-client',
        'dcvalidations',
        'dcutils',
        'dcauth',
        'dcutils-uam',
        'dcloadhelper',
        'KoUI-all',
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
        'DocumentationTreeModel',
        'dcactivitysettingsmodel',
        'activitysettings-api',
        'DCWindow',
        'KoViewModel',
        'DCCatalogUsageModal',
        'ShortcutModel',
        'ItemsTabFactory',
        'omimchain-schema',
        'v_omim_chain_editor-schema',
        'v_omim_chain_item_table-schema',
        'KoEditableTable',
        'OmimChainItemModel',
        'dccommonutils',
        'promise',
        'v_kbvutilityprice_editor-schema',
        'tag-schema',
        'activity-schema',
        'dc-comctl',
        'dcRuleSetTree',
        'dcRuleSetEditor',
        'dcRuleSetInspector',
        'dcruleutils',
        'rule-schema',
        'backmapping-modal',
        'dcmedicationmodal',
        'dcRuleImportExport',
        'AdditionalActivitySettingsModal',
        'DcEditLabDataTag',
        'DcEditMedDataTag',
        'insuranceGroupModal',
        'InsuranceGroupPriceModel',
        'CatalogModel_CH',
        'MasterTabConfigModel',
        'createtag-modal'
    ]
} );
