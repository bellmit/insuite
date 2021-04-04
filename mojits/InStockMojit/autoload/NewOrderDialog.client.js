/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

YUI.add( 'dcorderdialog', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            unwrap = ko.unwrap,
            saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' ),
            cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' ),
            closeButtonI18n = i18n( 'DCWindow.BUTTONS.CLOSE' ),
            peek = ko.utils.peekObservable,
            modal = null,
            setFromConfig = false,
            currency = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? "CHF" : "",
            dialogModes = {
                creating: {
                    name: "creating",
                    kindOfTable: "KoEditableTable",
                    isSupplierReadOnly: false,
                    isLocationReadOnly: false,
                    showStockTable: true,
                    showWaresTable: true,
                    showChooseFormButton: true,
                    showApproveSelectedButton: false
                },
                updating: {
                    name: "updating",
                    kindOfTable: "KoEditableTable",
                    isSupplierReadOnly: false,
                    isLocationReadOnly: false,
                    showStockTable: true,
                    showWaresTable: true,
                    showChooseFormButton: true,
                    showApproveSelectedButton: false
                },
                readOnly: {
                    name: "readOnly",
                    kindOfTable: "KoTable",
                    isSupplierReadOnly: true,
                    isLocationReadOnly: true,
                    showStockTable: false,
                    showWaresTable: false,
                    showChooseFormButton: false,
                    showApproveSelectedButton: false
                },
                arriving: {
                    name: "arriving",
                    kindOfTable: "KoEditableTable",
                    isSupplierReadOnly: true,
                    isLocationReadOnly: true,
                    showStockTable: false,
                    showWaresTable: false,
                    showChooseFormButton: false,
                    showApproveSelectedButton: true
                },
                readOnlyArchived: {
                    name: "archived",
                    kindOfTable: "KoTable",
                    isLocationReadOnly: true,
                    showStockTable: false,
                    showWaresTable: false,
                    showChooseFormButton: false,
                    showApproveSelectedButton: false
                }
            },
            statuses = Y.doccirrus.schemas.stockorders.stockStatuses,
            WareHouseAdvancedFilterViewModel = KoViewModel.getConstructor( 'WareHouseAdvancedFilterViewModel' ),
            SupplierSelectViewModel = KoViewModel.getConstructor( 'SupplierSelectViewModel' ),
            LocationSelectViewModel = KoViewModel.getConstructor( 'LocationSelectViewModel' ),
            StockLocationSelectViewModel = KoViewModel.getConstructor( 'StockLocationSelectViewModel' ),
            SelectedWaresViewModel = KoViewModel.getConstructor( 'SelectedWaresViewModel' );

        function NewOrderModel( config ) {
            NewOrderModel.superclass.constructor.call( this, config );
        }

        Y.extend( NewOrderModel, KoViewModel.getDisposable(), {
            destructor: function() {
                Y.doccirrus.communication.off( 'statusChangeOrdersAction', 'ordersStatusListener' );
                Y.doccirrus.communication.off( 'stockDeliveryAction', 'updateDeliveryTable' );
            },

            initializer: function( config ) {
                var
                    self = this;
                self.orderId = config.orderId;
                self.getDeliveryByOrderId = config.getDeliveryByOrderId;
                self.getItemsEndpoint = config.source === 'delivery' ?
                    Y.doccirrus.jsonrpc.api.stockdelivery.getDeliveries :
                    Y.doccirrus.jsonrpc.api.stockordersrequest.getOrders;
                self.formId = ko.observable( config.form ? config.form._id : null );
                self.formTitle = ko.observable( config.form ? config.form.title + ' v' + config.form.version : null );
                setFromConfig = true;
                self.pointerEvents = ko.observable( 'auto' );
                self.advancedFilter = new WareHouseAdvancedFilterViewModel();
                self.supplierSelect = new SupplierSelectViewModel( {data: {selectedSupplier: null, initByFirstElement: true}} );
                self.locationSelect = new LocationSelectViewModel( {data: {selectedSupplier: null}} );
                self.showChooseFormButton = ko.observable( false );
                self.showApproveSelectedButton = ko.observable( false );
                self.stockLocationSelect = ko.observable( null );
                self.newStockLocation = ko.observable( null );
                self.totalOrderSum = ko.observable( null );

                self.initLabels();
                self.initObservables();
                self.switchModeAndInitTables();
                self.initSocketListeners();
                self.initSubscribe();
            },

            initObservables: function() {
                var
                    self = this;
                self.showStockTable = ko.observable( false );
                self.showWaresTable = ko.observable( false );
                self.selectedWares = ko.observableArray( [] );
                self.dispensedWares = ko.observableArray( [] );
                self.bookedWares = ko.observableArray( [] );
                self.stockLocationList = ko.observableArray( [] );
                self.filterQuery = ko.observable( null );
                self.supplierId = ko.observable( null );
                self.locationId = ko.observable( null );
                self.enableApplyButton = ko.observable( false );
                self.enableApproveButton = ko.observable( false );
                self.isReadyToSave = ko.observable(false);
                self.divideDispensedAndBookedWares = ko.observable( false );
                self.activitiesToDelete = [];
            },
            initSubscribe: function() {
                var
                    self = this;

                self.advancedFilter.query.subscribe( function( query ) {
                    self.filterQuery( query );
                } );

                self.supplierSelect.supplierId.subscribe( function( supplierId ) {
                    self.supplierId( supplierId );
                    self.toggleState();
                } );

                self.supplierSelect.selectedSupplier.subscribe( function( supplier ) {
                    if( !supplier || !supplier.form ) {
                        if( !setFromConfig ) {
                            self.formId( "" );
                            self.formTitle( "" );
                        }
                        setFromConfig = false;

                        return;
                    }

                    supplier.form = supplier.form[0] || supplier.form;
                    self.formTitle( supplier.form.title && supplier.form.version ? supplier.form.title + ' v' + supplier.form.version : null );
                    self.formId( supplier.form._id );
                } );

                self.locationSelect.locationId.subscribe( function( locationId ) {
                    self.locationId( locationId );
                    self.toggleState();
                } );

                self.locationSelect.selectedLocation.subscribe( function( location ) {
                    var
                        stockLocations = (location || {}).stockLocations || [],
                        containsLocation;
                    self.stockLocationList( stockLocations );

                    if (stockLocations.length === 1) {
                        unwrap( self.selectedWares ).forEach( function( ware ) {
                            ware.stockLocation(stockLocations[0]);
                        });
                    } else {
                        //Clear stockLocation field if location does not contain stockLocation
                        unwrap( self.selectedWares ).forEach( function( ware ) {
                            containsLocation = stockLocations.find( function( stockLoc ) {
                                return stockLoc._id === (unwrap( ware.stockLocation ) || {})._id;
                            } );
                            if( !containsLocation ) {
                                ware.stockLocation( {} );
                            }
                        } );
                    }

                } );
                /*(Delivery view: Subscribe to global stockLocation select  */
                self.addDisposable( ko.computed( function() {
                    var
                        stockLocationSelect = unwrap( self.stockLocationSelect );
                    if( stockLocationSelect ) {
                        stockLocationSelect.selectedStockLocation.subscribe( function( stockLocation ) {
                            if( stockLocation ) {
                                self.newStockLocation( {
                                    _id: stockLocation.code,
                                    title: stockLocation.name
                                } );
                                self.enableApplyButton( true );
                            } else {
                                self.newStockLocation( null );
                                self.enableApplyButton( false );
                            }
                        } );
                    }
                } ) );


                self.addDisposable( ko.computed( function() {
                    var
                        isReadyToSave = unwrap(self.isReadyToSave),
                        saveButton = null;

                    try {
                        saveButton = modal.getButton( 'OK' );
                    } catch(e) {
                        saveButton = null;
                    } finally {
                        if( saveButton ) {
                            if( isReadyToSave ) {
                                saveButton.set( 'disabled', false );
                            } else {
                                saveButton.set( 'disabled', true );
                            }
                        }
                    }
                }));

                self.addDisposable(ko.computed( function(  ) {
                    var wares = unwrap(self.selectedWares);
                    if (wares) {
                        self.toggleState();
                    }
                }));
            },
            toggleState: function() {
                var self = this,
                    isAllWaresValid = true,
                    isEditOrCreateMode = self.mode && (self.mode.name === dialogModes.creating.name || self.mode.name === dialogModes.updating.name),
                    selectedWares = unwrap(self.selectedWares);

                if (!isEditOrCreateMode) {
                    self.isReadyToSave(true);
                    return;
                }

                selectedWares.forEach(function(ware){
                    if (!ware._isValid()){
                        isAllWaresValid = false;
                        return;
                    }
                });

                // In "updating" mode we need option to "Save"/(Delete) an empty order (!selectedWares.length) - in this case enable "Save" button
                self.isReadyToSave(unwrap(self.supplierId) && unwrap(self.locationId) && isAllWaresValid && (selectedWares.length || !selectedWares.length && unwrap(self.mode.name) === "updating" ) );
            },
            selectItemInStock: function( row ) {
                var
                    self = this,
                    addedRow,
                    isStockLocationInList =false,
                    waresViewModel,
                    ware = Object.assign({}, row);
                ware.supplier = "";

                addedRow = _.find( unwrap( self.selectedWares ), function( _ware ) {
                    return unwrap( _ware.phPZN ) === ware.phPZN && (unwrap( _ware.stockLocation ) || {})._id === ware.stockLocationId;
                } );

                if( addedRow ) {
                    addedRow.quantityOrdered( Math.abs( Number( unwrap( addedRow.quantityOrdered ) ) ) + 1 );
                } else {
                    if( !ware.quantityOrdered ) {
                        ware.quantityOrdered = 1;
                    }
                    if (ware.stockLocation) {
                        isStockLocationInList = unwrap(self.stockLocationList).some(function( listItem ) {
                            return (listItem._id === ware.stockLocation._id);
                        });

                        if (!isStockLocationInList) {
                            delete ware.stockLocation;
                        }
                        //Use first stockLocation if only one stockLocation available
                        if (!isStockLocationInList && unwrap(self.stockLocationList).length === 1) {
                            ware.stockLocation = unwrap(self.stockLocationList)[0];
                        }
                    }

                    ware.quantityOrdered = Math.abs( ware.quantityOrdered );
                    waresViewModel = new SelectedWaresViewModel( {data: ware} );
                    waresViewModel._isValid.subscribe(function() {
                        self.toggleState();
                    });
                    self.selectedWares.push( waresViewModel );
                }
                self.recalculateTotalOrderSum();
            },
            initLabels: function() {
                var
                    self = this;
                self.itemsTableTitleI18n = i18n( 'InStockMojit.newOrderModal.itemsInStock' );
                self.orderTableTitleI18n = i18n( 'InStockMojit.newOrderModal.order' );
                self.dispensedTableTitleI18n = i18n( 'InStockMojit.newOrderModal.dispensedList' );
                self.bookedTableTitleI18n = i18n( 'InStockMojit.newOrderModal.bookedList' );
                self.orderAllI18n = i18n( 'InStockMojit.newOrderModal.orderAll' );
                self.orderFormI18n = i18n( 'InStockMojit.newOrderModal.titles.chooseFormButton' );
                self.applyStockLocationButtonI18n = i18n( 'InStockMojit.newOrderModal.applyStockLocation' );
                self.approveSelectedButtonI18n = i18n( 'InStockMojit.newOrderModal.approveSelected' );
                self.splitButtonI18n = i18n( 'InStockMojit.newOrderModal.splitButton' );
                self.stockLabelI18n = i18n( 'InStockMojit.newOrderModal.inStock' );
                self.medCatalogI18n = i18n( 'InStockMojit.newOrderModal.medCatalog' );
                self.priceCalculation = i18n( 'InStockMojit.messages.priceCalculation' );
                self.totalOrderSumI18n = i18n( 'InStockMojit.newOrderModal.totalOrderSum' );
                self.icon = '<a href="#"><i className="fa fa-info-circle" style="padding: 0 10px 10px 5px;" aria-hidden="true" title="' + self.priceCalculation +'"></span></a>';
            },
            initStockTable: function() {
                var
                    self = this;

                self.stockTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-stockTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWares,
                        limitList: [6, 20, 30, 40, 50, 100],
                        responsive: false,
                        fillRowsToLimit: true,
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'stockTableHandlerId'
                            }],
                        baseParams: {
                            query: ko.pureComputed( function() {
                                return unwrap( self.filterQuery );
                            } )
                        },
                        columns: [
                            {
                                forPropertyName: 'quantityOrdered',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField
                            },
                            {
                                forPropertyName: 'phPZN',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                width: '8%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'description',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                width: '10%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'phPriceCost',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                                width: '11%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField,
                                renderer: function( meta ) {
                                    var value = unwrap( meta.value );
                                    if( !isNaN( value ) ) {
                                        return value + " " + currency;
                                    }

                                    return "0.00";
                                }
                            },
                            {
                                forPropertyName: 'phPriceSale',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                                width: '11%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField,
                                renderer: function( meta ) {
                                    var value = unwrap( meta.value );
                                    if( !isNaN( value ) ) {
                                        return Y.doccirrus.schemas.instock.getSwissPriceString( value );
                                    }
                                    return value;
                                }
                            },
                            {
                                forPropertyName: 'quantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField,
                                renderer: function( meta ) {
                                    if( !isNaN( meta.value ) ) {
                                        return Number( meta.value ).toFixed( 2 );
                                    }
                                    return meta.value;
                                }
                            },
                            {
                                forPropertyName: 'minimumQuantity',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField
                            },
                            {
                                forPropertyName: 'supplier.content',
                                label: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                title: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'location.locname',
                                label: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                title: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'stockLocation.title',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                row = meta.row;
                            row.stockType = 'instock';
                            self.selectItemInStock( row );
                        }
                    }

                } );
            },
            floatFilterField: {
                componentType: 'KoField',
                valueType: 'float',
                renderer: function( observable, value ) {
                    observable( value === 0 ? 0 : value || "" );
                }
            },
            initMedicationsCatalogTable: function() {
                var
                    self = this;

                self.catalogTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'instock-catalogTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.instockrequest.getWaresFromCatalog,
                        limitList: [6, 20, 30, 40, 50, 100],
                        responsive: false,
                        fillRowsToLimit: true,
                        baseParams: {},
                        columns: [
                            {
                                forPropertyName: 'code',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField
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
                                filterField: self.floatFilterField
                            },
                            {
                                forPropertyName: 'phPackSize',
                                label: i18n( 'activity-schema.Medication_T.phPackSize.i18n' ),
                                title: i18n( 'activity-schema.Medication_T.phPackSize.i18n' ),
                                width: '15%',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                filterField: self.floatFilterField
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
                            var
                                currentRow = _.cloneDeep(meta.row),
                                existingInStock;
                            currentRow.description = currentRow.phDescription;
                            currentRow.stockType = 'medicationscatalog';
                            currentRow.gtinCode = unwrap( currentRow.code );
                            /**
                             * Add item from catalog, prices from catalog stored in phPriceSales/CostCatalog and phPriceSales/Cost fields
                             * but if items exist in inStock we check phPriceSales/Cost field and update them on the currentItem.
                             */
                            currentRow.phPriceSaleCatalog = currentRow.phPriceSale;
                            currentRow.phPriceCostCatalog = currentRow.phPriceCost;
                            currentRow.vatTypeCatalog = currentRow.vatType;
                            Y.doccirrus.jsonrpc.api.instockrequest.getWares( {
                                query: {
                                    $and: [
                                        {
                                            phPZN: unwrap( currentRow.phPZN )
                                        },
                                        {
                                            gtinCode: unwrap( currentRow.phGTIN )
                                        }
                                    ]
                                }
                            } ).done( function( result ) {
                                if(result.data.length) {
                                    existingInStock = result.data[0];
                                    currentRow.phPriceCost = existingInStock.phPriceCost;
                                    currentRow.phPriceSale = existingInStock.phPriceSale;
                                }
                                self.selectItemInStock( currentRow );
                            } ).fail( function(err) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            });

                        }
                    }

                } );
            },
            /**
             * Show/hide components on NewOrderDialog depends on order status, and init data if order is open for editing
             * Mode config example:
             * dialogModes = {
                creating: {
                    name: "creating",
                    kindOfTable: "KoEditableTable", - table type is using for selected wares table
                    isSupplierReadOnly: false, - is supplier dropdown read only
                    isLocationReadOnly: false, - is location dropdown read only
                    showStockTable: true, -  is stock table visible
                    showWaresTable: true,  - is wares (selectedWares) table  visible
                    showChooseFormButton: true, is choose form template button visible
                    showApproveSelectedButton: false  is approve selected item button visible
                    }
                }
             */
            switchModeAndInitTables: function() {
                var self = this;

                if( !self.orderId ) {
                    self.mode = dialogModes.creating;
                    self.initStockTable();
                    self.initMedicationsCatalogTable();
                    self.initSelectedWaresComponents();
                    self.showStockTable( self.mode.showStockTable );
                    self.showWaresTable( self.mode.showWaresTable );
                    self.showChooseFormButton( self.mode.showChooseFormButton );
                    return;
                }

                var query = self.getDeliveryByOrderId ? {orderId: self.orderId} : {'_id': self.orderId};
                self.getItemsEndpoint( {query: query} )
                    .done( function( response ) {
                        var order = response.data[0] || {};

                        self.currentOrderStatus = order.status;

                        switch( order.status ) {
                            case statuses.created:
                                self.mode = dialogModes.updating;
                                self.initStockTable();
                                self.initMedicationsCatalogTable();
                                break;
                            case statuses.sent:
                                self.mode = dialogModes.readOnly;
                                break;
                            case statuses.closed:
                            case statuses.arrived:
                            case statuses.partiallybooked:
                                self.mode = dialogModes.arriving;
                                self.stockLocationSelect( new StockLocationSelectViewModel( {
                                    data: {
                                        stockLocations: order.stockLocations,
                                        allowEmpty: true
                                    }
                                } ) );
                                break;
                            case statuses.archived:
                                self.mode = dialogModes.readOnlyArchived;
                                break;
                            default:
                                self.mode = dialogModes.readOnly;

                        }

                        self.showStockTable( self.mode.showStockTable );
                        self.showChooseFormButton( self.mode.showChooseFormButton );
                        self.showApproveSelectedButton( self.mode.showApproveSelectedButton );

                        self.supplierSelect.applyData( {
                            data: {
                                selectedSupplier: {
                                    code: order.basecontactId,
                                    name: (order.supplier || {}).content,
                                    form: order.form
                                },
                                readOnly: self.mode.isSupplierReadOnly
                            }
                        } );

                        self.locationSelect.applyData( {
                            data: {
                                selectedLocation: {
                                    code: order.locationId,
                                    name: order.locname
                                },
                                readOnly: self.mode.isLocationReadOnly
                            }
                        } );

                        self.stockLocationList( order.stockLocations );
                        self.selectedWares( [] );
                        self.bookedWares( [] );
                        self.dispensedWares( [] );
                        (order.stocks || []).forEach( function( stock ) {
                            var
                                editor = _.find( order.editors, {'_id': stock.editorId} );
                            if (!stock.stockItem) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_02'} ),
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                        buttons: {
                                            header: ['close'],
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {isDefault: false} )
                                            ]
                                        }
                                    }
                                } );

                                modal.close();
                                return;
                            }
                            // assigns phPriceCost from stock to order
                            self.selectedWares.push(
                                new SelectedWaresViewModel(
                                    {
                                        data: {
                                            supplier: order.basecontactId,
                                            patients: stock.patients,
                                            quantityOrdered: stock.quantity,
                                            phPZN: stock.stockItem.phPZN,
                                            description: stock.stockItem.description,
                                            phPriceSale: stock.phPriceSale,
                                            phPriceCost: stock.phPriceCost,
                                            phPriceSaleCatalog: stock.phPriceSaleCatalog,
                                            phPriceCostCatalog: stock.phPriceCostCatalog,
                                            vatTypeCatalog: stock.vatTypeCatalog,
                                            ingredients: stock.stockItem.ingredients,
                                            editorId: stock.editorId || null,
                                            quantityDelivered: stock.quantityDelivered || 0,
                                            checked: stock.checked || false,
                                            editor: editor || null,
                                            _id: stock.stockItem._id,
                                            stocksId: stock._id,
                                            stockType: stock.stockType,
                                            stockLocation: stock.stockLocation,
                                            isProcessed: stock.isProcessed,
                                            nota: stock.nota,
                                            gtinCode: stock.stockItem.gtinCode,
                                            phPackSize: stock.stockItem.phPackSize,
                                            dispensedQuantity: stock.dispensedQuantity,
                                            isDivisible: stock.stockItem.isDivisible,
                                            dividedQuantity: stock.dividedQuantity,
                                            activities: stock.activities
                                        },
                                        mode: self.mode
                                    }
                                )
                            );
                        } );

                        self.initSelectedWaresComponents();
                        self.showWaresTable( true );
                    } )
                    .fail( function( error ) {
                        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( error );

                        errors.forEach(function( error ) {
                            error.display('error');
                        });
                    } );

            },
            reloadSelectedWaresTable: function() {
                var
                    self = this;
                self.switchModeAndInitTables();
            },
            initSelectedWaresComponents: function() {
                var
                    self = this,
                    OP = i18n('InStockMojit.instock_schema.InStock_T.OP'),
                    TP = i18n('InStockMojit.instock_schema.InStock_T.TP'),
                    columns,
                    allWares,
                    patientsColumn,
                    dispensedQuantityColumn,
                    bookedQuantityColumn,
                    bookedTableColumns,
                    dispensedTableColumns,
                    dividedQuantityColumn;
                if( [dialogModes.arriving.name, dialogModes.updating.name ].includes(self.mode.name) ) {
                    self.recalculateTotalOrderSum();
                }

                columns = [
                    {
                        forPropertyName: 'quantityOrdered',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                        width: '5%',
                        renderer: function(meta) {
                            var value = unwrap(meta.value);
                            self.recalculateTotalOrderSum();
                            return value;
                        }
                    },
                    {
                        forPropertyName: 'isDivisible',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                        width: '5%',
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            if( unwrap( meta.value ) ) {
                                return TP;
                            } else {
                                return OP;
                            }
                        }
                    },
                    {
                        forPropertyName: 'gtinCode',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                        visible: false,
                        width: '8%'
                    },
                    {
                        forPropertyName: 'phPZN',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                        visible: true,
                        width: '8%'
                    },
                    {
                        forPropertyName: 'prdNo',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.prdNo' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.prdNo' ),
                        visible: false,
                        width: '8%'
                    },
                    {
                        forPropertyName: 'description',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                        width: '15%'
                    },
                    {
                        forPropertyName: 'nota',
                        label: i18n( 'InStockMojit.instock_schema.StockOrders_T.nota' ),
                        title: i18n( 'InStockMojit.instock_schema.StockOrders_T.nota' ),
                        width: '15%'
                    },
                    {
                        forPropertyName: 'phIngr',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' ),
                        width: '15%',
                        visible: false,
                        renderer: function( meta ) {
                            var value = unwrap( meta.value ),
                                ingredients = unwrap( meta.row.ingredients );
                            if( Array.isArray( value ) ) {
                                return value.map( function( ingr ) {
                                    return ingr.name;
                                } ).join( ',' );
                            } else if( Array.isArray( ingredients ) ) {
                                return ingredients.join( ',' );
                            } else {
                                return value || "";
                            }

                        }
                    },
                    {
                        forPropertyName: 'phPriceCost',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                        width: '11%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );
                            if( !isNaN( value ) ) {
                                return Number( value ).toFixed( 2 ) + " " + currency;
                            }
                            return value;
                        }
                    },
                    {
                        forPropertyName: 'phPriceCostCatalog',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' ),
                        width: '11%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );
                            if( !isNaN( value ) ) {
                                return Number( value ).toFixed( 2 ) + " " + currency;
                            }
                            return value;
                        }
                    },
                    {
                        forPropertyName: 'phPriceSale',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ) + '<a href="#"><span class="fa fa-info-circle" style="padding: 0 10px 10px 5px;" aria-hidden="true" title="' + Y.doccirrus.i18n( 'InStockMojit.messages.priceCalculation' ) + '"></span></a>',
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                        width: '11%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );
                            if( !isNaN( value ) ) {
                                return Number( value ).toFixed( 2 ) + " " + currency;
                            }
                            return "";
                        }
                    },
                    {
                        forPropertyName: 'phPriceSaleCatalog',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSaleCatalog' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSaleCatalog' ),
                        width: '11%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );
                            if( !isNaN( value ) ) {
                                return Y.doccirrus.schemas.instock.getSwissPriceString( value );
                            }

                            return "";
                        }
                    },
                    {
                        forPropertyName: 'stockLocation',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                        required: true,
                        width: '10%',
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                useSelect2Data: true,
                                select2Read: function( stockLocation ) {
                                    if( !stockLocation ) {
                                        return stockLocation;
                                    } else {
                                        return {
                                            id: stockLocation._id,
                                            text: stockLocation.title || ""
                                        };
                                    }
                                },
                                select2Write: function( $event, observable ) {
                                    if( !$event.added ) {
                                        observable( null );
                                    }
                                    observable( {
                                        _id: $event.added.id,
                                        title: $event.added.text
                                    } );
                                },
                                select2Config: {
                                    query: undefined,
                                    initSelection: undefined,

                                    data: function() {
                                        return {
                                            results: (unwrap( self.stockLocationList ) || []).map( function( sl ) {
                                                return {
                                                    id: sl._id,
                                                    text: sl.title
                                                };
                                            } )
                                        };
                                    },
                                    multiple: false
                                }
                            }
                        },
                        renderer: function( meta ) {
                            return (unwrap( meta.value ) || {}).title || "";
                        }
                    }
                ];
                patientsColumn = {
                    forPropertyName: "patients",
                    label: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.patient' ),
                    title: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.patient' ),
                    width: '10%',
                    renderer: function( meta ) {
                        var value = unwrap( meta.value );

                        return value.map( function( patient ) {
                            return "<a  target='_blank' href='/incase#/patient/" + patient._id + "/tab/casefile_browser'>" + patient.lastname + " " + patient.firstname + "</a>";
                        } ).join( ", " );
                    }
                };

                /*Add remove buttons */
                if( self.mode.name === dialogModes.updating.name || self.mode.name === dialogModes.creating.name ) {
                    columns.push( patientsColumn );
                    columns.push( {
                        forPropertyName: 'deleteButton',
                        utilityColumn: true,
                        width: '60px',
                        css: {
                            'text-center': 1
                        },
                        inputField: {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'delete',
                                title: i18n( 'general.button.DELETE' ),
                                icon: 'TRASH_O',
                                click: function( button, $event, $context ) {
                                    var
                                        rowModel = $context.$parent.row,
                                        patients = unwrap( rowModel.patients ),
                                        actArr,
                                        activities = unwrap( rowModel.activities );

                                    if( patients && patients.length ) {
                                        actArr = activities.map( function( act ) {
                                            return act._id;
                                        } );
                                        self.activitiesToDelete = self.activitiesToDelete.concat( actArr );
                                    }

                                    $context.$root.selectedWaresTable.removeRow( rowModel );
                                    self.selectedWares.remove( rowModel );
                                }
                            }
                        }
                    } );
                    dividedQuantityColumn = {
                        forPropertyName: 'dividedQuantity',
                        label: i18n( 'InStockMojit.instock_schema.InStock_T.dividedQuantity' ),
                        title: i18n( 'InStockMojit.instock_schema.InStock_T.dividedQuantity' ),
                        visible: true,
                        width: '5%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value ),
                                isDivisible = unwrap( meta.row.isDivisible );

                            if( isDivisible ) {
                                return value;
                            }
                            return '';
                        }
                    };
                    columns.splice( 3, 0, dividedQuantityColumn );
                }

                /*Add additional columns when status is 'arriving'*/
                if( self.mode.name === dialogModes.arriving.name || self.mode.name === dialogModes.readOnlyArchived.name ) {
                    columns.push( {
                        forPropertyName: 'editor',
                        label: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                        title: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                        width: '8%',
                        renderer: function( meta ) {
                            var value = unwrap( meta.value );

                            if( !value ) {
                                return null;
                            }
                            return value.firstname + " " + value.lastname;
                        }
                    } );

                    columns.push( {
                        forPropertyName: 'splitButton',
                        utilityColumn: true,
                        width: '90px',
                        css: {
                            'text-center': 1
                        },
                        getCss: function( context ) {
                            if( unwrap( context.$parent.isProcessed ) ) {
                                return 'disabled-button';
                            }
                        },
                        inputField: {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'splitDeliveryItem',
                                title: self.splitButtonI18n,
                                text: self.splitButtonI18n,
                                option: 'PRIMARY',
                                click: function( button, $event, $context ) {
                                    if( !unwrap( $context.$parent.row.isProcessed ) ) {
                                        Y.doccirrus.modals.splitDeliveryItemDialog.showDialog( {
                                            deliveryItem: $context.$parent.row,
                                            stockLocations: unwrap( self.stockLocationList ),
                                            callback: self.splitDeliveryItem( $context.$parent.rowIndex )
                                        } );
                                    }
                                }
                            }
                        }
                    } );

                    columns.unshift( {
                        forPropertyName: 'quantityDelivered',
                        label: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' ),
                        title: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' ),
                        width: '8%'
                    } );
                }

                if( self.mode.name === dialogModes.arriving.name ) {
                    // push checkbox column in the beginning of the table
                    columns.unshift( {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'multi',
                        selectAllCheckbox: true
                    } );

                    allWares = unwrap( self.selectedWares );
                    allWares.forEach( function( ware ) {
                        var patients = unwrap( ware.patients ),
                            isDivisible = unwrap(ware.isDivisible),
                            itemsLeft, quantityOrdered, phPackSize, dispensedQuantity;
                        if( patients && patients.length ) {
                            self.dispensedWares.push( ware );
                            if(isDivisible) {
                                quantityOrdered = unwrap(ware.quantityOrdered);
                                phPackSize = unwrap(ware.phPackSize);
                                dispensedQuantity = unwrap(ware.dispensedQuantity);
                                itemsLeft = quantityOrdered * phPackSize - dispensedQuantity;
                                if(itemsLeft > 0) {
                                    ware.bookedQuantity(itemsLeft);
                                    self.bookedWares.push( ware );
                                }
                            }
                        } else {
                            self.bookedWares.push( ware );
                        }
                    } );

                    self.divideDispensedAndBookedWares( self.dispensedWares().length > 0 );
                }

                /*Disable approve button if row with invalid value selected*/
                var invalidRows = ko.observableArray( [] );
                var checkedRows = ko.observableArray( [] );
                self.enableApproveButton( false );

                function handleApproveButtonState( row, index ) {
                    var rowChecked = unwrap( row.checked ),
                        rowValid = unwrap( row._isValid );

                    if( rowChecked && !unwrap( row.isProcessed ) ) {
                        checkedRows.push( index );
                    } else {
                        checkedRows.remove( index );
                    }

                    if( rowChecked && !rowValid ) {
                        invalidRows.push( index );
                    } else {
                        invalidRows.remove( index );
                    }
                    self.enableApproveButton( !unwrap( invalidRows ).length && unwrap( checkedRows ).length );
                }

                function initRowSubscriprion( table ) {
                    // trigger button when init checked
                    unwrap( table.rows ).forEach( function( row, index ) {
                        if( row.checked ) {
                            handleApproveButtonState( row, index );
                        }
                    } );
                    self.addDisposable( ko.computed( function() {
                        unwrap( table.rows ).forEach( function( row, index ) {
                            row.checked.subscribe( function() {
                                handleApproveButtonState( row, index );
                            } );
                            row._isValid.subscribe( function() {
                                handleApproveButtonState( row, index );
                            } );
                        } );
                    } ) );

                }

                if( self.divideDispensedAndBookedWares() ) {
                    dispensedQuantityColumn = {
                        forPropertyName: "dispensedQuantity",
                        label: i18n( 'InStockMojit.newOrderModal.columns.dispensed' ),
                        title: i18n( 'InStockMojit.newOrderModal.columns.dispensed' ),
                        width: '10%',
                        renderer: function( meta ) {
                            return unwrap( meta.value );
                        }
                    };

                    bookedQuantityColumn = {
                        forPropertyName: "bookedQuantity",
                        label: i18n( 'InStockMojit.newOrderModal.columns.booked' ),
                        title: i18n( 'InStockMojit.newOrderModal.columns.booked' ),
                        width: '10%',
                        renderer: function( meta ) {
                            return unwrap(meta.value);
                        }
                    };

                    //cloning columns for dispensed and booked tables
                    bookedTableColumns = columns.slice();
                    dispensedTableColumns = columns.filter(function (col) {
                        return col.forPropertyName !== 'splitButton';
                    });

                    dispensedTableColumns.push(patientsColumn);
                    dispensedTableColumns.splice(4, 0, dispensedQuantityColumn);
                    bookedTableColumns.splice(4, 0, bookedQuantityColumn);

                    self.dispensedWaresTable = KoComponentManager.createComponent( {
                        componentType: self.mode.kindOfTable,
                        componentConfig: {
                            stateId: 'instock-seletectedDispensedItemsTable',
                            data: self.dispensedWares,
                            ViewModel: SelectedWaresViewModel,
                            responsive: false,
                            draggableRows: false,
                            striped: false,
                            fillRowsToLimit: false,
                            limit: 10,
                            limitList: [10, 20, 30, 40, 50, 100],
                            selectMode: 'multi',
                            columns: dispensedTableColumns,
                            isAddRowButtonVisible: function() {
                                return false;
                            }
                        }
                    } );

                    self.bookedWaresTable = KoComponentManager.createComponent( {
                        componentType: self.mode.kindOfTable,
                        componentConfig: {
                            stateId: 'instock-notDispensedItemsTable',
                            data: self.bookedWares,
                            ViewModel: SelectedWaresViewModel,
                            responsive: false,
                            draggableRows: false,
                            striped: false,
                            fillRowsToLimit: false,
                            limit: 10,
                            limitList: [10, 20, 30, 40, 50, 100],
                            selectMode: 'multi',
                            columns: bookedTableColumns,
                            isAddRowButtonVisible: function() {
                                return false;
                            }
                        }
                    } );
                    initRowSubscriprion(self.dispensedWaresTable);
                    initRowSubscriprion(self.bookedWaresTable);
                } else {
                    self.selectedWaresTable = KoComponentManager.createComponent( {
                        componentType: self.mode.kindOfTable,
                        componentConfig: {
                            stateId: 'instock-seletectedItemsTable',
                            data: self.selectedWares,
                            ViewModel: SelectedWaresViewModel,
                            responsive: false,
                            draggableRows: false,
                            striped: false,
                            fillRowsToLimit: false,
                            limit: 10,
                            limitList: [10, 20, 30, 40, 50, 100],
                            selectMode: 'multi',
                            columns: columns,
                            isAddRowButtonVisible: function() {
                                return false;
                            }
                        }
                    } );
                    initRowSubscriprion( self.selectedWaresTable );
                }
            },
            initSocketListeners: function() {
                var
                    self = this;
                Y.doccirrus.communication.on( {
                    event: 'statusChangeOrdersAction',
                    done: function( msg ) {
                        if( msg.data === 'create' || msg.data.some( function(entry) { return entry.action === 'delete'; })) {
                            return;
                        }

                        /*Make window readonly if order/delivery status changed*/
                        self.getItemsEndpoint( {query: {'_id': self.orderId}} )
                            .done( function( response ) {
                                var order = response.data[0] || {},
                                    message = i18n( 'InStockMojit.newOrderModal.statusChanged' );

                                if( order.status === self.currentOrderStatus || !self.currentOrderStatus ) {
                                    return;
                                }

                                modal.getButton( 'OK' ).set( 'disabled', true );
                                message = message.replace( '[1]', self.currentOrderStatus ).replace( '[2]', order.status );
                                self.pointerEvents( 'none' );
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'warn',
                                    message: message
                                } );
                            } )
                            .fail( function( err ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            } );

                    },
                    handlerId: 'ordersStatusListener'
                } );

                Y.doccirrus.communication.on( {
                    event: 'stockDeliveryAction',
                    handlerId: 'updateDeliveryTable',
                    done: function() {
                        if( self.mode.name === dialogModes.arriving.name ) {
                            self.reloadSelectedWaresTable();
                        }
                    }
                } );
            },
            /**
             * Create/Edit new order view : add all items displayed in stock table to order
             */
            orderALL: function() {
                var
                    self = this,
                    stockItems = peek( self.stockTable.rows ),
                    addedRow;

                stockItems.forEach( function( stockItem, index ) {
                    var
                        quantityOrdered;
                    /*Filter out empty rows*/
                    if( !stockItem.phPZN || index === 1000 ) {
                        return;
                    }

                    quantityOrdered = stockItem.minimumQuantity - stockItem.quantity;

                    if( quantityOrdered < 0 ) {
                        quantityOrdered = 0;
                    }

                    stockItem.quantityOrdered = quantityOrdered;
                    stockItem.stockType = 'instock';
                    addedRow = _.find( unwrap( self.selectedWares ), function( ware ) {
                        return unwrap( ware.phPZN ) === stockItem.phPZN && unwrap( ware.stockLocationId ) === unwrap( stockItem.stockLocationId );
                    } );

                    if( addedRow ) {
                        addedRow.quantityOrdered( Number( unwrap( addedRow.quantityOrdered ) ) + stockItem.quantityOrdered );
                    } else {

                        self.selectedWares.push( new SelectedWaresViewModel( {data: stockItem} ) );
                    }
                } );
            },
            /**
             * Delivery view: Apply selected global stock location to all items in delivery.
             */
            applyStockLocation: function() {
                var
                    self = this;
                unwrap( self.selectedWares ).forEach( function( ware ) {
                    var newStockLocation;

                    if( unwrap( ware.checked ) && !unwrap( ware.isProcessed ) ) {
                        newStockLocation = unwrap( self.newStockLocation );
                        ware.stockLocation( newStockLocation );
                        ware.stockLocationId( newStockLocation._id );
                    }
                } );
            },
            selectPdfTemplate: function() {
                var
                    self = this;
                Y.doccirrus.modals.chooseInvoiceForm.show( {
                    'defaultIdentifier': unwrap( self.formId ) || 'instock-order',        //  use the system default invoice form
                    'title': i18n( 'InStockMojit.newOrderModal.titles.chooseFormModalTitle' ),
                    'onFormSelected': function( formId, formTitle ) {
                        self.formId( formId );
                        self.formTitle( formTitle );
                    }
                } );
            },
            /**
             * Map data (selected supplier, selected form, selected location and selected wares) to StockOrders_T
             * @param {Boolean} config.getCheckedAndNotProcessed - exclude items where isProcessed === true
             * @returns {*}
             */
            getGroupedOrder: function( config ) {
                var
                    self = this,
                    wares = unwrap( self.selectedWares ),
                    basecontactId = unwrap( peek( self.supplierId ) ),
                    formId = unwrap( peek( self.formId ) ),
                    locationId = unwrap( self.locationId );
                config = config || {};

                if( !basecontactId || !wares.length || !locationId ) {
                    return null;
                }

                if( config.getCheckedAndNotProcessed ) {
                    wares = wares.filter( function( ware ) {
                        return !unwrap( ware.isProcessed ) && unwrap( ware.checked );
                    } );
                }

                if( _.find( wares, function( ware ) {
                        return !unwrap( ware._isValid );
                    } ) ) {
                    return null;
                }

                return {
                    basecontactId: basecontactId,
                    formId: formId,
                    locationId: locationId,
                    stocks: wares.map( function( ware ) {
                        return {
                            stockType: unwrap( ware.stockType ),
                            references: unwrap( ware._id ),
                            quantity: unwrap( ware.quantityOrdered ),
                            checked: unwrap( ware.checked ),
                            quantityDelivered: unwrap( ware.quantityDelivered ),
                            _id: unwrap( ware.stocksId ),
                            stockLocationId: (unwrap( ware.stockLocation ) || {})._id || null,
                            isProcessed: unwrap( ware.isProcessed ),
                            phPriceSale: unwrap( ware.phPriceSale ),
                            phPriceSaleCatalog: unwrap( ware.phPriceSaleCatalog ),
                            phPriceCost: unwrap( ware.phPriceCost ),
                            phPriceCostCatalog: unwrap( ware.phPriceCostCatalog ),
                            patients: unwrap( ware.patients ).map(function( patient ) {
                                return patient._id;
                            }),
                            editorId: unwrap( ware.editorId ),
                            nota: unwrap( ware.nota ),
                            phPZN: unwrap( ware.phPZN ),
                            isDivisible: unwrap( ware.isDivisible ),
                            phPackSize: unwrap( ware.phPackSize ),
                            dividedQuantity: unwrap( ware.dividedQuantity ),
                            activities: unwrap( ware.activities )
                        };
                    } )
                };
            },
            getActivitiesOrOrderToDelete: function( ) {
                var
                    self = this,
                    orderToDelete = {
                        _id: self.orderId,
                        status: self.currentOrderStatus
                    },
                    activitiesToDelete = unwrap( self.activitiesToDelete );

                return {
                    activitiesToDelete: activitiesToDelete,
                    orderToDelete: orderToDelete
                };
            },
            /**
             * Save to DB delivered quantity and stocklocation, should updates item from instock with same
             * phPZN and stockLocation, if item is not exist in instock then should be added new one
             */
            approveSelected: function() {
                var
                    self = this,
                    order = self.getGroupedOrder( {getCheckedAndNotProcessed: true} );

                order._id = peek( self.orderId );
                self.enableApproveButton( false );
                Y.doccirrus.jsonrpc.api.stockdelivery.approveOrderItems( {data: { order: order }} )
                    .done( function() {
                        self.enableApproveButton( true );
                    } )
                    .fail( function( error ) {
                        self.enableApproveButton( true );
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            },
            /**
             * Show Split dialog for item where split button was clicked
             * Saves new items to DB after closing split dialog
             * @param rowIndex - index of row where split button was clicked
             * @returns {Function}
             */
            splitDeliveryItem: function( rowIndex ) {
                var
                    self = this;

                return function( splitConfig ) {
                    if( !splitConfig.length ) {
                        return;
                    }

                    var ware = unwrap( self.selectedWares )[rowIndex];
                    ware.quantityDelivered( unwrap( splitConfig[0].quantityDelivered ) );
                    ware.stockLocation( unwrap( splitConfig[0].stockLocation ) );

                    splitConfig.forEach( function( config, index ) {
                        if( index === 0 ) {
                            return;
                        }
                        self.selectedWares.push( new SelectedWaresViewModel(
                            {
                                data: {
                                    supplier: unwrap( ware.supplier ),
                                    quantityOrdered: 0,
                                    phPZN: unwrap( ware.phPZN ),
                                    description: unwrap( ware.description ),
                                    phPriceSale: unwrap( ware.phPriceSale ),
                                    phPriceCost: unwrap( ware.phPriceCost ),
                                    editorId: unwrap( ware.editorId ) || null,
                                    stockType: unwrap( ware.stockType ),
                                    quantityDelivered: unwrap( config.quantityDelivered ),
                                    checked: false,
                                    editor: null,
                                    _id: unwrap( ware._id ),
                                    stocksId: "",
                                    stockLocation: unwrap( config.stockLocation ),
                                    isProcessed: false,
                                    dividedQuantity: unwrap( ware.dividedQuantity )
                                },
                                mode: self.mode
                            }
                        ) );

                    } );

                    var
                        order = self.getGroupedOrder();

                    order._id = peek( self.orderId );
                    Y.doccirrus.jsonrpc.api.stockdelivery.addDeliveryItems( {data: order} )
                        .done( function() {
                        } )
                        .fail( function( error ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                };
            },
            recalculateTotalOrderSum: function () {
                var self  = this,
                    wares = unwrap( self.selectedWares ),
                    totalSum;

                totalSum = wares.reduce(function (total, ware) {
                    var priceCost = unwrap(ware.phPriceCost) || 0,
                        wareQuantityOrdered = unwrap(ware.quantityOrdered) || 0;

                    if(!Number.isFinite(priceCost)) {
                        priceCost = parseFloat(priceCost) || 0;
                    }
                    if(!Number.isFinite(wareQuantityOrdered)) {
                        wareQuantityOrdered = parseFloat(wareQuantityOrdered) || 0;
                    }

                    return total + priceCost * wareQuantityOrdered;
                }, 0);

                self.totalOrderSum(Y.doccirrus.schemas.instock.getSwissPriceString( totalSum ));
            }
        } );

        function NewOrderModal() {

        }

        NewOrderModal.prototype.showDialog = function( data, callback ) {

            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/NewOrderModal'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            newOrderModel,
                            bodyContent = Y.Node.create( template ),
                            title = "",
                            footer = [];

                        switch( data.status ) {
                            case statuses.sent:
                                title = i18n( 'InStockMojit.newOrderModal.titles.sentOrder' );
                                break;
                            case statuses.arrived:
                            case statuses.partiallybooked:
                                title = i18n( 'InStockMojit.newOrderModal.titles.arrivedOrder' );
                                break;
                            case statuses.archived:
                                title = i18n( 'InStockMojit.newOrderModal.titles.archivedOrder' );
                                break;

                            default:
                                title = i18n( 'InStockMojit.newOrderModal.titles.createOrder' );

                        }

                        function getGroupedOrder() {
                            return newOrderModel.getGroupedOrder();
                        }

                        function getActivitiesOrOrderToDelete() {
                            return newOrderModel.getActivitiesOrOrderToDelete();
                        }

                        function saveOrder() {
                            var
                                order = getGroupedOrder();

                            if( order && !order.formId ) {
                                Y.doccirrus.DCWindow.notice( {
                                    title: 'Hinweis',
                                    message: i18n( 'InStockMojit.newOrderModal.noDefaultForm' ),
                                    window: {
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true
                                                } )
                                            ]
                                        }
                                    }
                                } );
                            }

                            modal.getButton( 'OK' ).set( 'disabled', true );
                            Y.doccirrus.jsonrpc.api.stockordersrequest.saveOrder( {data: order} ).done( function() {
                                modal.close();
                                callback();
                            } ).fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                modal.getButton( 'OK' ).set( 'disabled', false );
                            } );
                        }

                        function updateOrRemoveOrderWithActivities( activitiesToDelete, order, updateOrRemove ) {
                            var endpoint;
                            endpoint = updateOrRemove === 'remove' ? Y.doccirrus.jsonrpc.api.stockordersrequest.removeOrder : Y.doccirrus.jsonrpc.api.stockordersrequest.updateOrder;
                            activitiesToDelete = activitiesToDelete.filter(function (value, index, array) {
                                return array.indexOf(value) === index;
                            });

                            Promise.resolve( Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( {
                                query: {
                                    ids: activitiesToDelete, transition: 'removeFromOrder'
                                }
                            } ) )
                                .then( function() {
                                    return Promise.resolve( endpoint( {data: order} ) );
                                } )
                                .then( function() {
                                    modal.close();
                                    newOrderModel.destroy();
                                    callback();
                                } )
                                .catch( function( error ) {
                                    if( error.data ) {
                                        error = error.data;
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'error',
                                            message: error,
                                            window: {
                                                width: 'medium',
                                                buttons: {
                                                    footer: [
                                                        Y.doccirrus.DCWindow.getButton( 'CLOSE', {isDefault: false} )
                                                    ]
                                                }
                                            }
                                        } );
                                    }
                                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );


                            activitiesToDelete = [];
                        }

                        function updateOrRemoveOrder( order, updateOrRemove ) {
                            var endpoint;
                            endpoint = updateOrRemove === 'remove' ? Y.doccirrus.jsonrpc.api.stockordersrequest.removeOrder : Y.doccirrus.jsonrpc.api.stockordersrequest.updateOrder;

                            endpoint( {data: order} )
                                .done( function() {
                                    modal.close();
                                    newOrderModel.destroy();
                                    callback();
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                        }

                        function updateOrder() {
                            var
                                activitiesOrOrderToDelete = getActivitiesOrOrderToDelete(),
                                activitiesToDelete = activitiesOrOrderToDelete.activitiesToDelete,
                                orderToDelete =  activitiesOrOrderToDelete.orderToDelete,
                                noOrder = false,
                                order = getGroupedOrder();

                            if( order && order.stocks ) {
                                order.stocks.forEach( function( item ) {
                                    item.quantityDelivered = item.quantity;
                                } );
                                order._id = peek( newOrderModel.orderId );
                            } else {
                                noOrder = true;
                            }

                            modal.getButton( 'OK' ).set( 'disabled', true );

                            // If noOrder && orderToDelete, we know its the last item of an existing order, the whole order will be deleted
                            if( noOrder && orderToDelete ) {
                                Y.doccirrus.DCWindow.confirm( {
                                    message: i18n( 'InStockMojit.newOrderModal.confirmOrderDelete' ),
                                    callback: function( result ) {
                                        if( result.success ) {
                                            if( activitiesToDelete.length ) {
                                                updateOrRemoveOrderWithActivities( activitiesToDelete, orderToDelete, "remove" );
                                            } else {
                                                updateOrRemoveOrder( orderToDelete, "remove" );
                                            }
                                        } else {
                                            modal.close();
                                            newOrderModel.destroy();
                                        }
                                    }}) ;
                            } else {
                                if( activitiesToDelete.length ) {
                                    updateOrRemoveOrderWithActivities(activitiesToDelete, order, "update");
                                } else {
                                    updateOrRemoveOrder(order, "update");
                                }
                            }
                        }

                        newOrderModel = new NewOrderModel( data );

                        if( data.status === statuses.arrived || data.status === statuses.archived || data.status === statuses.partiallybooked ) {
                            footer = [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: closeButtonI18n,
                                    action: function(  ) {
                                        modal.close();
                                    }
                                } )
                            ];
                        } else {
                            footer = [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    label: cancelButtonI18n
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    disabled: true,
                                    label: saveButtonI18n,
                                    action: function() {
                                        switch( newOrderModel.mode ) {
                                            case dialogModes.creating :
                                                saveOrder();
                                                break;
                                            case dialogModes.updating:
                                                updateOrder();
                                                break;
                                            case dialogModes.arriving:
                                                modal.close();
                                                break;
                                            default:
                                                modal.close();
                                        }
                                    }
                                } )
                            ];
                        }

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
                                header: ['close', 'maximize'],
                                footer: footer
                            }
                        } );

                        modal.resizeMaximized.set( 'maximized', true );
                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function() {
                            newOrderModel.destroy();
                        } );

                        ko.applyBindings( newOrderModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).newOrderDialog = new NewOrderModal();

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
            'KoEditableTable',
            'instock-schema',
            'KoBaseContact',
            'KoUI-all',
            'stockorders-schema',
            'v_selectedWares-schema',
            'WareHouseAdvancedFilterViewModel',
            'SupplierSelectViewModel',
            'LocationSelectViewModel',
            'chooseinvoiceform-modal',
            'StockLocationSelectViewModel',
            'SelectedWaresViewModel',
            'dcSplitDeliveryItemDialog'
        ]
    }
);
