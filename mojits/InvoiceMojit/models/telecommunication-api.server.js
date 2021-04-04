/**
 * User: pi
 * Date: 27/02/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'telecommunication-api', function( Y, NAME ) {
        var
            UPSERT_CALL_AUDIT = 'UPSERT_CALL_AUDIT',
            INCOMING_CALL = 'INCOMING_CALL', // callee has an incoming call
            CALL_RECEIVED = 'CALL_RECEIVED', // acknowledgement for caller
            CALL_PICKED = 'CALL_PICKED', // callee answers
            CALL_REJECTED = 'CALL_REJECTED', // callee rejects
            CALL_CANCELLED = 'CALL_CANCELLED', // caller cancels
            UPDATE_CONFERENCE = 'UPDATE_CONFERENCE',
            UPDATE_TELECONSULT = 'UPDATE_TELECONSULT',
            joinedEvents = {
                PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
                PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
                ADD_PARTICIPANT: 'ADD_PARTICIPANT'
            },
            SUBMIT_NOTES = 'SUBMIT_NOTES',
            i18n = Y.doccirrus.i18n,
            DOCCIRRUS_SIGN = i18n( 'IntouchPrivateMojit.general.DOCCIRRUS_SIGN' ),
            closedConference = {}, CLOSED = "CLOSED";

        /**
         * @module telecommunication-api
         */

        function getPresenceList( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.getPresenceList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.getPresenceList');
            }
            Y.doccirrus.api.partnerreg.getPresenceList( args );
        }

        /**
         * decide which server is going to host the conference
         * @param {String} [callId]
         * @param {Boolean} [isLocal] whether all participant reside on the same server or on different servers
         * @returns {string}
         */
        function getCallUrl( callId, isLocal ) {
            let
                confUrl = '/intouch/conference';
            if( callId ) {
                confUrl += '/' + callId;
            }
            if( !isLocal ) {
                confUrl = Y.doccirrus.auth.getPartnerUrl( confUrl );

            } else if( Y.doccirrus.auth.isVPRC() ) {
                confUrl = Y.doccirrus.auth.getPUCUrl( confUrl );

            } else if( Y.doccirrus.auth.isPRC() ) {
                confUrl = confUrl;

            } else if( Y.doccirrus.auth.isPUC() ) { // for patient portal
                confUrl = Y.doccirrus.auth.getPartnerUrl( confUrl );
            }

            return confUrl;
        }

        // mutate and save call audit data
        function postCallAudit( user, data, callback ) {
            var
                callAudit = Object.assign( {}, data );

            // set display fields, needed for table columns
            if( callAudit.identityId === callAudit.caller.identityId ) { // if the call audit belongs to the caller then use info of the first callee
                if( callAudit.callee[ 0 ] ) {
                    callAudit.firstname = callAudit.callee[ 0 ].firstname;
                    callAudit.lastname = callAudit.callee[ 0 ].lastname;
                    callAudit.type = callAudit.callee[ 0 ].type;
                } else {
                    callAudit.firstname = '-';
                    callAudit.lastname = '-';
                    callAudit.type = 'OTHER';
                }

            } else { // belongs to a callee, use caller's info
                callAudit.firstname = callAudit.caller.firstname;
                callAudit.lastname = callAudit.caller.lastname;
                callAudit.type = callAudit.caller.type;
            }
            callAudit.caller = [ callAudit.caller ];

            callAudit = Y.doccirrus.filters.cleanDbObject( callAudit );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'callaudit',
                action: 'post',
                data: callAudit,
                callback: function( err ) {
                    if( err ) {
                        Y.log( 'error in postCallAudit: ' + JSON.stringify( err.message || err ), 'error', NAME );
                        return callback( err );
                    }
                    callback( null );
                }
            } );
        }

        function getCallMessageBody( callData, receivers ) {
            var msgData = {
                callData: callData
            };
            if( receivers ) {
                msgData.receivers = receivers;
            }
            return msgData;
        }

        /**
         * call users on through their SIO connection
         * log the call for each receiver
         * @param {Object}      callData
         * @param {Array}       receivers
         * @param {Function}    callback
         */
        function makeLocalCall( callData, receivers, callback ) {
            var
                caller = callData.caller,
                audioOnly = callData.audioOnly,
                currentPRC = Y.doccirrus.communication.getPRCId(),
                async = require( 'async' );

            function prepareAuditData( user, callData, identityId, _callback ) {
                var
                    auditData = {};
                auditData.identityId = identityId;
                auditData.callId = callData.callId;
                auditData.callTime = callData.callTime;
                auditData.reason = callData.reason;
                auditData.caller = caller;
                auditData.callee = callData.callee;
                Y.Array.some( callData.callee, function( item ) {
                    if( item.identityId === identityId ) {
                        auditData.locationName = item.locationName;
                        return true;
                    }
                } );

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'identity',
                        query: { _id: identityId },
                        options: { select: { specifiedBy: 1 } },
                        callback: function( err, result ) {
                            var
                                identity = result && result[ 0 ];
                            if( err || !identity ) {
                                Y.log( 'error1: ' + err, 'error', NAME );
                                _callback( err || 'missing identity' );
                                return;
                            }
                            auditData.employeeId = identity.specifiedBy;
                            Y.doccirrus.mongodb.runDb(
                                {
                                    user: user,
                                    model: 'employee',
                                    query: { _id: identity.specifiedBy },
                                    options: { select: { firstname: 1, lastname: 1, type: 1 }, lean: true },
                                    callback: function( err1, result1 ) {
                                        var
                                            employee = result1 && result1[ 0 ];
                                        if( err1 || !employee ) {
                                            Y.log( 'error2 : ' + err1, 'error', NAME );
                                            _callback( err1 || 'missing employee' );
                                            return;
                                        }
                                        auditData = Y.mix( auditData, employee );
                                        delete auditData._id;
                                        _callback( null, auditData );
                                    }
                                } );
                        }
                    } );
            }

            // log the call for the callee
            function eachCallee( item, _cb ) {
                var
                    dbUser = Y.doccirrus.auth.getSUForTenant( item.tenantId ),
                    privateCallData; // user-specific data

                if( item.prcId !== currentPRC ) { // then the user is external
                    _cb();
                    return;
                }

                if( item.identityId === caller.identityId && item.host === caller.host ) { // exclude the caller
                    _cb();
                    return;
                }

                prepareAuditData( dbUser, callData, item.identityId, function( err, auditData ) {
                    if( err ) {
                        Y.log( 'error from prepareAuditData:' + JSON.stringify( err ), 'error', NAME );
                        _cb( err );
                        return;
                    }
                    postCallAudit( dbUser, auditData, function( err ) {
                        if( err ) {
                            Y.log( 'error in logging incoming call:' + JSON.stringify( err ), 'error', NAME );
                            _cb( err );
                            return;
                        }
                        privateCallData = Object.assign( {}, auditData );
                        privateCallData.conferenceUrl = callData.conferenceUrl + '?identityId=' + item.identityId + '&firstName=' + auditData.firstname + '&lastName=' + auditData.lastname +
                                                        '&dcCustomerNo=' + item.dcCustomerNo; // add user-specific params (for callee)
                        if( audioOnly ) {
                            privateCallData.conferenceUrl += '&audioOnly=' + audioOnly;
                        }

                        // call the user vi SIO
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: item.identityId,
                            tenantId: item.tenantId,
                            event: INCOMING_CALL,
                            msg: {
                                data: privateCallData
                            }
                        } );
                        _cb();
                    } );
                } );
            }

            Y.log( 'local call, callData:' + JSON.stringify( callData ), 'debug', NAME );
            async.each( receivers, eachCallee, function( err ) {
                callback( err );
            } );
        }

        /**
         * on PRC, update tele-consult activity with:
         * time span, consult note, participant
         * @param {Object}          dbUser
         * @param {Object}          data
         * @param {Function}        callback
         */
        function updateTeleConsultData( dbUser, data, callback ) {
            Y.log( 'updateTeleConsultData: ' + JSON.stringify( data ), 'debug', NAME );
            var
                callId = data.callId,
                identityId = data.identityId || dbUser.identityId;

            if( !callId || !identityId ) {
                callback( 'missing callId/identityId' );
                return;
            }

            function updateActivity( err ) {
                if( err ) {
                    callback( err );
                    return;
                }
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'activity',
                    action: 'get',
                    query: { _id: callId },
                    options: {
                        lean: true,
                        select: {
                            start: 1,
                            attachments: 1
                        }
                    },
                    callback: function( err, result ) {
                        var
                            consultAct = result && result[ 0 ],
                            currentParticipants,
                            _data = {};
                        if( err ) {
                            return callback( err );
                        }
                        if( !consultAct ) {
                            Y.log( 'updateTeleConsultData. could not get consult activity', 'warn', NAME );
                            return callback();
                        }
                        currentParticipants = consultAct.participants || [];
                        if( data.consultNote ) {
                            _data.teleConsultNote = data.consultNote;
                        }
                        if( data.joinedAt ) {
                            _data.start = consultAct.start || data.joinedAt; // one-time set
                        }
                        if( data.leftAt ) {
                            _data.end = data.leftAt;
                        }
                        if( data.participant &&
                            !currentParticipants.find( function( item ) {
                                return item.dcCustomerNo === data.participant.dcCustomerNo;
                            } )
                        ) {
                            _data.participants = currentParticipants;
                            _data.participants.push( data.participant );
                        }

                        Y.log( 'Remove this log in 3.7\nupdating teleconsult ' + JSON.stringify( _data ), 'info', NAME );
                        Y.doccirrus.mongodb.runDb( {
                            user: dbUser,
                            model: 'activity',
                            action: 'put',
                            migrate: true,
                            query: {
                                _id: consultAct._id.toString()
                            },
                            data: Y.doccirrus.filters.cleanDbObject( _data ),
                            fields: Object.keys( _data )
                        }, function( err, results ) {
                            if( err ) {
                                Y.log( 'error in saving teleConsult data: ' + JSON.stringify( err.message || err ), 'error', NAME );
                                return callback( err );
                            }
                            if( data.saveActivityEvent ) {
                                Y.doccirrus.communication.emitEventForUser( {
                                    targetId: identityId,
                                    event: 'system.SAVE_TELECONSULT',
                                    msg: {
                                        data: {
                                            // guard for MOJ-8573
                                            activityId: consultAct._id.toString(),
                                            attachments: results && results.attachments
                                        }
                                    }
                                } );
                            }
                            callback( err, results );
                        } );

                    }
                } );
            }

            updateActivity();
        }

        /**
         * called directly by user, to protect confidential data
         * @param {Object}          args
         * @param {Object}          args.data
         * @param {Function}        args.callback
         */
        function saveNote( args ) {
            var
                callback = args.callback,
                data = args.data;

            if( !data || !data.consultNote || !data.callId ) {
                callback( Y.doccirrus.errors.http( 400, 'missing consultNote/callId' ) );
                return;
            }

            updateTeleConsultData( args.user, data, callback );
        }

        // on PRC, add the invited guest to all relevant callaudit entries, then update the activity
        function addParticipant( dbUser, data, callback ) {
            Y.log( 'addParticipant called:' + JSON.stringify( data ), 'debug', NAME );
            var
                async = require( 'async' ),
                participant = data.participant,
                callId = data.callId;

            async.parallel( {
                updateCallaudit: function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'callaudit',
                        action: 'get',
                        query: { callId: callId },
                        callback: function( err, result ) {
                            if( err ) {
                                return done( err );
                            }
                            for( let item of result ) {
                                // to avoid adding the same participant into callaudit
                                if( !item.callee.find( calleeItem => {
                                    return calleeItem.email === participant.email &&
                                           calleeItem.lastname === participant.lastname &&
                                           calleeItem.firstname === participant.firstname;
                                } ) ) {
                                    item.callee.push( participant );
                                    Y.doccirrus.mongodb.runDb( {
                                        user: dbUser,
                                        model: 'callaudit',
                                        action: 'put',
                                        query: {
                                            _id: item._id
                                        },
                                        fields: Object.keys( item ),
                                        data: Y.doccirrus.filters.cleanDbObject( item )
                                    }, function( err ) {
                                        if( err ) {
                                            Y.log( 'error saving callaudit: ' + JSON.stringify( err ), NAME );
                                        }
                                    } );
                                }
                            }
                            done();
                        }
                    } );
                },
                updateTCActivity: function( done ) {
                    updateTeleConsultData( dbUser, {
                        callId: callId,
                        participant: participant,
                        identityId: data.identityId
                    }, done );
                }
            }, callback );
        }

        function updateCallLog( dbUser, data, callback ) {
            Y.log( 'updateCallLog: ' + JSON.stringify( data ), 'debug', NAME );
            var
                callId = data.callId,
                identityId = data.identityId,
                callData = Object.assign( {}, data );

            if( !callId || !identityId ) {
                callback( 'missing callId/identityId' );
                return;
            }

            callData.lastJoin = callData.joinedAt;
            // these fields are set only once and should not ever change
            delete callData._id;
            delete callData.identityId;
            delete callData.employeeId;
            delete callData.callId;
            delete callData.firstname;
            delete callData.lastname;
            delete callData.type;
            delete callData.joinedAt; // this should not ever change once is set

            callData = Y.doccirrus.filters.cleanDbObject( callData );
            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'callaudit',
                action: 'put',
                fields: Object.keys( callData ),
                data: callData,
                query: { callId: callId, identityId: identityId },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, result );
                }
            } );
        }

        // tell the caller a participant received the call
        function callReceived( callData ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: callData.caller.identityId,
                tenantId: callData.caller.tenantId,
                event: CALL_RECEIVED,
                msg: {
                    data: callData
                }
            } );
        }

        // inform client-side the call was picked/rejected/cancelled and update call log with the relevant flag
        function informUser( eventName, identityId, tenantId, callData ) {
            var
                user = Y.doccirrus.auth.getSUForTenant( tenantId );

            callData.identityId = identityId;
            updateCallLog( user, callData, function( err ) {
                if( err ) {
                    Y.log( 'error from updateCallLog: ' + JSON.stringify( err ), 'error', NAME );
                }
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: identityId,
                    tenantId: tenantId,
                    event: eventName,
                    msg: {
                        data: callData
                    }
                } );
            } );
        }

        /**
         *  when a user joins a call inform the caller PRC
         * Note that this can be called on both PUC and PRC
         * @api webRTC
         * @param {Object}          callData
         * @param {Object}          theCallee
         */
        function emitCallPickedToPRC( callData, theCallee ) {
            if( Y.doccirrus.auth.isPRC() ) {
                informUser( CALL_PICKED, callData.caller.identityId, callData.caller.tenantId, callData );
            } else {
                Y.doccirrus.communication.emitEventForPRC( {
                    prcId: callData.caller.prcId,
                    event: CALL_PICKED,
                    msg: {
                        data: getCallMessageBody( callData, [ theCallee ] )
                    }
                } );
            }
        }

        /**
         * let caller know someone picked the call
         * Note that this can be called on both PUC and PRC (whichever that is hosting the webrtc service)
         *
         * @api webRTC
         * @param {String}              callId
         * @param {ObjectId}            identityId the participant who has picked the call
         * @param {Function}            callback
         */
        function informCaller( callId, identityId, callback ) {
            var
                dbUser = Y.doccirrus.auth.getSUForPUC();

            if( !callback ) {
                callback = function( err ) {
                    if( err ) {
                        Y.log( 'error in informCaller: ' + JSON.stringify( err ), 'error', NAME );
                    }
                };
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'callaudit',
                query: { callId: callId },
                options: {
                    lean: true
                },
                callback: function( err, result ) {
                    var
                        callAudit = result && result[ 0 ],
                        callData,
                        theGuy;
                    if( err || !callAudit ) {
                        return callback( err || 'invalid call' );
                    }
                    theGuy = Y.Array.find( callAudit.callee, function( item ) {
                        return item.identityId === identityId;
                    } );
                    callData = callAudit;
                    // set the flag for the callee who just joined
                    callData.callee = Y.Array.map( callData.callee, function( item ) {
                        if( item.identityId === identityId ) {
                            item.picked = true;
                        }
                        return item;
                    } );

                    callData.caller = callData.caller[ 0 ];
                    if( theGuy && !(theGuy.identityId === callData.caller.identityId && theGuy.host === callData.caller.host ) ) {
                        if( !callAudit.joinedAt ) {
                            callAudit.joinedAt = new Date(); // start billing when the first participant joins
                        }
                        emitCallPickedToPRC( callData, theGuy );
                        return callback();
                    }
                    // ignore if the joined guy is the caller
                    callback();
                }
            } );
        }

        /**
         * if the user is the caller then the call was cancelled,
         * otherwise it's a callee and the call was rejected
         * if all participants are available locally then inform them locally,
         * otherwise do it via PUC
         * @param {Object}          args
         * @param {Object}          args.data
         * @param {Function}        args.callback
         */
        function rejectCall( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.rejectCall', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.rejectCall');
            }
            var
                callback = args.callback,
                params = args.data,
                callData = params.callData || {},
                user = args.user,
                localCall = Y.Array.every( callData.callee || [], function( item ) { // is everyone on the same host
                    return item.prcId === callData.caller.prcId;
                } ),
                isCaller;

            if( !callData || !callData.caller ) {
                callback( Y.doccirrus.errors.rest( 409, 'missing params' ) );
                return;
            }

            isCaller = (user.identityId === callData.caller.identityId && user.tenantId === callData.caller.tenantId);

            if( isCaller ) {
                callData.cancelled = true;
            } else {
                callData.callee = Y.Array.map( callData.callee, function( item ) {
                    // set the flag for the callee who just rejected
                    if( item.identityId === user.identityId ) {
                        item.rejected = true;
                    }
                    return item;
                } );
            }

            if( localCall ) {
                if( isCaller ) { // cancelled => inform every callee
                    Y.Array.each( callData.callee, function( item ) {
                        informUser( CALL_CANCELLED, item.identityId, item.tenantId, callData );
                    } );
                } else { // rejected => inform caller
                    informUser( CALL_REJECTED, callData.caller.identityId, callData.caller.tenantId, callData );
                }

            } else {
                Y.doccirrus.communication.emitPUC( {
                    event: isCaller ? CALL_CANCELLED : CALL_REJECTED,
                    message: getCallMessageBody( callData )
                } );
            }

            // update the flags also for myself
            updateCallLog( user, callData, callback );
        }

        // handle call signals (received form PUC) on PRC
        function handleSubEvent( subEvent, data, callback ) {
            Y.log( 'handleSubEvent: ' + subEvent + ' data: ' + JSON.stringify( data ), 'debug', NAME );
            var
                user = Y.doccirrus.auth.getSUForTenant( data.tenantId );

            callback = callback || (() => {
            });

            function handleError( err ) {
                if( err ) {
                    Y.log( 'error in saving tele-consult data: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                callback();
            }

            switch( subEvent ) {
                case joinedEvents.PARTICIPANT_JOINED:
                    Y.doccirrus.api.telecommunication.updateCallLog( user, data, handleError );
                    break;

                case joinedEvents.PARTICIPANT_LEFT:
                    Y.doccirrus.api.telecommunication.updateCallLog( user, data, handleError );
                    break;

                case joinedEvents.ADD_PARTICIPANT:
                    Y.doccirrus.api.telecommunication.addParticipant( user, data, handleError );
                    break;

                case UPDATE_TELECONSULT:
                    Y.doccirrus.api.telecommunication.updateTeleConsultData( user, data, handleError );
                    break;
            }
        }

        // tell the PRC to update its conference related data
        function sendToPRC( config, callback ) {
            var prcId = config.prcId,
                myData = config.data;

            if( Y.doccirrus.auth.isPRC() ) {
                handleSubEvent( myData.subEvent, myData, callback );
            } else {
                Y.doccirrus.communication.emitEventForPRC( {
                    prcId: prcId,
                    event: UPDATE_CONFERENCE,
                    msg: {
                        data: myData
                    }
                } );
                if( 'function' === typeof callback ) {
                    return callback();
                }
            }
        }

        /**
         * this is called on conferencing server
         * when a participant joins or leaves a conference
         *
         * @api webRTC
         * @private
         * @param {String}      event
         * @param {Object}      params
         * @param {Object}      callback
         */
        function updateParticipantStatus( event, params, callback ) {
            var
                dbUser = Y.doccirrus.auth.getSUForPUC(),
                myData,
                async = require( 'async' );

            if( !callback ) {
                callback = function( err ) {
                    if( err ) {
                        Y.log( 'error in updateParticipantStatus: ' + JSON.stringify( err ), 'error', NAME );
                    }
                };
            }

            if( !params.identityId || !params.cid ) {
                callback( 'missing conference params' );
                return;
            }

            myData = {
                subEvent: event,
                callId: params.cid,
                identityId: params.identityId
            };

            if( joinedEvents.PARTICIPANT_JOINED === event ) {
                myData.joinedAt = (new Date()).toJSON();
                myData.picked = true;

            } else if( joinedEvents.PARTICIPANT_LEFT === event ) {
                myData.leftAt = (new Date()).toJSON();
            }

            if( params.roomContent && params.roomContent.consultNote ){
                myData.consultNote = params.roomContent.consultNote;
            }

            async.parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'partnerreg',
                        query: { identityId: params.identityId, dcCustomerNo: params.dcCustomerNo },
                        callback: function( err, result ) {
                            var
                                presenceData = result && result[ 0 ];
                            if( err ) {
                                return done( err );
                            } else if( presenceData ) {
                                myData.tenantId = presenceData.tenantId;
                                // update call audit on PRC of the dude who just joined/left
                                sendToPRC( {
                                    prcId: presenceData.prcId,
                                    data: myData
                                } );
                            } else { // could be a guest
                                Y.log( 'participant is not in the presence list, will not update any PRC', 'debug', NAME );
                            }
                            done();
                        }
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, myData );
            } );

        }

        function onConferenceEnd( config ) {
            closedConference[ config.data.callId ] = true;
            Y.log( ' Conference is ended', 'debug', NAME );
            config.data = config.data || {};
            config.data.saveActivityEvent = true;
            sendToPRC( {
                prcId: config.prcId,
                data: config.data
            } );
        }

        /**
         * when a user joins or leave
         * @api webRTC
         * @param {Object}          config
         * @param {boolean}         config.isPresent whether joined or left
         * @param {String}          config.cid conference id
         * @param {ObjectId}        config.identityId the participant
         */
        function setParticipantStatus( config ) {
            var
                isPresent = config.isPresent,
                cid = config.cid,
                identityId = config.identityId,
                dcCustomerNo = config.dcCustomerNo,
                data = config.data || {},
                connectedUsers = config.connectedUsers || [],
                params = {
                    identityId: identityId,
                    dcCustomerNo: dcCustomerNo,
                    cid: cid,
                    roomContent: data
                },
                su = Y.doccirrus.auth.getSUForPUC();

            function handleJoin( callAudit ) {
                // update callduit of the joined guy
                updateParticipantStatus( joinedEvents.PARTICIPANT_JOINED, params, function( err, status ) {
                    if( err ){
                        Y.log( `updateParticipantStatus error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                    if( status.joinedAt ) {
                        callAudit.joinedAt = callAudit.joinedAt || status.joinedAt;

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: su,
                            model: 'callaudit',
                            action: 'put',
                            query: {
                                _id: callAudit._id
                            },
                            fields: Object.keys( callAudit ),
                            data: Y.doccirrus.filters.cleanDbObject( callAudit )
                        } );
                    }
                    // update callaudit of the caller
                    informCaller( cid, identityId, null );
                } );
            }

            function closeConference( callAudit, closedAt, consultNote ) {
                var
                    callback = config.callback || function() {
                    };

                if( closedConference[ cid ] || CLOSED === callAudit.status ) { // prevent a race condition and duplicate closing
                    Y.log( 'conference is already closed, ignoring the call', 'debug', NAME );
                    setTimeout( function() {
                        delete closedConference[ cid ];
                    }, 2000 );
                    return;
                } else {
                    closedConference[ cid ] = true;
                }

                // close the audit entry
                if( !params.skipPucUpdate ) {
                    Y.log( 'saving the main call audit entry', 'debug', NAME );
                    callAudit.leftAt = closedAt;
                    callAudit.status = CLOSED;

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: su,
                        model: 'callaudit',
                        action: 'put',
                        query: {
                            _id: callAudit._id
                        },
                        fields: Object.keys( callAudit ),
                        data: Y.doccirrus.filters.cleanDbObject( callAudit )
                    } );
                }

                if( !callAudit.isTeleconsult ) {
                    callback();
                    return;
                }

                Y.log( 'will update tele-consult activity on host PRC: ' + callAudit.caller[ 0 ].dcCustomerNo, 'debug', NAME );

                // find the prc ID of the host
                Y.doccirrus.mongodb.runDb( {
                    user: su,
                    model: 'partnerreg',
                    query: {
                        identityId: callAudit.caller[ 0 ].identityId,
                        dcCustomerNo: callAudit.caller[ 0 ].dcCustomerNo
                    },
                    callback: function( err, result ) {
                        var
                            presenceData = result && result[ 0 ];
                        if( err || !presenceData ) {
                            Y.log( 'Error while getting presence data: ' + JSON.stringify( err || 'participant is not present' ), 'error', NAME );
                            return callback( err );
                        }
                        // will save timing data to the tele-consult entry
                        var data = {
                            subEvent: UPDATE_TELECONSULT,
                            joinedAt: callAudit.joinedAt,
                            leftAt: callAudit.leftAt,
                            callId: cid,
                            identityId: callAudit.caller[ 0 ].identityId,
                            tenantId: presenceData.tenantId
                        };
                        if( consultNote ){
                            data.consultNote = consultNote;
                        }
                        onConferenceEnd( {
                            data,
                            prcId: presenceData.prcId
                        } );
                        callback();
                    }
                } );
            }

            function handleLeave( callAudit ) {
                var
                    isHostOnline = connectedUsers.some( function( user ) {
                        return user.identityId === callAudit.caller[ 0 ].identityId && user.dcCustomerNo === callAudit.caller[ 0 ].dcCustomerNo;
                    } );
                if( identityId !== callAudit.caller[ 0 ].identityId || dcCustomerNo !== callAudit.caller[ 0 ].dcCustomerNo ) { // if the caller

                    // callee left
                    params.skipPucUpdate = !isHostOnline; // if there is no host in the room, do not update 'callaudit' on PUC
                    updateParticipantStatus( joinedEvents.PARTICIPANT_LEFT, params, function( err, status ) {
                        if( !err ) {
                            // it was last callee => close conference
                            //only host is in the room
                            if( (1 === connectedUsers.length || (2 === connectedUsers.length && connectedUsers.some( function( user ) {
                                    return identityId === user.identityId && dcCustomerNo === user.dcCustomerNo;
                                } ))) && isHostOnline ) {
                                Y.log( 'last callee closing the call', 'debug', NAME );
                                closeConference( callAudit, status.leftAt, status.consultNote );
                            }
                        }
                    } );
                } else { // then it's a callee
                    if( connectedUsers.length ) {
                        // host left the room while conference => close conference
                        updateParticipantStatus( joinedEvents.PARTICIPANT_LEFT, params, function( err, status ) {
                            if( err ){
                                Y.log( `updateParticipantStatus error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            Y.log( 'host closing the call', 'debug', NAME );
                            closeConference( callAudit, status.leftAt, status.consultNote );
                        } );
                    } else {
                        //data should be already saved by the last callee
                        params.skipPucUpdate = false;
                        updateParticipantStatus( joinedEvents.PARTICIPANT_LEFT, params );
                    }
                }
            }

            // get the master audit entry (on PUC)
            // if a local call then host's entry is taken as master (TODO: is that needed to have master emtry here?)
            Y.doccirrus.mongodb.runDb( {
                user: su,
                model: 'callaudit',
                query: { callId: cid },
                options: { sort: { _id: 1 } }
            }, function( err, results ) {
                var callAudit;
                if( err || !results[ 0 ] ) {
                    Y.log( 'Error while getting callaudit document: ', JSON.stringify( err ) || 'document not found', 'error', NAME );
                    return;
                }
                callAudit = results[ 0 ];
                if( callAudit.caller && callAudit.caller[ 0 ] ) {
                    if( isPresent ) {
                        handleJoin( callAudit );
                    } else {
                        handleLeave( callAudit );
                    }
                }
            } );
        }

        /**
         * triggered by caller
         * setup call data
         *
         * if all participants are local then call them locally
         * otherwise ask PUC to call them
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {query}           args.query
         * @param {Function}        args.callback
         *
         */
        function initiateCall( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.initiateCall', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.initiateCall');
            }
            var
                callback = args.callback,
                user = args.user,
                query = args.query,
                teleConsult = query.teleConsult,
                patientId = query.patientId,
                caseFolderId = query.caseFolderId,
                receivers = query.receivers,
                audioOnly = query.audioOnly,
                privateCall = query.privateCall,
                async = require( 'async' );

            // creation of the initial consult activity with callId as _id
            function createConsultActivity( callData, _callback ) {
                var
                    activityData = {
                        _id: callData.callId,
                        caseFolderId: caseFolderId,
                        locationId: Y.doccirrus.schemas.location.getMainLocationId(),
                        actType: 'TELECONSULT',
                        employeeId: user.specifiedBy,
                        timestamp: new Date(),
                        patientId: patientId,
                        participants: null,
                        status: 'VALID',
                        start: callData.callTime
                    };

                activityData.participants = [ callData.caller ].concat( callData.callee );
                activityData.participants[ 0 ].isInitiator = true;
                activityData = Y.doccirrus.filters.cleanDbObject( activityData );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: activityData,
                    callback: function( err, result ) {
                        if( err ) {
                            _callback( err );
                        } else {
                            _callback( null, result && result[ 0 ] );
                        }
                    }
                } );
            }

            function callThem( callData ) {
                var
                    localCall = Y.Array.every( receivers, function( item ) {
                        return item.isLocal;
                    } ) && privateCall,
                    conferenceUrl = getCallUrl( callData.callId, localCall ),
                    msgData;

                callData.identityId = user.identityId;
                callData.audioOnly = audioOnly;
                callData.conferenceUrl = conferenceUrl;

                if( localCall && Y.doccirrus.auth.isPRC() ) {
                    Y.log( 'calling local users: ' + JSON.stringify( receivers ) + ' ,callData:' + JSON.stringify( callData ), 'debug', NAME );
                    makeLocalCall( callData, receivers, function( err ) {
                        if( err ) {
                            Y.log( 'error in calling local users: ' + JSON.stringify( err ), 'error', NAME );
                        } else {
                            callReceived( callData );
                        }
                    } );

                } else { // call via PUC for remote users or users on VPRC
                    Y.log( 'calling remote users: ' + JSON.stringify( receivers ) + ' ,localCall: ' + localCall + ' ,callData:' + JSON.stringify( callData ), 'debug', NAME );
                    msgData = getCallMessageBody( callData, receivers );
                    Y.doccirrus.communication.emitPUC( {
                        event: INCOMING_CALL,
                        message: msgData
                    } );
                }

                conferenceUrl = conferenceUrl + '?identityId=' + user.identityId + '&firstName=' + callData.caller.firstname + '&lastName=' + callData.caller.lastname + '&dcCustomerNo=' + callData.caller.dcCustomerNo + '&host=true'; // add user specific params (for caller)
                if( audioOnly ) {
                    conferenceUrl += '&audioOnly=' + audioOnly;
                }
                if( privateCall ) {
                    conferenceUrl += '&privateCall=' + privateCall;
                }
                if( teleConsult ) {
                    conferenceUrl += '&teleConsult=true';
                    createConsultActivity( callData, function( err, activityId ) {
                        if( err ) {
                           return callback( err );
                        }
                        callback( null, { conferenceUrl: conferenceUrl, callData: callData, activityId: activityId } );
                    } );
                } else {
                   return callback( null, { conferenceUrl: conferenceUrl, callData: callData } );
                }
            }

            // collect all required data
            async.parallel( {
                    employee: function( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            action: 'get',
                            query: { _id: user.specifiedBy },
                            options: {
                                lean: true
                            },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                   return  _cb( err || Y.doccirrus.errors.rest( 400 ) );
                                }
                                _cb( null, result[ 0 ] );
                            }
                        } );
                    },
                    location: function( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            query: { _id: Y.doccirrus.schemas.location.getMainLocationId() },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                    return _cb( err || 'no location' );
                                }
                                _cb( null, result[ 0 ] );
                            }
                        } );
                    },
                    practice: function( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'practice',
                            options: { limit: 1 },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                   return _cb( err );
                                }
                                _cb( null, result[ 0 ] );
                            }
                        } );
                    }

                },
                function prepareCallData( err, myData ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    var
                        mongoose = require( 'mongoose' ),
                        callData = {
                            reason: query.reason,
                            employeeId: user.specifiedBy,
                            identityId: user.identityId,
                            caller: {},
                            callee: []
                        };

                    callData.callId = new mongoose.Types.ObjectId(); // conference id
                    callData.callTime = new Date();
                    callData.caller.identityId = user.identityId;
                    callData.caller.tenantId = user.tenantId;
                    callData.caller.firstname = myData.employee.firstname;
                    callData.caller.lastname = myData.employee.lastname;
                    callData.caller.type = myData.employee.type;
                    callData.caller.locationName = myData.location.locname;
                    callData.caller.host = Y.doccirrus.auth.getMyHost( user.tenantId );
                    callData.caller.host = callData.caller.host && callData.caller.host.toLowerCase();
                    callData.caller.prcId = Y.doccirrus.communication.getPRCId();
                    callData.caller.dcCustomerNo = myData.practice.dcCustomerNo;
                    callData.callee = receivers;
                    callData.isTeleconsult = teleConsult;
                    // log the call for caller
                    postCallAudit( user, callData, function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        callThem( callData );
                    } );
                } );
        }

        /**
         * invite participant to conference
         * @param {Object} data
         * @param {String} data.email
         * @param {String} data.subject email subject
         * @param {String} data.content email content
         * @param {String} data.conferenceId
         * @param {Boolean} [data.audioOnly]
         * @param {Boolean} [data.isForUnregistered]
         * @param {String} data.firstName
         * @param {String} data.lastName
         * @param {Function} callback
         */
        function inviteByEmail( data, callback ) {
            const
                mongoose = require( 'mongoose' ),
                identityId = new mongoose.Types.ObjectId(),
                user = data.user || Y.doccirrus.auth.getSUForLocal(),
                async = require( 'async' );
            let jadeParams = {},
                emailMessage,
                linkHTML,
                newLink;

            Y.log( `Inviting participant by email ${JSON.stringify( data )}`, 'warn', NAME );

            if( !(data && data.email && data.conferenceId) ) {
                return;
            }

            newLink = data.link + '/' + data.conferenceId + '?identityId=' + identityId + '&firstName=' + (data.firstName || '') + '&lastName=' + (data.lastName || data.email);

            if( data.audioOnly ) {
                newLink += '&audioOnly=' + data.audioOnly;
            }

            if( data.isForUnregistered ) {
                newLink += '&light=' + data.isForUnregistered;
            }

            linkHTML = '<a href="' + newLink + '" target="_blank">' + newLink + '</a>';

            data.content = data.content.replace( /http.*?\/intouch\/conference[\S]*(?=[\s$]?)/i, linkHTML );

            jadeParams.text = data.content;

            jadeParams.docCirrusSign = DOCCIRRUS_SIGN;

            Y.log( `inviteByEmail: sending email with following content: 
                to: ${data.email}
                subject: ${data.subject}
                content: ${jadeParams.text}
            `, 'info', NAME );

            async.waterfall( [
                function( next ) {
                    jadeParams.text = jadeParams.text.replace( /\r\n/g, '<br/>' ).replace( /\n|\r/g, '<br/>' );

                    emailMessage = Y.doccirrus.email.createHtmlEmailMessage( {
                        serviceName: 'conferenceService',
                        to: data.email,
                        subject: data.subject,
                        jadeParams: jadeParams,
                        jadePath: './mojits/IntouchPrivateMojit/views/inviteparticipantemail.jade.html'
                    } );

                    Y.doccirrus.email.sendEmail( { ...emailMessage, user }, err => next( err ) );
                },
                function( next ) {
                    updateCallAuditLog( {
                        user,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        identityId,
                        conferenceId: data.conferenceId
                    }, next );
                }
            ], callback );
        }

        function updateCallAuditLog( params, callback ) {
            if( Y.doccirrus.auth.isPUC() ) {
                updatePUCCallAuditLog( params, callback );
            } else {
                updatePRCCallAuditLog( params, callback );
            }
        }

        /**
         * this is called on PUC
         * @param {Object} data
         * @param {String} data.email
         * @param {String} data.conferenceId
         * @param {Function} callback
         */
        function updatePUCCallAuditLog( data, callback ) {
            const
                dbUser = Y.doccirrus.auth.getSUForPUC(),
                async = require( 'async' );

            async.waterfall( [
                // update the callaudit locally and on host's PRC
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'callaudit',
                        action: 'get',
                        query: { callId: data.conferenceId }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            Y.log( `inviteByEmail error. call audit not found for conferenceId: ${data.conferenceId}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: `call audit not found for conferenceId: ${data.conferenceId}` } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    let
                        guest = {
                            firstname: data.firstName,
                            lastname: data.lastName,
                            identityId: data.identityId,
                            callId: data.conferenceId,
                            email: data.email
                        };
                    callAudit.callee.push( guest );

                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'callaudit',
                        action: 'put',
                        query: {
                            _id: callAudit._id
                        },
                        fields: Object.keys( callAudit ),
                        data: Y.doccirrus.filters.cleanDbObject( callAudit )
                    }, err => {
                        next( err, {
                            prcId: callAudit.caller[ 0 ].prcId,
                            data: {
                                tenantId: callAudit.caller[ 0 ].tenantId,
                                subEvent: joinedEvents.ADD_PARTICIPANT,
                                callId: data.conferenceId,
                                identityId: callAudit.caller[ 0 ].identityId,
                                participant: guest
                            }
                        } );
                    } );
                },
                function( prcData, next ) {
                    // update host PRC
                    sendToPRC( prcData, next );
                }
            ], callback );
        }

        /**
         * this is called on PUC
         * @param {Object} data
         * @param {String} data.email
         * @param {String} data.conferenceId
         * @param {Function} callback
         */
        function updatePRCCallAuditLog( data, callback ) {
            const
                dbUser = data.user || Y.doccirrus.auth.getSUForTenant( data.tenantId ),
                async = require( 'async' );

            async.waterfall( [
                // update the callaudit locally and on host's PRC
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: dbUser,
                        model: 'callaudit',
                        action: 'get',
                        query: { callId: data.conferenceId }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            Y.log( `inviteByEmail error. call audit not found for conferenceId: ${data.conferenceId}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: `call audit not found for conferenceId: ${data.conferenceId}` } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    handleSubEvent( joinedEvents.ADD_PARTICIPANT, {
                        tenantId: callAudit.caller[ 0 ].tenantId,
                        callId: data.conferenceId,
                        identityId: callAudit.caller[ 0 ].identityId,
                        participant: {
                            firstname: data.firstName,
                            email: data.email,
                            lastname: data.lastName,
                            identityId: data.identityId,
                            callId: data.conferenceId
                        }
                    }, next );
                }
            ], callback );
        }

        /**
         * Uses callId for query
         * @method upsertCallAudit
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data callAudit data
         * @param {Function} args.callback
         */
        function upsertCallAudit( args ) {
            const
                { user, data, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'upsert',
                model: 'callaudit',
                user: user,
                query: { callId: data.callId },
                data: Object.assign( { skipcheck_: true }, data )
            }, callback );
        }

        /**
         * setup listeners and handlers for local and remote calls
         *
         * if call received on PUC then just relay it to target PRCs
         * if on PRC then calls trigger their call event
         *@param {Function}         callback
         */
        function initIntouchService( callback ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                callback();
                return;
            }

            // setup call listeners

            if( Y.doccirrus.auth.isPUC() ) {
                Y.doccirrus.communication.setListenerForNamespace( '/', UPSERT_CALL_AUDIT, function receivedOnPUC( message ) {
                    const
                        { callAudit } = message;
                    upsertCallAudit( {
                        user: Y.doccirrus.auth.getSUForPUC(),
                        data: callAudit,
                        callback( err ) {
                            if( err ) {
                                Y.log( `Could not upsert callAudit entry. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                        }
                    } );
                } );
                // relay the message to the target PRC
                Y.doccirrus.communication.setListenerForNamespace( '/', INCOMING_CALL, function receivedOnPUC( message ) {
                    var
                        callData = message.callData,
                        auditData = {},
                        prcList = [];
                    Y.log( 'INCOMING_CALL received:' + JSON.stringify( message ), 'debug', NAME );

                    auditData.callId = callData.callId;
                    auditData.reason = callData.reason;
                    auditData.callTime = callData.callTime;
                    auditData.caller = callData.caller;
                    auditData.callee = callData.callee;
                    auditData.isTeleconsult = callData.isTeleconsult;
                    auditData.firstname = 'Doc-Cirrus';
                    auditData.lastname = 'GmbH';
                    postCallAudit( Y.doccirrus.auth.getSUForPUC(), auditData,
                        function doRelay( err ) {
                            if( err ) {
                                Y.log( 'INCOMING_CALL error:' + JSON.stringify( err ), 'error', NAME );
                                return;
                            }

                            // collect the list of target PRCs
                            Y.Array.each( callData.callee, function( item ) {
                                if( 0 > prcList.indexOf( item.prcId ) ) {
                                    prcList.push( item.prcId );
                                }
                            } );

                            Y.Array.each( prcList, function( prcId ) {
                                Y.doccirrus.communication.emitEventForPRC( {
                                    prcId: prcId,
                                    event: INCOMING_CALL,
                                    msg: {
                                        data: message
                                    }
                                } );
                            } );
                        } );
                } );

                // relay the message to the caller PRC
                Y.doccirrus.communication.setListenerForNamespace( '/', CALL_RECEIVED, function receivedOnPUC( message ) {
                    Y.log( 'CALL_RECEIVED received:' + JSON.stringify( message ), 'debug', NAME );
                    var
                        callData = message.callData;

                    Y.doccirrus.communication.emitEventForPRC( {
                        prcId: callData.caller.prcId,
                        event: CALL_RECEIVED,
                        msg: {
                            data: message
                        }
                    } );
                } );

                // inform caller PRC about the call rejection
                Y.doccirrus.communication.setListenerForNamespace( '/', CALL_REJECTED, function receivedOnPUC( message ) {
                    Y.log( 'CALL_REJECTED received:' + JSON.stringify( message ), 'debug', NAME );
                    var
                        callData = message.callData;

                    Y.doccirrus.communication.emitEventForPRC( {
                        prcId: callData.caller.prcId,
                        event: CALL_REJECTED,
                        msg: {
                            data: message
                        }
                    } );
                } );

                // inform caller PRC about the call rejection
                Y.doccirrus.communication.setListenerForNamespace( '/', CALL_CANCELLED, function receivedOnPUC( message ) {
                    Y.log( 'CALL_CANCELLED received:' + JSON.stringify( message ), 'debug', NAME );
                    var
                        callData = message.callData;

                    Y.Array.each( callData.callee, function( item ) {
                        Y.doccirrus.communication.emitEventForPRC( {
                            prcId: item.prcId,
                            event: CALL_CANCELLED,
                            msg: {
                                data: message
                            }
                        } );
                    } );
                } );

            } else { // *****************************   PRC, VPRC   *****************************

                Y.doccirrus.communication.setPUCListener(
                    {
                        event: INCOMING_CALL,
                        callback: function receivedOnPRC( data ) {
                            Y.log( 'INCOMING_CALL received:' + JSON.stringify( data ), 'debug', NAME );
                            var
                                callData = data && data.callData;
                            if( !data ) {
                                Y.log( 'Can not process incoming call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            makeLocalCall( callData, data.receivers,
                                function toCaller( err ) {
                                    if( err ) {
                                        Y.log( 'error in calling local users: ' + JSON.stringify( err ), 'error', NAME );
                                        return;
                                    }
                                    // end point 1 for call receive
                                    // send the acknowledgement to the caller PRC through PUC
                                    Y.doccirrus.communication.emitPUC( {
                                        event: CALL_RECEIVED,
                                        message: getCallMessageBody( callData )
                                    } );
                                } );
                        }
                    }
                );

                // end point 2 for call receive
                Y.doccirrus.communication.setPUCListener(
                    {
                        event: CALL_RECEIVED,
                        callback: function receivedOnPRC( data ) {
                            Y.log( 'CALL_RECEIVED received:' + JSON.stringify( data ), 'debug', NAME );
                            var
                                callData = data && data.callData;
                            if( !data ) {
                                Y.log( 'Can not process received call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            callReceived( callData );
                        }
                    }
                );

                Y.doccirrus.communication.setPUCListener(
                    {
                        event: CALL_PICKED,
                        callback: function receivedOnPRC( data ) {
                            Y.log( 'CALL_PICKED received:' + JSON.stringify( data ), 'debug', NAME );
                            var
                                callData = data && data.callData;
                            if( !data ) {
                                Y.log( 'Can not process picked call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            informUser( CALL_PICKED, callData.caller.identityId, callData.caller.tenantId, callData );
                        }
                    }
                );

                Y.doccirrus.communication.setPUCListener(
                    {
                        event: CALL_REJECTED,
                        callback: function handleReject( data ) {
                            Y.log( 'CALL_REJECTED received:' + JSON.stringify( data ), 'debug', NAME );
                            var
                                callData = data && data.callData;
                            if( !data ) {
                                Y.log( 'Can not process rejected call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            informUser( CALL_REJECTED, callData.caller.identityId, callData.caller.tenantId, callData );
                        }
                    }
                );

                Y.doccirrus.communication.setPUCListener(
                    {
                        event: CALL_CANCELLED,
                        callback: function handleReject( data ) {
                            Y.log( 'CALL_CANCELLED received:' + JSON.stringify( data ), 'debug', NAME );
                            var
                                callData = data && data.callData;
                            if( !data ) {
                                Y.log( 'Can not process cancelled call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            Y.Array.each( callData.callee, function( item ) {
                                informUser( CALL_CANCELLED, item.identityId, item.tenantId, callData );
                            } );
                        }
                    }
                );

                // update conference related data for a participant
                Y.doccirrus.communication.setPUCListener(
                    {
                        event: UPDATE_CONFERENCE,
                        callback: function( data ) {
                            var
                                subEvent = data && data.subEvent;
                            if( !data ) {
                                Y.log( 'Can not process cancelled call. message data is: ' + JSON.stringify( data ), 'debug', NAME );
                                return;
                            }
                            handleSubEvent( subEvent, data );
                        }
                    }
                );

                Y.doccirrus.communication.setListenerForNamespace( '/', SUBMIT_NOTES, function receivedOnPUC( message ) {
                    Y.log( 'SUBMIT_NOTES received:' + JSON.stringify( message ), 'debug', NAME );

                    if( !message || !message.user ) {
                        Y.log( 'SUBMIT_NOTES no user => does nothing', 'debug', NAME );
                        return;
                    }
                    saveNote( {
                        data: message,
                        user: message.user,
                        callback: function( error, result ) {
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: message.user.identityId,
                                event: SUBMIT_NOTES,
                                msg: {
                                    error: error,
                                    data: result
                                }
                            } );
                        }
                    } );
                } );
            }

            callback();
        }

        function inviteExternalParticipants( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.inviteExternalParticipants', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.inviteExternalParticipants');
            }
            const
                async = require( 'async' );
            let
                { data: { participants = [], conferenceId, startDate, audioOnly, isForUnregistered, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE } = {}, callback, user } = args,
                link = getCallUrl(),
                eventType = isForUnregistered ? i18n( 'conference-api.vc_confirm_email.SUBJECT_EVENTTYPE' ) : i18n( `telecommunicaiton-api.title.${conferenceType}` );

            function invite( participant, callback ) {
                const
                    content = getInvitationEmailContent( {
                        lastname: participant.lastname || '',
                        firstname: participant.firstname || '',
                        email: participant.email,
                        talk: participant.talk || '',
                        startDate,
                        link,
                        conferenceType,
                        isForUnregistered
                    } ),
                    data = {
                        user,
                        firstName: participant.firstname,
                        lastName: participant.lastname,
                        email: participant.email,
                        copyEmailCreate: participant.copyEmailCreate,
                        copyEmailUpdate: participant.copyEmailUpdate,
                        copyEmailDelete: participant.copyEmailDelete,
                        conferenceId,
                        audioOnly,
                        link,
                        isForUnregistered,
                        content,
                        subject: i18n( 'telecommunicaiton-api.invitationEmail.SUBJECT', { data: { eventType } } )
                    };

                Y.doccirrus.api.telecommunication.inviteByEmail( data, callback );
            }

            async.waterfall( [
                function ( next ) {
                    async.eachSeries( participants, invite, next );
                },
                function( next ) {
                    Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                        user,
                        data: {
                            callId: conferenceId
                        },
                        callback: next
                    } );
                }
            ], callback );

        }

        function getInvitationEmailContent( params ) {
            const
                { lastname, firstname, talk, link, startDate, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE, isForUnregistered } = params,
                eventType = isForUnregistered ? i18n( 'conference-api.vc_confirm_email.SUBJECT_EVENTTYPE' ) : i18n( `telecommunicaiton-api.title.${conferenceType}` ),
                moment = require( 'moment' ),
                TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
                BODY_CONTENT = i18n( 'telecommunicaiton-api.invitationEmail.BODY_CONTENT', {
                    data: {
                        link,
                        time: moment( startDate ).format( TIME_FORMAT ),
                        eventType
                    }
                } ),
                BODY_COMPLIMENTARY_CLOSE = i18n( 'telecommunicaiton-api.invitationEmail.BODY_COMPLIMENTARY_CLOSE' );
            let
                BODY_GREETING,
                result = '';

            // start: Adding the greeting

            switch (true) {
                case 'MR' === talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING_MR' );
                    break;
                case 'MS' === talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING_MS' );
                    break;
                default:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING' );
            }


            result += `${BODY_GREETING}`;

            if ( firstname ) {
                result += ` ${firstname}`;

                if ( lastname ) {
                    result += ` ${lastname}`;
                }
            }

            result +=  `, <br/><br/>`;

            // end: Adding the greeting

            result += `${BODY_CONTENT}<br/><br/>${BODY_COMPLIMENTARY_CLOSE}`;

            return result;
        }

        /**
         * @method upsertCallAuditOnPUC
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.callId
         * @param {Object} args.user
         * @param {Function} args.callback
         * @return {Function} callback
         */
        function upsertCallAuditOnPUC( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC');
            }
            const
                { data: { callId, callAuditId } = {}, user, callback } = args;
            if( !callId && !callAuditId ) {
                Y.log( `upsertCallAuditOnPUC. callId and callAuditId are undefined`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'callId or callAuditId is required' } ) );
            }
            /**
             * is needed to guarantee "get" return up-to-date data right after "write" operation.
             */
            setImmediate( () => {
                let
                    query = {};
                if( callAuditId ) {
                    query._id = callAuditId;
                }
                if( callId ) {
                    query.callId = callId;
                }
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: query,
                    options: {
                        limit: 1,
                        sort: { _id: -1 }
                    }
                }, ( err, results ) => {
                    let
                        callAudit;
                    if( err ) {
                        return callback( err );
                    }
                    if( !results || !results[ 0 ] ) {
                        Y.log( `upsertCallAuditOnPUC. CallAudit not found. callId: ${callId}`, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: `CallAudit not found. callId: ${callId}` } ) );
                    }
                    callAudit = results[ 0 ];
                    delete callAudit._id;
                    Y.doccirrus.communication.emitPUC( {
                        event: UPSERT_CALL_AUDIT,
                        message: {
                            callAudit
                        },
                        callback( err ) {
                            if( err ) {
                                Y.log( `upsertCallAuditOnPUC. Could not create conference on PUC. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                return callback( err );
                            }
                            callback();
                        }
                    } );

                } );
            } );
        }

        /**
         * @method sendCancelEmail
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.participant
         * @param {Object} args.data.conference
         * @param {String} args.data.conference.conferenceId
         * @param {String} args.data.conference.startDate
         * @param {String} [args.data.conference.conferenceType=CONFERENCE]
         * @param {Function} args.callback
         * @return {Function} callback
         */
        function sendCancelEmail( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.sendCancelEmail', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.sendCancelEmail');
            }
            const
                { data: { participant = {}, conference: { conferenceId, startDate, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE } = {} } = {}, callback, user } = args,
                moment = require( 'moment' ),
                email = participant.email,
                eventType = i18n( `telecommunicaiton-api.title.${conferenceType}` ),
                TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
                subject = i18n( 'telecommunicaiton-api.cancelEmail.SUBJECT', { data: { eventType } } ),
                BODY_CONTENT = i18n( 'telecommunicaiton-api.cancelEmail.BODY_CONTENT', {
                    data: {
                        eventType,
                        time: moment( startDate ).format( TIME_FORMAT )
                    }
                } ),
                BODY_COMPLIMENTARY_CLOSE = i18n( 'telecommunicaiton-api.cancelEmail.BODY_COMPLIMENTARY_CLOSE' );
            let
                BODY_GREETING,
                emailContent = '',
                jadeParams = {},
                emailMessage;

            if( !email || !conferenceId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'email or conferenceId is missing' } ) );
            }

            // start: Adding the greeting

            switch (true) {
                case 'MR' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING_MR' );
                    break;
                case 'MS' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING_MS' );
                    break;
                default:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.invitationEmail.BODY_GREETING' );
            }


            emailContent += `${BODY_GREETING}`;

            if ( participant.firstname ) {
                emailContent += ` ${participant.firstname}`;

                if ( participant.lastname ) {
                    emailContent += ` ${participant.lastname}`;
                }
            }

            emailContent +=  `, <br/><br/>`;

            // end: Adding the greeting

            emailContent += `${BODY_CONTENT}<br/><br/>${BODY_COMPLIMENTARY_CLOSE}`;

            emailContent = emailContent.replace( /\r\n/g, '<br/>' ).replace( /\n|\r/g, '<br/>' );

            jadeParams.text = emailContent;

            jadeParams.docCirrusSign = DOCCIRRUS_SIGN;

            Y.log( `sendCancelEmail: sending email with following content: 
                to: ${email}
                subject: ${subject}
                content: ${jadeParams.text}
            `, 'info', NAME );

            emailMessage = Y.doccirrus.email.createHtmlEmailMessage( {
                serviceName: 'conferenceService',
                to: email,
                subject: subject,
                jadeParams: jadeParams,
                jadePath: './mojits/IntouchPrivateMojit/views/inviteparticipantemail.jade.html',
                cc: participant.copyEmailDelete
            } );

            Y.doccirrus.email.sendEmail( { ...emailMessage, user }, err => callback( err ) );
        }

        /**
         * @method cancelEmailInvitations
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.participants
         * @param {Object} args.data.conference
         * @param {String} args.data.conference.conferenceId
         * @param {String} args.data.conference.startDate ISO start date
         * @param {String} args.data.conference.conferenceType
         * @param {Boolean} [args.data.doNotUpdatePUC=false] if set to true, PUC call audit WON'T be updated
         * @param {Function} args.callback
         */
        function cancelEmailInvitations( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.cancelEmailInvitations', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.cancelEmailInvitations');
            }
            const
                async = require( 'async' ),
                { data: { doNotUpdatePUC = false, participants = [], conference = {} } = {}, callback, user } = args;

            function cancelInvitation( participant, callback ) {
                Y.doccirrus.api.telecommunication.sendCancelEmail( {
                    data: {
                        conference,
                        participant
                    },
                    user,
                    callback
                } );
            }

            async.waterfall( [
                function( next ) {
                    async.eachSeries( participants, cancelInvitation, ( err ) => next( err ) );
                },
                function( next ) {
                    Y.doccirrus.api.telecommunication.excludeParticipantsFromCallAudit( {
                        user,
                        data: {
                            doNotUpdatePUC,
                            conferenceId: conference.conferenceId,
                            participants
                        },
                        callback: next
                    } );
                }
            ], err => callback( err ) );
        }

        /**
         * @method excludeParticipantsFromCallAudit
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.conferenceId
         * @param {Array} args.data.participants
         * @param {Boolean} [args.data.doNotUpdatePUC=false] if set to true, PUC call audit WON'T be updated
         * @param {Function} args.callback
         */
        function excludeParticipantsFromCallAudit( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.excludeParticipantsFromCallAudit', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.excludeParticipantsFromCallAudit');
            }
            const
                { user, data: { doNotUpdatePUC = false, conferenceId, participants } = {}, callback } = args,
                emailList = [],
                identityList = [],
                async = require( 'async' );
            participants.forEach( item => {
                if( item.email ) {
                    emailList.push( item.email );
                    return;
                }
                if( item.identityId ) {
                    identityList.push( item.identityId );
                }
            } );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'get',
                        query: {
                            callId: conferenceId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'call audit not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'put',
                        fields: [ 'callee' ],
                        data: {
                            skipcheck_: true,
                            callee: callAudit.callee.filter( item => {
                                if( item.email ) {
                                    return !emailList.includes( item.email );
                                }
                                if( item.identityId ) {
                                    return !identityList.includes( item.identityId );
                                }
                            } )
                        },
                        query: {
                            _id: callAudit._id
                        }
                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        next();
                    } );
                },
                function( next ) {
                    if( !Y.doccirrus.auth.isPUC() && !doNotUpdatePUC ) {
                        return Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                            user,
                            data: {
                                callId: conferenceId
                            },
                            callback: next
                        } );
                    }
                    setImmediate( next );
                }
            ], err => callback( err ) );
        }

        /**
         * @method addParticipantsToCallAudit
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.conferenceId
         * @param {Array} args.data.participants
         * @param {Boolean} [args.data.doNotUpdatePUC=false] if set to true, PUC call audit WON'T be updated
         * @param {Function} args.callback
         */
        function addParticipantsToCallAudit( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.addParticipantsToCallAudit', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.addParticipantsToCallAudit');
            }
            const
                { user, data: { conferenceId, participants, doNotUpdatePUC = false } = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'get',
                        query: {
                            callId: conferenceId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'call audit not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'put',
                        fields: [ 'callee' ],
                        data: {
                            skipcheck_: true,
                            callee: callAudit.callee.concat( participants )
                        },
                        query: {
                            _id: callAudit._id
                        }
                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        next();
                    } );
                },
                function( next ) {
                    if( !Y.doccirrus.auth.isPUC() && !doNotUpdatePUC ) {
                        return Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                            user,
                            data: {
                                callId: conferenceId
                            },
                            callback: next
                        } );
                    }
                    setImmediate( next );
                }
            ], err => callback( err ) );
        }

        function updateCaller( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.updateCaller', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.updateCaller');
            }
            const
                { user, data: { callerId, conferenceId } = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        query: {
                            _id: callerId
                        },
                        action: 'get'
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: `Employee not found. _id: ${callerId}` } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( employee, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'identity',
                        query: {
                            specifiedBy: callerId
                        },
                        action: 'get'
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: `identity not found. specifiedBy: ${callerId}` } ) );
                        }
                        next( null, employee, results[ 0 ] );
                    } );
                },
                function( employee, identity, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'get',
                        query: {
                            callId: conferenceId
                        }
                    }, ( err, results ) => {
                        let
                            callerData;
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'call audit not found' } ) );
                        }
                        callerData = results[ 0 ].caller;
                        callerData[ 0 ].identityId = identity._id.toString();
                        callerData[ 0 ].firstname = employee.firstname;
                        callerData[ 0 ].lastname = employee.lastname;
                        callerData[ 0 ].type = employee.type;
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'put',
                        fields: [ 'caller', 'callee' ],
                        data: {
                            skipcheck_: true,
                            caller: callAudit.caller,
                            callee: callAudit.callee.filter( item => item.identityId !== callAudit.caller[ 0 ].identityId )
                        },
                        query: {
                            _id: callAudit._id
                        }
                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        next();
                    } );
                },
                function( next ) {
                    if( !Y.doccirrus.auth.isPUC() ) {
                        return Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                            user,
                            data: {
                                callId: conferenceId
                            },
                            callback: next
                        } );
                    }
                    setImmediate( next );
                }
            ], err => callback( err ) );
        }

        /**
         * Updates status of call audit log entry
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.callId
         * @param {Function} args.callback
         */
        function cancelConferenceCallAudit( args ) {
            Y.log('Entering Y.doccirrus.api.telecommunication.cancelConferenceCallAudit', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.telecommunication.cancelConferenceCallAudit');
            }
            const
                { user, data: { callId } = {}, callback } = args,
                async = require( 'async' );
            async.series( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'put',
                        query: {
                            callId
                        },
                        fields: [ 'status' ],
                        data: {
                            skipcheck_: true,
                            status: 'CANCELED'
                        }
                    }, next );
                },
                function( next ) {
                    Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                        user,
                        data: {
                            callId
                        },
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Class for all telecommunications api(inTouch)
         */
        /**
         * @class telecommunication
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).telecommunication = {
            /**
             * @property name
             * @type {String}
             * @default telecommunication-api
             * @protected
             */
            name: NAME,

            runOnStart: initIntouchService,

            getPresenceList: getPresenceList,
            initiateCall: initiateCall,
            updateTeleConsultData: updateTeleConsultData,
            updateCallLog: updateCallLog,
            setParticipantStatus: setParticipantStatus,
            rejectCall: rejectCall,
            inviteByEmail: inviteByEmail,
            cancelEmailInvitations,
            sendCancelEmail,
            inviteExternalParticipants,
            addParticipant: addParticipant,
            upsertCallAuditOnPUC,
            excludeParticipantsFromCallAudit,
            addParticipantsToCallAudit,
            updateCaller,
            cancelConferenceCallAudit
        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'dccommunication',
            'doccirrus',
            'dchttps',
            'dcauth',
            'location-schema'
        ]
    }
);
