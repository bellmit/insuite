/**
 * User: Mykhaylo Dolishniy
 * Date: 06/30/16  11:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'v_rulenode-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The rulenode API allows update rules inside existed rule set."
                }
            },
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "apiv": {v: 2, queryParam: false},
                        "type": "RuleNodeRules_T" ,
                        "lib": types
                    }
                },
                "RuleNodeRules_T": {
                    "rules": {
                        "complex": "inc",
                        "apiv": {v: 2, queryParam: false},
                        "type": "RuleNode_T" ,
                        "lib": types
                    }
                },
                "RuleNode_T": {
                    "isActive": {
                        "type": "Boolean",
                        "apiv": {v: 2, queryParam: false},
                        "default": true,
                        i18n: i18n( 'v_rulenode-schema.RuleNode_T.isActive.i18n' ),
                        "-en": "isActive",
                        "-de": "isActive"
                    },
                    "description": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'v_rulenode-schema.RuleNode_T.description.i18n' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    "validations": {
                        type: "Object",
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Regelknoten Bestätigung",
                        "-en": "Rule Node Validations"
                    },
                    "actions": {
                        complex: 'inc',
                        "type": "RuleNodeAction_T",
                        "apiv": {v: 2, queryParam: false},
                        lib: types,
                        i18n: i18n( 'v_rulenode-schema.RuleNode_T.actions.i18n' ),
                        "-de": "Regelknoten Aktionen",
                        "-en": "Rule Node Actions"
                    }
                },

                "RuleNodeAction_T": {
                    type: {
                        complex: 'eq',
                        type: 'RuleNodeActionTypes_E',
                        lib: types,
                        "-de": "Typ",
                        "-en": "Type"
                    }
                },
                "RuleNodeActionTypes_E": {
                    "type": "String",
                    i18n: i18n( 'v_rulenode-schema.RuleNodeActionTypes_E.action.i18n' ),
                    "list": [
                        {
                            "val": "ERROR",
                            i18n: i18n( 'v_rulenode-schema.RuleNodeActionTypes_E.error.i18n' ),
                            "-de": "Fehler",
                            "-en": "Error"
                        },
                        {
                            "val": "WARNING",
                            i18n: i18n( 'v_rulenode-schema.RuleNodeActionTypes_E.warning.i18n' ),
                            "-de": "Warnung",
                            "-en": "Warning"
                        }

                    ]
                }

            }
        );


        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            ramlConfig: ramlConfig,

            name: NAME
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
