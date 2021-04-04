/**
 * User: oliversieweke
 * Date: 26.06.18  09:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI  */
'use strict';

YUI.add( 'LinkedTreatmentEditorModel', function( Y ) {
        /**
         * @module LinkedTreatmentEditorModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' );

        /**
         * @class LinkedTreatmentEditorModel
         * @constructor
         * @extend SubEditorModel
         */
        function LinkedTreatmentEditorModel( config ) {
            LinkedTreatmentEditorModel.superclass.constructor.call( this, config );
        }

        LinkedTreatmentEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'activityId',
                    'code',
                    'opsCodes',
                    'quantity',
                    'userContent',
                    'explanations',
                    'catalogRef'
                ],
                lazyAdd: false
            }
        };

        Y.extend( LinkedTreatmentEditorModel, SubEditorModel, {
                initializer: function() {
                    var self = this;
                    self.initLinkedTreatmentEditorModel();
                },
                destructor: function() {},
                initLinkedTreatmentEditorModel: function() {}
            },
            {
                NAME: 'LinkedTreatmentEditorModel'
            }
        );

        KoViewModel.registerConstructor( LinkedTreatmentEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SubEditorModel',
            'v_surgery-schema'
        ]
    }
);
