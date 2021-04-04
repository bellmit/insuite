/**
 * User: ad
 * Date: 29/08/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'document-schema', function( Y, NAME ) {
        /**
         * The DC Patient data schema definition
         *
         * @module Document
         */

        var

        // ---------- validation functions -------
        // are included from the  Y.doccirrus.validations  library

        // ------- Schema definitions  -------

            i18n = Y.doccirrus.i18n,
            indexes = {},
            updateFieldsOnSave,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Provides access to the documents collection."
                }
            },
            types = {};

        indexes = [
            { key: { 'activityId' : 1 } },
            { key: { 'attachedTo' : 1 } },
            { key: { 'patientId' : 1 } },
            { key: { 'caseFolderId' : 1 } },
            { key: { 'actType' : 1 } },
            { key: { 'mediaId' : 1 } }
        ];

        types = Y.mix( types, {
                "Domain": "Document",
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Document_T",
                        "lib": types
                    }
                },
                "DocData_T": {
                    "data": {
                        "type": "String",
                        i18n: i18n( 'document-schema.DocData_T.data.i18n' ),
                        "-en": "data",
                        "-de": "data"
                    },
                    "dataName": {
                        "type": "String",
                        i18n: i18n( 'document-schema.DocData_T.dataName.i18n' ),
                        "-en": "dataName",
                        "-de": "dataName"
                    },
                    "srcDev": {
                        "type": "String",
                        i18n: i18n( 'document-schema.DocData_T.srcDev.i18n' ),
                        "-en": "srcDev",
                        "-de": "srcDev"
                    }
                },
                "FormDoc_T": {
                    "tempVersion": {
                        "type": "String",
                        i18n: i18n( 'document-schema.FormDoc_T.tempVersion.i18n' ),
                        "-en": "tempVersion",
                        "-de": "tempVersion"
                    },
                    "formId": {                 //  canonical _id of a formtemplate
                        "type": "String",
                        i18n: i18n( 'document-schema.FormDoc_T.formId.i18n' ),
                        "-en": "formId",
                        "-de": "formId"
                    },
                    "formData": {               //  deprecated - to be replaced in migration by formState value
                        "type": "String",
                        i18n: i18n( 'document-schema.FormDoc_T.formData.i18n' ),
                        "-en": "formData",
                        "-de": "formData"
                    },
                    "mapData": {               //  Object, dict of keys and values representing values mapped into form
                        "type": "Mixed",
                        i18n: i18n( 'document-schema.FormDoc_T.mapData.i18n' ),
                        "-en": "mapData",
                        "-de": "mapData"
                    },
                    "reportingData": {               //  Object, dict of keys and values representing values mapped into form
                        "type": "Mixed",
                        i18n: i18n( 'document-schema.FormDoc_T.reportingData.i18n' ),
                        "-en": "reportingData",
                        "-de": "reportingData"
                    },
                    "usesMedia": {
                        "type": [String],
                        i18n: i18n( 'document-schema.FormDoc_T.usesMedia.i18n' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "usesMedia",
                        "-de": "usesMedia"
                    },
                    "formState": {              //  Object, dict of keys and values representing form elements and their values
                        "type": "Mixed",
                        i18n: i18n( 'document-schema.FormDoc_T.formState.i18n' ),
                        "-en": "formState",
                        "-de": "formState"
                    },
                    "formStateHash": {
                        "type": Number,
                        i18n: i18n( 'document-schema.FormDoc_T.formStateHash.i18n' ),
                        "-en": "formState hash",
                        "-de": "formState hash"
                    },
                    "formInitialState": {       //  State of form after first map, for comparison with later edits MOJ-7040
                        "type": "Mixed",
                        i18n: i18n( 'document-schema.FormDoc_T.formInitialState.i18n' ),
                        "-en": "formState",
                        "-de": "formState"
                    },
                    "formInstanceId": {         //  global _id of a formtemplateversion (previously held local instanceId)
                        "type": "String",
                        i18n: i18n( 'document-schema.FormDoc_T.formInstanceId.i18n' ),
                        "-en": "formInstanceId",
                        "-de": "formInstanceId"
                    },
                    "group": {
                        "type": "String",
                        i18n: i18n( 'document-schema.FormDoc_T.group.i18n' ),
                        "-en": "group",
                        "-de": "group"
                    },
                    "dcOwner": {
                        "type": "Boolean",
                        i18n: i18n( 'document-schema.FormDoc_T.dcOwner.i18n' ),
                        "-en": "dcOwner",
                        "-de": "dcOwner"
                    }
                },
                "Document_T": {
                    "type": {
                        "default": "OTHER",
                        "complex": "eq",
                        "type": "DocType_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types,
                        i18n: i18n( 'document-schema.Document_T.type.i18n' ),
                        "-en": "Document type",
                        "-de": "Dokumentenart"
                    },
                    "data": {
                        "complex": "ext",
                        "type": "DocData_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "form": {
                        "complex": "ext",
                        "type": "FormDoc_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "url": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "future": "URL",
                        i18n: i18n( 'document-schema.Document_T.url.i18n' ),
                        "-en": "URL",
                        "-de": "URL"
                    },
                    "publisher": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.publisher.i18n' ),
                        "-en": "Publisher",
                        "-de": "Quelle"
                    },
                    "content": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.content.i18n' ),
                        "-en": "Content",
                        "-de": "Inhalt"
                    },
                    "contentType": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.contentType.i18n' ),
                        "-en": "contentType",
                        "-de": "contentType"
                    },
                    "docId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.docId.i18n' ),
                        "-en": "Document Id",
                        "-de": "Dokument-ID"
                    },
                    //  Deprecated, MOJ-9190, records which object the document is attached to
                    //  if attached to the activity, then not shared with patient on patient portal, if attached to
                    //  patient, patient can access it on patient portal
                    "attachedTo": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.attachedTo.i18n' ),
                        "-en": "attachedTo",
                        "-de": "attachedTo"
                    },
                    "patientId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'document-schema.Document_T.patientId.i18n' ),
                        "-en": "patientId",
                        "-de": "patientId"
                    },
                    "caseFolderId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.caseFolderId.i18n' ),
                        "-en": "caseFolderId",
                        "-de": "caseFolderId"
                    },
                    "activityId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'document-schema.Document_T.activityId.i18n' ),
                        "-en": "Related activity Id",
                        "-de": "Verbundene Tätigkeit id"
                    },
                    "mediaId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'document-schema.Document_T.activityId.i18n' ),
                        "-en": "Linked media Id",
                        "-de": "Verbundene Media-ID"
                    },
                    "printerName": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.printerName.i18n' ),
                        "-en": "Printer",
                        "-de": "Drucker"
                    },
                    "locationId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.locationId.i18n' ),
                        "-en": "Related Location Id",
                        "-de": "Standort-ID"
                    },
                    "accessBy": {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.accessBy.i18n' ),
                        "-en": "Access granted to",
                        "-de": "Zugriff erlaubt"
                    },
                    'isEditable': {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.isEditable.i18n' ),
                        "-en": "Is Editable",
                        "-de": "Bearbeitbar"
                    },
                    "caption": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.caption.i18n' ),
                        "-en": "Caption",
                        "-de": "Überschrift"
                    },
                    "title": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.caption.i18n' ),
                        "-en": "Title",
                        "-de": "Titel"
                    },
                    "createdOn": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.createdOn.i18n' ),
                        "-en": "Created on",
                        "-de": "Erzeugt am"
                    },
                    "tags": {
                        "type": ["String"],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'document-schema.Document_T.tags.i18n' ),
                        "-en": "tags",
                        "-de": "tags"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    // new field for audit to keep connected patients' full name
                    "patientName" : {
                        "type": "String",
                        i18n: i18n( 'document-schema.Document_T.patientName.i18n' ),
                        "-en": "patientName",
                        "-de": "patientName"
                    },
                    //  copied from activity to allow fast searching of activity type / subtype, MOJ-12930
                    /*
                    "actType": {
                        complex: 'eq',
                        type: 'Activity_E',
                        lib: 'activity',
                        apiv: {v: 2, queryParam: false}
                    } */
                    "actType": {
                        type: "String",
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'document-schema.Document_T.actType.i18n' )
                    },
                    "subType": {
                        type: "String",
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'document-schema.Document_T.subType.i18n' )
                    },
                    "malwareWarning": {
                        type: "String",
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'document-schema.Document_T.malwareWarning.i18n' )
                    }
                },
                "DocType_E": {
                    "type": "String",
                    "version": 1,
                    "list": [
                        {
                            "val": "FORM",
                            i18n: i18n( 'document-schema.DocType_E.FORM' ),
                            "-en": "Form",
                            "-de": "Formular"
                        },
                        {
                            "val": "FORMIMAGE",
                            i18n: i18n( 'document-schema.DocType_E.FORMIMAGE' ),
                            "-en": "Image",
                            "-de": "Bild"
                        },
                        {
                            "val": "FORMPDF",
                            i18n: i18n( 'document-schema.DocType_E.FORMPDF' ),
                            "-en": "Form PDF",
                            "-de": "PDF Formular"
                        },
                        {
                            "val": "FORMSCAN",
                            i18n: i18n( 'document-schema.DocType_E.FORMSCAN' ),
                            "-en": "Form Scan",
                            "-de": "Formular"
                        },
                        {
                            "val": "EKG",
                            i18n: i18n( 'document-schema.DocType_E.EKG' ),
                            "-en": "EKG",
                            "-de": "EKG"
                        },
                        {
                            "val": "MEDIMAGE",
                            i18n: i18n( 'document-schema.DocType_E.MEDIMAGE' ),
                            "-en": "Medical Image",
                            "-de": "Medizinisches Bild"
                        },
                        {
                            "val": "LABREPORT",
                            i18n: i18n( 'document-schema.DocType_E.LABREPORT' ),
                            "-en": "Lab Report",
                            "-de": "Laborbericht"
                        },
                        {
                            "val": "PAINREPORT",
                            i18n: i18n( 'document-schema.DocType_E.PAINREPORT' ),
                            "-en": "Pain record",
                            "-de": "Schmerzbericht"
                        },
                        {
                            "val": "QAREPORT",
                            i18n: i18n( 'document-schema.DocType_E.QAREPORT' ),
                            "-en": "Questionnaire",
                            "-de": "Fragebogen"
                        },
                        {
                            "val": "DOCLETTER",
                            i18n: i18n( 'document-schema.DocType_E.DOCLETTER' ),
                            "-en": "Letter",
                            "-de": "Arztbrief"
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'document-schema.DocType_E.OTHER' ),
                            "-en": "Other",
                            "-de": "Andere"
                        },
                        {
                            "val": "QUESTIONNAIRE",
                            i18n: i18n( 'document-schema.DocType_E.QUESTIONNAIRE' ),
                            "-en": "Questionnaire",
                            "-de": "Patientenfragebogen"
                        },
                        {
                            "val": "FROMPATIENT",
                            i18n: i18n( 'document-schema.DocType_E.FROMPATIENT' ),
                            "-en": "From Patient",
                            "-de": "von Patient"
                        },
                        {
                            "val": "MEDICATIONPLAN",
                            i18n: i18n( 'document-schema.DocType_E.MEDICATIONPLAN' ),
                            "-en": i18n( 'document-schema.DocType_E.MEDICATIONPLAN' ),
                            "-de": i18n( 'document-schema.DocType_E.MEDICATIONPLAN' )
                        },
                        {
                            "val": "MEASUREMENT",
                            i18n: i18n( 'document-schema.DocType_E.MEASUREMENT' ),
                            "-en": "Measurement",
                            "-de": "Messung"
                        },
                        {
                            "val": "PATIENTDECLARATION",
                            i18n: i18n( 'document-schema.DocType_E.PATIENTDECLARATION' ),
                            "-en": "Patient decaration",
                            "-de": "Patientenerklärung"
                        },
                        {
                            "val": "EXEMPTION",
                            i18n: i18n( 'document-schema.DocType_E.EXEMPTION' ),
                            "-en": "Exemption decision",
                            "-de": "Gebührenbefreiungsbescheid"
                        },
                        {
                            "val": "REIMBURSEMENT",
                            i18n: i18n( 'document-schema.DocType_E.REIMBURSEMENT' ),
                            "-en": "Reimbursement",
                            "-de": "Kostenübernahme"
                        },
                        {
                            "val": "TRANSFER",
                            i18n: i18n( 'document-schema.DocType_E.TRANSFER' ),
                            "-en": "Transfer",
                            "-de": "Überweisung"
                        },
                        {
                            "val": "SUMEXPDF",
                            i18n: i18n( 'document-schema.DocType_E.SUMEXPDF' ),
                            "-en": "Sumex PDF",
                            "-de": "PDF von Sumex"
                        },
                        {
                            "val": "SUMEXXML",
                            i18n: i18n( 'document-schema.DocType_E.SUMEXXML' ),
                            "-en": "Sumex XML",
                            "-de": "XML von Sumex"
                        }
                    ]
                }
            }
        );

        //  Used by AttachmentsViewModel (client/server) when document modified by user or derver-side process
        updateFieldsOnSave = [
            'formData', 'formState', 'mapData', 'type', 'formId', 'formInstanceId', 'url', 'publisher',
            'attachedTo', 'activityId', 'mediaId', 'printerName', 'locationId', 'accessBy',
            'caption', 'createdOn', 'contentType', 'tags', 'reportingData', 'usesMedia',
            'formInitialState', 'formStateHash'
        ];

        function redactForExternalAPI( doc ) {
            var
                docCopy = JSON.parse( JSON.stringify( doc ) ),
                toRemove = [
                    "accessBy", "activityId", "attachedTo", "formData", "formInitialState",
                    "formInstanceId", "formState", "isEditable", "tags", "usesMedia", "url"
                ], i;

            for ( i = 0; i < toRemove.length; i++ ) {
                if ( docCopy.hasOwnProperty( toRemove[i] ) ) {
                    delete docCopy[ toRemove[i] ];
                }
            }

            return docCopy;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class Patient Schemas -- gathers all the schemas that the Patient Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            //  maximum length of document captions (MOJ-13525)
            //  needed due to index on activity.attachedMedia
            MAX_CAPTION_LENGTH: 512,

            indexes: indexes,
            types: types,
            ramlConfig: ramlConfig,

            name: NAME,

            redactForExternalAPI: redactForExternalAPI,
            updateFieldsOnSave: updateFieldsOnSave
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
