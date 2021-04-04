/**
 * User: Richard Strickland
 * Date: 01/02/2013  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add(
    /* YUI module name */
    'form-schema',

    /* Constructor */
    function( Y, NAME ) {

        'use strict';

        /**
         * The FormsEditorMojit data schema / mongoose Schemas.
         *
         * @module FormsEditorMojit
         */

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
                    "type": "Form_T",
                    "lib": types
                }
            },
            "Form_T": {
                "instanceId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.instanceId' ),
                    "-en": "instanceId",
                    "-de": "instanceId"
                },
                "formId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.formId' ),
                    "-en": "formId",
                    "-de": "formId"
                },
                "userId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.userId' ),
                    "-en": "userId",
                    "-de": "userId"
                },
                "title": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.title' ),
                    "-en": "title",
                    "-de": "titel"
                },
                "category": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.category' ),
                    "-en": "Category",
                    "-de": "Kategorie"
                },
                "version": {
                    "type": "number",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.version' ),
                    "-en": "Version",
                    "-de": "Version"
                },
                "revision": {
                    "type": "number",
                    "required": true,
                    i18n: i18n( 'form-schema.Form_T.revision' ),
                    "-en": "Revision",
                    "-de": "Überarbeitung"
                },
                "jsonTemplate": {
                    "type": "object",
                    i18n: i18n( 'form-schema.Form_T.jsonTemplate' ),
                    "-en": "JSON",
                    "-de": "JSON"
                },
                "tCreated": {
                    "type": "date",
                    i18n: i18n( 'form-schema.Form_T.tCreated' ),
                    "-en": "Creation Date",
                    "-de": "Erstellungsdatum"
                },
                "tModified": {
                    "type": "date",
                    i18n: i18n( 'form-schema.Form_T.tModified' ),
                    "-en": "Modification Date",
                    "-de": "Änderungsdatum"
                }
            }

        } );  // end Y.mix



        /*
         {
         instanceId:     { 'type': 'string', 'required': true },       //_ userid_fileName
         formId:         { 'type': 'string', 'required': true },       //_ ties together multiple versions of a form
         userId:         { 'type': 'string', 'required': true },       //_ ID of user who modified this template
         title:          { 'type': 'string', 'required': true },       //_ content of form template
         category:       { 'type': 'string', 'required': true },       //_ 'form'|'panel'|'item'
         version:        { 'type': 'number', 'required': true },
         revision:       { 'type': 'number', 'required': true },
         jsonTemplate:   { 'type': 'object' },
         tCreated:       { 'type': 'date' },                           //_ creation date
         tModified:      { 'type': 'date' }                            //_ last modification date
         }
         */

        Y.namespace( 'doccirrus.schemas' )[schemaName] = {

            // Given the following parameters, the DB Layer set up
            // the schema with default methods (get, put, post, delete, count)
            // and populates these with standard code.

            /* MANDATORY */
            // the schema name of the actual mongoose schema (i.e. mongodb schema - 's' )
            // does not need to correspond to the file name, this could be an obfuscated
            // name too.

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