/**
 * Specialized meddata collection for recording the progress of a pregnancy
 *
 * These activities correspond to one row in a standard gravidogram form.
 *
 * 'Pregnancy checkup' would be a clearer name for this activity type
 *
 * User: strix
 * Date: 15/03/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'GravidogrammProcessEditorModel', function( Y /*, NAME*/ ) {
        /**
         * @module GravidogrammProcessEditorModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            MedDataEditorModel = KoViewModel.getConstructor( 'MedDataEditorModel' ),
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,

            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),

            // class linkers
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
            GravidogrammDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,
            MedDataConfigClient = Y.doccirrus.api.meddata.MedDataConfigClient;

            /**
         * @class GravidogrammProcessEditorModel
         * @constructor
         * @param {Object} config
         * @extends ActivityEditorModel
         */
        function GravidogrammProcessEditorModel( config ) {
            GravidogrammProcessEditorModel.superclass.constructor.call( this, config );
        }

        GravidogrammProcessEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'userContent',
                    'actType',
                    'subType',
                    'mdValue',
                    'mdUnit',
                    'timestamp',
                    'caseFolderId'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'medData',
                        editorName: 'MedDataItemEditorModel'
                    } ],
                lazyAdd: false
            }

        };

        Y.extend( GravidogrammProcessEditorModel, MedDataEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                gravidogrammDashboard: null,
                useUserContentCaretPosition: true,

                //  moved from ActivitySidebarViewModel, only applies to this
                openedTimestampWarning: null,
                previousTimestampValue: null,
                setPrevious: null,

                initializer: function GravidogrammProcessEditorModel_initializer() {
                    var
                        self = this;

                    self.gravidogrammDashboard = ko.observable( '' );
                    self.loadCurrentGravidogram();
                    self.initGravidogrammProcessEditorModel();
                    self.initTimestampWatcher();
                },
                destructor: function GravidogrammProcessEditorModel_destructor() {
                },
                customOptionsMapper: function __customOptionsMapper( item ) {
                    return {
                        id: item,
                        text: item
                    };
                },
                loadCurrentGravidogram: function() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = unwrap( binder.currentPatient ),
                        currentActivity = unwrap( binder.currentActivity ),
                        medData = currentActivity ? unwrap( currentActivity.medData ) : [];

                    //  If this is a new GRAVIDOGRAMM-PROCESS / Untersuchung model then we must prefill the pregnancy
                    //  checkup rows

                    if ( currentPatient ) {
                        //  currentPatient is available
                        self.getGravidogramm( onGravidogrammLoaded );
                    } else {
                        //  currentPatient not yet loaded, wait for it
                        self.listenForPatient = binder.currentPatient.subscribe( function() {
                            self.getGravidogramm( onGravidogrammLoaded );
                            self.listenForPatient.dispose();
                        } );
                    }
                    function onGravidogrammLoaded( err, gravidogrammPlain ) {
                        if ( err ) { return; }

                        if ( !( currentActivity && currentActivity.toJSON()._id ) && ( currentActivity && ( 'GRAVIDOGRAMMPROCESS' === currentActivity.toJSON().actType ) ) && medData.length === 0 ) {
                            self.initFromGravidogramm( gravidogrammPlain );
                        }

                        self.initGravidogrammDashboard( gravidogrammPlain );
                    }
                },


                /**
                 *  Find the gravidogramm for the current casefolder
                 *  @param callback
                 */

                getGravidogramm: function( callback ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = unwrap( binder.currentPatient ),
                        query;

                    if ( !currentPatient ) {
                        //  should not happen
                        return callback( 'no current patient' );
                    }

                    query = {
                        'patientId': unwrap( currentPatient._id ),
                        //  TODO: better way to read the current casefolder _id
                        'caseFolderId': unwrap( currentPatient.activeCaseFolderId ),
                        'actType': 'GRAVIDOGRAMM'
                    };

                    Y.doccirrus.jsonrpc.api.activity
                        .read( { query: query } )
                        .then( onGravidogrammLoaded )
                        .fail( callback );

                    function onGravidogrammLoaded( result ) {
                        result = result.data ? result.data : result;
                        if ( !result[0] ) { return callback( 'Could not find GRAVIDOGRAMM for current casefolder' ); }
                        callback( null, result[0] );
                    }

                },

                lookupInitialWeekOfPregnancy: function() {

                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = unwrap( binder.currentPatient ),
                        medData = unwrap( currentPatient.latestMedData || [] ),
                        medDataItem, medDataItemType, medDataItemDateValue,
                        calculatedWeekOfGestation = '',
                        lastMenstruation,
                        i;

                    //  check whether cycle length and date of last pregnancy are recorded in medData
                    for( i = 0; i < medData.length; i++ ) {
                        medDataItem = unwrap( medData[i] );
                        medDataItemType = unwrap( medDataItem.type || '' );
                        medDataItemDateValue = unwrap( medDataItem.dateValue || '' );

                        if( MedDataTypes.LAST_MENSTRUATION_P === medDataItemType && medDataItemDateValue && '' !== medDataItemDateValue ) {
                            lastMenstruation = moment( medDataItemDateValue );
                            calculatedWeekOfGestation = Y.doccirrus.schemas.patient.calculateWeekOfGestation( {
                                dayOfLastMenorrhoea: lastMenstruation
                            } );
                        }
                    }

                    if( calculatedWeekOfGestation ) {
                        return calculatedWeekOfGestation.week + '/' + calculatedWeekOfGestation.days;
                    }

                    return '';
                },

                initGravidogrammProcessEditorModel: function __initGravidogrammProcessEditorModel() {
                    var
                        self = this,
                        binder = self.get('binder'),
                        currentActivity = peek( binder.currentActivity ),
                        gravidogrammConfig = new MedDataConfigClient( {
                            subType: '',
                            defaultCategoryForNewItems: Y.doccirrus.schemas.v_meddata.medDataCategories.GRAVIDOGRAMM,
                            columnOrder: [
                                'type',
                                'smartValue',
                                'deleteButton'
                            ]
                        } );

                    // overwrite any initialization medDataConfig with this one
                    if( currentActivity && currentActivity.medDataConfig ) {
                        currentActivity.medDataConfig( gravidogrammConfig );
                    }

                    self.notesI18n = i18n('InCaseMojit.MedDataEditorModel_clientJS.notes');

                    //  deprecated
                    self.showUserContent = ko.computed(function __meddata_showUserContent() {
                        return true;
                    });
                },

                initTimestampWatcher: function() {
                    var self = this;

                    //  used to keep track of changes to activity date/time
                    self.openedTimestampWarning = ko.observable( false );
                    self.setPrevious = ko.observable( false );
                    self.previousTimestampValue = ko.observable( self.timestamp() );

                    //  subscribe to activity timestamp  - when the date is changed the SSW should be recalculated
                    self.subscribeToTimestamp = self.timestamp.subscribe( function( val ) {
                        var
                            // compare the dates in a unified TIMESTAMP_FORMAT
                            newDate = moment( val ).format( TIMESTAMP_FORMAT ),
                            lastDate = moment( self.previousTimestampValue() ).format( TIMESTAMP_FORMAT );

                        if ( newDate === lastDate ) {
                            return;
                        }

                        if ( !self.setPrevious() ) {
                            self.onTimestampChanged( val );
                        } else {
                            self.setPrevious( false );
                        }
                    } );
                },

            initGravidogrammDashboard: function( gravidogrammPlain ) {
                var
                    self = this,
                    fields = [
                        "initialWeight",
                        "pelvicMeasurementSP25",
                        "pelvicMeasurementCR28",
                        "pelvicMeasurementTR31",
                        "pelvicMeasurementC20",
                        "---",
                        "rubellaTiter",
                        "antibody1",
                        "antibody2",
                        "HBsAg",
                        "syphillis",
                        "toxoplasmosis",
                        "HIV",
                        "chlamidia",
                        "glucoseTolerance"
                    ],
                    html = '&nbsp;&nbsp;',
                    label, value,
                    i;

                for( i = 0; i < fields.length; i++ ) {
                    label = i18n( 'activity-schema.Gravidogramm_T.' + fields[i] + '.i18n' );
                    value = gravidogrammPlain[fields[i]];

                    if( 'undefined' !== typeof value ) {
                        if( true === value ) {
                            value = 'pos';
                        }        //  same for en and de
                        if( false === value ) {
                            value = 'neg';
                        }       //  same for en and de

                        html = html + '<span class="label label-default"><b>' + label + '</b>: ' + value + ' </span>&nbsp;';
                    }

                    if( '---' === fields[i] ) {
                        html = html + '<br/>\n&nbsp; ';
                    }
                }
                // --- test
                self.gravidogrammDashboard( html );
            },

            /**
             *  Set initial rows of table according to how many fetuses are recorded for the pregnancy
             *
             *  Note that this is handles here because currentPatient, used to look up the Gravidogramm, is on the binder
             *
             *  @param   {Object}    gravidogrammPlain       Current casefolders gravidogramm as a plain object
             */

            initFromGravidogramm: function( gravidogrammPlain ) {
                var
                    self = this,
                    numFetuses = parseInt( gravidogrammPlain.fetuses, 10 ) || 1,

                    weekAndDayOfPregnancy = self.lookupInitialWeekOfPregnancy(),

                    headerTypes = [
                        GravidogrammDataTypes.WEEK_AND_DAY_OF_PREGNANCY,
                        MedDataTypes.WEEK_AND_DAY_CORRECTION
                    ],

                    fetusTypes = [
                        GravidogrammDataTypes.UTERINE_DISTANCE,
                        GravidogrammDataTypes.FOETAL_POSITION,
                        GravidogrammDataTypes.HEARTBEAT_PRESENT,
                        GravidogrammDataTypes.MOVEMENT_PRESENT
                    ],

                    motherTypes = [
                        GravidogrammDataTypes.EDEMA,
                        GravidogrammDataTypes.VARICOSIS,
                        GravidogrammDataTypes.CHECKUP_WEIGHT,
                        GravidogrammDataTypes.BLOODPRESSUREP,
                        GravidogrammDataTypes.HAEMOGLOBIN,
                        GravidogrammDataTypes.US_PROTEIN,
                        GravidogrammDataTypes.US_SUGAR,
                        GravidogrammDataTypes.US_NITRITE,
                        GravidogrammDataTypes.US_BLOOD,
                        GravidogrammDataTypes.PH_URINE,
                        GravidogrammDataTypes.PH_VAGINAL,
                        GravidogrammDataTypes.CX_VAGINAL,
                        GravidogrammDataTypes.RISK_CATEGORY,
                        GravidogrammDataTypes.THERAPY
                    ],

                    /**
                     * @param {Partial<MedDataItemSchema>} type
                     * @return {Partial<MedDataItemSchema>}
                     */
                    getDefaultValuesForType = function getDefaultValuesForType( type ) {
                        var initialValues = {};
                        switch( type ) {
                            case MedDataTypes.WEEK_AND_DAY_OF_PREGNANCY:
                                initialValues.textValue = weekAndDayOfPregnancy;
                                break;
                        }
                        return initialValues;
                    },

                    i, l, j, k, idx;

                // add a single set of header types
                for( i = 0, l = headerTypes.length; i < l; i++ ) {
                    self.addMedDataItem( new MedDataItemSchema( Object.assign( {
                        category: MedDataCategories.GRAVIDOGRAMM,
                        type: headerTypes[i]
                    }, getDefaultValuesForType( headerTypes[i] ) ) ) );
                }

                // for each fetus, add a set of fetus types (only the ones > 1 get a special fetus index)
                for( j = 0, k = (numFetuses + 0); j < k; j++ ) {
                    idx = j + 1;
                    for( i = 0, l = fetusTypes.length; i < l; i++ ) {
                        self.addMedDataItem( new MedDataItemSchema( Object.assign( {
                            category: MedDataCategories.GRAVIDOGRAMM,
                            type: fetusTypes[i] + ((idx > 1) ? '_' + idx : '')
                        }, getDefaultValuesForType( fetusTypes[i] ) ) ) );
                    }
                }

                // add a single set of mother types
                for( i = 0, l = motherTypes.length; i < l; i++ ) {
                    self.addMedDataItem( new MedDataItemSchema( Object.assign( {
                        category: MedDataCategories.GRAVIDOGRAMM,
                        type: motherTypes[i]
                    }, getDefaultValuesForType( motherTypes[i] ) ) ) );
                }
            },

            //  Event handlers

            onTimestampChanged: function( val ) {

                var
                    self = this,
                    btnHeaderClose = Y.doccirrus.DCWindow.getButton( 'close', { action: onNoticeCancel } ),
                    btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', { action: onNoticeCancel } ),

                    noticeWindowConfig = {
                        icon: '',
                        message: i18n( 'InCaseMojit.ActivitySidebarVM.warn.CHANGE_GRAVIDOGRAMMPROCESS_TIMESTAMP' ),
                        window: {
                            width: 'auto',
                            buttons: {
                                header: [btnHeaderClose],
                                footer: [
                                    btnCancel,
                                    {
                                        label: i18n( 'general.button.CONFIRM' ),
                                        isDefault: true,
                                        action: onConfirmDateChange
                                    }
                                ]
                            }
                        }
                    },

                    modal;

                //  if wrong activity type then we can skip this
                if( 'GRAVIDOGRAMMPROCESS' !== self.actType() ) {
                    return;
                }

                //  if notice is already open then do not duplicate
                if( self.openedTimestampWarning() ) {
                    return;
                }

                self.openedTimestampWarning( true );
                modal = Y.doccirrus.DCWindow.notice( noticeWindowConfig );

                function onNoticeCancel( e ) {
                    self.timestamp( self.previousTimestampValue() );
                    self.openedTimestampWarning( false );
                    self.setPrevious( true );
                    modal.close( e );
                }

                function onConfirmDateChange( e ) {
                    e.target.button.disable();
                    self.onDateChangeConfirmed( val );
                    self.previousTimestampValue( val );
                    self.openedTimestampWarning( false );
                    modal.close( e );
                }

            },  //  end onTimestampChanged

            onDateChangeConfirmed: function( val ) {
                var
                    self = this,
                    days,
                    duration,
                    totalDaysDuration,
                    oldTextValue,
                    oldDays,
                    newTextValue,
                    numberOfWeeks, numberOfDays,
                    weekAndDayOfPregnancyItemIndex,
                    weekAndDayCorrectionItemIndex,
                    medData = self.medDataArr();

                weekAndDayOfPregnancyItemIndex = medData.findIndex( function( item ) {
                    return item.type() === MedDataTypes.WEEK_AND_DAY_OF_PREGNANCY;
                } );

                weekAndDayCorrectionItemIndex = medData.findIndex( function( item ) {
                    return item.type() === MedDataTypes.WEEK_AND_DAY_CORRECTION;
                } );

                if( -1 < weekAndDayOfPregnancyItemIndex ) {
                    days = moment( self.previousTimestampValue() ).startOf( 'day' ).diff( moment( val ).startOf( 'day' ), 'days' );
                    duration = moment.duration( days, 'days' );

                    oldTextValue = medData[weekAndDayOfPregnancyItemIndex].textValue();

                    if( oldTextValue.toString().trim() ) {
                        oldTextValue = oldTextValue.split( '/' );

                        oldDays = ( Number( oldTextValue[0] ) * 7 ) + Number( oldTextValue[1] );

                        totalDaysDuration = oldDays - parseInt( duration.asDays(), 10 );

                        numberOfWeeks = Math.floor( totalDaysDuration / 7 );
                        numberOfDays = totalDaysDuration - ( numberOfWeeks * 7 );

                        newTextValue = numberOfWeeks + '/' + numberOfDays;

                        medData[weekAndDayOfPregnancyItemIndex].textValue( newTextValue );
                    }

                    if( -1 < weekAndDayCorrectionItemIndex ) {
                        medData[weekAndDayCorrectionItemIndex].textValue( '' );
                    }
                }

            }

            }, {
                NAME: 'GravidogrammProcessEditorModel'
            }
        );
        KoViewModel.registerConstructor( GravidogrammProcessEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'MedDataEditorModel',
            'SubEditorModel',
            'activity-schema',
            'v_meddata-schema',
            'v_gravidogrammprocess-schema'
        ]
    }
);
