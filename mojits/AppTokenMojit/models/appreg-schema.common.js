/**
 * User: pi
 * Date: 01/03/2018  11:15
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';
YUI.add( 'appreg-schema', function( Y, NAME ) {
        /**
         * @module appreg-schema
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            configurationTypes = {
                webHooksConfiguration: Object.freeze( {
                    MAIN: 'MAIN_WEBHOOK'
                } ),
                routeOverrideStringMatchTypes: Object.freeze( {
                    STRING: 'STRING',
                    REGEXP: 'REGEXP'
                } ),
                uiConfiguration: Object.freeze( {
                    MAIN: 'MAIN_PAGE',
                    CONFIGURATION: 'CONFIGURATION_PAGE',
                    CASEFILE: 'CASEFILE_PAGE',
                    CARETYPE_UI: 'CARETYPE_UI',
                    CASEFILE_BUTTON: 'CASEFILE_BUTTON',
                    HOME: 'HOME_PAGE',
                    PATIENT_GADGET: 'PATIENT_GADGET',
                    ACTIVTY_TAB: 'ACTIVITY_TAB'
                } )
            };

        function getConfigurationTypesList( configName ) {
            return Object.keys( configurationTypes[configName] ).map( function( key ) {
                return {
                    val: configurationTypes[configName][key],
                    i18n: 'appreg-schema.UIConfigurationType_E' + configurationTypes[configName][key]
                };
            } );
        }


        // ------- Schema definitions  -------

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'AppReg_T',
                        lib: types
                    }
                },
                AppReg_T: {
                    appName: {
                        required: true,
                        type: 'String',
                        validate: 'AppToken_T_appName',
                        i18n: i18n( 'appreg-schema.AppReg_T.appName' )
                    },
                    title: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.title' )
                    },
                    description: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.description' )
                    },
                    appVersion: {
                        type: 'String',
                        i18n: i18n( 'apptoken-schema.AppReg_T.version' )
                    },
                    storeVersion: {
                        type: 'String',
                        i18n: i18n( 'apptoken-schema.AppReg_T.storeVersion' ) // TODO add translation
                    },
                    versionIsOutdated: {
                        type: 'Boolean',
                        i18n: i18n( 'apptoken-schema.AppReg_T.versionOutdates' ) // TODO add translation
                    },
                    appCurrentPort: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.appCurrentPort' )
                    },
                    appHost: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.appHost' )
                    },
                    appHostType: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.appHostType' )
                    },
                    dbPassword: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.dbPassword' )
                    },
                    hasAccess: {
                        type: 'Boolean',
                        'default': false,
                        i18n: i18n( 'appreg-schema.AppReg_T.hasAccess' )
                    },
                    uiConfiguration: {
                        complex: 'inc',
                        type: 'UIConfiguration_T',
                        lib: types,
                        i18n: i18n( 'appreg-schema.AppReg_T.uiConfiguration' )
                    },
                    webHooksConfiguration: {
                        complex: 'inc',
                        type: 'WebHooksConfiguration_T',
                        lib: types,
                        i18n: i18n( 'appreg-schema.AppReg_T.webHooksConfiguration' )
                    },
                    routeOverrideConfiguration: {
                        complex: 'inc',
                        type: 'RouteOverrideConfiguration_T',
                        lib: types,
                        i18n: i18n( 'appreg-schema.AppReg_T.routeOverrideConfiguration' )
                    },
                    inSuiteToken: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.inSuiteToken' )
                    },
                    solToken: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.AppReg_T.solToken' )
                    }
                },
                UIConfiguration_T: {
                    type: {
                        complex: 'eq',
                        type: 'UIConfigurationType_E',
                        lib: types
                    },
                    targetUrl: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.UIConfiguration_T.targetUrl' )
                    },
                    tabName: {
                        type: "String"
                    },
                    tabTitle: {
                        complex: "eq",
                        type: "I18nObject_T",
                        lib: types
                    },
                    tabActiveActTypes: {
                        type: ['String']
                    },
                    buttonText: {
                        complex: "eq",
                        type: "I18nObject_T",
                        lib: types
                    },
                    activeTab: {
                        type: 'Boolean'
                    },
                    hiddenTabs: {
                        type: ['String']
                    }
                },
                RouteOverrideConfiguration_T: {
                    pathMatch: {
                        type: 'String'
                    },
                    hashMatch: {
                        type: 'String'
                    },
                    pathReplace: {
                        type: 'String'
                    },
                    hashReplace: {
                        type: 'String'
                    },
                    pathStringMatchType: {
                        complex: 'eq',
                        type: 'RouteOverrideStringMatchType_E',
                        lib: types
                    },
                    hashStringMatchType: {
                        complex: 'eq',
                        type: 'RouteOverrideStringMatchType_E',
                        lib: types
                    },
                    appName: {
                        type: 'String'
                    },
                    description: {
                        type: 'String'
                    },
                    appIcon: {
                        type: 'String'
                    }
                },
                WebHooksConfiguration_T: {
                    type: {
                        complex: 'eq',
                        type: 'WebHooksConfigurationType_E',
                        lib: types
                    },
                    targetUrl: {
                        type: 'String',
                        i18n: i18n( 'appreg-schema.WebbHooksConfiguration_T.targetUrl' )
                    }
                },
                UIConfigurationType_E: {
                    type: 'String',
                    'default': configurationTypes.uiConfiguration.MAIN,
                    i18n: i18n( 'appreg-schema.UIConfigurationType_E.i18n' ),
                    list: getConfigurationTypesList('uiConfiguration')
                },
                RouteOverrideStringMatchType_E: {
                    type: 'String',
                    'default': configurationTypes.routeOverrideStringMatchTypes.STRING,
                    i18n: i18n( 'appreg-schema.RouteOverrideStringMatchType_E.i18n' ),
                    list: getConfigurationTypesList('routeOverrideStringMatchTypes')
                },
                WebHooksConfigurationType_E: {
                    type: 'String',
                    'default': configurationTypes.webHooksConfiguration.MAIN,
                    i18n: i18n( 'appreg-schema.WebHooksConfigurationType_E.i18n' ),
                    list: getConfigurationTypesList('webHooksConfiguration')
                },
                "I18nObject_T": {
                    "en": {
                        "type": "String"
                    },
                    "de": {
                        "type": "String"
                    }
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
            uiConfigurationTypes: configurationTypes.uiConfiguration,
            webHooksConfigurationTypes: configurationTypes.webHooksConfiguration,
            cacheQuery: true
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [ 'doccirrus', 'dcschemaloader', 'dcvalidations' ]
    }
);
