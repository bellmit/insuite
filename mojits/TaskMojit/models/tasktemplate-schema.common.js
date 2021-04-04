/*global YUI*/
YUI.add( 'tasktemplate-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'TaskTemplate_T',
                        lib: types
                    }
                },
                'TaskTemplate_T': {
                    title: {
                        type: 'String',
                        required: true,
                        i18n: i18n( 'task-schema.Task_T.title.i18n' ),
                        '-en': 'Title',
                        '-de': 'Titel'
                    },
                    urgency: {
                        complex: 'eq',
                        type: 'Urgency_E',
                        lib: 'task'
                    },
                    details: {
                        default: '',
                        type: 'String',
                        i18n: i18n( 'task-schema.Task_T.details.i18n' ),
                        '-en': 'Details',
                        '-de': 'Details'
                    },
                    roles: {
                        type: ['String'],
                        i18n: i18n( 'task-schema.Task_T.roles.i18n' ),
                        validate: "Task_T_rolesOrCandidates",
                        '-en': 'Roles',
                        '-de': 'Roles'
                    },
                    candidates: {
                        type: ['String'],
                        i18n: i18n( 'task-schema.Task_T.candidates.i18n' ),
                        validate: "Task_T_rolesOrCandidates",
                        '-en': 'Candidates',
                        '-de': 'Candidates'
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
                    creatorId: {
                        type: 'String',
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
                        i18n: i18n( 'task-schema.Task_T.dateCreated.i18n' ),
                        "-en": "Created",
                        "-de": "Erstelldatum"
                    },
                    formId: {
                        type: 'String',
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.formId.i18n' ),
                        '-en': 'Form ID',
                        '-de': 'Formular ID'
                    },
                    caseFolder: {
                        default: '',
                        type: 'String',
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.caseFolder.i18n' ),
                        '-en': 'Select casefolder',
                        '-de': 'Erzeugen in Fall'
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
                    },
                    actType: {
                        complex: 'eq',
                        "type": "Activity_E",
                        "lib": 'activity'
                    },
                    "caseFolderType": {
                        "type": "String",
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.caseFolderType.i18n' ),
                        "-en": "caseFolderType",
                        "-de": "caseFolderType"
                    },
                    "catalogShort": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Catalog_T.catalogShort.i18n' ),
                        "-en": "catalogShort",
                        "-de": "catalogShort"
                    },
                    "code": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Catalog_T.code.i18n' ),
                        "-en": "code",
                        "-de": "Kode"
                    },
                    diagnosisCert: {
                        complex: 'eq',
                        "type": "DiagnosisCert_E",
                        "lib": 'activity'
                    },
                    "toCreate": {
                        "type": "Number",
                        default: 1,
                        i18n: i18n( 'activity-schema.Activity_T.toCreate.i18n' ),
                        "-en": "Number Of Activities",
                        "-de": "Zahl der Aktivitäten"
                    },
                    "explanations": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Activity_T.explanations.i18n' ),
                        "-en": "Explanations",
                        "-de": "Begründung"
                    },
                    "comment": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Activity_T.comment.i18n' ),
                        "-en": "Comment",
                        "-de": "Beschreibung"
                    },
                    "linkActivities": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'activity-schema.TaskTemplate_T.linkActivities.i18n' ),
                        "-en": "Link activities",
                        "-de": "Aktivität verlinden"
                    },
                    "autoCreate": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'activity-schema.TaskTemplate_T.autoCreate.i18n' ),
                        "-en": "Create activities without user action",
                        "-de": "Aktivitäten ohne Rückfrage anlagen"
                    },
                    "notDeletable": {
                        "type": "Boolean",
                        i18n: i18n( 'activity-schema.Activity_T.notDeletable.i18n' ),
                        "-en": "Not deletable",
                        "-de": "Nicht löschbar"
                    },
                    "tempateID": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.TaskTemplate_T.tempateID.i18n' ),
                        "-en": "tempateID",
                        "-de": "tempateID"
                    },
                    "markers": {
                        "type": [String],
                        i18n: i18n( 'patient-schema.Patient_T.markers' ),
                        "-en": "Labels",
                        "-de": "Marker"
                    },
                    type: {
                        complex: 'eq',
                        type: 'SystemTaskType_E',
                        lib: 'task'
                    },
                    taskType: {
                        "type": "String",
                        i18n: i18n( 'tasktype-schema.TaskType_E.i18n' ),
                        '-en': 'Task Type',
                        '-de': 'Aufgabentyp'
                    },
                    filenameRegexp: {
                        "type": "String",
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.filenameRegexp.i18n' ),
                        '-en': 'Filename regexp',
                        '-de': 'Dateiname regexp'
                    },
                    arrayFieldPath: {
                        "type": "String",
                        i18n: i18n( 'tasktemplate-schema.TaskTemplate_T.arrayFieldPath.i18n' ),
                        '-en': 'Copy Field',
                        '-de': 'Kopie Feld'
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
    '0.0.1', { requires: ['dcvalidations', 'dcschemaloader', 'task-schema', 'activity-schema'] }
);