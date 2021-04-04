/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/
YUI.add( 'insight2containers-schema', function( Y, NAME ) {
    'use strict';

    var
    // ------- Schema definitions  -------
        i18n = Y.doccirrus.i18n,
        types = {};

    types = Y.mix( types, {
        "root": {
            base: {
                "complex": "ext",
                "type": "inSight2Containers_T",
                "lib": types
            }
        },
        "inSight2Containers_T": {
            "name": {
                "type": "String",
                "i18n": i18n( 'insight2-schema.inSight2Containers_T.name.i18n' ),
                "-en": "name",
                "-de": "name"
            },
            "dateRange": {
                "type": "any",
                "i18n": i18n( 'insight2-schema.inSight2Containers_T.dateRange.i18n' ),
                "-en": "dateRange",
                "-de": "dateRange"
            },
            "selectedPresetId": {
                "type": "any",
                "i18n": i18n( 'insight2-schema.inSight2Containers_T.selectedPresetId.i18n' ),
                "-en": "selectedPresetId",
                "-de": "selectedPresetId"
            },
            "userId": {
                "type": "String",
                "i18n": i18n( 'insight2-schema.inSight2Containers_T.userId.i18n' ),
                "-en": "userId",
                "-de": "userId"
            },
            "presetsOrder": {
                "type": "any",
                "i18n": i18n( 'insight2-schema.inSight2Containers_T.presetsOrder.i18n' ),
                "-en": "presetsOrder",
                "-de": "presetsOrder"
            }
        }
    }
    );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {
        types: types,
        defaultItems: [],
        name: NAME
    };
    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
},
'0.0.1', {
    requires: [
        'dcschemaloader',
        'doccirrus',
        'dcvalidations'
    ]
});