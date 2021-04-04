/**
 * User: maximilian.kramp
 * Date: 30.09.19  09:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'TiSMCBModel', function( Y/*, NAME */ ) {
        /**
         * @module TiSMCBModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class TiSMCBModel
         * @constructor
         * @extends KoViewModel
         */
        function TiSMCBModel( config ) {
            TiSMCBModel.superclass.constructor.call( this, config );
        }

        TiSMCBModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TiSMCBModel, KoViewModel.getBase(), {
                initializer: function TiSMCBModel_initializer() {},
                destructor: function TiSMCBModel_destructor() {}
            },
            {
                schemaName: 'tismcb',
                NAME: 'TiSMCBModel'
            }
        );

        KoViewModel.registerConstructor( TiSMCBModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'tismcb-schema'
        ]
    }
);
