/**
 * User: ma
 * Date: 26/06/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'dummy-schema', function( Y, NAME ) {

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        function distinctEmails( val ) {
            return val && val[0] && val[1] && val[0].email !== val[1].email;
        }

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Basic_T",
                        "lib": types
                    }
                },
                "Basic_T": {
                    "firstname": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        "validate": "kbv.Person_T_firstname",
                        i18n: i18n( 'dummy-schema.Basic_T.firstname' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    "lastname": {
                        "default": "",
                        "required": true,
                        "validate": "kbv.Person_T_lastname",
                        "type": "String",
                        i18n: i18n( 'dummy-schema.Basic_T.lastname' ),
                        "-en": "Surname",
                        "-de": "Nachname"
                    },
                    "age": {
                        "default": "",
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'dummy-schema.Basic_T.age' ),
                        "-en": "age",
                        "-de": "age"
                    },
                    "emails": {
                        "complex": "inc",
                        "type": "email_T",
                        "validate": [
                            {validator: distinctEmails, msg: 'emails are duplicated'}
                        ],
                        "required": true,
                        "lib": types,
                        i18n: i18n( 'dummy-schema.Basic_T.emails.i18n' ),
                        "-en": "nestedDoc",
                        "-de": "nestedDoc"
                    }
                },
                "email_T": {
                    "email": {
                        "required": true,
                        "validate": "email",
                        "type": "String",
                        i18n: i18n( 'dummy-schema.email_T.email.i18n' ),
                        "-en": "email",
                        "-de": "email"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            getReadOnlyFields: function() {
                var
                    paths = [];
                return paths;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
