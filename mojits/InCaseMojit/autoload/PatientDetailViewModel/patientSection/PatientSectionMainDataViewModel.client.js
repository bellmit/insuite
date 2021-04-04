/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _, jQuery */
YUI.add( 'PatientSectionMainDataViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        isInitial = ko.computedContext.isInitial,
        ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

    function fail( response ) {
        var
            error = Y.doccirrus.errorTable.getErrorsFromResponse( response );
            _.invoke( error, 'display' );
    }

    /**
     * @constructor
     * @class PatientSectionMainDataViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionMainDataViewModel() {
        PatientSectionMainDataViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionMainDataViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionMainDataViewModel',
        locationList: null,
        showPatientLocationSelection: null,
        isEditMode: null,
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientSectionMainDataViewModel();

        },
        /** @protected */
        destructor: function() {
            self.invoiceRecipientBefore = undefined;
        },
        mixData: function(){
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );
            self.mixWhiteListFromDataModel( currentPatient );


            self.initEditAddresses();
            self.initEditCommunications();
            self.initEditPhysicianSelection();
            self.initEditFamilyDoctorSelection();
            self.initEditInstitutionSelection();
            self.initEditSendPatientReceipt();
            self.initSubModels( currentPatient );

        },
        initPatientSectionMainDataViewModel: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                binder = self.get( 'binder' ),
                tenantSettings = binder.getInitialData( 'tenantSettings' ),
                inCaseConfiguration = binder.getInitialData( 'incaseconfiguration' );

            self.noCrossLocationAccess = tenantSettings && tenantSettings.noCrossLocationAccess || false;

            self.firstLoad = true;
            self.textYes = i18n( 'general.text.YES' );
            self.textNo = i18n( 'general.text.NO' );

            self.showAffiliate = function( status ) {
                var
                    statusList = Y.doccirrus.schemas.patient.getPatientRelationList(),
                    finalStatus = statusList.filter( function( item ) {
                        return item.value === status;
                    });
                return finalStatus[0] ? finalStatus[0].text : status ? status : '';
            };

            self.removePartnerId = function( obj ) {
                currentPatient.partnerIds.remove( obj );
            };

            self.removePatientFamilyMember = function( obj ) {
                currentPatient.patientsFamilyMembers.remove( obj );
            };

            self.removeAdditionalFamilyMember = function( obj ) {
                currentPatient.additionalFamilyMembers.remove( obj );
            };

            self.addAdditionalContact = function() {
                var newContactId = '';
                currentPatient.additionalContacts.push( newContactId );
            };

            self.removeAdditionalContact = function( item ) {
                //  re-initialize the view models, new index order
                self.koBaseContacts = {};
                currentPatient.additionalContacts.splice( item.idx, 1 );
            };

            self.mixData();

            self.initPartnerIdList();
            self.initAdditionalContactsList();
            self.initLocation();
            self.initConfirmedViewFromLocationIds();

            self._initPatientNoEdit();
            self._initPatientSinceEdit();
            self.takePhysician = function() {
                self._familyDoctorSelection.setNewValue( peek( self._physicianSelection.value ) );
            };
            self.takePhysician.i18n = i18n( 'general.button.TAKE' );

            self.initKbvDobAutoComplete();
            self.initKbvDobErrorHandling();

            self.initLocationIdClientValidation( currentPatient, inCaseConfiguration );
            self.initAddressesClientValidation( currentPatient, inCaseConfiguration );
            self.initCommunicationsClientValidation( currentPatient, inCaseConfiguration );
            self.initJobStatusEdit();

            self.persDataTitleI18n = i18n( 'InCaseMojit.patient_detail.title.PERS_DATA' );
            self.optionsDataTitleI18n = i18n( 'InCaseMojit.patient_detail.title.OPTIONS_DATA' );
            self.collectMoreDataButtonI18n = i18n( 'InCaseMojit.patient_detail.button.COLLECT_MORE_DATA' );
            self.agreementDataTitleI18n = i18n( 'InCaseMojit.patient_detail.title.AGREEMENT' );
            self.contactsDataTitleI18n = i18n( 'InCaseMojit.patient_detail.title.CONTACTS' );
            self.familyDataTitleI18n = i18n( 'InCaseMojit.patient_detail.title.FAMILY' );
            self.communicationsTitleI18n = i18n( 'person-schema.JuristicPerson_T.communications' );
            self.placeholderKVBDobI18n = i18n( 'InCaseMojit.patient_detail.placeholder.KBV_DOB' );
            self.labelPAtNRI18n = i18n( 'InCaseMojit.patient_detail.label.PAT_NR' );
            self.labelFromPatientsI18n = i18n( 'InCaseMojit.patient_detail.label.FROM_PATIENTS' );
            self.labelFromContactsI18n = i18n( 'InCaseMojit.patient_detail.label.FROM_CONTACTS' );
            self.jpAddressesI18n = i18n( 'person-schema.JuristicPerson_T.addresses' );
            self.titleComI18n = i18n( 'InCaseMojit.communication_item.title.TITLE_COM' );
            self.titleNumI18n = i18n( 'InCaseMojit.number_item.title.TITLE_NUM' );
            self.titleACI18n = i18n( 'patient-schema.Patient_T.additionalContacts.i18n' );
            self.generalButtonDeleteI18n = i18n('general.button.DELETE');
            self.generalPleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );
            self.communicationValuePlaceholderI18n = i18n( 'person-schema.Communication_T.value.placeholder' );
            self.communicationButtonOPTInI18n = i18n('general.button.OPT_IN');
            self.communicationOPTInPlaceholderI18n = i18n('InCaseMojit.communication_item.placeholder.OPT_IN_BTN');
            self.invoiceRecipientI18n = i18n( 'patient-schema.Patient_T.invoiceRecipient.i18n' );
            self.reasonPlaceholderI18n = i18n('patient-schema.Patient_T.reason');

            var patientStatusVal = self.isDeceased() ? 'isDeceased' : self.inActive() ? 'inActive' : null;

            self.selectedPatientStatusValue = ko.observable( patientStatusVal );

            self.deselectRadioOption = function( viewModel, event ) {
                if( event.target.value === self.selectedPatientStatusValue() ) {
                    self.selectedPatientStatusValue( null );
                    event.target.checked = false;
                }
                return true;
            };

            self.addDisposable( ko.computed( function() {
                var val = ko.unwrap( self.selectedPatientStatusValue );
                self.checkAndSetPatientStatus( val );
            } ) );

            self.allowMailing = ko.computed({
                read: function() {
                    var self = this;
                    return !(self.noMailing() || false);
                },
                write: function( newVal ) {
                    var self = this;
                    self.noMailing(!newVal);
                },
                owner: self
            });

            self.allowMailingVisible = ko.computed( function() {
                return ko.unwrap( self.communications ).filter( function( communication ) {
                    return ko.unwrap( communication.type ) === "EMAILPRIV" || ko.unwrap( communication.type ) === "EMAILJOB";
                } ).length;
            } );

            var invoiceconfiguration, incaseconfiguration;

            if (Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland()){
                incaseconfiguration =  binder.getInitialData( 'incaseconfiguration' );
               
                if ( incaseconfiguration  &&  currentPatient.isNew()) {
                    self.dataTransmissionToMediportApproved(incaseconfiguration.mediportNeedsApproval);
                }
            }
            if( currentPatient.isNew() ){ //set PVS approval based on general settings
                invoiceconfiguration = binder.getInitialData( 'invoiceconfiguration' );
                if( invoiceconfiguration && false === invoiceconfiguration.pvsNeedsApproval ){
                    self.dataTransmissionToPVSApproved( true );
                }
            }

            self.isUnder18 = ko.computed( function() {
                return 18 > currentPatient.age();
            });

            self.invoiceRecipientList = ko.computed( function() {
                var
                    patientsFamilyMembers = currentPatient.patientsFamilyMembers(),
                    additionalFamilyMembers = currentPatient.additionalFamilyMembers(),
                    familyMembers;
                    familyMembers = patientsFamilyMembers.concat( additionalFamilyMembers )
                    .map( function( item ) {
                        return {
                            val: item.patientId || item.contactId,
                            text: self.showAffiliate( item.relationStatus ) + ' ' + ( item.patientText || item.contactText )
                        };
                    });
                return [ {val: null, text: i18n( 'general.message.PLEASE_SELECT' )} ].concat( familyMembers );
            });

            self.addDisposable( ko.computed( function() {
                var addresses = unwrap( currentPatient.addresses ),
                    invoiceRecipient = peek( self.invoiceRecipient ),
                    hasInvoice = addresses.some( function( address ) {
                        return 'BILLING' === address.kind();
                    });

                if( !addresses.length || isInitial ) {
                    return;
                }
                //clear invoice recipient on deleting BILLING address
                if( invoiceRecipient && !hasInvoice && !self.autoAddAddress ){
                    self.invoiceRecipient( null );
                }
            } ) );

            self.invoiceRecipient.subscribe( function( previousValue ){
                self.invoiceRecipientBefore = previousValue;
            }, self, "beforeChange");

            self.addDisposable( ko.computed( function() {
                var
                    invoiceRecipient = unwrap( self.invoiceRecipient ),
                    patientsFamilyMembers = unwrap( currentPatient.patientsFamilyMembers ),
                    additionalFamilyMembers = unwrap( currentPatient.additionalFamilyMembers ),
                    patientContact, additionalContact,
                    oldAddress,
                    adressText = i18n( 'person-schema.AddressKind_E.BILLING' );

                if( !self.firstLoad ) {
                    patientContact = patientsFamilyMembers.some( function( cont ) {
                        return cont.patientId === invoiceRecipient;
                    } );
                    additionalContact = additionalFamilyMembers.some( function( cont ) {
                        return cont.contactId === invoiceRecipient;
                    } );

                    //if new address going to ne added nex, and there are no required address yet, add one empty
                    if( ( patientContact || additionalContact ) && !peek( currentPatient.addresses ).length ){
                        //we need at least one official address so add empty one here first
                        self.autoAddAddress = true; //prevent clearing invoiceRecipient if no BILLING adresse
                        self.addNewAddress( { kind: 'OFFICIAL'} );
                        self.autoAddAddress = false;
                    }

                    //firstly move out active task from BILLING address, otherwise UI will be corrupted (address fields disappear)
                    if( patientContact || additionalContact || ( invoiceRecipient === null && self.invoiceRecipientBefore ) ){
                        jQuery( '.address-tabs li.component-tab' ).filter(function(){
                            return this.innerText !== adressText;
                        }).first().addClass( "active" );
                        jQuery( '.address-tabs div.component-content' ).filter(function(){
                            return this.innerText !== adressText;
                        }).first().addClass( "active" );
                    }

                    if( patientContact ) {
                        self.getPatientForContact( invoiceRecipient );
                    } else if( additionalContact ) {
                        self.getContactForContact( invoiceRecipient );
                    } else if( invoiceRecipient === null && self.invoiceRecipientBefore ){
                        //contact cleared, so remove corresponding address model from patient addresses
                        oldAddress = currentPatient.addresses().find( function( address ) {
                            return 'BILLING' === address.kind();
                        });
                        if( oldAddress ){
                            currentPatient.addresses( currentPatient.addresses().filter( function( address ) {
                                return 'BILLING' !== address.kind();
                            }) );
                            oldAddress.destroy();
                        }
                    }
                } else {
                    self.firstLoad = false;
                }
            }));
        },

        select2JobStatus: null,

        /**
         * 1. load patient
         * 2. call function to set Billing Address to currentPatient
         *
         * @param patientId
         * */
        getPatientForContact: function( patientId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.patient.read( {
                query: {
                    _id: patientId
                }
            } ).then( function( res ) {
                var
                    patient = res && res.data && res.data[0];
                    self.takeAndRunContact( patient );
            } ).fail( fail );
        },

        /**
         * 1. load base contact
         * 2. call function to set Billing Address to currentPatient
         *
         * @param contactId
         * */
        getContactForContact: function( contactId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.basecontact.read( {
                query: {
                    _id: contactId
                }
            } ).then( function( res ) {
                var
                    contact = (res && res.data && res.data[0]) || {};
                self.takeAndRunContact( contact );
            } ).fail( fail );
        },

        /**
         * set Billing Address to currentPatient
         *
         * @param contact
         * */
        takeAndRunContact: function( contact ) {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                address, hasBillingAddress, index,
                isOrganization = Y.doccirrus.schemas.basecontact.isOrganizationType( contact.baseContactType ),
                addresses = peek( currentPatient.addresses );
            // show error message if any address
            if( !contact || !contact.addresses || !contact.addresses.length ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: i18n ( 'InCaseMojit.PatientSectionMainDataViewModel.infoDialog.NO_ADDRESS' )
                } );
                return;
            }
            hasBillingAddress = currentPatient.addresses().filter( function( address ) {
                return 'BILLING' === address.kind();
            });
            // if user has billing address, first need to remove it
            address = {
                kind: 'BILLING',
                payerType: ( isOrganization ? 'organization' : 'person'),
                talk: contact.talk,
                title: contact.title,
                firstname: contact.firstname,
                nameaffix: contact.nameaffix,
                lastname: contact.lastname,
                street: contact.addresses[0].street,
                houseno: contact.addresses[0].houseno,
                zip: contact.addresses[0].zip,
                city: contact.addresses[0].city,
                addon: contact.addresses[0].addon,
                country: contact.addresses[0].country,
                cantonCode: contact.addresses[0].cantonCode
            };
            if( isOrganization ){
                address.receiver = contact.content;
            }

            if( hasBillingAddress && hasBillingAddress[0] ) {
                index = addresses.indexOf( hasBillingAddress[0] );
                if( -1 !== index ) {
                    currentPatient.addresses.splice( index, 1, address );
                }
            } else {
                currentPatient.addresses.push( address );
            }
        },

        initJobStatusEdit: function() {
            var
                self = this,
                defaultJobStatusList = Y.doccirrus.schemas.person.types.JobStatus_E.list.map( function( item ) {
                    return {
                        id: item.val,
                        text: item.i18n
                    };
                } );

            self.select2JobStatus = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( self.jobStatus );
                    },
                    write: function( $event ) {
                        self.jobStatus( $event.val );
                    }
                } ) ),
                select2: {
                    placeholder: i18n( 'person-schema.JobStatus_E.i18n' ),
                    allowClear: true,
                    quietMillis: 600,
                    initSelection: function( element, callback ) {

                        var elem = defaultJobStatusList.find( function( a ) {
                            return a.id === element.val();
                        } );

                        var data = {
                            id: element.val(),
                            text: elem ? elem.text : element.val()
                        };

                        callback( data );
                    },
                    query: function( query ) {

                        Y.doccirrus.jsonrpc.api.tag.read( {
                            query: {
                                type: Y.doccirrus.schemas.tag.tagTypes.JOBSTATUS,
                                title: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            },
                            options: {
                                itemsPerPage: 10,
                                sort: {title: 1}
                            },
                            fields: {title: 1}

                        } ).done( function( response ) {

                            var jobStatusList = response && response.data && response.data
                                .map( function( item ) {
                                    return {
                                        id: item.title, text: item.title
                                    };
                                } ) || [];

                            query.callback( {results: jobStatusList.concat( defaultJobStatusList )} );
                        } );

                    },
                    sortResults: function( data ) {
                        return data.sort( function( a, b ) {
                            return a.text.toLowerCase() < b.text.toLowerCase() ? -1 : a.text.toLowerCase() > b.text.toLowerCase() ? 1 : 0;
                        } );
                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                }
            };
        },

        checkAndSetPatientStatus: function( value ) {
            if( value === 'isDeceased' ) {
                this.isDeceased( true );
                this.inActive( false );
            } else if( value === 'inActive' ) {
                this.inActive( true );
                this.isDeceased( false );
            } else {
                this.isDeceased( false );
                this.inActive( false );
            }
        },

        initKbvDobAutoComplete: function() {
            var
                self = this;

            function yearAutoComplete( year ) {
                var
                    curYr, curCent;
                if( !year ) {
                    return moment().year();
                }
                if( year.length === 2 ) {
                    curYr = moment().year().toString();
                    curYr = Number( curYr.slice( 2 ) );
                    curCent = (curYr + 10) < Number( year ) ? '19' : '20';
                    return curCent + year;
                }
                return year;
            }

            self.addDisposable( ko.computed( function() {
                var
                    value = ko.unwrap( self.kbvDob );

                if( /^\d{1,8}$/.exec( value ) ) {
                    if( value === "0" || value === "00" ) {
                        self.kbvDob( "00.00.0000" );
                    } else {
                        self.kbvDob( TIMESTAMP_FORMAT
                            .replace( 'DD', value.slice( 0, 2 ) )
                            .replace( 'MM', value.slice( 2, 4 ) || moment().month() )
                            .replace( 'YYYY', yearAutoComplete( value.slice( 4, 8 ) ) ), TIMESTAMP_FORMAT );
                    }
                } else if( /^\d{2}\.\d{2}\.\d{2}$/.exec( value ) ) {
                    self.kbvDob( TIMESTAMP_FORMAT
                        .replace( 'DD', value.slice( 0, 2 ) )
                        .replace( 'MM', value.slice( 3, 5 ) || moment().month() )
                        .replace( 'YYYY', yearAutoComplete( value.slice( 6 ) ) ), value );
                }
            } ) );
        },

        initKbvDobErrorHandling: function initKbvDobErrorHandling() {
            // For the date of birth both values kbvDob and dob need to be valid
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.kbvDobOrDobhasError = ko.computed( function() {
                return currentPatient.kbvDob.hasError() || currentPatient.dob.hasError();
            } );
            self.kbvDobAndDobvalidationMessages = ko.computed( function() {
                return currentPatient.kbvDob.validationMessages().concat( currentPatient.dob.validationMessages() );
            } );
        },

        initLocationIdClientValidation: function initLocationidClientValidation( currentPatient, inCaseConfiguration ) {
            var self = this;
            var patientDataLocationMandatory = inCaseConfiguration.patientDataLocationMandatory;
            var LOCATION_ID_MANDATORY = i18n( 'validations.message.LOCATION_ID_MANDATORY' );

            self.locationId.validationMessages = ko.observableArray();

            self.locationId.hasError = ko.computed( function() {
                var insuranceStatus = ko.unwrap( currentPatient.insuranceStatus );
                var locationId = ko.unwrap( currentPatient.locationId );
                var hasError = patientDataLocationMandatory && noInsuranceWithLocation() && !locationId;

                if( hasError ) {
                    currentPatient.addError( "locationId" );
                    self.locationId.validationMessages( [LOCATION_ID_MANDATORY] );
                } else {
                    currentPatient.removeError( "locationId" );
                    self.locationId.validationMessages.removeAll();
                }

                return hasError;

                function noInsuranceWithLocation() {
                    var noInsuranceWithLocation = true;

                    insuranceStatus.forEach( function( insurance ) {
                        if( insurance.locationId ) {
                            noInsuranceWithLocation = false;
                        }
                    } );

                    return noInsuranceWithLocation;
                }
            } );
        },

        initAddressesClientValidation: function initAddressesClientValidation( currentPatient, inCaseConfiguration ) {
            var self = this;
            var patientDataAddressMandatory = inCaseConfiguration.patientDataAddressMandatory;
            var ADDRESS_MANDATORY = i18n( 'validations.message.ADDRESS_MANDATORY' );

            self.addresses.validationMessages = ko.observableArray();

            self.addresses.hasError = ko.computed( function() {
                var addresses = ko.unwrap( currentPatient.addresses );
                var hasError = patientDataAddressMandatory && !addresses.length;

                if( hasError ) {
                    currentPatient.addError( "addresses" );
                    self.addresses.validationMessages( [ADDRESS_MANDATORY] );
                } else {
                    currentPatient.removeError( "addresses" );
                    self.addresses.validationMessages.removeAll();
                }

                return hasError;
            } );
        },

        initCommunicationsClientValidation: function initCommunicationsClientValidation( currentPatient, inCaseConfiguration ) {
            var self = this;
            var patientDataPhoneNumberMandatory = inCaseConfiguration.patientDataPhoneNumberMandatory;
            var patientDataEmailMandatory = inCaseConfiguration.patientDataEmailMandatory;
            var PHONE_NUMBER_MANDATORY = i18n( 'validations.message.PHONE_NUMBER_MANDATORY' );
            var EMAIL_MANDATORY = i18n( 'validations.message.EMAIL_MANDATORY' );

            self.communications.validationMessages = ko.observableArray();

            self.communications.hasError = ko.computed( function() {
                var communications = ko.unwrap( currentPatient.communications );
                var phoneNumbers = communications.filter( function( entry ) {
                    return ["PHONEPRIV", "MOBILEPRIV", "PHONEJOB", "MOBILEJOB", "PHONEEEXT", 'PHONEEMERGENCY'].indexOf( ko.unwrap( entry.type ) ) > -1;
                } );
                var emails = communications.filter( function( entry ) {
                    return ["EMAILPRIV", "EMAILJOB"].indexOf( ko.unwrap( entry.type ) ) > -1;
                } );

                var hasPhoneNumberError = patientDataPhoneNumberMandatory && !phoneNumbers.length;
                var hasEmailError = patientDataEmailMandatory && !emails.length;
                var hasError = hasPhoneNumberError || hasEmailError;

                if( hasPhoneNumberError ) {
                    if( self.communications.validationMessages.indexOf( PHONE_NUMBER_MANDATORY ) === -1 ) {
                        self.communications.validationMessages.push( PHONE_NUMBER_MANDATORY );
                    }
                } else {
                    self.communications.validationMessages.remove( PHONE_NUMBER_MANDATORY );
                }
                if( hasEmailError ) {
                    if( self.communications.validationMessages.indexOf( EMAIL_MANDATORY ) === -1 ) {
                        self.communications.validationMessages.push( EMAIL_MANDATORY );
                    }
                } else {
                    self.communications.validationMessages.remove( EMAIL_MANDATORY );
                }

                if( hasError ) {
                    currentPatient.addError( "communications" );
                } else {
                    currentPatient.removeError( "communications" );
                    self.addresses.validationMessages.removeAll();
                }

                return hasError;
            } );
        },
        hasDanger: function( address ) {
            var
                hasError = false;
            // checking if element has error
            _.forOwn(address, function(value) {
                if( value && value.hasError && value.hasError() ) {
                    hasError = true;
                }
            });
            return hasError;
        },

        patientNoEditEnabled: null,
        partnerIdList: null,
        additionalContactsList: null,

        /** @private */
        _initPatientNoEdit: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.patientNoEditEnabled = ko.computed( function() {
                var
                    modelIsReadOnly = currentPatient._isModelReadOnly(),
                    isSuperUser = Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPERUSER ),
                    isAdmin = Y.doccirrus.auth.isAdmin(),
                    isNotNew = !currentPatient.isNew();

                return !modelIsReadOnly && isNotNew && (isAdmin || isSuperUser);
            } );

        },
        _initPatientSinceEdit: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.patientSinceEditEnabled = ko.computed( function() {
                var
                    isAdmin = Y.doccirrus.auth.isAdmin(),
                    isNotNew = !currentPatient.wasNew;
                return !(isAdmin && isNotNew);
            } );

        },
        /**
         * Coverts employee object to selec2 object
         * @method personToSelect2Object
         * @param {String} text
         * @returns {Object}
         */
        personToSelect2Object: function( person ) {
            if( !person ) {
                return person;
            }
            return {
                id: person._id,
                text: Y.doccirrus.schemas.person.personDisplay( person ),
                data: {
                    kbvDob: person.kbvDob,
                    dob: person.dob
                }
            };
        },
        initPartnerIdList: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.partnerIdList = ko.computed( function() {
                currentPatient.partnerIds().map( function( item ) {
                    if( !item.partnerId() ) {
                        item.isEditMode = ko.observable( false );
                    }
                } );
                return currentPatient.partnerIds().filter( function( item ) {
                    return !item.partnerId();
                } );
            } );

            self.addDisposable( ko.computed( function() {
                self.partnerIdList().forEach( function( item ) {
                    if( item.patientId.hasError() ) {
                        item.isEditMode( true );
                    }
                });
            } ) );
        },
        initAdditionalContactsList: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            //  additional contacts on patient is an array of contact ids, like familyDoctor, etc
            //  arrange this way for iteration in Knockout
            self.additionalContactsList = ko.computed( function() {
                var
                    additionalContactIds = currentPatient.additionalContacts(),
                    expanded = [],
                    i;

                for ( i = 0; i < additionalContactIds.length; i++ ) {
                    expanded.push( {
                        'idx': i,
                        'contactId': additionalContactIds[i]
                    } );
                }

                return expanded;
            } );

            self.koBaseContacts = {};

            //  keep a collection of KoBaseContacts inn line with additionalContacts, so as not to re-initialize
            //  them all on each change
            self.getContactVm = function( idx ) {
                var
                    plainAdditionalContacts = currentPatient.additionalContacts(),
                    contactId = plainAdditionalContacts[idx];

                function onSelectContact( baseContactId ) {
                    var contactIds = currentPatient.additionalContacts();
                    contactIds[ idx ] = baseContactId;

                    //  apparently need to re-initialize them after setting value, MOJ-10085
                    self.koBaseContacts[ idx ] = new Y.doccirrus.uam.KoBaseContact( {
                        //label: '',
                        initialValue: baseContactId,
                        readOnly: false,
                        onSelect: onSelectContact
                    } );

                    currentPatient.additionalContacts( contactIds );
                }

                if ( !self.koBaseContacts[ idx ] ) {
                    self.koBaseContacts[ idx ] = new Y.doccirrus.uam.KoBaseContact( {
                        //type: 'PHYSICIAN',
                        //subType: 'FAMILY_DOCTOR',
                        //label: '',
                        initialValue: contactId,
                        readOnly: false,
                        onSelect: onSelectContact
                    } );
                }

                return self.koBaseContacts[ idx ];
            };
        },
        /**
        * calls soap service to get more info about patient from covercard
        * */
        getPatientOFACInfo: function() {
            const self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );
            const patientId = peek( currentPatient._id ),
                vekaCardNo = peek( currentPatient.vekaCardNo );
            Promise.resolve(Y.doccirrus.jsonrpc.api.patient.getPatientOFACInfo({
                patientId: patientId,
                cardNo: vekaCardNo
            })).then( function( response ){
                const patientData = response.data;
                if(patientData) {
                    currentPatient.socialSecurityNo(patientData.cardholderIdentifier);
                    if(patientData.address) {
                        self.addAddress(patientData.address);
                    }
                    if(patientData.insuranceStatus) {
                        currentPatient.insuranceStatus.push(patientData.insuranceStatus);
                    }
                }
            }).catch( function( error ){
                Y.Array.invoke( error, 'display', 'error' );
            });
        },
        /**
         * Opens dialog to edit the "patientNo"
         */
        openPatientNoEditDialog: function() {
            var
                self = this,
                eventTarget = new Y.EventTarget(),
                patientDetailViewModel = self.get( 'PatientDetailViewModel' ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                patientNoOrig = peek( self.patientNo ),
                bindings = {
                    patientNo: ko.observable( patientNoOrig )
                },
                patientNoObservable = bindings.patientNo,
                bodyContent = Y.Node.create( '<div><div class="form-group" data-bind="hasFeedback: { field: patientNo, toggle: patientNo.hasError, messages: patientNo.validationMessages, popover: { container: \'#DCWindow-PatientNoEditDialog\' } }"><input class="form-control" data-bind="textInput: patientNo"></div></div>' ),
                dialog = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-PatientNoEditDialog',
                    className: 'DCWindow-PatientNoEditDialog',
                    title: i18n( 'InCaseMojit.PatientSectionMainDataViewModel.openPatientNoEditDialog.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_EDIT,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    bodyContent: bodyContent,
                    height: 220,
                    minHeight: 220,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    dialog.close( e );

                                    self.patientNo( peek( patientNoObservable ) );

                                    patientDetailViewModel.savePatient();

                                    eventTarget.fire( 'save', {}, {} );
                                    eventTarget.detachAll();
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            // also captures cancel for e.g.: ESC
                            if( !yEvent.newVal ) {
                                setTimeout( function() { // delay for letting others fire first

                                    eventTarget.fire( 'cancel' );
                                    eventTarget.detachAll();

                                    bindings.checkPatientNo.dispose();
                                    bindings.checkPatientNoSetPending.dispose();
                                    bindings.isSavePatientEnabledComputed.dispose();

                                    ko.cleanNode( bodyContent.getDOMNode() );

                                }, 10 );
                            }
                        }
                    }
                } );

            patientNoObservable.hasError = ko.observable( false );
            patientNoObservable.pending = ko.observable( false );
            patientNoObservable.validationMessages = ko.observableArray();

            bindings.isSavePatientEnabledComputed = ko.computed( function() {
                var
                    isNotPending = !unwrap( patientNoObservable.pending ),
                    hasNoError = !unwrap( patientNoObservable.hasError ),
                    isNotSame = patientNoOrig !== unwrap( patientNoObservable ),
                    isSavePatientEnabled = unwrap( patientDetailViewModel.isSavePatientEnabledComputed ),
                    saveButton = dialog.getButton( 'SAVE' ).button;

                if( isNotSame && isNotPending && hasNoError && isSavePatientEnabled ) {
                    saveButton.enable();
                } else {
                    saveButton.disable();
                }
            } ).extend( { rateLimit: 0 } );

            // immediately set pending, because in the throttled one it would be delayed
            bindings.checkPatientNoSetPending = ko.computed( function() {
                unwrap( patientNoObservable );
                if( !isInitial() ) {
                    patientNoObservable.pending( true );
                }
            } );

            bindings.checkPatientNo = ko.computed( function() {
                var
                    patientNo = unwrap( patientNoObservable );

                if( !isInitial() ) {
                    ignoreDependencies( function() {
                        patientNoObservable.validationMessages.removeAll();
                        if( patientNo ) {
                            if( patientNoObservable.promise ) {
                                patientNoObservable.promise.reject( new Error( 'Request aborted' ) );
                            }
                            patientNoObservable.promise = Y.doccirrus.jsonrpc.api.patient.checkPatientNo( {
                                query: {
                                    patientNo: patientNo,
                                    patientId: peek( currentPatient._id )
                                }
                            } );
                            patientNoObservable.promise.done( function() {
                                patientNoObservable.hasError( false );
                                currentPatient.patientNo( patientNo );
                            } );
                            patientNoObservable.promise.fail( function() {
                                patientNoObservable.hasError( true );
                                patientNoObservable.validationMessages.push( i18n( 'InCaseMojit.patient_detailJS.message.PATIENT_NO_ERROR_MESSAGE' ) );
                            } );

                            patientNoObservable.promise.always( function() {
                                delete patientNoObservable.promise;
                                patientNoObservable.pending( false );
                            } );
                        } else {
                            if( currentPatient.isNew() ) {
                                patientNoObservable.hasError( false );
                            }
                            else {
                                patientNoObservable.hasError( true );
                                patientNoObservable.validationMessages.push( i18n( 'InCaseMojit.patient_detailJS.message.PATIENT_NO_VALID_ERROR_MESSAGE' ) );
                            }
                            patientNoObservable.pending( false );
                        }
                    } );
                }

            } ).extend( { throttle: 500 } );

            eventTarget.publish( 'cancel', { preventable: false } );
            eventTarget.publish( 'save', { preventable: false } );

            ko.applyBindings( bindings, bodyContent.getDOMNode() );

            return eventTarget;
        },
        /**
         * Opens dialog to edit the "additional No"
         */
        openAdditionalNoEditDialog: function() {
            var
                self = this,
                extra = unwrap( self.extra ),
                patientId = unwrap( self.patientId ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                bindings = {
                    extra: ko.observable( extra ),
                    patientId: ko.observable( patientId ),
                    labelExtraI18n: i18n( 'InCaseMojit.patient_detail.label.EXTRA' ),
                    labelPartNRI18n: i18n( 'InCaseMojit.patient_detail.label.PART_NR' )
                },
                validation = Y.doccirrus.validations.common.Patient_T_patientId[0],
                bodyContent = Y.Node.create( '<div><div class="form-group" data-bind="hasFeedback: { field: extra, toggle: extra.hasError, messages: extra.validationMessages, popover: { container: \'#DCWindow-AdditionalNoEditDialog\' } }"><label data-bind="text: labelExtraI18n"></label><input class="form-control" name="extra" data-bind="value: extra, readOnly: extra.readOnly, attr: { title: extra }"></div><div class="form-group" data-bind="hasFeedback: { field: patientId, toggle: patientId.hasError, messages: patientId.validationMessages, popover: { container: \'#DCWindow-AdditionalNoEditDialog\' } }"><label data-bind="text: labelPartNRI18n"></label><input class="form-control" name="patientId" data-bind="value: patientId, readOnly: patientId.readOnly, attr: { title: patientId }"></div></div>' ),
                dialog = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-AdditionalNoEditDialog',
                    className: 'DCWindow-AdditionalNoEditDialog',
                    title: i18n( 'InCaseMojit.number_item.title.TITLE_NUM' ),
                    icon: Y.doccirrus.DCWindow.ICON_EDIT,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    bodyContent: bodyContent,
                    height: 300,
                    minHeight: 220,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    dialog.close( e );
                                    if( 'PatientSectionMainDataViewModel' === self.name ) {
                                        currentPatient.partnerIds.push( {
                                            patientId: unwrap( bindings.patientId ) || '',
                                            extra: unwrap( bindings.extra ) || ''
                                        } );
                                    } else {
                                        self.patientId( unwrap( bindings.patientId ) );
                                        self.extra( unwrap( bindings.extra ) );
                                    }
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            // also captures cancel for e.g.: ESC
                            if( !yEvent.newVal ) {
                                setTimeout( function() { // delay for letting others fire first
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                }, 10 );
                            }
                        }
                    }
                } );

            bindings.patientId.validationMessages = ko.observableArray( [i18n( 'InCaseMojit.patient_detailJS.message.PATIENT_NO_VALID_ERROR_MESSAGE' )] );
            bindings.patientId.hasError = ko.computed( function() {
                var
                    value = bindings.patientId(),
                    isValid = validation.validator( ko.unwrap( value ) );
                return !isValid;
            } );

            bindings.isSavePatientEnabledComputed = ko.computed( function() {
                var
                    saveButton = dialog.getButton( 'SAVE' ).button,
                    hasError = unwrap(  bindings.patientId.hasError );

                if( !hasError ) {
                    saveButton.enable();
                } else {
                    saveButton.disable();
                }
            } ).extend( { rateLimit: 0 } );

            ko.applyBindings( bindings, bodyContent.getDOMNode() );

            return false;
        },
        /**
         * Opens dialog to edit the "family member from patients"
         */
        openAddPatientFamilyMember: function( $context, $data ) {
            var
                self = this,
                relationList = Y.doccirrus.schemas.patient.getPatientRelationList(),
                bindings = {
                    relationStatus: ko.observable( $data.relationStatus || '' ),
                    patientId: ko.observable( $data.patientId || '' ),
                    patientText: ko.observable( $data.patientText || '' ),
                    labelRelationToPatientI18n: i18n( 'InCaseMojit.patient_detail.label.RELATIONTOPATIENT' ),
                    labelSearchI18n: i18n( 'InCaseMojit.patient_detail.label.SEARCH' )
                },
                currentPatient = peek( self.get( 'currentPatient' ) ),
                bodyContent = Y.Node.create( '<div><div class="form-group" data-bind="highlightError: relationStatus"><label data-bind="text: labelRelationToPatientI18n"></label><input class="form-control" type="hidden" data-bind="select2: select2FamilyRelationship"></div><div class="form-group" data-bind="highlightError: patientId"><label data-bind="text: labelSearchI18n"></label><input class="form-control" name="patientId" data-bind="select2: select2Patient"></div></div>' ),
                dialog = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-AddPatientFamilyMember',
                    className: 'DCWindow-AddPatientFamilyMember',
                    title: i18n( 'InCaseMojit.patient_detail.label.FROM_PATIENTS' ),
                    icon: Y.doccirrus.DCWindow.ICON_EDIT,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    bodyContent: bodyContent,
                    height: 300,
                    minHeight: 220,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    focusOn: [],
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    var item = {
                                        relationStatus: unwrap( bindings.relationStatus ) || '',
                                        patientId: unwrap( bindings.patientId ) || '',
                                        patientText: unwrap( bindings.patientText ) || ''
                                    };
                                    dialog.close( e );
                                    if( !$data.relationStatus && !$data.patientId && !$data.patientText ) {
                                        currentPatient.patientsFamilyMembers.push(item);
                                    } else {
                                        currentPatient.patientsFamilyMembers.replace($data, item);
                                    }
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            // also captures cancel for e.g.: ESC
                            if( !yEvent.newVal ) {
                                setTimeout( function() { // delay for letting others fire first
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                }, 10 );
                            }
                        }
                    }
                } );

            bindings.select2Patient = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return {id: unwrap( bindings.patientId ) || '', text: unwrap( bindings.patientText ) || ''};
                    },
                    write: function( $event ) {
                        bindings.patientId( $event.added.id );
                        bindings.patientText( $event.added.text );
                    }
                } ) ),
                placeholder: ko.observable( "\u00A0" ),
                select2: {
                    width: '100%',
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.patient.getPatients( {
                            query: {
                                isStub: {$ne: true},
                                term: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, {
                                    onlyRegExp: true,
                                    noRegexEscape: true
                                } ),
                                _id: unwrap( currentPatient._id ) ? { $ne: unwrap( currentPatient._id ) } : null
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( patient ) {
                                        return self.personToSelect2Object( patient );
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    },
                    formatResult: function( obj ) {
                        var
                            person = obj.data,
                            dob = (person.dob && ' [' + person.kbvDob + ']') || '';
                        return obj.text + dob;
                    }

                }
            };

            bindings.select2FamilyRelationship = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( bindings.relationStatus );
                    },
                    write: function( $event ) {
                        bindings.relationStatus( $event.val );
                    }
                } ) ),
                    select2: {
                    placeholder: bindings.labelRelationToPatientI18n,
                        allowClear: true,
                        quietMillis: 600,
                        initSelection: function( element, callback ) {
                        var
                            elem = relationList.find( function( a ) {
                                return a.value === element.val();
                            } );

                        var data = {
                            id: element.val(),
                            text: elem ? elem.text : element.val()
                        };

                        callback( data );
                    },
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.tag.read( {
                            query: {
                                type: Y.doccirrus.schemas.tag.tagTypes.RELATIONSHIPSTATUS,
                                title: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            },
                            options: {
                                itemsPerPage: 10,
                                sort: {title: 1}
                            },
                            fields: {title: 1}

                        } ).done( function( response ) {
                            var
                                relationShipStatusList = response && response.data && response.data
                                    .map( function( item ) {
                                        return {
                                            id: item.title, text: item.title
                                        };
                                    } ) || [],
                                preparedList = relationList.map( function( item ) {
                                    return {
                                        id: item.value, text: item.text
                                    };
                                });

                            query.callback( {results: preparedList.concat( relationShipStatusList )} );
                        } );

                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                }
            };

            bindings.relationStatus.hasError = ko.computed( function() {
                return "" === bindings.relationStatus();
            } );

            bindings.patientId.hasError = ko.computed( function() {
                return "" === bindings.patientId();
            } );

            bindings.isSavePatientEnabledComputed = ko.computed( function() {
                var
                    saveButton = dialog.getButton( 'SAVE' ).button,
                    hasError = bindings.relationStatus.hasError() || bindings.patientId.hasError();

                if( !hasError ) {
                    saveButton.enable();
                } else {
                    saveButton.disable();
                }
            } ).extend( { rateLimit: 0 } );

            ko.applyBindings( bindings, bodyContent.getDOMNode() );

            return false;
        },
        /**
         * Opens dialog to edit the "family member from koBaseContact"
         */
        openAddAdditionalFamilyMember: function( $context, $data ) {
            var
                self = this,
                relationList = Y.doccirrus.schemas.patient.getPatientRelationList(),
                bindings,
                currentPatient,
                bodyContent,
                dialog;

            bindings = {
                relationStatus: ko.observable( $data.relationStatus || '' ),
                contactId: ko.observable( $data.contactId || '' ),
                contactText: ko.observable( $data.contactText || '' ),
                _personSelection: new Y.doccirrus.uam.KoBaseContact( {
                    label: i18n( 'InCaseMojit.patient_detail.label.SEARCH' ),
                    initialValue: ($data && $data.contactId)  || '',
                    readOnly: false,
                    onSelect: function( baseContactId ) {
                        return baseContactId;
                    }
                } ),
                labelRelationToPatientI18n: i18n( 'InCaseMojit.patient_detail.label.RELATIONTOPATIENT' )
            };
            bindings._personSelection.nameText( ( $data && $data.contactText ) || '' );
            currentPatient = peek( self.get( 'currentPatient' ) );
            bodyContent = Y.Node.create( '<div><div class="form-group" data-bind="highlightError: relationStatus"><label data-bind="text: labelRelationToPatientI18n"></label><input class="form-control" type="hidden" data-bind="select2: select2FamilyRelationship"></div><div class="form-group" data-bind="highlightError: contactId"><div data-bind="template: { name: \'KoBaseContact\', data: _personSelection }"></div></div></div>' );
            dialog = new Y.doccirrus.DCWindow( {
                id: 'DCWindow-AddAdditionalFamilyMember',
                className: 'DCWindow-AddAdditionalFamilyMember',
                title: i18n( 'InCaseMojit.patient_detail.label.FROM_CONTACTS' ),
                icon: Y.doccirrus.DCWindow.ICON_EDIT,
                width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                bodyContent: bodyContent,
                height: 300,
                minHeight: 220,
                minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        Y.doccirrus.DCWindow.getButton( 'SAVE', {
                            isDefault: true,
                            action: function( e ) {
                                dialog.close( e );
                                var item = {
                                    relationStatus: unwrap( bindings.relationStatus ) || '',
                                    contactId: unwrap( bindings._personSelection.value ) || '',
                                    contactText: unwrap( bindings._personSelection.nameText ) || ''
                                };
                                dialog.close( e );
                                if( !$data.relationStatus && !$data.contactId && !$data.contactText ) {
                                    currentPatient.additionalFamilyMembers.push(item);
                                } else {
                                    currentPatient.additionalFamilyMembers.replace($data, item);
                                }
                            }
                        } )
                    ]
                },
                after: {
                    visibleChange: function( yEvent ) {
                        // also captures cancel for e.g.: ESC
                        if( !yEvent.newVal ) {
                            setTimeout( function() { // delay for letting others fire first
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }, 10 );
                        }
                    }
                }
            } );

            bindings.relationStatus.hasError = ko.computed( function() {
                return "" === bindings.relationStatus();
            } );

            bindings.contactId.hasError = ko.computed( function() {
                return !( bindings._personSelection && bindings._personSelection.value() );
            } );

            bindings.isSavePatientEnabledComputed = ko.computed( function() {
                var
                    hasError = bindings.relationStatus.hasError() || bindings.contactId.hasError(),
                    saveButton = dialog.getButton( 'SAVE' ).button;

                if( !hasError ) {
                    saveButton.enable();
                } else {
                    saveButton.disable();
                }
            } ).extend( { rateLimit: 0 } );

            bindings.select2FamilyRelationship = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( bindings.relationStatus );
                    },
                    write: function( $event ) {
                        bindings.relationStatus( $event.val );
                    }
                } ) ),
                select2: {
                    placeholder: bindings.labelRelationToPatientI18n,
                    allowClear: true,
                    quietMillis: 600,
                    initSelection: function( element, callback ) {
                        var
                            elem = relationList.find( function( a ) {
                                return a.value === element.val();
                            } );

                        var data = {
                            id: element.val(),
                            text: elem ? elem.text : element.val()
                        };

                        callback( data );
                    },
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.tag.read( {
                            query: {
                                type: Y.doccirrus.schemas.tag.tagTypes.RELATIONSHIPSTATUS,
                                title: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            },
                            options: {
                                itemsPerPage: 10,
                                sort: {title: 1}
                            },
                            fields: {title: 1}

                        } ).done( function( response ) {
                            var
                                relationShipStatusList = response && response.data && response.data
                                    .map( function( item ) {
                                        return {
                                            id: item.title, text: item.title
                                        };
                                    } ) || [],
                                preparedList = relationList.map( function( item ) {
                                    return {
                                        id: item.value, text: item.text
                                    };
                                });

                            query.callback( {results: preparedList.concat( relationShipStatusList )} );
                        } );

                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                }
            };

            dialog.set( 'focusOn', [] );
            ko.applyBindings( bindings, bodyContent.getDOMNode() );

            return false;
        },
        initLocation: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                binder = self.get( 'binder' ),
                locationList = binder.getInitialData( 'location' ).slice( 0 );

            locationList.unshift( {
                _id: '',
                locname: i18n( 'general.message.PLEASE_SELECT' )
            } );

            self.showPatientLocationSelection = ko.computed( function() {
                var locationId = unwrap( self.locationId ),
                    insuranceStatus = unwrap( currentPatient.insuranceStatus );
                return locationId || !insuranceStatus.length;
            } );

            self.locationList = ko.observableArray( locationList );
        },
        initConfirmedViewFromLocationIds: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                allLocationList = (binder.getInitialData( 'location' ) || [])
                    .concat( (binder.getInitialData( 'foreignLocations' ) || []) );

            self.select2ConfirmedViewFromLocationIds = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            confirmedViewFromLocationIds = self.confirmedViewFromLocationIds();
                        return confirmedViewFromLocationIds.map( function( confirmedViewFromLocationId ) {
                            var location = allLocationList.find( function( locationListItem ) {
                                return locationListItem._id === confirmedViewFromLocationId;
                            } );
                            return {
                                id: confirmedViewFromLocationId,
                                text: location.locname
                            };
                        } );

                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.confirmedViewFromLocationIds.push( $event.added.id );
                        }
                        if( $event.removed ) {
                            self.confirmedViewFromLocationIds.remove( $event.removed.id );
                        }
                    }
                } ) ),
                select2: {
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    width: '100%',
                    multiple: true,
                    data: allLocationList.map( function( entry ) {
                        return {id: entry._id, text: entry.locname};
                    } )
                }
            };

        },
        /**
         * Shows info of editing the "patientNo"
         */
        showPatientNoEditInfoDialog: function() {

            Y.doccirrus.DCWindow.notice( {
                message: i18n ( 'InCaseMojit.PatientSectionMainDataViewModel.infoDialog.message' ),
                window: { width: 'medium' }
            } );
        }

    }, {
        NAME: 'PatientSectionMainDataViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'talk',
                    'title',
                    'firstname',
                    'nameaffix',
                    'fk3120',
                    'lastname',
                    'gender',
                    'kbvDob',
                    'dob',
                    'jobTitle',
                    'jobStatus',
                    'workingAt',
                    'isPensioner',
                    'isDeceased',
                    'inActive',
                    'noMailing',
                    'sendPatientReceipt',
                    'dataTransmissionToPVSApproved',
                    'dataTransmissionToMediportApproved',
                    'careDegree',
                    'patientNo',
                    'socialSecurityNo',
                    'familyDoctorModel',
                    'vekaCardNo',
                    'ofacRawData',
                    'patientSince',
                    'dateOfDeath',
                    'dateOfInActive',
                    'reason',
                    'locationId',
                    'confirmedViewFromOtherLocations',
                    'confirmedViewFromLocationIds',
                    'physicians',
                    'addresses',
                    'communications',
                    'countryMode',
                    'patientsFamilyMembers',
                    'additionalFamilyMembers',
                    'invoiceRecipient',
                    'treatmentNeeds'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'addresses',
                        editorName: 'AddressEditorModel'
                    },
                    {
                        propName: 'communications',
                        editorName: 'CommunicationEditorModel'
                    },
                    {
                        propName: 'partnerIds',
                        editorName: 'PartnerIdsEditorModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    PatientModel.mixEditAddresses( PatientSectionMainDataViewModel );
    PatientModel.mixEditCommunications( PatientSectionMainDataViewModel );
    PatientModel.mixEditPhysicianSelection( PatientSectionMainDataViewModel );
    PatientModel.mixEditFamilyDoctorSelection( PatientSectionMainDataViewModel );
    PatientModel.mixEditInstitutionSelection( PatientSectionMainDataViewModel );
    PatientModel.mixEditSendPatientReceipt( PatientSectionMainDataViewModel );

    KoViewModel.registerConstructor( PatientSectionMainDataViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'DCWindow',
        'AddressEditorModel',
        'CommunicationEditorModel',
        'PatientModel',
        'AddContactModal',
        'PatientEditorMixin',
        'PatientSectionViewModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dcauth'
    ]
} );
