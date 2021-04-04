/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PatientGadgetAddress', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetAddress
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetAddress;

    /**
     * @constructor
     * @class PatientGadgetAddress
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetAddress() {
        PatientGadgetAddress.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetAddress, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.table.setColumnHeaderVisible( false );

            self.initPatientGadgetAddress();
        },
        /** @private */
        destructor: function() {
        },
        address: null,
        _linkToDetail: null,
        initPatientGadgetAddress: function() {
            var
                self = this;

            self.address = ko.observableArray();

            self.gadgetAddressI18n = i18n( 'PatientGadget.PatientGadgetAddress.i18n' );

            self.addDisposable( ko.computed( function() {
                self.table.setItems( unwrap( self.address ) );
            } ) );

            self.loadTableData();
        },

        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),
                patientAddresses,
                address;

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            patientAddresses = unwrap( currentPatient.addresses );

            if( patientAddresses && 1 === patientAddresses.length ) {
                address = patientAddresses[0];
            } else if( patientAddresses && 1 < patientAddresses.length ) {
                address = patientAddresses.find( function( item ) {
                        return 'OFFICIAL' === unwrap( item.kind );
                    } ) || null;
            } else {
                address = null;
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

            if( address ) {
                self.address( [
                    {
                        patientAddress: ( unwrap( address.addon ) && ( unwrap( address.addon ) + '<br>' ) ) +
                                        unwrap( address.street ) + ' ' + unwrap( address.houseno ) + '<br>' +
                                        unwrap( address.zip ) + ' ' + unwrap( address.city )
                    }
                ] );
            } else {
                self.address( [] );
            }
        }
    }, {
        NAME: 'PatientGadgetAddress',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.ADDRESS,
                        i18n: i18n( 'PatientGadget.PatientGadgetAddress.i18n' )
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.ADDRESS
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetAddress );

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
