/**
 * User: pi
 * Date: 29/09/2017  14:40
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'v_conferenceAppointment-schema', function( Y, NAME ) {

        var
        // ------- Schema definitions  -------
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "baseSchedule": {
                        "complex": "ext",
                        "type": "Schedule_T",
                        "lib": "calendar"
                    },
                    baseConference:{
                        "complex": "ext",
                        "type": "Conference_T",
                        "lib": "conference"
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
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader','dcvalidations', 'dcschemaloader', 'calendar-schema', 'conference-schema']}
);
