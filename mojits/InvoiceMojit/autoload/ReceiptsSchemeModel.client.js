/*global YUI, ko, moment*/

'use strict';

YUI.add( 'ReceiptsSchemeModel', function( Y/*, NAME*/ ) {

        /**
         * @module ReceiptsSchemeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        function ReceiptsSchemeModel( config ) {
            ReceiptsSchemeModel.superclass.constructor.call( this, config );
        }

        ReceiptsSchemeModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ReceiptsSchemeModel, KoViewModel.getBase(), {
                initializer: function ReceiptsSchemeModel_initializer() {
                    var self = this;

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
                deleteReceiptsScheme: function( data, item ) {
                    data.receiptsSchemes.remove( function( schema ) {
                        return schema.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.receiptsSchemes',
                NAME: 'ReceiptsSchemeModel'
            } );

        KoViewModel.registerConstructor( ReceiptsSchemeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema',
            'dc-comctl'
        ]
    }
);