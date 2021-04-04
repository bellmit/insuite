/**
 * User: pi
 * Date: 18/12/16  11:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'ObservationModel', function( Y/*, NAME */) {
        /**
         * @module ObservationModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class ObservationModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function ObservationModel( config ) {
            ObservationModel.superclass.constructor.call( this, config );
        }

        ObservationModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ObservationModel, FormBasedActivityModel, {

                initializer: function ObservationModel_initializer() {
                    var
                        self = this;
                    self.initObservationModel();
                },
                destructor: function ObservationModel_destructor() {
                },
                initObservationModel: function ObservationModel_initObservationModel() {
                }
            },
            {
                schemaName: 'v_observation',
                NAME: 'ObservationModel'
            }
        );
        KoViewModel.registerConstructor( ObservationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'FormBasedActivityModel',
            'v_observation-schema'
        ]
    }
)
;