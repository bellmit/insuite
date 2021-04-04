/**
 * User: dcdev
 * Date: 8/5/20  1:03 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'patientemail-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module patientemail-schema
         */

        var

            // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;
        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'PatientEmails_T',
                        'lib': types
                    }
                },

                'PatientEmails_T': {
                    contentPreview: {
                        "type": "String",
                        i18n: "contentPreview",
                        "-en": "contentPreview",
                        "-de": "contentPreview"
                    },
                    to: {
                        "type": "String",
                        i18n:  i18n( 'InCaseMojit.mailActivities.TO' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.TO' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.TO' )
                    },
                    from: {
                        "type": "String",
                        i18n:  i18n( 'InCaseMojit.mailActivities.FROM' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.FROM' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.FROM' )
                    },
                    userId: {
                        "type": "ObjectId",
                        i18n: "userId",
                        "-en": "userId",
                        "-de": "userId"
                    },
                    subject: {
                        "type": "String",
                        i18n:  i18n( 'InCaseMojit.mailActivities.SUBJECT_SHORT' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.SUBJECT_SHORT' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.SUBJECT_SHORT' )
                    },
                    content: {
                        "type": "String",
                        i18n: i18n( 'InCaseMojit.mailActivities.E_MAIL' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.E_MAIL' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.E_MAIL' )
                    },
                    activities: {
                        "type": ["ObjectId"],
                        i18n: "activitiesSent",
                        "-en": "activitiesSent",
                        "-de": "activitiesSent"
                    },
                    replyTo: {
                        "type": "String",
                        i18n: i18n( 'InCaseMojit.mailActivities.REPLY_TO' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.REPLY_TO' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.REPLY_TO' )
                    },
                    attachmentIds: {
                        "type": ["ObjectId"],
                        i18n: i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' )
                    },
                    attachments: {
                        "type": "any",
                        i18n: i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.ATTACHMENTS' )
                    },
                    sentDate: {
                        "type": "Date",
                        i18n: i18n( 'InCaseMojit.mailActivities.SENT_DATE' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.SENT_DATE' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.SENT_DATE' )
                    },
                    targetName: {
                        "type": "String",
                        i18n: i18n( 'InCaseMojit.mailActivities.TO' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.TO' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.TO' )
                    },
                    senderName: {
                        "type": "String",
                        i18n: i18n( 'InCaseMojit.mailActivities.FROM' ),
                        "-en": i18n( 'InCaseMojit.mailActivities.FROM' ),
                        "-de": i18n( 'InCaseMojit.mailActivities.FROM' )
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
