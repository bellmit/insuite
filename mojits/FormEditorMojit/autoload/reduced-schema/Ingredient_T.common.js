/*
 *  Copyright DocCirrus GmbH 2020
 *
 *  Defines flat list of properties for active ingredients in Wirkstoffplan/INGREDIENTPLAN activites, extends MedData_T
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Ingredient-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Ingredient_T = {};

        var
            k,
            additionalData = {
                "comment": {
                    "type": "String",
                    "label": {
                        "en": "Comment",
                        "de": "Kommentar"
                    }
                },
                "group": {
                    "type": "String",
                    "label": {
                        "en": "Group",
                        "de": "Gruppe"
                    }
                },
                "dosis": {
                    "type": "String",
                    "label": {
                        "en": "Dosis",
                        "de": "Dosis"
                    }
                },
                "initialDosis": {
                    "type": "String",
                    "label": {
                        "en": "Start dosis",
                        "de": "Start-Dosis"
                    }
                },
                "targetDosis": {
                    "type": "String",
                    "label": {
                        "en": "Target Dosis",
                        "de": "Ziel-Dosis"
                    }
                },
                "noteOnAdaption": {
                    "type": "String",
                    "label": {
                        "en": "Note on adaptation",
                        "de": "Anpassung"
                    }
                },
                "stage": {
                    "type": "String",
                    "label": {
                        "en": "stage",
                        "de": "Stufe"
                    }
                },
                "strength": {
                    "type": "String",
                    "label": {
                        "en": "Strength",
                        "de": "Wirkstärke"
                    }
                },
                "miniChart": {
                    "type": "String",
                    "label": {
                        "en": "Chart",
                        "de": "Bild"
                    }
                }
            };

        for ( k in Y.dcforms.schema.MedData_T ) {
            if ( Y.dcforms.schema.MedData_T.hasOwnProperty( k ) ) {
                Y.dcforms.schema.Ingredient_T[k] = Y.dcforms.schema.MedData_T[k];
            }
        }

        for ( k in additionalData ) {
            if ( additionalData.hasOwnProperty( k ) ) {
                Y.dcforms.schema.Ingredient_T[k] = additionalData[k];
            }
        }

        //  renamed at request of client
        Y.dcforms.schema.Ingredient_T.value.label.de = 'Aktuelle';

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-schema-MedData-T' ]
    }
);
