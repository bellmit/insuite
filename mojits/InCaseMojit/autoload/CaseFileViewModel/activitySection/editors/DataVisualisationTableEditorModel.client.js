/**
 * User: do
 * Date: 11/02/16  14:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 *
 * TODO: rename as 'Jawbone' component
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'DataVisualisationTableEditorModel', function( Y ) {
        /**
         * @module DataVisualisationTableEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TYPE = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.TYPE' ),
            UNIT = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.UNIT' ),
            MAX = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MAX' ),
            MIN = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MIN' );

        /**
         * @class DataVisualisationTableEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function DataVisualisationTableEditorModel( config ) {
            DataVisualisationTableEditorModel.superclass.constructor.call( this, config );
        }

        DataVisualisationTableEditorModel.ATTRS = {
            whiteList: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( DataVisualisationTableEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {

                testValue: null,
                hookFirst: null,
                labDates: null,

                initializer: function SimpleActivityEditorModel_initializer() {
                    var
                        self = this;

                    self.hookFirst = ko.observable( true );
                    self.labDates = ko.observableArray( [] );
                    self.testValue = ko.observable( 'Loading...' );

                    self.initSimpleActivityEditorModel();
                },
                destructor: function SimpleActivityEditorModel_destructor() {
                },
                initSimpleActivityEditorModel: function SimpleActivityEditorModel_initSimpleActivityEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        actType = unwrap( currentActivity.actType );

                    self.baseParams = {
                        query: {
                            patientId: unwrap( currentActivity.patientId ),
                            timestamp: unwrap( currentActivity.timestamp ),
                            caseFolderId: unwrap( currentActivity.caseFolderId )
                        }
                    };
                    if( 'FROMPATIENT' === actType ) {
                        this.initKoTableJawbone();

                    }
                    if( 'LABDATA' === actType ) {
                        this.initKoTableLabdata( true );
                    }
                },

                /**
                 * Initializes koTable(visualisationKoTable)
                 *
                 * TODO: MOJ-6887 Move jawbone stuff to its own component
                 *
                 * @method initKoTable
                 * @param {Boolean} [isLabData] if true - table should contains labData,
                 *  false or undefined - table contains jawbone data
                 */
                initKoTableJawbone: function DataVisualisationModel_initKoTable( isLabData ) {
                    var self = this,
                        KoUI = Y.doccirrus.KoUI,
                        KoComponentManager = KoUI.KoComponentManager,
                        proxy,
                        columns;

                    if( isLabData ) {
                        proxy = Y.doccirrus.jsonrpc.api.activity.getLabDataTableData;
                    } else {
                        proxy = Y.doccirrus.jsonrpc.api.activity.getDeviceTableData;
                    }

                    self.visualisationKoTable = KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            stateId: 'CaseFileMojit-DCDataVisualisationModel-tableformKoTable',
                            states: ['limit'],
                            striped: false,
                            fillRowsToLimit: false,
                            remote: true,
                            proxy: proxy,
                            baseParams: self.baseParams,
                            responsive: false,
                            exportCsvVisible: false,
                            visibleColumnsConfigurationVisible: false,
                            tableMinWidth: ko.computed( function() {
                                var
                                    initializedColumns = self.visualisationKoTable.columns.peek(),
                                    visibleColumns = initializedColumns.filter( function( col ) {
                                        return ko.unwrap( col.visible );
                                    } ),
                                    tableMinWidth = 0;

                                visibleColumns.forEach( function( col ) {
                                    var
                                        width = ko.utils.peekObservable( col.width ) || '';

                                    if( 0 < width.indexOf( '%' ) ) {
                                        if( '15%' === width ) {
                                            tableMinWidth += 250;
                                        } else {
                                            tableMinWidth += 100;
                                        }
                                    }
                                    else {
                                        tableMinWidth += parseInt( width, 10 );
                                    }
                                } );

                                return tableMinWidth + 'px';
                            }, null, {deferEvaluation: true} ),
                            columns: [
                                {
                                    componentType: 'KoTableColumnDrag',
                                    forPropertyName: 'KoTableColumnDrag',
                                    onlyDragByHandle: true,
                                    visible: true
                                },
                                {
                                    forPropertyName: 'type',
                                    label: TYPE,
                                    width: '80px',
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.value,
                                            data = meta.row;
                                        return '<span title="' + (data.title || '') + '">' + value + '</span>';

                                    }
                                },
                                {
                                    forPropertyName: 'min',
                                    label: MIN,
                                    width: '80px',
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.row.formattedMin || (meta.value && Y.doccirrus.comctl.numberToLocalString( meta.value )),
                                            title = meta.row.titleMin || '';

                                        return '<span title="' + title + '">' + ( value || '') + '</span>';
                                    }
                                },
                                {
                                    forPropertyName: 'max',
                                    width: '80px',
                                    label: MAX,
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.row.formattedMax || (meta.value && Y.doccirrus.comctl.numberToLocalString( meta.value )),
                                            title = meta.row.titleMax || '';

                                        return '<span title="' + title + '">' + (value || '') + '</span>';

                                    }
                                },
                                {
                                    forPropertyName: 'unit',        //--
                                    width: '80px',
                                    isSortable: true,
                                    isFilterable: true,
                                    label: UNIT
                                },
                                {
                                    forPropertyName: 'items.0',
                                    label: 'DATE.0',
                                    width: '200px',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.0' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.1',
                                    label: 'DATE.1',
                                    width: '200px',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.1' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.2',
                                    label: 'DATE.2',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.2' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.3',
                                    label: 'DATE.3',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.3' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.4',
                                    label: 'DATE.4',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.4' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.5',
                                    label: 'DATE.5',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.5' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.6',
                                    label: 'DATE.6',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.6' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.7',
                                    label: 'DATE.7',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.7' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.8',
                                    label: 'DATE.8',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.8' );
                                    }
                                },
                                {
                                    forPropertyName: 'items.9',
                                    label: 'DATE.9',
                                    width: '5%',
                                    renderer: function( meta ) {
                                        return self.rendererDate( self, meta, 'DATE.9' );
                                    }
                                }
                            ]
                        }
                    } );
                    if( !self.visualisationKoTable.data().length ) {

                        columns = self.visualisationKoTable.columns();
                        columns.forEach( function( column ) {
                            if( -1 !== column.forPropertyName.indexOf( 'items.' ) ) {
                                column.visible( false );
                            }
                        } );
                    }
                },

                getDates: function ( meta ) {
                    if ( !meta.row.items || !meta.row.items.length ) {
                        return '';
                    }

                    var i, item, dates = [];

                    for ( i = 0; i < meta.row.items.length; i++ ) {
                        item = meta.row.items[i];
                        dates.push( moment( item.date ).format( 'DD.MM.YYYY' ) );
                    }

                    return dates;
                },


                // called by binder
                getDateLabel: function( idx ) {
                    var
                        self = this,
                        table = self.visualisationKoTable,
                        cols = table.columns(),
                        col,
                        i;

                    for ( i = 0; i < cols.length; i++ ) {
                        col = cols[i];
                        if ( col.forPropertyName === 'items.' + idx ) {
                            if ( -1 === col.label().indexOf( 'DATE' ) ) {
                                return col.label();
                            }
                        }
                    }

                    return 'none';
                },

                isDateVisible: function( idx ) {
                    var
                        self = this,
                        table = self.visualisationKoTable,
                        cols = table.columns(),
                        col,
                        i;

                    for ( i = 0; i < cols.length; i++ ) {
                        col = cols[i];
                        if ( col.forPropertyName === 'items.' + idx ) {
                            return col.visible();
                        }
                    }
                    return false;
                },

                toggleColVisible: function( idx ) {
                    var
                        self = this,
                        table = self.visualisationKoTable,
                        cols = table.columns(),
                        col,
                        i;

                    for ( i = 0; i < cols.length; i++ ) {
                        col = cols[i];
                        if ( col.forPropertyName === 'items.' + idx ) {
                            col.visible( !col.visible() );
                        }
                    }
                },

                getPdfValue: function( meta, itemIndex ) {

                    if ( !meta.row.items || !meta.row.items[ itemIndex ] ) {
                        return '';
                    }

                    var
                        val = meta.value,
                        item = meta.row.items[ itemIndex ];

                    if ( item.value ) {
                        val = item.value + '';
                    }

                    if ( item.text ) {
                        val = item.text.join( '\n' );
                    }

                    return val;
                },

                /**
                 * Renders items value in koTable(visualisationKoTable)
                 * @method rendererDate
                 * @param {Object} meta
                 * @param {Object} meta.value
                 * @param {Object} meta.row
                 * @param {Object} meta.col
                 * @param {String} defaultName
                 * @returns {String}
                 */
                rendererDate: function DataVisualisationModel_rendererDate( self, meta, defaultName ) {
                    var
                        data = meta.value || {},
                        row = meta.row,
                        col = meta.col,
                        value = parseFloat( data.value ) || '',
                        result = data.formattedValue || (value && Y.doccirrus.comctl.numberToLocalString( value )),
                        cssClass = '';

                    if( data.date && ( data.value || 0 === data.value || data.text ) ) {
                        col.label( moment( data.date ).format( TIMESTAMP_FORMAT ) );
                    }
                    if( data.text ) {
                        result += '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + data.text.join( '\n' ) + '</p>';
                        //col.width = '15%';
                    }
                    if( defaultName === ko.utils.peekObservable( col.label ) ) {
                        col.visible( false );
                    } else {
                        col.visible( true );
                    }

                    if ( row.normalValue && Array.isArray( row.normalValue ) && row.normalValue.length > 1 ) {
                        return '<p style="font-family: monospace; white-space: pre-wrap; font-size: 11px">' + row.normalValue.join( '\n' ) + '</p>';
                    }

                    if( value && row.min && row.max && ( value < parseFloat( row.min ) || value > parseFloat( row.max ) ) ) {
                        cssClass = 'dc-red';
                    }

                    if ( data.text ) {
                        return '<span class="' + cssClass + '" title="' + (data.title || '') + '">' + result + '</span>';
                    }

                    if ( !isNaN( parseFloat( value ) ) && parseFloat( row.min ) !== parseFloat( row.max ) ) {

                        if ( parseFloat( result.replace( ',', '.' ) ) > parseFloat( row.max ) || parseFloat( result.replace( ',', '.' ) ) < parseFloat( row.min ) ) {
                        // strange artifact observed with non-pathological entries showing red
                        //if ( parseFloat( result ) > parseFloat( row.max ) || parseFloat( result ) < parseFloat( row.min ) ) {
                            result =  '<span style="color: red;">' + result + '</span>';
                        } 

                        return '<img src="' + self.createColorBar( row, parseFloat( value ) ) + '"  width="70%" height="20px" />&nbsp;&nbsp;' + result;
                    }

                    return value;
                },

                createColorBar: function( row, value) {

                    return Y.doccirrus.labdata.utils.createColorBar( 255, 40, row, value );

                }

            }, {
                NAME: 'DataVisualisationTableEditorModel'
            }
        );
        KoViewModel.registerConstructor( DataVisualisationTableEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'labdata-finding-utils'
        ]
    }
)
;
