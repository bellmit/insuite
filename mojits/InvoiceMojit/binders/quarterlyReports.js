/*global fun:true, ko, moment */
/*exported fun*/

'use strict';

fun = function _fn( Y/*, NAME*/ ) {

    var
        ID_PVS_SETTINGS = '#quarterlyReports',
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;

    function QuarterlyReportsViewModel( config ) {
        QuarterlyReportsViewModel.superclass.constructor.call( this, config );
    }

    function isEmptyValue( val ) {
        return null === val ||
               undefined === val ||
               "" === val;
    }

    Y.extend( QuarterlyReportsViewModel, KoViewModel.getDisposable(), {
        firstTable: null,
        secondTable: null,
        thirdTable: null,

        secondTableData: null,
        thirdTableData: null,

        /** @protected */
        initializer: function( config ) {
            var
                self = this;

            //self.quarterToCalc = ko.observable();
            //self.quarterList = Y.doccirrus.invoiceutils.generateQuarterList( 2 );

            self.invoiceLogIdToCalc = ko.observable();
            if( config && config.kbvlogs && config.kbvlogs.length ) {
                self.kbvlogsList = config.kbvlogs;
            } else {
                self.kbvlogsList = [];
            }

            self.kbvlogsList.forEach( function( kbvlogObj ) {
                kbvlogObj.quarterLocName = ko.computed(function() {
                    return 'Q'+ ko.unwrap( kbvlogObj.quarter ) + ' ' + ko.unwrap( kbvlogObj.year ) + ' - ' + ko.unwrap( kbvlogObj.locname );
                }, self);
            });

            self.firstTableData = ko.observableArray();
            self.secondTableData = ko.observableArray();
            self.thirdTableData = ko.observableArray();

            self.initCalculateButton();
            self.initFirstTable();
            self.initSecondTable();
            self.initThirdTable();
            self.calculate();

            self.table1HeaderI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.header' );
            self.table3HeaderI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.table3.header' );
            self.table2HeaderI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.header' );

        },
        /** @protected */
        destructor: function() {
        },

        initFirstTable: function() {

            var
                self = this;

            self.firstTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'quarterlyReports1-table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    responsive: false,
                    height: 180,
                    remote: false,
                    data: self.firstTableData,
                    columns: [
                        {
                            forPropertyName: 'k',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.k' ),
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'cnt',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.cnt' ),
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'pts',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.pts' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.pts ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.pts );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'cntDivLen',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.cntDivLen' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.cntDivLen ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.cntDivLen );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'ptsDivCnt',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.ptsDivCnt' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.ptsDivCnt ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.ptsDivCnt );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        }
                    ]
                }
            } );

        },

        initSecondTable: function() {

            var
                self = this;

            self.secondTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'quarterlyReports2-table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    responsive: false,
                    height: 180,
                    remote: false,
                    data: self.secondTableData,
                    columns: [
                        {
                            forPropertyName: 'lg',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.lg' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'lanr',
                            label: 'LANR',
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'doctorName',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.physician' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'code',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.code' ),
                            width: '15%',
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                return Y.doccirrus.schemas.activity.displayCode( data );
                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.title' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'codeGroupPrice',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.punkte' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.codeGroupPrice ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.codeGroupPrice );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'codeGroupCountPercent',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.NperS' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.NperS_TITLE' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.codeGroupCountPercent ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.codeGroupCountPercent );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'codeGroupCount',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.total' ),
                            isFilterable: true,
                            isSortable: true
                        }
                    ]
                }
            } );
        },

        initThirdTable: function() {

            var
                self = this;

            self.thirdTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'quarterlyReports3-table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    responsive: false,
                    height: 180,
                    remote: false,
                    data: self.thirdTableData,
                    columns: [
                        {
                            forPropertyName: 'k',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.k' ),
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'cnt',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.cnt' ),
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'doctorName',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.physician' ),
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'pts',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.pts' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.pts ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.pts );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'cntDivLen',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.cntDivLen' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.cntDivLen ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.cntDivLen );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'ptsDivCnt',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.ptsDivCnt' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.ptsDivCnt ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.ptsDivCnt );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: false
                        }
                    ]
                }
            } );

        },

        initCalculateButton: function() {
            var
                self = this;

            self.calculatePerformaceBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'calculatePerformance',
                    text: i18n( 'InvoiceMojit.rlv_browserJS.label.CALCULATE' ),
                    option: 'PRIMARY',
                    css: {
                        'btn-block': true
                    },
                    click: self.calculate.bind( this )
                }
            } );
        },

        calculate: function() {
            var
                self = this,
                //quarter = self.quarterToCalc(),
                kbvlogId = self.invoiceLogIdToCalc();

            // if(!quarter) {
            //     if(self.quarterList && self.quarterList.length) {
            //         quarter = self.quarterList[0].quarter;
            //     } else {
            //         return;
            //     }
            // }

            if( !kbvlogId ) {
                if( self.kbvlogsList && self.kbvlogsList.length ) {
                    kbvlogId = self.kbvlogsList[0]._id;
                } else {
                    return;
                }
            }

            //Query data for first table
            Y.doccirrus.jsonrpc.api.reporting.generatePerformanceGroupReport( {
                //quarter: quarter,
                invoiceLogId: kbvlogId
            } )
                .done( function( response ) {
                    self.firstTableData( response.data );
                } )
                .fail( function( response ) {
                    showError( response );
                } );


            //Query data for second table
            Y.doccirrus.jsonrpc.api.reporting.generateSchneiderKBVLogAnalysis( {
                //quarter: quarter,
                invoiceLogId: kbvlogId
            } )
                .done( function( response ) {
                    self.secondTableData( response.data );
                } )
                .fail( function( err ) {
                    showError( err );
                } );

            //Query data for third table
            Y.doccirrus.jsonrpc.api.reporting.generatePerformanceReportByEmployees( {
                invoiceLogId: kbvlogId
            } )
                .done( function( response ) {
                    self.thirdTableData( response.data );
                } )
                .fail( function( err ) {
                    showError( err );
                } );
        }
    } );

    function showError( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: {width: 'small'},
            message: errors.join( '<br>' )
        } );
    }

    function init( callback ) {
        Y.doccirrus.jsonrpc.api.kbvlog.read()
            .done( function( response ) {
                var format = 'Q/YYYY';
                callback( {
                    kbvlogs: response.data.sort( function( a, b ) {
                        return moment( a.quarter + '/' + a.year, format ).isAfter( moment( b.quarter + '/' + b.year, format ) ) ?
                            -1 : 1;
                    } )
                } );
            } )
            .fail( function( err ) {
                Y.log( 'could not query kbvlog ' + err, 'error' );
                showError( err );
            } );
    }

    function applyBindings( model, yNode ) {
        if( ko.dataFor( yNode.one( ID_PVS_SETTINGS ).getDOMNode() ) ) {
            return;
        }
        ko.applyBindings( model, yNode.one( ID_PVS_SETTINGS ).getDOMNode() );
    }

    function cleanNode( yNode ) {
        ko.cleanNode( yNode.one( ID_PVS_SETTINGS ).getDOMNode() );
    }

    function registerNode( yNode ) {
        init( function( config ) {
            applyBindings( new QuarterlyReportsViewModel( config ), yNode );
        } );
    }

    function deregisterNode( yNode ) {
        cleanNode( yNode );
    }

    return {
        registerNode: registerNode,
        deregisterNode: deregisterNode
    };
};