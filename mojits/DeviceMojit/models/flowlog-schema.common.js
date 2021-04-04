/**
 * User: jm
 * Date: 2017-02-08  17:44
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'flowlog-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module flow-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;
    
        types = Y.mix( types, {
            root: {
                base: {
                    complex: 'ext',
                    type: 'Flowlog_T',
                    lib: types
                }
            },
            Flowlog_T: {
                flowName: {
                    type: 'String',
                    i18n: i18n( 'flowlog-schema.Flowlog_T.flowName.i18n' ),
                    '-en': 'Title',
                    '-de': 'Title'
                },
                flowComponentName: {
                    type: 'String',
                    i18n: i18n( 'flowlog-schema.Flowlog_T.flowComponentName.i18n' ),
                    '-en': 'Title',
                    '-de': 'Title'
                },
                msg: {
                    type: 'String',
                    i18n: i18n( 'flowlog-schema.Flowlog_T.msg.i18n' ),
                    '-en': 'Title',
                    '-de': 'Title'
                },
                latestOccurrence: {
                    type: 'Date',
                    i18n: i18n( 'flowlog-schema.Flowlog_T.latestOccurrence.i18n' ),
                    '-en': 'Title',
                    '-de': 'Title'
                },
                timesOccurred: {
                    type: [Date],
                    i18n: i18n( 'flowlog-schema.Flowlog_T.timesOccurred.i18n' ),
                    '-en': 'Title',
                    '-de': 'Title'
                },
                fileDownloadUrl: {
                    'type': 'String',
                    i18n: i18n( 'flowlog-schema.Flowlog_T.fileDownloadUrl.i18n' ),
                    '-en': i18n( 'flowlog-schema.Flowlog_T.fileDownloadUrl.i18n' ),
                    '-de': i18n( 'flowlog-schema.Flowlog_T.fileDownloadUrl.i18n' )
                }
            }
        });
    
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            /**
             * @property name
             * @type {String}
             * @default flow
             * @protected
             */
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'database-schema'
        ]
    }
);
