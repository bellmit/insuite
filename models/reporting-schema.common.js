/*global YUI */
YUI.add( 'reporting-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The CaseFolder_T entry schema,
         *
         * @module 'reporting-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            additionalTypes = Object.freeze( {
                QUOTATION: 'QUOTATION'
            } ),
            modelDefinitions = Object.freeze( {
                patient: ['patientDbId'],
                employee: ['employeeId'],
                location: ['locId'],
                activity: ['activityId'],
                physician: ['basecontactId'],
                task: ['taskId'],
                schedule: ['scheduleId'],
                catalogUsage: ['catalogUsageId']
            } );

        function createAdditionalTypeList() {
            var
                result = [];
            Object.keys( additionalTypes ).forEach( function( type ) {
                result.push( {
                    val: additionalTypes[type],
                    i18n: i18n( 'reporting-schema.Additional_E.' + additionalTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );

            return result;
        }

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "reporting_T",
                        "lib": types
                    }
                },
                "reporting_T": {},
                Additional_E: {
                    "type": "string",
                    "list": createAdditionalTypeList,
                    i18n: i18n( 'casefolder-schema.Additional_E.i18n' ),
                    "-en": "Type",
                    "-de": "Typ"
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            modelDefinitions: modelDefinitions,
            indexes: [
                
                //  entityName corresponds to syncreporting types, used to disambiguate very similar entires
                //  of different kinds, such as a document on an invoice which also has invoice fields and activityId
                //  strongly overlapping types are ACTIVITY, DOCUMENT and LABDATA

                {"key": {"entityName": 1}, indexType: {sparse: true}},

                {
                    "key": {
                        "patientId": 1
                    },
                    indexType:{ sparse:true }
                },
                {"key": {"locId": 1}, indexType: {sparse: true}},
                {"key": {"employeeId": 1}, indexType: {sparse: true}},
                {"key": {"timestampDate": 1}, indexType: {sparse: true}},
                {"key": {"patientDbId": 1}, indexType: {sparse: true}},
                {"key": {"basecontactId": 1}, indexType: {sparse: true}},
                {"key": {"caseFolderId": 1}, indexType: {sparse: true}},
                {"key": {"documentId": 1}, indexType: {sparse: true}},
                {"key": {"taskId": 1}, indexType: {sparse: true}},
                {"key": {"actType": 1}, indexType: {sparse: true}},
                {"key": {"labReqReceived": 1}, indexType: {sparse: true}},
                {"key": {"labReqReceived": -1,"isPathological": 1}, indexType: {sparse: true}},
                {"key": {"isPathological": 1}, indexType: {sparse: true}},
                {"key": {"activityId": 1}, indexType: {sparse: true}},
                {"key": {"catalogUsageId": 1}, indexType: {sparse: true}},
                {"key": {"scheduleId": 1}, indexType: {sparse: true}},
                {"key": {"documentContentType": 1}, indexType: {sparse: true}},
                {"key": {"patEmail": 1}, indexType: {sparse: true}}
            ],
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'dcauth'
        ]
    }
);