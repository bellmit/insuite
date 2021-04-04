/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'metaprac-schema', function( Y, NAME ) {

        /**
         *
         * meta information about all practices in the DC cloud.
         *
         * Here we keep info about how to access a PRC.
         *
         */

        var
        // ------- private 'constants'  -------

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = {
            "root": {
                "customerIdPrac": {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.customerIdPrac' ),
                    "-en": "customerIdPrac",
                    "-de": "customerIdPrac"
                },
                "host": {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.host' ),
                    "-en": "host",
                    "-de": "host"
                },
                "pubKey": {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.pubKey' ),
                    "-en": "pubKey",
                    "-de": "pubKey"
                },
                "secret": {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.secret' ),
                    "-en": "secret",
                    "-de": "secret"
                },
                "systemId": {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.systemId' ),
                    "-en": "source id",
                    "-de": "source id"
                },
                systemType: {
                    "type": "string",
                    i18n: i18n( 'metaprac-schema.root.systemType' ),
                    "-en": "system sub type",
                    "-de": "system sub type"
                },
                "calendars": [
                    {
                        "type": "string"
                    }
                ],
                "invitations": {
                    "complex": "inc",
                    "type": "invitation_T",
                    "lib": types,
                    "-en": "invitations",
                    "-de": "invitations"
                },
                "onlyPracticesPatientsCanBook": {
                    "type": "Boolean",
                    "default": false,
                    i18n: i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' ),
                    "-en": i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' ),
                    "-de": i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' )
                }
            },
            "invitation_T": {
                "pin": {
                    "required": true,
                    "type": "string",
                    "-en": "pin",
                    "-de": "pin"
                },
                "expireDate": {
                    "type": "date",
                    "-en": "expiresOn",
                    "-de": "expiresOn"
                },
                "anonymizing": {
                    "type": "Boolean",
                    "-en": "Anonymizing",
                    "-de": "Anonymisierung"
                },
                "preserveCaseFolder": {
                    "type": "Boolean",
                    "-en": "Preserve case folder",
                    "-de": "Fallordner übernehmen"

                },
                "configuration": {
                    "complex": "inc",
                    "type": "DispatchConfiguration_T",
                    "lib": "partner"

                },
                "bidirectional": {
                    "type": "Boolean",
                    "-en": "Bidirectional",
                    "-de": "Bidirectional"
                },
                "anonymizeKeepFields": {
                    "type": ["String"],
                    "-en": "Keep Fields",
                    "-de": "Felder behalten"
                },
                "pseudonym": {
                    "complex": "inc",
                    "type": "Pseudonym_T",
                    "lib": "partner"
                },
                "unlock": {
                    "type": "Boolean",
                    "-en": "Unlock activity",
                    "-de": "Aktivität freischalten"
                }
            }
        };

        // -------- Our Schema Methods and Hooks are defined here -------

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Static Helper Functions defined here -------

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito'
        ]
    }
);
