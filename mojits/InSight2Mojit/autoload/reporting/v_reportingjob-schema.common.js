

/*global YUI*/
'use strict';

YUI.add( 'v_reportingjob-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    // This description is not in use. The description for the raml is taken from appendix.raml
                    description: "The endpoint exposes special POST methods to manage different reporting jobs via REST /2.<ul>" +
                                 "<li>Create a CSV file from an inSuite report. " +
                                 "It requires to hand over an insightConfigId of a specific report. " +
                                 "Other parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/reportingjob/:outputCsv <br>" +
                                 "POST { insightConfigId:\"5dfd3210b832a21249999234\", fileName:\"test.csv\" }</pre></li>" +
                                 "</ul>"
                }
            },
            types = {};

        types = Y.mix( types, {

            "root": {
                "base": {
                    "complex": "ext",
                    "type": "VCsv_T",
                    "lib": types
                }
            },
            "VCsv_T": {
                "insightConfigId": {
                    "type": "string",
                    "required": true,
                    "apiv": {v: 2, queryParam: false}
                },
                "startDate": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "endDate": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "separator": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "fileName": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            ramlConfig: ramlConfig,
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
