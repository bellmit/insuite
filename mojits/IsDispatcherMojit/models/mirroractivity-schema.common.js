'use strict';
/*global YUI */
YUI.add( 'mirroractivity-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module activity-schema
         */

        /* jshint unused: false */
        // ------- Schema definitions  -------
        var
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );


        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Activity_base_T",
                        "lib": "activity"
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            /**
             * constants for "activity._attributes" which are used to flag an activity of some kind
             */
            ATTRIBUTES: {
                DAY_SEPARATION_FLAG: 1,
                NEW_DAY_FLAG: 2,
                QUARTER_CHANGE_FLAG: 3
            }

            // to use discriminators uncomment follow, but aware of
            // OverwriteModelError: Cannot overwrite `xxx` model once compiled.
            // looks like on 'validate' it try to create schema for both activity and mirroractivity

            // getDiscriminatorKeyName: function() {
            //     return 'actType';
            // },
            // getDiscriminator: function( actType ){
            //     return Y.doccirrus.schemas.activity.getDiscriminator( actType );
            // }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dckbvutils',
            'dccommonutils',
            'kbv-validations',
            'activity-schema'
        ]
    }
);
