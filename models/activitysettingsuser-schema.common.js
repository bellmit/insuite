/*globals YUI */

YUI.add( 'activitysettingsuser-schema', function( Y, NAME ) {

        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix(
            types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "ActivitySettingsUser_T",
                        "lib": types
                    }
                },
                "ActivitySettingsUser_T": {
                    "userId": {
                        "type": "String",
                        i18n: i18n( 'activitysettingsuser-schema.ActivitySetting_T.userId.i18n' ),
                        "-en": i18n( 'activitysettingsuser-schema.ActivitySetting_T.userId.i18n' ),
                        "-de": i18n( 'activitysettingsuser-schema.ActivitySetting_T.userId.i18n' )
                    },
                    "settingsSorting": {
                        "type": [String],
                        i18n: i18n( 'activitysettingsuser-schema.ActivitySetting_T.settingsSorting.i18n' ),
                        "-en": i18n( 'activitysettingsuser-schema.ActivitySetting_T.settingsSorting.i18n' ),
                        "-de": i18n( 'activitysettingsuser-schema.ActivitySetting_T.settingsSorting.i18n' )
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
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);

