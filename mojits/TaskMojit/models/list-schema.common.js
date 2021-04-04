/*global YUI*/
'use strict';
YUI.add( 'list-schema', function( Y, NAME ) {

        /**
         * @module task
         * @submodule models
         * @namespace doccirrus.schemas
         * @class List
         */

        var
            // ------- private 'constants'  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "List_T",
                        "lib": types
                    }
                },
            "List_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        "default": "",
                        i18n: i18n( 'list-schema.List_T.name.i18n' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "color": {
                        "type": "String",
                        "default": "#b4cff0",
                        i18n: i18n( 'list-schema.List_T.color' ),
                        "-en": "color",
                        "-de": "color"
                    },
                    "numberOfTasks": {
                        "type": "Number"
                    },
                    "details": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.details' )
                    },
                    "title": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.title' )
                    },
                    "candidates": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.candidates' )
                    },
                    "patientName": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.patientName' )
                    },
                    "creatorName": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.creatorName' )
                    },
                    "employeeName": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.employeeName' )
                    },
                    "roles": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.roles' )
                    },
                    "tasks": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.tasks' )
                    },
                    "urgency": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.urgency' )
                    },
                    "dateCreated": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.dateCreated' )
                    },
                    "alertTime": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.alertTime' )
                    },
                    "schedule": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.schedule' )
                    },
                    "linkedSchedule": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.linkedSchedule' )
                    },
                    "lastSchedule": {
                        "type":"Boolean",
                        "default": false,
                        "required": true,
                        "i18n": i18n( 'list-schema.List_T.lastSchedule' )
                    },
                    "order": {
                        "type": "Number",
                        "i18n": i18n( 'list-schema.List_T.order' )
                    },
                    "rolesFilterValue": {
                        "type": ["object"],
                        "i18n": i18n( 'list-schema.List_T.rolesFilterValue' )
                    },
                    "tasksFilterValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.tasksFilterValue' )
                    },
                    "urgencyFilterValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.urgencyFilterValue' )
                    },
                    "locationsFilterValue": {
                        "type": ["object"],
                        "i18n": i18n( 'list-schema.List_T.locationsFilterValue' )
                    },
                    "employeesFilterValue": {
                        "type": ["object"],
                        "i18n": i18n( 'list-schema.List_T.locationsFilterValue' )
                    },
                    "employeeNameFilterValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.employeeNameFilterValue' )
                    },
                    "employeeNameTextValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.employeeNameTextValue' )
                    },
                    "patientsFilterValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.patientsFilterValue' )
                    },
                    "patientsNameValue": {
                        "type": "String",
                        "i18n": i18n( 'list-schema.List_T.patientsFilterValue' )
                    },
                    "alertTimeFilterValue": {
                        "type": "object",
                        "i18n": i18n( 'list-schema.List_T.alertTimeFilterValue' )
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
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcschemaloader', 'calendar-schema' ] }
);
