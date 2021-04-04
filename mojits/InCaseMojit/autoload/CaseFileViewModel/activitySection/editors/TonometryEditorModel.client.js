/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, jQuery */

'use strict';

YUI.add( 'TonometryEditorModel', function( Y ) {
        /**
         * @module TonometryEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n;

        /**
         * @class OtAppliedSetEditorModel
         * @constructor
         * @extend SubEditorModel
         */
        function OtAppliedSetEditorModel( config ) {
            OtAppliedSetEditorModel.superclass.constructor.call( this, config );
        }

        OtAppliedSetEditorModel.ATTRS = {
            whiteList: {
                value: ['otAppliedAtL', 'otAppliedAtR', 'otAppliedContentR', 'otAppliedContentL']
            }
        };

        Y.extend( OtAppliedSetEditorModel, SubEditorModel, {

            initializer: function() {
                var
                    self = this;
                self.initOphthalmologyOtAppliedSetEditorModel();
            },
            destructor: function() {

            },
            _openMedicationSearchEnableAppliedContentL: null,
            _openMedicationSearchEnableAppliedContentR: null,
            initOphthalmologyOtAppliedSetEditorModel: function() {
                var
                    self = this,
                    editorModelParent = self.get( 'editorModelParent' );

                self._openMedicationSearchEnableAppliedContentL = ko.computed( function() {
                    var
                        _openMedicationSearchEnable = unwrap( editorModelParent._openMedicationSearchEnable ),
                        notReadOnly = !unwrap( self.otAppliedContentL.readOnly );

                    return _openMedicationSearchEnable && notReadOnly;
                } );
                self._openMedicationSearchEnableAppliedContentR = ko.computed( function() {
                    var
                        _openMedicationSearchEnable = unwrap( editorModelParent._openMedicationSearchEnable ),
                        notReadOnly = !unwrap( self.otAppliedContentR.readOnly );

                    return _openMedicationSearchEnable && notReadOnly;
                } );
            },
            /**
             * click handler for passing otAppliedSet 'L' values to 'R' values and vice versa
             * @method takeoverValues
             */
            takeoverValues: function() {
                var
                    self = this,
                    otAppliedAtL = peek( self.otAppliedAtL ),
                    otAppliedAtR = peek( self.otAppliedAtR ),
                    otAppliedContentL = peek( self.otAppliedContentL ),
                    otAppliedContentR = peek( self.otAppliedContentR );

                if( !(otAppliedAtL && otAppliedAtR) && otAppliedAtL !== otAppliedAtR ) {
                    if( otAppliedAtL && !otAppliedAtR ) {
                        self.otAppliedAtR( otAppliedAtL );
                    }
                    else if( !otAppliedAtL && otAppliedAtR ) {
                        self.otAppliedAtL( otAppliedAtR );
                    }
                }

                if( !(otAppliedContentL && otAppliedContentR) && otAppliedContentL !== otAppliedContentR ) {
                    if( otAppliedContentL && !otAppliedContentR ) {
                        self.otAppliedContentR( otAppliedContentL );
                    }
                    else if( !otAppliedContentL && otAppliedContentR ) {
                        self.otAppliedContentL( otAppliedContentR );
                    }
                }

            },
            _openMedicationSearch: function( forField ) {
                var
                    self = this,
                    editorModelParent = self.get( 'editorModelParent' ),
                    binder = editorModelParent.get( 'binder' ),
                    defaultMappings = editorModelParent._defaultMappings(),
                    currentActivity = peek( editorModelParent.get( 'currentActivity' ) ),
                    currentPatient = peek( editorModelParent.get( 'currentPatient' ) ),
                    dependentActivityFields;

                if( defaultMappings && defaultMappings.error ) {
                    Y.doccirrus.DCWindow.dialog( {
                        type: 'error',
                        window: {
                            width: 'large'
                        },
                        message: defaultMappings.error.data
                    } );

                    return;
                }

                dependentActivityFields = {
                    locationId: currentActivity.locationId,
                    employeeId: currentActivity.employeeId,
                    _locationList: binder.getInitialData( 'location' )
                };

                Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                        activity: dependentActivityFields,
                        patient: currentPatient
                    }, function( err, selected ) {
                        if( err ) {
                            return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        }

                        if( selected && selected.package && selected.package.originalData && selected.product && selected.product.originalData ) {
                            forField( selected.product.originalData.title );
                        }
                    }
                );
            },
            _openMedicationSearchAppliedContentL: function() {
                var
                    self = this;

                self._openMedicationSearch( self.otAppliedContentL );
            },
            _openMedicationSearchAppliedContentR: function() {
                var
                    self = this;

                self._openMedicationSearch( self.otAppliedContentR );
            }
        }, {
            NAME: 'OtAppliedSetEditorModel'
        } );

        KoViewModel.registerConstructor( OtAppliedSetEditorModel );

        /**
         * @class TonometryEditorModel
         * @constructor
         * @extends OphthalmologyEditorModel
         */
        function TonometryEditorModel( config ) {
            TonometryEditorModel.superclass.constructor.call( this, config );
        }

        TonometryEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'otNCCTL',
                    'otNCCTR',
                    'otNFacL',
                    'otNFacR',
                    'otNR1',
                    'otNL1',
                    'otNR2',
                    'otNL2',
                    'otNR3',
                    'otNL3',
                    'otNR4',
                    'otNL4',
                    'otPR1',
                    'otPL1',
                    'otPR2',
                    'otPL2',
                    'otPR3',
                    'otPL3',
                    'otPR4',
                    'otPL4',
                    'otGR1',
                    'otGL1',
                    'otGR2',
                    'otGL2',
                    'otIR1',
                    'otIL1',
                    'otIR2',
                    'otIL2',
                    'otNRead',
                    'otPRead',
                    'otGRead',
                    'otIRead',
                    'comment'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'otAppliedSet',
                        editorName: 'OtAppliedSetEditorModel'
                    }
                ],
                lazyAdd: false
            },
            tonometrySections: {
                value: Y.doccirrus.schemas.activity.utilsOphthalmology.getOphthalmologyTonometrySections(),
                lazyAdd: false
            }
        };

        Y.extend( TonometryEditorModel, KoViewModel.getConstructor( 'OphthalmologyEditorModel' ), {
                initializer: function TonometryEditorModel_initializer() {
                    var
                        self = this;
                    self.initTonometryEditorModel();
                    self.initMMI();
                },
                destructor: function TonometryEditorModel_destructor() {
                    var
                        self = this;

                    self.destroyMultiplePanelCollapse();
                },
                initTonometryEditorModel: function TonometryEditorModel_initTonometryEditorModel() {
                    var
                        self = this,
                        OPHTHALMOLOGY = self.get( 'OPHTHALMOLOGY' ),

                        DATE_TIME_FORMAT = OPHTHALMOLOGY.DATE_TIME_FORMAT,
                        aDeviceReader = self.getDeviceReader(),
                        aDeviceReaderTypes = aDeviceReader.getTypes(),
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    self.editorLabelI18n = i18n( 'InCaseMojit.sd_ophthalmology_tonometry.EDITOR_LABEL' );
                    self.eyeRightLabelI18n = i18n( 'InCaseMojit.sd_ophthalmology_tonometry.eye_right.LABEL' );
                    self.eyeLeftLabelI18n = i18n( 'InCaseMojit.sd_ophthalmology_tonometry.eye_left.LABEL' );
                    self.groupNCTI18n = i18n( 'InCaseMojit.casefile_detail.group.NCT' );
                    self.otNR1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNR1.unit' );
                    self.otNR2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNR2.unit' );
                    self.otNR3UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNR3.unit' );
                    self.otNR4UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNR4.unit' );
                    self.otNCCTRUnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNCCTR.unit' );
                    self.otNFacRUnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNFacR.unit' );
                    self.readFromI18n = i18n( 'InCaseMojit.casefile_detail.button.READ_FROM' );
                    self.otNReadDateI18n = i18n( 'InCaseMojit.casefile_detail.placeholder._otNRead_date' );
                    self.otNL1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNL1.unit' );
                    self.otNL2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNL2.unit' );
                    self.otNL3UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNL3.unit' );
                    self.otNL4UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNL4.unit' );
                    self.otNCCTLUnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNCCTL.unit' );
                    self.otNFacLUnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otNFacL.unit' );
                    self.groupPascalI18n = i18n( 'InCaseMojit.casefile_detail.group.PASCAL' );
                    self.otPR1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPR1.unit' );
                    self.otPR2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPR2.unit' );
                    self.otPR3UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPR3.unit' );
                    self.otPR4UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPR4.unit' );
                    self.otPL1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPL1.unit' );
                    self.otPL2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPL2.unit' );
                    self.otPL3UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPL3.unit' );
                    self.otPL4UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otPL4.unit' );
                    self.groupGoldManI18n = i18n( 'InCaseMojit.casefile_detail.group.GOLDMANN' );
                    self.otGR1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otGR1.unit' );
                    self.otGR2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otGR2.unit' );
                    self.otGL1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otGL1.unit' );
                    self.otGL2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otGL2.unit' );
                    self.groupInCareI18n = i18n( 'InCaseMojit.casefile_detail.group.ICARE' );
                    self.otIR1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otIR1.unit' );
                    self.otIR2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otIR2.unit' );
                    self.otIL1UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otIL1.unit' );
                    self.otIL2UnitI18n = i18n( 'activity-schema.OphthalmologyTonometry_T.otIL2.unit' );
                    self.groupCommentI18n = i18n( 'InCaseMojit.casefile_detail.group.COMMENT' );
                    self.placeholderCommentI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.COMMENT' );
                    self.administratedI18n = i18n( 'InCaseMojit.casefile_detail.label.ADMINISTERED' );
                    self.openMedicationSearchI18n = i18n( 'InCaseMojit.casefile_detail.button.OPEN_MEDICATION_SEARCH' );
                    self.copyOverEqualityI18n = i18n( 'InCaseMojit.casefile_detail.button.COPY_OVER_EQUALLY' );
                    self.deleteEntryI18n = i18n( 'InCaseMojit.casefile_detail.button.DELETE_ENTRY' );

                    self.addOtAppliedSet = function() {
                        currentActivity.addOtAppliedSet();
                    };
                    self.removeOtAppliedSet = function( data ) {
                        currentActivity.removeOtAppliedSet( data.get( 'dataModelParent' ) );
                    };
                    // Tonometry:nct
                    self.otNDevices = ko.observableArray();
                    self.otNDevice = ko.observable();
                    // Tonometry:pascal
                    self.otPDevices = ko.observableArray();
                    self.otPDevice = ko.observable();
                    // Tonometry:goldmann
                    self.otGDevices = ko.observableArray();
                    self.otGDevice = ko.observable();
                    // Tonometry:iCare
                    self.otIDevices = ko.observableArray();
                    self.otIDevice = ko.observable();

                    // load devices
                    self.addDisposable( ko.computed( function() {

                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.NCT} )
                            .done( function( data ) {
                                self.otNDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );
                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.PASCAL} )
                            .done( function( data ) {
                                self.otPDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );
                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.GOLDMANN} )
                            .done( function( data ) {
                                self.otGDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );
                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.ICARE} )
                            .done( function( data ) {
                                self.otIDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );

                    } ) );

                    // device actions
                    self.otNDeviceRead = function() {
                        var
                            id = self.otNDevice();

                        self.otNDeviceRead.pending( true );

                        aDeviceReader
                            .readDataFromDeviceId( {id: id} )
                            .always( function() {
                                self.otNDeviceRead.pending( false );
                            } )
                            .done( function( response ) {
                                self.setOphthalmologyData( response );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self.otNDeviceRead.pending = ko.observable( false );
                    self.otNDeviceEnabled = ko.computed( function() {
                        var
                            list = self.otNDevices();

                        if( self.otNRead.readOnly() ) {
                            return false;
                        }

                        if( self.otNDeviceRead.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );
                    self.otPDeviceRead = function() {
                        var
                            id = self.otPDevice();

                        self.otPDeviceRead.pending( true );

                        aDeviceReader
                            .readDataFromDeviceId( {id: id} )
                            .always( function() {
                                self.otPDeviceRead.pending( false );
                            } )
                            .done( function( response ) {
                                self.setOphthalmologyData( response );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self.otPDeviceRead.pending = ko.observable( false );
                    self.otPDeviceEnabled = ko.computed( function() {
                        var
                            list = self.otPDevices();

                        if( self.otPRead.readOnly() ) {
                            return false;
                        }

                        if( self.otPDeviceRead.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );
                    self.otGDeviceRead = function() {
                        var
                            id = self.otGDevice();

                        self.otGDeviceRead.pending( true );

                        aDeviceReader
                            .readDataFromDeviceId( {id: id} )
                            .always( function() {
                                self.otGDeviceRead.pending( false );
                            } )
                            .done( function( response ) {
                                self.setOphthalmologyData( response );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self.otGDeviceRead.pending = ko.observable( false );
                    self.otGDeviceEnabled = ko.computed( function() {
                        var
                            list = self.otGDevices();

                        if( self.otGRead.readOnly() ) {
                            return false;
                        }

                        if( self.otGDeviceRead.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );
                    self.otIDeviceRead = function() {
                        var
                            id = self.otIDevice();

                        self.otIDeviceRead.pending( true );

                        aDeviceReader
                            .readDataFromDeviceId( {id: id} )
                            .always( function() {
                                self.otIDeviceRead.pending( false );
                            } )
                            .done( function( response ) {
                                self.setOphthalmologyData( response );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self.otIDeviceRead.pending = ko.observable( false );
                    self.otIDeviceEnabled = ko.computed( function() {
                        var
                            list = self.otIDevices();

                        if( self.otIRead.readOnly() ) {
                            return false;
                        }

                        if( self.otIDeviceRead.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );

                    // computed for 'otNRead' date display
                    self._otNRead = ko.computed( function() {
                        var
                            otNRead = self.otNRead();

                        if( otNRead ) {
                            return moment( otNRead ).format( DATE_TIME_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    // computed for 'otPRead' date display
                    self._otPRead = ko.computed( function() {
                        var
                            otPRead = self.otPRead();

                        if( otPRead ) {
                            return moment( otPRead ).format( DATE_TIME_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    // computed for 'otGRead' date display
                    self._otGRead = ko.computed( function() {
                        var
                            otGRead = self.otGRead();

                        if( otGRead ) {
                            return moment( otGRead ).format( DATE_TIME_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    // computed for 'otIRead' date display
                    self._otIRead = ko.computed( function() {
                        var
                            otIRead = self.otIRead();

                        if( otIRead ) {
                            return moment( otIRead ).format( DATE_TIME_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    // create computed for numbers
                    self._otNCCTL = self.createComputedFromFieldConfiguration( {fieldName: 'otNCCTL'} );
                    self._otNCCTR = self.createComputedFromFieldConfiguration( {fieldName: 'otNCCTR'} );
                    self._otNFacL = self.createComputedFromFieldConfiguration( {fieldName: 'otNFacL'} );
                    self._otNFacR = self.createComputedFromFieldConfiguration( {fieldName: 'otNFacR'} );
                    self._otNR1 = self.createComputedFromFieldConfiguration( {fieldName: 'otNR1'} );
                    self._otNL1 = self.createComputedFromFieldConfiguration( {fieldName: 'otNL1'} );
                    self._otNR2 = self.createComputedFromFieldConfiguration( {fieldName: 'otNR2'} );
                    self._otNL2 = self.createComputedFromFieldConfiguration( {fieldName: 'otNL2'} );
                    self._otNR3 = self.createComputedFromFieldConfiguration( {fieldName: 'otNR3'} );
                    self._otNL3 = self.createComputedFromFieldConfiguration( {fieldName: 'otNL3'} );
                    self._otNR4 = self.createComputedFromFieldConfiguration( {fieldName: 'otNR4'} );
                    self._otNL4 = self.createComputedFromFieldConfiguration( {fieldName: 'otNL4'} );
                    self._otPR1 = self.createComputedFromFieldConfiguration( {fieldName: 'otPR1'} );
                    self._otPL1 = self.createComputedFromFieldConfiguration( {fieldName: 'otPL1'} );
                    self._otPR2 = self.createComputedFromFieldConfiguration( {fieldName: 'otPR2'} );
                    self._otPL2 = self.createComputedFromFieldConfiguration( {fieldName: 'otPL2'} );
                    self._otPR3 = self.createComputedFromFieldConfiguration( {fieldName: 'otPR3'} );
                    self._otPL3 = self.createComputedFromFieldConfiguration( {fieldName: 'otPL3'} );
                    self._otPR4 = self.createComputedFromFieldConfiguration( {fieldName: 'otPR4'} );
                    self._otPL4 = self.createComputedFromFieldConfiguration( {fieldName: 'otPL4'} );
                    self._otGR1 = self.createComputedFromFieldConfiguration( {fieldName: 'otGR1'} );
                    self._otGL1 = self.createComputedFromFieldConfiguration( {fieldName: 'otGL1'} );
                    self._otGR2 = self.createComputedFromFieldConfiguration( {fieldName: 'otGR2'} );
                    self._otGL2 = self.createComputedFromFieldConfiguration( {fieldName: 'otGL2'} );
                    self._otIR1 = self.createComputedFromFieldConfiguration( {fieldName: 'otIR1'} );
                    self._otIL1 = self.createComputedFromFieldConfiguration( {fieldName: 'otIL1'} );
                    self._otIR2 = self.createComputedFromFieldConfiguration( {fieldName: 'otIR2'} );
                    self._otIL2 = self.createComputedFromFieldConfiguration( {fieldName: 'otIL2'} );

                    self.comment.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

                },
            /**
             * jQuery Elements that receive event listeners
             * @private
             */
            _$MultiplePanelCollapseEventElements: null,
            /**
             * initializes toggleMultiplePanelCollapse on those nodes
             * @param node
             */
            initMultiplePanelCollapse: function initMultiplePanelCollapse( node ) {
                var
                    self = this,
                    $MultiplePanelCollapseEventElements = self._$MultiplePanelCollapseEventElements = jQuery(
                        node.querySelectorAll( [
                            '#textform-sd_ophthalmology_tonometry-row-nct',
                            '#textform-sd_ophthalmology_tonometry-row-pascal',
                            '#textform-sd_ophthalmology_tonometry-row-goldmann',
                            '#textform-sd_ophthalmology_tonometry-row-icare'
                        ].join( ', ' ) )
                    );

                // attach jQuery event listeners to those bootstrap collapse events
                $MultiplePanelCollapseEventElements.on(
                    [
                        'show.bs.collapse.initMultiplePanelCollapse',
                        'hide.bs.collapse.initMultiplePanelCollapse',
                        'shown.bs.collapse.initMultiplePanelCollapse',
                        'hidden.bs.collapse.initMultiplePanelCollapse'
                    ].join( ' ' ),
                    Y.bind( self.toggleMultiplePanelCollapse, self )
                );

            },
            destroyMultiplePanelCollapse: function() {
                var
                    self = this,
                    $MultiplePanelCollapseEventElements = self._$MultiplePanelCollapseEventElements;

                if( $MultiplePanelCollapseEventElements ) {
                    // attach jQuery event listeners to those bootstrap collapse events
                    $MultiplePanelCollapseEventElements.off(
                        [
                            'show.bs.collapse.initMultiplePanelCollapse',
                            'hide.bs.collapse.initMultiplePanelCollapse',
                            'shown.bs.collapse.initMultiplePanelCollapse',
                            'hidden.bs.collapse.initMultiplePanelCollapse'
                        ].join( ' ' )
                    );
                }
            },
            /**
             * jQuery event callback for toggling multiple bootstrap panel collapse in a container
             * @param $event
             */
            toggleMultiplePanelCollapse: function toggleMultiplePanelCollapse( $event ) {
                var
                    self = this,
                    type = $event.type,
                    currentTarget = $event.currentTarget,
                    $currentTarget = jQuery( currentTarget ),
                    target = $event.target,
                    $target = jQuery( target ),
                    $others = $currentTarget.find( '.panel-collapse' ).not( target );

                if( 'show' === type || 'hide' === type ) {

                    // prevent event recursion by storing a flag
                    if( $target.data( 'collapse-toggled' ) ) {
                        return;
                    }

                    $target.data( 'collapse-toggled', true );
                    $others.data( 'collapse-toggled', true );

                    if( 'show' === type ) {
                        $others.collapse( 'show' );
                        self.toggleOtherRowsAccordion( currentTarget );
                    } else {
                        $others.collapse( 'hide' );
                    }

                } else {

                    $target.data( 'collapse-toggled', false );

                }

            },
            /**
             * Collapse other row panels like accordion
             * @param {HTMLElement} currentTarget the row not not to collapse
             */
            toggleOtherRowsAccordion: function toggleOtherRowsAccordion( currentTarget ) {
                var
                    self = this,
                    $MultiplePanelCollapseEventElements = self._$MultiplePanelCollapseEventElements,
                    $otherRows = $MultiplePanelCollapseEventElements.not( currentTarget ),
                    $otherCollapses = $otherRows.find( '.panel-collapse' ),
                    $shownCollapses = $otherCollapses.filter( function() {
                        return this.classList.contains( 'in' );
                    } );

                $shownCollapses.data( 'collapse-toggled', true );
                $shownCollapses.collapse( 'hide' );
            },
            /**
             * when tonometry or refraction have a comment then that field should be visualized open
             */
            initCommentShouldBeOpen: function( node ) {
                var
                    self = this,
                    comment = peek( self.comment );

                if( comment && !node.classList.contains( 'in' ) ) {
                    jQuery( node ).collapse( 'show' );
                }
            },
            /**
             * For the unlikely case, that entries are in more than one section, reopening the mask should have all sections with entries open. Open a new activity should have the configured default open.
             */
            handleUnlikelyCaseNct: function( node ) {
                var
                    self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    hasSomething;

                if( currentActivity.isNew() ) {
                    return;
                }

                hasSomething = self.get( 'tonometrySections' ).nct.some( function( name ) {
                    return Boolean( peek( currentActivity[name] ) );
                } );

                if( node.classList.contains( 'in' ) ) {
                    if( !hasSomething ) {
                        node.classList.remove( 'in' );
                    }
                }
                else {
                    if( hasSomething ) {
                        node.classList.add( 'in' );
                    }
                }

            },
            /**
             * For the unlikely case, that entries are in more than one section, reopening the mask should have all sections with entries open. Open a new activity should have the configured default open.
             */
            handleUnlikelyCasePascal: function( node ) {
                var
                    self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    hasSomething;

                if( currentActivity.isNew() ) {
                    return;
                }

                hasSomething = self.get( 'tonometrySections' ).pascal.some( function( name ) {
                    return Boolean( peek( currentActivity[name] ) );
                } );

                if( node.classList.contains( 'in' ) ) {
                    if( !hasSomething ) {
                        node.classList.remove( 'in' );
                    }
                }
                else {
                    if( hasSomething ) {
                        node.classList.add( 'in' );
                    }
                }

            },
            /**
             * For the unlikely case, that entries are in more than one section, reopening the mask should have all sections with entries open. Open a new activity should have the configured default open.
             */
            handleUnlikelyCaseGoldmann: function( node ) {
                var
                    self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    hasSomething;

                if( currentActivity.isNew() ) {
                    return;
                }

                hasSomething = self.get( 'tonometrySections' ).goldmann.some( function( name ) {
                    return Boolean( peek( currentActivity[name] ) );
                } );

                if( node.classList.contains( 'in' ) ) {
                    if( !hasSomething ) {
                        node.classList.remove( 'in' );
                    }
                }
                else {
                    if( hasSomething ) {
                        node.classList.add( 'in' );
                    }
                }

            },
            /**
             * For the unlikely case, that entries are in more than one section, reopening the mask should have all sections with entries open. Open a new activity should have the configured default open.
             */
            handleUnlikelyCaseIcare: function( node ) {
                var
                    self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    hasSomething;

                if( currentActivity.isNew() ) {
                    return;
                }

                hasSomething = self.get( 'tonometrySections' ).icare.some( function( name ) {
                    return Boolean( peek( currentActivity[name] ) );
                } );

                if( node.classList.contains( 'in' ) ) {
                    if( !hasSomething ) {
                        node.classList.remove( 'in' );
                    }
                }
                else {
                    if( hasSomething ) {
                        node.classList.add( 'in' );
                    }
                }

            },
            _defaultMappings: null,
            _openMedicationSearchEnable: ko.observable( false ),
            initMMI: function() {
                var
                    self = this;

                self._defaultMappings = ko.observable( null );

                ko.computed( function() {
                    self._openMedicationSearchEnable( Boolean( unwrap( self._defaultMappings ) && Y.doccirrus.auth.hasAdditionalService( "inScribe" ) ) );
                } );
                
                Y.doccirrus.jsonrpc.api.mmi
                    .getMappingCatalogEntries( {query: {catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']}} )
                    .done( function( response ) {
                        self._defaultMappings( response.data );
                    } );
            }
            }, {
                NAME: 'TonometryEditorModel'
            }
        );
        KoViewModel.registerConstructor( TonometryEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SubEditorModel',
            'OphthalmologyEditorModel',
            'dcmedicationmodal',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
)
;
