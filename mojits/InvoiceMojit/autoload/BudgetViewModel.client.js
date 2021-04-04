/**
 * User: do
 * Date: 15/10/15  18:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'BudgetViewModel', function( Y ) {
    'use strict';
    Y.namespace( 'doccirrus.uam' ).BudgetViewModel = BudgetViewModel;

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        QUARTER = i18n( 'budget-schema.Budget_T.quarter.i18n' ),
        QUARTER_TITLE = i18n('InvoiceMojit.invoicefactor_item.label.QUARTER'),
        YEAR_TITLE = i18n('InvoiceMojit.invoicefactor_item.label.YEAR'),
        YEAR = i18n( 'budget-schema.Budget_T.year.i18n' ),
        BS = i18n( 'budget-schema.Budget_T.locationName.i18n' ),
        SPCL = i18n( 'employee-schema.Employee_T.specialities' ),
        TOTAL = i18n( 'budget-schema.Budget_T.totalBudget.i18n' ),
        SPENT = i18n( 'budget-schema.Budget_T.spentBudget.i18n' ),
        DIFF = i18n( 'budget-schema.Budget_T.diffBudget.i18n' ),
        PERC = i18n( 'budget-schema.Budget_T.percBudget.i18n' ),
        CALCULATE = i18n( 'InvoiceMojit.BudgetViewModel.label.CALCULATE' ),
        KoComponentManager = KoUI.KoComponentManager,
        peek = ko.utils.peekObservable;

    function showError( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: {width: 'small'},
            message: errors.join( '<br>' )
        } );
    }

    function getSpecialities() {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.kbv.fachgruppe() ).then( function( response ) {
            return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                return {id: entry.key, text: entry.value};
            } );
        } );
    }

    function BudgetViewModel( budgetType, pdfTitle ) {
        var self = this;

        if( !budgetType ) {
            throw new Error( 'missing budgetType' );
        }

        self.budgetType = budgetType;

        self.quarterToCalc = ko.observable();

        self.quarterList = Y.doccirrus.invoiceutils.generateQuarterList( 2 );
        self.specialitiesList = ko.observableArray( [] );
        getSpecialities().then( function( result ){ self.specialitiesList( result ); } );

        self.calculateBtn = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'calculateBudget',
                text: CALCULATE,
                option: 'PRIMARY',
                css: {
                    'btn-block': true
                },
                click: self.calculate.bind( this )
            }
        } );

        self.budgetKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                formRole: 'casefile-ko-invoice-table',
                pdfTitle: pdfTitle,
                stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-' + budgetType + '-budgetKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.budget.read,
                baseParams: {
                    query: {
                        budgetType: budgetType
                    }
                },
                columns: [
                    {
                        forPropertyName: 'quarter',
                        label: QUARTER,
                        title: QUARTER_TITLE,
                        isFilterable: true,
                        isSortable: true,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                        width: '48px'
                    },
                    {
                        forPropertyName: 'year',
                        label: YEAR,
                        title: YEAR_TITLE,
                        isFilterable: true,
                        isSortable: true,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                        width: '64px'
                    },
                    {
                        forPropertyName: 'locationName',
                        label: BS,
                        isFilterable: true,
                        isSortable: true
                    },
                    {
                        forPropertyName: 'specialities',
                        label: SPCL,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: self.specialitiesList,
                            optionsText: 'text',
                            optionsValue: 'id'
                        },
                        isSortable: true,
                        renderer: function( meta ) {
                            var
                                data = meta.row && meta.row.specialities,
                                list = peek( self.specialitiesList );

                            if( Array.isArray( data ) && data.length ) {
                                return data.map( function( entry ) {
                                    return list.filter( function( speciality ){ return speciality.id === entry; } ).map( function( speciality ){ return speciality.text; } );
                                } ).join( ', ' );
                            }

                            return '';
                        }
                    },
                    {
                        forPropertyName: 'totalBudget',
                        label: TOTAL,
                        isFilterable: false,
                        isSortable: true,
                        renderer: function( meta ) {
                            var data = meta.row,
                                str = Y.doccirrus.comctl.numberToLocalString( data.totalBudget ) + ' €' + (data.totalBudgetComposition ? '<i class="dc-info-icon" data-toggle="tooltip" data-placement="top" title="' + data.totalBudgetComposition + '"></i>' : '');
                            return str;
                        }
                    },
                    {
                        forPropertyName: 'spentBudget',
                        label: SPENT,
                        isSortable: true,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var data = meta.row,
                                str = Y.doccirrus.comctl.numberToLocalString( data.spentBudget ) + ' €';
                            return str;
                        }
                    },
                    {
                        forPropertyName: 'diffBudget',
                        label: DIFF,
                        isSortable: true,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var data = meta.row,
                                str = '<span class="' + (data.diffBudget < 0 ? 'text-danger' : 'text-success') + '">' + Y.doccirrus.comctl.numberToLocalString( data.diffBudget ) + ' €</span>';
                            return str;
                        }
                    },
                    {
                        forPropertyName: 'percBudget',
                        label: PERC,
                        isSortable: true,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var data = meta.row,
                                str = '<span class="' + (data.percBudget > 100 ? 'text-danger' : 'text-success') + '">' + data.percBudget.toFixed(2) + ' %</span>';
                            return str;
                        }
                    }
                ]
            }
        } );
    }

    BudgetViewModel.prototype.calculate = function() {
        var self = this,
            quarter = self.quarterToCalc();

        if( !quarter ) {
            return;
        }

        self.budgetKoTable.masked( true );
        Y.doccirrus.jsonrpc.api.budget.calculate( {
            budgetType: self.budgetType,
            quarter: quarter.quarter,
            year: quarter.year
        } ).fail( function( response ) {
            Y.log( 'could not calculate med budget ' + response, 'error' );
            showError( response );
        } ).always( function() {
            self.budgetKoTable.masked( false );
            self.budgetKoTable.reload();
        } );
    };

}, '0.0.1', {
    requires: []
} );
