/**
 * User: pi
 * Date: 03/12/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'FromPatientModel', function( Y ) {
        /**
         * @module FromPatientModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;


        /**
         * @class FromPatientModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function FromPatientModel( config ) {
            FromPatientModel.superclass.constructor.call( this, config );
        }

        FromPatientModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( FromPatientModel, KoViewModel.getConstructor( 'FormBasedActivityModel' ), {

                initializer: function FromPatientModel_initializer() {
                    var
                        self = this;
                    self.initFromPatientModel();
                },
                destructor: function FromPatientModel_destructor() {
                },
                initFromPatientModel: function FromPatientModel_initFromPatientModel() {
                }
            },
            {
                schemaName: 'v_from_patient',
                NAME: 'FromPatientModel'
            }
        );
        KoViewModel.registerConstructor( FromPatientModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_from_patient-schema'
        ]
    }
)
;