/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */



YUI.add( 'auth-schema', function( Y, NAME ) {

        /**
         * The DC Authorization data schema / mongoose Schemas.
         *
         * Should never be shared to the client!
         *
         * @module DCAuth
         */


        var
        // ------- private 'constants'  -------
            crypto = require( 'crypto' ),
            DCDB = require( 'dc-core' ).db,

            grantCodes = {},

        // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            generateToken = function( user, http, clientId, redirectUri, state, grantCode, clientSecret ) {
                var token,
                    rtoken;

                token = crypto.randomBytes( 32 ).toString( 'base64' );
                rtoken = crypto.randomBytes( 32 ).toString( 'base64' );

                return {
                    CL: clientId,
                    CLS: clientSecret,
                    URI: redirectUri,
                    CODE: grantCode,
                    STATE: state,
                    TOK: token,
                    RTOK: rtoken,
                    V: true,
                    D: Date.now()
                };
            };

        // this code is from the days when mongo attribute name length mattered...
        types = Y.mix( types, {
            "TOK_T": {
                "CL": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.CL' ),
                    "-en": "CL",
                    "-de": "CL"
                },
                "CLS": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.CLS' ),
                    "-en": "CLS",
                    "-de": "CLS"
                },
                "URI": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.URI' ),
                    "-en": "URI",
                    "-de": "URI"
                },
                "CODE": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.CODE' ),
                    "-en": "CODE",
                    "-de": "CODE"
                },
                "TOK": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.TOK' ),
                    "-en": "TOK",
                    "-de": "TOK"
                },
                "RTOK": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.TOK_T.RTOK' ),
                    "-en": "RTOK",
                    "-de": "RTOK"
                },
                "V": {
                    "type": "boolean",
                    i18n: i18n( 'auth-schema.TOK_T.V' ),
                    "-en": "V",
                    "-de": "V"
                },
                "D": {
                    "type": "date",
                    i18n: i18n( 'auth-schema.TOK_T.D' ),
                    "-en": "D",
                    "-de": "D"
                }
            },
            "root": {
                "id": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.id' ),
                    "-en": "id",
                    "-de": "id"
                },
                "checkinTime": {
                    "type": "Date",
                    "default": Date.now,
                    i18n: i18n( 'auth-schema.root.checkinTime' ),
                    "-en": "checkinTime",
                    "-de": "checkinTime"
                },
                "U": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.U' ),
                    "-en": "U",
                    "-de": "U"
                },
                "P": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.P' ),
                    "-en": "P",
                    "-de": "P"
                },
                "tenantId": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.tenantId' ),
                    "-en": "tenantId",
                    "-de": "tenantId"
                },
                "identityId": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.identityId' ),
                    "-en": "identityId",
                    "-de": "identityId"
                },
                "V": {
                    "type": "boolean",
                    i18n: i18n( 'auth-schema.root.V' ),
                    "-en": "V",
                    "-de": "V"
                },
                "D": {
                    "type": "date",
                    i18n: i18n( 'auth-schema.root.D' ),
                    "-en": "D",
                    "-de": "D"
                },
                "TOKENS": {
                    "complex": "inc",
                    "type": "TOK_T",
                    "lib": types,
                    "min": 0,
                    "max": 0,
                    i18n: i18n( 'auth-schema.root.TOKENS' ),
                    "-en": "TOKENS",
                    "-de": "TOKENS"
                },
                country: {
                    "type": "String",
                    i18n: i18n( 'auth-schema.root.country' ),
                    "-en": "country",
                    "-de": "Land"
                },
                host: {
                    "type": "String",
                    "-en": "host",
                    "-de": "host"
                },
                "sessionInfo": {
                    "complex": "ext",
                    "type": "sessionInfo_T",
                    "lib": "audit"
                },
                "accessControl": {
                    "complex": "ext",
                    "type": "accessControl_T",
                    "lib": types
                }
            },
            "accessControl_T": {
                "accessCode": {
                    "type": "string",
                    "-en": "accessCode",
                    "-de": "accessCode"
                },
                failureCounter: {
                    "type": "number",
                    "-en": "failureCounter",
                    "-de": "failureCounter"
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Our Schema Methods and Hooks are defined here -------

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            key: ['id'],

            //            indexes: [
            //                {key: {checkinTime: 1},
            //                    indexType: ttlOptions} // from milliseconds
            //            ],

            name: NAME,

            //  ------- The Auth schema is security sensitive, so we don't ever hand out the schema -------
            //  In the following is the protected API of the Authorization Service which is available
            // to calling DocCirrus code.

            createToken: function( user, http, clientId, redirectUri, state, grantCode, clientSecret, callback ) {
                var
                    myCb = callback;
                grantCodes[grantCode] = generateToken( user, http, clientId, redirectUri, state, grantCode, clientSecret );

                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'auth',
                    user,
                    query: {id: user.id},
                    fields: ['TOKENS'],
                    data: grantCodes[grantCode]
                }, myCb );
            },
            // Future: returns the token as an object with the cryptographic info
            // in the token decrypted and available.
            getToken: function( user, grantCode, redirectUri, clientSecret, callback ) {
                var
                    i,
                    tmp,
                    item,
                    myGrantCode = grantCode,
                    token = grantCodes[ grantCode ],
                    async = require( 'async' );

                console.log( '*-->accessing token.' ); // eslint-disable-line
                console.dir( token ); // eslint-disable-line

                async.series( [
                    function( next ) {
                        if( !token ) {
                            // may have rebooted in the interim, go to database
                            console.log( '*-->DB token lookup.' );// eslint-disable-line
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                model: 'auth',
                                user,
                                query: { "TOKENS.CODE": grantCode },
                                options: { fields: { TOKENS: 1 } }
                            }, ( err, resp ) => {
                                console.dir( resp );// eslint-disable-line
                                if( err ) {
                                    return next( err );
                                }
                                if( !err &&
                                    Array.isArray( resp ) &&
                                    resp[ 0 ] &&
                                    Array.isArray( resp[ 0 ].TOKENS ) &&
                                    0 < resp[ 0 ].TOKENS.length ) {
                                    tmp = resp[ 0 ].TOKENS;
                                    for( i = 0; i < tmp.length; i++ ) {
                                        item = tmp[ i ];
                                        if( myGrantCode === item.CODE ) {
                                            grantCodes[ myGrantCode ] = item;
                                            token = item;
                                        }
                                    }
                                }
                                if( token ) {
                                    return next( null, token );
                                }
                                next( 'No token available', null );
                            } );
                        } else {
                            next();
                        }
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'put',
                            model: 'auth',
                            user,
                            fields: [ 'TOKENS' ],
                            query: { id: user.id },
                            data: grantCodes[ grantCode ]
                        }, next );
                    }
                ], ( err ) => {
                    callback( err, token );
                } );

            },
            resetTTLIndex: function resetTTLIndex( user, callback ) {
                var
                    ttlOptions = { expireAfterSeconds: '', background: true };

                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'settings',
                        action: 'get',
                        query: {},
                        options: {limit: 1},
                        callback: function( err, result ) {
                            var
                                settings = result && result[0];

                            if( err || !settings ) {
                                if( callback ) {
                                    callback( err );
                                }
                                return;
                            }

                            ttlOptions.expireAfterSeconds = settings.timeoutDelay * 60; // from minutes to seconds
                            ttlOptions.expireAfterSeconds = 99999999999; // enable/disable the timer
                            ttlOptions.name = 'checkinTime'; // optional

                            DCDB.updateIndex( user.tenantId, 'auths', {checkinTime: 1}, ttlOptions, function( err1 ) {
                                if( err1 ) {
                                    Y.log( 'could not update the index checkinTime for ' + user.tenantId + '.auths: ' + JSON.stringify( err1 ), 'debug', NAME );
                                }
                                if( callback ) {
                                    callback( err1 );
                                }
                            } );
                        }
                    }
                );
            }
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito',
            'audit-schema'
        ]
    }
);
