/**
 * User: mahmoud
 * Date: 24/02/15  15:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/

/**
 * all the public aspect of conferencing
 */
YUI.add( 'partnerreg-api', function( Y, NAME ) {
        var
            YDC = Y.doccirrus;

        /**
         * update presence list with given data
         * @param {Object}                dbUser
         * @param {Object}                params
         * @param {Function}              callback
         */
        function setPartnerReg( dbUser, params, callback ) {
            var
                onlineList = params.onlineList,
                async = require( 'async' ),
                idList = [],
                partregs;

            if( !onlineList || !Array.isArray( onlineList ) ) {
                callback( Y.doccirrus.errors.rest( 400, 'invalid params' ) );
                return;
            }

            // just copy the changes to the mongoose object
            function updateIt( currentData, newData ) {
                currentData.partnerId = newData.employeeId;
                currentData.online = true;
                for( let key in newData ) {
                    if( newData.hasOwnProperty( key ) ) { // Y.mix is problematic with mongoose object
                        currentData[key] = newData[key];
                    }
                }
            }

            function postIt( pReg, _cb ) {
                pReg.partnerId = pReg.employeeId;
                pReg = Y.doccirrus.filters.cleanDbObject( pReg );
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    action: 'post',
                    model: 'partnerreg',
                    data: pReg,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'setPartnerReg, error in post: ' + JSON.stringify( err.message || err ) );
                            return _cb( err );
                        }
                        _cb( null, result );
                    }
                } );
            }

            /**
             * Removes duplication of user in presence list
             *  duplications could happen because of presence list is populated
             *  every time when user got socket connection.
             *  e.g. User had opened page in 2 browsers and server was restarted,
             *  2 socket connection(one per browser) will insert 2 records(parallel) to
             *  presence list. => same user will have 2 records.
             * @param {String} lastId
             * @param {Object} presenceData
             * @param {Function} _callback
             */
            function checkDuplication( lastId, presenceData, _callback ) {

                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'partnerreg',
                    action: 'count',
                    query: {identityId: presenceData.identityId, locationName: presenceData.locationName},
                    callback: function( err, count ) {
                        if( err ) {
                            _callback( err );

                        } else if( count > 1 ) {
                            Y.log( 'removing duplicates in presence list for identityId=' + presenceData.identityId, 'debug', NAME );
                            Y.doccirrus.mongodb.runDb( {
                                user: dbUser,
                                model: 'partnerreg',
                                action: 'delete',
                                query: {_id: {$ne: lastId}, identityId: presenceData.identityId, locationName: presenceData.locationName}, // all except the last one posted
                                options: {
                                    override: true
                                }
                            }, _callback );

                        } else {
                            _callback( null, [lastId] );
                        }
                    }
                } );
            }

            // update with new data or post it if does not already exist
            function updateOrPost( presenceData, _cb ) {
                presenceData.host = presenceData.host && presenceData.host.toLowerCase();
                var
                    pReg = Y.Array.find( partregs, function( regItem ) {
                        return  regItem.identityId === presenceData.identityId && regItem.host === presenceData.host; // the combination identityId-host is always unique
                    } );

                if( pReg ) {
                    updateIt( pReg, presenceData );
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'partnerreg',
                        action: 'put',
                        query: {
                            _id: pReg._id
                        },
                        fields: Object.keys(pReg),
                        data: Y.doccirrus.filters.cleanDbObject(pReg)
                    }, _cb);

                } else {
                    postIt( presenceData, function( err, result ) {
                        if( err ) {
                            return _cb( err );
                        }
                        checkDuplication( result[0], presenceData, _cb );
                    } );
                }
            }

            Y.Array.each( onlineList, function( item ) {
                idList.push( item.identityId );
            } );

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                action: 'get',
                model: 'partnerreg',
                query: {identityId: {$in: idList}},
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    partregs = result || [];
                    async.each( onlineList, updateOrPost, function allDone( err ) {
                        if( err ) {
                           return  callback( err );
                        }
                        callback( null );
                    } );
                }
            } );
        } //setPartnerReg

        function toggleOnlineStatus( user, query, online, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'put',
                model: 'partnerreg',
                query: query,
                fields: ['online'],
                data: {skipcheck_: true, online: online},
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( 'toggle Online Status: ' + JSON.stringify( err ), 'error', NAME );
                    } else if( callback ) {
                        return callback( null, result );
                    }
                }
            } );
        } //setPartnerReg

        /**
         * get the local list
         * @param {Object}      user
         * @param {Object}      query filter params
         * @param {Object}      options paging params
         * @param {Function}    callback
         * @private
         */
        function _getPresenceList( user, query = {}, options, callback ) {
            delete query.filters; // not in schema
            query.online = true;
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'partnerreg',
                query: query,
                options: options
            }, callback );
        }

        function gerPresenceListPUC( args ){
            Y.log('Entering Y.doccirrus.api.partnerreg.gerPresenceListPUC', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.gerPresenceListPUC');
            }
            let
                { user, data, callback } = args,
                query = data.query,
                options = data.options;
            _getPresenceList(user,query, options, callback );
        }

        /**
         * return current online external and/or local online users
         *
         * if we are connected to PUC then fetch the list from PUC,
         * otherwise return the local list
         *
         * @param {Object} args
         */
        function getPresenceList( args ) {
            Y.log('Entering Y.doccirrus.api.partnerreg.getPresenceList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.getPresenceList');
            }
            const
                { user, query, options, callback } = args;
            let
                filters = query.filters || {},
                conditions = Object.assign( {}, query ),
                prcId;
            delete conditions.filters;

            if( filters.internals && filters.partners && filters.patients && filters.others || !filters.internals && !filters.partners && !filters.patients && !filters.others ) {
                filters = {}; // all filters true === all filters false
            }
            // determine whether the user data is local to this server
            function finalCallback( err, result ) {
                var
                    data = result && (result.data || result.result || result);
                if( err || !result ) {
                    callback( err );
                    return;
                }

                data = Y.Array.map( data, function finalCallback( preg ) {
                    preg = preg.toObject ? preg.toObject() : preg;
                    delete preg._id;
                    preg.isLocal = Y.doccirrus.schemas.partnerreg.isLocalPresence( preg );
                    return preg;
                } );

                if( result.data && result.meta ) {
                    result.data = data;

                } else if( result.result ) {
                    result.result = data;
                } else {
                    result = data;
                }
                callback( null, result );
            }

            function toPUC( conditions ) {
                var
                    url = Y.doccirrus.auth.getPUCUrl( '/1/partnerreg/:gerPresenceListPUC' ),
                    postData = {};

                postData.query = conditions;
                postData.options = options; // add paging params
                Y.doccirrus.https.externalPost( url, postData, Y.doccirrus.auth.setInternalAccessOptions(), function( err, response, body ) {
                    finalCallback( err, body );
                } );
            }

            function getInternalsCondition( params ){
                const
                    {prcId, user} = params;
                return {
                    prcId: prcId,
                    tenantId: user.tenantId,
                    onlineEmp: true
                };
            }

            // add filters to query as an $or of conditions
            // the conditions are taken logically independent
            function getFiltersQuery( callback ) {
                let
                    filterCondition = [];
                if( filters.internals ) { // include internal users
                    filterCondition.push( getInternalsCondition( { prcId, user } ) );
                }

                if( filters.patients ) {
                    filterCondition.push( { patientId: { $exists: true } } ); // include patients
                }

                if( filters.partners || filters.others ) {
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'partner',
                        query: {},
                        callback: function( err, results ) {
                            let
                                dcIds;
                            if( err ) {
                                Y.log( `getFiltersQuery. error: ${JSON.stringify( err )}`, 'error', NAME );
                                return callback( err );
                            }
                            dcIds = results.map( item => item.dcId );

                            if( filters.partners ) {
                                filterCondition.push( {
                                    dcCustomerNo: { $in: dcIds },
                                    onlinePartner: true
                                } );
                            }

                            if( filters.others ) { // then include everyone else not categorized by filters
                                filterCondition.push( {
                                    $and: [
                                        {
                                            $or: [
                                                { prcId: { $ne: prcId } },
                                                { tenantId: { $ne: user.tenantId } }
                                            ]
                                        }, // exclude internals
                                        { dcCustomerNo: { $nin: dcIds } }, // exclude partners
                                        { onlinePartner: true }
                                    ]
                                } );
                            }
                            callback( null, { $or: filterCondition } );
                        }
                    } );
                }
                callback( null, { $or: filterCondition } );
            }

            function returnLocalList() {
                conditions.onlineEmp = true; // local list is lisk of employee
                _getPresenceList( user, conditions, options, finalCallback );
            }
            
            Y.doccirrus.communication.getPRCId( function( err, _prcId ) {
                if( err ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Could not get PRC id' } ) );
                }
                prcId = _prcId;
                conditions.$and = [ // exclude current user
                    {
                        $or: [
                            { identityId: { $ne: user.identityId } },
                            { prcId: { $ne: prcId } },
                            { tenantId: { $ne: user.tenantId } }
                        ]
                    }
                ];
                if( filters.internals && !filters.partners && !filters.patients && !filters.others ) {
                    returnLocalList(); // shortcut to local list

                } else { // fetch the global presence list
                    Y.doccirrus.communication.isPucOnline( function( yes ) {
                        if( yes ) {
                            if( filters.internals || filters.partners || filters.patients || filters.others ) {
                                getFiltersQuery( ( err, filterCondition ) => {
                                    if( err ) {
                                        return callback( err );
                                    }
                                    conditions.$and.push( filterCondition );
                                    toPUC( conditions );
                                } );
                            } else { // no filter
                                conditions.$and.push( {
                                    $or: [
                                        { onlinePartner: true }, // all with partner visibility
                                        getInternalsCondition( { prcId, user } ) // all local employee with employee visibility
                                    ]
                                } );
                                toPUC( conditions );
                            }

                        } else if( filters.internals || !Object.keys( filters ).length ) {
                            returnLocalList();
                        } else {
                            finalCallback( null, [] ); // return empty
                        }
                    } );
                }
            } );
        }

        /**
         * update the presence list (only locally)
         *
         * encapsulates all kind of changes to presence list
         *
         * @param {Object}      dbUser
         * @param {Object}      params
         * @param {function}    callback (optional)
         * @return {*}          callback
         */
        function updatePresenceList( dbUser, params, callback ) {
            var
                onlineList = params.onlineList,
                prcId = params.prcId,
                online = params.online,
                pairs = [];

            Y.log( 'updatePresenceList: ' + require('util').inspect( params ), 'debug', NAME );

            if( !callback ) {
                callback = function( err ) {
                    if( err ) {
                        Y.log( 'error in updatePresenceList: ' + JSON.stringify( err ), 'error', NAME );
                    }
                };
            }

            if( onlineList && onlineList.length ) {
                if( online ) {
                    setPartnerReg( dbUser, {
                            user: Y.doccirrus.auth.getSUForPUC(),
                            onlineList: onlineList
                        },
                        function( err, result ) {
                            if( !err ) {
                                Y.log( 'partnerreg updated: ' + JSON.stringify( result ), 'debug', NAME );
                                return callback( null, result );
                            }
                            Y.log( 'setPartnerReg returned with error: ' + JSON.stringify( err ), 'error', NAME );
                        }
                    );

                } else {
                    Y.Array.each( onlineList, function( item ) {
                        pairs.push( {identityId: item.identityId, host: item.host && item.host.toLowerCase()} );
                    } );
                    toggleOnlineStatus( dbUser, {$or: pairs}, false, callback );
                }

            } else if( !online && prcId ) { // toggle online status for all the PRC users
                toggleOnlineStatus( dbUser, {prcId: prcId}, false, callback ); // update status for all users from a PRC at once
            } else {
               return callback();
            }
        }

        var
            UPDATE_PRESENCE_LIST = 'UPDATE_PRESENCE_LIST',
            REFRESH_PRESENCE_TABLE = 'refreshPresenceTable',
            REGISTER_TO_PUC = 'REGISTER_TO_PUC';

        // prepare data for presence list (according to partnerreg schema)
        function preparePresenceListForTenant( dbUser, users, online, callback ) {
            var
                async = require( 'async' ),
                onlineList = [],
                location, practice;

            //filter out system identities, they no need socketIO communication
            users = users.filter( el => !(el.identityId === '000' && el.superuser === true) );

            // gather all fields that are required for presence list
            function aggregateUserData( user, _callback ) {
                async.parallel( {
                        identity: function( _cb ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: dbUser,
                                model: 'identity',
                                options: {
                                    select: Y.doccirrus.schemas.identity.getOnlineStatusFields(),
                                    lean: true
                                },
                                query: {_id: user.identityId},
                                callback: function( err, result ) {
                                    var
                                        identity = result && result[0] && result[0];
                                    _cb( err, identity );
                                }
                            } );
                        },
                        employee: function( _cb ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: dbUser,
                                model: 'employee',
                                query: {_id: user.specifiedBy},
                                options: {
                                    lean: true
                                },
                                callback: function( err, result ) {
                                    _cb( err, result && result[0] && result[0] );
                                }
                            } );
                        }
                    },
                    function done( err, myResult ) {
                        var
                            onlineUserData;
                        if( err || !myResult || !myResult.identity ) {
                            Y.log( 'updateOnlineStatusOnPUC: ' + JSON.stringify( err || 'no identity' ), 'error', NAME );
                            _callback( err );
                            return;
                        }

                        onlineUserData = {
                            employeeId: myResult.identity.specifiedBy,
                            identityId: myResult.identity._id.toString(),
                            dcCustomerNo: practice && practice.dcCustomerNo,
                            type: myResult.employee && myResult.employee.type,
                            locationName: location && location.locname,
                            host: Y.doccirrus.auth.getMyHost( dbUser.tenantId ),
                            prcId: Y.doccirrus.communication.getPRCId(),
                            tenantId: user.tenantId,
                            online: online && Y.doccirrus.schemas.identity.onlineStatusOr( myResult.identity ), // user is online and wants to be seen online
                            supportsWebRTC: user.supportsWebRTC
                        };

                        onlineUserData.host = onlineUserData.host && onlineUserData.host.toLowerCase();

                        delete myResult.identity._id;
                        onlineUserData = Y.mix( onlineUserData, myResult.identity ); // copy online status fields
                        onlineList.push( onlineUserData );
                        _callback( null );
                    } );
            }

            async.parallel( {
                    location: function getLocation( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: dbUser,
                            model: 'location',
                            query: {_id: Y.doccirrus.schemas.location.getMainLocationId()},
                            callback: function( err, result ) {
                                if( err ) {
                                    return _cb( err );
                                }
                                _cb( null, result && result[0] && result[0] );
                            }
                        } );
                    },
                    practice: function getPractice( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: dbUser,
                            model: 'practice',
                            options: {limit: 1},
                            query: {},
                            callback: function( err, result ) {
                                if( err ) {
                                    return _cb( err );
                                }
                                    _cb( null, result && result[0] && result[0] );
                            }
                        } );
                    }
                },
                function done( err, data ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    practice = data.practice;
                    location = data.location;

                    async.each( users, aggregateUserData, function( err ) {
                        callback( err, onlineList );
                    } );

                } );

        }

        function notifyUsers( message ) {

            function doIt() {
                Y.doccirrus.communication.getOnlineUsersPRC( function( err, users ) {
                    if( err ){
                        Y.log(`Error in notifyUsers ${err.message}`, 'error', NAME );
                    }
                    users.forEach( function notifyUser( user ) {
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                tenantId: user.tenantId,
                                event: REFRESH_PRESENCE_TABLE,
                                msg: message
                            } );
                        }
                    );
                } );
            }

            if( YDC.ipc.workersReady() ) {
                doIt();
            } else { // still busy starting up
                setTimeout( doIt, 10000 );
            }
        }

        /**
         * triggers an event that updates the global (remote) presence list
         * then updates the local presence list
         *
         * a user is considered online only if they chose to be available for at least one group
         * @param {Object}      params
         * @param {Array}       params.users    list of users whose online status was changed
         * @param {boolean}     params.online   whether the user is online to socketIO manager
         * @param {Function}    callback
         */
        function publishPresenceList( params, callback ) {
            Y.log( 'publishPresenceList:' + require('util').inspect( params ), 'debug', NAME );
            var
                tenantTable = {},
                async = require( 'async' ),

                users = params.users,
                online = params.online, // whether the users are online or offline
                onlineList = [];

            if( !callback ) {
                callback = function( err ) {
                    if( err ) {
                        Y.log( 'error in publishPresenceList: ' + JSON.stringify( err ), NAME, 'error' );
                    }
                };
            }

            // send the online list to PUC
            function emitMessage() {
                var
                    message;

                message = {
                    onlineList: onlineList,
                    online: online
                };

                Y.doccirrus.communication.isPucOnline( function( yes ) {
                    if( yes ) {
                        // trigger update for global (remote) presence list
                        Y.doccirrus.communication.emitPUC( {
                            event: UPDATE_PRESENCE_LIST,
                            message: message
                        } );
                    } else {
                        notifyUsers( message );
                    }
                } );
            }

            // update local presence list on each tenant and collect them for the global list
            function eachTenant( tenantId, _cb ) {
                var
                    dbUser = Y.doccirrus.auth.getSUForTenant( tenantId );
                preparePresenceListForTenant( dbUser, tenantTable[tenantId], online, function( err, result ) {
                    if( err ) {
                        Y.log( 'eachTenant: ' + JSON.stringify( err ), 'error', NAME );
                        return _cb( err );
                    }
                    onlineList = onlineList.concat( result );
                    // update the local presence list
                    Y.doccirrus.api.partnerreg.updatePresenceList( dbUser, {
                        onlineList: result,
                        online: online
                    }, _cb );
                } );
            }

            // group users by tenantId
            users.forEach( function( user ) {
                if( !tenantTable[user.tenantId] ) {
                    tenantTable[user.tenantId] = [];
                }
                tenantTable[user.tenantId].push( user );
            } );

            async.each( Object.keys( tenantTable ),
                eachTenant,
                function( err ) {
                    if( err ) {
                        Y.log( 'error in publishPresenceList: ' + JSON.stringify( err ), 'error', NAME );
                        return callback( err );
                    }
                    emitMessage();
                } );
        }

        /**
         * called once public PRC data changes or a socket connection to PUC is established
         * if a PRC register it on PUC
         * if VPRC then register tenants on PUC, each one like a PRC
         *
         * @param {Object}      aUser    if specified and is vprc, then only the tenant of thus user will handled
         * @param {Function}    callback
         *
         */
        function registerOnPUC( aUser, callback ) {
            var
                async = require( 'async' );

            callback = callback || function( err ) {
                if( err ) {
                    Y.log( 'error in registering PRC on PUC: ' + JSON.stringify( err ), 'error', NAME );
                }
            };

            function registerIt( user, callback ) {
                Y.doccirrus.api.admin.getPRCPublicData(  // the user object determines the subject tenant
                    user,
                    function( err, pubData ) {
                        if( err || !pubData || (!pubData.dcCustomerNo && !pubData.systemType ) || !pubData.host ) { // report and skip
                            Y.log( 'error in registering PRC on PUC: ' + JSON.stringify( err || 'no dcCustomerNo/host' ) + ' pubData:' + JSON.stringify( pubData ), 'error', NAME );

                        } else {
                            Y.doccirrus.communication.emitPUC( {
                                event: REGISTER_TO_PUC,
                                message: pubData
                            } );
                            Y.log( 'PRC was registered on PUC successfully, tenantId: ' + user.tenantId, 'debug', NAME );
                        }
                        /**
                         * should not stop registration for others
                         */
                        callback();
                    }
                );
            }

            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() ) {
                Y.log( 'registering PRC:' + Y.doccirrus.auth.isPRC() + ' or ISD:' + Y.doccirrus.auth.isISD() + ' on PUC', 'info', NAME );
                registerIt( aUser || Y.doccirrus.auth.getSUForLocal(), callback );

            } else if( Y.doccirrus.auth.isVPRC() ) {
                if( aUser ) {
                    Y.log( 'registering tenant ' + aUser.tenantId + ' on PUC', 'info', NAME );
                    registerIt( aUser, callback ); // register a single tenant
                } else { // register all tenants
                    Y.log( 'registering VPRC on PUC', 'info', NAME );
                    Y.doccirrus.licmgr.getActiveCustomersEnsure( ( err, companies ) => {
                        if( err ) {
                            Y.log( 'error in registering tenants on PUC: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        if( companies && companies.length ) {
                            async.eachSeries( companies, function( company, next ) {
                                if( company.tenantId !== Y.doccirrus.auth.getLocalTenantId() ) {
                                    registerIt( Y.doccirrus.auth.getSUForTenant( company.tenantId ), next );
                                } else {
                                    setImmediate( next );
                                }
                            }, callback );
                        } else {
                            Y.log( 'error in registering tenants on PUC: no companies', 'error', NAME );
                            return  callback( 'error in getting tenant IDs' );
                        }
                    } );

                }
            }
        }

        function getPracInfoByPIN( args ) {
            Y.log('Entering Y.doccirrus.api.partnerreg.getPracInfoByPIN', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.getPracInfoByPIN');
            }
            var
                user = args.user,
                callback = args.callback,
                params = args.data,
                pracInfo;

            if( !params.pin ) {
                callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                return;
            }

            function returnData( err, result ) {
                if( err || !result || !result[0] ) {
                    Y.log( 'error in getting practice info from DCPRC: ' + JSON.stringify( err || 'could not get practice data' ), 'error', NAME );
                    return callback( err );
                }
                Y.mix( pracInfo, result && result[0] );
                callback( null, pracInfo );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                query: {invitations: {$elemMatch: {pin: params.pin}}},
                callback: function( err, result ) {
                    if( err || !result || !result[0] ) {
                        return callback( err || Y.doccirrus.errors.rest( 7301, 'invalid pin' ) );
                    }
                    if( 1 < result.length ) {
                        Y.log( 'collision on pin: ' + result.length, 'warn', NAME );
                        return callback( 'internal error' );
                    }
                    let invitation = (result[0].invitations || []).find( el => params.pin === el.pin ) || {};
                    pracInfo = {
                        publicKey: result[0].pubKey,
                        bidirectional: invitation.bidirectional || false,
                        configuration: invitation.configuration || [],
                        anonymizing: invitation.anonymizing || false,
                        anonymizeKeepFields: invitation.anonymizeKeepFields || [],
                        pseudonym: invitation.pseudonym || [],
                        unlock: invitation.unlock || false,
                        preserveCaseFolder: invitation.preserveCaseFolder || false
                    };
                    Y.doccirrus.utils.dcprcGetCustomer( result[0].customerIdPrac, returnData );
                }
            } );
        }

        function noteInvitation( args ) {
            Y.log('Entering Y.doccirrus.api.partnerreg.noteInvitation', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.noteInvitation');
            }
            var
                user = args.user,
                callback = args.callback,
                params = args.data,
                expireDate = new Date();

            if( !params.dcCustomerNo || !params.pin ) {
                callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                return;
            }
            expireDate.setYear( expireDate.getFullYear() + 1 );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                query: {customerIdPrac: params.dcCustomerNo},
                callback: function( err, result ) {

                    if( err || !result || !result[0] ) {
                        return callback( err || 'no metaprac found' );
                    }
                    if( !result[0].pubKey ) {
                        return callback( Y.doccirrus.errors.rest( 7303, 'no public key' ) );
                    }
                    result[0].invitations = result[0].invitations || [];
                    result[0].invitations.push( {
                        pin: params.pin,
                        bidirectional: params.bidirectional,
                        configuration: params.configuration,
                        anonymizing: params.anonymizing,
                        anonymizeKeepFields: params.anonymizeKeepFields,
                        pseudonym: params.pseudonym,
                        unlock: params.unlock,
                        preserveCaseFolder: params.preserveCaseFolder,
                        expireDate: expireDate
                    } );
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'metaprac',
                        action: 'put',
                        query: {
                            _id: result[0]._id
                        },
                        fields: Object.keys(result[0]),
                        data: Y.doccirrus.filters.cleanDbObject(result[0])
                    }, function( err ) {
                        if( err ) {
                            Y.log( 'error in note Invitation: ' + JSON.stringify( err.message || err ), 'error', NAME );
                            return callback( err );
                        }
                        callback( null );
                    });
                }
            } );
        }

        function removeInvitation( args ) {
            Y.log('Entering Y.doccirrus.api.partnerreg.removeInvitation', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.removeInvitation');
            }
            var
                user = args.user,
                callback = args.callback,
                params = args.data;

            if( !params.pin || !params.dcCustomerNo ) {
                callback( 'missing params' );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                query: {customerIdPrac: params.dcCustomerNo},
                callback: function( err, result ) {
                    var
                        exists;
                    if( err || !result || !result[0] ) {
                        return callback( err || 'no metaprac found' );
                    }
                    result[0].invitations = result[0].invitations || [];
                    result[0].invitations = result[0].invitations.filter( function( item ) {
                        if( item.pin === params.pin ) {
                            exists = true;
                            return false;
                        }
                        return true;
                    } );
                    if( exists ) {
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'metaprac',
                            action: 'put',
                            query: {
                                _id: result[0]._id
                            },
                            fields: Object.keys(result[0]),
                            data: Y.doccirrus.filters.cleanDbObject(result[0])
                        }, function( err ) {
                            if( err ) {
                                Y.log( 'error in removing invitation: ' + JSON.stringify( err.message || err ), 'error', NAME );
                                return callback( err );
                            }
                            Y.log( 'removed invitation from ' + params.dcCustomerNo + ' for pin: ' + params.pin, 'info', NAME );
                            callback( null );
                        });

                    } else {
                        Y.log( `Could not remove invitation pin: ${params.pin}, from customer invitations list, customerNo: ${params.dcCustomerNo}. It has been already removed.`, 'info', NAME );
                        return callback();
                    }
                }
            } );
        }

        function getPresenceEntry( args ) {
            Y.log('Entering Y.doccirrus.api.partnerreg.getPresenceEntry', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partnerreg.getPresenceEntry');
            }
            var
                user = args.user,
                params = args.data,
                callback = args.callback;

            if( !params.identityId || !params.host ) {
                callback( YDC.errors.rest( 409, 'missing query params' ) );
                return;
            }

            YDC.mongodb.runDb( {
                user: user,
                model: 'partnerreg',
                query: {identityId: params.identityId, host: params.host && params.host.toLowerCase()},
                callback: function( err, result ) {
                    var
                        presenceData = result && result[0];
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, presenceData );
                }
            } );
        }

        function connectPresenceService( callback ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                callback();
                return;
            }
            /**
             * presence list listeners
             * set SIO listeners for PUC and PRC
             */
            if( Y.doccirrus.auth.isPUC() ) {

                Y.doccirrus.schemas.partnerreg.resetPresenceList( Y.doccirrus.auth.getSUForPUC() ); // set everyone to offline

                Y.doccirrus.communication.setListenerForNamespace( '/', UPDATE_PRESENCE_LIST, function receivedOnPUC( message ) {
                    // update global presence list
                    updatePresenceList( Y.doccirrus.auth.getSUForPUC(), message, function( err ) {
                        if( err ) {
                            Y.log( 'failed to update the global presence list' );

                        } else {
                            // notify PRCs about the change
                            Y.doccirrus.communication.emitNamespaceEvent( {
                                nsp: 'default',
                                event: REFRESH_PRESENCE_TABLE,
                                msg: {
                                    updateList: message.onlineList
                                }
                            } );
                        }
                    } );
                } );

                // update metaprac for the newly connected PRC
                Y.log( 'connectPresenceService. set REGISTER_TO_PUC listener', 'debug', NAME );
                Y.doccirrus.communication.setListenerForNamespace( '/', REGISTER_TO_PUC, function receivedOnPUC( message ) {
                    let
                        socket = this,
                        _message = Object.assign( message || {} );
                    _message.systemId = socket.systemId;
                    Y.doccirrus.api.metaprac.registerPRC( {
                        user: Y.doccirrus.auth.getSUForPUC(),
                        data: message,
                        callback: function( err ) {
                            if( err ) {
                                Y.log( 'error in registering PRC: ' + JSON.stringify( err ), 'error', NAME );
                            } else {
                                Y.log( 'registered PRC with data: ' + JSON.stringify( message ), 'info', NAME );
//                                Y.doccirrus.communication.sendOnlineSystemsList();   <---  naive solution does not work any more.
                                //  presence system needs to be rewritten.
                            }
                        }
                    } );
                } );

            } else { // PRC, VPRC

                // just relaying PUC's message to local online users
                Y.doccirrus.communication.setPUCListener(
                    {
                        event: REFRESH_PRESENCE_TABLE,
                        callback: function receivedOnPRC( message ) {
                            notifyUsers( message );
                        }
                    }
                );
                Y.doccirrus.communication.getPRCId(); // set PRC ID on this worker
            }

            callback();
        }

        Y.namespace( 'doccirrus.api' ).partnerreg = {

            runOnStart: connectPresenceService,

            getPresenceEntry: getPresenceEntry,
            getPresenceList: getPresenceList,
            updatePresenceList: updatePresenceList,
            publishPresenceList: publishPresenceList,
            registerOnPUC: registerOnPUC,
            noteInvitation: noteInvitation,
            removeInvitation: removeInvitation,
            getPracInfoByPIN: getPracInfoByPIN,
            gerPresenceListPUC
        };

    },
    '0.0.1', {requires: [
        'oop',
        'partnerreg-schema',
        'dccommunication'
    ]}
);