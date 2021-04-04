/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, jQuery */

'use strict';

YUI.add( 'RefractionEditorModel', function( Y ) {
        /**
         * @module RefractionEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n;

        /**
         * @class RefractionEditorModel
         * @constructor
         * @extends OphthalmologyEditorModel
         */
        function RefractionEditorModel( config ) {
            RefractionEditorModel.superclass.constructor.call( this, config );
        }

        RefractionEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'orSphL',
                    'orSphR',
                    'orCylL',
                    'orCylR',
                    'orAxsL',
                    'orAxsR',
                    'orAddL',
                    'orAddR',
                    'orPsmL',
                    'orPsmR',
                    'orAdd2L',
                    'orAdd2R',
                    'orFarL',
                    'orFarR',
                    'orFarB',
                    'orNearL',
                    'orNearR',
                    'orNearB',
                    'orPD',
                    'orHSA',
                    'orRead',
                    'orType',
                    'orBasR',
                    'orBasL',
                    'orVisAcuTyp',
                    'comment'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( RefractionEditorModel, KoViewModel.getConstructor( 'OphthalmologyEditorModel' ), {
                initializer: function RefractionEditorModel_initializer() {
                    var
                        self = this;
                    self.initRefractionEditorModel();

                },
                destructor: function RefractionEditorModel_destructor() {
                },
                initRefractionEditorModel: function RefractionEditorModel_initRefractionEditorModel() {
                    var
                        self = this,
                        OPHTHALMOLOGY = self.get( 'OPHTHALMOLOGY' ),

                        DATE_TIME_FORMAT = OPHTHALMOLOGY.DATE_TIME_FORMAT,
                        aDeviceReader = self.getDeviceReader(),
                        aDeviceReaderTypes = aDeviceReader.getTypes();

                    self.refractionI18n = i18n( 'InCaseMojit.casefile_detail.title.REFRACTION' );
                    self.rightEyeI18n = i18n( 'InCaseMojit.casefile_detail.label.RIGHT_EYE' );
                    self.leftEyeI18n = i18n( 'InCaseMojit.casefile_detail.label.LEFT_EYE' );
                    self.orSphRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orSphR.placeholder' );
                    self.orSphRUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orSphR.unit' );
                    self.orCylRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orCylR.placeholder' );
                    self.orCylRUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orCylR.unit' );
                    self.orAxsRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAxsR.placeholder' );
                    self.orAxsRUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAxsR.unit' );
                    self.orAddRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAddR.placeholder' );
                    self.orAddRUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAddR.unit' );
                    self.orPsmRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPsmR.placeholder' );
                    self.orPsmRUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPsmR.unit' );
                    self.orBasRLabelI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orBasR.label' );
                    self.orAdd2RPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAdd2R.placeholder' );
                    self.orAdd2RUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAdd2R.unit' );
                    self.orTypeLabelI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orType.label' );
                    self.readFromI18n = i18n( 'InCaseMojit.casefile_detail.label.READ_FROM' );
                    self.orReadDateI18n = i18n( 'InCaseMojit.casefile_detail.placeholder._orRead_date' );
                    self.lastReadOnI18n = i18n( 'InCaseMojit.casefile_detail.label.LAST_READ_ON' );
                    self.writeToI18n = i18n( 'InCaseMojit.casefile_detail.button.WRITE_TO' );
                    self.orSphLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orSphL.placeholder' );
                    self.orSphLUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orSphL.unit' );
                    self.orCylLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orCylL.placeholder' );
                    self.orCylLUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orCylL.unit' );
                    self.orAxsLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAxsL.placeholder' );
                    self.orAxsLUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAxsL.unit' );
                    self.orAddLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAddL.placeholder' );
                    self.orAddLUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAddL.unit' );
                    self.orPsmLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPsmL.placeholder' );
                    self.orPsmLUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPsmL.unit' );
                    self.orBasLLabelI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orBasL.label' );
                    self.orAdd2LPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAdd2L.placeholder' );
                    self.orAdd2LUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orAdd2L.unit' );
                    self.orVisAcuTypLabelI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orVisAcuTyp.label' );
                    self.orFarRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orFarR.placeholder' );
                    self.orNearRPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orNearR.placeholder' );
                    self.orFarBPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orFarB.placeholder' );
                    self.orNearBPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orNearB.placeholder' );
                    self.orFarLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orFarL.placeholder' );
                    self.orNearLPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orNearL.placeholder' );
                    self.orPDPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPD.placeholder' );
                    self.orPDUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orPD.unit' );
                    self.orHSAPlaceholderI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orHSA.placeholder' );
                    self.orHSAUnitI18n = i18n( 'activity-schema.OphthalmologyRefraction_T.orHSA.unit' );
                    self.groupCommentI18n = i18n( 'InCaseMojit.casefile_detail.group.COMMENT' );
                    self.placeholderCommentI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.COMMENT' );

                    self.orBasRList = ko.observableArray( Y.doccirrus.schemas.activity.types.orBas_E.list );
                    self.orTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.orType_E.list );
                    self.orBasLList = ko.observableArray( Y.doccirrus.schemas.activity.types.orBas_E.list );
                    self.orVisAcuTypList = ko.observableArray( Y.doccirrus.schemas.activity.types.orVisAcuTyp_E.list );

                    // Refraction:read
                    self._orReadDevices = ko.observableArray();
                    self._orReadDevice = ko.observable();
                    // Refraction:write
                    self._orWriteDevices = ko.observableArray();
                    self._orWriteDevice = ko.observable();
                    self.addDisposable( ko.computed( function() {

                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.REFRACTOMETER_READ} )
                            .done( function( data ) {
                                self._orReadDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );
                        aDeviceReader
                            .fetchDeviceListFor( {type: aDeviceReaderTypes.REFRACTOMETER_WRITE} )
                            .done( function( data ) {
                                self._orWriteDevices( data );
                            } )
                            .fail( self.defaultErrorHandler );

                    } ) );

                    // device actions
                    self._orReadDeviceRead = function() {
                        var
                            id = self._orReadDevice();

                        self._orReadDeviceRead.pending( true );

                        aDeviceReader
                            .readDataFromDeviceId( {id: id} )
                            .always( function() {
                                self._orReadDeviceRead.pending( false );
                            } )
                            .done( function( response ) {
                                self.setOphthalmologyData( response );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self._orReadDeviceRead.pending = ko.observable( false );
                    self._orReadDeviceEnabled = ko.computed( function() {
                        var
                            list = self._orReadDevices();

                        if( self.orRead.readOnly() ) {
                            return false;
                        }

                        if( self._orReadDeviceRead.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );
                    self._orWriteDeviceWrite = function() {
                        var
                            id = self._orWriteDevice();

                        self._orWriteDeviceWrite.pending( true );

                        aDeviceReader
                            .writeDataToDeviceId( {id: id, data: self._serializeToJS()} )
                            .always( function() {
                                self._orWriteDeviceWrite.pending( false );
                            } )
                            .done( function( /*response*/ ) {
                                Y.doccirrus.DCWindow.notice( {message: 'Daten wurden erfolgreich geschrieben'} );
                            } )
                            .fail( self.defaultErrorHandler );
                    };
                    self._orWriteDeviceWrite.pending = ko.observable( false );
                    self._orWriteDeviceEnabled = ko.computed( function() {
                        var
                            list = self._orWriteDevices();

                        if( self._orWriteDeviceWrite.pending() ) {
                            return false;
                        }

                        return Boolean( list.length );
                    } );
                    // computed for number locales
                    self._orSphL = self.createComputedFromFieldConfiguration( {fieldName: 'orSphL'} );
                    self._orSphR = self.createComputedFromFieldConfiguration( {fieldName: 'orSphR'} );
                    self._orCylL = self.createComputedFromFieldConfiguration( {fieldName: 'orCylL'} );
                    self._orCylR = self.createComputedFromFieldConfiguration( {fieldName: 'orCylR'} );
                    self._orAxsL = self.createComputedFromFieldConfiguration( {fieldName: 'orAxsL'} );
                    self._orAxsR = self.createComputedFromFieldConfiguration( {fieldName: 'orAxsR'} );
                    self._orAddL = self.createComputedFromFieldConfiguration( {fieldName: 'orAddL'} );
                    self._orAddR = self.createComputedFromFieldConfiguration( {fieldName: 'orAddR'} );
                    self._orPsmL = self.createComputedFromFieldConfiguration( {fieldName: 'orPsmL'} );
                    self._orPsmR = self.createComputedFromFieldConfiguration( {fieldName: 'orPsmR'} );
                    self._orAdd2L = self.createComputedFromFieldConfiguration( {fieldName: 'orAdd2L'} );
                    self._orAdd2R = self.createComputedFromFieldConfiguration( {fieldName: 'orAdd2R'} );

                    self._orFarL = self.createComputedFromFieldConfiguration( {fieldName: 'orFarL'} );
                    self._orFarR = self.createComputedFromFieldConfiguration( {fieldName: 'orFarR'} );
                    self._orFarB = self.createComputedFromFieldConfiguration( {fieldName: 'orFarB'} );
                    self._orNearL = self.createComputedFromFieldConfiguration( {fieldName: 'orNearL'} );
                    self._orNearR = self.createComputedFromFieldConfiguration( {fieldName: 'orNearR'} );
                    self._orNearB = self.createComputedFromFieldConfiguration( {fieldName: 'orNearB'} );

                    self._orPD = self.createComputedFromFieldConfiguration( {fieldName: 'orPD'} );
                    self._orHSA = self.createComputedFromFieldConfiguration( {fieldName: 'orHSA'} );

                    // computed for 'orRead' date display
                    self._orRead = ko.computed( function() {
                        var
                            orRead = self.orRead();

                        if( orRead ) {
                            return moment( orRead ).format( DATE_TIME_FORMAT );
                        } else {
                            return '';
                        }
                    } );

                    // computed for refraction readable devices available
                    self._orReadable = ko.computed( function() {
                        var
                            _orReadDevices = self._orReadDevices();

                        return Boolean( _orReadDevices.length );
                    } );

                    // computed for refraction writable devices available
                    self._orWritable = ko.computed( function() {
                        var
                            _orWriteDevices = self._orWriteDevices();

                        return Boolean( _orWriteDevices.length );
                    } );

                    // computed for displaying read date picker
                    self._orReadpickerIsAvailable = ko.computed( function() {
                        var
                            _orReadable = self._orReadable(),
                            orType = self.orType(),
                            isAvailable = ('REF' === orType || 'REF_IN_CYCLO' === orType || !_orReadable);

                        return isAvailable;
                    } );

                    self.comment.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

                    // reset orRead when orType unset
                    self.addDisposable( ko.computed( function() {
                        var
                            orType = unwrap( self.orType );

                        if( !orType ) {
                            self.orRead( null );
                        }
                    } ) );
                },
            /**
             * when tonometry or refraction have a comment then that field should be visualized open
             */
            initCommentShouldBeOpen: function(node) {
                var
                    self = this,
                    comment = peek( self.comment );

                if( comment && !node.classList.contains( 'in' ) ) {
                    jQuery( node ).collapse( 'show' );
                }
            }
            }, {
                NAME: 'RefractionEditorModel'
            }
        );
        KoViewModel.registerConstructor( RefractionEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'OphthalmologyEditorModel'
        ]
    }
)
;
