/**
 * User: do
 * Date: 02/03/15  17:54
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'partner-api', function( Y, NAME ) {

        const
            defaultConfiguration = {
                '_id': '000000000000000000000001',
                'automaticProcessing': false,
                'subTypes': [],
                'caseFolders': [ 'ALL' ],
                'actStatuses': [ 'APPROVED' ],
                'actTypes': [ 'ALL' ]
            },
            {formatPromiseResult} = require('dc-core').utils,
            _ = require( 'lodash' );

        /**
         * delete the invitation entry on PUC
         * @param {String}              pin
         * @param {String}              dcCustomerNo
         * @param {Function}            callback
         */
        function deleteInvitation( pin, dcCustomerNo, callback ) {
            Y.doccirrus.https.externalPost(
                Y.doccirrus.auth.getPUCUrl( '/1/partnerreg/:removeInvitation' ), // to PUC
                { pin: pin, dcCustomerNo: dcCustomerNo },
                Y.doccirrus.auth.setInternalAccessOptions(),
                function( err, res, body ) {
                    var
                        errors = (body && body.meta && body.meta.errors) || [];

                    if( err || errors.length || !body ) {
                        Y.log( 'error from removeInvitation: ' + JSON.stringify( err || errors || 'empty body from PUC' ), 'error', NAME );
                        return callback( err || Y.doccirrus.errors.rest( 7301, 'error from PUC' ) );
                    }
                    callback();
                }
            );

        }

        /**
         * @method batchDelete
         * @public
         *
         * delete one or more partners, and also cleanup invitations if needed
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.ids        list of partners id
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        function batchDelete( args ) {
            Y.log('Entering Y.doccirrus.api.partner.batchDelete', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.batchDelete');
            }

            const { user, originalParams: params, callback } = args;
            let err,
                dcCustomerNo;

            function remove( partner, cb ) {
                Y.log( 'delete partner: ' + partner._id );
                //mongooselean.remove
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'delete',
                    model: 'partner',
                    query: {
                        _id: partner._id
                    }
                }, function( err, deletedDocuments) {
                    cb(err, Array.isArray(deletedDocuments)?deletedDocuments[0]:deletedDocuments);
                } );
            }

            function eachPartner( id, cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'get',
                    query: { _id: id }

                }, function( err, result ) {
                    if( err || !result || !result[ 0 ] ) {
                        return cb( err );
                    }
                    if( result && result[ 0 ] && result[ 0 ].status === 'LICENSED' ){
                        Y.log( `removing partner ${result[ 0 ].dcId} skipped because LICENSED`, 'info', NAME );
                        return cb( null );
                    }

                    if( result[ 0 ].pin ) { // if an invited partner
                        deleteInvitation( result[ 0 ].pin, dcCustomerNo, function( err1 ) {
                            if( err1 && 7301 !== err1.code ) { // if any error other than invalid pin
                                return cb( err1 );
                            }
                            remove( result[ 0 ], cb );
                        } );
                    } else {
                        remove( result[ 0 ], cb );
                    }
                } );
            }

            if( !Array.isArray( params.ids ) ) {
                err = 'Missing Parameter \'ids\'';
                Y.log( err, 'debug', NAME );
                return callback( Y.doccirrus.errors.http( 500, err ) );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'practice',
                options: { limit: 1 },
                callback: function( err, result ) {
                    if( err || !result || !result[ 0 ] ) {
                        return callback( err || 'faulty data' );
                    }
                    dcCustomerNo = result[ 0 ].dcCustomerNo;
                    require( 'async' ).each( params.ids, eachPartner, callback );
                }
            } );
        }

        /**
         * register a partnership invitation on PUC and send an email to the invitee
         * create a dummy partner entry, which will be updated once the invitation is accepted
         * @param {Object}          args
         */
        function sendInvitation( args ) {
            Y.log('Entering Y.doccirrus.api.partner.sendInvitation', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.sendInvitation');
            }
            var
                user = args.user,
                callback = args.callback,
                data = args.data,
                pin = Y.doccirrus.authpub.getPin( 8 ),
                bidirectional = data.bidirectional || false,
                async = require( 'async' ), employee;

            if( !data.email || !data.content || !data.dcId ) {
                callback( Y.doccirrus.errors.http( 409, 'insufficient params' ) );
                return;
            }

            function sendEmail( result ) {
                var
                    inviteText = data.content,
                    messageParams,
                    message, subject, fullName;

                fullName = employee.firstname + ' ' + employee.lastname;
                subject = 'Einladung von ' + fullName;
                inviteText = inviteText.replace( '<PIN>', '</br>' + pin + '</br>' );
                messageParams = {
                    serviceName: 'conferenceService',
                    to: data.email,
                    template: {
                        locationName: args.user.coname
                    },
                    jadePath: './mojits/UserMgmtMojit/views/partner_invitation_email.pug',
                    subject: subject,
                    attachments: [],
                    jadeParams: {
                        invitationText: inviteText
                    }
                };

                message = Y.doccirrus.email.createHtmlEmailMessage( messageParams );
                Y.doccirrus.email.sendEmail( { ...message, user }, function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, result );
                } );
            }

            // add a placeholder entry
            // once the other party accepts the invitation, the entry be updated with real data
            function addEmptyPartner() {
                var
                    dummyPartner = Y.mix( {
                        pin: pin,
                        publicKey: null,
                        fingerprint: '?',
                        status: 'INVITED'
                    }, data );

                dummyPartner = Y.doccirrus.filters.cleanDbObject( dummyPartner );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'post',
                    data: dummyPartner,
                    callback: function( err, result ) {
                        if( err ) {
                            return callback( err.message || err );
                        }
                        sendEmail( result );
                        callback( null, result );
                    }
                } );
            }

            function fromPUC( err, res, body ) {
                var
                    errors = (body && body.meta && body.meta.errors) || [];
                if( err || errors.length || !body ) {
                    Y.log( 'error from noteInvitation: ' + JSON.stringify( err || errors || 'empty body from PUC' ), 'error', NAME );
                    return callback( err || errors || 'no response from PUC' );
                }
                addEmptyPartner();
            }

            function toPUC( dcCustomerNo ) {
                Y.doccirrus.https.externalPost(
                    Y.doccirrus.auth.getPUCUrl( '/1/partnerreg/:noteInvitation' ), // to PUC
                    {
                        pin: pin,
                        dcCustomerNo: dcCustomerNo,
                        configuration: data.configuration || [],
                        anonymizing: data.anonymizing,
                        anonymizeKeepFields: data.anonymizeKeepFields,
                        pseudonym: data.pseudonym,
                        unlock: data.unlock,
                        preserveCaseFolder: data.preserveCaseFolder,
                        bidirectional: bidirectional
                    },
                    Y.doccirrus.auth.setInternalAccessOptions(),
                    fromPUC
                );
            }

            async.parallel( {
                    keyData: function( cb ) {
                        Y.doccirrus.auth.getKeyPair( user, cb );
                    },
                    practice: function( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'practice',
                            options: { limit: 1 },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                    return cb( err || new Y.doccirrus.commonerrors.DCError( 400, { message: 'Practice not found' } ) );
                                }
                                cb( null, result[ 0 ] );
                            }
                        } );

                    },
                    employee: function( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            query: { _id: user.specifiedBy, status: { $ne: "INACTIVE" } },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                    return cb( err || new Y.doccirrus.commonerrors.DCError( 400, { message: 'Employee not found' } ) );
                                }
                                cb( null, result[ 0 ] );
                            }
                        } );
                    }
                },
                function( err, results ) {
                    if( err || !results.keyData ) {
                        callback( err || 'no key pair' );
                        return;
                    }
                    employee = results.employee;
                    toPUC( results.practice.dcCustomerNo );
                } );
        }

        function checkPartner( user, partnerInfo, callback ) {
            let
                async = require( 'async' );
            async.parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'practice',
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( !result[ 0 ] ) {
                            // practice collection is empty, skip this check
                            return done();
                        }
                        if( result[ 0 ].dcCustomerNo === partnerInfo.dcId ) {
                            return done( Y.doccirrus.errors.rest( 7305, '', true ) );
                        }
                        done();
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'count',
                        model: 'partner',
                        query: {
                            dcId: partnerInfo.dcId,
                            status: 'CONFIRMED'
                        }
                    }, function( err, result ) {
                        if( err ) {
                            return done( err );
                        }
                        if( result ) {
                            return done( Y.doccirrus.errors.rest( 7306, '', true ) );
                        }
                        done();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    callback( err );
                    return;
                }
                callback( err, partnerInfo );
            } );
        }

        /**
         * get the details of the partner who invited us for partnership
         * @param {Object}          args
         */
        function getPartnerDetails( args ) {
            Y.log('Entering Y.doccirrus.api.partner.getPartnerDetails', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.getPartnerDetails');
            }
            var
                params = args.data,
                user = args.user,
                callback = args.callback;

            if( !params.pin ) {
                callback( Y.doccirrus.errors.rest( 400, 'insufficient params' ) );
                return;
            }

            function returnData( err, result ) {
                var
                    data = result,
                    partnerInfo = {};

                if( err || !data ) {
                    Y.log( 'error in getting practice info from PUC: ' + JSON.stringify( err || ('could not get practice details: ' + JSON.stringify( data )) ), 'error', NAME );
                    return callback( err || Y.doccirrus.errors.rest( 7301, 'invalid pin', true ) );

                }
                if( !data.publicKey || !data.communications ) {
                    return callback( Y.doccirrus.errors.rest( 1001, 'faulty partner data' ) );

                }
                partnerInfo.name = data.coname;
                partnerInfo.dcId = data.dcCustomerNo;
                partnerInfo.phone = Y.doccirrus.schemas.simpleperson.getPhone( data.communications );
                partnerInfo.phone = partnerInfo.phone && partnerInfo.phone.value;
                partnerInfo.email = Y.doccirrus.schemas.simpleperson.getEmail( data.communications );
                partnerInfo.email = partnerInfo.email && partnerInfo.email.value;
                partnerInfo.city = Array.isArray(data.addresses) && data.addresses[0] ? data.addresses[0].city : '';
                partnerInfo.publicKey = data.publicKey;
                partnerInfo.fingerprint = Y.doccirrus.authpub.generateHash( data.publicKey );
                partnerInfo.bidirectional = data.bidirectional;
                partnerInfo.configuration = data.configuration;
                partnerInfo.anonymizing = data.anonymizing;
                partnerInfo.anonymizeKeepFields = data.anonymizeKeepFields;
                partnerInfo.pseudonym = data.pseudonym;
                partnerInfo.unlock = data.unlock;
                partnerInfo.preserveCaseFolder = data.preserveCaseFolder;

                if( data.configuration && data.configuration.length ){
                    partnerInfo.configuration = data.configuration;
                } else {
                    //set default
                    partnerInfo.configuration = [ defaultConfiguration ];
                }

                checkPartner( user, partnerInfo, callback );
            }

            Y.doccirrus.communication.callPUCAction( {
                action: 'getPracInfoByPIN',
                params: { pin: params.pin }
            }, function( err, result ) {
                returnData( err, result );
            } );
        }

        function importPartnerData( args ) {
            Y.log('Entering Y.doccirrus.api.partner.importPartnerData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.importPartnerData');
            }
            var
                user = args.user,
                callback = args.callback,
                message = args.data,
                encryptedStr = Y.doccirrus.communication.getMessageContent( message );

            if( !message.publicKey ) {
                Y.log( 'message arrived missing publicKey of sender', 'error', NAME );
                callback( 'no public key' );
                return;
            }

            function postPartnerB( partnerB ) {
                Y.log( 'postPartnerB: ' + JSON.stringify( partnerB ), 'debug', NAME );

                if( !partnerB || !partnerB.pin ) {
                    callback( 'insufficient data' );
                    return;
                }

                partnerB = Y.doccirrus.filters.cleanDbObject( partnerB );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'put',
                    query: { pin: partnerB.pin },
                    data: partnerB,
                    fields: Object.keys( partnerB ),
                    callback: function( err ) {
                        if( err ) {
                           return callback( err.message || err );
                        }
                        callback( null );
                    }
                } );
            }

            function decryptMessage( mySecret ) {
                var
                    key,
                    partnerBData;
                try {
                    key = Y.doccirrus.authpub.getSharedSecret( mySecret, message.publicKey );
                    partnerBData = Y.doccirrus.authpub.decPRCMsg( key, encryptedStr );
                    if( 'string' === typeof partnerBData ) {
                        partnerBData = JSON.parse( partnerBData );
                    }
                    postPartnerB( partnerBData );

                } catch( e ) {
                    Y.log( 'error in decryption: ' + JSON.stringify( e.message || e ), 'error', NAME );
                    callback( e );
                    return;
                }
            }

            Y.doccirrus.auth.getKeyPair( user, function( err, myKP ) {
                if( err || !myKP ) {
                    return callback( err || 'no key pair' );
                }
                decryptMessage( myKP.privateKey );
            } );
        }

        /**
         * here this party received an invitation and is trying to use the pin and add the other party as a partner
         * user already has approved the authenticity of the public key of the other partner
         * we use the trusted publicKey of partnerA to encrypt the message to them
         *
         * 1- invalidate the invitation (so that the pin will not be usable anymore)
         * 2- send local practice data to the other party as an encrypted message (which contains the publicKey of this partner)
         * 3- post the data of the other partner (i.e partnerA)
         *
         * @param {Object}          args contains all partner data of the other party
         */
        function addPartner( args ) {
            var
                user = args.user,
                partnerAData = args.data,
                callback = args.callback,
                async = require( 'async' );

            if( !partnerAData.pin || !partnerAData.fingerprint ) {
                callback( Y.doccirrus.errors.http( 400, 'insufficient params' ) );
                return;
            }

            // this should be the last step
            function postPartnerA() {
                Y.log( 'postPartnerA: ' + JSON.stringify( partnerAData ), 'debug', NAME );
                partnerAData = Y.doccirrus.filters.cleanDbObject( partnerAData );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'post',
                    data: partnerAData,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'error posting partner: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        callback( null, result );
                    }
                } );
            }

            // transfer data of this PRC to the partner
            function sendToPartnerA( pracB, myKP ) {
                var
                    targetURL = '/1/partner/:importPartnerData',
                    partnerCity = Array.isArray(pracB.addresses) && pracB.addresses[0] ? pracB.addresses[0].city : '',
                    partnerBData = {
                        name: pracB.coname,
                        dcId: pracB.dcCustomerNo,
                        phone: Y.doccirrus.schemas.simpleperson.getPhone( pracB.communications ),
                        city: partnerCity,
                        pin: partnerAData.pin,
                        publicKey: myKP.publicKey,
                        fingerprint: Y.doccirrus.authpub.generateHash( myKP.publicKey ),
                        status: 'CONFIRMED'
                    },
                    key, encryptedStr;

                partnerBData.phone = partnerBData.phone && partnerBData.phone.value;

                try {
                    key = Y.doccirrus.authpub.getSharedSecret( myKP.privateKey, partnerAData.publicKey );
                    encryptedStr = Y.doccirrus.authpub.encPRCMsg( key, JSON.stringify( partnerBData ) );
                } catch( e ) {
                    Y.log( 'error in encryption: ' + JSON.stringify( e.message || e ), 'error', NAME );
                    callback( e );
                    return;
                }

                Y.doccirrus.communication.messageToPRC( user, {
                        data: encryptedStr,
                        targetUrl: targetURL,
                        targetId: partnerAData.dcId
                    },
                    function( err ) {
                        if( err ) {
                            Y.log( 'error in sending partner data: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        partnerAData.status = 'CONFIRMED';
                        postPartnerA();
                    } );

            }

            function getPartnerBData() {
                async.parallel( {
                    myPractice: function( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'practice',
                            options: { limit: 1 },
                            callback: function( err, result ) {
                                if( err || !result || !result[ 0 ] ) {
                                    return callback( err || 'faulty data (1)' );
                                }
                                cb( null, result[ 0 ] );
                            }
                        } );
                    },
                    myKP: function( cb ) {
                        Y.doccirrus.auth.getKeyPair( user,
                            function( err, data ) {
                                if( err || !data ) {
                                    Y.log( 'error in getting key pair: ' + JSON.stringify( err || 'no key pair defined' ) );
                                    return cb( err );
                                }
                                cb( null, data );
                            }
                        );
                    }
                }, function( err, myData ) {
                    if( err || !myData.myPractice || !myData.myKP ) {
                        return callback( err || 'insufficient data' );

                    }
                    if( partnerAData.dcId === myData.myPractice.dcCustomerNo ) { // cannot add myself as partner!
                        callback( Y.doccirrus.errors.http( 400, 'invalid request' ) );
                        return;
                    }

                    // invalidate the pin first
                    deleteInvitation( partnerAData.pin, partnerAData.dcId, function( err ) {
                        if( err ) {
                            Y.log( 'error in deleting invitation: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                            sendToPartnerA( myData.myPractice, myData.myKP );
                    } );
                } );
            }

            getPartnerBData(); // this PRC
        }

        /**
         *
         * @param {Array} custNoList
         * @param {Function} callback
         */
        function getPartnerPUCData( custNoList, callback ) {
            Y.doccirrus.https.externalPost(
                Y.doccirrus.auth.getPUCUrl( '/1/metaprac/:getPublicData' ),
                { dcCustomerNo: custNoList },
                Y.doccirrus.auth.setInternalAccessOptions(),
                function( err, res, body ) {
                    var
                        errors = (body.meta && body.meta.errors) || [],
                        result = body && body.data;
                    if( err || errors.length ) {
                        Y.log( 'error in getting partner data from PUC: ' + JSON.stringify( err || errors ), 'error', NAME );
                        return callback( err || errors );
                    }
                    callback( null, result );
                }
            );
        }

        /**
         * check if any partner has changed their keys
         * if so then:
         * * set their status to unconfirmed
         * * update them with their new public key
         *@param {Object}           args
         * @param {Array}           partners
         * @param {Function}       args.callback
         */
        function updatePartnerStatus( args ) {
            Y.log('Entering Y.doccirrus.api.partner.updatePartnerStatus', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.updatePartnerStatus');
            }
            var
                params = args.data,
                partners = params.partners,
                user = args.user,
                callback = args.callback,
                noList = [],
                async = require( 'async' );

            function updateIt( partnerId, newPublicKey, cb ) {
                var
                    myData = {
                        skipcheck_: true,
                        status: 'UNCONFIRMED',
                        publicKey: newPublicKey,
                        fingerprint: Y.doccirrus.authpub.generateHash( newPublicKey )
                    };

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'put',
                    query: { _id: partnerId },
                    fields: [ 'status', 'publicKey', 'fingerprint' ],
                    data: myData,
                    callback: function( err, result ) {
                        if( err ) {
                           return cb( err );
                        }
                        cb( null, result );
                    }
                } );
            }

            partners.forEach( function( p ) {
                noList.push( p.dcId );
            } );

            getPartnerPUCData( noList, function( err, result ) {
                if( err ) {
                    callback( err );
                    return;
                }
                async.concat( partners, function( p, cb ) {
                        var
                            pucData = Y.Array.find( result, function( item ) {
                                return item.dcCustomerNo === p.dcId;
                            } );
                        if( pucData && (pucData.publicKey !== p.publicKey) ) {
                            updateIt( p._id, pucData.publicKey, cb );
                        } else {
                           return cb();
                        }
                    },
                    function( err, finalResult ) {
                        if( err ) {
                            Y.log( 'error in updating partner status: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        callback( null, finalResult );
                    } );
            } );
        }

        /**
         * Return CONFIRMED partner by dcCustomerNo
         * @method getPartner
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.dcCustomerNo
         * @param {Function} args.callback
         *
         * @return {Function}           callback
         */
        function getPartner( args ) {
            Y.log('Entering Y.doccirrus.api.partner.getPartner', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.getPartner');
            }
            let
                { user, data: { dcCustomerNo } = {}, callback } = args;
            if( !dcCustomerNo ) {
                Y.log( 'getPartner. dcCustomerNo is missing', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'partner',
                action: 'get',
                query: {
                    dcId: dcCustomerNo,
                    status: 'CONFIRMED'
                },
                options: {
                    lean: true,
                    limit: 1
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results.length ) {
                    Y.log( `getPartner. Partner not found. Partner dcCustomerNo:${dcCustomerNo}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Partner not found.' } ) );
                }
                callback( null, results[ 0 ] );
            } );
        }

        /**
         * Return Partners that are configured to transfer particular set of activities
         * @method getPartner
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.activityIds
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getForManualTransfer( args ) {
            Y.log('Entering Y.doccirrus.api.partner.getForManualTransfer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.partner.getForManualTransfer');
            }
            const async = require( 'async' );
            let
                { user, originalParams: { activityIds } = {}, callback } = args,
                filterQuery = args.originalParams && args.originalParams.query || {};

            if( !activityIds ) {
                Y.log( 'getForManualTransfer activityIds is missing', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }

            let activities, casefolders, patient;

            async.waterfall([
                (next) => {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: {$in: activityIds}
                        },
                        options: {
                            lean: true,
                            select: {caseFolderId: 1, status: 1, actType: 1, subType: 1, patientId: 1}
                        }
                    }, next );
                },
                (act, next) => {
                    activities = act;
                    if(!act.length){
                        return next(null, []);
                    }

                    let patientId = activities.map( el => el.patientId)[0];
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: patientId
                        },
                        options: {
                            lean: true
                        }
                    }, next );
                },
                (pat, next) => {
                    patient = pat[0];
                    if(!pat){
                        return next(null, []);
                    }

                    let casefolderIds = activities.map( el => el.caseFolderId );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'get',
                        query: {
                            _id: {$in: casefolderIds}
                        },
                        options: {
                            lean: true,
                            select: {type: 1, additionalType: 1}
                        }
                    }, next );
                },
                (csf, next) => {
                    casefolders = csf;
                    if(!csf.length){
                        return next(next, []);
                    }

                    let
                        isAmts = Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO )
                               || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC )
                               || Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI ),
                        casefoldersTypes = casefolders.map( el => el.type ).filter( el => el ),
                        casefolderAdditionalTypes = casefolders.map( el => el.additionalType ).filter( el => el ),
                        subTypes = activities.map( el => el.subType ).filter( el => el ).map( el => el.trim() ),
                        query = Object.assign(filterQuery, {
                            bidirectional: true,
                            activeActive: {$ne: true},
                            status: {$in: ['CONFIRMED', 'LICENSED']},
                            configuration: {$elemMatch: {
                                $and:[
                                    { automaticProcessing: false },
                                    { $or: [
                                        { actTypes: 'ALL' },
                                        { actTypes: {$all: activities.map( el => el.actType ) } }
                                    ] },
                                    { "$or": [
                                        { actStatuses: 'ALL' },
                                        { actStatuses: {$all: activities.map( el => el.status ) } }
                                    ] },
                                    { "$or": [
                                        { caseFolders: 'ALL' },
                                        { caseFolders: {$in: [ ...casefoldersTypes, ...casefolderAdditionalTypes] } }
                                    ] }
                                ]
                            }
                        }} );

                    if(subTypes.length){
                        query.configuration.$elemMatch.$and.push({ $or: [
                            { subTypes: {$in: subTypes } },
                            { subTypes: {$exists: false} },
                            { subTypes: { $size: 0 } }
                        ] } );
                    } else {
                        query.configuration.$elemMatch.$and.push( { $or: [
                            { subTypes: {$exists: false} },
                            { subTypes: { $size: 0 } }
                        ] } );
                    }

                    /**
                     * for systems where AMTS activated allow to send activities
                     * to partners that selected condition only for patients with matching condition
                     */
                    if( isAmts ) {
                        let
                            conditionQuery = Y.doccirrus.schemas.partner.getPartnerQueryForAmts( patient );

                        Array.prototype.push.apply(query.configuration.$elemMatch.$and, conditionQuery);
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'partner',
                        action: 'get',
                        query: query,
                        options: {
                            lean: true
                        }
                    }, next );
                }
            ], (err, result) => {

                if(err){
                    Y.log('Error on getting parters for manual transfer ' + err.message, 'error', NAME );
                }
                callback( null, result );
            });



            /*
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'partner',
                action: 'get',
                query: {
                    dcId: dcCustomerNo,
                    status: 'CONFIRMED'
                },
                options: {
                    lean: true,
                    limit: 1
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results.length ) {
                    Y.log( `getPartner. Partner not found. Partner dcCustomerNo:${dcCustomerNo}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Partner not found.' } ) );
                }
                callback( null, results[ 0 ] );
            } );
            */
        }

        /**
         * @method checkAndAddLicensedPartner
         * @public
         *
         * insert/updated predefined license partner configuration
         *
         * @param {Object} user
         * @param {String} systemType        - licensed system type INCARE | DOQUVIDE | DQS
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        async function checkAndAddLicensedPartner( user, systemType, callback ) {
            user = user || Y.doccirrus.auth.getSUForLocal();
            callback = callback || (() => {});

            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                INCARE = Y.doccirrus.schemas.company.systemTypes.INCARE,
                INSPECTOR_LEARNING_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_LEARNING_SYSTEM,
                INSPECTOR_EXPERT_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_EXPERT_SYSTEM,
                INSPECTOR_SELECTIVECARE_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM,
                DSCK = Y.doccirrus.schemas.company.systemTypes.DSCK,
                DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                INCARECase = Y.doccirrus.schemas.casefolder.additionalTypes.INCARE,
                DOQUVIDECase = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                DQSCase = Y.doccirrus.schemas.casefolder.additionalTypes.DQS;

            let
                licensedConfiguration = {
                    INCARE: {
                        'status': 'LICENSED',
                        'name': INCARE,
                        'dcId': INCARE,
                        'partnerType': "OTHER",
                        'comment': INCARE,
                        'systemType': INCARE,
                        'anonymizing': false,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'pseudonym': [ {pseudonymType: 'careData', pseudonymIdentifier: 'CareID'} ],
                        'unlock': false,
                        'configuration' : [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [],
                                'caseFolders': [ INCARECase ],
                                'actStatuses': [ 'ALL' ],
                                'actTypes': [ 'ALL' ]
                            }
                        ]
                    },
                    INSPECTOR_LEARNING_SYSTEM: {
                        'status': 'LICENSED',
                        'name': INSPECTOR_LEARNING_SYSTEM,
                        'dcId': INSPECTOR_LEARNING_SYSTEM,
                        'partnerType': "OTHER",
                        'comment': INSPECTOR_LEARNING_SYSTEM,
                        'systemType': INSPECTOR_LEARNING_SYSTEM,
                        'anonymizing': true,
                        'noTransferOfLinkedActivities': true,
                        'preserveCaseFolder': true,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'unlock': false,
                        'configuration' : [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'condition': Y.doccirrus.schemas.partner.conditionsType.AmtsApprovalForDataEvaluation,
                                'subTypes': [],
                                'caseFolders': [ 'ALL' ],
                                'actStatuses': [ 'APPROVED' ],
                                'actTypes': [ 'AMTSSCHEIN' ]
                            }
                        ]
                    },
                    INSPECTOR_EXPERT_SYSTEM: {
                        'status': 'LICENSED',
                        'name': INSPECTOR_EXPERT_SYSTEM,
                        'dcId': INSPECTOR_EXPERT_SYSTEM,
                        'partnerType': "OTHER",
                        'comment': INSPECTOR_EXPERT_SYSTEM,
                        'systemType': INSPECTOR_EXPERT_SYSTEM,
                        'anonymizing': true,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'unlock': false,
                        'preserveCaseFolder': true,
                        'configuration' : [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [ 'Expertenanfrage' ],
                                'caseFolders': [ 'ALL' ],
                                'actStatuses': [ 'APPROVED' ],
                                'actTypes': [ 'COMMUNICATION' ]
                            }
                        ]
                    },
                    INSPECTOR_SELECTIVECARE_SYSTEM: {
                        'status': 'LICENSED',
                        'name': INSPECTOR_SELECTIVECARE_SYSTEM,
                        'dcId': INSPECTOR_SELECTIVECARE_SYSTEM,
                        'partnerType': "OTHER",
                        'comment': INSPECTOR_SELECTIVECARE_SYSTEM,
                        'systemType': INSPECTOR_SELECTIVECARE_SYSTEM,
                        'anonymizing': false,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'unlock': false,
                        'preserveCaseFolder': true,
                        'configuration' : [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [],
                                'caseFolders': [ 'AMTS' ],
                                'actStatuses': [ 'APPROVED' ],
                                'actTypes': [ 'TREATMENT' ]
                            },
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [ 'Einschreibung' ],
                                'caseFolders': [ 'AMTS' ],
                                'actStatuses': [ 'APPROVED' ],
                                'actTypes': [ 'PROCESS' ]
                            },
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [ 'Vertragsende' ],
                                'caseFolders': [ 'AMTS' ],
                                'actStatuses': [ 'APPROVED' ],
                                'actTypes': [ 'PROCESS' ]
                            }
                        ]
                    },
                    DOQUVIDE: {
                        'status': 'LICENSED',
                        'name': 'DOQUVIDE',
                        'dcId': 'DOQUVIDE',
                        'partnerType': "OTHER",
                        'comment': 'DOQUVIDE',
                        'systemType': DSCK,
                        'anonymizing': true,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'pseudonym': [ {pseudonymType: 'careData', pseudonymIdentifier: 'DoquvideID'} ],
                        'unlock': false,
                        'configuration': [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [DSCK],
                                'caseFolders': [DOQUVIDECase],
                                'actStatuses': ['ALL'],
                                'actTypes': ['FORM']
                            }
                        ]
                    },
                    DQS: {
                        'status': 'LICENSED',
                        'name': 'DQS',
                        'dcId': 'DQS',
                        'partnerType': "OTHER",
                        'comment': 'DQS',
                        'systemType': DSCK,
                        'anonymizing': true,
                        'bidirectional': true,
                        'anonymizeKeepFields': [],
                        'pseudonym': [ {pseudonymType: 'careData', pseudonymIdentifier: 'DqsID'} ],
                        'unlock': false,
                        'configuration': [
                            {
                                '_id': new ObjectId(),
                                'automaticProcessing': true,
                                'subTypes': [DSCK],
                                'caseFolders': [DQSCase],
                                'actStatuses': ['ALL'],
                                'actTypes': ['FORM']
                            }
                        ]
                    }
            };

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    query: {
                        'status': 'LICENSED',
                        'dcId': systemType
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } )
            );

            if( err ) {
                Y.log( `checkAndAddLicensedPartner: DB Error finding partner ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let insertCommand = true,
                commandObject = {
                    user,
                    migrate: true,
                    model: 'partner',
                    action: 'mongoInsertOne',
                    data: licensedConfiguration[systemType]
                };

            if( result && result.length > 0 ) {
                // already have the partner
                if( ![DOQUVIDE, DQS, INSPECTOR_LEARNING_SYSTEM, INSPECTOR_EXPERT_SYSTEM, INSPECTOR_SELECTIVECARE_SYSTEM].includes( systemType ) ) {
                    return callback();
                }
                //need update already inserted licensed partners:
                insertCommand = false;
                if ( [DOQUVIDE, DQS].includes( systemType ) ) {
                    // add subtype to DOQUVIDE and DQS licensed partners if empty
                    commandObject = {
                        ...commandObject,
                        action: 'update',
                        query: {
                            _id: result[0]._id,
                            'configuration.subTypes': {$size: 0}
                        }
                    };
                }
                if ( [INSPECTOR_LEARNING_SYSTEM, INSPECTOR_EXPERT_SYSTEM, INSPECTOR_SELECTIVECARE_SYSTEM].includes( systemType ) ) {
                    commandObject = {
                        ...commandObject,
                        action: 'update',
                        query: {
                            _id: result[0]._id
                        }
                    };
                }
            }

            // if no license configuration is available, just echo an info message (no hard error)
            if( !licensedConfiguration[systemType] ) {
                Y.log( `checkAndAddLicensedPartner: skipped ${insertCommand ? 'adding' : 'updating'} ${systemType} licensed partner: no license configuration available`, 'info', NAME );
                return callback();
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( commandObject ) );
            if( err ) {
                Y.log( `checkAndAddLicensedPartner: failed ${insertCommand ? 'add' : 'update'} ${systemType} licensed partner ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `checkAndAddLicensedPartner: successfully ${insertCommand ? 'added' : 'updated'} ${systemType} licensed partner`, 'info', NAME );
            callback( null, result );
        }

        /**
         * @method removeConfigurationForLicensedPartner
         * @public
         *
         * Remove 'LICENSED' partner configuration
         *
         * @param {Object} user
         * @param {String} partnerDcId        - partner dcId
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        async function removeConfigurationForLicensedPartner( user, partnerDcId, callback ) {
            user = user || Y.doccirrus.auth.getSUForLocal();
            callback = callback || (() => {});

            let [err, partners] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'get',
                    query: {
                        dcId: partnerDcId,
                        status: 'LICENSED'
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } )
            );

            if( err ) {
                Y.log( `removeConfigurationForLicensedPartner: DB Error finding partner with dcId ${partnerDcId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( !partners || !partners.length || partners.length !== 1) {
                Y.log( `removeConfigurationForLicensedPartner: error on getting partner by dcId ${partnerDcId}: ${!partners || !partners.length ? 'no partner with such dcId' : 'found more than one partner with such dcId'}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: !partners || !partners.length ? 'No partner with such dcId' : 'More than one partner with such dcId' } ) );
            }
            partners[0].configuration = [];

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'update',
                model: 'partner',
                data: partners[0],
                query: {
                    _id: partners[0]._id
                }
            } ) );
            if( err ) {
                Y.log( `removeConfigurationForLicensedPartner:DB Error updating partner: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `removeConfigurationForLicensedPartner: successfully cleaned up configuration for licensed partner ${partnerDcId}`, 'info', NAME );
            callback( null, true );
        }

        /**
         * @method getPseudonym
         * @public
         *
         * get list of identifiers to select Pseudonym from
         *
         * @param {Object}  args
         * @param {Object} args.user
         * @param {Function} args.callback
         *
         * @returns {Array}[{
         *              pseudonymType,       - type of pseudonym patient id, care data, extra data
         *              pseudonymIdentifier  - value of pseudonym field of patient
         *          }]
         */
        async function getPseudonym( args ){
            Y.log('Entering Y.doccirrus.api.patient.getPseudonym', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patient.getPseudonym');
            }
            const {user, callback} = args;
            let pseudonymList = [ {pseudonymType: 'patientData', pseudonymIdentifier: 'PatientID'} ];
            if( Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.CARE ) ){
                pseudonymList = [ ...pseudonymList, {pseudonymType: 'careData', pseudonymIdentifier: 'CareID'} ];
            }
            if( Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ){
                pseudonymList = [ ...pseudonymList, {pseudonymType: 'careData', pseudonymIdentifier: 'DoquvideID'} ];
            }
            if( Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) ){
                pseudonymList = [ ...pseudonymList, {pseudonymType: 'careData', pseudonymIdentifier: 'DqsID'} ];
            }

            let [err, otherIndentificators] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'patient',
                    action: 'get',
                    query: {'partnerIds.extra': {$exists: true}},
                    options: { select: {partnerIds: 1}}
                } )
            );
            if( err ){
                Y.log( `getPseudonym: Error on getting extra partners: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            otherIndentificators = _.chain( otherIndentificators || [] )
                .map( el => el.partnerIds )
                .flatten()
                .filter( el => el.extra )
                .uniq( el => el.extra )
                .sortBy( 'extra' )
                .map( el => ({pseudonymType: 'extraData', pseudonymIdentifier: el.extra}) )
                .value();

            callback(null, [...pseudonymList, ...otherIndentificators] );
        }

        /**
         * @method runOnStart
         * @public
         *
         * on system boot load intouchplus.json and set activeActive state of partner as configured.
         * example of config:
         * { "activeActiveConfiguration": [
         *   {
         *      "tenant": "2222222222",                         // optional, tenant for db user, if not set used '0'
         *      "partnerId": "5caf63aa4048e94c66943b48",        // _id of parner document
         *      "activeActive": true                            // status to set in partner processed values: true|false
         *   },
         *   ...
         * } ]
         *
         * @param {Function} callback
         */
        async function runOnStart( callback ){

            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isVPRC() ){
                Y.log( 'partner.runOnStart: Wrong system type, skip partner change..', 'debug', NAME );
                return callback();
            }

            let config;
            if(!config){
                try {
                    config = require( `${process.cwd()}/intouchplus.json` );
                } catch( e ){
                    //config file not found, normal case
                }
            }
            if(!config || !config.activeActiveConfiguration || !config.activeActiveConfiguration.length ){
                Y.log( 'partner.runOnStart: ActiveActive configuration is not set, skip partner change..', 'debug', NAME );
                return callback();
            }
            let toProcess = config.activeActiveConfiguration.filter( el => el.partnerId && ( el.activeActive === true || el.activeActive === false ) );

            for( let setPartner of toProcess ){
                let user = Y.doccirrus.auth.getSUForTenant( setPartner.tenant || '0' );
                if( !user ){
                    Y.log( `partner.runOnStart: User not found for ${setPartner}, update activeActive skipped..`, 'warn', NAME );
                    continue;
                }
                let [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'partner',
                        migrate: true,
                        query: {_id: setPartner.partnerId},
                        data: {$set: {activeActive: setPartner.activeActive}}
                    } )
                );
                if( err ){
                    Y.log( `partner.runOnStart: Error updating partner for ${setPartner} : ${err.stack || err}`, 'warn', NAME );
                }
            }

            callback();
        }

        Y.namespace( 'doccirrus.api' ).partner = {
            name: NAME,
            batchDelete,
            sendInvitation,
            getPartnerDetails,
            importPartnerData,
            updatePartnerStatus,
            post: addPartner,
            getPartner,
            getForManualTransfer,
            checkAndAddLicensedPartner,
            removeConfigurationForLicensedPartner,
            getPseudonym,

            runOnStart
        };
    },
    '0.0.1', { requires: [ 'partner-schema', 'dccommunication' ] }
);
