/**
 * User: do
 * Date: 15/10/15  13:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'budget-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The Budget_T entry schema,
         *
         * @module 'budget-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Budget_T",
                        "lib": types
                    }
                },
                "Budget_T": {
                    "budgetType": {
                        "complex": "eq",
                        "type": "BudgetType_E",
                        "lib": types,
                        "required": true
                    },
                    "quarter": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'budget-schema.Budget_T.quarter.i18n' ),
                        "-en": "Quarter",
                        "-de": "Quartal"
                    },
                    "year": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'budget-schema.Budget_T.year.i18n' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "locationId": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'budget-schema.Budget_T.locationId.i18n' ),
                        "-en": "locationId",
                        "-de": "locationId"
                    },
                    "locationName": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'budget-schema.Budget_T.locationName.i18n' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "totalBudget": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'budget-schema.Budget_T.totalBudget.i18n' ),
                        "-en": "Total Budget",
                        "-de": "Gesamt Budget"
                    },
                    "totalBudgetComposition": {
                        "type": "String",
                        i18n: 'Zusammensetzung',
                        "-en": "Total Budget Composition",
                        "-de": "Gesamt Budget Zusammensetzung"
                    },
                    "spentBudget": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'budget-schema.Budget_T.spentBudget.i18n' ),
                        "-en": "Spent",
                        "-de": "Verbraucht"
                    },
                    "diffBudget": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'budget-schema.Budget_T.diffBudget.i18n' ),
                        "-en": "Difference",
                        "-de": "Differenz"
                    },
                    "percBudget": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'budget-schema.Budget_T.percBudget.i18n' ),
                        "-en": "Percentage",
                        "-de": "Prozentual"
                    },
                    "specialities": {
                        "type": [String],
                        i18n: i18n( 'employee-schema.Employee_T.specialities' ),
                        "-en": "Specialisations",
                        "-de": "Fachgebiete"
                    }
                },
                "BudgetType_E": {
                    "type": "String",
                    "required": true,
                    "list": [
                        {
                            "val": "MEDICATION",
                            "-de": "Medikamentenbudget",
                            i18n: i18n( 'budget-schema.BudgetType_E.MEDICATION.i18n' ),
                            "-en": "Medication Budget"
                        },
                        {
                            "val": "UTILITY",
                            "-de": "Heilmittelbudget",
                            i18n: i18n( 'budget-schema.BudgetType_E.UTILITY.i18n' ),
                            "-en": "Utility Budget"
                        },
                        {
                            "val": "KBVUTILITY",
                            "-de": "Heilmittelbudget",
                            i18n: i18n( 'budget-schema.BudgetType_E.UTILITY.i18n' ),
                            "-en": "Utility Budget"
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader']
    }
);
