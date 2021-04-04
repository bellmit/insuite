/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _*/
YUI.add( 'SelectedWareHouseItemViewModel', function( Y ) {
        'use strict';
        /**
         * @module SelectedWareHouseItemViewModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SupplierSelectViewModel = KoViewModel.getConstructor( 'SupplierSelectViewModel' ),
            LocationSelectViewModel = KoViewModel.getConstructor( 'LocationSelectViewModel' ),
            StockLocationSelectViewModel = KoViewModel.getConstructor( 'StockLocationSelectViewModel' ),
            unwrap = ko.unwrap;

        /**
         * @constructor
         * @class SelectedWareHouseItemViewModel
         * KoViewModel
         */
        function SelectedWareHouseItemViewModel( config ) {
            SelectedWareHouseItemViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( SelectedWareHouseItemViewModel, KoViewModel.getBase(), {
            templateName: "SelectedWareHouseItemViewModel",
            /** @protected */
            initializer: function SelectedWareHouseItemModel_initializer( config ) {
                var self = this,
                    data,
                    readOnlyFields,
                    location,
                    packSize,
                    quantity;
                self.phUnitTitle = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.phUnit' );
                self.selectedArticle = Y.doccirrus.i18n( 'InStockMojit.title.selectedArticle' );
                self.ingredientsTitle = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' );
                self.phPriceSaleCatalogTitle = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSaleCatalog' );
                self.phPriceCostCatalogTitle = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' );
                self.vatTypeCatalogTitle = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.vatTypeCatalog' );
                self.phPriceSaleLabel = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ) + '<a href="#"><span class="fa fa-info-circle" style="padding: 0 10px 10px 5px;" aria-hidden="true" title="' + Y.doccirrus.i18n( 'InStockMojit.messages.priceCalculation' ) + '"></span></a>';
                self.warehouseInfo = Y.doccirrus.i18n( 'InStockMojit.title.warehouseInfo' );
                self.openOreders = Y.doccirrus.i18n( 'InStockMojit.title.openOreders' );
                self.OP = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.OP' );
                self.TP = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.TP' );
                self.automaticReordering = Y.doccirrus.i18n( 'InStockMojit.instock_schema.InStock_T.automaticReordering' );
                self.overrideWarning = Y.doccirrus.i18n( 'InStockMojit.newOrderModal.overridePriceWarning' );
                self.supplierSelect = new SupplierSelectViewModel( {data: {}} );
                self.locationSelect = new LocationSelectViewModel( {data: {}} );
                self.stockLocationSelect = new StockLocationSelectViewModel( {data: {}} );
                self._vatList = Y.doccirrus.vat.getList();
                data = config.data;
                readOnlyFields = config.readOnlyFields || [];
                self.currentVatType = unwrap(self.vatType) || 0;
                self.currentPhPriceSale = unwrap(self.phPriceSale) || 0;
                self.supplier = ko.observable( null );
                self.location = ko.observable( null );
                self.quantityPart = ko.observable();
                self.isItemFromCatalog = typeof (data.isItemFromCatalog) === "boolean" ? data.isItemFromCatalog : false;
                self.phPriceCostFromInstock = typeof (data.phPriceCostFromInstock) === "boolean" ? data.phPriceCostFromInstock : false;
                self.phPriceSaleFromInstock = typeof (data.phPriceSaleFromInstock) === "boolean" ? data.phPriceSaleFromInstock : false;

                self.selectedStockLocation = ko.observable( null );
                self.selectedLocation = ko.observable( null );
                readOnlyFields.forEach( function( field ) {
                    self[field].readOnly = ko.observable( true );
                    self[field].readOnlyByDefault = true;
                } );

                self.phPriceCostCatalogCurrency = ko.computed( function() {
                    var phPriceCostCatalog = unwrap( self.phPriceCostCatalog );
                    if( phPriceCostCatalog !== 0 && !isNaN( phPriceCostCatalog ) ) {
                        return Number( phPriceCostCatalog ).toFixed( 2 ) + " CHF";
                    }
                } );

                self.vatTypeCatalogPercent = ko.computed( function() {
                    var vatTypeCatalog = unwrap( self.vatTypeCatalog ),
                        vatCatalog;

                    if( !Number.isFinite( vatTypeCatalog ) ) {
                        return '';
                    }
                    vatCatalog = Y.doccirrus.schemas.instock.getVatByVatType( vatTypeCatalog );
                    return Y.doccirrus.vat.getPercent( vatCatalog ) + "%";
                } );

                self.phPriceSaleCatalogCurrency = ko.computed( function() {
                    var phPriceSaleCatalog = unwrap( self.phPriceSaleCatalog );
                    if( phPriceSaleCatalog !== 0 && !isNaN( phPriceSaleCatalog ) ) {
                        return Number( unwrap( self.phPriceSaleCatalog ) ).toFixed( 2 ) + " CHF";
                    }
                } );

                // Price Logic:
                // If there is no Sale Price, but a Cost Price, we calculate the Sale Price according to the formular, if Sale Price from the catalog is unknown
                if( !unwrap( self.phPriceSale ) && unwrap( self.phPriceCost ) && !unwrap( self.phPriceSaleCatalog ) ) {
                    self.phPriceSale( Y.doccirrus.commonutilsCh.calculateHCIPriceSale( unwrap( self.phPriceCost ) ) );
                }

                self.phPriceSale( unwrap( self.phPriceSale ).toFixed( 2 ) );

                self.phPriceCost( parseFloat( unwrap( self.phPriceCost ) ).toFixed( 2 ) );

                self.roundedQuantity = self.addDisposable( ko.computed( {
                    read: function() {
                        if( unwrap( self.quantity ) && typeof unwrap( self.quantity ) === "number" ) {
                            return unwrap( self.quantity ).toFixed( 2 );
                        } else {
                            return parseFloat( unwrap( self.quantity ) ).toFixed( 2 );
                        }
                    },
                    write: function( value ) {
                        self.quantity( parseFloat( value ) );
                    }
                } ) );
                // If Instock phPriceCosts or phPriceSale is changed and prices have been inserted manually before, create a warning
                self.addDisposable(
                    ko.computed( function() {
                        var priceCost = unwrap( self.phPriceCost );
                        var priceCostCatalog = unwrap( self.phPriceCostCatalog );
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        if( self.isItemFromCatalog && self.phPriceCostFromInstock ) {
                            if( priceCost !== priceCostCatalog ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: self.overrideWarning,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_SMALL
                                    }
                                } );
                            }
                        }

                    } ).extend( {rateLimit: {method: "notifyWhenChangesStop", timeout: 1000}} )
                );

                self.addDisposable(
                    ko.computed( function() {
                        var priceSale = unwrap( self.phPriceSale );
                        var priceSaleCatalog = unwrap( self.phPriceSaleCatalog );
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        if( self.isItemFromCatalog && self.phPriceSaleFromInstock ) {
                            if( priceSale !== priceSaleCatalog ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: self.overrideWarning,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_SMALL
                                    }
                                } );
                            }
                        }

                    } ).extend( {rateLimit: {method: "notifyWhenChangesStop", timeout: 1000}} )
                );

                self.phPackSize.hasError = ko.computed( function() {
                    var packSize = Number( unwrap( self.phPackSize ) );
                    if( unwrap( self.isDivisible ) ) {
                        return !Y.Lang.isNumber( packSize ) || packSize === 0;
                    } else {
                        return false;
                    }
                } );
                self.divisibleCount.hasError = ko.computed( function() {
                    var divisibleCount = Number( unwrap( self.divisibleCount ) );
                    if( unwrap( self.isDivisible ) ) {
                        return !Y.Lang.isNumber( divisibleCount ) || divisibleCount === 0;
                    } else {
                        return false;
                    }
                } );

                self.phUnit.hasError = ko.computed( function() {
                    var phUnit = unwrap( self.phUnit );
                    if( unwrap( self.isDivisible ) ) {
                        return !phUnit;
                    } else {
                        return false;
                    }
                } );

                self.prdNo.hasError = ko.computed( function() {
                    var prdNo = unwrap( self.prdNo );
                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                        return !prdNo;
                    } else {
                        return false;
                    }
                } );

                self.quantityPart.readOnly = ko.computed( function() {
                    if( self.initialConfig && self.initialConfig.readOnlyFields && 1 < self.initialConfig.readOnlyFields.length ) {
                        return true;
                    }
                    return !unwrap( self.isDivisible );
                } );

                self.quantity.readOnly = ko.computed( function() {
                    if( self.initialConfig && self.initialConfig.readOnlyFields && 1 < self.initialConfig.readOnlyFields.length ) {
                        return true;
                    }
                    return unwrap( self.isDivisible );
                } );

                self.isValid = ko.computed( function() {
                    var
                        hasPackSizeError = unwrap( self.phPackSize.hasError ),
                        divisibleCountError = unwrap( self.divisibleCount.hasError ),
                        phUnitError = unwrap( self.phUnit.hasError );
                    return self._isValid() && !hasPackSizeError && !divisibleCountError && !phUnitError;
                } );

                var vatType = unwrap( self.vatType );

                self.vat( Y.doccirrus.schemas.instock.getVatByVatType( vatType ) );

                self.addDisposable( ko.computed( function() {
                    var vat = unwrap( self.vat );
                    switch( vat ) {
                        case 1001:
                            self.vatType( 1 );
                            break;
                        case 1002:
                            self.vatType( 2 );
                            break;
                        case 1003:
                            self.vatType( 3 );
                            break;
                        default:
                            self.vatType( 1 );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var isDivisible = unwrap( self.isDivisible );
                    self.divisibleCount.readOnly( self.divisibleCount.readOnlyByDefault ? true : !isDivisible );
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        isDivisible = unwrap( self.isDivisible ),
                        packSize = parseFloat( unwrap( self.phPackSize ) ),
                        quantity = parseFloat( unwrap( self.quantityPart ) );

                    if( !isNaN( packSize ) && !isNaN( quantity ) && isDivisible ) {
                        self.quantity( (quantity / packSize).toFixed( 2 ) );
                    }
                } ) );
                self.addDisposable( ko.computed( function() {
                    var
                        isDivisible = unwrap( self.isDivisible ),
                        packSize = parseFloat( unwrap( self.phPackSize ) ),
                        quantity = parseFloat( unwrap( self.quantity ) );

                    if( !isNaN( packSize ) && !isNaN( quantity ) && !isDivisible ) {
                        self.quantityPart( (packSize * quantity).toFixed( 2 ) );
                    }
                } ) );

                packSize = parseFloat( unwrap( self.phPackSize ) );
                quantity = parseFloat( unwrap( self.quantity ) );

                if( !isNaN( packSize ) && !isNaN( quantity ) ) {
                    self.quantityPart( (packSize * quantity).toFixed( 2 ) );
                }

                /*Init supplier select*/
                var supplier = ko.unwrap( data.supplier );
                if( data && supplier ) {
                    self.supplierSelect.applyData( {
                        data: {
                            selectedSupplier: {
                                code: data.supplier._id,
                                name: data.supplier.content
                            },
                            readOnly: readOnlyFields.indexOf( 'supplier' ) !== -1
                        }
                    } );
                } else {
                    self.supplierSelect.applyData( {
                        data: {
                            selectedSupplier: null,
                            initByFirstElement: true
                        }
                    } );
                }
                /*Init location and stockLocations select*/
                if( data && ko.unwrap( data.location ) ) {
                    if( data.location && data.location.stockLocations && data.location.stockLocations.length
                        && typeof data.location.stockLocations[0] === 'string' ) {
                        Y.doccirrus.jsonrpc.api.location.getWithStockLocations( {
                            query: {
                                _id: data.location._id
                            }
                        } ).done( function( response ) {
                            var result = response.data || [],
                                item = result[0];

                            if( item ) {
                                location = {
                                    code: item._id,
                                    name: item.locname,
                                    stockLocations: item.stockLocations
                                };
                                self.initLocation(location, readOnlyFields, data.stockLocationId);
                            }
                        } );
                    } else {
                        location = {
                            code: data.location._id,
                            name: data.location.locname,
                            stockLocations: (data.location || {}).stockLocations
                        };
                        self.initLocation(location, readOnlyFields, data.stockLocationId);
                    }
                } else {
                    self.location.hasError = ko.observable( true );
                }

                self.firstLoad = true;
                self.addDisposable( ko.computed( function() {
                    var
                        minimumQuantity = parseFloat( unwrap( self.minimumQuantity ) );
                    if( !self.firstLoad ) {
                        if( !isNaN( minimumQuantity ) && minimumQuantity > 0 ) {
                            self.automaticReorder( true );
                        } else if( !isNaN( minimumQuantity ) && minimumQuantity === 0 ) {
                            self.automaticReorder( false );
                        } else {
                            self.automaticReorder( false );
                        }
                    } else {
                        self.firstLoad = false;
                    }
                } ) );

                self.initSubscribe();
                self.initTemplate();
                self.InitPhUnitSelect();
                self.InitSelect2Ingredients();
            },
            initLocation: function ( location, readOnlyFields, stockLocationId ) {
                var self = this,
                    stockLocation;

                self.locationSelect.applyData( {
                    data: {
                        selectedLocation: location,
                        readOnly: readOnlyFields.indexOf( 'locationId' ) !== -1
                    }
                } );

                self.selectedLocation( location );

                stockLocation = _.find( location.stockLocations, {_id: stockLocationId} ) || {};

                self.selectedStockLocation( {
                    code: stockLocation._id,
                    name: stockLocation.title
                } );

                self.stockLocationSelect.applyLocationList( unwrap( self.selectedLocation ).stockLocations );

                self.stockLocationSelect.applyData( {
                    data: {
                        selectedStockLocation: unwrap( self.selectedStockLocation ),
                        readOnly: readOnlyFields.indexOf( 'locationId' ) !== -1
                    }
                } );
            },
            initSubscribe: function() {
                var
                    self = this;

                self.supplierSelect.supplierId.subscribe( function( supplierId ) {
                    self.supplierId( supplierId );
                } );

                self.locationSelect.locationId.subscribe( function( locationId ) {
                    self.locationId( locationId );
                } );

                self.vatType.subscribe( function( newValue ) {
                    self.phPriceSale( Y.doccirrus.commonutilsCh.calculateMedicationPriceWithVat( {
                        vatTypeCatalog: unwrap( self.vatTypeCatalog ),
                        phPriceSaleCatalog: unwrap( self.phPriceSaleCatalog ),
                        currentVatType: self.currentVatType,
                        phPriceSale: self.currentPhPriceSale,
                        vatType: newValue
                    } ) );
                });

                self.locationSelect.selectedLocation.subscribe( function( selectedLocation ) {
                    var stockLocations = (selectedLocation || {}).stockLocations;
                    self.selectedLocation( selectedLocation );
                    self.stockLocationSelect.applyLocationList( stockLocations );
                } );

                // Price Logic:
                // If user inserts Price Cost, we calculate the Sale Price according, if SalePriceCatalog is unknown
                // If user inserts Price Cost and SalePriceCatalog is known, user just inserts new value = no calculation
                self.phPriceCost.subscribe( function( newValue ) {
                    if( !unwrap( self.phPriceSaleCatalog ) ) {
                        self.phPriceSale( Y.doccirrus.commonutilsCh.calculateHCIPriceSale( newValue ) );
                    }
                    self.phPriceCost( parseFloat( newValue ).toFixed( 2 ) );
                } );

                self.phPriceSale.subscribe( function( newValue ) {
                    self.phPriceSale( parseFloat( newValue ).toFixed( 2 ) );
                } );

                self.stockLocationSelect.stockLocationId.subscribe( function( stockLocationId ) {
                    self.stockLocationId( stockLocationId );
                } );

                self.stockLocationSelect.stockLocationId.subscribe( function( stockLocationId ) {
                    self.stockLocationId( stockLocationId );
                } );

            },
            InitPhUnitSelect: function() {
                var self = this;
                var phUnitsList = Y.doccirrus.schemas.instock.types.phUnit_E.list.map( function( unit ) {
                    return {
                        id: unit.val,
                        text: unit.i18n
                    };
                } );

                if( unwrap( self.phUnit ) === null ) {
                    self.phUnit( "" );
                }

                self.select2phUnit = {
                    val: self.addDisposable( ko.computed( {
                        read: function( value ) {
                            if( !value ) {
                                return unwrap( self.phUnit );
                            }

                            return {
                                text: value
                            };
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.phUnit( $event.added.id );
                            } else if( $event.removed ) {
                                self.phUnit( "" );
                            }
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        required: true,
                        placeholder: self.phUnitTitle,
                        data: function() {
                            return {results: phUnitsList};
                        }
                    }
                };
            },
            InitSelect2Ingredients: function() {
                var self = this;
                var ingredients = (unwrap( self.ingredients ) || []).map( function( ingredient ) {
                    return {
                        id: ingredient,
                        text: ingredient
                    };
                } );
                self.select2Ingredients = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            return ingredients;
                        },
                        write: function() {
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        multiple: true,
                        placeholder: self.ingredientsTitle,
                        minimumResultsForSearch: -1,
                        query: function( options ) {
                            return options.callback( {results: ingredients} );
                        }
                    }
                };
            },
            saveItem: function() {
                var
                    self = this;

                return Y.doccirrus.jsonrpc.api.instockrequest.insertWares( {data: self.toJSON()} );
            },

            /** @protected */
            destructor: function SelectedWareHouseItemViewModel_destructor() {

            },

            template: null,

            /** @protected */
            initTemplate: function() {
                var
                    self = this;

                self.template = {
                    name: self.get( 'templateName' ),
                    data: self
                };
            }

        }, {
            schemaName: 'instock',
            NAME: 'SelectedWareHouseItemViewModel',
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                /**
                 * Defines template name to look up
                 * @attribute templateName
                 * @type {String}
                 * @default prototype.templateName
                 */
                templateName: {
                    valueFn: function() {
                        return this.templateName;
                    }
                }

            }
        } );

        KoViewModel.registerConstructor( SelectedWareHouseItemViewModel );
    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'instock-schema',
            'dcvat',
            'SupplierSelectViewModel',
            'LocationSelectViewModel',
            'StockLocationSelectViewModel'
        ]
    } );