/**
 * User: florian
 * Date: 18.12.20  10:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'kimaccount-schema', function( Y, NAME ) {
        'use strict';

        /**
         * The kimaccount entry schema,
         *
         * @module kimaccount-schema,
         */
        const i18n = Y.doccirrus.i18n;
        // ------- Schema definitions  -------
        var types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "KIMAccount_T",
                        "lib": types
                    }
                },
                KIMAccount_T: {
                    "uid": {
                        "type": "String",
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.uid.i18n' ),
                        "-en": "UID",
                        "-de": "UID"
                    },
                    loginStatus: {
                        "type": "String",
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.login.i18n' ),
                        "-en": "Login",
                        "-de": "Login"
                    },
                    kimUsername: {
                        "type": "String",
                        unique: true,
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.kimUsername.i18n' ),
                        "-en": "Username",
                        "-de": "Nutzername"
                    },
                    kimPassword: {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.kimPassword.i18n' ),
                        "-en": "Password",
                        "-de": "Passwort"
                    },
                    authorisedUsers: {
                        "type": ["String"],
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.authorisedUsers.i18n' ),
                        "-en": "authorised users",
                        "-de": "authorisierte Nutzer"
                    },
                    tiContext: {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.tiContext.i18n' ),
                        "-en": "TiContext",
                        "-de": "TiContext"
                    },
                    serverAddressPOP: {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.serverAddressPOP.i18n' ),
                        "-en": "Server address",
                        "-de": "Serveradresse"
                    },
                    serverAddressSMTP: {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'kimaccount-schema.KIMAccount_T.serverAddressSMTP.i18n' ),
                        "-en": "Server address",
                        "-de": "Serveradresse"
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
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);