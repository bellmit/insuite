/**
 * User: oliversieweke
 * Date: 26.06.18  09:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko  */
'use strict';

YUI.add( 'LinkedTreatmentModel', function( Y ) {
        /**
         * @module LinkedTreatmentModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class LinkedTreatmentModel
         * @constructor
         * @extends KoViewModel
         */
        function LinkedTreatmentModel( config ) {
            LinkedTreatmentModel.superclass.constructor.call( this, config );
        }

        LinkedTreatmentModel.ATTRS = {
             validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( LinkedTreatmentModel, KoViewModel.getBase(), {
                initializer: function LinkedTreatmentModel_initializer() {
                    var self = this;
                    self.initLinkedTreatmentModel();
                },
                destructor: function LinkedTreatmentModel_destructor() {
                },
                initLinkedTreatmentModel: function LinkedTreatmentModel_initLinkedTreatmentModel() {
                    var self = this;

                    self.code.readOnly( true );
                    self.opsCodes.readOnly( true );
                    self.quantity.readOnly( !!ko.unwrap(self.activityId) ); // Not editable on existing treatment
                }
            },
            {
                schemaName: 'v_surgery.linkedTreatments',
                NAME: 'LinkedTreatmentModel'
            }
        );

        KoViewModel.registerConstructor( LinkedTreatmentModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_surgery-schema'
        ]
    }
);