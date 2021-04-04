/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'actionbutton-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module actinbutton-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'ActionButton_T',
                        'lib': types
                    }
                },

                'ActionButton_T': {
                    'name': {
                        "type": "String",
                        "required": true,
                        "validate": "ActionButton_T_name",
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.Name.i18n' ),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    'userId': {
                        "type": "String",
                        required: true
                    },
                    'action': {
                        "type": "any",
                        "required": true,
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.Action.i18n' ),
                        "-en": "Action",
                        "-de": "Aktion"
                    },
                    'actType':{
                        "type": "String",
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.formId.i18n' ),
                        "-en": "Activity type",
                        "-de": "Aktivitätstyp"
                    },
                    'subType':{
                        "type": "String",
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.subType.i18n' ),
                        "-en": "Activity subtype",
                        "-de": "Aktivität subtyp"
                    },
                    'formData': {
                        "type": "any",
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.formId.i18n' ),
                        "-en": "Form",
                        "-de": "Formular"
                    },
                    'order': {
                        "type": "Number",
                        "required": true
                    },
                    'uri': {
                        "type": "String",
                        "validate": "ActionButton_T_uri",
                        i18n: i18n( 'actionbutton-schema.ActionButton_T.Uri.i18n' ),
                        "-en": "Uri",
                        "-de": "Uri"
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
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
