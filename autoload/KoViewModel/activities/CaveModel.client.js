/**
 * User: pi
 * Date: 05/08/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'CaveModel', function( Y ) {
        /**
         * @module CaveModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class CaveModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function CaveModel( config ) {
            CaveModel.superclass.constructor.call( this, config );
        }

        CaveModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CaveModel, KoViewModel.getConstructor( 'SimpleActivityModel' ), {

                initializer: function CaveModel_initializer() {
                    var
                        self = this;
                    self.initCaveModel();
                },
                destructor: function CaveModel_destructor() {
                },
                initCaveModel: function CaveModel_initCaveModel() {
                }
            },
            {
                schemaName: 'v_cave',
                NAME: 'CaveModel'
            }
        );
        KoViewModel.registerConstructor( CaveModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_cave-schema'
        ]
    }
);