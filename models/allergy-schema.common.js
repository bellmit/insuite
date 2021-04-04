/*global YUI */
'use strict';

YUI.add( 'allergy-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCAllergy - collection of allergies
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                "2": {
                    description: "The allergy collection holds all data relevant to a possible patient allergies."
                }
            },
            defaultItems = [
                {"name":"Penicilline", "thCode":"VCG63445", "_id": "000000000000000000000011"},
                {"name":"Penicilline mit breitem Wirkungsspektrum", "thCode":"VCG63448", "_id": "000000000000000000000012"},
                {"name":"Oxicame", "thCode":"VCG63394", "_id": "000000000000000000000013"},
                {"name":"Arylpropionsaeuren", "thCode":"VCG88458", "_id": "000000000000000000000014"},
                {"name":"Pyrazolidin-Derivate", "thCode":"VCG88461", "_id": "000000000000000000000015"},
                {"name":"Magnesiumsalze", "thCode":"VCG65799", "_id": "000000000000000000000016"},
                {"name":"Antidepressiva, tri-/tetracyclische", "thCode":"VCG63415", "_id": "000000000000000000000017"},
                {"name":"Benzamide", "thCode":"VCG63366", "_id": "000000000000000000000018"},
                {"name":"Biguanide", "thCode":"VCG88510", "_id": "000000000000000000000019"},
                {"name":"Chinolone", "thCode":"VCG63375", "_id": "00000000000000000000001a"},
                {"name":"Carbapeneme", "thCode":"VCG88502", "_id": "00000000000000000000001b"},
                {"name":"Nitroimidazole", "thCode":"VCG88606", "_id": "00000000000000000000001c"},
                {"name":"Tetracycline", "thCode":"VCG63407", "_id": "00000000000000000000001d"}
            ],
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Allergy_T",
                        "lib": types
                    }
                },
                "Allergy_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'allergy-schema.Allergy_T.name.i18n' )
                    },
                    "thCode": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'allergy-schema.Allergy_T.thcode.i18n' )
                    }
                }
           }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            ramlConfig: ramlConfig,
            defaultItems: defaultItems,
            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader', 'doccirrus']
    }
);
