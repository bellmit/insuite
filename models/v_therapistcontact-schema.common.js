/**
 * User: pi
 * Date: 06/12/2016  14:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'v_therapistcontact-schema', function( Y, NAME ) {

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
                        "type": "VTherapistContact_T",
                        "lib": types
                    }
                },
                "baseContactType_E": {
                    "type": "String",
                    "default": "THERAPIST",
                    "required": true,
                    "apiv": { v: 2, queryParam: true },
                    "list": [
                        {
                            "val": "THERAPIST",
                            i18n: i18n( 'basecontact-schema.BaseContactType_E.THERAPIST.i18n' )
                        }
                    ]
                },
                "VTherapistContact_T": {
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
                        "apiv": {v: 2, queryParam: false},
                        "lib": "basecontact"
                    },
                    "base": {
                        "complex": "ext",
                        "apiv": {v: 2, queryParam: true},
                        "type": "PhysicianContact_T",
                        "lib": "basecontact"
                    },
                    "hasContacts": {
                        "complex": "ext",
                        "apiv": {v: 2, queryParam: false},
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
                            "val": "ERGO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.ERGO.i18n' )
                        },
                        {
                            "val": "LOGO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.LOGO.i18n' )
                        },
                        {
                            "val": "PHYSIO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.PHYSIO.i18n' )
                        },
                        {
                            "val": "MANUELL",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.MANUELL.i18n' )
                        },
                        {
                            "val": "PHYCHO",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.PHYCHO.i18n' )
                        },
                        {
                            "val": "OSTEOPATH",
                            i18n: i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' ),
                            "-en": i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' ),
                            "-de": i18n( 'basecontact-schema.InstitutionContactType_E.OSTEOPATH.i18n' )
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
            'dcschemaloader',
            'basecontact-schema'
        ]
    }
);
