/**
 * User: pi
 * Date: 03/12/15  09:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'OmimModel', function( Y/*, NAME*/ ) {
        /**
         * @module OmimModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;


        /**
         * @class OmimModel
         * @constructor
         * @extends KoViewModel
         */
        function OmimModel( config ) {
            OmimModel.superclass.constructor.call( this, config );
        }

        OmimModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( OmimModel, KoViewModel.getBase(), {

                initializer: function OmimModel_initializer() {
                },
                destructor: function Fk4235Model_destructor() {
                }
            },
            {
                schemaName: 'activity.omimCodes',
                NAME: 'OmimModel'
            }
        );
        KoViewModel.registerConstructor( OmimModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'activity-schema'
        ]
    }
)
;