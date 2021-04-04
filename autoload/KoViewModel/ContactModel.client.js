/**
 * User: pi
 * Date: 22/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'ContactModel', function( Y/*, NAME */ ) {
        /**
         * @module ContactModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n;

        /**
         * @class ContactModel
         * @constructor
         * @extends KoViewModel
         */
        function ContactModel( config ) {
            ContactModel.superclass.constructor.call( this, config );
        }

        ContactModel.ATTRS = {
            /**
             * @attribute availableTalks
             * @type {Array}
             * @default Y.doccirrus.schemas.person.types.Talk_E.list
             */
            availableTalks: {
                value: Y.doccirrus.schemas.person.types.Talk_E.list,
                lazyAdd: false
            },
            /**
             * If true, model will require at least one communication with type 'EMAILPRIV' || 'EMAILJOB'
             *  also user can not remove first communication with one of these types
             * @attribute isEmailRequired
             * @type {Boolean}
             * @default true
             */
            isEmailRequired: {
                value: true,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ContactModel, KoViewModel.getBase(), {
            initializer: function ContactModel_initializer() {
                var
                    self = this;
                self.initContact();

            },
            destructor: function ContactModel_destructor() {
            },
            /**
             * @property availableTalks
             * @type {Array}
             */
            availableTalks: null,
            /**
             * @property fullname
             * @type {ko.computed}
             */
            fullname: null,
            /**
             * @property dobDatetimepickerOptions
             * @type {Object}
             */
            dobDatetimepickerOptions: null,
            /**
             * talk select2 autocompleter configuration
             * @property select2Talk
             * @type {Object}
             */
            select2Talk: null,
            /**
             * initializes talk select2 autocompleter
             * @method initSelect2Talk
             */
            initSelect2Talk: function ContactModel_initSelect2Talk(){
                var self = this;
                self.select2Talk = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var talk = ko.unwrap( self.talk );
                            return talk;
                        },
                        write: function( $event ) {
                            self.talk( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: (function() {
                            return self.availableTalks.map( function( talk ) {
                                return {
                                    id: talk.val,
                                    text: talk.i18n
                                };
                            } );
                        })()
                    }
                };

            },
            /**
             * Checks if there is at least one communication with type 'EMAILPRIV' || 'EMAILJOB'.
             *  If not, will add it. After that, locks first communication with such type.
             * @method setEmailRequired
             */
            setEmailRequired: function ContactModel_setEmailRequired(){
                var
                    self = this,
                    communicationEmail;
                communicationEmail = self.communications().some( function( communication ) {
                    var type = ko.utils.peekObservable( communication.type );
                    if( 'EMAILPRIV' === type || 'EMAILJOB' === type ) {
                        return true;
                    }
                    return false;
                } );
                if( !communicationEmail ) {
                    self.communications.push( { type: 'EMAILJOB'} );
                }
                self.communications().some( function( communication ) {
                    var type = ko.utils.peekObservable( communication.type );
                    if( 'EMAILPRIV' === type || 'EMAILJOB' === type ) {
                        communication.showDeleteButton( false );
                        communication.availableTypes = Y.doccirrus.schemas.person.types.Communication_E.list.filter( function( type ) {
                            return 'EMAILPRIV' === type.val || 'EMAILJOB' === type.val;
                        } );
                        return true;
                    }
                    return false;
                } );
            },
            /**
             * initializes contact model
             */
            initContact: function ContactModel_initContact(){
                var
                    self = this;
                self.availableTalks = self.get( 'availableTalks' );

                self.fullname = ko.computed( function() {
                    return self.firstname() + ' ' + self.lastname();
                } );

                self.dobDatetimepickerOptions = {
                    format: ko.observable( 'DD.MM.YYYY HH:mm' ),
                    sideBySide: true,
                    widgetPositioning: {
                        horizontal: 'left',
                        vertical: 'top'
                    }
                };
                self.initSelect2Talk();

                //contact should have at least one email contact
                if(self.get('isEmailRequired')){
                    self.setEmailRequired();
                }
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             */
            getTypeName: function(){
                var result = ContactModel.superclass.getTypeName.apply(this, arguments);
                switch(result){
                    case 'AddressModel':
                        result = 'ContactAddressModel';
                        break;
                    case 'CommunicationModel':
                        result = 'ContactCommunicationModel';
                        break;
                }
                return result;
            }
        }, {
            schemaName: 'contact',
            NAME: 'ContactModel'
        } );
        KoViewModel.registerConstructor( ContactModel );

        /**
         * @class CommunicationContactModel
         * @constructor
         * @extends CommunicationModel
         */
        function ContactCommunicationModel( config ) {
            ContactCommunicationModel.superclass.constructor.call( this, config );
        }

        Y.extend( ContactCommunicationModel, KoViewModel.constructors.CommunicationModel, {
            initializer: function ContactCommunicationModel_initializer() {
            },
            destructor: function ContactCommunicationModel_destructor() {
            }
        }, {
            schemaName: 'contact.communications',
            NAME: 'ContactCommunicationModel'
        } );
        KoViewModel.registerConstructor( ContactCommunicationModel );

        /**
         * @class AddressContactModel
         * @constructor
         * @extends AddressModel
         */
        function ContactAddressModel( config ) {
            ContactAddressModel.superclass.constructor.call( this, config );
        }

        Y.extend( ContactAddressModel, KoViewModel.constructors.AddressModel, {
            initializer: function ContactAddressModel_initializer() {
                var self = this,
                    countriesList = [{id: 'CH', text: 'Schweiz'}, {id: 'D', text: 'Deutschland'}];
                self.cantonWithText = self.cantonWithText || ko.observable();
                self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                self.select2Country = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                countryCode = self.countryCode(),
                                country = self.country();

                            if( countryCode && country ) {
                                return {id: countryCode, text: country};
                            }
                            else {
                                return null;
                            }
                        },
                        write: function( $event ) {
                            var choice;
                            if( $event.added ) {
                                choice = $event.added;
                                self.countryCode( choice.id );
                                self.country( choice.text );

                            }

                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        data: function() {
                            return {
                                // list of available days to choose from
                                results: countriesList
                            };
                        }
                    }
                };
                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                } );
            },
            destructor: function ContactAddressModel_destructor() {
            }
        }, {
            schemaName: 'contact.addresses',
            NAME: 'ContactAddressModel'
        } );
        KoViewModel.registerConstructor( ContactAddressModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CommunicationModel',
            'AddressModel',
            'person-schema',
            'contact-schema'
        ]
    }
);