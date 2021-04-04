/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'task-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            systemTaskTypes = Object.freeze( {
                DEFAULT: '',
                PRINT: 'PRINT',
                TRANSCRIBE: 'TRANSCRIBE',
                NEW_PATIENT: 'NEW_PATIENT',
                CHANGE_REQUEST: 'CHANGE_REQUEST',
                NEW_TRANSFER: 'NEW_TRANSFER',
                CANCELED_TRANSFER: 'CANCELED_TRANSFER',
                TEMPLATE: 'TEMPLATE',
                RULE_ENGINE: 'RULE_ENGINE',
                USER: 'USER'
            } );

        function createSchemaTaskTypeList() {
            var
                result = [];
            Object.keys( systemTaskTypes ).forEach( function( type ) {
                result.push( {
                    val: systemTaskTypes[ type ],
                    i18n: i18n( 'tasktype-schema.TaskType_E.' + type + '.i18n' ),
                    '-en': i18n( 'tasktype-schema.TaskType_E.' + type + '.i18n' ),
                    '-de': i18n( 'tasktype-schema.TaskType_E.' + type + '.i18n' )
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'Task_base_T',
                        lib: types
                    }
                },
                "Task_base_T": {
                    "base": {
                        "complex": "ext",
                        "type": "Task_T",
                        "lib": types
                    },
                    "base_Measurement_T": {
                        complex: 'ext',
                        type: 'Measurement_T',
                        lib: 'activity'
                    }
                },
                'Task_T': {
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
                    "locations": {
                        "complex": "inc",
                        "type": "EmployeeLocations_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": 'employee',
                        i18n: i18n( 'employee-schema.Employee_T.locations' ),
                        "-en": "Assigned locations",
                        "-de": "Betriebsstätten"
                    },
                    patientId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'task-schema.Task_T.patient.i18n' ),
                        '-en': 'patient',
                        '-de': 'patient'
                    },
                    patientName: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.patientName.i18n' ),
                        '-en': 'patient name',
                        '-de': 'patient name'
                    },
                    patientPartnerId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.patientPartnerId.i18n' ),
                        '-en': 'patientPartnerId',
                        '-de': 'patientPartnerId'
                    },
                    activityId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.activityId.i18n' ),
                        '-en': 'activity id',
                        '-de': 'activity id'
                    },
                    activities: {
                        "complex": "inc",
                        "type": "TaskActivity_T",
                        "lib": types
                    },
                    activityType: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.activityType.i18n' ),
                        '-en': 'activity type',
                        '-de': 'activity type'
                    },
                    dispatchRequestId: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.dispatchRequestId.i18n' ),
                        '-en': 'Dispatch Request Id',
                        '-de': 'Dispatch Request Id'
                    },
                    transferEntryId: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.transferEntryId.i18n' ),
                        '-en': 'Transfer Entry Id',
                        '-de': 'Transfer Entry Id'
                    },
                    deviceLogEntryId: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.deviceLogEntryId.i18n' ),
                        '-en': 'Device Log Entry Id',
                        '-de': 'Mediabuch Eintrag Id'
                    },
                    formActivityId: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.formActivityId.i18n' ),
                        '-en': 'Form',
                        '-de': 'Formular'
                    },
                    conferenceId: {
                        type: 'ObjectId',
                        i18n: i18n( 'task-schema.Task_T.conferenceId.i18n' )
                    },
                    cardioSerialNumber: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.cardioId.i18n' ),
                        '-en': 'Cardio serial number',
                        '-de': 'Cardio Seriennummer'
                    },
                    allDay: {
                        type: 'Boolean',
                        default: true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.allDay.i18n' ),
                        '-en': 'all day',
                        '-de': 'ganztägig'
                    },
                    callTime: {
                        type: 'Date',
                        i18n: i18n( 'task-schema.Task_T.callTime.i18n' ),
                        '-en': 'call time',
                        '-de': 'call time'
                    },
                    alertTime: {
                        type: 'Date',
                        required: true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.alertTime.i18n' ),
                        '-en': 'alert time',
                        '-de': 'alert time'
                    },
                    templateAlertTimeAbsolute: {
                        type: 'Number',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.alertTime.i18n' ),
                        '-en': 'alert time',
                        '-de': 'alert time'
                    },
                    templateAlertTimeInterval: {
                        complex: 'eq',
                        type: 'TimeInterval_E',
                        lib: types
                    },
                    title: {
                        type: 'String',
                        required: true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.title.i18n' ),
                        '-en': 'Title',
                        '-de': 'Titel',
                        "rule-engine": {}
                    },
                    urgency: {
                        complex: 'eq',
                        type: 'Urgency_E',
                        lib: types
                    },
                    status: {
                        "apiv": { v: 2, queryParam: false },
                        complex: 'eq',
                        type: 'Status_E',
                        lib: types
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
                    group: {
                        type: 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.group.i18n' ),
                        '-en': 'group',
                        '-de': 'group'
                    },
                    roles: {
                        type: [ 'String' ],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.roles.i18n' ),
                        validate: "Task_T_rolesOrCandidates",
                        '-en': 'Roles',
                        '-de': 'Roles'
                    },
                    candidates: {
                        type: [ 'String' ],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.candidates.i18n' ),
                        validate: "Task_T_rolesOrCandidates",
                        '-en': 'Candidates',
                        '-de': 'Candidates'
                    },
                    candidatesNames: {
                        type: [ 'String' ],
                        i18n: i18n( 'task-schema.Task_T.candidatesNames.i18n' ),
                        '-en': 'Candidates Names',
                        '-de': 'Candidates Names'
                    },
                    creatorId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.creatorId.i18n' ),
                        '-en': 'CreatorId',
                        '-de': 'CreatorId'
                    },
                    creatorName: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.creatorName.i18n' ),
                        '-en': 'CreatorName',
                        '-de': 'CreatorName'
                    },
                    dateCreated: {
                        type: 'Date',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.dateCreated.i18n' ),
                        "-en": "Created",
                        "-de": "Erstelldatum"
                    },
                    dateDone: {
                        type: 'Date',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.dateDone.i18n' ),
                        "-en": "Done",
                        "-de": "Erledigtdatum"
                    },
                    location: {
                        "complex": "inc",
                        "type": "Location_T",
                        "lib": "location"
                    },
                    type: {
                        complex: 'eq',
                        "apiv": { v: 2, queryParam: false },
                        type: 'SystemTaskType_E',
                        lib: types
                    },
                    taskType: {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'tasktype-schema.TaskType_E.i18n' ),
                        '-en': 'Task Type',
                        '-de': 'Aufgabentyp',
                        "rule-engine": {
                            "allowedOperators": ['$eq', '$ne', '$exists']
                        }
                    },
                    scheduleId: {
                        type: 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.scheduleId.i18n' ),
                        '-en': i18n( 'task-schema.Task_T.scheduleId.i18n' ),
                        '-de': i18n( 'task-schema.Task_T.scheduleId.i18n' )
                    },
                    sessionWide: {
                        type: 'Boolean',
                        default: false,
                        '-en': 'sessionWide',
                        '-de': 'sessionWide'
                    },
                    linkedSchedule: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.linkedSchedule.i18n' ),
                        '-en': i18n( 'task-schema.Task_T.linkedSchedule.i18n' ),
                        '-de': i18n( 'task-schema.Task_T.linkedSchedule.i18n' )
                    },
                    "autoGenID": {
                        "type": "String",
                        "-en": "autoGenID",
                        "-de": "autoGenID"
                    },
                    links: {
                        "complex": "inc",
                        "type": "TaskLink_T",
                        "lib": types
                    },
                    mediaId: {
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.mediaId.i18n' ),
                        '-en': 'mediaId',
                        '-de': 'mediaId'
                    },
                    "columnId": {
                        "type": "String"
                    },
                    "columnName": {
                        "type": "String"
                    },
                    "orderInColumn": {
                        "type": "Number"
                    }

                },
                Urgency_E: {
                    type: 'Number',
                    'default': 2,
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'task-schema.Task_T.urgency.i18n' ),
                    '-en': 'Urgency',
                    '-de': 'Dringlichkeit',
                    'list': [
                        {
                            'val': 1,
                            i18n: i18n( 'task-schema.Urgency_E.LOW' ),
                            '-de': 'niedrig',
                            '-en': 'Low'
                        },
                        {
                            'val': 2,
                            i18n: i18n( 'task-schema.Urgency_E.NORMAL' ),
                            '-de': 'normal',
                            '-en': 'Normal'
                        },
                        {
                            'val': 3,
                            i18n: i18n( 'task-schema.Urgency_E.HIGH' ),
                            '-de': 'hoch',
                            '-en': 'High'
                        },
                        {
                            'val': 4,
                            i18n: i18n( 'task-schema.Urgency_E.URGENT' ),
                            '-de': 'sehr hoch',
                            '-en': 'Very High'
                        }
                    ],
                    "rule-engine": {}
                },

                Status_E: {
                    type: 'String',
                    'default': 'NEW',
                    i18n: i18n( 'task-schema.Task_T.status.i18n' ),
                    '-en': 'Status',
                    '-de': 'Status',
                    'list': [
                        {
                            'val': 'NEW',
                            i18n: i18n( 'task-schema.Status_E.NEW' ),
                            '-de': 'Neu',
                            '-en': 'New'
                        },
                        {
                            'val': 'ASSIGNED',
                            i18n: i18n( 'task-schema.Status_E.ASSIGNED' ),
                            '-de': 'Zugewiesen',
                            '-en': 'Assigned'
                        },
                        {
                            'val': 'DONE',
                            i18n: i18n( 'task-schema.Status_E.DONE' ),
                            '-de': 'Erledigt',
                            '-en': 'Done'
                        }
                    ],
                    "rule-engine": {}
                },
                TimeInterval_E: {
                    type: 'String',
                    'default': 'Seconds',
                    i18n: i18n( 'task-schema.Task_T.TimeInterval_E.i18n' ),
                    '-en': 'Status',
                    '-de': 'Status',
                    'list': [
                        {
                            'val': 'Seconds',
                            i18n: i18n( 'task-schema.TimeInterval_E.Seconds' ),
                            '-de': 'Seconds',
                            '-en': 'Seconds'
                        },
                        {
                            'val': 'Minutes',
                            i18n: i18n( 'task-schema.TimeInterval_E.Minutes' ),
                            '-de': 'Minutes',
                            '-en': 'Minutes'
                        },
                        {
                            'val': 'Hours',
                            i18n: i18n( 'task-schema.TimeInterval_E.Hours' ),
                            '-de': 'Hours',
                            '-en': 'Hours'
                        },
                        {
                            'val': 'Days',
                            i18n: i18n( 'task-schema.TimeInterval_E.Days' ),
                            '-de': 'Days',
                            '-en': 'Days'
                        }
                    ]
                },
                SystemTaskType_E: {
                    type: 'String',
                    "apiv": { v: 2, queryParam: false },
                    'default': '',
                    i18n: i18n( 'task-schema.TaskType_E.i18n' ),
                    '-en': 'Task Type',
                    '-de': 'Aufgabentyp',
                    'list': createSchemaTaskTypeList()
                },
                TaskActivity_T: {
                    actType: {
                        complex: 'eq',
                        type: 'Activity_E',
                        lib: 'activity',
                        required: true
                    },
                    _id: {
                        type: 'ObjectId',
                        i18n: i18n('task-schema.Activity_T._id.i18n')
                    }
                },
                TaskLink_T: {
                    url: {
                        type: 'String',
                        i18n: i18n( 'task-schema.TaskLink_T.creatorName.i18n' ),
                        '-en': 'Link url',
                        '-de': 'Link Url'
                    },
                    text: {
                        type: 'String',
                        i18n: i18n( 'task-schema.TaskLink_T.creatorName.i18n' ),
                        '-en': 'Link text',
                        '-de': 'Link Text'
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            systemTaskTypes: systemTaskTypes,
            indexes: [
                {
                    key: {
                        "autoGenID": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        'status': 1
                    }
                },
                {
                    key: {
                        'patientId': 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        'creatorId': 1
                    }
                },
                {
                    key: {
                        'roles': 1
                    },
                    indexType: {sparse: true}
                }
            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader', 'calendar-schema', 'location-schema', 'activity-schema' ] }
);