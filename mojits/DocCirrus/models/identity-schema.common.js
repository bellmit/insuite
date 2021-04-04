/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';

YUI.add( 'identity-schema', function( Y, NAME ) {

        var
            // ------- private 'constants'  -------
            ONEYEARINSECONDS = 31536000000,

            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            partnersList = Object.freeze( {
                UVITA: 'UVITA'
            } );

        function getSchemaPartnersList() {
            return Object.keys( partnersList ).map( function( partner ) {
                return { val: partner, i18n: i18n( 'identity-schema.PartnerId_E.' + partner ) };
            } );
        }

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "Domain": "Identity",
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Identity_T",
                        "lib": types
                    },
                    "onlineStatuses": {
                        "complex": "ext",
                        "type": "OnlineStatus_T",
                        "lib": types
                    },
                    "employeeBase": {
                        "complex": "ext",
                        "type": "EmployeeCommon_T",
                        "lib": 'employee'
                    },
                    "locations": {
                        "complex": "inc",
                        "type": "EmployeeLocations_T",
                        "lib": 'employee'
                    },
                    "signaling": {
                        "default": true,
                        "type": "Boolean",
                        i18n: i18n( 'person-schema.Communication_T.signaling' ),
                        "-en": "Signaling",
                        "-de": "Signalisierung"
                    }
                },
                "Identity_T": {
                    "specifiedBy": {
                        "type": "String",
                        "future": "person.foreignkey",
                        i18n: i18n( 'identity-schema.Identity_T.id' ),
                        "-en": "specifiedBy",
                        "-de": "specifiedBy"
                    },
                    "firstname": {
                        "type": "String",
                        "future": "person.foreigndatacopy",
                        i18n: i18n( 'identity-schema.Identity_T.firstname' ),
                        "-en": "First Name",
                        "-de": "firstname"
                    },
                    "lastname": {
                        "type": "String",
                        "future": "person.foreigndatacopy",
                        i18n: i18n( 'identity-schema.Identity_T.lastname' ),
                        "-en": "lastname",
                        "-de": "lastname"
                    },
                    country: {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Identity_T.country' ),
                        "-en": "country",
                        "-de": "Land"
                    },
                    "pw": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Identity_T.pw' ),
                        "-en": "pw",
                        "-de": "pw"
                    },
                    "cardKey": {
                        "type": "String",
                        "default": "",
                        i18n: i18n( 'identity-schema.Identity_T.cardKey.i18n' ),
                        "-en": i18n( 'identity-schema.Identity_T.cardKey.i18n' ),
                        "-de": i18n( 'identity-schema.Identity_T.cardKey.i18n' )
                    },
                    "companySecret": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Identity_T.companySecret' ),
                        "-en": "companySecret",
                        "-de": "companySecret"
                    },
                    "validFrom": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.Identity_T.validFrom' ),
                        "-en": "validFrom",
                        "-de": "validFrom"
                    },
                    "validTo": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.Identity_T.validTo' ),
                        "-en": "validTo",
                        "-de": "validTo"
                    },
                    "expireDate": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.Identity_T.expireDate.i18n' ),
                        "-en": "expireDate",
                        "-de": "expireDate"
                    },
                    "accountInfo": {
                        "complex": "ext",
                        "type": "Account_T",
                        "lib": 'employee'
                    },
                    "pwResetToken": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Identity_T.pwResetToken' ),
                        "-en": "pwResetToken",
                        "-de": "pwResetToken"
                    },
                    "loginToken": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Identity_T.loginToken' ),
                        "-en": "loginToken",
                        "-de": "loginToken"
                    },
                    "nextLoginAttempt": {
                        "type": "Date",
                        "-en": "nextLoginAttempt",
                        "-de": "nextLoginAttempt"
                    },
                    "failedLoginCount": {
                        "type": "number",
                        "-en": "failedLoginCount",
                        "-de": "failedLoginCount"
                    },
                    "jawboneData": {
                        "type": "object",
                        i18n: i18n( 'identity-schema.jawboneData.i18n' ),
                        "-en": "jawbone data",
                        "-de": "jawbone Daten"
                    },
                    "partnerIds": {
                        "complex": "inc",
                        "type": "PartnerIds_T",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.i18n' ),
                        "lib": types
                    },
                    "profileLastActivated": {
                        "type": "object",
                        "-en": "profileLastActivated",
                        "-de": "profileLastActivated"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    }
                },
                "PartnerIds_T": {
                    "partnerId": {
                        "complex": "eq",
                        "type": "PartnerId_E",
                        "lib": types,
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.partnerId.i18n' )
                    }
                },
                "PartnerId_E": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "list": getSchemaPartnersList(),
                    i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' )
                },
                "Right_T": {
                    "type": {
                        "complex": "eq",
                        "type": "CRUD_E",
                        "lib": types,
                        i18n: i18n( 'identity-schema.Right_T.type' ),
                        "-en": "type",
                        "-de": "type"
                    },
                    "entityClass": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Right_T.entityClass' ),
                        "-en": "entityClass",
                        "-de": "entityClass"
                    },
                    "entityID": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Right_T.entityID' ),
                        "-en": "entityID",
                        "-de": "entityID"
                    },
                    "context": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Right_T.context' ),
                        "-en": "context",
                        "-de": "context"
                    },
                    "descr": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Right_T.descr' ),
                        "-en": "descr",
                        "-de": "descr"
                    }
                },
                "CRUD_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "CREATE",
                            i18n: i18n( 'identity-schema.CRUD_E.CREATE' ),
                            "-en": "create",
                            "-de": "create"
                        },
                        {
                            "val": "READ",
                            i18n: i18n( 'identity-schema.CRUD_E.READ' ),
                            "-en": "read",
                            "-de": "read"
                        },
                        {
                            "val": "UPDATE",
                            i18n: i18n( 'identity-schema.CRUD_E.UPDATE' ),
                            "-en": "update",
                            "-de": "update"
                        },
                        {
                            "val": "DELETE",
                            i18n: i18n( 'identity-schema.CRUD_E.DELETE' ),
                            "-en": "delete",
                            "-de": "delete"
                        }
                    ]
                },
                "Deputy_T": {
                    "from": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.Deputy_T.from' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "to": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.Deputy_T.tp' ),
                        "-en": "to",
                        "-de": "to"
                    }
                },
                "Entity_T": {
                    "id": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Entity_T.id' ),
                        "-en": "id",
                        "-de": "id"
                    },
                    "class": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.Entity_T.class' ),
                        "-en": "class",
                        "-de": "class"
                    }
                },
                "AuditLog_T": {
                    "when": {
                        "type": "Date",
                        i18n: i18n( 'identity-schema.AuditLog_T.when' ),
                        "-en": "when",
                        "-de": "when"
                    },
                    "what": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.AuditLog_T.what' ),
                        "-en": "what",
                        "-de": "what"
                    },
                    "how": {
                        "complex": "eq",
                        "type": "CRUD_E",
                        "lib": types,
                        i18n: i18n( 'identity-schema.AuditLog_T.how' ),
                        "-en": "how",
                        "-de": "how"
                    }
                },
                "IdentityBlueprint_T": {
                    "name": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.IdentityBlueprint_T.name' ),
                        "-en": "name",
                        "-de": "name"
                    },
                    "descr": {
                        "type": "String",
                        i18n: i18n( 'identity-schema.IdentityBlueprint_T.descr' ),
                        "-en": "descr",
                        "-de": "descr"
                    }
                },
                "OnlineStatus_T": {
                    "onlineEmp": {
                        "type": "boolean",
                        "default": undefined,
                        i18n: i18n( 'identity-schema.OnlineStatus_T.onlineEmp.i18n' ),
                        "-en": "online for Employees",
                        "-de": "online für Mitarbeiter"
                    },
                    "onlinePat": {
                        "type": "boolean",
                        "default": undefined,
                        i18n: i18n( 'identity-schema.OnlineStatus_T.onlinePat.i18n' ),
                        "-en": "online for Patients",
                        "-de": "online für Patienten"
                    },
                    'onlinePartner': {
                        "type": "boolean",
                        "default": undefined,
                        i18n: i18n( 'identity-schema.OnlineStatus_T.onlinePartner.i18n' ),
                        "-en": "online for partners",
                        "-de": "online für Kollegen"
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
                {
                    key: {
                        _id: 1,
                        firstname: 1,
                        lastname: 1
                    },
                    indexType: { collation:{ locale: 'de', numericOrdering:true} }
                }
            ],
            userGroups: Y.doccirrus.schemas.employee.userGroups,
            partnersList: partnersList,

            //  CUSTOM FUNCTIONS

            createNewIdentityForPerson: function( person, poweruser, username ) {
                var
                    pin = Y.doccirrus.authpub.getPin(),
                    token = Y.doccirrus.auth.getToken(),
                    result = {};
                if( !person.firstname || !person.lastname || !person._id || !person.communications[ 0 ].value ) {
                    Y.log( 'Invalid person object, missing firstname, lastname  or id', 'error', NAME );
                    return null;
                }
                result.firstname = person.firstname;
                result.lastname = person.lastname;
                result.specifiedBy = person._id;
                result.status = 'ACTIVE';
                // this can be emailed to the user as part of the "firstTimeLoginLink", and cannot be used to login, otherwise the pw is always encrypted in the DB
                result.pw = pin;  // currently seems obsolete, we use token instead
                result.pwResetToken = token;
                result.username = (username) ? username : person.firstname[ 0 ] + person.lastname + (Date.now() % 1000);
                result.validFrom = Date.now();
                result.validTo = Date.now() + ONEYEARINSECONDS;
                result.roles = [];
                if( poweruser ) {
                    result.memberOf = [
                        {
                            group: 'ADMIN'
                        }
                    ];
                } else {
                    result.memberOf = [
                        {
                            group: 'USER'
                        }
                    ];
                }
                return result;
            },
            getOnlineStatusFields: function getOnlineStatusFields() {
                var
                    fields = Object.keys( types.OnlineStatus_T ),
                    obj = {};

                fields = fields.concat( [ 'firstname', 'lastname', 'specifiedBy' ] );
                fields.forEach( function( f ) {
                    obj[ f ] = 1;
                } );
                return obj;
            },
            onlineStatusOr: function onlineStatusOr( obj ) {
                var
                    result = false,
                    k;
                for( k in types.OnlineStatus_T ) {
                    if( types.OnlineStatus_T.hasOwnProperty( k ) ) {
                        result = result || obj[ k ];
                    }
                }
                return result;
            },
            // identity for support account
            getSupportIdentityObj: function() {
                var

                    identity = {
                        username: 'Support', firstname: "Doc-Cirrus", lastname: 'Kundendienst',
                        pwResetToken: '', status: 'ACTIVE',
                        validFrom: null, validTo: null, expireDate: null,
                        memberOf: [
                            { group: Y.doccirrus.schemas.identity.userGroups.SUPPORT },
                            { group: Y.doccirrus.schemas.identity.userGroups.ADMIN }
                        ],
                        skipcheck_: true
                    };
                return identity;
            },
            /**
             * set TTL index that deletes expired accounts
             * @param user
             * @param duration in seconds
             * @param callback
             */
            setForDeletion: function( user, duration, callback ) {
                var
                    DCDB = require( 'dc-core' ).db,
                    ttlOptions = {};

                ttlOptions.expireAfterSeconds = duration; // from ms to seconds
                DCDB.updateIndex( user.tenantId, 'identities', { expireDate: 1 }, ttlOptions, function( err1 ) {
                    if( err1 ) {
                        Y.log( 'could not update the index expireDate for ' + user.tenantId + '.identity: ' + JSON.stringify( err1.message || err1 ), 'debug', NAME );
                    } else {
                        Y.log( 'set TTL index for identity collection', 'debug', NAME );
                    }
                    if( callback ) {
                        callback( err1 );
                    }
                } );
            },
            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader',
            'employee-schema'
        ]
    }
);
