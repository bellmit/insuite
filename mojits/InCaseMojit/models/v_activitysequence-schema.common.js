/**
 * User: pi
 * Date: 18/10/2016  12:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'v_activitysequence-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module v_activitysequence-schema
         */

        var

        // ------- Schema definitions  -------

            types = {};

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'VActivitySequence_T',
                        'lib': types
                    }
                },
                'VActivitySequence_T': {
                    title: Y.doccirrus.schemas.activitysequence.schema.title,
                    description: Y.doccirrus.schemas.activitysequence.schema.description,
                    order:Y.doccirrus.schemas.activitysequence.schema.order,
                    useOriginalValues:Y.doccirrus.schemas.activitysequence.schema.useOriginalValues,
                    isDeleted: {
                        type: "Boolean",
                        "default": false
                    },
                    activitiesId: {
                        type: ["String"],
                        "default": []
                    },
                    sequenceGroups: {
                        type: ["String"],
                        "default": []
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
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'activitysequence-schema'
        ]
    }
);
