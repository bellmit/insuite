/**
 * User: oliversieweke
 * Date: 07.03.18  11:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'DmpHgvModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module DmpHgvModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            DmpBaseModel = KoViewModel.getConstructor( 'DmpBaseModel' ),
            unwrap = ko.unwrap;

        /**
         * @abstract
         * @class DmpHgvModel
         * @constructor
         * @extends DmpBaseModel
         */
        function DmpHgvModel( config ) {
            DmpHgvModel.superclass.constructor.call( this, config );
        }

        Y.extend( DmpHgvModel, DmpBaseModel, {
            initializer: function() {
                var
                    self = this;

                self.initDmpHgvModel();
            },
            destructor: function() {
            },
            initDmpHgvModel: function() {
                var
                    self = this;

                // Many validations for fields of the HGV form depend on entries in other fields. All the necessary
                // subscriptions are set up manually below to insure the form updates accordingly.

                self.patientID = ko.observable( null );
                self.patientDob = ko.observable( null );
                self.patientAge = ko.observable( null );

                self.renderPatientID = ko.computed( function() {
                    var patientID = self.patientID();
                    return patientID;
                } );

                self.renderPatientAge = ko.computed( function() {
                    var patientAge = self.patientAge();
                    return patientAge;
                } );

                self.renderYearOfBirth = ko.computed( function() {
                    var patientDob = self.patientDob();
                    return moment(patientDob).format('YYYY');
                } );

                self.patientGender = ko.observable( null );
                self.displayPatientGender = ko.computed( function() {
                    var patientGender = self.patientGender();
                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', patientGender, Y.doccirrus.schemas.patient.types.Gender_E.list, '' );
                } );

                self.dmpSpeakingTestPossible.subscribe(function() {
                    self.dmpSpeechComprehensionDB.validate();
                    self.dmpSpeechComprehensionEZ.validate();
                    self.dmpSpeechComprehensionSVS.validate();
                });

                self.dmpSpeakingTestPossible_following.subscribe(function() {
                    self.dmpSpeechComprehensionFreeFieldEZ.validate();
                    self.dmpSpeechComprehensionFreeFieldSVS.validate();
                });

                self.addDisposable( ko.computed( function() {
                    var binder = self.get( 'binder' ),
                        currentPatient = unwrap( binder.currentPatient );

                    if( currentPatient ) {
                        self.patientID( unwrap( currentPatient.HGVPatientNo ) );
                        self.patientDob( unwrap( currentPatient.dob ) );
                        self.patientAge( unwrap( currentPatient.age ) );
                        self.patientGender( unwrap( currentPatient.gender ) );
                    }
                }));
            }

        }, {
            schemaName: 'v_dmphgv',
            NAME: 'DmpHgvModel'
        } );
        KoViewModel.registerConstructor( DmpHgvModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpBaseModel',
            'v_dmphgv-schema',
            'activity-schema'
        ]
    }
);