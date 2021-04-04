/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCCreateTenantModal', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            PLEASE_SELECT = i18n( 'CRMMojit.crm_companies_tabJS.message.SELECT_CONTACT' ),
            MODAL_TITLE = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_NEW' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            Disposable = KoViewModel.getDisposable();

        function CreateTenantModel() {
            CreateTenantModel.superclass.constructor.apply( this, arguments );
        }
        Y.extend( CreateTenantModel, Disposable, {
            initializer: function CreateTenantModel_initializer() {
                var
                    self = this;
                self.initCreateTenantModel();
            },
            destructor: function CreateTenantModel_destructor() {
                var
                    self = this;
                self.contactModel.destroy();
                self.companyModel.destroy();
                self.supportContactModel.destroy();
            },
            initCreateTenantModel: function  CreateTenantModel_initCreateTenantModel(){
                var
                    self = this;

                self.conameI18n = i18n('person-schema.Company_T.coname');
                self.updateNewI18n = i18n('CRMMojit.companiesbrowser.label.UPDATE_NEW');
                self.titleComI18n = i18n('InCaseMojit.communication_item.title.TITLE_COM');
                self.centralContactI18n = i18n('customer-schema.base.centralContact.i18n');
                self.vprcHostnameI18n = i18n('customer-schema.base.vprcFQHostName.i18n');
                self.talkI18n = i18n('person-schema.Talk_E.i18n');
                self.kbvDobI18n = i18n('person-schema.Person_T.kbvDob');

                self.contactModel = KoViewModel.createViewModel( { NAME: 'ContactModel' } );
                self.companyModel = KoViewModel.createViewModel( {
                    NAME: 'CompanyModel',
                    config: {data: self.get( 'companyData' )}
                } );

                self.isDCPRC_MTS = ( peek( self.companyModel.serverType ) === Y.doccirrus.schemas.company.serverTypes.VPRC ) &&
                                   Y.doccirrus.auth.isDCPRC();

                self.isISD = peek( self.companyModel.serverType ) === Y.doccirrus.schemas.company.serverTypes.ISD;
                self.isPRC = peek( self.companyModel.serverType ) === Y.doccirrus.schemas.company.serverTypes.PRC;
                self.updateNew = self.companyModel.serverType() === Y.doccirrus.schemas.company.serverTypes.PRC;

                self.isAPPLIANCE = self.companyModel.systemType() === Y.doccirrus.schemas.company.systemTypes.APPLIANCE;

                self.supportContactModel = KoViewModel.createViewModel( { NAME: 'SupportBaseContactModel' } );

                self.automaticCustomerNo = ko.observable( false );
                self.customerNoEnable = ko.computed( function() {
                    var
                        enabled = !self.automaticCustomerNo();

                    if( !enabled ) {
                        self.companyModel.customerNo( " " );
                    } else {
                        self.companyModel.customerNo( null );
                    }

                    return enabled;
                } );

                self.initSelect2CentralContact();
                self.initSelect2SupportContact();

                if( self.companyModel.centralContact() ) {
                    self.setModelReadOnly( self.contactModel, true );
                }

                self.isValid = ko.computed(function(){
                    return self.contactModel._isValid() && self.companyModel._isValid() && self.supportContactModel._isValid();
                });
            },
            initSelect2CentralContact: function CreateTenantModel_initSelect2CentralContact(){
              var
                  self = this,
                  selectedContact = self.contactToSelec2(),
                  emptyContact = {
                      _id: null,
                      "centralContact": '',
                      "confirmed": undefined,
                      "dob": undefined,
                      "optIn": '',
                      "patient": undefined,
                      "talk": '',
                      "addresses": [],
                      "communications": [],
                      "prodServices": [],
                      "accounts": [],
                      "lastname": '',
                      "middlename": '',
                      "nameaffix": '',
                      "firstname": '',
                      "title": ''
                  };
                self.select2CentralContact = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            return selectedContact;
                        },
                        write: function( $event ) {

                            self.contactModel.set( 'data', ($event.added && $event.added.data) || emptyContact );

                            selectedContact = $event.added;
                            self.setModelReadOnly( self.contactModel, $event.added && $event.added.data && true );
                            self.companyModel.centralContact( $event.val );

                            if( !$event.added && $event.removed ) {
                                self.contactModel.setEmailRequired();
                            }

                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        minimumInputLength: 1,
                        placeholder: PLEASE_SELECT,
                        query: function( query ) {
                            var term = query.term;

                            Y.doccirrus.jsonrpc.api.contact.searchContact( {
                                query: {
                                    term: term
                                }
                            } )
                                .done( function( response ) {
                                    var data = response.data;
                                    data = data.map( self.contactToSelec2 );
                                    query.callback( {
                                        results: data
                                    } );
                                } );
                        }
                    }
                };

            },
            initSelect2SupportContact: function CreateTenantModel_initSelect2SupportContact() {
                var
                    self = this,
                    selectedContact = self.contactToSelec2(),
                    emptyContact = {
                        _id: null
                    },
                    v_supportcontact = Y.doccirrus.schemas.v_supportcontact,
                    defaults = self.supportContactModel.get( 'defaults' );
                Object.keys( v_supportcontact.schema ).forEach( function( key ) {
                    if( 'undefined' !== typeof defaults[ key ] ) {
                        emptyContact[ key ] = defaults[ key ];
                    } else {
                        emptyContact[ key ] = null;
                    }
                } );
                self.select2SupportContact = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            return selectedContact;
                        },
                        write: function( $event ) {
                            self.supportContactModel.set( 'data', ($event.added && $event.added.data) || emptyContact );
                            selectedContact = $event.added;
                            self.setModelReadOnly( self.supportContactModel, $event.added && $event.added.data && true );
                            self.companyModel.supportContact( $event.val || null );

                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        minimumInputLength: 1,
                        placeholder: PLEASE_SELECT,
                        query: function( query ) {
                            var
                                basecontactSchema = Y.doccirrus.schemas.basecontact,
                                term = query.term;

                            Y.doccirrus.jsonrpc.api.basecontact.searchContact( {
                                query: {
                                    baseContactType: basecontactSchema.baseContactTypes.SUPPORT,
                                    term: term
                                }
                            } )
                                .done( function( response ) {
                                    var data = response.data;
                                    data = data.map( self.contactToSelec2 );
                                    query.callback( {
                                        results: data
                                    } );
                                } );
                        }
                    }
                };

            },
            contactToSelec2: function CreateTenantModel_contactToSelec2( contact ){
                if( !contact ) {
                    return contact;
                }
                return {
                    id: contact._id,
                    text: contact.firstname + ' ' + contact.lastname,
                    data: contact
                };
            },
            setModelReadOnly: function CreateTenantModel_setModelReadOnly( model, state ){
                var
                    paths = (state) ? ['*'] : [];
                model.getModuleViewModelReadOnly()._makeReadOnly( {paths: paths} );
            },
            toJSON: function CreateTenantModel_toJSON() {
                var
                    self = this,
                    result = {
                        company: self.companyModel.toJSON(),
                        contact: self.contactModel.toJSON()
                    };

                if( self.automaticCustomerNo() ) {
                    result.automaticCustomerNo = true;
                }
                if( self.updateNew ) {
                    result.updateNew = true;
                }

                if( self.supportContactModel.isModified() && !result.company.supportContact ) {
                    result.supportContact = self.supportContactModel.toJSON();
                }
                return result;
            }
        }, { ATTRS: { companyData: { value: null, lazyAdd: false } } } );

        function CreateTenantModal() {

        }

        CreateTenantModal.prototype.showDialog = function( params, callback ) {
            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'CRMMojit/views/createtenant_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        createTenantModel = new CreateTenantModel( { companyData: params.data || {} } ),
                        modal,
                        unwrap = ko.unwrap,
                        peek = ko.utils.peekObservable;
                    if( params.data && params.data.systemType &&
                        ( Y.doccirrus.schemas.company.systemTypes.APPLIANCE === params.data.systemType ) ) {
                        MODAL_TITLE = i18n( 'CRMMojit.crm_companies_tabJS.message.APPLIANCE_NEW' );
                    }

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: MODAL_TITLE,
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        fitOnViewPortResize: !Y.UA.touchEnabled, // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        if( peek( createTenantModel.isValid ) ) {
                                            if( createTenantModel.automaticCustomerNo() ){
                                                createTenantModel.companyModel.customerNo( null );
                                            }
                                            callback( createTenantModel.toJSON() );
                                            modal.close();
                                        }
                                    }

                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    createTenantModel.destroy();
                                }
                            }
                        }

                    } );
                    // easy way of select2 focus workaround
                    modal.set( 'focusOn', [] );

                    createTenantModel.addDisposable( ko.computed( function() {
                        var isModelValid = unwrap( createTenantModel.isValid ),
                            okButton = modal.getButton( 'SAVE' ).button;
                        if( isModelValid ) {
                            okButton.enable();
                        } else {
                            okButton.disable();
                        }
                    } ) );
                    ko.applyBindings( createTenantModel, bodyContent.getDOMNode() );

                } )
                .catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).createTenantModal = new CreateTenantModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'oop',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',

            'basecontact-schema',
            'v_supportcontact-schema',

            'KoViewModel',
            'ContactModel',
            'CompanyModel',
            'SupportBaseContactModel'
        ]
    }
);