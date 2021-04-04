/**
 * User: mk
 * Date: 06/24/19  10:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'patientlablog-schema', function( Y, NAME ) {

        const i18n = Y.doccirrus.i18n;
        let types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'PatientLabLog_T',
                        'lib': types
                    }
                },
                'PatientLabLog_T': {
                    'timestamp': {
                        'required': true,
                        'type': 'Date',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.timestamp' )
                    },
                    'status': {
                        'required': true,
                        'complex': 'eq',
                        'type': 'Status_E',
                        'lib': types,
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.status' )
                    },
                    'type': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.type' )
                    },
                    'description': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.description' )
                    },
                    'assignedPatient': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.assignedPatient' )
                    },
                    'configuration': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.configuration' )
                    },
                    'l_data': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.labData' )
                    },
                    'linkedActivities': {
                        'required': true,
                        'type': [String],
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.linkedActivities' )
                    },
                    'errs': {
                        'required': true,
                        'type': [String],
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.errs' )
                    },
                    'pmResults': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'patientlablog-schema.PatientLabLog_T.pmResults' )
                    }
                },
                'Status_E': {
                    'type': 'String',
                    'list': [
                        {
                            'val': 'OPEN',
                            i18n: i18n( 'lablog-schema.Status_E.IMPORTED' )
                        },
                        {
                            'val': 'ASSIGNED',
                            i18n: i18n( 'lablog-schema.Status_E.MUTATED' )
                        },
                        {
                            'val': 'FAILED',
                            i18n: i18n( 'lablog-schema.Status_E.MUTATED' )
                        }
                    ],
                    i18n: i18n( 'lablog-schema.Lablog_T.status' )
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dccommonutils',
            'dcschemaloader',
            'dcvalidations'
        ]
    }
);
