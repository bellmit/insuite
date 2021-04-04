/*global fun:true, ko, moment */
/*exported fun*/

'use strict';

fun = function _fn( Y/*, NAME*/ ) {

    var
        ID_PVS_SETTINGS = '#pkvQuarterlyReports',
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;

    function PKVQuarterlyReportsViewModel( config ) {
        PKVQuarterlyReportsViewModel.superclass.constructor.call( this, config );
    }

    function isEmptyValue( val ) {
        return null === val ||
               undefined === val ||
               "" === val;
    }

    Y.extend( PKVQuarterlyReportsViewModel, KoViewModel.getDisposable(), {

        firstTable: null,
        secondTable: null,
        secondTableData: null,
        totalPrice: null,

        /** @protected */
        initializer: function( config ) {
            var
                self = this;

            self.pvsLogIdToCalc = ko.observable();
            self.totalPrice = ko.observable();

            self.table1PtsI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.pts' );
            self.table1HeaderI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.header' );
            self.table2HeaderI18n = i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.HEADER' );

            if( config && config.pvslogs && config.pvslogs.length ) {
                self.pvslogsList = config.pvslogs;
            } else {
                self.pvslogsList = [];
            }

            self.pvslogsList.forEach( function( pvslogObj ) {
                pvslogObj.startEndDate = ko.computed( function() {
                    return ko.unwrap( pvslogObj.padnextSettingTitle ) + ' ' + ko.unwrap( moment( pvslogObj.startDate ).format( 'DD.MM.YYYY HH:mm' ) ) + ' - ' + ko.unwrap( moment( pvslogObj.endDate ).format( 'DD.MM.YYYY HH:mm' ) + ', ' + ko.unwrap( pvslogObj.locname ) );
                }, self );
            } );

            self.firstTableData = ko.observableArray();
            self.secondTableData = ko.observableArray();

            self.initCalculateButton();
            self.initFirstTable();
            self.initSecondTable();
            self.calculate();

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
                    stateId: 'pkvQuarterlyReports1-table',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    limit: 10,
                    responsive: false,
                    height: 180,
                    remote: false,
                    data: self.firstTableData,
                    columns: [
                        {
                            forPropertyName: 'patientNo',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            collation: {locale: 'de', numericOrdering: true}
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'IsDispatcherMojit.tab_requests.patient' ),
                            title: i18n( 'IsDispatcherMojit.tab_requests.patient' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '142px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR
                        },
                        {
                            forPropertyName: 'treatmentPrice',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.TREATMENT' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.TREATMENT' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.treatmentPrice ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.treatmentPrice );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'others',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.OTHERS' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.OTHERS_TITLE' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.others ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.others );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'totalPrice',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.pts' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.table1.pts' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.totalPrice ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.totalPrice );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'priceWithVat',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.TOTAL_WITH_VAT' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE1.TOTAL_WITH_VAT' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.priceWithVat ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.priceWithVat );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'address',
                            label: i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' ),
                            title: i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' ),
                            isSortable: true,
                            renderer: function( meta ) {
                                var formattedAddr,
                                    data = meta.row.address ;
                                if( isEmptyValue( data ) ) {
                                    return meta.row.patientName ? meta.row.patientName  : '' ;
                                }

                                formattedAddr = data.receiver + '<br/>' +
                                                ''+i18n( 'general.title.ADDRESS' )+': '+data.line1.trim() ? data.line1 + "<br/>" : '' +
                                                ''+data.line2.trim() ? data.line2 + "<br/>" : '' +
                                                ''+data.addon ? data.addon + "</br>" : ''+data.country;

                                return  formattedAddr ;
                            },
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'insuranceName',
                            label: i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' ),
                            title: i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
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
                    stateId: 'pkvQuarterlyReports2-table',
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
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.SECTION' ),
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
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.CODE' ),
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
                            forPropertyName: 'content',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.table2.title' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'pricePerTreatment',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.TREATMENT_PRICE' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.pricePerTreatment ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.pricePerTreatment );
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
                        },
                        {
                            forPropertyName: 'groupPrice',
                            label: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.TOTAL_AMT' ),
                            title: i18n( 'InvoiceMojit.invoice_quarterlyReports.PKV_TABLE2.TOTAL_AMT' ),
                            renderer: function( meta ) {
                                var formatPrice;
                                if( isEmptyValue( meta.row.groupPrice ) ) {
                                    return '';
                                }
                                formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.groupPrice );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isFilterable: true,
                            isSortable: true
                        }
                    ]
                }
            } );
        },

        initCalculateButton: function() {
            var
                self = this;

            self.calculateBtn = KoComponentManager.createComponent( {
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
                pvslogId = self.pvsLogIdToCalc();

            if( self.pvslogsList && self.pvslogsList.length ) {
                if( !pvslogId ) {
                    pvslogId = self.pvslogsList[0]._id;
                    self.totalPrice( self.pvslogsList[0].priceTotal );
                } else {
                    let pvsObj = self.pvslogsList.filter( function(obj){
                        return obj._id.toString() === pvslogId;
                    } );
                    self.totalPrice( pvsObj[0].priceTotal );
                }
            } else {
                return;
            }

            //Query data for first table
            Y.doccirrus.jsonrpc.api.reporting.generatePVSPerformanceReport( {
                invoiceLogId: pvslogId
            } )
                .done( function( response ) {
                    self.firstTableData( response.data );
                } )
                .fail( function( response ) {
                    showError( response );
                } );

            //Query data for second table
            Y.doccirrus.jsonrpc.api.reporting.generatePVSLogAnalysis( {
                invoiceLogId: pvslogId
            } )
                .done( function( response ) {
                    self.secondTableData( response.data );
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
        Y.doccirrus.jsonrpc.api.pvslog.read( {
            filterOnLocations: true
        } )
            .done( function( response ) {
                callback( {pvslogs: response.data.sort( function( a, b ) {
                        return moment(a.startDate).isAfter( b.startDate ) ?
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
            applyBindings( new PKVQuarterlyReportsViewModel( config ), yNode );
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