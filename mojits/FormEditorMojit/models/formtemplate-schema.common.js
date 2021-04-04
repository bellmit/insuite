/**
 *  User: Richard Strickland
 *  Date: 20/05/2014  15:45
 *  (c) 2014, Doc Cirrus GmbH, Berlin
 *
 *  This model replaces forms model (via migration) and changes referencing of forms and their versions
 */

/*jslint latedef:false */
/*global YUI*/

'use strict';

YUI.add(
    /* YUI module name */
    'formtemplate-schema',

    /* Constructor */
    function( Y, NAME ) {
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

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "Form_T",
                    "lib": types
                }
            },
            "Form_T": {
                "formId": {                                     //  legacy, for migration only
                    "type": "string",                           //  canonical identifier is now the _id of this object
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.formId' ),
                    "-en": "formId",
                    "-de": "formId"
                },
                "formatVersion": {                              //  for migration of forms set
                    "type": "number",                           //  starting from 1
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.formatVersion' ),
                    "-en": "formatVersion",
                    "-de": "formatVersion"
                },
                "userId": {                                     //  _id of the user who last edited this form
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.userId' ),
                    "-en": "userId",
                    "-de": "userId"
                },
                "title": {                                      //  DEPRECATED
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.title' ),
                    "-en": "title",
                    "-de": "titel"
                },
                "formFolderId": {
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.formFolderId' ),
                    "-en": "Folder ID",
                    "-de": "Folder ID"
                },
                "category": {                                   //  DEPRECATED
                    "type": "string",
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.category' ),
                    "-en": "Category",
                    "-de": "Kategorie"
                },
                "version": {                                    //  informational only
                    "type": "number",                           //  canonical version will be in the revisions table
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.version' ),
                    "-en": "Version",
                    "-de": "Version"
                },
                "isReadOnly": {                                  //  true for default forms supplied by DC
                    "type": "boolean",                           //  canonical version will be in the revisions table
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.isReadOnly' ),
                    "-en": "Version",
                    "-de": "Version"
                },
                "latestVersionId": {                            //  updated whenever a new version is created
                    "type": "string",                           //  canonical version will be in the revisions table
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.latestVersionId' ),
                    "-en": "Latest Version Id",
                    "-de": "Latest Version Id"
                },
                "revision": {                                   //  incremented by saves from the client
                    "type": "number",
                    "required": true,
                    i18n: i18n( 'formtemplate-schema.Form_T.revision' ),
                    "-en": "Revision",
                    "-de": "Überarbeitung"
                },
                "jsonTemplate": {                               //  The actual content of the form template
                    "type": "object",                           //  TODO: add format of this object to types
                    i18n: i18n( 'formtemplate-schema.Form_T.jsonTemplate' ),
                    "-en": "JSON",
                    "-de": "JSON"
                },
                "defaultFor": {                                 //  role this form should be assigned to
                    "type": "string",
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.defaultFor' ),
                    "-en": "Revision",
                    "-de": "Überarbeitung"
                },
                "dependsOn": {
                    "type": "string",
                    "required": false,
                    i18n: i18n( 'formtemplate-schema.Form_T.dependsOn' ),
                    "-en": "Depends on",
                    "-de": "hängt davon ab"
                },
                "tCreated": {
                    "type": "date",
                    i18n: i18n( 'formtemplate-schema.Form_T.tCreated' ),
                    "-en": "Creation Date",
                    "-de": "Erstellungsdatum"
                },
                "tModified": {
                    "type": "date",
                    i18n: i18n( 'formtemplate-schema.Form_T.tModified' ),
                    "-en": "Modification Date",
                    "-de": "Änderungsdatum"
                },
                "lastChanged": {
                    "type": "Date",
                    i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                    "-en": "last changed",
                    "-de": "zuletzt geändert"
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

            isInitialized: false,                       //_ set to true when setup has been run

            /**
             *  Create a new form version - copy the current canonical version of the form to the
             *  formtemplateversion collection with a new version number
             *
             *  This no longer belongs in 'common' and has been moved to historyutils.server.js
             *
             *  @param  user        {Object}    ac REST user object
             *  @param  templateObj {Object}    a form template as loaded form database
             *  @param  revComment  {String}    comment on why a new version was created
             *  @param  callback    {Function}  of the form fn(err, newVersionId, newVersionNo)
             */

            createNewVersion: function(user, templateObj, revComment, callback) {

                Y.log('DEPRECATED: createNewVersion, please use Y.doccirrus.forms.historyutils.addVersion(...)', 'warn', NAME);
                Y.doccirrus.forms.historyutils.addVersion(user, templateObj, revComment, callback);

            },

            /**
             *  Create a new form version - as above but taking the _id of the canonical
             *  template rather than the whole object, wrapper for convenience
             *
             *  This no longer belongs in 'common' and has been moved to historyutils.server.js
             *
             *  @param  user        {Object}    ac REST user object
             *  @param  canonicalId {String}    database _id of a form template
             *  @param  revComment  {String}    comment on why we're making a version
             *  @param  callback    {Function}  of the form fn(err, versionId, versionNo)
             */

            createNewVersionById: function(user, canonicalId, revComment, callback) {

                Y.log('DEPRECATED: createNewVersionById, please use Y.doccirrus.forms.historyutils.addVersionById(...)', 'warn', NAME);
                Y.doccirrus.forms.historyutils.addVersionById(user, canonicalId, revComment, callback);

            },

            /**
             *  Make a list of versions of this form template (from formtemplatversions collection)
             *
             *  A reduced listing is returned, summarizing the revision history
             *  This is for generalization with form import and future migration of /r/forms/listformvversion
             *
             *  Response is array of objects like:
             *
             *      {
             *          _id:            String
             *          title:          Object, lang code -> localized title
             *          version:        Number
             *          revision:       Number
             *          revComment:     String, may be empty
             *          tCreated:       Date
             *      }
             *
             *  This no longer belongs in 'common' and have been moved to historyutils.server.js
             *
             *  @param  user        {Object}    REST user or equivalent
             *  @param  canonicalId {String}    Common to all form versions
             *  @param  callback    {Function}  Of the form fn(err, data)
             */

            listVersions: function(user, canonicalId, callback) {

                Y.log('DEPRECATED: please use Y.doccirrus.forms.historyutils.listVersions(...)', 'warn', NAME);

                Y.doccirrus.forms.historyutils.listVersions(user, canonicalId, callback);

            },

            'makeToolTip': function(formTemplate) {
                var
                    jT = formTemplate.jsonTemplate,
                    orientation = ((jT.orientation || 'portrait') === 'portrait') ? 'Hochformat' : 'Querformat',
                    paperName = Y.dcforms.getPaperSizeName(jT.width, jT.height),
                    tip = '';

                if ('Custom' === paperName) {
                    tip = jT.width + 'x' + jT.height + ' ';
                } else {
                    tip = paperName + ' ';
                }

                if ( jT.pages && jT.pages.length ) {
                    tip = tip + orientation + ' x' + jT.pages.length + ';';
                }

                if (true === jT.isFixed || 'true' === jT.isFixed) {
                    tip = tip + 'Typ: Festes Layout;';
                }

                if (true === jT.isSubform || 'true' === jT.isSubform) {
                    tip = tip + 'Typ: Subform;';
                }

                if (true === jT.printA4 || 'true' === jT.printA4) {
                    tip = tip + 'Druck: A4 PDF;';

                    if (jT.printOffsetX !== 0 || jT.printOffsetY !== 0) {
                        tip = tip + 'Druckversatz: ' + jT.printOffsetX + 'x' + jT.printOffsetY + ';';
                    }
                }

                if (jT.printBackground) {
                    tip = tip + 'Druck: Hintergrund drucken;';
                }

                if (jT.printRotate && 0 !== jT.printRotate && '0' !== jT.printRotate) {
                    tip = tip + 'Druckdreh: ' + jT.printRotate + ';';
                }

                if (jT.printScale && 1 !== jT.printScale && '1' !== jT.printScale) {
                    tip = tip + 'Größenordnung: ' + jT.printScale + ';';
                }

                if (jT.defaultFor && '' !== jT.defaultFor) {
                    tip = tip + 'Role: ' + Y.doccirrus.formsconfig.getRoleName(jT.defaultFor, '-de') + ';';
                }

                tip = tip.replace(/;/g, '\u000A');

                return tip;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[schemaName], true );
    },

    /* Min version */
    '0.0.1',

    /* Dependancies */
    {
        requires: [
            'doccirrus',
            'dcschemaloader',
            'dcforms-papersizes',
            'dcforms-importutils'
        ]
    }
);