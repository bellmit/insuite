/**
 * User: do
 * Date: 31.01.20  08:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true */
/*global YUI, ko, jQuery, _ */

YUI.add( 'KBVMedicationPlanViewModel', function( Y, NAME ) {
        'use strict';

        /**
         * @module KBVMedicationPlanViewModel
         * Used as activity editor and inside prescription-medicationplan modal.
         */

        var
            i18n = Y.doccirrus.i18n,
            KBVMedicationPlan_T = Y.doccirrus.schemas.activity.types.KBVMedicationPlan_T,
            KoViewModel = Y.doccirrus.KoViewModel,
            KBVMedicationPlanEntryViewModel = KoViewModel.getConstructor( 'KBVMedicationPlanEntryViewModel' ),
            PhIngrViewModel = Y.doccirrus.KoViewModel.getConstructor( 'PhIngrViewModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        function debounce( func, wait, immediate ) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if( !immediate ) {
                        func.apply( context, args );
                    }
                };
                var callNow = immediate && !timeout;
                clearTimeout( timeout );
                timeout = setTimeout( later, wait );
                if( callNow ) {
                    func.apply( context, args );
                }
            };
        }

        /**
         * @class KBVMedicationPlanViewModel
         * @constructor
         * @extends KoViewModel.getBase()
         */
        function KBVMedicationPlanViewModel( config ) {
            KBVMedicationPlanViewModel.superclass.constructor.call( this, config );
        }

        KBVMedicationPlanViewModel.ATTRS = {
            validatable: {
                value: true
            },
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' );
                },
                lazyAdd: false
            }
        };

        Y.extend( KBVMedicationPlanViewModel, KoViewModel.getBase(), {
                initializer: function KBVMedicationPlanViewModel_initializer() {
                    var
                        self = this;
                    self.initKBVMedicationPlanViewModel();
                },
                destructor: function KBVMedicationPlanViewModel_destructor() {
                    var medicationPlanEntries = peek( this.medicationPlanEntries );

                    /**
                     * When destroying the KBVMedicationPlanViewModel
                     * All the medicationPlanEntries instances need to be destroyed as well
                     */
                    if( medicationPlanEntries && medicationPlanEntries.length ) {
                        medicationPlanEntries.forEach( function( medicationPlanEntry ) {
                            if( medicationPlanEntry && medicationPlanEntry.destroy ) {
                                medicationPlanEntry.destroy();
                            }
                        } );
                    }
                },
                initKBVMedicationPlanViewModel: function KBVMedicationPlanViewModel_initKBVMedicationPlanViewModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                        currentActivity;

                    self.sourceI18n = i18n( 'InCaseMojit.scanMedicationPlanModal_clientJS.label.SOURCE' );

                    self.cancelEditingI18n = i18n( 'general.button.CANCEL' );

                    self.saveEditingI18n = i18n( 'general.button.TAKE' );

                    self.allowCustomValuesForNoteAndReason = Y.doccirrus.auth.isAdmin() ||
                                                             !incaseconfiguration.allowCustomValueFor ||
                                                             -1 !== incaseconfiguration.allowCustomValueFor.indexOf( 'PRESCRIPTION' );
                    self.activeRow = ko.observable();
                    self.patientParameterVisible = ko.observable( self.initialConfig.patientParameterVisible );
                    self.currentPatient = self.initialConfig.currentPatient;
                    self.currentActivity = self.initialConfig.currentActivity;
                    self.currentMedPlan = self.initialConfig.currentMedPlan;
                    currentActivity = peek( self.currentActivity );
                    self._locationList = self.initialConfig._locationList || [];
                    self._employeeList = self.initialConfig._employeeList || [];

                    if( self.currentMedPlan && self.currentMedPlan.medicationPlanEntries &&
                        self.currentMedPlan.medicationPlanEntries[0] ) {
                        self.medicationPlanEntries( self.currentMedPlan.medicationPlanEntries.map( function( entry ) {
                            delete entry.medicationRef;
                            delete entry._id;
                            return entry;
                        } ) );
                    }

                    self.setPatientParameters();

                    // workaround KoViewModel observable array breaks drag and drop
                    self.medicationPlanEntries = ko.observableArray( peek( self.medicationPlanEntries ).map( function( medicationPlanEntry ) {
                        return new KBVMedicationPlanEntryViewModel( {
                            data: medicationPlanEntry.toJSON ? medicationPlanEntry.toJSON() : medicationPlanEntry,
                            currentPatient: self.currentPatient,
                            _locationList: self._locationList,
                            _employeeList: self._employeeList,
                            allowCustomValuesForNoteAndReason: self.allowCustomValuesForNoteAndReason,
                            saveEditing: self.saveEditing.bind( self )
                        } );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var locationId = unwrap( self.locationId ),
                            employeeId = unwrap( self.employeeId );

                        self.medicationPlanEntries().forEach( function( medicationPlanEntry ) {
                            medicationPlanEntry.locationId( locationId );
                            medicationPlanEntry.employeeId( employeeId );
                        } );
                    } ) );

                    // Validation of positioning of entries
                    self.addDisposable( ko.computed( function() {
                        var medicationPlanEntries = self.medicationPlanEntries(),
                            entryBefore, entryAfter;
                        medicationPlanEntries.forEach( function( medicationPlanEntry, index, arr ) {
                            var type = peek( medicationPlanEntry.type );
                            medicationPlanEntry.hasWrongPosition( false );
                            switch( type ) {
                                case 'BINDTEXT':
                                    entryBefore = arr[index - 1];
                                    if( !entryBefore || ['MEDICATION', 'MEDICATION_RECIPE'].indexOf( peek( entryBefore.type ) ) === -1 ) {
                                        medicationPlanEntry.hasWrongPosition( true );
                                    }
                                    break;
                                case 'SUB_HEADING':
                                    entryAfter = arr[index + 1];
                                    if( !entryAfter || peek( entryAfter.type ) === 'BINDTEXT' ) {
                                        medicationPlanEntry.hasWrongPosition( true );
                                    }
                                    break;
                            }
                        } );
                    } ) );

                    if( currentActivity ) {
                        // write back data to actual activity
                        self.addDisposable( ko.computed( function() {
                            var data = {}, mergedData;
                            Object.keys( KBVMedicationPlan_T ).forEach( function( key ) {
                                var value,
                                    type;

                                if( !ko.isObservable( self[key] ) ) {
                                    return;
                                }

                                value = self[key]();
                                type = KBVMedicationPlan_T[key];

                                data[key] = type.complex === 'inc' ? value.map( function( el ) {
                                    return el.toJSON();
                                } ) : value;

                                if( type.complex === 'inc' ) {
                                    value.forEach( function( el ) {
                                        el.editMode();
                                    } );
                                }
                            } );
                            mergedData = Object.assign( currentActivity.toJSON(), data );
                            currentActivity.set( 'data', mergedData );
                        } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
                    }

                    self._defaultMappings = Y.doccirrus.KoViewModel.utils.createAsync( {
                        initialValue: [],
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries,
                            params: (function() {
                                return {
                                    query: {
                                        catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']
                                    }
                                };
                            })()
                        },
                        converter: function( response ) {
                            return response.data;
                        },
                        onFail: function( defaultMapping, response ) {
                            switch( response.code ) {
                                case 9000:
                                    defaultMapping.error = response;
                                    return [];
                            }
                        }
                    } );

                    /**
                     * When the KBVMedicationPlan has APPROVED status it should set everything as readOnly.
                     * This readOnly state is used in other places to:
                     * - Set all input fields to readOnly mode
                     * - disabled buttons such as MMI search
                     * - Hide action and edit buttons
                     * - Show the chevron button
                     */
                    self.addDisposable( ko.computed( function() {
                        var isApproved = unwrap( self.status ) === 'APPROVED';

                        self._isModelReadOnly( isApproved );

                        self.medicationPlanEntries().forEach( function( medicationPlanEntry ) {
                            medicationPlanEntry._isModelReadOnly( isApproved );

                            medicationPlanEntry.phIngr().forEach( function( ingr ) {
                                ingr._isModelReadOnly( isApproved );
                            } );
                        } );
                    } ) );
                },
                setPatientParameters: function() {
                    var self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                        medDataMedicationPlanTransfer = incaseconfiguration && incaseconfiguration.medDataMedicationPlanTransfer,
                        currentActivity = peek( self.currentActivity ),
                        medicationPlan = self.currentMedPlan,
                        currentPatient = peek( self.currentPatient );

                    if( !medDataMedicationPlanTransfer || (currentActivity && !currentActivity.isNew()) || !currentPatient ) {
                        return;
                    }

                    self.patientGender( peek( currentPatient.gender ) );
                    if( medicationPlan ) {
                        self.patientWeight( medicationPlan.patientWeight );
                        self.patientHeight( medicationPlan.patientHeight );
                        self.comment( medicationPlan.comment );
                        self.patientAllergiesAndIntolerances( medicationPlan.patientAllergiesAndIntolerances );
                        self.patientCreatinineValue( medicationPlan.patientCreatinineValue );
                        self.patientLactation( medicationPlan.patientLactation );
                        self.patientPregnant( medicationPlan.patientPregnant );
                        self.patientParameter1( medicationPlan.patientParameter1 );
                        self.patientParameter2( medicationPlan.patientParameter2 );
                        self.patientParameter3( medicationPlan.patientParameter3 );
                    }
                },
                isValid: function() {
                    var self = this,
                        hasWrongPosition = unwrap( self.hasWrongPosition ),
                        hasActiveRowEditor = self.hasActiveRowEditor(),
                        medicationPlanEntriesAreValid = self.medicationPlanEntries().every( function( medicationPlanEntry ) {
                            return medicationPlanEntry.isValid();
                        } ),
                        isValid = self._isValid();

                    return !hasWrongPosition && isValid && medicationPlanEntriesAreValid && !hasActiveRowEditor;

                },
                togglePatientParameterVisible: function() {
                    var self = this;
                    self.patientParameterVisible( !self.patientParameterVisible() );
                },
                drop: function() {
                },
                dragStart: function( data, event ) {
                    var dragHandle;

                    dragHandle = jQuery( event.target ).closest( '.drag-handle' ).length;

                    if( !dragHandle ) {
                        return false;
                    }
                    data.isDragging( true );
                },
                dragEnd: function( data ) {
                    data.isDragging( false );
                },
                dragOver: debounce( function( event, dragData, zoneData ) {
                    var
                        zoneDataIndex,
                        dragDataIndex,
                        nextItem;

                    if( dragData !== zoneData.item ) {
                        zoneDataIndex = zoneData.items().indexOf( zoneData.item );
                        dragDataIndex = zoneData.items().indexOf( dragData );
                        nextItem = zoneData.items()[dragDataIndex + 1];
                        zoneData.items.remove( dragData );
                        zoneData.items.splice( zoneDataIndex, 0, dragData );
                        if( ['MEDICATION', 'MEDICATION_RECIPE'].indexOf( peek( dragData.type ) ) !== -1 &&
                            nextItem && peek( nextItem.type ) === 'BINDTEXT' ) {
                            zoneData.items.remove( nextItem );
                            zoneData.items.splice( zoneDataIndex + 1, 0, nextItem );
                        }
                    }
                } ),
                removeLinkedMedication: function( id ) {
                    var self = this;
                    self.medicationPlanEntries.remove( self.medicationPlanEntries().find( function( medicationPlanEntry ) {
                        return peek( medicationPlanEntry.medicationRef ) === id;
                    } ) );
                },
                hasLinkedMedication: function( id ) {
                    var self = this;
                    return self.medicationPlanEntries().some( function( medicationPlanEntry ) {
                        return peek( medicationPlanEntry.medicationRef ) === id;
                    } );
                },
                addMedicationEntryRow: function( data, atEntry, doNotSetEditMode, valuesChangedCallback ) {
                    var self = this,
                        medicationEntriesLength = peek( self.medicationPlanEntries() ).length,
                        indexOfAtEntry = atEntry && self.medicationPlanEntries().indexOf( atEntry ),
                        insertAt;

                    insertAt = _.isFinite( indexOfAtEntry ) ? (indexOfAtEntry + 1) : medicationEntriesLength;
                    self.medicationPlanEntries.splice( insertAt, 0, new KBVMedicationPlanEntryViewModel( {
                        data: data,
                        currentPatient: self.currentPatient,
                        _locationList: self._locationList,
                        _employeeList: self._employeeList,
                        allowCustomValuesForNoteAndReason: self.allowCustomValuesForNoteAndReason,
                        valuesChangedCallback: valuesChangedCallback,
                        saveEditing: self.saveEditing.bind( self )
                    } ) );

                    if( doNotSetEditMode ) {
                        return;
                    }
                    self.setActiveRowEditorByIndex( insertAt );
                },
                updateMedicationDosisAndLablel: function( searchLabel, data ) {
                    var self = this;
                    self.medicationPlanEntries().forEach( function( medicationPlanEntry ) {
                        if( peek( medicationPlanEntry.phNLabel ) === searchLabel ) {
                            if( data.dosis ) {
                                var  // eslint-disable-line no-inner-declarations
                                    phDosisType = peek( medicationPlanEntry.phDosisType ),
                                    matches = self.getDosisMatches( data.dosis );
                                if( Y.doccirrus.schemas.activity.phDosisTypes.SCHEDULE === phDosisType && matches ) {
                                    medicationPlanEntry.phDosisMorning( matches[1] );
                                    medicationPlanEntry.phDosisAfternoon( matches[2] );
                                    medicationPlanEntry.phDosisEvening( matches[3] );
                                    medicationPlanEntry.phDosisNight( matches[4] );
                                } else {
                                    medicationPlanEntry.phDosisType( Y.doccirrus.schemas.activity.phDosisTypes.TEXT );
                                    medicationPlanEntry.dosis( data.dosis.trim() );
                                }
                            }

                            if( data.phNLabel ) {
                                medicationPlanEntry.phNLabel( data.phNLabel );
                            }
                        }
                    } );
                },

                updateMMandDM: function( searchLabel, data ) {
                    var self = this;
                    self.medicationPlanEntries().forEach( function( medicationPlanEntry ) {
                        if( peek( medicationPlanEntry.phNLabel ) === searchLabel ) {
                            if( data.phContinuousMed !== undefined ) {
                                medicationPlanEntry.phContinuousMed( data.phContinuousMed );
                            }

                            if( data.phSampleMed !== undefined ) {
                                medicationPlanEntry.phSampleMed( data.phSampleMed );
                            }
                        }
                    } );
                },

                getDosisMatches: function getDosisMatches( value ) {
                    var regExp = /^(\d*)-(\d*)-(\d*)-(\d*)$/;
                    return regExp.exec( value.trim() );
                },
                searchAndAddMedicationRow: function( data ) {
                    var self = this,
                        currentPatient = peek( self.currentPatient );

                    Y.doccirrus.modals.addMedicationModal.show( {
                        currentActivity: self,
                        currentPatient: currentPatient,
                        defaultMappings: peek( self._defaultMappings )
                    } ).then( function( results ) {
                        if( !results || !results.length ) {
                            return null;
                        }
                        results.forEach( function( medication ) {
                            medication.type = 'MEDICATION';
                            if( !medication.phSalesStatus ) {
                                medication.phSalesStatus = 'UNKNOWN';
                            }
                            if( !medication.phNormSize ) {
                                medication.phNormSize = 'UNKNOWN';
                            }
                            medication.isPrescribed = false;
                            self.addMedicationEntryRow( medication, data, results.length > 1 );
                        } );
                    } );
                },
                addSubHeadingRow: function( data ) {
                    var self = this;
                    self.addMedicationEntryRow( {
                        type: 'SUB_HEADING'
                    }, data );
                },
                addMedicationRow: function( data ) {
                    var self = this;
                    self.addMedicationEntryRow( {
                        type: 'MEDICATION'
                    }, data );
                },
                addBindTextRow: function( data ) {
                    var self = this;
                    self.addMedicationEntryRow( {
                        type: 'BINDTEXT'
                    }, data );
                },
                addFreeTextRow: function( data ) {
                    var self = this;
                    self.addMedicationEntryRow( {
                        type: 'FREETEXT'
                    }, data );
                },
                addMedicationRecipeRow: function( data ) {
                    var self = this;
                    self.addMedicationEntryRow( {
                        type: 'MEDICATION_RECIPE'
                    }, data );
                },
                removeRow: function( data ) {
                    var self = this;
                    self.medicationPlanEntries.remove( data );
                    if( typeof self.initialConfig.onRemoveOfMedicationPlanEntry === 'function' ) {
                        self.initialConfig.onRemoveOfMedicationPlanEntry( data );
                    }
                    var
                        mPE = unwrap( self.medicationPlanEntries ),
                        idLinks = mPE.map( function( val ) {
                            return val.initialConfig.data.medicationRef;
                        } );

                    var
                        binder = self.get( 'binder' ),
                        currentActivityObservable = unwrap( binder.currentActivity );

                    if( currentActivityObservable ) {
                        currentActivityObservable.activities( idLinks );
                    }
                },
                toggleActiveEditor: function( data ) {
                    var self = this;

                    if( !peek( data.editMode ) ) {
                        self.setActiveRowEditor( data );
                    } else {
                        data.editMode( false );
                    }
                },
                cancelEditing: function( medicationPlanEntryViewModel ) {
                    var
                        dataBeforeEdit = medicationPlanEntryViewModel.editMode.dataBeforeEdit,
                        currentData = medicationPlanEntryViewModel.toJSON(),
                        isCurrentDataEqualToBeforeEditData = _.isEqual( dataBeforeEdit, currentData );

                    /**
                     * For new entries
                     * When user canceled editing, the entry should be deleted
                     * if it was newly created, which means when is the first time
                     * the editMode was enabled
                     */
                    if(
                        medicationPlanEntryViewModel.isNew() &&
                        medicationPlanEntryViewModel.editModeOpenedCounter && medicationPlanEntryViewModel.editModeOpenedCounter === 1
                    ) {
                        this.removeRow( medicationPlanEntryViewModel );
                    }

                    /**
                     * If the data before edit was stored
                     * and its different then the current one
                     * it should check for the values that differs and set them back
                     * to value before it was edited
                     */
                    if(
                        dataBeforeEdit !== null &&
                        !isCurrentDataEqualToBeforeEditData
                    ) {
                        _.forEach( dataBeforeEdit, function( value, key ) {
                            if( currentData[key] &&
                                !_.isEqual( currentData[key], value )
                            ) {

                                if( key === 'phIngr' ) {
                                    /**
                                     * For phIngr we need to iterate the plane ingredients array
                                     * and create a phIngrViewModel instance for each of them
                                     */
                                    medicationPlanEntryViewModel[key]( value.map( function( phIngrData ) {
                                        return new PhIngrViewModel( {data: phIngrData} );
                                    } ) );
                                } else if( key === 'phPZN' ) {
                                    /**
                                     * For phPZN, we may have the case that the user unlinked the PZN when editing the medication.
                                     * So, when restoring it we should check if there is a lastPZN and use it
                                     * otherwise use the regular value A.K.A when phPZN was not unlinked
                                     */
                                    medicationPlanEntryViewModel[key]( medicationPlanEntryViewModel.lastPZN || value );
                                } else {
                                    medicationPlanEntryViewModel[key]( value );
                                }
                            }
                        } );
                    }

                    medicationPlanEntryViewModel.editMode( false );
                },
                saveEditing: function( medicationPlanEntryViewModel ) {
                    this.toggleActiveEditor( medicationPlanEntryViewModel );
                },
                setActiveRowEditorByIndex: function( index ) {
                    var self = this,
                        medicationPlanEntry = self.medicationPlanEntries()[index];

                    if( !medicationPlanEntry ) {
                        Y.log( 'could not find medicationPlanEntry by index ' + index, 'debug', NAME );
                        return;
                    }

                    self.setActiveRowEditor( medicationPlanEntry );
                },
                setActiveRowEditor: function( medicationPlanEntry ) {
                    // TODO: MP check if editing is allowed
                    var self = this;
                    self.medicationPlanEntries().forEach( function( listMedicationPlanEntry ) {
                        if( listMedicationPlanEntry === medicationPlanEntry ) {
                            listMedicationPlanEntry.editMode( true );
                        } else {
                            listMedicationPlanEntry.editMode( false );
                        }
                    } );
                },
                hasActiveRowEditor: function() {
                    var self = this;
                    return self.medicationPlanEntries().some( function( listMedicationPlanEntry ) {
                        return listMedicationPlanEntry.editMode() && !listMedicationPlanEntry._isModelReadOnly();
                    } );
                },
                onRowClick: function( medicationPlanEntry ) {
                    var self = this;
                    self.activeRow( medicationPlanEntry );
                },
                setRowHighlight: function( row ) {
                    var self = this;
                    self.medicationPlanEntries().forEach( function( listMedicationPlanEntry ) {
                        if( listMedicationPlanEntry === row ) {
                            listMedicationPlanEntry.hasHighlight( true );
                        } else {
                            listMedicationPlanEntry.hasHighlight( false );
                        }
                    } );
                }
            }, {
                schemaName: 'v_kbvmedicationplan',
                NAME: 'KBVMedicationPlanViewModel'
            }
        );
        KoViewModel.registerConstructor( KBVMedicationPlanViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dccommonutils',
            'v_medicationItem-schema',
            'KBVMedicationPlanEntryViewModel',
            'PhIngrViewModel'
        ]
    }
);