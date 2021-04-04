'use strict';

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'InStockOrdersTableViewModel', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;


    /**
     * @constructor
     * @class InStockOrdersTableViewModel
     */
    function InStockOrdersTableViewModel() {
        InStockOrdersTableViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InStockOrdersTableViewModel, KoViewModel.getDisposable(), {
            templateName: 'InStockOrdersTableViewModel',
            /** @protected */
            initializer: function( config ) {
                var
                    self = this;

                self.selectedItem = ko.observable(null);
                self.initTable( config.eventsToSubscribe, config.baseParams, config.proxy, config.columns, config.onRowClick );
            },
            selectItem: function( item ) {
                var self = this;
                self.selectedItem( item );
            },
            initTable: function( eventsToSubscribe, baseParams, proxy, columnsConfig, onRowClick ) {
                var
                    self = this,
                    dateFormat = i18n( 'general.TIMESTAMP_FORMAT' ),
                    columns;
                    columnsConfig = columnsConfig || {};

                columns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'single',
                        allToggleVisible: true
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
                    },
                    {
                        forPropertyName: "allPatients",
                        label: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.patient' ),
                        title: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.patient' ),
                        width: '15%',
                        renderer: function( meta ) {
                            var row = meta.row;
                            var patients = [],
                                pushedIds = {};
                            row.stocks.forEach( function( stock ) {
                                stock.patients.forEach( function( stockPatient ) {
                                    if( !pushedIds[stockPatient._id] ) {
                                        patients.push( stockPatient );
                                        pushedIds[stockPatient._id] = true;
                                    }
                                } );
                            } );

                            return patients.map( function( patient ) {
                                return "<a  target='_blank' href='/incase#/patient/" + patient._id + "/tab/casefile_browser'>" + patient.lastname + " " + patient.firstname + "</a>";
                            } ).join( ", " );
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
                        forPropertyName: 'dateCreated',
                        label: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateCreated' ),
                        title: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateCreated' ),
                        width: '15%',
                        isSortable: true,
                        isFilterable: true,
                        direction: 'DESC',
                        sortInitialIndex: 0,
                        queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                        renderer: function( meta ) {
                            return moment( meta.value ).format( dateFormat );
                        }
                    },
                    {
                        forPropertyName: 'status',
                        label: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderStatus' ),
                        title: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderStatus' ),
                        width: '15%',
                        isSortable: columnsConfig.status ? columnsConfig.status.isSortable : true,
                        isFilterable: columnsConfig.status ? columnsConfig.status.isFilterable : true,
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

                            if( columnsConfig.status && columnsConfig.status.notClickableStatus && columnsConfig.status.notClickableStatus === meta.value ) {
                                return value;
                            }

                            return "<a href='#'>" + value || "" + "</a>";
                        }
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
                        forPropertyName: 'mediaId',
                        label: i18n( 'InStockMojit.instock_schema.StockOrders_T.mediaId' ),
                        title: i18n( 'InStockMojit.instock_schema.StockOrders_T.mediaId' ),
                        width: '15%',
                        isSortable: true,
                        isFilterable: false,
                        renderer: function( meta ) {
                            if( !meta.value ) {
                                return "";
                            }
                            var url = '/media/' + meta.value;
                            url = Y.doccirrus.infras.getPrivateURL( url );

                            return '<a href="' + url + ' " target="_blank">PDF</a> &nbsp;';
                        }
                    },
                    {
                        forPropertyName: 'totalOrderedPrice',
                        label: i18n( 'InStockMojit.instock_schema.StockOrders_T.totalOrderedPrice' ),
                        title: i18n( 'InStockMojit.instock_schema.StockOrders_T.totalOrderedPrice' ),
                        width: '15%',
                        isSortable: true,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var value = ko.unwrap( meta.value );
                            return Y.doccirrus.schemas.instock.getSwissPriceString( value );
                        }
                    },
                    {
                        forPropertyName: 'lastEditor',
                        label: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                        title: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                        width: '15%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var value = meta.value;

                            return (value.lastname || "") + " " + (value.firstname || "");
                        }
                    }
                ];

                self.ordersTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-orderslist',
                        states: ['limit', 'usageShortcutsVisible'],
                        limitList: [10, 20, 30, 40, 50],
                        responsive: false,
                        fillRowsToLimit: false,
                        remote: true,
                        eventsToSubscribe: eventsToSubscribe || [],
                        baseParams: baseParams || {},
                        proxy: proxy || Y.doccirrus.jsonrpc.api.stockordersrequest.getOrders,
                        columns: columns,
                        onRowClick: onRowClick || function( meta ) {
                            var
                                row = meta.row,
                                columnCheckBox = self.ordersTable.getComponentColumnCheckbox();
                                columnCheckBox.checkItemsByProperty( [row._id] );
                            self.selectedItem(row);
                        }
                    }
                } );
            },
            destructor: function() {
            },
            template: null,

            /** @protected */
            initTemplate: function() {
                var
                    self = this;

                self.template = {
                    name: self.get( 'templateName' ),
                    data: self
                };
            }
        },
        {
            NAME: 'InStockOrdersTableViewModel',
            ATTRS: {
                /**
                 * Defines template name to look up
                 * @attribute templateName
                 * @type {String}
                 * @default prototype.templateName
                 */
                templateName: {
                    valueFn: function() {
                        return this.templateName;
                    }
                }
            }
        }
    );

    KoViewModel.registerConstructor( InStockOrdersTableViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'stockorders-schema'
    ]
} );

