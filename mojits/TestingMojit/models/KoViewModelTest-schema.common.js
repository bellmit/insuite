/**
 * User: ma
 * Date: 26/06/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'KoViewModelTest-schema', function( Y, NAME ) {

        var
            types = {};

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
                        i18n: 'firstname i18n'
                    },
                    "lastname": {
                        "default": "",
                        "required": true,
                        "validate": "kbv.Person_T_lastname",
                        "type": "String",
                        i18n: 'lastname i18n'
                    },
                    "sub1": {
                        "complex": "inc",
                        "type": "Sub_T",
                        "lib": "KoSubViewModelTest",
                        i18n: 'Sub_T i18n'
                    },
                    "sub2": {
                        "complex": "inc",
                        "type": "Sub_T",
                        "lib": "KoSubViewModelTest",
                        i18n: 'Sub_T i18n'
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
            'KoSubViewModelTest-schema'
        ]
    }
);
