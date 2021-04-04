"use strict";
const
    passport = require( 'passport' ),
    LdapStrategy = require( 'passport-ldapauth' ),
    dcauth = require( 'dc-core' ).auth,
    async = require( 'async' ),
    ldap = require('ldapjs'),
    tlsOptions = Object.freeze( { rejectUnauthorized: false } ),
    NAME = 'passport-ldapauth';

let
    Y,
    OPTS,
    serverConfig,
    profileFields,
    errors,
    sentError;

function findUserByLDAP( req, profile = {}, callback ) {
    let
        tenantId = Y.doccirrus.auth.getTenantFromHost( req.realmHost ),
        dbUser,
        ldapGroups = [],
        groupMappingArray = profileFields.groups || [],
        mappedGroups = [],
        usernameField = profileFields.username || 'uid',
        lastnameField = profileFields.lastname || 'sn',
        firstnameField = profileFields.firstname || 'givenName',
        mailField = profileFields.mail || 'mail',
        foundIdentity,
        foundEmployee;

        //[ "ldapMemberOf": "administrators", "group": "ADMIN" }, { "ldapMemberOf": "helpdesk", "group": "CONTROLLER" }]

    if( dcauth.isPRC() || dcauth.isISD() ) {
        tenantId = dcauth.getLocalTenantId();
    }

    if( !tenantId || !profile[usernameField] ) {
        Y.log( `Cannot authenticate with ldap, on tenant: ${tenantId}`, 'warn', NAME );
        return callback( Y.doccirrus.errors.http( 500, 'invalid params' ) );
    }

    dbUser = Y.doccirrus.auth.getSUForTenant( tenantId );
    errors = [];
    async.waterfall( [
        ( next ) => { //search LDAP groups where person.uid is member
            if(!serverConfig.groupsBase || !serverConfig.groupsQuery){ //not set in config - do not search groups and modify memberOf
                return next();
            }

            let
                client = ldap.createClient({
                    url: serverConfig.url,
                    tlsOptions: tlsOptions // hardwire on purpose!
                }),
                groupsBase = serverConfig.groupsBase || ['ou=groups', serverConfig.searchBase].join();

            client.bind(OPTS.server.bindDN, OPTS.server.bindCredentials, function(err){
                if(err){
                    Y.log( `Error accessing LDAP ${err.message}`, 'error', NAME );
                    return next();
                }

                //ldapsearch -x -W -D 'cn=admin,dc=test,dc=com' -b 'ou=groups,dc=test,dc=com' "(cn=*)" memberUid
                var opts = {
                    filter:  serverConfig.groupsQuery || '(cn=*)',
                    scope: 'sub',
                    attributes: ['dn', 'sn', 'cn', 'memberUid', 'member']
                };

                function ldapDisconnect(){
                    next();
                    client.unbind();
                }

                // documentation here: http://ldapjs.org/client.html

                //here we list all groups taring from groupsBase (e.g. "ou=ADGroups,dc=test,dc=com")
                //  and filter result by groupsQuery (e.g. (&(cn=dc_*)) - keep only elements in which common name start with dc_ )
                client.search(groupsBase, opts, (err, res) => {
                    if(err){
                        Y.log( `Error on start searching LDAP: ${err.message}`, 'error', NAME );
                    }

                    res.on('searchEntry', (entry) => {

                        //entry contains result of search (triggered for each founded entry)
                        // {
                        //  "dn":"cn=dc_users,ou=ADGroups,dc=test,dc=com",
                        //  "controls":[],
                        //  "cn":"dc_users",
                        //  "member":[
                        //     "cn=first last04,cn=dc_users,ou=ADGroups,dc=test,dc=com",
                        //     "cn=first last03,cn=users,ou=ADGroups,dc=test,dc=com"
                        //  ]
                        // }

                        if( entry && entry.object && entry.object.cn){ //if common name defined
                            if( serverConfig.groupsLookIn && entry.object[serverConfig.groupsLookIn] ){ //if contain list of child objects (e.g. member array)

                                //lets create regexp for searching user in members
                                // firstly fill placeholders in regex template (e.g. "cn *?= *?['\"]{0,1}{{cn}}['\"]{0,1}" -- here {{cn}} is placeholder )
                                // placeholder should be populated by actual data from founded ldap user ( in profile )
                                let pattern = serverConfig.groupsRegexp,
                                    regex = /\{\{(\S+?)\}\}/gi,
                                    match = regex.exec(pattern);

                                while (match !== null) {
                                    if(match[1] && profile[match[1]]){
                                        pattern = pattern.replace(match[0], profile[match[1]]);
                                    }
                                    match = regex.exec(pattern);
                                }
                                // filled up template here (e.g. cn *?= *?['"]{0,1}first last04['"]{0,1} -- here first last04 cn of user trying to login)
                                let validateRegex;
                                try {
                                    validateRegex = new RegExp( pattern, 'i' );
                                } catch(err) {
                                    Y.log( `Error on building LDAP group matching regex ${pattern}`, 'warn', NAME );
                                }
                                if( validateRegex ){
                                    [].concat(entry.object[serverConfig.groupsLookIn]).forEach( member => {
                                        let userMatch = validateRegex.exec(member);
                                        if( userMatch ){
                                            ldapGroups.push( entry.object.cn );
                                        }
                                    } );
                                }
                                //ldapGroups here contains all groups in which user is member (e.g [ 'dc_users' ] )
                            }
                        }
                    });
                    res.on('searchReference', (referral) => {
                        Y.log( `ldap found reference ${JSON.stringify(referral)}`, 'info', NAME );
                    });
                    res.on('error', (err) => {
                        Y.log( `Error searching in LDAP: ${err.message}`, 'error', NAME );
                        ldapDisconnect();
                    });
                    res.on('end', (result) => {
                        Y.log( `ldap searching is finished with status ${JSON.stringify(result.status)}`, 'info', NAME );
                        ldapDisconnect();
                    });

                } );
            });
        },
        ( next ) => {
            Y.log( `Found ldap groups: ${JSON.stringify(ldapGroups)}`, 'debug', NAME );
            if( groupMappingArray.length && ldapGroups.length){
                ldapGroups.forEach( ldapGroupName => {
                    var foundGroup = Y.Array.find( groupMappingArray, item => {
                        return item.ldapMemberOf.toLowerCase() === ldapGroupName.toLowerCase();
                    } );
                    if(foundGroup && foundGroup.group){
                        mappedGroups.push(foundGroup.group);
                    }
                });
                Y.log( `mapped dc groups: ${JSON.stringify(mappedGroups)}`, 'debug', NAME );
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'employee',
                query: {username: profile[usernameField]},
                callback: ( err, result ) => {
                    if( err ) {
                        next( err );
                    } else {
                        next( null, result && result[0] );
                    }
                }
            } );
        },
        ( found, next ) => {
            if( found ) {
                foundEmployee = found;
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'identity',
                query: {username: profile[usernameField]},
                callback: ( err, result ) => {
                    if( err ) {
                        next( err );
                    } else {
                        next( null, result && result[0] );
                    }
                }
            } );
        },
        ( found, next ) => {
            if( found ) {
                foundIdentity = found;
                return next( null, found );
            }

            let
                data = {
                    username: profile[usernameField],
                    lastname: profile[lastnameField] || '(k.A.)',
                    firstname: profile[firstnameField] || '(k.A.)',
                    type: 'OTHER',
                    locations : [
                        {
                            _id : "000000000000000000000001",
                            locname : "-"
                        }
                    ],
                    talk: 'MR',
                    fromLDAP: true,
                    memberOf: []
                };

            if(mappedGroups.length){
                mappedGroups.forEach( (dcGroupName) => {
                    data.memberOf.push( { group: dcGroupName });
                } );
            } else {
                data.memberOf.push( { group: (serverConfig.defaultDCGroup || 'USER') });
            }

            if( profile[mailField] ) {
                data.communications = [
                    {
                        type: 'EMAILJOB',
                        preferred: false,
                        value: profile[mailField]
                    }
                ];
            }

            Y.doccirrus.api.user.post( {
                user: dbUser,
                data: data,
                httpRequest: req,
                callback: next
            } );
        },
        ( createdOrFoundIdentities, next ) => {
            if( !createdOrFoundIdentities ) {
                return next( null, createdOrFoundIdentities || {} );
            }
            var setData = {
                    pw: Y.doccirrus.auth.getSaltyPassword( 'passHA$h', null ),
                    pwResetToken: null
                };

            if(foundIdentity){
                //lets update fields if they are changed in LDAP
                if( profile[firstnameField] ) {
                    setData.firstname = profile[firstnameField];
                }

                if( profile[lastnameField] ) {
                    setData.lastname = profile[lastnameField];
                }

                if(serverConfig.groupsBase && serverConfig.groupsQuery){//overwrite identities only if both fields are populated in ldap.json
                    if(mappedGroups.length){
                        setData.memberOf = [];
                        mappedGroups.forEach( function(dcGroupName){
                            setData.memberOf.push( { group: dcGroupName });
                        } );
                    } else {
                        setData.memberOf = [ { group: (serverConfig.defaultDCGroup || 'USER') } ];
                    }
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'identity',
                action: 'put',
                query: {
                    specifiedBy: (foundIdentity && foundIdentity.specifiedBy) || (Array.isArray(createdOrFoundIdentities) && createdOrFoundIdentities[0])
                },
                fields: Object.keys( setData ),
                data: Y.doccirrus.filters.cleanDbObject( setData )
            }, next );
        },
        function( identity, next ) {
            if( !foundEmployee ) {
                return next( null, identity );
            }

            var emailCommunications,
                setData = {};

            //lets update employee fields if they are changed in LDAP
            if( profile[firstnameField] ) {
                setData.firstname = profile[firstnameField];
            }

            if( profile[lastnameField] ) {
                setData.lastname = profile[lastnameField];
            }

            if( serverConfig.groupsBase && serverConfig.groupsQuery && mappedGroups.length ){
                setData.memberOf = [];
                mappedGroups.forEach( (dcGroupName) => {
                    setData.memberOf.push( { group: dcGroupName });
                } );
            }

            if( profile[mailField] ) {
                emailCommunications = (foundEmployee.communications || []).filter( (comm) => {
                    return comm.type === 'EMAILJOB' && comm.value === profile[mailField];
                });

                if( !emailCommunications.length){
                    setData.communications = foundEmployee.communications || [];
                    setData.communications.push({
                        type: 'EMAILJOB',
                        preferred: false,
                        value: profile[mailField]
                    });
                }

            }

            if( !Object.keys(setData).length ){
                return next(null, identity);
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'employee',
                action: 'put',
                query: {
                    _id: foundEmployee._id
                },
                fields: Object.keys( setData ),
                data: Y.doccirrus.filters.cleanDbObject( setData )
            }, (err) => {
                if(err){
                    //notify client that something goes wrong
                    Y.log('Error on updating employee ' + err.message, 'error', NAME );
                    errors = [...errors, err.message];
                }
                next(null, identity);
            } );
        } ],
        function done( err, identity ) {
            if( err ) {
                Y.log( 'Error on getting/creating LDAP employee ' + err.message, 'error', NAME );
                callback( err );
            } else {
                callback( null, identity, tenantId );
            }
        }
    );


}

function init() {
    passport.serializeUser( dcauth.serializeUser );
    passport.deserializeUser( dcauth.deSerializeUser );
    passport.use( new LdapStrategy( OPTS, function( req, profile, done ) {
        Y.log( 'Returned from LDAP uid: ' + (profile && profile[ profileFields.username ]), 'info', NAME );
        console.log( profile ); // eslint-disable-line

        if( !profile || !profile[ profileFields.username ] ) {
            Y.log( 'ldap configuration error, cannot get uid. Preventing creation of employee and identity.', 'error', NAME );
            console.error( profile ); // eslint-disable-line
            return( done( null,{} ) );
        }

        findUserByLDAP( req, profile, function( err, identity, tenantId ) {
            var
                loginData = {
                    identity: identity && identity.username && JSON.parse(JSON.stringify(identity)),
                    tenantId: tenantId
                };
            if( !err && identity && identity.username ) {
                Y.log( 'authenticated via LDAP: ' + JSON.stringify( identity.username ), 'info', NAME );
                return done( null, loginData ); // the data will be consumed by local strategy to finalize user authentication
            } else {
                Y.log( 'failed to authenticate with ldap: ' + JSON.stringify( loginData ), 'info', NAME );
                return done( null, {} );
            }
        } );
    } ) );
}

function handler( req, res, next ) {
    sentError = false;

    if( req.isAuthenticated() ) {
        next();
        return;
    }

    if( req.body && req.body.ldap === 'true' ) {
        passport.authenticate( 'ldapauth', {
            session: true,
            assignProperty: 'body'
        }, ( err, loginData, errorObj, errorCode ) => {

            if( err || loginData === false || !loginData.identity) {
                Y.log( `Error in ldap authentication identity: ${loginData && loginData.identity}, message: ${errorObj && errorObj.message || errorObj}`, 'error', NAME );
                if(!sentError){
                    res.send( {loggedIn: false, error: errorCode === 401 ? 101 : errorCode } );
                    sentError = true;
                }
                return next( err || Y.doccirrus.errors.http( 400, 'insufficient params' ) );
            }
            var userAuth = dcauth.buildUserByIdentity( {
                identity: loginData.identity,
                tenantId: loginData.tenantId
            } );
            userAuth.sessionId = req.session && req.session.id;
            req.logIn( userAuth, function cb( err ) {
                if( err ) {
                    return next( 'LDAP Login failed at Passport logIn(). ' );
                }
                Y.log( 'LDAP login authorised: ' + JSON.stringify( userAuth ), 'info', NAME );
                // do session handling
                dcauth.addUserSession( userAuth, function( err, res ) {
                    Y.log( 'LDAP session registered ', 'info', NAME );
                    errors.forEach( errorMessage => {
                        setTimeout(
                            () => {
                                Y.doccirrus.communication.emitEventForSession( {
                                    sessionId: userAuth.sessionId,
                                    event: 'login.updateError',
                                    msg: {
                                        data: {
                                            error: errorMessage
                                        }
                                    }
                                } );
                            }, 10000 //wait for initializing communication on client
                        );
                    } );
                    next( err, res );
                } );
            });
        } )( req, res, next );
    } else {
        return next();
    }
}

module.exports = function( _Y ) {
    Y = _Y;

    if( Y.doccirrus.auth.isAllowedLDAPLogin() ) {
        Y.log( 'LDAP authentication is configured', 'info', NAME );
        try {
            OPTS = require( process.cwd() + '/ldap.json' ) || {};
        } catch( e ) {
            Y.log( 'cannot load ldap.json: ' + e.message, 'error', NAME );
        }

        //set mandatory property/value
        OPTS.passReqToCallback = true;
        OPTS.handleErrorsAsFailures = true;

        if( OPTS.server ) {
            OPTS.server.tlsOptions = tlsOptions; // hardwire on purpose!
            serverConfig = OPTS.server;
        } else {
            serverConfig = {};
        }

        profileFields = serverConfig.profileFields || {};

        init();
        return handler;
    } else {
        Y.log( 'passport-ldap is not configured: ', 'info', NAME );
        return function skip( req, res, next ) {
            next();
        };
    }

};