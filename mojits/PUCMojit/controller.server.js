/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, require */

YUI.add( 'PUCMojit', function( Y, NAME ) {
        

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.mojito.controllers[NAME] = {

            /**
             * NO HTML ROUTES TO THE PUC FOR NOW.
             *
             * ALL clinical / medical routes via Patientalert and other mojits.
             * Here we fill the collections of the PUC with info from portal
             * admission / etc.
             */

            /**
             *
             * Adds a practice.
             *
             * Can only be called by VPRC. Called at Registration Confirmation time.
             * Need to document the Registration processes TODO MOJ-396
             *
             * @param {Object}          ac
             */
            'addpractice': function( ac ) {
                var
                    dbuser = Y.doccirrus.auth.getSUForPUC(),
                    params = ac.rest.originalparams,
                    cb = this._getCallback( ac );

                // currently we use a static secret
                if( Y.doccirrus.auth.getPUCSecret() !== params.secret ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 403, 'Action forbidden' );
                    return;
                }

                // check params are set
                if( !params.host || !params.customerIdPrac ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid parameters' );
                    return;
                }
                // check that customer is valid TODO -- MOJ-86
                // DCPRC.hasIntimeConnect( customer, callback);

                // generic error function
                function reportError( str ) {
                    Y.log( str, 'warn', NAME );
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'Server error' );
                }

                function checkCb( err ) {
                    if( err ) {
                        reportError( 'Failed to write metaprac: ' + err );
                    } else {
                        cb( null, {message: 'success'} );
                    }
                }

                function pracRegCb( err, result ) {
                    if( err ) {
                        reportError( err.toString() );
                    }
                    else {
                        if( Array.isArray( result ) ) {
                            result = result[0];
                        }
                        if( !result ) {
                            // post fresh data, but clean of XSS first
                            params = Y.doccirrus.filters.cleanDbObject( params );
                            Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                model: 'metaprac',
                                user: dbuser,
                                data: params,
                                options: {}
                            }, checkCb );
                        } else {
                            result.host = params.host;
                            //mongooselean.save_fix
                            Y.doccirrus.mongodb.runDb( {
                                user: dbuser,
                                model: 'metaprac',
                                action: 'put',
                                query: {
                                    _id: result._id
                                },
                                fields: Object.keys(result),
                                data: Y.doccirrus.filters.cleanDbObject(result)
                            } );

                            checkCb( null, result );
                        }
                    }
                }

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'metaprac',
                    user: dbuser,
                    query: {
                        customerIdPrac: params.customerIdPrac
                    },
                    options: {}
                }, pracRegCb );
            },

            /**
             * deleting records from metaprac and patientreg
             * @param {Object}          ac
             */
            'deletemetadata': function( ac ) {
                var
                    dbuser = ac.rest.user,
                    params = ac.rest.originalparams,
                    callback = this._getCallback( ac ),
                    myArgs = {contactIds: [], identityIds: []};

                // currently we use a static secret
                if( Y.doccirrus.auth.getPUCSecret() !== params.secret ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 403, 'Action forbidden' );
                    return;
                }

                // check params are set
                if( !params.host || !params.customerIdPrac ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid parameters' );
                    return;
                }
                // check that customer is valid TODO -- MOJ-86
                // DCPRC.hasIntimeConnect( customer, callback);

                // generic error function
                function reportError( str ) {
                    Y.log( str, 'warn', NAME );
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'Server error (PUC)' );
                }

                function finalCb( err ) {
                    if( err ) {
                        Y.log( 'there was an error in deleting tenant metadata in puc: customerIdPrac=' + params.customerIdPrac, 'error' );
                        reportError( err );
                    } else {
                        Y.log( "Deleting tenant metadata was successful. customerIdPrac = " + params.customerIdPrac );
                        callback( null, myArgs.contactIds );
                    }
                }

                function deleteAuths( err ) {
                    if( err || !myArgs.identityIds ) {
                        Y.log( 'error in deleteAuths: ' + err, 'error' );
                    }

                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        action: 'delete',
                        model: 'auth',
                        query: {'identityId': {$in: myArgs.identityIds}}
                    }, finalCb );
                }

                // populate IDs for contacts to be deleted from dcprc.contact and IDs for puc.identity
                function deleteIdentities( err ) {
                    if( err || !myArgs.identityIds ) {
                        Y.log( 'failed to delete patientreg records: customerIdPrac:' + params.customerIdPrac + err, 'error' );
                    }

                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        action: 'delete',
                        model: 'identity',
                        query: {'_id': {$in: myArgs.identityIds}}
                    }, deleteAuths );
                }

                // poplute some Ids requires in the nextx steps, then delete the patientregs
                function patientRegDelete( err, result ) {
                    if( err ) {
                        Y.log( 'failed to get patientreg records: customerIdPrac:' + params.customerIdPrac + err, 'error' );
                    }

                    if( !result || !result[0] ) {
                        Y.log( 'deletemetadata: No patientreg found for customerIdPrac = ' + params.customerIdPrac, 'info', NAME );
                        finalCb();
                        return;
                    }
                    var contactIds = [],
                        identityIds = [];

                    result.forEach( function( mreg ) {
                        contactIds.push( mreg.customerIdPat );
                        if( mreg.identityId ) { // undefined if patient didn't optin
                            identityIds.push( mreg.identityId );
                        }
                    } );

                    myArgs.contactIds = contactIds;
                    myArgs.identityIds = identityIds;

                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        action: 'delete',
                        model: 'patientreg',
                        query: {'customerIdPrac': params.customerIdPrac}
                    }, deleteIdentities );
                }

                function patientRegGet( err ) {
                    if( err ) {
                        Y.log( 'failed to get metaprac records: customerIdPrac:' + params.customerIdPrac + err, 'error' );
                    } else {
                        Y.log( "Deleted meta prac records, customerIdPrac = " + params.customerIdPrac );
                    }

                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        model: 'patientreg',
                        query: {'customerIdPrac': params.customerIdPrac}
                    }, patientRegDelete );
                }

                // delete from metaprac collection. customerIdPrac belongs to a company whose tenant data has just been deleted
                Y.doccirrus.mongodb.runDb( { user: dbuser,
                    action: 'delete',
                    model: 'metaprac',
                    query: {'customerIdPrac': params.customerIdPrac}
                }, patientRegGet );
            },
            /**
             * /r/messagepatient/?action=messagepatient
             *
             * POST data
             * [{
             *      messageId: string,   
             *      practiceId: string,         // always
             *      patientId: string,          // always
             *      practiceName: string,       // always
             *      content: 'abcd',           // custom message
             *      isRecall: true | false,    // auffordern
             *      channel: String (SMS,EMAIL)
             *      email: string,             // send via email (optional)
             *      phone: string,             // send via sms (optional)
             * }]
             *
             * Open with friend access!
             * Returns a receipt to the calling PRC.  Batch send actions are
             * logged against the receipt number and can be called up by the
             * PRC.
             test ex.
             [{"messageId":"001","practiceId":"1002","patientId":"1","practiceName":"Urologische Praxis Tropfhahn","content":{ "text": "TEST","from": "Doc Cirrus RegService <info@doc-cirrus.com>","to":"ad@doc-cirrus.com","subject":"test"},"channel":"EMAIL","email":"ad@doc-cirrus.com"},{"messageId":"002","practiceId":"1002","patientId":"1","practiceName":"Urologische Praxis Tropfhahn","content":"Wasser stop!","channel":"SMS","isRecall":true,"phone":"+491736136989"}]

             ex. email message
             "content": { "text": "TEST", "from": "Doc Cirrus RegService <info@doc-cirrus.com>", "to": "ad@doc-cirrus.com", "subject": "test" }
             *
             * FIXME MOJ-1117
             *
             * @param {Object}          ac
             */
            'messagepatient': function messagePatient( ac ) {
                var
                    user = ac.rest.user,
                    cb = this._getCallback( ac ),
                    params = ac.rest.originalparams,
                    messages = params.data;
                Y.doccirrus.api.message.messagePatient( {
                    user,
                    callback: cb,
                    data: { messages }
                } );
            },

            /**
             * receive the message intended for a target PRC, check the message meta data against transfer data in patientreg
             * if the message is valid then store it
             * later communication server will pick this message and send ot to its target
             * @param {Object}          ac
             */
            'messagepractice': function messagepractice( ac ) {
                var
                    user = ac.rest.user,
                    callback = this._getCallback( ac ),
                    params = ac.rest.originalparams,
                    message = params.data,
                    content,
                    crypto = require( 'crypto' ),
                    hash,
                    patientreg;

                Y.log( 'Received Transfer Message (not encrypted): ' + JSON.stringify( message ), 'debug', NAME );

                function reportError( msg, code ) {
                    var frontendMsg = (500 === code) ? 'server error' : 'invalid params';
                    Y.doccirrus.utils.reportErrorJSON( ac, code || 500, frontendMsg );
                    Y.log( 'messagepractice: ' + msg, 'error', NAME );
                }

                if( message && 'string' === typeof message ) {
                    message = JSON.parse( message );
                } else {
                    reportError( 'invalid message, exit here.', 400 );
                    return;
                }

                if( !message.content ) {
                    reportError( 'invalid message content, exit here.', 400 );
                    return;
                } else {
                    content = message.content;
                }

                if( !message.channel || !message.eTAN || !message.target || !message.patientId || !message.practiceId ) {
                    reportError( 'insufficient parameters in message content, transfer aborted', 400 );
                    return;
                }

                function allDone( err ) {
                    if( err ) {
                        reportError( err );
                    } else {
                        Y.log( 'messagepractice: message was persisted successfully, waiting for pick up and send...' );
                        Y.doccirrus.communication.sendMessages(); // trigger sending all NEW messages
                        // patientreg.transfer = ''; // delete transfer data
                        // patientreg.save( allDone ); //TODO do this only after the message is really sent .transfer needs to be an array?
                        callback( null, {status: 'persisted'} );
                    }
                }

                // store it if new. Leave it for cron job to pick and send to the target PRC
                function saveMessage( err, result ) {
                    if( err ) {
                        reportError( 'error in get message' );
                        return;
                    }
                    if( !result || !result[0] ) {
                        Y.log( 'the Transfer message is new, lets store it...', 'debug', NAME );
                        message.hash = hash;
                        message.content = JSON.stringify( content );
                        message = Y.doccirrus.filters.cleanDbObject( message );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'post',
                            model: 'message',
                            data: message,
                            callback: allDone
                        } );
                    } else {
                        result[0].state = 'NEW';
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'message',
                            action: 'put',
                            query: {
                                _id: result[0]._id
                            },
                            fields: Object.keys(result[0]),
                            data: Y.doccirrus.filters.cleanDbObject(result[0])
                        }, allDone);
                    }
                }

                // check if the message is not new, set patientId for the target PRC
                function prepareMessage( err, result ) {
                    if( err ) {
                        reportError( err );
                        return;
                    }
                    var targetPatientreg;
                    if( !result || !result[0] ) {
                        reportError( 'no target patientreg found for the target patient of this transfer message', 400 );
                        return;
                    } else {
                        targetPatientreg = result[0];
                    }

                    if( true !== targetPatientreg.accessPRC ) {
                        reportError( 'messagepractice: patient is not allowed to put data on target practice, accessPRC=' + targetPatientreg.accessPRC, 1401 );
                        return;
                    }

                    message.patientId = targetPatientreg.patientId; // the id of the patient in target PRC

                    // first query existing messages to avoid duplicating
                    var query = {'$or': [
                        { messageId: message.messageId },
                        { hash: hash }
                    ]};

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'message',
                        query: query,
                        options: {},
                        callback: saveMessage
                    } );
                }

                function getTargetPatientreg( err, result ) {
                    if( err ) {
                        reportError( err );
                        return;
                    }
                    var targetMetaprac;
                    if( !result || !result[0] ) {
                        reportError( 'the target practice of this message is not valid, no metaprac.', 400 );
                        return;
                    } else {
                        targetMetaprac = result[0];
                    }

                    message.target = Y.doccirrus.utils.appendUrl( targetMetaprac.host, '/r/importpatientdata/?action=importpatientdata' );

                    // get the target patientreg using target practice id and patient contactId on DCPRC
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        query: {customerIdPat: patientreg.customerIdPat, customerIdPrac: targetMetaprac.customerIdPrac},
                        callback: prepareMessage
                    } );

                }

                // check if the source of this message is valid
                function checkMessageValidity( err, result ) {
                    if( err ) {
                        reportError( err );
                        return;
                    }
                    if( !result || !result[0] ) {
                        reportError( 'the source practice of this message is not valid, no metaprac.', 400 );
                        return;
                    }

                    var
                        transfer;

                    if( patientreg.transfer ) {
                        transfer = patientreg.transfer;
                    } else {
                        reportError( 'invalid transfer message', 400 );
                        Y.log( 'there is no transfer request for this transfer message', 'error', NAME );
                        return;
                    }

                    if( transfer.source !== message.practiceId || transfer.target !== message.target ||
                        transfer.eTAN !== message.eTAN ) {
                        reportError( 'invalid transfer message', 400 );
                        Y.log( 'the transfer message is not associated with the registered transfer', 'error', NAME );
                        return;
                    }

                    try {
                        hash = crypto.createHash( 'md5' ).update( JSON.stringify( content ) ).digest( 'hex' );
                    } catch( e ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid Data: Could not calculate hash: ' + e );
                    }

                    // get the target practice
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'metaprac',
                        query: {customerIdPrac: message.target},
                        options: {},
                        callback: getTargetPatientreg
                    } );
                } //checkMessageValidity

                function getSourceMetaPrac( err, result ) {
                    if( err ) {
                        reportError( err );
                        return;
                    }
                    if( !result || !result[0] ) {
                        reportError( 'the source patient of this message is not valid, no patientreg.', 400 );
                        return;
                    } else {
                        patientreg = result[0];
                    }

                    // get the source practice
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'metaprac',
                        query: {customerIdPrac: message.practiceId},
                        options: {},
                        callback: checkMessageValidity
                    } );
                }//getSourceMetaPrac

                // get the patientreg for source patient
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientreg',
                    query: {patientId: message.patientId, customerIdPrac: message.practiceId},
                    callback: getSourceMetaPrac
                } );

            }, //messagepractice

            // FIXME MOJ-1117
            'checkmessagereceipt': function checkMessageReceipt( ac ) {
                var
                    user = ac.rest.user,
                    params = ac.rest.originalparams,
                    cb = this._getCallback( ac ),
                    messages = params.messages,
                    response = [],
                    Q = require( 'q' ),
                    query,
                    promises = [];

                if( messages && Array.isArray( messages ) ) {
                    messages.forEach( function iterate( message ) {
                        var
                            deferred = Q.defer();

                        promises.push( deferred.promise );
                        query = { messageId: message.messageId };
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'message',
                            query: query,
                            options: {},
                            callback: deferred.makeNodeResolver()
                        } );

                    } );

                    Q.allSettled( promises )
                        .then( function( results ) {
                            var i, message;
                            for( i = 0; i < messages.length; i++ ) {
                                if( 0 === results[i].value.length ) { //yeah, new message
                                    response.push( { type: 'INFO', messageId: message.messageId, state: message.state || 'NOT FOUND' } );
                                } else { //oops, already have this message
                                    message = results[i].value[0];
                                    response.push( { type: 'INFO', messageId: message.messageId, state: message.state || 'UNKNOWN' } );
                                }
                            }
                        } )
                        .done( function() {
                            cb( null, response );
                        } );
                } else {
                    response.push( { type: 'ERROR', text: 'Variable "messages" has to be an array of messages' } );
                    cb( null, response );
                }
            },

            changePWPatient: function( ac ) {
                var
                    cb = this._getCallback( ac ),
                    parms = ac.rest.originalparams;

                function reportMissing( it ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 409, it + ' must not be omitted' );
                }

                function error( code, cause ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, code, cause );
                }

                if( !parms.user ) {
                    reportMissing( 'user' );
                } else if( !parms.token ) {
                    reportMissing( 'token' );
                } else if( !parms.value ) {
                    reportMissing( 'value' );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        model: 'identity',
                        user: Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                        action: 'get',
                        query: {username: parms.user},
                        options: {},
                        callback: function( err, result ) {
                            if( err ) {
                                error( 500, err );
                            } else {
                                if( result && result.length ) {
                                    if( result[0].pwResetToken === parms.token ) {
                                        result[0].pw = Y.doccirrus.auth.getSaltyPassword( parms.value, null );
                                        result[0].pwResetToken = null;

                                        //mongooselean.save_fix
                                        Y.doccirrus.mongodb.runDb( {
                                            user: Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                                            model: 'identity',
                                            action: 'put',
                                            query: {
                                                _id: result[0]._id
                                            },
                                            fields: Object.keys(result[0]),
                                            data: Y.doccirrus.filters.cleanDbObject(result[0])
                                        } );

                                        cb( null, {status: 'ok'} );
                                    } else {
                                        error( 409, "token mismatch for " + parms.user );
                                    }
                                } else {
                                    error( 409, "missing record for " + parms.user );
                                }
                            }
                        }
                    } );
                }

                Y.log( 'changePWPatient called for: ' + parms.user, 'debug', NAME );
            }
        };
    },
    '0.0.1', {requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-config-addon',
        'mojito-params-addon',
        'mojito-intl-addon',
        'patientportal-api'
    ]}
)
;
