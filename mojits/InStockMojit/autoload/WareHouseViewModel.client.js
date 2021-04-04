/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'WareHouseViewModel', function( Y ) {
        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            InStockMojitViewModel = KoViewModel.getConstructor( 'InStockMojitViewModel' ),
            i18n = Y.doccirrus.i18n,
            WareHouseAdvancedFilterViewModel = KoViewModel.getConstructor( 'WareHouseAdvancedFilterViewModel' ),
            unwrap = ko.unwrap,
            SelectedWareHouseItemViewModel = KoViewModel.getConstructor( 'SelectedWareHouseItemViewModel' );

        /**
         * @constructor
         * @class WareHouseViewModel
         * @extends InStockMojitViewModel
         */
        function WareHouseViewModel() {
            WareHouseViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( WareHouseViewModel, InStockMojitViewModel, {
            templateName: 'WareHouseViewModel',
            /** @protected */
            initializer: function WareHouseViewModel_initializer() {
                var self = this;
                self.selectedItem = ko.observable( null );
                self.advancedFilter = new WareHouseAdvancedFilterViewModel();
                self.filterQuery = ko.observable( "" );
                self.enableSaveButton = ko.observable( true );
                self.enableStocklistButton = ko.observable( true );
                self.isUpdating = ko.observable( false );
                self.displayDetails = ko.observable( false );
                self.inStockBinder = null;
                self.stockListViewModel = null;
                self.initTexts();
                self.createDataTable();
                self.initSubscribe();
                self.moreThanZero = ko.observable( false );
                self.allArticles = ko.observable( false );
                self.lessThanMinQ = ko.observable( false );
            },
            initSubscribe: function WareHouseViewModel_initSubscribe() {
                var
                    self = this;

                self.advancedFilter.query.subscribe( function( query ) {
                    self.filterQuery( query );
                } );
            },
            selectItem: function WareHouseViewModel_selectItem( item, isItemFromCatalog, update ) {
                var self = this,
                    currentItem = unwrap( self.selectedItem );
                item.isSupplierReadOnly = true;
                if( !update && currentItem && unwrap( currentItem.phPZN ) === item.phPZN && unwrap( currentItem.stockLocationId ) === item.stockLocationId ) {
                    self.displayDetails( false );
                    self.selectedItem( {} );
                    return;
                }

                if( isItemFromCatalog && item ) {
                    item.description = item.phDescription;
                    item.gtinCode = item.phGTIN;
                    item.phPriceSaleCatalog = item.phPriceSale;
                    item.phPriceCostCatalog = item.phPriceCost;
                    item.vatTypeCatalog = item.vatType;
                    item.isSupplierReadOnly = false;
                    item.isItemFromCatalog = true;
                }

                // If SelectedItem in the MedIndexCatalogTable, then get phPriceSale and phPriceCost from existing item
                return new Promise( function( resolve ) {
                    if( isItemFromCatalog && item ) {
                        Y.doccirrus.jsonrpc.api.instock.read( {
                            query: {
                                phPZN: unwrap( item.phPZN ),
                                gtinCode: unwrap( item.gtinCode )
                            }
                        } ).done( function( result ) {
                            if( result && result.data && result.data[0] ) {
                                // if instock item hasPrice Cost different from Catalog update
                                if( result.data[0].phPriceCost) {
                                    item.phPriceCost = result.data[0].phPriceCost;
                                    item.phPriceCostFromInstock = true;
                                }

                                if( result.data[0].phPriceSale) {
                                    item.phPriceSale = result.data[0].phPriceSale;
                                    item.phPriceSaleFromInstock = true;
                                }
                            }
                            resolve();
                        } );
                    } else {
                        resolve();
                    }
                } )
                    .then( function() {
                        var selectedItemModel = new SelectedWareHouseItemViewModel( {
                            data: item,
                            readOnlyFields: ['phPZN']
                        } );
                        //  selectedItemModel.notes("");
                        self.enableSaveButton = ko.computed( function() {
                            return unwrap( selectedItemModel.isValid ) && !unwrap( self.isUpdating );
                        } );

                        self.selectedItem( selectedItemModel );
                        self.displayDetails( true );
                    } );
            },
            createStockList: function() {
                var self = this,
                    binder = self.get( 'binder' ),
                    navItem = binder.navigation.items().find( function ( item ) {
                        return item.name() === "stocklist";
                    } ),
                    router = binder.get( 'router' ),
                    query = self.advancedFilter.query();
                binder.query = query;
                self.enableStocklistButton( false );
                router.save( 'stocklist' );
                navItem.visible( true );
            },
            cancelEdit: function WareHouseViewModel_cancelEdit() {
                var
                    self = this,
                    originalData = unwrap( self.selectedItem ).initialConfig;
                self.selectItem( originalData.data, false, true );
            },
            initTexts: function WareHouseViewModel_initTexts() {
                var self = this;
                self.buttonSaveI18n = i18n( 'general.button.SAVE' );
                self.buttonCancelI18n = i18n( 'general.button.CANCEL' );
                self.buttonDeleteI18n = i18n( 'general.button.DELETE' );
                self.createButtonI18n = i18n( "InStockMojit.buttons.create" );
                self.createManuallyButtonI18n = i18n( "InStockMojit.buttons.createManually" );
                self.createStockListButtonI18n = i18n( "InStockMojit.buttons.createStockList" );
                self.medindexButtonI18n = i18n( "InStockMojit.buttons.medindex" );
                self.medCatalogI18n = i18n( 'InStockMojit.newOrderModal.medCatalog' );
                self.addButtonI18n = i18n( "InStockMojit.buttons.add" );
                self.equalsCatalogPrice = i18n( "InStockMojit.messages.equalsCatalogPrice" );
                self.priceCalculation = i18n( "InStockMojit.messages.priceCalculation" );
            },
            updateRecord: function WareHouseViewModel_updateRecord( $data ) {
                var self = this;
                self.isUpdating( true );
                Y.doccirrus.jsonrpc.api.instockrequest.updateWares( {
                    data: $data
                } )
                    .done( function() {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_contacts-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        self.wareHouseTable.reload();
                        self.isUpdating( false );
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        self.isUpdating( false );
                    } );
            },
            deleteRecord: function WareHouseViewModel_deleteRecord( $data ) {
                var self = this,
                    orderNo,
                    item = $data.toJSON();
                self.isUpdating( true );


                // If item is in order dont allow deletion
                Y.doccirrus.jsonrpc.api.stockorders.read( {
                    query: {
                        stocks: {$elemMatch: {references: item._id}},
                        status: "sent"
                    }
                } )
                    .done( function( result ) {
                        if( result && result.data.length ) {
                            orderNo = result.data.map(function(order){
                                return order.orderNo;
                            }).join(', ');

                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'general.message.ARTICLE_ORDERED', {data: {orderNo: orderNo}} ),
                                window: {width: 'medium'}
                            } );
                            self.wareHouseTable.reload();
                            self.displayDetails( false );
                            self.isUpdating( false );
                            return;
                        } else {
                            checkDeliveries(item);
                        }
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        self.isUpdating( false );
                    } );

                // If item is in delivery and not eet booked into system dont allow deletion
                function checkDeliveries( item ) {
                    Y.doccirrus.jsonrpc.api.stockdelivery.read( {
                        query: {
                            stocks: {$elemMatch: {references: item._id}},
                            status: "arrived"
                        }
                    } )
                        .done( function( result ) {
                            if( result && result.data.length ) {
                                orderNo = result.data.map(function(order){
                                    return order.orderNo;
                                }).join(', ');

                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: i18n( 'general.message.ARTICLE_DELIVERED', {data: {orderNo: orderNo}} ),
                                    window: {width: 'medium'}
                                } );
                                self.wareHouseTable.reload();
                                self.displayDetails( false );
                                self.isUpdating( false );
                                return;
                            } else {
                                checkQuantity(item);
                            }
                        } )
                        .fail( function( err ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            self.isUpdating( false );
                        } );
                }

                // If item has quantity display warning
                function checkQuantity(item) {
                    if( parseFloat( item.quantity ) > 0 ) {
                        Y.doccirrus.DCWindow.confirm( {
                            message: i18n( 'general.message.ARTICLE_HAS_QUANTITY', {data: {quantity: item.quantity}} ),
                            callback: function( confirm ) {
                                if( confirm.success ) {
                                    deleteItem( item );
                                }
                            }
                        } );
                    } else {
                        deleteItem( item );
                    }
                }

                function deleteItem(item) {

                    item.isDeleted = true;
                    // reset quantity, quantityOrdered, minimumQuantity
                    item.quantityOrdered = 0;
                    item.quantity = 0;
                    item.minimumQuantity = 0;
                    Y.doccirrus.jsonrpc.api.instockrequest.updateWares( {
                        data: item
                    } )
                        .done( function() {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'tab_contacts-save',
                                content: i18n( 'general.message.ARTICLE_DELETED' )
                            } );
                            self.displayDetails( false );
                            self.wareHouseTable.reload();
                            self.isUpdating( false );
                        } )
                        .fail( function( err ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            self.isUpdating( false );
                        } );
                }

            },
            createDataTable: function WareHouseViewModel_createDataTable() {
                var self = this,
                    floatFilterField;

                floatFilterField = {
                    componentType: 'KoField',
                    valueType: 'float',
                    renderer: function( observable, value ) {
                        observable( value === 0 ? 0 : value || "" );
                    }
                };

                self.wareHouseTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-warehousetable',
                        states: ['limit', 'usageShortcutsVisible'],
                        limit: 20,
                        limitList: [10, 20, 30, 40, 50],
                        remote: true,
                        fillRowsToLimit: false,
                        rowPopover: false,
                        responsive: false,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWares,
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'wareHouseTableHandlerId'
                            }],
                        baseParams: {
                            query: ko.pureComputed( function() {
                                var filterQuery = unwrap( self.filterQuery );
                                return filterQuery;
                            } )
                        },
                        columns: [
                            {
                                componentType: 'KoTableColumnNumbering',
                                forPropertyName: 'KoTableColumnNumbering'
                            },
                            {
                                forPropertyName: 'quantityOrdered',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
                            },
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'gtinCode',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.GTIN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.GTIN' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'description',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phPriceCost',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField,
                                renderer: function( meta ) {
                                    var phCost = unwrap( meta.value );
                                    return Y.doccirrus.schemas.instock.getSwissPriceString( phCost );
                                }
                            },
                            {
                                forPropertyName: 'phPriceSale',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField,
                                renderer: function( meta ) {
                                    var
                                        phSale = unwrap( meta.value );
                                    return Y.doccirrus.schemas.instock.getSwissPriceString( phSale );
                                }
                            },
                            {
                                forPropertyName: 'quantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField,
                                renderer: function( meta ) {
                                    if( meta.value ) {
                                        return meta.value.toFixed( 2 );
                                    }
                                    return meta.value;
                                }
                            },
                            {
                                forPropertyName: 'minimumQuantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
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
                                forPropertyName: 'location.locname',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'stockLocation.title',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            self.selectItem( row );
                        }
                    }
                } );

            },
            showNewItemDialog: function() {
                Y.doccirrus.modals.newInStockItemDialog.showDialog();
            },
            showMedIndexDialog: function() {
                var self = this,
                    existingTableItemsAndCallback = {};
                existingTableItemsAndCallback.wareHouseTableReload = function() {
                    self.wareHouseTable.reload();
                };

                Y.doccirrus.jsonrpc.api.instockrequest.getWares({data: {includeDeleted: true} })
                    .done( function( response ) {
                        existingTableItemsAndCallback.existingWareHouseItems = response.data;
                        var catalogDialog = Y.doccirrus.modals.medIndexDialog;
                        catalogDialog.showDialog( existingTableItemsAndCallback );
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        self.isUpdating( false );
                    } );
            },

            /** @protected */
            destructor: function WareHouseViewModel_destructor() {

            }

        }, {
            NAME: 'WareHouseViewModel'
        } );

        KoViewModel.registerConstructor( WareHouseViewModel );
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
            'instock-schema',
            'SelectedWareHouseItemViewModel',
            'WareHouseAdvancedFilterViewModel',
            'dcnewinstockitemdialog',
            'StockListViewModel',
            'DCRouter',
            'DCBinder',
            'MedIndexDialog'
        ]
    } );