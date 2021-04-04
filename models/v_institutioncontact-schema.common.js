/**
 * User: pi
 * Date: 04/10/16  15:20
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'v_institutioncontact-schema', function( Y, NAME ) {
        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VInstitutionContact_T",
                        "lib": types
                    }
                },
                "baseContactType_E": {
                    "type": "String",
                    "default": "INSTITUTION",
                    "required": true,
                    "apiv": { v: 2, queryParam: true },
                    "list": [
                        {
                            "val": "INSTITUTION",
                            i18n: i18n( 'basecontact-schema.BaseContactType_E.INSTITUTION.i18n' )
                        }
                    ]
                },
                "VInstitutionContact_T": {
                    "baseContactType": {
                        "complex": "eq",
                        "type": "baseContactType_E",
                        "lib": types
                    },
                    "institutionType": {
                        "complex": "eq",
                        "type": "InstitutionContactType_E",
                        "lib": types
                    },
                    "contactBase": {
                        "complex": "ext",
                        "type": "BaseContact_T",
                        "lib": "basecontact"
                    },
                    "base": {
                        "complex": "ext",
                        "type": "InstitutionContact_T",
                        "lib": "basecontact"
                    },
                    "hasContacts": {
                        "complex": "ext",
                        "type": "HasContacts_T",
                        "lib": "basecontact"
                    }
                },
                "InstitutionContactType_E": {
                    "type": "String",
                    "default": 'OTHER',
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                    "-en": i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                    "-de": i18n( 'basecontact-schema.InstitutionContact_T.institutionType.i18n' ),
                    "list": [
                        {
                            "val": "SCHOOL",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.SCHOOL.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.SCHOOL.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.SCHOOL.i18n' )
                        },
                        {
                            "val": "KINDERGARTEN",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.KINDERGARTEN.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.KINDERGARTEN.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.KINDERGARTEN.i18n' )
                        },
                        {
                            "val": "EMPLOYER",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.EMPLOYER.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.EMPLOYER.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.EMPLOYER.i18n' )
                        },
                        {
                            "val": "HOSPICE",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.HOSPICE.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.HOSPICE.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.HOSPICE.i18n' )
                        },
                        {
                            "val": "AMBULANT_HOSPICE",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.AMBULANT_HOSPICE.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.AMBULANT_HOSPICE.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.AMBULANT_HOSPICE.i18n' )
                        },
                        {
                            "val": "FAMILY_MEMBERS",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_MEMBERS.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_MEMBERS.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.FAMILY_MEMBERS.i18n' )
                        },
                        {
                            "val": "GUARDIAN",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.GUARDIAN.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.GUARDIAN.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.GUARDIAN.i18n' )
                        },
                        {
                            "val": "OTHER",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.OTHER.i18n' )
                        }
                    ]
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'basecontact-schema'
        ]
    }
);
