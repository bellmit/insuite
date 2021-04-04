/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'SupplierSelectViewModel', function( Y ) {
    'use strict';
    /**
     * @module SupplierSelectViewModel
     */
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @constructor
     * @class SupplierSelectViewModel
     * KoViewModel
     */
    function SupplierSelectViewModel( config ) {
        SupplierSelectViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( SupplierSelectViewModel, KoViewModel.getDisposable(), {
            templateName: 'SupplierSelectViewModel',
            /** @protected */
            initializer: function SupplierSelectViewModel_initializer( config ) {
                var
                    self = this,
                    data = config.data;
                self.selectedSupplier = ko.observable( null );
                self.supplierId = ko.observable( "" );
                self.enableSelect2 = ko.observable( true );
                self.supplierId.hasError = ko.observable( true );
                self.applyData( data );
                self.initTemplate();
                self.initSelect2();
                if( data.initByFirstElement ) {
                    self.setMainSupplier(data);
                }
            },
            applyData: function( data ) {
                var self = this;
                data = data.data ? data.data : data;
                if( data.initByFirstElement ) {
                    self.setMainSupplier(data);
                }
                self.selectedSupplier( data.selectedSupplier );
                self.supplierId( data.selectedSupplier && data.selectedSupplier.code );
                self.enableSelect2( !data.readOnly );
                self.supplierId.hasError( !unwrap( self.supplierId ) );
            },
            setMainSupplier: function() {
                var self = this;
                self.getSuppliers( "", function( results ) {
                    results = results.results || results;
                    var mainSupplier = results.find( function( element ) {
                        return element.isMainSupplier;
                    } );
                    results = mainSupplier ? [mainSupplier] : results;
                    if( results.length ) {
                        self.applyData(
                            {
                                data: {
                                    selectedSupplier: {
                                        code: results[0].id,
                                        name: results[0].text,
                                        form: results[0].form
                                    },
                                    readOnly: false
                                }
                            } );
                    }

                } );
            },
            initSelect2: function() {
                var
                    self = this;

                self.select2Supplier = {
                    val: self.addDisposable( ko.computed( {
                        read: function( value ) {
                            if( !value ) {
                                return unwrap( self.selectedSupplier );
                            }

                            return {
                                id: value.code,
                                text: value.name
                            };
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.selectedSupplier( {
                                    code: $event.added.id,
                                    name: $event.added.text,
                                    form: $event.added.form
                                } );
                                self.supplierId( $event.added.id );
                                self.supplierId.hasError( false );
                            } else if( $event.removed ) {
                                self.supplierId( null );
                                self.selectedSupplier( null );
                                self.supplierId.hasError( true );
                            }
                        }
                    } ) ),
                    select2: {
                        allowClear: true,
                        required: true,
                        placeholder: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                        initSelection: function( element, callback ) {
                            self.addDisposable( ko.computed( function() {

                                var supplier = unwrap( self.selectedSupplier );

                                if( !supplier ) {
                                    return callback( null );
                                }

                                callback( {id: supplier.code, text: supplier.name} );
                            } ) );
                        },
                        query: function( query ) {
                            self.getSuppliers( query.term, query.callback );
                        }
                    }
                };

            },
            getSuppliers: function( term, callback ) {
                Y.doccirrus.jsonrpc.api.basecontact.searchContact( {
                    query: {
                        status: { $ne: "INACTIVE" },
                        term: term,
                        baseContactType: Y.doccirrus.schemas.basecontact.baseContactTypes.VENDOR
                    }
                } ).done( function( res ) {
                    var
                        results = res.data.map( function( contact ) {
                            return {
                                id: contact._id,
                                text: contact.content || "",
                                form: contact.form || [],
                                isMainSupplier: contact.isMainSupplier || false
                            };
                        } );

                    callback( {results: results} );
                } ).fail( function() {
                    callback( {results: []} );
                } );
            },
            /** @protected */
            destructor: function SupplierSelectViewModel_destructor() {
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
            NAME: 'SupplierSelectViewModel',
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

    KoViewModel.registerConstructor( SupplierSelectViewModel );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all'
    ]
} );