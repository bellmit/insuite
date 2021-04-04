/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Simple YUI module, represents allowed file types
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
'use strict';

YUI.add(
    /* YUI module name */
    'dcmedia-filetypes',

    /* Module code */
    function( Y, NAME ) {

        /**
         *  Extend YUI object with a method to instantiate these
         */

        Y.namespace( 'doccirrus.media' ).types = {
            fileTypes: [

                //  IMAGE TYPES
                { group: 'image', ext: 'jpg', mime: 'image/jpeg', name: 'JPEG image' },
                { group: 'image', ext: 'jpeg', mime: 'image/jpeg', name: 'JPEG Image' },
                { group: 'image', ext: 'gif', mime: 'image/gif', name: 'Graphics Interchange Format' },
                { group: 'image', ext: 'png', mime: 'image/png', name: 'Portable Network Graphics' },
                { group: 'image', ext: 'svg', mime: 'image/svg', name: 'Scalable Vector Graphics' },
                { group: 'image', ext: 'tif', mime: 'image/tiff', name: 'Tagged Image File Format' },
                { group: 'image', ext: 'tiff', mime: 'image/tiff', name: 'Tagged Image File Format' },

                //  AUDIO TYPES
                { group: 'audio', ext: 'mp3', mime: 'audio/mp3', name: 'MPEG Layer 3 audio' },
                { group: 'audio', ext: 'mp3', mime: 'audio/mpeg', name: 'MPEG Layer 3 audio' },
                { group: 'audio', ext: 'ogg', mime: 'audio/ogg', name: 'Ogg Vorbis' },
                { group: 'audio', ext: 'webm', mime: 'audio/webm', name: 'WebM audio' },
                { group: 'audio', ext: 'wav', mime: 'audio/x-wav', name: 'PCM Wave Audio' },
                { group: 'audio', ext: 'dss',  mime: 'audio/x-dss', name: 'DCC audio'},
                { group: 'audio', ext: 'ds2',  mime: 'audio/x-ds2', name: 'DC2 audio'},
                //  VIDEO TYPES
                { group: 'video', ext: 'mp4', mime: 'video/mp4', name: 'MP4 Video' },
                { group: 'video', ext: 'mov', mime: 'video/quicktime', name: 'Quicktime Video' },
                { group: 'video', ext: 'mov', mime: 'image/mov', name: 'Quicktime Video' },
                { group: 'video', ext: 'mov', mime: 'video/x-quicktime', name: 'Quicktime Video' },
                { group: 'video', ext: 'avi', mime: 'video/x-msvideo', name: 'AV Interleave' },
                { group: 'video', ext: 'webm', mime: 'video/webm', name: 'WebM video' },

                //  FONT TYPES
                { group: 'font', ext: 'ttf', mime: 'application/x-font-ttf', name: 'True Type Font' },
                { group: 'font', ext: 'ttf', mime: 'application/font-sfnt', name: 'True Type Font SFNT' },

                //  DOCUMENT TYPES
                //  PDF, Plain text and PostScript
                { group: 'document', ext: 'pdf', mime: 'application/pdf', name: 'Portable Document Format' },
                { group: 'document', ext: 'ps', mime: 'application/postscript', name: 'PostScript' },
                { group: 'document', ext: 'con', mime: 'application/con', name: 'CON file' },
                { group: 'document', ext: 'BESR', mime: 'application/octet-stream', name: 'BESR file' },


                //  Open document types
                //  see: https://www.openoffice.org/framework/documentation/mimetypes/mimetypes.html
                { group: 'document', ext: 'odt', mime: 'application/vnd.oasis.opendocument.text', name: 'OpenDocument Text' },
                { group: 'document', ext: 'ott', mime: 'application/vnd.oasis.opendocument.text-template', name: 'OpenDocument Text Template' },
                { group: 'document', ext: 'oth', mime: 'application/vnd.oasis.opendocument.text-web', name: 'HTML Document Template' },
                { group: 'document', ext: 'odm', mime: 'application/vnd.oasis.opendocument.text-master', name: 'OpenDocument Master Document' },
                { group: 'document', ext: 'odg', mime: 'application/vnd.oasis.opendocument.graphics', name: 'OpenDocument Drawing' },
                { group: 'document', ext: 'otg', mime: 'application/vnd.oasis.opendocument.graphics-template', name: 'OpenDocument Drawing Template' },
                { group: 'document', ext: 'odp', mime: 'application/vnd.oasis.opendocument.presentation', name: 'OpenDocument Presentation' },
                { group: 'document', ext: 'otp', mime: 'application/vnd.oasis.opendocument.presentation-template', name: 'OpenDocument Presentation Template' },
                { group: 'document', ext: 'ods', mime: 'application/vnd.oasis.opendocument.spreadsheet', name: 'OpenDocument Spreadsheet' },
                { group: 'document', ext: 'ots', mime: 'application/vnd.oasis.opendocument.spreadsheet-template', name: 'OpenDocument Spreadsheet Template' },
                { group: 'document', ext: 'odc', mime: 'application/vnd.oasis.opendocument.chart', name: 'OpenDocument Chart' },
                { group: 'document', ext: 'odf', mime: 'application/vnd.oasis.opendocument.formula', name: 'OpenDocument Formula' },
                { group: 'document', ext: 'odb', mime: 'application/vnd.oasis.opendocument.database', name: 'OpenDocument Database' },
                { group: 'document', ext: 'odi', mime: 'application/vnd.oasis.opendocument.image', name: 'OpenDocument Image' },

                //  Microsoft Office document types
                //  see: http://filext.com/faq/office_mime_types.php
                { group: 'document', ext: 'doc', mime: 'application/msword', name: 'MS Word' },
                { group: 'document', ext: 'dot', mime: 'aplication/msword', name: 'MS Word Template' },
                { group: 'document', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'docx' },
                { group: 'document', ext: 'dotx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template', name: 'docx Template' },
                { group: 'document', ext: 'xls', mime: 'application/vnd.ms-excel', name: 'MS Excel' },
                { group: 'document', ext: 'xlt', mime: 'application/vnd.ms-excel', name: 'MS Excel Template' },
                { group: 'document', ext: 'xla', mime: 'application/vnd.ms-excel', name: 'MS Excel' },
                { group: 'document', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: 'Xlsx' },
                { group: 'document', ext: 'xltx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template', name: 'Xlsx template' },
                { group: 'document', ext: 'ppt', mime: 'application/vnd.ms-powerpoint', name: 'MS PowerPoint' },
                { group: 'document', ext: 'ppt', mime: 'application/vnd.ms-office', name: 'MS PowerPoint' },  // MOJ-6496
                { group: 'document', ext: 'pot', mime: 'application/vnd.ms-powerpoint', name: 'MS Powerpoint' },
                { group: 'document', ext: 'pps', mime: 'application/vnd.ms-powerpoint', name: 'MS Powerpoint' },
                { group: 'document', ext: 'ppa', mime: 'application/vnd.ms-powerpoint', name: 'MS Powerpoint' },
                { group: 'document', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', name: 'OpenOffice Presentation' },
                { group: 'document', ext: 'potx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.template', name: 'OpenOffice ' },
                { group: 'document', ext: 'ppsx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow', name: 'OpenOffice Presentations' },

                //  Apple iWork types
                //  see:  https://doccirrus.atlassian.net/browse/MOJ-8526
                { group: 'document', ext: 'pages', mime: 'application/vnd.apple.pages', name: 'iWork Pages' },
                { group: 'document', ext: 'pages-tef', mime: 'application/vnd.apple.pages', name: 'iWork Pages Template' },
                { group: 'document', ext: 'iwa', mime: 'application/vnd.apple.pages', name: 'iWork' },
                { group: 'document', ext: 'apxl', mime: 'application/vnd.apple.pages', name: 'iWork' },
                { group: 'document', ext: 'key', mime: 'application/vnd.apple.keynote', name: 'iWork Keynote' },
                { group: 'document', ext: 'key-tef', mime: 'application/vnd.apple.keynote', name: 'iWork Keynote Template' },
                { group: 'document', ext: 'keynote', mime: 'application/vnd.apple.keynote', name: 'iWork Keynote' },
                { group: 'document', ext: 'numbers', mime: 'application/vnd.apple.numbers', name: 'iWork Numbers' },
                { group: 'document', ext: 'nmbtemplate', mime: 'application/vnd.apple.numbers', name: 'iWork Numbers Template' },

                //  Other document types
                { group: 'document', ext: 'rtf', mime: 'text/rtf', name: 'Rich Text Format' },
                { group: 'document', ext: 'csv', mime: 'application/csv', name: 'Comma-separated Values' },
                //  Disallowed Microsoft Office document types
                /*
                 { group: 'document', ext: 'docm', mime: 'application/vnd.ms-word.document.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'dotm', mime: 'application/vnd.ms-word.template.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'xlsm', mime: 'application/vnd.ms-excel.sheet.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'xltm', mime: 'application/vnd.ms-excel.template.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'xlam', mime: 'application/vnd.ms-excel.addin.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'xlsb', mime: 'application/vnd.ms-excel.sheet.binary.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'ppam', mime: 'application/vnd.ms-powerpoint.addin.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'pptm', mime: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'potm', mime: 'application/vnd.ms-powerpoint.template.macroEnabled.12', name: 'Malware vector' },
                 { group: 'document', ext: 'ppsm', mime: 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12', name: 'Malware vector' }
                 */

                //  Archive and medical device files
                { group: 'tfdata', ext: 'xml', mime: 'text/plain', name: 'TFData XML' },
                { group: 'tfdata', ext: 'xml', mime: 'application/xml', name: 'TFData XML' },
                { group: 'tfdata', ext: 'xml', mime: 'application/octet-stream', name: 'TFData' },

                // GDT/LAB file type
                { group: 'labdata', ext: 'gdt', mime: 'application/gdt', name: 'GDT file' }

            ],

            getMime: getMime,
            getMimeType: getMimeType,
            getCategory: getCategory,
            getExt: getExt,
            getAllExt: getAllExt,
            getMimeFromDataURI: getMimeFromDataURI
        };

        /**
         *  Given an actual mime type, get mime enum value used by media-schema.common.js
         *
         *  eg, image/jpeg -> IMAGE_JPEG
         *
         *  @param  mimeType    {String}    An actual mimeType, such as text/html
         */

        function getMime(mimeType) {
            return mimeType.toUpperCase().replace('/', '_');
        }

        /**
         *  Given a mime enum value used by media-schema.common.js, return an actual mime type
         *
         *  eg, IMAGE_JPEG -> image/jpeg
         *
         *  @param  mime    {String}    A value of the Mime_T enum
         */


        function getMimeType( mime ) {
            if ( 'string' !== typeof mime ) {
                Y.log( 'MIME_TYPE not given, defaulting to application/binary', 'warn', NAME );
                mime = 'APPLICATION_BINARY';
            }
            return mime.toLowerCase().replace('_', '/');
        }

        /**
         *  Get general kind of content given mime type
         *
         *  @param  mimeType    {String}    May be mine/type or MIME_TYPE
         *  @returns            {String}    One of image, video, audio, document, unknown
         */

        function getCategory(mimeType) {

            if ( -1 !== mimeType.indexOf( '_' ) ) {
                //  MIME_TYPE was passed instead of mime/type
                mimeType = Y.doccirrus.media.getMimeType( mimeType );
            }

            var
                fileTypes = Y.doccirrus.media.types.fileTypes,
                i;

            for ( i = 0; i < fileTypes.length; i++ ) {
                if ( fileTypes[i].mime === mimeType ) {
                    return fileTypes[i].group;
                }
            }

            return 'unknown';
        }

        /**
         * Return file extension to use for the given mime type
         *
         * @param   mimeType    {String}    Limited to supported types
         * @return              {String}
         */

        function getExt( mimeType ) {
            var
                fileTypes = Y.doccirrus.media.types.fileTypes,
                i;

            for ( i = 0; i < fileTypes.length; i++ ) {
                if ( fileTypes[i].mime === mimeType ) {
                    return fileTypes[i].ext;
                }

                if ( fileTypes[i].mime === Y.doccirrus.media.getMimeType( mimeType ) ) {
                    return fileTypes[i].ext;
                }
            }

            if( 'text/base64' === mimeType ) { return 'dataurl'; }
            return 'xxx';
        }

        /**
         *  Extract the mime type from a datauri
         *  @param dataURI
         */

        function getMimeFromDataURI( dataURI ) {
            var parts, mimeType;
            parts = dataURI.split( ';', 2 );
            parts = parts[0].split( ':', 2 );
            mimeType = ( ( parts && parts[1] ) ? parts[1] : 'application/binary' );
            mimeType = mimeType.replace( 'svg+xml', 'svg' );
            return mimeType;
        }

        /**
         *  Return an array of all supported file extensions (used for Fine Upload control)
         *
         *  @return             {String[]}
         */

        function getAllExt() {
            var
                fileTypes = Y.doccirrus.media.types.fileTypes,
                allExt = [],
                i;

            for ( i = 0; i < fileTypes.length; i++ ) {
                if ( -1 === allExt.indexOf( fileTypes[i].ext ) ) {
                    allExt.push( fileTypes[i].ext );
                }
            }

            return allExt;
        }

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);