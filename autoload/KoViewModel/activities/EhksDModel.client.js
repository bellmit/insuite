/**
 * User: do
 * Date: 02/11/17  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */
YUI.add( 'EhksDModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module EhksDModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            EhksBaseModel = KoViewModel.getConstructor( 'EhksBaseModel' );
        /**
         * @abstract
         * @class EhksDModel
         * @constructor
         * @extends EhksBaseModel
         */
        function EhksDModel( config ) {
            EhksDModel.superclass.constructor.call( this, config );
        }

        Y.extend( EhksDModel, EhksBaseModel, {
            initializer: function() {
                var
                    self = this;
                self.initEhksDModel();
            },
            destructor: function() {
            },
            initEhksDModel: function() {
                // var
                //     self = this;

            }
        }, {
            schemaName: 'v_ehksd',
            NAME: 'EhksDModel'
        } );
        KoViewModel.registerConstructor( EhksDModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'EhksBaseModel',
            'v_ehksd-schema'
        ]
    }
)
;