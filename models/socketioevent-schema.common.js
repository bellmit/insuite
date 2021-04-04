/**
 * User: pi
 * Date: 17/02/2015  16:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'socketioevent-schema', function( Y, NAME ) {

        /**
         * The DC case data schema definition
         *
         * @module socketioevent-schema
         */

        var
        // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            eventTypes = {},
            labels = Object.freeze({
                SYSTEM_VERSION: 'systemVersion',
                MMI_VERSION: 'mmiVersion',
                EXTERNAL_API_CALL: 'externalApiCall',
                PUC_ACTION_CALL: 'PUCActionCall'
            });

        Object.defineProperties( eventTypes, {
            'DISPLAY': {
                value: 'DISPLAY',
                enumerable: true
            },
            'CONFIRM': {
                value: 'CONFIRM',
                enumerable: true
            },
            'NODB': {
                value: 'NODB',
                enumerable: true
            }
        } );

        function createSchemaLabelList() {
            var
                result = [];
            Object.keys( labels ).forEach( function( type ) {
                result.push( {
                    val: labels[type],
                    i18n: i18n( 'socketioevent-schema.Label_E.' + labels[type] + '.i18n' )
                } );
            } );

            return result;
        }



        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    'base': {
                        'complex': 'ext',
                        'type': 'SocketIOEvent_T',
                        'lib': types
                    }
                },
                'SocketIOEvent_T': {
                    'event': {
                        "type": "String",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.event' ),
                        "-en": "Event",
                        "-de": "Event"
                    },
                    'eventType':{
                        "complex": "eq",
                        "lib": types,
                        "type": "Type_E"
                    },
                    'message': {
                        "type": "any",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.message' ),
                        "-en": "Message",
                        "-de": "Message"
                    },
                   'senderId':{
                        "type": "String",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.senderId' ),
                        "-en": "Sender id",
                        "-de": "Sender id"
                    },
                    'targetId': {
                        "type": "String",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.targetId' ),
                        "-en": "Target id",
                        "-de": "Target id"
                    },
                    'targetType': {
                        "type": "String",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.targetType' )
                    },
                    messageId: {
                        "type": "String",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.messageId' ),
                        "-en": "Message id",
                        "-de": "Message id"
                    },
                    "timestamp": {
                        "type": "Date",
                        i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.timestamp' ),
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    "label": {
                        complex: 'eq',
                        type: 'Label_E',
                        lib: types
                    }
                },
                Label_E: {
                    type: 'String',
                    list: createSchemaLabelList(),
                    i18n: i18n( 'socketioevent-schema.SocketIOEvent_T.label' )
                },
                "Type_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": eventTypes.DISPLAY,
                            i18n: i18n( 'socketioevent-schema.Type_E.DISPLAY' ),
                            "-en": "Display",
                            "-de": "Display"
                        },
                        {
                            "val": eventTypes.CONFIRM,
                            i18n: i18n( 'socketioevent-schema.Type_E.CONFIRM' ),
                            "-en": "Confirm",
                            "-de": "Confirm"
                        }
                    ],
                    i18n: i18n( 'socketioevent-schema.Type_E.i18n' ),
                    "-en": "Type",
                    "-de": "Type"
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

            eventTypes: eventTypes,

            labels: labels,

            indexes: [
                {"key": {"timestamp": 1}}
            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader','doccirrus']}
);
