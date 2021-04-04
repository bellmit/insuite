/**
 * User: pi
 * Date: 05/08/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'ProcessModel', function( Y ) {
        /**
         * @module ProcessModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class ProcessModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function ProcessModel( config ) {
            ProcessModel.superclass.constructor.call( this, config );
        }

        ProcessModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ProcessModel, FormBasedActivityModel, {

                initializer: function ProcessModel_initializer() {
                    var
                        self = this;
                    self.initProcessModel();
                },
                destructor: function ProcessModel_destructor() {
                },
                initProcessModel: function ProcessModel_initProcessModel() {
                }
            },
            {
                schemaName: 'v_process',
                NAME: 'ProcessModel'
            }
        );
        KoViewModel.registerConstructor( ProcessModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_process-schema'
        ]
    }
);