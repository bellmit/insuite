/**
 * User: martinpaul
 * Date: 24.06.13  09:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'message-schema', function( Y, NAME ) {

        /**
         * The REST Process data schema / mongoose Schemas.
         *
         * @module RESTSchema
         */

        'use strict';

        var
        // ------- private 'constants'  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------
        types = Y.mix( types, {
                "root": {
                    "base1": {
                        "type": "MessageComm_T",
                        "complex": "ext",
                        "lib": types
                    },
                    "base2": {
                        "type": "MessageApp_T",
                        "complex": "ext",
                        "lib": types
                    }
                },
                "MessageComm_T": {
                    "level": {
                        "type": "Level_E",
                        "complex": "eq",
                        "lib": types,
                        i18n: i18n( 'message-schema.MessageComm_T.level' ),
                        "-en": "level",
                        "-de": "level"
                    },
                    "target": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageComm_T.target' ),
                        "-en": "target",
                        "-de": "target"
                    },
                    "publicKey": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageComm_T.publicKey.i18n' ),
                        "-en": "publicKey",
                        "-de": "publicKey"
                    },
                    "hash": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageComm_T.hash' ),
                        "-en": "hash",
                        "-de": "hash"
                    },
                    "channel": {
                        "type": "ChannelType_E",
                        "complex": "eq",
                        "lib": types,
                        i18n: i18n( 'message-schema.MessageComm_T.channel' ),
                        "-en": "channel",
                        "-de": "channel"
                    },
                    "state": {
                        "type": "MsgState_E",
                        "complex": "eq",
                        "lib": types,
                        i18n: i18n( 'message-schema.MessageComm_T.state' ),
                        "-en": "state",
                        "-de": "state"
                    }
                },
                "MessageApp_T": {
                    "messageId": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'message-schema.MessageApp_T.messageId' ),
                        "-en": "messageId",
                        "-de": "messageId"
                    },
                    "practiceId": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'message-schema.MessageApp_T.practiceId' ),
                        "-en": "practiceId",
                        "-de": "practiceId"
                    },
                    "patientId": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageApp_T.patientId' ),
                        "-en": "patientId",
                        "-de": "patientId"
                    },
                    "practiceName": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'message-schema.MessageApp_T.practiceName' ),
                        "-en": "practiceName",
                        "-de": "practiceName"
                    },
                    "content": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageApp_T.content' ),
                        "-en": "content",
                        "-de": "content"
                    },
                    "contentUrl": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageApp_T.contentUrl' ),
                        "-en": "URL",
                        "-de": "URL"
                    },
                    "isRecall": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'message-schema.MessageApp_T.isRecall' ),
                        "-en": "isRecall",
                        "-de": "isRecall"
                    },
                    "email": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageApp_T.email' ),
                        "-en": "email",
                        "-de": "email"
                    },
                    "phone": {
                        "type": "String",
                        i18n: i18n( 'message-schema.MessageApp_T.phone' ),
                        "-en": "phone",
                        "-de": "phone"
                    },
                    sendAt: {
                        "type": "Date",
                        i18n: i18n( 'message-schema.MessageApp_T.sendAt' ),
                        "-en": i18n( 'message-schema.MessageApp_T.sendAt' ),
                        "-de": i18n( 'message-schema.MessageApp_T.sendAt' )
                    },
                    contentId: {
                        "type": "ObjectId",
                        i18n: i18n( 'message-schema.MessageApp_T.contentId' ),
                        "-en": i18n( 'message-schema.MessageApp_T.contentId' ),
                        "-de": i18n( 'message-schema.MessageApp_T.contentId' )
                    }
                },
                "ChannelType_E": {
                    "type": "String",
                    "required": true,
                    "list": [
                        {
                            "val": "SOCKETIO",
                            i18n: i18n( 'message-schema.ChannelType_E.SOCKETIO' ),
                            "-en": "web",
                            "-de": "web"
                        },
                        {
                            "val": "SMS",
                            i18n: i18n( 'message-schema.MessageApp_T.SMS' ),
                            "-en": "sms",
                            "-de": "sms"
                        },
                        {
                            "val": "EMAIL",
                            i18n: i18n( 'message-schema.MessageApp_T.EMAIL' ),
                            "-en": "email",
                            "-de": "email"
                        },
                        {
                            "val": "HTTPS",
                            i18n: i18n( 'message-schema.MessageApp_T.HTTPS' ),
                            "-en": "https",
                            "-de": "https"
                        }
                    ]
                },
                "Level_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "SUCCESS",
                            i18n: i18n( 'message-schema.Level_E.SUCCESS' ),
                            "-en": "success",
                            "-de": "Erfolg"
                        },
                        {
                            "val": "INFO",
                            i18n: i18n( 'message-schema.Level_E.INFO' ),
                            "-en": "info",
                            "-de": "Info"
                        },
                        {
                            "val": "WARNING",
                            i18n: i18n( 'message-schema.Level_E.WARNING' ),
                            "-en": "warning",
                            "-de": "Achtung"
                        },
                        {
                            "val": "ERROR",
                            i18n: i18n( 'message-schema.Level_E.ERROR' ),
                            "-en": "error",
                            "-de": "Fehler"
                        }
                    ]
                },
                "MsgState_E": {
                    "type": "String",
                    "required": true,
                    "default": "NEW",
                    "list": [
                        {
                            "val": "NEW",
                            i18n: i18n( 'message-schema.MsgState_E.NEW' ),
                            "-en": "new",
                            "-de": "neu"
                        },
                        {
                            "val": "SENT",
                            i18n: i18n( 'message-schema.MsgState_E.SENT' ),
                            "-en": "sent",
                            "-de": "versandt"
                        },
                        {
                            "val": "SEEN",
                            i18n: i18n( 'message-schema.MsgState_E.SEEN' ),
                            "-en": "seen",
                            "-de": "gesehen"
                        },
                        {
                            "val": "ARCHIVED",
                            i18n: i18n( 'message-schema.MsgState_E.ARCHIVED' ),
                            "-en": "archived",
                            "-de": "archiviert"
                        },
                        {
                            "val": "ERROR", // TRANSPORT ERROR
                            i18n: i18n( 'message-schema.MsgState_E.ERROR' ),
                            "-en": "error",
                            "-de": "fehler"
                        }
                    ]
                }
            }
        );

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

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
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);
