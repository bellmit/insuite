/**
 * User: pi
 * Date: 13/08/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'file-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module file-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            fileTypes = Object.freeze( {
                DOWNLOAD: 'DOWNLOAD',
                SMBSHARE: 'SMBSHARE',
                DEVICE_SERVER: 'DEVICE_SERVER'
            } );

        function createFileTypeList(){
            var
                result = [];
            Object.keys( fileTypes ).forEach( function( type ) {
                result.push( {
                    val: fileTypes[type],
                    i18n: i18n( 'file-schema.FileType_E.' + fileTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'File_T',
                        lib: types
                    }
                },
                File_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_File_T: {
                        complex: 'ext',
                        type: 'base_File_T',
                        lib: types
                    }
                },
                FileType_E: {
                    type: 'String',
                    validate: 'FileType_E_fileType',
                    list: createFileTypeList(),
                    i18n: i18n( 'file-schema.FileType_E.i18n' ),
                    '-en': 'Type',
                    '-de': 'Type'
                },
                base_File_T: {
                    __polytype: {
                        type: 'String'
                    },
                    fileType: {
                        complex: 'eq',
                        type: 'FileType_E',
                        lib: types
                    },
                    filePath: {
                        type: 'String',
                        validate: 'base_File_T_filePath',
                        i18n: i18n( 'file-schema.base_File_T.filePath.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    },
                    overwriteFile: {
                        type: 'Boolean',
                        default: false,
                        i18n: i18n( 'file-schema.base_File_T.overwriteFile.i18n' ),
                        '-en': 'overwrite file',
                        '-de': 'Datei überschreiben'
                    },
                    noFile: {
                        type: 'Boolean',
                        default: false,
                        i18n: i18n( 'file-schema.base_File_T.noFile.i18n' ),
                        '-en': 'Do not create file',
                        '-de': 'Keine Datei erzeugen'
                    },
                    smbShare: {
                        type: 'String',
                        validate: 'base_File_T_smbShare',
                        i18n: i18n( 'file-schema.base_File_T.smbShare.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    },
                    smbUser: {
                        type: 'String',
                        validate: 'base_File_T_smbUser',
                        i18n: i18n( 'file-schema.base_File_T.smbUser.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    },
                    smbPw: {
                        type: 'String',
                        validate: 'base_File_T_smbPw',
                        i18n: i18n( 'file-schema.base_File_T.smbPw.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    },
                    filter: {
                        type: 'String',
                        validate: 'regexp',
                        i18n: i18n( 'file-schema.base_File_T.filter.i18n' ),
                        '-en': 'Filter',
                        '-de': 'Filter'
                    },
                    executeApp: {
                        type: 'Boolean',
                        default: false,
                        i18n: i18n( 'file-schema.base_File_T.executeApp.i18n' ),
                        '-en': 'Run file',
                        '-de': 'Datei Ausführen'
                    },
                    executeClient: {
                        type: 'String',
                        i18n: i18n( 'file-schema.base_File_T.executeClient.i18n' ),
                        validate: 'base_File_T_executeClient',
                        '-en': 'Computer',
                        '-de': 'Auf Rechner'
                    },
                    executePath: {
                        type: 'String',
                        i18n: i18n( 'file-schema.base_File_T.executePath.i18n' ),
                        validate: 'base_File_T_executePath',
                        '-en': 'Filename',
                        '-de': 'Dateiname'
                    },
                    executeArgs: {
                        type: 'String',
                        i18n: i18n( 'file-schema.base_File_T.executeArgs.i18n' ),
                        '-en': 'Args',
                        '-de': 'Parameter'
                    },
                    deviceServers: {
                        type: [String],
                        validate: 'base_File_T_deviceServer',
                        i18n: i18n( 'file-schema.base_File_T.deviceServer.i18n' ),
                        '-en': 'device server',
                        '-de': 'device server'
                    },
                    triggerManually: {
                        type: 'Boolean',
                        default: false,
                        i18n: i18n( 'file-schema.base_File_T.deviceServer.i18n' ),
                        '-en': 'trigger manually',
                        '-de': 'trigger manually'
                    },
                    keepFiles: {
                        type: 'Boolean',
                        default: false,
                        validate: 'base_File_T_keepFiles',
                        i18n: i18n( 'file-schema.base_File_T.deviceServer.i18n' ),
                        '-en': 'keep files',
                        '-de': 'keep files'
                    }
                }
            }
        );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            fileTypes: fileTypes,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'v_flowsource-schema'
        ]
    }
);
