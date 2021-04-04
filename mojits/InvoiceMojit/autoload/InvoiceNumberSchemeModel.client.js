/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment*/

'use strict';

YUI.add( 'InvoiceNumberSchemeModel', function( Y/*, NAME*/ ) {

        /**
         * @module InvoiceNumberSchemeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        function InvoiceNumberSchemeModel( config ) {
            InvoiceNumberSchemeModel.superclass.constructor.call( this, config );
        }

        InvoiceNumberSchemeModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            usedLocations: {
                value: [],
                lazyAdd: false
            },
            source: {
                value: '',
                lazyAdd: false
            }
        };

        Y.extend( InvoiceNumberSchemeModel, KoViewModel.getBase(), {
                initializer: function InvoiceNumberSchemeModel_initializer() {
                    var
                        self = this,
                        usedLocations = self.get( 'usedLocations' ) || [],
                        source = self.get( 'source' ) || '',
                        isReceiptNumberSchema = self.initialConfig && self.initialConfig.schemaName
                                                && self.initialConfig.schemaName.includes('receiptNumberSchemes')
                                                || 'ReceiptNumberSchema' === source || false;
                    if( isReceiptNumberSchema ) {
                        self.uniqueLocationsList = Y.doccirrus.KoViewModel.utils.createAsync( {
                            initialValue: [],
                            jsonrpc: Y.doccirrus.jsonrpc.api.location.read,
                            converter: function( response ) {
                                function sortLocation( a, b ) {
                                    return a._id > b._id;
                                }

                                var sorted = [].concat( response.data );
                                if( sorted && sorted.length ) {
                                    sorted.sort( sortLocation );

                                    if( 0 > sorted[0].locname.indexOf( 'Standard ( ') ) { // just a hack to avoid multiple 'Standard (' appearing in a locname
                                        sorted[0].locname = 'Standard ( ' + sorted[0].locname + ' )'; // rename default location
                                    }
                                }

                                return sorted.filter( function( location ) {
                                    return 0 > usedLocations.indexOf( location._id );
                                } );
                            }
                        } );
                    }

                    self._year_ph = ko.observable( moment().format( 'YYYY' ) );
                    self.example = ko.computed( function() {
                        var
                            number;

                        if( !self.nextNumber() || !self.digits() ) {
                            return '';
                        }
                        number = self.nextNumber().toString();
                        while( number.length < self.digits() ) {
                            number = '0' + number;
                        }
                        return (self.year() || '') + number;
                    } );

                },
                deleteInvoiceNumberScheme: function( data, item ) {
                    data.invoiceNumberSchemes.remove( function( schema ) {
                        return schema.clientId === item.clientId;
                    } );
                },
                deleteReceiptNumberScheme: function( data, item ) {
                    data.receiptNumberSchemes.remove( function( schema ) {
                        return schema.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.invoiceNumberSchemes',
                NAME: 'InvoiceNumberSchemeModel'
            } );

        KoViewModel.registerConstructor( InvoiceNumberSchemeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema'
        ]
    }
);