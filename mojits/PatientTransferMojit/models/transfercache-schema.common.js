/**
 * User: md
 * Date: 15/02/2019  15:45
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
'use strict';
/*global YUI*/
YUI.add( 'transfercache-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'TransferCache_T',
                        lib: types
                    }
                },
                'TransferCache_T': {
                    activityId: {
                        type: 'ObjectId',
                        '-en': 'activityId',
                        '-de': 'activityId',
                        i18n: i18n( 'transfercache-schema.TransferCache_T.activityId.i18n' )
                    },
                    patientId: {
                        'type': 'String',
                        '-en': 'patientId',
                        '-de': 'patientId',
                        i18n: i18n( 'transfercache-schema.TransferCache_T.patientId.i18n' )
                    },
                    basecontactsIds: {
                        type: ['String'],
                        '-en': 'basecontactsIds',
                        '-de': 'basecontactsIds',
                        i18n: i18n( 'transfercache-schema.TransferCache_T.basecontactsIds.i18n' )
                    },
                    timestamp: {
                        type: 'Date',
                        '-en': 'timestamp',
                        '-de': 'timestamp',
                        i18n: i18n( 'transfercache-schema.TransferCache_T.timestamp.i18n' )
                    },
                    payloadSize: {
                        type: 'Number',
                        '-en': 'payloadSize',
                        '-de': 'payloadSize',
                        i18n: i18n( 'transfercache-schema.TransferCache_T.payloadSize.i18n' )
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            indexes: [
                {"key": {"activityId": 1}}
            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader' ] }
);