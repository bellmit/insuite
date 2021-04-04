/**
 * User: pi
 * Date: 22/01/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'LabRequestEditorModel', function( Y, NAME ) {
        /**
         * @module LabRequestEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ScheinEditorModel = KoViewModel.getConstructor( 'ScheinEditorModel' ),
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n;

        /**
         * @class LabRequestEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function LabRequestEditorModel( config ) {
            LabRequestEditorModel.superclass.constructor.call( this, config );
        }

        LabRequestEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'timestamp',
                    'labRequestType',
                    'auftrag',
                    'labRequestId',
                    'scheinSlipMedicalTreatment',
                    'scheinEstablishment',
                    'scheinRemittor',
                    'ggfKennziffer',
                    'abnDatumZeit',
                    'befEiltTel',
                    'befEiltFax',
                    'befEiltTelBool',
                    'befEiltFaxBool',
                    'befEiltNr',
                    'knappschaftskennzeichen',
                    'ssw',
                    'zuAngaben',
                    'fk4202',
                    'kontrollunters',
                    'fk4204',
                    'behandlungGemaess',
                    'asvTeamReferral',
                    'befEilt',
                    'edtaGrBlutbild',
                    'edtaKlBlutbild',
                    'edtaHbA1c',
                    'edtaReti',
                    'edtaBlutsenkung',
                    'edtaDiffBlutbild',
                    'citratQu',
                    'citratQuMarcumar',
                    'citratThrombin',
                    'citratPTT',
                    'citratFibri',
                    'svbAlkPhos',
                    'svbAmylase',
                    'svbASL',
                    'svbBiliD',
                    'svbBiliG',
                    'svbCalc',
                    'svbCholesterin',
                    'svbCholin',
                    'svbCK',
                    'svbCKMB',
                    'svbCRP',
                    'svbEisen',
                    'svbEiwE',
                    'svbEiwG',
                    'svbGammaGT',
                    'svbGlukose',
                    'svbGOT',
                    'svbGPT',
                    'svbHarnsäure',
                    'svbHarnstoff',
                    'svbHBDH',
                    'svbHDL',
                    'svbLgA',
                    'svbLgG',
                    'svbLgM',
                    'svbKali',
                    'svbKrea',
                    'svbKreaC',
                    'svbLDH',
                    'svbLDL',
                    'svbLipase',
                    'svbNatrium',
                    'svbOPVorb',
                    'svbPhos',
                    'svbTransf',
                    'svbTrigl',
                    'svbTSHBasal',
                    'svbTSHTRH',
                    'glu1',
                    'glu2',
                    'glu3',
                    'glu4',
                    'urinStatus',
                    'urinMikroalb',
                    'urinGlukose',
                    'urinAmylase',
                    'urinSchwTest',
                    'urinSediment',
                    'sonstiges',
                    'sonstigesText',
                    'harnStreifenTest',
                    'nuechternPlasmaGlukose',
                    'lipidprofil'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( LabRequestEditorModel, SimpleActivityEditorModel, {
                initializer: function LabRequestEditorModel_initializer() {
                    var
                        self = this;
                    self.initLabRequestEditorModel();

                },
                destructor: function LabRequestEditorModel_destructor() {
                },
                /**
                 * Initializes assistive editor model
                 * @method initLabRequestEditorModel
                 */
                initLabRequestEditorModel: function LabRequestEditorModel_initLabRequestEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        binder = self.get( 'binder' );

                    self.labelBSNRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.labelLanrI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.scheinSlipMedicalTreatment1I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.1' );
                    self.scheinSlipMedicalTreatment2I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.2' );
                    self.scheinSlipMedicalTreatment3I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.3' );
                    self.scheinSlipMedicalTreatment4I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.4' );
                    self.befEiltAltI18n = i18n( 'activity-schema.Referral_T.befEilt_ALT.i18n' );
                    self.labelEdtaI18n = i18n( 'InCaseMojit.casefile_detail.label.EDTA' );
                    self.labelCitratI18n = i18n( 'InCaseMojit.casefile_detail.label.CITRAT' );
                    self.labelSerumVollBlutI18n = i18n( 'InCaseMojit.casefile_detail.label.SERUM_VOLLBLUT' );
                    self.labelUrinI18n = i18n( 'InCaseMojit.casefile_detail.label.URIN' );
                    self.labelGlucoseI18n = i18n( 'InCaseMojit.casefile_detail.label.GLUCOSE' );
                    self.labelHealthExaminationI18n = i18n( 'InCaseMojit.casefile_detail.label.HEALTH_EXAMINATION' );

                    self.labRequestTypeList = Y.doccirrus.schemas.activity.types.LabRequestType_E.list;

                    self._asvContext = currentActivity._asvContext;

                    self.initSelect2();

                    if( !self.befEilt ) {
                        Y.log( 'LABREQUEST Missing befEilt', 'warn', NAME );
                    }

                    self.isAfterQ32020 = ko.computed( function() {
                        var timestamp = self.timestamp();
                        return Y.doccirrus.edmpcommonutils.isAfterTimestampQ( timestamp, '3/2020' );
                    } );

                    self.showPhoneOrFax = ko.computed( function() {
                        return 'LABREQUESTTYPE_A' !== self.labRequestType();
                    } );

                    self.addDisposable( ko.computed( function() {
                        var befEilt = self.befEilt(),
                            isAfterQ32020 = self.isAfterQ32020(),
                            befEiltFaxBool = self.befEiltFaxBool(),
                            befEiltTelBool = self.befEiltTelBool(),
                            location, locationId, locationList;

                        if( befEilt && (isAfterQ32020 ? (befEiltFaxBool || befEiltTelBool) : true) ) {
                            locationId = peek( currentActivity.locationId );
                            locationList = binder.getInitialData( 'location' );
                            locationList.some( function( loc ) {
                                if( loc._id === locationId ) {
                                    location = loc;
                                    return true;
                                }
                            } );
                            if( !isAfterQ32020 && location ) {
                                if( !peek( self.befEiltTel ) && location.phone ) {
                                    self.befEiltTel( location.phone );
                                }
                                if( !peek( self.befEiltFax ) && location.fax ) {
                                    self.befEiltFax( location.fax );
                                }
                            } else if( isAfterQ32020 && location ) {
                                if( !peek( self.befEiltNr ) && location.phone && befEiltTelBool ) {
                                    self.befEiltNr( location.phone );
                                }
                                if( !peek( self.befEiltNr ) && location.fax && befEiltFaxBool ) {
                                    self.befEiltNr( location.fax );
                                }
                            }
                        } else {
                            self.befEiltTel( null );
                            self.befEiltFax( null );
                            self.befEiltFaxBool( null );
                            self.befEiltTelBool( null );
                            self.befEiltNr( null );
                        }
                    } ) );

                    self._phoneFaxReadOnly = ko.computed( function() {
                        if( !self.befEilt || !self.befEilt.readOnly ) {
                            return true;
                        }

                        var readOnly = self.befEilt.readOnly(),
                            befEilt = self.befEilt();
                        if( readOnly ) {
                            return readOnly;
                        }
                        return !befEilt;
                    } );
                },
                initSelect2: function() {
                    ScheinEditorModel.injectSelect2.call( this );
                }
            }, {
                NAME: 'LabRequestEditorModel'
            }
        );

        KoViewModel.registerConstructor( LabRequestEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'dcvalidations',
            'ScheinEditorModel'
        ]
    }
);
