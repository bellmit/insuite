/**
 * User: pi
 * Date: 15/12/15  11:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'PKVScheinModel', function( Y ) {
        /**
         * @module PKVScheinModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class PKVScheinModel
         * @constructor
         * @extends ScheinModel
         */
        function PKVScheinModel( config ) {
            PKVScheinModel.superclass.constructor.call( this, config );
        }

        PKVScheinModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PKVScheinModel, KoViewModel.getConstructor( 'ScheinModel' ), {

                initializer: function PKVScheinModel_initializer() {
                    var
                        self = this;
                    self.initPKVScheinModel();
                },
                destructor: function PKVScheinModel_destructor() {
                },
                initPKVScheinModel: function PKVScheinModel_initPKVScheinModel() {
                }
            },
            {
                schemaName: 'v_pkv_schein',
                NAME: 'PKVScheinModel'
            }
        );
        KoViewModel.registerConstructor( PKVScheinModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinModel',
            'v_pkv_schein-schema'
        ]
    }
)
;