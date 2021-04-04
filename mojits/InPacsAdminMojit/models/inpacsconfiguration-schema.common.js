/*global YUI*/
'use strict';

YUI.add( 'inpacsconfiguration-schema', function( Y, NAME ) {

    var
        MAIN_ID = '000000000000000000000001',
        types = {},
        i18n = Y.doccirrus.i18n,
        template = {
            "_id": MAIN_ID,
            "lastLogLine": 0,
            "luaScript": "",
            "modalities": Y.doccirrus.schemas.inpacsworklist.types.WorkListType_E.list.map( function( worklistType, i ) {
                var iId = i + 1;
                return {
                    "type": worklistType.val,
                    "workListId": ('00000000000000000000000' + (iId)).slice( iId.toString().toString().length - 1, 24 + iId.toString().length ),
                    "isActive": false,
                    "numberOfImages": 1
                };
            } ),
            "isMocking": false,
            "defaultEncoding": "Utf8"
        };

    types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "InPacsConfiguration_T",
                    "lib": types
                }
            },

            InPacsConfiguration_T: {

                lastLogLine: {
                    "default": 0,
                    "type": 'Number',
                    i18n: i18n( 'inpacsconfiguration-schema.InPacsConfiguration_T.lastLogLine.i18n' ),
                    "-en": "lastLogLine",
                    "-de": "lastLogLine"
                },

                logLevel: {
                    "complex": "eq",
                    "type": "LogLevel_E",
                    "lib": types
                },

                luaScript: {
                    "type": "String",
                    i18n: i18n( 'inpacsconfiguration-schema.InPacsConfiguration_T.luaScript.i18n' ),
                    "-en": "luaScript",
                    "-de": "luaScript"
                },

                modalities: {
                    "complex": "inc",
                    "type": "inpacsconfiguration_T",
                    "lib": types,
                    i18n: i18n( 'inpacsconfiguration-schema.InPacsConfiguration_T.activeModalities.i18n' ),
                    "-en": "activeModalities",
                    "-de": "activeModalities"
                },

                isMocking: {
                    "type": "Boolean",
                    "default": false,
                    i18n: i18n( 'inpacsconfiguration-schema.InPacsConfiguration_T.isMocking.i18n' ),
                    "-en": "Enable demo mode",
                    "-de": "Demomodus aktivieren"
                },

                defaultEncoding: {
                    "complex": "eq",
                    "type": "DefaultEncoding_E",
                    "lib": types
                }

            },

            inpacsconfiguration_T: {

                type: {
                    "complex": "eq",
                    "type": "WorkListType_E",
                    "lib": 'inpacsworklist',
                    "required": true
                },

                isActive: {
                    "type": "Boolean",
                    "default": false,
                    i18n: i18n( 'inpacsconfiguration-schema.inpacsconfiguration_T.isActive.i18n' ),
                    "-en": "isActive",
                    "-de": "isActive"
                },

                workListId: {
                    "type": "String",
                    i18n: i18n( 'inpacsconfiguration-schema.inpacsconfiguration_T.workListId' ),
                    "-en": "workListId",
                    "-de": "workListId"
                },

                numberOfImages: {
                    "type": "Number",
                    "required": true,
                    "default" : 1,
                    i18n: "Number of Images to save",
                    "-en": i18n( 'InPacsAdminMojit.worklist.numberOfImagesLabel' ),
                    "-de": i18n( 'InPacsAdminMojit.worklist.numberOfImagesLabel' )
                }
            },

            LogLevel_E: {
                "default": '',
                "type": "String",
                "list": [
                    {
                        "val": '',
                        i18n: i18n( 'InPacsAdminMojit.logfile.logLevel.NORMAL' ),
                        "-en": "NORMAL",
                        "-de": "NORMAL"
                    },
                    {
                        "val": '--verbose',
                        i18n: i18n( 'InPacsAdminMojit.logfile.logLevel.VERBOSE' ),
                        "-en": "VERBOSE",
                        "-de": "VERBOSE"
                    },
                    {
                        "val": '--trace',
                        i18n: i18n( 'InPacsAdminMojit.logfile.logLevel.TRACE' ),
                        "-en": "TRACE",
                        "-de": "TRACE"
                    }
                ]
            },

            DefaultEncoding_E: {
                "type": "String",
                "list": [
                    {
                        "val": "Utf8",
                        i18n: "Utf8",
                        "-en": "Utf8",
                        "-de": "Utf8"
                    },
                    {
                        "val": "Latin1",
                        i18n: "Latin1",
                        "-en": "Latin1",
                        "-de": "Latin1"
                    }
                ]
            }
        }
    );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    function getDefaultData() {
        return template;
    }

    Y.namespace( 'doccirrus.schemas' )[NAME] = {
        types: types,
        name: NAME,
        defaultItems: [template],

        getDefaultData: getDefaultData,
        cacheQuery: true,
        getId: function getId() {
            return MAIN_ID;
        }
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'dcschemaloader',
        'dcvalidations',
        'dcschemaloader',
        'inpacsworklist-schema'
    ]
} );
