/**
 * User: strix
 * Date: 20/10/16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 *
 * Renderers for individual labdata types will be added in labdata-finding-utils.js
 */

/*eslint prefer-template:0, strict:0, no-control-regex:0 */
/*global YUI, ko, moment, async, $, _ */

'use strict';

YUI.add( 'LabdataTableEditorModel', function( Y, NAME ) {
    /**
     * @module LabdataTableEditorModel
     */

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,

        //NUM_INITIAL_ENTRIES = 1,      //  number of activities/columns to show by default

        LABDATA_LIMIT = 65535,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_DOQUVIDE = i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' ),
        TYPE = i18n( 'labtest-schema.LabTest_T.head.i18n' ),
        LABEL = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.LABEL' ),
        UNIT = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.UNIT' ),
        MAX = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MAX' ),
        MIN = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MIN' ),
        EXPECTED = i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.EXPECTED' ),
        LABNAME = i18n( 'labtest-schema.LabTest_T.labName' ),
        COLUMNPREFIX = '_dynamic_',
        dateStringToMatch = function (date) {
            var match = /^[\s\S]{0,10}/.exec(date);

            return match && match[0] || '';
        },
        TABLE_PARAMS;

    /**
     * @class LabdataTableEditorModel
     * @constructor
     * @extends ActivityEditorModel
     * @param   {Object}    config
     */
    function LabdataTableEditorModel( config ) {
        LabdataTableEditorModel.superclass.constructor.call( this, config );
    }

    LabdataTableEditorModel.ATTRS = {
        whiteList: {
            value: [],
            lazyAdd: false
        }
    };

    Y.extend( LabdataTableEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {

            //  KO properties
            labdataKoTable: null,
            hookFirst: null,

            select2LabDates: null,
            allLabdataActivities: null,                 //  _id and date of all labdata activities for this patient
            allLabdataDates: null,                      //  activity _ids grouped by date
            fullLabdataActivities: null,                //  selected labdata activities     DEPRECATED
            fullLabdataDates: null,                     //  selected labdata activities

            isPanelVisible: null,

            showPathologicalOnly: null,

            rowTypeEnum: null, // [ { 'val': 'loading', '-en': 'loading...', '-de': 'geladen' } ],
            actColWidth: null,
            actColMinWidth: null,
            fullView: null,

            labDataStartDate: null,
            startDateOptions: null,
            endDateOptions: null,
            labDataEndDate: null,

            latestLabdataEntries: null,
            latestLabdataEntriesPriority: null,
            select2LatestLabdata: null,

            medLabDataAliases: null,
            hasMedLabdataAliases: null,
            isFullScreenView: false,
            isSpreadColumnsByTime: false,

            //  plain properties
            //activityDates: {},
            //activityIds: [],

            isFirstLoad: true,
            sortOrder: [],

            initializer: function( config ) {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentUser = binder.getInitialData( 'currentUser' ),
                    initialSortOrder = binder.getInitialData( 'labdataSortOrder' ),
                    currentActivity = unwrap( binder.currentActivity ),
                    storedFullView = Y.doccirrus.utils.localValueGet( 'labdata_fullView' ),
                    storedShowPathologicalOnly = Y.doccirrus.utils.localValueGet( 'labdata_showPathologicalOnly' ),
                    storedShowNotes = Y.doccirrus.utils.localValueGet( 'labdata_showNotes' ),
                    storedShowHighLow = Y.doccirrus.utils.localValueGet( 'labdata_showHighLow' ),
                    storedIsSpreadColumnsByTime = Y.doccirrus.utils.localValueGet( 'labdata_isSpreadColumnsByTime' );

                self.config = config;
                self.tooltipAllDatesI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_ALL_DATES' );
                self.tooltipShowMiniChartsI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_MINI_CHARTS' );
                self.tooltipPDFLandScapeI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_PDF_LANDSCAPE' );
                self.tooltipPDFPortraitI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_PDF_PORTRAIT' );

                self.tooltipShowPathologicalOnlyI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_PATHOLOGICAL_ONLY' );
                self.tooltipShowNotesI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_NOTES' );
                self.tooltipShowHighLowI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_HIGH_LOW' );

                self.tooltipFullScreenViewI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_FULLSCREEN_VIEW' );

                self.tooltipSpreadColumnsByTimeI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SPREAD_COLUMN' );

                self.addAllDatesI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.ADD_ALL_DATES' );

                currentUser.labdataSortOrder = initialSortOrder ? initialSortOrder : '';

                self.fullView = ko.observable( 'undefined' === typeof storedFullView || storedFullView === 'true' );
                self.actColWidth = ko.observable( '7%' );
                self.actColMinWidth = ko.observable( '70px' );

                if( currentUser && currentUser.labdataSortOrder && currentUser.labdataSortOrder.split ) {
                    self.sortOrder = currentUser.labdataSortOrder.split( ',' );
                } else {
                    Y.log( 'No predefined sort order, re-initializing.', 'debug', NAME );
                    currentUser.labdataSortOrder = [];
                    self.sortOrder = [];
                }

                //  TODO: check if this is still needed
                self.baseParams = {
                    query: {
                        patientId: unwrap( currentActivity.patientId ),
                        timestamp: unwrap( currentActivity.timestamp )
                    }
                };

                //  initialize basic observables
                self.allLabdataActivities = ko.observableArray( [] );
                self.fullLabdataActivities = ko.observableArray( [] );

                self.allLabdataDates = ko.observableArray( [] );
                self.fullLabdataDates = ko.observableArray( [] );

                self.isFullScreenView = ko.observable( false );

                self.allRows = ko.observableArray( [] );
                self.hasMedLabdataAliases = ko.observable( false );

                self.showPathologicalOnly = ko.observable( 'undefined' === typeof storedShowPathologicalOnly || storedShowPathologicalOnly === 'true' );
                self.showNotes = ko.observable( 'undefined' === typeof storedShowNotes || storedShowNotes === 'true' );
                self.showHighLow = ko.observable( 'undefined' === typeof storedShowHighLow || storedShowHighLow === 'true' );
                self.isSpreadColumnsByTime =  ko.observable( storedIsSpreadColumnsByTime === 'true' );

                self.selectedTimestamp = ko.observable( self.isSpreadColumnsByTime() ? TIMESTAMP_FORMAT_DOQUVIDE : TIMESTAMP_FORMAT );

                //  hide this panel if we have not data to show in table
                self.isPanelVisible = ko.computed( function() {
                    var allActivities = self.allLabdataActivities();
                    return (allActivities.length > 0);
                } );

                //  TODO: move to table initialization
                self.rowTypeEnum = ko.observableArray();
                self.makeRowTypeEnum( [] );

                self.latestLabdataEntries = ko.observable( '' );
                self.latestLabdataEntriesPriority = ko.observable( false );

                self.initSelect2LabDates( self.config );
                self.initKoTable();
                self.initDatePicker();
                self.initLatestLabdataEdit();

                //  set whether PDF button for laborblatt requests charts, MOJ-9218
                self.updateLaborblattCharting();
            },

            destructor: function() {
                $( 'body' ).toggleClass( 'modal-open', false );
            },

            /**
             * Returns the binder.currentActivity by default if actType is LABDATA
             * otherwise it returns the labdata activity from allLabdataActivities
             * with the closest date following the current labDataStartDate
             * (which could be a labdata activity with the same date)
             *
             * Returns plain object
             *
             * @param {Object} [that]
             * @returns {Object} currentLabdataActivity
             */
            getCurrentLabdata: function( that ) {
                var
                    self = that || this,
                    binder = self.get( 'binder' ),
                    currentActivity = unwrap( binder.currentActivity ),
                    currentActivityType = unwrap( currentActivity.actType ),
                    // these bellow will only be used if the current activity is not labdata
                    currentMomentDate,
                    allLabdataActivities,
                    counter,
                    matchFound;

                // if the labdata table editor is opened within a FORM
                if( currentActivityType !== 'LABDATA' ) {
                    // get current activity from date and return it
                    // it won't have as many properties as the ViewModel
                    currentMomentDate = moment( unwrap( self.labDataStartDate ) );
                    allLabdataActivities = unwrap( self.allLabdataActivities );

                    counter = 0;
                    while( counter < allLabdataActivities.length ) {
                        matchFound = allLabdataActivities[counter].momentDate.isSameOrBefore( currentMomentDate );
                        if( matchFound ) {
                            return allLabdataActivities[counter];
                        }
                        counter++;
                    }
                }

                return currentActivity.toJSON();
            },

            /**
             *  Control to show or hide columns corresponding to other labdata entries
             *
             *  @param  {Object}    config                  Passed by parent
             *  @param  {Object}    config.currentDates     Initial / restore date columns to show
             */
            initSelect2LabDates: function( config ) {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = ko.unwrap( binder.currentPatient );

                async.series( [initObservables, getAllLabdataActivities, groupActivitiesByDate], onAllDone );

                function initObservables( itcb ) {
                    if (!self.select2LabDates) {
                        self.select2LabDates = self.select2LabDatesConfig.call( self );
                    }
                    itcb( null );
                }

                function getAllLabdataActivities( itcb ) {
                    Y.doccirrus.jsonrpc.api.activity
                        .read( {
                            query: {
                                patientId: ko.unwrap( currentPatient._id ),

                                /*  TODO: MOJ-12537 status CANCELLED ?? */

                                //  LABDATA ONLY
                                actType: 'LABDATA',
                                l_extra: {$exists: true}

                                //  LABDATA AND MEDDATA
                                //'actType': { $in: [ 'LABDATA', 'MEDDATA', 'PERCENTILECURVE' ] },

                                // 'timestamp': { $lte: unwrap( currentActivity.timestamp ) }
                            },
                            //  only select _id, date fields
                            options: {
                                itemsPerPage: LABDATA_LIMIT,
                                fields: {
                                    _id: 1,
                                    timestamp: 1
                                }
                                // TODO: sort by timestamp
                                // ,
                                // sort: {
                                //     timestamp: self.sortByTimestamp
                                // }
                            }
                        } )
                        .then( onDataReceived )
                        .fail( itcb );

                    function onDataReceived( data ) {
                        data = data.data ? data.data : data;

                        var
                            lastDate = '',
                            dateCounter = 0,
                            momentDate,
                            i;

                        for( i = 0; i < data.length; i++ ) {
                            // curiously, using moment( new Date( ISODate ) ) instead of moment( ISODate ) is 10 times faster
                            momentDate = moment( data[i].timestamp );
                            // clone to avoid mutation
                            data[i].momentDate = momentDate.clone();
                            data[i].label = momentDate.format( peek( self.selectedTimestamp ) );
                            data[i].startDayTimestamp = momentDate.startOf( 'day' ).unix();
                            if( data[i].label === lastDate ) {
                                dateCounter++;
                                //  TODO: tidier way to label duplicate dates
                                data[i].label = data[i].label + ' (+' + dateCounter + ')';
                            } else {
                                lastDate = data[i].label;
                                dateCounter = 0;
                            }
                        }

                        data.sort( self.sortByTimestamp.bind(self) );

                        self.allLabdataActivities( data );
                        itcb( null );
                    }
                }

                function groupActivitiesByDate( itcb ) {
                    var
                        activities = ko.unwrap( self.allLabdataActivities() ),
                        latestLabdataEntries = self.getLatestLabDataForProfile(),
                        currentLabdataTimestamp,
                        startMomentDate,
                        endMomentDate,
                        activityIsInDateRange,
                        activityIdIndex,
                        dates = {},
                        tempDate,
                        tempMomentDate,
                        currentLabdata = self.getCurrentLabdata(),
                        currentLabdataId = currentLabdata._id,
                        currentLabdataReached,
                        i, k;

                    if( latestLabdataEntries && latestLabdataEntries !== '0' ) {
                        latestLabdataEntries = Number( latestLabdataEntries );
                        currentLabdataTimestamp = currentLabdata.timestamp;
                        endMomentDate = self.getMomentDateOfFurthestLabdataEntry( {
                            latestEntries: latestLabdataEntries,
                            currentLabdataTimestamp: currentLabdataTimestamp
                        } );

                        startMomentDate = moment( currentLabdataTimestamp );

                        self.labDataStartDate( endMomentDate.toJSON() );
                    }

                    for( i = 0; i < activities.length; i++ ) {
                        tempMomentDate = activities[i].momentDate;
                        tempDate = activities[i].label;
                        if( !self.isSpreadColumnsByTime() ){
                            tempDate = tempMomentDate.format( peek( self.selectedTimestamp ) );
                        }

                        if( dates.hasOwnProperty( tempDate ) ) {
                            dates[tempDate].isSelected = dates[tempDate].isSelected || currentLabdata.timestamp === activities[i].timestamp;
                        } else {
                            dates[tempDate] = {
                                date: tempDate,
                                label: tempDate,
                                momentDate: tempMomentDate,
                                activities: [],
                                activityIds: [],
                                isSelected: currentLabdata.timestamp === activities[i].timestamp
                            };
                        }

                        //  store minimal activity object, to allow display of time series on the same date
                        dates[tempDate].activities.push( activities[i] );
                        dates[tempDate].activityIds.push( activities[i]._id );
                    }

                    i = 0;
                    for( k in dates ) {
                        if( dates.hasOwnProperty( k ) ) {
                            if( dates[k].activities.length > 1 ) {
                                dates[k].label = dates[k].label + ' (' + dates[k].activities.length + ')';
                            }
                            i++;
                        }
                    }

                    //  Set selected dates if passed by parent, MOJ-9074
                    if( config && config.currentDates && config.currentDates.length > 0 ) {
                        for( k in dates ) {
                            if( dates.hasOwnProperty( k ) ) {
                                dates[k].isSelected = (-1 !== config.currentDates.indexOf( dateStringToMatch(k) ) );
                            }
                        }
                    }

                    // set selected dates if latestLabdataEntries pre-selected
                    // Only show the selected number if latestLabdataEntries is available/selected
                    i = 0;
                    currentLabdataReached = false;

                    if( latestLabdataEntries && endMomentDate && currentLabdataId ) {
                        for( k in dates ) {
                            if( !dates.hasOwnProperty( k ) ) {
                                continue;
                            }

                            // get index to check if activityId is in the date object
                            activityIdIndex = dates[k].activityIds.indexOf( currentLabdataId );

                            if( !currentLabdataReached && dates[k].activityIds && dates[k].activityIds.length ) {
                                currentLabdataReached = (-1 !== activityIdIndex);
                            }

                            // we only want to start counting the last entries once we hit the current/selected activity
                            if( !currentLabdataReached ) {
                                dates[k].isSelected = false;
                                continue;
                            }

                            if( i < latestLabdataEntries ) {
                                activityIsInDateRange = dates[k].momentDate.isSameOrBefore( startMomentDate )
                                                        && dates[k].momentDate.isSameOrAfter( endMomentDate );

                                // if the date objects are stored without hours and minutes
                                //  we might find that the given momentDate is out of range
                                //  but the specific activity's time is within range
                                //  so we just check if the activityId is inside of the date object too
                                if( activityIsInDateRange || (-1 !== activityIdIndex) ) {
                                    dates[k].isSelected = true;

                                    // check if we are in normal mode, with several activities per day
                                    // when in split mode (isSpreadColumnsByTime) there will only be one activity per datetime
                                    // (we could also check for isSpreadColumnsByTime here)
                                    if( dates[k].activityIds.length > 1 ) {
                                        // add the number of activityIds following the selected one (including the selected one in this case)
                                        // to exclude the selected one add 1 (+1) to activityIdIndex
                                        i = i + (dates[k].activityIds.length - activityIdIndex);
                                        continue;
                                    }

                                    // otherwise we probably have one activity per datetime / timestamp i.e. isSpreadColumnsByTime should be true
                                    i++;
                                    continue;
                                }
                            }

                            // unselect every other date
                            dates[k].isSelected = false;
                        }
                    }

                    self.allLabdataDates( dates );

                    //  Show the current (first) date by default, MOJ-9365
                    //  Show dates from labdata table in form if stored, MOJ-9074
                    //  Add initial selection
                    const datesToBeAdded = [];
                    for( k in dates ) {
                        if( dates.hasOwnProperty( k ) ) {
                            if( dates[k].isSelected ) {
                                datesToBeAdded.push( dates[k] );
                            }
                        }
                    }
                    self.addFullDate( datesToBeAdded );

                    itcb( null );
                }

                function onAllDone( err ) {
                    if( err ) {
                        Y.log( 'Problem setting up labdata select2: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                    //  callback here
                }

            },

            /**
             *  Set up a select2 control for other labdata activities in this view
             *
             * @attribute select2LabDatesConfig
             * @type {function}
             * @see ko.bindingHandlers.select2
             */
            select2LabDatesConfig: function() {
                var
                    self = this;

                //  Get current set of keys/values which are chosen in select2
                function select2LabDatesRead() {
                    var
                        allDates = ko.unwrap( self.allLabdataDates ) || {},
                        temp = [],
                        k;

                    for( k in allDates ) {
                        if( allDates.hasOwnProperty( k ) ) {
                            if( allDates[k].isSelected ) {
                                temp.push( {
                                    id: allDates[k].date,
                                    text: allDates[k].label
                                } );
                            }
                        }
                    }

                    return temp;
                }

                //  Change current selection
                function select2LabDatesWrite( $event ) {
                    var
                        allDates = ko.unwrap( self.allLabdataDates ) || [],
                        k;

                    if( 'change' === $event.type ) {
                        //  add a selected entry
                        if( $event.added ) {
                            for( k in allDates ) {
                                if( allDates.hasOwnProperty( k ) && allDates[k].date === $event.added.id ) {
                                    allDates[k].isSelected = true;
                                    self.addFullDate( {
                                        date: $event.added.id,
                                        label: $event.added.text
                                    } );
                                }
                            }

                        }

                        //  remove a selected entry
                        if( $event.removed ) {
                            for( k in allDates ) {
                                if( allDates.hasOwnProperty( k ) && allDates[k].date === $event.removed.id ) {
                                    allDates[k].isSelected = false;
                                    self.removeFullDate( $event.removed.id );
                                }
                            }
                        }
                    }
                }

                //  Return the subset of entries matching a text query
                function select2LabDatesQuery( query ) {
                    var
                        allDates = self.allLabdataDates(),
                        terms = query.term.split( ' ' ),
                        dateStr,
                        term,
                        matches = [],
                        match,
                        j, k;

                    for( k in allDates ) {
                        if( allDates.hasOwnProperty( k ) ) {
                            dateStr = allDates[k].label;
                            match = true;

                            //  check against user query
                            for( j = 0; j < terms.length; j++ ) {
                                term = $.trim( terms[j].toLowerCase() );
                                if( '' !== term ) {
                                    if( -1 === dateStr.indexOf( term ) ) {
                                        //  query term not in date string, does not match
                                        match = false;
                                    }
                                }
                            }

                            if( match ) {
                                matches.push( {
                                    id: allDates[k].date,
                                    text: allDates[k].label
                                } );
                            }
                        }

                    }

                    query.callback( {results: matches} );
                }

                return {
                    data: ko.computed( {
                        read: select2LabDatesRead,
                        write: select2LabDatesWrite
                    }, self ),
                    select2: {
                        minimumInputLength: 0,
                        allowClear: true,
                        maximumInputLength: 100,
                        placeholder: i18n( 'InCaseMojit.LabdataTableEditorModel.date_placeholder' ),
                        multiple: true,
                        fullView: true,
                        query: select2LabDatesQuery
                    },
                    init: function( /* element */ ) {
                        Y.log( 'initializing select2 to pick table columns', 'debug', NAME );
                    }
                };
            }, // end select2LabDatesConfig

            /* - used for debug of select2
            getSelectedActivities: function __LabdataTableEditorModel_getSelectedActivities() {
                var
                    self = this,
                    allActivities = self.allLabdataActivities(),
                    selActivities = [],
                    i;

                for ( i = 0; i < allActivities.length; i++ ) {
                    if ( allActivities[i].isSelected ) {
                        selActivities.push( allActivities[i] );
                    }
                }

                return selActivities;
            },
            */

            /**
             * Reverts the labdata table after disabling the split button or the dropdown selector
             */
            refreshSelect2LabDates: function() {
                var
                    self = this,
                    datesToMantain = [];

                // Remove all date columns in table
                peek( self.fullLabdataDates ).forEach( function( dateObj ) {
                    datesToMantain.push( dateStringToMatch( dateObj.date ) );

                    self.removeFullDate( dateObj.date );
                } );

                // Remove all select2 dates
                self.allLabdataDates( [] );

                // Remove all previously labData activites
                self.allLabdataActivities( [] );

                // Re-init select2Labdates with previously dates selected (if any)
                // So the user won't lose the already selected dates

                self.initSelect2LabDates( Object.assign( {}, self.config, {
                    currentDates: datesToMantain
                } ) );
            },

            initDatePicker: function() {
                var
                    self = this,
                    currentLabdata = self.getCurrentLabdata(),
                    currentLabdataTimestamp = currentLabdata.timestamp;

                self.startDatePlaceholderI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.startDatePlaceholder' );
                self.endDatePlaceholderI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.endDatePlaceholder' );

                self.startDateOptions = {
                    maxDate: ko.observable( moment( currentLabdataTimestamp ) ),
                    viewDate: ko.observable( moment( currentLabdataTimestamp ) )
                };

                self.endDateOptions = {
                    minDate: ko.observable( )
                };

                self.labDataStartDate = ko.observable();
                self.labDataEndDate = ko.observable( currentLabdataTimestamp );

                self.addDisposable( ko.computed( function() {
                    const
                        labDataStartDate = unwrap( self.labDataStartDate ),
                        labDataEndDate = unwrap( self.labDataEndDate ),
                        latestLabdataEntriesPriority = peek( self.latestLabdataEntriesPriority );


                    if ( !latestLabdataEntriesPriority && labDataStartDate && labDataEndDate ) {
                        self.addAllDatesInRange( {
                            startTimestamp: labDataEndDate,
                            endTimestamp: labDataStartDate
                        });

                        self.latestLabdataEntries( 0 );
                        self.updateLatestLabDataForProfile( 0 );

                        if ( labDataStartDate ) {
                            self.endDateOptions.minDate( moment( labDataStartDate ) );
                        }

                        self.startDateOptions.maxDate( moment( labDataEndDate ) );
                        self.startDateOptions.viewDate( moment( labDataEndDate ) );
                    }

                    self.latestLabdataEntriesPriority( false );

                }, { deferEvaluation: true } ).extend( { rateLimit: 100 } ) );
            },

            /**
             * Returns the date as self.selectedTimestamp format
             * that is on the n-th activity, n being latestEntries
             *
             * 1. if allLabdataDates is not available it gets the dates from the labdata activities
             * 2. sorts the date objects in descending date order
             * 3. returns the n-th date (except if there is a labdata activity on the current day: n + 1)
             *
             * @param {Object} args
             * @param {Number} args.latestEntries
             * @param {Number} [args.currentLabdataTimestamp]
             * @returns {MomentObject}
             */
            getMomentDateOfFurthestLabdataEntry: function( args ) {
                var
                    self = this,
                    latestEntries = args.latestEntries || 1,
                    currentLabdataTimestamp = args.currentLabdataTimestamp,
                    currentLabdataMomentDate,
                    allUniqueDatesList = [],
                    allLabdataActivities,
                    activityIsBeforeCurrentActivity;

                if( !currentLabdataTimestamp ) {
                    currentLabdataMomentDate = moment();
                } else {
                    // we add a second in order to include the current activity in the range
                    //  when checking with moment.isAfter
                    currentLabdataMomentDate = moment( currentLabdataTimestamp );
                }

                allLabdataActivities = ko.unwrap( self.allLabdataActivities ) || [];

                if( !allLabdataActivities.length ) {
                    Y.log( 'No labdata activities found to look back to', 'debug', NAME );
                    return;
                }

                allLabdataActivities.forEach( function( act ) {

                    activityIsBeforeCurrentActivity = currentLabdataMomentDate.isSameOrAfter( act.momentDate );

                    if( activityIsBeforeCurrentActivity ) {
                        allUniqueDatesList.push( {
                            momentDate: act.momentDate,
                            startDayTimestamp: act.startDayTimestamp
                        } );
                    }
                } );

                if( !allUniqueDatesList || !allUniqueDatesList.length ) {
                    Y.log( 'No dates found to look back to', 'debug', NAME );
                    return;
                }

                latestEntries--;

                if( allUniqueDatesList.length <= latestEntries ) {
                    return allUniqueDatesList.pop().momentDate.clone();
                }

                return allUniqueDatesList[latestEntries].momentDate.clone();
            },

            /**
             * Shows the latest labdata dates which include the number of last entries according to input
             * e.g. if 25.06.2020 is selected and this day has 4 labdata entries, and user selects 5 latestentries,
             *  then the user will see two columns: one for 25.06.2020 and another for 24.06.2020 (which includes a labdata entry)
             *
             * 1. gets the date from the n activity, n being latestEntries
             * 2. updates labdata table
             * 3. updates date picker dates
             * @param {Number} latestEntries
             */
            showLatestLabdataEntries: function( latestEntries ) {
                Y.log( 'Selected entries to look back: ' + latestEntries, 'debug', NAME );

                var
                    self = this,
                    newMomentDate,
                    currentLabdata = self.getCurrentLabdata(),
                    currentLabdataTimestamp = currentLabdata.timestamp;

                newMomentDate = self.getMomentDateOfFurthestLabdataEntry( {
                    latestEntries: latestEntries,
                    currentLabdataTimestamp: currentLabdataTimestamp
                } );

                if(!newMomentDate) {
                    Y.log( 'No new date found', 'debug', NAME );
                    return;
                }

                self.addAllDatesInRange( {
                    startTimestamp: currentLabdataTimestamp,
                    endTimestamp: newMomentDate.toJSON(),
                    limit: latestEntries
                });

                self.endDateOptions.minDate( newMomentDate );
                self.startDateOptions.maxDate(  moment( currentLabdataTimestamp ) );
                self.startDateOptions.viewDate( moment( currentLabdataTimestamp ) );

                self.labDataStartDate( newMomentDate.toJSON() );
                self.labDataEndDate( currentLabdataTimestamp );
            },


    /**
             * Initialises the latestLabdata and select2LatestLabdata dropdown
             */
            initLatestLabdataEdit: function() {
                var
                    self = this,
                    defaultLastEntries = '0',
                    currentValue = Number(self.getLatestLabDataForProfile() || defaultLastEntries);

                self.latestLabdataEntries( currentValue );

                self.latestLabdataEntriesPriority( !!currentValue );

                self.select2Data = ko.computed( function () {
                    var isFullScreenView = unwrap( self.isFullScreenView );

                    if (isFullScreenView) {
                        return [
                            {id: '25', text: '25'},
                            {id: '50', text: '50'},
                            {id: '100', text: '100'},
                            {id: '200', text: '200'}
                        ];
                    }

                    return [
                        {id: '1', text: '1'},
                        {id: '2', text: '2'},
                        {id: '3', text: '3'},
                        {id: '4', text: '4'},
                        {id: '5', text: '5'},
                        {id: '6', text: '6'},
                        {id: '7', text: '7'},
                        {id: '8', text: '8'},
                        {id: '9', text: '9'},
                        {id: '10', text: '10'},
                        {id: '11', text: '11'},
                        {id: '12', text: '12'},
                        {id: '13', text: '13'},
                        {id: '14', text: '14'},
                        {id: '15', text: '15'},
                        {id: '16', text: '16'}
                    ];
                } );

                self.select2LatestLabdata = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return self.latestLabdataEntries();
                        },
                        write: function( $event ) {
                            if( !$event.val && (typeof $event.val !== 'string') ) {
                                // shouldn't happen
                                return;
                            }

                            self.latestLabDataEntriesUpdate( $event.val, peek( self.isFullScreenView ) );
                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'InCaseMojit.LabdataTableEditorModel.latestEntries' ),
                        allowClear: true,
                        quietMillis: 500,
                        data: function () {
                            return {
                                results: unwrap( self.select2Data )
                            };
                        }
                    }
                };


            },

            latestLabDataEntriesUpdate: function(value, preventUserProfileStore = false) {
                var
                    self = this,
                    newValue = Number( value );
                // if user cleared the dropdown the value will be 0

                if( !!newValue ){
                    // add priority to avoid overriding the dropdown value when datepicker date is updated
                    self.latestLabdataEntriesPriority( true );
                    self.showLatestLabdataEntries( newValue );
                }

                self.latestLabdataEntries( newValue );

                if (!preventUserProfileStore) {
                    self.updateLatestLabDataForProfile( newValue );
                }

                // user must have cleared the dropdown selector
                if( !newValue ) {
                    self.refreshSelect2LabDates();
                }
            },

            getLatestLabDataForProfile: function() {
                return Y.doccirrus.utils.localValueGet( 'LatestLabDataEntriesToShow' );
            },

            updateLatestLabDataForProfile: function( newValue ) {
                return Y.doccirrus.utils.localValueSet( 'LatestLabDataEntriesToShow', newValue );
            },

            /**
             * Initializes koTable
             *
             * @method initKoTable
             */

            initKoTable: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = unwrap( binder.currentPatient ),
                    tableColumns = self.getTableColumns();

                /**
                 *  Construct table from selected activities as if calling to server
                 *  @param params
                 *  @return {*}
                 */

                function hookProxy( params ) {
                    var
                        result = self.getAsTable( params ),
                        deferred = $.Deferred();
                    // here we try to preserve params for other calls of proxy through reloadTable calls
                    if( params && Object.keys( params ).length ) {
                        TABLE_PARAMS = params;
                        TABLE_PARAMS.params = {
                            page: params.page,
                            query: params.query,
                            sort: params.sort,
                            itemsPerPage: params.itemsPerPage
                        };
                    }

                    deferred.resolve( result );
                    return deferred;
                }

                function updateSortConfig( yEvent, data ) {
                    self.onRowReorder( yEvent, data );
                }

                //  instantiate table
                self.labdataKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        pdfTitle: i18n( 'activity-schema.Activity_E.LABDATA' ),
                        formRole: 'casefile-labdata-table',
                        pdfFields: {
                            patientName: currentPatient._getNameSimple(),
                            dob: moment( peek( currentPatient.dob ) ).format( TIMESTAMP_FORMAT ),
                            insuranceNames: currentPatient.getInsuranceNames()
                        },
                        //keepReportColumns: true,
                        stateId: 'CaseFileMojit-DCDataVisualisationModel-tableformKoTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        limitList: [10, 20, 30, 40, 50, 100, 200],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: hookProxy,
                        baseParams: self.baseParams,
                        responsive: false,
                        visibleColumnsConfigurationVisible: true,
                        draggableRows: true,
                        isRowDraggable: function( /* $context*/ ) {
                            return true;
                        },
                        onCellClick: function( evt ) {
                            self.onTableCellClick( evt );
                        },
                        columns: tableColumns
                    }
                } );

                self.allLabDataDatesBeforeFullScreen = ko.observable( null );
                self.fullLabdataDatesBeforeFullScreen = ko.observable( null );

                self.addDisposable( ko.computed( function() {
                    var
                        isFullScreenView = unwrap( self.isFullScreenView ),
                        labDataTable = self.labdataKoTable,
                        columns = unwrap( labDataTable.columns );

                    if( isFullScreenView && columns.length > 0 ) {
                        labDataTable.toggleFixNonDynamicColumns( true );
                    } else {
                        labDataTable.toggleFixNonDynamicColumns( false );
                    }

                } ).extend( {rateLimit: {timeout: 100, method: "notifyWhenChangesStop"}} ) );

                // Handle drag and drop
                self.labdataKoTable.events.on( 'KoTable:draggedRows', updateSortConfig );
                self.labdataKoTable.pdfSaveHook = function( options ) {
                    self.onRequestSavePdf( options );
                };

                self.addDisposable( self.isSpreadColumnsByTime.subscribe( function(isSpreadColumnsByTime) {
                    // Re-define timestamp usage
                    self.selectedTimestamp( isSpreadColumnsByTime ? TIMESTAMP_FORMAT_DOQUVIDE : TIMESTAMP_FORMAT );

                    self.refreshSelect2LabDates();
                }) );
            },

            getTableColumns: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),

                    //  for attaching PDFs and charts created from this table
                    currentActivity = unwrap( binder.currentActivity ),
                    currentPatient = unwrap( binder.currentPatient ),

                    tableColumns;

                function hasShowChartButton( data ) {
                    //var allActs = self.allLabdataActivities();
                    return data.max || data.min;
                }

                function onChartMediaAttached( mediaObj ) {
                    self.addMediaAttachment( mediaObj );
                }

                //  add columns for sort / filter fields
                tableColumns = [
                    {
                        componentType: 'KoTableColumnDrag',
                        forPropertyName: 'KoTableColumnDrag',
                        onlyDragByHandle: true,
                        visible: true
                    },

                    {
                        forPropertyName: 'labName',
                        label: LABNAME,
                        width: '150px',
                        isSortable: true,
                        direction: 'ASC',
                        isFilterable: true,
                        visible: false
                    },

                    {
                        forPropertyName: 'type',
                        pdfColumnName: 'head',
                        label: TYPE,
                        width: '80px',
                        isSortable: false,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: self.rowTypeEnum,
                            optionsText: '-de',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var
                                labHead = meta.row.type || '',
                                label = meta.row.labTestLabel || '';
                            return '<span title="' + label + '">' + labHead + '</span>';
                        }
                    },

                    {
                        forPropertyName: 'labTestLabel',
                        label: LABEL,
                        width: '190px',
                        isSortable: false,
                        isFilterable: true,
                        visible: true,
                        renderer: function( meta ) {
                            var value = meta.row.labTestLabel;
                            return '<span>' + (value || '') + '</span>';
                        }
                    },

                    {
                        forPropertyName: 'labNormalText',
                        label: EXPECTED,
                        width: '180px',
                        isSortable: false,
                        isFilterable: true,
                        visible: false,
                        renderer: function( meta ) {
                            var value = meta.row.labNormalText;
                            return '<span>' + (value || '') + '</span>';
                        }
                    },
                    {
                        forPropertyName: 'min',
                        label: MIN,
                        width: '80px',
                        isSortable: false,
                        isFilterable: true,
                        visible: false,
                        renderer: function( meta ) {
                            var value = meta.row.min || '';

                            if( value && '' !== value ) {
                                //  note that numberToLocalString will not work here, since these may be text with
                                //  boolean operators
                                value = value + '';
                            }
                            return '<span>' + value + '</span>';
                        }
                    },
                    {
                        forPropertyName: 'max',
                        width: '80px',
                        label: MAX,
                        isSortable: false,
                        isFilterable: true,
                        visible: false,
                        renderer: function( meta ) {
                            var value = meta.row.max || '';

                            if( value && '' !== value ) {
                                //  note that numberToLocalString will not work here, since these may be text with
                                //  boolean operators
                                value = value + '';
                            }
                            return '<span>' + value + '</span>';
                        }
                    },
                    {
                        forPropertyName: 'unit',
                        width: '80px',
                        isSortable: false,
                        isFilterable: true,
                        visible: false,
                        label: UNIT
                    },
                    {
                        forPropertyName: 'graph',
                        label: '',
                        width: '57px',
                        isSortable: false,
                        isFilterable: false,
                        onCellClick: function( meta ) {
                            if( !hasShowChartButton( meta.row ) ) {
                                return;
                            }
                            Y.doccirrus.modals.labDataChartModal.showDialog( {
                                col: meta.col,
                                row: meta.row,
                                entries: self.getEntriesByType( meta.row.type ),
                                onMediaAttached: onChartMediaAttached,
                                activity: currentActivity,
                                formData: {
                                    //  for header
                                    patientName: currentPatient._getNameSimple(),
                                    dob: moment( unwrap( currentPatient.dob ) ).format( TIMESTAMP_FORMAT ),
                                    insuranceNames: currentPatient.getInsuranceNames(),
                                    creationDate: moment().format( TIMESTAMP_FORMAT ),
                                    //  for mapping / API
                                    patientId: unwrap( currentPatient._id ),
                                    activityId: unwrap( currentActivity._id ),
                                    caseFolderId: unwrap( currentActivity.caseFolderId ),
                                    timestamp: unwrap( currentActivity.timestamp ),
                                    latest: true
                                }
                            } );
                        },
                        visible: true,
                        renderer: function( meta ) {
                            var data = meta.row;

                            if( hasShowChartButton( data ) /* && typeEntries.length >= 2 */ ) {
                                return '<button name="showChartDialog" type="button" class="btn btn-default btn-xs">Graph</button>';
                            } else {
                                return '';
                            }
                        },
                        pdfRenderer: function() {
                            //  do not show the graph button in PDF
                            return '';
                        }
                    }
                ];

                return tableColumns;
            },

            onRequestSavePdf: function( options ) {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentView = ko.unwrap( binder.currentView ),
                    activityDetailsVM = ko.unwrap( currentView.activityDetailsViewModel ),
                    attachments = activityDetailsVM.attachmentsModel;

                attachments.addDocumentFromCacheFile(
                    options.cacheFile.replace( '/pdf/', '' ),
                    unwrap( binder.currentActivity ),
                    unwrap( binder.currentPatient ),
                    onCachePdfSaved
                );

                function onCachePdfSaved() {
                    var activityDetailsNav = ko.unwrap( activityDetailsVM.activityNav );
                    window.location.hash = unwrap( activityDetailsNav.getItemByName( 'documentform' ).href );
                }
            },

            /**
             *  Called when labdata chart modal creates a new image or PDF of a chart, to be attached to currentActivity
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
                if( !currentActivity._isEditable() ) {
                    return;
                }

                attachments.addDocumentFromMedia( {}, mediaObj, currentActivity, currentPatient );

                //  switch to Ext Dokumente tab
                window.location.hash = unwrap( activityDetailsNav.getItemByName( 'documentform' ).href );
            },

            reloadTable: function() {
                var self = this;

                if( TABLE_PARAMS && Object.keys( TABLE_PARAMS ).length ) {
                    self.labdataKoTable.loadData( TABLE_PARAMS );
                } else {
                    self.labdataKoTable.loadData();
                }
            },

            hasFullActivity: function( activityId ) {
                var self = this;
                return !!self.getFullActivity( activityId );
            },

            getFullActivity: function( activityId ) {
                var
                    self = this,
                    fullActivities = self.fullLabdataActivities(),
                    i;

                for( i = 0; i < fullActivities.length; i++ ) {
                    if( activityId === fullActivities[i]._id ) {
                        return fullActivities[i];
                    }
                }

                return null;
            },

            /**
             * Dynamically add a new table column to represent the LABDATA findings of activities from a given date
             * @param  {object|object[]} dateObjOrArray collects latest test data of all activities on this date since current
             */
            addTableColumnDate: function( dateObjOrArray ) {
                var
                    self = this,
                    columnsToAdd = Array.isArray( dateObjOrArray ) ? dateObjOrArray : [dateObjOrArray],
                    currentCols = self.labdataKoTable.columns(),
                    sortCols;

                columnsToAdd.forEach( function forEachColumnToAdd( dateObj ) {

                    function tableCellRenderer( meta ) {
                        //  use activity and row head to extract value here
                        return self.getTableCellDate( dateObj, meta.row.type );
                    }

                    function tableCellRendererPdf( meta ) {
                        return self.getTableCellDatePdf( dateObj, meta.row.type );
                    }

                    var
                        columnConfig = {
                            owner: self.labdataKoTable,
                            forPropertyName: COLUMNPREFIX + dateObj.date,
                            label: dateObj.label,
                            width: self.actColWidth(),
                            visible: true,
                            visibleByUser: true,
                            renderer: tableCellRenderer,
                            rendererHeader: function( meta ) {
                                var
                                    label = unwrap( meta.label ),
                                    firstSpaceIndex = label.indexOf( ' ' );

                                if( firstSpaceIndex === -1 ) {
                                    return label;
                                } else {
                                    return label.substr( 0, firstSpaceIndex ) + '<br/>' + label.substr( firstSpaceIndex + 1 );
                                }
                            },
                            pdfRenderer: tableCellRendererPdf,
                            isSortable: false,
                            getCss: function( $context ) {
                                var
                                    cssObj = this.css(),
                                    head = $context.$parent.type,
                                    isPathological = false;

                                if( dateObj.entries.hasOwnProperty( head ) ) {
                                    isPathological = !!dateObj.entries[head].isPathological;
                                }

                                cssObj['bg-danger'] = isPathological;

                                return cssObj;
                            },
                            isDynamicallyAdded: true,
                            minWidth: self.actColMinWidth()
                        },
                        newColumn = KoComponentManager.createComponent( {
                            componentType: 'KoTableColumn',
                            componentConfig: columnConfig
                        } );

                    newColumn.isLabdata = true;             //  differentiate from static columns in sort
                    newColumn.timestamp = dateObj.date;     //  used to sort columns
                    newColumn.dateObj = dateObj;            //  used when exporting column in form tables
                    currentCols.push( newColumn );

                } );

                sortCols = self.sortTableColumns( currentCols );

                //  add column
                self.labdataKoTable.columns( sortCols );

                //  add to initial state (prevent column from being dropped when reset to initial state, by filters)
                self.labdataKoTable.positionIndexColumnsInitialState( sortCols );
            },

            /**
             *  Remove a dynamically added table column corresponding to a LABDATA activity
             *  @param {string|string[]} labelOrLabelArray
             */
            removeTableColumn: function( labelOrLabelArray ) {
                var
                    self = this,
                    labelsToRemove = Array.isArray( labelOrLabelArray ) ? labelOrLabelArray : [labelOrLabelArray],
                    oldCols = self.labdataKoTable.columns(),
                    newCols = [];

                // just continue, if a label has to be removed
                if( labelsToRemove.length === 0 ) {
                    return;
                }

                // filter out which columns to keep after the removal
                oldCols.forEach( function forEachOldCol( oldCol ) {
                    var
                        colName = ko.unwrap( oldCol.forPropertyName ),
                        colIsAmongLabelsToBeRemoved = labelsToRemove.some( function forEachLabelToRemove( label ) {
                            return colName === COLUMNPREFIX + label;
                        } );

                    if( colIsAmongLabelsToBeRemoved ) {
                        Y.log( 'Removing table column for label: ' + colName, 'debug', NAME );
                    } else {
                        newCols.push( oldCol );
                    }
                } );

                newCols = self.sortTableColumns( newCols );

                self.removeActivitiesForDate( labelsToRemove );

                self.labdataKoTable.columns( newCols );
                self.labdataKoTable.positionIndexColumnsInitialState( newCols );
            },

            countLabdataDateColumns: function() {
                var
                    self = this,
                    cols = self.labdataKoTable.columns(),
                    count = 0,
                    i;

                for( i = 0; i < cols.length; i++ ) {
                    if( cols[i].isLabdata ) {
                        count = count + 1;
                    }
                }

                return count;
            },

            /**
             * When a date/column is deselected, remove full activities to prevent empty rows for labdata items
             * which no longer have any values.
             *
             * @param  {string|string[]} dateOrDateArray
             */
            removeActivitiesForDate: function( dateOrDateArray ) {
                var
                    self = this,
                    datesToRemove = Array.isArray( dateOrDateArray ) ? dateOrDateArray : [dateOrDateArray],
                    oldActivities = self.fullLabdataActivities(),
                    newActivities = [],
                    allDates = self.allLabdataDates(),
                    selectedDates = datesToRemove.reduce( function forEachDateToRemove( datesLoadedToBeRemoved, date ) {
                        if( allDates.hasOwnProperty( date ) ) {
                            datesLoadedToBeRemoved.push( allDates[date] );
                        }
                        return datesLoadedToBeRemoved;
                    }, [] );

                if( selectedDates.length === 0 ) {
                    return;
                }

                oldActivities.forEach( function forEachOldActivity( oldActivity ) {
                    var activityIdFoundInRemovedDates = selectedDates.some( function forEachDateConnectedToAnActivity( selectedDate ) {
                        return selectedDate.activityIds.indexOf( oldActivity._id ) !== -1;
                    } );
                    //  keep full activities not belonging to the removed column
                    if( !activityIdFoundInRemovedDates ) {
                        newActivities.push( oldActivity );
                    }
                } );

                self.fullLabdataActivities( newActivities );
            },

            /**
             *  Arrange dynamically added columns by date
             */

            sortTableColumns: function( cols ) {
                var
                    self = this,
                    plainCols = [],
                    ldCols = [],
                    graphCols = [],
                    sortedCols = [],
                    i, l;

                for( i = 0, l = cols.length; i < l; i++ ) {
                    if( cols[i].isLabdata ) {
                        ldCols.push( cols[i] );
                    } else {
                        if( 'graph' === cols[i].forPropertyName ) {
                            graphCols.push( cols[i] );
                        } else {
                            plainCols.push( cols[i] );
                        }
                    }
                }

                ldCols.sort( self.sortByTimestamp.bind(self) );

                for( i = 0, l = plainCols.length; i < l; i++ ) {
                    sortedCols.push( plainCols[i] );
                }
                for( i = 0, l = ldCols.length; i < l; i++ ) {
                    sortedCols.push( ldCols[i] );
                }
                for( i = 0, l = graphCols.length; i < l; i++ ) {
                    sortedCols.push( graphCols[i] );
                }

                return sortedCols;
            },

            /**
             *  Newest first, must be in the same timestamp format
             *  @param a
             *  @param b
             *  @return {number}
             */

            sortByTimestamp: function( a, b ) {
                //  convert timestamps to moment objects
                var
                    objA,
                    objB;

                if( a.momentDate && b.momentDate ) {
                    objA = a.momentDate;
                    objB = b.momentDate;
                } else {
                    objA = moment( a.timestamp, this.selectedTimestamp() );
                    objB = moment( b.timestamp, this.selectedTimestamp() );
                }

                //  compare unformatted dates
                if( objA.isAfter( objB ) ) {
                    return -1;
                }
                if( objB.isAfter( objA ) ) {
                    return 1;
                }
                return 0;
            },

            /**
             *  Load the set of user-defined alias for meddata and labdata entries from the tags
             *  @return {Promise}
             */

            checkMedLabDataAliases: function() {
                var self = this;
                //  lazy, only download set of user-defined aliases and types the first time we need them
                if( self.medLabDataAliases ) {
                    return Promise.resolve( true );
                }

                function promiseToGetAliases( resolve, reject ) {
                    return Y.doccirrus.jsonrpc.api.tag
                        .getMedLabData()
                        .then( onMedLabDataLoaded )
                        .fail( onMedLabDataError );

                    function onMedLabDataLoaded( result ) {
                        result = result.data ? result.data : result;
                        self.medLabDataAliases = result;
                        resolve( true );
                    }

                    function onMedLabDataError( err ) {
                        Y.log( 'Problem loading MEDDATA/LABDATA aliases: ' + JSON.stringify( err ), 'warn', NAME );
                        reject( err );
                    }
                }

                return new Promise( promiseToGetAliases );
            },

            /**
             * Add load all activities and add most recent labdata finding for a given day
             * Future: should also show additional findings from the same day on click of an icon
             *
             * @param {{date: string, label: string}|{date: string, label: string}[]} dates
             */
            addFullDate: function( dates ) {
                var
                    self = this,
                    datesToAdd = Array.isArray(dates) ? dates : [dates],
                    allDates = self.allLabdataDates(),
                    selectedDates = datesToAdd.reduce( function forEachDateToAdd( datesAmongAllDates, dateObj ) {
                        if( dateObj && dateObj.date && allDates.hasOwnProperty( dateObj.date ) ) {
                            datesAmongAllDates.push( allDates[dateObj.date] );
                        }
                        return datesAmongAllDates;
                    }, [] ),

                    /**
                     * @type {({date: string, entries: {}, activities: [], label: string, altCount: {}})[]}
                     */
                    newDates = datesToAdd.reduce( function forEachDateToAdd( newDates, dateObj ) {
                        if( dateObj && dateObj.date && dateObj.label ) {
                            newDates.push( {
                                date: dateObj.date,
                                label: dateObj.label,
                                entries: {},          //  objects representing a finding
                                altCount: {},         //  count of other / intermediate versions of this finding on this day
                                activities: []
                            } );
                        }
                        return newDates;
                    }, [] );

                // continue only if there are any dates to be added
                if( selectedDates.length === 0 ) {
                    Y.log( 'Unrecognized date selected: ' + JSON.stringify( dates ), 'warn', NAME );
                    return;
                }

                // determine all activities to be loaded
                var activityIdsToDownload = selectedDates.reduce( function forEachSelectedDate( ids, selectedDate ) {
                    selectedDate.activityIds.forEach( function forEachActivityId( tempId ) {
                        var
                            notYetAdded = ids.indexOf( tempId ) === -1,
                            notYetLoaded = !self.hasFullActivity( tempId );

                        if( notYetAdded && notYetLoaded ) {
                            ids.push( tempId );
                        }
                    } );
                    return ids;
                }, [] );

                //  if activities have already been downloaded, skip JSONRPC call to fetch missing activities
                if( activityIdsToDownload.length === 0 ) {
                    self.checkMedLabDataAliases()
                        .then(function() {
                            onFullActivitiesLoaded( {data: []} );
                        });
                    return;
                }

                self.checkMedLabDataAliases()
                    .then( downloadActivitiesForDate )
                    .then( onFullActivitiesLoaded )
                    .catch( onFullActivitiesErr );

                function downloadActivitiesForDate() {
                    return Y.doccirrus.jsonrpc.api.activity.read( {query: {_id: {$in: activityIdsToDownload}}, options:{ itemsPerPage: LABDATA_LIMIT }} );
                }

                function onFullActivitiesLoaded( result ) {
                    var
                        activitiesFetched = result && result.data ? result.data : [];

                    newDates.forEach( function forEachNewDate( newDate ) {
                        var
                            i, j,
                            aliasEntry,
                            activity,
                            labHead;

                        var selectedDate = allDates.hasOwnProperty( newDate.date ) ? allDates[newDate.date] : null;
                        if( !selectedDate ) {
                            Y.log( 'Unrecognized date selected: ' + newDate.date, 'warn', NAME );
                            return;
                        }

                        var activitiesForDate = activitiesFetched.filter( function forEachActivity( activity ) {
                            return selectedDate.activityIds.indexOf( activity._id ) !== -1;
                        } );

                        //  store downloaded activities
                        for( i = 0; i < activitiesForDate.length; i++ ) {
                            activitiesForDate[i] = self.expandSingleActivity( activitiesForDate[i] );
                            self.fullLabdataActivities.push( activitiesForDate[i] );
                            newDate.activities.push( activitiesForDate[i] );
                        }

                        //  collect entries into new date
                        for( i = 0; i < selectedDate.activityIds.length; i++ ) {
                            activity = self.getFullActivity( selectedDate.activityIds[i] );
                            if( activity._ldtVersion && activity._ldtVersion.startsWith( 'ldt3' ) ) {
                                for( j = 0; j < activity.map_l_extra_ldt3.length; j++ ) {
                                    labHead = activity.map_l_extra_ldt3[j].labHead;
                                    if( !newDate.entries.hasOwnProperty( labHead ) ) {
                                        newDate.entries[labHead] = activity.map_l_extra_ldt3[j];
                                    }
                                }

                            } else {
                                for( j = 0; j < activity.map_l_extra.length; j++ ) {
                                    labHead = activity.map_l_extra[j].labHead;
                                    if( !newDate.entries.hasOwnProperty( labHead ) ) {
                                        newDate.entries[labHead] = activity.map_l_extra[j];
                                    }
                                }

                            }

                        }

                        //  replace aliases in table data
                        for( i = 0; i < self.medLabDataAliases.length; i++ ) {
                            aliasEntry = self.medLabDataAliases[i];
                            labHead = aliasEntry.label;

                            if( newDate.entries.hasOwnProperty( labHead ) ) {

                                //  TODO: complete, add explanation.disclaimer to table UI?

                                newDate.entries[labHead].x = aliasEntry.testLabel;

                                if( !newDate.entries[labHead].unit ) {
                                    newDate.entries[labHead].unit = aliasEntry.unit;
                                }

                                if( !newDate.entries[labHead].labNormal ) {
                                    newDate.entries[labHead].labNormal = aliasEntry.labNormal;
                                }

                            }
                        }

                        //  store new date and add as table column
                        self.fullLabdataDates.push( newDate );

                    } );

                    self.addTableColumnDate( newDates );
                    self.reloadTable();
                }

                function onFullActivitiesErr( err ) {
                    Y.log( 'Problem downloading full activities for ' + JSON.stringify(datesToAdd) + ': ' + JSON.stringify( err ), 'error', NAME );
                }

            },

            expandSingleActivity: function( activity ) {
                var
                    self = this,
                    showNotes = self.showNotes(),
                    showHighLow = self.showHighLow();

                activity._ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity );

                if( activity._ldtVersion && activity._ldtVersion.startsWith( 'ldt3' ) ) {
                    activity.map_l_extra_ldt3 = activity.labEntries.map( function( testResult ) {
                        testResult.htmlFull = Y.doccirrus.labdata.utils.makeFindingValueCellLdt3( testResult, true, showNotes, showHighLow );
                        testResult.htmlCompact = Y.doccirrus.labdata.utils.makeFindingValueCompactCellLdt3( testResult, true, showNotes, showHighLow );
                        testResult.pdfFull = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt3( testResult, true, showNotes, showHighLow );
                        testResult.pdfCompact = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt3( testResult, false, showNotes, showHighLow );
                        return testResult;
                    } );
                } else {
                    activity.map_l_extra = activity.labEntries.map( function( testResult ) {
                        testResult.htmlFull = Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( testResult, true, showNotes, showHighLow );
                        testResult.htmlCompact = Y.doccirrus.labdata.utils.makeFindingValueCompactCellLdt2( testResult, true, showNotes, showHighLow );
                        testResult.pdfFull = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt2( testResult, true, showNotes, showHighLow );
                        testResult.pdfCompact = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt2( testResult, false, showNotes, showHighLow );

                        if( !testResult.labReqReceived ) {
                            //  use activity date if lab/request date not available, MOJ-10521
                            testResult.labReqReceived = activity.timestamp;
                        }

                        return testResult;
                    } );
                }
                return activity;
            },

            /**
             *  Collect all entries of a given type, for rendering a chart
             *  @param head
             */

            getEntriesByType: function( head ) {
                var
                    self = this,
                    selected = self.fullLabdataActivities(),
                    ldtVersion,
                    map_l_extra,
                    items = [],
                    copyItem,
                    i, j, k;

                for( i = 0; i < selected.length; i++ ) {
                    ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( selected[i] );
                    if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
                        map_l_extra = selected[i].map_l_extra_ldt3;
                        for( j = 0; j < map_l_extra.length; j++ ) {
                            if( map_l_extra[j].labHead === head ) {
                                //  LDT3 findings may contain more than one value to be charted
                                for( k = 0; k < map_l_extra[j].labResults.length; k++ ) {
                                    copyItem = JSON.parse( JSON.stringify( map_l_extra[j].labResults[k] ) );
                                    copyItem.labHead = head;
                                    copyItem.labTestLabel = map_l_extra[j].labTestLabel || head;
                                    items.push( copyItem );
                                }
                            }
                        }
                    } else {
                        map_l_extra = selected[i].map_l_extra;
                        for( j = 0; j < map_l_extra.length; j++ ) {
                            if( map_l_extra[j].labHead === head ) {
                                items.push( map_l_extra[j] );
                            }
                        }
                    }
                }
                return items;
            },

            /**
             * Remove a column or multiple columns from the table.
             * @param {string|string[]} dateStrOrArray
             */
            removeFullDate: function( dateStrOrArray ) {
                var
                    self = this,
                    datesToRemove = Array.isArray( dateStrOrArray ) ? dateStrOrArray : [dateStrOrArray],
                    oldSet = self.fullLabdataDates(),
                    newSet = [],
                    i, l;

                // do a hard copy, to reinstall possible observable listeners
                for( i = 0, l = oldSet.length; i < l; i++ ) {
                    if( datesToRemove.indexOf( oldSet[i].date ) === -1 ) {
                        newSet.push( oldSet[i] );
                    }
                }

                self.fullLabdataDates( newSet );
                self.removeTableColumn( datesToRemove );
                self.reloadTable();
            },

            getTableCellDate: function( dateObj, head ) {
                var
                    PREVIOUS_VERSIONS_MARKER = Y.doccirrus.labdata.utils.PREVIOUS_VERSIONS_MARKER,
                    self = this,
                    numPreviousVersions = self.countPreviousVersions( dateObj, head ),
                    html = '';

                if( !dateObj.entries.hasOwnProperty( head ) ) {
                    return html;
                }

                if( self.fullView() ) {
                    html = dateObj.entries[head].htmlFull;
                    //html = Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( items[i], true );
                } else {
                    html = dateObj.entries[head].htmlCompact;
                }

                if( numPreviousVersions > 1 ) {
                    html = html.replace(
                        PREVIOUS_VERSIONS_MARKER,
                        '<span style="float: right;" class="badge">+' + numPreviousVersions + '</span>'
                    );
                }

                return html;
            },

            /**
             *  Count alternative versions / findings which would be shown in modal
             *  @param dateObj
             *  @param head
             */

            countPreviousVersions: function( dateObj, head ) {
                var
                    activity, entry, i, j,
                    count = 0;
                for( i = 0; i < dateObj.activities.length; i++ ) {
                    activity = dateObj.activities[i];
                    if( activity.map_l_extra && Array.isArray( activity.map_l_extra ) ) {
                        for( j = 0; j < activity.map_l_extra.length; j++ ) {
                            if( activity.map_l_extra[j].labHead && activity.map_l_extra[j].labHead === head ) {
                                entry = activity.map_l_extra[j];
                                count = count + 1;
                                if( entry.previousVersions && entry.previousVersions > 0 ) {
                                    count = count + entry.previousVersions;
                                }
                            }
                        }
                    }

                }
                return count;
            },

            /**
             *  Format a table cell for PDF, given a labdata activity and the type of finding it may contain
             *  @param activity
             *  @param head
             */

            getTableCellPdf: function( activity, head ) {
                var
                    self = this,
                    items,
                    ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( activity ),
                    txt = '',
                    i;

                if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
                    items = activity.map_l_extra_ldt3;
                    for( i = 0; i < items.length; i++ ) {
                        if( items[i].labHead && items[i].labHead === head ) {
                            txt = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt3( items[i], self.fullView() );
                        }
                    }
                } else {
                    items = activity.map_l_extra;
                    for( i = 0; i < items.length; i++ ) {
                        if( items[i].labHead && items[i].labHead === head ) {
                            txt = Y.doccirrus.labdata.utils.makeFindingValuePdfCellLdt2( items[i], self.fullView() );
                        }
                    }
                }

                return Y.dcforms.stripHtml( txt );
            },

            getTableCellDatePdf: function( dateObj, head ) {
                var
                    self = this,
                    html = '';

                if( !dateObj.entries.hasOwnProperty( head ) ) {
                    return html;
                }

                if( self.fullView() ) {
                    html = dateObj.entries[head].pdfFull;
                    //html = Y.doccirrus.labdata.utils.makeFindingValueCellLdt2( items[i], true );
                } else {
                    html = dateObj.entries[head].pdfCompact;
                }

                return html;
            },

            makeRowTypeEnum: function( data ) {
                var
                    self = this,
                    enumVals = [],
                    i;

                for( i = 0; i < data.length; i++ ) {
                    enumVals.push( {
                        val: data[i].type || '',
                        '-en': data[i].type || 'None',
                        '-de': data[i].type || 'Keine',
                        i18n: data[i].type || 'Keine'
                    } );
                }

                self.rowTypeEnum( enumVals );
            },

            /**
             *  Save updated sort order for labdata types to user profile
             */

            saveSortOrder: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentUser = binder.getInitialData( 'currentUser' );

                currentUser.labdataSortOrder = self.sortOrder.join( ',' );
                Y.doccirrus.jsonrpc.api.employee.updateLabdataSortOrder( {
                    query: {
                        _id: currentUser.specifiedBy //currentUser._id
                    },
                    data: {
                        labdataSortOrder: currentUser.labdataSortOrder,
                        fields_: ['labdataSortOrder']
                    }
                } )
                    .done( onSortOrderSaved )
                    .fail( onSortOrderFailed );

                function onSortOrderSaved( /* data */ ) {
                    //  also update the cached version from when inCase was opened
                    binder.setInitialData( 'labdataSortOrder', currentUser.labdataSortOrder );
                    Y.log( 'Saved sort order to user profile.', 'debug', NAME );
                }

                function onSortOrderFailed( err ) {
                    Y.log( 'Could not save labdata sort order: ' + JSON.stringify( err ) );
                }
            },

            /**
             *  Called by 'maximize' button next to select2
             */

            toggleFullView: function() {
                var
                    self = this,
                    cols = self.labdataKoTable.columns(),
                    i;

                self.fullView( !self.fullView() );

                Y.doccirrus.utils.localValueSet( 'labdata_fullView', self.fullView().toString() );
                self.actColWidth( self.fullView() ? '17%' : '7%' );
                self.updateLaborblattCharting();

                for( i = 0; i < cols.length; i++ ) {
                    if( 'activities' === cols[i].forPropertyName.substr( 0, 10 ) ) {
                        cols[i].width = self.actColWidth();
                    }
                }

                // When on fullScreenView need to force the computedStylesUpdate in case the height of the cells change because of the full view
                if( peek( this.isFullScreenView ) ) {
                    self.labdataKoTable.forceComputedStylesUpdate( self.labdataKoTable.forceComputedStylesUpdate() + 1 );
                }
            },
            /**
             * toggleFullScreenView
             */
            toggleFullScreenView: function() {
                var
                    currentActivityTimestampFormated = moment( this.get( 'binder' ).currentActivity().timestamp() ).format( peek( this.selectedTimestamp )  ),
                    labDataTable = this.labdataKoTable,
                    newIsFullScreenViewValue = !peek( this.isFullScreenView );

                if( newIsFullScreenViewValue ) {
                    /**
                     * Clone all Dates and activity observables to have them as back up
                     * so they can be restore when fullscreen mode is closed.
                     * This because fullScreen mode show all activities and dates
                     */
                    this.fullLabdataDatesBeforeFullScreen( _.cloneDeep( this.fullLabdataDates() ) );
                    this.allLabDataDatesBeforeFullScreen( _.cloneDeep( this.allLabdataDates() ) );

                    this.latestLabDataEntriesUpdate('50', true);

                    // Auto scroll the table to the date column of the current activity
                    this.autoScrollObservable = ko.computed( {
                        read: function() {
                            var
                                $labDataTableScrollContainer = $( labDataTable.element() ).find( '.KoTable-hScroll.KoTable-scrollable' ),
                                $currentActivityColumnDate;

                            unwrap( labDataTable.columns ).forEach( function( column ) {
                                unwrap( column.visible );
                                unwrap( column.isFixed );

                                if( (COLUMNPREFIX + currentActivityTimestampFormated) === column.forPropertyName ) {
                                    $currentActivityColumnDate = column.element();
                                }
                            } );

                            if( $currentActivityColumnDate && $currentActivityColumnDate.length > 0 && $labDataTableScrollContainer && $labDataTableScrollContainer.length > 0 ) {
                                $labDataTableScrollContainer[0].scrollLeft = $currentActivityColumnDate[0].offsetLeft;
                            }

                        },
                        write: KoUI.utils.Function.NOOP
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} );
                } else {
                    // Delete all dates that were shown in fullScreenView
                    this.removeFullDate(
                        this.fullLabdataDates().map( function( dateObj ) {
                            return dateObj.date;
                        } )
                    );

                    // Restore select2 to previous state
                    this.allLabdataDates( _.cloneDeep( this.allLabDataDatesBeforeFullScreen() ) );

                    // Clean fullLabdataDates array
                    this.fullLabdataDates( [] );

                    // Adding backed up columns/dates
                    this.addFullDate( _.cloneDeep( this.fullLabdataDatesBeforeFullScreen() ) );

                    // Clean the backUp
                    this.fullLabdataDatesBeforeFullScreen( null );
                    this.allLabDataDatesBeforeFullScreen( null );

                    this.latestLabDataEntriesUpdate( this.getLatestLabDataForProfile() || '', true);

                    this.autoScrollObservable.dispose();
                }

                this.isFullScreenView( newIsFullScreenViewValue );

                /**
                 * This class will prevent the site to be scrolled in the background by the user
                 * So the user see the site in the exact state it was before opening the fullScreen mode
                 */
                $( 'body' ).toggleClass( 'modal-open', newIsFullScreenViewValue );

                // Toggle scrolling flag
                labDataTable.scrollable( newIsFullScreenViewValue );

                // Toggle fixedTableLayout flag
                labDataTable.fixedTableLayout( !newIsFullScreenViewValue );

                this.reloadTable();
            },

            toggleSpreadColumnsByTime: function() {
                var
                    newIsSpreadColumnsByTime = !peek( this.isSpreadColumnsByTime );

                Y.doccirrus.utils.localValueSet( 'labdata_isSpreadColumnsByTime', newIsSpreadColumnsByTime.toString() );

                this.isSpreadColumnsByTime(newIsSpreadColumnsByTime);
            },

            togglePathologicalOnly: function() {
                var self = this;
                self.showPathologicalOnly( !self.showPathologicalOnly() );
                Y.doccirrus.utils.localValueSet( 'labdata_showPathologicalOnly', self.showPathologicalOnly().toString() );
                self.reloadTable();
            },

            toggleShowNotes: function() {
                var self = this;
                self.showNotes( !self.showNotes() );
                Y.doccirrus.utils.localValueSet( 'labdata_showNotes', self.showNotes().toString() );

                //  update the expanded activities
                var allActivities = self.fullLabdataActivities();

                allActivities.forEach( function( activity ) {
                    self.expandSingleActivity( activity );
                } );

                self.reloadTable();
            },

            toggleShowHighLow: function() {
                var self = this;
                self.showHighLow( !self.showHighLow() );
                Y.doccirrus.utils.localValueSet( 'labdata_showHighLow', self.showHighLow().toString() );

                //  update the expanded activities
                var allActivities = self.fullLabdataActivities();

                allActivities.forEach( function( activity ) {
                    self.expandSingleActivity( activity );
                } );

                self.reloadTable();
            },

            /**
             *  Download / add labdata for all dates available for this patient before the current activity
             *  Raised by button in UI, same as adding all activities after a distant date
             */

            addAllDates: function() {
                var
                    self = this,
                    BEGINNING_OF_TIME = '01.01.1970';

                self.addAllDatesUntil( BEGINNING_OF_TIME );

                // clear latestLabdataEntries so that it doesn't confuse the user
                self.latestLabdataEntries( '' );
            },

            /**
             * Updates the labdata table to include only the entries which are
             * within the given time range.
             * It can additionally take a limit after which it stops adding new columns.
             *
             *
             * @param {Object} args
             * @param {String} args.startTimestamp
             * @param {String} args.endTimestamp
             * @param {Number} [args.limit]
             */
            addAllDatesInRange: function( args ) {
                var
                    self = this,
                    startTimestamp = args.startTimestamp,
                    endTimestamp = args.endTimestamp,
                    limit = args.limit,
                    endMomentDate = moment( endTimestamp ),
                    startMomentDate = moment( startTimestamp ),
                    allDates = self.allLabdataDates(),
                    activityIdsToDownload = [],
                    dateKey, i,
                    _tmpStartDate;

                if ( !peek( self.isSpreadColumnsByTime ) ) {
                    endMomentDate = endMomentDate.startOf( 'day' );
                    startMomentDate = startMomentDate.endOf( 'day' );
                }

                // fail-safe
                if( endMomentDate.isAfter( startMomentDate ) ) {
                    // this could happen with momentDates on the same day
                    // so here we switch them
                    _tmpStartDate = startMomentDate;
                    startMomentDate = endMomentDate;
                    endMomentDate = _tmpStartDate;
                }

                // set default limit if not provided
                if( !limit ) {
                    limit = Object.keys( allDates ).length + 1;
                }

                // check if activities need to get downloaded
                for( dateKey in allDates ) {
                    if( allDates.hasOwnProperty( dateKey ) ) {
                        if( !allDates[dateKey].isSelected && _dateInRange( allDates[dateKey].momentDate ) ) {
                            for( i = 0; i < allDates[dateKey].activityIds.length; i++ ) {
                                if( !self.hasFullActivity( allDates[dateKey].activityIds[i] ) ) {
                                    activityIdsToDownload.push( allDates[dateKey].activityIds[i] );
                                }
                            }
                        }
                    }
                }

                //  Data may have been pre-cached
                if( 0 === activityIdsToDownload.length ) {
                    onFullActivitiesLoaded( {data: []} );
                    return;
                }

                Y.doccirrus.jsonrpc.api.activity
                    .read( {query: {_id: {$in: activityIdsToDownload}}, options: {itemsPerPage: LABDATA_LIMIT}} )
                    .then( onFullActivitiesLoaded )
                    .fail( onFullActivitiesErr );

                function onFullActivitiesLoaded( result ) {
                    var
                        activities = (result.data ? result.data : result),
                        newDateSet = {},
                        counter = 0,
                        datesToAdd = [],
                        datesToRemove = [];

                    //  expand and store all downloaded activities
                    for( i = 0; i < activities.length; i++ ) {
                        activities[i] = self.expandSingleActivity( activities[i] );
                        self.fullLabdataActivities.push( activities[i] );
                    }

                    //  group downloaded activities by date
                    Object.keys( allDates ).forEach( function forEachDate( dateKey ) {

                        var
                            dateObj = allDates[dateKey],
                            isDateSelected = dateObj.isSelected,
                            isDateInRange = _dateInRange( dateObj.momentDate );

                        // store the SAME object in a new collection object
                        // (assignment by reference, hence changes to allDates[dateKey] will be applied to newDataSet[dataKey])
                        // this is required to update the ko-observables
                        newDateSet[dateKey] = dateObj;

                        // if we are still in the date range and below the number limit, add an entry
                        if( counter < limit && isDateInRange ) {

                            // date is not yet selected, but in range =>
                            // mark that date to be fetched and loaded
                            if( !isDateSelected ) {
                                // create new column with this set of activities
                                dateObj.isSelected = true;
                                datesToAdd.push( dateObj );
                            }

                            if( dateObj.activityIds.length > 1 ) {
                                // add the number of activityIds following the selected one
                                counter += dateObj.activityIds.length;
                            } else {
                                // otherwise we probably have one activity per date / timestamp i.e. the split button is enabled
                                counter++;
                            }

                        } else {
                            // remove any selected columns which are outside the date range
                            dateObj.isSelected = false;
                            datesToRemove.push( dateObj.date );
                        }

                    } );

                    self.addFullDate( datesToAdd );
                    self.removeTableColumn( datesToRemove );

                    //  Update observable with new object to trigger update fo select2
                    self.allLabdataDates( newDateSet );
                }

                function onFullActivitiesErr( err ) {
                    Y.log( 'Problem downloading full activities: ' + JSON.stringify( err ), 'warn', NAME );
                }

                function _dateInRange( momentDate ) {
                    return moment( momentDate ).isSameOrAfter( endMomentDate ) && moment( momentDate ).isSameOrBefore( startMomentDate );
                }
            },

            /**
             *  Download / add labdata for all dates available for this patient before the current activity
             *  Raised by button in UI
             *
             *  @param  {String}    endValueStr    LABDATA activities must be before or on this date DD.MM.YYYY
             */

            addAllDatesUntil: function( endValueStr ) {
                var
                    self = this,
                    endValue = moment( endValueStr, TIMESTAMP_FORMAT ).subtract( 1, 'day' ),
                    allDates = self.allLabdataDates(),
                    activityIdsToDownload = [],                        //  activity _ids to download
                    k, i;

                //  Download all full activities for all dates not yet selected
                for( k in allDates ) {
                    if( allDates.hasOwnProperty( k ) ) {
                        if( !allDates[k].isSelected && dateInRange( allDates[k].date ) ) {
                            for( i = 0; i < allDates[k].activityIds.length; i++ ) {
                                if( !self.hasFullActivity( allDates[k].activityIds[i] ) ) {
                                    activityIdsToDownload.push( allDates[k].activityIds[i] );
                                }
                            }
                        }
                    }
                }

                //  Data may have been pre-cached
                if( 0 === activityIdsToDownload.length ) {
                    onFullActivitiesLoaded( {data: []} );
                    return;
                }

                Y.doccirrus.jsonrpc.api.activity
                    .read( {query: {_id: {$in: activityIdsToDownload}}, options:{ itemsPerPage: LABDATA_LIMIT }} )
                    .then( onFullActivitiesLoaded )
                    .fail( onFullActivitiesErr );

                function dateInRange( dateObj ) {
                    return moment( dateObj, peek( self.selectedTimestamp )  ).isAfter( endValue );
                }

                function onFullActivitiesLoaded( result ) {
                    var
                        activities = (result.data ? result.data : result),
                        newDateSet = {};

                    //  expand and store all downloaded activities
                    for( i = 0; i < activities.length; i++ ) {
                        activities[i] = self.expandSingleActivity( activities[i] );
                        self.fullLabdataActivities.push( activities[i] );
                    }

                    //  group activities by date, and remove non-selected dates
                    var
                        isDateInRange,
                        datesToAdd = [],
                        datesToRemove = [];

                    for( k in allDates ) {
                        if( allDates.hasOwnProperty( k ) ) {

                            isDateInRange = dateInRange( allDates[k].date );
                            if( !allDates[k].isSelected && isDateInRange ) {
                                // create column which should be in selected, since they are in range
                                allDates[k].isSelected = true;
                                datesToAdd.push( allDates[k] );
                            } else if( allDates[k].isSelected && !isDateInRange ) {
                                // remove any selected columns which are outside the new date range
                                allDates[k].isSelected = false;
                                datesToRemove.push( allDates[k].date );
                            }

                            newDateSet[k] = allDates[k];
                        }
                    }
                    self.addFullDate( datesToAdd );
                    self.removeTableColumn( datesToRemove );

                    //  Update observable with new object to trigger update fo select2
                    self.allLabdataDates( newDateSet );
                }

                function onFullActivitiesErr( err ) {
                    Y.log( 'Problem downloading full activities: ' + JSON.stringify( err ), 'warn', NAME );
                }
            },

            updateLaborblattCharting: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentView = ko.unwrap( binder.currentView ),
                    activityDetailsVM,
                    activityHeadingVM,
                    activityHeadingButtonsVM;

                if( !currentView ) {
                    return;
                }
                activityDetailsVM = ko.unwrap( currentView.activityDetailsViewModel );
                if( !activityDetailsVM ) {
                    return;
                }
                activityHeadingVM = activityDetailsVM.activityHeadingViewModel;
                if( !activityHeadingVM ) {
                    return;
                }
                activityHeadingButtonsVM = activityHeadingVM.activityHeadingButtonsViewModel;
                if( !activityHeadingButtonsVM ) {
                    return;
                }

                activityHeadingButtonsVM.showLaborblattCharts( self.fullView() );
            },

            printCurrentDisplayLandscape: function() {
                var self = this;
                Y.log( 'Invoking landscape print menu on KO table', 'debug', NAME );
                self.labdataKoTable.formRole = 'casefile-labdata-table';
                self.labdataKoTable.initialConfig.formRole = 'casefile-labdata-table';
                self.labdataKoTable.showExportPdfDataStart();
            },

            printCurrentDisplayPortrait: function() {
                var self = this;
                Y.log( 'Invoking portrait print menu on KO table', 'debug', NAME );
                self.labdataKoTable.formRole = 'casefile-labdata-portrait-table';
                self.labdataKoTable.initialConfig.formRole = 'casefile-labdata-portrait-table';
                self.labdataKoTable.showExportPdfDataStart();
            },

            /**
             *  Return labdata findings arranged for KO table
             */

            getAsTable: function( params ) {
                var
                    self = this,
                    selected = self.fullLabdataActivities(),
                    totalRows,
                    rows = [],
                    list = self.labdataKoTable,
                    internalLab = [],
                    externalLab = [],
                    otherLab = [],
                    i;

                function checkAllEntries() {
                    var
                        map_l_extra,
                        map_l_extra_ldt_3,
                        ldtVersion,
                        i, j;

                    for( i = 0; i < selected.length; i++ ) {
                        ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( selected[i] );
                        if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {
                            map_l_extra_ldt_3 = selected[i].map_l_extra_ldt3 || [];
                            for( j = 0; j < map_l_extra_ldt_3.length; j++ ) {
                                //  WIP: some rows are 'undefined' from current parser
                                if( map_l_extra_ldt_3[j] ) {
                                    proposeRowLdt3( map_l_extra_ldt_3[j] );
                                }
                            }
                        } else {
                            map_l_extra = selected[i].map_l_extra;
                            for( j = 0; j < map_l_extra.length; j++ ) {
                                proposeRow( map_l_extra[j] );
                            }
                        }
                    }
                }

                function proposeRow( entry ) {
                    //   must have an identifying code in head, which we do not already have a row for
                    if( !entry.labHead || '' === entry.labHead ) {
                        return;
                    }

                    var row = rows.find( function( row ) {
                        return row.type.toLowerCase() === entry.labHead.toLowerCase();
                    } );

                    if( row ) {
                        row.min = row.min || entry.labMin;
                        row.max = row.max || entry.labMax;
                        row.unit = row.unit || entry.labTestResultUnit;
                        row.labNormalText = row.labNormalText || entry.labNormalText;
                        //  if row already exists then check isPathological flag and we're done
                        row.isPathological = row.isPathological || entry.isPathological;
                        row.labName = row.labName || entry.labName;
                        return;
                    }

                    //  a row does not yet exist for this labHead, start one from this finding
                    row = {
                        type: entry.labHead,
                        labTestLabel: entry.labTestLabel,
                        labNormalText: entry.labNormalText,
                        labNormalTextUnit: entry.labTestResultUnit,
                        min: entry.labMin,
                        max: entry.labMax,
                        unit: entry.labTestResultUnit,
                        isPathological: entry.isPathological,
                        labName: entry.labName
                    };

                    if( row.labNormalText && -1 !== row.labNormalText.indexOf( "\n" ) ) {
                        row.labNormalText = row.labNormalText.replace( new RegExp( "\n", 'g' ), "<br/>\n" );    //  eslint-disable-line no-control-regex
                    }

                    rows.push( row );
                }

                function proposeRowLdt3( entry ) {
                    //   must have an identifying code in head, which we do not already have a row for
                    if( !entry.labHead || '' === entry.labHead ) {
                        return;
                    }

                    var
                        row = rows.find( function( row ) {
                            return row.type.toLowerCase() === entry.labHead.toLowerCase();
                        } ),
                        i;

                    if( row ) {
                        row.min = row.min || entry.labMin;
                        row.max = row.max || entry.labMax;
                        row.unit = row.unit || entry.labTestResultUnit;
                        row.labNormalText = row.labNormalText || entry.labNormalText;
                        //  if row already exists then check isPathological flag and we're done
                        row.isPathological = row.isPathological || entry.isPathological;
                        return;
                    }

                    //  a row does not yet exit for this labHead, start one from this finding
                    row = {
                        type: entry.labHead,
                        labTestLabel: entry.labTestLabel,
                        labNormalText: entry.labNormalText,
                        labNormalTextUnit: entry.labTestResultUnit,
                        min: null,
                        max: null,
                        unit: entry.labTestResultUnit,
                        isPathological: entry.isPathological
                    };

                    if( row.labNormalText && -1 !== row.labNormalText.indexOf( "\n" ) ) {
                        row.labNormalText = row.labNormalText.replace( new RegExp( "\n", 'g' ), "<br/>\n" );    //  eslint-disable-line no-control-regex
                    }

                    for( i = 0; i < entry.labResults.length; i++ ) {
                        if( entry.labResults[i].labNormalText ) {
                            row.labNormalText = entry.labResults[i].labNormalText;
                        }
                        if( entry.labResults[i].labNormalText ) {
                            row.min = entry.labResults[i].labMin;
                        }
                        if( entry.labResults[i].labNormalText ) {
                            row.max = entry.labResults[i].labMax;
                        }
                    }

                    rows.push( row );
                }

                //  collect all finding types into their own row
                checkAllEntries();

                //  sort rows according to user preferences, add each type to enum
                rows = self.applyDefaultSortOrder( rows );
                rows = self.applyDynamicSortOrder( params, rows );
                //if ( params.sort ) {
                //    rows = self.applyColumnSorters( params, rows );
                //}
                self.makeRowTypeEnum( rows );

                //  store complete results before filtering, used when mapping selection into forms
                self.allRows( rows );

                //  filter rows according to controls in table column headers
                rows = self.applyFilters( params, rows );
                totalRows = rows.length;

                //swiss internal lab on top
                if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    for( i = 0; i < rows.length; i++ ) {
                        switch( rows[i].labName ) {
                            case 'SylexVMX':
                                internalLab.push( rows[i] );
                                break;
                            case 'SwiSyn':
                                externalLab.push( rows[i] );
                                break;
                            default:
                                otherLab.push( rows[i] );
                                break;
                        }
                    }
                    rows = internalLab.concat( externalLab, otherLab );
                }
                if( params && params.sort && Object.keys( params.sort ) ) {
                    //allow kotable sorting
                    rows = Y.doccirrus.commonutils.sortProxyData( list, rows, params );
                }

                //  break results into pages
                if( params.itemsPerPage && params.page ) {
                    rows = self.applyPagination( params, rows );
                }

                return {
                    meta: {totalItems: totalRows},
                    data: rows
                };
            },

            /**
             *  Get table contents / current selection as formatted for forms
             *
             *  @param  {Boolean}   filtered    Apply KO table filters to output
             */

            getAsFormTable: function( filtered ) {
                var
                    self = this,
                    initializedColumns = self.labdataKoTable.columns.peek(),
                    labData = JSON.parse( JSON.stringify( self.allRows() ) ),
                    stripHtmlTags = Y.doccirrus.regexp.stripHtmlTags,
                    filterParams,
                    column,
                    colKey,
                    i, j;

                if( filtered ) {
                    //  MOJ-9074 Apply filters to returned data
                    filterParams = {query: self.labdataKoTable.filterParams()};
                    labData = self.applyFilters( filterParams, labData );
                }

                for( i = 0; i < labData.length; i++ ) {
                    if( labData[i].labNormalText && -1 !== labData[i].labNormalText.indexOf( '<br/>' ) ) {
                        labData[i].labNormalText = labData[i].labNormalText.replace( new RegExp( '<br/>', 'g' ), '\n' );
                    }

                    for( j = 0; j < initializedColumns.length; j++ ) {
                        column = initializedColumns[j];

                        if( column.dateObj ) {
                            colKey = column.forPropertyName;
                            labData[i][colKey] = self.getTableCellDatePdf( column.dateObj, labData[i].type );
                            labData[i][colKey] = labData[i][colKey].replace( stripHtmlTags, '' );
                            labData[i][colKey] = Y.dcforms.stripHtml( labData[i][colKey].trim() );
                        }
                    }

                }

                return labData;
            },

            /**
             *  Make a forms table definition from current visible columns
             */

            getFormTableDefinition: function() {
                var
                    self = this,
                    initializedColumns = self.labdataKoTable.columns.peek(),
                    strCols = ['**LABDATA'],
                    column,
                    i;

                for( i = 0; i < initializedColumns.length; i++ ) {
                    column = initializedColumns[i];
                    if( 'graph' !== column.forPropertyName && column.visible() ) {
                        strCols.push( '*|' + column.forPropertyName + '|String|' + ko.unwrap( column.label ) + '|left|-1' );
                    }
                }

                return strCols.join( '\n' );
            },

            /**
             *  Re-order rows according to preferences in user profile
             */

            applyDefaultSortOrder: function( rows ) {
                var
                    self = this,
                    newRows = [],
                    orderChanged = false,
                    i, j;

                //  add newly observed types to the sort order configuration
                for( i = 0; i < rows.length; i++ ) {
                    if( -1 === self.sortOrder.indexOf( rows[i].type ) ) {
                        Y.log( 'Observed new labdata type, adding to sort order: ' + rows[i].type, 'debug', NAME );
                        self.sortOrder.push( rows[i].type );
                        orderChanged = true;
                    }
                }

                //  Arrange rows to match the sort order configuration
                for( i = 0; i < self.sortOrder.length; i++ ) {
                    for( j = 0; j < rows.length; j++ ) {
                        if( rows[j].type === self.sortOrder[i] ) {
                            newRows.push( rows[j] );
                        }
                    }
                }

                if( orderChanged ) {
                    self.saveSortOrder();
                }

                return newRows;
            },

            /**
             *  Group rows when sorted on an activity
             *
             *  (bring all rows to top or bottom of list)
             *
             *  @param params
             *  @param rows
             */

            applyDynamicSortOrder: function( params, rows ) {
                var
                    self = this,
                    activities = self.fullLabdataActivities(),
                    activity = null,
                    groupCol = '',
                    groupDir = 0,
                    isEmpty = [],
                    notEmpty = [],
                    found,
                    item,
                    k, i, j;

                if( !params || !params.sort ) {
                    return rows;
                }

                for( k in params.sort ) {
                    if( params.sort.hasOwnProperty( k ) ) {
                        if( COLUMNPREFIX === k.substr( 0, 9 ) ) {
                            groupCol = k.replace( COLUMNPREFIX, '' );
                            groupDir = params.sort[k];
                        }
                    }
                }

                //  not sorting on dynamic column
                if( '' === groupCol ) {
                    return rows;
                }

                for( i = 0; i < activities.length; i++ ) {
                    if( activities[i]._id === groupCol ) {
                        activity = activities[i];
                    }
                }

                //  missing activity (should not happen)
                if( !activity ) {
                    return rows;
                }

                for( i = 0; i < rows.length; i++ ) {
                    found = false;
                    for( j = 0; j < activity.map_l_extra.length; j++ ) {
                        item = activity.map_l_extra[j];
                        if( item.labHead === rows[i].type ) {
                            found = true;
                        }
                    }
                    if( found ) {
                        notEmpty.push( rows[i] );
                    } else {
                        isEmpty.push( rows[i] );
                    }
                }

                if( 1 === groupDir ) {
                    rows = notEmpty.concat( isEmpty );
                } else {
                    rows = isEmpty.concat( notEmpty );
                }

                return rows;
            },

            /**
             *  Filter table rows according to table column headers and button options
             *
             *  @param params
             *  @param rows
             *  @return {*}
             */

            applyFilters: function( params, rows ) {

                var
                    self = this,
                    collected = rows,
                    textFields = ['labName', 'labTestLabel', 'max', 'min', 'unit', 'labNormalText'],
                    filterField = '', filterBy = '', filterSet = [],
                    i;

                //  check if the 'pathological entries only' option is set on the button bar
                if( self.showPathologicalOnly && self.showPathologicalOnly() ) {
                    collected = collected.filter( filterOnlyPathological );
                }

                function filterOnlyPathological( row ) {
                    return row.isPathological;
                }

                //  if no query then we can skip the rest
                if( !params || !params.query ) {
                    return collected;
                }

                //  no filtering to do, empty set or view still initializing
                if( 0 === collected.length ) {
                    return collected;
                }

                // multy filter
                if( params.query.$and ) {
                    params.query.$and.forEach( function( item ) {
                        var multiFiltered = [];
                        if( item.$or && item.$or.length ) {
                            item.$or.forEach( function( i ) {
                                var key = _.keys( i )[0];
                                if( key && i[key].$in ) {
                                    filterField = key;
                                    filterSet = i[key].$in;
                                    multiFiltered = multiFiltered.concat( collected.filter( reduceRowsSet ) );
                                }

                                if( key && i[key].$nin ) {
                                    filterField = key;
                                    filterSet = i[key].$nin;
                                    multiFiltered = multiFiltered.concat( collected.filter( reduceRowsNegativeSet ) );
                                }

                                if( key && i[key].iregex ) {
                                    filterField = key;
                                    filterBy = i[key].iregex;
                                    multiFiltered = multiFiltered.concat( collected.filter( reduceRows ) );
                                }

                                if( key && i[key].notiregex ) {
                                    filterField = key;
                                    filterBy = i[key].notiregex;
                                    multiFiltered = multiFiltered.concat( collected.filter( reduceRowsNegative ) );
                                }
                            });

                            // update data after iterations
                            collected = multiFiltered;
                        }
                    });
                }

                //  filtering by select2
                if( params.query.type && params.query.type.$in ) {
                    filterField = 'type';
                    filterSet = params.query.type.$in;
                    collected = collected.filter( reduceRowsSet );
                }
                //  inverted select2 filter, EXTMOJ-2148
                if( params.query.type && params.query.type.$nin ) {
                    filterField = 'type';
                    filterSet = params.query.type.$nin;
                    collected = collected.filter( reduceRowsNegativeSet );
                }

                // now filtering this type by iregex
                for( i = 0; i < textFields.length; i++ ) {
                    filterField = textFields[i];
                    if( params.query.hasOwnProperty( filterField ) ) {

                        if( params.query[filterField].iregex ) {
                            filterBy = params.query[filterField].iregex;
                            collected = collected.filter( reduceRows );
                        }

                        if( params.query[filterField].notiregex ) {
                            filterBy = params.query[filterField].notiregex;
                            collected = collected.filter( reduceRowsNegative );
                        }

                    }
                }

                function reduceRows( row ) {
                    var checkValue = row[filterField];
                    if( !checkValue ) {
                        return false;
                    }
                    return null !== checkValue.match( new RegExp( filterBy, 'i' ) );
                }

                function reduceRowsNegative( row ) {
                    var checkValue = row[filterField];
                    if( !checkValue ) {
                        return false;
                    }
                    return null === checkValue.match( new RegExp( filterBy, 'i' ) );
                }

                //  must be a member of array in filterField
                function reduceRowsSet( row ) {
                    var checkValue = row[filterField];
                    if( !checkValue ) {
                        return false;
                    }
                    return (-1 !== filterSet.indexOf( row[filterField] ));
                }

                //  must not be a member of array in filter field
                function reduceRowsNegativeSet( row ) {
                    var checkValue = row[filterField];
                    if( !checkValue ) {
                        return false;
                    }
                    return (-1 === filterSet.indexOf( row[filterField] ));
                }

                return collected;
            },

            applyPagination: function( params, rows ) {
                var
                    toAdd = params.itemsPerPage || 10,
                    startFrom = ((params.page - 1) * toAdd),
                    newRows = [],
                    i;

                for( i = 0; i < rows.length; i++ ) {
                    if( i >= startFrom && toAdd > 0 ) {
                        newRows.push( rows[i] );
                        toAdd = toAdd - 1;
                    }
                }

                return newRows;
            },

            /**
             *  Update and save row sort order configuration
             *  @param yEvent
             *  @param data
             */

            onRowReorder: function( yEvent, data ) {
                if( !data.dropData || !data.dragData.type || !data.dropData || !data.dropData.type ) {
                    return;
                }

                var
                    self = this,
                    toInsert = data.dragData.type,
                    insertBefore = data.dropData.type,
                    newSortOrder = [],
                    checkType,
                    i;

                for( i = 0; i < self.sortOrder.length; i++ ) {
                    checkType = self.sortOrder[i];
                    if( checkType !== toInsert && checkType !== insertBefore ) {
                        newSortOrder.push( checkType );
                    }

                    if( checkType === insertBefore ) {
                        newSortOrder.push( toInsert );
                        newSortOrder.push( insertBefore );
                    }
                }

                //  deduplicate and save
                //  credit: http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
                function deduplicateSortOrder( item, pos, thisAry ) {
                    return (pos === thisAry.indexOf( item ));
                }

                newSortOrder = newSortOrder.filter( deduplicateSortOrder );
                self.sortOrder = newSortOrder;

                //  save to user profile
                self.saveSortOrder();
            },

            onTableCellClick: function( evt ) {
                if( !evt.col.isLabdata ) {
                    return;
                }

                var
                    self = this,
                    fullDates = self.fullLabdataDates(),
                    fullActivities = [],
                    i;

                for( i = 0; i < fullDates.length; i++ ) {
                    if( fullDates[i].date === evt.col.timestamp ) {
                        fullActivities = fullDates[i].activities;
                    }
                }

                //  get full activities for this date
                Y.doccirrus.modals.labdataFinding.show( {
                    type: evt.row.type,
                    date: evt.col.timestamp,
                    activities: fullActivities
                } );
            }

        },
        {
            NAME: 'LabdataTableEditorModel'
        }
    );

    KoViewModel.registerConstructor( LabdataTableEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivityEditorModel',
        'labdata-finding-utils',
        'LabDataChartModal',
        'labdatafindingmodal',
        'dcforms-labdata-mapping-helper'
    ]
} );
