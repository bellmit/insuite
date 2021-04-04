/**
 * User: oliversieweke
 * Date: 11.04.18  12:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'TiCardReaderModel', function( Y/*, NAME */ ) {
        /**
         * @module TiCardReaderModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class TiCardReaderModel
         * @constructor
         * @extends KoViewModel
         */
        function TiCardReaderModel( config ) {
            TiCardReaderModel.superclass.constructor.call( this, config );
        }

        TiCardReaderModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TiCardReaderModel, KoViewModel.getBase(), {
                initializer: function TiCardReaderModel_initializer() {},
                destructor: function TiCardReaderModel_destructor() {},
            },
            {
                schemaName: 'ticardreader',
                NAME: 'TiCardReaderModel'
            }
        );

        KoViewModel.registerConstructor( TiCardReaderModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ticardreader-schema',
        ]
    }
);
