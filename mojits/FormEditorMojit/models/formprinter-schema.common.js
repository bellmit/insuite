/**
 *  User: Richard Strickland
 *  Date: Oct 2015
 *  (c) 2014, Doc Cirrus GmbH, Berlin
 *
 *  This model records user assignment of forms to local printers
 *
 *  Forms from the standard set must be assigned to printers on the client's network.  This may be done per user,
 *  and a generic, fallback set of associations can be used if the user has not configured personal preferences
 *
 *  Each document in the collection has an identityId (user identityId or 'default') and as set of
 *  form -> printer mappings.
 *
 *  When a form is printed the system will first check if the user has specified a printer for it to be sent to.
 *
 *  If no printer has been selected for the form by the current user, the default set of assignments will be checked.
 *
 *  If no mapping is set for the form in the default set then the user will be presented with the browser's print
 *  dialog.
 */

/*jslint latedef:false */
/*global YUI*/

YUI.add(
    /* YUI module name */
    'formprinter-schema',

    /* Constructor */
    function( Y, NAME ) {

        'use strict';
        Y.log( 'Loading Model ' + NAME, 'info', NAME );

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
            { key: {'identityId':1} },
            { key: {'locationId':1} },
            { key: {'canonicalId':1} }
        ];

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "FormPrinter_T",
                    "lib": types
                }
            },
            "FormPrinter_T": {
                "identityId": {                         //  of user, or 'default'
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'formprinter-schema.FormPrinter_T.identityId' ),
                    "-en": "identityId",
                    "-de": "identityId"
                },
                "locationId": {                         //  further printer settings are stored on location objects
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'formprinter-schema.FormPrinter_T.locationId' ),
                    "-en": "locationId",
                    "-de": "locationId"
                },
                "canonicalId": {                        //  _id of a formtemplate object
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'formprinter-schema.FormPrinter_T.assignments' ),
                    "-en": "form template id",
                    "-de": "form template id"
                },
                "printerName": {                        //  name of a CUPS printer
                    "type": "String",
                    "required": true,
                    i18n: i18n( 'formprinter-schema.FormPrinter_T.assignments' ),
                    "-en": "printer name",
                    "-de": "Druckername"
                },
                "alternatives": {
                    "type": [String],
                    "required": false,
                    i18n: i18n( 'formprinter-schema.FormPrinter_T.assignments' ),
                    "-en": "alternative printers",
                    "-de": "alternativen Druckern"
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