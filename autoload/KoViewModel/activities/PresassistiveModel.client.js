/**
 * User: pi
 * Date: 17/02/2016  14:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */
YUI.add( 'PresassistiveModel', function( Y ) {
        'use strict';
        /**
         * @module PresassistiveModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class PresassistiveModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function PresassistiveModel( config ) {
            PresassistiveModel.superclass.constructor.call( this, config );
        }

        PresassistiveModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PresassistiveModel, FormBasedActivityModel, {

                initializer: function PresassistiveModel_initializer() {
                    var
                        self = this;
                    self.initPresassistiveModel();
                },
                destructor: function PresassistiveModel_destructor() {
                },
                initPresassistiveModel: function PresassistiveModel_initPresassistiveModel() {

                }
            },
            {
                schemaName: 'v_presassistive',
                NAME: 'PresassistiveModel'
            }
        );
        KoViewModel.registerConstructor( PresassistiveModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_presassistive-schema'
        ]
    }
);