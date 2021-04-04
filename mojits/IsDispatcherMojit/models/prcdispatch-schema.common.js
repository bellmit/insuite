/**
 * User: MD
 * Date: 18/02/2016  13:49
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*
 {
 addresses: [Address_T]  // do only in Week9+
 }
 */



/*global YUI*/
YUI.add( 'prcdispatch-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
            'root': {
                base: {
                    complex: 'ext',
                    type: 'PRCDispatch_T',
                    lib: types
                }
            },
            "PRCDispatch_T": {
                publicKey: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.publicKey' )
                },
                prcCustomerNo: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.prcCustomerNo' )
                },
                customerNo: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.customerNo' )
                },
                customerId: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.customerId' )
                },
                coname: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.coname' )
                },
                cotype: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.cotype' )
                },
                activeState: {
                    "type": "Boolean",
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.activeState' ),
                    "-en": "activeState",
                    "-de": "activeState"
                },
                lastOnline: {
                    "type": "Date",
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.lastOnline' ),
                    "-en": "lastOnline",
                    "-de": "lastOnline"
                },
                version: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.version' )
                },
                hostname: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.hostname' )
                },
                addresses: {
                    "complex": "inc",
                    "type": "Address_T",
                    "lib": 'person',
                    "override": true,
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.addresses' ),
                    "-en": "addresses",
                    "-de": "Adressen"
                },
                communications: {
                    "complex": "inc",
                    "type": "Communication_T",
                    "lib": 'person',
                    "override": true,
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.communications' ),
                    "-en": "communications",
                    "-de": "communications"
                },
                mainLocation: {
                    type: 'String',
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.mainLocation' )
                },
                locationId: {
                    type: ['String'],
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.locationId' )
                },
                commercialNo: {
                    type: ['String'],
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.commercialNo' )
                },
                employeeId: {
                    type: ['String'],
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.emloyeeId' )
                },
                officialNo: {
                    type: ['String'],
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.officialNo' )
                },
                patientId: {
                    type: ['String'],
                    i18n: i18n( 'prcdispatch-schema.PRCDispatch_T.emloyeeId' )
                },
                "restoreStatus": {
                    "complex": "eq",
                    "type": "RestoreStatus_T",
                    lib: types
                },
                "centralContact": {
                    "type": "any",
                    i18n: i18n( 'practice-schema.Practice_T.centralContact.i18n' ),
                    "override": true,
                    "lib": types
                }
            },
            "RestoreStatus_T": {
                "type": "String",
                i18n: i18n( 'dispatchrequest-schema.RestoreStatus_T.restoreStatus' ),
                "apiv": {v: 2, queryParam: true},
                "list": [
                    {
                        "val": "OFF",
                        "-de": "Off",
                        i18n: i18n( 'ispatchrequest-schema.RestoreStatus_T.REQUESTED' ),
                        "-en": "Off"
                    },
                    {
                        "val": "REQUESTED",
                        "-de": "Requested",
                        i18n: i18n( 'ispatchrequest-schema.RestoreStatus_T.REQUESTED' ),
                        "-en": "Requested"
                    },
                    {
                        "val": "IN_PROGRESS",
                        "-de": "In progress",
                        i18n: i18n( 'ispatchrequest-schema.RestoreStatus_T.IN_PROGRESS' ),
                        "-en": "In progress"
                    },
                    {
                        "val": "ERROR",
                        "-de": "Error",
                        i18n: i18n( 'ispatchrequest-schema.RestoreStatus_T.ERROR' ),
                        "-en": "Error"
                    },
                    {
                        "val": "DONE",
                        "-de": "Done",
                        i18n: i18n( 'ispatchrequest-schema.RestoreStatus_T.DONE' ),
                        "-en": "Done"
                    }
                ]
            }
        } );

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
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'person-schema']}
)
;
