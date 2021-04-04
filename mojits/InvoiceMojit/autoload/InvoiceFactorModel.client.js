/*jslint anon:true, nomen:true*/
/*global YUI, moment*/

'use strict';

YUI.add( 'InvoiceFactorModel', function( Y/*, NAME*/ ) {

        /**
         * @module InvoiceFactorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        function InvoiceFactorModel( config ) {
            InvoiceFactorModel.superclass.constructor.call( this, config );
        }

        InvoiceFactorModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InvoiceFactorModel, KoViewModel.getBase(), {
                initializer: function InvoiceFactorModel_initializer() {
                    var
                        self = this;

                    if( !self.year() ) {
                        self.year( moment().format( 'YYYY' ) );
                    }

                    if( !self.quarter() ) {
                        self.quarter( moment().quarter().toString() );
                    }

                    if( !self.isDefault() ) {
                        self.isDefault( false );
                    }
                }
            },
            {
                schemaName: 'invoiceconfiguration.invoicefactors',
                NAME: 'InvoiceFactorModel'
            } );

        KoViewModel.registerConstructor( InvoiceFactorModel );

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