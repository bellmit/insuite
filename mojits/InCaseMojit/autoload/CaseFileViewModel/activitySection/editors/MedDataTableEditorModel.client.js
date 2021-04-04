/**
 * User: strix
 * Date: 20/10/16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 *
 * Renderers for individual labdata types will be added in labdata-finding-utils.js
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'MedDataTableEditorModel', function( Y, NAME ) {
    /**
     /**
     * @module MedDataTableEditorModel
     */

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
        MedDataItemModel = KoViewModel.getConstructor( "MedDataItemModel" ),
        MedDataItemChartValue = Y.doccirrus.schemas.v_meddata.MedDataItemChartValue,
        MedDataColumnClient = Y.doccirrus.api.meddata.MedDataColumnClient,
        ignoreDependencies = ko.ignoreDependencies,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        DYNAMIC = '_dynamic_',
        RAWPREFIX = '_RAW_';

    /**
     * @class MedDataTableEditorModel
     * @constructor
     * @param {Object} config
     * @extends ActivityEditorModel
     */
    function MedDataTableEditorModel( config ) {
        MedDataTableEditorModel.superclass.constructor.call( this, config );
    }

    Y.extend( MedDataTableEditorModel, ActivityEditorModel, {

            fullView: null,

            initializer: function SimpleActivityEditorModel_initializer() {
                var self = this;
                self.initMedDataTableEditorModel();
            },
            destructor: function SimpleActivityEditorModel_destructor() {
            },
            initMedDataTableEditorModel: function() {
                var
                    self = this,
                    storedFullView = Y.doccirrus.utils.localValueGet( 'meddata_fullView' );

                self.newEntryI18n = i18n( 'InCaseMojit.MedDataEditorModel_clientJS.NEW_ENTRY' );
                self.tooltipShowMiniChartsI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_MINI_CHARTS' );

                self.fullView = ko.observable( storedFullView === 'true' );

                self.maxDateColumns = 10;
                self.initMedDataTable();
                self.initSelect2Date();
                self.initAddButton();
                self.loadData();

            },

            toggleFullView: function() {
                var
                    self = this;

                self.fullView( !self.fullView() );

                Y.doccirrus.utils.localValueSet( 'meddata_fullView', self.fullView().toString() );

                self.medDataKoTable.forceComputedStylesUpdate( self.medDataKoTable.forceComputedStylesUpdate() + 1 );
            },

            /**
             * Returns the often-used day key for the data points for that entry.
             * @param {number} i
             * @param {string} [prefix]
             * @returns {string}
             */
            getDynamicDayKey: function getDynamicDayKey( i, prefix ) {
                var key = DYNAMIC + 'day' + i;
                if( typeof prefix === "string" ) {
                    return prefix + key;
                }
                return key;
            },

            /**
             * Load all meddata activities sorted by timestamp to display them in the table.
             */
            loadData: function() {
                var
                    self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    templateCollection = currentActivity.templateCollection,
                    result = {},
                    visibleDates = [],

                    activityQuery = {
                        patientId: peek( currentActivity.patientId )
                    },

                    activityOptions = {
                        fields: {
                            medData: 1,
                            timestamp: 1
                        },
                        itemsPerPage: self.maxDateColumns,
                        sort: {
                            timestamp: -1
                        }
                    },

                    readParams = {
                        query: activityQuery,
                        options: activityOptions
                    },
                    i = 1;

                if ( self.isGravidogramm() ) {
                    //  Load checkup entries in a pregnancy casefolder
                    activityQuery.caseFolderId = currentActivity.caseFolderId();
                    activityQuery.actType = 'GRAVIDOGRAMMPROCESS';
                } else {
                    //  Load MEDDATA or PERCENTILECURVE in any casefolder for this patient at or before the date of this activity
                    activityQuery.actType = peek( currentActivity.actType );
                    activityQuery.timestamp = { $lte: peek( currentActivity.timestamp ) };
                }

                Y.doccirrus.jsonrpc.api.activity
                    .read( readParams )
                    .done( onActivitiesLoaded )
                    .fail( onReadFail );

                function onActivitiesLoaded( response ) {
                    var
                        data = response.data;

                    data.forEach( processSingleActivity );
                    self.selectedDates( visibleDates );

                    if (self.medDataKoTable.data) {
                        self.medDataKoTable.data( _.values( result ) );
                    }
                }

                function onReadFail() {
                    self.medDataKoTable.data.removeAll();
                }

                function processSingleActivity( activity ) {

                    // convert the medDataItems stored in the activity
                    if ( activity.medData ) {
                        activity.medData.forEach( function forEachMedDataItem( medDataItem ) {
                            processSingleMedDataEntry( activity, medDataItem );
                        } );
                    }

                    // ensure there is a column for that day
                    self.updateColumnForDay( {
                        day: self.getDynamicDayKey( i ),
                        timestamp: activity.timestamp
                    } );

                    var
                        actType = currentActivity.actType(),
                        /**
                         * ActTypes listed here will display ALL entries at once.
                         * Else, only the most recent 3 entries are displayed at once.
                         * @type {boolean}
                         */
                        showAllEntries = [
                                             'GRAVIDOGRAMM',
                                             'INGREDIENTPLAN'
                                         ].indexOf( actType ) !== -1;

                    if( showAllEntries || visibleDates.length < 3 ) {
                        visibleDates.push( activity.timestamp );
                    }
                    i++;
                }

                /**
                 * Create or update an existing entry for each MedDataItem.
                 * Each type is rendered in a row. There is hence just ONE entry per type.
                 * If there are multiple dates for each item, these are added as dynamic
                 * keys using this.getDynamicDayKey. These values are rendered in the columns for each day.
                 * ChartValues are updated accordingly.
                 *
                 * @param {MedDataSchema} activity
                 * @param {MedDataItemSchema} medDataItem
                 */
                function processSingleMedDataEntry( activity, medDataItem ) {
                    var
                        type = medDataItem.type,

                        // get the template collection to search for the translation
                        template = templateCollection && templateCollection.findTemplateByType( type ),
                        medDataItemConfig = templateCollection && templateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                            medDataItem: medDataItem,
                            timestamp: activity.timestamp
                        } ),

                        // depending on the config, format and display the value
                        hasChartValue = (medDataItemConfig && medDataItemConfig.hasChartValue()) || false,
                        formattedValue = medDataItemConfig && medDataItemConfig.formatMedDataItem( medDataItem ),
                        formattedValueForPDF = medDataItemConfig && medDataItemConfig.formatMedDataItemForPDF( medDataItem ),

                        /**
                         * create a chart value to be rendered
                         * @type {MedDataItemChartValue|null}
                         */
                        chartValue,

                        // storage for the entry
                        entry;

                    // initialize a new entry, if none exists
                    if( typeof result[type] !== "object" || result[type] === null ) {
                        result[type] = {};
                    }
                    entry = result[type];

                    // link the template and the item to each entry
                    entry.template = template;
                    entry.medDataItemConfig = medDataItemConfig;
                    entry.isNumeric = medDataItemConfig.isNumericDataType();

                    // add translations to each item (for easier search and filter functions)
                    entry.i18n = (template && template.i18n) || type;
                    entry.typeI18n = entry.i18n;

                    // initialize data arrays for charting
                    entry.datesData = Array.isArray( entry.datesData ) ? entry.datesData : [];
                    entry.datesData2 = Array.isArray( entry.datesData2 ) ? entry.datesData2 : [];

                    // add the value for the current day
                    // as the table can be exported as PDF => use the PDF compatible value here
                    entry[self.getDynamicDayKey( i )] = formattedValueForPDF;
                    entry[self.getDynamicDayKey( i, RAWPREFIX )] = formattedValue;

                    // add properties all properties EXCEPT additionalData (these are accessed through proxy functions)
                    Object.keys( medDataItem ).forEach( function( key ) {
                        if( !Object.prototype.hasOwnProperty.call( result[type], key ) ) {
                            result[type][key] = unwrap( medDataItem[key] );
                        }
                    } );

                    // install proxies to the additionalData
                    MedDataItemModel.prototype.installAdditionalDataProxies.call( entry );

                    // add chart information, if available
                    if( hasChartValue ) {
                        if( typeof medDataItemConfig.chartValueFormattingFunction === "function" ) {
                            // call the generator function
                            chartValue = medDataItemConfig.chartValueFormattingFunction( medDataItem );
                        } else {
                            // create a new default chart value,
                            // if no generator function has been defined in the MedDataItemConfig
                            chartValue = new MedDataItemChartValue( {
                                hasChartValue: true,
                                valueKey: (template && template.i18n) || type,
                                value: medDataItem.value
                            } );
                        }
                    }

                    // if a chartValue has been created, copy over the required parameters
                    if( chartValue ) {
                        entry.hasChartValue = entry.hasChartValue || chartValue.hasChartValue;

                        // by default, an entry has only a single data point
                        entry.valueKey = chartValue.valueKey;
                        entry.value = chartValue.value;
                        entry.datesData.push( {
                            timestamp: activity.timestamp,
                            value: chartValue.value
                        } );

                        // if the value has two entries, create a new entry for them as well
                        if( chartValue.value2Key ) {
                            entry.value2Key = chartValue.value2Key;
                        }
                        if( chartValue.value2 ) {
                            entry.value2 = chartValue.value2;
                            entry.datesData2.push( {
                                timestamp: activity.timestamp,
                                value: chartValue.value2
                            } );
                        }
                    } else {
                        entry.hasChartValue = entry.hasChartValue || false;
                    }

                }
            },
            isGravidogramm: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentActivity = unwrap( binder.currentActivity ),
                    actType = unwrap( currentActivity.actType );

                return (actType === 'GRAVIDOGRAMM' || actType === 'GRAVIDOGRAMMPROCESS');
            },
            /**
             * Ensure that for each selected day, a column exists, and that the header is set to this date.
             * @param {object} params
             * @param {string} params.day key of the column (values to be displayed within the column)
             * @param {Date|string} params.timestamp timestamp of the entry, will be converted to the column header
             */
            updateColumnForDay: function( params ) {
                var
                    self = this,
                    timestamp = params.timestamp,

                    /**
                     * the header of that columns will be the date of the entry.
                     */
                    dateLabel = moment( timestamp ).format( TIMESTAMP_FORMAT );

                // add the date to the available dates in the multi-select
                self.availableDates.push( timestamp );

                if( self.medDataKoTable.columns ) {
                    // search an existing column matching that date, and update the timestamp and label
                    self.medDataKoTable.columns().some( function forEachColumn( column ) {
                        if( column.forPropertyName === params.day ) {
                            column.timestamp = timestamp;
                            column.label( dateLabel );
                            return true;
                        } else {
                            return false;
                        }
                    } );
                }

            },
            select2DateMapper: function( date ) {
                return {
                    id: date,
                    text: moment( date ).format( TIMESTAMP_FORMAT )
                };
            },
            initSelect2Date: function() {
                var
                    self = this;
                self.availableDates = [];
                self.selectedDates = ko.observableArray();

                //  hide table when nothing to display
                self.isTableVisible = ko.computed( function() {
                    return ( self.selectedDates().length > 0 );
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        selectedDates = unwrap( self.selectedDates );
                    ignoreDependencies( function() {
                        var
                            columns = peek( self.medDataKoTable.columns );
                        columns.forEach( function( column ) {

                            if( column.timestamp ) {
                                column.visible( -1 !== selectedDates.indexOf( column.timestamp ) );
                            }
                        } );
                    } );

                } ) );
                self.select2Date = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                selectedDates = ko.unwrap( self.selectedDates );
                            return selectedDates.map( self.select2DateMapper );
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.selectedDates.push( $event.added.id );
                            }
                            if( $event.removed ) {
                                self.selectedDates.remove( $event.removed.id );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( "\u00A0" ),
                    select2: {
                        allowClear: true,
                        multiple: true,
                        width: '100%',
                        data: function() {
                            return {
                                results: self.availableDates.map( self.select2DateMapper )
                            };
                        }
                    }
                };
            },

            /**
             * rendering function for a single table cell
             * @param {object} meta
             * @returns {string}
             */
            rendererDayValue: function( meta ) {
                var
                    self = this,
                    entry = meta.row,
                    value = meta.value,
                    titleData = [],
                    binder = self.get( 'binder' ),
                    currentActivity = peek( binder.currentActivity ),
                    medDataConfig = peek( currentActivity.medDataConfig );

                /**
                 * If dynamic columns have been defined for a data point, push these values
                 */
                if( medDataConfig && medDataConfig.dynamicColumns ) {
                    medDataConfig.dynamicColumns.forEach( function( column ) {
                        if( Object.prototype.hasOwnProperty.call( entry, column.key ) ) {
                            titleData.push( {
                                label: column.label,
                                value: unwrap( entry[column.key] )
                            } );
                        }
                    } );
                }

                // if the value is numeric, render an HTMLValue for the cell
                if( entry.isNumeric ) {
                    return MedDataColumnClient.prototype.renderHTMLValueRangeForMedDataItem( {
                        formattedValue: value,
                        numericValue: entry.value,
                        sampleNormalValueText: entry.sampleNormalValueText,
                        chartView: self.fullView(),
                        titleData: titleData
                    } );
                }
                return value;
            },

            /**
             * renderer function for a single table cell when exporting as PDF
             * @param {object} meta
             * @returns {string}
             */
            pdfRendererDayValue: function( meta ) {
                return meta.value + '';
            },

            initAddButton: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentActivity = unwrap( binder.currentActivity ),
                    currentPatient = unwrap( binder.currentPatient );

                //  show button for GRAVIDOGRAMM activies when the current casefolder is not disabled
                self.showAddButton = ko.computed( function() {
                    var
                        currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        actType = currentActivity.actType();

                    if ( currentCaseFolder && currentCaseFolder.disabled ) { return false; }

                    return ( 'GRAVIDOGRAMM' === actType );
                } );
            },

            //  MOJ-8551 Currently only used for Gravidogramm entries
            createNewEntry: function() {
                Y.doccirrus.inCaseUtils.createActivity( { 'actType': 'GRAVIDOGRAMMPROCESS' } );
            },
            initMedDataTable: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = unwrap( binder.currentPatient ),
                    currentActivity = unwrap( binder.currentActivity ),
                    templateCollection = unwrap( currentActivity.templateCollection ),
                    actType = unwrap( currentActivity.actType ),
                    medDataConfig = unwrap( currentActivity.medDataConfig ),
                    isGravidogramm = self.isGravidogramm(),
                    boundRendererDayValue = self.rendererDayValue.bind(self),
                    boundPdfRendererDayValue = self.pdfRendererDayValue.bind(self),
                    tableColumns,
                    i;

                tableColumns = [
                    {
                        forPropertyName: 'type',
                        label: i18n( 'activity-schema.MedData_T.type.i18n' ),
                        width: '120px',
                        isSortable: true,
                        isFilterable: true,
                        filterBy: function __col_type_filterBy( row ) {
                            var
                                filterValue = this.filterField.value(),
                                filterValueLowerCase = (typeof filterValue === "string") ? filterValue.toLowerCase() : null,

                                // determine the row value by the item template's i18n or fallback to the type itself
                                rowValue = unwrap( row.i18n ) || unwrap( row.type ),
                                rowValueLowerCase = (typeof rowValue === "string") ? rowValue.toLowerCase() : null;

                            return (
                                filterValueLowerCase !== null &&
                                rowValueLowerCase !== null &&
                                rowValueLowerCase.indexOf( filterValueLowerCase ) !== -1
                            );
                        },
                        renderer: function __col_type_renderer( meta ) {
                            return unwrap( meta.row.i18n ) || unwrap( meta.value );
                        },
                        sortBy: function __col_type_sortBy( aString, bString ) {
                            // gravidogramm types have a fixed sorting
                            if( isGravidogramm ) {
                                return self.sortGravidogrammTypes( aString, bString );
                            }

                            return self.sortMedDataTypes( aString, bString, templateCollection );
                        },
                        css: {
                            "no-wrap": true
                        }
                    },
                    {
                        forPropertyName: 'unit',
                        label: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                        width: '80px',
                        visible: ('MEDDATA' === actType),     //  MOJ-9420 hide unit column if GRAVIDOGRAMM
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'sampleNormalValueText',
                        width: medDataConfig.getOverriddenWidth( 'sampleNormalValueText', 'auto' ),
                        label: medDataConfig.getOverriddenLabel( 'sampleNormalValueText', i18n( 'activity-schema.MedData_T.sampleNormalValueText.i18n' ) ),
                        title: medDataConfig.getOverriddenTitle( 'sampleNormalValueText', i18n( 'activity-schema.MedData_T.sampleNormalValueText.i18n' ) )
                    }
                ];

                medDataConfig.columns.forEach( function( medDataColumn ) {
                    if( medDataColumn instanceof MedDataColumnClient ) {
                        if( !medDataColumn.excluded ) {
                            if( medDataColumn.static ) {
                                tableColumns.push( medDataColumn.toKoEditableTableColumnOptions() );
                            }
                        }
                    }
                } );

                for( i = 1; i <= self.maxDateColumns; i++ ) {
                    tableColumns.push( {
                        forPropertyName: self.getDynamicDayKey( i ),
                        label: 'value',
                        width: '100px',
                        timestamp: true,
                        isSortable: true,
                        isFilterable: false,
                        visible: false,
                        visibleByUser: false,
                        renderer: boundRendererDayValue,
                        pdfRenderer: boundPdfRendererDayValue
                    } );
                }

                tableColumns.push( {
                    forPropertyName: 'graph',
                    label: i18n( 'MedDataTableEditorModel.columns.graph' ),
                    width: '57px',
                    isSortable: false,
                    isFilterable: false,
                    visible: ( 'MEDDATA' === actType ),     //  MOJ-9420 Hide chart column on GRAVIDOGRAMM table
                    onCellClick: function( meta ) {
                        var data = meta.row;
                        if( data.hasChartValue ) {
                            // open a modal and display the rendered chart
                            Y.doccirrus.modals.medDataChartModal.showDialog( {
                                'data': meta.row,
                                'currentActivity': currentActivity,
                                'formData': {
                                    //  for header
                                    'patientName': currentPatient._getNameSimple(),
                                    'dob': moment( unwrap( currentPatient.dob ) ).format( TIMESTAMP_FORMAT ),
                                    'insuranceNames': currentPatient.getInsuranceNames(),
                                    'creationDate': moment().format( TIMESTAMP_FORMAT ),
                                    //  for mapping / API
                                    'patientId': unwrap( currentPatient._id ),
                                    'activityId': unwrap( currentActivity._id ),
                                    'caseFolderId': unwrap( currentActivity.caseFolderId ),
                                    'timestamp': unwrap( currentActivity.timestamp ),
                                    'latest': true
                                },
                                'onMediaAttached': onChartImageAttached
                            } );
                        }
                    },
                    renderer: function( meta ) {
                        var data = meta.row;
                        if( data.hasChartValue ) {
                            return '<button name="showChartDialog" type="button" class="btn btn-default btn-xs">' + i18n( 'general.title.GRAPH' ) + '</button>';
                        }
                        return '';
                    },
                    pdfRenderer: function() {
                        //  do not show the graph button in PDF
                        return '';
                    }
                } );

                self.medDataKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        pdfTitle: 'Medizindaten',
                        formRole: 'casefile-labdata-table',
                        pdfFields: {
                            patientName: currentPatient._getNameSimple(),
                            dob: moment( peek( currentPatient.dob ) ).format( TIMESTAMP_FORMAT ),
                            insuranceNames: currentPatient.getInsuranceNames()
                        },
                        stateId: 'CaseFileMojit-MedDataTableEditorModel-medDataKoTable-' + actType,
                        states: [ 'limit', 'usageConfigurationValue' ],
                        striped: false,
                        fillRowsToLimit: false,
                        responsive: false,
                        data: [],
                        scrollToTopOfTableWhenPaging: false,
                        visibleColumnsConfigurationVisible: true,
                        selectMode: 'none',
                        columns: tableColumns,
                        fixedTableLayout: false,
                        scrollable: true

                        //  tableMinWidth removed, since it causes clipping of context menus,EXTMOJ-2158
                    }
                } );

                self.medDataKoTable.scrollable( true );
                self.medDataKoTable.fixedTableLayout( false );
                self.medDataKoTable.toggleFixNonDynamicColumns( true );

                function onChartImageAttached( mediaObj ) {
                    self.addMediaAttachment( mediaObj );
                }

            },

            /**
             * Sort MedDataItems by their alphabetical order.
             * Tries to get the translated values from the MedDataItemTemplate
             * stored in the handed over TemplateCollection.
             * @param {string} aString
             * @param {string} bString
             * @param {MedDataItemTemplateCollection} templateCollection
             * @return {number}
             */
            sortMedDataTypes: function( aString, bString, templateCollection ) {
                var
                    aTemplate = templateCollection && templateCollection.findTemplateByType( aString ),
                    bTemplate = templateCollection && templateCollection.findTemplateByType( bString );

                return KoUI.utils.String.comparators.natural(
                    aTemplate && aTemplate.i18n || aString,
                    bTemplate && bTemplate.i18n || bString
                );
            },

            /**
             * Sort Gravidogramm types by their order in the hard-coded ENUM,
             * to pertain a pre-defined order different from the alphabetical order.
             * @param {string} aString
             * @param {string} bString
             * @return {number}
             */
            sortGravidogrammTypes: function( aString, bString ) {
                var
                    sortKeys = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
                    k;

                for( k in sortKeys ) {
                    if( Object.prototype.hasOwnProperty.call( sortKeys, k ) ) {
                        if( sortKeys[k] === aString ) {
                            return -1;
                        }
                        if( sortKeys[k] === bString ) {
                            return 1;
                        }
                    }
                }
                return 0;
            },

            /**
             *  Called when meddata chart modal creates a new image or PDF of a chart, to be attached to currentActivity
             *
             *  @param  mediaObj
             */

            addMediaAttachment: function( mediaObj ) {
                var
                    self = this,
                    binder = self.get( 'binder' ),

                    currentActivity = unwrap( binder.currentActivity ),
                    currentPatient = unwrap( binder.currentPatient ),
                    currentView = unwrap( binder.currentView() ),
                    activityDetailsVM = unwrap( currentView.activityDetailsViewModel ),

                    activityDetailsNav = ko.unwrap( activityDetailsVM.activityNav ),
                    attachments = activityDetailsVM.attachmentsModel;

                Y.log( 'Received uploaded media to be attached to activity: ' + mediaObj._id + ' facade: ', {}, 'debug', NAME );
                if ( !currentActivity._isEditable() ) { return; }

                attachments.addDocumentFromMedia( {}, mediaObj, currentActivity, currentPatient );

                //  switch to Ext Dokumente tab
                window.location.hash = unwrap( activityDetailsNav.getItemByName( 'documentform' ).href );
            }

        },
        {
            NAME: 'MedDataTableEditorModel'
        } );

    KoViewModel.registerConstructor( MedDataTableEditorModel );
}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivityEditorModel',
        'MedDataChartModal',
        'v_meddata-schema',
        'dc-comctl',
        'meddata-api',
        'tag-schema',
        'v_meddata-schema',
        'v_ingredientplan-schema'
    ]
} );
