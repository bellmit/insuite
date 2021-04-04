/*global YUI */
// NBB:  the file name and the schema name are linked by Mojito and must match!
YUI.add( 'dashboard-schema', function( Y, NAME ) {
        'use strict';
        /**
         * @module dashboard-schema
         */
        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'Dashboard_T',
                        'lib': types
                    }
                },
                'Dashboard_T': {
                    'userId': {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'dashboard-schema.Dashboard_T.userId.i18n' ),
                        "-en": i18n( 'dashboard-schema.Dashboard_T.userId.i18n' ),
                        "-de": i18n( 'dashboard-schema.Dashboard_T.userId.i18n' )
                    },
                    'environment': {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'dashboard-schema.Dashboard_T.environment.i18n' ),
                        "-en": i18n( 'dashboard-schema.Dashboard_T.environment.i18n' ),
                        "-de": i18n( 'dashboard-schema.Dashboard_T.environment.i18n' )
                    },
                    'activeDashboardId': {
                        "default": '',
                        "type": "String",
                        i18n: i18n( 'dashboard-schema.Dashboard_T.activeDashboardId.i18n' ),
                        "-en": i18n( 'dashboard-schema.Dashboard_T.activeDashboardId.i18n' ),
                        "-de": i18n( 'dashboard-schema.Dashboard_T.activeDashboardId.i18n' )
                    },
                    'dashboards': {
                        "complex": "inc",
                        "type": "DashboardSetting_T",
                        "lib": types,
                        i18n: i18n( 'dashboard-schema.Dashboard_T.dashboards.i18n' ),
                        "-en": i18n( 'dashboard-schema.Dashboard_T.dashboards.i18n' ),
                        "-de": i18n( 'dashboard-schema.Dashboard_T.dashboards.i18n' )
                    }
                },
                'DashboardSetting_T': {
                    'name': {
                        "default": '',
                        "type": "String",
                        required: true,
                        i18n: i18n( 'dashboard-schema.DashboardSetting_T.name.i18n' ),
                        "-en": i18n( 'dashboard-schema.DashboardSetting_T.name.i18n' ),
                        "-de": i18n( 'dashboard-schema.DashboardSetting_T.name.i18n' )
                    },
                    'layout': {
                        "type": "Number",
                        required: true,
                        i18n: i18n( 'dashboard-schema.DashboardSetting_T.layout.i18n' ),
                        "-en": i18n( 'dashboard-schema.DashboardSetting_T.layout.i18n' ),
                        "-de": i18n( 'dashboard-schema.DashboardSetting_T.layout.i18n' )
                    },
                    'maximized': {
                        "default": '',
                        "type": "String",
                        i18n: i18n( 'dashboard-schema.DashboardSetting_T.maximized.i18n' ),
                        "-en": i18n( 'dashboard-schema.DashboardSetting_T.maximized.i18n' ),
                        "-de": i18n( 'dashboard-schema.DashboardSetting_T.maximized.i18n' )
                    },
                    'collections': {
                        "complex": "inc",
                        "type": "DashboardCollection_T",
                        "lib": types,
                        i18n: i18n( 'dashboard-schema.DashboardSetting_T.collections.i18n' ),
                        "-en": i18n( 'dashboard-schema.DashboardSetting_T.collections.i18n' ),
                        "-de": i18n( 'dashboard-schema.DashboardSetting_T.collections.i18n' )
                    }
                },
                'DashboardCollection_T': {
                    'gadgets': {
                        "complex": "inc",
                        "type": "GadgetCollection_T",
                        "lib": types,
                        i18n: i18n( 'dashboard-schema.DashboardCollection_T.gadgets.i18n' ),
                        "-en": i18n( 'dashboard-schema.DashboardCollection_T.gadgets.i18n' ),
                        "-de": i18n( 'dashboard-schema.DashboardCollection_T.gadgets.i18n' )
                    }
                },
                'GadgetCollection_T': {
                    'gadgetConst': {
                        "type": "Number",
                        required: true,
                        i18n: i18n( 'dashboard-schema.GadgetCollection_T.gadgetConst.i18n' ),
                        "-en": i18n( 'dashboard-schema.GadgetCollection_T.gadgetConst.i18n' ),
                        "-de": i18n( 'dashboard-schema.GadgetCollection_T.gadgetConst.i18n' )
                    },
                    'config': {
                        "type": "any",
                        i18n: i18n( 'dashboard-schema.GadgetCollection_T.config.i18n' ),
                        "-en": i18n( 'dashboard-schema.GadgetCollection_T.config.i18n' ),
                        "-de": i18n( 'dashboard-schema.GadgetCollection_T.config.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
