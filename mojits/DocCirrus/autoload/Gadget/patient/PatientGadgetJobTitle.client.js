/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PatientGadgetJobTitle', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetJobTitle
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetJobTitle
     * @extends PatientGadget
     */
    function PatientGadgetJobTitle() {
        PatientGadgetJobTitle.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetJobTitle, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initPatientGadgetJobTitle();
        },
        /** @private */
        destructor: function() {
        },
        jobTitle: null,
        _linkToDetail: null,
        initPatientGadgetJobTitle: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),
                patientJobTitle;

            self.jobTitle = ko.observable();
            self.jobTitleI18n = i18n( 'PatientGadget.PatientGadgetJobTitle.i18n' );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            patientJobTitle = unwrap( currentPatient.jobTitle );

            if( patientJobTitle ) {
                self.jobTitle = patientJobTitle;
            } else {
                self.jobTitle = '';
            }

            /**
             * Computes a link to the patient details, if patient has an id else returns null
             * @property _linkToDetail
             * @type {ko.computed|null|String}
             */
            self._linkToDetail = ko.computed( function() {
                var
                    id = ko.unwrap( currentPatient._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/tab/patient_detail';
                }
                else {
                    return null;
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetJobTitle',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetJobTitle );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils'
    ]
} );
