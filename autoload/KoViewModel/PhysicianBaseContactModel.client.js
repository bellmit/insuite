/*jslint anon:true, nomen:true*/
/*global YUI, ko */
'use strict';
YUI.add( 'PhysicianBaseContactModel', function( Y/*, NAME */ ) {
        /**
         * @module PhysicianBaseContactModel
         */

        var
            //peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,

            KoViewModel = Y.doccirrus.KoViewModel,
            BaseContactModel = KoViewModel.getConstructor( 'BaseContactModel' ),
            PhysicianBaseContactModel_CH = KoViewModel.getConstructor( 'PhysicianBaseContactModel_CH' );

        /**
         * @class PhysicianBaseContactModel
         * @constructor
         * @extends BaseContactModel
         */
        function PhysicianBaseContactModel( config ) {
            PhysicianBaseContactModel.superclass.constructor.call( this, config );
        }

        Y.extend( PhysicianBaseContactModel, BaseContactModel, {
            initializer: function PhysicianBaseContactModel_initializer() {
                var
                    self = this;
                self.isSwitz =  Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                self.initSupportContact();

                if (self.isSwitz) {
                    self.initSupportContact_CH();
                }

                self.asvTeamNumbersSelect2 = {
                    data: ko.computed( {
                        read: function() {
                            return self.asvTeamNumbers().map( function select2Mapper( item ) {
                                    return {
                                        id: item,
                                        text: item,
                                        data: item
                                    };
                                }
                            );
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.asvTeamNumbers.push( $event.added.id );
                            }
                            if( $event.removed ) {
                                self.asvTeamNumbers.remove( $event.removed.id );
                            }
                        }
                    } ),
                    select2: {
                        width: '100%',
                        placeholder: '',
                        allowClear: true,
                        multiple: true,
                        data: [],
                        createSearchChoice: function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        }
                    }
                };
            },
            destructor: function PhysicianBaseContactModel_destructor() {
            },
            initSupportContact: function PhysicianBaseContactModel_initSupportContact() {
                var
                    self = this;
                self.contactsI18n = i18n( 'PhysicianBaseContactModel_clientJS.title.CONTACTS' );
                self.addDisposable( ko.computed( function() {
                    var
                        baseContactType = unwrap( self.baseContactType );
                    if( 'PHYSICIAN' === baseContactType ) {
                        self.set( 'availableInstitutionTypes', Y.doccirrus.schemas.v_physician.types.InstitutionContactType_E.list );
                    } else if( 'THERAPIST' === baseContactType ) {
                        self.set( 'availableInstitutionTypes', Y.doccirrus.schemas.v_therapistcontact.types.InstitutionContactType_E.list );
                    } else {
                        self.set( 'availableInstitutionTypes', Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list.filter( function( item ) {
                            return 'OTHER' === item.val;
                        } ) );
                    }
                    if( !ko.computedContext.isInitial() ) {
                        self.institutionType( 'OTHER' );
                    }
                } ) );
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @override
             * @method getTypeName
             * @return {String}
             */
            getTypeName: function() {
                var result = PhysicianBaseContactModel.superclass.getTypeName.apply( this, arguments );
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
            select2ContactsMapper: function(item){
                return { id: item._id, text: item.institutionName, data: item };
            },
            select2ContactsQuery: function( query ) {
                var
                    self = this,
                    _query = {
                        query: {
                            institutionName: { $regex: query.term, $options: 'i' },
                            baseContactType: { $in: Y.doccirrus.schemas.basecontact.getOrganizationTypes() }
                        },
                        options: {
                            fields: {
                                institutionName: 1,
                                communications: 1,
                                addresses: 1
                            },
                            sort: {
                                institutionName: 1
                            },
                            itemPerPage: 10
                        }

                    };

                Y.doccirrus.jsonrpc.api.basecontact.read( _query )
                    .done( function( response ) {
                        var
                            data = response.data;
                        query.callback( {
                            results: data.map( self.select2ContactsMapper )
                        } );
                    } )
                    .fail( function() {
                        query.callback( {
                            results: []
                        } );
                    } );
            },
            getDataForNewContact: function(){
                return {
                    baseContactType: Y.doccirrus.schemas.basecontact.baseContactTypes.INSTITUTION
                };
            },
            getHTMLContactName: function( contact ){
                    return '<h4><a href="/contacts#/' + contact._id + '/" target="_blank">' + contact.institutionName + '</a></h4>';
            }
        }, {
            schemaName: 'v_physician',
            NAME: 'PhysicianBaseContactModel',
            ATTRS: {
                useSelect2Talk: {
                    /**
                     * Determines if a select2 for "useSelect2Talk" should be initialised
                     * @attribute useSelect2Talk
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: true
                },
                useSelect2ExpertiseType: {
                    /**
                     * Determines if a select2 for "useSelect2ExpertiseType" should be initialised
                     * @attribute useSelect2ExpertiseType
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: true
                },
                useSelect2OfficialNo: {
                    /**
                     * Determines if a select2 for "useSelect2OfficialNo" should be initialised
                     * @attribute useSelect2OfficialNo
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: true
                },
                useSelect2Bsnrs: {
                    /**
                     * Determines if a select2 for "useSelect2Bsnrs" should be initialised
                     * @attribute useSelect2Bsnrs
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },
                useSelect2Contacts: {
                    /**
                     * Determines if a select2 for "useSelect2Contacts" should be initialised
                     * @attribute useSelect2Contacts
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },
                useSelect2InstitutionType: {
                    /**
                     * Determines if a select2 for "useSelect2InstitutionType" should be initialised
                     * @attribute useSelect2InstitutionType
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },
                useAddContactBtn: {
                    /**
                     * Determines if a button "useAddContactBtn" should be initialised
                     * @attribute useAddContactBtn
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },
                availableInstitutionTypes: {
                    value: Y.doccirrus.schemas.v_physician.types.InstitutionContactType_E.list,
                    lazyAdd: false
                },
                allowedBaseContactTypeList: {
                    value: Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list.filter( function( item ){
                        return -1 !== Y.doccirrus.schemas.basecontact.getMedicalPersonTypes().indexOf( item.val );
                    } ),
                    lazyAdd: false
                },
                useSelect2CantonCode: PhysicianBaseContactModel_CH.ATTRS.useSelect2CantonCode,
                select2CantonCodeConfig:  PhysicianBaseContactModel_CH.ATTRS.select2CantonCodeConfig
            }
        } );

        Y.mix( PhysicianBaseContactModel, PhysicianBaseContactModel_CH, false, [
            'initSupportContact_CH'
        ], 1 );
        KoViewModel.registerConstructor( PhysicianBaseContactModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'BaseContactModel',
            'v_physician-schema',
            'person-schema',
            'simpleperson-schema',
            'PhysicianBaseContactModel_CH'
        ]
    }
);