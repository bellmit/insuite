/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'InventoryViewModel', function( Y ) {
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
         * @class InventoryViewModel
         * @extends InStockMojitViewModel
         */
        function InventoryViewModel() {
            InventoryViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( InventoryViewModel, InStockMojitViewModel, {
            templateName: 'InventoryViewModel',
            /** @protected */
            initializer: function InventoryViewModel_initializer() {
                var self = this;
                self.selectedItem = ko.observable( null );
                self.advancedFilter = new WareHouseAdvancedFilterViewModel();
                self.filterQuery = ko.observable( "" );
                self.enableSaveButton = ko.observable( false );
                self.isUpdating = ko.observable( false );
                self.displayDetails = ko.observable( false );
                self.initTexts();
                self.createDataTable();
                self.initSubscribe();
                self.currentDetailViewSelected = null;
                self.currentRowSelected = null;
                self.isDetailViewOpen = false;
            },
            initSubscribe: function WareHouseViewModel_initSubscribe() {
                var
                    self = this;

                self.advancedFilter.query.subscribe( function( query ) {
                    self.filterQuery( query );
                } );
            },
            selectItem: function InventoryViewModel_selectItem( item, isOpen ) {
                var self = this,
                    currentItem = unwrap( self.selectedItem );
                item.isSupplierReadOnly = true;
                self.currentDetailViewSelected = item;

                if( currentItem && unwrap( currentItem.phPZN ) === item.phPZN && unwrap( currentItem.stockLocationId ) === item.stockLocationId && !isOpen ) {
                    self.displayDetails( false );
                    self.selectedItem( {} );
                    return;
                }

                var selectedItemModel = new SelectedWareHouseItemViewModel( {
                    data: item, readOnlyFields: [
                        'phPZN',
                        'gtinCode',
                        'description',
                        'phPriceSale',
                        'phPriceCost',
                        'phPackSize',
                        'phUnit',
                        'vat',
                        'minimumQuantity',
                        'supplier',
                        'quantity',
                        'quantityOrdered',
                        "locationId",
                        "stockLocationId",
                        "notes",
                        "isDivisible",
                        "divisibleCount",
                        "prdNo",
                        'ingredients',
                        'supplyCategory',
                        'automaticReorder',
                        'articleCategory'
                    ]
                } );

                self.selectedItem( selectedItemModel );
                self.displayDetails( true );
            },
            initTexts: function InventoryViewModel_initTexts() {
                var self = this;
                self.buttonSaveI18n = i18n( 'general.button.SAVE' );
                self.createButtonI18n = i18n( "InStockMojit.buttons.create" );
            },
            createDataTable: function InventoryViewModel_createDataTable() {
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
                        responsive: false,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWares,
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'wareHouseTableHandlerId',
                                done: function() {
                                    self.wareHouseTable.reload( {
                                            done: function() {
                                                var rows = unwrap( self.wareHouseTable.rows ),
                                                    newRow;
                                                if( self.currentDetailViewSelected ) {
                                                    newRow = rows.find( function( row ) {
                                                        return unwrap( row.phPZN ) === self.currentDetailViewSelected.phPZN && unwrap( row.stockLocationId ) === self.currentDetailViewSelected.stockLocationId;
                                                    } );
                                                    if( newRow ) {
                                                        self.selectItem( newRow, true );
                                                    }
                                                }
                                            }
                                        }
                                    );
                                }
                            }],
                        baseParams: {
                            query: ko.pureComputed( function() {
                                return unwrap( self.filterQuery );
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
                                    var phSale = unwrap( meta.value );
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
            /** @protected */
            destructor: function InventoryViewModel_destructor() {

            }

        }, {
            NAME: 'InventoryViewModel'
        } );

        KoViewModel.registerConstructor( InventoryViewModel );
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
            'dcnewinstockitemdialog'
        ]
    } );