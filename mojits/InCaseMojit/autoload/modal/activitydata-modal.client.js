/*
 @author: pi
 @date: 21/01/2015
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, $, _ */


YUI.add( 'DcActivityDataModal', function( Y ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            DAY_SEPERATION = i18n( 'InCaseMojit.activity_model_clientJS.placeholder.DAY_SEPERATION' ),
            CANCEL = i18n( 'InCaseMojit.medication_modalJS.button.CANCEL' ),
            APPLY = i18n( 'InCaseMojit.medication_modalJS.button.APPLY' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        function ActivitySequenceTableModel( config ) {
            ActivitySequenceTableModel.superclass.constructor.call( this, config );
        }

        Y.extend( ActivitySequenceTableModel, KoViewModel.getBase(), {

                initializer: function ActivitySequenceTableModel_initializer() {
                    var
                        self = this;
                    self.initActivitySequenceTableModel();
                },
                destructor: function ActivitySequenceTableModel_destructor() {
                },
                initActivitySequenceTableModel: function ActivitySequenceTableModel_initActivitySequenceTableModel() {
                    var
                        self = this;
                    self.catalogShort.disabled = true;
                    self.code.disabled = true;
                    self.actType.disabled = true;
                    self.timestamp.disabled = true;
                    self.active.disabled = ko.computed(function(){
                        return unwrap(self.hasInactive);
                    });
                    self.isDisabled = true;
                    if( 'TREATMENT' === peek( self.actType ) ) {
                        self.displayBillingFactorValue = ko.computed( Y.doccirrus.comctl.simpleHelperFactorComputed( self.billingFactorValue ) );
                    } else {
                        self.displayBillingFactorValue = ko.observable();
                    }
                    self.displayBillingFactorValue.hasWarn = ko.computed( function() {
                        var
                            billingFactorValue = unwrap( self.billingFactorValue ),
                            billingFactorType = self.get( 'data.billingFactorType' ),
                            u_extra = self.get( 'data.u_extra' );
                        return u_extra && billingFactorType && u_extra.rechnungsfaktor && u_extra.rechnungsfaktor[ billingFactorType ] && billingFactorValue > u_extra.rechnungsfaktor[ billingFactorType ];
                    } );
                    self.displayBillingFactorValue.disabled = !('TREATMENT' === peek( self.actType ) && 'EBM' !== peek( self.catalogShort ));
                    self.displayCount = ko.observable( peek( self.count ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            displayCount = unwrap( self.displayCount ),
                            count = Number( displayCount );
                        self.count.hasError( !self.count.validateNow( count ).valid );
                        self.count( count );

                    } ) );
                    self.displayCount.disabled = ko.computed(function(){
                        return !unwrap(self.active) || Y.doccirrus.schemas.activity.isScheinActType( peek( self.actType ) );
                    });
                    self.displayCount.hasError = self.count.hasError;
                    self.displayCount.validationMessages = self.count.validationMessages;
                    if (!self.hasInactive) {
                        self.hasInactive = ko.observable(self.initialConfig
                                                         && self.initialConfig.data
                                                         && self.initialConfig.data.hasInactive
                                                            || false);
                    }
                },
                getData: function() {
                    return this.toJSON();
                }
            },
            {
                schemaName: 'v_activityDataItem',
                NAME: 'ActivitySequenceTableModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    }
                }
            }
        );

        /**
         * ActivityDataModel model
         * @constructor
         * @extends KoDisposable
         */
        function ActivityDataModel() {
            ActivityDataModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( ActivityDataModel, Y.doccirrus.KoViewModel.getDisposable(), {
            initializer: function ActivityDataModel_initializer() {
                var
                    self = this;
                self.initActivityDataModel();
            },
            /** @protected */
            destructor: function ActivityDataModel_destructor() {
            },
            initActivityDataModel: function() {
                var
                    self = this,
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                    caseFolderType = self.get( 'activeCaseFolder' ) && self.get( 'activeCaseFolder' ).type,
                    defaultLocationId = Y.doccirrus.schemas.location.getMainLocationId(),
                    defaultEmployeeId = null,
                    lastSchein = self.get('lastSchein'),
                    localValueSelectedDoctorParts = (Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) || '').split( '-' ),
                    localValuesSelectedLocation = localValueSelectedDoctorParts[1] || null,
                    localValuesSelectedEmployee = localValueSelectedDoctorParts[0] || null;

                self.placeholderTimestampI18n = i18n('InCaseMojit.casefile_detail.placeholder.TIMESTAMP');
                self.selectLocationI18n = i18n('InCaseMojit.casefile_detail.placeholder.SELECT_LOCATION');
                self.daySeparationI18n = i18n('InCaseMojit.casefile_detail.sr_only.DAY_SEPERATION');
                self.placeholderDaySeparationI18n = i18n('InCaseMojit.casefile_detail.placeholder.DAY_SEPERATION');
                self.useOriginalValuesI18n = i18n( 'activitysequence-schema.ActivitySequence_T.useOriginalValuesByDefault.i18n' );

                if( lastSchein ) {
                    defaultEmployeeId = lastSchein.employeeId;
                    defaultLocationId = lastSchein.locationId;
                } else if( self.get( 'insuranceStatus' ) ) {
                    self.get( 'insuranceStatus' ).some( function( insurance ) {
                        if( insurance.type === caseFolderType ) {
                            defaultEmployeeId = insurance.employeeId;
                            defaultLocationId = insurance.locationId;
                            return true;
                        }
                        return false;
                    } );
                }
                self.activitySequenceTableData = ko.observableArray();
                self.daySeparation = ko.observable();
                self.timestamp = ko.observable( moment().utc().toJSON() );
                self._locationList = self.get( '_locationList' );

                self.locationId = ko.observable( localValuesSelectedLocation || defaultLocationId );
                self.employeeId = ko.observable( localValuesSelectedEmployee || defaultEmployeeId );
                self._employeeList = ko.observableArray( [] );
                self._employeeListGrouped = ko.observableArray( [] );
                self.useOriginalValues = ko.observable();


                //  add validation for datepicker
                self.timestamp.hasError = ko.computed( function() {
                    const
                        currentValue = self.timestamp(),
                        today = moment();

                    return !!moment( currentValue ).isAfter( today );
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        locationId = unwrap( self.locationId ),
                        result = [];
                    self._locationList.some( function( location ) {
                        if( location._id === locationId ) {
                            result = location.employees;
                        }
                    } );

                    self._employeeList( result );

                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        list = unwrap( self._employeeList ).filter( function( employee ) {
                            return employee.status === 'ACTIVE';
                        } ),
                        foundEmployee,
                        currentEmployeeId = peek( self.employeeId ),
                        firstPhsician;

                    self._employeeListGrouped( Y.doccirrus.inCaseUtils.groupEmployeeList( list ) );

                    if( !ko.computedContext.isInitial() ) {
                        // clean selector to set employeeId
                        self.employeeId( null );
                    }

                    // looking for default employee
                    foundEmployee = Y.Array.find( list, function( employee ) {
                        return 'PHYSICIAN' === employee.type && currentEmployeeId === employee._id;
                    } );

                    if( !foundEmployee ) {
                        // looking for default employee
                        foundEmployee = Y.Array.find( list, function( employee ) {
                            return 'PHYSICIAN' === employee.type && defaultEmployeeId === employee._id;
                        } );

                        if( foundEmployee ) {
                            foundEmployee = foundEmployee._id;
                        } else if( list.length ) {
                            firstPhsician = Y.Array.find( list, function( employee ) {
                                return 'PHYSICIAN' === employee.type;
                            } );
                            if( firstPhsician ) {
                                foundEmployee = firstPhsician._id;
                            }
                        }
                    } else {
                        foundEmployee = foundEmployee._id;
                    }
                    // set employeeId and update selector
                    self.employeeId( foundEmployee );
                } ) );
                /**
                 * shows placeholder 'Tagtrennung' or 'daySeparation' value
                 * @type ko.computed
                 * @private
                 */
                self._daySeparation = ko.computed( function() {
                    var daySeparation = self.daySeparation();
                    return daySeparation || DAY_SEPERATION;
                } );

                /**
                 * toggles display of 'daySeparation' input and button
                 * @returns {boolean} true on appliance
                 * @private
                 */
                self._toggleDaySeparation = function() {
                    var $input = $( '#daySeparation-toggle-input' ),
                        $button = $( '#daySeparation-toggle-button' );
                    if( !$input.length || !$button.length ) {
                        return false;
                    }
                    if( $input.is( ':visible' ) ) {
                        $input.hide();
                        $button.show();
                    } else {
                        $input.show();
                        $button.hide();
                    }
                };

                self.selectedCaseFolder = self.get( 'activeCaseFolder' );
                // show only available case folders or for ('Alle..') all of them.
                self._caseFolderList = self.get( 'availableCaseFolders' );
                if( self.selectedCaseFolder && self.selectedCaseFolder.type ) {
                    self._caseFolderList = self._caseFolderList.filter( function( caseFolder ) {
                        return self.selectedCaseFolder.type === caseFolder.type;
                    } );
                } else if( self.selectedCaseFolder && self.selectedCaseFolder.additionalType ) {
                    self._caseFolderList = self._caseFolderList.filter( function( caseFolder ) {
                        return self.selectedCaseFolder.additionalType === caseFolder.additionalType;
                    } );
                }

                self.initActivitySequenceTable();

                self.addDisposable( ko.computed( function() {
                    var employeeId = unwrap( self.employeeId ),
                        employeeDignity = (self._employeeList().find( function( el ) {
                            return el._id && el._id.toString() === employeeId;
                        } ) || {}).qualiDignities || [];
                    self.activitySequenceTable.rows().forEach( function( row ) {

                        // functionality for all
                        row.timestamp( ko.unwrap( self.timestamp ) );

                        if( !isSwiss ) {
                            return;
                        }
                        // only Swiss logic, although generalisable for all in future
                        var u_extra = row.initialConfig.data.u_extra || {},
                            activityDignities = u_extra.dignityRules &&
                                                u_extra.dignityRules.qualDignity &&
                                                u_extra.dignityRules.qualDignity.map( function( elem ) {
                                                    return elem.code;
                                                } ) || [],
                            actType = unwrap( row.actType ),
                            catalogShort = unwrap( row.catalogShort ),
                            active = (Boolean( _.intersection( activityDignities, employeeDignity ).length ));
                        if( 'TREATMENT' === actType && -1 !== Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.indexOf( catalogShort ) ) {
                            row.active( active );
                            row.hasInactive( !active );
                        }
                    } );

                } ) );
            },
            loadActivitySequenceData: function ActivityDataModel_loadActivitySequenceData() {
                var
                    self = this,
                    sequenceId = self.get( 'sequenceId' );
                if( !sequenceId ) {
                    return;
                }
                self.activitySequenceTable.masked( true );
                Y.doccirrus.jsonrpc.api.activitysequence.getSequenceWithActivities( {
                    query: {
                        _id: sequenceId
                    }
                } )
                    .done( function( response ) {
                        var
                            fullData = response.data && response.data[ 0 ];
                        if( fullData && fullData.activities ) {
                            self.useOriginalValues( fullData.useOriginalValues !== false ); // When undefined, we want the default to be true (this is for activity sequences that were created before the existence of the useOrginalValues field.
                            self.activitySequenceTableData( fullData.activities.map( function( item ) {
                                item.active = true;
                                item.hasInactive = false;
                                return {
                                    data: item
                                };
                            } ) );
                        }
                    } )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
                    .always( function() {
                        self.activitySequenceTable.masked( false );
                    } );
            },
            initActivitySequenceTable: function ActivityDataModel_initActivitySequenceTable() {
                var
                    self = this,
                    incaseconfiguration = self.get( 'incaseconfiguration' ) || {},
                    activeCaseFolderType = self.get( 'activeCaseFolder' ) && self.get( 'activeCaseFolder' ).type,
                    sequenceData = self.get( 'sequenceData' ),
                    tableData = sequenceData && sequenceData.activities,
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                self.activitySequenceTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    componentConfig: {
                        stateId: 'MedicationPlanEditorModel-medicationTable',
                        ViewModel: ActivitySequenceTableModel,
                        data: self.activitySequenceTableData,
                        columns: [
                            {
                                componentType: 'KoEditableTableCheckboxColumn',
                                forPropertyName: 'active',
                                selectAllCheckbox: true,
                                selectAll: true,
                                visible: incaseconfiguration.canApplyActivitySequencePartly || isSwiss || false
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                sorted: true,
                                width: '10%',
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'ISODate',
                                        showLabel: false,
                                        useIsoDate: true
                                    }
                                },
                                renderer: function( meta ) {
                                    const timestamp = unwrap( meta.value );
                                    if( timestamp ) {
                                        return moment( timestamp ).format( TIMESTAMP_FORMAT );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                renderer: function( meta ) {
                                    const actType = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                                },
                                width: '10%'
                            },
                            {
                                forPropertyName: 'subType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                visible: false,
                                width: '10%'
                            },
                            {
                                forPropertyName: 'catalogShort',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                                width: '10%'
                            },
                            {
                                forPropertyName: 'code',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                width: '10%'
                            },
                            {
                                forPropertyName: 'userContent',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                                width: '20%',
                                inputField: {
                                    componentType: 'KoEditableTableTextareaCell',
                                    componentConfig: {
                                        disabled: ko.computed( function() {
                                            return unwrap( self.useOriginalValues() );
                                        } ),
                                        css: {
                                            vresize: true
                                        }
                                    }

                                }
                            },
                            {
                                forPropertyName: 'displayBillingFactorValue',
                                width: '10%',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.FACTOR' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.FACTOR' ),
                                visible: !isSwiss && activeCaseFolderType !== 'PUBLIC',
                                inputField: {
                                    componentConfig: {
                                        disabled: ko.computed( function() {
                                            return unwrap( self.useOriginalValues() );
                                        } )
                                    }
                                }
                            },
                            {
                                forPropertyName: 'explanations',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.EXPLANATIONS' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.EXPLANATIONS' ),
                                width: '20%',
                                inputField: {
                                    componentType: 'KoEditableTableTextareaCell',
                                    componentConfig: {
                                        disabled: ko.computed( function() {
                                            return unwrap( self.useOriginalValues() );
                                        } ),
                                        css: {
                                            vresize: true
                                        }
                                    }

                                }
                            },
                            {
                                forPropertyName: 'displayCount',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.COUNT' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.COUNT' ),
                                width: '10%'
                            }
                        ],
                        onAddButtonClick: function() {
                        },
                        isAddRowButtonDisabled: function() {
                            return true;
                        }
                    }
                } );
                self.activitySequenceTable.rendered.subscribe( function( val ) {
                    if( true === val ) {
                        KoEditableTable.tableNavigation( document.querySelector( '#activitySequenceTable' ) );
                    }
                } );
                if( !tableData ) {
                    setTimeout( function() {
                        self.loadActivitySequenceData();
                    }, 201 );
                }
            }
        }, {
            ATTRS: {
                activeCaseFolder: {
                    lazyAdd: false,
                    value: null
                },
                lastSchein: {
                    lazyAdd: false,
                    value: null
                },
                insuranceStatus: {
                    lazyAdd: false,
                    value: []
                },
                _locationList: {
                    lazyAdd: false,
                    value: []
                },
                availableCaseFolders: {
                    lazyAdd: false,
                    value: []
                },
                sequenceId: {
                    lazyAdd: false,
                    value: []
                },
                incaseconfiguration: {
                    lazyAdd: false,
                    value: null
                },
                sequenceData: {
                    lazyAdd: false,
                    value: null
                }

            }
        } );

        function ActivityDataModal() {

        }

        ActivityDataModal.prototype.showDialog = function( data, callback ) {

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/activitydata_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        modal,
                        bodyContent = Y.Node.create( template ),
                        activityDataModel = new ActivityDataModel( data );

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: i18n( 'InCaseMojit.activityDataModal.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close', 'maximize' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    label: CANCEL
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: APPLY,
                                    action: function() {
                                        var
                                            isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                                            incaseconfiguration = activityDataModel.get( 'incaseconfiguration' ) || {},
                                            activitiesData = [],
                                            isModelValid = true;

                                            //  do not create sequences in the future, activities will not be valid MOJ-10468
                                            if ( activityDataModel.timestamp.hasError() ) {
                                                isModelValid = false;
                                            }

                                            peek( activityDataModel.activitySequenceTable.rows ).forEach( function( item ) {
                                                var
                                                    data = item.getData(),
                                                    fullActivity = item.toJSON();

                                                item.count.validate();
                                                isModelValid = isModelValid && item.isValid();
                                                /**
                                                 * swiss: behaves like incaseconfiguration.canApplyActivitySequencePartly is on all the itme
                                                 * german: if incaseconfiguration.canApplyActivitySequencePartly is set then data must be active otherwise take everything
                                                 */
                                                if( (isSwiss && data.active) ||
                                                    (!isSwiss && data.active || !incaseconfiguration.canApplyActivitySequencePartly) ) {
                                                    data.actType = fullActivity.actType;
                                                    activitiesData.push( data );
                                                }
                                            } );
                                            if( isModelValid ) {
                                                this.close();
                                                return callback( {
                                                    employeeId: ko.utils.peekObservable( activityDataModel.employeeId ),
                                                    timestamp: ko.utils.peekObservable( activityDataModel.timestamp ),
                                                    locationId: ko.utils.peekObservable( activityDataModel.locationId ),
                                                    daySeparation: ko.utils.peekObservable( activityDataModel.daySeparation ),
                                                    selectedCaseFolder: ko.utils.peekObservable( activityDataModel.selectedCaseFolder ),
                                                    useOriginalValues: ko.utils.peekObservable( activityDataModel.useOriginalValues ),
                                                    insuranceStatus: ko.utils.peekObservable( activityDataModel.insuranceStatus ),
                                                    activitiesData: activitiesData
                                                } );
                                            }

                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    activityDataModel.destroy();
                                }
                            }
                        }
                    } );

                    activityDataModel.addDisposable( ko.computed( function() {
                        var
                            isModelValid = true,
                            okBtn = modal.getButton( 'OK' ).button;
                        unwrap( activityDataModel.activitySequenceTable.rows ).every( function( item ) {
                            isModelValid = isModelValid && item.isValid();
                            return isModelValid;
                        } );
                        if( isModelValid ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );

                    ko.applyBindings( activityDataModel, bodyContent.getDOMNode() );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).activityDataModal = new ActivityDataModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'inCaseUtils',
            'activity-schema',
            'v_activityDataItem-schema'
        ]
    }
);
