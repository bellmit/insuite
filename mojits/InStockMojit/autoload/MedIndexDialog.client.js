/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'MedIndexDialog', function( Y ) {
        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            modal = null,
            WareHouseViewModel = KoViewModel.getConstructor( 'WareHouseViewModel' ),
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        /**
         * @constructor
         * @class MedIndexDialog
         * @extends InStockMojitViewModel
         */
        function MedIndexModel() {
            MedIndexModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( MedIndexModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function MedIndexModel_initializer( existingTableItemsAndCallback ) {
                var self = this;
                self.selectedItem = ko.observable( null );
                self.enableSaveButton = ko.observable( true );
                self.isUpdating = ko.observable( false );
                self.enableSaveButton = ko.observable( true );
                self.displayDetails = ko.observable( false );
                self.enableSaveButton = ko.computed( function() {
                    return !ko.unwrap( self.isUpdating );
                } );
                var wareHouseViewModel = KoViewModel.getViewModel( 'WareHouseViewModel' ) || new WareHouseViewModel();
                self.selectItem = wareHouseViewModel.selectItem;
                self.initTexts();
                self.createMedIndexTable();
                self.existingWareHouseItems = existingTableItemsAndCallback.existingWareHouseItems;
                self.wareHouseTableReload = existingTableItemsAndCallback.wareHouseTableReload;
            },
            initTexts: function MedIndexModel_initTexts() {
                var self = this;
                self.buttonCancelI18n = i18n( 'general.button.CANCEL' );
                self.medCatalogI18n = i18n( 'InStockMojit.newOrderModal.medCatalog' );
                self.addButtonI18n = i18n( "InStockMojit.buttons.add" );
            },
            addRecord: function MedIndexModel_addRecord( $data ) {
                var self = this,
                    newItem = ko.unwrap( $data ),
                    newItemphPZN = ko.unwrap( newItem.phPZN ),
                    newItemGtinCode = ko.unwrap( newItem.gtinCode ),
                    newItemStockLocationId = ko.unwrap( newItem.stockLocationId );
                var newObject = {};
                var existingItems = [];
                var itemAtLocation,
                    itemAtLocationWasDeleted;

                var warningDialog = Y.doccirrus.modals.medIndexWarningModal;

                if( self.existingWareHouseItems && newItemphPZN && newItemGtinCode && newItemStockLocationId ) {
                    itemAtLocation = self.existingWareHouseItems.find( function( item ) {
                        return item.phPZN === newItemphPZN && item.gtinCode === newItemGtinCode && item.stockLocationId === newItemStockLocationId;
                    } );

                    if(itemAtLocation && itemAtLocation.isDeleted) {
                        itemAtLocationWasDeleted = itemAtLocation;
                    }

                    existingItems = self.existingWareHouseItems.filter( function( item ) {
                        if( item.phPZN === newItemphPZN && item.gtinCode === newItemGtinCode && item.stockLocationId !== newItemStockLocationId && !item.isDeleted ) {
                            return item;
                        }
                    } );
                    newObject.itemAtLocation = itemAtLocationWasDeleted ? itemAtLocationWasDeleted : itemAtLocation;
                    newObject.existingItems = existingItems;
                    newObject.newItem = newItem;
                    newObject.updateRecord = self.updateRecord;
                    newObject.wareHouseTableReload = self.wareHouseTableReload;
                    if( itemAtLocation && itemAtLocationWasDeleted ) {
                        self.updateRecord(itemAtLocationWasDeleted, newItem);
                    } else if (itemAtLocation && !itemAtLocationWasDeleted) {
                        warningDialog.showDialog( newObject );
                    } else {
                        self.insertWares( $data );
                    }
                }

            },
            updateRecord: function MedIndexModel_updateRecord( itemAtLocation, newItem, isMedIndexWarning) {
                var self = this;
                itemAtLocation.prdNo = ko.unwrap( newItem.prdNo );
                itemAtLocation.vat = ko.unwrap( newItem.vat );
                itemAtLocation.supplyCategory = ko.unwrap( newItem.supplyCategory );
                itemAtLocation.ingredients = ko.unwrap( newItem.ingredients );
                itemAtLocation.phUnit = ko.unwrap( newItem.phUnit );
                itemAtLocation.description = ko.unwrap( newItem.description );
                itemAtLocation.phPriceSale = ko.unwrap( newItem.phPriceSale );
                itemAtLocation.phPriceCost = ko.unwrap( newItem.phPriceCost );
                itemAtLocation.phPriceSaleCatalog = ko.unwrap( newItem.phPriceSale );
                itemAtLocation.phPriceCostCatalog = ko.unwrap( newItem.phPriceCost );
                if(itemAtLocation.isDeleted) {
                    itemAtLocation.isDeleted = false;
                    itemAtLocation.quantity = ko.unwrap( newItem.quantity );
                    itemAtLocation.quantityOrdered = ko.unwrap( newItem.quantityOrdered );
                    itemAtLocation.isDivisible = ko.unwrap( newItem.isDivisible );
                    itemAtLocation.minimumQuantity = ko.unwrap( newItem.minimumQuantity );
                }


                Y.doccirrus.jsonrpc.api.instockrequest.updateWares( {
                    data: itemAtLocation
                } )
                    .done( function() {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_contacts-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        self.isUpdating( false );
                        if(isMedIndexWarning) {
                            Y.doccirrus.modals.medIndexWarningModal.closeDialog();
                        }
                        Y.doccirrus.modals.medIndexDialog.closeDialog();
                        self.wareHouseTableReload();
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        self.isUpdating( false );
                    } );
            },
            insertWares: function MedIndexModel_insertWares( $data ) {
                var self = this;
                self.isUpdating( true );

                Y.doccirrus.jsonrpc.api.instockrequest.insertWares( {
                    data: $data
                } )
                    .done( function() {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_contacts-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        self.isUpdating( false );

                        if( self.mode ) {
                            Y.doccirrus.modals.medIndexWarningModal.closeDialog();
                        }

                        Y.doccirrus.modals.medIndexDialog.closeDialog();
                        self.wareHouseTableReload();
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        self.isUpdating( false );
                    } );

            },
            cancelEdit: function MedIndexModel_cancelEdit() {
                Y.doccirrus.modals.medIndexDialog.closeDialog();
            },
            createMedIndexTable: function MedIndexModel_createDataTable() {
                var self = this,
                    floatFilterField;

                floatFilterField = {
                    componentType: 'KoField',
                    valueType: 'float',
                    renderer: function( observable, value ) {
                        observable( value === 0 ? 0 : value || "" );
                    }
                };

                self.medIndexTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-medIndexTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWaresFromCatalog,
                        limitList: [10, 20, 30, 40, 50, 100],
                        responsive: false,
                        fillRowsToLimit: true,
                        baseParams: {},
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'wareHouseTableHandlerId'
                            }],
                        columns: [
                            {
                                forPropertyName: 'code',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
                            },
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phForm',
                                label: i18n( 'activity-schema.Medication_T.phForm.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phForm.i18n' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
                            },
                            {
                                forPropertyName: 'phPackSize',
                                label: i18n( 'activity-schema.Medication_T.phPackSize.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phPackSize.i18n' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: floatFilterField
                            },
                            {
                                forPropertyName: 'phDescription',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            }
                        ],
                        onRowClick: function( meta ) {
                            var row = meta.row,
                                isItemFromCatalog = true;
                            self.selectItem( row, isItemFromCatalog );
                        }
                    }

                } );

            },

            /** @protected */
            destructor: function() {

            }

        } );

        function MedIndexModal() {

        }

        MedIndexModal.prototype.showDialog = function( existingTableItemsAndCallback ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/MedIndexModal'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            medIndexModel,
                            bodyContent = Y.Node.create( template ),
                            title = i18n( "InStockMojit.medIndexDialog.title" );

                        medIndexModel = new MedIndexModel( existingTableItemsAndCallback );

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: title,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize']
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function() {
                            medIndexModel.destroy();
                        } );

                        ko.applyBindings( medIndexModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };

        MedIndexModal.prototype.closeDialog = function() {
            modal.close();
        };
        Y.namespace( 'doccirrus.modals' ).medIndexDialog = new MedIndexModal();

    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'promise',
            'KoViewModel',
            'KoUI-all',
            'JsonRpcReflection-doccirrus',
            'DCWindow',
            'JsonRpc',
            'instock-schema',
            'SelectedWareHouseItemViewModel',
            'dcnewinstockitemdialog',
            'DCRouter',
            'DCBinder',
            'WareHouseViewModel',
            'MedIndexWarningModel'
        ]
    } );