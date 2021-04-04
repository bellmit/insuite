/**
 * User: do
 * Date: 18.10.18  15:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'vknrbyserialno-schema', function( Y, NAME ) {
        'use strict';

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'VknrBySerialNo_T',
                        lib: types
                    }
                },
                VknrBySerialNo_T: {
                    serialNo: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItem_T.serialNo'),
                        "-en": "Seriennummer",
                        "-de": "Serial No."
                    },
                    content: {
                        "complex": "inc",
                        "type": "VknrBySerialNoContent_T",
                        "lib": types,
                        i18n: i18n( 'insurancegroup-schema.InsuranceGroupItem_T.content' ),
                        "-en": "Inhalt",
                        "-de": "Content"
                    }
                },
                VknrBySerialNoContent_T: {
                    name: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItemContent_T.name'),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    vknr: {
                        type: 'String',
                        i18n: i18n('insurancegroup-schema.InsuranceGroupItemContent_T.vknr'),
                        "-en": "VKNR",
                        "-de": "VKNR"
                    }
                }
            }
        );

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
            'dcschemaloader'
        ]
    }
);
