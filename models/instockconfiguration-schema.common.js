/**
 * User: dcdev
 * Date: 3/9/21  12:20 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'instockconfiguration-schema', function( Y, NAME ) {
    'use strict';

        /**
         * The IncaseConfiguration_T entry schema,
         *
         * @module instockconfiguration-schema, invoice configuration schema.
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            template = {
                "_id": "000000000000000000000001"
            };
        // ------- Schema definitions  -------

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "InStockConfiguration_T",
                    "lib": types
                }
            },
            "InStockConfiguration_T": {
                "suppliersConfig": {
                    "complex": "inc",
                    "type": "SupplierConfig_T",
                    "lib": types,
                    "i18n": i18n( "instockconfiguration-schema.suppliersConfig.i18n" )
                }
            },
            "SupplierConfig_T": {
                "supplier": {
                    "type": "String",
                    "i18n": i18n( "instockconfiguration-schema.SupplierConfig_T.supplier.i18n" )
                },
                "baseContactId": {
                    "type": "String"
                },
                "host": {
                    "type": "String",
                    "i18n": i18n( "instockconfiguration-schema.SupplierConfig_T.host.i18n" )
                },
                "path": {
                    "type": "String",
                    "i18n": i18n( "instockconfiguration-schema.SupplierConfig_T.path.i18n" )
                },
                "number": {
                    "type": "String",
                    "i18n": i18n( "instockconfiguration-schema.SupplierConfig_T.number.i18n" )
                },
                "password": {
                    "type": "String",
                    "i18n": i18n( "instockconfiguration-schema.SupplierConfig_T.password.i18n" )
                }

            }
        });
        function getDefaultData() {
            return template;
        }
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            getDefaultData: getDefaultData,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
