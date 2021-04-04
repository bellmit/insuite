/**
 * User: pi
 * Date: 15/02/16  15:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'TeleconsultEditorModel', function( Y ) {
        /**
         * @module TeleconsultEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class TeleconsultEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function TeleconsultEditorModel( config ) {
            TeleconsultEditorModel.superclass.constructor.call( this, config );
        }

        TeleconsultEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [] ),
                lazyAdd: false
            },
            templateName: {
                value: 'SimpleActivity',
                lazyAdd: false
            }
        };

        Y.extend( TeleconsultEditorModel, SimpleActivityEditorModel, {
                initializer: function TeleconsultEditorModel_initializer() {
                    var
                        self = this;
                    self.initTeleconsultEditorModel();

                },
                destructor: function TeleconsultEditorModel_destructor() {
                },
                initTeleconsultEditorModel: function TeleconsultEditorModel_initTeleconsultEditorModel() {
                }
            }, {
                NAME: 'TeleconsultEditorModel'
            }
        );
        KoViewModel.registerConstructor( TeleconsultEditorModel );

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
