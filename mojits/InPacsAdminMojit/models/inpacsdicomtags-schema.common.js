/*global YUI*/
'use strict';

YUI.add( 'inpacsdicomtags-schema', function( Y, NAME ) {

    var
        types = {},
        i18n = Y.doccirrus.i18n,
        fs = require( 'fs' ),
        template = JSON.parse( fs.readFileSync( 'mojits/InPacsAdminMojit/config/DiComTags.json', 'utf8' ) );

    types = Y.mix( types, {
        "root": {
            "base": {
                "complex": "ext",
                "type": "InPacsDiComTag_T",
                "lib": types
            }
        },

        InPacsDiComTag_T: {
            tagId: {
                "type": "String",
                i18n: i18n( 'inpacsdicomtags.InPacsDiComTag_T.tagId.i18n' ),
                "-en": "tagId",
                "-de": "tagId"
            },
            tagName: {
                "type": "String",
                i18n: i18n( 'inpacsdicomtags.InPacsDiComTag_T.tagName.i18n' ),
                "-en": "tagName",
                "-de": "tagName"
            }
        }
    } );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {
        types: types,
        name: NAME,
        defaultItems: template
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'dcschemaloader',
        'dcvalidations',
        'dcschemaloader'
    ]
} );
