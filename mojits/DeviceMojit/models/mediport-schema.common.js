/**
 * User: dcdev
 * Date: 5/7/19  12:24 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'mediport-schema', function( Y, NAME ) {
        /**
         * The DC mediport schema definition
         *
         * @module mediport-schema
         */

    let types = {};
    const i18n = Y.doccirrus.i18n;

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    types = Y.mix( types, {
        root: {
            base: {
                complex: 'ext',
                type: 'Mediport_T',
                lib: types
            }
        },
        Mediport_T: {
            base_Source_T: {
                complex: 'ext',
                type: 'base_Source_T',
                lib: 'v_flowsource'
            },
            base_Mediport_T: {
                complex: 'ext',
                type: 'base_Mediport_T',
                lib: types
            }
        },
        base_Mediport_T: {
            __polytype: {
                type: 'String'
            },
            incomingFileDirPath: {
                type: 'String',
                // validate: "base_File_T_filePath",
                i18n: i18n( 'file-schema.base_File_T.filePath.i18n' ),
                '-en': 'Name',
                '-de': 'Name'
            },
            outgoingFileDirPath: {
                type: 'String',
                // validate: "base_File_T_filePath",
                i18n: i18n( 'file-schema.base_File_T.filePath.i18n' ),
                '-en': 'Name',
                '-de': 'Name'
            },
            deviceServers: {
                type: [String],
                validate: 'base_File_T_deviceServer',
                i18n: i18n( 'file-schema.base_File_T.deviceServer.i18n' ),
                '-en': 'device server',
                '-de': 'device server'
            }
        }
    } );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {

        types: types,
        name: NAME
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'v_flowsource-schema'
        ]
    } );
