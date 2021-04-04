/**
 * User: do
 * Date: 02/11/17  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

YUI.add( 'EhksNDModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module EhksNDModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class EhksNDModel
         * @constructor
         * @extends EhksBaseModel
         */
        function EhksNDModel( config ) {
            EhksNDModel.superclass.constructor.call( this, config );
        }

        Y.extend( EhksNDModel, KoViewModel.getConstructor( 'EhksBaseModel' ), {
            initializer: function() {
                var
                    self = this;
                self.initEhksNDModel();
            },
            destructor: function() {
            },
            initEhksNDModel: function() {
                // var
                //     self = this;
            }
        }, {
            schemaName: 'v_ehksnd',
            NAME: 'EhksNDModel'
        } );
        KoViewModel.registerConstructor( EhksNDModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'EhksBaseModel',
            'v_ehksnd-schema'
        ]
    }
)
;