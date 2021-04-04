/**
 * User: pi
 * Date: 03/12/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'SimpleActivityModel', function( Y ) {
        /**
         * @module SimpleActivityModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class SimpleActivityModel
         * @constructor
         * @extends ActivityModel
         */
        function SimpleActivityModel( config ) {
            SimpleActivityModel.superclass.constructor.call( this, config );
        }

        SimpleActivityModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SimpleActivityModel, KoViewModel.getConstructor( 'ActivityModel' ), {

                initializer: function SimpleActivityModel_initializer() {
                    var
                        self = this;
                    self.initSimpleActivityModel();
                },
                destructor: function SimpleActivityModel_destructor() {
                },
                initSimpleActivityModel: function SimpleActivityModel_initSimpleActivityModel() {
                }
            },
            {
                schemaName: 'v_simple_activity',
                NAME: 'SimpleActivityModel'
            }
        );
        KoViewModel.registerConstructor( SimpleActivityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityModel',
            'v_simple_activity-schema'
        ]
    }
)
;