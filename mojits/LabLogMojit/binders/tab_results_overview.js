/**
 * User: pi
 * Date: 11/10/16  15:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko, moment */
/*exported _fn */
'use strict';

function _fn( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        TYPE = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.TYPE' ),
        MAX = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MAX' ),
        MIN = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MIN' ),
        PATIENT_NAME = i18n( 'LabLogMojit.tab_result_overview.title.PATIENT_NAME' ),
        UNIT = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.UNIT' ),
        TIME_RECEIVED = i18n( 'LabLogMojit.tab_result_overview.title.TIME_RECEIVED' ),
        LAST_UPDATE = i18n( 'LabLogMojit.tab_result_overview.title.LAST_UPDATE' ),
        DATE_LAB_RECEIVED = i18n( 'LabLogMojit.tab_result_overview.title.DATE_LAB_RECEIVED' ),
        RESULT = i18n( 'LabLogMojit.tab_result_overview.title.RESULT' ),
        FULLTEXT = i18n( 'LabLogMojit.tab_result_overview.title.FULLTEXT' ),
        PHONE = i18n( 'general.title.PHONE' ),
        EXPECTED_UNIT = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.EXPECTED_UNIT' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        KoUI = Y.doccirrus.KoUI,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = KoUI.KoComponentManager,
        viewModel,
        unwrap = ko.unwrap;

    function TabResultsOverviewViewModel( config ) {
        TabResultsOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabResultsOverviewViewModel, Disposable, {
        initializer: function() {
            var
                self = this;

            self.initTabResultsOverviewViewModel();
        },
        initTabResultsOverviewViewModel: function() {
            var
                self = this;

            self.startDate = ko.observable( moment().subtract( 1, 'days' ).toISOString() );
            self.endDate = ko.observable( moment().toISOString() );

            self.initOverviewTable();

            self.resultOwerviewDisclaimerI18n = i18n( 'LabLogMojit.tab_result_overview.disclaimer' );
            self.resultOwerviewStartDateI18n = i18n( 'LabLogMojit.tab_result_overview.title.START_DATE' );
            self.resultOwerviewTimeStampI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.TIMESTAMP' );
            self.resultOwerviewEndDateI18n = i18n( 'LabLogMojit.tab_result_overview.title.END_DATE' );
        },
        /**
         * @type {null|KoTable}
         */
        resultsOverviewTable: null,
        initOverviewTable: function() {
            var
                self = this,
                baseParams;

            baseParams = ko.computed( function() {
                var
                    startDate = unwrap( self.startDate ),
                    endDate = unwrap( self.endDate );

                startDate = moment( startDate ).format( 'YYYY-MM-DD' ) + ' 00:00:00';
                endDate = moment( endDate ).format( 'YYYY-MM-DD' ) + ' 23:59:59';

                Y.log( 'Filtering to date range, startDate: ' + startDate + ' endDate: ' + endDate, 'debug', NAME );

                return {
                    query: {
                        timestamp: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                };

            } ).extend( {rateLimit: 0} );
            self.resultsOverviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.pdfTitle' ),
                    stateId: 'LabLogMojit-tab_result_overview-resultsOverviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.reporting.getLabDataOverview,
                    baseParams: baseParams,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'patientName',
                            label: PATIENT_NAME,
                            title: PATIENT_NAME,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.value,
                                    data = meta.row;

                                return '<a href="incase#/activity/' + data.activityId + '" target="_blank">' + value + '</a>';
                            }
                        },
                        {
                            forPropertyName: 'bestPatientPhone',
                            label: PHONE,
                            title: PHONE,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'labHead',
                            label: TYPE,
                            title: TYPE,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'labNormalText',
                            label: EXPECTED_UNIT,
                            title: EXPECTED_UNIT,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    row = meta.row,
                                    value = '';

                                if( row.labNormalText ) {
                                    value = value + row.labNormalText;
                                }
                                if( row.labTestResultUnit ) {
                                    value = value + '<span style="float: right;">' + row.labTestResultUnit + '</span>';
                                }

                                return value;
                            }
                        },
                        {
                            forPropertyName: 'labTestResultVal',
                            label: RESULT,
                            title: RESULT,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.GTE_OPERATOR,
                            isFilterable: true,
                            width: '12%',
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data && data.ldtVersion && data.ldtVersion.startsWith( 'ldt3' ) ) {
                                    return Y.doccirrus.labdata.utils.makeFindingValueCellLdt3( data, true );
                                }
                                return Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( data, true );
                            },
                            pdfRenderer: function( meta ) {
                                var cellHtml;

                                if( meta.row.ldtVersion && meta.row.ldtVersion.startsWith( 'ldt3' ) ) {
                                    cellHtml = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt3( meta.row, true );
                                } else {
                                    cellHtml = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt2( meta.row, true );
                                }
                                return Y.doccirrus.utils.stripHTML.regExp( cellHtml );
                            }
                        },
                        {
                            forPropertyName: 'labFullText',
                            label: FULLTEXT,
                            title: FULLTEXT,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.GTE_OPERATOR,
                            isFilterable: true,
                            width: '20%',
                            renderer: function( meta ) {
                                var value = meta.value;
                                return '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + value + '</p>';
                            },
                            pdfRenderer: function( meta ) {
                                return meta.value;
                            }
                        },
                        {
                            forPropertyName: 'labMin',
                            label: MIN,
                            title: MIN,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.GTE_OPERATOR,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var value = meta.value;
                                return Y.doccirrus.comctl.numberToLocalString( value );
                            }
                        },
                        {
                            forPropertyName: 'labMax',
                            label: MAX,
                            title: MAX,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.GTE_OPERATOR,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var value = meta.value;
                                return Y.doccirrus.comctl.numberToLocalString( value );
                            }
                        },
                        {
                            forPropertyName: 'labTestResultUnit',
                            label: UNIT,
                            title: UNIT,
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            width: '10%',
                            renderer: function( meta ) {
                                var value = meta.value || '';   //  may be undefined, set empty string for PDF
                                return value;
                            }
                        },
                        {
                            forPropertyName: 'labReqReceived',
                            label: DATE_LAB_RECEIVED,
                            title: DATE_LAB_RECEIVED,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            visible: false,
                            direction: 'DESC',
                            width: '9%',
                            renderer: function( meta ) {
                                var value = meta.value;
                                return moment( value ).format( TIMESTAMP_FORMAT );
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'timestampDate',
                            label: TIME_RECEIVED,
                            title: TIME_RECEIVED,
                            visible: false,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            width: '7%',
                            renderer: function( meta ) {
                                return moment( meta.value ).format( TIMESTAMP_FORMAT_LONG );
                            },
                            isSortable: true,
                            isFilterable: false
                        },
                        {
                            forPropertyName: 'labLogTimestamp',
                            label: LAST_UPDATE,
                            title: LAST_UPDATE,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            width: '7%',
                            renderer: function( meta ) {
                                if (meta && meta.value) {
                                    return moment( meta.value ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';
                            },
                            isSortable: true,
                            isFilterable: false
                        }
                    ]
                }
            } );

        }
    } );

    viewModel = new TabResultsOverviewViewModel();

    return {

        registerNode: function( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
}
