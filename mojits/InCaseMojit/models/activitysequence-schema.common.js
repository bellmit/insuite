/**
 * User: pi
 * Date: 19/01/2015  12:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'activitysequence-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module activitysequence-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            orderStep = 1000000000;

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'ActivitySequence_T',
                        'lib': types
                    }
                },
                'ActivitySequence_T': {
                    'title': {
                        "type": "String",
                        validate: "ActivitySequence_T_title",
                        i18n: i18n( 'activitysequence-schema.ActivitySequence_T.title.i18n' ),
                        "-en": "Title",
                        "-de": "Title"
                    },
                    'activities':{
                        "type": ["Object"],
                        i18n: i18n( 'activitysequence-schema.ActivitySequence_T.activities.i18n' ),
                        "-en": "Activity sequence",
                        "-de": "Ziffernketten"
                    },
                    'description': {
                        "type": "String",
                        "default": "",
                        i18n: i18n( 'activitysequence-schema.ActivitySequence_T.description.i18n' ),
                        "-en": "Help",
                        "-de": "Hilfe"
                    },
                    'order':{
                        "type": "Number",
                        i18n: i18n( 'activitysequence-schema.ActivitySequence_T.order.i18n' ),
                        "-en": "Order",
                        "-de": "Bestellen"
                    },
                    'useOriginalValues': {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'activitysequence-schema.ActivitySequence_T.useOriginalValuesByDefault.i18n' )
                    },
                    "sequenceGroups": {
                        "type": ['any'],
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'activitysequence-schema.ActivitySequence_T.sequenceGroups.i18n' ),
                        "-en": "Group",
                        "-de": "Gruppe"
                    },
                    "orderInGroup": {
                        "type": 'Object'
                    }
                }
            }
        );

        function getOrderStep(){
            return orderStep;
        }
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,
            getOrderStep: getOrderStep
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
