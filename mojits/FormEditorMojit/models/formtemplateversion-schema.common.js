/**
 *  Holds a prior version of a form template
 *
 *  These are referenced by documents, activities in CaseFile and other objects which may need a specific version of a
 *  form.  They are created explicitly when users hit the 'V+' button in FormEditorMojit, and spun off of the current
 *  version by the createNewVersion method of formtemplate-schema.common.js
 *
 *  In future it may be possible to revert to previous versions of a form.
 *
 *  User: strix
 *  Date: 23/04/2014  15:45
 *  (c) 2014, Doc Cirrus GmbH, Berlin
 *
 */
/*global YUI */
'use strict';

YUI.add(

    'formtemplateversion-schema',

    function( Y, NAME ) {

        var
            schemaName = Y.doccirrus.schemaloader.deriveSchemaName( NAME ),
            types = {},
            i18n = Y.doccirrus.i18n,
            versionMeta = {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Form_T",
                        "lib": "form"
                    },
                    "formatVersion": {                              //  for migration of forms set
                        "type": "Number",                           //  starting from 1
                        "required": false,
                        i18n: i18n( 'formtemplate-schema.Form_T.formatVersion' ),
                        "-en": "formatVersion",
                        "-de": "formatVersion"
                    },
                    revcomment: {
                        type: 'String',
                        i18n: i18n( 'formtemplateversion-schema.root.revcomment' ),
                        '-en': 'Revision comment',
                        '-de': 'Revision Kommentar'
                    },
                    createdBy: {
                        type: 'String',
                        i18n: i18n( 'formtemplateversion-schema.root.createdBy' ),
                        '-en': 'Created by user',
                        '-de': 'Erstellt von User'
                    },
                    timestamp: {
                        type: "date",
                        i18n: i18n( 'formtemplateversion-schema.root.timestamp' ),
                        '-en': 'Timestamp',
                        '-de': 'Zeitstempel'
                    },
                    canonicalId: {
                        type: "String",
                        i18n: i18n( 'formtemplateversion-schema.root.canonicalId' ),
                        '-en': 'Form ID',
                        '-de': 'Formular-ID'
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    }
                }
            };

        types = Y.mix( types, versionMeta );

        Y.namespace( 'doccirrus.schemas' )[schemaName] = {
            types: types,
            name: schemaName
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[schemaName], true );
    },

    '0.0.1',

    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'form-schema',
            'formtemplate-schema'
        ]
    }
);
