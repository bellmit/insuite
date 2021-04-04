/*jslint anon:true, nomen:true*/
/*global YUI, ko, _, $ */
YUI.add( 'PatientEditorMixin', function( Y/*, NAME*/ ) {
        'use strict';
        /**
         * @module PatientEditorMixin
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ignoreDependencies = ko.ignoreDependencies,
            i18n = Y.doccirrus.i18n,

            KoViewModel = Y.doccirrus.KoViewModel,
            PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' );

        // mixEditAddresses
        (function() {
            var
                mixin = {
                    /**
                     * list of possible address kinds to add to "addresses"
                     * @type ko.computed
                     * @returns {array}
                     */
                    possibleAddressKindList: null,
                    /**
                     * DefaultBillingReceiver for this patient
                     * @type String
                     */
                    defaultBillingReceiver: null,
                    initEditAddresses: function() {
                        var
                            self = this,
                            currentPatient = unwrap( self.get( 'currentPatient' ) ),
                            addresses = currentPatient.addresses,
                            binder = self.get( 'binder' ),
                            inCaseConfiguration = binder.getInitialData( 'incaseconfiguration' ),
                            patientDataAddressMandatory = inCaseConfiguration.patientDataAddressMandatory,
                            mandatoryValidation = Y.doccirrus.validations.common.mandatory[0];

                        self.defaultBillingReceiver = ko.computed( function() {
                            var t = Y.doccirrus.schemaloader.translateEnumValue( '-de', unwrap( currentPatient.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );
                            return t + ' ' + unwrap( currentPatient.firstname ) + ' ' + unwrap( currentPatient.lastname );
                        } ).extend( {rateLimit: 0} );

                        if( currentPatient.isNew() && null === currentPatient.getAddressByKind( 'OFFICIAL' ) && null === currentPatient.getAddressByKind( 'POSTBOX' ) ) {
                            if( patientDataAddressMandatory ) {
                                self.addAddress( {
                                    kind: 'OFFICIAL'
                                } );
                            }
                        }

                        self.possibleAddressKindList = ko.computed( function() {
                            // listen for changes of array and of changes regarding "kind" in items
                            Y.each( unwrap( addresses ), function( address ) {
                                unwrap( address.kind );
                            } );
                            return ignoreDependencies( function() {
                                var
                                    hasAddressOfficial = Boolean( currentPatient.getAddressByKind( 'OFFICIAL' ) ),
                                    hasAddressPostbox = Boolean( currentPatient.getAddressByKind( 'POSTBOX' ) ),
                                    hasAddressMandatory = hasAddressOfficial || hasAddressPostbox,
                                    kindList = Y.doccirrus.utils.getObject( 'doccirrus.schemas.patient.schema.addresses.0.kind.list', Y ) || [],
                                // (MOJ-1488) remove "BRANCH" from valid items
                                    resultList = Y.Array.filter( kindList, function( item ) {
                                        return 'BRANCH' !== item.val;
                                    } );

                                if( hasAddressOfficial ) {
                                    // remove "OFFICIAL" from valid items, because only once
                                    resultList = Y.Array.filter( resultList, function( item ) {
                                        return 'OFFICIAL' !== item.val;
                                    } );
                                }

                                if( hasAddressPostbox ) {
                                    // remove "POSTBOX" from valid items, because only once
                                    resultList = Y.Array.filter( resultList, function( item ) {
                                        return 'POSTBOX' !== item.val;
                                    } );
                                }

                                if( !hasAddressMandatory ) {
                                    // force user to add a mandatory item first
                                    resultList = Y.Array.filter( resultList, function( item ) {
                                        return ['OFFICIAL', 'POSTBOX'].indexOf( item.val ) > -1;
                                    } );
                                }

                                return resultList;
                            } );
                        } );

                        self.addDisposable( ko.computed( function() {
                            Y.each( unwrap( addresses ), function( address ) {
                                var
                                    kind = unwrap( address.kind ),
                                    payerType = unwrap( address.payerType );

                                if( 'BILLING' === kind ) {
                                    if( 'person' === payerType ) {
                                        address.receiver( null );
                                        if( !address.talk() || ( typeof address.talk() === 'function' ) ) {
                                            address.talk( 'MR' );
                                            address.title( null );
                                            address.firstname( null );
                                            address.nameaffix( null );
                                            address.lastname( null );
                                        }
                                    }
                                    if( 'organization' === payerType ) {
                                        address.talk( 'NONE' );
                                        address.title( null );
                                        address.firstname( null );
                                        address.nameaffix( null );
                                        address.lastname( null );
                                    }
                                }

                                address.receiver.validationMessages = ko.observableArray( [mandatoryValidation.msg] );
                                address.receiver.hasError = ko.computed( function() {
                                    var
                                        value = unwrap( address.receiver ),
                                        kind = unwrap( address.kind ),
                                        payerType = unwrap( address.payerType ),
                                        isValid = true;
                                    if( 'BILLING' === kind && 'organization' === payerType ) {
                                        isValid = mandatoryValidation.validator( ko.unwrap( value ) );
                                    }
                                    return !isValid;
                                } );
                                address.firstname.validationMessages = ko.observableArray( [mandatoryValidation.msg] );
                                address.firstname.hasError = ko.computed( function() {
                                    var
                                        value = unwrap( address.firstname ),
                                        kind = unwrap( address.kind ),
                                        payerType = unwrap( address.payerType ),
                                        isValid = true;
                                    if( 'BILLING' === kind && 'person' === payerType ) {
                                        isValid = mandatoryValidation.validator( ko.unwrap( value ) );
                                    }
                                    return !isValid;
                                } );
                                address.lastname.validationMessages = ko.observableArray( [mandatoryValidation.msg] );
                                address.lastname.hasError = ko.computed( function() {
                                    var
                                        value = unwrap( address.lastname ),
                                        kind = unwrap( address.kind ),
                                        payerType = unwrap( address.payerType ),
                                        isValid = true;
                                    if( 'BILLING' === kind && 'person' === payerType ) {
                                        isValid = mandatoryValidation.validator( ko.unwrap( value ) );
                                    }
                                    return !isValid;
                                } );
                            } );
                        }));
                    },
                    setDefaultBillingReceiverValue: function( address ) {
                        var
                            receiver = peek( address.receiver ),
                            payerType = peek( address.payerType ),
                            kind = peek( address.kind );

                        if( 'BILLING' === kind ) {
                            if( !Boolean( receiver ) ) {
                                address.receiver( '' );
                            }
                            if( !Boolean( payerType ) ) {
                                address.payerType( peek( 'person' ) );
                            }
                        }

                    },
                    /**
                     * checks if current addresses may take the provided "kind"
                     * @method isAddressesKindAvailable
                     * @param {String} kind
                     * @return {Boolean}
                     */
                    isAddressesKindAvailable: function( kind ) {
                        var
                            self = this;

                        return Boolean( Y.Array.find( unwrap( self.possibleAddressKindList ), function( item ) {
                            return kind === item.val;
                        } ) );
                    },
                    /**
                     * return title for tab for the provided Model
                     * @method titleForAddressesTab
                     * @param {Model} address
                     * @return {String}
                     * @protected
                     */
                    titleForAddressesTab: function( address ) {
                        var
                            option = unwrap( address._availableKindList ),
                            kind = unwrap( address.kind ),
                            title;
                        if( option && option.length && kind ) {
                             option.forEach( function( item ) {
                                 if( item.val === kind ) {
                                     title = item.i18n;
                                 }
                             });
                        } else {
                            title = PLEASE_SELECT;
                        }

                        return title;
                    },
                    /**
                     * return an appropriate template-name for the provided Model
                     * @method addressTemplate
                     * @param {Model} address
                     * @return {String}
                     * @protected
                     */
                    addressTemplate: function( address ) {
                        var
                            kind = unwrap( address.kind );

                        switch( kind ) {
                            case 'BILLING':
                                return 'PatientAddressEditorModel-BILLING';
                            case 'POSTBOX':
                                return 'PatientAddressEditorModel-POSTBOX';
                            default:
                                return 'PatientAddressEditorModel-default';
                        }
                    },
                    addAddress: function( address ) {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        //
                        // self.setDefaultBillingReceiverValue
                        currentPatient.addresses.push( address || {} );
                        // make active last added address
                        $( '.address-tabs li.component-tab' ).removeClass( 'active' ).last().addClass( "active" );
                        $( '.address-tabs div.component-content' ).removeClass( 'active' ).last().addClass( "active" );
                    },
                    addNewAddress: function( config ) {
                        var
                            self = this;

                        self.addAddress( Object.assign( {}, config || {} ) );
                    }
                };

            /**
             * @method mixEditAddresses
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditAddresses = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEditCommunications
        (function() {
            var
                mixin = {
                    initEditCommunications: function() {
                        var
                            self = this,
                            currentPatient = unwrap( self.get( 'currentPatient' ) ),
                            binder = self.get( 'binder' ),
                            inCaseConfiguration = binder.getInitialData( 'incaseconfiguration' ),
                            patientDataPhoneNumberMandatory = inCaseConfiguration.patientDataPhoneNumberMandatory,
                            patientDataEmailMandatory = inCaseConfiguration.patientDataEmailMandatory,
                            communications = peek( currentPatient.communications );

                        if( currentPatient.isNew() && 0 === communications.length ) {
                            if( patientDataPhoneNumberMandatory ) {
                                self.addNewCommunication();
                            }
                            if( patientDataEmailMandatory ) {
                                self.addNewCommunication();
                                communications[communications.length - 1].type( "EMAILPRIV" );
                            }
                        }
                    },
                    /**
                     * return title for tab for the provided Model
                     * @method titleForCommunicationTab
                     * @param {Model} communication
                     * @return {String}
                     * @protected
                     */
                    titleForCommunicationTab: function( communication ) {
                        var
                            list = unwrap( communication.type.list ),
                            type = unwrap( communication.type ),
                            title = '';
                        if( list && list.length && type ) {
                            list.forEach( function( item ) {
                                if( item.val === type ) {
                                    title = item.i18n;
                                }
                            });
                        } else {
                            title = PLEASE_SELECT;
                        }

                        return title;
                    },
                    addCommunication: function( address ) {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        currentPatient.communications.push( address || {} );
                        // make active last added communication
                        $( '.communication-tabs li.component-tab' ).removeClass( 'active' ).last().addClass( "active" );
                        $( '.communication-tabs div.component-content' ).removeClass( 'active' ).last().addClass( "active" );
                    },
                    addNewCommunication: function() {
                        var
                            self = this;

                        self.addCommunication( {} );
                    }
                };

            /**
             * @method mixEditCommunications
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditCommunications = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEditPhysicianSelection
        (function() {
            var
                mixin = {
                    _physicianSelection: null,
                    initEditPhysicianSelection: function() {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        self._physicianSelection = new Y.doccirrus.uam.KoBaseContact( {
                            type: 'PHYSICIAN',
                            label: i18n( 'PatientEditorMixin_clientJS.label.PHYSICIAN' ),
                            initialValue: currentPatient.physicians.peek() && currentPatient.physicians.peek()[0],
                            readOnly: peek(currentPatient.physicians.readOnly),
                            onSelect: function( baseContactId ) {
                                if( baseContactId ) {
                                    currentPatient.physicians( [baseContactId] );
                                } else {
                                    currentPatient.physicians( [] );
                                }
                            }
                        } );

                    }
                };

            /**
             * @method mixEditPhysicianSelection
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditPhysicianSelection = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEditInstitutionSelection
        (function() {
            var
                mixin = {
                    _institutionSelection: null,
                    initEditInstitutionSelection: function() {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        self._institutionSelection = new Y.doccirrus.uam.KoBaseContact( {
                            type: 'INSTITUTION',
                            initialValue: currentPatient.institution.peek(),
                            readOnly: currentPatient.institution.readOnly.peek(),
                            onSelect: function( baseContactId ) {
                                if( baseContactId ) {
                                    currentPatient.institution( baseContactId );
                                } else {
                                    currentPatient.institution( null );
                                }
                            }
                        } );

                    }
                };

            /**
             * @method mixEditInstitutionSelection
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditInstitutionSelection = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEditFamilyDoctoSelection
        (function() {
            var
                mixin = {
                    _familyDoctorSelection: null,
                    initEditFamilyDoctorSelection: function(  ) {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        self._familyDoctorSelection = new Y.doccirrus.uam.KoBaseContact( {
                            type: 'PHYSICIAN',
                            subType: 'FAMILY_DOCTOR',
                            label: i18n( 'patient-schema.Patient_T.familyDoctor.i18n' ),
                            initialValue: currentPatient.familyDoctor.peek(),
                            readOnly: currentPatient.familyDoctor.readOnly.peek(),
                            onSelect: function( baseContactId ) {
                                if( baseContactId ) {
                                    currentPatient.familyDoctor( baseContactId );
                                } else {
                                    currentPatient.familyDoctor( null );
                                }
                            }
                        } );
                    }
                };

            /**
             * @method mixEditInstitutionSelection
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditFamilyDoctorSelection = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEditSendPatientReceipt
        (function() {
            var
                mixin = {
                    sendPatientReceiptVisible: null,
                    initEditSendPatientReceipt: function() {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        self.sendPatientReceiptVisible = ko.computed( function() {
                            return unwrap( currentPatient.hasPublicInsurance );
                        } );

                    }
                };

            /**
             * @method mixEditSendPatientReceipt
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixEditSendPatientReceipt = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixAddNewInsuranceStatus
        (function() {
            var
                mixin = {
                    addNewInsuranceStatus: function() {
                        var
                            additionalRegex = Y.doccirrus.regexp.additionalInsuranceTypeRegex,
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) ),
                            currenPatientCountryMode = unwrap( currentPatient.countryMode() ),
                            insuranceStatusObservable = currentPatient.insuranceStatus,
                            insuranceStatus = peek( insuranceStatusObservable ),
                            allTypes = Y.doccirrus.schemas.person.types.Insurance_E.list.filter( function( entry ) {
                                return _.intersection( entry.countryMode, currenPatientCountryMode ).length;
                            } ).sort( function( a, b ) {
                                if( a.val.match( additionalRegex ) && !b.val.match( additionalRegex ) ) {
                                    return 1;
                                } else if( !a.val.match( additionalRegex ) && b.val.match( additionalRegex ) ) {
                                    return -1;
                                } else {
                                    return 0;
                                }
                            } ).map( function( entry ) {
                                return entry.val;
                            } ),
                            usedTypes = insuranceStatus.map( function( insurance ) {
                                return peek( insurance.type );
                            } ),
                            availableTypes = Y.Array.filter( allTypes, function( type ) {
                                return usedTypes.indexOf( type ) === -1;
                            } );

                        if( !allTypes.length ) {
                            return Y.doccirrus.DCSystemMessages.addMessage( {
                                content: 'Für die Länder des Patienten gibt es keinen Kostenträger Typ!',
                                messageId: 'no-insurance-type-availalbe-' + peek( currentPatient._id ),
                                level: 'WARNING',
                                _removeTimeout: 30000
                            } );
                        }

                        if( availableTypes.length ) {
                            insuranceStatusObservable.push( {
                                type: availableTypes[0],
                                feeSchedule: 'PRIVATE' === availableTypes[0] ? '3' : undefined
                            } );
                            return;
                        }

                        Y.doccirrus.DCSystemMessages.addMessage( {
                            content: 'Sie können jeden Kostenträgertyp nur einmal auswählen!',
                            messageId: 'all-insurance-types-used-' + peek( currentPatient._id ),
                            level: 'WARNING',
                            _removeTimeout: 30000
                        } );
                    }
                };

            /**
             * @method mixAddNewInsuranceStatus
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            PatientModel.mixAddNewInsuranceStatus = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'PatientModel',
            'dcutils',
            'patient-schema',
            'KoBaseContact',
            'dcregexp'
        ]
    }
);