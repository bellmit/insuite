
/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'dcnewinstockitemdialog', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' ),
            saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' ),
            SelectedWareHouseItemViewModel = KoViewModel.getConstructor( 'SelectedWareHouseItemViewModel' ),
            modal;


        function NewInStockItemModel( config ) {
            NewInStockItemModel.superclass.constructor.call( this, config );
        }

        Y.extend( NewInStockItemModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function( ) {
                var
                    self = this;
                self.stockItem = new SelectedWareHouseItemViewModel({data:{}, readOnlyFields: ['quantityOrdered']});

                self.addDisposable( ko.computed( function() {
                    var
                        isValid = self.stockItem.isValid();
                    if( modal ) {
                        modal.getButton( 'OK' ).set( 'disabled', !isValid );
                    }
                } ) );
            }

        } );

        function NewInStockItemModal() {

        }

        NewInStockItemModal.prototype.showDialog = function( data ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/NewStockItemDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            newInStockItemModel,
                            bodyContent = Y.Node.create( template );

                        function saveItem() {
                            var stockItem = newInStockItemModel.stockItem;
                            stockItem.saveItem().done( function() {
                                modal.close();
                                modal = null;
                            } ).fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );

                        }

                        newInStockItemModel = new NewInStockItemModel( data );

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: i18n( 'InStockMojit.newStockItemModal.title.createNewItem' ),
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
                                            saveItem();
                                        }

                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function(  ) {
                            newInStockItemModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( newInStockItemModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).newInStockItemDialog = new NewInStockItemModal();
    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'promise',
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'instock-schema',
            'KoBaseContact',
            'KoUI-all',
            'SelectedWareHouseItemViewModel'
        ]
    }
);
