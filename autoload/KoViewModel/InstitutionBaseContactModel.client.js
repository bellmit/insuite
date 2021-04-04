/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */
'use strict';
YUI.add( 'InstitutionBaseContactModel', function( Y/*, NAME */ ) {
        /**
         * @module InstitutionBaseContactModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            BaseContactModel = KoViewModel.getConstructor( 'BaseContactModel' ),
            userLang = Y.doccirrus.comctl.getUserLang();

        /**
         * @class InstitutionBaseContactModel
         * @constructor
         * @param {Object} config
         * @extends BaseContactModel
         */
        function InstitutionBaseContactModel( config ) {
            InstitutionBaseContactModel.superclass.constructor.call( this, config );
        }

        /**
         * default error notifier
         */
        function fail( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }

        }

        Y.extend( InstitutionBaseContactModel, BaseContactModel, {
            initializer: function InstitutionBaseContactModel_initializer() {
                var
                    self = this;
                self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                self.sendElectronicOrderI18n = i18n( 'basecontact-schema.InstitutionContact_CH_T.sendElectronicOrder.i18n' );
                self.listenFormIdChange = ko.computed( function() {
                    self.formId = unwrap( self.defaultFormId ) || null;
                } );

                self.deactivated = ko.observable( false );

                if( unwrap( self.status ) === "INACTIVE" ) {
                    self.deactivated( true );
                }

                self.disable = ko.observable();

                self.isMainSupplierI18n = i18n( 'basecontact-schema.InstitutionContact_CH_T.isMainSupplier.i18n' );
                self.statusDeactivatedI18n = i18n( 'basecontact-schema.StatusType_E.INACTIVE.i18n' );
                self.statusDeactivatedI18nCapitalised = unwrap( self.statusDeactivatedI18n ).charAt( 0 ).toUpperCase() + unwrap( self.statusDeactivatedI18n ).slice( 1 );
                self.AN_ERROR_OCCURRED = i18n( 'general.message.AN_ERROR_OCCURRED' );
                self.defaultForm = ko.observable( null );
                self.orderFormi18n = i18n( 'InStockMojit.newOrderModal.titles.chooseFormButton' );
                if( self.formId ) {
                    self.displayDefaultFormName( self.formId );
                }
                self.showAdditionalVendorFields = unwrap( self.baseContactType ) === "VENDOR" || false;
                self.initSupportContact();
                self.initObservables();

            },
            destructor: function InstitutionBaseContactModel_destructor() {
            },
            initSupportContact: function InstitutionBaseContactModel_initSupportContact() {
                var
                    self = this;
                self.contactsI18n = i18n( 'InstitutionBaseContactModel_clientJS.title.CONTACTS' );
            },
            /**
             * Shows a popup message with a warning that selection will remove currentMainSupplier and saves it to ViewModel
             */
            initObservables: function() {
                var self = this;
                self.listenDeactivated = self.deactivated.subscribe( function( newValue ) {
                        if( newValue === true ) {
                            self.status( "INACTIVE" );
                        } else {
                            self.status( "ACTIVE" );
                        }

                        if( newValue === false && unwrap( self.isMainSupplier ) === true ) {
                            self.isMainSupplier = false;
                        }
                    }
                );
                self.listenIsMainSupplier = self.isMainSupplier.subscribe( function( newValue ) {
                    var params;
                    if( newValue ) {
                        params = {
                            query: {
                                isMainSupplier: true
                            },
                            options: {
                                fields: {
                                    _id: 1,
                                    institutionName: 1
                                },
                                itemPerPage: 1
                            }
                        };
                        Y.doccirrus.jsonrpc.api.basecontact.read( params )
                            .done( function( response ) {
                                var data = response.data;
                                var currentMainSupplierId = "";
                                var currentMainSupplierName = "";
                                var message = "";
                                var currentId = unwrap( self._id );
                                if( data.length > 0 ) {
                                    currentMainSupplierId = data[0]._id;
                                    currentMainSupplierName = data[0].institutionName;
                                }
                                if( currentMainSupplierId && currentId !== currentMainSupplierId ) {
                                    message = i18n( 'basecontact-schema.message.MAIN_SUPPLIER_CHANGE', {data: {currentMainSupplierName: currentMainSupplierName}} );
                                    Y.doccirrus.DCWindow.confirm( {
                                        title: i18n( 'DCWindow.confirm.title' ),
                                        message: message,
                                        callback: function( confirm ) {
                                            if( !confirm.success ) {
                                                self.isMainSupplier( false );
                                            }
                                        }
                                    } );
                                }
                            } )
                            .fail( fail );
                    }
                } );
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             * @override
             * @return {String}
             */
            getTypeName: function() {
                var result = InstitutionBaseContactModel.superclass.getTypeName.apply( this, arguments );
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
            select2ContactsMapper: function( item ) {
                return {id: item._id, text: Y.doccirrus.schemas.person.personDisplay( item ), data: item};
            },
            select2ContactsQuery: function( query ) {
                var
                    self = this,
                    terms = query.term.split( ', ' ),
                    params = {
                        query: {
                            baseContactType: {$in: Y.doccirrus.schemas.basecontact.getMedicalPersonTypes()}
                        },
                        options: {
                            sort: {
                                lastname: 1
                            },
                            fields: {
                                lastname: 1,
                                firstname: 1,
                                title: 1,
                                talk: 1,
                                communications: 1,
                                addresses: 1
                            },
                            itemPerPage: 10
                        }
                    };
                if( terms[0] ) {
                    params.query.lastname = {$regex: '^' + terms[0].trim(), $options: 'i'};
                }
                if( terms[1] ) {
                    params.query.firstname = {$regex: '^' + terms[1].trim(), $options: 'i'};
                }

                Y.doccirrus.jsonrpc.api.basecontact.read( params )
                    .done( function( response ) {
                        var
                            data = response.data;
                        query.callback( {
                            results: data.map( self.select2ContactsMapper )
                        } );
                    } )
                    .fail( function( err ) {
                        query.callback( {results: []} );
                        fail( err );
                    } );
            },
            getDataForNewContact: function() {
                return {
                    baseContactType: Y.doccirrus.schemas.basecontact.baseContactTypes.PHYSICIAN
                };
            },
            getHTMLContactName: function( contact ) {
                return '<h4><a href="/contacts#/' + contact._id + '/" target="_blank">' + Y.doccirrus.schemas.person.personDisplay( contact ) + '</a></h4>';
            },
            displayDefaultFormName: function( formId ) {
                var
                    self = this;
                Y.dcforms.getFormList( '', false, onFormsListLoaded );

                function onFormsListLoaded( err, cachedList ) {
                    var
                        form,
                        langTitle;
                    if( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }

                    if( !cachedList.length ) {
                        return;
                    }

                    form = _.find( cachedList, {_id: formId} );
                    langTitle = userLang;
                    if( 'de-ch' === userLang && !form.title[userLang] ) {
                        langTitle = 'de';
                    }
                    if( form ) {
                        self.defaultForm( form.title[langTitle] + " v" + form.version );
                    }
                }
            },
            selectPdfTemplate: function() {
                var
                    self = this;
                Y.doccirrus.modals.chooseInvoiceForm.show( {
                    'defaultIdentifier': self.formId || 'instock-order',        //  use the system default invoice form
                    'title': i18n( 'InStockMojit.newOrderModal.titles.chooseFormModalTitle' ),
                    'onFormSelected': function( formId, formTitle ) {
                        self.defaultFormId( formId );
                        self.defaultForm( formTitle );
                    }
                } );
            }
        }, {
            schemaName: 'v_institutioncontact',
            NAME: 'InstitutionBaseContactModel',
            ATTRS: {
                useSelect2InstitutionType: {
                    /**
                     * Determines if a select2 for "useSelect2InstitutionType" should be initialised
                     * @attribute useSelect2InstitutionType
                     * @type {boolean}
                     * @default true
                     */
                    valueFn: function() {
                        var
                            self = this,
                            baseContactType = self.get( 'data.baseContactType' );
                        return Y.doccirrus.schemas.basecontact.baseContactTypes.INSTITUTION === baseContactType;
                    },
                    lazyAdd: false
                },
                useSelect2Contacts: {
                    /**
                     * Determines if a select2 for "useSelect2Contactss" should be initialised
                     * @attribute useSelect2Contacts
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
                    value: Y.doccirrus.schemas.v_institutioncontact.types.InstitutionContactType_E.list,
                    lazyAdd: false
                },
                allowedBaseContactTypeList: {
                    value: Y.doccirrus.schemas.basecontact.types.BaseContactType_E.list.filter( function( item ) {
                        return -1 !== Y.doccirrus.schemas.basecontact.getOrganizationTypes().indexOf( item.val );
                    } ),
                    lazyAdd: false
                }
            }
        } );
        KoViewModel.registerConstructor( InstitutionBaseContactModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DCWindow',
            'dcerrortable',
            'BaseContactModel',
            'v_institutioncontact-schema',
            'basecontact-schema',
            'chooseinvoiceform-modal'
        ]
    }
);