/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'StockListViewModel', function( Y ) {
        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            InStockMojitViewModel = KoViewModel.getConstructor( 'InStockMojitViewModel' ),
            i18n = Y.doccirrus.i18n,
            WareHouseAdvancedFilterViewModel = KoViewModel.getConstructor( 'WareHouseAdvancedFilterViewModel' ),
            unwrap = ko.unwrap;

        /**
         * @constructor
         * @class StockListViewModel
         * @extends InStockMojitViewModel
         */
        function StockListViewModel() {
            StockListViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( StockListViewModel, InStockMojitViewModel, {
            templateName: 'StockListViewModel',
            /** @protected */
            initializer: function StockListViewModel_initializer() {
                var self = this;
                self.advancedFilter = new WareHouseAdvancedFilterViewModel();
                self.filterQuery = ko.observable( "" );
                self.createDataTable();
                self.initSubscribe();
                self.initText();
            },
            initSubscribe: function StockListViewModel_initSubscribe() {
                var
                    self = this;

                self.advancedFilter.query.subscribe( function( query ) {
                    self.filterQuery( query );
                } );
            },
            initText: function StockListViewModel_initText() {
            },
            initWithParams: function StockListViewModel_initwithParams(params) {
                var self = this;
                self.advancedFilter.allArticles(params.allArticles);
                self.advancedFilter.moreThanZero(params.moreThanZero);
                self.advancedFilter.lessThanMinQ(params.lessThanMinQ);
            },
            createDataTable: function StockListViewModel_createDataTable() {
                var self = this,
                    floatFilterField,
                    dateFormat = i18n( 'general.TIMESTAMP_FORMAT' );

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
                        baseParams: {
                            query: ko.pureComputed( function() {
                                return unwrap( self.filterQuery );
                            } )
                        },
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'wareHouseTableHandlerId'
                            }],
                        columns: [
                            {
                                componentType: 'KoTableColumnNumbering',
                                forPropertyName: 'KoTableColumnNumbering'
                            },
                            {
                                forPropertyName: 'gtinCode',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                width: '10%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '10%',
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
                                forPropertyName: 'ingredients',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phPackSize',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPackSize' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPackSize' ),
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
                                    var phSale = unwrap( meta.value );
                                    var phSaleCatalog = unwrap(meta.row.phPriceSaleCatalog);
                                    var icon = phSale === phSaleCatalog ? '<i class="fa fa-info-circle" style="margin-left: 5px;" aria-hidden="true"></i>' : "";
                                    return Y.doccirrus.schemas.instock.getSwissPriceString( phSale ) + icon;
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
                                    var phSaleCatalog = unwrap(meta.row.phPriceSaleCatalog);
                                    var icon = phSale === phSaleCatalog ? '<i class="fa fa-info-circle" style="margin-left: 5px;" aria-hidden="true"></i>' : "";
                                    return Y.doccirrus.schemas.instock.getSwissPriceString( phSale ) + icon;
                                }
                            },
                            {
                                forPropertyName: 'minimumQuantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                width: '10%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
                            },
                            {
                                forPropertyName: 'quantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                width: '10%',
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
                                forPropertyName: 'isDivisible',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                width: '10%',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    if( unwrap( meta.value ) ) {
                                        return i18n('InStockMojit.instock_schema.InStock_T.TP');
                                    } else {
                                        return i18n('InStockMojit.instock_schema.InStock_T.OP');
                                    }
                                }
                            },
                            {
                                forPropertyName: 'stockLocation.title',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'editor',
                                label: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                                title: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var editorObject = unwrap( meta.value );
                                    if( editorObject ) {
                                        if(editorObject.firstname && editorObject.lastname) {
                                            return meta.value.firstname + ' ' +  meta.value.lastname;
                                        } else if(editorObject.firstname && !editorObject.lastname) {
                                            return meta.value.firstname;
                                        } else if (!editorObject.firstname && editorObject.lastname) {
                                            return meta.value.lastname;
                                        } else {
                                            return "";
                                        }
                                    }
                                }
                            },
                            {
                                forPropertyName: 'dateCreated',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.dateCreated' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.dateCreated' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if (!meta.value) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            },
                            {
                                forPropertyName: 'dateUpdated',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.dateUpdated' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.dateUpdated' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    if (!meta.value) {
                                        return "";
                                    }
                                    return moment( meta.value ).format( dateFormat );
                                }
                            }
                        ]
                    }
                } );

            },
            /** @protected */
            destructor: function StockListViewModel_destructor() {

            }

        }, {
            NAME: 'StockListViewModel',
            ATTRS: {
                router: {
                    value: {},
                    lazyAdd: false
                }
            }
        } );

        KoViewModel.registerConstructor( StockListViewModel );
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
            'WareHouseAdvancedFilterViewModel',
            'dcnewinstockitemdialog'
        ]
    } );