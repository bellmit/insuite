/*jslint anon:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'MasterTabConfigModel', function( Y/*, NAME */ ) {

        /**
         * @module MasterTabConfigModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class MasterTabConfigModel
         * @constructor
         * @extends KoViewModel
         */
        function MasterTabConfigModel( config ) {
            MasterTabConfigModel.superclass.constructor.call( this, config );
        }

        MasterTabConfigModel.ATTRS = {};

        Y.extend( MasterTabConfigModel, KoViewModel.getBase(), {
            initializer: function MasterTabConfigModel_initializer() {
            },
            destructor: function MasterTabConfigModel_destructor() {
            }
        }, {
            schemaName: 'mastertabconfig',
            NAME: 'MasterTabConfigModel'
        } );
        KoViewModel.registerConstructor( MasterTabConfigModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'mastertabconfig-schema'
        ]
    }
);