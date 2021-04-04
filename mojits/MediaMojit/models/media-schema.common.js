/**
 * User: strix
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'media-schema', function( Y, NAME ) {
        /**
         * The Media schema definition (attached images, videos, etc)
         *
         * @module Media
         */

        var
        // ------- Schema definitions  -------

            indexes = [
                { key: { 'ownerCollection' : 1 } },
                { key: { 'ownerId' : 1 } },
                { key: { 'deleteAfter' : 1 } }
            ],

            types = {},

            i18n = Y.doccirrus.i18n,

            default_image = {
                "widthPx": "",
                "heightPx": "",
                "name": "",
                "descr": "",
                "source": 'data:image/jpeg;base64,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',
                "origFilename": "no_image_available.png",
                "ownerCollection": "*",
                "ownerId": "*",
                "deleteAfter": "",
                "gridfs": false,
                "binary": false,
                "mime": "IMAGE_PNG"
            },

            fileTypes = Y.doccirrus.media.types.fileTypes,
            supportedMime = [],
            i;

        for ( i = 0; i < fileTypes.length; i++ ) {
            //Y.log('Adding supported mime type: ' + fileTypes[i].mime, 'debug', NAME);
            supportedMime.push({
                val: Y.doccirrus.media.types.getMime(fileTypes[i].mime),
                i18n: fileTypes[i].name,
                "-en": fileTypes[i].name,
                "-de": fileTypes[i].name
            });
        }

        types = Y.mix(
            types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Media_T",
                        "lib": types
                    }
                },
                "Media_T": {
                    "name": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "descr": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.descr' ),
                        "-en": "descr",
                        "-de": "descr"
                    },
                    "source": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.source' ),
                        "-en": "source",
                        "-de": "source"
                    },
                    "origFilename": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.origFilename' ),
                        "-en": "origFilename",
                        "-de": "origFilename"
                    },
                    "mime": {                   //  MIME type of file, image/jpeg and image/png are supported 2013-06-24
                        "complex": "eq",
                        "type": "MimeType_E",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.mime' ),
                        "-en": "mime",
                        "-de": "mime"
                    },
                    "ownerCollection": {        //  Type of object this media is attached to
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'media-schema.Media_T.ownerCollection' ),
                        "-en": "Attached to",
                        "-de": "Zugehörig zu"
                    },
                    "ownerId": {                //  ID of object this media is attached to
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'media-schema.Media_T.ownerId' ),
                        "-en": "ownerId",
                        "-de": "ownerId"
                    },
                    "label": {                  //  Defined by whatever attaches media, to distinguish uses
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.label' ),
                        "-en": "label",
                        "-de": "label"
                    },
                    "transform": {              //  Will mostly be 'original' for objects stored in the database
                        "type": "String",
                        i18n: i18n( 'media-schema.Media_T.transform' ),
                        "apiv": { v: 2, queryParam: true },
                        "-en": "transform",
                        "-de": "transform"
                    },
                    "weight": {                 //  Ordering of attached media
                        "type": "Number",       //  Bigger weights go further down the list
                        "future": "LongInt",
                        i18n: i18n( 'media-schema.Media_T.weight' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "weight",
                        "-de": "weight"
                    },
                    "widthPx": {                //  Other media besides images have width and height (videos, PDFs, etc)
                        "type": "Number",
                        "future": "Integer",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.widthPx' ),
                        "-en": "widthPx",
                        "-de": "widthPx"
                    },
                    "heightPx": {
                        "type": "Number",
                        "future": "Integer",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.heightPx' ),
                        "-en": "heightPx",
                        "-de": "heightPx"
                    },
                    "deleteAfter": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.heightPx' ),
                        "-en": "Delete After",
                        "-de": "Nach dem löschen"
                    },
                    "docType": {                //  where an attachment belongs to a document, will inherit from Document_T
                        "type": "string",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.docType' ),
                        "-en": "Document Type",
                        "-de": "Dokumenttyp"
                    },
                    "gridfs": {
                        "type": "boolean",
                        i18n: i18n( 'media-schema.Media_T.gridfs' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "GridFS",
                        "-de": "GridFS"
                    },
                    "binary": {
                        "type": "boolean",
                        i18n: i18n( 'media-schema.Media_T.binary' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "Is a binary file",
                        "-de": "Ist eine Binärdatei"
                    },
                    "filesize": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.filesize' ),
                        "-en": "bytes",
                        "-de": "bytes"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "malwareWarning": {
                        "type": "string",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'media-schema.Media_T.malwareWarning' ),
                        "-en": "Malware warning",
                        "-de": "Malware-Warnung"
                    },
                    "malwareFalsePositive": {
                        "type": "boolean",
                        i18n: i18n( 'media-schema.Media_T.malwareFalsePositive' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "Malware false positive",
                        "-de": "Malware falsch positiv"
                    }
                },
                "Image_T": {                    //  TODO discover if this can be removved

                    "base": {
                        "complex": "ext",
                        "type": "Media_T",
                        "lib": types
                    }
                },
                "Video_T": {
                    "durationSec": {
                        "type": "Number",
                        i18n: i18n( 'media-schema.Video_T.durationSec' ),
                        "future": "LongInt",
                        "-en": "durationSec",
                        "-de": "durationSec"
                    }
                },
                "MimeType_E": {
                    "type": "string",
                    "list": supportedMime

                        //  LEGACY

                        /*[
                        {
                            "val": "IMAGE_PNG",
                            i18n: i18n( 'media-schema.MimeType_E.IMAGE_PNG' ),
                            "-en": "image_png",
                            "-de": "image_png"
                        },
                        {
                            "val": "APPLICATION_MSEXCEL",
                            i18n: i18n( 'media-schema.MimeType_E.APPLICATION_MSEXCEL' ),
                            "-en": "application_msexcel",
                            "-de": "application_msexcel"
                        },
                        {
                            "val": "IMAGE_JPEG",
                            i18n: i18n( 'media-schema.MimeType_E.IMAGE_JPEG' ),
                            "-en": "image_jpeg",
                            "-de": "image_jpeg"
                        },
                        {
                            "val": "IMAGE_GIF",
                            i18n: i18n( 'media-schema.MimeType_E.IMAGE_GIF' ),
                            "-en": "image_gif",
                            "-de": "image_gif"
                        },
                        {
                            "val": "IMAGE_SVG",
                            i18n: i18n( 'media-schema.MimeType_E.IMAGE_SVG' ),
                            "-en": "image_svg",
                            "-de": "image_svg"
                        },
                        {
                            "val": "AUDIO_MP3",
                            i18n: i18n( 'media-schema.MimeType_E.AUDIO_MP3' ),
                            "-en": "audio_mp3",
                            "-de": "audio_mp3"
                        },
                        {
                            "val": "VIDEO_MP4",
                            i18n: i18n( 'media-schema.MimeType_E.VIDEO_MP4' ),
                            "-en": "video_mp4",
                            "-de": "video_mp4"
                        },
                        {
                            "val": "VIDEO_QUICKTIME",
                            i18n: i18n( 'media-schema.MimeType_E.VIDEO_QUICKTIME' ),
                            "-en": "video_quicktime",
                            "-de": "video_quicktime"
                        },
                        {
                            "val": "TEXT_PLAIN",
                            i18n: i18n( 'media-schema.MimeType_E.TEXT_PLAIN' ),
                            "-en": "text_plain",
                            "-de": "text_plain"
                        },
                        {
                            "val": "TEXT_HTML",
                            i18n: i18n( 'media-schema.MimeType_E.TEXT_HTML' ),
                            "-en": "text_html",
                            "-de": "text_html"
                        },
                        {
                            "val": "TEXT_CSS",
                            i18n: i18n( 'media-schema.MimeType_E.TEXT_CSS' ),
                            "-en": "text_css",
                            "-de": "text_css"
                        },
                        {
                            "val": "TEXT_JAVASCRIPT",
                            i18n: i18n( 'media-schema.MimeType_E.TEXT_JAVASCRIPT' ),
                            "-en": "text_javascript",
                            "-de": "text_javascript"
                        },
                        {
                            "val": "TEXT_RTF",
                            i18n: i18n( 'media-schema.MimeType_E.TEXT_RTF' ),
                            "-en": "text_rtf",
                            "-de": "text_rtf"
                        },
                        {
                            "val": "IMAGE_PDF",
                            i18n: i18n( 'media-schema.MimeType_E.IMAGE_PDF' ),
                            "-en": "image_pdf",
                            "-de": "image_pdf"
                        },
                        {
                            "val": "APPLICATION_PDF",
                            i18n: i18n( 'media-schema.MimeType_E.APPLICATION_PDF' ),
                            "-en": "application_pdf",
                            "-de": "application_pdf"
                        },
                        {
                            "val": "APPLICATION_MSWORD",
                            i18n: i18n( 'media-schema.MimeType_E.APPLICATION_MSWORD' ),
                            "-en": "application_msword",
                            "-de": "application_msword"
                        },
                        {
                            "val": "APPLICATION_POWERPOINT",
                            i18n: i18n( 'media-schema.MimeType_E.APPLICATION_POWERPOINT' ),
                            "-en": "application_powerpoint",
                            "-de": "application_powerpoint"
                        }
                    ] */
                },
                "OwnerCollection_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": null,
                            i18n: i18n( 'media-schema.OwnerCollection_E.NONE' ),
                            "-en": "None",
                            "-de": "Keine"
                        },
                        {
                            "val": '',
                            i18n: i18n( 'media-schema.OwnerCollection_E.NONE' ),
                            "-en": "None",
                            "-de": "Keine"
                        },
                        {
                            "val": '*',
                            i18n: i18n( 'media-schema.OwnerCollection_E.NONE' ),
                            "-en": "None",
                            "-de": "Keine"
                        },
                        {
                            "val": "activity",
                            i18n: i18n( 'media-schema.OwnerCollection_E.ACTIVITY' ),
                            "-en": "Activity",
                            "-de": "Aktivität"
                        },
                        {
                            "val": "forms",
                            i18n: i18n( 'media-schema.OwnerCollection_E.FORMS' ),
                            "-en": "Form",
                            "-de": "Formular"
                        },
                        {
                            "val": "patient",
                            i18n: i18n( 'media-schema.OwnerCollection_E.PATIENT' ),
                            "-en": "Patient",
                            "-de": "Patient"
                        },
                        {
                            "val": "patient",
                            i18n: i18n( 'media-schema.OwnerCollection_E.GDT_EXPORT' ),
                            "-en": "GDT Export",
                            "-de": "GDT Export"
                        },
                        {
                            "val": "stockorder",
                            i18n: i18n( 'media-schema.OwnerCollection_E.STOCK_ORDER' ),
                            "-en": "Stock order",
                            "-de": "Bestellung"
                        }
                    ]
                }
            }
        );



        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class Media Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            indexes: indexes,
            types: types,

            name: NAME,

            defaultItems: default_image,

            getDefaultImage: function () {
                return default_image;
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'dcmedia-filetypes'
        ]
    }
);
