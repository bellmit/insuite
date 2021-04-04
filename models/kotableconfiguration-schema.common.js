/**
 * User: pi
 * Date: 02/04/2015  12:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'kotableconfiguration-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module kotableconfiguration-schema
         */
        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'KoTableConfiguration_T',
                        'lib': types
                    }
                },
                'KoTableConfiguration_T': {
                    'userId': {
                        "type": "String",
                        i18n: i18n( 'kotableconfiguration-schema.KoTableConfiguration_T.userId.i18n' ),
                        "-en": "user id",
                        "-de": "user id"
                    },
                    'stateId': {
                        "type": "String",
                        i18n: i18n( 'kotableconfiguration-schema.KoTableConfiguration_T.stateId.i18n' ),
                        "-en": "state id",
                        "-de": "state id"
                    },
                    'config': {
                        "type": "any",
                        i18n: i18n( 'kotableconfiguration-schema.KoTableConfiguration_T.config.i18n' ),
                        "-en": "configuration",
                        "-de": "configuration"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,
            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
