/**
 *  Added to move REST actions from controller.server.js to new REST API
 *
 *  User: strix
 *  Date: 09/05/14  13:27
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/


YUI.add( 'patientreg-api', function( Y, NAME ) {

        const
            { formatPromiseResult, promisifyArgsCallback, handleResult } = require( 'dc-core' ).utils;

        function getOptinUrl( code ) {
            code = code || Y.doccirrus.utils.generateSecureToken();
            var
                REG_PREFIX = '/prgn?ccode=',
                optIn = Y.doccirrus.auth.getPUCUrl( REG_PREFIX ) + code;
            return optIn;
        }

        /**
         *  REST action to allow the client to load a set of patientreg records to allow polling and routing of
         *  requests to PRCs or VPRC tenants where the client is registered.
         *
         *  Used to filter to only those patientreg which apply to the current user of patient portal, and to limit the
         *  information sent back to the client.
         *
         *  @param  args    {Object}    As passed by RestController_new
         */

        function listPatientRegForUser( args ) {

            function onLoadPatientReg( err, data ) {

                if( err ) {
                    Y.log( `Could not read patient meta reg from db: ${  err}`, 'error', NAME );
                    args.callback( err );
                    return;
                }

                Y.log( `Loaded ${  data.length  } patientreg objects for user.`, 'info', NAME );

                var
                    redacted = [],
                    i;

                for( i = 0; i < data.length; i++ ) {

                    if( !data[i].customerIdPrac ) {
                        Y.log( `Missing customerIdPrac: ${  JSON.stringify( data[i] )}`, 'warn', NAME );
                        args.callback( new Error( 'PatientReg missing customerIdPrac.' ) );
                        return;
                    }

                    redacted.push( {
                        '_id': data[i]._id,
                        'identityId': data[i].identityId,
                        'patientId': data[i].patientId,
                        'customerIdPat': data[i].customerIdPat,
                        'customerIdPrac': data[i].customerIdPrac,
                        'accessPRC': data[i].accessPRC,
                        'noPRC': data[i].noPRC,
                        'prcKey': data[i].prcKey,
                        'confirmed': data[i].confirmed,
                        'email': data[i].email
                    } );
                }

                Y.log( `Read redacted patientreg: ${  JSON.stringify( data, undefined, 2 )}`, 'info', NAME );

                args.callback( null, redacted );
            }

            Y.doccirrus.api.patientreg.getForCurrentUser( args.user, '', onLoadPatientReg );
        }

        // single point to see if pin is not expired
        function isStillValid( tokenOrDate, lifeTime ) {
            var
                PIN_LIFETIME = lifeTime || 7200000, // 2 hours
                minValidTime = new Date( Date.now() - PIN_LIFETIME ),
                pinTime;

            if( 'string' === typeof tokenOrDate ) {
                pinTime = new Date( tokenOrDate.substr( 0, 24 ) );
            } else {
                pinTime = tokenOrDate;
            }
            return minValidTime < pinTime;
        }

        /**
         * on PP:
         * hepler to do a preliminary check,
         * regenerate the pin and compare it with what user submitted,
         * PRC will do the actual check
         * @param {String}      ppToken
         * @param {String}      prcKey
         * @param {String}      pinHash from user
         * @returns {boolean}
         */
        function isPinValid( ppToken, prcKey, pinHash ) {
            if( !prcKey || !ppToken || !pinHash ) {
                Y.log( 'cannot validate the pin without the required parameters', 'error', NAME );
                return false;
            }
            var
                pin = generatePatientPin( ppToken, null, prcKey ); // regenerate the pin
            pin = pin && Y.doccirrus.authpub.generateHash( pin );
            if( Y.doccirrus.auth.isDevServer() || pin === pinHash ) {
                if( isStillValid( ppToken ) ) {
                    return true;
                } else {
                    Y.log( 'pin is correct, but expired', 'debug', NAME );
                }
            }
            return false;
        }

        /**
         * on PRC:
         * Sets or unsets the portal auth for the patient.
         * @param {Object}  args
         */
        function setPortalAuth( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.setPortalAuth', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.setPortalAuth');
            }
            var
                callback = args.callback,
                user = args.user,
                async = require( 'async' ),
                practice, shouldSendPin, pinToSMS,
                params = args.data,
                flag = 'new', // indicates whether this is the first invitation or we are just updating access rights
                myPin,
                emailConfirmed = false,
                registerLink = Y.doccirrus.auth.getPUCUrl( '/intime#/registration/{patientregId}'),
                link1 = Y.doccirrus.auth.getPUCUrl( `/intime/patient?tab=newpractice&id=${  params.patientId}` ),
                link3 = Y.doccirrus.auth.getPUCUrl( '/intime' ),
                url = Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:processPatientDataPP' ),
                settings;

            // we need the patientId
            if( !params.patientId ) {
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            function sendSMS( smsText ) {
                if( params.phone ) {
                    smsText = smsText.replace( /<br><br>/g, '\n' );
                    Y.doccirrus.communication.dispatchSMS( user, {phone: params.phone, subject: practice.coname, text: smsText} );
                } else {
                    Y.log( `could not send PIN to SMS, no phone number: ${  JSON.stringify( params )}`, 'error', NAME );
                }
            }

            // send invitation/information email to patient
            function sendMail( data ) {
                let
                    patientregId = data.patientregId,
                    emailServiceName = 'registrationService', //Check email.json
                    i18n = Y.doccirrus.i18n,
                    lang = i18n( 'portalAuth' ),
                    jadeParams = {
                        text: ''
                    },
                    sendOnlySms = false,
                    emailOptions = {}, myEmail,
                    pin_text = lang.PIN_TEXT_1.replace( /\$pin\$/g, myPin ),
                    textNew, textUpd, textDel,
                    rightList = (params.createAdhoc ? `${lang.createAdhoc  }<br>` : '') +
                                (params.createPlanned ? `${lang.createPlanned  }<br>` : '') +
                                (params.accessPRC ? `${lang.accessPRC  }<br>` : '');
                flag = args.flag || data.status || 'new';
                if( 'pin_trigger' === params.flag ) {
                    flag = 'pin_trigger';
                }

                // build the pin part of email text depending on settings

                switch(flag){
                    case 'pin_trigger': // EXTMOJ-1218 demo code
                        textUpd = Y.Lang.sub( lang.PIN_REQUEST.text, { practiceName: practice.coname, pin: myPin } );
                        jadeParams.text = textUpd;
                        emailOptions.subject = lang.subjectUpd;
                        sendOnlySms = false;
                        shouldSendPin = false;
                        pinToSMS = false;
                        break;
                    case 'pin_request': // already registered, send a new pin
                        textUpd = Y.Lang.sub( lang.PIN_REQUEST.text, { practiceName: practice.coname, pin: myPin } );
                        jadeParams.text = textUpd;
                        emailOptions.subject = lang.subjectUpd;
                        sendOnlySms = true;
                        shouldSendPin = true;
                        break;
                    case 'updated': // already registered, just updating the access rights
                        textUpd = lang.textUpd.replace( '$coname$', practice.coname ).replace( /\$link3\$/g, link3 ).replace( '$rightList$', rightList );
                        jadeParams.text = textUpd;
                        emailOptions.subject = lang.subjectUpd;
                        break;
                    case 'deleted': //  already registered, all rights were revoked
                        textDel = lang.textDel.replace( '$coname$', practice.coname );
                        jadeParams.text = textDel;
                        emailOptions.subject = lang.subjectDel;
                        shouldSendPin = false;
                        break;
                    default: // patient was given access rights but they're not registered on PP yet
                        registerLink = Y.Lang.sub( registerLink, { patientregId: patientregId } );
                        textNew = Y.Lang.sub(lang.textNew.greeting, {coname: practice.coname}) +
                                  Y.Lang.sub(lang.textNew.register, {registerLink: registerLink}) +
                                  Y.Lang.sub(lang.textNew.login, {loginLink: settings && settings.patientPortalUrl || link1}) +
                                  lang.textNew.end;
                        jadeParams.text = textNew; // invitation email
                        emailOptions.subject = lang.subject;
                        shouldSendPin = false; // alway send it if new reg
                        emailServiceName = 'patientService';
                }

                emailOptions = Y.mix( emailOptions, {
                    serviceName: emailServiceName,
                    jadeParams: jadeParams,
                    jadePath: './mojits/MISMojit/views/portalauthemail.jade.html',
                    to: params.email
                } );

                if( !( pinToSMS && shouldSendPin && sendOnlySms ) ) {
                    myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                    Y.doccirrus.email.preventBccToDC( myEmail );
                    Y.doccirrus.email.sendEmail( { ...myEmail, user }, ( err ) => {
                        if( err ) {
                            Y.log( `setPortalAuth. could not send email. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        }
                    } );
                }
                if( pinToSMS && shouldSendPin ) {
                    sendSMS( pin_text );
                }
                callback( null, {message: 'ok'} );
            } // sendMail

            function backFromPP( error, response, body ) {
                error = error || body && body.meta && body.meta.errors[0];
                var
                    data = body && body.data;
                if( error || !body ) {
                    if( error && error.removingRights ) {
                         return callback( null, { message: 'ok' } );
                    }
                    Y.log( `Error: ${   response && response.statusCode  }\nError setting portal auth: ${  JSON.stringify( body )}`, 'error', NAME );
                    callback( ( 503 === error.code ? new Y.doccirrus.commonerrors.DCError( 'patientreg_1' ) : error ) || 'empty response form puc' );
                } else {
                    Y.log( `Success setting portal auth: ${  JSON.stringify( body )}`, 'debug', NAME );
                    // 8. now we can report successful portal auth and the pin
                    sendMail( data );
                }
            }

            function prepareDataForPP( patient ) {
                var
                    patientregData;

                // check are we deleting
                params.createPlanned = ('false' === params.createPlanned) ? false : params.createPlanned;
                params.createAdhoc = ('false' === params.createAdhoc) ? false : params.createAdhoc;
                params.accessPRC = ('false' === params.accessPRC) ? false : params.accessPRC;
                if( !params.createPlanned && !params.createAdhoc && !params.accessPRC ) {
                    flag = 'deleted';
                }

                // 5. allow email override, only use db email if unset in request
                if( !params.email ) {
                    params.email = Y.doccirrus.schemas.simpleperson.getEmail( patient.communications );
                    params.email = params.email && params.email.value;
                }

                if( !params.phone ) {
                    let
                        mobileObj = Y.doccirrus.schemas.simpleperson.getMobile( patient.communications );
                    params.phone = mobileObj && mobileObj.value;
                }

                if( !params.phone && pinToSMS ) {
                    callback( Y.doccirrus.errors.rest( 22000, 'Patient mobile number is required' ) );
                    return;
                }

                if( params.email ) {
                    emailConfirmed = patient.communications.some( function( item ) { // is email confirmed on PRC?
                        return item.value === params.email && item.confirmed;
                    } );
                } else {
                    callback( Y.doccirrus.errors.rest( 400, 'Patient email address is required' ) );
                    return;
                }

                shouldSendPin = !emailConfirmed || params.accessPRC && (!patient.devices || !patient.devices.length || 'pin_request' === args.flag); // when patient should receive a pin?

                patientregData = {
                    confirmed: emailConfirmed, // will determine patientreg.confirmed
                    email: params.email,
                    phone: params.phone,
                    lastname: params.lastname,
                    firstname: params.firstname,
                    dob: params.dob,
                    talk: params.talk,
                    patientId: params.patientId,
                    createPlanned: params.createPlanned || false,
                    removingRights: params.removingRights || false,
                    createAdhoc: params.createAdhoc || false,
                    accessPRC: params.accessPRC || false,
                    dcCustomerNo: practice.dcCustomerNo,
                    ppToken: '' // patient portal token, one of authentication factors
                };

                // generate a pin and save it to patient
                Y.doccirrus.api.admin.getFingerPrint( user, function( err, data ) {
                    if( err || !data || !data.fingerprint ) {
                        callback( err || 'could not get public key data' );
                        return;
                    }
                    link1 += `&spub=${  encodeURIComponent( data.publicKey )}`;
                    patientregData.prcKey = data.publicKey; // to facilitate retrieval of public key on PP

                    //  if there is already a valid pin don't replace it
                    if( patient.pin && isStillValid( patient.generatedAt ) && 'pin_request' !== args.flag ) {
                        myPin = patient.pin;
                        Y.log( `the pin is still usable: ${  myPin  } generated at ${  patient.generatedAt}`, 'debug', NAME );

                    } else {
                        Y.log( `creating pin and token for patient: ${  patient.lastname}`, 'debug', NAME );
                        patientregData.ppToken = Y.doccirrus.utils.generateSecureToken(); // one of the patient authentication factors
                        patient.generatedAt = new Date();// the time token was generated
                        patientregData.ppToken = patient.generatedAt.toJSON() + patientregData.ppToken;

                        if( Y.doccirrus.auth.isDevServer() ) {
                            myPin = '12345';
                        } else if ( process.env.DEV_PIN_CONST ) {
                            myPin = process.env.DEV_PIN_CONST;
                        } else {
                            myPin = generatePatientPin( patientregData.ppToken, data.fingerprint, null );
                        }

                        if( !myPin || 5 !== myPin.length || !patientregData.ppToken ) {
                            return callback( 'error generating pin' );
                        }
                        patient.pin = myPin;
                    }
                    let putData = Y.doccirrus.filters.cleanDbObject( {
                            generatedAt: patient.generatedAt,
                            pin: patient.pin
                        } ),
                        fields = ['generatedAt', 'pin'];
                    if( 'pin_trigger' === params.flag ) { //for EXTMOJ-1218 purpose
                        fields.push( 'accessPRC' );
                        putData = Y.doccirrus.filters.cleanDbObject( {
                            generatedAt: patient.generatedAt,
                            pin: patient.pin,
                            accessPRC: true
                        } );
                    }
                    // save possible changes
                    Y.doccirrus.mongodb.runDb({
                        user: user,
                        model: 'patient',
                        action: 'put',
                        query: {
                            _id: patient._id.toString()
                        },
                        fields: fields,
                        data: putData
                    }, function( err ) {
                        if( err ) {
                            return callback( err );
                        }
                        Y.log( `Sending portal auth to PP: ${  JSON.stringify( patientregData )}`, 'debug', NAME );
                        Y.doccirrus.https.externalPost( url, patientregData, {friend: true}, backFromPP ); // will create/update patientreg on PP
                    } );
                } );
            }

            // get all required data
            async.parallel( {
                threeFactorAuth: function( cb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'incaseconfiguration',
                        options: {limit: 1, select: {threeFactorAuth: 1}}
                    }, function( err, result ) {
                        if( err || !result || !result[0] ) {
                            cb( err, null );
                        } else {
                            cb( null, result[0].threeFactorAuth );
                        }
                    } );
                },
                practice: function( cb ) {
                    // get practice name
                    Y.doccirrus.mongodb.runDb(
                        { user: user, model: 'practice', action: 'get', query: {}, options: {},
                            callback: function( err, result ) {
                                if( err || !result || !result[0] ) {
                                    cb( err, null );
                                } else {
                                    cb( null, result[0] );
                                }
                            }
                        } );
                },
                patient: function( cb ) {
                    Y.doccirrus.mongodb.runDb(
                        { user: user, model: 'patient', action: 'get',
                            query: { _id: params.patientId }, options: {},
                            callback: function( err, result ) {
                                if( err || !result || !result[0] ) {
                                    cb( err, null );
                                } else {
                                    cb( null, result[0] );
                                }
                            }
                        } );
                },
                settings( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'settings',
                        action: 'get',
                        query: {},
                        options: { limit: 1 }
                    }, ( err, results ) => {
                        if( err ) {
                            return done( err );
                        }
                        done( null, results && results[ 0 ] || {} );
                    } );
                }

            }, function allDone( err, result ) {
                if( err || !result || !result.patient || !result.practice ) {
                    if ( !result.patient ) { Y.log( `Could not oad patient with _id: ${  params.patientId}`, 'warn', NAME ); }
                    if ( !result.practice ) { Y.log( 'Could not oad practice (any).', 'warn', NAME ); }
                    Y.log( `Request parameters were: ${  JSON.stringify( params )}`, 'debug', NAME );
                    Y.log( `error in gathering data: ${  JSON.stringify( err || result )}`, 'error', NAME );
                    callback( err || 'insufficient data' );
                } else {
                    practice = result.practice;
                    pinToSMS = result.threeFactorAuth;
                    settings = result.settings;
                    prepareDataForPP( result.patient, result.threeFactorAuth );
                }
            } );

        }


        function triggerPinEmail( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.triggerPinEmail', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.triggerPinEmail');
            }
            const
                { user, callback, patientRegs } = args,
                async = require( 'async' );

            function _triggerPinEmail( patientReg, callback ) {
                Y.doccirrus.api.metaprac.getPublicData( {
                    user: user,
                    data: { dcCustomerNo: patientReg.customerIdPrac },
                    callback: function( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        if( !result.length || !result[ 0 ].host ) {
                            Y.log( `getRegisteredPublicKeys. prc: ${patientReg.customerIdPrac} has no host configured`, 'warn', NAME );
                            return callback();
                        }

                        Y.log( `triggering portal auth for PIN in PRC: ${result[ 0 ].host}`, 'debug', NAME );
                        Y.doccirrus.https.externalApiCall( {
                            model: 'patientreg',
                            method: 'post',
                            action: 'setPortalAuth',
                            host: result[ 0 ].host,
                            data: {
                                accessPRC: true,
                                createPlanned: true,
                                flag: 'pin_trigger',
                                patientId: patientReg.patientId
                            },
                            options: { friend: true, errDataCallback: true }
                        }, function( err, data ) {
                            if( err ) {
                                Y.log( `triggerPinEmail: error from PRC: ${JSON.stringify( err )}`, 'error', NAME );
                                return callback( err );
                            }
                            callback( null, Object.assign( {}, patientReg, { registeredKeys: data.registeredKeys } ) );
                        } );
                    }
                } );
            }

            async.waterfall( [
                function( next ) {
                    if( patientRegs ) {
                        return setImmediate( next, null, patientRegs );
                    }
                    // get all patientregs
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            identityId: user.identityId
                        }
                    }, next );
                },
                function( patientRegs, next ) {
                    async.mapSeries( patientRegs.filter( item => item.customerIdPat ), _triggerPinEmail, next );
                }
            ], callback );

        }

        /**
         * Gets the portal auth for the patient.
         * @param {Object }args
         */
        function getPortalAuth( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.getPortalAuth', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.getPortalAuth');
            }
            var
                practice,
                params = args.data,
                data,
                callback = args.callback;

            // 0. check that the required parameters are set
            // we need the patientId
            if( !params.patientId ) {
                callback( 400, 'Invalid parameters' );
                return;
            }

            function practiceCb( err, prax ) {
                if( err ) {
                    Y.log( 'Error reading practice Info', 'error', NAME );
                    callback( err );
                    return;
                }
                //
                // have current practice info
                if( Array.isArray( prax ) ) {
                    practice = prax[0];
                } else {
                    practice = prax;
                }
                // set data to send
                data = {
                    patientId: params.patientId,
                    dcCustomerNo: practice.dcCustomerNo,
                    secret: Y.doccirrus.auth.getPUCSecret()
                };
                //
                // send data via REST
                Y.doccirrus.https.externalPost(
                    Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:getpatreg' ),
                    data,
                    {friend: true},
                    function( error, response, body ) {
                        var
                            data = body && body.data;
                        if( error || !data ) {
                            Y.log( `error: ${  error}` || 'no data received', 'error', NAME );
                            callback( error || 'no data from PUC' );
                        } else {
                            if( 200 === response.statusCode || 201 === response.statusCode ) {
                                Y.log( `success ${  JSON.stringify( data )}`, 'info', NAME );
                                // now we can report successful portal auth and the pin
                                callback( null, data );
                            } else {
                                Y.log( `error: ${  response.statusCode  }\nerror: ${  body}`, 'error', NAME );
                                callback( 'error in puc response' );
                            }
                        }
                    }
                );
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'practice',
                user: args.user,
                migrate: true,
                query: {},
                options: {}
            }, practiceCb );
        }
        /**
         * Gets the patients portal auth for practice.
         * @param {Object} args
         */
        function getAllPortalAuth( args ) {
            var
                practice,
                data,
                callback = args.callback;

            function practiceCb( err, prax ) {
                if( err ) {
                    Y.log( 'Error reading practice Info', 'error', NAME );
                    callback( err );
                    return;
                }
                //
                // have current practice info
                if( Array.isArray( prax ) ) {
                    practice = prax[0];
                } else {
                    practice = prax;
                }
                // set data to send
                data = {
                    customerIdPrac: practice.dcCustomerNo,
                    secret: Y.doccirrus.auth.getPUCSecret()
                };
                //
                // send data via REST
                Y.doccirrus.https.externalPost(
                    Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:getPracticePatreg' ),
                    data,
                    {friend: true},
                    function( error, response, body ) {
                        var
                            data = body && body.data;
                        if( error || !data ) {
                            Y.log( `error: ${  error}` || 'no data received', 'error', NAME );
                            callback( error || 'no data from PUC' );
                        } else {
                            if( 200 === response.statusCode || 201 === response.statusCode ) {
                                Y.log( `success ${  JSON.stringify( data )}`, 'info', NAME );
                                // now we can report successful portal auth and the pin
                                callback( null, data );
                            } else {
                                Y.log( `error: ${  response.statusCode  }\nerror: ${  body}`, 'error', NAME );
                                callback( 'error in puc response' );
                            }
                        }
                    }
                );
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'practice',
                user: args.user,
                migrate: true,
                query: {},
                options: {}
            }, practiceCb );
        }

        /**
         * on PP:
         * reusable hepler to send a patient an optin email.
         *
         * @param {Object}      params {email,firstname,lastname}
         * @param {Function}    callback
         */
        async function sendOptinEmail( params, callback ) {
            const {user} = params,
                i18n = Y.doccirrus.i18n;
            Y.log( `sending optin email with params: ${  require( 'util' ).inspect( params )}`, 'debug', NAME );
            let
                optIn = params.optIn,
                jadeParams = {}, emailOptions, myEmail, subject, fullname;

            if( !params || !params.email || !params.firstname || !params.lastname || !optIn ) {
                return callback( 'insufficient params' );
            }

            optIn += `&email=${  params.email}`;
            fullname = `${params.firstname  } ${  params.lastname}`;
            jadeParams.text = i18n( 'patientRegistration.patientOptinEmail.TEXT' )
                .replace( /\$optin\$/g, optIn )
                .replace( /\$fullname\$/g, fullname );
            subject = i18n( 'patientRegistration.patientOptinEmail.SUBJECT' )
                .replace( '$fullname$', fullname );

            emailOptions = {
                serviceName: 'patientPortalService',
                to: params.email,
                subject: subject,
                jadeParams: jadeParams,
                jadePath: './mojits/PUCMojit/views/regpatientemail.jade.html',
                attachments: [
                    {
                        path: `${process.cwd()  }/mojits/DocCirrus/assets/docs/Datenschutz.pdf`,
                        type: "application/pdf",
                        filename: "Datenschutz.pdf"
                    }
                ]
            };

            myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
            Y.doccirrus.email.sendEmail( {...myEmail, user}, callback );
        }

        /**
         * Helper function.
         * 1- creates a new patientreg if not found by patient info (dob, firstname, lastname and talk).
         * 2- updates it with basic data.
         *
         * requires CustomerId/dcCustomerNo for cold registration, or patientId and portalPin for reg via invitation.
         *
         * @private
         * @param {Object}          params          (patientId, portalPin, dcCustomerNo...)
         * @param {Function}        callback        (err, updateStatus)
         */
        function setPatientreg( params, callback ) {
            var
                updateStatus = '',
                dbuser = Y.doccirrus.auth.getSUForPUC();

            function finalCb( err, result ) {
                if( err || !result || !result[0] ) {
                    Y.log( `error in setPatientreg: ${  err}` );
                    callback( err, null, updateStatus );

                } else {
                    callback( null, result[0], updateStatus );
                }
            }

            function getIt( err, result ) {
                if( err || !result || !result[0] ) {
                    Y.log( `error in posting patientreg: ${  err}` );
                    callback( 'error in PUC' );
                    return;
                }
                // take back the metreg we just posted
                Y.doccirrus.mongodb.runDb( { user: dbuser,
                    model: 'patientreg',
                    query: {_id: result[0] }
                }, finalCb );
            }

            function getIt1( err, result ) { // a hack due to an issue with mongoose or mongodb
                setTimeout( function() {
                    getIt( err, result );
                }, 300 );
            }

            // update the patientreg or create a new one
            function patientregCb( err, result ) {

                if( err ) {
                    finalCb( err.toString() );
                    return;
                }
                Y.log( `patientreg(s) found ${  result && result.length}`, 'debug', NAME );

                // reduce the result to the first entry as a patient may not have more than one patientreg!
                if( result && Array.isArray( result ) ) {
                    result = result[0];
                }

                if( !result ) { // there was no invitation
                    let patientregData = {
                        patientId: params.patientId,
                        identityId: params.identityId,
                        ppToken: params.ppToken,
                        prcKey: params.prcKey,
                        customerIdPat: params.customerIdPat,
                        customerIdPrac: params.dcCustomerNo,
                        createPlanned: params.createPlanned,
                        accessPRC: params.accessPRC,
                        email: params.email,
                        noPRC: params.noPRC,
                        confirmed: params.noPRC ? params.confirmed : false // always false if...invitation
                    };
                    Y.log( `Posting fresh patientreg ${  JSON.stringify( patientregData )}`, 'debug', NAME );

                    // post fresh data, clean of XSS first
                    updateStatus = 'new';
                    patientregData = Y.doccirrus.filters.cleanDbObject( patientregData );
                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        action: 'post',
                        model: 'patientreg',
                        data: patientregData
                    }, getIt1 );

                } else {
                    updateStatus = 'updated';
                    // we also save the Pin here.
                    // the new Pin is also in the E-Mail.
                    result.ppToken = params.ppToken || result.ppToken;
                    result.customerIdPat = params.customerIdPat || result.customerIdPat;
                    result.prcKey = params.prcKey || result.prcKey;
                    result.createPlanned = params.createPlanned;
                    if( !params.createPlanned && !params.createAdhoc && !params.accessPRC ) {
                        updateStatus = 'deleted';
                    }
                    result.accessPRC = params.accessPRC;
                    result.confirmed = params.confirmed || false; // true if already confirmed on PRC
                    result.email = params.email; // the email waiting to be confirmed
                    Y.log( `Posting updated (${  updateStatus  }) in patientreg ${  JSON.stringify( result )}`, 'debug', NAME );
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        model: 'patientreg',
                        action: 'put',
                        query: {
                            _id: result._id
                        },
                        fields: Object.keys(result),
                        data: Y.doccirrus.filters.cleanDbObject(result)
                    } );

                    finalCb( null, [result] );
                }
            }

            if( params.patientId ) {
                // check if there exists a waiting invitation
                Y.doccirrus.mongodb.runDb( { user: dbuser,
                    action: 'get',
                    model: 'patientreg',
                    query: {patientId: params.patientId, customerIdPrac: params.dcCustomerNo}
                }, patientregCb );
            } else {
                patientregCb();
            }
        } // setPatientreg

        /**
         * on PP:
         * This should only be called by a PRC (V).
         * This is necessary to use PUC services.
         * It creates:
         *  2. Contact entry on dcprc( or gets id of existing entry)
         *  3. Patientreg entry( already has link to dcprc contact )
         *  Logic:
         *   1. Get patientreg entry
         *   2. Check identity entry
         *    if username(identity) and email(from params) are the same => use it,
         *    if not => reset(set to '')
         *   3. Check contact
         *    3.1 if identity was not reset allows to use current contact id(patientreg.customerIdPat)
         *    3.2 if not => tries to find suitable for params data.
         *    if case is 3.1 and nobody else uses this contact, the contact will be updated with new data.
         *    if not => create new contact.
         *   4. creates or updates patientreg
         *  Every patient invitation removes relations between identity and patientreg entry for PRC
         * @param {Object}          args
         */
        function processPatientDataPP( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.processPatientDataPP', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.processPatientDataPP');
            }
            var
                callback = args.callback,
                user = Y.doccirrus.auth.getSUForPUC(),
                params = args.data,
                identityReset = false,
                attachNewPractice = false,
                async = require( 'async' );

            if( !params.patientId || undefined === params.ppToken || !params.dcCustomerNo || undefined === params.confirmed ) {
                Y.log( `processPatientDataPP. Invalid parameters. Some params are missing. Params: ${  require('util').inspect( params )}`, 'error', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            function setNewContact( patientreg, callback ) {
                let
                    contactData = {
                        firstname: params.firstname,
                        lastname: params.lastname,
                        dob: params.dob,
                        talk: params.talk,
                        email: params.email,
                        phone: params.phone
                    };
                patientreg = patientreg || {};
                async.waterfall( [
                    function( next ) {
                        if( !patientreg.customerIdPat ) {
                            return setImmediate( next, null, null );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientreg',
                            action: 'count',
                            query: {
                                customerIdPat: patientreg.customerIdPat,
                                _id: { $ne: patientreg._id.toString() }
                            }
                        }, function( err, result ) {
                            next( err, result );
                        } );
                    },
                    function( count, next ) {
                        var
                            put = false;
                        if( !count && patientreg.customerIdPat) {
                            put = true;
                            contactData._id = patientreg.customerIdPat;
                        }
                        Y.log( `processPatientDataPP. Writing contact on DCPRC: ${  JSON.stringify( contactData )}`, 'debug', NAME );
                        Y.doccirrus.utils.dcprcSetPatientAsContact( contactData, function( err, results ) {
                            var
                                data;
                            if( err ) {
                                return next( err );
                            }
                            if(results && results.data){
                                if( put ){
                                    data = results.data._id;
                                } else {
                                    data = results.data[0];
                                }
                            }

                            next( err, data );
                        } );
                    }
                ], callback );

            }

            function checkIdentityEntry( patientreg, callback ) {
                let
                    query = {};
                patientreg = patientreg || {};
                if( !params.email ) {
                    Y.log( 'processPatientDataPP. Invalid parameters. Email is missing', 'error', NAME );
                    callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                    return;
                }

                if( patientreg.identityId ) {
                    query._id = patientreg.identityId;
                } else {
                    attachNewPractice = true;
                    query = {
                        username: params.email
                    };
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'get',
                    query: query,
                    options: {
                        lean: true
                    }
                }, function( err, results ) {
                    let
                        identity;
                    if( err ) {
                        return callback( err );
                    }
                    identity = results[ 0 ];
                    if( identity ) {
                        if( params.email === identity.username ) {
                            return callback( null, identity._id.toString() );
                        } else {
                            identityReset = true;
                            return callback( null, '' );
                        }
                    } else {
                        identityReset = true;
                        return callback( null, '' );
                    }
                } );
            }

            function checkDCPRCContactEntry( patientreg, callback ) {
                patientreg = patientreg || {};
                async.waterfall( [
                    function( next ) {
                        let
                            contactQuery;
                        if( patientreg.customerIdPat && !identityReset ){
                            contactQuery = { _id: patientreg.customerIdPat };
                        } else {
                            // patient have been invited first time by a practice
                            contactQuery = {
                                lastname: params.lastname,
                                firstname: params.firstname,
                                email: params.email,
                                phone: params.phone,
                                dob: params.dob
                            };
                        }
                        Y.doccirrus.utils.dcprcGetPatientAsContact( contactQuery, function( err, results ) {
                            next( err, results && results[ 0 ] );
                        } );
                    },
                    function( contact, next ) {
                        if( contact ) {
                            setImmediate( next, null, contact._id.toString() );
                        } else {
                            setNewContact( patientreg, next );
                        }
                    }
                ], callback );
            }

            function prepareData( patientreg, callback ){
                async.series({
                    getIdentityId: function( next ){
                        checkIdentityEntry( patientreg, function( err, result ) {
                            next( err, result );
                        } );
                    },
                    getDCPRCContactId: function( next ){
                        checkDCPRCContactEntry( patientreg, function(err, result){
                            next( err, result );
                        });
                    }
                }, function(err, result){
                    if(err){
                        return callback( err );
                    }
                    callback(err, {
                        identityId: result.getIdentityId,
                        customerIdPat: result.getDCPRCContactId,
                        patientreg: patientreg
                    });
                } );
            }

            function getPatientReg( callback ){
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'patientreg',
                    action: 'get',
                    query: {
                        patientId: params.patientId,
                        customerIdPrac: params.dcCustomerNo
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                }, function(err, results){
                    if( params.removingRights && !results[0] ) {
                        return callback( { removingRights: true } );
                    }
                    callback( err, results && results[ 0 ] );
                } );
            }

            function processPatientreg( data, callback ){
                let
                    updateStatus = '',
                    patientreg = data.patientreg || {},
                    identityId = data.identityId,
                    customerIdPat = data.customerIdPat,
                    patientregData = {};


                patientregData.ppToken = params.ppToken || patientreg.ppToken;
                patientregData.customerIdPat = customerIdPat;
                patientregData.identityId = identityId;
                patientregData.prcKey = params.prcKey || patientreg.prcKey;
                patientregData.createPlanned = params.createPlanned;
                patientregData.accessPRC = params.accessPRC;
                patientregData.confirmed = params.confirmed || false; // true if already confirmed on PRC

                if( patientreg._id ) {
                    if( attachNewPractice && identityId ){
                        updateStatus = 'attachedToPractice';
                    }
                    if( !identityId ) {
                        updateStatus = 'new';
                    } else {
                        updateStatus = 'updated';
                        if( !params.createPlanned && !params.createAdhoc && !params.accessPRC ) {
                            updateStatus = 'deleted';
                        }
                    }

                    if( !params.confirmed ) {
                        patientregData.email = params.email; // the email waiting to be confirmed
                    }
                    Y.log( `Posting updated (${  updateStatus  }) in patientreg ${  JSON.stringify( patientregData )}`, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'put',
                        query: {
                            _id: patientreg._id.toString()
                        },
                        data: Y.doccirrus.filters.cleanDbObject( patientregData ),
                        fields: Object.keys( patientregData )
                    }, function( err ) {
                        callback( err, {
                            status: updateStatus,
                            patientregId: patientreg._id

                        } );
                    } );
                } else {
                    if( attachNewPractice && identityId ){
                        updateStatus = 'attachedToPractice';
                    } else {
                        updateStatus = 'new';
                    }

                    patientregData.patientId = params.patientId;
                    patientregData.customerIdPrac = params.dcCustomerNo;
                    patientregData.email = params.email;
                    patientregData.noPRC = params.noPRC;
                    Y.log( `Posting fresh patientreg ${  JSON.stringify( patientregData )}`, 'debug', NAME );

                    patientregData = Y.doccirrus.filters.cleanDbObject( patientregData );
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'patientreg',
                        data: patientregData
                    }, function( err, results ) {
                        if(err){
                            return callback( err );
                        }
                        callback( err, {
                            status: updateStatus,
                            patientregId: results[0]
                        } );
                    } );
                }
            }

            async.waterfall([
                function(next){
                    getPatientReg( function( err, patientreg ) {
                        next(err, patientreg);
                    });
                },
                function( patientreg, next ){
                    prepareData( patientreg, function( err, result ) {
                        next( err, result );
                    } );
                },
                function( extraData, next ){
                    processPatientreg( extraData, next );
                }
            ], callback );
        }

        /**
         *
         *
         * given the customerIdPrac and patientId, returns the patientreg record.
         *
         * @param {Object}          args
         */
        function getpatreg( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.getpatreg', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.getpatreg');
            }
            var
                callback = args.callback,
                user = args.user,
                params = args.data;

            // check params are set
            if( !params.patientId || !params.dcCustomerNo ) {
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            // check that customer is valid TODO -- MOJ-86
            // DCPRC.checkValidCustomer( customer, callback);

            function patRegCb( err, result ) {
                if( err ) {
                    Y.log( `could not get patientreg: ${  JSON.stringify( err )}`, 'error', NAME );
                    callback( err.toString() );
                } else {
                    callback( null, result );
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                query: {
                    patientId: params.patientId,
                    customerIdPrac: params.dcCustomerNo
                },
                options: args.options,
                callback: patRegCb
            } );
        }
        /**
         * Gets patients info for specific practice
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.customerIdPrac practice number
         */
        function getPracticePatreg( args ) {
            var
                callback = args.callback,
                user = args.user,
                params = args.data;

            // check params are set
            if( !params.customerIdPrac ) {
                Y.log( 'getPracticePatreg. customerIdPrac is missing', 'error', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            function patRegCb( err, result ) {
                if( err ) {
                    Y.log( `could not get patientreg: ${  JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                callback( err, result );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                query: {
                    customerIdPrac: params.customerIdPrac
                },
                options: args.options
            }, patRegCb );
        }

        /**
         * this is called from a public route on PP.
         * patient clicked on the optin link.
         *
         * the optin link has dual usage, either:
         * 1- a fresh patient registration, or
         * 2- amending an existing registration (e.g change of username)
         *
         * @param {Object}          args
         */
        function patientOptin( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.patientOptin', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.patientOptin');
            }
            var
                params = args.data || {},
                callback = args.callback,
                code = params.ccode || '',
                email = params.email || '',
                optInUrl = getOptinUrl( code ),
                getPatientPortalUrlOfPRCP = promisifyArgsCallback( Y.doccirrus.api.patientportal.getPatientPortalUrlOfPRC ),
                dbuser = args.user,
                myPatientReg,
                practiceData = {},
                error, patientPortalUrl;
            // return control to the controller
            function done( err, status ) {
                Y.log( `optin done: ${  status  }:${  JSON.stringify( err )}`, 'debug', NAME );
                if( !err && myPatientReg /*&& myPatientReg.optIn === optInUrl*/ && !myPatientReg.confirmed ) { // is this also an optin to a specific PRC?
                    callback( err, {patientId: myPatientReg.patientId, prcKey: myPatientReg.prcKey, coname: practiceData.coname } );
                } else { // just a DCPRC optin
                    callback( err, {...status, redirectTo: patientPortalUrl} );
                }
            }

            if( !code || !email ) {
                Y.log( 'patientOptin: missing params', 'error', NAME );
                callback( Y.doccirrus.errors.http( 400 ) );
                return;
            }

            if( !Y.doccirrus.email.isReady() ) {
                Y.log( '/patientconfirm called -- but email service not ready. E-Mail is a necessary vector for authorisation.', 'error', NAME );
                done( null, 'fail' );
                return;
            }

            // inform DC about the new customer
            function informDC() {
                const
                    cfgRaw = require( 'dc-core' ).config.load( `${process.cwd()  }/email.json` ),
                    myEmailCfg = cfgRaw.config || {};

                if( !myEmailCfg || !myEmailCfg.infoService || !myEmailCfg.infoService.to ) {
                    Y.log( `could not inform DC of new patient optin, missing email config:${  JSON.stringify( myEmailCfg )}`, 'error', NAME );
                    return;
                }

                let
                    lang = Y.doccirrus.i18n( 'patientRegistration' ),
                    jadeParams = {
                        text: ''
                    },
                    emailOptions,
                    myEmail,
                    tstamparr = new Date().toJSON().match( /([\-0-9]*)T([0-9:.]*)Z/ ),
                    userName = `${myPatientReg.firstname  } ${  myPatientReg.lastname}`,
                    receiverMail = myPatientReg.email;

                jadeParams.text = lang.optinConfirmEmail.TEXT.replace( /\$username\$/g, userName ).replace( '$tstamparr[1]$', tstamparr[1] )
                    .replace( '$tstamparr[2]$', tstamparr[2] ).replace( /\$url\$/g, patientPortalUrl || Y.doccirrus.auth.getPUCUrl( '/intime/patient' ) );
                emailOptions = {
                    serviceName: 'patientPortalService',
                    to: myEmailCfg.infoService.to,
                    user: dbuser,
                    subject: lang.optinConfirmEmail.SUBJECT.replace( '$username$', userName ),
                    jadeParams: jadeParams,
                    jadePath: './mojits/PUCMojit/views/patientupdateemail.jade.html',

                    attachments: [
                        {
                            path: `${process.cwd()  }/mojits/DocCirrus/assets/docs/Datenschutz.pdf`,
                            type: "application/pdf",
                            filename: "Datenschutz.pdf"
                        }
                    ]
                };

                Y.log( `Final patient confirm:  ${  JSON.stringify( receiverMail )}`, 'debug', NAME );
                myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                Y.doccirrus.email.sendEmail( { ...myEmail, user: dbuser }, ( err ) => {
                    if( err ) {
                        Y.log( `could not inform DC of new patient optin. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                } );
            }

            // joint of the two branches (i.e fresh registration or re-optin)
            function backFromDCPRC( err, result ) {
                Y.log( `back From DCPRC:${  JSON.stringify( result )}`, 'debug', NAME );
                result = result && result.data || result;
                var
                    contactOrId = Array.isArray( result ) ? result[0] : result,
                    theEmail = contactOrId && contactOrId.communications &&
                               Y.doccirrus.schemas.simpleperson.getEmail( contactOrId.communications );
                if( err ) {
                    Y.log( `Failed to create/update Contact on DCPRC: ${  JSON.stringify( err )}`, 'error', NAME );
                    done( err );
                    return;
                }
                if( !contactOrId ) {
                    Y.log( 'repeated optin attempt', 'debug', NAME );
                    done( null, 'rep' );
                    return;
                }
                if( 'string' === typeof contactOrId ) { // was a post (new customer)
                    informDC();
                    myPatientReg.customerIdPat = contactOrId;
                    // Clean patientreg form private patient data
                    myPatientReg.firstname = myPatientReg.lastname = myPatientReg.talk = myPatientReg.dob = undefined;
                    myPatientReg.pw = myPatientReg.phone = undefined;
                    myPatientReg.confirmed = myPatientReg.noPRC; // if no patient data on PRC then
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        model: 'patientreg',
                        action: 'put',
                        query: {
                            _id: myPatientReg._id
                        },
                        fields: Object.keys(myPatientReg),
                        data: Y.doccirrus.filters.cleanDbObject(myPatientReg)
                    }, done);

                } else if( theEmail && theEmail.value === email && contactOrId._id ) { // email was changed, so should the username
                    Y.doccirrus.mongodb.runDb(
                        {
                            user: dbuser,
                            model: 'patientreg',
                            query: {customerIdPat: contactOrId._id},
                            options: {},
                            callback: function( err, result ) {
                                if( err || !result || !result[0] || !result[0].identityId ) {
                                    Y.log( `could not find any reg entry for the contact: ${  JSON.stringify( err || result )}`, 'error', NAME );
                                    done( err, 'rep' ); // very likely a repeated attempt

                                } else { // all is safe, update the username
                                    myPatientReg = result[0];
                                    Y.log( `changing username to ${  email}`, 'debug', NAME );
                                    Y.doccirrus.mongodb.runDb( {
                                        user: dbuser,
                                        action: 'put',
                                        model: 'identity',
                                        fields: ['username'],
                                        query: {_id: result[0].identityId},
                                        data: {username: email, skipcheck_: true},
                                        callback: function( err, result ) {
                                            if( err || !result ) {
                                                Y.log( `failed to update username  ${  JSON.stringify( err || result )}`, 'error', NAME );
                                                done( err || 'incompatible data (1)' );
                                            } else { // all went good
                                                done();
                                            }
                                        }
                                    } );
                                }
                            }
                        } );

                } else {
                    Y.log( `it should have been either a fresh registration or a re-optin (e.g change of username): ${ 
                           email  } should be in ${  JSON.stringify( theEmail )}`, 'error', NAME );
                    done( 'wrong parameters' );
                }
            }

            function getPracticeName( err, result ){
                if( !err && myPatientReg.customerIdPrac ) {
                    Y.doccirrus.utils.dcprcGetCustomer( myPatientReg.customerIdPrac, function( _err, _results ) {
                        practiceData = (_results && _results[ 0 ]) || {};
                        backFromDCPRC( err || _err, result );
                    } );
                } else {
                    backFromDCPRC( err, result );
                }

            }

            //  save Identity info in the patientreg and now create a contact on the DCPRC
            function toDCPRC( err, result ) {
                var
                    myIdentity = result && result[0] || result,
                    profileData;

                if( err || !myIdentity ) {
                    // you only see failure in the LOG. TODO - MOJ-415
                    Y.log( `Failed to write Identity  ${  err  } / ${  JSON.stringify( result )}`, 'error', NAME );
                    done();
                    return;
                }
                myPatientReg.identityId = myIdentity._id;

                if( !myPatientReg.firstname ) {
                    Y.log( `repeated optin will not update DCPRC: ${  JSON.stringify( myPatientReg )}`, 'debug', NAME );
                    getPracticeName();
                    return;
                }

                profileData = {
                    firstname: myPatientReg.firstname,
                    lastname: myPatientReg.lastname,
                    dob: myPatientReg.dob,
                    confirmed: true, // confirmed for DC
                    optIn: optInUrl,
                    talk: myPatientReg.talk,
                    email: myPatientReg.email,
                    phone: myPatientReg.phone
                };

                if( myPatientReg.customerIdPat ) { // already is a DC customer (previous optin)
                    profileData._id = myPatientReg.customerIdPat;
                }

                // mask out unwanted fields.
                Y.log( `Writing contact on DCPRC: ${  JSON.stringify( profileData )}`, 'debug', NAME );
                Y.doccirrus.utils.dcprcSetPatientAsContact(
                    profileData,
                    getPracticeName );
            }

            //
            // Decide if this is a registration or a re-registration
            // either create identity then -> DCPRC
            // or just -> DCPRC
            async function checkPatientRegCb( err, result ) {
                myPatientReg = result && result[0];
                var
                    newId;

                // check error
                if( err ) {
                    Y.log( `Failed to get patientreg record: ${  err}`, 'error', NAME );
                    done( err, 'fail' );
                    return;
                }

                // branch #1
                if( !myPatientReg ) { // opt-in to DCPRC (no PRC involved, e.g change of username)
                    Y.doccirrus.api.contact.doOptinToDCPRC( {optIn: optInUrl, email: email}, backFromDCPRC );
                    return;
                }

                if( myPatientReg && myPatientReg.customerIdPrac ) {
                    [error, patientPortalUrl] = await formatPromiseResult(
                        getPatientPortalUrlOfPRCP( {
                            user: dbuser,
                            data: {dcCustomerNo: myPatientReg.customerIdPrac}
                        } )
                    );
                    if( error ) {
                        Y.log( `checkPatientRegCb: Error while getting patientPortalUrl from  practice ${myPatientReg.customerIdPrac}: ${error.stack || error}`, 'warn', NAME );
                    }
                }

                // branch #2
                if( myPatientReg.identityId && myPatientReg.customerIdPat ) { // reuse the identity
                    Y.log( 'patient already has identity and contact, anyway will update DCPRC', 'debug', NAME );

                    // re-registration, the id already exists, so
                    // update DCPRC, and that's it.
                    // this will replace values form the previous registration.
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        action: 'get',
                        model: 'identity',
                        query: {_id: myPatientReg.identityId},
                        callback: toDCPRC
                    } );

                } else { // create a new identity
                    newId = Y.doccirrus.api.identity.createNewIdentityForPatientreg( myPatientReg, false ); // username will be myPatientReg.email
                    if( !newId ) {
                        return done( new Y.doccirrus.commonerrors.DCError( 400, { data: 'could not prepare identity' } ) );
                    }
                    Y.log( `Writing identity on PUC.${  newId.lastname}`, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        action: 'post',
                        model: 'identity',
                        data: newId,
                        options: {entireRec: true},
                        callback: toDCPRC
                    } );
                }
            }

            // get appropriate PatientReg
            Y.doccirrus.mongodb.runDb( {user: dbuser, model: 'patientreg', query: {optIn: optInUrl}, callback: checkPatientRegCb } );
        } // patientConfirm

        /**
         *
         * @param {String}          token
         * @param {String}          fp          prc public key fingerprint
         * @param {String}          pk          prc public key (required only if fp is not given)
         * @returns {string}
         */
        function generatePatientPin( token, fp, pk ) {
            var pin;
            fp = fp || Y.doccirrus.authpub.generateHash( pk );
            pin = Y.doccirrus.authpub.generateHash( fp + token );
            pin = pin && pin.substr( -5 );
            return pin && pin.toUpperCase();
        }

        /**
         *
         * Receives Registration Info that the Patient typed themselves. This is when an invitation link is clicked or
         * alternatively the link "Noch nicht registriert" on pp's login page (cold registration).
         * For the second case, a customerId must be provided in url.
         *
         * the two registrations are distinguished here by checking the customerId.
         *
         * Unlike p_updatepatient, this patient does not have a session and a new
         * identity will be created on the PUC for this patient. This will result
         * in the generation of an opt-in link.
         *
         * Only once the opt-in link is clicked will the registration actually
         * take place.
         *
         * Here we add the opt-in link to the patientreg.
         *
         * @param {Object}      args
         */
        function patientDCRegister( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.patientDCRegister', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.patientDCRegister');
            }
            var
                callback = args.callback,
                data = args.data,
                dbuser = Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                selfRegister = (data.patientId) ? false : true;

            //
            // Here the patient is the customer.
            //

            if( selfRegister ) {
                Y.log( `patient trying self-registration on practice: ${  data.customerId}`, 'info', NAME );
            }

            if( !Y.doccirrus.email.isReady() ) {
                Y.log( 'patientdcregister called -- but email service not ready.', 'error', NAME );
                callback( 'No Server Mail' );
                return;
            }

            // check params
            if( !data.firstname || !data.lastname || !data.email ) {
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            if( !data.patientId && !data.customerId ) { // if not normal registration and not cold registration
                // cold registration, no customerIdPrac behind it. FUTURE add logic to handle this case???
                callback( Y.doccirrus.errors.rest( 400, 'Need invite from practice' ) );
                return;
            }

            // generic error function
            function reportError( str, code ) {
                code = code || 500;
                var frontMsg = (500 === code) ? 'server error' : 'invalid params';
                Y.log( `patientdcregister: Error registering patient:  ${  str}`, 'error', NAME );
                callback( Y.doccirrus.errors.rest( code, frontMsg ) );
            }

            function success() {
                // send email
                sendOptinEmail( { ...data, user: dbuser }, function( err ) {
                    callback( err, {message: err || 'email sent'} );
                } );
            }

            // update meta reg with patient personal data
            function updatePatientreg( patientreg ) {
                var cleanData,
                    ObjectId = require( 'mongoose' ).Types.ObjectId;

                data.optIn = getOptinUrl();
                patientreg.optIn = data.optIn;
                patientreg.firstname = data.firstname;
                patientreg.lastname = data.lastname;
                patientreg.email = data.email;
                patientreg.phone = data.phone;
                patientreg.talk = data.talk;
                patientreg.pw = Y.doccirrus.auth.getSaltyPassword( data.pw );
                patientreg.dob = data.dob;
                patientreg.noPRC = selfRegister; // no data on PRC
                patientreg.confirmed = false; // will set true after pin submission, or if noPRC then on optin
                patientreg.patientId = selfRegister ? new ObjectId().toString() : data.patientId; // either via invitation or self registration

                Y.log( `updatePatientreg. selfRegister: ${selfRegister}, patientId: ${patientreg.patientId}`, 'info', NAME );

                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb( {
                    user: dbuser,
                    model: 'patientreg',
                    action: 'put',
                    query: {
                        _id: patientreg._id
                    },
                    fields: Object.keys(patientreg),
                    data: Y.doccirrus.filters.cleanDbObject(patientreg)
                } );

                if( patientreg.identityId ) {
                    cleanData = {username: data.email, firstname: data.firstname, lastname: data.lastname, pw: data.pw};
                    Y.doccirrus.filters.cleanDbObject( cleanData );
                    // re-registering, so update the old identity
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        query: { _id: patientreg.identityId },
                        action: 'put',
                        model: 'identity',
                        data: cleanData,
                        fields: ['username', 'firstname', 'lastname', 'pw'],
                        callback: function( err ) {
                            if( err ) {
                                Y.log( `Error updating the identity, patient user in an unstable state - should re-register.${  err}`, 'error', NAME );
                            }
                        }
                    } );
                }
                success();
            }

            // if we have the patientreg then go for update
            function checkPatientreg( err, patientreg, status ) {
                if( err ) {
                    reportError( 'failed to get/set patientreg', 500 );
                    return;
                }

                if( Array.isArray( patientreg ) ) {
                    patientreg = patientreg[0];
                }
                if( !patientreg ) {
                    reportError( 'Patient not invited', 400 );
                    // Alternate EXIT POINT
                    return;

                } else if( patientreg.confirmed ) {
                    reportError( 'Patient already registered', 400 );
                    // Alternate EXIT POINT
                    return;
                }

                Y.log( `create/update patientreg, status=${  status}`, 'debug', NAME );
                updatePatientreg( patientreg );
            }

            // check if the patient has contact in DCPRC (ie. he previously confirmed a registration)
            function backFromDCPRC( err, result ) {

                if( err ) {
                    reportError( `Failed looking up Contact for E-Mail. ${  err}` );
                    return; // shall we go on??
                }

                if( 0 < result.length ) {
                    reportError( `Email is already used in another registration: ${  JSON.stringify( result )}`, 400 );
                    return; // ??? not sure
                }
                if( !data.customerId ) { // normal registration
                    // find the patientreg
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser, action: 'get', model: 'patientreg',
                        query: { patientId: data.patientId },
                        options: {}, callback: checkPatientreg
                    } );

                } else { // cold registration
                    data.createPlanned = true; // set right to create schedule
                    data.dcCustomerNo = data.customerId;
                    setPatientreg( data, checkPatientreg ); // creates a new patientreg if there is not any left from an ignored invitation
                }
            }

            function checkIdentityCb( err, result ) {
                if( err ) {
                    reportError( `Identity Info not available: ${  err}` );
                    return;
                }
                if( result && 0 === result.length ) {
                    if( data.email || data.phone ) {
                        // here we check to see if this patient is already registered for some other doctor.
                        // however, the phone and emails addresses are not allowed to be stored in the
                        // PUC, so we have to go to the DCPRC. TODO MOJ-1343
                        Y.doccirrus.utils.dcprcKnowsEmailOrPhone( data.email, data.phone, backFromDCPRC );

                    } else {
                        backFromDCPRC( null, [] );
                    }
                } else {
                    reportError( 'Email already registered as a Portal Username.', 22001 );
                }
            }

            // the join point of the two different registration paths
            function checkIdentity() {
                // this process must be more fine granular MOJ-680
                Y.doccirrus.mongodb.runDb( {
                    user: dbuser,
                    model: 'identity',
                    query: {username: data.email},
                    callback: checkIdentityCb
                } );

            }

            function getMetapracCb( err, result ) {
                if( err || !result || !result[0] ) {
                    Y.log( (err) ? 'error in getting the metaprac, dcCustomerNo: ' : `${  JSON.stringify( err )}`, 'error', NAME );
                    reportError( 'failed to get metaprac', 400 );
                    return;
                }
                //                     checkPRCForPatient( host );
                checkIdentity();

            }

            // is there any waiting invitation (ie. a patientreg)? mock an invitation if not, otherwise proceed with normal registration
            function checkOldPatientreg( err, result ) {
                if( err ) {
                    Y.log( `error in getting the old patientreg: ${  err}`, 'error', NAME );
                    reportError( 'failed to get patientreg', 500 );
                    return;
                }

                if( !result || !result[0] ) { // the we have to create a patientreg

                    Y.log( 'going for cold registration', 'debug', NAME );
                    // get metaprac in order to obtain the host address
                    Y.doccirrus.mongodb.runDb( { user: dbuser,
                        model: 'metaprac',
                        query: {'customerIdPrac': data.customerId}
                    }, getMetapracCb );

                } else { // go directly with normal registration
                    Y.log( 'patientId is already set in the patientreg', 'debug', NAME );
                    data.patientId = result[0].patientId; // needed for setPatientreg
                    checkIdentity();
                }
            }

            // this is the fork of the two registration paths
            if( data.patientId ) { // take the old reg path
                checkIdentity();

            } else if( data.customerId ) {
                // TODO MOJ-1343 some data used here will be deleted
                // first see if this is a repeated attempt for registration
                Y.doccirrus.mongodb.runDb( { user: dbuser,
                    model: 'patientreg',
                    query: {'customerIdPrac': data.customerId, 'email': data.email, 'dob': data.dob}
                }, checkOldPatientreg );

            } else {
                reportError( 'invalid registration path', 404 );
            }

        } // regpatient

        /**
         * first on PP then on PRC:
         * patient submitted a pin in order to confirm their email to the practice
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} [args.data.email]
         * @param {Object} [args.data.patientId]
         * @param {Object} [args.data.customerIdPrac]
         * @param {Object} [args.data.patientreg] mongoose patientreg object
         * @param {Function} [args.callback]
         * @param {Function} [callback]
         * @/param patientId
         * @/param pinHash
         * @/param email (only on PRC)
         * @/param dcCustomerNo the target PRC ID
         */
        function confirmPatientEmailToPRC( args, callback ) {
            callback = callback || args.callback;
            var
                user = args.user,
                params = args.data || args,
                email,
                async = require( 'async' ),
                patient = params.patient || args.patient;

            params = params.content && JSON.parse( params.content ) || params; // unwrap puc message
            email = params.email || args.email;

            Y.log( `confirmPatientEmailToPRC: ${  require('util').inspect( params )}`, 'debug', NAME );

            if( !patient && !(params.patientId || params.patientreg) ) {
                return callback( 'insufficient params' );
            }

            function doConfirmOnPP( preg ) {
                let
                    pregData = {};
                pregData.confirmed = true;
                pregData.email = undefined;
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'patientreg',
                    action: 'put',
                    query: {
                        _id: preg._id
                    },
                    fields: Object.keys( pregData ),
                    data: Object.assign( { skipcheck_: true }, pregData )
                }, callback );
            }

            function doConfirmOnPRC( patient ) {
                let
                    patientData = {};
                if( !patient.communications || !patient.communications.length ) { // the email was deleted/changed meanwhile
                    Y.log( 'communications is empty', 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'no email to confirm' } ) );
                }
                patientData.communications = patient.communications.map( function( _item ) {
                    let
                        item = Object.assign( {}, _item );
                    if( item.value.toLowerCase() === email.toLowerCase() ) {
                        item.confirmed = true;
                    }
                    return item;
                } );
                Y.log( `confirmed email for patient ${patient.lastname}`, 'debug', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'put',
                    query: {
                        _id: patient._id
                    },
                    fields: Object.keys( patientData ),
                    data: Object.assign( { skipcheck_: true }, patientData )
                }, ( err ) => {
                    if( err ) {
                        Y.log( `patient email could not be confirmed on PRC: ${JSON.stringify( err )}`, 'error', NAME );
                    } else {
                        Y.log( `patient email confirm done on PRC: ${patient.lastname}`, 'info', NAME );
                    }
                    callback( err );
                } );
            }
            if( Y.doccirrus.auth.isPUC() ) { // forward to PRC
                // get the preg, check pin, message PRC and confirm the preg
                async.waterfall([
                    function(next){
                        if( params.patientreg ) {
                            return setImmediate( next, null, params.patientreg );
                        } else {
                            let
                                query = {};
                            if( params.patientreg && params.patientreg._id ) {
                                query._id = params.patientreg._id.toString();
                            } else {
                                query.patientId = params.patientId;
                                if( params.customerIdPrac ) {
                                    query.customerIdPrac = params.customerIdPrac;
                                } else {
                                    query.identityId = user.identityId;
                                }
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'patientreg',
                                query: query,
                                options: {
                                    lean: true,
                                    limit: 1
                                }
                            }, function( err, results ) {
                                if( err || !results || 1 !== results.length ) {
                                    return next( 'problem with patient reg' );
                                }
                                next( err, results && results[ 0 ] );
                            });
                        }
                    },
                    function( patientreg, next ) {
                        Y.doccirrus.communication.messageToPRC( user,
                            {
                                targetUrl: '/1/patientreg/:confirmPatientEmailToPRC',
                                dcCustomerNo: patientreg.customerIdPrac || params.customerIdPrac,
                                data: {
                                    patientId: patientreg.patientId || params.patientId,
                                    email: patientreg.email || params.email
                                }
                            }, function( error, body ) {
                                error = error || body && body.meta && body.meta.errors[ 0 ];
                                if( error ) {
                                    Y.log( `error messaging PRC: ${JSON.stringify( error )}`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'error from PRC' } ) );  // prc is offline
                                }
                                next( null, patientreg );

                            } );
                    }
                ], function( err, patientreg ) {
                    if( err ) {
                        return callback( err );
                    }
                    doConfirmOnPP( patientreg );
                });
            } else {
                // on PRC
                if( !email ) {
                    return callback( 'insufficient params from PP' );
                }

                if( patient ) { // if a private call then do it right away
                    doConfirmOnPRC( patient );

                } else {
                    Y.doccirrus.api.patient.get( {
                        user: user,
                        query: {_id: params.patientId},
                        options: {
                            lean: true
                        },
                        callback: function( err, result ) {
                            var
                                patient = result && result[0];
                            if( err || !patient ) {
                                return callback( err || 'invalid patientId' );
                            }
                            //else if( Y.doccirrus.authpub.generateHash( patient.pin ) !== params.pinHash || !isStillValid( patient.generatedAt ) ) { // should check pin generation time?
                            //    callback( Y.doccirrus.errors.rest( 400, 'invalid pin on prc' ) );
                            //
                            //} else {
                            //    doConfirmOnPRC( patient );
                            //}
                            doConfirmOnPRC( patient );
                        }
                    } );
                }
            }
        }

        /**
         * on PRC:
         * 1- decrypt the data
         * 2- check the pin and save patient public key
         * 3- confirm patient email
         *
         * @param {Object}  args
         *
         * @return{Function}        callback
         */
        function checkinPatient( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.checkinPatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.checkinPatient');
            }
            var
                dbUser = args.user,
                params = args.data || {},
                prcPackage = params.prcPackage, // encrypted
                patientId = params.patientId,
                patientPublicKey = params.patientPublicKey,
                browser = params.browser,
                sharedSecret, patient,
                callback = args.callback;
            Y.log( `checkinPatient: ${  require('util').inspect( params )}`, 'debug', NAME );
            if( !prcPackage || !patientId || !patientPublicKey && !params.email ) {
                return callback( Y.doccirrus.errors.http( 400, 'insufficient params' ) );
            }

            function savePatient( params, callback ) {
                let
                    { patientData, patientId } = params;
                Y.doccirrus.mongodb.runDb( {
                    user: dbUser,
                    model: 'patient',
                    action: 'put',
                    query: {
                        _id: patientId
                    },
                    fields: Object.keys( patientData ),
                    data: Object.assign( { skipcheck_: true }, patientData )
                }, ( err ) => {
                    if( err ) {
                        Y.log( `checkinPatient error: ${JSON.stringify( err )}`, 'error', NAME );
                    } else {
                        Y.log( `checkinPatient done: ${patient.lastname}`, 'debug', NAME );
                    }
                    callback( err );
                } );
            }

            function checkPinAndUpdate( ppin ) {
                let
                    patientData = {};
                // check pin against patient.pin and add the public key
                Y.doccirrus.api.patient.get( {
                    user: dbUser,
                    query: {_id: patientId},
                    callback: function( err, result ) {
                        patient = result && result[0];
                        if( err || !patient ) {
                            return callback( err || 'wrong patientId' );
                        }
                        if( patient.pin === ppin ) {
                            if( isStillValid( patient.generatedAt ) ) {
                                let
                                    moment = require( 'moment' ),
                                    device = {
                                        key: patientPublicKey,
                                        timestamp: moment().toISOString()
                                    };
                                Y.log( '** the pin is valid', 'debug', NAME );
                                patientData.devices = patient.devices || [];
                                if( browser ) {
                                    device.browser = browser.name;
                                }
                                patientData.devices.push( device );
                                if( params.email ) {
                                    confirmPatientEmailToPRC( {
                                        user: dbUser,
                                        data: { patient: patient, email: params.email },
                                        callback( err ){
                                            if( err ) {
                                                return callback( err );
                                            }
                                            savePatient( { patientData, patientId: patient._id }, callback );
                                        }
                                    } );
                                } else {
                                    savePatient( { patientData, patientId: patient._id }, callback );
                                }

                            } else {
                                Y.log( `patient.generatedAt${  patient.generatedAt}`, 'debug', NAME );
                                callback( Y.doccirrus.errors.rest( 7301, 'pin is expired' ) );
                            }

                        } else {
                            callback( Y.doccirrus.errors.rest( 7301, 'pin is invalid' ) );
                        }
                    }
                } );
            }

            Y.doccirrus.auth.getKeyPair( dbUser, function( err, data ) {
                if( err || !data || !data.privateKey ) {
                    return callback( 'could not get key pair' );
                }
                sharedSecret = Y.doccirrus.authpub.getSharedSecret( data.privateKey, patientPublicKey );
                prcPackage = Y.doccirrus.authpub.decJSON( sharedSecret, prcPackage );
                Y.log( `prcPackage decrypted: ${JSON.stringify( prcPackage )}`, 'debug', NAME );
                if( !prcPackage || !prcPackage.patientPin ) {
                    return callback( 'incomplete prcPackage' );
                }
                checkPinAndUpdate( prcPackage.patientPin );
            } );
        }

        // helper on PP:
        // prepare data that is needed to finalise registration (store patient key and confirm their email),
        // PRC will decrypt our package then will check the pin,
        /**
         * @method registerPatientToPRC
         * @param {Object} config
         * @param {Object} config.user
         * @param {Object} config.myPreg
         * @param {Object} config.prcPackage
         * @param {String} config.patientPublicKey
         * @param {Object} config.browser
         * @param {Object} config.browser.name name of browser which has been used to send this request
         * @param {Function} callback
         */
        function registerPatientToPRC( config, callback ) { // TODO use HTTP messaging channel??
            let
                user = config.user,
                myPreg = config.myPreg,
                prcPackage = config.prcPackage,
                patientPublicKey = config.patientPublicKey,
                browser = config.browser;

            if( !myPreg.email ) {
                Y.log( 'no email will be confirmed on PRC', 'debug', NAME );
            }
            var
                data = {
                    prcPackage: prcPackage, // containing pin and patient public key
                    patientId: myPreg.patientId,
                    patientPublicKey: patientPublicKey, // to get shared secret
                    email: myPreg.email,
                    browser: browser
                };
            Y.doccirrus.api.metaprac.getPublicData( {
                user: user,
                data: {dcCustomerNo: myPreg.customerIdPrac},
                callback: function( err, result ) {
                    var
                        url;
                    if( err || !result || !result[0] || !result[0].host ) {
                        return callback( 'could not get metaprac/host' );
                    }

                    url = `${result[0].host  }/1/patientreg/:checkinPatient`;
                    Y.log( `asking PRC to check our pin:${  url}`, 'debug', NAME );
                    Y.doccirrus.https.externalApiCall( {
                        method: 'POST',
                        model: 'patientreg',
                        action: 'checkinPatient',
                        host: result[0].host,
                        data,
                        options: { friend: true, errDataCallback: true }
                    }, function( err ) {
                        if( err ) {
                            Y.log( `registerPatientToPRC: error from PRC: ${JSON.stringify( err || 'no result' )}`, 'error', NAME );
                            return callback( err || Y.doccirrus.errors.rest( 400, 'invalid register to prc' ) );
                        }
                        myPreg.confirmed = true;
                        myPreg.email = undefined;
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientreg',
                            action: 'put',
                            query: {
                                _id: myPreg._id
                            },
                            fields: Object.keys( myPreg ),
                            data: Y.doccirrus.filters.cleanDbObject( myPreg )
                        }, callback );

                    } );
                }
            } );
        }

        /**
         * In this case, the patient has a valid session (after login)
         * and wishes to add a practice to the list of available practices.
         *
         * To this end, the hashPIN has to be supplied and matched in the patientreg
         * model so that the customer can be matched there, and the neccessary
         * flags set (otherwise the entry will be deleted from patientreg).
         *
         * Since the Patient is authenticated, we simply follow instructions
         * and update the info in the DB.
         *
         * There is no need to send and opt-in link etc.
         *
         * @param {Object}          args
         */
        function updatePatient( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.updatePatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.updatePatient');
            }
            var
                callback = args.callback,
                params = args.data,
                user = args.user,
                async = require( 'async' );

            //
            // Should we email the added practice?
            if( !Y.doccirrus.email.isReady() ) {
                callback( 'No Server Mail' );
                return;
            }

            if( !Y.doccirrus.auth.isFromUser( user ) || !(params.customerId || params.prcPackage && params.patientId && params.patientPublicKey && params.pinHash) ) {
                callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters' ) );
                return;
            }

            function success( myPatientReg ) {
                var
                    lang = Y.doccirrus.i18n( 'patientRegistration' ),
                    jadeParams = {
                        text: ''
                    },
                    emailOptions = {},
                    myEmail,
                    fullName, email;

                Y.doccirrus.utils.dcprcGetPatientAsContact( { _id: myPatientReg.customerIdPat }, function( err, dcData ) {
                    var
                        patientProfile = dcData && dcData[0];
                    if( err || !patientProfile ) {
                        return callback( 'patient not known to DCPRC' );
                    }

                    fullName = `${patientProfile.firstname  } ${  patientProfile.lastname}`;
                    email = myPatientReg.email || patientProfile.email;
                    myPatientReg.email = undefined;

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'put',
                        query: {
                            _id: myPatientReg._id
                        },
                        fields: Object.keys(myPatientReg),
                        data: Y.doccirrus.filters.cleanDbObject(myPatientReg)
                    } );

                    // send email
                    jadeParams.text = lang.updatePatient.TEXT.replace( '$customerIdPrac$', myPatientReg.customerIdPrac );
                    emailOptions.subject = lang.updatePatient.SUBJECT.replace( '$fullname$', fullName );
                    emailOptions = Y.mix( emailOptions, {
                        serviceName: 'patientPortalService',
                        to: email,
                        jadeParams: jadeParams,
                        jadePath: './mojits/PUCMojit/views/patientupdateemail.jade.html',
                        attachments: [
                            {
                                path: `${process.cwd()  }/mojits/DocCirrus/assets/docs/Datenschutz.pdf`,
                                type: "application/pdf",
                                filename: "Datenschutz.pdf"
                            }
                        ]
                    } );

                    myEmail = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
                    Y.doccirrus.email.sendEmail( { ...myEmail, user }, ( err ) => {
                        callback( err, [
                            { "message": "email sent" }
                        ] );
                    } );
                } );
            }

            function enhanceNewPatreg( newPatreg ) {
                Y.log( `enhancing patientreg for identity ${  user.identityId  }  `, 'info', NAME );
                // get the first preg belonging to the logged-in user
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientreg',
                    query: {identityId: user.identityId.toString()},
                    options: {limit: 1},
                    callback: function( err, result ) {
                        Y.log( `PatientReg 2 check came back:  data[0]: ${  result && result[0] ? JSON.stringify( result[0] ) : 'null-ish'}` );
                        if( err ) {
                            Y.log( `Server Error: ${  err}`, 'error', NAME );
                            callback( err );
                            return;
                        }
                        if( 0 === result.length ) {
                            Y.log( 'Could not find patientreg for login. Invalid server state.', 'error', NAME );
                            callback( Y.doccirrus.errors.rest( 400, 'patientreg not found' ) );
                            return;
                        }
                        newPatreg.customerIdPat = result[0].customerIdPat;  // keep same link to the DCPRC.
                        newPatreg.identityId = user.identityId;
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientreg',
                            action: 'put',
                            query: {
                                _id: newPatreg._id
                            },
                            fields: Object.keys(newPatreg),
                            data: Y.doccirrus.filters.cleanDbObject(newPatreg)
                        } );

                        success( newPatreg );
                    }
                } );
            }

            if( params.patientId ) {
                Y.doccirrus.mongodb.runDb( { // get the new patientreg created by invitation
                    user: user,
                    model: 'patientreg',
                    query: {patientId: params.patientId},
                    callback: function( err, result ) {
                        var
                            myPatreg = result && result[0];
                        Y.log( `PatientReg check came back: ${  myPatreg ? JSON.stringify( myPatreg ) : 'null-ish'}` );
                        if( err ) {
                            Y.log( `Server Error: ${  err}`, 'error', NAME );
                            callback( err );
                            return;
                        }
                        if( !myPatreg ) {
                            callback( 'Invalid inivitation' );
                            // repeat the search, this time via the identityId - we could look at the other
                            // regs hanging from this identity and do something with them, but there is no need.
                            return;
                        }

                        if( isPinValid( result[0].ppToken, params.prcKey, params.pinHash ) ) {
                            registerPatientToPRC( {
                                user: user,
                                myPreg: myPatreg,
                                prcPackage: params.prcPackage,
                                patientPublicKey: params.patientPublicKey,
                                browser: params.browser
                            }, function( err ) {
                                if( err ) {
                                    callback( 'could not register device key' );
                                } else {
                                    enhanceNewPatreg( myPatreg );
                                }
                            } );
                        } else {
                            callback( Y.doccirrus.errors.rest( 7301, 'invalid pin' ) );
                        }
                    }
                } );

            } else if( params.customerId && user.identityId ) { // patient is logged-in on an embedded PP
                Y.log( `adding practice for patient. CustomerNo:${  params.customerId}`, 'info', NAME );
                async.waterfall( [
                    function getPreg( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientreg',
                            query: {identityId: user.identityId.toString(), customerIdPrac: params.customerId},
                            options: {limit: 1},
                            callback: cb
                        } );
                    },
                    function checkPatientreg( result, cb ) {

                        if( result && result[0] ) {
                            Y.log( `updatePatient: patient is already registered in the practice: ${  params.customerId}`, 'error', NAME );
                            cb( Y.doccirrus.errors.rest( 400, 'already registered' ) );
                            return;
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'metaprac',
                            query: {customerIdPrac: params.customerId},
                            options: {limit: 1},
                            callback: cb
                        } );
                    },
                    function checkMetaprac( result, cb ) {
                        if( !result || !result[0] || !result[0].host ) {
                            Y.log( `no such practice, invalid dcCustomerNo/host: ${  params.customerId}`, 'error', NAME );
                            cb( Y.doccirrus.errors.rest( 400, 'invalid dcCustomerNo' ) );
                            return;
                        }
                        // get the old patientreg, we just need contact id on DCPRC
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientreg',
                            query: {identityId: user.identityId.toString()},
                            options: {limit: 1},
                            callback: cb
                        } );
                    },
                    // create a new patientreg for the case of reg. without invitation
                    function createPatientreg( result, cb ) {
                        var
                            ObjectId = require( 'mongoose' ).Types.ObjectId;
                        if( !result || !result[0] ) {
                            Y.log( 'Could not find patientreg for login. Invalid server state. (1): ', 'error', NAME );
                            cb( 'no patientreg' );
                            return;
                        }
                        params.dcCustomerNo = params.customerId;
                        params.customerIdPat = result[0].customerIdPat; // link to DCPRC
                        params.patientId = new ObjectId().toString();
                        params.noPRC = true; // no data on PRC
                        params.confirmed = true;
                        params.identityId = user.identityId.toString();
                        params.createPlanned = true;
                        params.accessPRC = false;
                        setPatientreg( params, cb ); // save this patientreg
                    },
                    function finish( myPreg, status, cb ) {
                        if( !myPreg ) {
                            cb( '!myPreg' );
                        } else {
                            success( myPreg );
                            cb();
                        }
                    }
                ], function allDone( err ) {
                    if( err ) {
                        Y.log( `error in cold registration: ${  JSON.stringify( err )}`, 'error', NAME );
                    }
                    callback( err );
                } );

            } else {
                callback( Y.doccirrus.errors.rest( 400, 'insufficient registration parameters' ) );
            }
        } //updatePatient

        /**
         * public route on PP:
         * the final step in registration where patient confirms themselves to PRC by
         * submitting a pin and their public key in an encrypted package.
         * @param {Object}          args
         */
        function patientPRCRegister( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.patientPRCRegister', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.patientPRCRegister');
            }
            var
                dbUser = args.user || Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                params = args.data,
                callback = args.callback;
            Y.log( `patientPRCRegister:${  require('util').inspect( params )}`, 'debug', NAME );
            if( !params.prcPackage || !params.patientId || !params.patientPublicKey || !params.pinHash || !params.prcKey ) {
                callback( Y.doccirrus.errors.rest( 400, 'invalid parameters' ) );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                user: dbUser,
                model: 'patientreg',
                query: {patientId: params.patientId},
                options: {limit: 1},
                callback: function( err, result ) {
                    if( err || !result || !result[0] ) {
                        callback( err || Y.doccirrus.errors.rest( 400, 'invalid patient' ) );
                    } else {
                        if( isPinValid( result[0].ppToken, params.prcKey, params.pinHash ) ) {
                            registerPatientToPRC( {
                                user: dbUser,
                                myPreg: result[0],
                                prcPackage: params.prcPackage,
                                patientPublicKey: params.patientPublicKey,
                                browser: params.browser
                            }, callback );
                        } else {
                            callback( Y.doccirrus.errors.rest( 7301, 'invalid pin (1)' ) );
                        }
                    }
                }
            } );
        }

        /**
         *  on PP, ask PRC to send the patient a new pin
         *  if a valid pin exist then don't do anything
         * @param {Object}          args
         * @returns {*}
         */
        function requestForPin( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.requestForPin', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.requestForPin');
            }
            var
                user = args.user,
                params = args.data,
                callback = args.callback;

            params = params.content && JSON.parse( params.content ) || params; // unwrap message from puc

            //function backFromPRC( error, response, body ) {
            function backFromPRC( error, body ) {
                error = error || body && body.meta && body.meta.errors[0];
                var
                    data = body && body.data;
                if( error || !body ) {
                    Y.log( `error came back from PRC: ${  JSON.stringify( error || body )}`, 'error', NAME );
                    callback( error || 'empty response form puc' );
                } else {
                    callback( null, data );
                }
            }

            if( Y.doccirrus.auth.isPUC() ) { // forward to PRC
                // param check on PP
                if( !params.patientId ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user, model: 'patientreg',
                    query: {patientId: params.patientId, identityId: user.identityId}
                }, function( err, result ) {
                    var
                        patientreg;
                    if( err || !result || 1 !== result.length ) {
                        return callback( 'problem with patient reg (1)' );
                    }

                    patientreg = result[0];

                    // go to PRC
                    Y.doccirrus.mongodb.runDb( {
                        user: user, model: 'metaprac',
                        query: {customerIdPrac: patientreg.customerIdPrac}, options: {limit: 1},
                        callback: function( err, result ) {
                            var
                                metaprac = result && result[0],
                                prcUrl;
                            if( err || !metaprac || !metaprac.host ) {
                                return callback( Y.doccirrus.errors.rest( 500, err || `could not get prc host: ${  metaprac && true}` ) );
                            }
                            prcUrl = Y.doccirrus.utils.appendUrl( metaprac.host, '/1/patientreg/:requestForPin' );
                            Y.doccirrus.https.externalPost( prcUrl, {patientreg: patientreg}, {friend: true}, backFromPRC );
                        }
                    } );
                } );
                return; // done on PP
            }

            // on PRC
            if( !params.patientreg ) {
                return callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
            }
            setPortalAuth( {
                user: user,
                data: params.patientreg,
                flag: 'pin_request',
                callback: function( err ) {
                    if( err ) {
                        Y.log( ` error in requestForPin: ${  JSON.stringify( err )}`, 'error', NAME );
                    }
                    callback( err );
                }
            } );
        }

        // patient is logged-in and is trying to unlock a PRC by sending their public key and pin
        function submitPatientDeviceKey( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.submitPatientDeviceKey', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.submitPatientDeviceKey');
            }
            Y.log( `submitPatientDeviceKey: ${  JSON.stringify( args.data )}`, 'debug', NAME );
            patientPRCRegister( args );
        }

        /**
         * on PRC. Tells PUC to set confirmed flag to false and and 'email' field to patientreg entry
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.patientiId
         * @param {String} args.data.customerIdPrac
         * @param {String} args.data.email
         * @param {Function} args.callback
         */
        function updatePatientEmailFlag( args ) {
            var
                callback = args.callback,
                data = args.data || {};

            Y.doccirrus.https.externalPost(
                Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:setNewEmailFlag' ), // to PUC
                {
                    patientId: data.patientId,
                    customerIdPrac: data.customerIdPrac,
                    email: data.email
                },
                Y.doccirrus.auth.setInternalAccessOptions(),
                ( err ) => {
                    if( err ) {
                        return callback( 503 === err.code ? new Y.doccirrus.commonerrors.DCError( 'patientreg_1' ) : err );
                    }
                    return callback();
                }
            );
        }

        /**
         * on PUC. Updates 'confirmed'(sets to false) and 'email' fields of patientReg entry
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {String} args.data.customerIdPrac
         * @param {String} args.data.email
         * @param {Function} args.callback
         */
        function setNewEmailFlag( args ) {
            var
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                emailData = {
                    email: data.email,
                    confirmed: false
                };

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                action: 'put',
                fields: [ 'email', 'confirmed' ],
                query: {
                    patientId: data.patientId,
                    customerIdPrac: data.customerIdPrac
                },
                data: Y.doccirrus.filters.cleanDbObject( emailData )
            }, callback );

        }

        /**
         * Sends confirmation email to patient again
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.customerIdPrac
         * @param {Function} args.callback
         * @returns {*}
         */
        function sendEmailConfirmationAgain( args ){
            var
                user = args.user,
                data = args.data || {},
                callback = args.callback,
                async = require( 'async' );
            if( !data.customerIdPrac ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Invalid parameters. customerIdPrac is missing' ) );
            }

            async.waterfall( [
                function( next ) {
                    let
                        query = {
                            identityId: user.identityId,
                            customerIdPrac: data.customerIdPrac
                        };
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patientreg',
                        action: 'get',
                        query: query,
                        options: {
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( results[ 0 ] ) {
                            next( err, results[ 0 ] );
                        } else {
                            Y.log( `sendEmailConfirmationAgain. Can not find patientreg entry, query: ${  JSON.stringify( query )}`, 'error', NAME );
                            return next( Y.doccirrus.errors.rest( 500, 'Can not find patientreg entry' ) );
                        }
                    } );
                },
                function( patientReg, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'metaprac',
                        query: {
                            customerIdPrac: patientReg.customerIdPrac
                        },
                        options: {
                            lean: true
                        }
                    }, function( err, results ) {
                        if( err ) {

                            return next( err );
                        }
                        if( results[ 0 ] && results[ 0 ].host ) {
                            next( err, patientReg, results[ 0 ].host );
                        } else {
                            Y.log( `sendEmailConfirmationAgain. target PRC not found: ${  patientReg.customerIdPrac}`, 'error', NAME );
                            return next( Y.doccirrus.errors.rest( 400, 'invalid target PRC' ) );

                        }
                    } );
                },
                function( patientReg, host, next ) {
                    Y.doccirrus.https.externalPost(
                        `${host  }/1/patient/:sendEmailConfirmation`,
                        {
                            patientId: patientReg.patientId
                        },
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        function( error, response, body ){
                            error = error || body && body.meta && body.meta.errors[0];
                            if( error || !body ) {
                                Y.log( `Error: ${  JSON.stringify( error )  }\nError setting portal auth: ${  JSON.stringify( body )}`, 'error', NAME );
                                return next( error || 'empty response form puc' );
                            } else {
                                next();
                            }
                        }
                    );
                } ], callback );

        }

        /**
         *  Gets the patientreg record(s) for the current user's identity.
         *
         *  @param  user        {Object}    From REST request object
         *  @param  patientRegId   {String}    Optional, string if loading a single patientreg
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        function getForCurrentUser( user, patientRegId, callback ) {

            var dbQuery = { identityId: user.identityId };

            if( ('string' === typeof patientRegId) && ('' !== patientRegId) ) {
                Y.log( `Querying single patientRegId: ${  patientRegId}`, '' );
                dbQuery._id = patientRegId;
            } else {
                Y.log( `Querying all patientreg for user: ${  user.identityId}`, 'info', NAME );
            }

            Y.doccirrus.mongodb.runDb( { //todo
                user: user,
                model: 'patientreg',
                action: 'get',
                callback: callback,
                query: dbQuery,
                options: {}
            } );
        }

        /**
         * updates patientreg entry with new patient id if there is no entry for the id
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.oldPatientId
         * @param {String} args.data.newPatientId
         * @param {String} args.data.dcCustomerNo
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function updatePatientreg( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.updatePatientreg', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.updatePatientreg');
            }
            const
                { user, data: { oldPatientId, newPatientId, dcCustomerNo } = {}, callback } = args,
                async = require( 'async' );
            Y.log( `updatePatientreg. Change patientId ${oldPatientId} to ${newPatientId}. dcCustomerNo: ${dcCustomerNo}`, 'info', NAME );
            if( !oldPatientId || !newPatientId || !dcCustomerNo ) {
                Y.log( `updatePatientreg error: dcCustomerNo, old or new patientId is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'dcCustomerNo, old or new patientId is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        action: 'count',
                        query: {
                            patientId: newPatientId,
                            customerIdPrac: dcCustomerNo
                        }
                    }, next );
                },
                function( count, next ) {
                    if( count ) {
                        Y.log( `updatePatientreg. Delete patientreg for old patient id, there is already entry for new patientId`, 'info', NAME );
                        return Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patientreg',
                            action: 'delete',
                            query: {
                                patientId: oldPatientId,
                                customerIdPrac: dcCustomerNo
                            }
                        }, next );
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patientreg',
                            action: 'put',
                            fields: [ 'patientId' ],
                            query: {
                                patientId: oldPatientId,
                                customerIdPrac: dcCustomerNo
                            },
                            data: {
                                patientId: newPatientId,
                                skipcheck_: true,
                                multi_: true
                            }
                        }, next );
                    }

                }
            ], err => callback( err ) );
        }

        /**
         * @method deactivatePatientReg
         *
         * Sets noPRC property to 'true' for patientreg entry with related patientId and customerIdPrac.
         * Called by PRC on patient's delete
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {String} args.data.customerIdPrac
         * @param {Function} args.callback
         */
        async function deactivatePatientReg( args ) {
            Y.log( 'Entering Y.doccirrus.api.patientreg.deactivatePatientReg', 'info', NAME );
            if( args && args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.patientreg.deactivatePatientReg' );
            }

            const
                {user, data = {}, callback} = args;

            if( !data.patientId || !data.customerIdPrac ) {
                Y.log( 'cannot update patientreg without patientId or customerIdPrac', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'missing params' ) );
            }

            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientreg',
                    action: 'put',
                    query: {
                        patientId: data.patientId,
                        customerIdPrac: data.customerIdPrac
                    },
                    fields: ['noPRC'],
                    data: Y.doccirrus.filters.cleanDbObject( {noPRC: true} )
                } )
            );

            if( err ) {
                Y.log( `deactivatePatientRegOnPuc. Error on updating patientreg with patientId: ${data.patientId}. Error: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }
            return callback();
        }

        /**
         * Sends event to PUC
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.user
         * @param {String} args.data.oldPatientId
         * @param {String} args.data.newPatientId
         * @param {Function} args.callback
         */
        function updatePatientregOnPUC( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.updatePatientregOnPUC', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.updatePatientregOnPUC');
            }
            const
                { user, data: { oldPatientId, newPatientId } = {}, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'practice',
                action: 'get',
                query: {},
                otpison: {
                    limit: 1
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results || !results[ 0 ] ) {
                    Y.log( `updatePatientregOnPUC error: practice entry not found`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'practice entry not found' } ) );
                }
                Y.doccirrus.communication.callPUCAction( {
                    ensureDelivery: true,
                    action: 'updatePatientreg',
                    params: { newPatientId, oldPatientId, dcCustomerNo: results[ 0 ].dcCustomerNo }
                }, callback );
            } );

        }

        /**
         * @method getRegisteredPublicKeys
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getRegisteredPublicKeys( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.getRegisteredPublicKeys', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.getRegisteredPublicKeys');
            }
            const
                { user, callback, patientRegs } = args,
                async = require( 'async' );

            function getPublicKey( patientReg, callback ) {
                Y.doccirrus.api.metaprac.getPublicData( {
                    user: user,
                    data: { dcCustomerNo: patientReg.customerIdPrac },
                    callback: function( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        if( !result.length || !result[ 0 ].host ) {
                            Y.log( `getRegisteredPublicKeys. prc: ${patientReg.customerIdPrac} has no host configured`, 'warn', NAME );
                            return callback();
                        }

                        Y.log( `asking PRC for patient public key: ${result[ 0 ].host}`, 'debug', NAME );
                        Y.doccirrus.https.externalApiCall( {
                            model: 'patient',
                            action: 'getPatientPublicKeys',
                            host: result[ 0 ].host,
                            data: {
                                patientId: patientReg.patientId
                            },
                            options: { friend: true, errDataCallback: true }
                        }, function( err, data ) {
                            if( err ) {
                                Y.log( `getRegisteredPublicKeys: error from PRC: ${JSON.stringify( err )}`, 'error', NAME );
                                return callback( err );
                            }
                            callback( null, Object.assign( {}, patientReg, { registeredKeys: data.registeredKeys } ) );
                        } );
                    }
                } );
            }

            async.waterfall( [
                function( next ) {
                    if( patientRegs ) {
                        return setImmediate( next, null, patientRegs );
                    }
                    // get all patientregs
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientreg',
                        action: 'get',
                        query: {
                            identityId: user.identityId
                        }
                    }, next );
                },
                function( patientRegs, next ) {
                    async.mapSeries( patientRegs.filter( item => item.customerIdPat ), getPublicKey, next );
                }
            ], callback );

        }

        /**
         * deletes patientreg entry with id
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.patientId
         * @param {String} args.data.dcCustomerNo
         * @param {Function} args.callback
         */
        function deletePatientreg( args ) {
            Y.log('Entering Y.doccirrus.api.patientreg.deletePatientreg', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.deletePatientreg');
            }
            var
                user = args.user,
                data = args.data || {},
                patientId = data.patientId,
                callback = args.callback,
                async = require( 'async' );

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patientreg',
                query: {
                    'customerIdPat': patientId
                }
            }, ( err, result ) => {
                if( err ) {
                    return callback( err );
                }
                if( result && result[0] ) {
                    if( result[0].identityId && result[0].identityId.length ) {
                        async.series( [
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'delete',
                                    model: 'identity',
                                    query: {
                                        '_id': result[0].identityId
                                    }
                                }, next );
                            },
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'delete',
                                    model: 'patientreg',
                                    query: {
                                        'identityId': result[0].identityId
                                    }
                                }, next );
                            }
                        ], ( err ) => {
                            if( err ) {
                                return callback( err );
                            }
                            return callback();
                        } );
                    } else if( result[0].email && result[0].email.length ) {
                        async.series( [
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'delete',
                                    model: 'identity',
                                    query: {
                                        'username': result[0].email
                                    }
                                }, next );
                            },
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'delete',
                                    model: 'patientreg',
                                    query: {
                                        'email': result[0].email
                                    }
                                }, next );
                            }
                        ], ( err ) => {
                            if( err ) {
                                return callback( err );
                            }
                            return callback();
                        } );
                    } else {
                        return callback();
                    }
                } else {
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'patientreg entry not found' } ) );
                }
            } );
        }

        /**
         * Check if there is some patientreg entry with this email and with different patientId
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.params
         * @param {String} args.params.email
         * @param {String} args.params.patientId
         * @param {Function} args.callback
         */
        async function checkEmailDuplication( args ) {
            const {user, data = {}, callback} = args;

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'patientreg',
                    query: {
                        'email': data.email,
                        'patientId': {$ne: data.patientId}
                    }
                } )
            );

            if( err ) {
                return handleResult( err, undefined, callback );
            }
            if( result && result[0] ) {
                //there is another patient with such email already
                return handleResult( new Y.doccirrus.commonerrors.DCError( 60001 ), undefined, callback );
            } else {
                return handleResult( null, undefined, callback );
            }
        }


        Y.namespace( 'doccirrus.api' ).patientreg = {
            listmine: listPatientRegForUser,
            setPortalAuth: setPortalAuth,
            getPortalAuth: getPortalAuth,
            processPatientDataPP: processPatientDataPP,
            getpatreg: getpatreg,
            patientDCRegister: patientDCRegister,
            patientPRCRegister: patientPRCRegister,
            updatePatient: updatePatient,
            getOptinUrl: getOptinUrl,
            sendOptinEmail: sendOptinEmail,
            patientOptin: patientOptin,
            checkinPatient: checkinPatient,
            confirmPatientEmailToPRC: confirmPatientEmailToPRC,
            requestForPin: requestForPin,
            submitPatientDeviceKey: submitPatientDeviceKey,
            getForCurrentUser: getForCurrentUser,
            updatePatientEmailFlag: function( args ){
                Y.log('Entering Y.doccirrus.api.patientreg.updatePatientEmailFlag', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.updatePatientEmailFlag');
                }
                updatePatientEmailFlag( args );
            },
            setNewEmailFlag: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientreg.setNewEmailFlag', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.setNewEmailFlag');
                }
                setNewEmailFlag( args );
            },
            sendEmailConfirmationAgain: function( args ) {
                Y.log('Entering Y.doccirrus.api.patientreg.sendEmailConfirmationAgain', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.sendEmailConfirmationAgain');
                }
                sendEmailConfirmationAgain( args );
            },
            getAllPortalAuth: function( args ){
                Y.log('Entering Y.doccirrus.api.patientreg.getAllPortalAuth', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.getAllPortalAuth');
                }
                getAllPortalAuth( args );
            },
            getPracticePatreg: function( args ){
                Y.log('Entering Y.doccirrus.api.patientreg.getPracticePatreg', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientreg.getPracticePatreg');
                }
                getPracticePatreg( args );
            },
            updatePatientreg,
            deactivatePatientReg,
            updatePatientregOnPUC,
            getRegisteredPublicKeys,
            generatePatientPin,
            triggerPinEmail,
            deletePatientreg,
            checkEmailDuplication
        };

    },
    '0.0.1', {requires: ['patientreg-schema']}
);