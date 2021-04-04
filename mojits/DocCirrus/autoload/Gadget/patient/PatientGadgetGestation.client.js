/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */

YUI.add( 'PatientGadgetGestation', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetGestation
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetGestation
     * @extends PatientGadget
     */
    function PatientGadgetGestation() {
        PatientGadgetGestation.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetGestation, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;
            self.initPatientGadgetGestation();
        },
        /** @private */
        destructor: function() {
        },
        /**
         * Determines if gestation section is enabled.
         */
        gestationEnabled: null,
        /**
         * Determines if the gestation info are visible
         */
        gestationInfoVisible: null,
        /**
         * Computes text to display as info for week of gestation.
         */
        weekOfGestationText: null,
        /**
         * Computes text to display as info for due date.
         */
        dueDateText: null,
        /**
         * Computes the calculated due date.
         */
        calculatedDueDate: null,

        /**
         * Computes text to display
         */
        vacationStartDateText: null,
        weekAndDayOfGestationText: null,
        dueDate: null,
        maternityLeaveDateText: null,

        initPatientGadgetGestation: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder && peek( binder.currentPatient ) );

            self.gestationI18n = i18n( 'PatientGadget.PatientGadgetGestation.i18n' );
            self.weekOfGestationTextI18n = i18n( 'InCaseMojit.PatientSectionMedicalDataViewModel.gestation.weekOfGestationText.label' );
            self.dueTextDateI18n = i18n( 'InCaseMojit.PatientSectionMedicalDataViewModel.gestation.dueDateText.label' );
            self.vacationStartDateI18n = i18n( 'InCaseMojit.PatientSectionMedicalDataViewModel.gestation.vacationStartDateText.label' );

            //  pull latest MEDDATA values from currentPatient, will be updated on save of MEDDATA activities

            self.lastMenstruation = ko.computed( function() {
                if ( !currentPatient ) { return null; }
                var lastMenstruationP = currentPatient.getLatestMedDataValue( MedDataTypes.LAST_MENSTRUATION_P, 'dateValue' );
                if ( !lastMenstruationP ) { return null; }
                return moment( lastMenstruationP );
            } );

            self.cycleLength = ko.computed( function() {
                if ( !currentPatient ) { return ''; }
                var recordedValue = currentPatient.getLatestMedDataValue( MedDataTypes.CYCLE_LENGTH, "value" );
                if ( !recordedValue ) { return Y.doccirrus.schemas.v_meddata.DEFAULT_CYCLE_LENGTH; }
                return recordedValue;
            } );

            self.weekAndDayOfGestationText = ko.computed( function() {
                if ( !currentPatient ) { return ''; }
                var
                    wdText = currentPatient.getLatestMedDataValue( MedDataTypes.WEEK_AND_DAY_CORRECTION, "textValue" ),
                    parts = wdText ? wdText.split( '/' ) : [];

                if ( !parts || !parts[0] ) { return ''; }

                return i18n( 'patient-schema.calculateWeekOfGestation.asString', {
                    data: {
                        week: parts[0],
                        days: parts[1]
                    }
                } );
            } );

            self.dueDate = ko.computed( function() {
                if ( !currentPatient ) { return null; }
                var latestDueDate = currentPatient.getLatestMedDataValue( MedDataTypes.DUE_DATE, "dateValue" );
                if ( !latestDueDate ) { return null; }
                return moment( latestDueDate ).toISOString();
            } );

            self.maternityLeaveDateText = ko.computed( function() {
                if ( !currentPatient ) { return null; }
                var latestMaternityLeaveDate = currentPatient.getLatestMedDataValue( MedDataTypes.MATERNITY_LEAVE_DATE, "dateValue" );
                if ( !latestMaternityLeaveDate ) { return null; }
                return moment( latestMaternityLeaveDate ).format( 'dddd, D.MMMM YYYY' );
            });

            self.gestationEnabled = ko.computed( function() {
                if ( !currentPatient ) { return false; }
                var
                    gender = unwrap( currentPatient.gender );

                if( 'FEMALE' === gender || 'UNDEFINED' === gender ) {
                    return true;
                }
                return false;
            } );

            self.patientIsPregnant = ko.observable( currentPatient.isPregnant() );

            self.gestationInfoVisible = ko.computed( function() {
                return self.patientIsPregnant();
            } );

            self.medDataSubscription = currentPatient.latestMedData.subscribe( function() {
                self.patientIsPregnant( currentPatient.isPregnant() );
            } );

            self.weekOfGestationText = ko.computed( function() {
                var
                    dayOfLastMenorrhoea = unwrap( self.lastMenstruation ),
                    weekAndDayOfGestationText = unwrap( self.weekAndDayOfGestationText ),
                    calculatedWeekOfGestation;

                if( weekAndDayOfGestationText ) {
                    return weekAndDayOfGestationText;
                } else if( dayOfLastMenorrhoea ) {
                    calculatedWeekOfGestation = Y.doccirrus.schemas.patient.calculateWeekOfGestation( {
                        dayOfLastMenorrhoea: dayOfLastMenorrhoea,
                        now: moment().toISOString()
                    } );
                    if( calculatedWeekOfGestation ) {
                        return i18n( 'patient-schema.calculateWeekOfGestation.asString', {
                            data: {
                                week: calculatedWeekOfGestation.week,
                                days: calculatedWeekOfGestation.days
                            }
                        } );
                    }
                }

                return '';
            } ).extend( { rateLimit: 0 } );

            self.calculatedDueDate = ko.computed( function() {
                var
                    dayOfLastMenorrhoea = unwrap( self.lastMenstruation ),
                    cycleLength = unwrap( self.cycleLength ),
                    dueDate = unwrap( self.dueDate );

                if( dueDate ) {
                    return dueDate;
                }

                if( dayOfLastMenorrhoea ) {
                    return Y.doccirrus.schemas.patient.calculateDueDate( {
                        dayOfLastMenorrhoea: dayOfLastMenorrhoea,
                        cycleLength: cycleLength
                    } );
                }
                return '';
            } ).extend( { rateLimit: 0 } );

            self.dueDateText = ko.computed( function() {
                var
                    calculatedDueDate = unwrap( self.calculatedDueDate );

                if( calculatedDueDate ) {
                    return moment( calculatedDueDate ).format( 'dddd, D.MMMM YYYY' );
                }

                return '';
            } ).extend( { rateLimit: 0 } );

            self.vacationStartDateText = ko.computed( function() {
                var
                    calculatedDueDate = unwrap( self.calculatedDueDate ),
                    maternityLeaveDateText = unwrap( self.maternityLeaveDateText );

                if( maternityLeaveDateText ) {
                    return maternityLeaveDateText;
                }
                if( calculatedDueDate ) {
                    return moment( calculatedDueDate ).subtract( 6, 'weeks' ).format( 'dddd, D.MMMM YYYY' );
                }
                return '';
            } ).extend( { rateLimit: 0 } );

        },

        showGestationInfo: function() {
            Y.doccirrus.DCWindow.notice( {
                message: i18n( 'PatientGadget.PatientGadgetGestation.showGestationInfo.message' ),
                window: { width: 'medium' }
            } );
        }
    }, {
        NAME: 'PatientGadgetGestation',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetGestation );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget',
        'patient-schema',
        'v_meddata-schema',
        'DCWindow'
    ]
} );
