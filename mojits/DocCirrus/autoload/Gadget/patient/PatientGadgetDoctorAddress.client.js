/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _*/
YUI.add( 'PatientGadgetDoctorAddress', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetDoctorAddress
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetDoctorAddress;

    /**
     * @constructor
     * @class PatientGadgetDoctorAddress
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetDoctorAddress() {
        PatientGadgetDoctorAddress.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetDoctorAddress, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetDoctorAddress();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        doctorEntries: null,
        initPatientGadgetDoctorAddress: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                specialities = binder.getInitialData( 'specialitiesList' );

            self.doctorAddressI18n = i18n( 'PatientGadget.PatientGadgetDoctorAddress.i18n' );
            self.doctorEntries = ko.observableArray( [] );
            self.specialitiesList = ko.observableArray( specialities || [] );

            self.addDisposable( ko.computed( function() {
                self.table.setItems( unwrap( self.doctorEntries ) );
            } ) );

            self.loadTableData();
            self._initCommunication();
        },
        _communicationBaseContactSubscription: null,
        /**
         * Initializes BaseContact collection subscription
         * @method _initCommunication
         * @private
         */
        _initCommunication: function() {
            var
                self = this;

            self._communicationBaseContactSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'basecontact',
                callback: function() {
                    self.loadTableDataDeBounced();
                }
            } );
        },
        /**
         * Cleans BaseContact collection subscription
         * @method _destroyCommunication
         * @private
         */
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationBaseContactSubscription ) {
                self._communicationBaseContactSubscription.removeEventListener();
                self._communicationBaseContactSubscription = null;
            }
        },
        /**
         * Loads data for gadget table
         * @method loadTableData
         */
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),
                physicianId = peek( currentPatient.physicians ) && peek( currentPatient.physicians )[0];
            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            self.doctorEntries( [] );
            Y.doccirrus.jsonrpc.api.patient
                .getPatientReferenceContacts( {
                    noBlocking: true,
                    query: {
                        physicianId: physicianId,
                        familyDoctorId: peek( currentPatient.familyDoctor ),
                        institutionId: peek( currentPatient.institution ),
                        additionalContacts: peek( currentPatient.additionalContacts )
                    }
                } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.doctorEntries ) {
                        return;
                    }
                    self.processBaseContacts( response.data );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        },
        /**
         * Takes baseContacts object for this patient and processes it
         * to prepare item for gadget table in following format
         *  {
         *           type: {string},
         *           content: {string},
         *           speciality: {string},
         *           institutionType: {string},
         *           phone: {string},
         *           fax: {string},
         *           address: {string}
         *   }
         * @method processBaseContacts
         * @param {object} data
         */
        processBaseContacts: function( data ) {
            var
                self = this,
                contactTypes = Object.keys( data ),
                contactItem,
                phoneNumbers = [], faxNumbers = [],
                processedContacts = [], communications = [];

            /**
             * Process array of specialities for this baseContact
             * @method processSpecialities
             * @param {array} expertise
             * @returns {string}
             */
            function processSpecialities( expertise ) {
                var
                    specialitiesList = self.specialitiesList().slice(),
                    oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                    expertiseValues = [],
                    result;

                oldExpertiseList.forEach( function( oldExpertise ) {
                    specialitiesList.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                } );
                if( Array.isArray( expertise ) && expertise[0] ) {
                    expertise.forEach( function( entry ) {
                        expertiseValues.push( specialitiesList.find( function( item ) {
                            return item.id === entry;
                        } ) );
                    } );
                }
                if( Array.isArray( expertiseValues ) && expertiseValues.length ) {
                    result = expertiseValues.filter( function( expertise ) {
                        return Boolean( expertise && expertise.text );
                    } ).map( function( expertise ) {
                        return expertise.text;
                    } );
                    return result.join( ',<br>' );
                }
                return Y.doccirrus.schemaloader.getEnumListTranslation( 'basecontact', 'Expert_E', expertise, 'i18n', '' );
            }

            /**
             * Process array of addresses for this baseContact
             * @method processAddresses
             * @param {[{
             *      _id: <String>,
             *      addon: <String>,
             *      city: <String>,
             *      country: <String>,
             *      countryCode: <String>,
             *      houseno: <String>,
             *      kind: <String>,
             *      street: <String>,
             *      zip: <String>
             * }]} addresses Array of address objects
             * @returns {string}
             */
            function processAddresses( addresses ) {
                if( addresses && addresses[0] ) {
                    return addresses.map( function( address ) {
                        return ( address.addon && address.addon + ', ' ) +
                               ( address.street && address.street + ' ' ) +
                               ( address.houseno && address.houseno + ', ' ) +
                               ( address.zip && address.zip + ' ' ) +
                               address.city;
                    } ).join( ';<br>' );
                }
                return '';
            }

            /**
             * Precesses single baseContact and pushes it to the processedContacts array
             * @method processSingleContact
             * @param {string} type - one of this ['physician', 'familyDoctor', 'institution', 'additionalContacts'] types, they are filled in api.patient.getPatientReferenceContacts
             * @param {{
             *      addresses: [Object],
             *      baseContactType: <String>,
             *      bsnrs: [String],
             *      communications: [Object],
             *      contacts: [String],
             *      content: <String>,
             *      expertise: [String],
             *      firstname: <String>,
             *      institutionType: <String>,
             *      lastname: <String>,
             *      nameaffix: <String>,
             *      officialNo: <String>,
             *      talk: <String>,
             *      title: <String>,
             *      _id: <ObjectId>
             * }} contactItem
             */
            function processSingleContact( type, contactItem ) {
                communications = contactItem.communications;
                phoneNumbers = [];
                faxNumbers = [];
                if( communications.length ) {
                    phoneNumbers = communications.filter( function( item ) {
                        return ["PHONEPRIV", "MOBILEPRIV", "PHONEJOB", "MOBILEJOB", "PHONEEEXT", 'PHONEEMERGENCY'].indexOf( item.type ) > -1;
                    } ).map( function( item ) {
                        return item.value;
                    } ) || [];
                    faxNumbers = contactItem.communications.filter( function( item ) {
                            return ["FAXPRIV", "FAXJOB"].indexOf( item.type ) > -1;
                        } ).map( function( item ) {
                            return item.value;
                        } ) || [];
                }

                /**
                 * Generates baseContact's content regardless to it's baseContactType
                 * @method generateContent
                 * @param {object} item
                 * @returns {string}
                 */
                function generateContent( item ) {
                    if( Y.doccirrus.schemas.basecontact.isOrganizationType( item.baseContactType ) ) {
                        return item.institutionName;
                    } else {
                        return item.firstname + ' ' + item.lastname + ' ' + item.title;
                    }
                }

                processedContacts.push( {
                    type: i18n( 'PatientGadget.PatientGadgetDoctorAddress.ContactTypes_E.' + type ),
                    content: generateContent( contactItem ),
                    speciality: processSpecialities( contactItem.expertise ),
                    institutionType: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', contactItem.institutionType, Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list, contactItem.institutionType ),
                    phone: phoneNumbers.join( ',<br>' ),
                    fax: faxNumbers.join( ',<br>' ),
                    address: processAddresses( contactItem.addresses )
                } );
            }

            contactTypes.forEach( function( type ) {
                contactItem = data[type];

                if( 'additionalContacts' === type ) {
                    data[type].forEach( function( additionalContact ) {
                        processSingleContact( type, additionalContact );
                    } );
                } else {
                    processSingleContact( type, contactItem );
                }
            } );

            self.doctorEntries( processedContacts );

        },
        /**
         * Reloads data for gadget table, triggered by collection subscription
         * @method reloadTableData
         */
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient ),
                physicianId = peek( currentPatient.physicians ) && peek( currentPatient.physicians )[0];

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }
            Y.doccirrus.communication.apiCall( {
                method: 'patient.getPatientReferenceContacts',
                query: {
                    physicianId: physicianId,
                    familyDoctorId: peek( currentPatient.familyDoctor ),
                    institutionId: peek( currentPatient.institution ),
                    additionalContacts: peek( currentPatient.additionalContacts )
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.doctorEntries ) {
                    self.processBaseContacts( response.data );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetDoctorAddress',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.TYPE,
                        i18n: i18n( 'PatientGadget.PatientGadgetDoctorAddress.CONFIG_FIELDS.TYPE' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CONTENT,
                        i18n: i18n( 'PatientGadget.PatientGadgetDoctorAddress.CONFIG_FIELDS.CONTENT' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.SPECIALITY,
                        i18n: i18n( 'physician-schema.Physician_T.expertise.i18n' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.INSTITUTION_TYPE,
                        i18n: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.PHONE_NUMBER,
                        i18n: i18n( 'general.title.PHONE' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.FAX,
                        i18n: i18n( 'general.title.FAX' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.ADDRESS,
                        i18n: i18n( 'general.title.ADDRESS' ),
                        converter: function( value ) {
                            return value;
                        }
                    }

                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TYPE,
                    CONFIG_FIELDS.CONTENT,
                    CONFIG_FIELDS.SPECIALITY,
                    CONFIG_FIELDS.INSTITUTION_TYPE,
                    CONFIG_FIELDS.PHONE_NUMBER,
                    CONFIG_FIELDS.FAX,
                    CONFIG_FIELDS.ADDRESS
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetDoctorAddress );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommunication-client'
    ]
} );
