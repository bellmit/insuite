/**
 * User: do
 * Date: 15/10/15  13:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'omimchain-schema', function( Y, NAME ) {

        'use strict';

        /**§
         * The OmimChain_T entry schema,
         *
         * @module 'omimchain-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "OmimChain_T",
                        "lib": types
                    }
                },
                "OmimChain_T": {
                    "chainName": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChain_T.chainName' ),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    "description": {
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChain_T.description' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    "chain": {
                        "complex": "inc",
                        "type": "OmimChainItem_T",
                        "lib": types,
                        "i18n": i18n( 'omimchain-schema.OmimChain_T.chain' ),
                        "-en": "OMIM Chain",
                        "-de": "OMIM Kette"
                    }
                },
                "OmimChainItem_T": {
                    "omimG": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChainItem_T.omimG' ),
                        "-en": "omimG",
                        "-de": "omimG"
                    },
                    "genName": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChainItem_T.genName' ),
                        "-en": "genName",
                        "-de": "genName"
                    },
                    "omimP": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChainItem_T.omimP' ),
                        "-en": "omimP",
                        "-de": "omimP"
                    },
                    "desc": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'omimchain-schema.OmimChainItem_T.desc' ),
                        "-en": "desc",
                        "-de": "desc"
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
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader']
    }
);
