/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _*/
YUI.add( 'DeliveryViewModel', function( Y ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            InStockMojitViewModel = KoViewModel.getConstructor( 'InStockMojitViewModel' ),
            i18n = Y.doccirrus.i18n,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            isReloading = false,
            statuses = Y.doccirrus.schemas.stockorders.stockStatuses,
            deliveryTable;

        /**
         * @constructor
         * @class DeliveryViewModel
         * @extends InStockMojitViewModel
         */
        function DeliveryViewModel( config ) {
            DeliveryViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( DeliveryViewModel, InStockMojitViewModel, {
            templateName: 'DeliveryViewModel',
            /** @protected */
            initializer: function DeliveryViewModel_initializer(config) {
                var self = this;
                self.selectedDelivery = ko.observable( null );
                self.filterDelivery = ko.observable( true );
                self.initLabels();
                self.createDataTable();
                self.initSubscribe();
                self.initSocketListeners();
                self.initActionButtons();

                if ( config.orderId ) {
                    Y.doccirrus.modals.newOrderDialog.showDialog( { orderId: config.orderId, source: 'delivery', getDeliveryByOrderId: true }, self.reloadTable );
                }
            },
            initSocketListeners: function DeliveryViewModel_iinitSocketListeners() {
                var
                    self = this;

                Y.doccirrus.communication.on( {
                    event: 'statusChangeDeliveryAction',
                    handlerId: 'deliveryStatusListener',
                    done: function() {
                        self.reloadTable();
                    }
                } );
            },
            initSubscribe: function DeliveryViewModel_initSubscribe() {
                var
                    self = this;

                self.deliveryTable.getComponentColumnCheckbox().checked.subscribe( function( selectedOrders ) {
                    self.selectedDelivery( selectedOrders[0] || null );
                    if( selectedOrders[0] ) {
                        self.actionButtons.booking.enabled( true );
                    } else {
                        self.actionButtons.booking.enabled( false );
                    }

                } );
            },
            initLabels: function DeliveryViewModel_initTexts() {
                var
                    self = this;
                self.filterDeliveryI18n = i18n( 'InStockMojit.newOrderModal.filterDelivery' );
            },
            selectItem: function DeliveryViewModel_selectItem( item ) {
                var
                    self = this;
                self.selectedDelivery( item );
            },
            createDataTable: function DeliveryViewModel_createDataTable() {
                var
                    self = this,
                    dateFormat = i18n( 'general.TIMESTAMP_FORMAT' );

                self.deliveryTable = deliveryTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-deliverylist',
                        states: ['limit', 'usageShortcutsVisible'],
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50],
                        responsive: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy:  Y.doccirrus.jsonrpc.api.stockdelivery.getDeliveries,

                        eventsToSubscribe: [
                            {
                                event: 'stockDeliveryAction',
                                handlerId: 'deliveryTableHandlerId',
                                done: self.reloadTable
                            }],
                        baseParams: self.addDisposable( ko.computed(function(  ) {

                            var filterOutDelivered = ko.unwrap(self.filterDelivery);
                            if (filterOutDelivered) {
                                return  {query: {$and: [{'status': {'$ne': statuses.archived}} ]}};
                            } else {
                                return {query: {}};
                            }
                        })),
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: true
                            },
                            {
                                forPropertyName: 'supplier.content',
                                label: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                title: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'status',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderStatus' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderStatus' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.stockorders.types.OrderStatuses_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {

                                    var
                                        value = _.find( Y.doccirrus.schemas.stockorders.types.OrderStatuses_E.list, {val: meta.value} ).i18n;
                                    return "<a href='#'>" + value || "" + "</a>";
                                }
                            },
                            {
                                forPropertyName: 'mediaId',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.mediaId' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.mediaId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    if( !meta.value ) {
                                        return "";
                                    }
                                    var url = '/media/' + meta.value;
                                    url = Y.doccirrus.infras.getPrivateURL( url );

                                    return '<a href="' + url + '" target="_blank">PDF</a> &nbsp;';
                                }
                            },
                            {
                                forPropertyName: 'dateCreated',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateCreated' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateCreated' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },
                            {
                                forPropertyName: 'dateArrived',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArrived' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArrived' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if( !meta.value ) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },
                            {
                                forPropertyName: 'dateSent',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateSent' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateSent' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if( !meta.value ) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },
                            {
                                forPropertyName: 'dateClosed',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateClosed' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateClosed' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if( !meta.value ) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },
                            {
                                forPropertyName: 'dateArchived',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArchived' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArchived' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if( !meta.value ) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },

                            {
                                forPropertyName: "totalOrderedQuantity",
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.totalOrderedQuantity' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.totalOrderedQuantity' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: {
                                    componentType: 'KoField',
                                    valueType: 'float',
                                    renderer: function( observable, value ) {
                                        observable( value === 0 ? 0 : value || "" );
                                    }
                                }
                            },
                            {
                                forPropertyName: 'orderNo',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderNo' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderNo' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.IN_OPERATOR,
                                filterField: {
                                    componentType: 'KoField',
                                    renderer: function( observable, value ) {
                                        observable( value === 0 ? 0 : value || "" );
                                    }
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row,
                                colName = meta.col.forPropertyName,
                                columnCheckBox = deliveryTable.getComponentColumnCheckbox();

                            if( colName === 'status' ) {
                                Y.doccirrus.modals.newOrderDialog.showDialog( {
                                        orderId: row._id,
                                        status: row.status,
                                        form: row.form,
                                        source: 'delivery'
                                    },
                                    self.reloadTable
                                );
                                return;
                            }
                            columnCheckBox.checkItemsByProperty( [row._id] );
                            self.selectItem( row );
                        }
                    }
                } );

            },
            initActionButtons: function DelivertViewModel_initActionButtons() {
                var
                    self = this;

                self.actionButtons = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                    createFrom: {
                        action: function() {
                            Y.doccirrus.modals.selectOrderDialog.showDialog( {callback: self.createDeliveryFromOrder} );
                        },
                        enabled: true,
                        visible: true
                    },
                    booking: {
                        action: function( ) {
                            var delivery = ko.unwrap( self.selectedDelivery );
                            if (delivery && delivery._id) {
                                Y.doccirrus.modals.newOrderDialog.showDialog( {
                                        orderId: delivery._id,
                                        status: delivery.status,
                                        form: delivery.form,
                                        source: 'delivery'
                                    },
                                    self.reloadTable
                                );
                            }
                        },
                        enabled: ko.observable(false),
                        visible: true
                    },
                    fulfill: {
                        action: function() {
                            var delivery = ko.unwrap( self.selectedDelivery );
                            if( delivery && delivery._id ) {
                                Y.doccirrus.jsonrpc.api.stockdelivery.archiveOrder( {
                                    data: {
                                        _id: delivery._id
                                    }
                                } )
                                    .done( function() {
                                    } )
                                    .fail( function( error ) {
                                        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( error );

                                        errors.forEach( function( error ) {
                                            error.display( 'error' );
                                        } );
                                    } );
                            }
                        },
                        enabled: true,
                        visible: true
                    }
                } );

                self.actionButtons.buttonBookingI18n = i18n( "InStockMojit.buttons.book" );
                self.actionButtons.buttonCreateFromI18n = i18n( "InStockMojit.buttons.delivery" );
                self.actionButtons.buttonFulfillI18n = i18n( "InStockMojit.buttons.approve" );
            },
            createDeliveryFromOrder: function DelivertViewModel_createDeliveryFromOrder( id ) {
                Y.doccirrus.jsonrpc.api.stockdelivery.createDeliveryFromOrder( {
                    data: {
                        orderId: id
                    }
                } )
                    .fail( function( error ) {
                        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( error );

                        errors.forEach(function( error ) {
                            error.display('error');
                        });
                    } );
            },
            reloadTable: function DelivertViewModel_relodTable() {
                var
                    columnCheckBox = deliveryTable.getComponentColumnCheckbox(),
                    selected = columnCheckBox.checked(),
                    ids = Array.isArray( selected ) && selected.length ? [selected[0]._id] : selected;

                if( isReloading ) {
                    return;
                }

                columnCheckBox.uncheckAll();
                isReloading = true;

                deliveryTable.reload( {
                    done: function() {
                        columnCheckBox.checkItemsByProperty( ids );
                    },
                    always: function() {
                        isReloading = false;
                    }
                } );
            },
            /** @protected */
            destructor: function DeliveryViewModel_destructor() {
                Y.doccirrus.communication.off( 'statusChangeDeliveryAction', 'deliveryStatusListener' );
            }

        }, {
            NAME: 'DeliveryViewModel'
        } );

        KoViewModel.registerConstructor( DeliveryViewModel );
    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'InStockMojitViewModel',
            'promise',
            'KoViewModel',
            'KoUI-all',
            'JsonRpcReflection-doccirrus',
            'DCWindow',
            'JsonRpc',
            'stockdelivery-schema',
            'dcnewinstockitemdialog',
            'dcSelectOrderDialog',
            'dcorderdialog'
        ]
    } );