/*global YUI */
YUI.add( 'shortcut-schema', function( Y, NAME ) {

        'use strict';

        var types = {},
            i18n = Y.doccirrus.i18n,
            actTypesShortcutArray = ['AU', 'REFERRAL', 'PUBPRESCR', 'PRIVPRESCR'];

        function createDefaultShortcuts() {
            var shortcutsArray = [], i, iId;
            for( i = 0; i < 10; i++ ) {
                iId = i + 1;
                shortcutsArray.push( {
                    '_id': ('00000000000000000000000' + (iId)).slice( iId.toString().toString().length - 1, 24 + iId.toString().length ),
                    'name': "shift+ctrl+" + i,
                    'group': 'CaseFileViewModel',
                    'actType': actTypesShortcutArray.length > i ? actTypesShortcutArray[i] : '',
                    'description': ''
                } );
            }
            return shortcutsArray;
        }

        // ------   - Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Shortcut_T",
                        "lib": types
                    }
                },
                "Shortcut_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'shortcut-schema.Shortcut_T.name.i18n' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "group": {
                        "type": "String",
                        i18n: i18n( 'shortcut-schema.Shortcut_T.group.i18n' ),
                        "-en": "group",
                        "-de": "group"
                    },
                    "actType": {
                        "type": "String",
                        i18n: i18n( 'shortcut-schema.Shortcut_T.actType.i18n' ),
                        "-en": "actType",
                        "-de": "actType"
                    },
                    "formId": {
                        "type": "String",
                        validate: "Shortcut_T_formId",
                        i18n: i18n( 'shortcut-schema.Shortcut_T.formId.i18n' ),
                        "-en": "formId",
                        "-de": "formId"
                    },
                    "description": {
                        "type": "String",
                        i18n: i18n( 'shortcut-schema.Shortcut_T.description.i18n' ),
                        "-en": "description",
                        "-de": "description"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,
            defaultItems: createDefaultShortcuts()
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'activity-schema'
        ]
    }
);

