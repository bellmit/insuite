/**
 * User: pi
 * Date: 22/03/2017  13:125
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'v_activityDataItem-schema', function( Y, NAME ) {
        /**
         *
         * @module activityDataItem
         */

        var

            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "ActivityDataItem_T",
                        lib: types
                    }
                },
                ActivityDataItem_T: {
                    timestamp: {
                        type: "Date",
                        i18n: i18n('InCaseMojit.casefile_browserJS.placeholder.DATE')
                    },
                    actType: {
                        type: "String",
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' )
                    },
                    subType: {
                        type: String,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' )
                    },
                    catalogShort: {
                        type: "String",
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' )
                    },
                    code: {
                        type: "String",
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' )
                    },
                    userContent: {
                        type: "String",
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' )
                    },
                    billingFactorValue: {
                        type: "Number"
                    },
                    explanations: {
                        type: "String",
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.EXPLANATIONS' )
                    },
                    count: {
                        "default": 1,
                        type: "Number",
                        validate: "ActivityDataItem_T_count"
                    },
                    active: {
                        type: "Boolean"
                    },
                    hasInactive: {
                        type: "Boolean"
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
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader' ] }
);
