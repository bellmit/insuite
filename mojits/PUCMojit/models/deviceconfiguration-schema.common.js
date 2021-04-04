/**
 * User: pi
 * Date: 03/08/15  09:22
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'deviceconfiguration-schema', function( Y, NAME ) {

        /**
         * Device configuration
         * Here we keep all info about device
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            updateStatus = Object.freeze({
                DAILY: 'DAILY',
                WEEKLY: 'WEEKLY',
                NEVER: 'NEVER'
            });

        types = {
            'root': {
                'base': {
                    'complex': 'ext',
                    'type': 'DeviceConfiguration_T',
                    'lib': types
                }
            },
            DeviceConfiguration_T: {
                type: {
                    complex: 'eq',
                    lib: types,
                    type: 'Type_E',
                    required: true
                },
                lastUpdate: {
                    type: 'Date',
                    i18n: i18n( 'deviceconfiguration-schema.DeviceConfiguration_T.lastUpdate.i18n' ),
                    '-en': 'Date',
                    '-de': 'Datum'
                },
                update: {
                    complex: 'eq',
                    lib: types,
                    type: 'Update_E'
                },
                patientregId: {
                    type: 'string',
                    i18n: i18n( 'deviceconfiguration-schema.DeviceConfiguration_T.patientregId.i18n' ),
                    '-en': 'patientreg Id',
                    '-de': 'patientreg Id'
                }
            },
            Type_E: {
                type: 'String',
                required: true,
                list: [
                    {
                        val: 'JAWBONE',
                        '-de': 'Jawbone',
                        i18n: i18n( 'deviceconfiguration-schema.Type_E.JAWBONE.i18n' ),
                        '-en': 'Jawbone'
                    }
                ],
                i18n: i18n( 'deviceconfiguration-schema.Type_E.i18n' ),
                '-en': 'Device Type',
                '-de': 'Gerätetyp'
            },
            Update_E: {
                type: 'String',
                default: updateStatus.NEVER,
                list: [
                    {
                        val: updateStatus.NEVER,
                        '-de': 'never',
                        i18n: i18n( 'deviceconfiguration-schema.Update_E.NEVER.i18n' ),
                        '-en': 'never'
                    },
                    {
                        val: updateStatus.DAILY,
                        '-de': 'täglich',
                        i18n: i18n( 'deviceconfiguration-schema.Update_E.DAILY.i18n' ),
                        '-en': 'daily'
                    },
                    {
                        val: updateStatus.WEEKLY,
                        '-de': 'wöchentlich',
                        i18n: i18n( 'deviceconfiguration-schema.Update_E.WEEKLY.i18n' ),
                        '-en': 'weekly'
                    }
                ],
                i18n: i18n( 'deviceconfiguration-schema.Update_E.i18n' ),
                '-en': 'Update',
                '-de': 'Update'
            }
        };

        // -------- Our Schema Methods and Hooks are defined here -------

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Static Helper Functions defined here -------

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            updateStatus: updateStatus,
            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito'
        ]
    }
);
