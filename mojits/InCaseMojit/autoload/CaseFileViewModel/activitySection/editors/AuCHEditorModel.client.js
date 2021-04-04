/**
 * User: pi
 * Date: 21/01/16  10:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'AuChEditorModel', function( Y ) {
        /**
         * @module AuChEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' );

        /**
         * @class AuChEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function AuChEditorModel( config ) {
            AuChEditorModel.superclass.constructor.call( this, config );
        }

        AuChEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'diagnosesAdd'
                ],
                lazyAdd: false
            }
        };

        Y.extend( AuChEditorModel, ActivityEditorModel, {
                initializer: function AuChEditorModel_initializer() {

                },
                destructor: function AuChEditorModel_destructor() {
                }

            }, {
                NAME: 'AuChEditorModel'
            }
        );

        KoViewModel.registerConstructor( AuChEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dckbvutils',
            'inCaseUtils'
        ]
    }
);
