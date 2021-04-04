/*global YUI*/
'use strict';
YUI.add( 'v_repeatedconfig-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "base_VRepeatedConfig_T",
                        "lib": types
                    }
                },
                base_VRepeatedConfig_T: {
                    "recurrenceExt": {
                        "complex": "ext",
                        "type": "Recurrence_T",
                        "lib": types
                    },
                    "endCondition": {
                        "complex": "eq",
                        "type": "EndCondition_E",
                        "lib": types
                    }
                },
                Recurrence_T: {
                    /*
                     The following fields follow the naming convention of rrule lib
                     https://github.com/jakubroztocil/rrule
                     */
                    "freq": {
                        "complex": "eq",
                        "type": "RepType_E",
                        "lib": types
                    },
                    "dtstart": {
                        "type": "Date",
                        i18n: i18n( 'calendar-schema.Recurrence_T.dtstart' ),
                        "-en": "From Date",
                        "-de": "Beginn am"
                    },
                    "interval": {
                        "type": "Number",
                        "validate": "Recurrence_T_interval",
                        i18n: i18n( 'calendar-schema.Recurrence_T.interval' ),
                        "-en": "Interval",
                        "-de": "Interval"
                    },
                    "count": {
                        "type": "Number",
                        i18n: i18n( 'calendar-schema.Recurrence_T.count' ),
                        "-en": "count",
                        "-de": "count"
                    },
                    "until": {
                        "type": "Date",
                        i18n: i18n( 'calendar-schema.Recurrence_T.until' ),
                        "-en": "To Date",
                        "-de": "Ende am"
                    },
                    "bymonth": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.bymonth' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "bymonthday": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.bysetpos' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "byweekday": {
                        "type": [String],
                        i18n: i18n( 'calendar-schema.Recurrence_T.byweekday' ),
                        "-en": "On Weekday",
                        "-de": "An Wochentag"
                    }
                },
                "RepType_E": {
                    "type": "string",
                    "default": "DAILY",
                    "version": 1,
                    i18n: i18n( 'calendar-schema.RepType_E.i18n' ),
                    "-en": "Repeat",
                    "-de": "repetition",
                    "list": [
                        {
                            "val": "DAILY",
                            i18n: i18n( 'v_repeatedconfig-schema.RepType_E.DAILY.i18n' ),
                            "-en": "day(s)",
                            "-de": "Tag(e)"
                        },
                        {
                            "val": "WEEKLY",
                            i18n: i18n( 'v_repeatedconfig-schema.RepType_E.WEEKLY.i18n' ),
                            "-en": "week(s)",
                            "-de": "Woche(n)"
                        },
                        {
                            "val": "MONTHLY",
                            i18n: i18n( 'v_repeatedconfig-schema.RepType_E.MONTHLY.i18n' ),
                            "-en": "month(s)",
                            "-de": "Monat(e)"
                        },
                        {
                            "val": "YEARLY",
                            i18n: i18n( 'v_repeatedconfig-schema.RepType_E.YEARLY.i18n' ),
                            "-en": "year(s)",
                            "-de": "Jahre"
                        }
                    ]
                },
                "EndCondition_E": {
                    "type": "string",
                    "default": "",
                    "version": 1,
                    "-en": "endCondition",
                    "-de": "endCondition",
                    "list": [
                        {
                            "val": ""
                        },
                        {
                            "val": "BY_ENDDATE",
                            "-en": "byEndDate",
                            "-de": "byEndDate"
                        },
                        {
                            "val": "BY_COUNT",
                            "-en": "byCount",
                            "-de": "byCount"
                        }
                    ]
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
            'dcschemaloader'
        ]
    }
);
