/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InStockMojitBinder',
    function( Y, NAME ) {
        'use strict';
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CartViewModel = KoViewModel.getConstructor( 'CartViewModel' ),
            WareHouseViewModel = KoViewModel.getConstructor( 'WareHouseViewModel' ),
            DeliveryViewModel = KoViewModel.getConstructor( 'DeliveryViewModel'),
            StockListViewModel = KoViewModel.getConstructor( 'StockListViewModel'),
            InventoryViewModel = KoViewModel.getConstructor( 'InventoryViewModel'),
            InStockConfigurationViewModel = KoViewModel.getConstructor( 'InStockConfigurationViewModel'),
            peek = ko.utils.peekObservable,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,

            TABS = {
                orders: 'orders',
                warehouse: 'warehouse',
                inventory: 'inventory',
                delivery: 'delivery',
                stocklist: 'stocklist',
                settings: 'settings'
            };

        /**
         * @class InStockMojitBinder
         * @extends Y.doccirrus.DCBinder
         * @param   {Object}    config
         * @constructor
         */
        function InStockMojitBinder( config ) {
            InStockMojitBinder.superclass.constructor.call( this, config );
        }

        Y.extend( InStockMojitBinder, Y.doccirrus.DCBinder, {
            initializer: function() {
                var
                    self = this;

                self.initObservables();
                self.textCurrentPatientI18n = i18n( 'InCaseMojit.text.currentPatient' );

            /**
             * The current view is displayed as full screen
             */
             Y.doccirrus.DCBinder.initToggleFullScreen();
            },
            /** @private */
            destructor: function() {},
            initObservables: function() {
                var
                    self = this,
                    currentView = ko.observable( null );
                self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

                self.currentView = ko.computed( {
                    read: currentView,
                    write: function( value ) {
                        if( value !== peek( currentView ) ) {
                            currentView( value );
                        }
                    }
                } );

                self.stocklistNavItem = null;
                self.query = null;
            },
            setupNavigation: function() {
                var
                    self = this,
                    inStockNav,
                    rootPath = Y.doccirrus.utils.getUrl( 'inStockMojit' ),
                    navigation = self.get( 'navigation' );

                if ( Y.doccirrus.auth.isAdmin() || Y.doccirrus.auth.memberOf( 'SUPPORT') ) {
                    inStockNav = Y.doccirrus.ItemsTabFactory.createInStockNavItems( {
                        rootPath: rootPath
                    } );
                } else {
                    inStockNav = Y.doccirrus.ItemsTabFactory.createInStockNavItems( {
                        rootPath: rootPath
                    }, ['orders', 'delivery', 'warehouse', 'stocklist', 'settings']);
                }
                navigation.addItems( inStockNav );
                self.stocklistNavItem = navigation.items().find(function(item){return item.name() === "stocklist";});
                self.stocklistNavItem.visible(false);

            },
            setupRouter: function() {
                var
                    self = this,
                    router = self.get( 'router' ),
                    routes = [
                        {
                            routeId: 'orders',
                            path: '/',
                            callbacks: Y.bind( self.route_orders, self )
                        },
                        {
                            routeId: 'orders',
                            path: /^\/orders($|\/.*$)/,
                            callbacks: [
                                router.resolvePathAsKeyValue,
                                Y.bind( self.route_orders, self )
                            ]
                        },
                        {
                            routeId: 'warehouse',
                            path: '/warehouse',
                            callbacks: Y.bind( self.route_warehouse, self )
                        },
                        {
                            routeId: 'delivery',
                            path: /^\/delivery($|\/.*$)/,
                            callbacks: [
                                router.resolvePathAsKeyValue,
                                Y.bind( self.route_delivery, self )
                            ]
                        },
                        {
                            routeId: 'stocklist',
                            path: /^\/stocklist($|\/.*$)/,
                            callbacks: [
                                Y.bind( self.route_stocklist, self )
                            ]
                        },
                        {
                            routeId: 'settings',
                            path: /^\/settings($|\/.*$)/,
                            callbacks: [
                                Y.bind( self.route_settings, self )
                            ]
                        }

                    ];

                if (Y.doccirrus.auth.isAdmin() || Y.doccirrus.auth.memberOf( 'SUPPORT')) {
                    routes.push({
                        routeId: 'inventory',
                        path: '/inventory',
                        callbacks: Y.bind( self.route_inventory, self )
                    });
                }

                router.set( 'root', Y.doccirrus.utils.getUrl( 'inStockMojit' ) );
                router.set( 'routes', routes);
            },
            route_orders: function(request) {
                var
                    self = this,
                    config = {},
                    router = self.get( 'router' );
                self.showLoadingMask();

                if( request && request.params ) {
                    if( request.params.orders && typeof request.params.orders === 'string' ) {
                        config.orderId = request.params.orders;
                    }
                }

                if( !config.orderId ) {
                    continueInOrderTab();
                    return;
                }

                Y.doccirrus.jsonrpc.api.stockordersrequest.getOrders( {
                    query: {_id: config.orderId}
                } ).done( function( results ) {
                    results = results.results || results;
                    if( results && results.data && results.data[0] && results.data[0].status === 'arrived' ) {
                        router.save( '/delivery/' + config.orderId );
                    //    router.dispatch();
                    } else {
                        continueInOrderTab();
                    }
                } ).fail( function( error ) {
                    var errors = Y.doccirrus.errorTable.getErrorsFromResponse( error );

                    errors.forEach(function( error ) {
                        error.display('error');
                    });
                } );

                function continueInOrderTab() {
                    Promise
                        .props( {
                            templateCartViewModel: self.useTemplate( {
                                name: 'CartViewModel',
                                path: 'InStockMojit/views/CartViewModel'
                            } )
                        } )
                        .then( function() {
                            var
                                navigation = self.get( 'navigation' ),
                                cartViewModel;
                            cartViewModel = KoViewModel.getViewModel( 'CartViewModel' ) || new CartViewModel( config );
                            self.currentView( cartViewModel );
                            navigation.activateTab( TABS.orders );
                        } )
                        .then( function() {
                            self.hideLoadingMask();
                        }, function( error ) {
                            self.hideLoadingMask();
                            throw error;
                        } )
                        .catch( catchUnhandled );
                }
            },
            route_warehouse: function() {
                var
                    self = this;
                self.showLoadingMask();

                Promise
                    .props( {
                        templateCartViewModel: self.useTemplate( {
                            name: 'WareHouseViewModel',
                            path: 'InStockMojit/views/WareHouseViewModel'
                        } )
                    } )
                    .then( function() {
                        var
                            navigation = self.get( 'navigation' ),
                            cartViewModel;
                        cartViewModel = KoViewModel.getViewModel( 'WareHouseViewModel' ) || new WareHouseViewModel();
                        self.currentView( cartViewModel );
                        navigation.activateTab( TABS.warehouse );
                    } )
                    .then( function() {
                        self.hideLoadingMask();
                    }, function( error ) {
                        self.hideLoadingMask();
                        throw error;
                    } )
                    .catch( catchUnhandled );
            },
            route_inventory: function( ) {
                var
                    self = this;

                Promise
                    .props( {
                        templateCartViewModel: self.useTemplate( {
                            name: 'InventoryViewModel',
                            path: 'InStockMojit/views/InventoryViewModel'
                        } )
                    } )
                    .then( function() {
                        var
                            navigation = self.get( 'navigation' ),
                            inventoryViewModel;
                        inventoryViewModel = KoViewModel.getViewModel( 'InventoryViewModel' ) || new InventoryViewModel();
                        self.currentView( inventoryViewModel );
                        navigation.activateTab( TABS.inventory );
                    } )
                    .then( function() {
                        self.hideLoadingMask();
                    }, function( error ) {
                        self.hideLoadingMask();
                        throw error;
                    } )
                    .catch( catchUnhandled );
            },
            route_stocklist: function( ) {
                var
                    self = this;

                Promise
                    .props( {
                        templateCartViewModel: self.useTemplate( {
                            name: 'StockListViewModel',
                            path: 'InStockMojit/views/StockListViewModel'
                        } )
                    } )
                    .then( function() {
                        var
                            navigation = self.get( 'navigation' ),
                            stockListViewModel;
                            stockListViewModel = KoViewModel.getViewModel( 'StockListViewModel' ) || new StockListViewModel();
                        var currentView = ko.unwrap( self.currentView );
                        if( currentView && currentView.advancedFilter ) {
                            stockListViewModel.initWithParams( currentView.advancedFilter.toObject() );
                        }
                        self.currentView( stockListViewModel );
                        navigation.activateTab( TABS.stocklist );
                    } )
                    .then( function() {
                        self.hideLoadingMask();
                    }, function( error ) {
                        self.hideLoadingMask();
                        throw error;
                    } )
                    .catch( catchUnhandled );
            },
            route_settings: function( ) {
                var
                    self = this;

                Promise
                    .props( {
                        templateCartViewModel: self.useTemplate( {
                            name: 'InStockConfigurationViewModel',
                            path: 'InStockMojit/views/InStockConfigurationViewModel'
                        } )
                    } )
                    .then( function() {
                       return Y.doccirrus.jsonrpc.api.instockconfiguration.read();
                    })
                    .then( function( result ) {
                        var
                            data = result.data || [],
                            navigation = self.get( 'navigation' ),
                            instockConfigurationViewModel;

                        instockConfigurationViewModel = KoViewModel.getViewModel( 'InStockConfigurationViewModel' ) || new InStockConfigurationViewModel( {data: data[0]} );
                        self.currentView( instockConfigurationViewModel );
                        navigation.activateTab( TABS.settings );
                    } )
                    .then( function() {
                        self.hideLoadingMask();
                    }, function( error ) {
                        self.hideLoadingMask();
                        throw error;
                    } )
                    .catch( catchUnhandled );
            },
            route_delivery: function( request ) {
                var
                    self = this,
                    config = {};

                if ( request && request.params ) {
                    if( request.params.delivery && typeof request.params.delivery === 'string' ) {
                        config = {
                            orderId: request.params.delivery
                        };
                    }
                }
                Promise
                    .props( {
                        templateCartViewModel: self.useTemplate( {
                            name: 'DeliveryViewModel',
                            path: 'InStockMojit/views/DeliveryViewModel'
                        } )
                    } )
                        .then( function() {
                            var
                                navigation = self.get( 'navigation' ),
                                deliveryViewModel;
                            deliveryViewModel = KoViewModel.getViewModel( 'DeliveryViewModel' ) || new DeliveryViewModel( config );
                            self.currentView( deliveryViewModel );
                            navigation.activateTab( TABS.delivery );
                        } )
                        .then( function() {
                            self.hideLoadingMask();
                        }, function( error ) {
                            self.hideLoadingMask();
                            throw error;
                        } )
                        .catch( catchUnhandled );
            },
            /**
             * Handler of the toggle full-screen action
             */
            toggleFullScreenHandler() {
                Y.doccirrus.DCBinder.toggleFullScreen();
    
            }
        } );

        Y.namespace( 'mojito.binders' )[NAME] = new InStockMojitBinder( {
            binderName: NAME,
            initialData: {
                vatList: Y.doccirrus.jsonrpc.api.instockrequest
                    .getVatList()
                    .then( function( response ) {
                        return response.data;
                    } )
                    .then( function( data ) {
                        Y.doccirrus.vat.init( data );
                    } )
            }
        } );

    },
    '0.0.1',
    {
        requires: [
            'mojito-client',
            'oop',
            'NavBarHeader',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'DCBinder',
            'DCRouter',
            'promise',
            'ItemsTabFactory',
            'CartViewModel',
            'WareHouseViewModel',
            'DeliveryViewModel',
            'InventoryViewModel',
            'StockListViewModel',
            'InStockConfigurationViewModel',
            'dcvat'
        ]
    }
);
