/**
 * User: pi
 * Date: 17/01/2018  11:15
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';
YUI.add( 'apptoken-schema', function( Y, NAME ) {
        /**
         * @module apptoken-schema
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            appTokenTypes = Object.freeze( {
                LOCAL: 'LOCAL',
                BUILTIN: 'BUILTIN'
            } ),
            builtinAppNames = Object.freeze( {
                DATAIMPORT: 'dataimport',
                DATAEXPORT: 'dataexport'
            } );

        function getAppTokenTypesList() {
            return Object.keys( appTokenTypes ).map( function( item ) {
                return {
                    val: appTokenTypes[ item ],
                    i18n: i18n( 'apptoken-schema.AppTokenType_E.' + appTokenTypes[ item ] )
                };
            } );
        }

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'AppToken_T',
                        lib: types
                    }
                },
                AppToken_T: {
                    appName: {
                        required: true,
                        validate: 'AppToken_T_appName',
                        type: 'String',
                        i18n: i18n( 'apptoken-schema.AppToken_T.appName' )
                    },
                    title: {
                        type: 'String',
                        i18n: i18n( 'apptoken-schema.AppToken_T.title' )
                    },
                    description: {
                        type: 'String',
                        i18n: i18n( 'apptoken-schema.AppToken_T.description' )
                    },
                    token: {
                        type: 'String',
                        required: true,
                        i18n: i18n( 'apptoken-schema.AppToken_T.token' )
                    },
                    type: {
                        complex: 'eq',
                        type: 'AppTokenType_E',
                        lib: types
                    }
                },
                AppTokenType_E: {
                    i18n: i18n( 'apptoken-schema.AppTokenType_E.i18n' ),
                    type: 'String',
                    'default': appTokenTypes.LOCAL,
                    'list': getAppTokenTypesList()
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            builtinAppNames: builtinAppNames,
            appTokenTypes: appTokenTypes
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [ 'doccirrus', 'dcschemaloader', 'dcvalidations' ]
    }
);
