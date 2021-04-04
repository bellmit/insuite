/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */
'use strict';
YUI.add( 'BaseContactModel', function( Y/*, NAME */ ) {
        /**
         * @module BaseContactModel
         */

        var
            peek = ko.utils.peekObservable,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            unwrap = ko.unwrap,

            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' );

        function select2Mapper( item ) {
            return {
                id: item,
                text: item,
                data: item
            };
        }

        /**
         * @class BaseContactModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function BaseContactModel( config ) {
            BaseContactModel.superclass.constructor.call( this, config );
        }

        BaseContactModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            availableTalks: {
                value: Y.doccirrus.schemas.person.types.Talk_E.list,
                lazyAdd: false
            },
            availableInstitutionTypes: {
                value: Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list,
                lazyAdd: false
            },
            availableExpertiseList: {
                value: Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                lazyAdd: false
            },
            specialitiesList: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            useSelect2InstitutionType: {
                /**
                 * Determines if a select2 for "useSelect2InstitutionType" should be initialised
                 * @attribute useSelect2InstitutionType
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useSelect2Talk: {
                /**
                 * Determines if a select2 for "useSelect2Talk" should be initialised
                 * @attribute useSelect2Talk
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useSelect2ExpertiseType: {
                /**
                 * Determines if a select2 for "useSelect2ExpertiseType" should be initialised
                 * @attribute useSelect2ExpertiseType
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useSelect2OfficialNo: {
                /**
                 * Determines if a select2 for "useSelect2OfficialNo" should be initialised
                 * @attribute useSelect2OfficialNo
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useSelect2Bsnrs: {
                /**
                 * Determines if a select2 for "useSelect2Bsnrs" should be initialised
                 * @attribute useSelect2Bsnrs
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useSelect2Contacts: {
                /**
                 * Determines if a select2 for "useSelect2Contacts" should be initialised
                 * It initialises "add contact" button as well.
                 * @attribute useSelect2Contacts
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            useAddContactBtn: {
                /**
                 * Determines if a button "useAddContactBtn" should be initialised
                 * @attribute useAddContactBtn
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            contactsObj: {
                value: [],
                lazyAdd: false
            },
            readOnlyBaseContactType: {
                /**
                 * Determines if "baseContactType" is read only
                 * @attribute readOnlyBaseContactType
                 * @type {boolean}
                 * @default true
                 */
                value: true,
                lazyAdd: false
            },
            allowedBaseContactTypeList: {
                value: Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list,
                lazyAdd: false
            }
        };

        Y.extend( BaseContactModel, KoViewModel.getBase(), {
            initializer: function BaseContactModel_initializer() {
                var
                    self = this;
                self.initBaseContact();

            },
            destructor: function BaseContactModel_destructor() {
            },
            /**
             * talk select2 autocompleter configuration
             * @property select2Talk
             * @type {Object}
             */
            select2Talk: null,
            /**
             * talk select2 autocompleter configuration
             * @property select2InstitutionType
             * @type {Object}
             */
            select2InstitutionType: null,
            /**
             * talk select2 autocompleter configuration
             * @property select2Expertise
             * @type {Object}
             */
            select2Expertise: null,
            /**
             * officialNo select2 autocompleter configuration
             * @property select2OfficialNo
             * @type {Object}
             */
            select2OfficialNo: null,
            /**
             * bsnrs select2 autocompleter configuration
             * @property select2Bsnrs
             * @type {Object}
             */
            select2Bsnrs: null,
            /**
             * display the translated enum value
             */
            baseContactTypeComputed: null,
            /**
             * template name
             * @property templateName
             * @type {String}
             */
            templateName: '',
            /**
             * initializes talk select2 autocompleter
             * @param {Boolean} shouldInit
             * @method initSelect2Talk
             */
            initSelect2Talk: function BaseContactModel_initSelect2Talk( shouldInit ) {
                var self = this;
                if( !shouldInit ){
                    return;
                }
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
                            return self.get( 'availableTalks' ).map( function( talk ) {
                                return {
                                    id: talk.val,
                                    text: talk.i18n
                                };
                            } );
                        })()
                    }
                };

            },
            initSelect2InstitutionType: function BaseContactModel_initSelect2InstitutionType( shouldInit ) {
                var self = this;
                self.showSelect2InstitutionType = ko.computed( function(){
                    var
                        baseContactType = unwrap( self.baseContactType ),
                        isInstitutionOrMed = Y.doccirrus.schemas.basecontact.baseContactTypes.INSTITUTION === baseContactType || Y.doccirrus.schemas.basecontact.isMedicalPersonType( baseContactType );
                    if( !isInstitutionOrMed ) {
                        self.institutionType( self.get( 'defaults.institutionType' ) );
                    }
                    return shouldInit && isInstitutionOrMed;
                } );
                if( !shouldInit ){
                    return;
                }
                self.select2InstitutionType = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var institutionType = ko.unwrap( self.institutionType );
                            return institutionType;
                        },
                        write: function( $event ) {
                            self.institutionType( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        data: function() {
                            return {
                                results: self.get( 'availableInstitutionTypes' ).map( function( institutionType ) {
                                    return {
                                        id: institutionType.val,
                                        text: institutionType.i18n
                                    };
                                } )
                            };
                        }
                    }
                };

            },
            initSelect2ExpertiseType: function BaseContactModel_initSelect2ExpertiseType( shouldInit ) {
                var self = this;
                if( !shouldInit ) {
                    return;
                }
                var specialitiesList = self.get( 'specialitiesList' ),
                    expertise = peek( self.expertise ),
                    oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list;

                expertise.forEach( function( val ) {
                    oldExpertiseList.some( function( oldExpertise ) {
                        if( val === oldExpertise.val ) {
                            specialitiesList.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                        }
                    } );
                } );

                self.select2Expertise = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                value = self.expertise() || null;
                            return value;

                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self.expertise( value );

                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        width: '100%',
                        multiple: true,
                        data: specialitiesList
                    }
                };
            },
            initSelect2Bsnrs: function BaseContactModel_initSelect2Bsnrs( shouldInit ) {
                var self = this;
                if( !shouldInit ) {
                    return;
                }

                self.select2Bsnrs = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            // provide select2 data objects
                            return Y.Array.map( self.bsnrs(), select2Mapper );
                        },
                        write: function( $event ) {
                            // transfer select2 data status
                            if( Y.Object.owns( $event, 'added' ) ) {
                                // bsnr equals id
                                self.bsnrs.push( $event.added.id );
                            }
                            if( Y.Object.owns( $event, 'removed' ) ) {
                                // bsnr equals id
                                self.bsnrs.remove( $event.removed.id );
                            }
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: "(N)BSNR",
                        allowClear: true,
                        multiple: true,
                        query: function( query ) {
                            var
                                data = {results: []};

                            function done( all ) {
                                data.results = all.map( function( el ) {
                                    return {id: el.bsnr, text: el.bsnr};
                                } );
                                query.callback( data );
                            }

                            if( query.term ) {
                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                                    return done( [] );
                                } else {
                                    jQuery.ajax( {
                                        type: 'GET',
                                        xhrFields: {withCredentials: true},
                                        url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/?action=catsearch&' + Y.QueryString.stringify( {
                                            catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                            itemsPerPage: 10,
                                            term: query.term,
                                            key: 'bsnr'
                                        } ) )
                                    } ).done( done );
                                }

                            } else {
                                query.callback( data );
                            }
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
            initSelect2OfficialNo: function BaseContactModel_initSelect2OfficialNo( shouldInit ) {
                var self = this;
                if( !shouldInit ){
                    return;
                }

                self.select2OfficialNo = Y.doccirrus.uam.utils.createOfficialNoAutoComplete( self );
            },

            select2ContactsQuery: function( query ) {
                query.callback( { results: [] } );
            },
            select2ContactsMapper: function( item ) {
                return item;
            },
            getDataForNewContact: function(){
                return {};
            },
            showAddContactModal: function(){
                var
                    self = this;
                return Y.doccirrus.modals.addContactModal.show( self.getDataForNewContact(), Y.doccirrus.schemas.basecontact.isOrganizationType( peek( self.baseContactType ) ) )
                    .then( self.onNewContactCreated.bind( self ) )
                    .catch( catchUnhandled );
            },
            onNewContactCreated: function( contactData ) {
                var
                    self = this,
                    contactsObj = self.get( 'contactsObj' );

                contactsObj.push( contactData );
                self.set( 'contactsObj', contactsObj );

                if( self.contactList ) {
                    self.contactList.push( self.select2ContactsMapper( contactData ) );
                } else {
                    self.contacts.push( contactData._id );
                }
            },
            addContact: null,
            initAddContactButton: function( shouldInit ){
                var
                    self = this;
                if( !shouldInit ){
                    return;
                }
                self.addContact = function() {
                    self.showAddContactModal();
                };
            },
            initSelect2Contacts: function BaseContactModel_initSelect2OfficialNo( shouldInit ) {
                var
                    self = this,
                    contactsObj = self.get( 'contactsObj' ),
                    contactsObjMap,
                    contacts = peek( self.contacts );
                if( !shouldInit ){
                    return;
                }

                contactsObjMap = contactsObj.reduce( function( obj, item ) {
                    obj[ item._id ] = item;
                    return obj;
                }, {} );

                self.contactList = ko.observableArray( contacts.map( function( id ) {
                    return self.select2ContactsMapper( contactsObjMap[ id ] );
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        contactList = unwrap( self.contactList );
                    if( !ko.computedContext.isInitial() ) {
                        self.contacts( contactList.map( function( data ) {
                            return data.id;
                        } ) );
                    }

                } ) );

                self.select2Contacts = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var contactList = ko.unwrap( self.contactList );
                            return contactList;
                        },
                        write: function( $event ) {
                            if( $event.added ){
                                self.contactList.push( $event.added );
                            }
                            if( $event.removed){
                                self.contactList.remove( function( data ) {
                                    return data.id === $event.removed.id;
                                } );
                            }
                        }
                    } ) ),
                    select2: {
                        multiple: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        query: self.select2ContactsQuery.bind( self )
                    }
                };

            },
            afterRender: function() {

            },
            afterAdd: function() {

            },
            beforeRemove: function() {

            },
            /**
             * initializes contact model
             */
            initBaseContact: function BaseContactModel_initContact() {
                var
                    self = this;

                self.generalTextI18n = i18n( 'InSuiteAdminMojit.tab_locations.submenu.general.text' );
                self.baseContactTypeI18n = i18n( 'basecontact-schema.BaseContact_T.baseContactType.i18n' );
                self.inEstI18n = i18n( 'InCaseMojit.physician_selection.label.IN_EST' );
                self.placeholderGlnNumberI18n = i18n( 'physician-schema.Physician_T.glnNumber.i18n' );
                self.placeholderZsrNumberI18n = i18n( 'physician-schema.Physician_T.zsrNumber.i18n' );


                self.baseContactTypeComputed = ko.computed( function() {
                    var baseContactType = self.baseContactType();

                    if( !baseContactType ) {
                        return '';
                    }

                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', baseContactType, Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list, baseContactType );

                } );
                self.initSelect2BaseContactType();
                self.initSelect2InstitutionType( self.get( 'useSelect2InstitutionType' ) );
                self.initSelect2Talk( self.get( 'useSelect2Talk' ) );
                self.initSelect2ExpertiseType( self.get( 'useSelect2ExpertiseType' ) );
                self.initSelect2OfficialNo( self.get( 'useSelect2OfficialNo' ) );
                self.initSelect2Bsnrs( self.get( 'useSelect2Bsnrs' ) );
                self.initSelect2Contacts( self.get( 'useSelect2Contacts' ) );
                self.initAddContactButton(self.get( 'useAddContactBtn' ));
                self.readOnlyBaseContactType = ko.observable( self.get( 'readOnlyBaseContactType' ) );

                self.templateName = ko.observable( self.get( 'templateName' ) );
                self.template = {
                    name: self.getTemplateName.bind( self ),
                    data: self,
                    afterRender: self.afterRender.bind( self ),
                    afterAdd: self.afterAdd.bind( self ),
                    beforeRemove: self.beforeRemove.bind( self )
                };
                self.countryModeIncludesGermany = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
                } );
                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                } );
            },
            initSelect2BaseContactType: function() {
                var
                    self = this;
                self.select2BaseContactType = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                baseContactType = unwrap( self.baseContactType );
                            return baseContactType;
                        },
                        write: function( $event ) {
                            self.baseContactType( $event.val );
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        placeholder: self.baseContactType.i18n,
                        data: self.get( 'allowedBaseContactTypeList' ).map( function( item ) {
                            return {
                                id: item.val,
                                text: item.i18n
                            };
                        } )
                    }
                };
            },
            getTemplateName: function() {
                var
                    templateName = unwrap( this.templateName );
                if( !templateName ) {
                    templateName = (this.name || 'PhysicianBaseContactModel').replace( /Model$/, '' );
                }
                return templateName;
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @override
             * @method getTypeName
             * @return {String}
             */
            getTypeName: function() {
                var result = BaseContactModel.superclass.getTypeName.apply( this, arguments );
                switch( result ) {
                    case 'AddressModel':
                        result = 'AddressBaseContactModel';
                        break;
                    case 'CommunicationModel':
                        result = 'CommunicationBaseContactModel';
                        break;
                }
                return result;
            },
            getHTMLContactName: function( /*contact*/ ) {
                return '';
            },
            getContactContent: function( item ) {
                var
                    self = this,
                    result = [],
                    contact = item.data,
                    contactName = self.getHTMLContactName( contact ),
                    address = Y.doccirrus.schemas.person.addressDisplay( contact.addresses, '<br/>' ),
                    simplePerson = Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( contact ) || {};
                result.push( contactName );
                result.push( address );
                if( simplePerson.phone ) {
                    result.push( 'T: <a href="tel:' + simplePerson.phone + '" target="_blank">' + simplePerson.phone + '</a>' );
                }
                if( simplePerson.fax ) {
                    result.push( 'F: <a href="tel:' + simplePerson.fax + '" target="_blank">' + simplePerson.fax + '</a>' );
                }
                if( simplePerson.email ) {
                    result.push( 'E: <a href="mailto:' + simplePerson.email + '" target="_blank">' + simplePerson.email + '</a>' );
                }
                return result.join( '<br/>' );
            }
        }, {
            schemaName: 'basecontact',
            NAME: 'BaseContactModel'
        } );
        KoViewModel.registerConstructor( BaseContactModel );

        /**
         * @class CommunicationBaseContactModel
         * @constructor
         * @param {Object} config
         * @extends CommunicationModel
         */
        function CommunicationBaseContactModel( config ) {
            CommunicationBaseContactModel.superclass.constructor.call( this, config );
        }

        Y.extend( CommunicationBaseContactModel, KoViewModel.constructors.CommunicationModel, {
            initializer: function CommunicationBaseContactModel_initializer() {
            },
            destructor: function CommunicationBaseContactModel_destructor() {
            }
        }, {
            schemaName: 'basecontact.communications',
            NAME: 'CommunicationBaseContactModel'
        } );
        KoViewModel.registerConstructor( CommunicationBaseContactModel );

        /**
         * @class AddressBaseContactModel
         * @constructor
         * @param {Object} config
         * @extends AddressModel
         */
        function AddressBaseContactModel( config ) {
            AddressBaseContactModel.superclass.constructor.call( this, config );
        }

        AddressBaseContactModel.ATTRS = {
            useSelect2Zip: {
                value: true,
                lazyAdd: false
            },
            useSelect2CountryCode: {
                value: true,
                lazyAdd: false
            },
            useSelect2City: {
                value: true,
                lazyAdd: false
            },
            useSelect2CantonCode: {
                /**
                 * Determines if a select2-binding config for "cantonCode" should be initialised
                 * @attribute useSelect2CantonCode
                 * @type {boolean}
                 * @default true
                 */
                value: true,
                lazyAdd: false
            },
            select2CantonCodeConfig: {
                /**
                 * Function which should return an appropriate select2-binding config for "cantonCode"
                 * @attribute select2CantonCodeConfig
                 * @type {function}
                 * @see ko.bindingHandlers.select2
                 */
                value: function select2CantonCodeConfig() {
                    var self = this;

                    self.cantonWithText = self.cantonWithText || ko.observable();

                    if( ko.unwrap( self.cantonCode ) ) {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getTarmedCantonsByCode( {
                            code: ko.unwrap( self.cantonCode ),
                            options: {
                                limit: 1
                            }
                        } ) ).then( function( response ) {
                            var entry = response && response.data && response.data[0];
                            var text = entry && entry.text || ko.unwrap( self.cantonCode );

                            self.cantonWithText( {
                                id: ko.unwrap( self.cantonCode ),
                                text: text
                            } );

                            if( !entry || !entry.text ) { // No text was found (text defaulted to the code)
                                throw new Y.doccirrus.commonerrors.DCError( 'canton_01' );
                            }
                        } )
                            .catch( function( err ) {
                                self.cantonWithText( {
                                    id: ko.unwrap( self.cantonCode ),
                                    text: ko.unwrap( self.cantonCode ) // default text to code
                                } );

                                return Y.doccirrus.DCWindow.notice( {
                                    message: Y.doccirrus.errorTable.getMessage( err )
                                } );
                            } );
                    }

                    return {
                        data: self.addDisposable( ko.computed( {
                            read: self.select2CantonCodeComputedRead,
                            write: self.select2CantonCodeComputedWrite
                        }, self ) ),
                        select2: {
                            width: '100%',
                            placeholder: PLEASE_SELECT,
                            query: function( search ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                                    searchTerm: search.term
                                } ) ).then( function( response ) {
                                    var results = response.data.map( function( item ) {
                                        return {
                                            id: item.code,
                                            text: item.text
                                        };
                                    } );
                                    search.callback( {results: results} );
                                } ).catch( function( err ) {
                                    return Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( err )
                                    } );
                                } );
                            },
                            formatSelection: function( result ) {
                                return result.text;
                            },
                            allowClear: true,
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2CantonCodeOnSelect( $event );
                                } );
                            }
                        }
                    };
                }
            }

        };

        Y.extend( AddressBaseContactModel, KoViewModel.constructors.AddressModel, {
            initializer: function AddressBaseContactModel_initializer() {
                var
                    self = this,
                    countriesList = [{id: 'CH', text: 'Schweiz'}, {id: 'D', text: 'Deutschland'}];
                self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                self.isDCPRC = Y.doccirrus.auth.isDCPRC();
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
                self.initKindDefault();
                self.initSelect2CantonCode( self.get( 'useSelect2CantonCode' ) );

                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                } );
            },
            destructor: function AddressBaseContactModel_destructor() {
            },
            initKindDefault: function() {
                var
                    self = this;

                if( self.isNew() && !peek( self.kind ) ) {
                    self.kind( 'POSTAL' );
                }

            },
            /**
             * Read computed handler of select2-binding config for "cantonCode"
             * @method select2CantonCodeComputedRead
             * @protected
             */
            select2CantonCodeComputedRead: function AddressBaseContactModel_select2CantonCodeComputedRead() {
                // no canton if country not CH
                if( this.countryCode && 'CH' !== this.countryCode() ) {
                    this.cantonWithText( null );
                }
                return ko.unwrap( this.cantonWithText );
            },
            /**
             * Write computed handler of select2-binding config for "cantonCode"
             * @method select2CantonCodeComputedWrite
             * @param {object} $event
             * @protected
             */
            select2CantonCodeComputedWrite: function AddressBaseContactModel_select2CantonCodeComputedWrite( $event ) {
                var self = this;

                self.cantonCode( $event.val );
                if( $event.added ) {
                    self.cantonWithText( $event.added );
                }
                if( $event.removed ) {
                    self.cantonWithText( null );
                }
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2CantonCodeOnSelect: function AddressBaseContactModel_select2CantonCodeOnSelect( /*$event*/ ) {},
            /**
             * May hold select2-binding config for "cantonCode"
             */
            select2CantonCode: null,
            /**
             * Initialises select2-binding config for "cantonCode"
             * @method initSelect2CantonCode
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2CantonCode: function AddressBaseContactModel_initSelect2CantonCode( mode ) {
                var self = this;
                var select2CantonCodeConfig;

                if( !mode ) {
                    return;
                }

                select2CantonCodeConfig = self.get( 'select2CantonCodeConfig' );

                self.select2CantonCode = select2CantonCodeConfig.call( this );
            }
        }, {
            schemaName: 'basecontact.addresses',
            NAME: 'AddressBaseContactModel'
        } );
        KoViewModel.registerConstructor( AddressBaseContactModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CommunicationModel',
            'AddressModel',
            'person-schema',
            'v_physician-schema',
            'promise'

        ]
    }
);