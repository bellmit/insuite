/**
 * User: cb
 * Date: 01/02/2013  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add(
    /* YUI module name */
    'formfolder-schema',

    /* Constructor */
    function( Y, NAME ) {

        'use strict';
        Y.log( 'Loading Model ' + NAME, 'info', NAME );

        /**
         * The FormsEditorMojit data schema / mongoose Schemas.
         *
         * @module FormsEditorMojit
         */

        //  TODO: licences

        const
            defaultFormFolders = [
                {
                    "_id": '000000000000000000000601',
                    "canonical": "BG",
                    "en": "BG",
                    "de": "BG",
                    "countryMode": [ 'D' ]
                },
                {
                    "_id": '000000000000000000000602',
                    "canonical": "Briefvorlagen",
                    "en": "Form Letters",
                    "de": "Briefvorlagen"
                },
                {
                    "_id": '000000000000000000000603',
                    "canonical": "Envelopes",
                    "en": "Envelopes",
                    "de": "Briefumschläge"
                },
                {
                    "_id": '000000000000000000000604',
                    "canonical": "eDMP",
                    "en": "eDMP",
                    "de": "eDMP",
                    "licence": "edmp"
                },
                {
                    "_id": '000000000000000000000605',
                    "canonical": "QM-Frageboegen",
                    "en": "Questionnaire",
                    "de": "Frageboegen"
                },
                {
                    "_id": '000000000000000000000606',
                    "canonical": "Rezept",
                    "en": "Prescription Forms",
                    "de": "Rezepte Formulare",
                    "countryMode": [ 'D' ]

                },
                {
                    "_id": '000000000000000000000607',
                    "canonical": "Standard Formulare",
                    "en": "Standard Forms",
                    "de": "Standard Formulare",
                    "countryMode": [ 'D' ]
                },
                {
                    "_id": '000000000000000000000608',
                    "canonical": "Archiv",
                    "en": "Archived forms",
                    "de": "Archiv"
                },
                {
                    "_id": '000000000000000000000609',
                    "canonical": "GHD",
                    "en": "Care",
                    "de": "Care",
                    "licence": "care"
                },
                {
                    "_id": '000000000000000000000610',
                    "canonical": "Briefkopf",
                    "en": "Letterhead",
                    "de": "Briefkopf"
                },
                {
                    "_id": '000000000000000000000611',
                    "canonical": "inGyn",
                    "en": "inGyn",
                    "de": "inGyn",
                    "licence": "gyn"
                },
                {
                    "_id": '000000000000000000000612',
                    "canonical": "inPedia",
                    "en": "inPedia",
                    "de": "inPedia",
                    "licence": "pedia"
                },
                {
                    "_id": '000000000000000000000613',
                    "canonical": "inSight2",
                    "en": "inSight",
                    "de": "inSight"
                },
                {
                    "_id": '000000000000000000000614',
                    "canonical": "Telekardio",
                    "en": "Telecardio",
                    "de": "Telecardio",
                    "licence": "cardio"
                },
                {
                    "_id": '000000000000000000000615',
                    "canonical": "DOQUVIDE",
                    "en": "DOQUVIDE",
                    "de": "DOQUVIDE",
                    "licence": "doquvide"
                },
                {
                    "_id": '000000000000000000000616',
                    "canonical": "DQS",
                    "en": "DQS / DQS RS",
                    "de": "DQS / DQS RS",
                    "licence": "dqs"
                },
                {
                    "_id": '000000000000000000000617',
                    "canonical": "Test",
                    "en": "Test",
                    "de": "Test"
                },
                {                                           //  lost and found
                    "_id": '000000000000000000000699',
                    "canonical": "Recovered",
                    "en": "Recovered",
                    "de": "Recovered"
                },
                {
                    "_id": '000000000000000000000700',
                    "canonical": "inSpector",
                    "en": "inSpector Forms",
                    "de": "inSpector Formulare"
                }
            ];

        /*
         *  Schema definitions
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            indexes,
            schemaName = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        indexes = [
            { key: {'instanceId':1} }
        ];

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "Formfolder_T",
                    "lib": types
                }
            },
            "Formfolder_T": {
                "parentId": {
                    "type": "String",
                    "required": false,
                    i18n: i18n( 'folder-schema.Formfolder_T.parentId' ),
                    "-en": "title",
                    "-de": "titel"
                },
                "isDefault": {
                    "type": "Boolean",
                    "required": true,
                    i18n: i18n( 'folder-schema.Formfolder_T.isDefault' ),
                    "-en": "Is default form folder",
                    "-de": "isDefault"
                },
                "licence": {
                    "type": "String",
                    "required": false,
                    i18n: i18n( 'folder-schema.Formfolder_T.licence' ),
                    "-en": "licence",
                    "-de": "licence"
                },
                "countryMode": {
                    "type": [String],
                    "required": false,
                    i18n: i18n( 'folder-schema.Formfolder_T.countryMode' ),
                    "-en": "Country modes",
                    "-de": "Lander Modus"
                },
                "en": {
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'folder-schema.Formfolder_T.en' ),
                    "-en": "title",
                    "-de": "titel"
                },
                "de": {
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'folder-schema.Formfolder_T.de' ),
                    "-en": "title",
                    "-de": "titel"
                },
                "tCreated": {
                    "type": "Date",
                    i18n: i18n( 'folder-schema.Formfolder_T.tCreated' ),
                    "-en": "Creation Date",
                    "-de": "Erstellungsdatum"
                },
                "tModified": {
                    "type": "Date",
                    i18n: i18n( 'folder-schema.Formfolder_T.tModified' ),
                    "-en": "Modification Date",
                    "-de": "Änderungsdatum"
                }
            }

        } );  // end Y.mix



        Y.namespace( 'doccirrus.schemas' )[schemaName] = {

            // Given the following parameters, the DB Layer set up
            // the schema with default methods (get, put, post, delete, count)
            // and populates these with standard code.

            /* MANDATORY */
            // the schema name of the actual mongoose schema (i.e. mongodb schema - 's' )
            // does not need to correspond to the file name, this could be an obfuscated
            // name too.

            defaultFormFolders: defaultFormFolders,

            //  lost and found
            recoveryFolderId: '000000000000000000000699',
            archivFolderId: '000000000000000000000608',

            name: schemaName,

            /* MANDATORY */
            db: Y.doccirrus.schemaloader.MONGO_CLOUD_DATABASE_NAME,

            /* MANDATORY */
            types: types,

            /* OPTIONAL -- if there is no index, then key field searches cannot be carried out on this schema. */
            indexes: indexes,

            isInitialized: false                       //_ set to true when setup has been run

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[schemaName], true );
    },

    /* Min version */
    '0.0.1',

    /* Dependancies */
    {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);
