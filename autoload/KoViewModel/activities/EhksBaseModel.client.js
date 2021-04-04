/**
 * User: do
 * Date: 02/11/17  13:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'EhksBaseModel', function( Y/*, NAME */ ) {
    'use strict';
    /**
     * @module EhksBaseModel
     */

    var
        i18n = Y.doccirrus.i18n,
        HKS_PATIENT_MUST_BE_AT_LEAST_35 = i18n( 'InCaseMojit.care.text.HKS_PATIENT_MUST_BE_AT_LEAST_35' ),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' );

    /**
     * @abstract
     * @class EhksBaseModel
     * @constructor
     * @extends ActivityModel
     */
    function EhksBaseModel( config ) {
        EhksBaseModel.superclass.constructor.call( this, config );
    }

    EhksBaseModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };
    Y.extend( EhksBaseModel, ActivityModel, {
        initializer: function() {
            var
                self = this;
            self.initEhksBaseModel();
        },
        destructor: function() {
        },
        initEhksBaseModel: function() {
            var
                self = this;
            self.initPatientData();
            self.initAdministrativeData();
            self.addDisposable( ko.computed( function() {
                var dmpSignatureDate = unwrap( self.dmpSignatureDate ),
                    dmpSignatureDateMoment;

                if( !dmpSignatureDate ) {
                    return;
                }

                dmpSignatureDateMoment = moment( dmpSignatureDate );
                self.dmpQuarter( dmpSignatureDateMoment.quarter() );
                self.dmpYear( dmpSignatureDateMoment.year() );

            } ) );
        },
        initPatientData: function() {
            var
                self = this;

            self.patientDob = ko.observable( null );
            self.patientAge = ko.observable( null );
            self.patientAge.hasError = self.addDisposable( ko.computed( function() {
                var patientAge = self.patientAge();
                return 35 > patientAge;
            } ) );
            self.patientAge.validationMessages = [HKS_PATIENT_MUST_BE_AT_LEAST_35];

            self.patientGender = ko.observable( null );
            self.displayPatientGender = ko.computed( function() {
                var patientGender = self.patientGender();
                return Y.doccirrus.schemaloader.translateEnumValue( '-de', patientGender, Y.doccirrus.schemas.patient.types.Gender_E.list, '' );
            } );
            self.renderPatientDob = ko.computed( function() {
                var patientDob = self.patientDob(),
                    patientAge = self.patientAge();
                return (patientDob || '') + ((patientAge || 0 === patientAge) ? ([' ', '(', patientAge, ')'].join( '' )) : '');
            } );
            self.patientInsuranceName = ko.observable( null );
            self.patientInsuranceId = ko.observable( null );

            self.addDisposable( ko.computed( function() {
                var publicInsurance,
                    binder = self.get( 'binder' ),
                    currentPatient = unwrap( binder.currentPatient );

                // MOJ-14319: [OK] [EDOCS]
                function getPublicInsurance( patient ) {
                    var result = null;
                    if( patient && peek( patient.insuranceStatus ) ) {
                        peek( patient.insuranceStatus ).some( function( insurance ) {
                            if( 'PUBLIC' === unwrap( insurance.type ) ) {
                                result = insurance;
                            }
                        } );
                    }

                    return result;
                }

                if( currentPatient ) {
                    self.patientDob( unwrap( currentPatient.kbvDob ) );
                    self.patientAge( unwrap( currentPatient.age ) );
                    self.patientGender( unwrap( currentPatient.gender ) );

                    publicInsurance = getPublicInsurance( currentPatient );
                    if( publicInsurance ) {
                        self.patientInsuranceName( unwrap( publicInsurance.insuranceName ) );
                        self.patientInsuranceId( unwrap( publicInsurance.insuranceId ) );
                    }
                }

            } ) );

        },
        initAdministrativeData: function() {
            var
                self = this,
                locationId = self.locationId();

            self.employeeOfficialNo = self.addDisposable( ko.computed( function() {
                var employee = self.employee();
                return employee && employee.officialNo;
            } ) );

            self.locationCommercialNo = self.addDisposable( ko.computed( function() {
                var
                    result = null,
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' );

                locations.some( function( location ) {
                    if( location._id === locationId ) {
                        result = location.commercialNo;
                        return true;
                    }
                } );

                return result;
            } ) );
        }
    }, {
        NAME: 'EhksBaseModel'
    } );
    KoViewModel.registerConstructor( EhksBaseModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivityModel'
    ]
} );