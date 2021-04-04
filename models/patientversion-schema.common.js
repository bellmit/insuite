/**
 * User: rrrw
 * Date: 07/04/2014  15:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'patientversion-schema', function( Y, NAME ) {

        var
        // ------- Schema definitions  -------

            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Patient_T",
                        "lib": "patient"
                    },
                    timestamp: { type: "date" },
                    patientId: { type: "String" }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
            {
                key: {
                    "patientId": 1
                }
            }],

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader','patient-schema']}
);
