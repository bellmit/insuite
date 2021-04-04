/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'schedule-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Schedules are the individual appointments in the system calendars. Each schedule must refer to a calendar and have a scheduletype."
                }
            },
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Schedule_T",
                        "lib": "calendar"
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
            types: types,

            ramlConfig: ramlConfig,

            indexes: [
                {
                    "key": {
                        "title": 1
                    }
                },
                {
                    "key": {
                        "patient": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    "key": {
                        "linkSeries": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    "key": {
                        "start": 1
                    }
                },
                {
                    "key": {
                        "end": 1
                    }
                },
                {
                    "key": {
                        "calendar": 1
                    }
                }
            ],

            allowComplexUpdate: true,

            getReadOnlyFields: Y.doccirrus.schemas.calendar.getReadOnlyFieldsForCalevent

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader','dcvalidations', 'dcschemaloader', 'calendar-schema']}
);
