/**
 * User: pi
 * Date: 17/08/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'DCFormPortalModal', function( Y ) {

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            MODAL_HEADER = i18n( 'FormPortalMojit.formPortalModal_clientJS.title.MODAL_HEADER' ),
            PORTAL_NAME = i18n( 'FormPortalMojit.formPortalModal_clientJS.title.PORTAL_NAME' ),
            RESET_FORM = i18n( 'FormPortalMojit.formPortalModal_clientJS.title.RESET_FORM' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function FormPortalModalModel() {
            FormPortalModalModel.superclass.constructor.apply( this, arguments );
        }

        FormPortalModalModel.ATTRS = {
            /**
             * type of license
             */
            createdPortals: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( FormPortalModalModel, Y.doccirrus.KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function FormPortalModalModel_initializer() {
                var
                    self = this;
                self.initFormPortalModalModel();
            },
            /** @protected */
            destructor: function FormPortalModalModel_destructor() {
            },
            initFormPortalModalModel: function FormPortalModalModel_initFormPortalModalModel() {
                var
                    self = this,
                    mandatoryValidation = Y.doccirrus.validations.common.mandatory[ 0 ];

                self.formPortalId = ko.observable();
                self.formPortalId.i18n = PORTAL_NAME;
                self.formPortalId.hasError = ko.observable( false );
                self.formPortalId.validationMessages = ko.observableArray( [] );

                self.select2FormPortal = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                formPortalId = ko.unwrap( self.formPortalId );
                            if( formPortalId ) {
                                return { id: formPortalId, text: formPortalId };
                            } else {
                                return formPortalId;
                            }

                        },
                        write: function( $event ) {
                            self.formPortalId( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: PORTAL_NAME,
                        data: self.get( 'createdPortals' ).map( function( portal ) {
                            return {
                                id: portal.name,
                                text: portal.name
                            };
                        } ),
                        createSearchChoice: function( term ){
                            return {
                                id: term,
                                text: term
                            };
                        }
                    }
                };

                self.isExistingPortalSelected = ko.observable();

                self.addDisposable( ko.computed( function() {
                    var
                        formPortalId = unwrap( self.formPortalId ),
                        createdPortals = self.get( 'createdPortals' ).map( function( data ) {
                            return data.name;
                        } ),
                        alreadyExists = -1 !== createdPortals.indexOf( formPortalId );
                    self.isExistingPortalSelected( alreadyExists );
                    self.formPortalId.validationMessages.removeAll();
                    if( !formPortalId ) {
                        self.formPortalId.hasError( true );
                        self.formPortalId.validationMessages.push( mandatoryValidation.msg );
                        return;
                    }
                    self.formPortalId.hasError( false );

                } ) );
                self.isValid = ko.computed( function() {
                    return !unwrap( self.formPortalId.hasError );
                } );
            }
        } );

        function FormPortalModal() {
        }

        FormPortalModal.prototype = {
            show: function() {
                Promise.props( {
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'FormPortalMojit/views/form_portal_modal' } )
                        .then( function( response ) {
                            return response && response.data;
                        } ),
                    createdPortals: Y.doccirrus.jsonrpc.api.formportal.getActivePortalList()
                        .then( function( response ) {
                            return response && response.data;
                        } )
                } )
                    .then( function( result ) {
                        var
                            formPortalModel = new FormPortalModalModel( {
                                createdPortals: result.createdPortals
                            } ),
                            bodyContent = Y.Node.create( result.template ),
                            modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Appointment',
                                bodyContent: bodyContent,
                                id: 'formportal_modal',
                                icon: Y.doccirrus.DCWindow.ICON_INFO,
                                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                title: MODAL_HEADER,
                                height: Y.doccirrus.DCWindow.SIZE_SMALL,
                                minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                                maximizable: true,
                                resizable: false,
                                focusOn: [],
                                centered: true,
                                modal: true,
                                render: document.body,
                                buttons: {
                                    header: [ 'close' ],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        {
                                            label: RESET_FORM,
                                            name: 'RESET',
                                            value: 'RESET',
                                            action: function() {
                                                var
                                                    resetBtn = modal.getButton( 'RESET' ).button;
                                                resetBtn.disable(); //do not to enable because of modal will be closed anyway.
                                                Y.doccirrus.jsonrpc.api.formportal.sentToFormPortal( {
                                                    data: {
                                                        portalId: peek( formPortalModel.formPortalId ),
                                                        force: true
                                                    }
                                                } )
                                                    .done( function() {
                                                        modal.close();
                                                    } )
                                                    .fail( function( error ) {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                        modal.close();
                                                    } );
                                            }
                                        },
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                modal.close();
                                                window.location.href = Y.doccirrus.infras.getPrivateURL( '/formportal/' + encodeURIComponent( peek( formPortalModel.formPortalId ) ) );
                                            }
                                        } )
                                    ]
                                },
                                after: {
                                    visibleChange: function( event ) {
                                        if( !event.newVal ) {
                                            ko.cleanNode( bodyContent.getDOMNode() );
                                            formPortalModel.destroy();
                                        }
                                    }
                                }
                            } );
                        formPortalModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( formPortalModel.isValid ),
                                isExistingPortalSelected = unwrap( formPortalModel.isExistingPortalSelected ),
                                okBtn = modal.getButton( 'OK' ).button,
                                resetBtn = modal.getButton( 'RESET' ).button;
                            if( isModelValid ) {
                                if( isExistingPortalSelected ) {
                                    resetBtn.enable();
                                    okBtn.disable();
                                } else {
                                    okBtn.enable();
                                    resetBtn.disable();
                                }
                            } else {
                                okBtn.disable();
                                resetBtn.disable();
                            }
                        } ) );
                        ko.applyBindings( formPortalModel, bodyContent.getDOMNode() );
                    } )
                    .catch( catchUnhandled );
            }
        };

        Y.namespace( 'doccirrus.modals' ).formPortalModal = new FormPortalModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'JsonRpc',
            'promise',
            'dcvalidations',
            'dcinfrastructs',

            'DCWindow',
            'KoViewModel'
        ]
    }
);

