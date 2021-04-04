/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'sendOrderProgressDialog', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            modal;

        function SendOrderProgressDialog( config ) {
            SendOrderProgressDialog.superclass.constructor.call( this, config );
        }

        Y.extend( SendOrderProgressDialog, KoViewModel.getDisposable(), {
            destructor: function() {
                Y.doccirrus.communication.off( 'sendStockOrderProgress', 'sendStockOrderProgressHandler' );
            },

            initializer: function( config ) {
                var self = this;
                self.infoLabelI18n = i18n( 'InStockMojit.sendOrderProgressModal.infoLabel' ).replace( "{itemsCount}", config.stocksCount );

                self.notaLabelI18n = i18n( 'InStockMojit.sendOrderProgressModal.notaTitle' );
                self.progressBarStatus = ko.observable( 0 );
                self.notaCount = ko.observable( 0 );
                self.notaMessages = ko.observable( [] );
                self.initListener();
            },
            initListener: function() {
                var self = this;
                Y.doccirrus.communication.on( {
                    event: 'sendStockOrderProgress',
                    done: function onOrderSendMessage( message ) {
                        var evt = message.data && message.data[0];

                        self.progressBarStatus( evt.progress );
                        self.notaCount( evt.orderNotAcceptedLength );

                        if( Array.isArray( evt.notaMessages ) && evt.notaMessages.length ) {
                            self.notaMessages( evt.notaMessages );
                        }
                    },
                    handlerId: 'sendStockOrderProgressHandler'
                } );
            }
        } );

        function SendOrderProgressModal() {

        }

        SendOrderProgressModal.prototype.showDialog = function( data ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/SendOrderProgressDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            sendOrderProgeressModel,
                            bodyContent = Y.Node.create( template );

                        sendOrderProgeressModel = new SendOrderProgressDialog( data );

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: i18n( 'InStockMojit.sendOrderProgressModal.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: false,
                                        disabled: false,
                                        action: function() {
                                            modal.close();
                                        }

                                    } )
                                ]
                            }

                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function() {
                            sendOrderProgeressModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( sendOrderProgeressModel, bodyContent.getDOMNode() );
                        data.onModalShow();
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).sendOrderProgressDialog = new SendOrderProgressModal();

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'promise',
            'DCWindow',
            'instock-schema',
            'KoUI-all',
            'v_splitDeliveryItem-schema'
        ]
    }
);
