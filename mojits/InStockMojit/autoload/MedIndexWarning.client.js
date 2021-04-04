/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko*/
YUI.add( 'MedIndexWarningModel', function( Y ) {
        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            modal = null,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        /**
         * @constructor
         * @class MedIndexDialog
         * @extends InStockMojitViewModel
         */
        function MedIndexWarningModel() {
            MedIndexWarningModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( MedIndexWarningModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function MedIndexWarningModel_initializer( newObject ) {
                var self = this;
                self.isUpdating = ko.observable( false );
                self.enableSaveButton = ko.observable( true );
                self.enableSaveButton = ko.computed( function() {
                    return !ko.unwrap( self.isUpdating );
                } );
                self.initTexts();
                if( newObject ) {
                    self.itemAtLocation = newObject.itemAtLocation;
                    self.existingItems = newObject.existingItems;
                    self.newItem = newObject.newItem;
                    self.updateRecord = newObject.updateRecord;
                    self.wareHouseTableReload = newObject.wareHouseTableReload;
                }

                self.createTable();
            },
            initTexts: function MedIndexWarningModel_initTexts() {
                var self = this;
                self.buttonCancelI18n = i18n( 'general.button.CANCEL' );
                self.addButtonI18n = i18n( "InStockMojit.buttons.add" );
                self.warningMessage = i18n( "InStockMojit.medIndexWarning.message" );
            },
            closeDialog: function MedIndexWarningModel_closeDialog() {
                Y.doccirrus.modals.medIndexWarningModal.closeDialog();
            },
            createTable: function MedIndexWarningModel_createWarningTable() {
                var self = this;
                var tableContent = [];

                if( self.existingItems ) {
                    tableContent = tableContent.concat( self.existingItems );
                }

                if( self.itemAtLocation ) {
                    tableContent.unshift( self.itemAtLocation );
                }

                self.medIndexWarningTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        columns: [
                            {
                                componentType: 'KoTableColumnNumbering',
                                forPropertyName: 'KoTableColumnNumbering'
                            },
                            {
                                forPropertyName: 'gtinCode',
                                abel: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                width: '15%'
                            },
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '15%'
                            },
                            {
                                forPropertyName: 'description',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                width: '25%'
                            },
                            {
                                forPropertyName: 'phPriceCost',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                width: '15%'
                            },
                            {
                                forPropertyName: 'quantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                width: '10%'
                            },
                            {
                                forPropertyName: 'location.locname',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                width: '15%'
                            },
                            {
                                forPropertyName: 'stockLocation.title',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '15%'
                            }
                        ],
                        data: tableContent
                    }
                } );
            },

            /** @protected */
            destructor: function() {

            }

        } );

        function MedIndexWarningModal() {

        }

        MedIndexWarningModal.prototype.showDialog = function( warningObject ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/MedIndexWarning'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            medIndexWarningModel,
                            bodyContent = Y.Node.create( template ),
                            title = i18n( "InStockMojit.medIndexWarning.title" );

                        medIndexWarningModel = new MedIndexWarningModel( warningObject );
                        var isMedIndexWarning = true;

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: title,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            medIndexWarningModel.updateRecord(medIndexWarningModel.itemAtLocation, medIndexWarningModel.newItem, isMedIndexWarning);
                                        }
                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function() {
                            medIndexWarningModel.destroy();
                        } );

                        ko.applyBindings( medIndexWarningModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };

        MedIndexWarningModal.prototype.closeDialog = function() {
            modal.close();
        };
        Y.namespace( 'doccirrus.modals' ).medIndexWarningModal = new MedIndexWarningModal();

    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'promise',
            'KoUI-all',
            'DCWindow',
            'DCRouter',
            'DCBinder',
            'WareHouseViewModel'
        ]
    } );