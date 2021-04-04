/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PatientGadgetPatientNumber', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetPatientNumber
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetPatientNumber;

    /**
     * @constructor
     * @class PatientGadgetPatientNumber
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetPatientNumber() {
        PatientGadgetPatientNumber.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetPatientNumber, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.table.setColumnHeaderVisible( false );

            self.initPatientGadgetPatientNumber();
        },
        /** @private */
        destructor: function() {
        },
        patientNumbers: null,
        additionalNumbers: null,
        _linkToDetail: null,
        initPatientGadgetPatientNumber: function() {
            var
                self = this;

            self.patientNumbers = ko.observableArray();
            self.additionalNumbers = ko.observableArray();
            self.patientNumberI18n = i18n( 'InCaseMojit.patient_detail.label.PAT_NR' );


            self.addDisposable( ko.computed( function() {
                self.table.setItems( unwrap( self.patientNumbers ) );
            } ) );

            self.loadTableData();
        },

        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
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

            if( Array.isArray( currentPatient.partnerIds() ) && currentPatient.partnerIds().length ) {
                self.additionalNumbers = ', ' + currentPatient.partnerIds().filter( function( item ) {
                        return item.patientId();
                    } ).map( function( entry ) {
                        if( entry.extra() ) {
                            return ( entry.patientId() ) + " (" + entry.extra() + ")";
                        } else if( entry.partnerId() ) {
                            return ( entry.patientId() ) + " (" + Y.doccirrus.schemaloader.getEnumListTranslation( 'patient', 'PartnerIdsPartnerId_E', entry.partnerId(), 'i18n', '' ) + ")";
                        } else {
                            return ( entry.patientId() );
                        }
                    } ).join( ', ' );
            }

            self.patientNumbers( [
                {
                    patientNumber: ( unwrap( currentPatient.patientNo ) || unwrap( currentPatient.patientNumber ) ) + unwrap( self.additionalNumbers ) || ''
                }
            ] );
        }
    }, {
        NAME: 'PatientGadgetPatientNumber',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.PATIENT_NUMBER,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.PATIENT_NUMBER' )
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.PATIENT_NUMBER
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetPatientNumber );

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
