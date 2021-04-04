/**
 * User: pi
 * Date: 05/08/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'MeasurementModel', function( Y ) {
        /**
         * @module MeasurementModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

            /**
         * @class MeasurementModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function MeasurementModel( config ) {
            MeasurementModel.superclass.constructor.call( this, config );
        }

        MeasurementModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MeasurementModel, FormBasedActivityModel, {

                initializer: function MeasurementModel_initializer() {
                    var
                        self = this;
                    self.initMeasurementModel();
                },
                destructor: function MeasurementModel_destructor() {
                },
                initMeasurementModel: function MeasurementModel_initMeasurementModel() {
                }
            },
            {
                schemaName: 'v_measurement',
                NAME: 'MeasurementModel'
            }
        );
        KoViewModel.registerConstructor( MeasurementModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_measurement-schema'
        ]
    }
);