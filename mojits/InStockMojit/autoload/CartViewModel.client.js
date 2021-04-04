/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'CartViewModel', function( Y ) {
        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            InStockMojitViewModel = KoViewModel.getConstructor( 'InStockMojitViewModel' ),
           // KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            ordersTable,
            statuses = Y.doccirrus.schemas.stockorders.stockStatuses,
            isReloading = false,
            InStockOrdersTableViewModel = KoViewModel.getConstructor( 'InStockOrdersTableViewModel');

        /**
         * @constructor
         * @class CartiewModel
         * @extends InStockMojitViewModel
         */
        function CartViewModel( config ) {
            CartViewModel.superclass.constructor.call( this, config );
        }

        CartViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CartViewModel, InStockMojitViewModel, {
            templateName: 'CartViewModel',
            /** @protected */
            initializer: function( config ) {
                var
                    self = this;
                self.enabledActionButtons = [
                    {
                        status: null,
                        buttons: ['create']
                    },
                    {
                        status: statuses.created,
                        buttons: ['create', 'send', 'remove', 'createFrom']
                    },
                    {
                        status: statuses.sent,
                        buttons: ['arrive', 'createFrom']
                    },
                    {
                        status: statuses.arrived,
                        buttons: ['fulfill', 'createFrom']
                    },
                    {
                        status: statuses.archived,
                        buttons: ['createFrom']
                    }
                ];
                self.actionButtonsList = ['create', 'remove', 'send', 'arrive', 'createFrom'];
                self.selectedItem = ko.observable( null );

                self.initOrdersTable();
                self.initActionButtons();
                self.initObservables();
                self.initSubscribe();

                if ( config.orderId ) {
                    Y.doccirrus.modals.newOrderDialog.showDialog( { orderId: config.orderId }, self.reloadTable );
                }

            },
            /** @protected */
            destructor: function() {
                var
                    self = this;
                self.ordersTableModel.destroy();
            },
            actionButtons: null,
            initActionButtons: function() {
                var
                    self = this;
                self.actionButtons = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                    create: {
                        action: function() {
                            Y.doccirrus.modals.newOrderDialog.showDialog( {}, self.reloadTable );
                        },
                        enabled: true,
                        visible: true
                    },
                    remove: {
                        action: function() {
                              Y.doccirrus.jsonrpc.api.stockordersrequest.removeOrder({data : unwrap(self.selectedOrder)})
                                .done(function( ) {
                                    self.reloadTable();
                                })
                                .fail(function( error ) {
                                    self.showError(error);
                                });
                        },
                        enabled: false,
                        visible: true
                    },
                    send: {
                        action: function() {
                            var order = unwrap(self.selectedOrder);
                            Y.doccirrus.modals.sendOrderProgressDialog.showDialog({onModalShow: onModalShow, stocksCount: order.stocks.length});

                            function onModalShow(  ) {
                                Y.doccirrus.jsonrpc.api.stockordersrequest.sendOrder( {data: {_id: order._id}} )
                                    .done(function( ) {
                                        self.reloadTable();
                                    })
                                    .fail(function( error ) {
                                        self.showError(error);
                                    });
                            }

                        },
                        enabled: false,
                        visible: true
                    },
                    arrive: {
                        action: function() {
                            var order = unwrap( self.selectedOrder );
                            Y.doccirrus.jsonrpc.api.stockdelivery.createDeliveryFromOrder( {
                                data: {
                                    orderId: order._id
                                }
                            } )
                                .fail(function( error ) {
                                    self.showError(error);
                                } );
                        },
                        enabled: false,
                        visible: false
                    },
                    createFrom: {
                        action: function() {
                            var order = unwrap(self.selectedOrder);
                            Y.doccirrus.jsonrpc.api.stockordersrequest.saveAsNew( {data: {_id: order._id}} )
                                .done(function( ) {
                                    self.reloadTable();
                                })
                                .fail(function( error ) {
                                    self.showError(error);
                                });
                        },
                        enabled: false,
                        visible: true
                    }
                } );

                self.actionButtons.buttonCreateI18n = i18n( "InStockMojit.buttons.create" );
                self.actionButtons.buttonSendI18n = i18n( "InStockMojit.buttons.send" );
                self.actionButtons.buttonFulfillI18n = i18n( "InStockMojit.buttons.approve" );
                self.actionButtons.buttonRemoveI18n = i18n( "InStockMojit.buttons.remove" );
                self.actionButtons.buttonArriveI18n = i18n( "InStockMojit.buttons.arrive" );
                self.actionButtons.buttonCreateFromI18n = i18n( "InStockMojit.buttons.createFrom" );
            },
            showError: function( error ) {
                if (error && error.message) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: error.message,
                        window: {
                            width: 'medium',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                        isDefault: false
                                    })
                                ]
                            }
                        }
                    } );
                } else {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                }
            },
            initObservables: function() {
                var
                    self = this;

                self.selectedOrder = ko.observable( null );
            },
            initSubscribe: function() {
                var
                    self = this;

                self.ordersTable.getComponentColumnCheckbox().checked.subscribe( function( selectedOrders ) {
                    var enabledButtonsNames = (_.find(self.enabledActionButtons, {status : null }) || {} ).buttons || [];

                    if( selectedOrders && selectedOrders.length ) {
                        self.selectedOrder( selectedOrders[0] );

                        enabledButtonsNames =  (_.find(self.enabledActionButtons, {status : selectedOrders[0].status }) || {}).buttons || [];

                        self.actionButtonsList.forEach(function( buttonName ) {
                            if (enabledButtonsNames.indexOf(buttonName) > -1) {
                                self.actionButtons[buttonName].enabled(true);
                            } else {
                                self.actionButtons[buttonName].enabled(false);
                            }
                        });
                    } else {
                        self.actionButtonsList.forEach(function( buttonName ) {
                            if (buttonName === 'create') {
                                self.actionButtons[buttonName].enabled(true);
                            } else {
                                self.actionButtons[buttonName].enabled(false);
                            }
                        });
                    }
                } );

                self.ordersTableModel.selectedItem.subscribe(function(item) {
                    self.selectedItem(item);
                });
            },
            initOrdersTable: function() {
                var
                    self = this;
                self.ordersTableModel = new InStockOrdersTableViewModel({
                    eventsToSubscribe: [{
                        event: 'statusChangeOrdersAction',
                        handlerId: 'ordersTableHandlerId',
                        done: self.reloadTable
                    }],
                    columns: {
                        status: {
                            isFilterable: true,
                            isSortable: true,
                            notClickableStatus: statuses.arrived
                        }
                    },
                    onRowClick: function( meta ) {
                        var
                            row = meta.row,
                            colName = meta.col.forPropertyName,
                            columnCheckBox = ordersTable.getComponentColumnCheckbox();
                        if( colName === 'status' ) {
                           if (row.status !== statuses.arrived) {
                                Y.doccirrus.modals.newOrderDialog.showDialog( {
                                    orderId: row._id,
                                    status: row.status,
                                    form: row.form
                                }, self.reloadTable );
                                return;
                           }
                        }
                        columnCheckBox.checkItemsByProperty( [row._id] );
                        self.ordersTableModel.selectItem( row );
                    }
                });
                self.ordersTable = ordersTable = self.ordersTableModel.ordersTable;
            },
            reloadTable: function() {
                var columnCheckBox = ordersTable.getComponentColumnCheckbox(),
                    selected = columnCheckBox.checked(),
                    ids = Array.isArray( selected ) && selected.length ? [selected[0]._id] : selected;

                if( isReloading ) {
                    return;
                }

                columnCheckBox.uncheckAll();
                isReloading = true;

                ordersTable.reload( {
                    done: function() {
                        columnCheckBox.checkItemsByProperty( ids );
                    },
                    always: function() {
                        isReloading = false;
                    }
                } );
            }
        }, {
            NAME: 'CartViewModel',
            ATTRS: {}
        } );

        KoViewModel.registerConstructor( CartViewModel );
    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'InStockMojitViewModel',
            'dcorderdialog',
            'stockorders-schema',
            'InStockOrdersTableViewModel',
            'sendOrderProgressDialog'
        ]
    } );