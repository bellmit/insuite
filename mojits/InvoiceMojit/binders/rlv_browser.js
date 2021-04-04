/**
 * User: do
 * Date: 06/08/15  13:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Date: 31/03/14  17:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */
/*global ko */
function _fn( Y/*, NAME*/ ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        CASES = i18n( 'InvoiceMojit.rlv_browserJS.label.CASES' ),
        QUARTER_TITLE = i18n('InvoiceMojit.invoicefactor_item.label.QUARTER'),
        YEAR_TITLE = i18n('InvoiceMojit.invoicefactor_item.label.YEAR'),
        QUARTER = i18n( 'InvoiceMojit.rlv_browserJS.label.QUARTER' ),
        YEAR = i18n( 'InvoiceMojit.rlv_browserJS.label.YEAR' ),
        PHYSICIAN = i18n( 'InvoiceMojit.rlv_browserJS.label.PHYSICIAN' ),
        SPECIALITIES = i18n( 'InvoiceMojit.rlv_browserJS.label.SPECIALITIES' ),
        CAPACITY = i18n( 'InvoiceMojit.rlv_browserJS.label.CAPACITY' ),
        CONSUMED = i18n( 'InvoiceMojit.rlv_browserJS.label.CONSUMED' ),
        CALCULATE = i18n( 'InvoiceMojit.rlv_browserJS.label.CALCULATE' );

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function init( callback ) {
        Y.doccirrus.jsonrpc.api.location.read().done( function( response ) {
            callback( {locations: response.data} );
        } ).fail( function( response ) {
            Y.log( 'could not calculate rlv ' + response, 'error' );
            showError( response );
        } );
    }

    function showError( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: {width: 'small'},
            message: errors.join( '<br>' )
        } );
    }


    function RlvViewModel( config ) {
        var self = this,
            columns = [
                {
                    forPropertyName: 'quarter',
                    label: QUARTER,
                    title: QUARTER_TITLE,
                    isFilterable: true,
                    queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                    width: '48px'
                },
                {
                    forPropertyName: 'year',
                    label: YEAR,
                    title: YEAR_TITLE,
                    isFilterable: true,
                    queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                    width: '64px'
                },
                {
                    forPropertyName: 'employeeId.name',
                    label: PHYSICIAN,
                    isFilterable: true,
                    renderer: function( meta ) {
                        var data = meta.row;
                        return data.employeeId.firstname + ' ' + data.employeeId.lastname;
                    }
                },
                {
                    forPropertyName: 'employeeId.specialities',
                    label: SPECIALITIES,
                    renderer: function( meta ) {
                        var data = meta.row;
                        return data.employeeId.specialities.join( ', ' );
                    }
                },
                {
                    forPropertyName: 'cases',
                    label: CASES,
                    width: '64px',
                    renderer: function( meta ) {
                        var data = meta.row;
                        return data.cases || '0';
                    }
                },
                {
                    forPropertyName: 'employeeId.rlvCapacity',
                    label: CAPACITY,
                    width: '130px',
                    pdfRenderer: function( meta ) {
                        if ( !meta.row.employeeId || !meta.row.employeeId.rlvCapacity ) { return ''; }
                        return meta.row.employeeId.rlvCapacity + '';
                    }
                },
                {
                    forPropertyName: 'total',
                    label: CONSUMED,
                    width: '130px',
                    renderer: function( meta ) {
                        var data = meta.row,
                            str = '<span class="' + (data.total > data.employeeId.rlvCapacity ? 'text-danger' : 'text-success') + '">' + Y.doccirrus.comctl.numberToLocalString( data.total ) + '</span>';
                        return str;
                    }
                }

            ];

        // Generate datatable location columns
        config.locations.forEach( function( location ) {
            columns.push( {
                forPropertyName: 'location.' + location._id,
                label: location.locname,
                renderer: function( meta ) {
                    var data = meta.row, str = '-';
                    if( data.locations && data.locations.length ) {
                        data.locations.some( function( entryLoc ) {
                            if( entryLoc.locationId === location._id ) {
                                str = Y.doccirrus.comctl.numberToLocalString( entryLoc.total );
                                return true;
                            }
                        } );
                    }
                    return str;
                }
            } );
        } );

        self.quarterToCalc = ko.observable();

        self.quarterList = Y.doccirrus.invoiceutils.generateQuarterList( 2 );

        self.calculateRlvBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'calculateRlv',
                text: CALCULATE,
                option: 'PRIMARY',
                css: {
                    'btn-block': true
                },
                click: self.calculate.bind( this )
            }
        } );

        self.rlvKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                formRole: 'casefile-ko-invoice-table',
                pdfTitle: i18n( 'InvoiceMojit.rlv_browserJS.pdfTitle' ),
                stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-rlvKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                baseParams: self.tableBaseParams,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.rlv.read,
                usageConfigurationDisabled: true,
                columns: columns,
                responsive: false,
                tableMinWidth: ko.computed( function() {
                    var
                        initializedColumns = self.rlvKoTable.columns.peek(),
                        visibleColumns = initializedColumns.filter( function( col ) {
                            return ko.unwrap( col.visible );
                        } ),
                        tableMinWidth = 0;

                    visibleColumns.forEach( function( col ) {
                        var
                            width = ko.utils.peekObservable( col.width ) || '';

                        if( width.indexOf( '%' ) > 0 ) {
                            tableMinWidth += 200;
                        }
                        else {
                            tableMinWidth += parseInt( width, 10 );
                        }
                    } );

                    return tableMinWidth + 'px';
                }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} )
            }
        } );

        self.calcRlvI18n = i18n('InvoiceMojit.rlv_browser.text.CALC_RLV');

    }

    RlvViewModel.prototype.calculate = function() {
        var self = this,
            quarter = self.quarterToCalc();
        if( !quarter ) {
            return;
        }
        self.rlvKoTable.masked( true );
        Y.doccirrus.jsonrpc.api.rlv.calculate( quarter ).fail( function( response ) {
            Y.log( 'could not calculate rlv ' + response, 'error' );
            showError( response );
        } ).always( function() {
            self.rlvKoTable.masked( false );
            self.rlvKoTable.reload();
        } );
    };

    return {
        registerNode: function() {
            init( function( config ) {
                ko.applyBindings( new RlvViewModel( config ), document.querySelector( '#rlv_browser' ) );
            } );

        }
    };
}