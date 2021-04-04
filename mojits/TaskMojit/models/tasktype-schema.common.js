/*global YUI*/
'use strict';

YUI.add( 'tasktype-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module tasktype-schema
         */

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            taskTypes = Object.freeze( {
                DEFAULT: 'DEFAULT',
                PRINT: 'PRINT',
                TRANSCRIBE: 'TRANSCRIBE',
                SYSTEM: 'SYSTEM',
                USER: 'USER'
            } ),
            templateDefault = {
                "_id": "100000000000000000000001",
                "type": 'DEFAULT',
                "name": i18n( 'tasktype-schema.TaskType_E.DEFAULT.i18n' )
            },
            templatePrint = {
                "_id": "100000000000000000000002",
                "type": 'PRINT',
                "name": i18n( 'tasktype-schema.TaskType_E.PRINT.i18n' )
            },
            templateSystem = {
                "_id": "000000000000000000000001",
                "type": 'SYSTEM',
                "name": i18n( 'tasktype-schema.TaskType_E.SYSTEM.i18n' )
            },
            templateTranscribe = {
                "_id": "100000000000000000000003",
                "type": 'TRANSCRIBE',
                "name": i18n( 'tasktype-schema.TaskType_E.TRANSCRIBE.i18n' )
            };

        function getTaskTypeFromType( systemTaskType ) {
            //switch each task-schema.SystemTaskType_E return templateSystem._id
            // except PRINT and '' or undefined or null
            switch( systemTaskType ) {
                case 'PRINT':
                    return templatePrint._id;
                case '':
                case undefined:
                case null:
                    return templateDefault._id;

                default:
                    return templateSystem._id;
            }
        }
        function createSchemaTaskTypeList() {
            var
                result = [];
            Object.keys( taskTypes ).forEach( function( type ) {
                result.push( {
                    val: taskTypes[type],
                    i18n: i18n( 'tasktype-schema.TaskType_E.' + type + '.i18n' ),
                    '-en': i18n( 'tasktype-schema.TaskType_E.' + type + '.i18n' ),
                    '-de': i18n( 'tasktype-schemaa.TaskType_E.' + type + '.i18n' )
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultTypes() {
            return [templateDefault, templatePrint];
        }

        types = Y.mix( types, {
                "root": {
                    'base': {
                        'complex': 'ext',
                        'type': 'TaskType_T',
                        'lib': types
                    }
                },
                'TaskType_T': {
                    'type': {
                        "complex": "eq",
                        "lib": types,
                        "type": "Type_E"
                    },
                    'name': {
                        "type": "String",
                        "required": true,
                        "default": "",
                        i18n: i18n( 'tasktype-schema.TaskType_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    employeeId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.employee.i18n' ),
                        '-en': 'employee',
                        '-de': 'employee'
                    },
                    employeeName: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.employeeName.i18n' ),
                        '-en': 'employee name',
                        '-de': 'employee name'
                    },
                    allDay: {
                        type: 'Boolean',
                        default: false,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.allDay.i18n' ),
                        '-en': 'all day',
                        '-de': 'ganztägig'
                    },
                    title: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.title.i18n' ),
                        '-en': 'Title',
                        '-de': 'Titel',
                        "rule-engine": {}
                    },
                    urgency: {
                        complex: 'eq',
                        type: 'Urgency_E',
                        lib: 'task'
                    },
                    details: {
                        default: '',
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.details.i18n' ),
                        '-en': 'Details',
                        '-de': 'Details',
                        "rule-engine": {}
                    },
                    roles: {
                        type: [ 'String' ],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.roles.i18n' ),
                        '-en': 'Roles',
                        '-de': 'Roles'
                    },
                    candidates: {
                        type: [ 'String' ],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.candidates.i18n' ),
                        '-en': 'Candidates',
                        '-de': 'Candidates'
                    },
                    candidatesNames: {
                        type: [ 'String' ],
                        i18n: i18n( 'task-schema.Task_T.candidatesNames.i18n' ),
                        '-en': 'Candidates Names',
                        '-de': 'Candidates Names'
                    },
                    days: {
                        type: 'Number',
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.days.i18n' ),
                        '-en': 'Days',
                        '-de': 'Tage'
                    },
                    hours: {
                        type: 'Number',
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.hours.i18n' ),
                        '-en': 'Hours',
                        '-de': 'Stunden'
                    },
                    minutes: {
                        type: 'Number',
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.minutes.i18n' ),
                        '-en': 'Minutes',
                        '-de': 'Minutes'
                    }
                },
                "Type_E": {
                    "type": "String",
                    "required": true,
                    "default": "DEFAULT",
                    "list": createSchemaTaskTypeList(),
                    i18n: i18n( 'tasktype-schema.TaskType_E.i18n' ),
                    '-en': 'Task Type',
                    '-de': 'Aufgabentyp'
                }

            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,
            getDefaultTypes: getDefaultTypes,
            getTaskTypeFromType: getTaskTypeFromType,

            /* MANDATORY */
            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [templateDefault, templatePrint, templateTranscribe, templateSystem],

            taskTypes: taskTypes,
            templateSystem: templateSystem,
            templateDefault: templateDefault,
            templatePrint: templatePrint,
            templateTranscribe: templateTranscribe

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader', 'doccirrus', 'task-schema']}
);
