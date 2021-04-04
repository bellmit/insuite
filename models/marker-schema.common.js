/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'marker-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCMarker
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Marker_T",
                        "lib": types
                    }
                },
                "Marker_T": {
                    "description": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'marker-schema.Marker_T.description.i18n' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    "icon": {
                        "type": "String",
                        "future": "URL",
                        i18n: i18n( 'marker-schema.Marker_T.icon.i18n' ),
                        "-en": "Icon",
                        "-de": "Icon"
                    },
                    "severity": {
                        "complex": "ext",
                        "type": "SeverityColor_T",
                        "lib": "severity"
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
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'severity-schema'
        ]
    }
);
