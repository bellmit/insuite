/**
 * User: pi
 * Date: 24/11/16  14:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

'use strict';

YUI.add( 'AddContactModal', function( Y ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            PhysicianBaseContactModel = KoViewModel.getConstructor( 'PhysicianBaseContactModel' ),
            InstitutionBaseContactModel = KoViewModel.getConstructor( 'InstitutionBaseContactModel' );

        /**
         * AddContactModel model
         * @constructor
         */
        function AddContactModel() {
            AddContactModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( AddContactModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initAddContactModel();

            },
            /** @protected */
            destructor: function() {
            },
            /** @protected */
            initAddContactModel: function() {
                var
                    self = this,
                    data = self.get( 'data' );
                if( Y.doccirrus.schemas.basecontact.isMedicalPersonType( data.baseContactType ) ) {
                    self.contact = new PhysicianBaseContactModel( {
                        useAddContactBtn: false,
                        readOnlyBaseContactType: false,
                        data: data
                    } );
                } else if( Y.doccirrus.schemas.basecontact.isOrganizationType( data.baseContactType ) ) {
                    self.contact = new InstitutionBaseContactModel( {
                        useAddContactBtn: false,
                        readOnlyBaseContactType: false,
                        data: data
                    } );
                }
                self.isValid = ko.computed( function() {
                    return unwrap( self.contact._isValid );
                } );
                self.canBeSaved = ko.observable( true );
            },
            save: function() {
                var
                    self = this,
                    contactData = self.contact.toJSON();
                self.canBeSaved( false );
                return new Promise( function( resolve, reject ) {
                    Y.doccirrus.jsonrpc.api.basecontact
                        .create( {
                            data: contactData
                        } )
                        .done( function( response ) {
                            resolve( response.data );
                        } )
                        .fail( reject )
                        .always( function() {
                            self.canBeSaved( true );
                        } );
                } );
            },
            toJSON: function() {
                return this.contact.toJSON();
            }
        }, {
            NAME: 'AddContactModel',
            ATTRS: {
                data: {
                    value: null,
                    lazyAdd: false
                }
            }
        } );

        function AddContactModal() {
        }

        AddContactModal.prototype.show = function( data, isPersonContact ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InSuiteAdminMojit/views/add_contact_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            addContactModel = new AddContactModel( { data: data } ),
                            title;
                        if( isPersonContact ) {
                            title = i18n('AddContactModal_clientJS.title.PERSON_MODAL_TITLE');
                        } else {
                            title = i18n('AddContactModal_clientJS.title.ORGANIZATION_MODAL_TITLE');
                        }
                        modal = new Y.doccirrus.DCWindow( {
                            id: 'add_contact_modal',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: title,
                            width: '80%',
                            height: '80%',
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            addContactModel.save()
                                                .then( function( data ) {
                                                    var
                                                        contactData = addContactModel.toJSON();
                                                    contactData._id = data[ 0 ];
                                                    modal.close();
                                                    resolve( contactData );
                                                } )
                                                .catch( function( error ) {
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                } );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    addContactModel.destroy();
                                }
                            }
                        } );

                        ko.applyBindings( addContactModel, bodyContent.getDOMNode() );

                        addContactModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( addContactModel.isValid ),
                                canBeSaved = unwrap( addContactModel.canBeSaved ),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( isModelValid && canBeSaved ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                        modal.set( 'focusOn', [] );
                    } );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).addContactModal = new AddContactModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoUI-all',
            'KoViewModel',
            'PhysicianBaseContactModel',
            'InstitutionBaseContactModel'

        ]
    }
);
