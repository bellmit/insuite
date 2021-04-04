/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'PatientGadgetReference', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetReference
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetReference
     * @extends PatientGadget
     */
    function PatientGadgetReference() {
        PatientGadgetReference.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetReference, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initReferenceInfo();
        },
        /** @private */
        destructor: function() {
        },
        referenceInfo: null,
        referenceInfoVisible: null,
        referenceContacts: null,
        initReferenceInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.patientGadgetReferenceI18n = i18n( 'PatientGadget.PatientGadgetReference.i18n' );

            self.referenceContacts = ko.observable();

            self.referenceInfo = ko.computed( function() {
                var
                    referenceContacts = unwrap( self.referenceContacts ),
                    result = [];

                if( referenceContacts && referenceContacts.physician ) {
                    result.push( linkToReference( referenceContacts.physician, 'PHYSICIAN' ) );
                }
                if( referenceContacts && referenceContacts.familyDoctor ) {
                    result.push( linkToReference( referenceContacts.familyDoctor, 'FAMILY_DOCTOR' ) );
                }
                if( referenceContacts && referenceContacts.institution ) {
                    result.push( linkToReference( referenceContacts.institution, 'INSTITUTION' ) );
                }

                if( currentPatient.workingAt() ) {
                    result.push( currentPatient.workingAt() + ' (' + i18n( 'basecontact-schema.InstitutionContactType_E.EMPLOYER.i18n' ) + ')' );
                }
                return result;
            } ).extend( {rateLimit: 0} );

            self.referenceInfoVisible = ko.computed( function() {
                return Boolean( unwrap( self.referenceInfo ).length > 0 );
            } );

            self.loadData();

            function linkToReference( contact, type ) {
                var template = '<a href="{href}" target="{target}">{text}</a>',
                    linkText;

                switch( type ) {
                    case 'PHYSICIAN':
                        linkText = contact.firstname + ' ' + contact.lastname + ' (' + i18n( 'partner-schema.PartnerType_E.REFERRER' ) + ')';
                        break;
                    case 'FAMILY_DOCTOR':
                        linkText = contact.firstname + ' ' + contact.lastname + ' (' + i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_DOCTOR.i18n' ) + ')';
                        break;
                    case 'INSTITUTION':
                        linkText = contact.institutionName + ' (' + i18n( 'basecontact-schema.BaseContactType_E.INSTITUTION.i18n' ) + ')';
                        break;
                }

                return Y.Lang.sub( template, {
                    href: '/contacts#/'+contact._id+'/',
                    text: linkText,
                    target: '_blank'
                } );
            }

        },
        loadData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),
                physicianId = peek( currentPatient.physicians ) && peek( currentPatient.physicians )[0];

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.patient
                .getPatientReferenceContacts( {
                    noBlocking: true,
                    query: {
                        physicianId: physicianId,
                        familyDoctorId: peek( currentPatient.familyDoctor ),
                        institutionId: peek( currentPatient.institution )
                    }
                } )
                .done( function( response ) {
                    if( response && response.data ) {
                        self.referenceContacts( response.data );
                    } else {
                        self.referenceContacts( null );
                    }
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        }
    }, {
        NAME: 'PatientGadgetReference',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetReference );

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
