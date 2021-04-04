/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'dcSelectOrderDialog', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' ),
            saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' ),
            InStockOrdersTableViewModel = KoViewModel.getConstructor( 'InStockOrdersTableViewModel'),
            modal;


        function SelectOrderModel( config ) {
            SelectOrderModel.superclass.constructor.call( this, config );
        }

        Y.extend( SelectOrderModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function( ) {
                var
                    self = this;

                self.ordersTableModel = new InStockOrdersTableViewModel({
                    proxy: function( query  ) {
                        if (!query.query.status) {
                            query.query.status =  {$in: ["sent"]};
                        }
                        return  Y.doccirrus.jsonrpc.api.stockordersrequest.getOrders(query);
                    },
                    columns: {
                        status: {
                            isFilterable : false
                        }
                    }
                });
                self.ordersTable = self.ordersTableModel.ordersTable;
                self.selectedOrderId = ko.observable( null );
                self.initSubscribe();
            },
            initSubscribe : function( ) {
                var
                    self = this;
                self.ordersTable.getComponentColumnCheckbox().checked.subscribe( function( selectedOrders ) {
                    if( selectedOrders && selectedOrders.length ) {
                        self.selectedOrderId( selectedOrders[0]._id );
                    }
                });
            }
        } );

        function SelectOrderModal() {

        }

        SelectOrderModal.prototype.showDialog = function( data ) {
            var
                callback = data.callback;
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/SelectOrderDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            selectOrderModel,
                            bodyContent = Y.Node.create( template );


                        selectOrderModel = new SelectOrderModel();

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: i18n( 'InStockMojit.selectOrderModal.title.selectOrder' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: cancelButtonI18n
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        label: saveButtonI18n,
                                        action: function() {
                                            callback(ko.unwrap(selectOrderModel.selectedOrderId));
                                            modal.close();
                                        }

                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function(  ) {
                            selectOrderModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( selectOrderModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).selectOrderDialog = new SelectOrderModal();
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
            'InStockOrdersTableViewModel'
        ]
    }
);
