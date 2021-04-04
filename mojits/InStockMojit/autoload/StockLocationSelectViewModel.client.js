/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'StockLocationSelectViewModel', function( Y ) {
    'use strict';
    /**
     * @module StockLocationSelectViewModel
     */
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @constructor
     * @class StockLocationSelectViewModel
     * KoViewModel
     */
    function StockLocationSelectViewModel( config ) {
        StockLocationSelectViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( StockLocationSelectViewModel, KoViewModel.getDisposable(), {
            templateName: 'StockLocationSelectViewModel',
            select2StockLocation: null,
            /** @protected */
            initializer: function StockLocationSelectViewModel_initializer( config ) {
                var
                    self = this,
                    data = config.data;

                self.selectedStockLocation = ko.observable( null );
                self.stockLocationId = ko.observable( "" );
                self.enableSelect2 = ko.observable( !data.readOnly );
                self.stockLocations  = ko.observableArray(data.stockLocations || []);
                self.allowEmpty = data.allowEmpty;
                self.applyData( data );
                self.initSelect2();
                self.initTemplate();

            },
            applyData: function StockLocationSelectViewModel_applyDta( data ) {
                var self = this;
                data = data.data || data;
                self.selectedStockLocation( data.selectedStockLocation );
                self.stockLocationId( data.selectedStockLocation && data.selectedStockLocation.code || "");
                self.enableSelect2( !data.readOnly );

                if( self.stockLocationId.hasError ) {
                    self.stockLocationId.hasError( !unwrap( self.stockLocationId ) );
                } else {
                    self.stockLocationId.hasError = ko.observable( !unwrap( self.stockLocationId ) );
                }

                if (self.allowEmpty) {
                    self.stockLocationId.hasError = ko.observable(false);
                }
            },
            applyLocationList: function StockLocationSelectViewModel_applyLocationList( stockLocations  ) {
               var
                   self = this;
               self.stockLocations( stockLocations);

               if (!stockLocations || !stockLocations.length) {
                   self.selectedStockLocation(null);
                   self.stockLocationId("");

                   if (!self.allowEmpty) {
                       self.stockLocationId.hasError( true );
                   }
               }
            },
            initSelect2: function StockLocationSelectViewModel_initSelect2() {
                var
                    self = this;
                self.select2StockLocation = {
                    val: self.addDisposable( ko.computed( {
                        read: function( value ) {
                            if( !value ) {
                                return unwrap( self.selectedStockLocation );
                            }

                            return {
                                id: value.code,
                                text: value.name
                            };
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.selectedStockLocation( {
                                    code: $event.added.id,
                                    name: $event.added.text
                                } );
                                self.stockLocationId( $event.added.id );
                                self.stockLocationId.hasError( false );
                            } else if( $event.removed ) {
                                self.stockLocationId( null );
                                self.selectedStockLocation( null );

                                if (!self.allowEmpty) {
                                    self.stockLocationId.hasError( true );
                                }
                            }
                        }
                    } ) ),
                    select2: {
                        allowClear: self.allowEmpty,
                        required: self.allowEmpty,
                        placeholder: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                        initSelection: function( element, callback ) {
                            self.addDisposable( ko.computed( function() {
                                var location = unwrap( self.selectedStockLocation );

                                if( !location ) {
                                    return callback( null );
                                }

                                callback( {id: location.code, text: location.name} );
                            } ) );
                        },
                        query: function( query ) {
                            var
                                stockLocations = unwrap(self.stockLocations),
                                result = (stockLocations || []).map( function( sLocation ) {
                                    return {
                                        id: sLocation._id,
                                        text: sLocation.title
                                    };
                                } );

                            query.callback( {results: result} );
                        }
                    }
                };
            },

            /** @protected */
            destructor: function StockLocationSelectViewModel_destructor() {
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
        },
        {
            NAME: 'StockLocationSelectViewModel',
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
        }
    );

    KoViewModel.registerConstructor( StockLocationSelectViewModel );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all'
    ]
} );