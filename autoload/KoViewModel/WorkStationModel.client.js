/**
 * User: oliversieweke
 * Date: 11.04.18  12:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'WorkStationModel', function( Y/*, NAME */ ) {
        /**
         * @module WorkStationModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class WorkStationModel
         * @constructor
         * @extends KoViewModel
         */
        function WorkStationModel( config ) {
            WorkStationModel.superclass.constructor.call( this, config );
        }

        WorkStationModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( WorkStationModel, KoViewModel.getBase(), {
                initializer: function WorkStationModel_initializer() {},
                destructor: function WorkStationModel_destructor() {},
            },
            {
                schemaName: 'workstation',
                NAME: 'WorkStationModel'
            }
        );

        KoViewModel.registerConstructor( WorkStationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'workstation-schema',
        ]
    }
);
