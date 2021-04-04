/**
 * User: do
 * Date: 28.11.19  11:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

YUI.add( 'MedicationPriceComparisonModel', function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        peek = Y.doccirrus.commonutils.peek;

    // TODO: avwg utils? same medication-search
    function sortPrice( a, b ) {
        return Y.doccirrus.comctl.dcSubtraction( a.phPriceSale, b.phPriceSale );
    }

    function MedicationPriceComparisonModel( config ) {
        MedicationPriceComparisonModel.superclass.constructor.call( this, config );
    }

    MedicationPriceComparisonModel.ATTRS = {
        validatable: {
            value: false,
            lazyAdd: false
        }
    };

    Y.extend( MedicationPriceComparisonModel, KoViewModel.getBase(), {

            initializer: function( config ) {
                var
                    self = this;

                self.priceComparisonKindI18n = i18n( 'InCaseMojit.medication_modal.checkbox.PRICE_COMPARISON_KIND' );
                self.priceComparisonDiscountI18n = i18n( 'InCaseMojit.medication_modal.checkbox.PRICE_COMPARISON_DISCOUNT' );

                self.priceComparisonKind = ko.observable( true );
                self.priceComparisonDiscount = ko.observable( config.priceComparisonDiscount || false );

                self.table = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'CaseFileMojit-DCMedicationSearchModel-priceComparisonKoTable',
                        states: ['limit'],
                        fillRowsToLimit: false,
                        height: 180,
                        columns: [
                            Y.doccirrus.medicationTableCols.get( 'discountOrAlternative', {
                                preRenderer: function( meta, renderer ) {
                                    return renderer( meta, {_defaultMappings: config._defaultMappings} );
                                }
                            } ),
                            {
                                forPropertyName: 'title',
                                label: 'Packungen',
                                width: '30%'
                            },
                            Y.doccirrus.medicationTableCols.get( 'phPatPay', {
                                preRenderer: function( meta, renderer ) {
                                    var context = config.getContext();
                                    return renderer( meta, {selected: context.getSelected(), patient: context.patient} );
                                }
                            } ),
                            Y.doccirrus.medicationTableCols.get( 'phPriceSale' ),
                            Y.doccirrus.medicationTableCols.get( 'phFixedPay' ),
                            Y.doccirrus.medicationTableCols.get( 'fbDiff' ),
                            {
                                forPropertyName: 'phCompany',
                                label: 'Hersteller',
                                width: '25%'
                            },
                            Y.doccirrus.medicationTableCols.get( 'phIngr' ),
                            Y.doccirrus.medicationTableCols.get( 'phIngrOther' ),
                            Y.doccirrus.medicationTableCols.get( 'phForm' ),
                            Y.doccirrus.medicationTableCols.get( 'phSalesStatus' ),
                            Y.doccirrus.medicationTableCols.get( 'phNormSize' )
                        ],
                        onRowClick: function( meta ) {
                            if( typeof config.onRowClick === 'function' ) {
                                config.onRowClick.call( this, meta );

                            }
                        }
                    }
                } );

                ko.computed( function() {
                    self.priceComparisonKind();
                    self.priceComparisonDiscount();
                    self.setPackage( {selectedPackage: self.selectedPackage, insuranceIknr: self.insuranceIknr} );
                } );

            },

            setPackage: function setPackage( args ) {
                var self = this,
                    query = {},
                    selectedPackage = args.selectedPackage,
                    priceComparisonKind = peek( self.priceComparisonKind ),
                    priceComparisonDiscount = peek( self.priceComparisonDiscount );

                self.selectedPackage = selectedPackage;
                self.table.data( [] );

                if( !selectedPackage || (priceComparisonKind && !selectedPackage.phPriceCompGroup2) || (!priceComparisonKind && !selectedPackage.phPZN) ) {
                    return;
                }

                self.table.masked( true );
                if( priceComparisonKind ) {
                    query.priceComparisonGroupId = selectedPackage.phPriceCompGroup2;
                } else {
                    query.priceComparisonPzn = selectedPackage.phPZN;
                }

                if( priceComparisonDiscount ) {
                    query.insuranceDiscountFilter = 1;
                }

                query.insuranceIknr = args.insuranceIknr;
                self.insuranceIknr = args.insuranceIknr;
                query.simple = true;
                query.refinePlainPackage = true;
                Y.doccirrus.jsonrpc.api.mmi.getPackagesDetails( {
                    query: query
                } ).done( function( response ) {
                    if( response && response.data && self.table.data ) {
                        response.data.sort( sortPrice );
                        self.table.data( response.data );
                        self.table.masked( false );
                    }
                } );

            },

            destructor: function() {
            }
        },
        {
            NAME: 'MedicationPriceComparisonModel'
        }
    );
    KoViewModel.registerConstructor( MedicationPriceComparisonModel );
}, '0.0.1', {
    requires: [
        'oop',
        'KoUI-all',
        'DCWindow',
        'promise'
    ]
} );