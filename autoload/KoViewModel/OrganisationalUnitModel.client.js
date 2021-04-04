/**
 * User: oliversieweke
 * Date: 11.04.18  12:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'OrganisationalUnitModel', function( Y/*, NAME */ ) {
        /**
         * @module OrganisationalUnitModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class OrganisationalUnitModel
         * @constructor
         * @extends KoViewModel
         */
        function OrganisationalUnitModel( config ) {
            OrganisationalUnitModel.superclass.constructor.call( this, config );
        }

        OrganisationalUnitModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( OrganisationalUnitModel, KoViewModel.getBase(), {
                initializer: function OrganisationalUnitModel_initializer() {},
                destructor: function OrganisationalUnitModel_destructor() {},
            },
            {
                schemaName: 'organisationalunit',
                NAME: 'OrganisationalUnitModel'
            }
        );

        KoViewModel.registerConstructor( OrganisationalUnitModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'organisationalunit-schema',
        ]
    }
);
