/**
 * User: oliversieweke
 * Date: 06.02.19  13:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'TarmedDignitiesModel', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module TarmedDignitiesModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel;
        var DIGNITY_TYPE_TO_CATALOG_SHORT_MAP = Object.assign( Object.create( null ), {
            quali: 'TARMED_DIGNI_QUALI',
            quanti:'TARMED_DIGNI_QUANTI'
        } );

        /**
         * @class TarmedDignitiesModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function TarmedDignitiesModel( config ) {
            TarmedDignitiesModel.superclass.constructor.call( this, config );
        }

        TarmedDignitiesModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TarmedDignitiesModel, KoViewModel.getBase(), {
                initializer: function OrganisationalUnitModel_initializer( config ) {
                    var dignityEntry = config.dignityEntry || {};
                    var type = config.type;

                    this._id( dignityEntry._id );
                    this.code( dignityEntry.code );
                    this.text( dignityEntry.text );
                    this.catalogShort( DIGNITY_TYPE_TO_CATALOG_SHORT_MAP[type] );
                }
            },
            {
                schemaName: 'v_tarrmeddignity',
                NAME: 'TarmedDignitiesModel'
            }
        );

        KoViewModel.registerConstructor( TarmedDignitiesModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_tarrmeddignity-schema'
        ]
    }
);
