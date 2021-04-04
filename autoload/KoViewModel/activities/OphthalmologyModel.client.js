/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'OphthalmologyModel', function( Y/*, NAME */ ) {
        /**
         * @module OphthalmologyModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class OphthalmologyModel
         * @constructor
         * @extends SimpleActivity
         */
        function OphthalmologyModel( config ) {
            OphthalmologyModel.superclass.constructor.call( this, config );
        }

        OphthalmologyModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( OphthalmologyModel, KoViewModel.getConstructor('SimpleActivityModel'), {

                initializer: function() {
                    var
                        self = this;
                    self.initOphthalmologyModel();
                },
                destructor: function() {
                },
                initOphthalmologyModel: function() {
                }
            },
            {
                schemaName: 'v_ophthalmology',
                NAME: 'OphthalmologyModel'
            }
        );
        KoViewModel.registerConstructor( OphthalmologyModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'DeviceReader'
        ]
    }
)
;