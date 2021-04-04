/**
 * User: pi
 * Date: 21/01/16  14:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'ReferralChEditorModel', function( Y ) {
        /**
         * @module ReferralChEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' );

        /**
         * @class ReferralChEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function ReferralChEditorModel( config ) {
            ReferralChEditorModel.superclass.constructor.call( this, config );
        }

        ReferralChEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'diagnosesText'
                ],
                lazyAdd: false
            }
        };

        Y.extend( ReferralChEditorModel, ActivityEditorModel, {
                initializer: function ReferralEditorModel_initializer() {
                },
                destructor: function ReferralEditorModel_destructor() {
                },

                select2Specialities: null
            },
            {
                NAME: 'ReferralChEditorModel'
            }
        );

        KoViewModel.registerConstructor( ReferralChEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dckbvutils',
            'inCaseUtils',
            'dcutils'
        ]
    }
);
