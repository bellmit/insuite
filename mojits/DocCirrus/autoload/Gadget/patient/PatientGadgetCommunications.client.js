/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetCommunications', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetCommunications
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetCommunications;


    /**
     * @constructor
     * @class PatientGadgetCommunications
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetCommunications() {
        PatientGadgetCommunications.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetCommunications, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initCommunicationInfo();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        _linkToDetail: null,
        communicationLinks: null,
        initCommunicationInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.communicationI18n = i18n( 'PatientGadget.PatientGadgetCommunications.i18n' );

            self.communicationLinks = ko.observableArray();
            self.table.onRowClick = function(meta, event) {
                var currentPatient = binder && peek( binder.currentPatient ),
                    patientCommunications = unwrap( currentPatient.communications ),
                    communication,
                    number = event.target.innerHTML,
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                // if user clicks not on link then do nothing
                if(!number) {
                    return false;
                }

                // if not swiss version then continue default event propagation
                if(!isSwiss) {
                    return true;
                }
                communication = patientCommunications.find(function( com ) {
                    var comType = unwrap(com.type),
                        comValue = unwrap(com.value),
                        category = Y.doccirrus.schemas.person.getCommunicationTypeCategory(comType);
                    return comValue === number && category === Y.doccirrus.schemas.person.getConstCommunicationTypeCategory.PHONE;
                });

                // if swiss version and user clicks on phone number then do leanSync call and prevent event
                if(communication) {
                    Y.doccirrus.jsonrpc.api.inphone.leanSyncInitCall({calleeno: number});
                    return false;
                }
            };

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.communicationLinks ) );
            } ) );

            self.loadTableData();

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

            /**
             * Computes communications as links
             */
        },
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),

            communications = unwrap( currentPatient.communications );

            self.communicationLinks( communications.map( function( communication ) {
                return { value:  Y.doccirrus.schemas.person.getCommunicationLinkedWithUriScheme( {
                    type: unwrap( communication.type ),
                    value: unwrap( communication.value )
                } ),
                    type: Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Communication_E', unwrap( communication.type ), 'i18n', '' ),
                    note: unwrap( communication.note )
                };
            } ) );
        }
    }, {
        NAME: 'PatientGadgetCommunications',
        ATTRS: {
        availableConfigurableTableColumns: {
            value: [

                {
                    val: CONFIG_FIELDS.VALUE,
                    i18n: i18n( 'person-schema.Communication_T.value.placeholder' )

                },
                {
                    val: CONFIG_FIELDS.TYPE,
                    i18n: i18n( 'person-schema.Communication_T.type' )

                },
                {
                    val: CONFIG_FIELDS.NOTE,
                    i18n: i18n( 'person-schema.Communication_T.note' )

                }
            ]
        },
        defaultConfigurableTableColumns: {
            value: [
                CONFIG_FIELDS.VALUE,
                CONFIG_FIELDS.NOTE
            ]
        }
    }
    } );

    KoViewModel.registerConstructor( PatientGadgetCommunications );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',

        'dcutils',

        'person-schema'
    ]
} );
