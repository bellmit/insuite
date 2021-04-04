/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'LocationSelectViewModel', function( Y ) {
    'use strict';
    /**
     * @module LocationSelectViewModel
     */
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @constructor
     * @class LocationSelectViewModel
     * KoViewModel
     */
    function LocationSelectViewModel( config ) {
        LocationSelectViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( LocationSelectViewModel, KoViewModel.getDisposable(), {
            templateName: 'LocationSelectViewModel',
            /** @protected */
            initializer: function LocationSelectViewModel_initializer( config ) {
                var
                    self = this,
                    data = config.data;

                self.selectedLocation = ko.observable( null );
                self.locationId = ko.observable( "" );
                self.enableSelect2 = ko.observable( true );

                self.applyData( data );
                self.initTemplate();
                self.initSelect2();

            },
            applyData: function LocationSelectViewModel_applyData( data ) {
                var self = this;
                data = data.data || data;

                self.selectedLocation( data.selectedLocation );
                self.locationId( data.selectedLocation && data.selectedLocation.code );
                self.enableSelect2( !data.readOnly );
                if( self.locationId.hasError ) {
                    self.locationId.hasError( !unwrap( self.locationId ) );
                } else {
                    self.locationId.hasError = ko.observable( !unwrap( self.locationId ) );
                }
            },
            initSelect2: function LocationSelectViewModel_initSelect2() {
                var
                    self = this;
                self.select2Location = {
                    val: self.addDisposable( ko.computed( {
                        read: function( value ) {
                            if( !value ) {
                                return unwrap( self.selectedLocation );
                            }

                            return {
                                id: value.code,
                                text: value.name
                            };
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.selectedLocation( {
                                    code: $event.added.id,
                                    name: $event.added.text,
                                    stockLocations: $event.added.stockLocations
                                } );
                                self.locationId( $event.added.id );
                                self.locationId.hasError( false );
                            } else if( $event.removed ) {
                                self.locationId( null );
                                self.selectedLocation( null );
                                self.locationId.hasError( true );
                            }
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        required: true,
                        placeholder: i18n( 'InStockMojit.newOrderModal.location' ),
                        initSelection: function( element, callback ) {
                            self.addDisposable( ko.computed( function() {
                                var location = unwrap( self.selectedLocation );

                                if( !location ) {
                                    return callback( null );
                                }

                                callback( {id: location.code, text: location.name} );
                            } ) );
                        },
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.location.getWithStockLocations().done( function( response ) {
                                    var results;
                                    if( response && response.data && response.data[0] ) {
                                           results = [].concat( response.data );
                                           results = results.map( function( item ) {
                                            return {id: item._id, text: item.locname, stockLocations: item.stockLocations};
                                        } );
                                        query.callback( {results: results} );
                                    } else {
                                        query.callback( {result: []} );
                                    }
                                }
                            );
                        }
                    }
                };
            },

            /** @protected */
            destructor: function LocationSelectViewModel_destructor() {
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
            NAME: 'LocationSelectViewModel',
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
                },

                binder: {
                    valueFn: function() {
                        return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                    }
                }
            }
        }
    );

    KoViewModel.registerConstructor( LocationSelectViewModel );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all'
    ]
} );