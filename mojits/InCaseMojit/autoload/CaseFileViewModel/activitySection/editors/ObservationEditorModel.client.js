/**
 * User: pi
 * Date: 18/01/16  12:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'ObservationEditorModel', function( Y ) {
        /**
         * @module ObservationEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class ObservationEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         * @param {Object} config Configuration object
         */
        function ObservationEditorModel( config ) {
            ObservationEditorModel.superclass.constructor.call( this, config );
        }

        ObservationEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'observationTherapyStatus',
                    'observationValuation'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( ObservationEditorModel, SimpleActivityEditorModel, {

                initializer: function ObservationEditorModel_initializer() {
                    var
                        self = this;
                    self.initObservationEditorModel();
                },
                destructor: function ObservationEditorModel_destructor() {
                },
                initObservationEditorModel: function ObservationEditorModel_initObservationEditorModel() {
                    var
                        self = this;
                    self._observationTherapyStatusList = Y.doccirrus.schemas.activity.types.ObservationTherapyStatus_E.list;
                    self._observationValuationList = Y.doccirrus.schemas.activity.types.ObservationValuation_E.list;
                }

            }, {
                NAME: 'ObservationEditorModel'
            }
        );
        KoViewModel.registerConstructor( ObservationEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel'
        ]
    }
);
