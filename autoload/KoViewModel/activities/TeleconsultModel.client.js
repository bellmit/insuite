/**
 * User: pi
 * Date: 15/02/16  14:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'TeleconsultModel', function( Y ) {
        /**
         * @module TeleconsultModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' );

        /**
         * @class TeleconsultModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function TeleconsultModel( config ) {
            TeleconsultModel.superclass.constructor.call( this, config );
        }

        TeleconsultModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TeleconsultModel, SimpleActivityModel, {

                initializer: function TeleconsultModel_initializer() {
                },
                destructor: function TeleconsultModel_destructor() {
                }
            },
            {
                schemaName: 'v_teleconsult',
                NAME: 'TeleconsultModel'
            }
        );


        KoViewModel.registerConstructor( TeleconsultModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_teleconsult-schema'
        ]
    }
);