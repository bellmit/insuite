/**
 * User: pi
 * Date: 20/01/2016  14:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'mastertabconfig-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'MasterTabConfig_T',
                        lib: types
                    }
                },
                MasterTabConfig_T: {
                    loginLinkTitle: {
                        type: 'String',
                        i18n: i18n('mastertabconfig-schema.MasterTabConfig_T.loginLinkTitle')
                    },
                    loginLink: {
                        type: 'String',
                        i18n: i18n('mastertabconfig-schema.MasterTabConfig_T.loginLink')
                    },
                    patientBrowserLinkTitle: {
                        type: 'String',
                        i18n: i18n('mastertabconfig-schema.MasterTabConfig_T.patientBrowserLinkTitle')
                    },
                    patientBrowserLink: {
                        type: 'String',
                        i18n: i18n('mastertabconfig-schema.MasterTabConfig_T.patientBrowserLink')
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader'
        ]
    }
);
