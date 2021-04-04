
/*global YUI*/
'use strict';
YUI.add( 'v_closeday-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VCloseDay_T",
                        "lib": types
                    }
                },

                "VCloseDay_T": {
                    "scheduleBase": {
                        "complex": "ext",
                        "type": "Schedule_T",
                        "lib": "calendar"
                    },
                    "closeDayType": {
                        "complex": "eq",
                        "type": "CloseDayType_E",
                        "required": true,
                        "i18n": i18n( 'calendar-schema.Schedule_T.closeDayType' ),
                        "lib": "calendar",
                        "-en": "Type",
                        "-de": "Typ",
                        override: true
                    },
                    "start": {
                        "type": "Date",
                        i18n: i18n( 'calendar-schema.Schedule_T.start' ),
                        "-en": "Start Date",
                        "-de": "Beginn",
                        override: true
                    },
                    "end": {
                        "type": "Date",
                        "validate": "Schedule_T_end",
                        i18n: i18n( 'calendar-schema.Schedule_T.end' ),
                        "-en": "End Date",
                        "-de": "Ende",
                        override: true
                    },
                    "calendar": {
                        "type": ["string"],
                        "ref": "calendar",
                        i18n: i18n( 'calendar-schema.Schedule_T.calendar' ),
                        "-en": "Calendar",
                        "-de": "Kalendar",
                        override: true
                    },
                    "interval": {
                        "type": "Number",
                        i18n: i18n( 'calendar-schema.Recurrence_T.interval' ),
                        "-en": "Interval",
                        "-de": "Interval",
                        override: true
                    },
                    "duration": {
                        "type": "number",
                        i18n: i18n( 'calendar-schema.Schedule_T.duration' ),
                        "-en": "Duration",
                        "-de": "Dauer",
                        override: true
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );

    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'calendar-schema'
        ]
    }
);
