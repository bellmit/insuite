/**
 * User: florian
 * Date: 26.11.20  13:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global YUI */

YUI.add( 'tiDirectoryService-schema', function( Y, NAME ) {
        /**
         * @module 'tiDirectoryService-schema'
         */
        const i18n = Y.doccirrus.i18n;
        // eslint-disable-next-line es5/no-block-scoping
        let types = {};

        types = Y.mix( types, {
            root: {
                base: {
                    complex: 'ext',
                    type: 'TiDirectoryService_T',
                    lib: types
                }
            },
            TiDirectoryService_T: {
                dn: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.dn.i18n' )
                },
                controls: {
                    type: ['String'],
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.dn.i18n' )
                },
                objectClass: {
                    complex: 'eq',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.objectClass.i18n' ),
                    type: 'objectClass_E',
                    lib: types
                },
                givenName: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.givenName.i18n' )
                },
                sn: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.sn.i18n' )
                },
                postalCode: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.postalCode.i18n' )
                },
                streetAddress: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.streetAddress.i18n' )
                },
                localityName: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.localityName.i18n' )
                },
                cn: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.cn.i18n' )
                },
                displayName: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.displayName.i18n' )
                },
                title: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.title.i18n' )
                },
                stateOrProvinceName: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.stateOrProvinceName.i18n' )
                },
                organization: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.organization.i18n' )
                },
                otherName: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.otherName.i18n' )
                },
                personalEntry: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.personalEntry.i18n' )
                },
                uid: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.uid.i18n' )
                },
                mail: {
                    type: ['String'],
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.mail.i18n' )
                },
                specialisation: {
                    type: 'String',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.specialization.i18n' )
                },
                published: {
                    type: 'Boolean',
                    i18n: i18n( 'tiDirectoryService-schema.TiDirectoryService_T.published.i18n' )
                }
            },
            objectClass_E: {
                type: ['String'],
                list: [
                    {
                        val: 'telematikMember',
                        i18n: i18n( 'tiDirectoryService-schema.objectClass_E.telematikMember' ),
                        "-de": i18n( 'tiDirectoryService-schema.objectClass_E.telematikMember' ),
                        "-en": i18n( 'tiDirectoryService-schema.objectClass_E.telematikMember' )
                    },
                    {
                        val: 'inetOrgPerson',
                        i18n: i18n( 'tiDirectoryService-schema.objectClass_E.inetOrgPerson' ),
                        '-de': i18n( 'tiDirectoryService-schema.objectClass_E.inetOrgPerson' ),
                        '-en': i18n( 'tiDirectoryService-schema.objectClass_E.inetOrgPerson' )
                    },
                    {
                        val: 'organizationalPerson',
                        i18n: i18n( 'tiDirectoryService-schema.objectClass_E.organizationalPerson' ),
                        '-de': i18n( 'tiDirectoryService-schema.objectClass_E.organizationalPerson' ),
                        '-en': i18n( 'tiDirectoryService-schema.objectClass_E.organizationalPerson' )
                    },
                    {
                        val: 'person',
                        i18n: i18n( 'tiDirectoryService-schema.objectClass_E.person' ),
                        '-de': i18n( 'tiDirectoryService-schema.objectClass_E.person' ),
                        '-en': i18n( 'tiDirectoryService-schema.objectClass_E.person' )
                    },
                    {
                        val: 'top',
                        i18n: i18n( 'tiDirectoryService-schema.objectClass_E.top' ),
                        '-de': i18n( 'tiDirectoryService-schema.objectClass_E.top' ),
                        '-en': i18n( 'tiDirectoryService-schema.objectClass_E.top' )
                    }
                ]
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * @class tiDirectoryService
         * @namespace doccirrus.schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            defaultItems: [],
            name: NAME
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