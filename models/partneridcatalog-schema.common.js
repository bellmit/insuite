/**
 * User: md
 * Date: 02/11/18  13:37
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
YUI.add( 'partneridcatalog-schema', function( Y, NAME ) {

        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Applications can register themselves in the patient care section. A typical workflow is as follows:<br/>* /2/partneridcatalog is extended with a new unique code<br/>* a license with this code is granted to the datasafe in question<br/>* now users see the section and name in the patient info, and the information flows into the patient.partnerIds array."
                }
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "PartnerIdCatalog_T",
                        "lib": types
                    }
                },
                "PartnerIdCatalog_T": {
                    "code": {
                        "required": true,
                        "unique": true,
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'partneridcatalog-schema.PartnerIdCatalog_T.code.i18n' ),
                        "-en": "Code",
                        "-de": "Kode"
                    },
                    "name": {
                        "required": true,
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'partneridcatalog-schema.PartnerIdCatalog_T.name.i18n' ),
                        "-en": "Name",
                        "-de": "Name"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,
            ramlConfig: ramlConfig
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader']
    }
);
