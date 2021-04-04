/*global YUI*/
'use strict';
YUI.add( 'taskconfiguration-schema', function( Y, NAME ) {

        /**
         * @module task
         * @submodule models
         * @namespace doccirrus.schemas
         * @class Taskconfiguration
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
                    "type": "TaskConfiguration_T",
                    "lib": types
                }
            },
            "TaskConfiguration_T": {
                "details": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.details' )
                },
                "title": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.title' )
                },
                "candidates": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.candidates' )
                },
                "patientName": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.patientName' )
                },
                "creatorName": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.creatorName' )
                },
                "employeeName": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.employeeName' )
                },
                "roles": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.roles' )
                },
                "tasks": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.tasks' )
                },
                "urgency": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.urgency' )
                },
                "alertTime": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.alertTime' )
                },
                "schedule": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.schedule' )
                },
                "linkedSchedule": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.linkedSchedule' )
                },
                "lastSchedule": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.lastSchedule' )
                },
                "dateCreated": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.dateCreated' )
                },
                "detailsFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.detailsFilter' )
                },
                "titleFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.titleFilter' )
                },
                "candidatesFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.candidatesFilter' )
                },
                "patientNameFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.patientNameFilter' )
                },
                "creatorNameFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.creatorNameFilter' )
                },
                "employeeNameFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.employeeNameFilter' )
                },
                "rolesFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.rolesFilter' )
                },
                "listsFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.listsFilter' )
                },
                "tasksFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.tasksFilter' )
                },
                "urgencyFilter": {
                    "type":"Boolean",
                    "default": true,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.urgencyFilter' )
                },
                "scheduleFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.scheduleFilter' )
                },
                "linkedScheduleFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.linkedScheduleFilter' )
                },
                "lastScheduleFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.lastScheduleFilter' )
                },
                "dateCreatedFilter": {
                    "type":"Boolean",
                    "default": false,
                    "required": true,
                    "i18n": i18n( 'taskconfiguration-schema.TaskConfiguration_T.dateCreatedFilter' )
                }
            }
        } );
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
