/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'partnerreg-schema', function( Y, NAME ) {

        var
        // ------- private 'constants'  -------

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
            "root": {
                "onlineUserData": {
                    "complex": "ext",
                    "type": "OnlineUserData_T",
                    "lib": types
                },
                "partnerId": {
                    "type": "string",
                    "-en": "partnerId",
                    "-de": "partnerId"
                },
                "host": {
                    "type": "string",
                    "-en": "host",
                    "-de": "host"
                },
                "prcId": {
                    "type": "string",
                    "-en": "prcId",
                    "-de": "prcId"
                },
                "online": {
                    "type": "boolean",
                    "-en": "online",
                    "-de": "online"
                },
                "onlineStatus": {
                    "complex": "ext",
                    "type": "OnlineStatus_T",
                    "lib": "identity"
                },
                "supportsWebRTC": {
                    "default": false,
                    "type": "boolean",
                    "-en": "supportsWebRTC",
                    "-de": "supportsWebRTC"
                }
            },
            "OnlineUserData_T": {
                "customerNo": { //deprecated
                    "type": "string",
                    "-en": "customerNo",
                    "-de": "customerNo"
                },
                "dcCustomerNo": {
                    "type": "string",
                    "-en": "dcCustomerNo",
                    "-de": "dcCustomerNo"
                },
                "identityId": {
                    "type": "string",
                    "-en": "identityId",
                    "-de": "identityId"
                },
                "tenantId": {
                    "type": "string",
                    "-en": "tenantId",
                    "-de": "tenantId"
                },
                "firstname": {
                    "type": "String",
                    i18n: i18n( 'identity-schema.Identity_T.firstname' ),
                    "-en": "firstname",
                    "-de": "firstname"
                },
                "lastname": {
                    "type": "String",
                    i18n: i18n( 'identity-schema.Identity_T.lastname' ),
                    "-en": "lastname",
                    "-de": "lastname"
                },
                "type": {
                    "type": "String",
                    "-en": "lastname",
                    "-de": "lastname"
                },
                "email": {
                    "type": "String",
                    i18n: i18n( 'general.title.EMAIL' )
                },
                "locationName": {
                    "type": "String",
                    "-en": "lastname",
                    "-de": "lastname"
                }
            }
        } );

        // -------- Our Schema Methods and Hooks are defined here -------

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Static Helper Functions defined here -------

        /**
         * set everyone in presence list to offline
         * @param {Object} dbUser
         * @param {Function} callback
         */
        function resetPresenceList( dbUser, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'partnerreg',
                action: 'put',
                query: {},
                fields: ['online'],
                data: { online: false, skipcheck_: true, multi_: true},
                callback: function( err ) {
                    if( err ) {
                        Y.log( 'error in setAllOffline:' + JSON.stringify( err ), 'error', NAME );
                    }
                    if( callback ) {
                        return callback( err );
                    }
                }
            } );
        }

        function isLocalPresence( pReg ) {
            return pReg.prcId === Y.doccirrus.communication.getPRCId();
        }

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            resetPresenceList: resetPresenceList,
            isLocalPresence: isLocalPresence

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'identity-schema',
            'doccirrus',
            'mojito'
        ]
    }
);
