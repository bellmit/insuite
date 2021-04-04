/**
 * User: pi
 * Date: 17/08/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'DCSendToFormPortalModal', function( Y ) {

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            PORTAL_NAME = i18n( 'FormPortalMojit.sendToFormPortalModal_clientJS.title.PORTAL_NAME' ),
            MODAL_HEADER = i18n( 'FormPortalMojit.sendToFormPortalModal_clientJS.title.MODAL_HEADER' ),
            FORCE_SENT_BTN = i18n( 'FormPortalMojit.sendToFormPortalModal_clientJS.title.FORCE_SENT_BTN' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function SendToFormPortalModalModel() {
            SendToFormPortalModalModel.superclass.constructor.apply( this, arguments );
        }

        SendToFormPortalModalModel.ATTRS = {
            /**
             * type of license
             */
            createdPortals: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( SendToFormPortalModalModel, Y.doccirrus.KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function SendToFormPortalModalModel_initializer() {
                var
                    self = this;
                self.initSendToFormPortalModalModel();
            },
            /** @protected */
            destructor: function SendToFormPortalModalModel_destructor() {
            },
            initSendToFormPortalModalModel: function SendToFormPortalModalModel_initSendToFormPortalModalModel() {
                var
                    self = this;
                self.formPortalId = ko.observable();
                self.select2FormPortal = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                formPortalId = ko.unwrap( self.formPortalId );
                            return formPortalId;
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
                        } )
                    }
                };

                self.isValid = ko.computed( function() {
                    return unwrap( self.formPortalId );
                } );
            }
        } );

        function handleError(error, data){
            if( 30000 === error.code ){
                Y.doccirrus.DCWindow.notice({
                    type: 'warn',
                    message: Y.doccirrus.errorTable.getMessage( error ),
                    window: {
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                {
                                    label: FORCE_SENT_BTN,
                                    name: 'FORCE_SEND',
                                    isDefault: true,
                                    action: function() {
                                        var
                                            modal = this;
                                        data.force = true;
                                        Y.doccirrus.jsonrpc.api.formportal.sentToFormPortal( {
                                            data: data
                                        } )
                                            .done( function() {
                                                modal.close();
                                            } )
                                            .fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                modal.close();
                                            } );
                                    }
                                }
                            ]
                        }
                    }
                });
            } else {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            }
        }

        function SendToFormPortalModal() {
        }

        SendToFormPortalModal.prototype = {
            show: function( data ) {
                Promise.props( {
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'FormPortalMojit/views/send_to_form_portal_modal' } )
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
                            sendToFormPortalModel = new SendToFormPortalModalModel( {
                                createdPortals: result.createdPortals
                            } ),
                            bodyContent = Y.Node.create( result.template ),
                            modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Appointment',
                                bodyContent: bodyContent,
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
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                var
                                                    _data = {
                                                        activityId: data.selectedActivityId,
                                                        portalId: peek( sendToFormPortalModel.formPortalId )
                                                    };
                                                Y.doccirrus.jsonrpc.api.formportal.sentToFormPortal( {
                                                    data: _data
                                                } )
                                                    .done( function() {
                                                        modal.close();
                                                    } )
                                                    .fail( function( error ) {
                                                        handleError( error, _data);
                                                        modal.close();
                                                    } );

                                            }
                                        } )
                                    ]
                                },
                                after: {
                                    visibleChange: function( event ) {
                                        if( !event.newVal ) {
                                            ko.cleanNode( bodyContent.getDOMNode() );
                                            sendToFormPortalModel.destroy();
                                        }
                                    }
                                }
                            } );
                        sendToFormPortalModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( sendToFormPortalModel.isValid ),
                                okBtn = modal.getButton( 'OK' ).button;
                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }

                        } ) );
                        ko.applyBindings( sendToFormPortalModel, bodyContent.getDOMNode() );
                    } )
                    .catch( catchUnhandled );
            }
        };

        Y.namespace( 'doccirrus.modals' ).sendToFormPortalModal = new SendToFormPortalModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',
            'DCWindow',
            'KoViewModel'
        ]
    }
);

