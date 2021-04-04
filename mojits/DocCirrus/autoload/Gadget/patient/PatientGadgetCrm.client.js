/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'PatientGadgetCrm', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetCrm
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetCrm
     * @extends PatientGadget
     */
    function PatientGadgetCrm() {
        PatientGadgetCrm.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetCrm, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initCrmInfo();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        crmInfo: null,
        crmInfoVisible: null,
        _displayCrmReminder: null,
        _displayCrmAppointment: null,
        initCrmInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                REMINDER_SHORT = i18n( 'InCaseMojit.crm_item.label.REMINDER_SHORT' ),
                ESTIMATED_APPOINTMENT_SHORT = i18n( 'InCaseMojit.crm_item.label.ESTIMATED_APPOINTMENT_SHORT' );

            self.crmInfoI18n = i18n( 'PatientGadget.PatientGadgetCrm.i18n' );

            self.crmInfo = ko.computed( function() {
                var
                    crmTreatments = unwrap( currentPatient.crmTreatments );

                return crmTreatments.map( function( crmTreatment ) {
                    var
                        title = unwrap( crmTreatment.title ) || '',
                        probability = unwrap( crmTreatment.probability ) || '';

                    return ['- ', title, ' ', probability, '%'].join( '' );
                } );
            } ).extend( {rateLimit: 0} );

            self.crmInfoVisible = ko.computed( function() {
                return Boolean( unwrap( self.crmInfo ).length > 0 );
            } );

            self._displayCrmReminder = ko.computed( function() {
                var crmReminder = unwrap( currentPatient.crmReminder );
                if( crmReminder ) {
                    return REMINDER_SHORT + ': ' + moment( crmReminder ).format( 'DD.MM.YYYY' );
                } else {
                    return '';
                }
            } );

            self._displayCrmAppointment = ko.computed( function() {
                var crmAppointmentMonth = currentPatient.crmAppointmentMonth(),
                    crmAppointmentQuarter = currentPatient.crmAppointmentQuarter(),
                    crmAppointmentYear = currentPatient.crmAppointmentYear(),
                    text = '';

                if( crmAppointmentMonth && crmAppointmentYear ) {
                    text = crmAppointmentMonth + '.' + crmAppointmentYear;
                }
                if( crmAppointmentQuarter && crmAppointmentYear ) {
                    text = 'Q ' + crmAppointmentQuarter + ' ' + crmAppointmentYear;
                }
                return text.length ? ESTIMATED_APPOINTMENT_SHORT + ': ' + text : text;
            } );

        }
    }, {
        NAME: 'PatientGadgetCrm',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetCrm );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadget',

        'dcutils',

        'dcauth'
    ]
} );
