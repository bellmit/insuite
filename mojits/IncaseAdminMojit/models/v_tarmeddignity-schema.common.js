/**
 * User: oliversieweke
 * Date: 06.02.19  13:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

YUI.add( 'v_tarrmeddignity-schema', function( Y, NAME ) {
        var i18n = Y.doccirrus.i18n;
        var types = {};

        types = Y.mix( types,
            {
                root: {
                    tarmedDignity: {
                        complex: "ext",
                        type: "TarmedDignity_T",
                        lib: types
                    },
                    catalogShort: {
                        type: "String",
                        default: "TARMED_DIGNI_QUALI",
                        required: true
                    }
                },
                TarmedDignity_T: {
                    catalogExtension: {
                        type: "Boolean",
                        default: true,
                        required: true,
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.i18n' )
                    },
                    code: {
                        type: "String",
                        required: true,
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.code.i18n' )
                    },
                    text: {
                        type: "String",
                        required: true,
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.text.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader'
        ]
    }
);