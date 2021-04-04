/**
 * User: do
 * Date: 31.01.20  08:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true */
/*global YUI, ko, moment, $ */

'use strict';

YUI.add( 'KBVMedicationPlanEntryViewModel', function( Y, NAME ) {
        /**
         * @module KBVMedicationPlanEntryViewModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            PhIngrViewModel = Y.doccirrus.KoViewModel.getConstructor( 'PhIngrViewModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            PAPER_DOSIS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.text.PAPER_DOSIS' ),
            activeRowNamespace = 'activeKBVMedicationPlanEntryRow',
            activeRowClickEvent = 'click.' + activeRowNamespace,
            activeRowKeyDown = 'keydown.' + activeRowNamespace;

        function mapFhirCodeSystemResponseSelect2( item ) {
            if( !item ) {
                return null;
            }
            item.system = (peek( item.code ) + ' ' + peek( item.url ));
            return {
                id: peek( item.code ),
                text: peek( item.display ),
                system: item.system,
                _data: item
            };
        }

        /**
         * @class KBVMedicationPlanEntryViewModel
         * @constructor
         * @extends KoViewModel.getBase()
         */
        function KBVMedicationPlanEntryViewModel( config ) {
            KBVMedicationPlanEntryViewModel.superclass.constructor.call( this, config );
        }

        KBVMedicationPlanEntryViewModel.ATTRS = {
            validatable: {
                value: true
            }
        };

        Y.extend( KBVMedicationPlanEntryViewModel, KoViewModel.getBase(), {
                initializer: function KBVMedicationPlanEntryViewModel_initializer() {
                    var
                        self = this;
                    self.initKBVMedicationPlanEntryViewModel();
                },
                destructor: function KBVMedicationPlanEntryViewModel_destructor() {
                    $(document).off( activeRowClickEvent );
                    $(document).off( activeRowKeyDown );
                },
                initKBVMedicationPlanEntryViewModel: function KBVMedicationPlanEntryViewModel_initKBVMedicationPlanEntryViewModel() {
                    var
                        self = this,
                        type = peek( self.type );

                    if( self.isNew() && !unwrap( self.timestamp ) ) {
                        self.timestamp( moment().toISOString() );
                        self.editModeOpenedCounter = 0;
                    }

                    self.allowCustomValuesForNoteAndReason = self.initialConfig.allowCustomValuesForNoteAndReason;

                    self.saveEditing = self.initialConfig.saveEditing;

                    self.mmiSearchOpened = ko.observable( false );
                    self.hasHighlight = ko.observable( false );
                    self.hasDanger = ko.computed( function() {
                        return self.isValid();
                    } );

                    self.phIngr( (self.initialConfig.data.phIngr || []).map( function( phIngrData ) {
                        return new PhIngrViewModel( {data: phIngrData} );
                    } ) );

                    self.currentPatient = self.initialConfig.currentPatient;

                    self.locationId = ko.observable();
                    self.employeeId = ko.observable();

                    self._locationList = self.initialConfig._locationList;
                    self._employeeList = self.initialConfig._employeeList;

                    self.editMode = ko.observable( false );
                    self.editMode.dataBeforeEdit = null;

                    self.hasWrongPosition = ko.observable( false );
                    self.isDragging = ko.observable( false );
                    self.medicationSearchI18n = i18n( 'InCaseMojit.casefile_detail.button.OPEN_MEDICATION_SEARCH' );

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

                    self.addDisposable( ko.computed( function() {
                        if ( unwrap( self.editMode ) ) {
                            if( self.isNew() ) {
                                self.editModeOpenedCounter++;
                            }

                            /**
                             * In order for us to be able to restore the data in case the user canceled the editing
                             * when opening the editMode
                             * We need to have the current version of the data
                             * which is different then the initial data (DB data)
                             * As the user may have edited multiple times before saving.
                             */
                            self.editMode.dataBeforeEdit = self.toJSON();

                            /**
                             * This is important as the click handler listener
                             * needs to go to the end of the event loop,
                             * otherwise is going to be triggered by the recently clicked editButton
                             */
                            setTimeout(function () {
                                $(document).off(activeRowClickEvent).on(activeRowClickEvent, function (clickEvent) {
                                    var $DCWindows = $('.DCWindow:not(#addMedicationModal)');
                                    /**
                                     * If the Element clicked is outside the medicationPlanEntry row
                                     * excluding clicking in some DCWindow modal
                                     * it should set editMode to false
                                     */
                                    if (self.$row && !self.$row.is(clickEvent.target) && self.$row.has(clickEvent.target).length === 0 && $DCWindows.has(clickEvent.target).length === 0) {
                                        self.saveEditing(self);
                                    }
                                });

                                $(document).off(activeRowKeyDown).on(activeRowKeyDown, function (keypressEvent) {

                                    /**
                                     * When ESC key is clicked
                                     * it should set editMode to false
                                     */
                                    if (keypressEvent.which === 27) {
                                        self.saveEditing(self);
                                    }
                                });
                            }, 0);

                        } else {
                            self.editMode.dataBeforeEdit = null;

                            /**
                             * Remove the event listeners
                             */
                            $(document).off( activeRowClickEvent );
                            $(document).off( activeRowKeyDown );
                        }
                    } ) );

                    self.hasDanger = ko.computed( function() {
                        var hasWrongPosition = unwrap( self.hasWrongPosition ),
                            isValid = unwrap( self._isValid );
                        return hasWrongPosition || !isValid;
                    } );

                    self.phPZNReadOnly = ko.computed( function() {
                        return true;
                    } );

                    self.isModifiedObserver = new Y.doccirrus.utils.IsModifiedObserver( [
                        self.phNLabel,
                        self.phIngr,
                        self.phForm
                    ], {trackArrayPaths: ['name', 'strength']} );

                    self.isModifiedObserver.isModified.subscribe( function( isModified ) {
                        var pzn = peek( self.phPZN );
                        if( self.mmiSearchOpened() ) {
                            return;
                        }
                        if( isModified && pzn ) {
                            self.confirmPznDeletion().then( function( result ) {
                                var unModifiedData;

                                if( result.deletePZN ) {
                                    self.lastPZN = pzn;
                                    self.phPZN( '' );
                                } else if( result.resetChanges ) {
                                    unModifiedData = self.get( 'dataUnModified' );
                                    self.phNLabel( unModifiedData.phNLabel );
                                    self.phIngr( unModifiedData.phIngr.map( function( ingr ) {
                                        return new PhIngrViewModel( {data: ingr} );
                                    } ) );
                                    self.phForm( unModifiedData.phForm );
                                }
                            } );
                        } else if( !isModified && self.lastPZN ) {
                            self.phPZN( self.lastPZN );
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        self.phIngr();
                        self.phNLabel.validate();
                    } ) );

                    self.phNLabel.subscribe( function( value ) {
                        if( self.initialConfig.valuesChangedCallback ) {
                            self.initialConfig.valuesChangedCallback( {phNLabel: value}  );
                        }
                    } );

                    self.dosis.subscribe( function( value ) {
                        if( self.initialConfig.valuesChangedCallback && value === Y.doccirrus.schemas.activity.phDosisTypes.TEXT ) {
                            self.initialConfig.valuesChangedCallback( {dosis: value}  );
                        }
                    });

                    self.phDosisType.subscribe( function( value ) {
                        if( self.initialConfig.valuesChangedCallback &&  value === Y.doccirrus.schemas.activity.phDosisTypes.TEXT ) {
                            self.initialConfig.valuesChangedCallback( {dosis: unwrap(self.dosis)}  );
                        } else if(self.initialConfig.valuesChangedCallback &&  value === Y.doccirrus.schemas.activity.phDosisTypes.PAPER) {
                            self.initialConfig.valuesChangedCallback( {dosis: PAPER_DOSIS}  );
                        }
                    });

                    self.addDisposable( ko.computed( function() {
                        var
                            phDosisType = unwrap(self.phDosisType),
                            phDosisMorning = unwrap( self.phDosisMorning ),
                            phDosisAfternoon = unwrap( self.phDosisAfternoon ),
                            phDosisEvening = unwrap( self.phDosisEvening ),
                            phDosisNight = unwrap( self.phDosisNight );

                        if( !self.initialConfig.valuesChangedCallback ||
                            phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.TEXT ||
                            phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.PAPER ) {
                            return;
                        }

                        return self.initialConfig.valuesChangedCallback( {
                                schedule: [
                                    phDosisMorning,
                                    phDosisAfternoon,
                                    phDosisEvening,
                                    phDosisNight
                                ].join( "-" )
                            } );
                    }));


                    switch( type ) {
                        case 'SUB_HEADING':
                            self.initSubHeading();
                            break;
                        case 'MEDICATION':
                            self.initMedicationRow();
                            break;
                    }

                },
                confirmPznDeletion: function() {
                    return new Promise( function( resolve ) {
                        var modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-CardReadHistory',
                            bodyContent: i18n( 'InCaseMojit.KBVMedicationPlanEntryViewModel.text.CONFIRM_CHANGES_TO_DB_DATA' ),
                            title: i18n( 'DCWindow.confirm.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_QUESTION,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'btnPznConfirmDelete', {
                                        label: i18n( 'InCaseMojit.KBVMedicationPlanEntryViewModel.buttons.PZN_CONFIRM_DELETE' ),
                                        name: 'btnPznConfirmDelete',
                                        action: function() {
                                            resolve( {deletePZN: true} );
                                            modal.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'btnResetChange', {
                                        label: i18n( 'InCaseMojit.KBVMedicationPlanEntryViewModel.buttons.REST_CHANGES' ),
                                        name: 'btnResetChange',
                                        action: function() {
                                            resolve( {resetChanges: true} );
                                            modal.close();
                                        }
                                    } )
                                ]
                            }

                        } );
                    } );
                },
                isValid: function() {
                    var self = this,
                        hasWrongPosition = unwrap( self.hasWrongPosition ),
                        isValid = self._isValid();

                    return !hasWrongPosition && isValid;
                },
                initSubHeading: function() {
                    var self = this;
                    self.select2subHeadings = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.subHeadingText();
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.subHeadingText( $event.added.text );
                                    self.subHeadingCode( $event.added.system || null );
                                } else {
                                    self.subHeadingText( null );
                                    self.subHeadingCode( null );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowClear: true,
                            multiple: false,
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.fhir_codesystem.searchCodeSystems( {
                                    term: query.term,
                                    systems: ['74_CS_SFHIR_BMP_ZWISCHENUEBERSCHRIFT']
                                } ) ).then( function( response ) {
                                    query.callback( {results: (response.data || []).map( mapFhirCodeSystemResponseSelect2 )} );
                                } ).catch( function( err ) {
                                    Y.log( 'could not get specialities fhir_codesystems ' + err, 'warn', NAME );
                                } );
                            },
                            initSelection: function( element, callback ) {
                                callback( {
                                    id: self.subHeadingText(),
                                    text: self.subHeadingText()
                                } );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };
                },
                templateReady: function( data ) {
                    $(data).on('click', function( e ) {
                       e.stopPropagation();
                    });
                },
                rowReady: function(row) {
                    this.$row = $(row);
                },
                initMedicationRow: function() {
                    var self = this;

                    self.labelPhDosisI18n = i18n( 'InCaseMojit.casefile_detail.label.PH_DOSIS' );

                    self.searchButton = Y.doccirrus.MMISearchButton.create( {
                        onClick: function( focusInput ) {
                            self.openMedicationSearch( focusInput );
                        },
                        disabled: function() {
                            return !Boolean( unwrap( self._defaultMappings ) && Y.doccirrus.auth.hasAdditionalService( "inScribe" ) ) && !unwrap( self.phNLabel.readOnly ) || unwrap( self._isModelReadOnly );
                        }
                    } );

                    self.displayTimestamp = ko.computed( function() {
                        var
                            timestamp = unwrap( self.timestamp );

                        if( timestamp ) {
                            return moment( timestamp ).format( TIMESTAMP_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    self.displayPhIngr = ko.computed( function() {
                        var
                            phIngr = unwrap( self.phIngr );
                        return (phIngr || []).map( function( phIngrModel ) {
                            return unwrap( phIngrModel.name );
                        } ).filter( Boolean ).join( ', ' );
                    } );

                    self.displayStrength = ko.computed( function() {
                        var
                            phIngr = unwrap( self.phIngr ) || [];
                        return phIngr.map( function( phIngrModel ) {
                            return (unwrap( phIngrModel.strength ) || '').trim();
                        } ).filter( Boolean ).join( ', ' );
                    } );

                    self.phDosisTypes = Y.doccirrus.schemas.activity.types.PhDosisType_E.list;

                    self.showPhDosisSchedule = ko.computed( function() {
                        var
                            phDosisType = unwrap( self.phDosisType );
                        return phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.SCHEDULE;
                    } );
                    self.showPhDosisText = ko.computed( function() {
                        var
                            phDosisType = unwrap( self.phDosisType );
                        return phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.TEXT;
                    } );

                    self.displayDosis = ko.computed( function() {
                        var data = {
                            phDosisType: unwrap( self.phDosisType ),
                            dosis: unwrap( self.dosis ),
                            phDosisMorning: unwrap( self.phDosisMorning ),
                            phDosisAfternoon: unwrap( self.phDosisAfternoon ),
                            phDosisEvening: unwrap( self.phDosisEvening ),
                            phDosisNight: unwrap( self.phDosisNight )
                        };
                        return Y.doccirrus.schemas.activity.getMedicationDosis( data );
                    } );

                    self.select2Dosis = {
                        val: ko.computed( {
                            read: function() {
                                return self.dosis();
                            },
                            write: function( $event ) {
                                self.dosis( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.DOSIS' ),
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = {id: element.val(), text: element.val()};
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.DOSE,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: {title: 1}
                                    },
                                    fields: {title: 1}
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return {id: item.title, text: item.title};
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    self.select2PhNote = {
                        val: ko.computed( {
                            read: function() {
                                return self.phNote();
                            },
                            write: function( $event ) {
                                self.phNote( $event.val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = { id: element.val(), text: element.val() };
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: { title: 1 }
                                    },
                                    fields: { title: 1 }
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return { id: item.title, text: item.title };
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    self.select2PhReason = {
                        val: ko.computed( {
                            read: function() {
                                return self.phReason();
                            },
                            write: function( $event ) {
                                self.phReason( $event.val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = { id: element.val(), text: element.val() };
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: { title: 1 }
                                    },
                                    fields: { title: 1 }
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return { id: item.title, text: item.title };
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    if( self.allowCustomValuesForNoteAndReason ) {
                        self.select2PhNote.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };

                        self.select2PhReason.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };
                        self.select2Dosis.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };
                    }

                    self.select2phUnitCode = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.phUnit();
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.phUnit( $event.added.text );
                                    self.phDosisUnitCode( $event.added.system || null );
                                } else {
                                    self.phUnit( null );
                                    self.phDosisUnitCode( null );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowClear: true,
                            multiple: false,
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.fhir_codesystem.searchCodeSystems( {
                                    term: query.term,
                                    systems: ['74_CS_SFHIR_BMP_DOSIEREINHEIT']
                                } ) ).then( function( response ) {
                                    query.callback( {results: (response.data || []).map( mapFhirCodeSystemResponseSelect2 )} );
                                } ).catch( function( err ) {
                                    Y.log( 'could not get specialities fhir_codesystems ' + err, 'warn', NAME );
                                } );
                            },
                            initSelection: function( element, callback ) {
                                callback( {
                                    id: self.phDosisUnitCode() || self.phUnit(),
                                    text: self.phUnit()
                                } );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };

                    self.select2phForm = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.phForm();
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.phForm( $event.added.text );
                                    self.phFormCode( $event.added.system || null );
                                } else {
                                    self.phForm( null );
                                    self.phFormCode( null );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowClear: true,
                            multiple: false,
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.fhir_codesystem.searchCodeSystems( {
                                    term: query.term,
                                    systems: ['74_CS_SFHIR_BMP_DARREICHUNGSFORM']
                                } ) ).then( function( response ) {
                                    query.callback( {results: (response.data || []).map( mapFhirCodeSystemResponseSelect2 )} );
                                } ).catch( function( err ) {
                                    Y.log( 'could not get specialities fhir_codesystems ' + err, 'warn', NAME );
                                } );
                            },
                            initSelection: function( element, callback ) {
                                callback( {
                                    id: self.phFormCode() || self.phForm(),
                                    text: self.phForm()
                                } );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            },
                            formatResult: function( el ) {
                                return el.id + ' - ' + el.text;
                            }
                        }
                    };
                },
                addPhIngr: function() {
                    var self = this;
                    self.phIngr.push( new PhIngrViewModel( {data: {}} ) );
                },
                removePhIngr: function( data ) {
                    var self = this;
                    self.phIngr.remove( data );
                },
                openMedicationSearch: function( focusInput ) {
                    var self = this,
                        currentPatient = peek( self.currentPatient );
                    self.mmiSearchOpened( true );

                    Y.doccirrus.modals.medicationModal.showDialog( peek( self._defaultMappings ), {
                        activity: Object.assign( {}, self, {caseFolder: currentPatient && currentPatient.caseFolderCollection && currentPatient.caseFolderCollection.getActiveTab()} ),
                        patient: currentPatient,
                        focusInput: focusInput,
                        destroy: function() {
                            self.mmiSearchOpened( false );
                        }
                    }, function( err, selected ) {
                        if( err ) {
                            return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        }

                        var isOTC, patientAge, isOver12, isChild, phPatPay, phPatPayHint, mappedData, phPriceSale, phFixedPay, canBePatPayFree;

                        if( selected && selected.package && selected.package.originalData && selected.product &&
                            selected.product.originalData ) {

                            // adjust phPatPay and phPatPayHint
                            isOTC = selected.product.originalData.phOTC;
                            patientAge = currentPatient.age();
                            isOver12 = 12 < patientAge;
                            isChild = 18 >= patientAge;
                            phPatPay = selected.package.originalData.phPatPay;
                            phPatPayHint = selected.package.originalData.phPatPayHint;
                            phPriceSale = selected.package.originalData.phPriceSale;
                            phFixedPay = selected.package.originalData.phFixedPay;
                            canBePatPayFree = true;


                            // AVP must be less than FIXED less 30% to be free of payment
                            if( phPriceSale && phFixedPay && (phPriceSale > phFixedPay - (phFixedPay / 100 * 30)) ) {
                                canBePatPayFree = false;
                            }

                            if( canBePatPayFree && isOTC && isChild && isOver12 ) {
                                phPatPay = null;
                                phPatPayHint = null;
                            } else if( canBePatPayFree && isChild ) {
                                phPatPay = 0;
                                phPatPayHint = 'zuzahlungsfrei';
                            }

                            mappedData = {
                                code: '',
                                title: selected.product.originalData.title,
                                phTer: selected.product.originalData.phTer,
                                phTrans: selected.product.originalData.phTrans,
                                phImport: selected.product.originalData.phImport,
                                phNegative: selected.product.originalData.phNegative,
                                phLifeStyle: selected.product.originalData.phLifeStyle,
                                phLifeStyleCond: selected.product.originalData.phLifeStyleCond,
                                phGBA: selected.product.originalData.phGBA,
                                phGBATherapyHintName: selected.product.originalData.phGBATherapyHintName,
                                phDisAgr: selected.product.originalData.phDisAgr,
                                phDisAgrAlt: selected.product.originalData.phDisAgrAlt,
                                phMed: selected.product.originalData.phMed,
                                phPrescMed: selected.product.originalData.phPrescMed,
                                phCompany: selected.product.originalData.phCompany,
                                phOnly: selected.product.originalData.phOnly,
                                phRecipeOnly: selected.product.originalData.phRecipeOnly,
                                phBTM: selected.product.originalData.phBTM,
                                phContraceptive: selected.product.originalData.phContraceptive,
                                phOTC: selected.product.originalData.phOTC,
                                phOTX: selected.product.originalData.phOTX,
                                phAMR: selected.product.originalData.phAMR,
                                phAMRContent: selected.product.AMRInfo,
                                phAtc: selected.product.originalData.phAtc,
                                phIngr: selected.product.originalData.phIngr,
                                phForm: selected.product.originalData.phForm,
                                phFormCode: selected.package.originalData.phFormCode,

                                phPriceSale: selected.package.originalData.phPriceSale,
                                phRefundAmount: selected.package.originalData.phRefundAmount,
                                phPriceRecommended: selected.package.originalData.phPriceRecommended,
                                phPatPay: phPatPay,
                                phPatPayHint: phPatPayHint,
                                phFixedPay: selected.package.originalData.phFixedPay,
                                phCheaperPkg: selected.package.originalData.phCheaperPkg,

                                phNLabel: selected.package.originalData.phNLabel,

                                phPZN: selected.package.originalData.phPZN,
                                phSalesStatus: selected.package.originalData.phSalesStatus,
                                phNormSize: selected.package.originalData.phNormSize,
                                phPackSize: selected.package.originalData.phPackSize,
                                phPackQuantity: selected.package.originalData.phPackQuantity,
                                phARV: selected.package.originalData.phARV,
                                phARVContent: selected.package.originalData.phARVText
                            };

                            Object.keys( mappedData ).forEach( function( key ) {
                                if( ko.isObservable( self[key] ) ) {
                                    if( key === 'phIngr' ) {
                                        mappedData[key] = mappedData[key].map( function( phIngr ) {
                                            return new PhIngrViewModel( {data: phIngr} );
                                        } );
                                    }
                                    self[key]( mappedData[key] );
                                }
                            } );

                            self.set( 'dataUnModified', self.readBoilerplate() );
                            self.isModifiedObserver.setUnModified();
                        }
                    } );

                }
            }, {
                schemaName: 'v_kbvmedicationplan.medicationPlanEntries',
                NAME: 'KBVMedicationPlanEntryViewModel'
            }
        );
        KoViewModel.registerConstructor( KBVMedicationPlanEntryViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'KBVMedicationPlanModel',
            'PhIngrViewModel',
            'activity-schema',
            'dccommonutils',
            'v_medicationItem-schema',
            'dcutils'
        ]
    }
);
