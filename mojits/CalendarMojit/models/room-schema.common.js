/*global YUI*/
'use strict';
YUI.add( 'room-schema', function( Y, NAME ) {

        /**
         * @module calendar
         * @submodule models
         * @namespace doccirrus.schemas
         * @class Room
         */

        var
            // ------- private 'constants'  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            ROOM_DEFAULT_COLOR = "#cef2d8",
            WAITING_ROOM_ID = '000000000000000000000001',
            TREATMENT_ROOM_ID = '000000000000000000000002',
            DEFAULT_TREATMENT_COLOR = '#f2eea9',
            DEFAULT_WAITING_COLOR = '#bed3ed',
            rootRoomsTemplate = [
                {
                    _id: WAITING_ROOM_ID,
                    roomType: "waiting",
                    name: 'CalendarMojit.room_modal.waiting_room_name',
                    color: DEFAULT_WAITING_COLOR,
                    isDeletable: false
                },
                {
                    _id: TREATMENT_ROOM_ID,
                    roomType: "treatment",
                    name: 'CalendarMojit.room_modal.treatment_room_name',
                    color: DEFAULT_TREATMENT_COLOR,
                    isDeletable: false
                }
            ];

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "Room_T",
                        "lib": types
                    }
                },
            "Room_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        "default": "",
                        i18n: i18n( 'scheduletype-schema.Room_T.name.i18n' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "color": {
                        "type": "String",
                        "default": ROOM_DEFAULT_COLOR,
                        i18n: i18n( 'scheduletype-schema.Room_T.color' ),
                        "-en": "color",
                        "-de": "color"
                    },
                    "numberOfPatients": {
                        "type": "Number",
                        i18n: i18n( 'scheduletype-schema.Room_T.numberOfPatients' ),
                        "-en": "numberOfPatients",
                        "-de": "numberOfPatients"
                    },
                    "roomType": {
                        "type": "String",
                        "default": 'waiting',
                        i18n: i18n( 'scheduletype-schema.Room_T.roomType' ),
                        "-en": "room Type",
                        "-de": "room Type"
                    },
                    // to avoid delete default rooms
                    "isDeletable": {
                        "type":"Boolean",
                        "default": true,
                        "required": true,
                        "i18n": i18n( 'room-schema.RoomConfiguration_T.isDeletable' )
                    },
                    "order": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: false},
                        "i18n": i18n( 'calendar-schema.Schedule_T.order' )
                    }
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,
            defaultItems: rootRoomsTemplate,
            /* MANDATORY */
            types: types,
            getDefaultRoomColor: function getDefaultRoomColor() {
                return ROOM_DEFAULT_COLOR;
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcschemaloader', 'calendar-schema' ] }
);
