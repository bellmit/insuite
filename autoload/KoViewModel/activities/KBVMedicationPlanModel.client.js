/**
 * User: pi
 * Date: 15/01/16  13:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'KBVMedicationPlanModel', function( Y/*, NAME */ ) {
        /**
         * @module KBVMedicationPlanModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' );

        /**
         * @class KBVMedicationPlanModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function KBVMedicationPlanModel( config ) {
            KBVMedicationPlanModel.superclass.constructor.call( this, config );
        }

        KBVMedicationPlanModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( KBVMedicationPlanModel, SimpleActivityModel, {

                initializer: function KBVMedicationPlanModel_initializer() {
                    var

                        self = this;
                    self.initKBVMedicationPlanModel();
                },
                destructor: function KBVMedicationPlanModel_destructor() {
                },
                initKBVMedicationPlanModel: function KBVMedicationPlanModel_initKBVMedicationPlanModel() {
                }
            },
            {
                schemaName: 'v_kbvmedicationplan',
                NAME: 'KBVMedicationPlanModel'
            }
        );
        KoViewModel.registerConstructor( KBVMedicationPlanModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_kbvmedicationplan-schema'
        ]
    }
);