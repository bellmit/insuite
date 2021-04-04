/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'MeasurementEditorModel', function( Y ) {
        /**
         * @module MeasurementEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class MeasurementEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function MeasurementEditorModel( config ) {
            MeasurementEditorModel.superclass.constructor.call( this, config );
        }

        MeasurementEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( ['vendorId', 'specialDOQUVIDE'] ),
                lazyAdd: false
            }
        };

        Y.extend( MeasurementEditorModel, SimpleActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function MeasurementEditorModel_initializer() {
                    var
                        self = this;
                    self.initMeasurementEditorModel();

                },
                destructor: function MeasurementEditorModel_destructor() {
                },
                initMeasurementEditorModel: function MeasurementEditorModel_initMeasurementEditorModel() {

                }
            }, {
                NAME: 'MeasurementEditorModel'
            }
        );
        KoViewModel.registerConstructor( MeasurementEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel'
        ]
    }
)
;
