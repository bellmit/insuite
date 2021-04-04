/**
 * User: dcdev
 * Date: 3/11/21  2:50 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, _*/

'use strict';

YUI.add( 'InStockConfigurationViewModel', function( Y/*, NAME */ ) {

        /**
         * @module InStockConfigurationViewModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
                i18n = Y.doccirrus.i18n;

            function InStockConfigurationViewModel( config ) {
            InStockConfigurationViewModel.superclass.constructor.call( this, config );
        }

        InStockConfigurationViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InStockConfigurationViewModel, KoViewModel.getBase(), {
                templateName: 'InStockConfigurationViewModel',
                initializer: function InStockConfigurationModel_initializer() {
                    var self = this;


                    self.buttonSaveTextI18n = i18n( 'general.button.SAVE' );
                    self.buttonSaveEnabled = ko.observable( true );

                    self.initTemplate();
                },
                addSupplierConfig: function() {
                    var self = this;

                    self.suppliersConfig.push(KoViewModel.createViewModel({
                        NAME: "SupplierConfigModel",
                        config: {}
                    } ) );
                },
                saveConfig: function() {
                    var self = this;
                    self.buttonSaveEnabled( false );
                    Y.doccirrus.jsonrpc.api.instockconfiguration.saveConfig( {
                        data: self.toJSON()
                    } ).done( function( response ) {
                        var
                            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            _.invoke( warnings, 'display' );
                        }
                    } ).fail( function( response ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                        if( errors.length ) {
                            _.invoke( errors, 'display' );
                        }
                    } ).always(function(  ) {
                        self.buttonSaveEnabled( true );
                    });
                },
                destructor: function InStockConfigurationModel_destructor() {
                    
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
                schemaName: 'instockconfiguration',
                NAME: 'InStockConfigurationViewModel',
                ATTRS: {
                    templateName: {
                        valueFn: function() {
                            return this.templateName;
                        }
                    }
                }
            } );

        KoViewModel.registerConstructor( InStockConfigurationViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'dcviewmodel',
            'KoUI-all',
            'instockconfiguration-schema',
            'InStockMojitViewModel',
            'SupplierConfigModel'
        ]
    }
);