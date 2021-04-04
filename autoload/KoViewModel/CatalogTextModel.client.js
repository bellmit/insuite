/**
 * User: pi
 * Date: 22/03/17  16:05
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'CatalogTextModel', function( Y/*, NAME */ ) {
        /**
         * @module CatalogTextModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable;

        /**
         * @class CatalogTextItemModel
         * @constructor
         * @extends KoViewModel
         */
        function CatalogTextItemModel( config ) {
            CatalogTextItemModel.superclass.constructor.call( this, config );
        }

        CatalogTextItemModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( CatalogTextItemModel, KoViewModel.getBase(), {
            initializer: function CatalogTextItemModel_initializer() {
                var self = this;
                self.initCatalogText();
            },
            destructor: function CatalogTextItemModel_destructor() {
            },
            /**
             * initializes event model
             */
            initCatalogText: function CatalogTextItemModel_initCatalogText() {
            }
        }, {
            schemaName: 'v_catalogTextItem',
            NAME: 'CatalogTextItemModel',
            overrideSchemaName: true
        } );
        KoViewModel.registerConstructor( CatalogTextItemModel );

        /**
         * @class CatalogTextModel
         * @constructor
         * @extends KoViewModel
         */
        function CatalogTextModel( config ) {
            CatalogTextModel.superclass.constructor.call( this, config );
        }

        CatalogTextModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            currentUserContent: {
                value: null,
                lazyAdd: false
            }
        };
        Y.extend( CatalogTextModel, KoViewModel.getBase(), {
            initializer: function CatalogTextModel_initializer() {
                var self = this;
                self.initCatalogText();
            },
            destructor: function CatalogTextModel_destructor() {
            },
            /**
             * initializes event model
             */
            initCatalogText: function CatalogTextModel_initCatalogText() {
                var
                    self = this;
                self.initItems();
            },
            initItems: function() {
                var
                    self = this,
                    currentUserContent = self.get( 'currentUserContent' ),
                    items = peek( self.items ),
                    currentItemsSize = items.length,
                    i,
                    j = 1;
                items.forEach( function( item ) {
                    if( currentUserContent && currentUserContent === peek( item.text ) ) {
                        item.usedInUserContent( true );
                    }
                    item.title( j++ );
                } );
                for( i = currentItemsSize + 1; 10 >= i; i++ ) {
                    self.addItem( {
                        title: i
                    } );
                }
            },
            addItem: function( data ) {
                var
                    self = this;
                self.items.push( data );
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             */
            getTypeName: function() {
                var result = CatalogTextModel.superclass.getTypeName.apply( this, arguments );
                switch( result ) {
                    case 'Item_baseModel':
                        result = 'CatalogTextItemModel';
                        break;
                }
                return result;
            }
        }, {
            schemaName: 'catalogtext',
            NAME: 'CatalogTextModel'
        } );
        KoViewModel.registerConstructor( CatalogTextModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_catalogTextItem-schema',
            'catalogtext-schema'
        ]
    }
);