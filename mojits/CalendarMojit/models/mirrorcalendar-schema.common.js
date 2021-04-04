/**
 * User: pi
 * Date: 07/03/17  13:30
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';
YUI.add( 'mirrorcalendar-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module activity-schema
         */

        // ------- Schema definitions  -------
        var
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Calendar_base_T",
                        "lib": types
                    }
                },
                "Calendar_base_T": {
                    "base": {
                        "complex": "ext",
                        "type": "Calendar_T",
                        "lib": 'calendar'
                    },
                    "active": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'mirrorcalendar-schema.Calendar_base_T.active.i18n' ),
                        "-en": i18n( 'mirrorcalendar-schema.Calendar_base_T.active.i18n' ),
                        "-de": i18n( 'mirrorcalendar-schema.Calendar_base_T.active.i18n' )
                    },
                    "prcCustomerNo": {
                        "type": "String",
                        i18n: i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCustomerNo.i18n' ),
                        "-en": i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCustomerNo.i18n' ),
                        "-de": i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCustomerNo.i18n' )
                    },
                    "prcCoName": {
                        "type": "String",
                        i18n: i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCoName.i18n' ),
                        "-en": i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCoName.i18n' ),
                        "-de": i18n( 'mirrorcalendar-schema.Calendar_base_T.prcCoName.i18n' )
                    },
                    "originalId": {
                        type: "ObjectId",
                        i18n: i18n( 'mirrorcalendar-schema.Calendar_base_T.originalId.i18n' ),
                        "-en": i18n( 'mirrorcalendar-schema.Calendar_base_T.originalId.i18n' ),
                        "-de": i18n( 'mirrorcalendar-schema.Calendar_base_T.originalId.i18n' )
                    }
                }

            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'calendar-schema'

        ]
    }
);
