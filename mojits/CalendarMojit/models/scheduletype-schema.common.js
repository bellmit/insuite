/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'scheduletype-schema', function( Y, NAME ) {

        /**
         * @module calendar
         * @submodule models
         * @namespace doccirrus.schemas
         * @class ScheduleTypeSchema
         */

        var
            // ------- private 'constants'  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Schedule types define what types of schedules can be added in the system."
                }
            },
            types = {},
            i18n = Y.doccirrus.i18n,
            STANDARD_ID = '51b732232e837550c90851fb',
            DEFAULT_DURATION = 15,
            appointmentTypes = Object.freeze({
                STANDARD: 'STANDARD',
                CONFERENCE: 'CONFERENCE',
                ONLINE_CONSULTATION: 'ONLINE_CONSULTATION'
            }),
            template = [
                {
                    _id: STANDARD_ID,
                    name: 'Standard',
                    duration: DEFAULT_DURATION,
                    isPublic: true,
                    durationUnit: 'MINUTES',
                    calendarRefs: [
                        {
                            calendarId: Y.doccirrus.schemas.calendar.getStandardCalendarId()
                        }
                    ],
                    info: '',
                    isPreconfigured: false,
                    capacity: 0,
                    numberOfSuggestedAppointments: 10
                }
            ];

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "ScheduleType_T",
                        "lib": types
                    }
                },
                ScheduleType_T: {
                    "name": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "required": true,
                        "default": "",
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.name.i18n' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "duration": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        "required": true,
                        "default": DEFAULT_DURATION,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.duration' ),
                        "-en": "duration",
                        "-de": "duration"
                    },
                    "durationUnit": {
                        "complex": "eq",
                        "type": "DurationUnit_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.durationUnit' ),
                        "-en": "durationUnit",
                        "-de": "durationUnit"
                    },
                    "type": {
                        "complex": "eq",
                        "type": "Type_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "calendarRefs": {
                        "complex": "inc",
                        "type": "CalendarRef_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.calendarRefs' ),
                        "-en": "calendarRefs",
                        "-de": "calendarRefs"
                    },
                    "isPublic": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "default": true,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.isPublic' ),
                        "-en": "isPublic",
                        "-de": "isPublic"
                    },
                    "info": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "default": "",
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.info' ),
                        "-en": "info",
                        "-de": "info"
                    },
                    "isPreconfigured": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "default": false,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.isPreconfigured' ),
                        "-en": "isPreconfigured",
                        "-de": "isPreconfigured"
                    },
                    "noPatientMessage": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "default": false,
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.noPatientMessage' ),
                        "-en": "noPatientMessage",
                        "-de": "noPatientMessage"
                    },
                    "capacity": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        "default": 0,
                        "validate": "scheduleCapacity",
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.capacity' ),
                        "-en": "capacity",
                        "-de": "capacity"
                    },
                    "numberOfSuggestedAppointments": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        "default": 10,
                        "validate": "scheduleNumberOfSuggestedAppointments",
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.numberOfSuggestedAppointments' )
                    },
                    "color": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "default": "#254061",
                        i18n: i18n( 'scheduletype-schema.ScheduleType_T.color' ),
                        "-en": "color",
                        "-de": "color"
                    },
                    "lastChanged": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "requiredResources": {
                        "complex": "inc",
                        "type": "RequiredResource_T",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'scheduletype-schema.ScheduleType_T.requiredResources' ),
                        "-en": "requiredResources",
                        "-de": "requiredResources"
                    }
                },
                "DurationUnit_E": {
                    "required": true,
                    "apiv": { v: 2, queryParam: false },
                    "default": "MINUTES",
                    "type": "String",
                    "list": [
                        {
                            "val": "MINUTES",
                            i18n: i18n( 'scheduletype-schema.DurationUnit_E.MINUTES' ),
                            "-en": "minutes",
                            "-de": "minutes"
                        },
                        {
                            "val": "HOURS",
                            i18n: i18n( 'scheduletype-schema.DurationUnit_E.HOURS' ),
                            "-en": "hours",
                            "-de": "hours"
                        },
                        {
                            "val": "DAYS",
                            i18n: i18n( 'scheduletype-schema.DurationUnit_E.DAYS' ),
                            "-en": "days",
                            "-de": "days"
                        },
                        {
                            "val": "WEEKS",
                            i18n: i18n( 'scheduletype-schema.DurationUnit_E.WEEKS' ),
                            "-en": "weeks",
                            "-de": "weeks"
                        }
                    ]
                },
                "Type_E": {
                    "required": true,
                    "default": "STANDARD",
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'scheduletype-schema.Type_E.i18n' ),
                    "type": "String",
                    "list": Object.keys( appointmentTypes ).map( function( type ) {
                        return {
                            val: type,
                            i18n: i18n( 'scheduletype-schema.Type_E.' + type )
                        };
                    } )
                },
                "CalendarRef_T": {
                    "calendarId": {
                        "type": "String",
                        "ref": "calendar",
                        i18n: i18n( 'scheduletype-schema.CalendarRef_T.calendarID' ),
                        "refType": "ObjectId",
                        "-en": "calendarId",
                        "-de": "calendarId"
                    }
                },
                "CapacityUnit_E": {
                    "required": true,
                    "type": "String",
                    "list": [
                        {
                            "val": "MINUTES",
                            i18n: i18n( 'scheduletype-schema.CapacityUnit_E.MINUTES' ),
                            "-en": "minutes",
                            "-de": "minutes"
                        },
                        {
                            "val": "HOURS",
                            i18n: i18n( 'scheduletype-schema.CapacityUnit_E.HOURS' ),
                            "-en": "hours",
                            "-de": "hours"
                        },
                        {
                            "val": "DAYS",
                            i18n: i18n( 'scheduletype-schema.CapacityUnit_E.DAYS' ),
                            "-en": "days",
                            "-de": "days"
                        },
                        {
                            "val": "WEEKS",
                            i18n: i18n( 'scheduletype-schema.CapacityUnit_E.WEEKS' ),
                            "-en": "weeks",
                            "-de": "weeks"
                        }
                    ]
                },
                "RequiredResource_T": {
                    "resourceType": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'scheduletype-schema.RequiredResource_T.resourceType' ),
                        "-en": "resourceType",
                        "-de": "resourceType"
                    }
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            defaultItems: template,

            getStandardId: function() {
                return STANDARD_ID;
            },

            getDefaultDuration: function() {
                return DEFAULT_DURATION;
            },

            MAX_CAPACITY: 15,
            MAX_NUMBER_OF_SUGGESTED_APPOINTMENTS: 25,

            ramlConfig: ramlConfig,
            appointmentTypes: appointmentTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcschemaloader', 'calendar-schema' ] }
);
