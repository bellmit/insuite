/**
 * User: pi
 * Date: 24/11/16  14:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment, _, async */
/*eslint prefer-template:0, strict:0, no-eval: 0 */
/*jshint -W061 */
'use strict';

YUI.add( 'MedicationPlanPrescriptionsModal', function( Y, NAME ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            ignoreDependencies = ko.ignoreDependencies,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            lodash = _,
            PRINT_ACTIVITIES = i18n( 'TaskModel.text.PRINT_ACTIVITIES' ),
            YES = i18n( 'InCaseMojit.casefile_detail.checkbox.YES' ),
            NO = i18n( 'InCaseMojit.casefile_detail.checkbox.NO' ),
            SEE_ALL_INFOS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.button.see_all_infos' ),
            WRONG_COUNT_MESSAGE = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.wrongCount' ),
            DESCRIPTOR_MISSING = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.descriptorMissing' ),
            PRD_NO = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.prdNumber' ),
            GTIN = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.GTIN' ),
            PZN = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.PZN' ),
            PAPER_DOSIS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.text.PAPER_DOSIS' ),
            PAPER_DOSIS_LONG = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.text.PAPER_DOSIS_LONG' ),
            OP = i18n( 'InStockMojit.instock_schema.InStock_T.OP' ),
            TP = i18n( 'InStockMojit.instock_schema.InStock_T.TP' );

        /**
         * PrescriptionTableModel model
         * @constructor
         */
        function MedicationItemModel() {
            MedicationItemModel.superclass.constructor.apply( this, arguments );
        }

        function setBG( meta, str ) {
            if( meta.row && meta.row.patImportId ) {
                return '<span style="background-color: lightgrey;">' + str + '</span>';
            }
            return str;
        }

        Y.extend( MedicationItemModel, KoViewModel.getBase(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;

                self.initObservables();
                self.initMedicationTableModel();

            },
            /** @protected */
            destructor: function() {
            },
            initObservables: function() {
                var
                    self = this,
                    rebuildPrescriptionGroups = self.get( 'rebuildPrescriptionGroups' ),
                    currentPatientModel = self.get( 'currentPatient' ),
                    currentPatient = currentPatientModel.toJSON(),
                    caseFolder = self.get( 'caseFolder' );

                self.isSwissAndSwissCaseFolder = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() &&
                                                 Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type];
                self.hasInStock = Y.doccirrus.auth.hasAdditionalService( 'inStock' );
                self.descriptorMissingError = ko.observable();
                self.descriptorMissingType = ko.observable();

                self.count = ko.observable( self.get( 'count' ) );
                self.samePreSelectedMedications = [];
                self.stockLocationId = ko.observable( self.get( 'stockLocationId' ) );

                self.displayCount = ko.computed( {
                    read: function() {
                        var val = unwrap( self.count );
                        val = Y.doccirrus.comctl.numberToLocalString( val, {intWithoutDec: true} );
                        return val;
                    },
                    write: function( val ) {
                        val = Math.round( Y.doccirrus.comctl.localStringToNumber( val ) );
                        self.count( val );
                        if( 1 > val || !val ) {
                            val = 1;
                        }
                        self.count( val );
                    }
                } );

                self.displayCount.hasError = ko.computed( function() {
                    var count = unwrap( self.count );
                    self.displayCount.validationMessages = [WRONG_COUNT_MESSAGE.replace( '{min}', count )];
                    return count < unwrap( self.divisibleCount );
                } );


                self.prescriptionType = ko.observable( self.get( 'data.prescriptionType' ) );
                self.group = ko.observable();
                self.medicationPlanOrder = ko.observable( self.get( 'data.medicationPlanOrder' ) );
                self.group.readOnly = ko.observable( true );
                self.exactMedication = ko.observable( self.initialConfig.exactMedication );
                self.recommendationId = ko.observable();
                self.dispensing = ko.observable( self.get( 'dispensing' ) );
                self.previousPhNLabel = peek( self.phNLabel );

                if( unwrap( self.isDivisible ) || unwrap( self.isDivisible ) === false ) {
                    self.isDivisible.readOnly = true;
                }

                if( self.isSwissAndSwissCaseFolder ) {
                    self.addDisposable( ko.computed( function() {
                        var dispening = unwrap( self.dispensing );
                        rebuildPrescriptionGroups( dispening );
                    } ) );

                    self.addDisposable(
                        ko.computed( function() {
                            var isMedicationPlanActive = unwrap( self.get( 'isMedicationPlanActive' ) ),
                                dispensing = unwrap( self.dispensing ),
                                types = [],
                                descriptorMissingType = '';

                            if( (dispensing && (!unwrap( self.prdNo) || !unwrap( self.phPZN) || !unwrap( self.phGTIN) )) || (isMedicationPlanActive && !unwrap( self.prdNo)) ) {
                                // In Swiss we disable dispense and medication plan for medication if one of GTIN, PZN or product number are missing
                                self.descriptorMissingError( true );
                                if (!unwrap( self.prdNo)) {
                                    types.push(PRD_NO);
                                }
                                if (!unwrap( self.phPZN)) {
                                    types.push(PZN);
                                }
                                if (!unwrap( self.phGTIN)) {
                                    types.push(GTIN);
                                }
                                if( types.length > 0 ) {
                                    types.forEach( function( type, i ) {
                                        descriptorMissingType += type;
                                        if( i !== types.length - 1 ) {
                                            descriptorMissingType += ', ';
                                        }
                                    } );
                                }
                                self.descriptorMissingType( descriptorMissingType );
                            } else {
                                self.descriptorMissingError( false );
                            }
                        } )
                    );

                    self.phContinuousMedDateCopy = self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.phContinuousMedDate );
                        },
                        write: function( value ) {
                            if( !value ) {
                                self.phContinuousMedDate( " " );
                            }

                            self.phContinuousMedDate( value );
                        }
                    } ) );

                    self.phContinuousMedDate( null );
                }

                self.phContinuousMed( false );

                self.addDisposable( ko.computed( function() {
                    unwrap( self.prescriptionType );
                    if( !ko.computedContext.isInitial() ) {
                        self.checkPrescriptionType();
                        rebuildPrescriptionGroups();
                    }
                } ) );

                self.unfilteredMedications = ko.observableArray();
                Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                    query: {
                        isPrescribed: true,
                        actType: 'MEDICATION',
                        patientId: currentPatient && currentPatient._id,
                        status: {$nin: ['CANCELLED']}
                    },
                    sort: {timestamp: -1}
                } ) ).then( function( response ) {
                    self.unfilteredMedications( response && response.data );
                } ).catch( function( err ) {
                    Y.log( 'Error getting Medication for Patient: ' + (err.stack || err), 'warn', NAME );
                } );
            },
            checkPrescriptionType: function() {
                var self = this,
                    currentPatientModel = self.get( 'currentPatient' ),
                    currentPatient = currentPatientModel.toJSON(),
                    caseFolder = self.get( 'caseFolder' ),
                    insurance = Y.doccirrus.schemas.patient.getInsuranceByType( currentPatient, caseFolder.type ),
                    insuranceType = insurance && insurance.type,
                    actType = peek( self.prescriptionType ),
                    data, node, mappedData;

                data = Y.doccirrus.schemas.v_medication.getPrescriptionRecommendation( {
                    patientAge: currentPatientModel.age(),
                    medications: [self.toJSON()],
                    insuranceType: insuranceType
                } );

                node = Y.Node.create( '<div></div>' );

                if( data && data.recommendations && data.advice && -1 === data.recommendations.indexOf( actType ) ) {
                    mappedData = Y.doccirrus.commonutils.mapPrescRecommendations( data, actType );
                    if( self.recommendationId.peek() === mappedData.id ) {
                        return;
                    }
                    self.recommendationId( mappedData.id );
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'recommendedprescription_modal',
                        'TestingMojit',
                        mappedData,
                        node,
                        function() {
                            Y.doccirrus.DCWindow.notice( {
                                title: 'Bitte überprüfen Sie die Formularauswahl!',
                                type: 'info',
                                window: {
                                    width: 'xlarge',
                                    maximizable: true,
                                    buttons: {
                                        header: ['close', 'maximize'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                label: 'Bestätigen',
                                                action: function() {
                                                    this.close();
                                                }
                                            } )
                                        ]
                                    }

                                },
                                message: node
                            } );

                        }
                    );
                }

            },
            calcucalateCountForContinuousMed: function MedicationTableModel_calcucalateCountForContinuousMed() {
                var self = this,
                    duration,
                    days,
                    dosisCount,
                    packSize = unwrap( self.phPackSize ) || 1;
                if( !unwrap( self.phContinuousMed ) ) {
                    return;
                }

                var date = moment( unwrap( self.phContinuousMedDate ) );
                if( date.isValid() ) {
                    duration = moment.duration( date.diff( moment() ) );
                    days = Math.ceil( duration.asDays() );
                    dosisCount = Number( unwrap( self.phDosisMorning ) ) + Number( unwrap( self.phDosisAfternoon ) ) + Number( unwrap( self.phDosisEvening ) ) + Number( unwrap( self.phDosisNight ) );
                    if( isNaN( dosisCount ) ) {
                        return;
                    }

                    if( self.dispensing() ) {
                        if( self.count ) {
                            if( self.isDivisible && self.isDivisible() ) {
                                self.count( dosisCount * days );
                            } else {
                                self.count( Math.ceil( days / (packSize / dosisCount) ) );
                            }
                        }
                    } else {
                        if( self.count ) {
                            self.count( 1 );
                        }
                    }
                }
            },
            initMedicationTableModel: function MedicationTableModel_initMedicationTableModel() {
                var self = this,
                    rebuildPrescriptionGroups = self.get( 'rebuildPrescriptionGroups' );
                self.displayDosis = ko.computed( {
                    read: function() {
                        var phDosisType = unwrap( self.phDosisType );
                        var data = {
                            phDosisType: unwrap( self.phDosisType ),
                            dosis: unwrap( self.dosis ),
                            phDosisMorning: unwrap( self.phDosisMorning ),
                            phDosisAfternoon: unwrap( self.phDosisAfternoon ),
                            phDosisEvening: unwrap( self.phDosisEvening ),
                            phDosisNight: unwrap( self.phDosisNight )
                        };

                        if( phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.PAPER ) {
                            return PAPER_DOSIS;
                        }
                        if( !phDosisType ) {
                            return '';
                        }

                        return Y.doccirrus.schemas.activity.getMedicationDosis( data );
                    },
                    write: function( value ) {
                        var
                            _value = value.trim(),
                            regExp = /^(\d*)-(\d*)-(\d*)-(\d*)$/;
                        ignoreDependencies( function() {
                            var
                                phDosisType = peek( self.phDosisType ),
                                matches = regExp.exec( _value );
                            if( _value === PAPER_DOSIS ) {
                                self.phDosisType( Y.doccirrus.schemas.activity.phDosisTypes.PAPER );
                                return;
                            }
                            if( Y.doccirrus.schemas.activity.phDosisTypes.SCHEDULE === phDosisType && matches ) {
                                self.phDosisMorning( matches[1] );
                                self.phDosisAfternoon( matches[2] );
                                self.phDosisEvening( matches[3] );
                                self.phDosisNight( matches[4] );
                                self.dosis( _value );

                                if( self.phContinuousMed && self.isSwissAndSwissCaseFolder ) {
                                    self.calcucalateCountForContinuousMed();
                                }
                            } else {
                                self.phDosisType( Y.doccirrus.schemas.activity.phDosisTypes.TEXT );
                                self.dosis( _value );
                            }
                        } );
                    }
                } );
                self.displayRange = ko.computed( {
                    read: function() {
                        if( unwrap( self.phDosisType ) === Y.doccirrus.schemas.activity.phDosisTypes.PAPER ) {
                            return '';
                        }
                        let phPackSize = unwrap( self.phPackSize );
                        if( self.isSwissAndSwissCaseFolder ) {
                            phPackSize = unwrap( self.phPackSize ) + " " + unwrap( self.phUnit );
                        }
                        return Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                            count: unwrap( self.count ),
                            filter: unwrap( self.phPZN ),
                            medication: {
                                dosis: unwrap( self.dosis ),
                                phDosisMorning: unwrap( self.phDosisMorning ),
                                phDosisAfternoon: unwrap( self.phDosisAfternoon ),
                                phDosisEvening: unwrap( self.phDosisEvening ),
                                phDosisNight: unwrap( self.phDosisNight ),
                                phDosisType: unwrap( self.phDosisType ),
                                phPackSize: phPackSize,
                                phPackQuantity: unwrap( self.phPackQuantity ),
                                timestamp: unwrap( self.timestamp ),
                                phNLabel: unwrap( self.phNLabel )
                            },
                            unfilteredMedications: unwrap( self.unfilteredMedications )
                        } );
                    }
                } );
                self.displayDosis.hasWarn = ko.observable( false );
                self.displayDosis.readOnly = self.dosis.readOnly;
                self.addDisposable( ko.computed( function() {
                    var
                        displayDosis = unwrap( self.displayDosis );
                    self.displayDosis.hasWarn( displayDosis && 45 < displayDosis.length );
                } ) );
                self.phNote.hasWarn = ko.observable( false );
                self.addDisposable( ko.computed( function() {
                    var
                        phNote = unwrap( self.phNote );
                    self.phNote.hasWarn( phNote && 45 < phNote.length );
                } ) );
                self.phReason.hasWarn = ko.observable( false );
                self.addDisposable( ko.computed( function() {
                    var
                        phReason = unwrap( self.phReason );
                    self.phReason.hasWarn( phReason && 45 < phReason.length );
                } ) );
                self.phUnit.hasWarn = ko.observable( false );
                self.addDisposable( ko.computed( function() {
                    var
                        phUnit = unwrap( self.phUnit );
                    self.phUnit.hasWarn( phUnit && 45 < phUnit.length );
                } ) );

                if( self.isSwissAndSwissCaseFolder ) {
                    self.addDisposable( ko.computed( function() {
                        var
                            phContinuousMed = unwrap( self.phContinuousMed );

                        if( !phContinuousMed ) {
                            self.prescriptionType( 'PRIVPRESCR' );
                        } else {
                            self.prescriptionType( 'LONGPRESCR' );

                        }
                        rebuildPrescriptionGroups();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        unwrap( self.phContinuousMedDate );
                        unwrap( self.dispensing );
                        self.calcucalateCountForContinuousMed();
                    } ) );
                }

                self.displayStrength = ko.computed( {
                    read: function() {
                        var
                            phIngr = unwrap( self.phIngr ) || [],
                            strength = unwrap( phIngr[0] && phIngr[0].strength );
                        return strength;
                    },
                    write: function( value ) {
                        var
                            phIngr = peek( self.phIngr );
                        if( phIngr[0] ) {
                            phIngr[0].strength( value );
                        } else {
                            self.phIngr.push( {strength: value} );
                        }
                    }
                } );
                self.displayPhIngr = ko.computed( {
                    read: function() {
                        var
                            phIngr = unwrap( self.phIngr );
                        return phIngr[0];
                    },
                    write: function( value ) {
                        var
                            phIngr = peek( self.phIngr ),
                            code = value && value.code,
                            name = value && value.name;
                        if( phIngr[0] ) {
                            phIngr[0].name( name );
                            phIngr[0].code( code );
                        } else if( value ) {
                            self.phIngr.push( {name: name, code: code} );
                        }
                    }
                } );
            },
            toJSON: function() {
                var
                    self = this,
                    result = MedicationItemModel.superclass.toJSON.apply( this, arguments );
                result.medicationPlanOrder = peek( self.medicationPlanOrder );
                result.prescriptionType = peek( self.prescriptionType );
                result.group = peek( self.group );
                result.count = peek( self.count );
                result.exactMedication = peek( self.exactMedication );
                return result;
            }
        }, {
            schemaName: 'v_medication',
            NAME: 'MedicationItemModel',
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                rebuildPrescriptionGroups: {
                    valueFn: function() {
                    },
                    lazyAdd: false
                },
                currentPatient: {
                    value: null,
                    lazyAdd: false
                },
                caseFolder: {
                    value: null,
                    lazyAdd: false
                },
                count: {
                    value: 1,
                    lazyAdd: false
                },
                dispensing: {
                    value: false,
                    lazyAdd: false
                },
                stockLocationId: {
                    value: false,
                    lazyAdd: false
                },
                isMedicationPlanActive: {
                    value: false,
                    lazyAdd: false
                }
            }
        } );    //  end MedicationItemModel

        /**
         * AddMedicationModel model
         * @constructor
         */
        function ViewModel() {
            ViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( ViewModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initViewModel();

            },
            /** @protected */
            destructor: function() {
                var
                    self = this;
                self.medicationMap.clear();
            },
            /** @protected */
            initViewModel: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                    //  May be documenting for another doctor, MOJ-10029, MOJ-10326
                    localValueSelectedDoctorParts = (Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) || '').split( '-' ),

                    initialLocationId = localValueSelectedDoctorParts[1] || self.get( 'locationId' ),
                    initialEmployeeId = localValueSelectedDoctorParts[0] || self.get( 'employeeId' );
                self.activeRow = ko.observable();
                self.seeAllInfosI18n = SEE_ALL_INFOS;
                self.swissCaseFolder = self.get( 'swissCaseFolder' );
                self.swissPreselectedMedications = self.get( 'swissPreselectedMedications' );
                self.swissMedPlans = self.get( 'swissMedPlans' );
                self.swissMedications = self.get( 'swissMedications' );
                self.swissMedicationPlan = self.get( 'swissMedicationPlan' );
                self.editPrescriptionMode = self.get( 'editPrescriptionMode' );
                self.isSwissAndSwissCaseFolder = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && self.swissCaseFolder;
                self.hasInStock = Y.doccirrus.auth.hasAdditionalService( 'inStock' );
                self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
                self.medData = ko.observableArray();

                self.allowCustomValuesForNoteAndReason = Y.doccirrus.auth.isAdmin() ||
                                                         !incaseconfiguration.allowCustomValueFor ||
                                                         -1 !== incaseconfiguration.allowCustomValueFor.indexOf( 'PRESCRIPTION' );

                // boot up locations immediately
                self.locationId = ko.observable( initialLocationId );
                self.locationId.hasError = ko.computed( function() {
                    return !unwrap( self.locationId );
                } );

                self.printActivities = [];
                self.presettings = new Y.doccirrus.ProfileManagementViewModel.create( {fromProfile: true} );

                self.employeeId = ko.observable( initialEmployeeId );
                self.employeeId.hasError = ko.computed( function() {
                    return !unwrap( self.employeeId );
                } );

                self.catalogUsageKoTable = null;
                self.inStockTable = null;

                self.medicationMap = new Map();
                self.inStockMedicationMap = new Map();
                self.initPrescriptionGroups();
                self.initTableTabs();
                self.initTitles();
                self.initCatalogTable();
                self.initPatientMedicationKoTable();
                self.initPrescriptionTable();
                self.initMedicationPlanTable();
                self.initObservables();

                self.initFormId();
                self.initButtons();
                self.initSelect2();
                self.preSelectMedications();
                self.cleanActiveRow = self.cleanActiveRow.bind( self );
            },
            updateLocalStoragePrinters: function( activities ) {
                var self = this,
                    localStorageDefaultValue = Y.doccirrus.utils.localValueGet( 'defaultPrinter' ),
                    localStorageDefaultPrinter,
                    localStorageValue = Y.doccirrus.utils.localValueGet( 'printers' ),
                    localStoragePrinters,
                    localStorageLastPrintedLocation = Y.doccirrus.utils.localValueGet( 'lastPrintedLocation' ),
                    localStorageLastPrintedLocationValue,
                    postData;

                if( localStorageValue ) {
                    try {
                        localStoragePrinters = JSON.parse( localStorageValue );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                }

                if( localStorageDefaultValue ) {
                    try {
                        localStorageDefaultPrinter = JSON.parse( localStorageDefaultValue );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage default printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                } else {
                    localStorageDefaultPrinter = {};
                }
                if( localStorageLastPrintedLocation ) {
                    try {
                        localStorageLastPrintedLocationValue = JSON.parse( localStorageLastPrintedLocation );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage printed locations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                } else {
                    localStorageLastPrintedLocationValue = {};
                }

                if( localStoragePrinters ) {
                    Y.doccirrus.jsonrpc.api.printer
                        .getPrinter()
                        .done( function( response ) {
                            onPrintersLoaded( response );
                        } )
                        .fail( function( error ) {
                            Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'debug', NAME );
                        } );
                }

                function onPrintersLoaded( printers ) {
                    Y.doccirrus.utils.localValueSet( 'printers', JSON.stringify( printers.data ? printers.data : printers ) );
                }

                if( activities && activities.length ) {
                    activities.forEach( function( item ) {
                        var locationId = item.location,
                            formId,
                            printerName = item.printerName,
                            formRoleKey,
                            caseFolder = self.get( 'caseFolder' );

                        formRoleKey = Y.doccirrus.getFormRole( item.activityType, caseFolder.type );

                        Y.dcforms.getConfigVar( '', formRoleKey, false, onLookupCanonical );

                        function onLookupCanonical( err, configVal ) {
                            if( err ) {
                                Y.log( 'Problem getting formId: ' + JSON.stringify( err ), 'warn', NAME );
                            }
                            formId = configVal;
                        }

                        if( formId ) {
                            //set default printer
                            if( !localStorageDefaultPrinter[locationId] ) {
                                localStorageDefaultPrinter[locationId] = {};
                            }
                            if( !localStorageDefaultPrinter[locationId][formId] ) {
                                localStorageDefaultPrinter[locationId][formId] = {};
                            }
                            localStorageDefaultPrinter[locationId][formId].printerName = printerName;

                            //set last print location
                            localStorageLastPrintedLocationValue[formId] = locationId;
                        }
                    } );

                    // updating data in localstorage
                    Y.doccirrus.utils.localValueSet( 'defaultPrinter', JSON.stringify( localStorageDefaultPrinter ) );
                    Y.doccirrus.utils.localValueSet( 'lastPrintedLocation', JSON.stringify( localStorageLastPrintedLocationValue ) );
                    if( self.presettings.activeProfileId() ) {
                        postData = {
                            defaultPrinter: localStorageDefaultPrinter,
                            lastLocation: localStorageLastPrintedLocationValue
                        };
                        Y.doccirrus.jsonrpc.api.profile.updateDefaultPrinter( {
                            query: {_id: self.presettings.activeProfileId()},
                            data: postData
                        } ).done( function() {
                            Y.log( 'default printer changed: ' + self.formId(), 'debug', NAME );
                        } ).fail( function( error ) {
                            Y.log( 'default printer not changed: ' + self.formId() + " " + error, 'debug', NAME );
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                    }
                }
            },
            preSelectMedications: function() {
                var
                    self = this,
                    preSelectedMedications = this.get( 'preselectedMedications' );

                if( !self.editPrescriptionMode ) {
                    preSelectedMedications.sort( function( a, b ) {
                        var
                            aDate = moment( a.timestamp ),
                            bDate = moment( b.timestamp );
                        if( aDate.isSame( bDate, 'day' ) ) {
                            return a.timestamp > b.timestamp ? -1 : 1;
                        }
                        return aDate.isAfter( bDate ) ? -1 : 1;

                    } );
                }

                return Promise.each( preSelectedMedications, function( item ) {
                    item.preSelected = true;
                    return self.addMedication( item );
                } );
            },
            cleanActiveRow: function() {
                this.activeRow( null );
            },
            selectedLocation: null,
            getMedicationDescription: function( medicationModel ) {
                var
                    blackList = [
                        'phPZN',
                        'phNLabel',
                        'phDosisType',
                        'dosis',
                        'phDosisMorning',
                        'phDosisAfternoon',
                        'phDosisEvening',
                        'phDosisNight',
                        'phAMR',
                        'phARV',
                        'phGBATherapyHintName',
                        'isArrived',
                        'oderId',
                        'phDescription',
                        'prdNo',
                        'phGTIN',
                        'isDispensed',
                        'isPrescribed',
                        'phHeader',
                        'phSampleMed',
                        'phPackQuantity'
                    ],
                    dosis,
                    phGBATherapyHintName = peek( medicationModel.phGBATherapyHintName ),
                    result = Object.keys( Y.doccirrus.schemas.activity.types.Medication_T )
                        .filter( function( item ) {
                            var
                                value = unwrap( medicationModel[item] );

                            return (Array.isArray( value ) ? Boolean( value.length ) : Boolean( value )) && -1 === blackList.indexOf( item );
                        } )
                        .map( function( item ) {
                            var
                                schemaField = Y.doccirrus.schemas.activity.types.Medication_T[item],
                                value = unwrap( medicationModel[item] ) || '';
                            if( 'boolean' === typeof value ) {
                                if( 'phGBA' === item && phGBATherapyHintName ) {
                                    return ['<a href="mmi-download/TH/', phGBATherapyHintName, '" target="_blank">', schemaField.i18n, '</a>'].join( '' );
                                }
                                return '<strong>' + schemaField.i18n + '</strong>';
                            }
                            if( 'number' === typeof value ) {
                                if( value === -1 ) {
                                    return;
                                }
                                return '<strong>' + schemaField.i18n + ': </strong>' + Y.doccirrus.comctl.numberToLocalString( value );
                            }
                            if( 'phIngr' === item ) {
                                return '<strong>' + schemaField.i18n + ': </strong>' + value.map( function( ingredient ) {
                                    var
                                        strength = unwrap( ingredient.strength );
                                    return unwrap( ingredient.name ) + (strength ? ' - ' + strength : '');
                                } ).join( ', ' );
                            }
                            if( 'phARVContent' === item ) {
                                return '<strong>' + schemaField.i18n + ': <strong>' + value.map( function( arvContent ) {
                                    var
                                        title = unwrap( arvContent.title ),
                                        hint = unwrap( arvContent.hint ),
                                        datesInfo = unwrap( arvContent.datesInfo );
                                    return [title, hint, datesInfo].filter( Boolean ).join( '; ' );
                                } ).join( ', ' );
                            }
                            if( 'phAMRContent' === item ) {
                                return '<strong>' + schemaField.i18n + ': </strong>' + value.map( function( amrContent ) {
                                    var
                                        title = unwrap( amrContent.title ),
                                        fileName = unwrap( amrContent.fileName ),
                                        regulationTypeCode = unwrap( amrContent.regulationTypeCode ),
                                        text = unwrap( amrContent.text ),
                                        limitation = unwrap( amrContent.limitation ),
                                        content = [regulationTypeCode, title, text, limitation].filter( Boolean ).join( '; ' );
                                    if( fileName && regulationTypeCode ) {
                                        content = ['<a href="mmi-download/REG', regulationTypeCode, '/', fileName, '" target="_blank">', content, '</a>'].join( '' );
                                    }
                                    return content;
                                } ).join( ', ' );
                            }

                            if( 'phSalesStatus' === item ) {
                                value = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', value, Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list, '' );
                            }

                            if( 'phNormSize' === item ) {
                                value = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', value, Y.doccirrus.schemas.activity.types.PhNormSize_E.list, '-' );
                            }

                            return '<strong>' + schemaField.i18n + ': </strong>' + value;
                        } ).filter( Boolean );
                dosis = Y.doccirrus.schemas.activity.types.Medication_T.dosis.i18n + ': ' + Y.doccirrus.schemas.activity.getMedicationDosis( {
                    phDosisType: unwrap( medicationModel.phDosisType ),
                    dosis: unwrap( medicationModel.dosis ),
                    phDosisMorning: unwrap( medicationModel.phDosisMorning ),
                    phDosisAfternoon: unwrap( medicationModel.phDosisAfternoon ),
                    phDosisEvening: unwrap( medicationModel.phDosisEvening ),
                    phDosisNight: unwrap( medicationModel.phDosisNight )
                } );
                result.push( dosis );

                return [unwrap( medicationModel.phPZN ), unwrap( medicationModel.phNLabel )].filter( Boolean ).join( ': ' ) +
                       '<br><ul>' +
                       result.map( function( entry ) {
                           return ('<li>' + entry + '</li>');
                       } ).join( '' ) + '</ul>';
            },
            updateTabHeader: function() {
                var
                    self = this,
                    activeTab = peek( self.activeTab ),
                    preselectedPrescription = peek( self.get( 'preselectedPrescription' ) ),
                    result = '',
                    prescriptionType;
                if( activeTab === self.PRESCRIPTION_TAB ) {
                    result = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_tab_header', {data: {amount: self.prescriptionGoupCounter}} );
                }

                if( self.editPrescriptionMode ) {
                    prescriptionType = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', preselectedPrescription.actType, 'i18n', '' );
                    result = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_tab_header_edit', {data: {prescriptionType: prescriptionType}} );
                }

                //prescription_tab_header_edit
                self.tabHeader( result );
            },
            initObservables: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    initialLocationId = unwrap( self.locationId ) || self.get( 'locationId' ),
                    locations = binder.getInitialData( 'location' ),
                    caseFolder = self.get( 'caseFolder' ),
                    isAMTSFolder = (caseFolder && Y.doccirrus.schemas.casefolder.isAMTS( caseFolder )),
                    createDispensingPrev,
                    selectDispensingPrev;

                self.defaultDestination = { //Swiss
                    abgabe: 'A',
                    prescription: 'P'
                };
                self.tabHeader = ko.observable();
                self.addDisposable( ko.computed( function() {
                    unwrap( self.activeTab );
                    self.updateTabHeader();
                } ) );
                self.timestamp = ko.observable( moment().toISOString() );
                if( initialLocationId ) {
                    self.onLocationChange( _.find( locations, {_id: initialLocationId} ) );
                }

                self.isValid = ko.observable();

                // AMTS casefolders require NO pre-selected prescriptions, all others have that preselected
                self.savePrescriptionCkb = ko.observable( !isAMTSFolder );
                self.savePrescriptionCkb.i18n = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_tab' );
                self.saveMedicationPlanCkb = ko.observable( false );
                self.saveMedicationPlanCkb.i18n = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.medication_plan_tab' );

                if( self.isSwissAndSwissCaseFolder ) {
                    self.createDispensing = ko.observable( false );
                    self.selectDispensing = ko.observable( false );
                    self.createDispensing.i18n = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.dispense' );

                    createDispensingPrev = unwrap( self.createDispensing );
                    selectDispensingPrev = unwrap( self.selectDispensing );
                    self.addDisposable( ko.computed( function() {
                        var createDispensing = unwrap( self.createDispensing );
                        var selectDispensing = unwrap( self.selectDispensing );

                        if( selectDispensing !== selectDispensingPrev ) {
                            self.createDispensing( selectDispensing );
                            createDispensingPrev = selectDispensing;
                            selectDispensingPrev = selectDispensing;
                        } else {
                            if( createDispensing !== createDispensingPrev ) {
                                self.selectDispensing( createDispensing );
                                createDispensingPrev = createDispensing;
                                selectDispensingPrev = createDispensing;
                                unwrap( self.prescriptionTable.rows ).forEach( function( row ) {
                                    row.dispensing( createDispensing );
                                } );
                            }
                        }
                    } ) );
                }

                self.addDisposable( ko.computed( function() {
                    var
                        prescriptionTableRows = unwrap( self.prescriptionTable.rows ),
                        prescriptionTableIsValid = prescriptionTableRows.length && prescriptionTableRows.every( function( rowModel ) {
                            return rowModel._isValid();
                        } ),
                        descriptorsMissing = prescriptionTableRows.length && prescriptionTableRows.find( function( rowModel ) {
                            // In Swiss we invalidate dispense and medication plan of medication if GTIN, PZN or product number are missing
                            // We dont use schema validations, because medication should still be valid for prescription
                            return unwrap(rowModel.descriptorMissingError);
                        } ),
                        medicationPlanViewModelIsValid = !self.isSwissAndSwissCaseFolder && self.medicationPlanViewModel.isValid(),
                        substitutePrescriptionIsValid = self.prescriptionData && self.prescriptionData.every( function( prescData ) {
                            return prescData.fields.every( function( field ) {
                                return !field || !field.hasError();
                            } );
                        } );

                    if( self.isSwissAndSwissCaseFolder ) {
                        self.isValid( prescriptionTableIsValid && !descriptorsMissing );
                    } else {
                        self.isValid( substitutePrescriptionIsValid && prescriptionTableIsValid && medicationPlanViewModelIsValid );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        employeeId = unwrap( self.employeeId ),
                        rows = peek( self.prescriptionTable.rows );
                    rows.forEach( function( model ) {
                        model.employeeId( employeeId );
                    } );
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        locationId = unwrap( self.locationId ),
                        rows = peek( self.prescriptionTable.rows );
                    rows.forEach( function( model ) {
                        model.locationId( locationId );
                    } );
                } ) );

                self.selectedMedicationText = ko.computed( function() {
                    var
                        rows = unwrap( self.prescriptionTable.rows ),
                        results = '',
                        activeRow = unwrap( self.activeRow );
                    if( activeRow ) {
                        return self.getMedicationDescription( activeRow );
                    }
                    rows.forEach( function( model ) {
                        results += self.getMedicationDescription( model );
                        results += '\n';

                    } );
                    return results;
                } );
                self.addDisposable( ko.computed( function() {
                    var
                        activeRow = unwrap( self.prescriptionTable.activeRow );

                    if( activeRow ) {
                        self.activeRow( activeRow );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    if( self.isSwissAndSwissCaseFolder ) {
                        return;
                    }
                    var

                        activeRow = unwrap( self.medicationPlanViewModel.activeRow );

                    if( activeRow ) {
                        self.activeRow( activeRow );
                    }
                } ) );

                self.prescriptionData = self.isSwissAndSwissCaseFolder ? [self.getPrescriptionDataModel( 'PRIVPRESCR' ), self.getPrescriptionDataModel( 'LONGPRESCR' )] : [
                    self.getPrescriptionDataModel( 'PUBPRESCR' ),
                    self.getPrescriptionDataModel( 'PRIVPRESCR' ),
                    self.getPrescriptionDataModel( 'PRESCRBTM' ),
                    self.getPrescriptionDataModel( 'PRESCRT' )
                ];
            },
            rerenderLegend: function( type ) {
                var
                    self = this;
                self.prescriptionData.some( function( model ) {
                    if( Object.keys( self.prescriptionGoups[model.type] ).length ) {
                        model.visible( true );
                    } else {
                        model.visible( false );
                    }
                    if( type === model.type ) {
                        return true;
                    }
                    return false;
                } );
            },
            getPrescriptionDataModel: function( type ) {
                var
                    self = this,
                    model = {
                        visible: ko.observable( false ),
                        text: '"' + i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescriptions.' + type ) + '" - ' + Y.doccirrus.schemaloader.translateEnumValue( 'i18n', type, Y.doccirrus.schemas.activity.types.Activity_E.list, type ),
                        type: type
                    },
                    currentPatient = self.get( 'currentPatient' ).toJSON(),
                    caseFolder = self.get( 'caseFolder' ),
                    insurance = Y.doccirrus.schemas.patient.getInsuranceByType( currentPatient, caseFolder.type ),
                    insuranceType = insurance && insurance.type,
                    insuranceGrpId = insurance && insurance.insuranceGrpId,
                    patientDob = currentPatient.dob,
                    defaultHasError = ko.observable( false ),
                    preselectedPrescription = peek( self.get( 'preselectedPrescription' ) ),
                    defaultValidationMessages = ko.observableArray();

                function validateSubstitutePrescription() {
                    var hasPublicPrescWithMoreThenOneMedication = false;
                    self.prescriptionTable.rows();
                    Object.keys( self.prescriptionGoups[type] ).forEach( function( key ) {
                        hasPublicPrescWithMoreThenOneMedication = hasPublicPrescWithMoreThenOneMedication || self.prescriptionGoups[type][key].length > 1;
                    } );
                    if( self.substitutePrescription() && hasPublicPrescWithMoreThenOneMedication ) {
                        return true;
                    }
                    return false;
                }

                function setDefaultValueFromPreSelectedPrescription( config ) {
                    if( preselectedPrescription && preselectedPrescription[config.key] ) {
                        config.value( preselectedPrescription[config.key] );
                    }
                    return config;
                }

                self.paid = ko.observable();
                self.paidFree = ko.observable();
                self.workAccident = ko.observable();
                self.substitutePrescription = self.substitutePrescription || ko.observable( false );

                self.addDisposable( ko.computed( function() {
                    var
                        timestamp = unwrap( self.timestamp ),
                        paidFree = insurance && insurance.paidFree || false,
                        paidFreeTo = insurance && insurance.paidFreeTo,
                        paid,
                        isPublicAndPaidFree = 'PUBLIC' === insuranceType && Y.doccirrus.kbvcommonutils.isMax18InCurrentQuarter( patientDob ) && insuranceGrpId && 800 > Number( insuranceGrpId.substring( 2, 5 ) ),
                        isBG = insuranceType === 'BG';
                    if( isPublicAndPaidFree || isBG ) {
                        paidFree = true;
                        paid = false;
                    } else if( paidFree && paidFreeTo ) {
                        paidFreeTo = moment( paidFreeTo );
                        if( paidFreeTo.isValid() && moment( timestamp ).isAfter( paidFreeTo ) ) {
                            paidFree = false;
                            paid = true;
                        }
                    } else {
                        paid = !paidFree;
                    }
                    self.paidFree( paidFree );
                    self.paid( paid );
                    self.workAccident( isBG );

                } ) );

                switch( type ) {
                    case 'PUBPRESCR':
                        model.fields = [
                            {
                                key: 'paidFree',
                                value: self.paidFree,
                                i18n: Y.dcforms.schema.InCase_T.paidFree.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'paid',
                                value: self.paid,
                                i18n: Y.dcforms.schema.InCase_T.paid.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'nightTime',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.nightTime.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'otherInsurance',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.otherInsurance.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'utUnfall',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.utUnfall.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'workAccident',
                                value: self.workAccident,
                                i18n: Y.dcforms.schema.InCase_T.workAccident.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'isPatientBVG',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.isPatientBVG.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'assistive',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.assistive.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'vaccination',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.vaccination.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'practiceAssistive',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.practiceAssistive.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'dentist',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.dentist.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'substitutePrescription',
                                value: self.substitutePrescription,
                                i18n: i18n( 'activity-schema.Prescription_T.substitutePrescription.i18n' ),
                                hasError: ko.computed( validateSubstitutePrescription ),
                                validationMessages: [i18n( 'validations.kbv.message.PRESCRIPTION_T_SUBSTITUTEPRESCRIPTION_ERR' )]
                            }

                        ].map( setDefaultValueFromPreSelectedPrescription );
                        break;
                    case 'PRIVPRESCR':
                    case 'LONGPRESCR':
                        model.fields = [
                            {
                                key: 'utUnfall',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.utUnfall.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            }

                        ].map( setDefaultValueFromPreSelectedPrescription );
                        break;
                    case 'PRESCRBTM':
                        model.fields = [
                            {
                                key: 'paidFree',
                                value: self.paidFree,
                                i18n: Y.dcforms.schema.InCase_T.paidFree.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'paid',
                                value: self.paid,
                                i18n: Y.dcforms.schema.InCase_T.paid.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'nightTime',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.nightTime.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'employeeSpecialities',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.employeeSpecialities.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'fk4202',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.fk4202.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'workAccident',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.workAccident.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'isPatientBVG',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.isPatientBVG.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'practiceAssistive',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.practiceAssistive.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'dentist',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.dentist.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'substitutePrescription',
                                value: self.substitutePrescription,
                                i18n: i18n( 'activity-schema.Prescription_T.substitutePrescription.i18n' ),
                                hasError: ko.computed( validateSubstitutePrescription ),
                                validationMessages: [i18n( 'activity-schema.Prescription_T.substitutePrescription.i18n' )]
                            }

                        ].map( setDefaultValueFromPreSelectedPrescription );
                        break;
                    case 'PRESCRT':
                        model.fields = [
                            {
                                key: 'paidFree',
                                value: self.paidFree,
                                i18n: Y.dcforms.schema.InCase_T.paidFree.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'paid',
                                value: self.paid,
                                i18n: Y.dcforms.schema.InCase_T.paid.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'nightTime',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.nightTime.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'otherInsurance',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.otherInsurance.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'isPatientBVG',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.isPatientBVG.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'correctUsage',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.correctUsage.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'patientInformed',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.patientInformed.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'inLabel',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.inLabel.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'offLabel',
                                value: ko.observable( false ),
                                i18n: Y.dcforms.schema.InCase_T.offLabel.label.de,
                                hasError: defaultHasError,
                                validationMessages: defaultValidationMessages
                            },
                            {
                                key: 'substitutePrescription',
                                value: self.substitutePrescription,
                                i18n: i18n( 'activity-schema.Prescription_T.substitutePrescription.i18n' ),
                                hasError: ko.computed( validateSubstitutePrescription ),
                                validationMessages: [i18n( 'activity-schema.Prescription_T.substitutePrescription.i18n' )]
                            }

                        ].map( setDefaultValueFromPreSelectedPrescription );
                        break;
                }
                model.toJSON = function() {
                    return model.fields.reduce( function( obj, item ) {
                        obj[item.key] = peek( item.value );
                        return obj;
                    }, {} );
                };
                return model;
            },
            initSelect2: function() {
                var
                    self = this;
                self.initSelect2Employee();
                self.initSelect2Location();
            },
            initSelect2Employee: function() {
                var
                    self = this;
                self.select2Employee = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.employeeId );
                        },
                        write: function( $event ) {
                            self.employeeId( $event.val );
                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.SELECT_EMPLOYEE' ),
                        data: function() {
                            if( !self.selectedLocation ) {
                                return {
                                    results: []
                                };
                            }
                            return {
                                results: self.selectedLocation.employees.filter( function( employee ) {
                                    return employee.type === 'PHYSICIAN' && employee.status === 'ACTIVE';
                                } ).map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    };
                                } )
                            };
                        }
                    }
                };

            },
            onLocationChange: function( location ) {
                var
                    self = this,
                    currentEmployeeId = peek( self.employeeId ),
                    employees = location && location.employees || [],
                    isCurrentEmployeeInList = employees.some( function( employee ) {
                        return employee._id === currentEmployeeId;
                    } ),
                    firstDoctor = _.find( employees, {type: 'PHYSICIAN'} );
                self.selectedLocation = location;
                if( currentEmployeeId && isCurrentEmployeeInList ) {
                    return;
                }
                self.employeeId( firstDoctor && firstDoctor._id || null );

            },
            initSelect2Location: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' );
                self.select2Location = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.locationId );
                        },
                        write: function( $event ) {
                            self.locationId( $event.val );
                            ignoreDependencies( function() {
                                self.onLocationChange( $event.added && $event.added.data || null );
                            } );
                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.SELECT_LOCATION' ),
                        data: locations.map( function( location ) {
                            return {
                                id: location._id,
                                text: location.locname,
                                data: location
                            };
                        } )
                    }
                };
            },
            initPrescriptionGroups: function() {
                var
                    self = this;
                this.prescriptionGoupCounter = 0;
                if( self.isSwissAndSwissCaseFolder ) {
                    this.prescriptionGoups = {
                        PRIVPRESCR: {},
                        LONGPRESCR: {}
                    };
                } else {
                    this.prescriptionGoups = {
                        PUBPRESCR: {},
                        PRIVPRESCR: {},
                        PRESCRBTM: {},
                        PRESCRG: {},
                        PRESCRT: {}
                    };
                }

                this.prescriptionsTypes = Object.keys( this.prescriptionGoups ).map( function( type ) {
                    return {
                        id: type,
                        text: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', type, Y.doccirrus.schemas.activity.types.Activity_E.list, type )
                    };
                } );
            },
            rebuildPrescriptionGroups: function() {
                var
                    self = this,
                    group;

                self.initPrescriptionGroups();
                ko.ignoreDependencies( function() {
                    unwrap( self.prescriptionTable.rows ).forEach( function( model ) {
                        group = self.getPrescriptionGroup( model );
                        model.group( group );
                    } );
                    self.rerenderLegend();
                    self.updateTabHeader();
                } );

            },
            removeMedicationFromTable: function( model ) {
                var row,
                    self = this,
                    identifier = self.hasInStock && peek( model.s_extra ) ? (peek( model.s_extra ).stockLocationId || "") + (peek( model.phNLabel ) || peek( model.userContent )) : peek( model.phNLabel ) || peek( model.userContent );

                if( model instanceof MedicationItemModel ) {
                    self.prescriptionTable.removeRow( model );
                    if( !self.isSwissAndSwissCaseFolder ) {
                        row = self.medicationPlanViewModel.medicationPlanEntries().find( function( row ) {
                            return identifier === (peek( row.phNLabel ) || peek( row.userContent ));
                        } );
                        self.medicationPlanViewModel.removeRow( row );
                    }
                } else {
                    row = self.prescriptionTable.rows().find( function( row ) {
                        return identifier === (peek( row.phNLabel ) || peek( row.userContent ));
                    } );
                    if( row ) {
                        self.prescriptionTable.removeRow( row );
                    }

                }

                this.medicationMap.delete( identifier );
                this.rebuildPrescriptionGroups();
            },
            getPrescriptionGroup: function( medication ) {
                var
                    self = this,

                    activitySettings = self.get( 'activitySettings' ),
                    prescriptionActType = peek( medication.prescriptionType ),
                    currentActivitySettings = _.find( activitySettings, {actType: prescriptionActType} ),
                    limitMeds = currentActivitySettings && currentActivitySettings.maxMedicationAmount || 3,
                    prescriptionGroup = self.prescriptionGoups[prescriptionActType],
                    lastGroup = Number( Object.keys( prescriptionGroup ).slice( -1 ).pop() ) || 0,
                    newGroup,
                    noOpenGroup = !lastGroup || limitMeds <= prescriptionGroup[lastGroup].length;

                if( self.editPrescriptionMode ) {
                    if( !Array.isArray( prescriptionGroup['0'] ) ) {
                        prescriptionGroup['0'] = [];
                    }
                    prescriptionGroup['0'].push( medication );
                    return '0';
                }

                if( noOpenGroup ) {
                    self.prescriptionGoupCounter++;
                    newGroup = self.prescriptionGoupCounter;
                    prescriptionGroup[newGroup] = [medication];
                    self.updateTabHeader();
                    return newGroup;
                } else {
                    prescriptionGroup[lastGroup].push( medication );
                    return lastGroup;
                }

            },
            cleanActivityData: function( data ) {
                delete data._id;
                delete data.isPrescribed;
                delete data.phHeader;
                //InStock
                delete data.isDispensed;
                delete data.orderId;
                if( data.hasOwnProperty( 'isArrived' ) ) {
                    data.isArrived = true;
                }
            },
            addMedicationOfPrescription: function( data ) {
                var self = this,
                    binder = self.get( 'binder' ),
                    caseFolderActive = self.get( 'caseFolder' ),
                    currentPatient = peek( self.get( 'currentPatient' ) ),
                    patientData = currentPatient.toJSON(),
                    preselectedPrescription = peek( self.get( 'preselectedPrescription' ) ),
                    prescriptionGoups = peek( self.prescriptionGoups ),
                    preselectedPrescriptionType = peek( preselectedPrescription.actType ),
                    prescriptionGroup = prescriptionGoups[preselectedPrescriptionType][0],
                    medicationOfPrescriptionLength = Array.isArray( prescriptionGroup ) ? prescriptionGroup.length : 0,
                    activitySettings = self.get( 'activitySettings' ),
                    currentActivitySettings = _.find( activitySettings, {actType: preselectedPrescriptionType} ),
                    maxMedicationOnPrescription = currentActivitySettings && currentActivitySettings.maxMedicationAmount || 3,


                    mapKey = self.hasInStock && data.s_extra ? (data.s_extra.stockLocationId || "") + (data.phNLabel || data.userContent) : data.phNLabel || data.userContent,
                    sameMedicationModel = mapKey && self.medicationMap.get( mapKey ),
                    model, promise, prescriptionTypeI18n;

                if( !preselectedPrescriptionType ) {
                    Y.log( 'unkown prescription type ' + preselectedPrescriptionType, 'error', NAME );
                    return;
                }

                if( sameMedicationModel ) {
                    sameMedicationModel.count( peek( sameMedicationModel.count ) + 1 );
                    sameMedicationModel.samePreSelectedMedications.push( data );
                    self.activeRow( sameMedicationModel );
                    self.rerenderLegend( peek( sameMedicationModel.prescriptionType ) );
                    return;
                }

                if( medicationOfPrescriptionLength >= maxMedicationOnPrescription ) {
                    prescriptionTypeI18n = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', preselectedPrescriptionType, 'i18n', '' );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        window: {
                            width: 'small',
                            maximizable: true,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK' )
                                ]
                            }

                        },
                        message: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.message.tooManyMedicationsOnPrescription', {
                            data: {
                                maxMedications: maxMedicationOnPrescription,
                                prescriptionType: prescriptionTypeI18n
                            }
                        } )
                    } );
                    return;
                }

                if( data.preSelected ) {
                    promise = Promise.resolve( data );
                } else {
                    self.cleanActivityData( data );
                    promise = Promise.resolve( Y.doccirrus.api.activity.createActivity( {
                        patient: patientData,
                        currentUser: binder.getInitialData( 'currentUser' ),
                        caseFolder: caseFolderActive,
                        activity: data
                    } ) );
                }

                promise.then( function( activity ) {

                    activity.prescriptionType = preselectedPrescription.actType;
                    activity.timestamp = moment().toISOString();
                    activity.code = activity.code || activity.phPZN;
                    activity.locationId = peek( self.locationId );
                    activity.employeeId = peek( self.employeeId );

                    model = new MedicationItemModel( {
                        data: activity,
                        caseFolder: caseFolderActive,
                        currentPatient: currentPatient,
                        dispensing: false,
                        count: 1,
                        isMedicationPlanActive: false,
                        exactMedication: preselectedPrescription ? Boolean( preselectedPrescription['exactMed' + (self.prescriptionTable.rows().length + 1)] ) : false
                    } );

                    self.prescriptionTable.addRow( model );

                    self.activeRow( model );

                    if( !data.preSelected ) {
                        model.checkPrescriptionType();
                    }

                    if( !prescriptionGoups[peek( model.prescriptionType )]['0'] ) {
                        prescriptionGoups[peek( model.prescriptionType )]['0'] = [];
                    }
                    prescriptionGoups[peek( model.prescriptionType )]['0'].push( model );

                    self.rerenderLegend( peek( model.prescriptionType ) );
                    self.medicationMap.set( mapKey, model );

                    return model;
                } );

                return promise;
            },
            addMedication: function( data ) {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = peek( self.get( 'currentPatient' ) ),
                    caseFolderActive = self.get( 'caseFolder' ),
                    patientData = currentPatient.toJSON(),
                    model,
                    dispensing = data.dispensing,
                    phSampleMed = data.phSampleMed,
                    phContinuousMed = data.phContinuousMed,
                    phContinuousMedDate = data.phContinuousMedDate,
                    phDosisMorning = data.phDosisMorning,
                    phDosisAfternoon = data.phDosisAfternoon,
                    phDosisEvening = data.phDosisEvening,
                    phDosisNight = data.phDosisNight,
                    dosis = data.dosis,
                    fromDocumedis = data.fromDocumedis;

                if( fromDocumedis ) {
                    delete data.fromDocumedis;
                }

                if( self.editPrescriptionMode ) {
                    //  here we return Promise so should not be inside other promise
                    return self.addMedicationOfPrescription( data );
                }

                return new Promise(function (resolve, reject) {

                    function allDone( err, model ) {
                        if( err ) {
                            Y.log( 'Error in adding medication. Error: ' + err.stack || err );
                            return reject(err);
                        }

                        self.activeRow( model );
                        self.rerenderLegend( peek( model.prescriptionType ) );
                        self.rebuildPrescriptionGroups();

                        resolve(model);
                    }

                    self.cleanActivityData( data );

                    var mapKey = self.hasInStock && data.s_extra ? (data.s_extra.stockLocationId || "") + (data.phNLabel || data.userContent) : data.phNLabel || data.userContent,
                        hasMedication;

                    if( self.medicationMap.get( mapKey ) ) {
                        model = self.medicationMap.get( mapKey );
                        if( self.hasInStock && data.isDivisible ) {
                            model.count( peek( model.count ) + unwrap( data.divisibleCount ) );
                        } else {
                            model.count( peek( model.count ) + 1 );
                        }

                        if( fromDocumedis ) {
                            model.phSampleMed( phSampleMed );
                            model.phContinuousMed( phContinuousMed );
                            model.phContinuousMedDate( phContinuousMedDate );
                            if( dosis ) {
                                model.dosis( dosis );
                            } else {
                                model.dosis( phDosisMorning + '-' + phDosisAfternoon + '-' + phDosisEvening + '-' + phDosisNight );
                            }
                        }
                        hasMedication = ( self.prescriptionTable.rows() || [] ).filter( function( i ) {
                            return i.phPZN() === model.phPZN();
                        });
                        if( !hasMedication.length ) {
                            self.prescriptionTable.addRow( model );
                        }
                        allDone( null, model );
                    } else {
                        async.waterfall( [
                            function getMedicationInstockData( next ) {
                                // if medication comes not from inStock table - check if medication is in inStock
                                if( self.hasInStock && !(data.s_extra || {}).stockLocationId ) {
                                    Y.doccirrus.jsonrpc.api.instockrequest.getWares( {
                                        query: {
                                            locationId: self.locationId,
                                            phPZN: data.phPZN
                                        }
                                    } ).done( function( result ) {
                                        var resultData = (result || {}).data;
                                        if( !Array.isArray( resultData ) || !resultData.length ) {
                                            return next();
                                        }
                                        data.isDivisible = resultData[0].isDivisible;
                                        data.divisibleCount = resultData[0].divisibleCount;
                                        data.phPackSize = resultData[0].phPackSize;
                                        return next();
                                    } ).fail( function() {
                                        return next();
                                    } );
                                } else {
                                    return next();
                                }
                            },
                            function createActivity( next ) {
                                if( data.isDivisible && data.phPackSize ) {
                                    data.phPriceSale = data.phPriceSale / data.phPackSize;
                                }
                                Y.doccirrus.api.activity
                                    .createActivity( {
                                        patient: patientData,
                                        currentUser: binder.getInitialData( 'currentUser' ),
                                        caseFolder: caseFolderActive,
                                        activity: data
                                    } )
                                    .then( function( activity ) {
                                        return next( null, activity );
                                    } )
                                    .catch( next );
                            },
                            function onActivityCreated( activity, next ) {
                                var
                                    recommendedPrescriptionTypes,
                                    model = null;
                                if( !activity ) {
                                    return next( null, model );
                                }
                                recommendedPrescriptionTypes = Y.doccirrus.schemas.v_medication.getPrescriptionTypeForMed( {
                                    patientAge: currentPatient.age(),
                                    medication: activity,
                                    insuranceType: caseFolderActive.type
                                } );
                                activity.prescriptionType = recommendedPrescriptionTypes[0] && recommendedPrescriptionTypes[0].prescriptions[0];
                                activity.timestamp = moment().toISOString();
                                activity.code = activity.code || activity.phPZN;
                                activity.locationId = peek( self.locationId );
                                activity.employeeId = peek( self.employeeId );
                                activity.catalogShort = self.isSwissAndSwissCaseFolder ? 'HCI' : 'MMI';


                                activity.medicationPlanOrder = self.currentMedicationPlanCount;
                                self.currentMedicationPlanCount++;

                                model = new MedicationItemModel( {
                                    data: activity,
                                    caseFolder: caseFolderActive,
                                    currentPatient: currentPatient,
                                    rebuildPrescriptionGroups: self.rebuildPrescriptionGroups.bind( self ),
                                    dispensing: dispensing || false,
                                    stockLocationId: (activity.s_extra || {}).stockLocationId,
                                    isMedicationPlanActive: self.saveMedicationPlanCkb,
                                    count: unwrap( activity.isDivisible ) ? unwrap( activity.divisibleCount ) : 1
                                } );

                                model.group( self.getPrescriptionGroup( model ) );
                                if( fromDocumedis ) {
                                    model.phSampleMed( phSampleMed );
                                    model.phContinuousMed( phContinuousMed );
                                    model.phContinuousMedDate( phContinuousMedDate );
                                    if( dosis ) {
                                        model.dosis( dosis );
                                    } else {
                                        model.dosis( phDosisMorning + '-' + phDosisAfternoon + '-' + phDosisEvening + '-' + phDosisNight );
                                    }
                                }

                                model.dispensing.subscribe( function( value ) {
                                    if( value ) {
                                        self.selectDispensing( true );
                                    } else {
                                        // eslint-disable-next-line no-inner-declarations
                                        var isAbgabeInRow = false;
                                        unwrap( self.prescriptionTable.rows ).forEach( function( row ) {
                                            if( unwrap( row.dispensing ) ) {
                                                isAbgabeInRow = true;
                                            }
                                        } );
                                        if( !isAbgabeInRow ) {
                                            self.selectDispensing( false );
                                        } else {
                                            self.selectDispensing( true );
                                        }
                                    }
                                } );

                                model.dosis.subscribe( function( value ) {
                                    if( self.medicationPlanViewModel ) {
                                        self.medicationPlanViewModel.updateMedicationDosisAndLablel( peek( model.phNLabel ), {
                                            dosis: value
                                        } );
                                    }
                                } );

                                model.phNLabel.subscribe( function( value ) {
                                    if( self.medicationPlanViewModel ) {
                                        self.medicationPlanViewModel.updateMedicationDosisAndLablel( peek( model.previousPhNLabel ), {
                                            phNLabel: value
                                        } );
                                    }
                                    model.previousPhNLabel = value;
                                } );

                                model.phContinuousMed.subscribe( function( value ) {
                                    if( self.medicationPlanViewModel ) {
                                        self.medicationPlanViewModel.updateMMandDM( peek( model.phNLabel ), {
                                            phContinuousMed: value
                                        } );
                                    }
                                } );

                                model.phSampleMed.subscribe( function( value ) {
                                    if( self.medicationPlanViewModel ) {
                                        self.medicationPlanViewModel.updateMMandDM( peek( model.phNLabel ), {
                                            phSampleMed: value
                                        } );
                                    }
                                } );

                                //  this column is not editable
                                model.displayRange.disabled = ko.observable( true );

                                self.medicationMap.set( mapKey, model );
                                self.prescriptionTable.addRow( model );

                                //do not add preSelected medications to the already existing medicationPlan, if one exists
                                if( !self.editPrescriptionMode && !self.isSwissAndSwissCaseFolder && (self.isGermany || 1 !== self.swissMedPlans.length) && !(self.swissMedPlans.length && data.preSelected) ) {
                                    self.medicationPlanViewModel.addMedicationEntryRow( _.assign( {
                                        type: 'MEDICATION',
                                        medicationRef: unwrap( model._id )
                                    }, model.toJSON() ), null, true, function( data ) {
                                        if( data.phNLabel ) {
                                            model.phNLabel( data.phNLabel );
                                        }
                                        if( data.dosis ) {
                                            model.displayDosis( data.dosis );
                                        }

                                        if( data.schedule ) {
                                            model.displayDosis( data.schedule );
                                        }
                                    } );
                                }

                                return next( null, model );
                            }
                        ], allDone );
                    }
                });
            },
            initPrescriptionTable: function() {
                var
                    self = this,
                    caseFolderActive = self.get( 'caseFolder' ),
                    caseFolderType = caseFolderActive.type;

                self.isPrescriptionTableVisible = ko.computed( function() {
                    return self.PRESCRIPTION_TAB === unwrap( self.activeTab );
                } );

                var commonColumns = {
                    displayCount: {
                        label: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' ),
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' ),
                        width: '100px',
                        forPropertyName: 'displayCount'
                    },
                    phNLabel: {

                        label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                        title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                        forPropertyName: 'phNLabel',
                        renderer: function( meta ) {
                            var
                                html = unwrap( meta.value ),
                                type = '',
                                title = DESCRIPTOR_MISSING;
                            if( unwrap( meta.row.descriptorMissingError ) ) {
                                type = unwrap(meta.row.descriptorMissingType);
                                html += ' <span class="glyphicon glyphicon-ban-circle text-danger" aria-hidden="true" title="' + Y.Lang.sub( title, {type: type}) + '" ></span>';
                            } else {
                                html = html;
                            }
                            return html;
                        }
                    },
                    phSampleMed: {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'phSampleMed',
                        width: '40px',
                        title: i18n( 'activity-schema.Medication_T.phSampleMed.i18n' ),
                        label: i18n( 'InCaseMojit.activity_schema.SAMPLE_MEDICATION' )
                    },
                    phContinuousMed: {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'phContinuousMed',
                        width: '40px',
                        title: i18n( 'activity-schema.Medication_T.phContinuousMed.i18n' ),
                        label: i18n( 'InCaseMojit.activity_schema.CONTINUOUS_MEDICATION' ),
                        selectAllCheckbox: false
                    },
                    displayDosis: {
                        forPropertyName: 'displayDosis',
                        label: i18n( 'InCaseMojit.casefile_detail.label.DOSIS' ),
                        title: i18n( 'InCaseMojit.casefile_detail.label.DOSIS' ),
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.DOSIS' ),
                                    allowClear: true,
                                    quietMillis: 700,
                                    multiple: false,
                                    initSelection: function( element, callback ) {
                                        var data = {id: element.val(), text: element.val()};
                                        callback( data );
                                    },
                                    query: function( query ) {
                                        var defaults = self.isSwissAndSwissCaseFolder ? [] : [{id: PAPER_DOSIS, text: PAPER_DOSIS_LONG}];
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
                                            var data = response && response.data && response.data || [];
                                            query.callback( {
                                                results: defaults.concat( data.map( function( item ) {
                                                        return {id: item.title, text: item.title};
                                                    } )
                                                )
                                            } );
                                        } ).fail( function() {
                                            query.callback( {
                                                results: defaults
                                            } );
                                        } );
                                    },
                                    createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                        return {
                                            id: term,
                                            text: term
                                        };
                                    } : null
                                }
                            }
                        }
                    }
                };
                var germanSpecificColumns = {
                    exactMedication: {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'exactMedication',
                        width: '40px',
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.exactMedication' ),
                        label: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.exactMedication' )
                    },
                    prescriptionType: {
                        label: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_type' ),
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_type' ),
                        forPropertyName: 'prescriptionType',
                        width: '150px',
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    query: undefined,
                                    initSelection: undefined,
                                    multiple: false,
                                    data: self.prescriptionsTypes.filter( function( item ) {
                                        if( 'PUBLIC' === caseFolderType ) {
                                            return true;
                                        }
                                        return ('PUBPRESCR' !== item.id || 'BG' === caseFolderType);
                                    } )
                                }
                            }
                        },
                        renderer: function( meta ) {
                            var
                                value = unwrap( meta.value );
                            return i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescriptions.' + value ) || '';
                        }
                    },
                    group: {
                        label: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.group' ),
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.group' ),
                        width: '100px',
                        forPropertyName: 'group'
                    },
                    displayRange: {
                        forPropertyName: 'displayRange',
                        label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.RANGE' ),
                        title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.RANGEHOVER' ),
                        inputField: {
                            componentType: 'KoEditableTableTextareaCell',
                            componentConfig: {
                                css: {
                                    vresize: true
                                }
                            }
                        }
                    },
                    phNote: {
                        forPropertyName: 'phNote',
                        label: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                        title: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                        visible: false,
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    placeholder: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
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
                                                type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
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
                                    },
                                    createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                        return {
                                            id: term,
                                            text: term
                                        };
                                    } : null
                                }
                            }
                        }
                    },
                    phReason: {
                        forPropertyName: 'phReason',
                        label: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                        title: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                        visible: false,
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    placeholder: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
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
                                                type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
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
                                    },
                                    createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                        return {
                                            id: term,
                                            text: term
                                        };
                                    } : null
                                }
                            }
                        }
                    }
                };

                var swissSpecificColumns = {
                    dispensing: {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'dispensing',
                        width: '40px',
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.dispense' ),
                        label: 'A'
                    },
                    phNote: {
                        forPropertyName: 'phNote',
                        label: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                        title: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    placeholder: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
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
                                                type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
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
                                    },
                                    createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                        return {
                                            id: term,
                                            text: term
                                        };
                                    } : null
                                }
                            }
                        }
                    },
                    phReason: {
                        forPropertyName: 'phReason',
                        label: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                        title: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                select2Config: {
                                    placeholder: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
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
                                                type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
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
                                    },
                                    createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                        return {
                                            id: term,
                                            text: term
                                        };
                                    } : null
                                }
                            }
                        }
                    },
                    phContinuousMedDate: {
                        forPropertyName: 'phContinuousMedDate',
                        label: i18n( 'activity-schema.Medication_CH_T.phContinuousMedDate.i18n' ),
                        title: i18n( 'activity-schema.Medication_CH_T.phContinuousMedDate.i18n' ),
                        inputField: {
                            componentType: 'KoSchemaValue',
                            componentConfig: {
                                fieldType: 'Date',
                                showLabel: false,
                                useIsoDate: true,
                                buttons: ['monthsButtons'], // custom option for datepicker to add some custom buttons, shoudl be defined in ko-bindingHandlers.client.js
                                maxDate: moment().endOf( 'd' ).add( 6, 'month' )
                            }
                        },
                        renderer: function( meta ) {
                            var
                                value = unwrap( meta.value );

                            if( !value ) {
                                return " ";
                            }

                            return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                        }
                    },
                    isDivisible: {
                        forPropertyName: 'isDivisible',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                        width: '15%',
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                useSelect2Data: true,
                                select2Read: function( value ) {
                                    return value === "true" || value === true ? {id: true, text: "TP"} : {
                                        id: false,
                                        text: OP
                                    };
                                },
                                select2Config: {
                                    placeholder: i18n( 'InStockMojit.instock_schema.InStock_T.isDivisible' ),
                                    allowClear: false,
                                    multiple: false,
                                    query: function( query ) {
                                        query.callback( {
                                            results: [
                                                {id: false, text: OP},
                                                {id: true, text: TP}
                                            ]
                                        } );
                                    }
                                }
                            }
                        },
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );
                            if( value === "true" || value === true ) {
                                return TP;
                            } else {
                                return OP;
                            }
                        }
                    }
                };

                var columns = [];

                if( self.isSwissAndSwissCaseFolder ) {
                    columns = [
                        commonColumns.displayCount,
                        commonColumns.phNLabel,
                        commonColumns.phSampleMed,
                        commonColumns.phContinuousMed,
                        commonColumns.displayDosis,
                        swissSpecificColumns.phContinuousMedDate,
                        swissSpecificColumns.dispensing,
                        swissSpecificColumns.phNote,
                        swissSpecificColumns.phReason

                    ];
                } else {
                    columns = [
                        !self.editPrescriptionMode && germanSpecificColumns.prescriptionType,
                        !self.editPrescriptionMode && germanSpecificColumns.group,
                        commonColumns.displayCount,
                        germanSpecificColumns.exactMedication,
                        commonColumns.phNLabel,
                        commonColumns.phSampleMed,
                        commonColumns.phContinuousMed,
                        commonColumns.displayDosis,
                        germanSpecificColumns.displayRange,
                        germanSpecificColumns.phNote,
                        germanSpecificColumns.phReason
                    ].filter( Boolean );
                }

                if( self.hasInStock && self.isSwissAndSwissCaseFolder ) {
                    columns.splice( 1, 0, swissSpecificColumns.isDivisible );
                }

                self.prescriptionTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    componentConfig: {
                        stateId: 'MedicationPlanPrescriptionsModal-prescriptionTable',
                        ViewModel: MedicationItemModel,
                        data: [],
                        columns: [
                            {
                                componentType: 'KoEditableTableColumnDrag'
                            }].concat( columns, [
                            !self.isSwissAndSwissCaseFolder && {
                                forPropertyName: 'openPriceComparisonButton',
                                utilityColumn: true,
                                css: {
                                    'text-center': 1
                                },
                                width: '134px',
                                inputField: {
                                    componentType: 'KoButtonDropDown',
                                    componentConfig: {
                                        name: 'open_price_comparison',
                                        title: i18n( 'InCaseMojit.casefile_detail.button.OPEN_PRICE_COMPARISON' ),
                                        text: i18n( 'InCaseMojit.casefile_detail.button.OPEN_PRICE_COMPARISON' ),
                                        menu: {
                                            items: [
                                                {
                                                    name: 'normalPriceComparisonBtn',
                                                    text: 'Alle',
                                                    click: function( button, $event, $context ) {
                                                        var
                                                            column = $context.$parents.find( function( parent ) {
                                                                return parent.row instanceof MedicationItemModel;
                                                            } ),
                                                            rowModel = column && column.row;

                                                        if( !rowModel ) {
                                                            return;
                                                        }

                                                        self.openPriceComparison( {
                                                            pzn: unwrap( rowModel.phPZN ),
                                                            patient: self.get( 'currentPatient' ),
                                                            _defaultMappings: self.get( 'defaultMappings' )
                                                        } );
                                                    }
                                                },
                                                {
                                                    name: 'cheaperPriceComparisonBtn',
                                                    text: 'Nur rabattierte Produkte',
                                                    click: function( button, $event, $context ) {
                                                        var
                                                            column = $context.$parents.find( function( parent ) {
                                                                return parent.row instanceof MedicationItemModel;
                                                            } ),
                                                            rowModel = column && column.row;

                                                        if( !rowModel ) {
                                                            return;
                                                        }

                                                        self.openPriceComparison( {
                                                            pzn: unwrap( rowModel.phPZN ),
                                                            patient: self.get( 'currentPatient' ),
                                                            _defaultMappings: self.get( 'defaultMappings' ),
                                                            priceComparisonDiscount: true
                                                        } );
                                                    }
                                                }]
                                        }
                                    }
                                }
                            }, {
                                forPropertyName: 'deleteButton',
                                width: '50px',
                                utilityColumn: true,
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'delete',
                                        title: i18n( 'general.button.DELETE' ),
                                        icon: 'TRASH_O',
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            self.removeMedicationFromTable( rowModel );
                                        }
                                    }
                                }
                            }
                        ].filter( Boolean ) ),
                        baseParams: {},
                        draggableRows: true,
                        isAddRowButtonVisible: function() {
                            return false;
                        },
                        onRowDragged: function() {
                            self.rebuildPrescriptionGroups();
                        },
                        getCssRow: function( $context, css ) {
                            var
                                activeRow = self.activeRow(),
                                thisRow = $context.$data,
                                isThisRowActive = false,
                                identifier,
                                isDescriptorMissingError = false,
                                isContinuousMedDateMissing = false;

                            if( activeRow ) {
                                identifier = peek( activeRow.phNLabel ) || peek( activeRow.userContent );
                            }

                            if( activeRow && !(activeRow instanceof MedicationItemModel) ) {
                                activeRow = self.prescriptionTable.rows().find( function( row ) {
                                    return identifier === (peek( row.phNLabel ) || peek( row.userContent ));
                                } );
                            }

                            if( activeRow ) {
                                isThisRowActive = activeRow === thisRow;
                            }

                            if( thisRow && unwrap( thisRow.descriptorMissingError ) ) {
                                isDescriptorMissingError = true;
                            }

                            if( thisRow && unwrap( thisRow.phContinuousMed ) && (!unwrap( thisRow.phContinuousMedDate ) || !unwrap( thisRow.phContinuousMedDate ) === " ") ) {
                                isContinuousMedDateMissing = true;
                            }

                            css.info = isThisRowActive;
                            css.danger = isDescriptorMissingError;


                            if ($context.$data.hasOwnProperty("_isValid") && !isContinuousMedDateMissing) {
                                css.danger = css.danger || !( $context.$data._isValid());
                            }
                        }
                    }
                } );

                self.prescriptionTable.rendered.subscribe( function( val ) {
                    if( true === val ) {
                        KoEditableTable.tableNavigation( document.querySelector( '#prescriptionTable' ) );
                    }
                } );
            },
            initMedicationPlanTable: function() {
                var
                    self = this,
                    currentPatient = self.get( 'currentPatient' ),
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' ),
                    currentMedicationPlan = self.swissMedPlans && 1 === self.swissMedPlans.length && self.swissMedPlans[0],
                    KBVMedicationPlanViewModel = KoViewModel.getConstructor( 'KBVMedicationPlanViewModel' );

                self.currentMedicationPlanCount = 0;

                self.isMedicationPlanTableVisible = ko.computed( function() {
                    return self.MEDICATION_PLAN_TAB === unwrap( self.activeTab );
                } );

                if( self.isSwissAndSwissCaseFolder ) {
                    return;
                }
                self.medicationPlanViewModel = new KBVMedicationPlanViewModel( {
                    currentPatient: ko.observable( currentPatient ),
                    currentMedPlan: currentMedicationPlan,
                    patientParameterVisible: !!currentMedicationPlan,
                    _locationList: locations,
                    data: {
                        timestamp: moment().toISOString(),
                        patientId: peek( currentPatient._id )
                    },
                    onRemoveOfMedicationPlanEntry: function( medicationPlanEntry ) {
                        if( medicationPlanEntry ) {
                            self.removeMedicationFromTable( medicationPlanEntry );
                        }
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var employeeId = unwrap( self.employeeId ),
                        locationId = unwrap( self.locationId ),
                        timestamp = unwrap( self.timestamp );

                    self.medicationPlanViewModel.employeeId( employeeId );
                    self.medicationPlanViewModel.locationId( locationId );
                    if( timestamp ) {
                        self.medicationPlanViewModel.timestamp( timestamp );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        activeRow = self.activeRow(),
                        identifier;

                    if( self.isSwissAndSwissCaseFolder ) {
                        return;
                    }

                    if( activeRow ) {
                        identifier = peek( activeRow.phNLabel ) || peek( activeRow.userContent );
                    }

                    if( activeRow && (activeRow instanceof MedicationItemModel) ) {
                        activeRow = self.medicationPlanViewModel.medicationPlanEntries().find( function( row ) {
                            return identifier === (peek( row.phNLabel ) || peek( row.userContent ));
                        } );
                    }

                    self.medicationPlanViewModel.setRowHighlight( activeRow );
                } ) );
            },
            initTableTabs: function() {
                var
                    self = this;
                self.MEDICATION_PLAN_TAB = 'medicationPlanTab';
                self.PRESCRIPTION_TAB = 'prescriptionTab';
                self.activeTab = ko.observable( self.PRESCRIPTION_TAB );
                self.activateTab = self.activateTab.bind( self );
                self.tabItems = [];

                if( !self.swissCaseFolder && !self.editPrescriptionMode ) {
                    self.tabItems.push( {
                        title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.medication_plan_tab' ),
                        value: self.MEDICATION_PLAN_TAB,
                        css: ko.computed( function() {
                            var
                                active = self.MEDICATION_PLAN_TAB === unwrap( self.activeTab );
                            return {
                                active: ko.observable( active )
                            };
                        } )

                    } );
                }

                self.tabItems.push( {
                    title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.prescription_tab' ),
                    value: self.PRESCRIPTION_TAB,
                    css: ko.computed( function() {
                        var
                            active = self.PRESCRIPTION_TAB === unwrap( self.activeTab );
                        return {
                            active: ko.observable( active )
                        };
                    } )
                } );
            },
            activateTab: function( item ) {
                var
                    self = this;
                self.activeTab( item.value );
            },
            initTitles: function() {
                var
                    self = this;
                self.searchTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MMI_SEARCH' );
                self.catalogUsageTableTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CATALOG_USAGE_TABLE' );
                self.patientMedicationTableTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PATIENT_MEDICATIONS_TABLE' );
                self.selectedMedicationsTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.SELECTED_ITEMS_TITLE' );
                self.inStockTableTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.INSTOCK' );
            },
            taskData: null,
            showPrintModal: function() {

                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = unwrap( binder.currentPatient ),
                    prescriptions = peek( self.prescriptionTable.rows ),
                    savePrescriptionCkb = peek( self.savePrescriptionCkb ),
                    saveMedicationPlanCkb = peek( self.saveMedicationPlanCkb ),
                    details = '';
                if( prescriptions.length ) {
                    if( savePrescriptionCkb ) {
                        Object.keys( self.prescriptionGoups ).forEach( function( actType ) {
                            var
                                groups = Object.keys( self.prescriptionGoups[actType] );
                            if( groups.length ) {
                                details += Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', '' ) + '(' + groups + ')\n';
                            }
                        } );
                    }
                    if( saveMedicationPlanCkb ) {
                        details += Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', 'MEDICATIONPLAN', 'i18n', '' ) + '(1)\n';
                    }
                }

                Y.doccirrus.modals.taskModal.showDialog( {
                    patientId: peek( currentPatient._id ),
                    patientName: Y.doccirrus.schemas.person.personDisplay( {
                        firstname: peek( currentPatient.firstname ),
                        lastname: peek( currentPatient.lastname ),
                        title: peek( currentPatient.title )
                    } ),
                    details: details,
                    title: PRINT_ACTIVITIES,
                    doNotSave: true
                }, function( data ) {
                    self.taskData = data;
                    self.save()
                        .then( function( _data ) {
                            self.get( 'onPrintTask' )( null, _data );
                        } )
                        .catch( function( error ) {
                            self.get( 'onPrintTask' )( error );
                        } );
                } );

            },
            initButtons: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' );
                self._openMedicationSearch = function( focusInput ) {
                    var
                        currentPatient = self.get( 'currentPatient' ),
                        defaultMappings = self.get( 'defaultMappings' ),
                        caseFolder = self.get( 'caseFolder' );
                    Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                            activity: {
                                locationId: peek( self.locationId ),
                                employeeId: peek( self.employeeId ),
                                _locationList: locations,
                                caseFolder: caseFolder
                            },
                            focusInput: focusInput,
                            patient: currentPatient,
                            multiSelect: true
                        }, function( err, selectedMedications ) {
                            if( err ) {
                                return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                            Promise.mapSeries( selectedMedications, function( selected ) {
                                return new Promise( function( resolve ) {
                                    var isOTC,
                                        patientAge,
                                        isOver12,
                                        isChild,
                                        phPatPay,
                                        phPatPayHint,
                                        phPriceSale,
                                        phFixedPay,
                                        canBePatPayFree;

                                    if( selected && selected.package && selected.package.originalData && selected.product && selected.product.originalData ) {

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

                                        Y.doccirrus.schemas.activity._setActivityData( {
                                            initData: {
                                                actType: 'MEDICATION',
                                                catalogShort: 'MMI',
                                                locationId: peek( self.locationId )
                                            },
                                            entry: {
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
                                                phARVContent: selected.package.originalData.phARVText,
                                                phGTIN: selected.package.originalData.phGTIN,
                                                prdNo: selected.package.originalData.prdNo,
                                                supplyCategory: selected.package.originalData.supplyCategory,
                                                insuranceCode: selected.package.originalData.insuranceCode,
                                                insuranceDescription: selected.package.originalData.insuranceDescription,
                                                isDivisible: selected.package.originalData.isDivisible,
                                                paidByInsurance: selected.package.originalData.paidByInsurance
                                            },
                                            user: null
                                        }, function( err, data ) {
                                            if( err ) {
                                                Y.log( 'can never happen in client #0002' );
                                            }
                                            resolve( data );
                                        } );
                                    }
                                } );
                            } )
                                .then( function( data ) {
                                    return Promise.each( data, function( item ) {
                                        return self.addMedication( item );
                                    } );
                                } );
                        }
                    );
                };

                self._openSwissMedicationSearch = function() {
                    var
                        currentPatient = self.get( 'currentPatient' ),
                        defaultMappings = self.get( 'defaultMappings' ),
                        caseFolder = self.get( 'caseFolder' ),
                        activitySettings = binder.getInitialData( 'activitySettings' );

                    if( self.isSwissAndSwissCaseFolder ) {
                        // get latest medications
                        self.swissMedications = ( self.prescriptionTable.rows() || [] ).map( function( item ) {
                            return JSON.parse( JSON.stringify( item ) );
                        });
                        Y.doccirrus.jsonrpc.api.employee
                            .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                            .done( function( response ) {
                                Y.doccirrus.modals.documedisMedication.show( {
                                    activitySettings: activitySettings,
                                    currentPatient: currentPatient,
                                    defaultMappings: defaultMappings,
                                    locationId: peek( self.locationId ),
                                    employeeId: peek( self.employeeId ),
                                    employeeType: (response && response.data) ? response.data.type : "OTHER",
                                    preselectedMedications: self.swissPreselectedMedications,
                                    medPlans: self.swissMedPlans,
                                    medications: self.swissMedications,
                                    caseFolder: caseFolder,
                                    binder: binder,
                                    medicationPlan: self.swissMedicationPlan,
                                    callback: function( result ) {
                                        var medications = result.medications,
                                            previousMedications = JSON.parse( JSON.stringify( self.prescriptionTable.rows() ) ),
                                            newMedications = [],
                                            medication;
                                        // clean all before apply
                                        ( self.prescriptionTable.rows() || [] ).forEach( function( item ) {
                                            medications.forEach( function( i ) {
                                                if( i.phPZN === item.phPZN() ) {
                                                    i.dispensing = item.dispensing();
                                                    i.phSampleMed = item.phSampleMed();
                                                }
                                            });
                                            self.removeMedicationFromTable( item );
                                        });

                                        // keep previous order for medications
                                        previousMedications.forEach( function( i ) {
                                            medication = medications.filter( function( item ) {
                                                return i.phPZN === item.phPZN;
                                            });
                                            if( medication && medication[0] ) {
                                                newMedications.push( medication[0] );
                                            }
                                        });
                                        // filter new added medications
                                        medications = medications.filter( function( i ) {
                                            return -1 === newMedications.indexOf( i );
                                        });
                                        // old medications + new
                                        medications = newMedications.concat( medications );
                                        self.medData( result.medData );
                                        Promise.each(medications,  function( medication ) {
                                            medication.fromDocumedis = true;
                                            // in some cases documedis returns code === GTIN, not PZN
                                            if( medication.code !== medication.phPZN ) {
                                                medication.code = medication.phPZN;
                                            }
                                            return self.addMedication( medication );
                                        } );
                                    }
                                } )
                                    .then( function() {
                                        binder.showBackgroundProcessMask();
                                    } );
                            } );
                        return;
                    }
                };
                self.searchButton = Y.doccirrus.MMISearchButton.create( {
                    onClick: function( focusInput ) {
                        self._openMedicationSearch( focusInput );
                    },
                    disabled: function() {
                        return !self.get( 'defaultMappings' ) || !unwrap( self.locationId ) || !unwrap( self.employeeId ) || !Y.doccirrus.auth.hasAdditionalService( "inScribe" );
                    }
                } );

                self.isPrintOptionCheckedForAnyPrescription = function( option ) {
                    const self = this,
                        activitySettings = self.get( 'activitySettings' ),
                        prescriptionActivitySettings = activitySettings.filter( function( setting ) {
                            return Y.doccirrus.schemas.activity.PRESCRIPTION_ACT_TYPES.includes( setting.actType );
                        } );

                    return prescriptionActivitySettings.some( function( setting ) {
                        return setting[option];
                    } );
                };

                self.swissSearchButton = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'swissSearchButton',
                        text: 'Documedis',
                        disabled: ko.computed( function() {
                            return false;
                        } ),
                        visible: true,
                        click: function() {
                            self._openSwissMedicationSearch();
                        }
                    }
                } );
                self.saveBtn = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'SAVE_BTN',
                        option: 'PRIMARY',
                        size: 'XSMALL',
                        disabled: ko.computed( function() {
                            return !unwrap( self.isValid );
                        } ),
                        text: i18n( 'general.button.SAVE' ),
                        click: function() {
                            self.save()
                                .then( function() {
                                    self.get( 'onSave' )();
                                } );
                        }
                    }
                } );
                self.printTaskBtn = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'PRINT_TASK_BTN',
                        size: 'XSMALL',
                        icon: 'PRINT',
                        disabled: ko.computed( function() {
                            return !unwrap( self.isValid );
                        } ),
                        text: i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT_TASK' ),
                        click: function() {
                            self.showPrintModal();
                        }
                    }
                } );
                self.printBtn = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'PRINT_BTN',
                        icon: 'PRINT',
                        size: 'XSMALL',
                        visible: true,
                        disabled: ko.computed( function() {
                            return !unwrap( self.isValid ) || self.isPrintOptionCheckedForAnyPrescription( 'quickPrintInvoice' );
                        } ),
                        text: i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT' ),
                        click: function() {
                            var activitiesToPrint = [];
                            if( peek( self.savePrescriptionCkb ) || peek( self.saveMedicationPlanCkb ) ) {
                                if( peek( self.savePrescriptionCkb ) ) {
                                    self.prescriptionTable.rows().forEach( function( item ) {
                                        if( -1 === activitiesToPrint.indexOf( item.prescriptionType() ) ) {
                                            activitiesToPrint.push( item.prescriptionType() );
                                        }
                                    } );
                                }
                                if( peek( self.saveMedicationPlanCkb ) ) {
                                    activitiesToPrint.push( self.isSwissAndSwissCaseFolder ? 'MEDICATIONPLAN' : 'KBVMEDICATIONPLAN' );
                                }
                                Y.doccirrus.modals.printMultiple.show( {
                                    'message': i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.choose_printer' ),
                                    'activities': activitiesToPrint,
                                    'locationSelected': self.locationId(),
                                    callback: onPrinterSelected
                                } );
                            }
                        }
                    }
                } );

                self.quickPrintBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'QUICK_PRINT_BTN',
                            icon: 'LOCK',
                            size: 'XSMALL',
                            visible: ko.computed( function() {
                                return self.isPrintOptionCheckedForAnyPrescription( 'quickPrintPrescription' );
                            } ),
                            disabled: ko.computed( function() {
                                return !unwrap( self.isValid ) ||
                                       !Y.doccirrus.authpub.hasEnoughGroupRights( (Y.doccirrus.auth.getUser() || {}).groups, Y.doccirrus.schemas.identity.userGroups.PHYSICIAN );
                            } ),
                            text: i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.btnQuickPrint.text' ),
                            click: function() {
                                let activitiesToPrint = [];
                                if( peek( self.savePrescriptionCkb ) || peek( self.saveMedicationPlanCkb ) ) {
                                    if( peek( self.savePrescriptionCkb ) ) {
                                        self.prescriptionTable.rows().forEach( function( item ) {
                                            if( activitiesToPrint.indexOf( item.prescriptionType() ) === -1 ) {
                                                activitiesToPrint.push( item.prescriptionType() );
                                            }
                                        } );
                                    }
                                    if( peek( self.saveMedicationPlanCkb ) ) {
                                        activitiesToPrint.push( self.isSwissAndSwissCaseFolder ? 'MEDICATIONPLAN' : 'KBVMEDICATIONPLAN' );
                                    }
                                    Y.doccirrus.modals.printMultiple.show( {
                                        'message': i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.choose_printer' ),
                                        'activities': activitiesToPrint,
                                        'locationSelected': self.locationId(),
                                        callback: function( response ) {
                                            self.printActivities = response.data ? response.data : response;
                                            self.updateLocalStoragePrinters( self.printActivities );
                                            self.save( false, '', 0, true, true )
                                                .then( function() {
                                                    self.get( 'onSave' )();
                                                } );
                                        }
                                    } );
                                }
                            }
                        }
                    }
                );

                function onPrinterSelected( response ) {
                    self.printActivities = response.data ? response.data : response;
                    self.updateLocalStoragePrinters( self.printActivities );
                    self.print();
                }
            },

            /**
             *  Look up the prescription form and print settings
             */

            initFormId: function() {
                var
                    self = this,
                    currentPatient = self.get( 'currentPatient' ).toJSON(),
                    caseFolder = self.get( 'caseFolder' ),
                    insurance = Y.doccirrus.schemas.patient.getInsuranceByType( currentPatient, caseFolder.type ),
                    insuranceType = insurance && insurance.type,
                    actType = 'PUBLIC' === insuranceType ? 'PUBPRESCR' : 'PRIVPRESCR',
                    prescriptionFormRole = Y.doccirrus.getFormRole( actType, caseFolder.type || 'ANY' );

                self.formId = ko.observable( '' );

                Y.log( 'Looking up form role for insurance type: ' + insuranceType + ' ' + prescriptionFormRole, 'debug', NAME );

                Y.dcforms.getConfigVar( '', prescriptionFormRole, false, onFormMetaLoaded );

                function onFormMetaLoaded( err, result ) {
                    if( err || '' === result ) {
                        Y.log( 'Problem looking up form for this role: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    Y.log( 'Loaded prescription form meta, setting form id: ' + result, 'debug', NAME );
                    self.formId( result );
                }
            },

            //  EVENT HANDLERS

            getPrescriptionData: function() {
                var
                    self = this,
                    result = {};
                self.prescriptionData.forEach( function( model ) {
                    result[model.type] = model.toJSON();
                } );
                return result;
            },
            saveEditedPrescription: function saveEditedPrescription( print, printerName, numCopies, showDialog, quickPrintPrescription ) {
                var
                    self = this,
                    medications,
                    refinedMedications = [],
                    preselectedPrescription;

                preselectedPrescription = peek( self.get( 'preselectedPrescription' ) );
                medications = self.prescriptionGoups[preselectedPrescription.actType]['0'];
                medications.forEach( function( medicationModel ) {
                    var medication = medicationModel.toJSON(),
                        count = peek( medicationModel.count ),
                        additionalMedsCount = count - 1,
                        copy;
                    refinedMedications.push( medication );
                    medicationModel.samePreSelectedMedications.forEach( function( sameMedication ) {
                        copy = JSON.parse( JSON.stringify( medication ) );
                        if( additionalMedsCount <= 0 ) {
                            return;
                        }
                        copy._id = sameMedication._id;
                        refinedMedications.push( copy );
                        additionalMedsCount--;
                    } );
                    while( additionalMedsCount > 0 ) {
                        copy = JSON.parse( JSON.stringify( medication ) );
                        delete copy._id;
                        refinedMedications.push( copy );
                        additionalMedsCount--;
                    }
                } );

                return Promise.resolve( Y.doccirrus.jsonrpc.api.prescription.prescriptionAddendum( {
                    data: {
                        prescriptionId: preselectedPrescription._id,
                        medications: refinedMedications,
                        employeeId: peek( self.employeeId ),
                        locationId: peek( self.locationId ),
                        timestamp: peek( self.timestamp ),
                        prescriptionData: self.getPrescriptionData()[preselectedPrescription.actType],
                        print: print,
                        printerName: printerName || '',
                        numCopies: numCopies || 0,
                        taskData: self.taskData,
                        showDialog: showDialog || false,
                        quickPrintPrescription: quickPrintPrescription || false,
                        printActivities: self.printActivities
                    }
                } ) ).catch( function( err ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );
            },
            save: function( print, printerName, numCopies, showDialog, quickPrintPrescription ) {
                var
                    self = this,
                    currentPatient = self.get( 'currentPatient' ),
                    caseFolderActive = self.get( 'caseFolder' ),
                    savePrescriptionCkb = peek( self.savePrescriptionCkb ),
                    saveMedicationPlanCkb = peek( self.saveMedicationPlanCkb ),
                    kbvMedicationPlan = !self.isSwissAndSwissCaseFolder && self.medicationPlanViewModel.toJSON(),
                    medData = unwrap( self.medData ),
                    swissMedPlanTemplate = self.isSwissAndSwissCaseFolder ? currentPatient.getSwissMedplanTemplate( peek( self.employeeId ) ) : null,

                    // get all medications from the prescription table
                    medications = peek( self.prescriptionTable.rows ).map( function forEachPrescriptionTableRow( item ) {
                        return item.toJSON();
                    } ),
                    medicationsToCreate = medications,

                    // SWISS-ONLY: filter medications to be dispensed and get their PZNs
                    medicationsToDispense = peek( self.prescriptionTable.rows ).filter( function forEachPrescriptionTableRow( item ) {
                        return unwrap( item.dispensing );
                    } ).map( function forEachDispensedMedication( item ) {
                        return item.toJSON();
                    } ),
                    phPZNsToDispense = medicationsToDispense.map( function forEachMedicationToDispense( medication ) {
                        return unwrap( medication.phPZN );
                    } ),

                    // promise returned, depending on the underlying API call
                    creationPromise = Promise.resolve(),

                    // get an updated version of the current time, in case we want to create medications
                    currentTime = new Date(),
                    updatedCurrentTime = moment( peek( self.timestamp ) )
                        .set( 'hour', currentTime.getHours() )
                        .set( 'minute', currentTime.getMinutes() )
                        .set( 'second', currentTime.getSeconds() )
                        .toISOString(),

                    // basic API config with all required parameters (to be extended for the different API endpoints)
                    baseAPIData = {
                        employeeId: peek( self.employeeId ),
                        locationId: peek( self.locationId ),
                        patientId: peek( currentPatient._id ),
                        caseFolderId: peek( caseFolderActive._id ),
                        caseFolderType: peek( caseFolderActive.type ),
                        timestamp: peek( self.timestamp ),
                        print: print,
                        printerName: printerName || '',
                        numCopies: numCopies || 0,
                        taskData: self.taskData,
                        showDialog: showDialog || false,
                        quickPrintPrescription: quickPrintPrescription || false,
                        printActivities: self.printActivities,
                        isSwissAndSwissCaseFolder: self.isSwissAndSwissCaseFolder,
                        swissMedPlanTemplate: swissMedPlanTemplate
                    };

                // when the modal is used to edit an existing prescription, exit here
                if( self.editPrescriptionMode ) {
                    return self.saveEditedPrescription( print, printerName, numCopies, showDialog, quickPrintPrescription );
                }

                // if a KBV medication plan is available, populate it
                if( kbvMedicationPlan ) {
                    // populate the medication plan entries of the kbvMedicationPlan with the plain medication objects
                    kbvMedicationPlan.medicationPlanEntries = self.medicationPlanViewModel.medicationPlanEntries().map( function( medicationPlanEntry ) {
                        return medicationPlanEntry.toJSON();
                    } );
                }

                switch( true ) {

                    case savePrescriptionCkb && saveMedicationPlanCkb:
                        // create a prescription AND a medication plan
                        creationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.prescription.createPrescriptionsAndMedicationPlan( {
                            data: Object.assign( {}, baseAPIData, {
                                kbvMedicationPlan: kbvMedicationPlan,
                                prescriptionGroups: self.prescriptionGoups,
                                prescriptionData: self.getPrescriptionData()
                            } ),
                            waitCallback: medicationsToDispense.length > 0
                        } ) );
                        break;

                    case savePrescriptionCkb && !saveMedicationPlanCkb:
                        // create a prescription but NO medication plan

                        creationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.prescription.prescribeMedications( {
                            data: Object.assign( {}, baseAPIData, {
                                prescriptionGroups: self.prescriptionGoups,
                                prescriptionData: self.getPrescriptionData()
                            } ),
                            waitCallback: medicationsToDispense.length > 0
                        } ) );
                        break;

                    case !savePrescriptionCkb && saveMedicationPlanCkb:
                        // create NO prescription but create a medication plan

                        if( self.isSwissAndSwissCaseFolder ) {
                            // SWISS mode
                            creationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.activity.createMedicationPlanForMedications( {
                                data: Object.assign( {}, baseAPIData, {
                                    medications: medications
                                } ),
                                waitCallback: medicationsToDispense.length > 0,
                                includeMedicationsActivities: medicationsToDispense.length > 0
                            } ) );
                        } else {
                            // GERMAN mode: KBV medicationplan
                            creationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.activity.createKbvMedicationPlanForMedications( {
                                data: Object.assign( {}, baseAPIData, {
                                    kbvMedicationPlan: kbvMedicationPlan
                                } )
                            } ) );
                        }
                        break;

                    case !savePrescriptionCkb && !saveMedicationPlanCkb:
                        // create NO prescription and create NO medication plan === just create plain medications
                        if( self.isSwissAndSwissCaseFolder ) {
                            // in SWISS mode, the medications to be created are only those marked as "dispense"
                            medicationsToCreate = medicationsToDispense;
                        } else {
                            // in GERMAN mode, the medications are all selected, as there is no dispensing
                            medicationsToCreate = medications;

                        }
                        // update modal time with current time
                        self.timestamp( updatedCurrentTime );

                        if( medicationsToCreate.length > 0 ) {
                            creationPromise = Promise.resolve( Y.doccirrus.jsonrpc.api.activity.handleMedications( {
                                data: Object.assign( {}, baseAPIData, {
                                    medications: medicationsToCreate,
                                    timestamp: peek( self.timestamp )
                                } )
                            } ) );
                        }

                        break;
                }

                if( self.isSwissAndSwissCaseFolder && medData.length ) {
                    Y.doccirrus.jsonrpc.api.activity.createMedicationPlanFromDocumedis( {
                        data: Object.assign( {}, baseAPIData, {
                            medData: medData,
                            createOnlyMedData: true
                        } )
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                }

                return creationPromise
                    .then( function onCreationSubmitted( response ) {
                        var
                            createdMedications,
                            activitiesToDispense;

                        // in SWISS mode, open dispensing modal, if medications have been created
                        if( medicationsToDispense.length > 0 && response && response.data ) {
                            switch( true ) {
                                case Array.isArray( response.data.createdMedications ):
                                    // path through prescription creation
                                    createdMedications = response.data.createdMedications;
                                    break;
                                case Array.isArray( response.data.medicationActivities ):
                                    // path through medication plan creation
                                    createdMedications = response.data.medicationActivities;
                                    break;
                                case Array.isArray( response.data ):
                                    // path through plain medication creation
                                    createdMedications = response.data;
                                    break;
                            }
                            if( Array.isArray( createdMedications ) ) {
                                activitiesToDispense = createdMedications.filter( function( med ) {
                                    return phPZNsToDispense.indexOf( med.phPZN ) !== -1;
                                } );
                                self.showDispensingModal( activitiesToDispense );
                            }
                        }
                    } ).catch( function onCreationError( err ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    } );
            },
            showDispensingModal: function medicationPrescription_showDispensingModal( medicationActivities ) {
                var self = this,
                    binder = self.get( 'binder' ),
                    phPZNs = (medicationActivities || []).map( function( act ) {
                        return unwrap( act.phPZN );
                    } );

                Y.doccirrus.modals.dispensingModal.showDialog( {
                    phPZNs: phPZNs,
                    locationId: self.locationId(),
                    activities: medicationActivities || [],
                    currentUser: binder.getInitialData( 'currentUser' ),
                    callback: function( err ) {
                        if( !err ) {
                            KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.reload();
                        }
                    }
                } );
            },
            print: function( printerName, numCopies ) {
                var self = this;

                self.save( false, printerName, numCopies, true )
                    .then( function( data ) {
                        self.get( 'onPrint' )( null, data );
                    } )
                    .catch( function( error ) {
                        self.get( 'onPrint' )( error );
                    } );
            },
            initCatalogTable: function() {
                var self = this;
                if( !Y.doccirrus.auth.hasAdditionalService( 'inStock' ) || !self.isSwissAndSwissCaseFolder ) {
                    self.initCatalogUsageKoTable();
                } else {
                    self.initInStockTable();
                }
            },
            initCatalogUsageKoTable: function() {
                var
                    self = this,
                    baseParamsWithLocation = self.addDisposable( ko.computed( function() {
                        var locationId = unwrap( self.locationId );
                        return {
                            data: {
                                modelName: 'catalogusage',
                                matches: [
                                    {catalogShort: self.isSwissAndSwissCaseFolder ? 'HCI' : 'MMI', locationId: locationId}
                                ],
                                groupFields: ['seq']
                            },

                            fields: lodash.assign( {
                                seq: 1,
                                title: 1,
                                prdNo: 1
                            }, self.get( 'selectFields' ) )

                        };
                    } ) );
                self.catalogUsageKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-AddMedicationModal-catalogUsageTable',
                        states: ['limit'],
                        selectMode: 'none',
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getDistinct,
                        baseParams: baseParamsWithLocation,
                        limit: 5,
                        limitList: [5, 10, 20],
                        columns: [
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                forPropertyName: 'seq',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                forPropertyName: 'phNLabel',
                                width: "70%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                title: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                description: i18n( 'InCaseMojit.casefile_detail.title.FORM_OF_ADMINISTRATION' ) + ' (' + i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ) + ')',
                                forPropertyName: 'phForm',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'activity-schema.Medication_T.phSalesStatus.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phSalesStatus.i18n' ),
                                forPropertyName: 'phSalesStatus',
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list, '' );
                                }
                            },
                            {
                                label: i18n( 'activity-schema.Medication_T.phNormSize.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phNormSize.i18n' ),
                                forPropertyName: 'phNormSize',
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.types.PhNormSize_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.activity.types.PhNormSize_E.list, '' );
                                }
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                                forPropertyName: 'phPackSize',
                                width: '14%',
                                visible: false
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                forPropertyName: 'phIngr',
                                width: '14%',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    return (value || []).map( function( phIngrModel ) {
                                        return peek( phIngrModel.name );
                                    } ).join( ', ' );
                                }
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                forPropertyName: 'phIngr-strength',
                                width: '14%',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.row.phIngr );
                                    return (value || []).map( function( phIngrModel ) {
                                        return peek( phIngrModel.strength );
                                    } ).join( ', ' );
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            Y.doccirrus.schemas.activity._setActivityData( {
                                initData: {
                                    actType: 'MEDICATION',
                                    catalogShort: self.isSwiss ? 'HCI' : 'MMI',
                                    locationId: peek( self.locationId )
                                },
                                entry: row,
                                user: null
                            }, function( err, data ) {
                                if( err ) {
                                    Y.log( 'can never happen in client #0001' );
                                }
                                self.addMedication( data );
                            } );
                        }
                    }
                } );
            },
            initInStockTable: function() {
                var self = this;

                self.inStockTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-AddMedicationModal-InStockTable',
                        states: ['limit'],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWares,
                        limitList: [5, 10, 20, 30, 40, 50, 100],
                        responsive: false,
                        fillRowsToLimit: false,
                        baseParams: {
                            query: {$and: [{locationId: self.locationId}]}
                        },
                        columns: [
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'description',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                width: '30%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'stockLocation.title',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'quantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.currentStock' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.currentStock' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    return meta.value.toFixed( 2 );
                                }
                            },
                            {
                                forPropertyName: 'isDivisible',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                width: '10%',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    if( unwrap( meta.value ) ) {
                                        return TP;
                                    } else {
                                        return OP;
                                    }

                                }
                            },
                            {
                                forPropertyName: 'supplier.content',
                                label: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                title: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'gtinCode',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.GTIN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.GTIN' ),
                                isSortable: true,
                                isFilterable: true,
                                visible: false
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row,
                                hasVat = unwrap( meta.row.vat ) ? true : false;

                            Y.doccirrus.schemas.activity._setActivityData( {
                                initData: {
                                    actType: 'MEDICATION',
                                    catalogShort: self.isSwissAndSwissCaseFolder ? 'HCI' : 'MMI',
                                    locationId: peek( self.locationId )
                                },
                                entry: Object.assign( {
                                    seq: row.phPZN,
                                    phNLabel: row.description,
                                    phSalesStatus: row.phSalesStatus,
                                    prdNo: row.prdNo,
                                    phGTIN: unwrap( row.gtinCode ),
                                    hasVat: hasVat,
                                    count: unwrap( row.isDivisible ) ? unwrap( row.divisibleCount ) : 1,
                                    s_extra: {stockLocationId: row.stockLocationId}
                                }, row ),
                                user: null
                            }, function( err, data ) {
                                if( err ) {
                                    Y.log( 'can never happen in client #0001' );
                                }

                                if( !data.isDivisible ) { //TODO: remove when get wares will be always filled
                                    data.isDivisible = false;
                                }
                                self.addMedication( data );
                            } );
                        }
                    }

                } );

            },
            initPatientMedicationKoTable: function() {
                var
                    self = this,

                    currentPatient = self.get( 'currentPatient' );

                self.patientMedicationKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-AddMedicationModal-catalogUsageTable',
                        states: ['limit'],
                        selectMode: 'none',
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getDistinct,
                        baseParams: ko.computed( function() {
                            var binder = self.get( 'binder' ),
                                incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                                matches = [
                                    {patientId: peek( currentPatient._id )},
                                    {actType: 'MEDICATION'},
                                    {status: {$ne: 'LOCKED'}},
                                    {noLongerValid: {$ne: true}}
                                ],
                                locationId = unwrap( self.locationId );

                            if( incaseconfiguration && incaseconfiguration.documentMedicationPerLocation ) {
                                matches.push( {locationId: locationId} );
                            }
                            return {
                                data: {
                                    matches: matches,
                                    groupFields: ['code']
                                },

                                fields: lodash.assign( {
                                    code: 1,
                                    userContent: 1,
                                    catalogShort: 1,
                                    actType: 1,
                                    patImportId: 1,
                                    timestamp: 1,
                                    content: 1,
                                    prdNo: 1,
                                    employeeName: 1,
                                    phGTIN: 1
                                }, self.get( 'selectFields' ) )

                            };
                        } ),
                        limit: 5,
                        limitList: [5, 10, 20],
                        columns: [
                            {
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                forPropertyName: 'timestamp',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                direction: 'DESC',
                                renderer: function( meta ) {
                                    var
                                        result,
                                        timestamp = peek( meta.value );

                                    if( this && this.filterField ) {
                                        this.filterField.hasFocus( true );
                                    }

                                    if( timestamp ) {
                                        result = moment( timestamp ).format( TIMESTAMP_FORMAT );
                                    } else {
                                        result = '';
                                    }
                                    return setBG( meta, result );
                                }
                            },
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                forPropertyName: 'code',
                                width: "15%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                forPropertyName: 'phNLabel',
                                width: "55%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phContinuousMed',
                                title: i18n( 'activity-schema.Medication_T.phContinuousMed.i18n' ),
                                label: i18n( 'InCaseMojit.activity_schema.CONTINUOUS_MEDICATION' ),
                                description: i18n( 'activity-schema.Medication_T.phContinuousMed.i18n' ) + ' (' + i18n( 'InCaseMojit.activity_schema.CONTINUOUS_MEDICATION' ) + ')',
                                width: '12%',
                                renderer: function( meta ) {
                                    return meta.value ? YES : NO;
                                },
                                queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                                isFilterable: true,
                                filterField: {
                                    componentType: 'KoFieldSelect',
                                    options: [
                                        {val: true, i18n: YES}, {
                                            val: false,
                                            i18n: NO
                                        }].map( (function( item ) {
                                        return {val: item.val.toString(), i18n: item.i18n};
                                    }) ),
                                    optionsText: 'i18n',
                                    optionsValue: 'val',
                                    optionsCaption: ''
                                }
                            },
                            {
                                label: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                title: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                description: i18n( 'InCaseMojit.casefile_detail.title.FORM_OF_ADMINISTRATION' ) + ' (' + i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ) + ')',
                                forPropertyName: 'phForm',
                                width: "15%",
                                isSortable: true,
                                renderer: function( meta ) {
                                    return setBG( meta, peek( meta.value ) );
                                },
                                isFilterable: true
                            },
                            {
                                label: i18n( 'activity-schema.Medication_T.phSalesStatus.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phSalesStatus.i18n' ),
                                forPropertyName: 'phSalesStatus',
                                width: "15%",
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                visible: !ko.unwrap( self.isSwissAndSwissCaseFolder ),
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list, '' );
                                }
                            },
                            {
                                label: i18n( 'activity-schema.Medication_T.phNormSize.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phNormSize.i18n' ),
                                forPropertyName: 'phNormSize',
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.types.PhNormSize_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                visible: !ko.unwrap( self.isSwissAndSwissCaseFolder ),
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.activity.types.PhNormSize_E.list, '' );
                                }
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.PACK_SIZE' ),
                                forPropertyName: 'phPackSize',
                                width: '14%',
                                visible: false
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                forPropertyName: 'phIngr',
                                width: '14%',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    return (value || []).map( function( phIngrModel ) {
                                        return peek( phIngrModel.name );
                                    } ).join( ', ' );
                                }
                            },
                            {

                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                forPropertyName: 'phIngr-strength',
                                width: '14%',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.row.phIngr );
                                    return (value || []).map( function( phIngrModel ) {
                                        return peek( phIngrModel.strength );
                                    } ).join( ', ' );
                                }
                            },
                            {

                                label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                forPropertyName: 'employeeName',
                                visible: false,
                                width: "15%",
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.GTIN' ),
                                title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.GTIN' ),
                                forPropertyName: 'phGTIN',
                                width: "15%",
                                isSortable: true,
                                isFilterable: true,
                                visible: false
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            self.addMedication( row );
                        }

                    }
                } );
            },
            openPriceComparison: function( options ) {
                var self = this,
                    caseFolder = self.get( 'caseFolder' );
                options.caseFolderType = caseFolder && caseFolder.type;
                Y.doccirrus.modals.MedicationPriceComparison.show( options );
            },
            toJSON: function() {
                return {};
            }
        }, {
            NAME: 'ViewModel',
            ATTRS: {
                binder: {
                    value: null,
                    lazyAdd: false
                },
                currentPatient: {
                    value: null,
                    lazyAdd: false
                },
                defaultMappings: {
                    value: null,
                    lazyAdd: false
                },
                modal: {
                    value: null,
                    lazyAdd: false
                },
                locationId: {
                    value: null,
                    lazyAdd: false
                },
                employeeId: {
                    value: null,
                    lazyAdd: false
                },
                caseFolder: {
                    value: {},
                    lazyAdd: false
                },
                onSave: {
                    valueFn: function() {
                    },
                    lazyAdd: false
                },
                onPrint: {
                    valueFn: function() {
                    },
                    lazyAdd: false
                },
                onPrintTask: {
                    valueFn: function() {
                    },
                    lazyAdd: false
                },
                preselectedMedications: {
                    value: [],
                    lazyAdd: false
                },
                preselectedPrescription: {
                    value: {},
                    lazyAdd: false
                },
                activitySettings: {
                    value: [],
                    lazyAdd: false
                },
                swissCaseFolder: {
                    value: [],
                    lazyAdd: false
                },
                swissPreselectedMedications: {
                    value: [],
                    lazyAdd: false
                },
                swissMedPlans: {
                    value: [],
                    lazyAdd: false
                },
                swissMedications: {
                    value: [],
                    lazyAdd: false
                },
                swissMedicationPlan: {
                    value: [],
                    lazyAdd: false
                },
                medicationFields: {
                    value: Object.keys( Y.doccirrus.schemas.activity.types.Medication_T ),
                    lazyAdd: false
                },
                swissMedPlanTemplate: {
                    value: {},
                    lazyAdd: false
                },
                editPrescriptionMode: {
                    value: false,
                    lazyAdd: false
                },
                selectFields: {
                    valueFn: function() {
                        var
                            medicationFields = this.get( 'medicationFields' );
                        return medicationFields.reduce( function( obj, key ) {
                            obj[key] = 1;
                            return obj;
                        }, {} );
                    },
                    lazyAdd: false
                }
            }
        } );    //  end ViewModel

        function AddMedicationModal() {
        }

        function formatFloatNumber( number ) {
            return number.toFixed( 2 ).replace( /\.00$/, '' ).replace( '.', ',' );
        }

        AddMedicationModal.prototype.show = function( config ) {
            var template,
                currentPatient = peek( config && config.currentPatient ) || {},
                latestMedData = [];

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/medicationplan_prescription_modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( response ) {
                    template = response;
                    var _id = peek( currentPatient._id );

                    if( _id ) {
                        return Y.doccirrus.jsonrpc.api.meddata.getLatestMeddataForPatient( {
                            noBlocking: true,
                            patientId: _id
                        } );
                    } else {
                        Promise.resolve();
                    }
                } )
                .then( function( response ) {
                    if( response && response.data ) {
                        currentPatient.latestMedData( response.data );
                        latestMedData = response.data;
                    }
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            viewModel,
                            title = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MODAL_TITLE' ),
                            height, weight,
                            heightStr, weightStr, bmiStr,
                            heightUnit, weightUnit,
                            patientName = [peek( currentPatient.firstname ), peek( currentPatient.lastname )].filter(
                                function( name ) {
                                    return Boolean( name );
                                }
                            ).join( ' ' );

                        latestMedData.forEach( function( data ) {
                            switch( peek( data.type ) ) {
                                case 'HEIGHT':
                                    height = parseFloat( peek( data.value ) );
                                    heightUnit = peek( data.unit );
                                    break;
                                case 'WEIGHT':
                                    weight = parseFloat( peek( data.value ) );
                                    weightUnit = peek( data.unit );
                                    break;
                            }
                        } );

                        if( height && weight && patientName ) {
                            bmiStr = formatFloatNumber( weight / (height * height) );
                            heightStr = formatFloatNumber( height );
                            weightStr = formatFloatNumber( weight );
                            title = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MODAL_TITLE_MEDDATA', {
                                data: {
                                    patientName: patientName,
                                    height: heightStr,
                                    heightUnit: heightUnit,
                                    weight: weightStr,
                                    weightUnit: weightUnit,
                                    bmi: bmiStr
                                }
                            } );
                        }

                        modal = new Y.doccirrus.DCWindow( {
                            id: 'addMedicationModal',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: title,
                            width: '95%',
                            height: '90%',
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            viewModel.save()
                                                .then( function() {
                                                    modal.close();
                                                    resolve();
                                                } )
                                                .catch( function( error ) {
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                } );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    viewModel.destroy();
                                }
                            }
                        } );

                        viewModel = new ViewModel( {
                            currentPatient: config.currentPatient,
                            defaultMappings: config.defaultMappings,
                            preselectedMedications: config.preselectedMedications,
                            preselectedPrescription: config.preselectedPrescription,
                            activitySettings: config.activitySettings,
                            binder: config.binder,
                            modal: modal,
                            locationId: config.locationId,
                            employeeId: config.employeeId,
                            caseFolder: config.caseFolder,
                            swissCaseFolder: config.swissCaseFolder,
                            editPrescriptionMode: config.editPrescriptionMode,
                            swissPreselectedMedications: config.swissPreselectedMedications,
                            swissMedPlans: config.swissMedPlans,
                            swissMedications: config.swissMedications,
                            swissMedicationPlan: config.swissMedicationPlan,
                            onSave: function() {
                                resolve();
                                modal.close();
                            },
                            onPrintTask: function( data, error ) {
                                resolve();
                                modal.close();
                                if( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                }
                            },
                            onPrint: function( data, error ) {
                                modal.close();
                                resolve();
                                if( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                }
                            }

                        } );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( viewModel, bodyContent.getDOMNode() );

                        viewModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( viewModel.isValid ),
                                okBtn = modal.getButton( 'SAVE' ).button;
                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                    } );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).medicationPlanPrescription = new AddMedicationModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoUI-all',
            'KoViewModel',
            'KoButton',
            'KoEditableTable',
            'dcmedicationmodal',
            'v_medication-schema',
            'dcforms-schema-InCase-T',
            'printmultiplemodal',
            'casefolder-schema',
            'dcforms-roles',
            'MMISearchButton'
        ]
    }
);