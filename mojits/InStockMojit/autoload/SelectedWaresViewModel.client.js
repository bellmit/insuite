/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'SelectedWaresViewModel', function( Y ) {
        'use strict';
        /**
         * @module SelectedWaresViewModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap;

        /**
         * SelectedWaresViewModel for KoEditableTable
         * @param config
         * @constructor
         */
        function SelectedWaresViewModel( config ) {
            SelectedWaresViewModel.superclass.constructor.call( this, config );
        }

        SelectedWaresViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectedWaresViewModel, KoViewModel.getBase(), {
                initializer: function( config ) {
                    var
                        self = this,
                        mode = config.mode;

                    self.phPZN.readOnly = true;
                    self.description.readOnly = true;
                    self.phPriceSale.readOnly = true;
                    self.phPriceCost.readOnly = true;
                    self.phPriceSaleCatalog.readOnly = true;
                    self.phPriceCostCatalog.readOnly = true;
                    self.quantity.readOnly = true;
                    self.minimumQuantity.readOnly = true;
                    self.editorId.readOnly = true;
                    self.editor.readOnly = true;
                    self.isProcessed.readOnly = true;
                    self.phIngr.readOnly = true;
                    self.gtinCode.readOnly = true;
                    self.nota.readOnly = true;
                    self.itemExistsInWareHouse = {};
                    self.patients.readOnly = true;
                    self.dispensedQuantity.readOnly = true;
                    self.bookedQuantity.readOnly = true;
                    self.isDivisible.readOnly = true;
                    self.dividedQuantity.readOnly = true;

                    if( unwrap( self.isProcessed ) ) {
                        self.quantityDelivered.readOnly = true;
                        self.stockLocation.readOnly = true;
                        self.checked.disabled = true;
                    }

                    self.stockLocation.hasError = ko.computed( {
                        write: function() {
                        },
                        read: function() {
                            return !(unwrap( self.stockLocation ) || {})._id;
                        }
                    } );

                    self._isValid = ko.computed( function() {
                        return !unwrap( self.stockLocation.hasError ) && !unwrap( self.quantityDelivered.hasError ) &&
                               !unwrap( self.quantity.hasError ) && !unwrap( self.quantityOrdered.hasError );
                    } );

                    if( mode && mode.name === 'arriving' ) {
                        self.quantityOrdered.readOnly = true;
                        self.phPriceCost.readOnly = false;
                        self.phPriceSale.readOnly = false;
                        self.overrideWarning = i18n( 'InStockMojit.newOrderModal.overridePriceWarning' );

                        // Price Logic:
                        // If there is no Sale Price, but a Cost Price, we calculate the Sale Price according to the formular, if Sale Price from the catalog is unknown
                        if( unwrap( self.phPriceCost ) && !unwrap( self.phPriceSale ) && !unwrap( self.phPriceSaleCatalog ) ) {
                            self.phPriceSale( Y.doccirrus.commonutilsCh.calculateHCIPriceSale( unwrap( self.phPriceCost ) ) );
                        }

                        // If User inserts a cost Price - we calculate the sales price - if there is no SalePriceCatalog
                        self.phPriceCost.subscribe( function( newValue ) {
                            if( !unwrap( self.phPriceSaleCatalog ) ) {
                                self.phPriceSale( Y.doccirrus.commonutilsCh.calculateHCIPriceSale( newValue ) );
                            }
                            self.phPriceCost( parseFloat( newValue ).toFixed( 2 ) );
                        } );
                    }
                    if( ['creating', 'updating'].includes( mode && mode.name ) ) {
                        self.quantityOrdered.subscribe(function( newValue ) {
                            if(unwrap(self.isDivisible)) {
                                self.dividedQuantity( newValue * unwrap( self.phPackSize ) );
                            }
                        });
                    }
                },
                setDefaultValues: function( data ) {
                    this.set( 'data', data );
                },

                destructor: function() {
                }
            },
            {
                schemaName: 'v_selectedWares',
                NAME: 'SelectedWaresViewModel'
            }
        );
        KoViewModel.registerConstructor( SelectedWaresViewModel );
    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'dccommonutils-ch'
        ]
    } );
