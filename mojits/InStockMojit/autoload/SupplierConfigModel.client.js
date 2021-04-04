/**
 * User: dcdev
 * Date: 3/11/21  7:52 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */
'use strict';

YUI.add( 'SupplierConfigModel', function( Y/*, NAME*/ ) {
        /**
         * @module SupplierConfigModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n;

        function SupplierConfigModel( config ) {
            SupplierConfigModel.superclass.constructor.call( this, config );
        }

        SupplierConfigModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SupplierConfigModel, KoViewModel.getBase(), {
                initializer: function SupplierConfigModel_initializer() {
                    var self = this;

                    self._id = ko.observable( new Y.doccirrus.mongo.ObjectId() );
                    self.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );
                    self.passwordInputType = ko.observable( 'password' );

                    self.select2Supplier = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var supplier = ko.unwrap( self.supplier ),
                                    baseContactId = ko.unwrap( self.baseContactId );

                                if( supplier ) {
                                    return {
                                        _id: baseContactId,
                                        text: supplier
                                    };
                                } else {
                                    return '';
                                }
                            },
                            write: function( $event ) {
                                if( !$event.val ) {
                                    self.supplier( undefined );
                                }

                                if( $event.added ) {
                                    self.supplier( $event.added.text );
                                    self.baseContactId( $event.added.id );
                                }
                            }

                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.basecontact.read( {
                                    query: {
                                        institutionName: {$regex: query.term},
                                        baseContactType: 'VENDOR',
                                        sendElectronicOrder: true
                                    }
                                } )
                                    .done( function( response ) {
                                        var results;
                                        if( response && Array.isArray( response.data ) ) {
                                            results = response.data.map( function( item ) {
                                                return {
                                                    id: item._id,
                                                    text: item.institutionName
                                                };
                                            } );
                                            query.callback( {results: results} );
                                        } else {
                                            throw new Error();
                                        }
                                    } )
                                    .fail( function( err ) {
                                        return Y.doccirrus.DCWindow.notice( {
                                            message: Y.doccirrus.errorTable.getMessage( err )
                                        } );
                                    } );
                            }
                        }
                    };
                },
                deleteSupplierConfig: function( data, item ) {
                    data.suppliersConfig.remove( function( supplierConfig ) {
                        return supplierConfig._id() === item._id();
                    } );
                },
                showPassword: function() {
                    var self = this;
                    self.passwordInputType( 'text' );
                },
                hidePassword: function() {
                    var self = this;
                    self.passwordInputType( 'password' );
                }
            },
            {
                schemaName: 'instockconfiguration.suppliersConfig',
                NAME: 'SupplierConfigModel'
            } );

        KoViewModel.registerConstructor( SupplierConfigModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'dcmongo',
            'promise',
            'KoViewModel',
            'instockconfiguration-schema'
        ]
    }
);